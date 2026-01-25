// OperationLog.js - Append-only operation stream with persistence and replay capability
// Used for operation-based sync in Phase 3

import { StorageUtils } from '../utils/storage.js';

/**
 * OperationLog - Maintains an append-only log of operations for sync
 * 
 * Features:
 * - Append-only (never modify existing operations)
 * - Persistence to localStorage (per-file)
 * - Operation ordering (sequence numbers)
 * - Replay capability
 * - Garbage collection (keep last N operations)
 */
export class OperationLog {
    constructor(filename, maxOperations = 1000) {
        this.filename = filename;
        this.storageKey = `twodo-ops-${filename}`;
        this.maxOperations = maxOperations;
        this.operations = [];
        this.lastSequence = 0;
        this.load();
    }
    
    /**
     * Load operations from localStorage
     */
    load() {
        try {
            const stored = StorageUtils.get(this.storageKey, { operations: [], lastSequence: 0 });
            this.operations = stored.operations || [];
            this.lastSequence = stored.lastSequence || 0;
            
            // Ensure operations are sorted by sequence
            this.operations.sort((a, b) => (a.sequence || 0) - (b.sequence || 0));
            
            // Update lastSequence from operations if needed
            if (this.operations.length > 0) {
                const maxSeq = Math.max(...this.operations.map(op => op.sequence || 0));
                if (maxSeq > this.lastSequence) {
                    this.lastSequence = maxSeq;
                }
            }
        } catch (error) {
            console.error('[OperationLog] Failed to load operations:', error);
            this.operations = [];
            this.lastSequence = 0;
        }
    }
    
    /**
     * Save operations to localStorage
     */
    save() {
        try {
            StorageUtils.set(this.storageKey, {
                operations: this.operations,
                lastSequence: this.lastSequence
            });
        } catch (error) {
            console.error('[OperationLog] Failed to save operations:', error);
            // Try garbage collection if quota exceeded
            if (error.name === 'QuotaExceededError') {
                this._garbageCollect();
                try {
                    StorageUtils.set(this.storageKey, {
                        operations: this.operations,
                        lastSequence: this.lastSequence
                    });
                } catch (retryError) {
                    console.error('[OperationLog] Failed to save after garbage collection:', retryError);
                }
            }
        }
    }
    
    /**
     * Append operation to log
     * @param {Object} operation - Operation object (without sequence)
     * @returns {number} Sequence number assigned to operation
     */
    append(operation) {
        // Increment sequence
        this.lastSequence++;
        
        // Create operation with sequence
        const operationWithSequence = {
            sequence: this.lastSequence,
            op: operation.op,
            itemId: operation.itemId,
            params: operation.params || {},
            timestamp: operation.timestamp || Date.now(),
            clientId: operation.clientId || 'local',
            filename: this.filename
        };
        
        // Append to log (append-only)
        this.operations.push(operationWithSequence);
        
        // Garbage collection if needed
        if (this.operations.length > this.maxOperations) {
            this._garbageCollect();
        }
        
        // Save to localStorage
        this.save();
        
        return this.lastSequence;
    }
    
    /**
     * Get operations since sequence number
     * @param {number} sinceSequence - Sequence number to start from (exclusive)
     * @returns {Array} Array of operations
     */
    getOperations(sinceSequence = 0) {
        return this.operations.filter(op => (op.sequence || 0) > sinceSequence);
    }
    
    /**
     * Replay operations in order
     * @param {number} fromSequence - Start sequence (inclusive)
     * @param {number} toSequence - End sequence (inclusive, optional)
     * @param {Function} applyFn - Function to apply each operation
     * @returns {Array} Array of results from applyFn
     */
    replay(fromSequence = 0, toSequence = null, applyFn) {
        if (!applyFn || typeof applyFn !== 'function') {
            console.error('[OperationLog] replay requires applyFn function');
            return [];
        }
        
        const opsToReplay = this.operations.filter(op => {
            const seq = op.sequence || 0;
            return seq >= fromSequence && (toSequence === null || seq <= toSequence);
        });
        
        // Sort by sequence to ensure order
        opsToReplay.sort((a, b) => (a.sequence || 0) - (b.sequence || 0));
        
        const results = [];
        for (const operation of opsToReplay) {
            try {
                const result = applyFn(operation);
                results.push(result);
            } catch (error) {
                console.error('[OperationLog] Error replaying operation:', operation, error);
                results.push({ error, operation });
            }
        }
        
        return results;
    }
    
    /**
     * Get last sequence number
     * @returns {number} Last sequence number
     */
    getLastSequence() {
        return this.lastSequence;
    }
    
    /**
     * Clear operation log
     */
    clear() {
        this.operations = [];
        this.lastSequence = 0;
        this.save();
    }
    
    /**
     * Get operation count
     * @returns {number} Number of operations in log
     */
    getCount() {
        return this.operations.length;
    }
    
    /**
     * Garbage collection - remove old operations beyond limit
     * @private
     */
    _garbageCollect() {
        if (this.operations.length <= this.maxOperations) {
            return;
        }
        
        // Keep only last maxOperations
        const toRemove = this.operations.length - this.maxOperations;
        this.operations = this.operations.slice(toRemove);
        
        // Update lastSequence if needed
        if (this.operations.length > 0) {
            const maxSeq = Math.max(...this.operations.map(op => op.sequence || 0));
            // Don't decrease lastSequence, only increase if needed
            if (maxSeq > this.lastSequence) {
                this.lastSequence = maxSeq;
            }
        }
    }
}

// Export singleton factory (one log per file)
const operationLogs = new Map();

/**
 * Get or create OperationLog for a filename
 * @param {string} filename - File name
 * @param {number} maxOperations - Maximum operations to keep
 * @returns {OperationLog} OperationLog instance
 */
export function getOperationLog(filename, maxOperations = 1000) {
    if (!filename) {
        console.error('[OperationLog] filename is required');
        return null;
    }
    
    if (!operationLogs.has(filename)) {
        operationLogs.set(filename, new OperationLog(filename, maxOperations));
    }
    
    return operationLogs.get(filename);
}

/**
 * Clear operation log for a filename
 * @param {string} filename - File name
 */
export function clearOperationLog(filename) {
    if (operationLogs.has(filename)) {
        const log = operationLogs.get(filename);
        log.clear();
        operationLogs.delete(filename);
    } else {
        // Also clear from localStorage
        const storageKey = `twodo-ops-${filename}`;
        StorageUtils.remove(storageKey);
    }
}

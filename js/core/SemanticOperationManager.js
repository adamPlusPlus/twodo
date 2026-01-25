// SemanticOperationManager.js - Manages semantic operations on canonical model
// Replaces direct JSON manipulation with semantic operations

import { eventBus } from './EventBus.js';
import { EVENTS } from './AppEvents.js';
import { getService, SERVICES } from './AppServices.js';
import { getOperationLog } from './OperationLog.js';
import {
    SetTextOperation,
    SplitOperation,
    MergeOperation,
    MoveOperation,
    ReparentOperation,
    DeleteOperation,
    CreateOperation
} from './SemanticOperations.js';

/**
 * SemanticOperationManager - Applies semantic operations to canonical model
 * 
 * Responsibilities:
 * - Apply operations to canonical model (AppState)
 * - Emit operations via EventBus at logical boundaries
 * - Validate operations before application
 * - Track operation history for undo/redo
 */
export class SemanticOperationManager {
    constructor() {
        this.operationHistory = [];
        this.maxHistorySize = 1000;
    }
    
    /**
     * Get AppState service
     * @returns {AppState} AppState instance
     */
    _getAppState() {
        return getService(SERVICES.APP_STATE);
    }
    
    /**
     * Get operation class for type
     * @private
     * @param {string} opType - Operation type
     * @returns {Function|null} Operation class
     */
    _getOperationClass(opType) {
        const classMap = {
            'setText': SetTextOperation,
            'split': SplitOperation,
            'merge': MergeOperation,
            'move': MoveOperation,
            'reparent': ReparentOperation,
            'delete': DeleteOperation,
            'create': CreateOperation
        };
        return classMap[opType] || null;
    }
    
    /**
     * Create an operation object
     * @param {string} opType - Operation type ('setText', 'split', 'merge', 'move', 'reparent', 'delete', 'create')
     * @param {string} itemId - Item ID
     * @param {Object} params - Operation-specific parameters
     * @param {number} timestamp - Optional timestamp
     * @returns {BaseOperation} Operation instance
     */
    createOperation(opType, itemId, params = {}, timestamp = null) {
        const OperationClass = this._getOperationClass(opType);
        if (!OperationClass) {
            console.error(`[SemanticOperationManager] Unknown operation type: ${opType}`);
            return null;
        }
        
        // Create operation instance based on type
        switch (opType) {
            case 'setText':
                return new SetTextOperation(itemId, params.text, params.oldText, timestamp);
            case 'split':
                return new SplitOperation(itemId, params.caretPosition, params.newItemId, timestamp);
            case 'merge':
                return new MergeOperation(itemId, params.previousItemId, timestamp);
            case 'move':
                return new MoveOperation(itemId, params.newParentId, params.newIndex, params.oldParentId, params.oldIndex, timestamp);
            case 'reparent':
                return new ReparentOperation(itemId, params.newParentId, params.newDepth, params.oldParentId, params.oldDepth, timestamp);
            case 'delete':
                return new DeleteOperation(itemId, params.deletedItem, timestamp);
            case 'create':
                return new CreateOperation(itemId, params.type, params.parentId, params.index, params.itemData, timestamp);
            default:
                console.error(`[SemanticOperationManager] Unsupported operation type: ${opType}`);
                return null;
        }
    }
    
    /**
     * Apply operation to canonical model
     * @param {BaseOperation|Object} operation - Operation instance or operation object
     * @returns {Object|null} Result object or null if failed
     */
    applyOperation(operation) {
        // Convert object to operation instance if needed
        if (!operation.apply || typeof operation.apply !== 'function') {
            // Assume it's an operation object
            operation = this.createOperation(
                operation.op,
                operation.itemId,
                operation.params,
                operation.timestamp
            );
            
            if (!operation) {
                console.error('[SemanticOperationManager] Failed to create operation');
                return null;
            }
        }
        
        // Validate operation
        if (!operation.validate()) {
            console.error('[SemanticOperationManager] Operation validation failed');
            return null;
        }
        
        // Apply operation
        const result = operation.apply();
        
        if (!result || !result.success) {
            console.error('[SemanticOperationManager] Operation application failed');
            return null;
        }
        
        // Add to history
        this.operationHistory.push(operation);
        if (this.operationHistory.length > this.maxHistorySize) {
            this.operationHistory.shift();
        }
        
        // Append to OperationLog for sync (if not applying remote operation)
        let sequence = null;
        if (!operation._skipLogging) {
            const fileManager = getService(SERVICES.FILE_MANAGER);
            if (fileManager && fileManager.currentFilename) {
                try {
                    const operationLog = getOperationLog(fileManager.currentFilename);
                    if (operationLog) {
                        sequence = operationLog.append({
                            op: operation.getType(),
                            itemId: operation.itemId,
                            params: operation.params,
                            timestamp: operation.timestamp,
                            clientId: operation.clientId || 'local'
                        });
                        operation.sequence = sequence; // Store sequence for sync
                    }
                } catch (error) {
                    console.error('[SemanticOperationManager] Failed to log operation:', error);
                    // Don't fail operation if logging fails
                }
            }
        }
        
        // Emit operation:applied event at logical boundary
        const operationData = {
            op: operation.getType(),
            itemId: operation.itemId,
            params: operation.params,
            timestamp: operation.timestamp,
            clientId: operation.clientId
        };
        
        // Include sequence if available
        if (sequence !== null) {
            operationData.sequence = sequence;
        }
        
        eventBus.emit('operation:applied', {
            operation: operationData,
            result
        });
        
        // Emit data changed event
        eventBus.emit(EVENTS.DATA.CHANGED, {
            type: 'operation',
            operation: operation.getType(),
            itemId: operation.itemId
        });
        
        return result;
    }
    
    /**
     * Get operation history
     * @param {number} limit - Maximum number of operations to return
     * @returns {Array} Array of operations
     */
    getHistory(limit = null) {
        if (limit) {
            return this.operationHistory.slice(-limit);
        }
        return [...this.operationHistory];
    }
    
    /**
     * Clear operation history
     */
    clearHistory() {
        this.operationHistory = [];
    }
    
    /**
     * Get last operation
     * @returns {BaseOperation|null} Last operation or null
     */
    getLastOperation() {
        return this.operationHistory.length > 0 
            ? this.operationHistory[this.operationHistory.length - 1]
            : null;
    }
}

// Export singleton instance
export const semanticOperationManager = new SemanticOperationManager();

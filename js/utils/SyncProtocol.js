// SyncProtocol.js - Protocol message handling for sync operations
// Extracted from SyncManager.js for reusability and maintainability

/**
 * SyncProtocol - Functions for handling sync protocol messages
 */
export class SyncProtocol {
    /**
     * Route message to appropriate handler based on message type
     * @param {Object} message - Message object
     * @param {Object} handlers - Object mapping message types to handler functions
     * @returns {boolean} True if message was handled
     */
    static routeMessage(message, handlers) {
        if (!message || !message.type) {
            console.error('[SyncProtocol] Invalid message: missing type');
            return false;
        }
        
        const handler = handlers[message.type];
        if (typeof handler === 'function') {
            try {
                handler(message);
                return true;
            } catch (error) {
                console.error(`[SyncProtocol] Error handling message type ${message.type}:`, error);
                return false;
            }
        } else {
            console.warn(`[SyncProtocol] No handler for message type: ${message.type}`);
            return false;
        }
    }
    
    /**
     * Create standardized sync message
     * @param {string} type - Message type
     * @param {Object} data - Message data
     * @returns {Object} Message object
     */
    static createMessage(type, data = {}) {
        return {
            type,
            ...data,
            timestamp: data.timestamp || Date.now()
        };
    }
    
    /**
     * Validate message structure
     * @param {Object} message - Message to validate
     * @returns {boolean} True if message is valid
     */
    static validateMessage(message) {
        if (!message) {
            return false;
        }
        
        if (typeof message.type !== 'string') {
            return false;
        }
        
        return true;
    }
    
    /**
     * Create operation sync message
     * @param {string} filename - File name
     * @param {Object} operation - Operation object
     * @param {string} clientId - Client ID
     * @returns {Object} Operation sync message
     */
    static createOperationSyncMessage(filename, operation, clientId) {
        return this.createMessage('operation_sync', {
            filename,
            operation: {
                sequence: operation.sequence,
                op: operation.op || (operation.getType ? operation.getType() : 'unknown'),
                itemId: operation.itemId,
                params: operation.params || {},
                timestamp: operation.timestamp || Date.now(),
                clientId: clientId || operation.clientId || 'local'
            }
        });
    }
    
    /**
     * Create join file message
     * @param {string} filename - File name
     * @returns {Object} Join file message
     */
    static createJoinFileMessage(filename) {
        return this.createMessage('join_file', {
            filename
        });
    }
    
    /**
     * Create leave file message
     * @param {string} filename - File name
     * @returns {Object} Leave file message
     */
    static createLeaveFileMessage(filename) {
        return this.createMessage('leave_file', {
            filename
        });
    }
    
    /**
     * Create request operations message
     * @param {string} filename - File name
     * @param {number} sinceSequence - Sequence number to start from
     * @returns {Object} Request operations message
     */
    static createRequestOperationsMessage(filename, sinceSequence = 0) {
        return this.createMessage('request_operations', {
            filename,
            sinceSequence
        });
    }
    
    /**
     * Create change message
     * @param {string} filename - File name
     * @param {Object} change - Change object
     * @returns {Object} Change message
     */
    static createChangeMessage(filename, change) {
        return this.createMessage('change', {
            filename,
            change
        });
    }
    
    /**
     * Create undo message
     * @param {string} filename - File name
     * @param {string} changeId - Change ID
     * @returns {Object} Undo message
     */
    static createUndoMessage(filename, changeId) {
        return this.createMessage('undo', {
            filename,
            changeId
        });
    }
    
    /**
     * Create redo message
     * @param {string} filename - File name
     * @param {string} changeId - Change ID
     * @returns {Object} Redo message
     */
    static createRedoMessage(filename, changeId) {
        return this.createMessage('redo', {
            filename,
            changeId
        });
    }
    
    /**
     * Create full sync message
     * @param {string} filename - File name
     * @param {Object} data - Full data object
     * @param {number} timestamp - Timestamp
     * @returns {Object} Full sync message
     */
    static createFullSyncMessage(filename, data, timestamp) {
        return this.createMessage('full_sync', {
            filename,
            data,
            timestamp: timestamp || Date.now()
        });
    }
}

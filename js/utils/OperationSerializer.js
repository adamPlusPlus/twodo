// OperationSerializer.js - Operation serialization utilities
// Extracted from SemanticOperations.js for reusability and maintainability

/**
 * OperationSerializer - Functions for serializing and deserializing operations
 */
export const OperationSerializer = {
    /**
     * Serialize operation to JSON
     * @param {Object} operation - Operation instance
     * @returns {Object} Serialized operation object
     */
    serializeOperation(operation) {
        if (!operation) {
            return null;
        }
        
        return {
            op: operation.getType ? operation.getType() : operation.op,
            itemId: operation.itemId,
            params: operation.params || {},
            timestamp: operation.timestamp || Date.now(),
            clientId: operation.clientId || 'local'
        };
    },
    
    /**
     * Deserialize operation from JSON
     * @param {Object} operationData - Serialized operation object
     * @param {Function} createOperation - Function to create operation instances
     * @returns {Object|null} Operation instance or null if failed
     */
    deserializeOperation(operationData, createOperation) {
        if (!operationData || !operationData.op || !operationData.itemId) {
            return null;
        }
        
        if (!createOperation || typeof createOperation !== 'function') {
            console.error('[OperationSerializer] createOperation function is required');
            return null;
        }
        
        return createOperation(
            operationData.op,
            operationData.itemId,
            operationData.params || {},
            operationData.timestamp
        );
    },
    
    /**
     * Serialize array of operations
     * @param {Array<Object>} operations - Array of operation instances
     * @returns {Array<Object>} Array of serialized operations
     */
    serializeOperationBatch(operations) {
        if (!Array.isArray(operations)) {
            return [];
        }
        
        return operations.map(op => OperationSerializer.serializeOperation(op)).filter(op => op !== null);
    },
    
    /**
     * Deserialize array of operations
     * @param {Array<Object>} operationsData - Array of serialized operation objects
     * @param {Function} createOperation - Function to create operation instances
     * @returns {Array<Object>} Array of operation instances
     */
    deserializeOperationBatch(operationsData, createOperation) {
        if (!Array.isArray(operationsData)) {
            return [];
        }
        
        return operationsData
            .map(data => OperationSerializer.deserializeOperation(data, createOperation))
            .filter(op => op !== null);
    },
    
    /**
     * Convert operation to JSON string
     * @param {Object} operation - Operation instance
     * @returns {string} JSON string
     */
    toJSONString(operation) {
        const serialized = OperationSerializer.serializeOperation(operation);
        return JSON.stringify(serialized);
    },
    
    /**
     * Parse operation from JSON string
     * @param {string} jsonString - JSON string
     * @param {Function} createOperation - Function to create operation instances
     * @returns {Object|null} Operation instance or null if failed
     */
    fromJSONString(jsonString, createOperation) {
        try {
            const operationData = JSON.parse(jsonString);
            return OperationSerializer.deserializeOperation(operationData, createOperation);
        } catch (error) {
            console.error('[OperationSerializer] Failed to parse JSON:', error);
            return null;
        }
    }
};

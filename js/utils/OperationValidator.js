// OperationValidator.js - Operation validation utilities
// Extracted from SemanticOperations.js for reusability and maintainability

/**
 * OperationValidator - Validation functions for semantic operations
 */
export const OperationValidator = {
    /**
     * Validate base operation (itemId check)
     * @param {Object} operation - Operation object
     * @param {string} operationName - Operation class name for error messages
     * @returns {boolean} True if valid
     */
    validateBaseOperation(operation, operationName = 'Operation') {
        if (!operation || !operation.itemId) {
            console.error(`[${operationName}] Missing itemId`);
            return false;
        }
        return true;
    },
    
    /**
     * Validate SetTextOperation
     * @param {Object} operation - SetTextOperation instance
     * @returns {boolean} True if valid
     */
    validateSetTextOperation(operation) {
        if (!OperationValidator.validateBaseOperation(operation, 'SetTextOperation')) {
            return false;
        }
        if (operation.params && operation.params.text === undefined) {
            console.error('[SetTextOperation] Missing text parameter');
            return false;
        }
        return true;
    },
    
    /**
     * Validate SplitOperation
     * @param {Object} operation - SplitOperation instance
     * @returns {boolean} True if valid
     */
    validateSplitOperation(operation) {
        if (!OperationValidator.validateBaseOperation(operation, 'SplitOperation')) {
            return false;
        }
        if (operation.params && operation.params.caretPosition === undefined) {
            console.error('[SplitOperation] Missing caretPosition parameter');
            return false;
        }
        if (!operation.params || !operation.params.newItemId) {
            console.error('[SplitOperation] Missing newItemId parameter');
            return false;
        }
        return true;
    },
    
    /**
     * Validate MergeOperation
     * @param {Object} operation - MergeOperation instance
     * @returns {boolean} True if valid
     */
    validateMergeOperation(operation) {
        if (!OperationValidator.validateBaseOperation(operation, 'MergeOperation')) {
            return false;
        }
        if (!operation.params || !operation.params.previousItemId) {
            console.error('[MergeOperation] Missing previousItemId parameter');
            return false;
        }
        return true;
    },
    
    /**
     * Validate MoveOperation
     * @param {Object} operation - MoveOperation instance
     * @returns {boolean} True if valid
     */
    validateMoveOperation(operation) {
        if (!OperationValidator.validateBaseOperation(operation, 'MoveOperation')) {
            return false;
        }
        if (operation.params && operation.params.newIndex === undefined) {
            console.error('[MoveOperation] Missing newIndex parameter');
            return false;
        }
        return true;
    },
    
    /**
     * Validate ReparentOperation
     * @param {Object} operation - ReparentOperation instance
     * @returns {boolean} True if valid
     */
    validateReparentOperation(operation) {
        if (!OperationValidator.validateBaseOperation(operation, 'ReparentOperation')) {
            return false;
        }
        if (operation.params && operation.params.newDepth === undefined) {
            console.error('[ReparentOperation] Missing newDepth parameter');
            return false;
        }
        return true;
    },
    
    /**
     * Validate DeleteOperation
     * @param {Object} operation - DeleteOperation instance
     * @returns {boolean} True if valid
     */
    validateDeleteOperation(operation) {
        return OperationValidator.validateBaseOperation(operation, 'DeleteOperation');
    },
    
    /**
     * Validate CreateOperation
     * @param {Object} operation - CreateOperation instance
     * @returns {boolean} True if valid
     */
    validateCreateOperation(operation) {
        if (!OperationValidator.validateBaseOperation(operation, 'CreateOperation')) {
            return false;
        }
        if (!operation.params || !operation.params.type) {
            console.error('[CreateOperation] Missing type parameter');
            return false;
        }
        if (operation.params && operation.params.index === undefined) {
            console.error('[CreateOperation] Missing index parameter');
            return false;
        }
        return true;
    },
    
    /**
     * Generic operation validator that routes to specific validators
     * @param {Object} operation - Operation instance
     * @returns {boolean} True if valid
     */
    validateOperation(operation) {
        if (!operation) {
            return false;
        }
        
        const operationType = operation.getType ? operation.getType() : operation.op || operation.type;
        
        switch (operationType) {
            case 'setText':
                return OperationValidator.validateSetTextOperation(operation);
            case 'split':
                return OperationValidator.validateSplitOperation(operation);
            case 'merge':
                return OperationValidator.validateMergeOperation(operation);
            case 'move':
                return OperationValidator.validateMoveOperation(operation);
            case 'reparent':
                return OperationValidator.validateReparentOperation(operation);
            case 'delete':
                return OperationValidator.validateDeleteOperation(operation);
            case 'create':
                return OperationValidator.validateCreateOperation(operation);
            default:
                console.error(`[OperationValidator] Unknown operation type: ${operationType}`);
                return false;
        }
    }
};

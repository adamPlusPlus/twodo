// OperationInverter.js - Operation inversion utilities for undo/redo
// Extracted from SemanticOperations.js for reusability and maintainability

/**
 * OperationInverter - Functions for creating inverse operations
 * Note: This file imports operation classes, which creates a circular dependency.
 * Operations will call these functions, so we need to handle this carefully.
 */
export const OperationInverter = {
    /**
     * Invert SetTextOperation
     * @param {Object} operation - SetTextOperation instance
     * @param {Function} SetTextOperationClass - SetTextOperation class constructor
     * @returns {Object} Inverse SetTextOperation
     */
    invertSetTextOperation(operation, SetTextOperationClass) {
        return new SetTextOperationClass(
            operation.itemId,
            operation.params.oldText || '',
            operation.params.text,
            operation.timestamp
        );
    },
    
    /**
     * Invert SplitOperation (becomes MergeOperation)
     * @param {Object} operation - SplitOperation instance
     * @param {Function} MergeOperationClass - MergeOperation class constructor
     * @returns {Object} Inverse MergeOperation
     */
    invertSplitOperation(operation, MergeOperationClass) {
        return new MergeOperationClass(
            operation.params.newItemId,
            operation.itemId,
            operation.timestamp
        );
    },
    
    /**
     * Invert MergeOperation (becomes SplitOperation)
     * @param {Object} operation - MergeOperation instance
     * @param {Function} SplitOperationClass - SplitOperation class constructor
     * @returns {Object|null} Inverse SplitOperation or null if not fully implemented
     */
    invertMergeOperation(operation, SplitOperationClass) {
        // Invert merge = split (restore original text positions)
        if (operation.params.originalText !== undefined && operation.params.originalPreviousText !== undefined) {
            // We have original text, can create proper split
            // But we need to recreate the deleted item first
            // For now, return a placeholder - full implementation would need to store more state
            console.warn('[MergeOperation] Invert not fully implemented - requires item recreation');
            return null;
        }
        // Fallback: create split at end of previous item
        return new SplitOperationClass(
            operation.params.previousItemId,
            operation.params.caretPosition || 0,
            operation.itemId,
            operation.timestamp
        );
    },
    
    /**
     * Invert MoveOperation
     * @param {Object} operation - MoveOperation instance
     * @param {Function} MoveOperationClass - MoveOperation class constructor
     * @returns {Object} Inverse MoveOperation
     */
    invertMoveOperation(operation, MoveOperationClass) {
        return new MoveOperationClass(
            operation.itemId,
            operation.params.oldParentId,
            operation.params.oldIndex,
            operation.params.newParentId,
            operation.params.newIndex,
            operation.timestamp
        );
    },
    
    /**
     * Invert ReparentOperation
     * @param {Object} operation - ReparentOperation instance
     * @param {Function} ReparentOperationClass - ReparentOperation class constructor
     * @returns {Object} Inverse ReparentOperation
     */
    invertReparentOperation(operation, ReparentOperationClass) {
        return new ReparentOperationClass(
            operation.itemId,
            operation.params.oldParentId,
            operation.params.oldDepth,
            operation.params.newParentId,
            operation.params.newDepth,
            operation.timestamp
        );
    },
    
    /**
     * Invert DeleteOperation (becomes CreateOperation)
     * @param {Object} operation - DeleteOperation instance
     * @param {Function} CreateOperationClass - CreateOperation class constructor
     * @returns {Object} Inverse CreateOperation
     */
    invertDeleteOperation(operation, CreateOperationClass) {
        return new CreateOperationClass(
            operation.itemId,
            operation.params.deletedItem.type,
            operation.params.deletedParentId,
            operation.params.deletedIndex,
            operation.params.deletedItem,
            operation.timestamp
        );
    },
    
    /**
     * Invert CreateOperation (becomes DeleteOperation)
     * @param {Object} operation - CreateOperation instance
     * @param {Function} DeleteOperationClass - DeleteOperation class constructor
     * @returns {Object} Inverse DeleteOperation
     */
    invertCreateOperation(operation, DeleteOperationClass) {
        return new DeleteOperationClass(
            operation.itemId,
            operation.params.itemData,
            operation.timestamp
        );
    },
    
    /**
     * Generic operation inverter that routes to specific inverters
     * @param {Object} operation - Operation instance
     * @param {Object} operationClasses - Object with operation class constructors
     * @returns {Object|null} Inverse operation or null if failed
     */
    invertOperation(operation, operationClasses) {
        if (!operation) {
            return null;
        }
        
        const operationType = operation.getType ? operation.getType() : operation.op || operation.type;
        
        switch (operationType) {
            case 'setText':
                return OperationInverter.invertSetTextOperation(operation, operationClasses.SetTextOperation);
            case 'split':
                return OperationInverter.invertSplitOperation(operation, operationClasses.MergeOperation);
            case 'merge':
                return OperationInverter.invertMergeOperation(operation, operationClasses.SplitOperation);
            case 'move':
                return OperationInverter.invertMoveOperation(operation, operationClasses.MoveOperation);
            case 'reparent':
                return OperationInverter.invertReparentOperation(operation, operationClasses.ReparentOperation);
            case 'delete':
                return OperationInverter.invertDeleteOperation(operation, operationClasses.CreateOperation);
            case 'create':
                return OperationInverter.invertCreateOperation(operation, operationClasses.DeleteOperation);
            default:
                console.error(`[OperationInverter] Unknown operation type: ${operationType}`);
                return null;
        }
    }
};

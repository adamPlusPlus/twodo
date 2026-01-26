// tests/helpers/operationHelpers.js - Operation creation helpers

import { SetTextOperation, SplitOperation, MergeOperation, MoveOperation, ReparentOperation, DeleteOperation, CreateOperation } from '../../js/core/SemanticOperations.js';

/**
 * Create a setText operation
 * @param {string} itemId - Item ID
 * @param {string} text - New text
 * @param {string} oldText - Old text
 * @param {number} timestamp - Optional timestamp
 * @returns {SetTextOperation}
 */
export function createSetTextOperation(itemId, text, oldText = '', timestamp = null) {
    return new SetTextOperation(itemId, text, oldText, timestamp);
}

/**
 * Create a move operation
 * @param {string} itemId - Item ID
 * @param {string} newParentId - New parent ID
 * @param {number} newIndex - New index
 * @param {string} oldParentId - Old parent ID
 * @param {number} oldIndex - Old index
 * @param {number} timestamp - Optional timestamp
 * @returns {MoveOperation}
 */
export function createMoveOperation(itemId, newParentId, newIndex, oldParentId = null, oldIndex = null, timestamp = null) {
    return new MoveOperation(itemId, newParentId, newIndex, oldParentId, oldIndex, timestamp);
}

/**
 * Create a create operation
 * @param {string} itemId - New item ID
 * @param {string} type - Item type
 * @param {string} parentId - Parent ID
 * @param {number} index - Index
 * @param {Object} itemData - Item data
 * @param {number} timestamp - Optional timestamp
 * @returns {CreateOperation}
 */
export function createCreateOperation(itemId, type, parentId, index, itemData = {}, timestamp = null) {
    return new CreateOperation(itemId, type, parentId, index, itemData, timestamp);
}

/**
 * Create a delete operation
 * @param {string} itemId - Item ID
 * @param {Object} deletedItem - Deleted item data
 * @param {number} timestamp - Optional timestamp
 * @returns {DeleteOperation}
 */
export function createDeleteOperation(itemId, deletedItem = null, timestamp = null) {
    return new DeleteOperation(itemId, deletedItem, timestamp);
}

/**
 * Create a split operation
 * @param {string} itemId - Item ID
 * @param {number} caretPosition - Caret position
 * @param {string} newItemId - New item ID
 * @param {number} timestamp - Optional timestamp
 * @returns {SplitOperation}
 */
export function createSplitOperation(itemId, caretPosition, newItemId, timestamp = null) {
    return new SplitOperation(itemId, caretPosition, newItemId, timestamp);
}

/**
 * Create a merge operation
 * @param {string} itemId - Item ID
 * @param {string} previousItemId - Previous item ID
 * @param {number} timestamp - Optional timestamp
 * @returns {MergeOperation}
 */
export function createMergeOperation(itemId, previousItemId, timestamp = null) {
    return new MergeOperation(itemId, previousItemId, timestamp);
}

/**
 * Create a reparent operation
 * @param {string} itemId - Item ID
 * @param {string} newParentId - New parent ID
 * @param {number} newDepth - New depth
 * @param {string} oldParentId - Old parent ID
 * @param {number} oldDepth - Old depth
 * @param {number} timestamp - Optional timestamp
 * @returns {ReparentOperation}
 */
export function createReparentOperation(itemId, newParentId, newDepth, oldParentId = null, oldDepth = null, timestamp = null) {
    return new ReparentOperation(itemId, newParentId, newDepth, oldParentId, oldDepth, timestamp);
}

/**
 * Create a batch of test operations
 * @param {number} count - Number of operations
 * @param {string} prefix - Item ID prefix
 * @returns {Array} Array of operations
 */
export function createTestOperations(count, prefix = 'item') {
    const operations = [];
    for (let i = 0; i < count; i++) {
        const itemId = `${prefix}-${i}`;
        operations.push(createSetTextOperation(itemId, `Text ${i}`, `Old text ${i}`));
    }
    return operations;
}

/**
 * Assert two operations are equal
 * @param {Object} op1 - First operation
 * @param {Object} op2 - Second operation
 * @returns {boolean} True if equal
 */
export function assertOperationEqual(op1, op2) {
    if (!op1 || !op2) return false;
    
    // Compare operation type
    const type1 = op1.getType ? op1.getType() : op1.op;
    const type2 = op2.getType ? op2.getType() : op2.op;
    
    if (type1 !== type2) return false;
    
    // Compare itemId
    if (op1.itemId !== op2.itemId) return false;
    
    // Compare params (shallow)
    const params1 = op1.params || {};
    const params2 = op2.params || {};
    
    for (const key in params1) {
        if (params1[key] !== params2[key]) {
            return false;
        }
    }
    
    return true;
}

/**
 * Convert operation to plain object
 * @param {Object} operation - Operation instance
 * @returns {Object} Plain operation object
 */
export function operationToObject(operation) {
    return {
        op: operation.getType ? operation.getType() : operation.op,
        itemId: operation.itemId,
        params: operation.params || {},
        timestamp: operation.timestamp || null
    };
}

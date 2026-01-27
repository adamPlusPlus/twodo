// DragValidator.js - Drag validation utilities
// Extracted from DragDropHandler.js for reusability and maintainability

import { ItemHierarchy } from './ItemHierarchy.js';

/**
 * DragValidator - Functions for validating drag operations
 */
export class DragValidator {
    /**
     * Check if item can be dragged
     * @param {string} itemId - Item ID
     * @param {Object} sourceLocation - Source location info
     * @returns {boolean} True if can be dragged
     */
    static canDrag(itemId, sourceLocation) {
        if (!itemId || !sourceLocation || !sourceLocation.item) {
            return false;
        }
        
        // All items can be dragged by default
        // Add specific constraints here if needed
        return true;
    }
    
    /**
     * Check if drop is valid
     * @param {Object} dragData - Drag data object
     * @param {Object} targetLocation - Target location info
     * @returns {boolean} True if drop is valid
     */
    static canDrop(dragData, targetLocation) {
        if (!dragData || !targetLocation) {
            return false;
        }
        
        // Can't drop on itself
        if (dragData.pageId === targetLocation.documentId &&
            dragData.binId === targetLocation.groupId &&
            dragData.elementIndex === targetLocation.itemIndex) {
            return false;
        }
        
        return true;
    }
    
    /**
     * Validate drag target
     * @param {string} sourceItemId - Source item ID
     * @param {string} targetItemId - Target item ID
     * @param {Object} itemIndex - Item index map
     * @returns {Object} Validation result { valid: boolean, reason: string }
     */
    static validateDragTarget(sourceItemId, targetItemId, itemIndex) {
        if (!sourceItemId || !targetItemId || !itemIndex) {
            return { valid: false, reason: 'Missing parameters' };
        }
        
        const sourceItem = itemIndex[sourceItemId];
        const targetItem = itemIndex[targetItemId];
        
        if (!sourceItem || !targetItem) {
            return { valid: false, reason: 'Item not found' };
        }
        
        // Check for circular nesting
        if (DragValidator.isDescendant(targetItem, sourceItem, itemIndex)) {
            return { valid: false, reason: 'Cannot drop: target is a descendant of source (circular nesting prevented)' };
        }
        
        // Check for self-nesting
        if (sourceItemId === targetItemId) {
            return { valid: false, reason: 'Cannot nest: cannot nest element into itself' };
        }
        
        return { valid: true };
    }
    
    /**
     * Check if target is a descendant of source
     * @param {Object} parent - Parent item
     * @param {Object} child - Child item
     * @param {Object} itemIndex - Item index map
     * @returns {boolean} True if child is descendant of parent
     */
    static isDescendant(parent, child, itemIndex) {
        if (!parent || !child || !itemIndex) {
            return false;
        }
        
        const children = ItemHierarchy.getChildItems(parent, itemIndex);
        for (const c of children) {
            if (c === child) {
                return true;
            }
            if (DragValidator.isDescendant(c, child, itemIndex)) {
                return true;
            }
        }
        return false;
    }
    
    /**
     * Validate drag operation
     * @param {Object} operation - Operation object
     * @returns {boolean} True if valid
     */
    static validateDragOperation(operation) {
        if (!operation || !operation.itemId) {
            return false;
        }
        
        // Validate operation parameters
        if (operation.params) {
            if (operation.params.newIndex !== undefined && typeof operation.params.newIndex !== 'number') {
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * Get drag constraints for item
     * @param {string} itemId - Item ID
     * @param {Object} itemIndex - Item index map
     * @returns {Object} Constraints object
     */
    static getDragConstraints(itemId, itemIndex) {
        const item = itemIndex[itemId];
        if (!item) {
            return { canDrag: false, reason: 'Item not found' };
        }
        
        return {
            canDrag: true,
            canNest: true,
            maxDepth: 1, // One-level nesting limit
            preventSelfNest: true,
            preventCircularNest: true
        };
    }
}

// OperationApplier.js - Operation application helper utilities
// Extracted from SemanticOperations.js for reusability and maintainability

import { getService, SERVICES } from '../core/AppServices.js';
import { ItemHierarchy } from './ItemHierarchy.js';

/**
 * OperationApplier - Helper functions for applying operations
 */
export const OperationApplier = {
    /**
     * Find item by ID in canonical model
     * @param {string} itemId - Item ID
     * @param {Object} appState - AppState instance (optional, will fetch if not provided)
     * @returns {Object|null} Item location object or null if not found
     */
    findItem(itemId, appState = null) {
        if (!itemId) {
            return null;
        }
        
        if (!appState) {
            appState = getService(SERVICES.APP_STATE);
        }
        
        if (!appState) {
            return null;
        }
        
        const documents = appState.documents || [];
        for (const document of documents) {
            if (!document.groups) continue;
            
            for (const group of document.groups) {
                if (!group.items) continue;
                
                const itemIndex = ItemHierarchy.buildItemIndex(group.items);
                
                // Check root items
                for (let i = 0; i < group.items.length; i++) {
                    const item = group.items[i];
                    if (item && item.id === itemId) {
                        return {
                            item,
                            documentId: document.id,
                            groupId: group.id,
                            itemIndex: i,
                            isChild: false,
                            group
                        };
                    }
                    
                    // Check child items
                    if (item) {
                        const children = ItemHierarchy.getChildItems(item, itemIndex);
                        for (let j = 0; j < children.length; j++) {
                            const child = children[j];
                            if (child && child.id === itemId) {
                                return {
                                    item: child,
                                    documentId: document.id,
                                    groupId: group.id,
                                    itemIndex: i,
                                    childIndex: j,
                                    isChild: true,
                                    parentItem: item,
                                    group
                                };
                            }
                        }
                    }
                }
            }
        }
        
        return null;
    },
    
    /**
     * Remove item from parent's childIds array
     * @param {string} parentId - Parent item ID
     * @param {string} itemId - Child item ID
     * @param {Object} appState - AppState instance (optional)
     * @returns {boolean} True if removed successfully
     */
    removeFromParentChildIds(parentId, itemId, appState = null) {
        if (!parentId || !itemId) {
            return false;
        }
        
        const parentLocation = OperationApplier.findItem(parentId, appState);
        if (!parentLocation || !parentLocation.item) {
            return false;
        }
        
        if (!parentLocation.item.childIds) {
            return false;
        }
        
        const childIndex = parentLocation.item.childIds.indexOf(itemId);
        if (childIndex !== -1) {
            parentLocation.item.childIds.splice(childIndex, 1);
            return true;
        }
        
        return false;
    },
    
    /**
     * Add item to parent's childIds array
     * @param {string} parentId - Parent item ID
     * @param {string} itemId - Child item ID
     * @param {Object} appState - AppState instance (optional)
     * @returns {boolean} True if added successfully
     */
    addToParentChildIds(parentId, itemId, appState = null) {
        if (!parentId || !itemId) {
            return false;
        }
        
        const parentLocation = OperationApplier.findItem(parentId, appState);
        if (!parentLocation || !parentLocation.item) {
            return false;
        }
        
        if (!parentLocation.item.childIds) {
            parentLocation.item.childIds = [];
        }
        
        if (!parentLocation.item.childIds.includes(itemId)) {
            parentLocation.item.childIds.push(itemId);
            return true;
        }
        
        return false;
    },
    
    /**
     * Update parent's childIds array (remove from old, add to new)
     * @param {string} oldParentId - Old parent ID (can be null)
     * @param {string} newParentId - New parent ID (can be null)
     * @param {string} itemId - Child item ID
     * @param {Object} appState - AppState instance (optional)
     * @returns {boolean} True if updated successfully
     */
    updateParentChildIds(oldParentId, newParentId, itemId, appState = null) {
        let success = true;
        
        // Remove from old parent
        if (oldParentId) {
            success = OperationApplier.removeFromParentChildIds(oldParentId, itemId, appState) && success;
        }
        
        // Add to new parent
        if (newParentId) {
            success = OperationApplier.addToParentChildIds(newParentId, itemId, appState) && success;
        }
        
        return success;
    },
    
    /**
     * Find target group for operations
     * @param {string} parentId - Parent item ID (optional)
     * @param {Object} appState - AppState instance (optional)
     * @returns {Object|null} Target group or null if not found
     */
    findTargetGroup(parentId, appState = null) {
        if (!appState) {
            appState = getService(SERVICES.APP_STATE);
        }
        
        if (!appState) {
            return null;
        }
        
        if (parentId) {
            // Find parent item's group
            const parentLocation = OperationApplier.findItem(parentId, appState);
            if (parentLocation) {
                return parentLocation.group;
            }
            return null;
        } else {
            // Find first group in current document
            const documents = appState.documents || [];
            const currentDoc = documents.find(d => d.id === appState.currentDocumentId);
            if (currentDoc && currentDoc.groups && currentDoc.groups.length > 0) {
                return currentDoc.groups[0];
            }
        }
        
        return null;
    },
    
    /**
     * Insert item at index in group
     * @param {Object} group - Group object
     * @param {Object} item - Item object
     * @param {number} index - Insert index
     * @returns {number} Actual insert index
     */
    insertItemAt(group, item, index) {
        if (!group || !group.items) {
            return -1;
        }
        
        const insertIndex = Math.min(index, group.items.length);
        group.items.splice(insertIndex, 0, item);
        return insertIndex;
    },
    
    /**
     * Remove item at index from group
     * @param {Object} group - Group object
     * @param {number} index - Item index
     * @returns {Object|null} Removed item or null if failed
     */
    removeItemAt(group, index) {
        if (!group || !group.items || index < 0 || index >= group.items.length) {
            return null;
        }
        
        return group.items.splice(index, 1)[0] || null;
    },
    
    /**
     * Deep clone item for undo/redo
     * @param {Object} item - Item object
     * @returns {Object} Cloned item
     */
    cloneItem(item) {
        if (!item) {
            return null;
        }
        return JSON.parse(JSON.stringify(item));
    },
    
    /**
     * Calculate item depth by counting parent chain
     * @param {Object} item - Item object
     * @param {Object} appState - AppState instance (optional)
     * @returns {number} Item depth
     */
    calculateDepth(item, appState = null) {
        if (!item) {
            return 0;
        }
        
        let depth = 0;
        let current = item;
        const visited = new Set();
        
        while (current && current.parentId && !visited.has(current.id)) {
            visited.add(current.id);
            const parentLocation = OperationApplier.findItem(current.parentId, appState);
            if (parentLocation && parentLocation.item) {
                depth++;
                current = parentLocation.item;
            } else {
                break;
            }
        }
        
        return depth;
    }
};

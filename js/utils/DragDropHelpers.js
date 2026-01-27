// DragDropHelpers.js - Helper functions for drag and drop operations
// Extracted from DragDropHandler.js for reusability and maintainability

import { getService, SERVICES } from '../core/AppServices.js';
import { ItemHierarchy } from './ItemHierarchy.js';
import { OperationApplier } from './OperationApplier.js';

/**
 * DragDropHelpers - Utility functions for drag and drop operations
 */
export const DragDropHelpers = {
    /**
     * Get document by page ID
     * @param {string} pageId - Page ID
     * @returns {Object|null} Document or null
     */
    getDocument(pageId) {
        const appState = getService(SERVICES.APP_STATE);
        return appState?.documents?.find(page => page.id === pageId) || null;
    },
    
    /**
     * Get group by page ID and bin ID
     * @param {string} pageId - Page ID
     * @param {string} binId - Bin ID
     * @returns {Object|null} Group or null
     */
    getGroup(pageId, binId) {
        const document = DragDropHelpers.getDocument(pageId);
        const group = document?.groups?.find(bin => bin.id === binId) || null;
        if (!group) return null;
        const items = group.items || [];
        group.items = items;
        return group;
    },
    
    /**
     * Get root items from items array
     * @param {Array} items - Items array
     * @returns {Array} Root items
     */
    getRootItems(items) {
        return ItemHierarchy.getRootItems(items);
    },
    
    /**
     * Get root item at index
     * @param {Array} items - Items array
     * @param {number} elementIndex - Element index
     * @returns {Object|null} Root item or null
     */
    getRootItemAtIndex(items, elementIndex) {
        return ItemHierarchy.getRootItemAtIndex(items, elementIndex);
    },
    
    /**
     * Get flat insert index from root index
     * @param {Array} items - Items array
     * @param {number} rootIndex - Root item index
     * @returns {number} Flat insert index
     */
    getFlatInsertIndex(items, rootIndex) {
        if (rootIndex <= 0) return 0;
        let seenRoots = 0;
        for (let i = 0; i < items.length; i++) {
            if (!items[i]?.parentId) {
                if (seenRoots === rootIndex) {
                    return i;
                }
                seenRoots += 1;
            }
        }
        return items.length;
    },
    
    /**
     * Get child items for a group and parent element
     * @param {Object} group - Group object
     * @param {Object} parentElement - Parent element
     * @returns {Array} Child items
     */
    getChildItemsForGroup(group, parentElement) {
        const itemIndex = ItemHierarchy.buildItemIndex(group?.items || []);
        return ItemHierarchy.getChildItems(parentElement, itemIndex);
    },
    
    /**
     * Get child item for a group, parent element, and child index
     * @param {Object} group - Group object
     * @param {Object} parentElement - Parent element
     * @param {number} childIndex - Child index
     * @returns {Object|null} Child item or null
     */
    getChildItemForGroup(group, parentElement, childIndex) {
        const children = DragDropHelpers.getChildItemsForGroup(group, parentElement);
        return children[childIndex] || null;
    },
    
    /**
     * Get descendant IDs for an item
     * @param {Object} item - Item object
     * @param {Object} itemIndex - Item index map
     * @returns {Array} Descendant IDs
     */
    getDescendantIds(item, itemIndex) {
        const descendants = [];
        const walk = (node) => {
            const children = ItemHierarchy.getChildItems(node, itemIndex);
            children.forEach(child => {
                descendants.push(child.id);
                walk(child);
            });
        };
        walk(item);
        return descendants;
    },
    
    /**
     * Remove items by IDs
     * @param {Array} items - Items array
     * @param {Set|Array} ids - IDs to remove
     * @returns {Array} Filtered items array
     */
    removeItemsByIds(items, ids) {
        const idSet = ids instanceof Set ? ids : new Set(ids);
        return (items || []).filter(item => !idSet.has(item.id));
    },
    
    /**
     * Get items by IDs
     * @param {Array} items - Items array
     * @param {Set|Array} ids - IDs to get
     * @returns {Array} Matching items
     */
    getItemsByIds(items, ids) {
        const idSet = ids instanceof Set ? ids : new Set(ids);
        return (items || []).filter(item => idSet.has(item.id));
    },
    
    /**
     * Find item by ID
     * @param {string} itemId - Item ID
     * @returns {Object|null} Location info or null
     */
    findItemById(itemId) {
        return OperationApplier.findItem(itemId);
    },
    
    /**
     * Get item ID at index in a group
     * @param {Object} group - Group object
     * @param {number} index - Root item index
     * @returns {string|null} Item ID or null
     */
    getItemIdAtIndex(group, index) {
        if (!group || !group.items) return null;
        const rootItems = DragDropHelpers.getRootItems(group.items);
        const item = rootItems[index];
        return item?.id || null;
    }
};

// ElementQueries.js - Query utilities for finding documents, groups, and elements
// Extracted from ElementManager.js for reusability and maintainability

/**
 * ElementQueries - Utility functions for querying document structure
 */
export const ElementQueries = {
    /**
     * Find document by page ID
     * @param {Object} appState - AppState instance
     * @param {string} pageId - Page/document ID
     * @returns {Object|null} Document object or null if not found
     */
    findDocument(appState, pageId) {
        if (!appState || !appState.documents || !pageId) {
            return null;
        }
        return appState.documents.find(p => p.id === pageId) || null;
    },
    
    /**
     * Find group/bin by ID within a document
     * @param {Object} document - Document object
     * @param {string} binId - Group/bin ID
     * @returns {Object|null} Group object or null if not found
     */
    findGroup(document, binId) {
        if (!document || !document.groups || !binId) {
            return null;
        }
        return document.groups.find(b => b.id === binId) || null;
    },
    
    /**
     * Find element by index within a group
     * @param {Object} group - Group object
     * @param {number|string} elementIndex - Element index (can be string like "0-1" for nested)
     * @returns {Object|null} Element object or null if not found
     */
    findElement(group, elementIndex) {
        if (!group || !group.items || elementIndex === undefined || elementIndex === null) {
            return null;
        }
        
        // Handle nested index strings like "0-1"
        if (typeof elementIndex === 'string' && elementIndex.includes('-')) {
            const parts = elementIndex.split('-');
            const parentIndex = parseInt(parts[0]);
            const childIndex = parseInt(parts[1]);
            
            const parentElement = group.items[parentIndex];
            if (!parentElement) return null;
            
            // For nested children, we'd need ItemHierarchy to find the child
            // This is a simplified version - full implementation may need ItemHierarchy
            return parentElement;
        }
        
        const index = typeof elementIndex === 'string' ? parseInt(elementIndex) : elementIndex;
        if (isNaN(index) || index < 0 || index >= group.items.length) {
            return null;
        }
        
        return group.items[index] || null;
    },
    
    /**
     * Parse nested index string (e.g., "0-1" for nested children)
     * @param {string|number} elementIndex - Element index
     * @returns {Object} { elementIndex: number, childIndex: number|null }
     */
    parseNestedIndex(elementIndex) {
        if (typeof elementIndex === 'string' && elementIndex.includes('-')) {
            const parts = elementIndex.split('-');
            return {
                elementIndex: parseInt(parts[0]),
                childIndex: parts.length > 1 ? parseInt(parts[1]) : null
            };
        }
        return {
            elementIndex: typeof elementIndex === 'string' ? parseInt(elementIndex) : elementIndex,
            childIndex: null
        };
    },
    
    /**
     * Ensure group has an items array
     * @param {Object} group - Group object
     * @returns {Array} Items array (created if it doesn't exist)
     */
    ensureItemsArray(group) {
        if (!group) {
            return [];
        }
        if (!group.items) {
            group.items = [];
        }
        return group.items;
    }
};

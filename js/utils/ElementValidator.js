// ElementValidator.js - Validation utilities for elements, documents, and groups
// Extracted from ElementManager.js for reusability and maintainability

/**
 * ElementValidator - Validation functions for element operations
 */
export const ElementValidator = {
    /**
     * Validate that a document exists
     * @param {Object} appState - AppState instance
     * @param {string} pageId - Page/document ID
     * @returns {Object} { valid: boolean, document: Object|null, error: string|null }
     */
    validateDocumentExists(appState, pageId) {
        if (!appState || !appState.documents) {
            return { valid: false, document: null, error: 'AppState not available' };
        }
        if (!pageId) {
            return { valid: false, document: null, error: 'Page ID is required' };
        }
        
        const document = appState.documents.find(p => p.id === pageId);
        if (!document) {
            return { valid: false, document: null, error: `Document not found: ${pageId}` };
        }
        
        return { valid: true, document, error: null };
    },
    
    /**
     * Validate that a group/bin exists within a document
     * @param {Object} document - Document object
     * @param {string} binId - Group/bin ID
     * @returns {Object} { valid: boolean, group: Object|null, error: string|null }
     */
    validateGroupExists(document, binId) {
        if (!document) {
            return { valid: false, group: null, error: 'Document is required' };
        }
        if (!document.groups) {
            return { valid: false, group: null, error: 'Document has no groups' };
        }
        if (!binId) {
            return { valid: false, group: null, error: 'Bin ID is required' };
        }
        
        const group = document.groups.find(b => b.id === binId);
        if (!group) {
            return { valid: false, group: null, error: `Group not found: ${binId}` };
        }
        
        return { valid: true, group, error: null };
    },
    
    /**
     * Validate that an element exists within a group
     * @param {Object} group - Group object
     * @param {number|string} elementIndex - Element index
     * @returns {Object} { valid: boolean, element: Object|null, error: string|null }
     */
    validateElementExists(group, elementIndex) {
        if (!group) {
            return { valid: false, element: null, error: 'Group is required' };
        }
        if (!group.items) {
            return { valid: false, element: null, error: 'Group has no items' };
        }
        if (elementIndex === undefined || elementIndex === null) {
            return { valid: false, element: null, error: 'Element index is required' };
        }
        
        const index = typeof elementIndex === 'string' ? parseInt(elementIndex) : elementIndex;
        if (isNaN(index) || index < 0 || index >= group.items.length) {
            return { valid: false, element: null, error: `Element index out of range: ${elementIndex}` };
        }
        
        const element = group.items[index];
        if (!element) {
            return { valid: false, element: null, error: `Element not found at index: ${elementIndex}` };
        }
        
        return { valid: true, element, error: null };
    },
    
    /**
     * Validate element type
     * @param {string} type - Element type
     * @returns {Object} { valid: boolean, error: string|null }
     */
    validateElementType(type) {
        if (!type || typeof type !== 'string') {
            return { valid: false, error: 'Element type must be a non-empty string' };
        }
        
        // List of valid element types (can be expanded)
        const validTypes = [
            'task', 'header-checkbox', 'multi-checkbox', 'one-time',
            'audio', 'timer', 'counter', 'tracker', 'rating',
            'image', 'time-log', 'calendar', 'note', 'text'
        ];
        
        // Allow any type (plugins can add custom types)
        // Just check it's a string
        return { valid: true, error: null };
    }
};

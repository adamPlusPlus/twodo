// DataValidator.js - Data validation utilities
// Extracted from DataManager.js for reusability and maintainability

/**
 * DataValidator - Functions for validating data structures
 */
export const DataValidator = {
    /**
     * Validate document structure
     * @param {Object} document - Document object
     * @returns {boolean} True if valid
     */
    validateDocument(document) {
        if (!document || typeof document !== 'object') {
            return false;
        }
        
        // Document should have an id
        if (!document.id || typeof document.id !== 'string') {
            return false;
        }
        
        // Groups should be an array if present
        if (document.groups !== undefined && !Array.isArray(document.groups)) {
            return false;
        }
        
        return true;
    },
    
    /**
     * Validate group structure
     * @param {Object} group - Group object
     * @returns {boolean} True if valid
     */
    validateGroup(group) {
        if (!group || typeof group !== 'object') {
            return false;
        }
        
        // Group should have an id
        if (!group.id || typeof group.id !== 'string') {
            return false;
        }
        
        // Items should be an array if present
        if (group.items !== undefined && !Array.isArray(group.items)) {
            return false;
        }
        
        return true;
    },
    
    /**
     * Validate item structure
     * @param {Object} item - Item object
     * @returns {boolean} True if valid
     */
    validateItem(item) {
        if (!item || typeof item !== 'object') {
            return false;
        }
        
        // Item should have an id
        if (!item.id || typeof item.id !== 'string') {
            return false;
        }
        
        // Type should be a string if present
        if (item.type !== undefined && typeof item.type !== 'string') {
            return false;
        }
        
        // childIds should be an array if present
        if (item.childIds !== undefined && !Array.isArray(item.childIds)) {
            return false;
        }
        
        return true;
    },
    
    /**
     * Validate entire data model
     * @param {Object} data - Data model object
     * @returns {Object} Validation result { valid: boolean, errors: Array<string> }
     */
    validateDataModel(data) {
        const errors = [];
        
        if (!data || typeof data !== 'object') {
            return { valid: false, errors: ['Data model is not an object'] };
        }
        
        // Documents should be an array
        if (data.documents !== undefined) {
            if (!Array.isArray(data.documents)) {
                errors.push('documents must be an array');
            } else {
                // Validate each document
                data.documents.forEach((doc, index) => {
                    if (!DataValidator.validateDocument(doc)) {
                        errors.push(`Document at index ${index} is invalid`);
                    } else if (doc.groups) {
                        // Validate groups in document
                        doc.groups.forEach((group, groupIndex) => {
                            if (!DataValidator.validateGroup(group)) {
                                errors.push(`Group at index ${groupIndex} in document ${index} is invalid`);
                            } else if (group.items) {
                                // Validate items in group
                                group.items.forEach((item, itemIndex) => {
                                    if (!DataValidator.validateItem(item)) {
                                        errors.push(`Item at index ${itemIndex} in group ${groupIndex} of document ${index} is invalid`);
                                    }
                                });
                            }
                        });
                    }
                });
            }
        }
        
        return {
            valid: errors.length === 0,
            errors
        };
    },
    
    /**
     * Sanitize data for safety
     * @param {any} data - Data to sanitize
     * @returns {any} Sanitized data
     */
    sanitizeData(data) {
        if (data === null || data === undefined) {
            return data;
        }
        
        // Deep clone to avoid mutating original
        try {
            const sanitized = JSON.parse(JSON.stringify(data));
            return sanitized;
        } catch (error) {
            console.error('[DataValidator] Failed to sanitize data:', error);
            return null;
        }
    }
};

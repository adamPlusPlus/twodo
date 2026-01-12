// ModalValidator.js - Handles modal form validation
// Extracted from ModalHandler to separate validation concerns

/**
 * ModalValidator - Handles validation logic for modals
 * 
 * This class is responsible for:
 * - Validating form inputs
 * - Validating data before saving
 * - Providing validation error messages
 */
export class ModalValidator {
    constructor() {
    }
    
    /**
     * Validate element data
     * @param {Object} element - Element data to validate
     * @returns {{valid: boolean, errors: Array<string>}}
     */
    validateElement(element) {
        const errors = [];
        
        if (!element) {
            errors.push('Element data is required');
            return { valid: false, errors };
        }
        
        if (element.type && typeof element.type !== 'string') {
            errors.push('Element type must be a string');
        }
        
        // Add more validation rules as needed
        
        return {
            valid: errors.length === 0,
            errors
        };
    }
    
    /**
     * Validate page data
     * @param {Object} page - Page data to validate
     * @returns {{valid: boolean, errors: Array<string>}}
     */
    validatePage(page) {
        const errors = [];
        
        if (!page) {
            errors.push('Page data is required');
            return { valid: false, errors };
        }
        
        if (!page.id || typeof page.id !== 'string') {
            errors.push('Page ID is required and must be a string');
        }
        
        return {
            valid: errors.length === 0,
            errors
        };
    }
    
    /**
     * Validate bin data
     * @param {Object} bin - Bin data to validate
     * @returns {{valid: boolean, errors: Array<string>}}
     */
    validateBin(bin) {
        const errors = [];
        
        if (!bin) {
            errors.push('Bin data is required');
            return { valid: false, errors };
        }
        
        if (!bin.id || typeof bin.id !== 'string') {
            errors.push('Bin ID is required and must be a string');
        }
        
        return {
            valid: errors.length === 0,
            errors
        };
    }
}

// Validation Utilities - Field validators and type checking
export const ValidationUtils = {
    /**
     * Check if value is empty
     * @param {*} value - Value to check
     * @returns {boolean}
     */
    isEmpty(value) {
        if (value === null || value === undefined) return true;
        if (typeof value === 'string') return value.trim().length === 0;
        if (Array.isArray(value)) return value.length === 0;
        if (typeof value === 'object') return Object.keys(value).length === 0;
        return false;
    },
    
    /**
     * Check if value is not empty
     * @param {*} value - Value to check
     * @returns {boolean}
     */
    isNotEmpty(value) {
        return !this.isEmpty(value);
    },
    
    /**
     * Validate email format
     * @param {string} email - Email to validate
     * @returns {boolean}
     */
    isEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    },
    
    /**
     * Validate URL format
     * @param {string} url - URL to validate
     * @returns {boolean}
     */
    isUrl(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    },
    
    /**
     * Validate number
     * @param {*} value - Value to validate
     * @returns {boolean}
     */
    isNumber(value) {
        return typeof value === 'number' && !isNaN(value);
    },
    
    /**
     * Validate integer
     * @param {*} value - Value to validate
     * @returns {boolean}
     */
    isInteger(value) {
        return Number.isInteger(value);
    },
    
    /**
     * Validate string length
     * @param {string} str - String to validate
     * @param {number} min - Minimum length
     * @param {number} max - Maximum length
     * @returns {boolean}
     */
    isLength(str, min = 0, max = Infinity) {
        const len = typeof str === 'string' ? str.length : 0;
        return len >= min && len <= max;
    },
    
    /**
     * Validate date
     * @param {*} value - Value to validate
     * @returns {boolean}
     */
    isDate(value) {
        return value instanceof Date && !isNaN(value.getTime());
    },
    
    /**
     * Validate date string
     * @param {string} dateStr - Date string to validate
     * @returns {boolean}
     */
    isDateString(dateStr) {
        const date = new Date(dateStr);
        return !isNaN(date.getTime());
    },
    
    /**
     * Validate value is in range
     * @param {number} value - Value to validate
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @returns {boolean}
     */
    isInRange(value, min, max) {
        return value >= min && value <= max;
    },
    
    /**
     * Validate value matches pattern
     * @param {string} value - Value to validate
     * @param {RegExp|string} pattern - Pattern to match
     * @returns {boolean}
     */
    matches(value, pattern) {
        const regex = pattern instanceof RegExp ? pattern : new RegExp(pattern);
        return regex.test(value);
    },
    
    /**
     * Validate object has required fields
     * @param {Object} obj - Object to validate
     * @param {Array<string>} requiredFields - Required field names
     * @returns {Object} - { valid: boolean, missing: Array<string> }
     */
    hasRequiredFields(obj, requiredFields) {
        const missing = requiredFields.filter(field => {
            const value = this.getNestedValue(obj, field);
            return value === undefined || value === null || value === '';
        });
        
        return {
            valid: missing.length === 0,
            missing
        };
    },
    
    /**
     * Get nested value helper
     * @param {Object} obj - Object
     * @param {string} path - Dot-separated path
     * @returns {*}
     */
    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => current?.[key], obj);
    },
    
    /**
     * Validate field with rules
     * @param {*} value - Value to validate
     * @param {Object} rules - Validation rules
     * @returns {Object} - { valid: boolean, errors: Array<string> }
     */
    validate(value, rules) {
        const errors = [];
        
        if (rules.required && this.isEmpty(value)) {
            errors.push(rules.requiredMessage || 'This field is required');
        }
        
        if (!this.isEmpty(value)) {
            if (rules.type) {
                const typeValid = this.validateType(value, rules.type);
                if (!typeValid) {
                    errors.push(rules.typeMessage || `Must be of type ${rules.type}`);
                }
            }
            
            if (rules.minLength !== undefined && typeof value === 'string') {
                if (!this.isLength(value, rules.minLength)) {
                    errors.push(rules.minLengthMessage || `Must be at least ${rules.minLength} characters`);
                }
            }
            
            if (rules.maxLength !== undefined && typeof value === 'string') {
                if (!this.isLength(value, 0, rules.maxLength)) {
                    errors.push(rules.maxLengthMessage || `Must be at most ${rules.maxLength} characters`);
                }
            }
            
            if (rules.min !== undefined && typeof value === 'number') {
                if (value < rules.min) {
                    errors.push(rules.minMessage || `Must be at least ${rules.min}`);
                }
            }
            
            if (rules.max !== undefined && typeof value === 'number') {
                if (value > rules.max) {
                    errors.push(rules.maxMessage || `Must be at most ${rules.max}`);
                }
            }
            
            if (rules.pattern) {
                if (!this.matches(value, rules.pattern)) {
                    errors.push(rules.patternMessage || 'Invalid format');
                }
            }
            
            if (rules.email && !this.isEmail(value)) {
                errors.push(rules.emailMessage || 'Invalid email format');
            }
            
            if (rules.url && !this.isUrl(value)) {
                errors.push(rules.urlMessage || 'Invalid URL format');
            }
            
            if (rules.custom && typeof rules.custom === 'function') {
                const customResult = rules.custom(value);
                if (customResult !== true) {
                    errors.push(customResult || 'Validation failed');
                }
            }
        }
        
        return {
            valid: errors.length === 0,
            errors
        };
    },
    
    /**
     * Validate type
     * @param {*} value - Value to validate
     * @param {string} type - Expected type
     * @returns {boolean}
     */
    validateType(value, type) {
        switch (type) {
            case 'string':
                return typeof value === 'string';
            case 'number':
                return this.isNumber(value);
            case 'integer':
                return this.isInteger(value);
            case 'boolean':
                return typeof value === 'boolean';
            case 'array':
                return Array.isArray(value);
            case 'object':
                return typeof value === 'object' && value !== null && !Array.isArray(value);
            case 'date':
                return this.isDate(value);
            default:
                return true;
        }
    },
    
    /**
     * Validate entire form/object
     * @param {Object} data - Data to validate
     * @param {Object} schema - Validation schema
     * @returns {Object} - { valid: boolean, errors: Object }
     */
    validateSchema(data, schema) {
        const errors = {};
        let isValid = true;
        
        for (const [field, rules] of Object.entries(schema)) {
            const value = this.getNestedValue(data, field);
            const result = this.validate(value, rules);
            
            if (!result.valid) {
                errors[field] = result.errors;
                isValid = false;
            }
        }
        
        return {
            valid: isValid,
            errors
        };
    }
};


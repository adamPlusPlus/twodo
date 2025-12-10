// Data Utilities - Data transformation and manipulation
export const DataUtils = {
    /**
     * Deep clone an object
     * @param {*} obj - Object to clone
     * @returns {*}
     */
    deepClone(obj) {
        if (obj === null || typeof obj !== 'object') {
            return obj;
        }
        
        if (obj instanceof Date) {
            return new Date(obj.getTime());
        }
        
        if (obj instanceof Array) {
            return obj.map(item => this.deepClone(item));
        }
        
        if (typeof obj === 'object') {
            const cloned = {};
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    cloned[key] = this.deepClone(obj[key]);
                }
            }
            return cloned;
        }
        
        return obj;
    },
    
    /**
     * Deep merge objects
     * @param {Object} target - Target object
     * @param {...Object} sources - Source objects
     * @returns {Object}
     */
    deepMerge(target, ...sources) {
        if (!sources.length) return target;
        const source = sources.shift();
        
        if (this.isObject(target) && this.isObject(source)) {
            for (const key in source) {
                if (this.isObject(source[key])) {
                    if (!target[key]) Object.assign(target, { [key]: {} });
                    this.deepMerge(target[key], source[key]);
                } else {
                    Object.assign(target, { [key]: source[key] });
                }
            }
        }
        
        return this.deepMerge(target, ...sources);
    },
    
    /**
     * Check if value is a plain object
     * @param {*} value - Value to check
     * @returns {boolean}
     */
    isObject(value) {
        return value !== null && typeof value === 'object' && !Array.isArray(value);
    },
    
    /**
     * Filter array by predicate
     * @param {Array} array - Array to filter
     * @param {Function|Object|string} predicate - Filter function, object (key-value pairs), or key path
     * @returns {Array}
     */
    filter(array, predicate) {
        if (typeof predicate === 'function') {
            return array.filter(predicate);
        }
        
        if (typeof predicate === 'object') {
            return array.filter(item => {
                return Object.keys(predicate).every(key => item[key] === predicate[key]);
            });
        }
        
        if (typeof predicate === 'string') {
            return array.filter(item => {
                const value = this.getNestedValue(item, predicate);
                return value !== undefined && value !== null && value !== '';
            });
        }
        
        return array;
    },
    
    /**
     * Sort array by key or function
     * @param {Array} array - Array to sort
     * @param {string|Function} keyOrFn - Sort key or function
     * @param {boolean} descending - Sort descending
     * @returns {Array}
     */
    sort(array, keyOrFn, descending = false) {
        const sorted = [...array];
        const compareFn = typeof keyOrFn === 'function' 
            ? keyOrFn 
            : (a, b) => {
                const aVal = this.getNestedValue(a, keyOrFn);
                const bVal = this.getNestedValue(b, keyOrFn);
                if (aVal < bVal) return descending ? 1 : -1;
                if (aVal > bVal) return descending ? -1 : 1;
                return 0;
            };
        
        sorted.sort(compareFn);
        return sorted;
    },
    
    /**
     * Get nested value from object by path
     * @param {Object} obj - Object
     * @param {string} path - Dot-separated path (e.g., 'user.profile.name')
     * @returns {*}
     */
    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => current?.[key], obj);
    },
    
    /**
     * Set nested value in object by path
     * @param {Object} obj - Object
     * @param {string} path - Dot-separated path
     * @param {*} value - Value to set
     */
    setNestedValue(obj, path, value) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        const target = keys.reduce((current, key) => {
            if (!current[key] || !this.isObject(current[key])) {
                current[key] = {};
            }
            return current[key];
        }, obj);
        target[lastKey] = value;
    },
    
    /**
     * Group array by key
     * @param {Array} array - Array to group
     * @param {string|Function} keyOrFn - Group key or function
     * @returns {Object}
     */
    groupBy(array, keyOrFn) {
        return array.reduce((groups, item) => {
            const key = typeof keyOrFn === 'function' 
                ? keyOrFn(item) 
                : this.getNestedValue(item, keyOrFn);
            if (!groups[key]) {
                groups[key] = [];
            }
            groups[key].push(item);
            return groups;
        }, {});
    },
    
    /**
     * Remove duplicates from array
     * @param {Array} array - Array to deduplicate
     * @param {string|Function} keyOrFn - Key or function to compare
     * @returns {Array}
     */
    unique(array, keyOrFn) {
        if (!keyOrFn) {
            return [...new Set(array)];
        }
        
        const seen = new Set();
        return array.filter(item => {
            const key = typeof keyOrFn === 'function' 
                ? keyOrFn(item) 
                : this.getNestedValue(item, keyOrFn);
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });
    },
    
    /**
     * Flatten nested array
     * @param {Array} array - Array to flatten
     * @param {number} depth - Flatten depth
     * @returns {Array}
     */
    flatten(array, depth = Infinity) {
        return array.flat(depth);
    },
    
    /**
     * Pick properties from object
     * @param {Object} obj - Source object
     * @param {Array<string>} keys - Keys to pick
     * @returns {Object}
     */
    pick(obj, keys) {
        return keys.reduce((result, key) => {
            if (key in obj) {
                result[key] = obj[key];
            }
            return result;
        }, {});
    },
    
    /**
     * Omit properties from object
     * @param {Object} obj - Source object
     * @param {Array<string>} keys - Keys to omit
     * @returns {Object}
     */
    omit(obj, keys) {
        const result = { ...obj };
        keys.forEach(key => delete result[key]);
        return result;
    }
};


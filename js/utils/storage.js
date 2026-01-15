// Storage Utilities - LocalStorage wrapper and storage management
export const StorageUtils = {
    /**
     * Get item from localStorage
     * @param {string} key - Storage key
     * @param {*} defaultValue - Default value if not found
     * @returns {*}
     */
    get(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            if (item === null) return defaultValue;
            return JSON.parse(item);
        } catch (error) {
            console.error(`Error reading from localStorage key "${key}":`, error);
            return defaultValue;
        }
    },
    
    /**
     * Set item in localStorage
     * @param {string} key - Storage key
     * @param {*} value - Value to store
     * @returns {boolean} - Success status
     */
    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error(`Error writing to localStorage key "${key}":`, error);
            if (error.name === 'QuotaExceededError') {
                console.warn('Storage quota exceeded. Attempting to clear old data...');
                this.clearOldData();
                try {
                    localStorage.setItem(key, JSON.stringify(value));
                    return true;
                } catch (retryError) {
                    console.error('Failed to save after cleanup:', retryError);
                    return false;
                }
            }
            return false;
        }
    },
    
    /**
     * Remove item from localStorage
     * @param {string} key - Storage key
     */
    remove(key) {
        try {
            localStorage.removeItem(key);
        } catch (error) {
            console.error(`Error removing localStorage key "${key}":`, error);
        }
    },
    
    /**
     * Clear all localStorage
     */
    clear() {
        try {
            localStorage.clear();
        } catch (error) {
            console.error('Error clearing localStorage:', error);
        }
    },
    
    /**
     * Check if key exists in localStorage
     * @param {string} key - Storage key
     * @returns {boolean}
     */
    has(key) {
        return localStorage.getItem(key) !== null;
    },
    
    /**
     * Get all keys from localStorage
     * @returns {Array<string>}
     */
    keys() {
        const keys = [];
        for (let i = 0; i < localStorage.length; i++) {
            keys.push(localStorage.key(i));
        }
        return keys;
    },
    
    /**
     * Get storage size in bytes (approximate)
     * @returns {number}
     */
    getSize() {
        let total = 0;
        for (let key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
                total += localStorage[key].length + key.length;
            }
        }
        return total;
    },
    
    /**
     * Get storage quota information
     * @returns {Promise<Object>} - { quota, usage, available }
     */
    async getQuota() {
        if ('storage' in navigator && 'estimate' in navigator.storage) {
            try {
                const estimate = await navigator.storage.estimate();
                return {
                    quota: estimate.quota,
                    usage: estimate.usage,
                    available: estimate.quota - estimate.usage
                };
            } catch (error) {
                console.error('Error getting storage quota:', error);
            }
        }
        return null;
    },
    
    /**
     * Clear old data based on timestamp or other criteria
     * This is a placeholder - implement based on your app's needs
     */
    clearOldData() {
        // Example: Clear items older than 30 days
        const keys = this.keys();
        const now = Date.now();
        const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
        
        keys.forEach(key => {
            if (key.startsWith('temp_') || key.startsWith('cache_')) {
                try {
                    const item = this.get(key);
                    if (item && item.timestamp && (now - item.timestamp) > maxAge) {
                        this.remove(key);
                    }
                } catch (error) {
                    // If item can't be parsed, remove it
                    this.remove(key);
                }
            }
        });
    },
    
    /**
     * Migrate data from old key to new key
     * @param {string} oldKey - Old storage key
     * @param {string} newKey - New storage key
     * @param {Function} transform - Optional transformation function
     * @returns {boolean} - Success status
     */
    migrate(oldKey, newKey, transform = null) {
        if (!this.has(oldKey)) return false;
        
        try {
            let storedValue = this.get(oldKey);
            if (transform && typeof transform === 'function') {
                storedValue = transform(storedValue);
            }
            this.set(newKey, storedValue);
            this.remove(oldKey);
            return true;
        } catch (error) {
            console.error(`Error migrating from "${oldKey}" to "${newKey}":`, error);
            return false;
        }
    },
    
    /**
     * Get item with expiration check
     * @param {string} key - Storage key
     * @param {*} defaultValue - Default value
     * @returns {*}
     */
    getWithExpiry(key, defaultValue = null) {
        try {
            const item = this.get(key);
            if (!item || !item.expiry) return defaultValue;
            
            if (Date.now() > item.expiry) {
                this.remove(key);
                return defaultValue;
            }
            
            return item.value;
        } catch (error) {
            console.error(`Error reading expired item from localStorage key "${key}":`, error);
            return defaultValue;
        }
    },
    
    /**
     * Set item with expiration
     * @param {string} key - Storage key
     * @param {*} value - Value to store
     * @param {number} ttl - Time to live in milliseconds
     * @returns {boolean} - Success status
     */
    setWithExpiry(key, value, ttl) {
        const item = {
            value: value,
            expiry: Date.now() + ttl
        };
        return this.set(key, item);
    }
};


// UIUXRepository.js - UI/UX customizations repository
// Manages UI customizations with independent versioning

import { Repository } from '../Repository.js';

export class UIUXRepository extends Repository {
    constructor(storageKey = 'twodo-uiux') {
        super('uiux', storageKey);
    }
    
    /**
     * Load UI/UX customization from storage
     * @protected
     * @param {string} itemId - Customization ID
     * @returns {Promise<Object|null>} - Customization or null
     */
    async _loadItem(itemId) {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                const data = JSON.parse(stored);
                return data[itemId] || null;
            }
        } catch (error) {
            console.error(`[UIUXRepository] Error loading customization ${itemId}:`, error);
        }
        return null;
    }
    
    /**
     * Save UI/UX customization to storage
     * @protected
     * @param {string} itemId - Customization ID
     * @param {Object} customization - Customization data
     * @returns {Promise<void>}
     */
    async _saveItem(itemId, customization) {
        try {
            const stored = localStorage.getItem(this.storageKey);
            const data = stored ? JSON.parse(stored) : {};
            data[itemId] = customization;
            localStorage.setItem(this.storageKey, JSON.stringify(data));
        } catch (error) {
            console.error(`[UIUXRepository] Error saving customization ${itemId}:`, error);
        }
    }
    
    /**
     * Delete UI/UX customization from storage
     * @protected
     * @param {string} itemId - Customization ID
     * @returns {Promise<void>}
     */
    async _deleteItem(itemId) {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                const data = JSON.parse(stored);
                delete data[itemId];
                localStorage.setItem(this.storageKey, JSON.stringify(data));
            }
        } catch (error) {
            console.error(`[UIUXRepository] Error deleting customization ${itemId}:`, error);
        }
    }
    
    /**
     * Get all customization IDs
     * @returns {Promise<Array<string>>} - Array of customization IDs
     */
    async getAllItemIds() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                const data = JSON.parse(stored);
                return Object.keys(data);
            }
        } catch (error) {
            console.error('[UIUXRepository] Error getting customization IDs:', error);
        }
        return [];
    }
}

// TemplatesRepository.js - Templates repository
// Manages templates with independent versioning

import { Repository } from '../Repository.js';

export class TemplatesRepository extends Repository {
    constructor(storageKey = 'twodo-templates') {
        super('templates', storageKey);
    }
    
    /**
     * Load template from storage
     * @protected
     * @param {string} itemId - Template ID
     * @returns {Promise<Object|null>} - Template or null
     */
    async _loadItem(itemId) {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                const data = JSON.parse(stored);
                return data[itemId] || null;
            }
        } catch (error) {
            console.error(`[TemplatesRepository] Error loading template ${itemId}:`, error);
        }
        return null;
    }
    
    /**
     * Save template to storage
     * @protected
     * @param {string} itemId - Template ID
     * @param {Object} template - Template data
     * @returns {Promise<void>}
     */
    async _saveItem(itemId, template) {
        try {
            const stored = localStorage.getItem(this.storageKey);
            const data = stored ? JSON.parse(stored) : {};
            data[itemId] = template;
            localStorage.setItem(this.storageKey, JSON.stringify(data));
        } catch (error) {
            console.error(`[TemplatesRepository] Error saving template ${itemId}:`, error);
        }
    }
    
    /**
     * Delete template from storage
     * @protected
     * @param {string} itemId - Template ID
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
            console.error(`[TemplatesRepository] Error deleting template ${itemId}:`, error);
        }
    }
    
    /**
     * Get all template IDs
     * @returns {Promise<Array<string>>} - Array of template IDs
     */
    async getAllItemIds() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                const data = JSON.parse(stored);
                return Object.keys(data);
            }
        } catch (error) {
            console.error('[TemplatesRepository] Error getting template IDs:', error);
        }
        return [];
    }
}

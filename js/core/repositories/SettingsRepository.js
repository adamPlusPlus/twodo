// SettingsRepository.js - Settings repository
// Manages application settings with independent versioning

import { Repository } from '../Repository.js';

export class SettingsRepository extends Repository {
    constructor(storageKey = 'twodo-settings') {
        super('settings', storageKey);
    }
    
    /**
     * Load settings from storage
     * @protected
     * @param {string} itemId - Settings ID (usually 'default')
     * @returns {Promise<Object|null>} - Settings or null
     */
    async _loadItem(itemId) {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                const data = JSON.parse(stored);
                return data[itemId] || null;
            }
        } catch (error) {
            console.error(`[SettingsRepository] Error loading settings ${itemId}:`, error);
        }
        return null;
    }
    
    /**
     * Save settings to storage
     * @protected
     * @param {string} itemId - Settings ID
     * @param {Object} settings - Settings data
     * @returns {Promise<void>}
     */
    async _saveItem(itemId, settings) {
        try {
            const stored = localStorage.getItem(this.storageKey);
            const data = stored ? JSON.parse(stored) : {};
            data[itemId] = settings;
            localStorage.setItem(this.storageKey, JSON.stringify(data));
        } catch (error) {
            console.error(`[SettingsRepository] Error saving settings ${itemId}:`, error);
        }
    }
    
    /**
     * Delete settings from storage
     * @protected
     * @param {string} itemId - Settings ID
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
            console.error(`[SettingsRepository] Error deleting settings ${itemId}:`, error);
        }
    }
    
    /**
     * Get all settings IDs
     * @returns {Promise<Array<string>>} - Array of settings IDs
     */
    async getAllItemIds() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                const data = JSON.parse(stored);
                return Object.keys(data);
            }
        } catch (error) {
            console.error('[SettingsRepository] Error getting settings IDs:', error);
        }
        return [];
    }
}

// Repository.js - Base repository class with versioning and active-set integration
// Abstract interface for repository operations

import { activeSetManager } from './ActiveSetManager.js';

export class Repository {
    constructor(repositoryType, storageKey) {
        this.repositoryType = repositoryType; // 'settings', 'uiux', 'templates', 'vault'
        this.storageKey = storageKey;
        this.activeSet = new Map(); // Active items cache
    }
    
    /**
     * Get item from repository (loads if not in active set)
     * @param {string} itemId - Item ID
     * @returns {Promise<Object|null>} - Item or null
     */
    async getItem(itemId) {
        // Check active set first
        if (this.activeSet.has(itemId)) {
            return this.activeSet.get(itemId);
        }
        
        // Load item (implemented by subclasses)
        const item = await this._loadItem(itemId);
        if (item) {
            this.activeSet.set(itemId, item);
        }
        
        return item;
    }
    
    /**
     * Save item to repository
     * @param {string} itemId - Item ID
     * @param {Object} item - Item data
     * @returns {Promise<void>}
     */
    async saveItem(itemId, item) {
        // Update active set
        this.activeSet.set(itemId, item);
        
        // Save item (implemented by subclasses)
        await this._saveItem(itemId, item);
    }
    
    /**
     * Delete item from repository
     * @param {string} itemId - Item ID
     * @returns {Promise<void>}
     */
    async deleteItem(itemId) {
        // Remove from active set
        this.activeSet.delete(itemId);
        
        // Delete item (implemented by subclasses)
        await this._deleteItem(itemId);
    }
    
    /**
     * Get all item IDs (metadata only)
     * @returns {Promise<Array<string>>} - Array of item IDs
     */
    async getAllItemIds() {
        // Implemented by subclasses
        return [];
    }
    
    /**
     * Load item (implemented by subclasses)
     * @protected
     * @param {string} itemId - Item ID
     * @returns {Promise<Object|null>} - Item or null
     */
    async _loadItem(itemId) {
        throw new Error('_loadItem must be implemented by subclass');
    }
    
    /**
     * Save item (implemented by subclasses)
     * @protected
     * @param {string} itemId - Item ID
     * @param {Object} item - Item data
     * @returns {Promise<void>}
     */
    async _saveItem(itemId, item) {
        throw new Error('_saveItem must be implemented by subclass');
    }
    
    /**
     * Delete item (implemented by subclasses)
     * @protected
     * @param {string} itemId - Item ID
     * @returns {Promise<void>}
     */
    async _deleteItem(itemId) {
        throw new Error('_deleteItem must be implemented by subclass');
    }
    
    /**
     * Clear active set
     */
    clearActiveSet() {
        this.activeSet.clear();
    }
    
    /**
     * Get active set size
     * @returns {number} - Number of items in active set
     */
    getActiveSetSize() {
        return this.activeSet.size;
    }
}

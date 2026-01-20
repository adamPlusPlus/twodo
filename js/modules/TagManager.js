// TagManager - Manages tags across all elements
import { StorageUtils } from '../utils/storage.js';
import { getService, SERVICES, hasService } from '../core/AppServices.js';

export class TagManager {
    constructor() {
        this.tagsKey = 'twodo-tags';
        this.allTags = this.loadTags();
    }
    
    /**
     * Get AppState service
     */
    _getAppState() {
        return getService(SERVICES.APP_STATE);
    }
    
    /**
     * Load all tags from storage
     * @returns {Set} - Set of all tags
     */
    loadTags() {
        const stored = StorageUtils.get(this.tagsKey);
        return stored ? new Set(stored) : new Set();
    }
    
    /**
     * Save all tags to storage
     */
    saveTags() {
        StorageUtils.set(this.tagsKey, Array.from(this.allTags));
    }
    
    /**
     * Get all tags
     * @returns {Array} - Array of all tags
     */
    getAllTags() {
        return Array.from(this.allTags).sort();
    }
    
    /**
     * Get default tags
     * @returns {Array} - Array of default tags
     */
    getDefaultTags() {
        return ['work', 'personal', 'urgent', 'important', 'meeting', 'deadline', 'chore', 'hobby', 'project', 'home', 'shopping'];
    }
    
    /**
     * Get all available tags (default + stored)
     * @returns {Array} - Array of all available tags
     */
    getAvailableTags() {
        const defaultTags = this.getDefaultTags();
        const allTags = new Set([...defaultTags, ...this.allTags]);
        return Array.from(allTags).sort();
    }
    
    /**
     * Add a tag to the collection
     * @param {string} tag - Tag to add
     */
    addTag(tag) {
        if (tag && tag.trim()) {
            const normalizedTag = tag.trim().toLowerCase();
            this.allTags.add(normalizedTag);
            this.saveTags();
        }
    }
    
    /**
     * Remove a tag from the collection
     * @param {string} tag - Tag to remove
     */
    removeTag(tag) {
        if (tag) {
            const normalizedTag = tag.trim().toLowerCase();
            this.allTags.delete(normalizedTag);
            this.saveTags();
        }
    }
    
    /**
     * Get tags for an element
     * @param {Object} element - Element object
     * @returns {Array} - Array of tags
     */
    getElementTags(element) {
        return element.tags || [];
    }
    
    /**
     * Set tags for an element
     * @param {Object} element - Element object
     * @param {Array} tags - Array of tags
     */
    setElementTags(element, tags) {
        if (!Array.isArray(tags)) {
            tags = [];
        }
        element.tags = tags.map(tag => tag.trim().toLowerCase()).filter(tag => tag);
        
        // Add new tags to collection
        tags.forEach(tag => this.addTag(tag));
    }
    
    /**
     * Add tag to element
     * @param {Object} element - Element object
     * @param {string} tag - Tag to add
     */
    addElementTag(element, tag) {
        if (!element.tags) {
            element.tags = [];
        }
        const normalizedTag = tag.trim().toLowerCase();
        if (!element.tags.includes(normalizedTag)) {
            element.tags.push(normalizedTag);
            this.addTag(normalizedTag);
        }
    }
    
    /**
     * Remove tag from element
     * @param {Object} element - Element object
     * @param {string} tag - Tag to remove
     */
    removeElementTag(element, tag) {
        if (element.tags) {
            const normalizedTag = tag.trim().toLowerCase();
            element.tags = element.tags.filter(t => t !== normalizedTag);
        }
    }
    
    /**
     * Get elements with a specific tag
     * @param {string} tag - Tag to search for
     * @returns {Array} - Array of {page, bin, element, elementIndex}
     */
    getElementsByTag(tag) {
        const results = [];
        const normalizedTag = tag.trim().toLowerCase();
        
        const appState = this._getAppState();
        appState.documents.forEach(page => {
            if (page.groups) {
                page.groups.forEach(bin => {
                    const items = bin.items || [];
                    bin.items = items;
                    items.forEach((element, elementIndex) => {
                            if (element.tags && element.tags.includes(normalizedTag)) {
                                results.push({
                                    page,
                                    bin,
                                    element,
                                    elementIndex,
                                    pageId: page.id,
                                    binId: bin.id
                                });
                            }
                    });
                });
            }
        });
        
        return results;
    }
    
    /**
     * Get tag statistics
     * @returns {Object} - Object mapping tags to counts
     */
    getTagStatistics() {
        const stats = {};
        
        const appState = this._getAppState();
        appState.documents.forEach(page => {
            if (page.groups) {
                page.groups.forEach(bin => {
                    const items = bin.items || [];
                    bin.items = items;
                    items.forEach(element => {
                            if (element.tags) {
                                element.tags.forEach(tag => {
                                    stats[tag] = (stats[tag] || 0) + 1;
                                });
                            }
                    });
                });
            }
        });
        
        return stats;
    }
    
    /**
     * Search tags (autocomplete)
     * @param {string} query - Search query
     * @returns {Array} - Array of matching tags
     */
    searchTags(query) {
        if (!query || !query.trim()) {
            return this.getAvailableTags();
        }
        
        const normalizedQuery = query.trim().toLowerCase();
        const availableTags = this.getAvailableTags();
        
        return availableTags.filter(tag => 
            tag.toLowerCase().includes(normalizedQuery)
        );
    }
}


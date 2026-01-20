// VisualSettingsManager.js - Manages granular visual settings for individual objects
import { eventBus } from '../core/EventBus.js';
import { EVENTS } from '../core/AppEvents.js';
import { getService, SERVICES, hasService } from '../core/AppServices.js';

export class VisualSettingsManager {
    constructor() {
        this.storageKey = 'twodo-visual-settings';
        this.settings = this.loadSettings();
    }
    
    /**
     * Get services
     */
    _getThemeManager() {
        return getService(SERVICES.THEME_MANAGER);
    }
    
    _getAppState() {
        return getService(SERVICES.APP_STATE);
    }
    
    loadSettings() {
        const stored = localStorage.getItem(this.storageKey);
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch (e) {
                console.error('Failed to parse visual settings:', e);
            }
        }
        return {
            panes: {},      // paneId -> { custom: {...}, preserveAll: boolean }
            pages: {},      // pageId -> { custom: {...}, preserveAll: boolean }
            bins: {},       // binId -> { custom: {...}, preserveAll: boolean }
            elements: {},   // elementId -> { custom: {...}, preserveAll: boolean }
            tags: {}        // tag -> { custom: {...}, preserveAll: boolean, viewFormat: string|null }
        };
    }
    
    saveSettings() {
        localStorage.setItem(this.storageKey, JSON.stringify(this.settings));
    }
    
    /**
     * Get visual settings for an object
     * @param {string} type - 'pane', 'page', 'bin', or 'element'
     * @param {string} id - Object ID
     * @returns {Object} - { custom: {...}, preserveAll: boolean }
     */
    getObjectSettings(type, id) {
        const typeKey = `${type}s`; // panes, pages, bins, elements
        if (!this.settings[typeKey]) {
            this.settings[typeKey] = {};
        }
        if (!this.settings[typeKey][id]) {
            this.settings[typeKey][id] = { custom: {}, preserveAll: false };
        }
        return this.settings[typeKey][id];
    }
    
    /**
     * Get tag-based visual settings
     * @param {string} tag - Tag name
     * @param {string} viewFormat - View format (null for all views)
     * @returns {Object} - { custom: {...}, preserveAll: boolean, viewFormat: string|null }
     */
    getTagSettings(tag, viewFormat = null) {
        if (!this.settings.tags) {
            this.settings.tags = {};
        }
        const tagKey = viewFormat ? `${tag}::${viewFormat}` : tag;
        if (!this.settings.tags[tagKey]) {
            this.settings.tags[tagKey] = { custom: {}, preserveAll: false, viewFormat: viewFormat };
        }
        return this.settings.tags[tagKey];
    }
    
    /**
     * Set tag-based visual settings
     * @param {string} tag - Tag name
     * @param {Object} customSettings - Custom settings
     * @param {boolean} preserveAll - Whether to preserve all values
     * @param {string} viewFormat - View format (null for all views)
     */
    setTagSettings(tag, customSettings, preserveAll = false, viewFormat = null) {
        if (!this.settings.tags) {
            this.settings.tags = {};
        }
        const tagKey = viewFormat ? `${tag}::${viewFormat}` : tag;
        
        if (preserveAll) {
            this.settings.tags[tagKey] = {
                custom: customSettings,
                preserveAll: true,
                viewFormat: viewFormat
            };
        } else {
            const existing = this.settings.tags[tagKey] || { custom: {}, preserveAll: false, viewFormat: viewFormat };
            const merged = { ...existing.custom, ...customSettings };
            this.settings.tags[tagKey] = {
                custom: merged,
                preserveAll: false,
                viewFormat: viewFormat
            };
        }
        
        this.saveSettings();
        eventBus.emit('visual-settings:updated', { type: 'tag', tag, viewFormat, settings: this.settings.tags[tagKey] });
    }
    
    /**
     * Remove tag-based visual settings
     * @param {string} tag - Tag name
     * @param {string} viewFormat - View format (null for all views)
     */
    removeTagSettings(tag, viewFormat = null) {
        if (!this.settings.tags) return;
        const tagKey = viewFormat ? `${tag}::${viewFormat}` : tag;
        if (this.settings.tags[tagKey]) {
            delete this.settings.tags[tagKey];
            this.saveSettings();
            eventBus.emit('visual-settings:removed', { type: 'tag', tag, viewFormat });
        }
    }
    
    /**
     * Get all tags that have visual settings
     * @returns {Array} - Array of { tag: string, viewFormat: string|null }
     */
    getTagsWithSettings() {
        if (!this.settings.tags) return [];
        return Object.keys(this.settings.tags).map(key => {
            const parts = key.split('::');
            return {
                tag: parts[0],
                viewFormat: parts.length > 1 ? parts[1] : null
            };
        });
    }
    
    /**
     * Set visual settings for an object
     * @param {string} type - 'pane', 'page', 'bin', or 'element'
     * @param {string} id - Object ID
     * @param {Object} customSettings - Custom settings (only changed values)
     * @param {boolean} preserveAll - Whether to preserve all values
     */
    setObjectSettings(type, id, customSettings, preserveAll = false) {
        const typeKey = `${type}s`;
        if (!this.settings[typeKey]) {
            this.settings[typeKey] = {};
        }
        
        if (preserveAll) {
            // Store all current values
            this.settings[typeKey][id] = {
                custom: customSettings,
                preserveAll: true
            };
        } else {
            // Only store customized values
            const existing = this.settings[typeKey][id] || { custom: {}, preserveAll: false };
            const merged = { ...existing.custom, ...customSettings };
            this.settings[typeKey][id] = {
                custom: merged,
                preserveAll: false
            };
        }
        
        this.saveSettings();
        eventBus.emit('visual-settings:updated', { type, id, settings: this.settings[typeKey][id] });
    }
    
    /**
     * Remove visual settings for an object
     */
    removeObjectSettings(type, id) {
        const typeKey = `${type}s`;
        if (this.settings[typeKey] && this.settings[typeKey][id]) {
            delete this.settings[typeKey][id];
            this.saveSettings();
            eventBus.emit('visual-settings:removed', { type, id });
        }
    }
    
    /**
     * Get effective visual settings for an object (merges with theme hierarchy)
     * @param {string} type - 'pane', 'page', 'bin', or 'element'
     * @param {string} id - Object ID
     * @param {string} pageId - Page ID (for bins/elements)
     * @param {string} viewFormat - View format (for pages)
     * @param {Array} tags - Array of tags for the object
     * @returns {Object} - Effective settings
     */
    getEffectiveSettings(type, id, pageId = null, viewFormat = 'default', tags = []) {
        let baseTheme = {};
        
        // Start with global theme
        const themeManager = this._getThemeManager();
        if (themeManager) {
            baseTheme = themeManager.getEffectiveTheme(pageId || id, viewFormat);
        }
        
        // Apply tag-based settings (view-specific first, then global)
        if (tags && Array.isArray(tags) && tags.length > 0) {
            // First apply view-specific tag settings
            tags.forEach(tag => {
                const viewSpecificTagSettings = this.getTagSettings(tag, viewFormat);
                if (viewSpecificTagSettings.custom && Object.keys(viewSpecificTagSettings.custom).length > 0) {
                    baseTheme = this.mergeSettings(baseTheme, viewSpecificTagSettings.custom);
                }
            });
            
            // Then apply global tag settings (for tags without view-specific settings)
            tags.forEach(tag => {
                const globalTagSettings = this.getTagSettings(tag, null);
                // Only apply if no view-specific settings exist
                const viewSpecificKey = `${tag}::${viewFormat}`;
                if (!this.settings.tags || !this.settings.tags[viewSpecificKey] || 
                    Object.keys(this.settings.tags[viewSpecificKey].custom || {}).length === 0) {
                    if (globalTagSettings.custom && Object.keys(globalTagSettings.custom).length > 0) {
                        baseTheme = this.mergeSettings(baseTheme, globalTagSettings.custom);
                    }
                }
            });
        }
        
        // Apply object-specific settings (highest priority)
        const objectSettings = this.getObjectSettings(type, id);
        if (objectSettings.preserveAll) {
            // If preserveAll, use all custom settings as base
            return this.mergeSettings(baseTheme, objectSettings.custom);
        } else {
            // Only merge customized values
            return this.mergeSettings(baseTheme, objectSettings.custom);
        }
    }
    
    /**
     * Merge two settings objects (deep merge)
     */
    mergeSettings(base, override) {
        const merged = { ...base };
        for (const key in override) {
            if (override[key] && typeof override[key] === 'object' && !Array.isArray(override[key])) {
                merged[key] = this.mergeSettings(merged[key] || {}, override[key]);
            } else {
                merged[key] = override[key];
            }
        }
        return merged;
    }
    
    /**
     * Get tags for an object
     * @param {string} type - Object type
     * @param {string} id - Object ID
     * @param {string} pageId - Page ID (for bins/elements)
     * @returns {Array} - Array of tags
     */
    getObjectTags(type, id, pageId = null) {
        if (type === 'element' && pageId) {
            // Extract pageId, binId, elementIndex from element ID
            const parts = id.split('-');
            if (parts.length >= 3) {
                const elementPageId = parts[0];
                const binId = parts[1];
                const elementIndex = parseInt(parts[2]);
                const appState = this._getAppState();
                const page = appState.documents?.find(p => p.id === elementPageId);
                const bin = page?.groups?.find(b => b.id === binId);
                const items = bin?.items || [];
                if (bin) {
                    bin.items = items;
                }
                const element = items?.[elementIndex];
                return element?.tags || [];
            }
        } else if (type === 'bin' && pageId) {
            const appState = this._getAppState();
            const page = appState.documents?.find(p => p.id === pageId);
            const bin = page?.groups?.find(b => b.id === id);
            // Bins may have tags property, if not, return empty array
            return bin?.tags || [];
        } else if (type === 'page') {
            const page = appState.documents?.find(p => p.id === id);
            // Pages may have tags property, if not, return empty array
            return page?.tags || [];
        } else if (type === 'pane') {
            // Panes don't have tags, but could inherit from their active page
            // For now, return empty array
            return [];
        }
        return [];
    }
    
    /**
     * Apply visual settings to a DOM element
     * @param {HTMLElement} element - DOM element to style
     * @param {string} type - Object type
     * @param {string} id - Object ID
     * @param {string} pageId - Page ID (for bins/elements)
     * @param {string} viewFormat - View format (for pages)
     */
    applyVisualSettings(element, type, id, pageId = null, viewFormat = 'default') {
        if (!element || !(element instanceof HTMLElement)) return;
        
        // Get object tags
        const tags = this.getObjectTags(type, id, pageId);
        
        // Get effective settings (includes tag-based settings)
        const effectiveSettings = this.getEffectiveSettings(type, id, pageId, viewFormat, tags);
        
        // Apply CSS variables based on object type
        if (type === 'pane' || type === 'page') {
            this.applyPageSettings(element, effectiveSettings);
        } else if (type === 'bin') {
            this.applyBinSettings(element, effectiveSettings);
        } else if (type === 'element') {
            this.applyElementSettings(element, effectiveSettings);
        }
    }
    
    applyPageSettings(element, settings) {
        if (settings.background) element.style.setProperty('--page-bg', settings.background);
        if (settings.margin) element.style.setProperty('--page-margin', settings.margin);
        if (settings.padding) element.style.setProperty('--page-padding', settings.padding);
        if (settings.borderRadius) element.style.setProperty('--page-border-radius', settings.borderRadius);
        if (settings.fontFamily) element.style.setProperty('--page-font-family', settings.fontFamily);
        if (settings.fontSize) element.style.setProperty('--page-font-size', settings.fontSize);
        if (settings.opacity) element.style.setProperty('--page-opacity', settings.opacity);
        if (settings.color) element.style.setProperty('--page-color', settings.color);
        
        if (settings.page) {
            if (settings.page.background) element.style.setProperty('--page-bg', settings.page.background);
            if (settings.page.margin) element.style.setProperty('--page-margin', settings.page.margin);
            if (settings.page.padding) element.style.setProperty('--page-padding', settings.page.padding);
            if (settings.page.borderRadius) element.style.setProperty('--page-border-radius', settings.page.borderRadius);
            if (settings.page.fontFamily) element.style.setProperty('--page-font-family', settings.page.fontFamily);
            if (settings.page.fontSize) element.style.setProperty('--page-font-size', settings.page.fontSize);
            if (settings.page.opacity) element.style.setProperty('--page-opacity', settings.page.opacity);
            if (settings.page.color) element.style.setProperty('--page-color', settings.page.color);
        }
    }
    
    applyBinSettings(element, settings) {
        // Bins can have page-level settings plus bin-specific overrides
        this.applyPageSettings(element, settings);
        // Add bin-specific CSS variables if needed
    }
    
    applyElementSettings(element, settings) {
        if (settings.element) {
            if (settings.element.background) element.style.setProperty('--element-bg', settings.element.background);
            if (settings.element.margin) element.style.setProperty('--element-margin', settings.element.margin);
            if (settings.element.padding) element.style.setProperty('--element-padding', settings.element.padding);
            if (settings.element.paddingVertical) element.style.setProperty('--element-padding-vertical', settings.element.paddingVertical);
            if (settings.element.paddingHorizontal) element.style.setProperty('--element-padding-horizontal', settings.element.paddingHorizontal);
            if (settings.element.gap) element.style.setProperty('--element-gap', settings.element.gap);
            if (settings.element.fontFamily) element.style.setProperty('--element-font-family', settings.element.fontFamily);
            if (settings.element.fontSize) element.style.setProperty('--element-font-size', settings.element.fontSize);
            if (settings.element.opacity) element.style.setProperty('--element-opacity', settings.element.opacity);
            if (settings.element.color) element.style.setProperty('--element-color', settings.element.color);
            if (settings.element.hoverBackground) element.style.setProperty('--element-hover-bg', settings.element.hoverBackground);
        }
    }
    
    /**
     * Export settings for an object, tag, or all settings
     */
    exportSettings(type = null, id = null, tag = null, viewFormat = null) {
        if (tag !== null) {
            return JSON.stringify(this.getTagSettings(tag, viewFormat), null, 2);
        } else if (type && id) {
            return JSON.stringify(this.getObjectSettings(type, id), null, 2);
        }
        return JSON.stringify(this.settings, null, 2);
    }
    
    /**
     * Import settings
     */
    importSettings(jsonString) {
        try {
            const imported = JSON.parse(jsonString);
            this.settings = this.mergeSettings(this.settings, imported);
            this.saveSettings();
            eventBus.emit('visual-settings:imported', { settings: this.settings });
            return true;
        } catch (e) {
            console.error('Failed to import visual settings:', e);
            return false;
        }
    }
}


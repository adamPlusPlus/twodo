// FormatRendererManager - Manages format renderer registration and rendering
import { pluginRegistry } from '../core/PluginRegistry.js';
import { eventBus } from '../core/EventBus.js';
import { EVENTS } from '../core/AppEvents.js';
import { DOMUtils } from '../utils/dom.js';
import { getService, SERVICES } from '../core/AppServices.js';

export class FormatRendererManager {
    constructor() {
        this.formatRenderers = new Map(); // formatName -> plugin instance
        this.activeFormats = new Map(); // pageId/binId -> formatName
        this.setupEventListeners();
        // Scan for already-loaded format plugins
        this.scanForFormats();
        // Initialize activeFormats from saved page data
        this.initializeFromSavedData();
    }
    
    /**
     * Get services
     */
    _getAppState() {
        return getService(SERVICES.APP_STATE);
    }
    
    /**
     * Initialize activeFormats from saved page data
     */
    initializeFromSavedData() {
        const appState = this._getAppState();
        if (appState && appState.documents) {
            appState.documents.forEach(page => {
                if (page.format) {
                    this.activeFormats.set(page.id, page.format);
                }
            });
        }
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        eventBus.on('format:registered', (data) => {
            this.registerFormat(data.pluginId);
        });
        
        // Also listen for plugin loaded events
        eventBus.on('plugin:loaded', (data) => {
            const plugin = pluginRegistry.get(data.pluginId);
            if (plugin && plugin.type === 'format') {
                this.registerFormat(data.pluginId);
            }
        });
    }
    
    /**
     * Scan plugin registry for format plugins and register them
     */
    scanForFormats() {
        const formatPlugins = pluginRegistry.getByType('format');
        // console.log(`[FormatRendererManager] scanForFormats found ${formatPlugins.length} format plugins:`, formatPlugins.map(p => ({ id: p.id, formatName: p.formatName, name: p.name })));
        formatPlugins.forEach(plugin => {
            const formatName = plugin.formatName || plugin.id;
            if (formatName && !this.formatRenderers.has(formatName)) {
                this.formatRenderers.set(formatName, plugin);
                // console.log(`[FormatRendererManager] Scanned and registered format: ${formatName} (${plugin.name || plugin.id})`);
            }
        });
    }
    
    /**
     * Register a format renderer plugin
     * @param {string} pluginId - Plugin ID
     */
    registerFormat(pluginId) {
        const plugin = pluginRegistry.get(pluginId);
        // console.log(`[FormatRendererManager] registerFormat called for ${pluginId}, plugin found:`, !!plugin, 'type:', plugin?.type);
        if (plugin && plugin.type === 'format') {
            const formatName = plugin.formatName || plugin.id;
            this.formatRenderers.set(formatName, plugin);
            // console.log(`[FormatRendererManager] Registered format: ${formatName} (${plugin.name || plugin.id})`);
        } else {
            // Plugin might not be registered yet - this is OK, it will be picked up by scanForFormats
            // or when the plugin:loaded event fires
            // console.log(`[FormatRendererManager] Plugin ${pluginId} not found or not a format plugin`);
        }
    }
    
    /**
     * Get format renderer
     * @param {string} formatName - Format name
     * @returns {Object|null} - Plugin instance
     */
    getFormat(formatName) {
        return this.formatRenderers.get(formatName) || null;
    }
    
    /**
     * Get all registered formats
     * @returns {Array<Object>} - Array of plugin instances
     */
    getAllFormats() {
        // Refresh format list from registry before returning (in case formats were loaded after manager init)
        this.scanForFormats();
        const formats = Array.from(this.formatRenderers.values());
        return formats;
    }
    
    /**
     * Set active format for a page
     * @param {string} pageId - Page ID
     * @param {string} formatName - Format name
     * @returns {Promise<boolean>} - Success status
     */
    async setPageFormat(pageId, formatName) {
        const format = this.getFormat(formatName);
        if (!format || !format.supportsPages) {
            console.error(`Format "${formatName}" not found or doesn't support pages`);
            return false;
        }
        
        const appState = this._getAppState();
        const page = appState.documents.find(p => p.id === pageId);
        if (!page) return false;
        
        // Initialize format if needed
        if (!pluginRegistry.isInitialized(format.id)) {
            await pluginRegistry.initialize(format.id, null);
        }
        
        // Enable format
        await pluginRegistry.enable(format.id);
        
        // Set as active format
        page.format = formatName;
        this.activeFormats.set(pageId, formatName);
        
        // Save and re-render
        eventBus.emit(EVENTS.DATA.SAVE_REQUESTED);
        eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
        
        eventBus.emit('format:changed', { pageId, formatName, type: 'page' });
        
        return true;
    }
    
    /**
     * Clear active format for a page (return to default)
     * @param {string} pageId - Page ID
     * @returns {boolean} - Success status
     */
    clearPageFormat(pageId) {
        const appState = this._getAppState();
        const page = appState.documents.find(p => p.id === pageId);
        if (!page) return false;
        
        // Remove from activeFormats
        this.activeFormats.delete(pageId);
        
        // Remove from page data
        delete page.format;
        
        // Save and re-render
        eventBus.emit(EVENTS.DATA.SAVE_REQUESTED);
        eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
        
        eventBus.emit('format:changed', { pageId, formatName: null, type: 'page' });
        
        return true;
    }
    
    /**
     * Set active format for a bin
     * @param {string} pageId - Page ID
     * @param {string} binId - Bin ID
     * @param {string} formatName - Format name
     * @returns {Promise<boolean>} - Success status
     */
    async setBinFormat(pageId, binId, formatName) {
        const format = this.getFormat(formatName);
        if (!format || !format.supportsBins) {
            console.error(`Format "${formatName}" not found or doesn't support bins`);
            return false;
        }
        
        const appState = this._getAppState();
        const page = appState.documents.find(p => p.id === pageId);
        if (!page) return false;
        
        const bin = page.groups?.find(b => b.id === binId);
        if (!bin) return false;
        
        // Initialize format if needed
        if (!pluginRegistry.isInitialized(format.id)) {
            await pluginRegistry.initialize(format.id, null);
        }
        
        // Enable format
        await pluginRegistry.enable(format.id);
        
        // Set as active format
        bin.format = formatName;
        const key = `${pageId}:${binId}`;
        this.activeFormats.set(key, formatName);
        
        // Save and re-render
        eventBus.emit(EVENTS.DATA.SAVE_REQUESTED);
        eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
        
        eventBus.emit('format:changed', { pageId, binId, formatName, type: 'bin' });
        
        return true;
    }
    
    /**
     * Get active format for a page
     * @param {string} pageId - Page ID
     * @returns {string|null} - Format name
     */
    getPageFormat(pageId) {
        // First check activeFormats map
        if (this.activeFormats.has(pageId)) {
            return this.activeFormats.get(pageId);
        }
        
        // Fallback: check page data (for when data is loaded but activeFormats wasn't initialized)
        const appState = this._getAppState();
        if (appState && appState.documents) {
            const page = appState.documents.find(p => p.id === pageId);
            if (page && page.format) {
                // Sync to activeFormats for future lookups
                this.activeFormats.set(pageId, page.format);
                return page.format;
            }
        }
        
        return null;
    }
    
    /**
     * Get active format for a bin
     * @param {string} pageId - Page ID
     * @param {string} binId - Bin ID
     * @returns {string|null} - Format name
     */
    getBinFormat(pageId, binId) {
        const key = `${pageId}:${binId}`;
        return this.activeFormats.get(key) || null;
    }
    
    /**
     * Render page in format
     * @param {HTMLElement} container - Container element
     * @param {string} pageId - Page ID
     */
    renderPage(container, pageId) {
        const formatName = this.getPageFormat(pageId);
        if (!formatName) {
            // Use default rendering
            return;
        }
        
        const format = this.getFormat(formatName);
        if (format && format.renderPage) {
            const appState = this._getAppState();
        const page = appState.documents.find(p => p.id === pageId);
            format.renderPage(container, page, {});
        }
    }
    
    /**
     * Render bin in format
     * @param {HTMLElement} container - Container element
     * @param {string} pageId - Page ID
     * @param {string} binId - Bin ID
     */
    renderBin(container, pageId, binId) {
        const formatName = this.getBinFormat(pageId, binId);
        if (!formatName) {
            // Use default rendering
            return;
        }
        
        const format = this.getFormat(formatName);
        if (format && format.renderBin) {
            const appState = this._getAppState();
        const page = appState.documents.find(p => p.id === pageId);
            const bin = page.groups?.find(b => b.id === binId);
            format.renderBin(container, bin, { page });
        }
    }
    
    /**
     * Render format settings UI
     * @param {HTMLElement} container - Container element
     * @param {string} formatName - Format name
     * @param {Object} currentSettings - Current settings
     */
    renderSettingsUI(container, formatName, currentSettings) {
        const format = this.getFormat(formatName);
        if (format && format.renderSettingsUI) {
            format.renderSettingsUI(container, currentSettings);
        }
    }
    
    /**
     * Export data in format
     * @param {Object} data - Data to export
     * @param {string} formatName - Format name
     * @returns {string|Blob} - Exported data
     */
    export(data, formatName) {
        const format = this.getFormat(formatName);
        if (format && format.export) {
            return format.export(data);
        }
        return JSON.stringify(data, null, 2);
    }
    
    /**
     * Import data from format
     * @param {string|Blob} importData - Data to import
     * @param {string} formatName - Format name
     * @returns {Object} - Parsed data
     */
    import(importData, formatName) {
        const format = this.getFormat(formatName);
        if (format && format.import) {
            return format.import(importData);
        }
        
        // Default JSON import
        if (typeof importData === 'string') {
            try {
                return JSON.parse(importData);
            } catch (error) {
                throw new Error('Invalid data format');
            }
        }
        throw new Error('Unsupported data type');
    }
}


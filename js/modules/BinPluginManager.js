// BinPluginManager - Manages bin plugin lifecycle and rendering
import { pluginRegistry } from '../core/PluginManager.js';
import { eventBus } from '../core/EventBus.js';
import { EVENTS } from '../core/AppEvents.js';
import { DOMUtils } from '../utils/dom.js';
import { getService, SERVICES, hasService } from '../core/AppServices.js';

export class BinPluginManager {
    constructor() {
        this.binPlugins = new Map(); // binId -> Set of enabled pluginIds
        this.setupEventListeners();
    }
    
    /**
     * Get AppState service
     */
    _getAppState() {
        return getService(SERVICES.APP_STATE);
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        eventBus.on('bin:created', (data) => {
            this.initializeBinPlugins(data.pageId, data.binId);
        });
        
        eventBus.on('bin:deleted', (data) => {
            this.cleanupBinPlugins(data.pageId, data.binId);
        });
    }
    
    /**
     * Initialize plugins for a bin
     * @param {string} pageId - Page ID
     * @param {string} binId - Bin ID
     */
    async initializeBinPlugins(pageId, binId) {
        const appState = this._getAppState();
        const page = appState.documents.find(p => p.id === pageId);
        if (!page) return;
        
        const bin = page.groups?.find(b => b.id === binId);
        if (!bin) return;
        
        const enabledPlugins = bin.plugins || [];
        const pluginSet = new Set();
        
        for (const pluginId of enabledPlugins) {
            const plugin = pluginRegistry.get(pluginId);
            if (plugin && plugin.type === 'bin') {
                await pluginRegistry.enable(pluginId);
                pluginSet.add(pluginId);
            }
        }
        
        const key = `${pageId}:${binId}`;
        this.binPlugins.set(key, pluginSet);
    }
    
    /**
     * Cleanup plugins for a bin
     * @param {string} pageId - Page ID
     * @param {string} binId - Bin ID
     */
    async cleanupBinPlugins(pageId, binId) {
        const key = `${pageId}:${binId}`;
        const pluginSet = this.binPlugins.get(key);
        if (pluginSet) {
            for (const pluginId of pluginSet) {
                await pluginRegistry.disable(pluginId);
            }
            this.binPlugins.delete(key);
        }
    }
    
    /**
     * Enable plugin for a bin
     * @param {string} pageId - Page ID
     * @param {string} binId - Bin ID
     * @param {string} pluginId - Plugin ID
     * @returns {Promise<boolean>} - Success status
     */
    async enablePlugin(pageId, binId, pluginId) {
        const appState = this._getAppState();
        const page = appState.documents.find(p => p.id === pageId);
        if (!page) return false;
        
        const bin = page.groups?.find(b => b.id === binId);
        if (!bin) return false;
        
        const plugin = pluginRegistry.get(pluginId);
        if (!plugin || plugin.type !== 'bin') {
            console.error(`Plugin "${pluginId}" not found or not a bin plugin`);
            return false;
        }
        
        // Initialize plugin if needed
        if (!pluginRegistry.isInitialized(pluginId)) {
            await pluginRegistry.initialize(pluginId, null);
        }
        
        // Enable plugin
        const success = await pluginRegistry.enable(pluginId);
        if (success) {
            // Add to bin's plugin list
            if (!bin.plugins) {
                bin.plugins = [];
            }
            if (!bin.plugins.includes(pluginId)) {
                bin.plugins.push(pluginId);
            }
            
            // Track in manager
            const key = `${pageId}:${binId}`;
            let pluginSet = this.binPlugins.get(key);
            if (!pluginSet) {
                pluginSet = new Set();
                this.binPlugins.set(key, pluginSet);
            }
            pluginSet.add(pluginId);
            
            // Save and re-render
            const dataManager = this._getDataManager();
            if (dataManager) {
                dataManager.saveData();
            }
            eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
            
            eventBus.emit('bin:plugin:enabled', { pageId, binId, pluginId });
        }
        
        return success;
    }
    
    /**
     * Disable plugin for a bin
     * @param {string} pageId - Page ID
     * @param {string} binId - Bin ID
     * @param {string} pluginId - Plugin ID
     * @returns {Promise<boolean>} - Success status
     */
    async disablePlugin(pageId, binId, pluginId) {
        const appState = this._getAppState();
        const page = appState.documents.find(p => p.id === pageId);
        if (!page) return false;
        
        const bin = page.groups?.find(b => b.id === binId);
        if (!bin) return false;
        
        const success = await pluginRegistry.disable(pluginId);
        if (success) {
            // Remove from bin's plugin list
            if (bin.plugins) {
                bin.plugins = bin.plugins.filter(id => id !== pluginId);
            }
            
            // Remove from manager tracking
            const key = `${pageId}:${binId}`;
            const pluginSet = this.binPlugins.get(key);
            if (pluginSet) {
                pluginSet.delete(pluginId);
            }
            
            // Save and re-render
            const dataManager = this._getDataManager();
            if (dataManager) {
                dataManager.saveData();
            }
            eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
            
            eventBus.emit('bin:plugin:disabled', { pageId, binId, pluginId });
        }
        
        return success;
    }
    
    /**
     * Get enabled plugins for a bin
     * @param {string} pageId - Page ID
     * @param {string} binId - Bin ID
     * @returns {Array<Object>} - Array of plugin instances
     */
    getBinPlugins(pageId, binId) {
        const key = `${pageId}:${binId}`;
        const pluginSet = this.binPlugins.get(key) || new Set();
        return Array.from(pluginSet)
            .map(id => pluginRegistry.get(id))
            .filter(plugin => plugin !== null);
    }
    
    /**
     * Get all available bin plugins
     * @returns {Array<Object>} - Array of plugin instances
     */
    getAvailablePlugins() {
        return pluginRegistry.getByType('bin');
    }
    
    /**
     * Render plugin UI sections for bin edit modal
     * @param {HTMLElement} container - Container element
     * @param {string} pageId - Page ID
     * @param {string} binId - Bin ID
     */
    renderPluginUI(container, pageId, binId) {
        const appState = this._getAppState();
        const page = appState.documents.find(p => p.id === pageId);
        if (!page) return;
        
        const bin = page.groups?.find(b => b.id === binId);
        if (!bin) return;
        
        const availablePlugins = this.getAvailablePlugins();
        if (availablePlugins.length === 0) {
            const noPlugins = DOMUtils.createElement('div', {
                class: 'plugin-section'
            }, 'No bin plugins available');
            container.appendChild(noPlugins);
            return;
        }
        
        const section = DOMUtils.createElement('div', {
            class: 'plugin-section'
        });
        
        const title = DOMUtils.createElement('h4', {}, 'Bin Plugins');
        section.appendChild(title);
        
        availablePlugins.forEach(plugin => {
            const enabled = bin.plugins && bin.plugins.includes(plugin.id);
            
            const pluginItem = DOMUtils.createElement('div', {
                class: 'plugin-item'
            });
            
            const checkbox = DOMUtils.createElement('input', {
                type: 'checkbox',
                id: `bin-plugin-${plugin.id}`,
                checked: enabled
            });
            
            checkbox.addEventListener('change', async (e) => {
                if (e.target.checked) {
                    await this.enablePlugin(pageId, binId, plugin.id);
                } else {
                    await this.disablePlugin(pageId, binId, plugin.id);
                }
            });
            
            const label = DOMUtils.createElement('label', {
                for: `bin-plugin-${plugin.id}`
            }, plugin.name || plugin.id);
            
            if (plugin.description) {
                const desc = DOMUtils.createElement('div', {
                    class: 'plugin-description'
                }, plugin.description);
                label.appendChild(desc);
            }
            
            pluginItem.appendChild(checkbox);
            pluginItem.appendChild(label);
            section.appendChild(pluginItem);
        });
        
        container.appendChild(section);
    }
    
    /**
     * Render plugin content for a bin
     * @param {HTMLElement} container - Container element
     * @param {string} pageId - Page ID
     * @param {string} binId - Bin ID
     */
    renderPluginContent(container, pageId, binId) {
        const plugins = this.getBinPlugins(pageId, binId);
        plugins.forEach(plugin => {
            if (plugin.render && typeof plugin.render === 'function') {
                const pluginContainer = DOMUtils.createElement('div', {
                    class: `plugin-content plugin-${plugin.id}`
                });
                const appState = this._getAppState();
        const page = appState.documents.find(p => p.id === pageId);
                const bin = page.groups?.find(b => b.id === binId);
                plugin.render(pluginContainer, bin, { page });
                container.appendChild(pluginContainer);
            }
        });
    }
}


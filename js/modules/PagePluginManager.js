// PagePluginManager - Manages page plugin lifecycle and rendering
import { pluginRegistry } from '../core/PluginManager.js';
import { eventBus } from '../core/EventBus.js';
import { EVENTS } from '../core/AppEvents.js';
import { DOMUtils } from '../utils/dom.js';
import { getService, SERVICES, hasService } from '../core/AppServices.js';

export class PagePluginManager {
    constructor() {
        this.pagePlugins = new Map(); // pageId -> Set of enabled pluginIds
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
        eventBus.on('page:created', (data) => {
            this.initializePagePlugins(data.pageId);
        });
        
        eventBus.on('page:deleted', (data) => {
            this.cleanupPagePlugins(data.pageId);
        });
    }
    
    /**
     * Initialize plugins for a page
     * @param {string} pageId - Page ID
     */
    async initializePagePlugins(pageId) {
        const appState = this._getAppState();
        const page = appState.documents.find(p => p.id === pageId);
        if (!page) return;
        
        const enabledPlugins = page.plugins || [];
        const pluginSet = new Set();
        
        for (const pluginId of enabledPlugins) {
            const plugin = pluginRegistry.get(pluginId);
            if (plugin && plugin.type === 'page') {
                await pluginRegistry.enable(pluginId);
                pluginSet.add(pluginId);
            }
        }
        
        this.pagePlugins.set(pageId, pluginSet);
    }
    
    /**
     * Cleanup plugins for a page
     * @param {string} pageId - Page ID
     */
    async cleanupPagePlugins(pageId) {
        const pluginSet = this.pagePlugins.get(pageId);
        if (pluginSet) {
            for (const pluginId of pluginSet) {
                await pluginRegistry.disable(pluginId);
            }
            this.pagePlugins.delete(pageId);
        }
    }
    
    /**
     * Enable plugin for a page
     * @param {string} pageId - Page ID
     * @param {string} pluginId - Plugin ID
     * @returns {Promise<boolean>} - Success status
     */
    async enablePlugin(pageId, pluginId) {
        const appState = this._getAppState();
        const page = appState.documents.find(p => p.id === pageId);
        if (!page) return false;
        
        const plugin = pluginRegistry.get(pluginId);
        if (!plugin || plugin.type !== 'page') {
            console.error(`Plugin "${pluginId}" not found or not a page plugin`);
            return false;
        }
        
        // Initialize plugin if needed
        if (!pluginRegistry.isInitialized(pluginId)) {
            await pluginRegistry.initialize(pluginId, null);
        }
        
        // Enable plugin
        const success = await pluginRegistry.enable(pluginId);
        if (success) {
            // Add to page's plugin list
            if (!page.plugins) {
                page.plugins = [];
            }
            if (!page.plugins.includes(pluginId)) {
                page.plugins.push(pluginId);
            }
            
            // Track in manager
            let pluginSet = this.pagePlugins.get(pageId);
            if (!pluginSet) {
                pluginSet = new Set();
                this.pagePlugins.set(pageId, pluginSet);
            }
            pluginSet.add(pluginId);
            
            // Save and re-render
            const dataManager = this._getDataManager();
            if (dataManager) {
                dataManager.saveData();
            }
            eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
            
            eventBus.emit('page:plugin:enabled', { pageId, pluginId });
        }
        
        return success;
    }
    
    /**
     * Disable plugin for a page
     * @param {string} pageId - Page ID
     * @param {string} pluginId - Plugin ID
     * @returns {Promise<boolean>} - Success status
     */
    async disablePlugin(pageId, pluginId) {
        const appState = this._getAppState();
        const page = appState.documents.find(p => p.id === pageId);
        if (!page) return false;
        
        const success = await pluginRegistry.disable(pluginId);
        if (success) {
            // Remove from page's plugin list
            if (page.plugins) {
                page.plugins = page.plugins.filter(id => id !== pluginId);
            }
            
            // Remove from manager tracking
            const pluginSet = this.pagePlugins.get(pageId);
            if (pluginSet) {
                pluginSet.delete(pluginId);
            }
            
            // Save and re-render
            const dataManager = this._getDataManager();
            if (dataManager) {
                dataManager.saveData();
            }
            eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
            
            eventBus.emit('page:plugin:disabled', { pageId, pluginId });
        }
        
        return success;
    }
    
    /**
     * Get enabled plugins for a page
     * @param {string} pageId - Page ID
     * @returns {Array<Object>} - Array of plugin instances
     */
    getPagePlugins(pageId) {
        const pluginSet = this.pagePlugins.get(pageId) || new Set();
        return Array.from(pluginSet)
            .map(id => pluginRegistry.get(id))
            .filter(plugin => plugin !== null);
    }
    
    /**
     * Get all available page plugins
     * @returns {Array<Object>} - Array of plugin instances
     */
    getAvailablePlugins() {
        return pluginRegistry.getByType('page');
    }
    
    /**
     * Render plugin UI sections for page edit modal
     * @param {HTMLElement} container - Container element
     * @param {string} pageId - Page ID
     */
    renderPluginUI(container, pageId) {
        const appState = this._getAppState();
        const page = appState.documents.find(p => p.id === pageId);
        if (!page) return;
        
        const availablePlugins = this.getAvailablePlugins();
        if (availablePlugins.length === 0) {
            const noPlugins = DOMUtils.createElement('div', {
                class: 'plugin-section'
            }, 'No page plugins available');
            container.appendChild(noPlugins);
            return;
        }
        
        const section = DOMUtils.createElement('div', {
            class: 'plugin-section'
        });
        
        const title = DOMUtils.createElement('h4', {}, 'Page Plugins');
        section.appendChild(title);
        
        availablePlugins.forEach(plugin => {
            const enabled = page.plugins && page.plugins.includes(plugin.id);
            
            const pluginItem = DOMUtils.createElement('div', {
                class: 'plugin-item'
            });
            
            const checkbox = DOMUtils.createElement('input', {
                type: 'checkbox',
                id: `plugin-${plugin.id}`,
                checked: enabled
            });
            
            checkbox.addEventListener('change', async (e) => {
                if (e.target.checked) {
                    await this.enablePlugin(pageId, plugin.id);
                } else {
                    await this.disablePlugin(pageId, plugin.id);
                }
            });
            
            const label = DOMUtils.createElement('label', {
                for: `plugin-${plugin.id}`
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
     * Render plugin content for a page
     * @param {HTMLElement} container - Container element
     * @param {string} pageId - Page ID
     */
    renderPluginContent(container, pageId) {
        const plugins = this.getPagePlugins(pageId);
        plugins.forEach(plugin => {
            if (plugin.render && typeof plugin.render === 'function') {
                const pluginContainer = DOMUtils.createElement('div', {
                    class: `plugin-content plugin-${plugin.id}`
                });
                const appState = this._getAppState();
        const page = appState.documents.find(p => p.id === pageId);
                plugin.render(pluginContainer, page);
                container.appendChild(pluginContainer);
            }
        });
    }
}


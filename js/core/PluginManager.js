// PluginManager - Central registry for all plugins
import { DataUtils } from '../utils/data.js';

export class PluginManager {
    constructor() {
        this.plugins = new Map(); // pluginId -> plugin instance
        this.pluginsByType = new Map(); // type -> Set of pluginIds
        this.dependencies = new Map(); // pluginId -> Set of dependency pluginIds
        this.initialized = new Set(); // Set of initialized pluginIds
        this.enabled = new Set(); // Set of enabled pluginIds
    }
    
    /**
     * Register a plugin
     * @param {Object} plugin - Plugin instance
     * @param {string} plugin.id - Plugin ID
     * @param {string} plugin.type - Plugin type (page, bin, element, format)
     * @param {Array<string>} plugin.dependencies - Plugin dependencies
     * @returns {boolean} - Success status
     */
    register(plugin) {
        if (!plugin || !plugin.id || !plugin.type) {
            console.error('Plugin must have id and type');
            return false;
        }
        
        // Check if already registered
        if (this.plugins.has(plugin.id)) {
            console.warn(`Plugin "${plugin.id}" is already registered`);
            return false;
        }
        
        // Register plugin
        this.plugins.set(plugin.id, plugin);
        
        // Add to type index
        if (!this.pluginsByType.has(plugin.type)) {
            this.pluginsByType.set(plugin.type, new Set());
        }
        this.pluginsByType.get(plugin.type).add(plugin.id);
        
        // Store dependencies
        if (plugin.dependencies && Array.isArray(plugin.dependencies)) {
            this.dependencies.set(plugin.id, new Set(plugin.dependencies));
        } else {
            this.dependencies.set(plugin.id, new Set());
        }
        
        return true;
    }
    
    /**
     * Unregister a plugin
     * @param {string} pluginId - Plugin ID
     * @returns {boolean} - Success status
     */
    unregister(pluginId) {
        const plugin = this.plugins.get(pluginId);
        if (!plugin) return false;
        
        // Disable and destroy if enabled
        if (this.enabled.has(pluginId)) {
            this.disable(pluginId);
        }
        
        // Remove from type index
        const typeSet = this.pluginsByType.get(plugin.type);
        if (typeSet) {
            typeSet.delete(pluginId);
        }
        
        // Remove from maps
        this.plugins.delete(pluginId);
        this.dependencies.delete(pluginId);
        this.initialized.delete(pluginId);
        this.enabled.delete(pluginId);
        
        return true;
    }
    
    /**
     * Get plugin by ID
     * @param {string} pluginId - Plugin ID
     * @returns {Object|null} - Plugin instance
     */
    get(pluginId) {
        return this.plugins.get(pluginId) || null;
    }
    
    /**
     * Get all plugins of a type
     * @param {string} type - Plugin type
     * @returns {Array<Object>} - Array of plugin instances
     */
    getByType(type) {
        const pluginIds = this.pluginsByType.get(type) || new Set();
        return Array.from(pluginIds)
            .map(id => this.plugins.get(id))
            .filter(plugin => plugin !== undefined);
    }
    
    /**
     * Get all registered plugins
     * @returns {Array<Object>} - Array of plugin instances
     */
    getAll() {
        return Array.from(this.plugins.values());
    }
    
    /**
     * Check if plugin is registered
     * @param {string} pluginId - Plugin ID
     * @returns {boolean}
     */
    has(pluginId) {
        return this.plugins.has(pluginId);
    }
    
    /**
     * Initialize a plugin
     * @param {string} pluginId - Plugin ID
     * @param {Object} context - App context
     * @returns {Promise<boolean>} - Success status
     */
    async initialize(pluginId, context) {
        if (this.initialized.has(pluginId)) {
            return true;
        }
        
        const plugin = this.plugins.get(pluginId);
        if (!plugin) {
            console.error(`Plugin "${pluginId}" not found`);
            return false;
        }
        
        // Initialize dependencies first
        const deps = this.dependencies.get(pluginId) || new Set();
        for (const depId of deps) {
            if (!this.initialized.has(depId)) {
                const depSuccess = await this.initialize(depId, context);
                if (!depSuccess) {
                    console.error(`Failed to initialize dependency "${depId}" for plugin "${pluginId}"`);
                    return false;
                }
            }
        }
        
        // Initialize plugin
        try {
            if (plugin.init && typeof plugin.init === 'function') {
                await plugin.init(context);
            }
            this.initialized.add(pluginId);
            return true;
        } catch (error) {
            console.error(`Error initializing plugin "${pluginId}":`, error);
            return false;
        }
    }
    
    /**
     * Enable a plugin
     * @param {string} pluginId - Plugin ID
     * @returns {Promise<boolean>} - Success status
     */
    async enable(pluginId) {
        if (this.enabled.has(pluginId)) {
            return true;
        }
        
        const plugin = this.plugins.get(pluginId);
        if (!plugin) {
            console.error(`Plugin "${pluginId}" not found`);
            return false;
        }
        
        // Ensure initialized
        if (!this.initialized.has(pluginId)) {
            const initSuccess = await this.initialize(pluginId, {});
            if (!initSuccess) {
                return false;
            }
        }
        
        // Enable plugin
        try {
            if (plugin.enable && typeof plugin.enable === 'function') {
                await plugin.enable();
            }
            this.enabled.add(pluginId);
            return true;
        } catch (error) {
            console.error(`Error enabling plugin "${pluginId}":`, error);
            return false;
        }
    }
    
    /**
     * Disable a plugin
     * @param {string} pluginId - Plugin ID
     * @returns {Promise<boolean>} - Success status
     */
    async disable(pluginId) {
        if (!this.enabled.has(pluginId)) {
            return true;
        }
        
        const plugin = this.plugins.get(pluginId);
        if (!plugin) {
            return false;
        }
        
        // Disable plugin
        try {
            if (plugin.disable && typeof plugin.disable === 'function') {
                await plugin.disable();
            }
            this.enabled.delete(pluginId);
            return true;
        } catch (error) {
            console.error(`Error disabling plugin "${pluginId}":`, error);
            return false;
        }
    }
    
    /**
     * Check if plugin is enabled
     * @param {string} pluginId - Plugin ID
     * @returns {boolean}
     */
    isEnabled(pluginId) {
        return this.enabled.has(pluginId);
    }
    
    /**
     * Check if plugin is initialized
     * @param {string} pluginId - Plugin ID
     * @returns {boolean}
     */
    isInitialized(pluginId) {
        return this.initialized.has(pluginId);
    }
    
    /**
     * Get plugin dependencies
     * @param {string} pluginId - Plugin ID
     * @returns {Set<string>} - Set of dependency plugin IDs
     */
    getDependencies(pluginId) {
        return this.dependencies.get(pluginId) || new Set();
    }
    
    /**
     * Get initialization order for all plugins
     * @returns {Array<string>} - Array of plugin IDs in initialization order
     */
    getInitializationOrder() {
        const ordered = [];
        const visited = new Set();
        const visiting = new Set();
        
        const visit = (pluginId) => {
            if (visiting.has(pluginId)) {
                console.warn(`Circular dependency detected involving plugin "${pluginId}"`);
                return;
            }
            
            if (visited.has(pluginId)) {
                return;
            }
            
            visiting.add(pluginId);
            
            const deps = this.dependencies.get(pluginId) || new Set();
            deps.forEach(depId => {
                if (this.plugins.has(depId)) {
                    visit(depId);
                }
            });
            
            visiting.delete(pluginId);
            visited.add(pluginId);
            ordered.push(pluginId);
        };
        
        this.plugins.forEach((plugin, pluginId) => {
            if (!visited.has(pluginId)) {
                visit(pluginId);
            }
        });
        
        return ordered;
    }
    
    /**
     * Clear all plugins
     */
    clear() {
        // Disable and destroy all plugins
        this.enabled.forEach(pluginId => {
            this.disable(pluginId);
        });
        
        this.plugins.clear();
        this.pluginsByType.clear();
        this.dependencies.clear();
        this.initialized.clear();
        this.enabled.clear();
    }
}

// Singleton instance
export const pluginRegistry = new PluginManager();


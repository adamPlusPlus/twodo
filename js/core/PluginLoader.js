// PluginLoader - Dynamic plugin loading
import { pluginRegistry } from './PluginRegistry.js';
import { eventBus } from './EventBus.js';

export class PluginLoader {
    constructor() {
        this.loadedPlugins = new Set(); // Set of loaded plugin IDs
        this.loadingPromises = new Map(); // pluginId -> Promise
    }
    
    /**
     * Load a plugin module
     * @param {string} pluginPath - Path to plugin module
     * @param {string} pluginId - Plugin ID (optional, defaults to filename)
     * @param {Object} app - App instance (optional, for plugins that need it)
     * @returns {Promise<Object>} - Plugin instance
     */
    async loadPlugin(pluginPath, pluginId = null, app = null) {
        // Generate plugin ID from path if not provided
        if (!pluginId) {
            const parts = pluginPath.split('/');
            const filename = parts[parts.length - 1];
            pluginId = filename.replace(/\.js$/, '');
        }
        
        // Check if already loaded
        if (this.loadedPlugins.has(pluginId)) {
            return pluginRegistry.get(pluginId);
        }
        
        // Check if currently loading
        if (this.loadingPromises.has(pluginId)) {
            return await this.loadingPromises.get(pluginId);
        }
        
        // Start loading
        const loadPromise = this._loadPluginModule(pluginPath, pluginId, app);
        this.loadingPromises.set(pluginId, loadPromise);
        
        try {
            const plugin = await loadPromise;
            this.loadedPlugins.add(pluginId);
            this.loadingPromises.delete(pluginId);
            return plugin;
        } catch (error) {
            this.loadingPromises.delete(pluginId);
            // Only log non-fetch errors (fetch errors are expected for optional plugins)
            const isFetchError = error instanceof TypeError && 
                (error.message.includes('Failed to fetch') || 
                 error.message.includes('ERR_CONNECTION_REFUSED') ||
                 error.message.includes('dynamically imported module'));
            if (!isFetchError) {
                console.error(`Failed to load plugin "${pluginId}" from "${pluginPath}":`, error);
            }
            throw error;
        }
    }
    
    /**
     * Load plugin module (internal)
     * @param {string} pluginPath - Path to plugin module
     * @param {string} pluginId - Plugin ID
     * @param {Object} app - App instance (optional)
     * @returns {Promise<Object>} - Plugin instance
     */
    async _loadPluginModule(pluginPath, pluginId, app = null) {
        try {
            // Dynamic import
            const module = await import(pluginPath);
            
            // Get plugin class (default export or named export)
            const PluginClass = module.default || module[Object.keys(module)[0]];
            
            if (!PluginClass) {
                throw new Error(`No plugin class found in module "${pluginPath}"`);
            }
            
            // Instantiate plugin - try with app first, fallback to no args
            let plugin;
            try {
                // Try instantiating with app if provided
                if (app) {
                    plugin = new PluginClass(app);
                } else {
                    plugin = new PluginClass();
                }
            } catch (e) {
                // If that fails, try without app
                if (app) {
                    plugin = new PluginClass();
                } else {
                    throw e;
                }
            }
            
            // If app was provided and plugin doesn't have it yet, initialize it
            if (app && plugin.init && typeof plugin.init === 'function' && !plugin.app) {
                await plugin.init(app);
            }
            
            // Ensure plugin has required properties
            if (!plugin.id) {
                plugin.id = pluginId;
            }
            
            // Register plugin
            const registered = pluginRegistry.register(plugin);
            if (!registered) {
                throw new Error(`Failed to register plugin "${pluginId}"`);
            }
            
            eventBus.emit('plugin:loaded', {
                pluginId: plugin.id,
                pluginPath
            });
            
            return plugin;
        } catch (error) {
            // Only log non-fetch errors (fetch errors are expected for optional plugins)
            const isFetchError = error instanceof TypeError && 
                (error.message.includes('Failed to fetch') || 
                 error.message.includes('ERR_CONNECTION_REFUSED') ||
                 error.message.includes('dynamically imported module'));
            if (!isFetchError) {
                console.error(`Error loading plugin module "${pluginPath}":`, error);
            }
            throw error;
        }
    }
    
    /**
     * Load multiple plugins
     * @param {Array<Object>} plugins - Array of { path, id } objects
     * @returns {Promise<Array<Object>>} - Array of plugin instances
     */
    async loadPlugins(plugins) {
        const results = await Promise.allSettled(
            plugins.map(plugin => this.loadPlugin(plugin.path, plugin.id))
        );
        
        const loaded = [];
        const failed = [];
        
        results.forEach((result, index) => {
            if (result.status === 'fulfilled') {
                loaded.push(result.value);
            } else {
                failed.push({
                    plugin: plugins[index],
                    error: result.reason
                });
            }
        });
        
        if (failed.length > 0) {
            console.warn('Some plugins failed to load:', failed);
        }
        
        return loaded;
    }
    
    /**
     * Load plugins from directory
     * @param {string} directory - Directory path
     * @param {Array<string>} pluginFiles - Array of plugin filenames
     * @returns {Promise<Array<Object>>} - Array of plugin instances
     */
    async loadPluginsFromDirectory(directory, pluginFiles) {
        const plugins = pluginFiles.map(filename => ({
            path: `${directory}/${filename}`,
            id: filename.replace(/\.js$/, '')
        }));
        
        return await this.loadPlugins(plugins);
    }
    
    /**
     * Unload a plugin
     * @param {string} pluginId - Plugin ID
     * @returns {Promise<boolean>} - Success status
     */
    async unloadPlugin(pluginId) {
        const plugin = pluginRegistry.get(pluginId);
        if (!plugin) {
            return false;
        }
        
        // Destroy plugin
        if (plugin.destroy && typeof plugin.destroy === 'function') {
            await plugin.destroy();
        }
        
        // Unregister
        pluginRegistry.unregister(pluginId);
        
        // Remove from loaded set
        this.loadedPlugins.delete(pluginId);
        
        eventBus.emit('plugin:unloaded', { pluginId });
        
        return true;
    }
    
    /**
     * Check if plugin is loaded
     * @param {string} pluginId - Plugin ID
     * @returns {boolean}
     */
    isLoaded(pluginId) {
        return this.loadedPlugins.has(pluginId);
    }
    
    /**
     * Get all loaded plugin IDs
     * @returns {Array<string>}
     */
    getLoadedPlugins() {
        return Array.from(this.loadedPlugins);
    }
    
    /**
     * Clear all loaded plugins
     */
    clear() {
        this.loadedPlugins.clear();
        this.loadingPromises.clear();
    }
}

// Singleton instance
export const pluginLoader = new PluginLoader();


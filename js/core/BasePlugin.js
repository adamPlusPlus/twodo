// BasePlugin - Base class for page and bin plugins
import { eventBus } from './EventBus.js';
import { DataUtils } from '../utils/data.js';
import { StorageUtils } from '../utils/storage.js';

export class BasePlugin {
    constructor(config = {}) {
        this.id = config.id || this.constructor.name.toLowerCase();
        this.name = config.name || this.id;
        this.type = config.type || 'plugin'; // 'page' or 'bin'
        this.version = config.version || '1.0.0';
        this.description = config.description || '';
        this.dependencies = config.dependencies || [];
        this.config = DataUtils.deepMerge({}, config.defaultConfig || {});
        this.enabled = false;
        this.app = null;
    }
    
    /**
     * Initialize plugin
     * @param {Object} app - App instance
     * @returns {Promise<void>}
     */
    async init(app) {
        this.app = app;
        
        // Load saved configuration
        const savedConfig = StorageUtils.get(`plugin:${this.id}:config`, null);
        if (savedConfig) {
            this.config = DataUtils.deepMerge(this.config, savedConfig);
        }
        
        // Subscribe to events
        this.setupEventListeners();
        
        // Call custom initialization
        await this.onInit();
    }
    
    /**
     * Custom initialization hook (override in subclasses)
     * @returns {Promise<void>}
     */
    async onInit() {
        // Override in subclasses
    }
    
    /**
     * Enable plugin
     * @returns {Promise<void>}
     */
    async enable() {
        if (this.enabled) return;
        
        await this.onEnable();
        this.enabled = true;
        eventBus.emit('plugin:enabled', { pluginId: this.id });
    }
    
    /**
     * Custom enable hook (override in subclasses)
     * @returns {Promise<void>}
     */
    async onEnable() {
        // Override in subclasses
    }
    
    /**
     * Disable plugin
     * @returns {Promise<void>}
     */
    async disable() {
        if (!this.enabled) return;
        
        await this.onDisable();
        this.enabled = false;
        eventBus.emit('plugin:disabled', { pluginId: this.id });
    }
    
    /**
     * Custom disable hook (override in subclasses)
     * @returns {Promise<void>}
     */
    async onDisable() {
        // Override in subclasses
    }
    
    /**
     * Destroy plugin
     * @returns {Promise<void>}
     */
    async destroy() {
        await this.disable();
        this.removeEventListeners();
        await this.onDestroy();
        this.app = null;
    }
    
    /**
     * Custom destroy hook (override in subclasses)
     * @returns {Promise<void>}
     */
    async onDestroy() {
        // Override in subclasses
    }
    
    /**
     * Setup event listeners (override in subclasses)
     */
    setupEventListeners() {
        // Override in subclasses
    }
    
    /**
     * Remove event listeners (override in subclasses)
     */
    removeEventListeners() {
        // Override in subclasses
    }
    
    /**
     * Get plugin configuration
     * @returns {Object}
     */
    getConfig() {
        return DataUtils.deepClone(this.config);
    }
    
    /**
     * Update plugin configuration
     * @param {Object} newConfig - New configuration
     * @param {boolean} save - Save to storage
     */
    updateConfig(newConfig, save = true) {
        this.config = DataUtils.deepMerge(this.config, newConfig);
        
        if (save) {
            StorageUtils.set(`plugin:${this.id}:config`, this.config);
        }
        
        eventBus.emit('plugin:config:updated', {
            pluginId: this.id,
            config: this.config
        });
    }
    
    /**
     * Reset configuration to defaults
     */
    resetConfig() {
        // This should be overridden to provide default config
        this.config = {};
        StorageUtils.remove(`plugin:${this.id}:config`);
    }
    
    /**
     * Render plugin UI (override in subclasses)
     * @param {HTMLElement} container - Container element
     * @param {Object} context - Context data (page/bin)
     * @returns {HTMLElement}
     */
    render(container, context) {
        // Override in subclasses
        return container;
    }
    
    /**
     * Render plugin configuration UI (override in subclasses)
     * @param {HTMLElement} container - Container element
     * @returns {HTMLElement}
     */
    renderConfigUI(container) {
        // Override in subclasses
        return container;
    }
    
    /**
     * Get plugin metadata
     * @returns {Object}
     */
    getMetadata() {
        return {
            id: this.id,
            name: this.name,
            type: this.type,
            version: this.version,
            description: this.description,
            dependencies: this.dependencies,
            enabled: this.enabled
        };
    }
}


// PluginConfigManager - Plugin configuration management
import { StorageUtils } from '../utils/storage.js';
import { DataUtils } from '../utils/data.js';
import { ValidationUtils } from '../utils/validation.js';
import { eventBus } from './EventBus.js';

export class PluginConfigManager {
    constructor() {
        this.configs = new Map(); // pluginId -> config
        this.schemas = new Map(); // pluginId -> schema
    }
    
    /**
     * Register configuration schema for a plugin
     * @param {string} pluginId - Plugin ID
     * @param {Object} schema - Configuration schema
     */
    registerSchema(pluginId, schema) {
        this.schemas.set(pluginId, schema);
    }
    
    /**
     * Get configuration schema for a plugin
     * @param {string} pluginId - Plugin ID
     * @returns {Object|null}
     */
    getSchema(pluginId) {
        return this.schemas.get(pluginId) || null;
    }
    
    /**
     * Get plugin configuration
     * @param {string} pluginId - Plugin ID
     * @param {Object} defaultConfig - Default configuration
     * @returns {Object}
     */
    getConfig(pluginId, defaultConfig = {}) {
        if (this.configs.has(pluginId)) {
            return DataUtils.deepClone(this.configs.get(pluginId));
        }
        
        // Try to load from storage
        const stored = StorageUtils.get(`plugin:${pluginId}:config`, null);
        if (stored) {
            this.configs.set(pluginId, stored);
            return DataUtils.deepClone(stored);
        }
        
        // Return default
        return DataUtils.deepClone(defaultConfig);
    }
    
    /**
     * Set plugin configuration
     * @param {string} pluginId - Plugin ID
     * @param {Object} config - Configuration
     * @param {boolean} validate - Validate configuration
     * @param {boolean} save - Save to storage
     * @returns {Object} - { valid: boolean, errors: Array<string> }
     */
    setConfig(pluginId, config, validate = true, save = true) {
        // Validate if schema exists
        if (validate) {
            const validation = this.validateConfig(pluginId, config);
            if (!validation.valid) {
                return validation;
            }
        }
        
        // Merge with existing config
        const existing = this.getConfig(pluginId, {});
        const merged = DataUtils.deepMerge(existing, config);
        
        // Store
        this.configs.set(pluginId, merged);
        
        // Save to storage
        if (save) {
            StorageUtils.set(`plugin:${pluginId}:config`, merged);
        }
        
        // Emit event
        eventBus.emit('plugin:config:updated', {
            pluginId,
            config: merged
        });
        
        return {
            valid: true,
            errors: []
        };
    }
    
    /**
     * Validate configuration against schema
     * @param {string} pluginId - Plugin ID
     * @param {Object} config - Configuration to validate
     * @returns {Object} - { valid: boolean, errors: Array<string> }
     */
    validateConfig(pluginId, config) {
        const schema = this.getSchema(pluginId);
        if (!schema) {
            return {
                valid: true,
                errors: []
            };
        }
        
        return ValidationUtils.validateSchema(config, schema);
    }
    
    /**
     * Reset configuration to defaults
     * @param {string} pluginId - Plugin ID
     * @param {Object} defaultConfig - Default configuration
     */
    resetConfig(pluginId, defaultConfig = {}) {
        this.configs.set(pluginId, DataUtils.deepClone(defaultConfig));
        StorageUtils.remove(`plugin:${pluginId}:config`);
        
        eventBus.emit('plugin:config:reset', {
            pluginId,
            config: defaultConfig
        });
    }
    
    /**
     * Get configuration value by path
     * @param {string} pluginId - Plugin ID
     * @param {string} path - Dot-separated path
     * @param {*} defaultValue - Default value
     * @returns {*}
     */
    getConfigValue(pluginId, path, defaultValue = null) {
        const config = this.getConfig(pluginId);
        return DataUtils.getNestedValue(config, path) ?? defaultValue;
    }
    
    /**
     * Set configuration value by path
     * @param {string} pluginId - Plugin ID
     * @param {string} path - Dot-separated path
     * @param {*} value - Value to set
     */
    setConfigValue(pluginId, path, value) {
        const config = this.getConfig(pluginId);
        DataUtils.setNestedValue(config, path, value);
        this.setConfig(pluginId, config);
    }
    
    /**
     * Get all plugin configurations
     * @returns {Object} - Map of pluginId -> config
     */
    getAllConfigs() {
        const result = {};
        this.configs.forEach((config, pluginId) => {
            result[pluginId] = DataUtils.deepClone(config);
        });
        return result;
    }
    
    /**
     * Clear all configurations
     */
    clear() {
        this.configs.clear();
        this.schemas.clear();
    }
}

// Singleton instance
export const pluginConfigManager = new PluginConfigManager();


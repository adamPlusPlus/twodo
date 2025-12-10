// BaseFormatRenderer - Base class for format renderers
import { BasePlugin } from './BasePlugin.js';
import { eventBus } from './EventBus.js';
import { DataUtils } from '../utils/data.js';

export class BaseFormatRenderer extends BasePlugin {
    constructor(config = {}) {
        super({
            ...config,
            type: 'format'
        });
        this.formatName = config.formatName || this.id;
        this.formatLabel = config.formatLabel || this.formatName;
        this.supportsPages = config.supportsPages !== false;
        this.supportsBins = config.supportsBins !== false;
    }
    
    /**
     * Render page in this format
     * @param {HTMLElement} container - Container element
     * @param {Object} page - Page data
     * @param {Object} context - Context
     * @returns {HTMLElement}
     */
    renderPage(container, page, context) {
        // Override in subclasses
        return container;
    }
    
    /**
     * Render bin in this format
     * @param {HTMLElement} container - Container element
     * @param {Object} bin - Bin data
     * @param {Object} context - Context
     * @returns {HTMLElement}
     */
    renderBin(container, bin, context) {
        // Override in subclasses
        return container;
    }
    
    /**
     * Render format settings UI
     * @param {HTMLElement} container - Container element
     * @param {Object} currentSettings - Current format settings
     * @returns {HTMLElement}
     */
    renderSettingsUI(container, currentSettings) {
        // Override in subclasses
        return container;
    }
    
    /**
     * Get default format settings
     * @returns {Object}
     */
    getDefaultSettings() {
        return {};
    }
    
    /**
     * Validate format settings
     * @param {Object} settings - Settings to validate
     * @returns {Object} - { valid: boolean, errors: Array<string> }
     */
    validateSettings(settings) {
        return {
            valid: true,
            errors: []
        };
    }
    
    /**
     * Apply format settings
     * @param {Object} settings - Settings to apply
     */
    applySettings(settings) {
        const validated = this.validateSettings(settings);
        if (validated.valid) {
            this.updateConfig(settings, true);
            eventBus.emit('format:settings:updated', {
                formatName: this.formatName,
                settings
            });
        }
        return validated;
    }
    
    /**
     * Export data in this format
     * @param {Object} data - Data to export
     * @returns {string|Blob} - Exported data
     */
    export(data) {
        // Override in subclasses
        return JSON.stringify(data, null, 2);
    }
    
    /**
     * Import data from this format
     * @param {string|Blob} data - Data to import
     * @returns {Object} - Parsed data
     */
    import(data) {
        // Override in subclasses
        if (typeof data === 'string') {
            try {
                return JSON.parse(data);
            } catch (error) {
                throw new Error('Invalid data format');
            }
        }
        throw new Error('Unsupported data type');
    }
    
    /**
     * Get format metadata
     * @returns {Object}
     */
    getMetadata() {
        return {
            ...super.getMetadata(),
            formatName: this.formatName,
            formatLabel: this.formatLabel,
            supportsPages: this.supportsPages,
            supportsBins: this.supportsBins
        };
    }
}


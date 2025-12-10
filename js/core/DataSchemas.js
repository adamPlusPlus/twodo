// DataSchemas - Plugin data structure definitions and validation
import { ValidationUtils } from '../utils/validation.js';

export const DataSchemas = {
    /**
     * Page schema
     */
    page: {
        id: { type: 'string', required: true },
        name: { type: 'string', required: true },
        bins: { type: 'array', required: false },
        plugins: { type: 'array', required: false },
        format: { type: 'string', required: false },
        config: { type: 'object', required: false }
    },
    
    /**
     * Bin schema
     */
    bin: {
        id: { type: 'string', required: true },
        name: { type: 'string', required: false },
        elements: { type: 'array', required: false },
        plugins: { type: 'array', required: false },
        format: { type: 'string', required: false },
        config: { type: 'object', required: false }
    },
    
    /**
     * Element schema
     */
    element: {
        type: { type: 'string', required: true },
        text: { type: 'string', required: false },
        completed: { type: 'boolean', required: false },
        repeats: { type: 'boolean', required: false },
        persistent: { type: 'boolean', required: false },
        children: { type: 'array', required: false },
        config: { type: 'object', required: false }
    },
    
    /**
     * Plugin configuration schema
     */
    pluginConfig: {
        id: { type: 'string', required: true },
        enabled: { type: 'boolean', required: false },
        config: { type: 'object', required: false }
    },
    
    /**
     * Validate data against schema
     * @param {Object} data - Data to validate
     * @param {Object} schema - Schema definition
     * @returns {Object} - { valid: boolean, errors: Object }
     */
    validate(data, schema) {
        return ValidationUtils.validateSchema(data, schema);
    },
    
    /**
     * Validate page data
     * @param {Object} page - Page data
     * @returns {Object} - { valid: boolean, errors: Object }
     */
    validatePage(page) {
        return this.validate(page, this.page);
    },
    
    /**
     * Validate bin data
     * @param {Object} bin - Bin data
     * @returns {Object} - { valid: boolean, errors: Object }
     */
    validateBin(bin) {
        return this.validate(bin, this.bin);
    },
    
    /**
     * Validate element data
     * @param {Object} element - Element data
     * @returns {Object} - { valid: boolean, errors: Object }
     */
    validateElement(element) {
        return this.validate(element, this.element);
    },
    
    /**
     * Validate plugin configuration
     * @param {Object} config - Plugin configuration
     * @returns {Object} - { valid: boolean, errors: Object }
     */
    validatePluginConfig(config) {
        return this.validate(config, this.pluginConfig);
    },
    
    /**
     * Migrate data structure (for version updates)
     * @param {Object} data - Data to migrate
     * @param {number} fromVersion - Source version
     * @param {number} toVersion - Target version
     * @returns {Object} - Migrated data
     */
    migrate(data, fromVersion, toVersion) {
        // Placeholder for migration logic
        // Override in specific schemas as needed
        return data;
    },
    
    /**
     * Get default page structure
     * @returns {Object}
     */
    getDefaultPage() {
        return {
            id: '',
            name: 'New Page',
            bins: [],
            plugins: [],
            format: null,
            config: {}
        };
    },
    
    /**
     * Get default bin structure
     * @returns {Object}
     */
    getDefaultBin() {
        return {
            id: '',
            name: '',
            elements: [],
            plugins: [],
            format: null,
            config: {}
        };
    },
    
    /**
     * Get default element structure
     * @returns {Object}
     */
    getDefaultElement() {
        return {
            type: 'task',
            text: '',
            completed: false,
            repeats: false,
            persistent: false,
            children: [],
            config: {}
        };
    }
};


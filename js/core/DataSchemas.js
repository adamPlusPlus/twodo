// DataSchemas - Plugin data structure definitions and validation
import { ValidationUtils } from '../utils/validation.js';

export const DataSchemas = {
    /**
     * Document schema
     */
    document: {
        id: { type: 'string', required: true },
        name: { type: 'string', required: true },
        groups: { type: 'array', required: false },
        groupMode: { type: 'string', required: false },
        plugins: { type: 'array', required: false },
        format: { type: 'string', required: false },
        config: { type: 'object', required: false }
    },
    
    /**
     * Group schema
     */
    group: {
        id: { type: 'string', required: true },
        name: { type: 'string', required: false },
        items: { type: 'array', required: false },
        level: { type: 'number', required: false },
        parentGroupId: { type: 'string', required: false },
        plugins: { type: 'array', required: false },
        format: { type: 'string', required: false },
        config: { type: 'object', required: false }
    },
    
    /**
     * Item schema
     */
    item: {
        id: { type: 'string', required: false },
        type: { type: 'string', required: true },
        text: { type: 'string', required: false },
        completed: { type: 'boolean', required: false },
        repeats: { type: 'boolean', required: false },
        persistent: { type: 'boolean', required: false },
        parentId: { type: 'string', required: false },
        childIds: { type: 'array', required: false },
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
     * Validate document data
     * @param {Object} document - Document data
     * @returns {Object} - { valid: boolean, errors: Object }
     */
    validateDocument(document) {
        return this.validate(document, this.document);
    },
    
    /**
     * Validate group data
     * @param {Object} group - Group data
     * @returns {Object} - { valid: boolean, errors: Object }
     */
    validateGroup(group) {
        return this.validate(group, this.group);
    },
    
    /**
     * Validate item data
     * @param {Object} item - Item data
     * @returns {Object} - { valid: boolean, errors: Object }
     */
    validateItem(item) {
        return this.validate(item, this.item);
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
     * Get default document structure
     * @returns {Object}
     */
    getDefaultDocument() {
        const groups = [];
        return {
            id: '',
            name: 'New Document',
            groups,
            groupMode: 'manual',
            plugins: [],
            format: null,
            config: {
                groupMode: 'manual'
            }
        };
    },
    
    /**
     * Get default group structure
     * @returns {Object}
     */
    getDefaultGroup() {
        const items = [];
        return {
            id: '',
            name: '',
            items,
            level: 0,
            parentGroupId: null,
            plugins: [],
            format: null,
            config: {}
        };
    },
    
    /**
     * Get default item structure
     * @returns {Object}
     */
    getDefaultItem() {
        return {
            id: '',
            type: 'task',
            text: '',
            completed: false,
            repeats: false,
            persistent: false,
            parentId: null,
            childIds: [],
            config: {}
        };
    },
    
    // Backward-compatible defaults
    getDefaultPage() {
        return this.getDefaultDocument();
    },
    
    getDefaultBin() {
        return this.getDefaultGroup();
    },
    
    getDefaultElement() {
        return this.getDefaultItem();
    }
};


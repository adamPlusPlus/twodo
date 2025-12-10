// BaseElementType - Base class for element type plugins
import { BasePlugin } from './BasePlugin.js';
import { eventBus } from './EventBus.js';
import { DataUtils } from '../utils/data.js';

export class BaseElementType extends BasePlugin {
    constructor(config = {}) {
        super({
            ...config,
            type: 'element'
        });
        this.elementType = config.elementType || this.id;
        this.keyboardShortcut = config.keyboardShortcut || null;
        this.icon = config.icon || '';
    }
    
    /**
     * Create element template
     * @returns {Object} - Element data object
     */
    createTemplate() {
        return {
            type: this.elementType,
            text: '',
            completed: false,
            repeats: false,
            persistent: false,
            children: []
        };
    }
    
    /**
     * Render element (override in subclasses)
     * @param {HTMLElement} container - Container element
     * @param {Object} element - Element data
     * @param {Object} context - Context (pageId, binId, elementIndex)
     * @returns {HTMLElement}
     */
    render(container, element, context) {
        // Override in subclasses
        return container;
    }
    
    /**
     * Render element edit UI (override in subclasses)
     * @param {HTMLElement} container - Container element
     * @param {Object} element - Element data
     * @param {Object} context - Context
     * @returns {HTMLElement}
     */
    renderEditUI(container, element, context) {
        // Override in subclasses
        return container;
    }
    
    /**
     * Validate element data
     * @param {Object} element - Element data
     * @returns {Object} - { valid: boolean, errors: Array<string> }
     */
    validate(element) {
        const errors = [];
        
        if (!element.type || element.type !== this.elementType) {
            errors.push('Invalid element type');
        }
        
        return {
            valid: errors.length === 0,
            errors
        };
    }
    
    /**
     * Handle element update
     * @param {Object} element - Element data
     * @param {Object} updates - Updates to apply
     * @returns {Object} - Updated element
     */
    update(element, updates) {
        return DataUtils.deepMerge(element, updates);
    }
    
    /**
     * Handle element deletion
     * @param {Object} element - Element data
     * @param {Object} context - Context
     * @returns {Promise<boolean>} - Allow deletion
     */
    async onDelete(element, context) {
        // Override in subclasses to add custom deletion logic
        return true;
    }
    
    /**
     * Handle element completion toggle
     * @param {Object} element - Element data
     * @param {boolean} completed - New completion state
     * @returns {Object} - Updated element
     */
    onToggleComplete(element, completed) {
        // Override in subclasses to add custom completion logic
        return {
            ...element,
            completed
        };
    }
    
    /**
     * Get element metadata
     * @returns {Object}
     */
    getMetadata() {
        return {
            ...super.getMetadata(),
            elementType: this.elementType,
            keyboardShortcut: this.keyboardShortcut,
            icon: this.icon
        };
    }
}


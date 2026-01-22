// ElementTypeManager - Manages element type registration and rendering
import { pluginRegistry } from '../core/PluginManager.js';
import { eventBus } from '../core/EventBus.js';
import { DOMUtils } from '../utils/dom.js';

export class ElementTypeManager {
    constructor() {
        this.elementTypes = new Map(); // elementType -> plugin instance
        this.setupEventListeners();
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        eventBus.on('element:type:registered', (data) => {
            this.registerElementType(data.pluginId);
        });
    }
    
    /**
     * Register an element type plugin
     * @param {string} pluginId - Plugin ID
     */
    registerElementType(pluginId) {
        const plugin = pluginRegistry.get(pluginId);
        if (plugin && plugin.type === 'element') {
            this.elementTypes.set(plugin.elementType, plugin);
        }
    }
    
    /**
     * Get element type plugin
     * @param {string} elementType - Element type
     * @returns {Object|null} - Plugin instance
     */
    getElementType(elementType) {
        return this.elementTypes.get(elementType) || null;
    }
    
    /**
     * Get all registered element types
     * @returns {Array<Object>} - Array of plugin instances
     */
    getAllElementTypes() {
        return Array.from(this.elementTypes.values());
    }
    
    /**
     * Create element template
     * @param {string} elementType - Element type
     * @returns {Object|null} - Element template
     */
    createTemplate(elementType) {
        const plugin = this.getElementType(elementType);
        if (plugin && plugin.createTemplate) {
            return plugin.createTemplate();
        }
        return null;
    }
    
    /**
     * Render element
     * @param {HTMLElement} container - Container element
     * @param {Object} element - Element data
     * @param {Object} context - Context (pageId, binId, elementIndex)
     * @returns {HTMLElement}
     */
    render(container, element, context) {
        const plugin = this.getElementType(element.type);
        if (plugin && plugin.render) {
            return plugin.render(container, element, context);
        }
        
        // Fallback to default rendering
        return this.renderDefault(container, element, context);
    }
    
    /**
     * Default element rendering
     * @param {HTMLElement} container - Container element
     * @param {Object} element - Element data
     * @param {Object} context - Context
     * @returns {HTMLElement}
     */
    renderDefault(container, element, context) {
        const div = DOMUtils.createElement('div', {
            class: 'element'
        }, element.text || '');
        container.appendChild(div);
        return div;
    }
    
    /**
     * Render element edit UI
     * @param {HTMLElement} container - Container element
     * @param {Object} element - Element data
     * @param {Object} context - Context
     * @returns {HTMLElement}
     */
    renderEditUI(container, element, context) {
        const plugin = this.getElementType(element.type);
        if (plugin && plugin.renderEditUI) {
            return plugin.renderEditUI(container, element, context);
        }
        
        // Fallback to default edit UI
        return this.renderDefaultEditUI(container, element, context);
    }
    
    /**
     * Default element edit UI
     * @param {HTMLElement} container - Container element
     * @param {Object} element - Element data
     * @param {Object} context - Context
     * @returns {HTMLElement}
     */
    renderDefaultEditUI(container, element, context) {
        const input = DOMUtils.createElement('input', {
            type: 'text',
            value: element.text || '',
            placeholder: 'Element text'
        });
        container.appendChild(input);
        return input;
    }
    
    /**
     * Validate element
     * @param {Object} element - Element data
     * @returns {Object} - { valid: boolean, errors: Array<string> }
     */
    validate(element) {
        const plugin = this.getElementType(element.type);
        if (plugin && plugin.validate) {
            return plugin.validate(element);
        }
        
        return {
            valid: true,
            errors: []
        };
    }
    
    /**
     * Handle element update
     * @param {Object} element - Element data
     * @param {Object} updates - Updates to apply
     * @returns {Object} - Updated element
     */
    update(element, updates) {
        const plugin = this.getElementType(element.type);
        if (plugin && plugin.update) {
            return plugin.update(element, updates);
        }
        
        return { ...element, ...updates };
    }
    
    /**
     * Handle element deletion
     * @param {Object} element - Element data
     * @param {Object} context - Context
     * @returns {Promise<boolean>} - Allow deletion
     */
    async onDelete(element, context) {
        const plugin = this.getElementType(element.type);
        if (plugin && plugin.onDelete) {
            return await plugin.onDelete(element, context);
        }
        
        return true;
    }
    
    /**
     * Handle element completion toggle
     * @param {Object} element - Element data
     * @param {boolean} completed - New completion state
     * @returns {Object} - Updated element
     */
    onToggleComplete(element, completed) {
        const plugin = this.getElementType(element.type);
        if (plugin && plugin.onToggleComplete) {
            return plugin.onToggleComplete(element, completed);
        }
        
        return { ...element, completed };
    }
    
    /**
     * Get element type metadata
     * @param {string} elementType - Element type
     * @returns {Object|null}
     */
    getElementTypeMetadata(elementType) {
        const plugin = this.getElementType(elementType);
        if (plugin && plugin.getMetadata) {
            return plugin.getMetadata();
        }
        return null;
    }
    
    /**
     * Get all element types for add modal
     * @returns {Array<Object>} - Array of { type, name, shortcut, icon }
     */
    getElementTypesForModal() {
        return this.getAllElementTypes().map(plugin => ({
            type: plugin.elementType,
            name: plugin.name || plugin.elementType,
            shortcut: plugin.keyboardShortcut,
            icon: plugin.icon
        }));
    }
}


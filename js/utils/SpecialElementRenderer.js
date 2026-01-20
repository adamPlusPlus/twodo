// SpecialElementRenderer.js - Centralized special element rendering
// Provides unified rendering for timer, counter, tracker, rating, etc. across all views

export class SpecialElementRenderer {
    /**
     * List of special element types that need custom rendering
     */
    static SPECIAL_ELEMENT_TYPES = ['timer', 'counter', 'tracker', 'rating', 'audio', 'image', 'time-log', 'calendar'];
    
    /**
     * Check if an element type is special
     * @param {string} elementType - Element type
     * @returns {boolean} True if element type is special
     */
    static isSpecialElement(elementType) {
        return this.SPECIAL_ELEMENT_TYPES.includes(elementType);
    }
    
    /**
     * Render a special element
     * @param {Object} element - Element data
     * @param {string} pageId - Page ID
     * @param {string} binId - Bin ID
     * @param {number} elementIndex - Element index
     * @param {Object} app - App instance
     * @param {HTMLElement} container - Container element to render into
     * @param {Object} options - Rendering options
     * @param {boolean} options.applyVisualSettings - Whether to apply visual settings (default: true)
     * @param {Object} options.styleOverrides - Style overrides to apply
     * @returns {HTMLElement|null} Rendered element container or null
     */
    static renderSpecialElement(element, pageId, binId, elementIndex, app, container, options = {}) {
        const {
            applyVisualSettings = true,
            styleOverrides = {}
        } = options;
        
        if (!this.isSpecialElement(element.type)) {
            return null;
        }
        
        if (!app || !app.elementRenderer || !app.elementRenderer.typeRegistry) {
            return null;
        }
        
        // Create element container
        const elementDiv = document.createElement('div');
        elementDiv.className = `element ${element.type}`;
        if (element.completed) {
            elementDiv.classList.add('completed');
        }
        
        // Apply default styles for special elements
        Object.assign(elementDiv.style, {
            margin: '0',
            padding: '0',
            border: 'none',
            background: 'transparent',
            flex: '1',
            ...styleOverrides
        });
        
        // Apply visual settings if requested
        if (applyVisualSettings && app.visualSettingsManager) {
            const elementId = `${pageId}-${binId}-${elementIndex}`;
            const page = app.appState?.documents?.find(p => p.id === pageId);
            const viewFormat = page?.format || 'default';
            app.visualSettingsManager.applyVisualSettings(elementDiv, 'element', elementId, pageId, viewFormat);
        }
        
        // Get renderer for this element type
        const renderer = app.elementRenderer.typeRegistry.getRenderer(element.type);
        if (renderer && renderer.render) {
            // Render the element
            renderer.render(elementDiv, pageId, binId, element, elementIndex, 0, () => null);
            
            // Append to container if provided
            if (container) {
                container.appendChild(elementDiv);
            }
            
            return elementDiv;
        }
        
        // Fallback: render as text
        elementDiv.textContent = element.text || element.type;
        if (container) {
            container.appendChild(elementDiv);
        }
        
        return elementDiv;
    }
    
    /**
     * Apply visual settings to a special element container
     * @param {HTMLElement} elementDiv - Element container
     * @param {Object} element - Element data
     * @param {string} pageId - Page ID
     * @param {string} binId - Bin ID
     * @param {number} elementIndex - Element index
     * @param {Object} app - App instance
     */
    static applyVisualSettings(elementDiv, element, pageId, binId, elementIndex, app) {
        if (!app || !app.visualSettingsManager) {
            return;
        }
        
        const elementId = `${pageId}-${binId}-${elementIndex}`;
        const page = app.appState?.documents?.find(p => p.id === pageId);
        const viewFormat = page?.format || 'default';
        app.visualSettingsManager.applyVisualSettings(elementDiv, 'element', elementId, pageId, viewFormat);
    }
}


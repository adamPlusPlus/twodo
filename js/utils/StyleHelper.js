// StyleHelper.js - Centralized style and CSS variable manipulation
// Provides consistent style application across the application

export class StyleHelper {
    /**
     * Apply CSS variables to an element
     * @param {HTMLElement} element - Target element
     * @param {Object} variables - Object mapping CSS variable names (without --) to values
     * @param {boolean} prefix - Whether to prefix with '--' (default: true)
     */
    static applyCSSVariables(element, variables, prefix = true) {
        if (!element) return;
        
        for (const [key, value] of Object.entries(variables)) {
            const varName = prefix ? `--${key}` : key;
            element.style.setProperty(varName, value);
        }
    }
    
    /**
     * Apply CSS variables to document root
     * @param {Object} variables - Object mapping CSS variable names to values
     */
    static applyCSSVariablesToRoot(variables) {
        this.applyCSSVariables(document.documentElement, variables);
    }
    
    /**
     * Apply a theme object to an element
     * @param {HTMLElement} element - Target element
     * @param {Object} theme - Theme object with style properties
     * @param {Object} options - Options
     * @param {boolean} options.asCSSVars - Apply as CSS variables instead of direct styles (default: false)
     */
    static applyTheme(element, theme, options = {}) {
        if (!element || !theme) return;
        
        const { asCSSVars = false } = options;
        
        if (asCSSVars) {
            // Apply as CSS variables
            this.applyCSSVariables(element, theme);
        } else {
            // Apply as direct styles
            this.mergeStyles(element, theme);
        }
    }
    
    /**
     * Merge style objects into element's style
     * @param {HTMLElement} element - Target element
     * @param {Object} styles - Style object
     */
    static mergeStyles(element, styles) {
        if (!element || !styles) return;
        
        if (typeof styles === 'string') {
            element.style.cssText = styles;
        } else if (typeof styles === 'object') {
            Object.assign(element.style, styles);
        }
    }
    
    /**
     * Get computed CSS variable value
     * @param {string} name - CSS variable name (with or without --)
     * @param {HTMLElement} element - Element to get variable from (default: document.documentElement)
     * @returns {string|null} CSS variable value or null
     */
    static getComputedCSSVar(name, element = document.documentElement) {
        if (!element) return null;
        
        const varName = name.startsWith('--') ? name : `--${name}`;
        return getComputedStyle(element).getPropertyValue(varName).trim() || null;
    }
    
    /**
     * Set a single style property
     * @param {HTMLElement} element - Target element
     * @param {string} property - CSS property name (camelCase or kebab-case)
     * @param {string} value - Property value
     */
    static setStyleProperty(element, property, value) {
        if (!element) return;
        
        // Convert kebab-case to camelCase if needed
        const camelProperty = property.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
        element.style[camelProperty] = value;
    }
    
    /**
     * Get computed style property
     * @param {HTMLElement} element - Target element
     * @param {string} property - CSS property name (camelCase or kebab-case)
     * @returns {string} Computed property value
     */
    static getComputedStyleProperty(element, property) {
        if (!element) return '';
        
        return getComputedStyle(element)[property] || '';
    }
    
    /**
     * Apply styles from a theme object with nested structure
     * Handles nested theme objects like { page: { background: '#fff', color: '#000' } }
     * @param {HTMLElement} element - Target element
     * @param {Object} theme - Theme object (can be nested)
     * @param {string} prefix - Optional prefix for CSS variable names
     */
    static applyNestedTheme(element, theme, prefix = '') {
        if (!element || !theme) return;
        
        for (const [key, value] of Object.entries(theme)) {
            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                // Nested object - recurse
                this.applyNestedTheme(element, value, prefix ? `${prefix}-${key}` : key);
            } else {
                // Leaf value - apply as CSS variable
                const varName = prefix ? `--${prefix}-${key}` : `--${key}`;
                element.style.setProperty(varName, value);
            }
        }
    }
    
    /**
     * Remove a style property
     * @param {HTMLElement} element - Target element
     * @param {string} property - CSS property name
     */
    static removeStyleProperty(element, property) {
        if (!element) return;
        
        const camelProperty = property.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
        element.style[camelProperty] = '';
    }
    
    /**
     * Toggle a class on an element
     * @param {HTMLElement} element - Target element
     * @param {string} className - Class name
     * @param {boolean} force - Force add (true) or remove (false), or toggle if undefined
     */
    static toggleClass(element, className, force) {
        if (!element) return;
        element.classList.toggle(className, force);
    }
}


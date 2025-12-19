// DOMBuilder.js - Fluent API for DOM element creation
// Reduces boilerplate in DOM manipulation code

export class DOMBuilder {
    constructor(tag) {
        this.element = document.createElement(tag);
    }
    
    /**
     * Set an attribute
     * @param {string} key - Attribute name
     * @param {string} value - Attribute value
     * @returns {DOMBuilder} This builder for chaining
     */
    attr(key, value) {
        if (key === 'class' || key === 'className') {
            this.element.className = value;
        } else if (key === 'style' && typeof value === 'object') {
            Object.assign(this.element.style, value);
        } else if (key === 'dataset') {
            Object.assign(this.element.dataset, value);
        } else if (key === 'textContent') {
            this.element.textContent = value;
        } else if (key === 'innerHTML') {
            this.element.innerHTML = value;
        } else {
            this.element.setAttribute(key, value);
        }
        return this;
    }
    
    /**
     * Set multiple attributes at once
     * @param {Object} attrs - Object of attribute key-value pairs
     * @returns {DOMBuilder} This builder for chaining
     */
    attrs(attrs) {
        for (const [key, value] of Object.entries(attrs)) {
            this.attr(key, value);
        }
        return this;
    }
    
    /**
     * Set style (object or string)
     * @param {Object|string} styles - Style object or CSS string
     * @returns {DOMBuilder} This builder for chaining
     */
    style(styles) {
        if (typeof styles === 'string') {
            this.element.style.cssText = styles;
        } else if (typeof styles === 'object') {
            Object.assign(this.element.style, styles);
        }
        return this;
    }
    
    /**
     * Add class(es)
     * @param {string|Array<string>} className - Class name(s) to add
     * @returns {DOMBuilder} This builder for chaining
     */
    class(className) {
        if (Array.isArray(className)) {
            this.element.classList.add(...className);
        } else {
            this.element.classList.add(className);
        }
        return this;
    }
    
    /**
     * Remove class(es)
     * @param {string|Array<string>} className - Class name(s) to remove
     * @returns {DOMBuilder} This builder for chaining
     */
    removeClass(className) {
        if (Array.isArray(className)) {
            this.element.classList.remove(...className);
        } else {
            this.element.classList.remove(className);
        }
        return this;
    }
    
    /**
     * Set text content
     * @param {string} text - Text content
     * @returns {DOMBuilder} This builder for chaining
     */
    text(text) {
        this.element.textContent = text;
        return this;
    }
    
    /**
     * Set HTML content
     * @param {string} html - HTML content
     * @returns {DOMBuilder} This builder for chaining
     */
    html(html) {
        this.element.innerHTML = html;
        return this;
    }
    
    /**
     * Append a child element
     * @param {HTMLElement|DOMBuilder|string} child - Child element, builder, or text
     * @returns {DOMBuilder} This builder for chaining
     */
    child(child) {
        if (child instanceof DOMBuilder) {
            this.element.appendChild(child.build());
        } else if (child instanceof HTMLElement || child instanceof Text) {
            this.element.appendChild(child);
        } else if (typeof child === 'string') {
            this.element.appendChild(document.createTextNode(child));
        }
        return this;
    }
    
    /**
     * Append multiple children
     * @param {Array<HTMLElement|DOMBuilder|string>} children - Array of children
     * @returns {DOMBuilder} This builder for chaining
     */
    children(children) {
        children.forEach(child => this.child(child));
        return this;
    }
    
    /**
     * Add event listener
     * @param {string} event - Event type
     * @param {Function} handler - Event handler
     * @param {Object} options - Event options
     * @returns {DOMBuilder} This builder for chaining
     */
    on(event, handler, options = {}) {
        this.element.addEventListener(event, handler, options);
        return this;
    }
    
    /**
     * Set data attribute
     * @param {string} key - Data attribute key (without 'data-' prefix)
     * @param {string} value - Data attribute value
     * @returns {DOMBuilder} This builder for chaining
     */
    data(key, value) {
        this.element.dataset[key] = value;
        return this;
    }
    
    /**
     * Set multiple data attributes
     * @param {Object} data - Object of data attribute key-value pairs
     * @returns {DOMBuilder} This builder for chaining
     */
    dataset(data) {
        Object.assign(this.element.dataset, data);
        return this;
    }
    
    /**
     * Set property
     * @param {string} key - Property name
     * @param {*} value - Property value
     * @returns {DOMBuilder} This builder for chaining
     */
    prop(key, value) {
        this.element[key] = value;
        return this;
    }
    
    /**
     * Build and return the element
     * @returns {HTMLElement} The constructed element
     */
    build() {
        return this.element;
    }
    
    /**
     * Static helper to create a builder
     * @param {string} tag - HTML tag name
     * @returns {DOMBuilder} New builder instance
     */
    static create(tag) {
        return new DOMBuilder(tag);
    }
}


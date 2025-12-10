// DOM Utilities - DOM manipulation helpers
export const DOMUtils = {
    /**
     * Create an element with attributes and optional children
     * @param {string} tag - HTML tag name
     * @param {Object} attrs - Attributes object (class, id, style, etc.)
     * @param {Array|string} children - Child elements or text content
     * @returns {HTMLElement}
     */
    createElement(tag, attrs = {}, children = []) {
        const el = document.createElement(tag);
        
        // Set attributes
        for (const [key, value] of Object.entries(attrs)) {
            if (key === 'textContent' || key === 'innerHTML') {
                el[key] = value;
            } else if (key === 'style' && typeof value === 'object') {
                Object.assign(el.style, value);
            } else if (key === 'dataset') {
                Object.assign(el.dataset, value);
            } else {
                el.setAttribute(key, value);
            }
        }
        
        // Add children
        if (typeof children === 'string') {
            el.textContent = children;
        } else if (Array.isArray(children)) {
            children.forEach(child => {
                if (typeof child === 'string') {
                    el.appendChild(document.createTextNode(child));
                } else if (child instanceof Node) {
                    el.appendChild(child);
                }
            });
        }
        
        return el;
    },
    
    /**
     * Query selector with optional context
     * @param {string} selector - CSS selector
     * @param {HTMLElement} context - Context element (default: document)
     * @returns {HTMLElement|null}
     */
    query(selector, context = document) {
        return context.querySelector(selector);
    },
    
    /**
     * Query all elements matching selector
     * @param {string} selector - CSS selector
     * @param {HTMLElement} context - Context element (default: document)
     * @returns {NodeList}
     */
    queryAll(selector, context = document) {
        return context.querySelectorAll(selector);
    },
    
    /**
     * Add event listener with delegation support
     * @param {HTMLElement} element - Target element
     * @param {string} event - Event type
     * @param {Function} handler - Event handler
     * @param {Object} options - Event options (delegate selector, etc.)
     */
    on(element, event, handler, options = {}) {
        if (options.delegate) {
            element.addEventListener(event, (e) => {
                const target = e.target.closest(options.delegate);
                if (target && element.contains(target)) {
                    handler.call(target, e);
                }
            });
        } else {
            element.addEventListener(event, handler);
        }
    },
    
    /**
     * Remove event listener
     * @param {HTMLElement} element - Target element
     * @param {string} event - Event type
     * @param {Function} handler - Event handler
     */
    off(element, event, handler) {
        element.removeEventListener(event, handler);
    },
    
    /**
     * Toggle class on element
     * @param {HTMLElement} element - Target element
     * @param {string} className - Class name
     * @param {boolean} force - Force add/remove
     */
    toggleClass(element, className, force) {
        element.classList.toggle(className, force);
    },
    
    /**
     * Add class to element
     * @param {HTMLElement} element - Target element
     * @param {string} className - Class name
     */
    addClass(element, className) {
        element.classList.add(className);
    },
    
    /**
     * Remove class from element
     * @param {HTMLElement} element - Target element
     * @param {string} className - Class name
     */
    removeClass(element, className) {
        element.classList.remove(className);
    },
    
    /**
     * Check if element has class
     * @param {HTMLElement} element - Target element
     * @param {string} className - Class name
     * @returns {boolean}
     */
    hasClass(element, className) {
        return element.classList.contains(className);
    },
    
    /**
     * Smooth scroll to element
     * @param {HTMLElement} element - Target element
     * @param {Object} options - Scroll options
     */
    scrollTo(element, options = {}) {
        element.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
            ...options
        });
    },
    
    /**
     * Fade in animation
     * @param {HTMLElement} element - Target element
     * @param {number} duration - Animation duration in ms
     */
    fadeIn(element, duration = 300) {
        element.style.opacity = '0';
        element.style.display = '';
        element.style.transition = `opacity ${duration}ms`;
        requestAnimationFrame(() => {
            element.style.opacity = '1';
        });
    },
    
    /**
     * Fade out animation
     * @param {HTMLElement} element - Target element
     * @param {number} duration - Animation duration in ms
     * @returns {Promise}
     */
    fadeOut(element, duration = 300) {
        return new Promise((resolve) => {
            element.style.transition = `opacity ${duration}ms`;
            element.style.opacity = '0';
            setTimeout(() => {
                element.style.display = 'none';
                resolve();
            }, duration);
        });
    },
    
    /**
     * Remove element from DOM
     * @param {HTMLElement} element - Element to remove
     */
    remove(element) {
        if (element && element.parentNode) {
            element.parentNode.removeChild(element);
        }
    },
    
    /**
     * Clear element content
     * @param {HTMLElement} element - Element to clear
     */
    clear(element) {
        element.innerHTML = '';
    }
};


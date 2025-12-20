// Version: 1766175000 - ULTIMATE FIX: One-at-a-time classList.add()
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
        // DEFENSIVE: Skip if empty, undefined, null, or whitespace-only
        // This is a safety check - should never receive empty strings, but handle it gracefully
        
        // LOGGING: Log the exact value received for debugging
        console.log('[DOMBuilder.class] Entry - className:', className, 'type:', typeof className, 'length:', className?.length, 'isFalsy:', !className, 'isNull:', className == null, 'isEmptyString:', className === '');
        
        // CRITICAL: Early return for all falsy values (null, undefined, false, 0, '', NaN)
        // Empty string is falsy, so this should catch it
        if (!className) {
            console.log('[DOMBuilder.class] Early return - falsy value (includes empty string)');
            return this;
        }
        
        // ADDITIONAL CHECK: Explicitly check for empty string (in case it's not caught above)
        if (className === '' || (typeof className === 'string' && className.trim() === '')) {
            console.warn('[DOMBuilder.class] Early return - explicit empty string check');
            return this;
        }
        
        // Additional check: if it's a string, check if it's empty or whitespace-only
        if (typeof className === 'string') {
            // Check for empty string
            if (className === '') {
                console.warn('[DOMBuilder.class] Empty string detected - returning early');
                return this;
            }
            
            const trimmed = className.trim();
            // Only add if trimmed string has content
            if (!trimmed || trimmed.length === 0) {
                console.warn('[DOMBuilder.class] Whitespace-only string detected - returning early');
                return this;
            }
            
            console.log('[DOMBuilder.class] Processing string - trimmed:', trimmed, 'length:', trimmed.length);
            
            // Split by spaces in case multiple classes are passed
            const classes = trimmed.split(/\s+/).filter(c => {
                // Filter out empty strings and whitespace-only strings
                if (!c || typeof c !== 'string') return false;
                const trimmedC = c.trim();
                return trimmedC.length > 0;
            }).map(c => c.trim());
            
            // Final safety check: ensure no empty strings in the array
            const validClasses = classes.filter(c => {
                // Triple-check: must be string, not empty, and have length > 0
                return c && 
                       typeof c === 'string' && 
                       c !== '' && 
                       c.trim().length > 0;
            }).map(c => c.trim()).filter(c => c.length > 0);
            
            if (validClasses.length > 0) {
                // Final validation before calling classList.add
                const safeClasses = validClasses.filter(c => {
                    if (!c || typeof c !== 'string' || c === '' || c.trim() === '') {
                        console.warn('[DOMBuilder] Filtering out invalid class:', c);
                        return false;
                    }
                    return true;
                });
                
                if (safeClasses.length > 0) {
                    // FINAL SAFETY: Filter out any empty strings one more time
                    const finalSafeClasses = safeClasses.filter(c => {
                        const isValid = c && 
                                       typeof c === 'string' && 
                                       c !== '' && 
                                       c.trim() !== '' &&
                                       c.trim().length > 0;
                        if (!isValid) {
                            console.warn('[DOMBuilder.class] Final filter removing invalid class:', c);
                        }
                        return isValid;
                    }).map(c => c.trim());
                    
                    if (finalSafeClasses.length > 0) {
                        console.log('[DOMBuilder.class] Attempting to add classes:', finalSafeClasses);
                        // CRITICAL: Add classes one at a time instead of using spread operator
                        // This prevents empty strings from causing errors
                        finalSafeClasses.forEach(c => {
                            const trimmed = String(c).trim();
                            // ULTIMATE SAFETY: Triple-check before calling classList.add
                            if (trimmed && 
                                typeof trimmed === 'string' && 
                                trimmed !== '' && 
                                trimmed.length > 0 &&
                                trimmed.trim().length > 0) {
                                try {
                                    // LAST RESORT: Check one more time right before calling
                                    const finalCheck = trimmed.trim();
                                    if (finalCheck && finalCheck.length > 0) {
                                        this.element.classList.add(finalCheck);
                                        console.log('[DOMBuilder.class] Successfully added class:', finalCheck);
                                    } else {
                                        console.error('[DOMBuilder.class] CRITICAL: finalCheck failed for:', trimmed);
                                    }
                                } catch (err) {
                                    console.error('[DOMBuilder.class] Failed to add class:', trimmed, 'error:', err, 'stack:', err.stack);
                                    // Don't throw - just log and continue
                                }
                            } else {
                                console.warn('[DOMBuilder.class] Skipping empty/invalid class:', c, 'trimmed:', trimmed);
                            }
                        });
                        console.log('[DOMBuilder.class] Finished adding classes');
                    } else {
                        console.warn('[DOMBuilder.class] No valid classes after final filtering');
                    }
                }
            }
            return this;
        }
        
        // Handle array case
        if (Array.isArray(className)) {
            // Filter out empty strings and whitespace-only strings
            const validClasses = className
                .filter(c => c != null && typeof c === 'string' && c.trim().length > 0)
                .map(c => c.trim())
                .filter(c => c.length > 0);
            if (validClasses.length > 0) {
                // Add classes one at a time to prevent empty string errors
                validClasses.forEach(c => {
                    const trimmed = String(c).trim();
                    // ULTIMATE SAFETY: Triple-check before calling classList.add
                    if (trimmed && 
                        typeof trimmed === 'string' && 
                        trimmed !== '' && 
                        trimmed.length > 0 &&
                        trimmed.trim().length > 0) {
                        try {
                            // LAST RESORT: Check one more time right before calling
                            const finalCheck = trimmed.trim();
                            if (finalCheck && finalCheck.length > 0) {
                                this.element.classList.add(finalCheck);
                                console.log('[DOMBuilder.class] Successfully added class from array:', finalCheck);
                            } else {
                                console.error('[DOMBuilder.class] CRITICAL: finalCheck failed for array item:', trimmed);
                            }
                        } catch (err) {
                            console.error('[DOMBuilder.class] Failed to add class from array:', trimmed, 'error:', err, 'stack:', err.stack);
                            // Don't throw - just log and continue
                        }
                    } else {
                        console.warn('[DOMBuilder.class] Skipping empty/invalid class from array:', c, 'trimmed:', trimmed);
                    }
                });
            }
            return this;
        }
        
        // If we get here, className is an unexpected type - just return silently
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

// Force reload - 1766172537
// CRITICAL FIX 1766174868

// EventHelper.js - Centralized event handling utilities
// Provides common event patterns to reduce code duplication

export class EventHelper {
    /**
     * Setup double-click detection on an element
     * @param {HTMLElement} element - Target element
     * @param {Function} handler - Handler function to call on double-click
     * @param {number} delay - Maximum time between clicks in ms (default: 300)
     * @param {Object} options - Additional options
     * @param {Function} options.filter - Optional filter function to determine if click should be processed
     * @param {Function} options.singleClickHandler - Optional handler for single clicks
     * @returns {Function} Cleanup function to remove event listener
     */
    static setupDoubleClick(element, handler, delay = 300, options = {}) {
        let lastClickTime = 0;
        const { filter, singleClickHandler } = options;
        
        const clickHandler = (e) => {
            // Apply filter if provided
            if (filter && !filter(e)) {
                return;
            }
            
            // Don't trigger on interactive elements (checkboxes, buttons, inputs)
            if (e.target.closest('input') || e.target.closest('button') || e.target.closest('textarea')) {
                return;
            }
            
            const now = Date.now();
            const timeSinceLastClick = now - lastClickTime;
            
            if (timeSinceLastClick < delay && timeSinceLastClick > 0) {
                // Double click detected
                e.preventDefault();
                e.stopPropagation();
                lastClickTime = 0; // Reset to prevent triple-click
                handler(e);
            } else {
                // Single click - wait to see if another click comes
                lastClickTime = now;
                if (singleClickHandler) {
                    // Delay single click handler to allow for potential double-click
                    setTimeout(() => {
                        if (lastClickTime === now) {
                            singleClickHandler(e);
                        }
                    }, delay);
                }
            }
        };
        
        element.addEventListener('click', clickHandler);
        
        // Return cleanup function
        return () => {
            element.removeEventListener('click', clickHandler);
        };
    }
    
    /**
     * Setup click-outside detection
     * @param {HTMLElement} element - Target element
     * @param {Function} handler - Handler function to call when clicking outside
     * @param {HTMLElement} container - Optional container to limit scope (default: document)
     * @returns {Function} Cleanup function to remove event listener
     */
    static setupClickOutside(element, handler, container = document) {
        const clickHandler = (e) => {
            if (!element.contains(e.target)) {
                handler(e);
            }
        };
        
        container.addEventListener('click', clickHandler, true);
        
        // Return cleanup function
        return () => {
            container.removeEventListener('click', clickHandler, true);
        };
    }
    
    /**
     * Setup keyboard shortcuts
     * @param {HTMLElement} element - Target element (usually document or a container)
     * @param {Object} shortcuts - Object mapping key combinations to handlers
     *   Format: { 'ctrl+s': handler, 'escape': handler, etc. }
     * @param {Object} options - Additional options
     * @param {boolean} options.preventDefault - Whether to prevent default behavior (default: true)
     * @returns {Function} Cleanup function to remove event listener
     */
    static setupKeyboardShortcuts(element, shortcuts, options = {}) {
        const { preventDefault = true } = options;
        
        const keyHandler = (e) => {
            const key = e.key.toLowerCase();
            const ctrl = e.ctrlKey || e.metaKey;
            const shift = e.shiftKey;
            const alt = e.altKey;
            
            // Build key string
            let keyString = '';
            if (ctrl) keyString += 'ctrl+';
            if (shift) keyString += 'shift+';
            if (alt) keyString += 'alt+';
            keyString += key;
            
            // Check for exact match
            if (shortcuts[keyString]) {
                if (preventDefault) {
                    e.preventDefault();
                    e.stopPropagation();
                }
                shortcuts[keyString](e);
                return;
            }
            
            // Check for key-only match (if no modifiers)
            if (!ctrl && !shift && !alt && shortcuts[key]) {
                if (preventDefault) {
                    e.preventDefault();
                    e.stopPropagation();
                }
                shortcuts[key](e);
            }
        };
        
        element.addEventListener('keydown', keyHandler);
        
        // Return cleanup function
        return () => {
            element.removeEventListener('keydown', keyHandler);
        };
    }
    
    /**
     * Debounce a function
     * @param {Function} func - Function to debounce
     * @param {number} delay - Delay in milliseconds
     * @param {boolean} immediate - Whether to call immediately on first invocation
     * @returns {Function} Debounced function
     */
    static debounce(func, delay, immediate = false) {
        let timeout;
        return function(...args) {
            const context = this;
            const callNow = immediate && !timeout;
            
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                timeout = null;
                if (!immediate) {
                    func.apply(context, args);
                }
            }, delay);
            
            if (callNow) {
                func.apply(context, args);
            }
        };
    }
    
    /**
     * Throttle a function
     * @param {Function} func - Function to throttle
     * @param {number} limit - Time limit in milliseconds
     * @returns {Function} Throttled function
     */
    static throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => {
                    inThrottle = false;
                }, limit);
            }
        };
    }
    
    /**
     * Setup drag and drop handlers
     * @param {HTMLElement} element - Draggable element
     * @param {Object} config - Configuration object
     * @param {Function} config.onDragStart - Handler for dragstart event
     * @param {Function} config.onDragEnd - Handler for dragend event
     * @param {Function} config.onDragOver - Handler for dragover event
     * @param {Function} config.onDrop - Handler for drop event
     * @param {Function} config.onDragLeave - Handler for dragleave event
     * @param {boolean} config.draggable - Whether element is draggable (default: true)
     * @returns {Function} Cleanup function to remove all event listeners
     */
    static setupDragAndDrop(element, config) {
        const {
            onDragStart,
            onDragEnd,
            onDragOver,
            onDrop,
            onDragLeave,
            draggable = true
        } = config;
        
        element.draggable = draggable;
        
        const handlers = [];
        
        if (onDragStart) {
            const handler = (e) => onDragStart(e);
            element.addEventListener('dragstart', handler);
            handlers.push({ event: 'dragstart', handler });
        }
        
        if (onDragEnd) {
            const handler = (e) => onDragEnd(e);
            element.addEventListener('dragend', handler);
            handlers.push({ event: 'dragend', handler });
        }
        
        if (onDragOver) {
            const handler = (e) => {
                e.preventDefault();
                e.stopPropagation();
                onDragOver(e);
            };
            element.addEventListener('dragover', handler);
            handlers.push({ event: 'dragover', handler });
        }
        
        if (onDrop) {
            const handler = (e) => {
                e.preventDefault();
                e.stopPropagation();
                onDrop(e);
            };
            element.addEventListener('drop', handler);
            handlers.push({ event: 'drop', handler });
        }
        
        if (onDragLeave) {
            const handler = (e) => onDragLeave(e);
            element.addEventListener('dragleave', handler);
            handlers.push({ event: 'dragleave', handler });
        }
        
        // Return cleanup function
        return () => {
            handlers.forEach(({ event, handler }) => {
                element.removeEventListener(event, handler);
            });
            element.draggable = false;
        };
    }
}


// EventRouter.js - Centralized event routing and delegation utilities
export class EventRouter {
    /**
     * Register event listener with optional delegation
     * @param {HTMLElement|Document|Window} target - Target element
     * @param {string} eventType - Event type
     * @param {Function} handler - Event handler
     * @param {Object} options - Options (useCapture, passive, etc.)
     */
    static on(target, eventType, handler, options = {}) {
        if (!target) {
            console.warn('[EventRouter] Target is null/undefined, skipping event registration');
            return;
        }
        target.addEventListener(eventType, handler, options);
    }
    
    /**
     * Remove event listener
     * @param {HTMLElement|Document|Window} target - Target element
     * @param {string} eventType - Event type
     * @param {Function} handler - Event handler
     * @param {Object} options - Options (useCapture, etc.)
     */
    static off(target, eventType, handler, options = {}) {
        if (!target) return;
        target.removeEventListener(eventType, handler, options);
    }
    
    /**
     * Event delegation - delegate events from parent to matching children
     * @param {HTMLElement} parent - Parent element
     * @param {string} eventType - Event type
     * @param {string} selector - CSS selector for child elements
     * @param {Function} handler - Event handler
     * @param {Object} options - Options
     */
    static delegate(parent, eventType, selector, handler, options = {}) {
        if (!parent) return;
        
        parent.addEventListener(eventType, (e) => {
            const target = e.target.closest(selector);
            if (target) {
                handler.call(target, e);
            }
        }, options);
    }
    
    /**
     * One-time event listener
     * @param {HTMLElement|Document|Window} target - Target element
     * @param {string} eventType - Event type
     * @param {Function} handler - Event handler
     * @param {Object} options - Options
     */
    static once(target, eventType, handler, options = {}) {
        if (!target) return;
        
        const onceHandler = (e) => {
            handler(e);
            EventRouter.off(target, eventType, onceHandler, options);
        };
        
        EventRouter.on(target, eventType, onceHandler, options);
    }
    
    /**
     * Register multiple event listeners at once
     * @param {HTMLElement|Document|Window} target - Target element
     * @param {Object} events - Object mapping event types to handlers
     * @param {Object} options - Common options for all events
     */
    static onMany(target, events, options = {}) {
        if (!target) return;
        
        Object.entries(events).forEach(([eventType, handler]) => {
            EventRouter.on(target, eventType, handler, options);
        });
    }
}

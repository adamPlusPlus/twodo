// Event System Utilities - Event emitter and event bus
export class EventEmitter {
    constructor() {
        this.events = {};
    }
    
    /**
     * Subscribe to event
     * @param {string} event - Event name
     * @param {Function} handler - Event handler
     * @returns {Function} - Unsubscribe function
     */
    on(event, handler) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(handler);
        
        // Return unsubscribe function
        return () => this.off(event, handler);
    }
    
    /**
     * Subscribe to event once
     * @param {string} event - Event name
     * @param {Function} handler - Event handler
     * @returns {Function} - Unsubscribe function
     */
    once(event, handler) {
        const onceHandler = (...args) => {
            handler(...args);
            this.off(event, onceHandler);
        };
        return this.on(event, onceHandler);
    }
    
    /**
     * Unsubscribe from event
     * @param {string} event - Event name
     * @param {Function} handler - Event handler
     */
    off(event, handler) {
        if (!this.events[event]) return;
        this.events[event] = this.events[event].filter(h => h !== handler);
    }
    
    /**
     * Emit event
     * @param {string} event - Event name
     * @param {...*} args - Event arguments
     */
    emit(event, ...args) {
        if (!this.events[event]) return;
        this.events[event].forEach(handler => {
            try {
                handler(...args);
            } catch (error) {
                console.error(`Error in event handler for "${event}":`, error);
            }
        });
    }
    
    /**
     * Remove all listeners for event
     * @param {string} event - Event name
     */
    removeAllListeners(event) {
        if (event) {
            delete this.events[event];
        } else {
            this.events = {};
        }
    }
    
    /**
     * Get listener count for event
     * @param {string} event - Event name
     * @returns {number}
     */
    listenerCount(event) {
        return this.events[event] ? this.events[event].length : 0;
    }
}

// Global Event Bus
class EventBus extends EventEmitter {
    constructor() {
        super();
        this.eventHistory = [];
        this.maxHistorySize = 100;
    }
    
    /**
     * Emit event with history tracking
     * @param {string} event - Event name
     * @param {...*} args - Event arguments
     */
    emit(event, ...args) {
        // Add to history
        this.eventHistory.push({
            event,
            args,
            timestamp: Date.now()
        });
        
        // Limit history size
        if (this.eventHistory.length > this.maxHistorySize) {
            this.eventHistory.shift();
        }
        
        // Emit to listeners
        super.emit(event, ...args);
    }
    
    /**
     * Get event history
     * @param {string} event - Optional event name to filter
     * @param {number} limit - Limit number of results
     * @returns {Array}
     */
    getHistory(event = null, limit = null) {
        let history = this.eventHistory;
        
        if (event) {
            history = history.filter(item => item.event === event);
        }
        
        if (limit) {
            history = history.slice(-limit);
        }
        
        return history;
    }
    
    /**
     * Clear event history
     */
    clearHistory() {
        this.eventHistory = [];
    }
}

// Singleton instance
export const eventBus = new EventBus();

// Event delegation helper
export const EventDelegation = {
    /**
     * Delegate event to matching elements
     * @param {HTMLElement} container - Container element
     * @param {string} event - Event type
     * @param {string} selector - CSS selector
     * @param {Function} handler - Event handler
     * @returns {Function} - Cleanup function
     */
    delegate(container, event, selector, handler) {
        const wrappedHandler = (e) => {
            const target = e.target.closest(selector);
            if (target && container.contains(target)) {
                handler.call(target, e);
            }
        };
        
        container.addEventListener(event, wrappedHandler);
        
        return () => {
            container.removeEventListener(event, wrappedHandler);
        };
    }
};


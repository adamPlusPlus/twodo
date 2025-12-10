// EventBus - Global event bus for app-wide event communication
import { EventEmitter } from '../utils/events.js';

export class EventBus extends EventEmitter {
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


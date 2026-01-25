// EventCoalescer.js - Coalesce similar events to prevent event storms
// Merges multiple similar events into single events with latest data

import { eventStormConfig } from './EventStormConfig.js';

export class EventCoalescer {
    constructor() {
        // Map of event type -> pending events
        this.pendingEvents = new Map();
        // Map of event type -> timeout ID
        this.coalescingTimers = new Map();
    }
    
    /**
     * Coalesce an event - merge with pending events of same type
     * @param {string} eventType - Event type
     * @param {Array} args - Event arguments
     * @param {Function} callback - Callback to invoke with coalesced event
     * @returns {boolean} - True if event was coalesced, false if processed immediately
     */
    coalesce(eventType, args, callback) {
        const window = eventStormConfig.getCoalescingWindow(eventType);
        
        // If coalescing is disabled or window is 0, process immediately
        if (!eventStormConfig.isEnabled('coalescing') || window <= 0) {
            callback(eventType, args);
            return false;
        }
        
        // Get or create pending events list for this event type
        if (!this.pendingEvents.has(eventType)) {
            this.pendingEvents.set(eventType, []);
        }
        
        const pending = this.pendingEvents.get(eventType);
        
        // Add event to pending list
        pending.push({
            eventType,
            args,
            timestamp: Date.now()
        });
        
        // Clear existing timer
        if (this.coalescingTimers.has(eventType)) {
            clearTimeout(this.coalescingTimers.get(eventType));
        }
        
        // Set timer to process coalesced events
        const timer = setTimeout(() => {
            this._processCoalescedEvents(eventType, callback);
        }, window);
        
        this.coalescingTimers.set(eventType, timer);
        
        return true; // Event was coalesced
    }
    
    /**
     * Process coalesced events for an event type
     * @private
     */
    _processCoalescedEvents(eventType, callback) {
        const pending = this.pendingEvents.get(eventType);
        if (!pending || pending.length === 0) {
            return;
        }
        
        // Clear pending list
        this.pendingEvents.delete(eventType);
        this.coalescingTimers.delete(eventType);
        
        // Coalesce events based on type
        const coalesced = this._mergeEvents(eventType, pending);
        
        // Invoke callback with coalesced event
        callback(eventType, coalesced.args);
    }
    
    /**
     * Merge multiple events of the same type
     * @private
     */
    _mergeEvents(eventType, events) {
        if (events.length === 0) {
            return null;
        }
        
        if (events.length === 1) {
            return events[0];
        }
        
        // Different merge strategies based on event type
        switch (eventType) {
            case 'app:render-requested':
                // For render requests, just keep the latest (no args needed)
                return { eventType, args: [], timestamp: Date.now() };
                
            case 'data:save-requested':
                // For save requests, keep the latest skipSync flag
                const latestSave = events[events.length - 1];
                return { eventType, args: latestSave.args, timestamp: Date.now() };
                
            case 'element:updated':
                // For element updates, merge by element ID (keep latest update per element)
                return this._mergeElementUpdates(events);
                
            case 'element:created':
            case 'element:deleted':
                // For create/delete, batch them together
                return this._batchElementEvents(events);
                
            default:
                // Default: latest wins
                return events[events.length - 1];
        }
    }
    
    /**
     * Merge element update events - keep latest update per element
     * @private
     */
    _mergeElementUpdates(events) {
        // Group by element identifier (pageId, binId, elementIndex)
        const elementMap = new Map();
        
        for (const event of events) {
            const args = event.args[0] || {};
            const key = `${args.pageId || ''}_${args.binId || ''}_${args.elementIndex ?? ''}`;
            
            // Keep latest update for each element
            elementMap.set(key, event);
        }
        
        // Return the most recent event (it represents all updates)
        // In practice, we'll emit one event per unique element
        // For now, return the latest overall event
        return events[events.length - 1];
    }
    
    /**
     * Batch element create/delete events
     * @private
     */
    _batchElementEvents(events) {
        // Return array of all events (will be processed as batch)
        return {
            eventType: events[0].eventType,
            args: events.map(e => e.args),
            timestamp: Date.now(),
            isBatch: true
        };
    }
    
    /**
     * Flush all pending events immediately
     * @param {Function} callback - Callback to invoke for each flushed event
     */
    flush(callback) {
        // Process all pending events
        for (const [eventType, pending] of this.pendingEvents.entries()) {
            if (pending.length > 0) {
                this._processCoalescedEvents(eventType, callback);
            }
        }
        
        // Clear all timers
        for (const timer of this.coalescingTimers.values()) {
            clearTimeout(timer);
        }
        
        this.pendingEvents.clear();
        this.coalescingTimers.clear();
    }
    
    /**
     * Clear pending events for a specific event type
     * @param {string} eventType - Event type to clear
     */
    clear(eventType) {
        if (this.coalescingTimers.has(eventType)) {
            clearTimeout(this.coalescingTimers.get(eventType));
            this.coalescingTimers.delete(eventType);
        }
        this.pendingEvents.delete(eventType);
    }
    
    /**
     * Clear all pending events
     */
    clearAll() {
        for (const timer of this.coalescingTimers.values()) {
            clearTimeout(timer);
        }
        this.coalescingTimers.clear();
        this.pendingEvents.clear();
    }
    
    /**
     * Get pending event count for an event type
     * @param {string} eventType - Event type
     * @returns {number} - Number of pending events
     */
    getPendingCount(eventType) {
        const pending = this.pendingEvents.get(eventType);
        return pending ? pending.length : 0;
    }
    
    /**
     * Get total pending event count
     * @returns {number} - Total number of pending events
     */
    getTotalPendingCount() {
        let total = 0;
        for (const pending of this.pendingEvents.values()) {
            total += pending.length;
        }
        return total;
    }
}

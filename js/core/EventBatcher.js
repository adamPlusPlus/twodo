// EventBatcher.js - Batch events for efficient processing
// Collects multiple events and processes them together

import { eventStormConfig } from './EventStormConfig.js';

export class EventBatcher {
    constructor() {
        // Map of event type -> batched events
        this.batches = new Map();
        // Map of event type -> batch timer
        this.batchTimers = new Map();
    }
    
    /**
     * Add event to batch
     * @param {string} eventType - Event type
     * @param {Array} args - Event arguments
     * @param {Function} callback - Callback to invoke with batched events
     * @returns {boolean} - True if event was batched, false if processed immediately
     */
    batch(eventType, args, callback) {
        // Check if batching is enabled for this event type
        if (!eventStormConfig.isEnabled('batching') || !eventStormConfig.shouldBatch(eventType)) {
            callback(eventType, [args]);
            return false;
        }
        
        const batchWindow = eventStormConfig.getBatchWindow(eventType);
        
        // Get or create batch for this event type
        if (!this.batches.has(eventType)) {
            this.batches.set(eventType, []);
        }
        
        const batch = this.batches.get(eventType);
        
        // Add event to batch
        batch.push({
            args,
            timestamp: Date.now()
        });
        
        // Clear existing timer
        if (this.batchTimers.has(eventType)) {
            clearTimeout(this.batchTimers.get(eventType));
        }
        
        // Set timer to process batch
        const timer = setTimeout(() => {
            this._processBatch(eventType, callback);
        }, batchWindow);
        
        this.batchTimers.set(eventType, timer);
        
        return true; // Event was batched
    }
    
    /**
     * Process batched events for an event type
     * @private
     */
    _processBatch(eventType, callback) {
        const batch = this.batches.get(eventType);
        if (!batch || batch.length === 0) {
            return;
        }
        
        // Get all batched events
        const batchedEvents = [...batch];
        
        // Clear batch
        this.batches.delete(eventType);
        this.batchTimers.delete(eventType);
        
        // Process based on event type
        const processedBatch = this._prepareBatch(eventType, batchedEvents);
        
        // Invoke callback with batched events
        callback(eventType, processedBatch);
    }
    
    /**
     * Prepare batch for processing based on event type
     * @private
     */
    _prepareBatch(eventType, events) {
        if (events.length === 0) {
            return [];
        }
        
        switch (eventType) {
            case 'app:render-requested':
                // For render requests, just need one (no args)
                return []; // Empty args array - just trigger one render
                
            case 'data:save-requested':
                // For save requests, use latest skipSync flag
                const latestSave = events[events.length - 1];
                return [latestSave.args];
                
            case 'element:updated':
            case 'element:created':
            case 'element:deleted':
                // For element events, return array of all events
                return events.map(e => e.args);
                
            default:
                // Default: return all event args
                return events.map(e => e.args);
        }
    }
    
    /**
     * Flush all batched events immediately
     * @param {Function} callback - Callback to invoke for each batch
     */
    flush(callback) {
        // Process all batches
        for (const [eventType, batch] of this.batches.entries()) {
            if (batch.length > 0) {
                this._processBatch(eventType, callback);
            }
        }
        
        // Clear all timers
        for (const timer of this.batchTimers.values()) {
            clearTimeout(timer);
        }
        
        this.batches.clear();
        this.batchTimers.clear();
    }
    
    /**
     * Clear batch for a specific event type
     * @param {string} eventType - Event type to clear
     */
    clear(eventType) {
        if (this.batchTimers.has(eventType)) {
            clearTimeout(this.batchTimers.get(eventType));
            this.batchTimers.delete(eventType);
        }
        this.batches.delete(eventType);
    }
    
    /**
     * Clear all batches
     */
    clearAll() {
        for (const timer of this.batchTimers.values()) {
            clearTimeout(timer);
        }
        this.batchTimers.clear();
        this.batches.clear();
    }
    
    /**
     * Get batched event count for an event type
     * @param {string} eventType - Event type
     * @returns {number} - Number of batched events
     */
    getBatchCount(eventType) {
        const batch = this.batches.get(eventType);
        return batch ? batch.length : 0;
    }
    
    /**
     * Get total batched event count
     * @returns {number} - Total number of batched events
     */
    getTotalBatchCount() {
        let total = 0;
        for (const batch of this.batches.values()) {
            total += batch.length;
        }
        return total;
    }
}

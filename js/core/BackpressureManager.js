// BackpressureManager.js - Monitor listener performance and apply backpressure
// Detects slow listeners and throttles event emission to prevent queue overflow

import { eventStormConfig } from './EventStormConfig.js';

export class BackpressureManager {
    constructor() {
        this.config = eventStormConfig.getBackpressureConfig();
        
        // Map of listener -> performance metrics
        this.listenerMetrics = new Map();
        
        // Event queue for backpressure
        this.eventQueue = [];
        
        // Processing state
        this.isProcessing = false;
        this.backpressureActive = false;
        
        // Performance tracking
        this.slowListenerCount = 0;
        this.totalEventsProcessed = 0;
        this.totalProcessingTime = 0;
    }
    
    /**
     * Check if backpressure should be applied
     * @returns {boolean} - True if backpressure is active
     */
    shouldApplyBackpressure() {
        if (!eventStormConfig.isEnabled('backpressure')) {
            return false;
        }
        
        // Check queue size
        if (this.eventQueue.length >= this.config.queueSizeLimit) {
            if (!this.backpressureActive) {
                console.warn('[BackpressureManager] Queue limit reached, activating backpressure');
            }
            this.backpressureActive = true;
            return true;
        }
        
        // Check if queue is at resume threshold
        const resumeThreshold = Math.floor(this.config.queueSizeLimit * this.config.resumeThreshold);
        if (this.eventQueue.length <= resumeThreshold && this.backpressureActive) {
            console.log('[BackpressureManager] Queue below resume threshold, deactivating backpressure');
            this.backpressureActive = false;
        }
        
        // Check for slow listeners
        if (this._hasSlowListeners()) {
            if (!this.backpressureActive) {
                console.warn('[BackpressureManager] Slow listeners detected, activating backpressure');
            }
            this.backpressureActive = true;
            return true;
        }
        
        return this.backpressureActive;
    }
    
    /**
     * Check if there are slow listeners
     * @private
     */
    _hasSlowListeners() {
        const threshold = this.config.slowListenerThreshold;
        
        for (const metrics of this.listenerMetrics.values()) {
            if (metrics.avgExecutionTime > threshold) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Record listener execution time
     * @param {Function} listener - Listener function
     * @param {number} executionTime - Execution time in milliseconds
     */
    recordExecutionTime(listener, executionTime) {
        if (!this.listenerMetrics.has(listener)) {
            this.listenerMetrics.set(listener, {
                executionCount: 0,
                totalExecutionTime: 0,
                avgExecutionTime: 0,
                maxExecutionTime: 0
            });
        }
        
        const metrics = this.listenerMetrics.get(listener);
        metrics.executionCount++;
        metrics.totalExecutionTime += executionTime;
        metrics.avgExecutionTime = metrics.totalExecutionTime / metrics.executionCount;
        metrics.maxExecutionTime = Math.max(metrics.maxExecutionTime, executionTime);
        
        // Update global stats
        this.totalEventsProcessed++;
        this.totalProcessingTime += executionTime;
        
        // Track slow listeners
        if (executionTime > this.config.slowListenerThreshold) {
            this.slowListenerCount++;
        }
    }
    
    /**
     * Queue an event for processing when backpressure is active
     * @param {string} eventType - Event type
     * @param {Array} args - Event arguments
     * @param {number} priority - Event priority
     * @returns {boolean} - True if event was queued
     */
    queueEvent(eventType, args, priority) {
        if (!this.shouldApplyBackpressure()) {
            return false;
        }
        
        // Check queue size limit
        if (this.eventQueue.length >= this.config.queueSizeLimit) {
            if (this.config.dropOldestOnOverflow) {
                // Drop oldest event
                const dropped = this.eventQueue.shift();
                console.warn(`[BackpressureManager] Queue full, dropping oldest event: ${dropped.eventType}`);
            } else {
                // Drop newest event
                console.warn(`[BackpressureManager] Queue full, dropping event: ${eventType}`);
                return false;
            }
        }
        
        // Add to queue with priority
        const event = {
            eventType,
            args,
            priority,
            timestamp: Date.now()
        };
        
        // Insert in priority order (higher priority first)
        const insertIndex = this.eventQueue.findIndex(e => e.priority < priority);
        if (insertIndex === -1) {
            this.eventQueue.push(event);
        } else {
            this.eventQueue.splice(insertIndex, 0, event);
        }
        
        // Clean old events
        this._cleanOldEvents();
        
        return true;
    }
    
    /**
     * Process queued events
     * @param {Function} processCallback - Callback to process each event
     * @param {number} maxEvents - Maximum events to process in this batch
     */
    async processQueue(processCallback, maxEvents = 10) {
        if (this.isProcessing || this.eventQueue.length === 0) {
            return;
        }
        
        this.isProcessing = true;
        
        try {
            let processed = 0;
            
            while (this.eventQueue.length > 0 && processed < maxEvents) {
                const event = this.eventQueue.shift();
                
                // Check if event is too old
                const age = Date.now() - event.timestamp;
                if (age > this.config.maxQueueAge) {
                    console.warn(`[BackpressureManager] Dropping old event: ${event.eventType} (age: ${age}ms)`);
                    continue;
                }
                
                try {
                    await processCallback(event.eventType, event.args);
                    processed++;
                } catch (error) {
                    console.error(`[BackpressureManager] Error processing queued event:`, error);
                }
            }
            
            // Check if we should resume normal processing
            if (this.eventQueue.length <= Math.floor(this.config.queueSizeLimit * this.config.resumeThreshold)) {
                this.backpressureActive = false;
            }
        } finally {
            this.isProcessing = false;
        }
    }
    
    /**
     * Clean old events from queue
     * @private
     */
    _cleanOldEvents() {
        const maxAge = this.config.maxQueueAge;
        const now = Date.now();
        
        let removed = 0;
        while (this.eventQueue.length > 0) {
            const event = this.eventQueue[0];
            if (now - event.timestamp > maxAge) {
                this.eventQueue.shift();
                removed++;
            } else {
                break;
            }
        }
        
        if (removed > 0) {
            console.warn(`[BackpressureManager] Removed ${removed} old events from queue`);
        }
    }
    
    /**
     * Flush all queued events immediately
     * @param {Function} processCallback - Callback to process each event
     */
    async flush(processCallback) {
        while (this.eventQueue.length > 0) {
            const event = this.eventQueue.shift();
            try {
                await processCallback(event.eventType, event.args);
            } catch (error) {
                console.error(`[BackpressureManager] Error flushing event:`, error);
            }
        }
        
        this.backpressureActive = false;
    }
    
    /**
     * Clear all queued events
     */
    clearQueue() {
        this.eventQueue = [];
        this.backpressureActive = false;
    }
    
    /**
     * Get queue size
     * @returns {number} - Number of queued events
     */
    getQueueSize() {
        return this.eventQueue.length;
    }
    
    /**
     * Get slow listener count
     * @returns {number} - Number of slow listener detections
     */
    getSlowListenerCount() {
        return this.slowListenerCount;
    }
    
    /**
     * Get average processing time
     * @returns {number} - Average processing time in milliseconds
     */
    getAverageProcessingTime() {
        if (this.totalEventsProcessed === 0) {
            return 0;
        }
        return this.totalProcessingTime / this.totalEventsProcessed;
    }
    
    /**
     * Get listener metrics
     * @returns {Map} - Map of listener -> metrics
     */
    getListenerMetrics() {
        return new Map(this.listenerMetrics);
    }
    
    /**
     * Clear listener metrics
     */
    clearMetrics() {
        this.listenerMetrics.clear();
        this.slowListenerCount = 0;
        this.totalEventsProcessed = 0;
        this.totalProcessingTime = 0;
    }
    
    /**
     * Get statistics
     * @returns {Object} - Statistics object
     */
    getStats() {
        return {
            queueSize: this.eventQueue.length,
            backpressureActive: this.backpressureActive,
            slowListenerCount: this.slowListenerCount,
            totalEventsProcessed: this.totalEventsProcessed,
            averageProcessingTime: this.getAverageProcessingTime(),
            listenerCount: this.listenerMetrics.size
        };
    }
}

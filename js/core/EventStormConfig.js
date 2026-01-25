// EventStormConfig.js - Configuration for event storm control
// Centralized configuration for rate limits, coalescing windows, batching, and backpressure

export class EventStormConfig {
    constructor() {
        // Default configuration
        this.config = {
            // Rate limits per event type (events per second)
            rateLimits: {
                'app:render-requested': 60,      // 60 per second (60fps)
                'data:save-requested': 10,        // 10 per second
                'element:updated': 100,            // 100 per second
                'element:created': 50,            // 50 per second
                'element:deleted': 50,            // 50 per second
                'default': 1000                    // Default for unconfigured events
            },
            
            // Coalescing windows (milliseconds) - merge similar events within this window
            coalescing: {
                'app:render-requested': 16,       // 16ms window (60fps)
                'data:save-requested': 500,       // 500ms window
                'element:updated': 50,            // 50ms window
                'element:created': 100,           // 100ms window
                'element:deleted': 100,           // 100ms window
                'default': 100                    // Default coalescing window
            },
            
            // Batching configuration - which events should be batched
            batching: {
                'app:render-requested': true,
                'data:save-requested': true,
                'element:updated': true,
                'element:created': true,
                'element:deleted': true,
                'default': false                  // Default: no batching
            },
            
            // Batch window sizes (milliseconds) - how long to collect events before processing
            batchWindows: {
                'app:render-requested': 16,       // 16ms (60fps)
                'data:save-requested': 500,       // 500ms
                'element:updated': 50,            // 50ms
                'element:created': 100,           // 100ms
                'element:deleted': 100,           // 100ms
                'default': 100                    // Default batch window
            },
            
            // Backpressure configuration
            backpressure: {
                slowListenerThreshold: 100,       // 100ms execution time triggers backpressure
                queueSizeLimit: 1000,             // Max queued events before dropping
                resumeThreshold: 0.8,             // Resume at 80% queue capacity
                maxQueueAge: 5000,                // Max age for queued events (5 seconds)
                dropOldestOnOverflow: true        // Drop oldest events when queue is full
            },
            
            // Enable/disable features
            enabled: {
                rateLimiting: true,
                coalescing: true,
                batching: true,
                backpressure: true
            },
            
            // Priority levels for events (higher = processed first)
            priorities: {
                'data:save-requested': 10,        // High priority
                'element:deleted': 8,            // High priority
                'element:created': 7,            // Medium-high priority
                'element:updated': 5,            // Medium priority
                'app:render-requested': 3,       // Low priority (can be batched)
                'default': 5                     // Default priority
            }
        };
    }
    
    /**
     * Get rate limit for event type
     * @param {string} eventType - Event type name
     * @returns {number} - Events per second
     */
    getRateLimit(eventType) {
        return this.config.rateLimits[eventType] || this.config.rateLimits['default'];
    }
    
    /**
     * Get coalescing window for event type
     * @param {string} eventType - Event type name
     * @returns {number} - Coalescing window in milliseconds
     */
    getCoalescingWindow(eventType) {
        return this.config.coalescing[eventType] || this.config.coalescing['default'];
    }
    
    /**
     * Check if event type should be batched
     * @param {string} eventType - Event type name
     * @returns {boolean}
     */
    shouldBatch(eventType) {
        return this.config.batching[eventType] ?? this.config.batching['default'];
    }
    
    /**
     * Get batch window for event type
     * @param {string} eventType - Event type name
     * @returns {number} - Batch window in milliseconds
     */
    getBatchWindow(eventType) {
        return this.config.batchWindows[eventType] || this.config.batchWindows['default'];
    }
    
    /**
     * Get priority for event type
     * @param {string} eventType - Event type name
     * @returns {number} - Priority level (higher = processed first)
     */
    getPriority(eventType) {
        return this.config.priorities[eventType] || this.config.priorities['default'];
    }
    
    /**
     * Get backpressure configuration
     * @returns {Object} - Backpressure config
     */
    getBackpressureConfig() {
        return this.config.backpressure;
    }
    
    /**
     * Check if feature is enabled
     * @param {string} feature - Feature name (rateLimiting, coalescing, batching, backpressure)
     * @returns {boolean}
     */
    isEnabled(feature) {
        return this.config.enabled[feature] ?? true;
    }
    
    /**
     * Update configuration
     * @param {Object} updates - Partial configuration to merge
     */
    updateConfig(updates) {
        this.config = this._deepMerge(this.config, updates);
    }
    
    /**
     * Deep merge objects
     * @private
     */
    _deepMerge(target, source) {
        const output = { ...target };
        if (this._isObject(target) && this._isObject(source)) {
            Object.keys(source).forEach(key => {
                if (this._isObject(source[key])) {
                    if (!(key in target)) {
                        Object.assign(output, { [key]: source[key] });
                    } else {
                        output[key] = this._deepMerge(target[key], source[key]);
                    }
                } else {
                    Object.assign(output, { [key]: source[key] });
                }
            });
        }
        return output;
    }
    
    /**
     * Check if value is an object
     * @private
     */
    _isObject(item) {
        return item && typeof item === 'object' && !Array.isArray(item);
    }
    
    /**
     * Get full configuration
     * @returns {Object} - Full configuration object
     */
    getConfig() {
        return JSON.parse(JSON.stringify(this.config)); // Deep clone
    }
}

// Singleton instance
export const eventStormConfig = new EventStormConfig();

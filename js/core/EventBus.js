// EventBus - Global event bus for app-wide event communication
import { EventEmitter } from '../utils/events.js';
import { eventStormConfig } from './EventStormConfig.js';
import { EventCoalescer } from './EventCoalescer.js';
import { EventRateLimiter } from './EventRateLimiter.js';
import { EventBatcher } from './EventBatcher.js';
import { BackpressureManager } from './BackpressureManager.js';

export class EventBus extends EventEmitter {
    constructor() {
        super();
        this.eventHistory = [];
        this.maxHistorySize = 100;
        
        // Initialize event storm control components
        this.coalescer = new EventCoalescer();
        this.rateLimiter = new EventRateLimiter();
        this.batcher = new EventBatcher();
        this.backpressureManager = new BackpressureManager();
        
        // Processing state
        this.processingQueue = [];
        this.isProcessing = false;
        
        // Metrics
        this.metrics = {
            totalEventsEmitted: 0,
            totalEventsProcessed: 0,
            coalescedEvents: 0,
            rateLimitedEvents: 0,
            batchedEvents: 0,
            backpressureEvents: 0
        };
        
        // Start queue processing
        this._startQueueProcessor();
    }
    
    /**
     * Emit event with history tracking and storm control
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
        
        // Update metrics
        this.metrics.totalEventsEmitted++;
        
        // Process through storm control pipeline
        this._processEvent(event, args);
    }
    
    /**
     * Emit event immediately, bypassing storm control
     * Use for critical events that must be processed immediately
     * @param {string} event - Event name
     * @param {...*} args - Event arguments
     */
    emitImmediate(event, ...args) {
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
        
        // Emit directly to listeners (bypass storm control)
        super.emit(event, ...args);
    }
    
    /**
     * Process event through storm control pipeline
     * @private
     */
    _processEvent(eventType, args) {
        // Check backpressure first
        if (this.backpressureManager.shouldApplyBackpressure()) {
            const priority = eventStormConfig.getPriority(eventType);
            if (this.backpressureManager.queueEvent(eventType, args, priority)) {
                this.metrics.backpressureEvents++;
                return;
            }
        }
        
        // Step 1: Rate limiting
        if (!this.rateLimiter.canProcess(eventType)) {
            // Queue for later processing
            this.rateLimiter.queueEvent(eventType, args, (type, eventArgs) => {
                this._continueProcessing(type, eventArgs);
            });
            this.metrics.rateLimitedEvents++;
            return;
        }
        
        // Step 2: Continue processing
        this._continueProcessing(eventType, args);
    }
    
    /**
     * Continue processing after rate limiting
     * @private
     */
    _continueProcessing(eventType, args) {
        // Step 2: Coalescing
        const coalesced = this.coalescer.coalesce(eventType, args, (type, eventArgs) => {
            this._afterCoalescing(type, eventArgs);
        });
        
        if (coalesced) {
            this.metrics.coalescedEvents++;
            return;
        }
        
        // Step 3: Batching
        const batched = this.batcher.batch(eventType, args, (type, batchedArgs) => {
            this._afterBatching(type, batchedArgs);
        });
        
        if (batched) {
            this.metrics.batchedEvents++;
            return;
        }
        
        // Step 4: Emit to listeners
        this._emitToListeners(eventType, args);
    }
    
    /**
     * Process after coalescing
     * @private
     */
    _afterCoalescing(eventType, args) {
        // Check if we should batch the coalesced event
        const batched = this.batcher.batch(eventType, args, (type, batchedArgs) => {
            this._afterBatching(type, batchedArgs);
        });
        
        if (!batched) {
            this._emitToListeners(eventType, args);
        }
    }
    
    /**
     * Process after batching
     * @private
     */
    _afterBatching(eventType, batchedArgs) {
        // Emit batched events
        if (Array.isArray(batchedArgs) && batchedArgs.length > 0) {
            // For batched events, emit each one or emit as batch based on event type
            if (eventType === 'app:render-requested') {
                // Single render for multiple requests
                this._emitToListeners(eventType, []);
            } else {
                // Emit each batched event
                for (const args of batchedArgs) {
                    this._emitToListeners(eventType, Array.isArray(args) ? args : [args]);
                }
            }
        } else {
            // Single event
            this._emitToListeners(eventType, batchedArgs);
        }
    }
    
    /**
     * Emit event to listeners with performance tracking
     * @private
     */
    _emitToListeners(eventType, args) {
        // Access parent class events property
        if (!this.events || !this.events[eventType]) {
            return;
        }
        
        const listeners = [...this.events[eventType]]; // Copy to avoid modification during iteration
        const startTime = performance.now();
        
        for (const handler of listeners) {
            const handlerStart = performance.now();
            try {
                handler(...args);
            } catch (error) {
                console.error(`Error in event handler for "${eventType}":`, error);
            } finally {
                const handlerTime = performance.now() - handlerStart;
                this.backpressureManager.recordExecutionTime(handler, handlerTime);
            }
        }
        
        const totalTime = performance.now() - startTime;
        this.metrics.totalEventsProcessed++;
        
        // Update backpressure manager with total execution time
        if (listeners.length > 0) {
            this.backpressureManager.recordExecutionTime(null, totalTime);
        }
    }
    
    /**
     * Start queue processor for backpressure events
     * @private
     */
    _startQueueProcessor() {
        // Process queue periodically
        setInterval(() => {
            if (!this.isProcessing && this.backpressureManager.getQueueSize() > 0) {
                this.isProcessing = true;
                this.backpressureManager.processQueue((eventType, args) => {
                    return new Promise((resolve) => {
                        this._continueProcessing(eventType, args);
                        resolve();
                    });
                }, 10).finally(() => {
                    this.isProcessing = false;
                });
            }
        }, 100); // Check every 100ms
    }
    
    /**
     * Get event history
     * @param {string} eventName - Optional event name to filter
     * @param {number} limit - Limit number of results
     * @returns {Array}
     */
    getHistory(eventName = null, limit = null) {
        let history = this.eventHistory;
        
        if (eventName) {
            history = history.filter(item => item.event === eventName);
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
    
    /**
     * Flush all pending events (coalesced, batched, queued)
     * Useful for ensuring all events are processed before shutdown
     */
    flush() {
        // Flush coalescer
        this.coalescer.flush((eventType, args) => {
            this._afterCoalescing(eventType, args);
        });
        
        // Flush batcher
        this.batcher.flush((eventType, batchedArgs) => {
            this._afterBatching(eventType, batchedArgs);
        });
        
        // Flush rate limiter
        this.rateLimiter.flush((eventType, args) => {
            this._continueProcessing(eventType, args);
        });
        
        // Flush backpressure queue
        this.backpressureManager.flush((eventType, args) => {
            return new Promise((resolve) => {
                this._continueProcessing(eventType, args);
                resolve();
            });
        });
    }
    
    /**
     * Get event storm control metrics
     * @returns {Object} - Metrics object
     */
    getMetrics() {
        return {
            ...this.metrics,
            coalescer: {
                pendingCount: this.coalescer.getTotalPendingCount()
            },
            rateLimiter: {
                queuedCount: this.rateLimiter.getTotalQueuedCount()
            },
            batcher: {
                batchCount: this.batcher.getTotalBatchCount()
            },
            backpressure: this.backpressureManager.getStats()
        };
    }
    
    /**
     * Reset all metrics
     */
    resetMetrics() {
        this.metrics = {
            totalEventsEmitted: 0,
            totalEventsProcessed: 0,
            coalescedEvents: 0,
            rateLimitedEvents: 0,
            batchedEvents: 0,
            backpressureEvents: 0
        };
        this.backpressureManager.clearMetrics();
    }
    
    /**
     * Enable/disable event storm control features
     * @param {Object} features - Object with feature names as keys and boolean values
     */
    configureFeatures(features) {
        eventStormConfig.updateConfig({ enabled: features });
    }
    
    /**
     * Update event storm control configuration
     * @param {Object} config - Partial configuration to merge
     */
    updateConfig(config) {
        eventStormConfig.updateConfig(config);
    }
}

// Singleton instance
export const eventBus = new EventBus();


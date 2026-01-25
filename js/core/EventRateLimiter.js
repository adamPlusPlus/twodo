// EventRateLimiter.js - Rate limit event processing using token bucket algorithm
// Prevents event storms by limiting events per second per event type

import { eventStormConfig } from './EventStormConfig.js';

/**
 * Token bucket for rate limiting
 */
class TokenBucket {
    constructor(rate, capacity) {
        this.rate = rate;           // Tokens per second
        this.capacity = capacity;    // Maximum tokens
        this.tokens = capacity;      // Current tokens
        this.lastRefill = Date.now(); // Last refill timestamp
    }
    
    /**
     * Try to consume a token
     * @returns {boolean} - True if token was consumed, false if rate limited
     */
    consume() {
        this._refill();
        
        if (this.tokens >= 1) {
            this.tokens -= 1;
            return true;
        }
        
        return false;
    }
    
    /**
     * Refill tokens based on elapsed time
     * @private
     */
    _refill() {
        const now = Date.now();
        const elapsed = (now - this.lastRefill) / 1000; // Convert to seconds
        const tokensToAdd = elapsed * this.rate;
        
        this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
        this.lastRefill = now;
    }
    
    /**
     * Get time until next token is available (in milliseconds)
     * @returns {number}
     */
    getTimeUntilNextToken() {
        this._refill();
        
        if (this.tokens >= 1) {
            return 0;
        }
        
        const tokensNeeded = 1 - this.tokens;
        const timeNeeded = (tokensNeeded / this.rate) * 1000; // Convert to milliseconds
        return Math.ceil(timeNeeded);
    }
    
    /**
     * Get current token count
     * @returns {number}
     */
    getTokens() {
        this._refill();
        return this.tokens;
    }
}

export class EventRateLimiter {
    constructor() {
        // Map of event type -> TokenBucket
        this.buckets = new Map();
        // Map of event type -> queued events
        this.queues = new Map();
        // Map of event type -> processing timer
        this.processTimers = new Map();
    }
    
    /**
     * Check if event can be processed (rate limit check)
     * @param {string} eventType - Event type
     * @returns {boolean} - True if event can be processed, false if rate limited
     */
    canProcess(eventType) {
        if (!eventStormConfig.isEnabled('rateLimiting')) {
            return true;
        }
        
        const rateLimit = eventStormConfig.getRateLimit(eventType);
        
        // Get or create token bucket for this event type
        if (!this.buckets.has(eventType)) {
            // Capacity is same as rate (allows burst up to 1 second worth)
            this.buckets.set(eventType, new TokenBucket(rateLimit, rateLimit));
        }
        
        const bucket = this.buckets.get(eventType);
        return bucket.consume();
    }
    
    /**
     * Queue an event for later processing when rate limit allows
     * @param {string} eventType - Event type
     * @param {Array} args - Event arguments
     * @param {Function} callback - Callback to invoke when event can be processed
     */
    queueEvent(eventType, args, callback) {
        if (!this.queues.has(eventType)) {
            this.queues.set(eventType, []);
        }
        
        const queue = this.queues.get(eventType);
        queue.push({ args, callback, timestamp: Date.now() });
        
        // Schedule processing
        this._scheduleProcessing(eventType);
    }
    
    /**
     * Schedule processing of queued events
     * @private
     */
    _scheduleProcessing(eventType) {
        // Clear existing timer
        if (this.processTimers.has(eventType)) {
            clearTimeout(this.processTimers.get(eventType));
        }
        
        const bucket = this.buckets.get(eventType);
        if (!bucket) {
            return;
        }
        
        const timeUntilNext = bucket.getTimeUntilNextToken();
        
        if (timeUntilNext <= 0) {
            // Process immediately
            this._processQueue(eventType);
        } else {
            // Schedule for later
            const timer = setTimeout(() => {
                this._processQueue(eventType);
            }, timeUntilNext);
            
            this.processTimers.set(eventType, timer);
        }
    }
    
    /**
     * Process queued events for an event type
     * @private
     */
    _processQueue(eventType) {
        const queue = this.queues.get(eventType);
        if (!queue || queue.length === 0) {
            this.processTimers.delete(eventType);
            return;
        }
        
        const bucket = this.buckets.get(eventType);
        if (!bucket) {
            return;
        }
        
        // Process as many events as tokens allow
        let processed = 0;
        const maxProcess = Math.min(queue.length, Math.ceil(bucket.getTokens()));
        
        while (processed < maxProcess && queue.length > 0) {
            if (bucket.consume()) {
                const event = queue.shift();
                try {
                    event.callback(eventType, event.args);
                } catch (error) {
                    console.error(`Error processing queued event ${eventType}:`, error);
                }
                processed++;
            } else {
                break;
            }
        }
        
        // If queue still has events, schedule next processing
        if (queue.length > 0) {
            this._scheduleProcessing(eventType);
        } else {
            this.processTimers.delete(eventType);
        }
    }
    
    /**
     * Flush all queued events (process immediately, bypassing rate limits)
     * @param {Function} callback - Optional callback to invoke for each event
     */
    flush(callback) {
        for (const [eventType, queue] of this.queues.entries()) {
            while (queue.length > 0) {
                const event = queue.shift();
                if (callback) {
                    callback(eventType, event.args);
                } else {
                    event.callback(eventType, event.args);
                }
            }
        }
        
        // Clear timers
        for (const timer of this.processTimers.values()) {
            clearTimeout(timer);
        }
        
        this.queues.clear();
        this.processTimers.clear();
    }
    
    /**
     * Clear queue for a specific event type
     * @param {string} eventType - Event type
     */
    clear(eventType) {
        if (this.processTimers.has(eventType)) {
            clearTimeout(this.processTimers.get(eventType));
            this.processTimers.delete(eventType);
        }
        this.queues.delete(eventType);
    }
    
    /**
     * Clear all queues
     */
    clearAll() {
        for (const timer of this.processTimers.values()) {
            clearTimeout(timer);
        }
        this.processTimers.clear();
        this.queues.clear();
    }
    
    /**
     * Get queued event count for an event type
     * @param {string} eventType - Event type
     * @returns {number} - Number of queued events
     */
    getQueuedCount(eventType) {
        const queue = this.queues.get(eventType);
        return queue ? queue.length : 0;
    }
    
    /**
     * Get total queued event count
     * @returns {number} - Total number of queued events
     */
    getTotalQueuedCount() {
        let total = 0;
        for (const queue of this.queues.values()) {
            total += queue.length;
        }
        return total;
    }
    
    /**
     * Get token count for an event type
     * @param {string} eventType - Event type
     * @returns {number} - Current token count
     */
    getTokenCount(eventType) {
        const bucket = this.buckets.get(eventType);
        return bucket ? bucket.getTokens() : 0;
    }
}

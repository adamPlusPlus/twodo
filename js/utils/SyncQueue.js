// SyncQueue.js - Queue management for pending sync operations
// Extracted from SyncManager.js for reusability and maintainability

/**
 * SyncQueue - Manages queue of pending sync messages
 */
export class SyncQueue {
    constructor() {
        this.queue = [];
    }
    
    /**
     * Add message to queue
     * @param {Object} message - Message to queue
     */
    enqueue(message) {
        this.queue.push(message);
    }
    
    /**
     * Remove and return next message from queue
     * @returns {Object|null} Next message or null if empty
     */
    dequeue() {
        return this.queue.shift() || null;
    }
    
    /**
     * Process all queued messages with processor function
     * @param {Function} processor - Function to process each message (message) => void
     */
    flush(processor) {
        if (typeof processor !== 'function') {
            console.error('[SyncQueue] Processor must be a function');
            return;
        }
        
        while (this.queue.length > 0) {
            const message = this.dequeue();
            if (message) {
                try {
                    processor(message);
                } catch (error) {
                    console.error('[SyncQueue] Error processing message:', error);
                }
            }
        }
    }
    
    /**
     * Clear all queued messages
     */
    clear() {
        this.queue = [];
    }
    
    /**
     * Check if queue is empty
     * @returns {boolean} True if queue is empty
     */
    isEmpty() {
        return this.queue.length === 0;
    }
    
    /**
     * Get queue size
     * @returns {number} Number of queued messages
     */
    size() {
        return this.queue.length;
    }
    
    /**
     * Get all queued messages (without removing them)
     * @returns {Array<Object>} Array of queued messages
     */
    peekAll() {
        return [...this.queue];
    }
    
    /**
     * Remove specific message from queue
     * @param {Function} predicate - Function to identify message to remove (message) => boolean
     * @returns {Object|null} Removed message or null if not found
     */
    remove(predicate) {
        if (typeof predicate !== 'function') {
            return null;
        }
        
        const index = this.queue.findIndex(predicate);
        if (index !== -1) {
            return this.queue.splice(index, 1)[0];
        }
        
        return null;
    }
}

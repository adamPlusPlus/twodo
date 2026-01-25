// IndexingConfig.js - Configuration for async incremental indexing
// Controls batch sizes, rate limits, and priority settings

export class IndexingConfig {
    constructor() {
        // Default configuration
        this.config = {
            // Batch size: number of documents to process per batch
            batchSize: 10,
            
            // Rate limit: documents per second
            rateLimit: 50,
            
            // Use requestIdleCallback when available
            useIdleCallback: true,
            
            // Priority: 'low', 'normal', 'high'
            priority: 'low',
            
            // Timeout for idle callback (ms)
            idleTimeout: 5000,
            
            // Enable/disable indexing
            enabled: true,
            
            // Logging configuration
            logging: {
                enabled: false,
                logProgress: false,    // Log indexing progress
                logCompletion: false   // Log completion
            }
        };
    }
    
    /**
     * Get batch size
     * @returns {number} - Documents per batch
     */
    getBatchSize() {
        return this.config.batchSize || 10;
    }
    
    /**
     * Set batch size
     * @param {number} size - Batch size
     */
    setBatchSize(size) {
        if (typeof size === 'number' && size > 0) {
            this.config.batchSize = size;
        }
    }
    
    /**
     * Get rate limit
     * @returns {number} - Documents per second
     */
    getRateLimit() {
        return this.config.rateLimit || 50;
    }
    
    /**
     * Set rate limit
     * @param {number} limit - Documents per second
     */
    setRateLimit(limit) {
        if (typeof limit === 'number' && limit > 0) {
            this.config.rateLimit = limit;
        }
    }
    
    /**
     * Check if should use idle callback
     * @returns {boolean} - True if should use
     */
    shouldUseIdleCallback() {
        return this.config.useIdleCallback !== false;
    }
    
    /**
     * Get priority
     * @returns {string} - Priority level
     */
    getPriority() {
        return this.config.priority || 'low';
    }
    
    /**
     * Set priority
     * @param {string} priority - Priority ('low', 'normal', 'high')
     */
    setPriority(priority) {
        if (['low', 'normal', 'high'].includes(priority)) {
            this.config.priority = priority;
        }
    }
    
    /**
     * Get idle timeout
     * @returns {number} - Timeout in milliseconds
     */
    getIdleTimeout() {
        return this.config.idleTimeout || 5000;
    }
    
    /**
     * Check if indexing is enabled
     * @returns {boolean} - True if enabled
     */
    isEnabled() {
        return this.config.enabled !== false;
    }
    
    /**
     * Check if logging is enabled
     * @returns {boolean} - True if logging enabled
     */
    isLoggingEnabled() {
        return this.config.logging?.enabled === true;
    }
    
    /**
     * Check if should log progress
     * @returns {boolean} - True if should log
     */
    shouldLogProgress() {
        return this.config.logging?.logProgress === true;
    }
    
    /**
     * Check if should log completion
     * @returns {boolean} - True if should log
     */
    shouldLogCompletion() {
        return this.config.logging?.logCompletion === true;
    }
    
    /**
     * Update configuration
     * @param {Object} updates - Configuration updates
     */
    updateConfig(updates) {
        this.config = { ...this.config, ...updates };
    }
    
    /**
     * Get full configuration
     * @returns {Object} - Full configuration object
     */
    getConfig() {
        return { ...this.config };
    }
}

// Export singleton instance
export const indexingConfig = new IndexingConfig();

// ActiveSetConfig.js - Configuration for active-set memory management
// Controls memory limits, eviction strategies, and preload behavior

export class ActiveSetConfig {
    constructor() {
        // Default configuration
        this.config = {
            // Maximum number of documents to keep in active memory
            maxActiveDocuments: 20,
            
            // Eviction strategy when limit is exceeded
            // Options: 'LRU' (Least Recently Used)
            evictionStrategy: 'LRU',
            
            // Store only metadata for non-active documents
            metadataOnly: true,
            
            // Preload strategy for documents
            // Options: 'none', 'recent', 'adjacent'
            preloadStrategy: 'none',
            
            // Number of recent documents to preload (if preloadStrategy is 'recent')
            recentCount: 3,
            
            // Number of adjacent documents to preload (if preloadStrategy is 'adjacent')
            adjacentCount: 1,
            
            // Enable/disable active-set management
            enabled: true,
            
            // Logging configuration
            logging: {
                enabled: false,
                logLoads: false,      // Log document loads
                logUnloads: false,    // Log document evictions
                logHits: false       // Log cache hits
            }
        };
    }
    
    /**
     * Get maximum active documents
     * @returns {number} - Maximum documents in active set
     */
    getMaxActiveDocuments() {
        return this.config.maxActiveDocuments || 20;
    }
    
    /**
     * Set maximum active documents
     * @param {number} max - Maximum documents
     */
    setMaxActiveDocuments(max) {
        if (typeof max === 'number' && max > 0) {
            this.config.maxActiveDocuments = max;
        }
    }
    
    /**
     * Get eviction strategy
     * @returns {string} - Eviction strategy ('LRU')
     */
    getEvictionStrategy() {
        return this.config.evictionStrategy || 'LRU';
    }
    
    /**
     * Check if metadata-only storage is enabled
     * @returns {boolean} - True if metadata-only for non-active
     */
    isMetadataOnly() {
        return this.config.metadataOnly !== false;
    }
    
    /**
     * Get preload strategy
     * @returns {string} - Preload strategy ('none', 'recent', 'adjacent')
     */
    getPreloadStrategy() {
        return this.config.preloadStrategy || 'none';
    }
    
    /**
     * Get recent count for preloading
     * @returns {number} - Number of recent documents to preload
     */
    getRecentCount() {
        return this.config.recentCount || 3;
    }
    
    /**
     * Get adjacent count for preloading
     * @returns {number} - Number of adjacent documents to preload
     */
    getAdjacentCount() {
        return this.config.adjacentCount || 1;
    }
    
    /**
     * Check if active-set management is enabled
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
     * Check if should log loads
     * @returns {boolean} - True if should log
     */
    shouldLogLoads() {
        return this.config.logging?.logLoads === true;
    }
    
    /**
     * Check if should log unloads
     * @returns {boolean} - True if should log
     */
    shouldLogUnloads() {
        return this.config.logging?.logUnloads === true;
    }
    
    /**
     * Check if should log hits
     * @returns {boolean} - True if should log
     */
    shouldLogHits() {
        return this.config.logging?.logHits === true;
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
export const activeSetConfig = new ActiveSetConfig();

// ViewportConfig.js - Configuration for viewport rendering (virtualization)
// Centralized configuration for virtualization thresholds, buffer sizes, and behavior

export class ViewportConfig {
    constructor() {
        // Default configuration
        this.config = {
            // Virtualization threshold - minimum items before virtualization kicks in
            virtualizationThreshold: 50,
            
            // Buffer size - items to render above/below viewport
            bufferSize: {
                min: 5,        // Minimum buffer items
                max: 10,       // Maximum buffer items
                default: 7,    // Default buffer items
                dynamic: true // Enable dynamic buffer sizing
            },
            
            // Height measurement strategy
            heightMeasurement: {
                strategy: 'measure', // 'measure', 'estimate', 'fixed', 'hybrid'
                sampleSize: 10,      // Number of items to measure for estimation
                defaultHeight: 50,   // Default height for estimation (px)
                cacheHeights: true   // Cache measured heights
            },
            
            // Scroll handling
            scroll: {
                throttleMs: 16,      // Throttle to ~60fps (16ms)
                debounceMs: 0,       // Debounce delay (0 = no debounce)
                useRequestAnimationFrame: true // Use RAF for updates
            },
            
            // Performance settings
            performance: {
                itemRecycling: false,  // Recycle DOM elements (advanced optimization)
                batchUpdates: true,     // Batch DOM updates
                measureOnScroll: false  // Re-measure heights on scroll (expensive)
            },
            
            // Enable/disable features
            enabled: {
                virtualization: true,
                dynamicBuffer: true,
                heightCaching: true,
                scrollThrottling: true
            }
        };
    }
    
    /**
     * Get virtualization threshold
     * @returns {number} - Minimum items before virtualization
     */
    getThreshold() {
        return this.config.virtualizationThreshold;
    }
    
    /**
     * Get buffer size
     * @param {number} scrollSpeed - Optional scroll speed for dynamic sizing
     * @returns {number} - Buffer size in items
     */
    getBufferSize(scrollSpeed = 0) {
        const buffer = this.config.bufferSize;
        
        if (!this.config.enabled.dynamicBuffer || !buffer.dynamic) {
            return buffer.default;
        }
        
        // Dynamic buffer based on scroll speed
        // Faster scrolling = larger buffer to prevent blank areas
        if (scrollSpeed > 5) {
            return buffer.max;
        } else if (scrollSpeed > 2) {
            return Math.floor((buffer.default + buffer.max) / 2);
        } else {
            return buffer.default;
        }
    }
    
    /**
     * Get height measurement strategy
     * @returns {string} - Strategy name
     */
    getHeightStrategy() {
        return this.config.heightMeasurement.strategy;
    }
    
    /**
     * Get default item height for estimation
     * @returns {number} - Default height in pixels
     */
    getDefaultHeight() {
        return this.config.heightMeasurement.defaultHeight;
    }
    
    /**
     * Get sample size for height estimation
     * @returns {number} - Number of items to sample
     */
    getSampleSize() {
        return this.config.heightMeasurement.sampleSize;
    }
    
    /**
     * Check if height caching is enabled
     * @returns {boolean}
     */
    shouldCacheHeights() {
        return this.config.enabled.heightCaching && this.config.heightMeasurement.cacheHeights;
    }
    
    /**
     * Get scroll throttle delay
     * @returns {number} - Throttle delay in milliseconds
     */
    getScrollThrottle() {
        return this.config.scroll.throttleMs;
    }
    
    /**
     * Check if feature is enabled
     * @param {string} feature - Feature name
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
export const viewportConfig = new ViewportConfig();

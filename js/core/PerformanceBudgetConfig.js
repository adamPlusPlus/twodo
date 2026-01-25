// PerformanceBudgetConfig.js - Configuration for performance budgets
// Centralized configuration for operation budgets, alerting, and metrics

export class PerformanceBudgetConfig {
    constructor() {
        // Default configuration
        this.config = {
            // Budget values in milliseconds
            budgets: {
                TYPING: 100,        // ms - input events, inline editing
                CLICKING: 100,      // ms - click handlers
                SCROLLING: 100,     // ms - scroll events, virtualization
                SEARCH: 500,        // ms - search operations
                RENDERING: 500,     // ms - render operations
                SYNC: 500           // ms - sync operations
            },
            
            // Alert thresholds (multipliers of budget)
            alertThresholds: {
                warn: 1.0,          // Warn when budget is exceeded
                error: 2.0           // Error when budget is exceeded by 2x
            },
            
            // Metrics configuration
            metrics: {
                maxHistorySize: 1000,    // Maximum number of metrics to keep
                maxViolationHistory: 100 // Maximum violations to keep
            },
            
            // Enable/disable per operation type
            enabled: {
                TYPING: true,
                CLICKING: true,
                SCROLLING: true,
                SEARCH: true,
                RENDERING: true,
                SYNC: true
            },
            
            // Logging configuration
            logging: {
                enabled: true,
                logLevel: 'warn',       // 'debug', 'info', 'warn', 'error'
                logWithinBudget: false, // Log operations within budget (for debugging)
                logViolations: true     // Always log violations
            },
            
            // UI notifications (optional)
            uiNotifications: {
                enabled: false,         // Enable UI notifications for violations
                showOnlyErrors: true    // Only show errors, not warnings
            }
        };
    }
    
    /**
     * Get budget for operation type
     * @param {string} operationType - Operation type (TYPING, CLICKING, etc.)
     * @returns {number} - Budget in milliseconds
     */
    getBudget(operationType) {
        return this.config.budgets[operationType] || this.config.budgets.SEARCH;
    }
    
    /**
     * Check if operation type is enabled
     * @param {string} operationType - Operation type
     * @returns {boolean} - True if enabled
     */
    isEnabled(operationType) {
        return this.config.enabled[operationType] !== false;
    }
    
    /**
     * Get alert threshold multiplier
     * @param {string} level - Alert level ('warn' or 'error')
     * @returns {number} - Multiplier
     */
    getAlertThreshold(level) {
        return this.config.alertThresholds[level] || 1.0;
    }
    
    /**
     * Get max history size
     * @returns {number} - Maximum metrics to keep
     */
    getMaxHistorySize() {
        return this.config.metrics.maxHistorySize;
    }
    
    /**
     * Get max violation history size
     * @returns {number} - Maximum violations to keep
     */
    getMaxViolationHistory() {
        return this.config.metrics.maxViolationHistory;
    }
    
    /**
     * Check if logging is enabled
     * @returns {boolean} - True if logging enabled
     */
    isLoggingEnabled() {
        return this.config.logging.enabled !== false;
    }
    
    /**
     * Get log level
     * @returns {string} - Log level
     */
    getLogLevel() {
        return this.config.logging.logLevel || 'warn';
    }
    
    /**
     * Check if should log within budget operations
     * @returns {boolean} - True if should log
     */
    shouldLogWithinBudget() {
        return this.config.logging.logWithinBudget === true;
    }
    
    /**
     * Check if should log violations
     * @returns {boolean} - True if should log
     */
    shouldLogViolations() {
        return this.config.logging.logViolations !== false;
    }
    
    /**
     * Check if UI notifications are enabled
     * @returns {boolean} - True if enabled
     */
    areUINotificationsEnabled() {
        return this.config.uiNotifications.enabled === true;
    }
    
    /**
     * Check if should show only errors in UI
     * @returns {boolean} - True if only errors
     */
    shouldShowOnlyErrors() {
        return this.config.uiNotifications.showOnlyErrors !== false;
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
export const performanceBudgetConfig = new PerformanceBudgetConfig();

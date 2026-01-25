// PerformanceBudgetManager.js - Performance budget monitoring and enforcement
// Measures operation execution time and alerts on budget violations

import { performanceBudgetConfig } from './PerformanceBudgetConfig.js';

export class PerformanceBudgetManager {
    constructor() {
        this.config = performanceBudgetConfig;
        this.metrics = [];
        this.violations = [];
        this.operationStack = []; // Track nested operations
    }
    
    /**
     * Measure operation execution time
     * @param {string} operationType - Operation type (TYPING, CLICKING, etc.)
     * @param {Function} operationFn - Function to measure
     * @param {Object} metadata - Optional metadata about the operation
     * @returns {*} - Result of operation function
     */
    measureOperation(operationType, operationFn, metadata = {}) {
        // Check if this operation type is enabled
        if (!this.config.isEnabled(operationType)) {
            return operationFn();
        }
        
        // Get budget for this operation type
        const budget = this.config.getBudget(operationType);
        
        // Track nested operations
        const isNested = this.operationStack.length > 0;
        this.operationStack.push({ operationType, startTime: performance.now() });
        
        let isAsync = false;
        try {
            // Measure execution time
            const startTime = performance.now();
            const result = operationFn();
            const endTime = performance.now();
            const duration = endTime - startTime;
            
            // Handle async operations
            if (result instanceof Promise) {
                isAsync = true;
                // For async operations, pop from stack after promise resolves/rejects
                return result.then(
                    (value) => {
                        const asyncEndTime = performance.now();
                        const asyncDuration = asyncEndTime - startTime;
                        this._recordMetric(operationType, asyncDuration, budget, metadata, isNested);
                        this.operationStack.pop(); // Pop after async completes
                        return value;
                    },
                    (error) => {
                        const asyncEndTime = performance.now();
                        const asyncDuration = asyncEndTime - startTime;
                        this._recordMetric(operationType, asyncDuration, budget, metadata, isNested);
                        this.operationStack.pop(); // Pop after async completes (even on error)
                        throw error;
                    }
                );
            }
            
            // Record metric for synchronous operation
            this._recordMetric(operationType, duration, budget, metadata, isNested);
            
            return result;
        } finally {
            // Pop from operation stack (only for synchronous operations)
            // Async operations pop in their promise handlers
            if (!isAsync) {
                this.operationStack.pop();
            }
        }
    }
    
    /**
     * Record performance metric
     * @private
     */
    _recordMetric(operationType, duration, budget, metadata, isNested) {
        const violated = duration > budget;
        const violationRatio = duration / budget;
        
        const metric = {
            operationType,
            duration: Math.round(duration * 100) / 100, // Round to 2 decimal places
            budget,
            timestamp: Date.now(),
            metadata: { ...metadata, isNested },
            violated,
            violationRatio: Math.round(violationRatio * 100) / 100
        };
        
        // Add to metrics history
        this.metrics.push(metric);
        const maxHistory = this.config.getMaxHistorySize();
        if (this.metrics.length > maxHistory) {
            this.metrics.shift();
        }
        
        // If violated, add to violations
        if (violated) {
            this.violations.push(metric);
            const maxViolations = this.config.getMaxViolationHistory();
            if (this.violations.length > maxViolations) {
                this.violations.shift();
            }
            
            // Alert on violation
            this._alert(metric);
        } else if (this.config.shouldLogWithinBudget()) {
            // Log within-budget operations if enabled (for debugging)
            this._log('debug', metric);
        }
    }
    
    /**
     * Alert on budget violation
     * @private
     */
    _alert(metric) {
        if (!this.config.shouldLogViolations()) {
            return;
        }
        
        const { operationType, duration, budget, violationRatio } = metric;
        const warnThreshold = this.config.getAlertThreshold('warn');
        const errorThreshold = this.config.getAlertThreshold('error');
        
        let level = 'warn';
        if (violationRatio >= errorThreshold) {
            level = 'error';
        }
        
        // Check if should log at this level
        if (!this._shouldLog(level)) {
            return;
        }
        
        const message = `${operationType} operation exceeded budget: ${duration}ms (budget: ${budget}ms, ${(violationRatio * 100).toFixed(0)}%)`;
        
        this._log(level, metric, message);
        
        // Show UI notification if enabled
        if (this.config.areUINotificationsEnabled()) {
            if (level === 'error' || !this.config.shouldShowOnlyErrors()) {
                this._showUINotification(level, message);
            }
        }
    }
    
    /**
     * Log metric
     * @private
     */
    _log(level, metric, message = null) {
        if (!this.config.isLoggingEnabled()) {
            return;
        }
        
        const logMessage = message || 
            `${metric.operationType} operation: ${metric.duration}ms (budget: ${metric.budget}ms)`;
        
        const logData = {
            operationType: metric.operationType,
            duration: metric.duration,
            budget: metric.budget,
            violationRatio: metric.violationRatio,
            metadata: metric.metadata
        };
        
        if (level === 'error') {
            console.error(`[PerformanceBudget] ${logMessage}`, logData);
        } else if (level === 'warn') {
            console.warn(`[PerformanceBudget] ${logMessage}`, logData);
        } else if (level === 'info') {
            console.info(`[PerformanceBudget] ${logMessage}`, logData);
        } else if (level === 'debug') {
            console.debug(`[PerformanceBudget] ${logMessage}`, logData);
        }
    }
    
    /**
     * Check if should log at this level
     * @private
     */
    _shouldLog(level) {
        const logLevel = this.config.getLogLevel();
        const levels = { debug: 0, info: 1, warn: 2, error: 3 };
        return levels[level] >= levels[logLevel];
    }
    
    /**
     * Show UI notification
     * @private
     */
    _showUINotification(level, message) {
        // Simple console notification for now
        // Can be extended to show UI toast/notification
        // TODO: Implement UI notification system if needed
    }
    
    /**
     * Get all metrics
     * @param {Object} filters - Optional filters (operationType, violated, etc.)
     * @returns {Array} - Array of metrics
     */
    getMetrics(filters = {}) {
        let filtered = [...this.metrics];
        
        if (filters.operationType) {
            filtered = filtered.filter(m => m.operationType === filters.operationType);
        }
        
        if (filters.violated !== undefined) {
            filtered = filtered.filter(m => m.violated === filters.violated);
        }
        
        if (filters.since) {
            const sinceTime = Date.now() - filters.since;
            filtered = filtered.filter(m => m.timestamp >= sinceTime);
        }
        
        return filtered;
    }
    
    /**
     * Get all violations
     * @param {Object} filters - Optional filters
     * @returns {Array} - Array of violations
     */
    getViolations(filters = {}) {
        let filtered = [...this.violations];
        
        if (filters.operationType) {
            filtered = filtered.filter(v => v.operationType === filters.operationType);
        }
        
        if (filters.since) {
            const sinceTime = Date.now() - filters.since;
            filtered = filtered.filter(v => v.timestamp >= sinceTime);
        }
        
        return filtered;
    }
    
    /**
     * Get summary statistics
     * @param {string} operationType - Optional operation type filter
     * @returns {Object} - Summary statistics
     */
    getSummary(operationType = null) {
        const metrics = operationType 
            ? this.metrics.filter(m => m.operationType === operationType)
            : this.metrics;
        
        if (metrics.length === 0) {
            return {
                count: 0,
                average: 0,
                min: 0,
                max: 0,
                violations: 0,
                violationRate: 0
            };
        }
        
        const durations = metrics.map(m => m.duration);
        const violations = metrics.filter(m => m.violated);
        
        return {
            count: metrics.length,
            average: Math.round((durations.reduce((a, b) => a + b, 0) / durations.length) * 100) / 100,
            min: Math.min(...durations),
            max: Math.max(...durations),
            violations: violations.length,
            violationRate: Math.round((violations.length / metrics.length) * 10000) / 100 // Percentage
        };
    }
    
    /**
     * Clear all metrics
     */
    clearMetrics() {
        this.metrics = [];
        this.violations = [];
    }
    
    /**
     * Clear metrics for specific operation type
     * @param {string} operationType - Operation type to clear
     */
    clearMetricsForType(operationType) {
        this.metrics = this.metrics.filter(m => m.operationType !== operationType);
        this.violations = this.violations.filter(v => v.operationType !== operationType);
    }
    
    /**
     * Export metrics as JSON
     * @returns {string} - JSON string
     */
    exportMetrics() {
        return JSON.stringify({
            metrics: this.metrics,
            violations: this.violations,
            summary: this.getSummary(),
            timestamp: Date.now()
        }, null, 2);
    }
}

// Export singleton instance
export const performanceBudgetManager = new PerformanceBudgetManager();

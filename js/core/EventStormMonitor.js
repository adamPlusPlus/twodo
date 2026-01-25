// EventStormMonitor.js - Monitor event storm control performance
// Provides metrics, logging, and performance monitoring for event processing

import { eventBus } from './EventBus.js';
import { eventStormConfig } from './EventStormConfig.js';

export class EventStormMonitor {
    constructor() {
        this.isEnabled = true;
        this.logLevel = 'warn'; // 'debug', 'info', 'warn', 'error'
        this.metricsHistory = [];
        this.maxHistorySize = 100;
        this.alertThresholds = {
            queueSize: 500,
            slowListenerCount: 10,
            averageProcessingTime: 50,
            backpressureActive: true
        };
        
        // Start monitoring
        if (this.isEnabled) {
            this._startMonitoring();
        }
    }
    
    /**
     * Start monitoring event processing
     * @private
     */
    _startMonitoring() {
        // Monitor every 5 seconds
        setInterval(() => {
            this._collectMetrics();
        }, 5000);
    }
    
    /**
     * Collect current metrics
     * @private
     */
    _collectMetrics() {
        const metrics = eventBus.getMetrics();
        
        // Add timestamp
        metrics.timestamp = Date.now();
        
        // Store in history
        this.metricsHistory.push(metrics);
        if (this.metricsHistory.length > this.maxHistorySize) {
            this.metricsHistory.shift();
        }
        
        // Check for alerts
        this._checkAlerts(metrics);
    }
    
    /**
     * Check for alert conditions
     * @private
     */
    _checkAlerts(metrics) {
        const backpressure = metrics.backpressure;
        
        // Alert on high queue size
        if (backpressure.queueSize > this.alertThresholds.queueSize) {
            this._alert('warn', `High event queue size: ${backpressure.queueSize}`, metrics);
        }
        
        // Alert on many slow listeners
        if (backpressure.slowListenerCount > this.alertThresholds.slowListenerCount) {
            this._alert('warn', `Many slow listeners detected: ${backpressure.slowListenerCount}`, metrics);
        }
        
        // Alert on high average processing time
        if (backpressure.averageProcessingTime > this.alertThresholds.averageProcessingTime) {
            this._alert('warn', `High average processing time: ${backpressure.averageProcessingTime.toFixed(2)}ms`, metrics);
        }
        
        // Alert when backpressure is active
        if (backpressure.backpressureActive && this.alertThresholds.backpressureActive) {
            this._alert('info', 'Backpressure is active', metrics);
        }
    }
    
    /**
     * Log alert
     * @private
     */
    _alert(level, message, metrics) {
        if (this._shouldLog(level)) {
            console[level](`[EventStormMonitor] ${message}`, {
                queueSize: metrics.backpressure.queueSize,
                slowListeners: metrics.backpressure.slowListenerCount,
                avgProcessingTime: metrics.backpressure.averageProcessingTime
            });
        }
    }
    
    /**
     * Check if should log at this level
     * @private
     */
    _shouldLog(level) {
        const levels = { debug: 0, info: 1, warn: 2, error: 3 };
        return levels[level] >= levels[this.logLevel];
    }
    
    /**
     * Get current metrics
     * @returns {Object} - Current metrics
     */
    getMetrics() {
        return eventBus.getMetrics();
    }
    
    /**
     * Get metrics history
     * @param {number} limit - Limit number of entries
     * @returns {Array} - Metrics history
     */
    getMetricsHistory(limit = null) {
        if (limit) {
            return this.metricsHistory.slice(-limit);
        }
        return [...this.metricsHistory];
    }
    
    /**
     * Get performance summary
     * @returns {Object} - Performance summary
     */
    getPerformanceSummary() {
        if (this.metricsHistory.length === 0) {
            return null;
        }
        
        const recent = this.metricsHistory.slice(-10); // Last 10 samples
        
        const totalEmitted = recent.reduce((sum, m) => sum + m.totalEventsEmitted, 0);
        const totalProcessed = recent.reduce((sum, m) => sum + m.totalEventsProcessed, 0);
        const avgQueueSize = recent.reduce((sum, m) => sum + m.backpressure.queueSize, 0) / recent.length;
        const avgProcessingTime = recent.reduce((sum, m) => sum + m.backpressure.averageProcessingTime, 0) / recent.length;
        
        return {
            eventsPerSecond: totalEmitted / (recent.length * 5), // 5 second intervals
            processingRate: totalProcessed / totalEmitted,
            averageQueueSize: avgQueueSize,
            averageProcessingTime: avgProcessingTime,
            backpressureActive: recent.some(m => m.backpressure.backpressureActive)
        };
    }
    
    /**
     * Set log level
     * @param {string} level - Log level ('debug', 'info', 'warn', 'error')
     */
    setLogLevel(level) {
        this.logLevel = level;
    }
    
    /**
     * Set alert thresholds
     * @param {Object} thresholds - Alert thresholds
     */
    setAlertThresholds(thresholds) {
        this.alertThresholds = { ...this.alertThresholds, ...thresholds };
    }
    
    /**
     * Enable/disable monitoring
     * @param {boolean} enabled - Whether monitoring is enabled
     */
    setEnabled(enabled) {
        this.isEnabled = enabled;
        if (enabled && !this._monitoringInterval) {
            this._startMonitoring();
        }
    }
    
    /**
     * Reset metrics
     */
    resetMetrics() {
        eventBus.resetMetrics();
        this.metricsHistory = [];
    }
}

// Singleton instance
export const eventStormMonitor = new EventStormMonitor();

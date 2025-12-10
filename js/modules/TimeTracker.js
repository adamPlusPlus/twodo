// TimeTracker.js - Time tracking system for elements and pages
import { StorageUtils } from '../utils/storage.js';
import { eventBus } from '../core/EventBus.js';

export class TimeTracker {
    constructor(app) {
        this.app = app;
        this.activeTimers = new Map(); // elementId -> timer data
        this.timeLogs = this.loadTimeLogs();
        this.storageKey = 'twodo-time-logs';
    }
    
    loadTimeLogs() {
        return StorageUtils.get(this.storageKey) || {};
    }
    
    saveTimeLogs() {
        StorageUtils.set(this.storageKey, this.timeLogs);
    }
    
    /**
     * Start timer for an element
     */
    startTimer(pageId, binId, elementIndex) {
        const elementId = this.getElementId(pageId, binId, elementIndex);
        
        // Stop any existing timer for this element
        if (this.activeTimers.has(elementId)) {
            this.stopTimer(pageId, binId, elementIndex);
        }
        
        const timerData = {
            startTime: Date.now(),
            pageId,
            binId,
            elementIndex
        };
        
        this.activeTimers.set(elementId, timerData);
        
        // Emit event
        eventBus.emit('timer:started', { pageId, binId, elementIndex });
    }
    
    /**
     * Stop timer for an element
     */
    stopTimer(pageId, binId, elementIndex) {
        const elementId = this.getElementId(pageId, binId, elementIndex);
        const timerData = this.activeTimers.get(elementId);
        
        if (!timerData) return 0;
        
        const duration = Date.now() - timerData.startTime;
        const seconds = Math.floor(duration / 1000);
        
        // Log time
        this.logTime(pageId, binId, elementIndex, seconds);
        
        // Remove from active timers
        this.activeTimers.delete(elementId);
        
        // Emit event
        eventBus.emit('timer:stopped', { pageId, binId, elementIndex, duration: seconds });
        
        return seconds;
    }
    
    /**
     * Log time for an element
     */
    logTime(pageId, binId, elementIndex, seconds) {
        const elementId = this.getElementId(pageId, binId, elementIndex);
        const today = new Date().toISOString().split('T')[0];
        
        if (!this.timeLogs[elementId]) {
            this.timeLogs[elementId] = [];
        }
        
        this.timeLogs[elementId].push({
            date: today,
            seconds: seconds,
            timestamp: new Date().toISOString()
        });
        
        // Update element's total time if it has time tracking
        const page = this.app.pages.find(p => p.id === pageId);
        const bin = page?.bins?.find(b => b.id === binId);
        const element = bin?.elements?.[elementIndex];
        
        if (element) {
            if (!element.timeTracked) element.timeTracked = 0;
            element.timeTracked += seconds;
        }
        
        this.saveTimeLogs();
        this.app.dataManager.saveData();
    }
    
    /**
     * Get total time for an element
     */
    getTotalTime(pageId, binId, elementIndex) {
        const elementId = this.getElementId(pageId, binId, elementIndex);
        const logs = this.timeLogs[elementId] || [];
        return logs.reduce((total, log) => total + log.seconds, 0);
    }
    
    /**
     * Get time for a date range
     */
    getTimeForRange(pageId, binId, elementIndex, startDate, endDate) {
        const elementId = this.getElementId(pageId, binId, elementIndex);
        const logs = this.timeLogs[elementId] || [];
        
        return logs
            .filter(log => {
                const logDate = new Date(log.date);
                return logDate >= startDate && logDate <= endDate;
            })
            .reduce((total, log) => total + log.seconds, 0);
    }
    
    /**
     * Get active timer duration
     */
    getActiveTimerDuration(pageId, binId, elementIndex) {
        const elementId = this.getElementId(pageId, binId, elementIndex);
        const timerData = this.activeTimers.get(elementId);
        
        if (!timerData) return 0;
        
        return Math.floor((Date.now() - timerData.startTime) / 1000);
    }
    
    /**
     * Check if timer is active
     */
    isTimerActive(pageId, binId, elementIndex) {
        const elementId = this.getElementId(pageId, binId, elementIndex);
        return this.activeTimers.has(elementId);
    }
    
    /**
     * Format seconds to readable string
     */
    formatTime(seconds) {
        if (seconds < 60) return `${seconds}s`;
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${hours}h ${minutes}m`;
    }
    
    /**
     * Get unique element ID
     */
    getElementId(pageId, binId, elementIndex) {
        return `${pageId}-${binId}-${elementIndex}`;
    }
    
    /**
     * Get time report for a page
     */
    getPageTimeReport(pageId, startDate, endDate) {
        const page = this.app.pages.find(p => p.id === pageId);
        if (!page) return null;
        
        const report = {
            totalTime: 0,
            byBin: {},
            byElement: {},
            byDate: {}
        };
        
        page.bins?.forEach(bin => {
            bin.elements?.forEach((element, elementIndex) => {
                const time = this.getTimeForRange(pageId, bin.id, elementIndex, startDate, endDate);
                if (time > 0) {
                    report.totalTime += time;
                    report.byBin[bin.id] = (report.byBin[bin.id] || 0) + time;
                    report.byElement[`${pageId}-${bin.id}-${elementIndex}`] = time;
                    
                    // By date
                    const elementId = this.getElementId(pageId, bin.id, elementIndex);
                    const logs = this.timeLogs[elementId] || [];
                    logs.forEach(log => {
                        if (new Date(log.date) >= startDate && new Date(log.date) <= endDate) {
                            report.byDate[log.date] = (report.byDate[log.date] || 0) + log.seconds;
                        }
                    });
                }
            });
        });
        
        return report;
    }
}



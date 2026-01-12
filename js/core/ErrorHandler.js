// ErrorHandler.js - Centralized error handling
// Provides consistent error reporting and error event emission

import { eventBus } from './EventBus.js';
import { EVENTS } from './AppEvents.js';

/**
 * ErrorHandler - Centralized error handling
 * 
 * Provides:
 * - Consistent error reporting
 * - Error event emission
 * - Error logging
 * - User-friendly error messages
 */
export class ErrorHandler {
    constructor() {
        this.errorCount = 0;
        this.maxErrors = 100; // Prevent error spam
    }
    
    /**
     * Handle an error
     * @param {Error|string} error - Error object or message
     * @param {Object} context - Additional context
     * @param {boolean} showToUser - Whether to show error to user
     */
    handleError(error, context = {}, showToUser = false) {
        this.errorCount++;
        
        // Prevent error spam
        if (this.errorCount > this.maxErrors) {
            return;
        }
        
        const errorMessage = error instanceof Error ? error.message : error;
        const errorStack = error instanceof Error ? error.stack : null;
        
        // Log error
        console.error('[ErrorHandler]', errorMessage, context, errorStack);
        
        // Emit error event
        eventBus.emit('error:occurred', {
            message: errorMessage,
            stack: errorStack,
            context: context,
            timestamp: new Date().toISOString()
        });
        
        // Show to user if requested
        if (showToUser) {
            this.showErrorToUser(errorMessage);
        }
    }
    
    /**
     * Show error to user
     * @param {string} message - Error message
     */
    showErrorToUser(message) {
        // Simple alert for now - could be enhanced with a toast/notification system
        alert(`Error: ${message}`);
    }
    
    /**
     * Handle warning
     * @param {string} message - Warning message
     * @param {Object} context - Additional context
     */
    handleWarning(message, context = {}) {
        console.warn('[ErrorHandler]', message, context);
        
        // Emit warning event
        eventBus.emit('warning:occurred', {
            message: message,
            context: context,
            timestamp: new Date().toISOString()
        });
    }
    
    /**
     * Reset error count (useful for testing)
     */
    reset() {
        this.errorCount = 0;
    }
}

// Export singleton instance
export const errorHandler = new ErrorHandler();

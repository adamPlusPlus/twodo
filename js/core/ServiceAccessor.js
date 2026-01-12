// ServiceAccessor.js - Helper class to standardize service access patterns
// Provides a convenient way to access services with caching
import { getService } from './AppServices.js';

/**
 * ServiceAccessor - Helper class for accessing services
 * 
 * Provides a standardized way to access services with caching to avoid
 * repeated lookups. Useful for modules that need multiple services.
 */
export class ServiceAccessor {
    constructor() {
        this._services = new Map();
    }
    
    /**
     * Get a service by name, with caching
     * @param {string} name - Service name (use SERVICES constants)
     * @returns {*} Service instance
     */
    getService(name) {
        if (!this._services.has(name)) {
            this._services.set(name, getService(name));
        }
        return this._services.get(name);
    }
    
    /**
     * Clear cached services (useful for testing)
     */
    clear() {
        this._services.clear();
    }
}

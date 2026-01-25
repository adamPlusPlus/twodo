// ServiceLocator.js - Singleton service locator for dependency injection
// Provides a centralized registry for app services, reducing coupling between modules

/**
 * Service Locator - Singleton pattern for service registration and retrieval
 * 
 * This allows modules to access only the services they need without requiring
 * the full app instance, improving modularity and testability.
 */
export class ServiceLocator {
    constructor() {
        if (ServiceLocator.instance) {
            return ServiceLocator.instance;
        }
        
        this.services = new Map();
        this.lazyFactories = new Map(); // For services that need lazy initialization
        ServiceLocator.instance = this;
    }
    
    /**
     * Register a service
     * @param {string} name - Service name
     * @param {*} service - Service instance
     * @throws {Error} If service name is already registered
     */
    register(name, service) {
        if (!name) {
            console.error('[ServiceLocator] Attempted to register service with undefined/null name:', { name, service, stack: new Error().stack });
            throw new Error(`Service name cannot be undefined or null`);
        }
        if (this.services.has(name)) {
            console.error('[ServiceLocator] Service already registered:', { 
                name, 
                existingService: this.services.get(name),
                newService: service,
                stack: new Error().stack 
            });
            throw new Error(`Service "${name}" is already registered`);
        }
        this.services.set(name, service);
    }
    
    /**
     * Register a lazy service factory
     * @param {string} name - Service name
     * @param {Function} factory - Factory function that returns the service
     */
    registerLazy(name, factory) {
        if (this.lazyFactories.has(name)) {
            throw new Error(`Lazy service "${name}" is already registered`);
        }
        this.lazyFactories.set(name, factory);
    }
    
    /**
     * Get a service by name
     * @param {string} name - Service name
     * @returns {*} Service instance
     * @throws {Error} If service is not registered
     */
    get(name) {
        // Check if service is already instantiated
        if (this.services.has(name)) {
            return this.services.get(name);
        }
        
        // Check if there's a lazy factory
        if (this.lazyFactories.has(name)) {
            const factory = this.lazyFactories.get(name);
            const service = factory();
            this.services.set(name, service);
            this.lazyFactories.delete(name);
            return service;
        }
        
        throw new Error(`Service "${name}" is not registered`);
    }
    
    /**
     * Check if a service is registered
     * @param {string} name - Service name
     * @returns {boolean}
     */
    has(name) {
        return this.services.has(name) || this.lazyFactories.has(name);
    }
    
    /**
     * Unregister a service (useful for testing)
     * @param {string} name - Service name
     */
    unregister(name) {
        this.services.delete(name);
        this.lazyFactories.delete(name);
    }
    
    /**
     * Clear all services (useful for testing)
     */
    clear() {
        this.services.clear();
        this.lazyFactories.clear();
    }
    
    /**
     * Get all registered service names
     * @returns {string[]}
     */
    getRegisteredServices() {
        const services = Array.from(this.services.keys());
        const lazy = Array.from(this.lazyFactories.keys());
        return [...services, ...lazy];
    }
}

// Export singleton instance
export const serviceLocator = new ServiceLocator();


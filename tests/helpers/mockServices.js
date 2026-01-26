// tests/helpers/mockServices.js - Mock service implementations

/**
 * Create a mock EventBus
 * @returns {Object} Mock EventBus
 */
export function createMockEventBus() {
    const listeners = new Map();
    const emittedEvents = [];
    
    return {
        on: (event, handler) => {
            if (!listeners.has(event)) {
                listeners.set(event, []);
            }
            listeners.get(event).push(handler);
        },
        
        off: (event, handler) => {
            if (listeners.has(event)) {
                const handlers = listeners.get(event);
                const index = handlers.indexOf(handler);
                if (index > -1) {
                    handlers.splice(index, 1);
                }
            }
        },
        
        emit: (event, ...args) => {
            // Handle both single data argument and multiple arguments
            const data = args.length === 1 ? args[0] : args;
            emittedEvents.push({ event, data, timestamp: Date.now() });
            if (listeners.has(event)) {
                listeners.get(event).forEach(handler => {
                    try {
                        // Call handler with data (matching EventBus behavior)
                        handler(data);
                    } catch (error) {
                        console.error(`[MockEventBus] Error in handler for ${event}:`, error);
                    }
                });
            }
        },
        
        emitImmediate: (event, data) => {
            // Same as emit for tests
            this.emit(event, data);
        },
        
        // Test utilities
        getListeners: (event) => {
            return listeners.get(event) || [];
        },
        
        getEmittedEvents: () => {
            return [...emittedEvents];
        },
        
        clear: () => {
            listeners.clear();
            emittedEvents.length = 0;
        },
        
        hasListener: (event) => {
            return listeners.has(event) && listeners.get(event).length > 0;
        }
    };
}

/**
 * Create a mock ServiceLocator
 * @returns {Object} Mock ServiceLocator
 */
export function createMockServiceLocator() {
    const services = new Map();
    
    return {
        register: (name, service) => {
            services.set(name, service);
        },
        
        get: (name) => {
            return services.get(name);
        },
        
        has: (name) => {
            return services.has(name);
        },
        
        // Test utilities
        clear: () => {
            services.clear();
        },
        
        getAllServices: () => {
            return Array.from(services.entries());
        }
    };
}

/**
 * Create a mock FileManager
 * @returns {Object} Mock FileManager
 */
export function createMockFileManager() {
    return {
        currentFilename: 'test-file.json',
        saveFile: async () => ({ success: true }),
        loadFile: async () => ({ success: true }),
        listFiles: async () => [],
        deleteFile: async () => ({ success: true })
    };
}

/**
 * Create a mock SyncManager
 * @returns {Object} Mock SyncManager
 */
export function createMockSyncManager() {
    return {
        isConnected: false,
        connect: async () => {},
        disconnect: () => {},
        sendOperation: async () => {},
        onOperation: () => {}
    };
}

/**
 * Create a mock UndoRedoManager
 * @returns {Object} Mock UndoRedoManager
 */
export function createMockUndoRedoManager() {
    return {
        undoStack: [],
        redoStack: [],
        recordOperation: () => {},
        undo: () => false,
        redo: () => false,
        canUndo: () => false,
        canRedo: () => false
    };
}

/**
 * Create a mock AuthorityManager
 * @returns {Object} Mock AuthorityManager
 */
export function createMockAuthorityManager() {
    const authorities = new Map();
    
    return {
        setAuthority: (pageId, viewId, mode) => {
            const key = `${pageId}:${viewId}`;
            authorities.set(key, mode);
        },
        
        getAuthority: (pageId, viewId) => {
            const key = `${pageId}:${viewId}`;
            return authorities.get(key) || 'CANONICAL';
        },
        
        isAuthoritative: (pageId, viewId, representation) => {
            return this.getAuthority(pageId, viewId) === representation;
        },
        
        validateOperation: () => true, // Allow all by default
        
        preventCircularUpdate: () => {},
        
        isUpdateFromAuthoritativeSource: () => false,
        
        // Test utilities
        clear: () => {
            authorities.clear();
        }
    };
}

/**
 * Setup mock services for testing
 * @param {Object} options - Service options
 * @returns {Object} Mock services object
 */
export function setupMockServices(options = {}) {
    const eventBus = options.eventBus || createMockEventBus();
    const serviceLocator = options.serviceLocator || createMockServiceLocator();
    const appState = options.appState || null;
    const fileManager = options.fileManager || createMockFileManager();
    const syncManager = options.syncManager || createMockSyncManager();
    const undoRedoManager = options.undoRedoManager || createMockUndoRedoManager();
    const authorityManager = options.authorityManager || createMockAuthorityManager();
    
    // Register services
    if (appState) {
        serviceLocator.register('appState', appState);
    }
    serviceLocator.register('eventBus', eventBus);
    serviceLocator.register('fileManager', fileManager);
    serviceLocator.register('syncManager', syncManager);
    serviceLocator.register('undoRedoManager', undoRedoManager);
    serviceLocator.register('authorityManager', authorityManager);
    
    return {
        eventBus,
        serviceLocator,
        appState,
        fileManager,
        syncManager,
        undoRedoManager,
        authorityManager
    };
}

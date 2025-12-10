// AppServices.js - Service name constants and registration helpers
import { serviceLocator } from './ServiceLocator.js';

/**
 * Service name constants
 * Use these constants instead of magic strings to prevent typos
 */
export const SERVICES = {
    // Core services
    DATA_MANAGER: 'dataManager',
    UNDO_REDO_MANAGER: 'undoRedoManager',
    SYNC_MANAGER: 'syncManager',
    EVENT_BUS: 'eventBus',
    RENDERER: 'renderer',
    
    // Manager services
    SETTINGS_MANAGER: 'settingsManager',
    PAGE_MANAGER: 'pageManager',
    BIN_MANAGER: 'binManager',
    ELEMENT_MANAGER: 'elementManager',
    FILE_MANAGER: 'fileManager',
    MODAL_HANDLER: 'modalHandler',
    DRAG_DROP_HANDLER: 'dragDropHandler',
    CONTEXT_MENU_HANDLER: 'contextMenuHandler',
    TOUCH_GESTURE_HANDLER: 'touchGestureHandler',
    EVENT_HANDLER: 'eventHandler',
    AUDIO_HANDLER: 'audioHandler',
    
    // Feature services
    RELATIONSHIP_MANAGER: 'relationshipManager',
    TEMPLATE_MANAGER: 'templateManager',
    AUTOMATION_ENGINE: 'automationEngine',
    TAG_MANAGER: 'tagManager',
    SEARCH_INDEX: 'searchIndex',
    EXPORT_SERVICE: 'exportService',
    IMPORT_SERVICE: 'importService',
    OAUTH_MANAGER: 'oauthManager',
    TIME_TRACKER: 'timeTracker',
    
    // Plugin system
    PAGE_PLUGIN_MANAGER: 'pagePluginManager',
    BIN_PLUGIN_MANAGER: 'binPluginManager',
    ELEMENT_TYPE_MANAGER: 'elementTypeManager',
    FORMAT_RENDERER_MANAGER: 'formatRendererManager',
    
    // App state (for accessing pages array, etc.)
    APP_STATE: 'appState'
};

/**
 * Register a service with the service locator
 * @param {string} name - Service name (use SERVICES constants)
 * @param {*} service - Service instance
 */
export function registerService(name, service) {
    serviceLocator.register(name, service);
}

/**
 * Get a service from the service locator
 * @param {string} name - Service name (use SERVICES constants)
 * @returns {*} Service instance
 */
export function getService(name) {
    return serviceLocator.get(name);
}

/**
 * Check if a service is registered
 * @param {string} name - Service name
 * @returns {boolean}
 */
export function hasService(name) {
    return serviceLocator.has(name);
}

/**
 * Register all core services from app instance
 * This is called during app initialization
 * @param {Object} app - TodoApp instance
 */
export function registerAllServices(app) {
    // Core services
    registerService(SERVICES.EVENT_BUS, app.eventBus);
    registerService(SERVICES.DATA_MANAGER, app.dataManager);
    registerService(SERVICES.UNDO_REDO_MANAGER, app.undoRedoManager);
    registerService(SERVICES.SYNC_MANAGER, app.syncManager);
    
    // Manager services
    registerService(SERVICES.SETTINGS_MANAGER, app.settingsManager);
    registerService(SERVICES.PAGE_MANAGER, app.pageManager);
    registerService(SERVICES.BIN_MANAGER, app.binManager);
    registerService(SERVICES.ELEMENT_MANAGER, app.elementManager);
    registerService(SERVICES.FILE_MANAGER, app.fileManager);
    registerService(SERVICES.MODAL_HANDLER, app.modalHandler);
    registerService(SERVICES.DRAG_DROP_HANDLER, app.dragDropHandler);
    registerService(SERVICES.CONTEXT_MENU_HANDLER, app.contextMenuHandler);
    registerService(SERVICES.TOUCH_GESTURE_HANDLER, app.touchGestureHandler);
    registerService(SERVICES.EVENT_HANDLER, app.eventHandler);
    registerService(SERVICES.AUDIO_HANDLER, app.audioHandler);
    
    // Feature services
    registerService(SERVICES.RELATIONSHIP_MANAGER, app.relationshipManager);
    registerService(SERVICES.TEMPLATE_MANAGER, app.templateManager);
    registerService(SERVICES.AUTOMATION_ENGINE, app.automationEngine);
    registerService(SERVICES.TAG_MANAGER, app.tagManager);
    registerService(SERVICES.SEARCH_INDEX, app.searchIndex);
    registerService(SERVICES.EXPORT_SERVICE, app.exportService);
    registerService(SERVICES.IMPORT_SERVICE, app.importService);
    registerService(SERVICES.OAUTH_MANAGER, app.oauthManager);
    registerService(SERVICES.TIME_TRACKER, app.timeTracker);
    
    // Plugin system
    registerService(SERVICES.PAGE_PLUGIN_MANAGER, app.pagePluginManager);
    registerService(SERVICES.BIN_PLUGIN_MANAGER, app.binPluginManager);
    registerService(SERVICES.ELEMENT_TYPE_MANAGER, app.elementTypeManager);
    registerService(SERVICES.FORMAT_RENDERER_MANAGER, app.formatRendererManager);
    
    // App state - provide access to pages array and other app state
    // Now uses AppState instance
    registerService(SERVICES.APP_STATE, app.appState);
}


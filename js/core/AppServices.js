// AppServices.js - Service name constants and registration helpers
import { serviceLocator } from './ServiceLocator.js';
import { eventBus } from './EventBus.js';

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
    THEME_MANAGER: 'themeManager',
    VISUAL_SETTINGS_MANAGER: 'visualSettingsManager',
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
    DAILY_RESET_MANAGER: 'dailyResetManager',
    INLINE_EDITOR: 'inlineEditor',
    
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
    // EVENT_BUS is already registered in app.js using the imported singleton
    // Only register if not already registered (for backward compatibility)
    if (!hasService(SERVICES.EVENT_BUS)) {
        registerService(SERVICES.EVENT_BUS, app.eventBus || eventBus);
    }
    // These may already be registered, but registerAllServices will overwrite with latest instance
    if (!hasService(SERVICES.DATA_MANAGER)) {
        registerService(SERVICES.DATA_MANAGER, app.dataManager);
    }
    if (!hasService(SERVICES.UNDO_REDO_MANAGER)) {
        registerService(SERVICES.UNDO_REDO_MANAGER, app.undoRedoManager);
    }
    registerService(SERVICES.SYNC_MANAGER, app.syncManager);
    
    // Manager services
    // These services may already be registered in app.js, check before registering
    if (!hasService(SERVICES.SETTINGS_MANAGER)) {
        registerService(SERVICES.SETTINGS_MANAGER, app.settingsManager);
    }
    if (!hasService(SERVICES.THEME_MANAGER)) {
        registerService(SERVICES.THEME_MANAGER, app.themeManager);
    }
    if (!hasService(SERVICES.VISUAL_SETTINGS_MANAGER)) {
        registerService(SERVICES.VISUAL_SETTINGS_MANAGER, app.visualSettingsManager);
    }
    if (!hasService(SERVICES.PAGE_MANAGER)) {
        registerService(SERVICES.PAGE_MANAGER, app.pageManager);
    }
    if (!hasService(SERVICES.BIN_MANAGER)) {
        registerService(SERVICES.BIN_MANAGER, app.binManager);
    }
    if (!hasService(SERVICES.ELEMENT_MANAGER)) {
        registerService(SERVICES.ELEMENT_MANAGER, app.elementManager);
    }
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
    registerService(SERVICES.DAILY_RESET_MANAGER, app.dailyResetManager);
    registerService(SERVICES.INLINE_EDITOR, app.inlineEditor);
    
    // Plugin system
    registerService(SERVICES.PAGE_PLUGIN_MANAGER, app.pagePluginManager);
    registerService(SERVICES.BIN_PLUGIN_MANAGER, app.binPluginManager);
    registerService(SERVICES.ELEMENT_TYPE_MANAGER, app.elementTypeManager);
    registerService(SERVICES.FORMAT_RENDERER_MANAGER, app.formatRendererManager);
    
    // App state - provide access to pages array and other app state
    // Now uses AppState instance
    // APP_STATE may already be registered in app.js, check before registering
    if (!hasService(SERVICES.APP_STATE)) {
        registerService(SERVICES.APP_STATE, app.appState);
    }
}


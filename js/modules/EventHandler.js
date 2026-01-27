// EventHandler.js - Sets up all event listeners
import { eventBus } from '../core/EventBus.js';
import { EVENTS } from '../core/AppEvents.js';
import { EventHelper } from '../utils/EventHelper.js';
import { getService, SERVICES, hasService } from '../core/AppServices.js';
import { performanceBudgetManager } from '../core/PerformanceBudgetManager.js';
import { UIEventHandlers } from '../utils/UIEventHandlers.js';
import { DocumentEventHandlers } from '../utils/DocumentEventHandlers.js';
import { WindowEventHandlers } from '../utils/WindowEventHandlers.js';
import { EventRouter } from '../utils/EventRouter.js';

export class EventHandler {
    constructor(app = null) {
        this.app = app;
        this.uiHandlers = new UIEventHandlers(this);
        this.documentHandlers = new DocumentEventHandlers(this);
        this.windowHandlers = new WindowEventHandlers();
    }
    
    /**
     * Get services
     */
    _getDataManager() {
        return getService(SERVICES.DATA_MANAGER);
    }
    
    _getFileManager() {
        return getService(SERVICES.FILE_MANAGER);
    }
    
    _getElementManager() {
        return getService(SERVICES.ELEMENT_MANAGER);
    }
    
    _getModalHandler() {
        return getService(SERVICES.MODAL_HANDLER);
    }
    
    _getBinManager() {
        return getService(SERVICES.BIN_MANAGER);
    }
    
    _getAppState() {
        return getService(SERVICES.APP_STATE);
    }
    
    _getContextMenuHandler() {
        return getService(SERVICES.CONTEXT_MENU_HANDLER);
    }
    
    /**
     * Handle file input change event
     */
    handleFileInput(e) {
        const fileManager = this._getFileManager();
        if (fileManager && typeof fileManager.handleFileInput === 'function') {
            fileManager.handleFileInput(e);
        }
    }
    
    /**
     * Process dropped file
     */
    processDroppedFile(file) {
        const fileManager = this._getFileManager();
        if (fileManager && typeof fileManager.processDroppedFile === 'function') {
            fileManager.processDroppedFile(file);
        }
    }
    
    /**
     * Handle page container menu (double-click on empty area)
     */
    handlePageContainerMenu(e) {
        const contextMenuHandler = this._getContextMenuHandler();
        if (contextMenuHandler) {
            contextMenuHandler.showPageContextMenu(e);
        }
    }
    
    setupEventListeners() {
        try {
            // Window event handlers (beforeunload, visibilitychange) are set up in constructor
            // UI event handlers
            this.uiHandlers.setupAll();
            
            // Document event handlers
            this.documentHandlers.setupAll();
        } catch (error) {
            console.error('[EventHandler] Error in setupEventListeners:', error);
            // Don't throw - allow app to continue even if some listeners fail
        }
    }
}

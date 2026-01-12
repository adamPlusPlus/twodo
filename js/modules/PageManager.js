// PageManager.js - Handles page-related operations (pages contain bins)
import { eventBus } from '../core/EventBus.js';
import { EVENTS } from '../core/AppEvents.js';
import { getService, SERVICES, hasService } from '../core/AppServices.js';

export class PageManager {
    constructor() {
    }
    
    /**
     * Get AppState service
     */
    _getAppState() {
        return getService(SERVICES.APP_STATE);
    }
    
    /**
     * Get other services
     */
    _getUndoRedoManager() {
        return getService(SERVICES.UNDO_REDO_MANAGER);
    }
    
    _getDataManager() {
        return getService(SERVICES.DATA_MANAGER);
    }
    
    _getPagePluginManager() {
        return getService(SERVICES.PAGE_PLUGIN_MANAGER);
    }
    
    async addPage() {
        const appState = this._getAppState();
        const pageNum = appState.pages.length + 1;
        const newPage = {
            id: `page-${pageNum}`,
            bins: [{
                id: 'bin-0',
                title: 'Bin 1',
                elements: []
            }],
            plugins: [],
            format: null,
            config: {}
        };
        const pageIndex = appState.pages.length;
        appState.pages.push(newPage);
        appState.currentPageId = `page-${pageNum}`;
        
        // Record undo/redo change
        const undoRedoManager = this._getUndoRedoManager();
        if (undoRedoManager) {
            undoRedoManager.recordPageAdd(pageIndex, newPage);
        }
        
        // Initialize plugins for new page
        const pagePluginManager = this._getPagePluginManager();
        if (pagePluginManager) {
            await pagePluginManager.initializePagePlugins(newPage.id);
        }
        
        // Emit event
        eventBus.emit(EVENTS.PAGE.CREATED, { pageId: newPage.id, page: newPage });
        
        const dataManager = this._getDataManager();
        if (dataManager) {
            dataManager.saveData();
        }
        eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
    }
    
    /**
     * Ensure at least one page exists (business logic extracted from AppRenderer)
     * @returns {Object} The current page
     */
    ensureDefaultPage() {
        const appState = this._getAppState();
        const currentPage = appState.pages.find(p => p.id === appState.currentPageId);
        if (!currentPage) {
            // If current page doesn't exist, use first page or create default
            if (appState.pages.length > 0) {
                appState.currentPageId = appState.pages[0].id;
                return appState.pages[0];
            } else {
                // Create default page with one bin
                const defaultPage = {
                    id: 'page-1',
                    bins: [{
                        id: 'bin-0',
                        title: 'Bin 1',
                        elements: []
                    }]
                };
                appState.pages = [defaultPage];
                appState.currentPageId = 'page-1';
                return defaultPage;
            }
        }
        return currentPage;
    }
    
    async deletePage(pageId) {
        const appState = this._getAppState();
        // Don't allow deleting the last page
        if (appState.pages.length <= 1) {
            return;
        }
        
        const page = appState.pages.find(p => p.id === pageId);
        if (!page) return;
        
        // Record undo/redo change before deletion
        const undoRedoManager = this._getUndoRedoManager();
        if (undoRedoManager) {
            undoRedoManager.recordPageDelete(pageId, JSON.parse(JSON.stringify(page)));
        }
        
        // Cleanup plugins for page
        const pagePluginManager = this._getPagePluginManager();
        if (pagePluginManager) {
            await pagePluginManager.cleanupPagePlugins(pageId);
        }
        
        // Emit event before deletion
        eventBus.emit(EVENTS.PAGE.DELETED, { pageId });
        
        appState.pages = appState.pages.filter(p => p.id !== pageId);
        
        // If current page was deleted, switch to first page
        if (appState.currentPageId === pageId) {
            appState.currentPageId = appState.pages[0]?.id || null;
        }
        
        const dataManager = this._getDataManager();
        if (dataManager) {
            dataManager.saveData();
        }
        eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
    }
    
    movePage(sourcePageId, targetPageId) {
        if (sourcePageId === targetPageId) return;
        
        const appState = this._getAppState();
        const sourcePage = appState.pages.find(p => p.id === sourcePageId);
        const targetPage = appState.pages.find(p => p.id === targetPageId);
        
        if (!sourcePage || !targetPage) return;
        
        const sourceIndex = appState.pages.indexOf(sourcePage);
        const targetIndex = appState.pages.indexOf(targetPage);
        
        // Remove from source position
        appState.pages.splice(sourceIndex, 1);
        
        // Insert at target position (adjust if source was before target)
        const insertIndex = sourceIndex < targetIndex ? targetIndex - 1 : targetIndex;
        appState.pages.splice(insertIndex, 0, sourcePage);
        
        const dataManager = this._getDataManager();
        if (dataManager) {
            dataManager.saveData();
        }
        requestAnimationFrame(() => {
            eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
        });
    }
    
    renamePage(pageId, newTitle) {
        const appState = this._getAppState();
        const page = appState.pages.find(p => p.id === pageId);
        if (page) {
            // Pages don't have titles in the new structure, but we can store it for future use
            // For now, pages are just numbered
            const dataManager = this._getDataManager();
            if (dataManager) {
                dataManager.saveData();
            }
            eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
        }
    }
}

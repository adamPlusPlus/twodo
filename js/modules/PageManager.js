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
        const documentNum = appState.documents.length + 1;
        const documentId = `page-${documentNum}`;
        const seededGroups = [{
            id: 'group-0',
            title: 'Group 1',
            items: [],
            elements: []
        }];
        const newDocument = {
            id: documentId,
            groups: seededGroups,
            bins: seededGroups,
            plugins: [],
            format: null,
            config: {}
        };
        const pageIndex = appState.documents.length;
        appState.documents.push(newDocument);
        appState.currentDocumentId = documentId;
        
        // Record undo/redo change
        const undoRedoManager = this._getUndoRedoManager();
        if (undoRedoManager) {
            undoRedoManager.recordPageAdd(pageIndex, newDocument);
        }
        
        // Initialize plugins for new page
        const pagePluginManager = this._getPagePluginManager();
        if (pagePluginManager) {
            await pagePluginManager.initializePagePlugins(newDocument.id);
        }
        
        // Emit event
        eventBus.emit(EVENTS.PAGE.CREATED, { pageId: newDocument.id, documentId: newDocument.id, page: newDocument });
        
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
        const currentPage = appState.documents.find(p => p.id === appState.currentDocumentId);
        if (!currentPage) {
            // If current page doesn't exist, use first page or create default
            if (appState.documents.length > 0) {
                appState.currentDocumentId = appState.documents[0].id;
                return appState.documents[0];
            } else {
                // Create default page with one bin
                const seededGroups = [{
                    id: 'group-0',
                    title: 'Group 1',
                    items: [],
                    elements: []
                }];
                const defaultDocument = {
                    id: 'page-1',
                    groups: seededGroups,
                    bins: seededGroups
                };
                appState.documents = [defaultDocument];
                appState.currentDocumentId = 'page-1';
                return defaultDocument;
            }
        }
        return currentPage;
    }
    
    async deletePage(pageId) {
        const appState = this._getAppState();
        // Don't allow deleting the last page
        if (appState.documents.length <= 1) {
            return;
        }
        
        const page = appState.documents.find(p => p.id === pageId);
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
        
        appState.documents = appState.documents.filter(p => p.id !== pageId);
        
        // If current page was deleted, switch to first page
        if (appState.currentDocumentId === pageId) {
            appState.currentDocumentId = appState.documents[0]?.id || null;
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
        const sourcePage = appState.documents.find(p => p.id === sourcePageId);
        const targetPage = appState.documents.find(p => p.id === targetPageId);
        
        if (!sourcePage || !targetPage) return;
        
        const sourceIndex = appState.documents.indexOf(sourcePage);
        const targetIndex = appState.documents.indexOf(targetPage);
        
        // Remove from source position
        appState.documents.splice(sourceIndex, 1);
        
        // Insert at target position (adjust if source was before target)
        const insertIndex = sourceIndex < targetIndex ? targetIndex - 1 : targetIndex;
        appState.documents.splice(insertIndex, 0, sourcePage);
        
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
        const page = appState.documents.find(p => p.id === pageId);
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

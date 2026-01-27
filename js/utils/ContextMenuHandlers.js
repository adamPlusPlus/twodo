// ContextMenuHandlers.js - Handles context menu events
import { getService, SERVICES } from '../core/AppServices.js';
import { performanceBudgetManager } from '../core/PerformanceBudgetManager.js';

export class ContextMenuHandlers {
    constructor(eventHandler) {
        this.eventHandler = eventHandler;
    }
    
    _getContextMenuHandler() {
        return getService(SERVICES.CONTEXT_MENU_HANDLER);
    }
    
    _getAppState() {
        return getService(SERVICES.APP_STATE);
    }
    
    /**
     * Setup context menu item handlers
     */
    setupContextMenuItems() {
        const app = this.eventHandler?.app || window.app;
        
        const menuItems = [
            'context-edit', 'context-customize-visuals', 'context-view-data',
            'context-add-element', 'context-add-child-element', 'context-add-element-page',
            'context-delete-element', 'context-collapse-page', 'context-add-page',
            'context-add-bin', 'context-delete-bin', 'context-delete-page',
            'context-toggle-subtasks', 'context-reset-day', 'context-collapse-all-pages'
        ];
        
        menuItems.forEach(itemId => {
            const element = document.getElementById(itemId);
            if (element) {
                element.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const handlerName = itemId.replace('context-', 'handleContext').replace(/-([a-z])/g, (_, c) => c.toUpperCase());
                    if (app && app[handlerName]) {
                        app[handlerName]();
                    }
                });
            }
        });
    }
    
    /**
     * Setup context menu close on outside click
     */
    setupContextMenuClose() {
        // Close context menu on outside click (use capture phase to run early)
        document.addEventListener('click', (e) => {
            const contextMenuHandler = this._getContextMenuHandler();
            if (!contextMenuHandler) return;
            
            const appState = this._getAppState();
            const menu = document.getElementById('context-menu');
            
            // Only process if context menu is visible
            if (!menu || !menu.classList.contains('active')) {
                // Track active page when clicking on pages
                const pageElement = e.target.closest('.page');
                if (pageElement) {
                    appState.currentDocumentId = pageElement.dataset.pageId;
                }
                return;
            }
            
            // Don't close if clicking on the context menu or its items
            if (e.target.closest('.context-menu')) {
                return;
            }
            
            // Click is outside the context menu - hide it
            contextMenuHandler.hideContextMenu();
            
            // Track active page when clicking on pages
            const pageElement = e.target.closest('.page');
            if (pageElement) {
                appState.currentDocumentId = pageElement.dataset.pageId;
            }
        }, true); // Use capture phase to ensure this runs before other handlers
        
        // Close context menu on left-click anywhere
        document.addEventListener('click', (e) => {
            performanceBudgetManager.measureOperation('CLICKING', () => {
                const contextMenuHandler = this._getContextMenuHandler();
                if (contextMenuHandler) {
                    contextMenuHandler.hideContextMenu();
                }
            }, { source: 'ContextMenuHandlers-contextMenuClose' });
        });
    }
    
    /**
     * Setup unified contextmenu handler
     */
    setupContextMenuRouting() {
        document.addEventListener('contextmenu', (e) => {
            const target = e.target;
            const binsContainer = document.getElementById('bins-container');
            
            // Find the closest element, bin, or page tab
            const targetElement = target.closest('.element');
            const binElement = target.closest('.bin');
            const pageTabElement = target.closest('.page-tab');
            
            const contextMenuHandler = this._getContextMenuHandler();
            const appState = this._getAppState();
            
            // Route to appropriate handler
            if (targetElement) {
                // Element context menu
                const pageId = targetElement.dataset.pageId || appState.currentDocumentId;
                const binId = targetElement.dataset.binId;
                const elementIndexStr = targetElement.dataset.elementIndex;
                const elementIndex = elementIndexStr !== undefined && elementIndexStr !== '' ? parseInt(elementIndexStr, 10) : null;
                if (contextMenuHandler) {
                    contextMenuHandler.showContextMenu(e, pageId, binId, elementIndex);
                }
                return;
            }
            
            if (binElement && !targetElement) {
                // Bin context menu
                const pageId = binElement.dataset.pageId || appState.currentDocumentId;
                const binId = binElement.dataset.binId;
                if (contextMenuHandler) {
                    contextMenuHandler.showBinContextMenu(e, pageId, binId);
                }
                return;
            }
            
            if (pageTabElement) {
                // Page tab context menu
                const pageId = pageTabElement.dataset.pageId;
                if (contextMenuHandler) {
                    contextMenuHandler.showPageContextMenu(e, pageId);
                }
                return;
            }
            
            // Empty area context menu (bins container or app area)
            if (binsContainer && contextMenuHandler) {
                contextMenuHandler.showPageContextMenu(e);
                return;
            }
            
            // If no specific handler, hide any active context menu
            if (contextMenuHandler) {
                contextMenuHandler.hideContextMenu();
            }
        }, true); // Use capture phase
    }
}

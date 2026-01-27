// KeyboardShortcutHandlers.js - Handles keyboard shortcuts
import { getService, SERVICES } from '../core/AppServices.js';

export class KeyboardShortcutHandlers {
    constructor(eventHandler) {
        this.eventHandler = eventHandler;
    }
    
    _getElementManager() {
        return getService(SERVICES.ELEMENT_MANAGER);
    }
    
    _getModalHandler() {
        return getService(SERVICES.MODAL_HANDLER);
    }
    
    _getAppState() {
        return getService(SERVICES.APP_STATE);
    }
    
    /**
     * Setup keyboard shortcuts
     */
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Only trigger if not typing in an input/textarea
            if (e.target.tagName === 'INPUT' || 
                e.target.tagName === 'TEXTAREA' || 
                e.target.closest('.modal')) {
                return;
            }
            
            // Don't trigger if editing a page title
            if (e.target.classList.contains('page-title') && e.target.contentEditable === 'true') {
                return;
            }
            
            // Ctrl+Shift+1-5 for adding element types
            if (e.ctrlKey && e.shiftKey) {
                const types = {
                    '1': 'task',
                    '2': 'header-checkbox',
                    '3': 'header-checkbox',
                    '4': 'multi-checkbox',
                    '5': 'one-time'
                };
                
                if (types[e.key]) {
                    e.preventDefault();
                    // Use active page or first page
                    const appState = this._getAppState();
                    const targetPageId = appState.currentDocumentId || (appState.documents.length > 0 ? appState.documents[0].id : null);
                    const targetBinId = appState.activeGroupId || (appState.documents.find(p => p.id === targetPageId)?.groups?.[0]?.id || null);
                    if (targetPageId && targetBinId) {
                        const elementManager = this._getElementManager();
                        if (elementManager) {
                            elementManager.addElement(targetPageId, targetBinId, types[e.key]);
                        }
                    }
                }
            }
            
            // Ctrl+N for adding element (shows modal)
            if (e.ctrlKey && e.key === 'n') {
                e.preventDefault();
                const appState = this._getAppState();
                const targetPageId = this.eventHandler?.app?.activePageId || (appState.documents.length > 0 ? appState.documents[0].id : null);
                const targetBinId = this.eventHandler?.app?.activeGroupId || (appState.documents.find(p => p.id === targetPageId)?.groups?.[0]?.id || null);
                if (targetPageId && targetBinId) {
                    const modalHandler = this._getModalHandler();
                    if (modalHandler) {
                        modalHandler.showAddElementModal(targetPageId, targetBinId);
                    }
                }
            }
            
            // Ctrl+Z for undo
            if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                if (this.eventHandler?.app?.undoRedoManager) {
                    this.eventHandler.app.undoRedoManager.undo();
                }
            }
            
            // Ctrl+Shift+Z or Ctrl+Y for redo
            if ((e.ctrlKey && e.shiftKey && e.key === 'z') || (e.ctrlKey && e.key === 'y')) {
                e.preventDefault();
                if (this.eventHandler?.app?.undoRedoManager) {
                    this.eventHandler.app.undoRedoManager.redo();
                }
            }
        });
    }
}

// TrashIconHandler.js - Trash icon drag and drop handler
// Extracted from DragDropHandler.js for reusability and maintainability

import { getService, SERVICES } from '../core/AppServices.js';
import { eventBus } from '../core/EventBus.js';
import { EVENTS } from '../core/AppEvents.js';
import { ItemHierarchy } from './ItemHierarchy.js';
import { DragDropHelpers } from './DragDropHelpers.js';

/**
 * TrashIconHandler - Handles trash icon drag and drop operations
 */
export class TrashIconHandler {
    constructor(dragDropHandler) {
        this.dragDropHandler = dragDropHandler;
    }
    
    /**
     * Set up trash icon drag and drop handlers
     */
    setupTrashIcon() {
        const trashIcon = document.getElementById('trash-icon');
        if (!trashIcon) return;
        
        // Ensure trash icon is hidden on initialization
        trashIcon.style.display = 'none';
        
        // Only set up handlers once
        if (trashIcon._handlersSetup) return;
        trashIcon._handlersSetup = true;
        
        trashIcon.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            e.dataTransfer.dropEffect = 'move';
            trashIcon.classList.add('drag-over-trash');
            trashIcon.style.background = 'rgba(220, 53, 69, 1)';
            trashIcon.style.transform = 'scale(1.2)';
        });
        
        trashIcon.addEventListener('dragleave', (e) => {
            e.preventDefault();
            e.stopPropagation();
            trashIcon.classList.remove('drag-over-trash');
            trashIcon.style.background = 'rgba(220, 53, 69, 0.9)';
            trashIcon.style.transform = 'scale(1)';
        });
        
        trashIcon.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            trashIcon.classList.remove('drag-over-trash');
            trashIcon.style.background = 'rgba(220, 53, 69, 0.9)';
            trashIcon.style.transform = 'scale(1)';
            trashIcon.style.display = 'none';
            
            const appState = getService(SERVICES.APP_STATE);
            const dragData = appState.dragData;
            if (!dragData) return;
            
            if (dragData.type === 'element') {
                this._handleElementDelete(dragData);
            } else if (dragData.type === 'bin') {
                this._handleBinDelete(dragData);
            } else if (dragData.type === 'page') {
                this._handlePageDelete(dragData, appState);
            }
            
            appState.dragData = null;
        });
    }
    
    /**
     * Handle element deletion
     * @private
     */
    _handleElementDelete(dragData) {
        const bin = DragDropHelpers.getGroup(dragData.pageId, dragData.binId);
        if (!bin) return;
        
        const items = bin.items || [];
        bin.items = items;
        const rootItems = DragDropHelpers.getRootItems(items);
        
        if (dragData.isChild && dragData.parentElementIndex !== null && dragData.childIndex !== null) {
            // Delete child element
            const parentElement = DragDropHelpers.getRootItemAtIndex(items, dragData.parentElementIndex);
            if (parentElement && Array.isArray(parentElement.childIds)) {
                const childId = parentElement.childIds[dragData.childIndex];
                const itemIndex = ItemHierarchy.buildItemIndex(items);
                const deletedChild = childId ? itemIndex[childId] : null;
                
                // Record undo/redo change
                const undoRedoManager = getService(SERVICES.UNDO_REDO_MANAGER);
                if (undoRedoManager && deletedChild) {
                    const path = undoRedoManager.getElementPath(dragData.pageId, dragData.binId, dragData.parentElementIndex, dragData.childIndex);
                    if (path) {
                        const change = undoRedoManager.createChange('delete', path, null, deletedChild);
                        change.changeId = `${Date.now()}-${Math.random()}`;
                        undoRedoManager.recordChange(change);
                    }
                }
                
                parentElement.childIds.splice(dragData.childIndex, 1);
                if (deletedChild) {
                    const descendantIds = DragDropHelpers.getDescendantIds(deletedChild, itemIndex);
                    const removeIds = new Set([deletedChild.id, ...descendantIds]);
                    bin.items = DragDropHelpers.removeItemsByIds(items, removeIds);
                }
            }
        } else {
            // Delete regular element
            const deletedElement = rootItems[dragData.elementIndex];
            
            // Record undo/redo change
            const undoRedoManager = getService(SERVICES.UNDO_REDO_MANAGER);
            if (undoRedoManager && deletedElement) {
                undoRedoManager.recordElementDelete(dragData.pageId, dragData.binId, dragData.elementIndex, deletedElement);
            }
            
            if (deletedElement) {
                const itemIndex = ItemHierarchy.buildItemIndex(items);
                const descendantIds = DragDropHelpers.getDescendantIds(deletedElement, itemIndex);
                const removeIds = new Set([deletedElement.id, ...descendantIds]);
                bin.items = DragDropHelpers.removeItemsByIds(items, removeIds);
            }
        }
        
        const dataManager = getService(SERVICES.DATA_MANAGER);
        if (dataManager) {
            dataManager.saveData();
        }
        eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
    }
    
    /**
     * Handle bin deletion
     * @private
     */
    _handleBinDelete(dragData) {
        const binManager = getService(SERVICES.BIN_MANAGER);
        if (binManager) {
            binManager.deleteBin(dragData.pageId, dragData.binId);
        }
    }
    
    /**
     * Handle page deletion
     * @private
     */
    _handlePageDelete(dragData, appState) {
        // Delete page (only if more than one page exists)
        if (appState.documents.length > 1) {
            const pageManager = getService(SERVICES.PAGE_MANAGER);
            if (pageManager) {
                pageManager.deletePage(dragData.pageId);
            }
        }
    }
}

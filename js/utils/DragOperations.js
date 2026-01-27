// DragOperations.js - Drag operation utilities
// Extracted from DragDropHandler.js for reusability and maintainability

import { getService, SERVICES } from '../core/AppServices.js';
import { eventBus } from '../core/EventBus.js';
import { EVENTS } from '../core/AppEvents.js';

/**
 * DragOperations - Functions for performing drag operations
 */
export class DragOperations {
    /**
     * Create drag data object
     * @param {string} itemId - Item ID
     * @param {Object} sourceLocation - Source location info
     * @returns {Object} Drag data object
     */
    static createDragData(itemId, sourceLocation) {
        if (!sourceLocation) {
            return null;
        }
        
        return {
            type: 'element',
            pageId: sourceLocation.documentId,
            binId: sourceLocation.groupId,
            elementIndex: sourceLocation.itemIndex,
            isChild: sourceLocation.isChild || false,
            parentElementIndex: sourceLocation.isChild ? sourceLocation.itemIndex : null,
            childIndex: sourceLocation.isChild ? sourceLocation.childIndex : null
        };
    }
    
    /**
     * Start drag operation
     * @param {string} itemId - Item ID
     * @param {Object} sourceLocation - Source location info
     * @param {Object} appState - AppState instance
     * @returns {Object} Drag data object
     */
    static startDrag(itemId, sourceLocation, appState) {
        if (!itemId || !sourceLocation || !appState) {
            return null;
        }
        
        const dragData = DragOperations.createDragData(itemId, sourceLocation);
        appState.dragData = dragData;
        appState.isDragging = true;
        
        return dragData;
    }
    
    /**
     * End drag operation
     * @param {Object} dragData - Drag data object
     * @param {Object} targetLocation - Target location info
     * @param {Object} appState - AppState instance
     */
    static endDrag(dragData, targetLocation, appState) {
        if (appState) {
            appState.isDragging = false;
            appState.dragData = null;
        }
    }
    
    /**
     * Move element by ID
     * @param {string} sourceItemId - Source item ID
     * @param {string|null} targetItemId - Target item ID (null to append to end)
     * @param {string|null} targetParentId - Target parent ID (null for root level)
     * @param {number} targetIndex - Target index position
     * @returns {boolean} True if successful
     */
    static moveElementById(sourceItemId, targetItemId, targetParentId, targetIndex) {
        if (!sourceItemId) {
            console.error('[DragOperations] moveElementById: sourceItemId is required');
            return false;
        }
        
        // Find source item (delegated to caller or use OperationApplier)
        const semanticOpManager = getService(SERVICES.SEMANTIC_OPERATION_MANAGER);
        if (!semanticOpManager) {
            console.error('[DragOperations] SemanticOperationManager not available');
            return false;
        }
        
        // Create MoveOperation
        const operation = semanticOpManager.createOperation('move', sourceItemId, {
            newParentId: targetParentId,
            newIndex: targetIndex
        });
        
        if (!operation) {
            console.error('[DragOperations] Failed to create MoveOperation');
            return false;
        }
        
        // Apply operation
        const result = semanticOpManager.applyOperation(operation);
        if (!result || !result.success) {
            console.error('[DragOperations] Failed to apply MoveOperation');
            return false;
        }
        
        // Record for undo/redo
        const undoRedoManager = getService(SERVICES.UNDO_REDO_MANAGER);
        if (undoRedoManager) {
            undoRedoManager.recordOperation(operation);
        }
        
        // Save data
        const dataManager = getService(SERVICES.DATA_MANAGER);
        if (dataManager) {
            dataManager.saveData();
        }
        
        // Request render
        requestAnimationFrame(() => {
            eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
        });
        
        return true;
    }
    
    /**
     * Validate drag operation
     * @param {Object} dragData - Drag data object
     * @param {Object} targetLocation - Target location info
     * @returns {boolean} True if valid
     */
    static validateDragOperation(dragData, targetLocation) {
        if (!dragData || !targetLocation) {
            return false;
        }
        
        // Can't drop on itself
        if (dragData.pageId === targetLocation.documentId &&
            dragData.binId === targetLocation.groupId &&
            dragData.elementIndex === targetLocation.itemIndex) {
            return false;
        }
        
        return true;
    }
}

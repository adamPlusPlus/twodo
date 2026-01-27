// DragDropHandler.js - Handles drag and drop operations
import { eventBus } from '../core/EventBus.js';
import { EVENTS } from '../core/AppEvents.js';
import { getService, SERVICES, hasService } from '../core/AppServices.js';
import { ItemHierarchy } from '../utils/ItemHierarchy.js';
import { DragOperations } from '../utils/DragOperations.js';
import { dropZoneManager } from '../utils/DropZoneManager.js';
import { dragVisualFeedback } from '../utils/DragVisualFeedback.js';
import { DragValidator } from '../utils/DragValidator.js';
import { OperationApplier } from '../utils/OperationApplier.js';
import { DragDropHelpers } from '../utils/DragDropHelpers.js';
import { ElementMoveHandler } from '../utils/ElementMoveHandler.js';
import { ElementNestHandler } from '../utils/ElementNestHandler.js';
import { TrashIconHandler } from '../utils/TrashIconHandler.js';

export class DragDropHandler {
    constructor() {
        this.moveHandler = new ElementMoveHandler(this);
        this.nestHandler = new ElementNestHandler(this);
        this.trashHandler = new TrashIconHandler(this);
    }
    
    /**
     * Get services
     */
    _getAppState() {
        return getService(SERVICES.APP_STATE);
    }

    _getDocument(pageId) {
        return DragDropHelpers.getDocument(pageId);
    }

    _getGroup(pageId, binId) {
        return DragDropHelpers.getGroup(pageId, binId);
    }
    
    _getUndoRedoManager() {
        return getService(SERVICES.UNDO_REDO_MANAGER);
    }
    
    _getDataManager() {
        return getService(SERVICES.DATA_MANAGER);
    }
    
    _getFormatRendererManager() {
        return getService(SERVICES.FORMAT_RENDERER_MANAGER);
    }
    
    _getRenderer() {
        return getService(SERVICES.RENDERER);
    }

    _getRootItems(items) {
        return DragDropHelpers.getRootItems(items);
    }

    _getRootItemAtIndex(items, elementIndex) {
        return DragDropHelpers.getRootItemAtIndex(items, elementIndex);
    }

    _getFlatInsertIndex(items, rootIndex) {
        return DragDropHelpers.getFlatInsertIndex(items, rootIndex);
    }

    _getChildItemsForGroup(group, parentElement) {
        return DragDropHelpers.getChildItemsForGroup(group, parentElement);
    }

    _getChildItemForGroup(group, parentElement, childIndex) {
        return DragDropHelpers.getChildItemForGroup(group, parentElement, childIndex);
    }

    _getDescendantIds(item, itemIndex) {
        return DragDropHelpers.getDescendantIds(item, itemIndex);
    }

    _removeItemsByIds(items, ids) {
        return DragDropHelpers.removeItemsByIds(items, ids);
    }

    _getItemsByIds(items, ids) {
        return DragDropHelpers.getItemsByIds(items, ids);
    }
    
    /**
     * Find an item by its ID across all documents and groups
     * Returns location info similar to UndoRedoManager.findElementById()
     * @param {string} itemId - Item ID to find
     * @returns {Object|null} Location info: { item, documentId, groupId, itemIndex, isChild, parentItem, group }
     */
    _findItemById(itemId) {
        return DragDropHelpers.findItemById(itemId);
    }
    
    /**
     * Get itemId at given index in a group (for backward compatibility)
     * @param {Object} group - Group object
     * @param {number} index - Root item index
     * @returns {string|null} Item ID or null
     */
    _getItemIdAtIndex(group, index) {
        return DragDropHelpers.getItemIdAtIndex(group, index);
    }
    
    /**
     * Move element using stable IDs (new ID-based method)
     * @param {string} sourceItemId - Source item ID
     * @param {string|null} targetItemId - Target item ID (null to append to end)
     * @param {string|null} targetParentId - Target parent ID (null for root level)
     * @param {number} targetIndex - Target index position
     */
    moveElementById(sourceItemId, targetItemId, targetParentId, targetIndex) {
        if (!sourceItemId) {
            console.error('[DragDropHandler] moveElementById: sourceItemId is required');
            return;
        }
        
        // Find source item
        const sourceLocation = OperationApplier.findItem(sourceItemId);
        if (!sourceLocation) {
            console.error('[DragDropHandler] moveElementById: Source item not found:', sourceItemId);
            return;
        }
        
        // Calculate old location info for operation
        const oldParentId = sourceLocation.item.parentId || null;
        const oldIndex = sourceLocation.itemIndex;
        
        // Get semantic operation manager
        const semanticOpManager = getService(SERVICES.SEMANTIC_OPERATION_MANAGER);
        if (!semanticOpManager) {
            console.error('[DragDropHandler] moveElementById: SemanticOperationManager not available');
            return;
        }
        
        // Create MoveOperation with old location info
        const operation = semanticOpManager.createOperation('move', sourceItemId, {
            newParentId: targetParentId,
            newIndex: targetIndex,
            oldParentId: oldParentId,
            oldIndex: oldIndex
        });
        
        if (!operation) {
            console.error('[DragDropHandler] moveElementById: Failed to create MoveOperation');
            return;
        }
        
        // Apply operation
        const result = semanticOpManager.applyOperation(operation);
        if (!result || !result.success) {
            console.error('[DragDropHandler] moveElementById: Failed to apply MoveOperation');
            return;
        }
        
        // Record for undo/redo
        const undoRedoManager = this._getUndoRedoManager();
        if (undoRedoManager) {
            undoRedoManager.recordOperation(operation);
        }
        
        // Save data
        const dataManager = this._getDataManager();
        if (dataManager) {
            dataManager.saveData();
        }
        
        // Request render
        requestAnimationFrame(() => {
            eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
        });
    }
    
    /**
     * Move element (backward-compatible index-based method)
     * Converts indices to IDs internally and calls moveElementById()
     * @deprecated Use moveElementById() with item IDs instead
     */
    moveElement(sourcePageId, sourceBinId, sourceElementIndex, targetPageId, targetBinId, targetElementIndex, isChild = false, parentElementIndex = null, childIndex = null) {
        this.moveHandler.moveElement(sourcePageId, sourceBinId, sourceElementIndex, targetPageId, targetBinId, targetElementIndex, isChild, parentElementIndex, childIndex);
    }

    reorderChildElement(pageId, binId, parentElementIndex, sourceChildIndex, targetChildIndex) {
        const document = DragDropHelpers.getDocument(pageId);
        if (!document) {
            console.error('Page not found:', pageId);
            return;
        }

        const bin = DragDropHelpers.getGroup(pageId, binId);
        if (!bin) {
            console.error('Bin not found:', binId);
            return;
        }

        const parentElement = DragDropHelpers.getRootItemAtIndex(bin.items, parentElementIndex);
        if (!parentElement || !Array.isArray(parentElement.childIds) || !parentElement.childIds[sourceChildIndex]) {
            console.error('Parent element or child not found:', parentElementIndex, sourceChildIndex);
            return;
        }

        // Remove the child from its current position
        const childId = parentElement.childIds.splice(sourceChildIndex, 1)[0];

        // Insert it at the new position
        // Adjust target index if moving to a higher position (since we already removed the source)
        let adjustedTargetIndex = targetChildIndex;
        if (sourceChildIndex < targetChildIndex) {
            adjustedTargetIndex -= 1;
        }

        // Ensure index is valid
        adjustedTargetIndex = Math.max(0, Math.min(adjustedTargetIndex, parentElement.childIds.length));
        parentElement.childIds.splice(adjustedTargetIndex, 0, childId);

        // Record undo/redo change
        const undoRedoManager = this._getUndoRedoManager();
        if (undoRedoManager) {
            const itemIndex = ItemHierarchy.buildItemIndex(bin.items);
            const childElement = itemIndex[childId];
            undoRedoManager.recordChildReorder(
                pageId, binId, parentElementIndex, sourceChildIndex, adjustedTargetIndex,
                JSON.parse(JSON.stringify(childElement))
            );
        }

        const dataManager = this._getDataManager();
        if (dataManager) {
            dataManager.saveData();
        }
        
        // Preserve format view during re-render to prevent flicker
        const formatRendererManager = this._getFormatRendererManager();
        const pageFormat = formatRendererManager?.getPageFormat(pageId);
        if (pageFormat) {
            const renderer = this._getRenderer();
            if (renderer && renderer.getRenderer) {
                renderer.getRenderer()._preservingFormat = true;
            }
        }
        
        requestAnimationFrame(() => {
            eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
        });
    }

    nestElement(sourcePageId, sourceBinId, sourceElementIndex, targetPageId, targetBinId, targetElementIndex, isChild = false, parentElementIndex = null, childIndex = null, elementToNest = null) {
        this.nestHandler.nestElement(sourcePageId, sourceBinId, sourceElementIndex, targetPageId, targetBinId, targetElementIndex, isChild, parentElementIndex, childIndex, elementToNest);
    }
    
    /**
     * Set up trash icon drag and drop handlers
     */
    setupTrashIcon() {
        this.trashHandler.setupTrashIcon();
    }
}


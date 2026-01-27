// ElementMoveHandler.js - Element move operation handler
// Extracted from DragDropHandler.js for reusability and maintainability

import { getService, SERVICES } from '../core/AppServices.js';
import { eventBus } from '../core/EventBus.js';
import { EVENTS } from '../core/AppEvents.js';
import { ItemHierarchy } from './ItemHierarchy.js';
import { DragDropHelpers } from './DragDropHelpers.js';

/**
 * ElementMoveHandler - Handles moving elements between locations
 */
export class ElementMoveHandler {
    constructor(dragDropHandler) {
        this.dragDropHandler = dragDropHandler;
    }
    
    /**
     * Move element (backward-compatible index-based method)
     * Converts indices to IDs internally and calls moveElementById()
     * @deprecated Use moveElementById() with item IDs instead
     */
    moveElement(sourcePageId, sourceBinId, sourceElementIndex, targetPageId, targetBinId, targetElementIndex, isChild = false, parentElementIndex = null, childIndex = null) {
        const appState = getService(SERVICES.APP_STATE);
        const sourcePage = appState.documents.find(p => p.id === sourcePageId);
        if (!sourcePage) {
            console.error('Source page not found:', sourcePageId);
            return;
        }
        
        const sourceBin = DragDropHelpers.getGroup(sourcePageId, sourceBinId);
        if (!sourceBin) {
            console.error('Source bin not found:', sourceBinId);
            return;
        }
        let sourceItems = sourceBin.items || [];
        sourceBin.items = sourceItems;
        const sourceRootItems = DragDropHelpers.getRootItems(sourceItems);
        const sourceItemIndex = ItemHierarchy.buildItemIndex(sourceItems);
        
        let element;
        let sourceItemId = null;
        
        // Handle children being moved
        if (isChild && parentElementIndex !== null && childIndex !== null) {
            const parentElement = DragDropHelpers.getRootItemAtIndex(sourceItems, parentElementIndex);
            const childItems = parentElement ? ItemHierarchy.getChildItems(parentElement, sourceItemIndex) : [];
            if (!parentElement || !childItems[childIndex]) {
                console.error('Source child element not found:', childIndex, 'in parent', parentElementIndex);
                return;
            }
            element = childItems[childIndex];
            sourceItemId = element.id;
        } else {
            // Regular element move
            if (!sourceRootItems[sourceElementIndex]) {
                console.error('Source element not found:', sourceElementIndex, 'in bin', sourceBinId);
                return;
            }
            element = sourceRootItems[sourceElementIndex];
            sourceItemId = element.id;
        }
        
        if (!sourceItemId) {
            console.error('[ElementMoveHandler] moveElement: Could not determine sourceItemId');
            return;
        }

        const descendantIds = DragDropHelpers.getDescendantIds(element, sourceItemIndex);
        const movingIds = new Set([element.id, ...descendantIds]);
        const movingItems = DragDropHelpers.getItemsByIds(sourceItems, movingIds);
        sourceItems = DragDropHelpers.removeItemsByIds(sourceItems, movingIds);
        sourceBin.items = sourceItems;
        
        // Add to target
        const targetPage = appState.documents.find(p => p.id === targetPageId);
        if (!targetPage) {
            console.error('Target page not found:', targetPageId);
            // Re-add element to source if target is invalid
            this._restoreToSource(sourceItems, sourceBin, element, isChild, parentElementIndex, childIndex, sourceElementIndex, movingItems);
            return;
        }
        
        const targetBin = targetPage.groups?.find(b => b.id === targetBinId);
        if (!targetBin) {
            console.error('Target bin not found:', targetBinId);
            // Re-add element to source if target is invalid
            this._restoreToSource(sourceItems, sourceBin, element, isChild, parentElementIndex, childIndex, sourceElementIndex, movingItems);
            return;
        }
        const targetItems = targetBin.items || [];
        targetBin.items = targetItems;
        
        // Adjust target index if moving within same bin
        const adjustedTargetIndex = this._adjustTargetIndex(
            sourcePageId, targetPageId, sourceBinId, targetBinId,
            sourceElementIndex, targetElementIndex, isChild, parentElementIndex, targetItems
        );
        
        // Capture the old position BEFORE modifying the DOM
        const oldPosition = this._captureOldPosition(
            sourcePageId, sourceBinId, sourceElementIndex, isChild, parentElementIndex, childIndex
        );
        
        const insertFlatIndex = DragDropHelpers.getFlatInsertIndex(targetItems, adjustedTargetIndex);
        targetItems.splice(insertFlatIndex, 0, ...movingItems);
        targetBin.items = targetItems;
        
        // Record undo/redo change
        this._recordUndoRedo(
            sourcePageId, sourceBinId, sourceElementIndex, targetPageId, targetBinId,
            adjustedTargetIndex, isChild, parentElementIndex, childIndex, element
        );
        
        // Track which element is being moved for animation
        this._trackMovedElement(
            targetPageId, targetBinId, adjustedTargetIndex, element, sourcePageId,
            sourceBinId, sourceElementIndex, oldPosition
        );
        
        // Save data and request render
        this._finalizeMove(targetPageId);
    }
    
    /**
     * Restore element to source if move fails
     * @private
     */
    _restoreToSource(sourceItems, sourceBin, element, isChild, parentElementIndex, childIndex, sourceElementIndex, movingItems) {
        if (isChild && parentElementIndex !== null) {
            const parentElement = DragDropHelpers.getRootItemAtIndex(sourceItems, parentElementIndex);
            if (parentElement) {
                if (!Array.isArray(parentElement.childIds)) parentElement.childIds = [];
                parentElement.childIds.splice(childIndex, 0, element.id);
                element.parentId = parentElement.id;
            }
            const insertIndex = DragDropHelpers.getFlatInsertIndex(sourceItems, sourceElementIndex);
            sourceItems.splice(insertIndex, 0, ...movingItems);
        } else {
            const insertIndex = DragDropHelpers.getFlatInsertIndex(sourceItems, sourceElementIndex);
            sourceItems.splice(insertIndex, 0, ...movingItems);
        }
        sourceBin.items = sourceItems;
    }
    
    /**
     * Adjust target index based on move context
     * @private
     */
    _adjustTargetIndex(sourcePageId, targetPageId, sourceBinId, targetBinId, sourceElementIndex, targetElementIndex, isChild, parentElementIndex, targetItems) {
        let adjustedTargetIndex = targetElementIndex;
        
        if (isChild && parentElementIndex !== null) {
            // When un-nesting a child element, no adjustment needed
        } else if (!isChild && sourcePageId === targetPageId && sourceBinId === targetBinId) {
            // Normal move within same bin: place ABOVE target element
            adjustedTargetIndex = targetElementIndex;
        }
        
        // Ensure index is valid
        const maxValidIndex = targetItems.length;
        adjustedTargetIndex = Math.max(0, Math.min(adjustedTargetIndex, maxValidIndex));
        
        // Special case: when un-nesting a child
        if (isChild && parentElementIndex !== null && targetElementIndex === parentElementIndex + 1) {
            if (adjustedTargetIndex !== targetElementIndex && adjustedTargetIndex === parentElementIndex) {
                adjustedTargetIndex = targetItems.length;
            }
        }
        
        return adjustedTargetIndex;
    }
    
    /**
     * Capture old position for animation
     * @private
     */
    _captureOldPosition(sourcePageId, sourceBinId, sourceElementIndex, isChild, parentElementIndex, childIndex) {
        let oldPosition = null;
        
        if (isChild && parentElementIndex !== null) {
            // For nested children, find the parent element first
            const parentElement = document.querySelector(`[data-page-id="${sourcePageId}"][data-bin-id="${sourceBinId}"][data-element-index="${parentElementIndex}"]`);
            if (parentElement) {
                const childElement = parentElement.querySelector(`[data-child-index="${childIndex}"]`);
                if (childElement) {
                    const rect = childElement.getBoundingClientRect();
                    oldPosition = { top: rect.top, left: rect.left };
                }
            }
        } else {
            // For regular items, find by source index
            const sourceElement = document.querySelector(`[data-page-id="${sourcePageId}"][data-bin-id="${sourceBinId}"][data-element-index="${sourceElementIndex}"]:not([data-is-child="true"])`);
            if (sourceElement) {
                const rect = sourceElement.getBoundingClientRect();
                oldPosition = { top: rect.top, left: rect.left };
            }
        }
        
        return oldPosition;
    }
    
    /**
     * Record undo/redo change
     * @private
     */
    _recordUndoRedo(sourcePageId, sourceBinId, sourceElementIndex, targetPageId, targetBinId, adjustedTargetIndex, isChild, parentElementIndex, childIndex, element) {
        const undoRedoManager = getService(SERVICES.UNDO_REDO_MANAGER);
        if (undoRedoManager) {
            if (isChild && parentElementIndex !== null) {
                // Child element being un-nested
                undoRedoManager.recordElementMove(
                    sourcePageId, sourceBinId, parentElementIndex,
                    targetPageId, targetBinId, adjustedTargetIndex,
                    JSON.parse(JSON.stringify(element))
                );
            } else {
                // Regular element move
                undoRedoManager.recordElementMove(
                    sourcePageId, sourceBinId, sourceElementIndex,
                    targetPageId, targetBinId, adjustedTargetIndex,
                    JSON.parse(JSON.stringify(element))
                );
            }
        }
    }
    
    /**
     * Track moved element for animation
     * @private
     */
    _trackMovedElement(targetPageId, targetBinId, adjustedTargetIndex, element, sourcePageId, sourceBinId, sourceElementIndex, oldPosition) {
        const appState = getService(SERVICES.APP_STATE);
        const elementText = element.text ? element.text.substring(0, 50) : '';
        const elementType = element.type || 'unknown';
        const elementId = `${targetPageId}-${targetBinId}-${adjustedTargetIndex}-${elementType}-${elementText}`;
        
        appState.lastMovedElement = {
            pageId: targetPageId,
            binId: targetBinId,
            elementIndex: adjustedTargetIndex,
            element: element,
            uniqueId: elementId,
            oldPageId: sourcePageId,
            oldBinId: sourceBinId,
            oldElementIndex: sourceElementIndex,
            oldPosition: oldPosition
        };
    }
    
    /**
     * Finalize move operation
     * @private
     */
    _finalizeMove(targetPageId) {
        const dataManager = getService(SERVICES.DATA_MANAGER);
        if (dataManager) {
            dataManager.saveData();
        }
        
        // Preserve format view during re-render to prevent flicker
        const formatRendererManager = getService(SERVICES.FORMAT_RENDERER_MANAGER);
        const pageFormat = formatRendererManager?.getPageFormat(targetPageId);
        if (pageFormat) {
            const renderer = getService(SERVICES.RENDERER);
            if (renderer && renderer.getRenderer) {
                renderer.getRenderer()._preservingFormat = true;
            }
        }
        
        // Use requestAnimationFrame to ensure smooth animation
        requestAnimationFrame(() => {
            eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
        });
    }
}

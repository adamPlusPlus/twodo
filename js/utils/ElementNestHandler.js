// ElementNestHandler.js - Element nesting operation handler
// Extracted from DragDropHandler.js for reusability and maintainability

import { getService, SERVICES } from '../core/AppServices.js';
import { eventBus } from '../core/EventBus.js';
import { EVENTS } from '../core/AppEvents.js';
import { ItemHierarchy } from './ItemHierarchy.js';
import { DragDropHelpers } from './DragDropHelpers.js';
import { DragValidator } from './DragValidator.js';

/**
 * ElementNestHandler - Handles nesting elements into other elements
 */
export class ElementNestHandler {
    constructor(dragDropHandler) {
        this.dragDropHandler = dragDropHandler;
    }
    
    /**
     * Nest an element into another element
     */
    nestElement(sourcePageId, sourceBinId, sourceElementIndex, targetPageId, targetBinId, targetElementIndex, isChild = false, parentElementIndex = null, childIndex = null, elementToNest = null) {
        const sourcePage = DragDropHelpers.getDocument(sourcePageId);
        if (!sourcePage) {
            console.error('Source page not found:', sourcePageId);
            return;
        }
        
        const sourceBin = DragDropHelpers.getGroup(sourcePageId, sourceBinId);
        if (!sourceBin) {
            console.error('Source bin not found:', sourceBinId);
            return;
        }
        const sourceItems = sourceBin.items || [];
        sourceBin.items = sourceItems;
        
        const targetPage = DragDropHelpers.getDocument(targetPageId);
        if (!targetPage) {
            console.error('Target page not found:', targetPageId);
            return;
        }
        
        const targetBin = DragDropHelpers.getGroup(targetPageId, targetBinId);
        if (!targetBin) {
            console.error('Target bin not found:', targetBinId);
            return;
        }
        const targetItems = targetBin.items || [];
        targetBin.items = targetItems;
        const sourceRootItems = DragDropHelpers.getRootItems(sourceItems);
        const targetRootItems = DragDropHelpers.getRootItems(targetItems);
        const sourceItemIndex = ItemHierarchy.buildItemIndex(sourceItems);
        const targetItemIndex = ItemHierarchy.buildItemIndex(targetItems);
        const isSameGroup = sourcePageId === targetPageId && sourceBinId === targetBinId;
        
        if (!targetRootItems[targetElementIndex]) {
            console.error('Target item not found:', targetElementIndex, 'in bin', targetBinId);
            return;
        }
        
        let element;
        
        // If elementToNest is provided, use it directly
        if (elementToNest) {
            element = elementToNest;
        } else if (isChild && parentElementIndex !== null && childIndex !== null) {
            // Handle children being nested
            const parentElement = DragDropHelpers.getRootItemAtIndex(sourceItems, parentElementIndex);
            if (!parentElement) {
                console.error('Source parent element not found at index:', parentElementIndex, 'in bin', sourceBinId);
                return;
            }
            const childElement = DragDropHelpers.getChildItemForGroup(sourceBin, parentElement, childIndex);
            if (!childElement) {
                console.error('Source child element not found:', childIndex, 'in parent', parentElementIndex);
                return;
            }
            element = childElement;
            if (!Array.isArray(parentElement.childIds)) parentElement.childIds = [];
            parentElement.childIds.splice(childIndex, 1);
            element.parentId = null;
        } else {
            // Regular element nesting
            if (!sourceRootItems[sourceElementIndex]) {
                console.error('Source element not found:', sourceElementIndex, 'in bin', sourceBinId);
                return;
            }
            element = sourceRootItems[sourceElementIndex];
        }

        const descendantIds = DragDropHelpers.getDescendantIds(element, sourceItemIndex);
        const movingIds = new Set([element.id, ...descendantIds]);
        let movingItems = DragDropHelpers.getItemsByIds(sourceItems, movingIds);
        if (movingItems.length === 0) {
            movingItems = [element];
        }
        if (!isSameGroup) {
            sourceItems = DragDropHelpers.removeItemsByIds(sourceItems, movingIds);
            sourceBin.items = sourceItems;
        }

        const restoreToSource = () => {
            if (!isSameGroup) {
                const insertIndex = DragDropHelpers.getFlatInsertIndex(sourceItems, sourceElementIndex);
                sourceItems.splice(insertIndex, 0, ...movingItems);
                sourceBin.items = sourceItems;
            }
        };
        
        // Adjust target index if source item was removed from items array and was before target
        let adjustedTargetElementIndex = targetElementIndex;
        if (!isChild && sourcePageId === targetPageId && sourceBinId === targetBinId && sourceElementIndex < targetElementIndex) {
            adjustedTargetElementIndex = targetElementIndex - 1;
        }
        
        const targetElement = targetRootItems[adjustedTargetElementIndex];
        if (!targetElement) {
            console.error('Target element not found at index:', targetElementIndex, 'in bin', targetBinId);
            // Re-add element to source if target is invalid
            if (isChild && parentElementIndex !== null) {
                const parentElement = DragDropHelpers.getRootItemAtIndex(sourceItems, parentElementIndex);
                if (parentElement) {
                    if (!Array.isArray(parentElement.childIds)) parentElement.childIds = [];
                    parentElement.childIds.splice(childIndex, 0, element.id);
                    element.parentId = parentElement.id;
                }
            }
            restoreToSource();
            return;
        }
        
        // Validate nesting operation
        const validation = DragValidator.validateDragTarget(element.id, targetElement.id, targetItemIndex);
        if (!validation.valid) {
            console.error(`Cannot nest: ${validation.reason}`);
            // Re-add element to source
            if (isChild && parentElementIndex !== null) {
                const parentElement = DragDropHelpers.getRootItemAtIndex(sourceItems, parentElementIndex);
                if (parentElement) {
                    if (!Array.isArray(parentElement.childIds)) parentElement.childIds = [];
                    parentElement.childIds.splice(childIndex, 0, element.id);
                    element.parentId = parentElement.id;
                }
            }
            restoreToSource();
            return;
        }
        
        // Enforce one-level limit: check if any existing children have their own children
        if (Array.isArray(targetElement.childIds) && targetElement.childIds.length > 0) {
            const targetChildren = ItemHierarchy.getChildItems(targetElement, targetItemIndex);
            const hasNestedChildren = targetChildren.some(child => (child.childIds || []).length > 0);
            if (hasNestedChildren) {
                console.error('Cannot nest: target has children with their own children (one-level limit enforced)');
                // Re-add element to source
                if (isChild && parentElementIndex !== null) {
                    const parentElement = DragDropHelpers.getRootItemAtIndex(sourceItems, parentElementIndex);
                    if (parentElement) {
                        if (!Array.isArray(parentElement.childIds)) parentElement.childIds = [];
                        parentElement.childIds.splice(childIndex, 0, element.id);
                        element.parentId = parentElement.id;
                    }
                }
                restoreToSource();
                return;
            }
        }
        
        // Initialize childIds if it doesn't exist
        if (!Array.isArray(targetElement.childIds)) {
            targetElement.childIds = [];
        }
        
        // Add to target's children
        targetElement.childIds.push(element.id);
        element.parentId = targetElement.id;

        if (!isSameGroup) {
            const targetFlatIndex = targetItems.findIndex(item => item.id === targetElement.id);
            const insertAt = targetFlatIndex === -1 ? targetItems.length : targetFlatIndex + 1;
            targetItems.splice(insertAt, 0, ...movingItems);
            targetBin.items = targetItems;
        }
        
        // Save data and request render
        this._finalizeNest(targetPageId);
    }
    
    /**
     * Finalize nest operation
     * @private
     */
    _finalizeNest(targetPageId) {
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

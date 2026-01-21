// DragDropHandler.js - Handles drag and drop operations
import { eventBus } from '../core/EventBus.js';
import { EVENTS } from '../core/AppEvents.js';
import { getService, SERVICES, hasService } from '../core/AppServices.js';
import { ItemHierarchy } from '../utils/ItemHierarchy.js';

export class DragDropHandler {
    constructor() {
    }
    
    /**
     * Get services
     */
    _getAppState() {
        return getService(SERVICES.APP_STATE);
    }

    _getDocument(pageId) {
        const appState = this._getAppState();
        return appState.documents?.find(page => page.id === pageId) || null;
    }

    _getGroup(pageId, binId) {
        const document = this._getDocument(pageId);
        const group = document?.groups?.find(bin => bin.id === binId) || null;
        if (!group) return null;
        const items = group.items || [];
        group.items = items;
        return group;
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
        return ItemHierarchy.getRootItems(items);
    }

    _getRootItemAtIndex(items, elementIndex) {
        return ItemHierarchy.getRootItemAtIndex(items, elementIndex);
    }

    _getFlatInsertIndex(items, rootIndex) {
        if (rootIndex <= 0) return 0;
        let seenRoots = 0;
        for (let i = 0; i < items.length; i++) {
            if (!items[i]?.parentId) {
                if (seenRoots === rootIndex) {
                    return i;
                }
                seenRoots += 1;
            }
        }
        return items.length;
    }

    _getChildItemsForGroup(group, parentElement) {
        const itemIndex = ItemHierarchy.buildItemIndex(group?.items || []);
        return ItemHierarchy.getChildItems(parentElement, itemIndex);
    }

    _getChildItemForGroup(group, parentElement, childIndex) {
        const children = this._getChildItemsForGroup(group, parentElement);
        return children[childIndex] || null;
    }

    _getDescendantIds(item, itemIndex) {
        const descendants = [];
        const walk = (node) => {
            const children = ItemHierarchy.getChildItems(node, itemIndex);
            children.forEach(child => {
                descendants.push(child.id);
                walk(child);
            });
        };
        walk(item);
        return descendants;
    }

    _removeItemsByIds(items, ids) {
        const idSet = ids instanceof Set ? ids : new Set(ids);
        return (items || []).filter(item => !idSet.has(item.id));
    }

    _getItemsByIds(items, ids) {
        const idSet = ids instanceof Set ? ids : new Set(ids);
        return (items || []).filter(item => idSet.has(item.id));
    }
    
    moveElement(sourcePageId, sourceBinId, sourceElementIndex, targetPageId, targetBinId, targetElementIndex, isChild = false, parentElementIndex = null, childIndex = null) {
        const appState = this._getAppState();
        const sourcePage = appState.documents.find(p => p.id === sourcePageId);
        if (!sourcePage) {
            console.error('Source page not found:', sourcePageId);
            return;
        }
        
        const sourceBin = sourcePage.groups?.find(b => b.id === sourceBinId);
        if (!sourceBin) {
            console.error('Source bin not found:', sourceBinId);
            return;
        }
        let sourceItems = sourceBin.items || [];
        sourceBin.items = sourceItems;
        const sourceRootItems = this._getRootItems(sourceItems);
        const sourceItemIndex = ItemHierarchy.buildItemIndex(sourceItems);
        
        let element;
        
        // Handle children being moved
        if (isChild && parentElementIndex !== null && childIndex !== null) {
            const parentElement = this._getRootItemAtIndex(sourceItems, parentElementIndex);
            const childItems = parentElement ? ItemHierarchy.getChildItems(parentElement, sourceItemIndex) : [];
            if (!parentElement || !childItems[childIndex]) {
                console.error('Source child element not found:', childIndex, 'in parent', parentElementIndex);
                return;
            }
            element = childItems[childIndex];
            if (!Array.isArray(parentElement.childIds)) {
                parentElement.childIds = [];
            }
            parentElement.childIds.splice(childIndex, 1);
            element.parentId = null;
        } else {
            // Regular element move
            if (!sourceRootItems[sourceElementIndex]) {
                console.error('Source element not found:', sourceElementIndex, 'in bin', sourceBinId);
                return;
            }
            element = sourceRootItems[sourceElementIndex];
        }

        const descendantIds = this._getDescendantIds(element, sourceItemIndex);
        const movingIds = new Set([element.id, ...descendantIds]);
        const movingItems = this._getItemsByIds(sourceItems, movingIds);
        sourceItems = this._removeItemsByIds(sourceItems, movingIds);
        sourceBin.items = sourceItems;
        
        // Add to target
        const targetPage = appState.documents.find(p => p.id === targetPageId);
        if (!targetPage) {
            console.error('Target page not found:', targetPageId);
            // Re-add element to source if target is invalid
            if (isChild && parentElementIndex !== null) {
                const parentElement = this._getRootItemAtIndex(sourceItems, parentElementIndex);
                if (parentElement) {
                    if (!Array.isArray(parentElement.childIds)) parentElement.childIds = [];
                    parentElement.childIds.splice(childIndex, 0, element.id);
                    element.parentId = parentElement.id;
                }
                const insertIndex = this._getFlatInsertIndex(sourceItems, sourceElementIndex);
                sourceItems.splice(insertIndex, 0, ...movingItems);
            } else {
                const insertIndex = this._getFlatInsertIndex(sourceItems, sourceElementIndex);
                sourceItems.splice(insertIndex, 0, ...movingItems);
            }
            sourceBin.items = sourceItems;
            return;
        }
        
        const targetBin = targetPage.groups?.find(b => b.id === targetBinId);
        if (!targetBin) {
            console.error('Target bin not found:', targetBinId);
            // Re-add element to source if target is invalid
            if (isChild && parentElementIndex !== null) {
                const parentElement = this._getRootItemAtIndex(sourceItems, parentElementIndex);
                if (parentElement) {
                    if (!Array.isArray(parentElement.childIds)) parentElement.childIds = [];
                    parentElement.childIds.splice(childIndex, 0, element.id);
                    element.parentId = parentElement.id;
                }
                const insertIndex = this._getFlatInsertIndex(sourceItems, sourceElementIndex);
                sourceItems.splice(insertIndex, 0, ...movingItems);
            } else {
                const insertIndex = this._getFlatInsertIndex(sourceItems, sourceElementIndex);
                sourceItems.splice(insertIndex, 0, ...movingItems);
            }
            sourceBin.items = sourceItems;
            return;
        }
        const targetItems = targetBin.items || [];
        targetBin.items = targetItems;
        
        // Adjust target index if moving within same bin
        // User wants items to be placed ABOVE the target item
        let adjustedTargetIndex = targetElementIndex;
        if (isChild && parentElementIndex !== null) {
            // When un-nesting a child element:
            // - The item is removed from parent's children array (doesn't affect items array)
            // - We need to adjust if the parent's position in items array is before the target
            // - If parent is at index X and target is at index Y where X < Y, we don't need to adjust
            //   because removing from children doesn't change the items array indices
            // - However, if we're moving to a position after the parent, we need to account for it
            // Actually, since we're removing from children (not items), we only need to adjust
            // if the parent item itself was removed, which doesn't happen here.
            // So no adjustment needed for un-nesting children.
            // IMPORTANT: When un-nesting, we're inserting into the items array, so we can insert
            // at any valid index (0 to items.length). No adjustment needed.
        } else if (!isChild && sourcePageId === targetPageId && sourceBinId === targetBinId) {
            // Normal move within same bin: place ABOVE target element
            // splice inserts BEFORE the specified index, so to place above target:
            // - If source is before target: after removal, target shifts down by 1, so we insert at targetElementIndex
            //   (which becomes targetElementIndex-1 after removal, placing it above the shifted target)
            // - If source is after target: insert at targetElementIndex (places above target)
            // However, we need to account for the fact that we remove first, then insert
            if (sourceElementIndex < targetElementIndex) {
                // Source before target: after removal, target is at (targetElementIndex - 1)
                // To place above the shifted target, we insert at (targetElementIndex - 1)
                // But we're inserting AFTER removal, so we use targetElementIndex (which is correct)
                adjustedTargetIndex = targetElementIndex;
            } else {
                // Source after target: target position unchanged, insert at targetElementIndex (places above)
                adjustedTargetIndex = targetElementIndex;
            }
        }
        
        // Ensure index is valid
        // For splice, we can insert at any index from 0 to array.length (inclusive)
        // array.length is valid and will append to the end
        const maxValidIndex = targetItems.length; // Can insert at this index (appends to end)
        const beforeClamp = adjustedTargetIndex;
        adjustedTargetIndex = Math.max(0, Math.min(adjustedTargetIndex, maxValidIndex));
        
        // Special case: when un-nesting a child, if we calculated targetIndex as parentIndex + 1
        // but it got clamped, we need to allow insertion at items.length (which is valid for splice)
        // This happens when the parent is the last element in the array
        if (isChild && parentElementIndex !== null && targetElementIndex === parentElementIndex + 1) {
            // We want to place after the parent (parentIndex + 1)
            // If it was clamped, use items.length to append after the parent
            if (adjustedTargetIndex !== targetElementIndex && adjustedTargetIndex === parentElementIndex) {
                adjustedTargetIndex = targetItems.length;
            }
        }
        
        // Capture the old position BEFORE modifying the DOM
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
        
        const insertFlatIndex = this._getFlatInsertIndex(targetItems, adjustedTargetIndex);
        targetItems.splice(insertFlatIndex, 0, ...movingItems);
        targetBin.items = targetItems;
        
        // Record undo/redo change
        const undoRedoManager = this._getUndoRedoManager();
        if (undoRedoManager) {
            if (isChild && parentElementIndex !== null) {
                // Child element being un-nested - record as move from child to element
                // For now, treat it as a regular element move from the parent's position
                // (the actual implementation is complex, so we'll record it as a move)
                undoRedoManager.recordElementMove(
                    sourcePageId, sourceBinId, parentElementIndex, // Source (parent position)
                    targetPageId, targetBinId, adjustedTargetIndex, // Target
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
        
        // Track which element is being moved for animation
        // Create a unique identifier using element content + old position
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
            oldPosition: oldPosition // Store the captured old position
        };
        // Log resulting structure
        const resultBin = this._getGroup(targetPageId, targetBinId);
        const resultElement = resultBin ? this._getRootItemAtIndex(resultBin.items, adjustedTargetIndex) : null;
        const resultText = resultElement?.text || 'N/A';
        
        // If we un-nested a child, check if parent still has children
        let parentChildrenInfo = 'N/A';
        if (isChild && parentElementIndex !== null) {
            const sourceBin = this._getGroup(sourcePageId, sourceBinId);
            const parentElement = sourceBin ? this._getRootItemAtIndex(sourceBin.items, parentElementIndex) : null;
            if (parentElement) {
                const childrenCount = parentElement.childIds?.length || 0;
                parentChildrenInfo = `${childrenCount} child${childrenCount !== 1 ? 'ren' : ''} (${parentElement.childIds ? 'ids exist' : 'no ids'})`;
            }
        }
        
        const dataManager = this._getDataManager();
        if (dataManager) {
            dataManager.saveData();
        }
        // Preserve format view during re-render to prevent flicker
        const formatRendererManager = this._getFormatRendererManager();
        const pageFormat = formatRendererManager?.getPageFormat(targetPageId);
        if (pageFormat) {
            const renderer = this._getRenderer();
            if (renderer && renderer.getRenderer) {
                renderer.getRenderer()._preservingFormat = true;
            }
        }
        
        // Use requestAnimationFrame to ensure smooth animation
        requestAnimationFrame(() => {
            eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
        });
    }

    reorderChildElement(pageId, binId, parentElementIndex, sourceChildIndex, targetChildIndex) {
        const document = this._getDocument(pageId);
        if (!document) {
            console.error('Page not found:', pageId);
            return;
        }

        const bin = this._getGroup(pageId, binId);
        if (!bin) {
            console.error('Bin not found:', binId);
            return;
        }

        const parentElement = this._getRootItemAtIndex(bin.items, parentElementIndex);
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

        // Log resulting structure
        const parentText = parentElement?.text || 'N/A';
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
        
        const sourcePage = this._getDocument(sourcePageId);
        if (!sourcePage) {
            console.error('Source page not found:', sourcePageId);
            return;
        }
        
        const sourceBin = this._getGroup(sourcePageId, sourceBinId);
        if (!sourceBin) {
            console.error('Source bin not found:', sourceBinId);
            return;
        }
        const sourceItems = sourceBin.items || [];
        sourceBin.items = sourceItems;
        
        // Reuse appState from line 316
        const targetPage = this._getDocument(targetPageId);
        if (!targetPage) {
            console.error('Target page not found:', targetPageId);
            return;
        }
        
        const targetBin = this._getGroup(targetPageId, targetBinId);
        if (!targetBin) {
            console.error('Target bin not found:', targetBinId);
            return;
        }
        const targetItems = targetBin.items || [];
        targetBin.items = targetItems;
        const sourceRootItems = this._getRootItems(sourceItems);
        const targetRootItems = this._getRootItems(targetItems);
        const sourceItemIndex = ItemHierarchy.buildItemIndex(sourceItems);
        const targetItemIndex = ItemHierarchy.buildItemIndex(targetItems);
        const isSameGroup = sourcePageId === targetPageId && sourceBinId === targetBinId;
        
        if (!targetRootItems[targetElementIndex]) {
            console.error('Target item not found:', targetElementIndex, 'in bin', targetBinId);
            return;
        }
        
        let element;
        let sourceParentText = 'N/A';
        let sourceChildText = 'N/A';
        
        // If elementToNest is provided, use it directly (for un-nesting then nesting in one operation)
        if (elementToNest) {
            element = elementToNest;
            sourceChildText = element.text || 'N/A';
        } else if (isChild && parentElementIndex !== null && childIndex !== null) {
            // Handle children being nested
            const parentElement = this._getRootItemAtIndex(sourceItems, parentElementIndex);
            if (!parentElement) {
                console.error('Source parent element not found at index:', parentElementIndex, 'in bin', sourceBinId);
                console.error('Available items:', sourceItems.map((e, i) => `${i}: "${e.text || 'N/A'}"`).join(', '));
                return;
            }
            sourceParentText = parentElement.text || 'N/A';
            const childElement = this._getChildItemForGroup(sourceBin, parentElement, childIndex);
            if (!childElement) {
                console.error('Source child element not found:', {
                    childIndex: childIndex,
                    parentIndex: parentElementIndex,
                    parentText: sourceParentText,
                    childrenCount: parentElement.childIds?.length || 0,
                    availableChildren: parentElement.childIds?.map((id, i) => `${i}: "${sourceItemIndex[id]?.text || 'N/A'}"`).join(', ') || 'none'
                });
                return;
            }
            element = childElement;
            sourceChildText = element.text || 'N/A';
            if (!Array.isArray(parentElement.childIds)) {
                parentElement.childIds = [];
            }
            parentElement.childIds.splice(childIndex, 1);
            element.parentId = null;
        } else {
            // Regular element nesting
            if (!sourceRootItems[sourceElementIndex]) {
                console.error('Source element not found:', sourceElementIndex, 'in bin', sourceBinId);
                console.error('Available items:', sourceItems.map((e, i) => `${i}: "${e.text || 'N/A'}"`).join(', '));
                return;
            }
            element = sourceRootItems[sourceElementIndex];
            sourceChildText = element.text || 'N/A';
            // Root item nesting does not remove from flat list
        }

        const descendantIds = this._getDescendantIds(element, sourceItemIndex);
        const movingIds = new Set([element.id, ...descendantIds]);
        let movingItems = this._getItemsByIds(sourceItems, movingIds);
        if (movingItems.length === 0) {
            movingItems = [element];
        }
        if (!isSameGroup) {
            sourceItems = this._removeItemsByIds(sourceItems, movingIds);
            sourceBin.items = sourceItems;
        }

        const restoreToSource = () => {
            if (!isSameGroup) {
                const insertIndex = this._getFlatInsertIndex(sourceItems, sourceElementIndex);
                sourceItems.splice(insertIndex, 0, ...movingItems);
                sourceBin.items = sourceItems;
            }
        };
        
        // Adjust target index if source item was removed from items array and was before target
        // (This only applies to regular items, not children, since children are removed from children array)
        let adjustedTargetElementIndex = targetElementIndex;
        if (!isChild && sourcePageId === targetPageId && sourceBinId === targetBinId && sourceElementIndex < targetElementIndex) {
            // Source was removed from items array, so target index shifts down by 1
            adjustedTargetElementIndex = targetElementIndex - 1;
        }
        
        const targetElement = targetRootItems[adjustedTargetElementIndex];
        if (!targetElement) {
            console.error('Target element not found at index:', targetElementIndex, 'in bin', targetBinId);
            console.error('Available items:', targetItems.map((e, i) => `${i}: "${e.text || 'N/A'}"`).join(', '));
            // Re-add element to source if target is invalid
            if (isChild && parentElementIndex !== null) {
                const parentElement = this._getRootItemAtIndex(sourceItems, parentElementIndex);
                if (parentElement) {
                    if (!Array.isArray(parentElement.childIds)) parentElement.childIds = [];
                    parentElement.childIds.splice(childIndex, 0, element.id);
                    element.parentId = parentElement.id;
                }
            }
            restoreToSource();
            return;
        }
        
        // Prevent self-nesting: check if source is the same as target
        // Skip this check if elementToNest is provided (element already removed from array)
        // Compare actual element objects, not just indices (indices can be stale after moves)
        if (!elementToNest && !isChild && sourcePageId === targetPageId && sourceBinId === targetBinId) {
            const targetElementForCheck = targetRootItems[adjustedTargetElementIndex];
            
            // Only prevent if the actual element objects are the same
            // Compare the element we're nesting with the target element
            if (element && targetElementForCheck && element === targetElementForCheck) {
                console.error('Cannot nest: cannot nest element into itself');
                // Re-add element to source (though it's already there, this is defensive)
                if (!sourceItems[sourceElementIndex]) { // Check if it's actually missing
                    sourceItems.splice(sourceElementIndex, 0, element);
                }
                return;
            }
        }
        
        // Prevent nesting a child into its own parent
        // Check both parentElementIndex (from drag data) and sourceElementIndex (which is the parent when isChild is true)
        if (isChild && sourcePageId === targetPageId && sourceBinId === targetBinId) {
            const actualParentIndex = parentElementIndex !== null ? parentElementIndex : sourceElementIndex;
            if (actualParentIndex === adjustedTargetElementIndex) {
                console.error('Cannot nest: cannot nest a child into its own parent');
                // Re-add element to source
                const parentElement = this._getRootItemAtIndex(sourceItems, actualParentIndex);
                if (parentElement) {
                    if (!Array.isArray(parentElement.childIds)) parentElement.childIds = [];
                    parentElement.childIds.splice(childIndex, 0, element.id);
                    element.parentId = parentElement.id;
                }
                restoreToSource();
                return;
            }
        }
        
        // Prevent circular nesting - check if target is a descendant of source
        const isDescendant = (parent, child, itemIndex) => {
            const children = ItemHierarchy.getChildItems(parent, itemIndex);
            for (const c of children) {
                if (c === child) {
                    return true;
                }
                if (isDescendant(c, child, itemIndex)) {
                    return true;
                }
            }
            return false;
        };
        
        if (isDescendant(element, targetElement, targetItemIndex)) {
            console.error('Cannot nest: target is a descendant of source (circular nesting prevented)');
            // Re-add element to source
            if (isChild && parentElementIndex !== null) {
                const parentElement = this._getRootItemAtIndex(sourceItems, parentElementIndex);
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
                    const parentElement = this._getRootItemAtIndex(sourceItems, parentElementIndex);
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
        
        // Log resulting structure
        const resultElement = targetRootItems[adjustedTargetElementIndex];
        const resultText = resultElement?.text || 'N/A';
        const dataManager = this._getDataManager();
        if (dataManager) {
            dataManager.saveData();
        }
        
        // Preserve format view during re-render to prevent flicker
        const formatRendererManager = this._getFormatRendererManager();
        const pageFormat = formatRendererManager?.getPageFormat(targetPageId);
        if (pageFormat) {
            const renderer = this._getRenderer();
            if (renderer && renderer.getRenderer) {
                renderer.getRenderer()._preservingFormat = true;
            }
        }
        
        // Use requestAnimationFrame to ensure smooth animation
        requestAnimationFrame(() => {
            eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
        });
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
            
            const appState = this._getAppState();
            const dragData = appState.dragData;
            if (!dragData) return;
            
            if (dragData.type === 'element') {
                // Delete element
                const bin = this._getGroup(dragData.pageId, dragData.binId);
                if (bin) {
                    const items = bin.items || [];
                    bin.items = items;
                    const rootItems = this._getRootItems(items);
                    if (dragData.isChild && dragData.parentElementIndex !== null && dragData.childIndex !== null) {
                        // Delete child element
                        const parentElement = this._getRootItemAtIndex(items, dragData.parentElementIndex);
                        if (parentElement && Array.isArray(parentElement.childIds)) {
                            const childId = parentElement.childIds[dragData.childIndex];
                            const itemIndex = ItemHierarchy.buildItemIndex(items);
                            const deletedChild = childId ? itemIndex[childId] : null;
                            // Record undo/redo change
                            const undoRedoManager = this._getUndoRedoManager();
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
                                const descendantIds = this._getDescendantIds(deletedChild, itemIndex);
                                const removeIds = new Set([deletedChild.id, ...descendantIds]);
                                items = this._removeItemsByIds(items, removeIds);
                                bin.items = items;
                            }
                        }
                    } else {
                        // Delete regular element
                        const deletedElement = rootItems[dragData.elementIndex];
                        // Record undo/redo change
                        const undoRedoManager = this._getUndoRedoManager();
                        if (undoRedoManager && deletedElement) {
                            undoRedoManager.recordElementDelete(dragData.pageId, dragData.binId, dragData.elementIndex, deletedElement);
                        }
                        if (deletedElement) {
                            const itemIndex = ItemHierarchy.buildItemIndex(items);
                            const descendantIds = this._getDescendantIds(deletedElement, itemIndex);
                            const removeIds = new Set([deletedElement.id, ...descendantIds]);
                            items = this._removeItemsByIds(items, removeIds);
                        }
                        bin.items = items;
                    }
                    const dataManager = this._getDataManager();
        if (dataManager) {
            dataManager.saveData();
        }
                    eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
                }
            } else if (dragData.type === 'bin') {
                // Delete bin
                const binManager = getService(SERVICES.BIN_MANAGER);
                if (binManager) {
                    binManager.deleteBin(dragData.pageId, dragData.binId);
                }
            } else if (dragData.type === 'page') {
                // Delete page (only if more than one page exists)
                if (appState.documents.length > 1) {
                    const pageManager = getService(SERVICES.PAGE_MANAGER);
                    if (pageManager) {
                        pageManager.deletePage(dragData.pageId);
                    }
                }
            }
            
            appState.dragData = null;
        });
    }
}


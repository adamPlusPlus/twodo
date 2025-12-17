// DragDropHandler.js - Handles drag and drop operations
import { eventBus } from '../core/EventBus.js';
import { EVENTS } from '../core/AppEvents.js';

export class DragDropHandler {
    constructor(app) {
        this.app = app;
    }
    
    moveElement(sourcePageId, sourceBinId, sourceElementIndex, targetPageId, targetBinId, targetElementIndex, isChild = false, parentElementIndex = null, childIndex = null) {
        const sourcePage = (this.app.appState?.pages || this.app.pages || []).find(p => p.id === sourcePageId);
        if (!sourcePage) {
            console.error('Source page not found:', sourcePageId);
            return;
        }
        
        const sourceBin = sourcePage.bins?.find(b => b.id === sourceBinId);
        if (!sourceBin) {
            console.error('Source bin not found:', sourceBinId);
            return;
        }
        
        let element;
        
        // Handle children being moved
        if (isChild && parentElementIndex !== null && childIndex !== null) {
            const parentElement = sourceBin.elements[parentElementIndex];
            if (!parentElement || !parentElement.children || !parentElement.children[childIndex]) {
                console.error('Source child element not found:', childIndex, 'in parent', parentElementIndex);
                return;
            }
            element = parentElement.children[childIndex];
            // Remove from parent's children
            parentElement.children.splice(childIndex, 1);
            // Clean up empty children array to ensure UI updates correctly
            if (parentElement.children.length === 0) {
                delete parentElement.children;
            }
        } else {
            // Regular element move
            if (!sourceBin.elements[sourceElementIndex]) {
                console.error('Source element not found:', sourceElementIndex, 'in bin', sourceBinId);
                return;
            }
            element = sourceBin.elements[sourceElementIndex];
            // Remove from source
            sourceBin.elements.splice(sourceElementIndex, 1);
        }
        
        // Add to target
        const targetPage = (this.app.appState?.pages || this.app.pages || []).find(p => p.id === targetPageId);
        if (!targetPage) {
            console.error('Target page not found:', targetPageId);
            // Re-add element to source if target is invalid
            if (isChild && parentElementIndex !== null) {
                const parentElement = sourceBin.elements[parentElementIndex];
                if (parentElement) {
                    if (!parentElement.children) parentElement.children = [];
                    parentElement.children.splice(childIndex, 0, element);
                }
            } else {
                sourceBin.elements.splice(sourceElementIndex, 0, element);
            }
            return;
        }
        
        const targetBin = targetPage.bins?.find(b => b.id === targetBinId);
        if (!targetBin) {
            console.error('Target bin not found:', targetBinId);
            // Re-add element to source if target is invalid
            if (isChild && parentElementIndex !== null) {
                const parentElement = sourceBin.elements[parentElementIndex];
                if (parentElement) {
                    if (!parentElement.children) parentElement.children = [];
                    parentElement.children.splice(childIndex, 0, element);
                }
            } else {
                sourceBin.elements.splice(sourceElementIndex, 0, element);
            }
            return;
        }
        
        // Adjust target index if moving within same bin
        // User wants elements to be placed ABOVE the target element
        let adjustedTargetIndex = targetElementIndex;
        if (isChild && parentElementIndex !== null) {
            // When un-nesting a child element:
            // - The element is removed from parent's children array (doesn't affect elements array)
            // - We need to adjust if the parent's position in elements array is before the target
            // - If parent is at index X and target is at index Y where X < Y, we don't need to adjust
            //   because removing from children doesn't change the elements array indices
            // - However, if we're moving to a position after the parent, we need to account for it
            // Actually, since we're removing from children (not elements), we only need to adjust
            // if the parent element itself was removed, which doesn't happen here.
            // So no adjustment needed for un-nesting children.
            // IMPORTANT: When un-nesting, we're inserting into the elements array, so we can insert
            // at any valid index (0 to elements.length). No adjustment needed.
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
        const maxValidIndex = targetBin.elements.length; // Can insert at this index (appends to end)
        const beforeClamp = adjustedTargetIndex;
        adjustedTargetIndex = Math.max(0, Math.min(adjustedTargetIndex, maxValidIndex));
        
        // Special case: when un-nesting a child, if we calculated targetIndex as parentIndex + 1
        // but it got clamped, we need to allow insertion at elements.length (which is valid for splice)
        // This happens when the parent is the last element in the array
        if (isChild && parentElementIndex !== null && targetElementIndex === parentElementIndex + 1) {
            // We want to place after the parent (parentIndex + 1)
            // If it was clamped, use elements.length to append after the parent
            if (adjustedTargetIndex !== targetElementIndex && adjustedTargetIndex === parentElementIndex) {
                adjustedTargetIndex = targetBin.elements.length;
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
            // For regular elements, find by source index
            const sourceElement = document.querySelector(`[data-page-id="${sourcePageId}"][data-bin-id="${sourceBinId}"][data-element-index="${sourceElementIndex}"]:not([data-is-child="true"])`);
            if (sourceElement) {
                const rect = sourceElement.getBoundingClientRect();
                oldPosition = { top: rect.top, left: rect.left };
            }
        }
        
        targetBin.elements.splice(adjustedTargetIndex, 0, element);
        
        // Record undo/redo change
        if (this.app.undoRedoManager) {
            if (isChild && parentElementIndex !== null) {
                // Child element being un-nested - record as move from child to element
                // For now, treat it as a regular element move from the parent's position
                // (the actual implementation is complex, so we'll record it as a move)
                this.app.undoRedoManager.recordElementMove(
                    sourcePageId, sourceBinId, parentElementIndex, // Source (parent position)
                    targetPageId, targetBinId, adjustedTargetIndex, // Target
                    JSON.parse(JSON.stringify(element))
                );
            } else {
                // Regular element move
                this.app.undoRedoManager.recordElementMove(
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
        
        this.app.lastMovedElement = {
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
        const resultPage = (this.app.appState?.pages || this.app.pages || []).find(p => p.id === targetPageId);
        const resultBin = resultPage?.bins?.find(b => b.id === targetBinId);
        const resultElement = resultBin?.elements[adjustedTargetIndex];
        const resultText = resultElement?.text || 'N/A';
        
        // If we un-nested a child, check if parent still has children
        let parentChildrenInfo = 'N/A';
        if (isChild && parentElementIndex !== null) {
            const sourcePage = (this.app.appState?.pages || this.app.pages || []).find(p => p.id === sourcePageId);
            const sourceBin = sourcePage?.bins?.find(b => b.id === sourceBinId);
            const parentElement = sourceBin?.elements[parentElementIndex];
            if (parentElement) {
                const childrenCount = parentElement.children?.length || 0;
                parentChildrenInfo = `${childrenCount} child${childrenCount !== 1 ? 'ren' : ''} (${parentElement.children ? 'array exists' : 'no array'})`;
            }
        }
        
        this.app.dataManager.saveData();
        // Preserve format view during re-render to prevent flicker
        const pageFormat = this.app.formatRendererManager?.getPageFormat(targetPageId);
        if (pageFormat) {
            this.app._preservingFormat = true;
        }
        
        // Use requestAnimationFrame to ensure smooth animation
        requestAnimationFrame(() => {
            this.app.render();
        });
    }

    reorderChildElement(pageId, binId, parentElementIndex, sourceChildIndex, targetChildIndex) {
        const page = (this.app.appState?.pages || this.app.pages || []).find(p => p.id === pageId);
        if (!page) {
            console.error('Page not found:', pageId);
            return;
        }

        const bin = page.bins?.find(b => b.id === binId);
        if (!bin) {
            console.error('Bin not found:', binId);
            return;
        }

        const parentElement = bin.elements[parentElementIndex];
        if (!parentElement || !parentElement.children || !parentElement.children[sourceChildIndex]) {
            console.error('Parent element or child not found:', parentElementIndex, sourceChildIndex);
            return;
        }

        // Remove the child from its current position
        const childElement = parentElement.children.splice(sourceChildIndex, 1)[0];

        // Insert it at the new position
        // Adjust target index if moving to a higher position (since we already removed the source)
        let adjustedTargetIndex = targetChildIndex;
        if (sourceChildIndex < targetChildIndex) {
            adjustedTargetIndex -= 1;
        }

        // Ensure index is valid
        adjustedTargetIndex = Math.max(0, Math.min(adjustedTargetIndex, parentElement.children.length));
        parentElement.children.splice(adjustedTargetIndex, 0, childElement);

        // Record undo/redo change
        if (this.app.undoRedoManager) {
            this.app.undoRedoManager.recordChildReorder(
                pageId, binId, parentElementIndex, sourceChildIndex, adjustedTargetIndex,
                JSON.parse(JSON.stringify(childElement))
            );
        }

        // Log resulting structure
        const parentText = parentElement?.text || 'N/A';
        this.app.dataManager.saveData();
        
        // Preserve format view during re-render to prevent flicker
        const pageFormat = this.app.formatRendererManager?.getPageFormat(pageId);
        if (pageFormat) {
            this.app._preservingFormat = true;
        }
        
        requestAnimationFrame(() => {
            this.app.render();
        });
    }

    nestElement(sourcePageId, sourceBinId, sourceElementIndex, targetPageId, targetBinId, targetElementIndex, isChild = false, parentElementIndex = null, childIndex = null, elementToNest = null) {
        
        const sourcePage = (this.app.appState?.pages || this.app.pages || []).find(p => p.id === sourcePageId);
        if (!sourcePage) {
            console.error('Source page not found:', sourcePageId);
            return;
        }
        
        const sourceBin = sourcePage.bins?.find(b => b.id === sourceBinId);
        if (!sourceBin) {
            console.error('Source bin not found:', sourceBinId);
            return;
        }
        
        const targetPage = (this.app.appState?.pages || this.app.pages || []).find(p => p.id === targetPageId);
        if (!targetPage) {
            console.error('Target page not found:', targetPageId);
            return;
        }
        
        const targetBin = targetPage.bins?.find(b => b.id === targetBinId);
        if (!targetBin) {
            console.error('Target bin not found:', targetBinId);
            return;
        }
        
        if (!targetBin.elements[targetElementIndex]) {
            console.error('Target element not found:', targetElementIndex, 'in bin', targetBinId);
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
            const parentElement = sourceBin.elements[parentElementIndex];
            if (!parentElement) {
                console.error('Source parent element not found at index:', parentElementIndex, 'in bin', sourceBinId);
                console.error('Available elements:', sourceBin.elements.map((e, i) => `${i}: "${e.text || 'N/A'}"`).join(', '));
                return;
            }
            sourceParentText = parentElement.text || 'N/A';
            if (!parentElement.children || !parentElement.children[childIndex]) {
                console.error('Source child element not found:', {
                    childIndex: childIndex,
                    parentIndex: parentElementIndex,
                    parentText: sourceParentText,
                    childrenCount: parentElement.children?.length || 0,
                    availableChildren: parentElement.children?.map((c, i) => `${i}: "${c.text || 'N/A'}"`).join(', ') || 'none'
                });
                return;
            }
            element = parentElement.children[childIndex];
            sourceChildText = element.text || 'N/A';
            // Remove from parent's children
            parentElement.children.splice(childIndex, 1);
            // Clean up empty children array to ensure UI updates correctly
            if (parentElement.children.length === 0) {
                delete parentElement.children;
            }
        } else {
            // Regular element nesting
            if (!sourceBin.elements[sourceElementIndex]) {
                console.error('Source element not found:', sourceElementIndex, 'in bin', sourceBinId);
                console.error('Available elements:', sourceBin.elements.map((e, i) => `${i}: "${e.text || 'N/A'}"`).join(', '));
                return;
            }
            element = sourceBin.elements[sourceElementIndex];
            sourceChildText = element.text || 'N/A';
            // Remove from source
            sourceBin.elements.splice(sourceElementIndex, 1);
        }
        
        // Adjust target index if source element was removed from elements array and was before target
        // (This only applies to regular elements, not children, since children are removed from children array)
        let adjustedTargetElementIndex = targetElementIndex;
        if (!isChild && sourcePageId === targetPageId && sourceBinId === targetBinId && sourceElementIndex < targetElementIndex) {
            // Source was removed from elements array, so target index shifts down by 1
            adjustedTargetElementIndex = targetElementIndex - 1;
        }
        
        const targetElement = targetBin.elements[adjustedTargetElementIndex];
        if (!targetElement) {
            console.error('Target element not found at index:', targetElementIndex, 'in bin', targetBinId);
            console.error('Available elements:', targetBin.elements.map((e, i) => `${i}: "${e.text || 'N/A'}"`).join(', '));
            // Re-add element to source if target is invalid
            if (isChild && parentElementIndex !== null) {
                const parentElement = sourceBin.elements[parentElementIndex];
                if (parentElement) {
                    if (!parentElement.children) parentElement.children = [];
                    parentElement.children.splice(childIndex, 0, element);
                }
            } else {
                sourceBin.elements.splice(sourceElementIndex, 0, element);
            }
            return;
        }
        
        // Prevent self-nesting: check if source is the same as target
        // Skip this check if elementToNest is provided (element already removed from array)
        // Compare actual element objects, not just indices (indices can be stale after moves)
        if (!elementToNest && !isChild && sourcePageId === targetPageId && sourceBinId === targetBinId) {
            const targetElementForCheck = targetBin.elements[adjustedTargetElementIndex];
            
            // Only prevent if the actual element objects are the same
            // Compare the element we're nesting with the target element
            if (element && targetElementForCheck && element === targetElementForCheck) {
                console.error('Cannot nest: cannot nest element into itself');
                // Re-add element to source (though it's already there, this is defensive)
                if (!sourceBin.elements[sourceElementIndex]) { // Check if it's actually missing
                    sourceBin.elements.splice(sourceElementIndex, 0, element);
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
                const parentElement = sourceBin.elements[actualParentIndex];
                if (parentElement) {
                    if (!parentElement.children) parentElement.children = [];
                    parentElement.children.splice(childIndex, 0, element);
                }
                return;
            }
        }
        
        // Prevent circular nesting - check if target is a descendant of source
        const isDescendant = (parent, child) => {
            if (!parent.children || !Array.isArray(parent.children)) {
                return false;
            }
            for (const c of parent.children) {
                if (c === child) {
                    return true;
                }
                if (isDescendant(c, child)) {
                    return true;
                }
            }
            return false;
        };
        
        if (isDescendant(element, targetElement)) {
            console.error('Cannot nest: target is a descendant of source (circular nesting prevented)');
            // Re-add element to source
            if (isChild && parentElementIndex !== null) {
                const parentElement = sourceBin.elements[parentElementIndex];
                if (parentElement) {
                    if (!parentElement.children) parentElement.children = [];
                    parentElement.children.splice(childIndex, 0, element);
                }
            } else {
                sourceBin.elements.splice(sourceElementIndex, 0, element);
            }
            return;
        }
        
        // Enforce one-level limit: check if any existing children have their own children
        if (targetElement.children && targetElement.children.length > 0) {
            const hasNestedChildren = targetElement.children.some(child => 
                child.children && child.children.length > 0
            );
            if (hasNestedChildren) {
                console.error('Cannot nest: target has children with their own children (one-level limit enforced)');
                // Re-add element to source
                if (isChild && parentElementIndex !== null) {
                    const parentElement = sourceBin.elements[parentElementIndex];
                    if (parentElement) {
                        if (!parentElement.children) parentElement.children = [];
                        parentElement.children.splice(childIndex, 0, element);
                    }
                } else {
                    sourceBin.elements.splice(sourceElementIndex, 0, element);
                }
                return;
            }
        }
        
        // Initialize children array if it doesn't exist
        if (!targetElement.children) {
            targetElement.children = [];
        }
        
        // Add to target's children
        targetElement.children.push(element);
        
        // Log resulting structure
        const resultElement = targetBin.elements[adjustedTargetElementIndex];
        const resultText = resultElement?.text || 'N/A';
        this.app.dataManager.saveData();
        
        // Preserve format view during re-render to prevent flicker
        const pageFormat = this.app.formatRendererManager?.getPageFormat(targetPageId);
        if (pageFormat) {
            this.app._preservingFormat = true;
        }
        
        // Use requestAnimationFrame to ensure smooth animation
        requestAnimationFrame(() => {
            this.app.render();
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
            
            const dragData = this.app.appState.dragData;
            if (!dragData) return;
            
            if (dragData.type === 'element') {
                // Delete element
                const page = this.app.appState.pages.find(p => p.id === dragData.pageId);
                const bin = page?.bins?.find(b => b.id === dragData.binId);
                if (bin) {
                    if (dragData.isChild && dragData.parentElementIndex !== null && dragData.childIndex !== null) {
                        // Delete child element
                        const parentElement = bin.elements[dragData.parentElementIndex];
                        if (parentElement && parentElement.children) {
                            const deletedChild = parentElement.children[dragData.childIndex];
                            // Record undo/redo change
                            if (this.app.undoRedoManager && deletedChild) {
                                const path = this.app.undoRedoManager.getElementPath(dragData.pageId, dragData.binId, dragData.parentElementIndex, dragData.childIndex);
                                if (path) {
                                    const change = this.app.undoRedoManager.createChange('delete', path, null, deletedChild);
                                    change.changeId = `${Date.now()}-${Math.random()}`;
                                    this.app.undoRedoManager.recordChange(change);
                                }
                            }
                            parentElement.children.splice(dragData.childIndex, 1);
                            if (parentElement.children.length === 0) {
                                delete parentElement.children;
                            }
                        }
                    } else {
                        // Delete regular element
                        const deletedElement = bin.elements[dragData.elementIndex];
                        // Record undo/redo change
                        if (this.app.undoRedoManager && deletedElement) {
                            this.app.undoRedoManager.recordElementDelete(dragData.pageId, dragData.binId, dragData.elementIndex, deletedElement);
                        }
                        bin.elements.splice(dragData.elementIndex, 1);
                    }
                    this.app.dataManager.saveData();
                    eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
                }
            } else if (dragData.type === 'bin') {
                // Delete bin
                this.app.deleteBin(dragData.pageId, dragData.binId);
            } else if (dragData.type === 'page') {
                // Delete page (only if more than one page exists)
                if (this.app.appState.pages.length > 1) {
                    this.app.deletePage(dragData.pageId);
                }
            }
            
            this.app.appState.dragData = null;
        });
    }
}


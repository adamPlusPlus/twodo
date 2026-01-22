// BinRenderer.js - Handles bin rendering
// Extracted from app.js to improve modularity
import { eventBus } from './EventBus.js';
import { EventHelper } from '../utils/EventHelper.js';
import { ItemHierarchy } from '../utils/ItemHierarchy.js';

/**
 * BinRenderer - Handles rendering of bins
 * 
 * This class extracts bin rendering logic from app.js to improve modularity.
 */
export class BinRenderer {
    constructor(app) {
        this.app = app;
    }
    
    /**
     * Render a bin element
     * @param {string} pageId - Page ID
     * @param {Object} bin - Bin data object
     * @returns {HTMLElement} The rendered bin element
     */
    renderBin(pageId, bin) {
        const binDiv = document.createElement('div');
        binDiv.className = 'bin';
        binDiv.dataset.binId = bin.id;
        binDiv.dataset.pageId = pageId;
        binDiv.draggable = true;
        binDiv.dataset.dragType = 'bin';
        
        // Apply visual settings for this bin (includes tag-based settings)
        if (this.app.visualSettingsManager) {
            const page = this.app.appState?.documents?.find(page => page.id === pageId);
            const viewFormat = page?.format || 'default';
            // Tags are automatically retrieved and applied in applyVisualSettings
            this.app.visualSettingsManager.applyVisualSettings(binDiv, 'bin', bin.id, pageId, viewFormat);
        }
        
        // Initialize bin state if not set (default to expanded)
        if (!(bin.id in this.app.appState.groupStates)) {
            this.app.appState.groupStates[bin.id] = true;
        }
        const isExpanded = this.app.appState.groupStates[bin.id];
        
        const header = document.createElement('div');
        header.className = 'bin-header';
        
        const binToggleId = `bin-toggle-${bin.id}`;
        const binContentId = `bin-content-${bin.id}`;
        
        const arrow = isExpanded ? '▼' : '▶';
        header.innerHTML = `
            <span class="bin-toggle-arrow" id="${binToggleId}" style="cursor: pointer; margin-right: 8px; color: #888888; user-select: none;">${arrow}</span>
            <div class="bin-title" data-bin-id="${bin.id}">${bin.title}</div>
        `;
        
        const binContent = document.createElement('div');
        binContent.id = binContentId;
        binContent.style.display = isExpanded ? 'block' : 'none';
        
        // Apply max-height if set
        if (bin.maxHeight && bin.maxHeight > 0) {
            binContent.style.maxHeight = `${bin.maxHeight}px`;
            binContent.style.overflowY = 'auto';
            binContent.style.overflowX = 'hidden';
        }
        
        // Context menu is now handled by unified handler in EventHandler
        
        const elementsList = document.createElement('div');
        elementsList.className = 'elements-list';
        elementsList.id = `elements-list-${bin.id}`;
        
        // Context menu is now handled by unified handler in EventHandler
        
        // Ensure bin.items exists and is an array
        const items = bin.items || [];
        if (!Array.isArray(items)) {
            console.warn('bin.items is not an array:', items, 'for bin:', bin.id);
        }
        bin.items = items;

        const rootItems = ItemHierarchy.getRootItems(items);
        rootItems.forEach((element, elIndex) => {
            // Delegate to ElementRenderer (will be created)
            const elementNode = this.app.renderService.getRenderer().renderElement(pageId, bin.id, element, elIndex);
            elementsList.appendChild(elementNode);
        });
        
        const addElementBtn = document.createElement('button');
        addElementBtn.className = 'add-element-btn';
        addElementBtn.textContent = '+ Add Element';
        addElementBtn.onclick = () => {
            this.app.modalHandler.showAddElementModal(pageId, bin.id);
        };
        
        // Track active bin when clicking on bin
        binDiv.addEventListener('click', () => {
            this.app.appState.activeGroupId = bin.id;
        });
        
        // Context menu is now handled by unified handler in EventHandler
        
        // Use EventHelper for double-click detection on bin title
        const titleElement = binDiv.querySelector('.bin-title');
        if (titleElement) {
            EventHelper.setupDoubleClick(
                titleElement,
                (e) => {
                    // Double click on title - make it editable
                    titleElement.contentEditable = 'true';
                    titleElement.focus();
                    // Select all text for easy replacement
                    const range = document.createRange();
                    range.selectNodeContents(titleElement);
                    const selection = window.getSelection();
                    selection.removeAllRanges();
                    selection.addRange(range);
                },
                this.app.appState.doubleClickDelay
            );
        }
        
        // Use EventHelper for double-click detection on bin (for context menu)
        EventHelper.setupDoubleClick(
            binDiv,
            (e) => {
                // Don't trigger if clicking on title (handled separately above)
                if (e.target.closest('.bin-title')) {
                    return;
                }
                // Double click detected - show context menu
                handleBinMenu(e);
            },
            this.app.appState.doubleClickDelay
        );
        
        binContent.appendChild(elementsList);
        binContent.appendChild(addElementBtn);
        
        binDiv.appendChild(header);
        binDiv.appendChild(binContent);
        
        // Emit bin:render event for plugins (after DOM is ready)
        setTimeout(() => {
            if (this.app.eventBus) {
                this.app.eventBus.emit('bin:render', {
                    binElement: binDiv,
                    pageId: pageId,
                    binData: bin
                });
            }
        }, 0);
        
        // Toggle handler for bin collapse/expand
        // Query from header element directly (it's already created via innerHTML)
        const toggleArrow = header.querySelector(`#${binToggleId}`);
        if (toggleArrow) {
            toggleArrow.addEventListener('click', (e) => {
            e.stopPropagation();
                const isCurrentlyExpanded = this.app.appState.groupStates[bin.id] !== false; // default to true
            this.app.appState.groupStates[bin.id] = !isCurrentlyExpanded;
            const content = document.getElementById(binContentId);
            if (content) {
                content.style.display = this.app.appState.groupStates[bin.id] ? 'block' : 'none';
            }
            toggleArrow.textContent = this.app.appState.groupStates[bin.id] ? '▼' : '▶';
                this.app.dataManager.saveData(); // Save collapse state
            });
        }
        
        // Make bin title editable on double-click (reuse titleElement from above)
        if (titleElement) {
            titleElement.addEventListener('blur', (e) => {
            // Only save if it was actually editable
            if (e.target.contentEditable === 'true') {
                bin.title = e.target.textContent.trim() || 'Untitled Bin';
                e.target.contentEditable = 'false';
            this.app.dataManager.saveData();
            }
            });
            
            // Handle Enter key to finish editing
            titleElement.addEventListener('keydown', (e) => {
                if (e.target.contentEditable === 'true' && e.key === 'Enter') {
                    e.preventDefault();
                    e.target.blur();
                }
            });
        }
        
        // Drag and drop handlers for bins
        binDiv.addEventListener('dragstart', (e) => {
            // Don't start drag if clicking on interactive elements
            if (e.target.closest('button') || e.target.closest('input')) {
                e.preventDefault();
                return;
            }
            
            // Don't start drag if editing bin title
            const titleElement = e.target.closest('.bin-title');
            if (titleElement && titleElement.contentEditable === 'true') {
                e.preventDefault();
                return;
            }
            
            // Don't start drag if the target is an element (elements handle their own drag)
            if (e.target.closest('.element')) {
                e.preventDefault();
                return;
            }
            
            e.dataTransfer.effectAllowed = 'move';
            const dragPayload = {
                type: 'bin',
                pageId: pageId,
                binId: bin.id
            };
            // console.log('Bin dragstart:', dragPayload);
            e.dataTransfer.setData('text/plain', JSON.stringify(dragPayload));
            this.app.appState.dragData = dragPayload;
            binDiv.classList.add('dragging');
            this.app.appState.isDragging = true; // Track dragging state for scroll handlers
            
            // Show trash icon
            const trashIcon = document.getElementById('trash-icon');
            if (trashIcon) {
                trashIcon.style.display = 'flex';
            }
        });
        
        binDiv.addEventListener('dragend', (e) => {
            binDiv.classList.remove('dragging');
            this.app.appState.isDragging = false; // Clear dragging state
            
            // Hide trash icon
            const trashIcon = document.getElementById('trash-icon');
            if (trashIcon) {
                trashIcon.style.display = 'none';
                trashIcon.classList.remove('drag-over-trash');
                trashIcon.style.background = 'rgba(220, 53, 69, 0.9)';
                trashIcon.style.transform = 'scale(1)';
            }
            
            // Stop auto-scrolling
            if (this.app.appState.autoScrollInterval) {
                clearInterval(this.app.appState.autoScrollInterval);
                this.app.appState.autoScrollInterval = null;
            }
            // Don't clear dragData here - let drop handler clear it after processing
            // If drop didn't fire (drag cancelled), clear it after a delay
            if (!e.dataTransfer.dropEffect || e.dataTransfer.dropEffect === 'none') {
                // Drag was cancelled, clear dragData
                setTimeout(() => {
            this.app.appState.dragData = null;
                }, 50);
            }
            // Remove all drag-over classes
            document.querySelectorAll('.drag-over').forEach(el => {
                el.classList.remove('drag-over');
            });
        });
        
        binDiv.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            
            // Use stored dragData if available, otherwise try to parse from dataTransfer
            const dragData = this.app.appState.dragData || (() => {
                try {
                    return JSON.parse(e.dataTransfer.getData('text/plain') || '{}');
                } catch {
                    return {};
                }
            })();
            
            // Only allow dropping bins on bins-container or other bins
            if (dragData.type === 'bin' && dragData.binId !== bin.id) {
                binDiv.classList.add('drag-over');
            }
            // Allow dropping elements on bins
            else if (dragData.type === 'element') {
                binDiv.classList.add('drag-over');
            }
        });
        
        binDiv.addEventListener('dragleave', (e) => {
            // Only remove class if we're leaving the bin div itself
            if (!binDiv.contains(e.relatedTarget)) {
                binDiv.classList.remove('drag-over');
            }
        });
        
        binDiv.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            binDiv.classList.remove('drag-over');
            
            let dragData = this.app.appState.dragData;
            if (!dragData) {
                try {
                    const dataStr = e.dataTransfer.getData('text/plain');
                    if (dataStr) {
                        dragData = JSON.parse(dataStr);
                    } else {
                        console.error('No drag data available in bin drop');
                        return;
                    }
                } catch (err) {
                    console.error('Failed to parse drag data:', err);
                    return;
                }
            }
            
            // console.log('Bin drop event:', dragData, 'onto bin:', bin.id);
            
            if (dragData && dragData.type === 'bin') {
                // console.log('Moving bin:', dragData.binId, '->', bin.id);
                this.app.binManager.moveBin(dragData.pageId, dragData.binId, pageId, bin.id);
            } else if (dragData && dragData.type === 'element') {
                // If this is a nested element being dragged to a bin, un-nest it
                if (dragData.isChild && dragData.parentElementIndex !== null) {
                    // Find the parent element to place the un-nested element immediately below it
                    const sourcePage = this.app.appState.documents.find(page => page.id === dragData.pageId);
                    const sourceBin = sourcePage?.groups?.find(bin => bin.id === dragData.binId);
                    if (sourceBin && sourceBin.items[dragData.parentElementIndex]) {
                        // If dropping on the same bin as parent, place immediately after parent
                        if (bin.id === dragData.binId && pageId === dragData.pageId) {
                            const targetIndex = dragData.parentElementIndex + 1;
                            // console.log('Un-nesting element and placing below parent at index:', targetIndex);
                            this.app.moveElement(dragData.pageId, dragData.binId, dragData.elementIndex, pageId, bin.id, targetIndex,
                                dragData.isChild || false, dragData.parentElementIndex || null, dragData.childIndex || null);
                        } else {
                            // If dropping on different bin, find parent's position in target bin or add to end
                            // For now, just add to end - could be enhanced to find matching parent
                            // console.log('Moving nested element to different bin (un-nesting):', dragData.pageId, dragData.binId, dragData.elementIndex, '->', pageId, bin.id);
                            this.app.moveElement(dragData.pageId, dragData.binId, dragData.elementIndex, pageId, bin.id, bin.items.length,
                                dragData.isChild || false, dragData.parentElementIndex || null, dragData.childIndex || null);
                        }
                    } else {
                        // Fallback: just un-nest and add to end
                        // console.log('Moving nested element to bin (un-nesting):', dragData.pageId, dragData.binId, dragData.elementIndex, '->', pageId, bin.id);
                        this.app.moveElement(dragData.pageId, dragData.binId, dragData.elementIndex, pageId, bin.id, bin.items.length,
                            dragData.isChild || false, dragData.parentElementIndex || null, dragData.childIndex || null);
                    }
                } else {
                    // console.log('Moving element to bin:', dragData.pageId, dragData.binId, dragData.elementIndex, '->', pageId, bin.id);
                // Move element to this bin at the end
                    this.app.moveElement(dragData.pageId, dragData.binId, dragData.elementIndex, pageId, bin.id, bin.items.length,
                        dragData.isChild || false, dragData.parentElementIndex || null, dragData.childIndex || null);
                }
            }
            
            // Clear dragData after processing
            this.app.appState.dragData = null;
        });
        
        // Make elements list a drop zone for elements
        // Support dropping between elements with visual indicator
        // Store indicator reference on the elementsList for access from element handlers
        let dropIndicator = null;
        let dropTargetIndex = null;
        elementsList._dropIndicator = null;
        elementsList._dropTargetIndex = null;
        
        // Helper function to clear all drop indicators across the app
        const clearAllDropIndicators = () => {
            // Clear all elements list indicators
            document.querySelectorAll('.elements-list').forEach(list => {
                if (list._dropIndicator) {
                    list._dropIndicator.remove();
                    list._dropIndicator = null;
                    list._dropTargetIndex = null;
                }
            });
            
            // Clear all nested children container indicators
            document.querySelectorAll('.dropdown-content').forEach(content => {
                if (content._dropIndicator) {
                    content._dropIndicator.remove();
                    content._dropIndicator = null;
                    content._dropTargetIndex = null;
                }
            });
            
            // Also clear any orphaned indicators (safety check)
            document.querySelectorAll('.drop-indicator').forEach(indicator => {
                indicator.remove();
            });
        };
        
        // Helper function to calculate and show drop indicator
        const updateDropIndicator = (e, elementsList, bin) => {
            const dragData = this.app.appState.dragData || (() => {
                try {
                    return JSON.parse(e.dataTransfer.getData('text/plain') || '{}');
                } catch {
                    return {};
                }
            })();
            
            if (dragData.type !== 'element') {
                // Remove indicator if not dragging an element
                if (dropIndicator) {
                    dropIndicator.remove();
                    dropIndicator = null;
                    dropTargetIndex = null;
                    elementsList._dropIndicator = null;
                    elementsList._dropTargetIndex = null;
                }
                return;
            }
            
            e.preventDefault();
            e.stopPropagation();
            e.dataTransfer.dropEffect = 'move';
            
            // Find which position we're hovering over
            const elements = Array.from(elementsList.querySelectorAll('.element:not(.child-element)'));
            const mouseY = e.clientY;
            const elementsListRect = elementsList.getBoundingClientRect();
            const relativeY = mouseY - elementsListRect.top;
            
            // Find the insertion point
            let insertIndex = bin.items.length; // Default to end
            let targetElement = null;
            
            for (let i = 0; i < elements.length; i++) {
                const elementRect = elements[i].getBoundingClientRect();
                const elementTop = elementRect.top - elementsListRect.top;
                const elementBottom = elementRect.bottom - elementsListRect.top;
                const elementMiddle = (elementTop + elementBottom) / 2;
                
                // If mouse is above the middle of this element, insert before it
                if (relativeY < elementMiddle) {
                    const elementIndexStr = elements[i].dataset.elementIndex;
                    if (elementIndexStr) {
                        // Handle child elements - get parent index
                        if (typeof elementIndexStr === 'string' && elementIndexStr.includes('-')) {
                            const parentIndex = parseInt(elementIndexStr.split('-')[0]);
                            if (!isNaN(parentIndex)) {
                                insertIndex = parentIndex;
                                targetElement = elements[i];
                            }
                        } else {
                            const elementIndex = parseInt(elementIndexStr);
                            if (!isNaN(elementIndex)) {
                                insertIndex = elementIndex;
                                targetElement = elements[i];
                            }
                        }
                    }
                    break;
                }
            }
            
            // If we didn't find a target element, check if we should append at the end
            if (targetElement === null && insertIndex >= bin.items.length) {
                const addButton = elementsList.querySelector('.add-element-btn');
                if (addButton) {
                    targetElement = addButton;
                }
            }
            
            // Show visual indicator at the insertion point
            if (dropTargetIndex !== insertIndex || dropIndicator === null) {
                dropTargetIndex = insertIndex;
                
                // Clear ALL drop indicators before showing a new one
                clearAllDropIndicators();
                dropIndicator = null;
                
                // Create new indicator
                dropIndicator = document.createElement('div');
                dropIndicator.className = 'drop-indicator';
                dropIndicator.style.cssText = `
                    height: 2px;
                    background: #4a9eff;
                    margin: 4px 0;
                    border-radius: 1px;
                    pointer-events: none;
                    position: relative;
                    z-index: 1000;
                `;
                
                // Store reference
                elementsList._dropIndicator = dropIndicator;
                elementsList._dropTargetIndex = insertIndex;
                
                // Insert indicator at the correct position
                if (targetElement && elementsList.contains(targetElement) && targetElement.parentElement === elementsList) {
                    elementsList.insertBefore(dropIndicator, targetElement);
                } else {
                    // Fallback: append to end
                    elementsList.appendChild(dropIndicator);
                }
            }
        };
        
        elementsList.addEventListener('dragover', (e) => {
            updateDropIndicator(e, elementsList, bin);
        });
        
        elementsList.addEventListener('dragleave', (e) => {
            // Only remove indicator if leaving the elements list entirely
            if (!elementsList.contains(e.relatedTarget)) {
                if (dropIndicator) {
                    dropIndicator.remove();
                    dropIndicator = null;
                    dropTargetIndex = null;
                }
            }
        });
        
        elementsList.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            let dragData = this.app.appState.dragData;
            if (!dragData) {
                try {
                    const dataStr = e.dataTransfer.getData('text/plain');
                    if (dataStr) {
                        dragData = JSON.parse(dataStr);
                    } else {
                        console.error('No drag data available in elements list drop');
                        return;
                    }
                } catch (err) {
                    console.error('Failed to parse drag data:', err);
                    return;
                }
            }
            
            // console.log('Elements list drop:', dragData);
            
            if (dragData && dragData.type === 'element') {
                // Remove drop indicator
                if (elementsList._dropIndicator) {
                    elementsList._dropIndicator.remove();
                    elementsList._dropIndicator = null;
                }
                
                // PRIORITY: Always use the indicator position if available
                let targetIndex = bin.items.length; // Default to end
                let targetElement = null; // Declare outside if/else so it's available later
                
                if (elementsList._dropTargetIndex !== null && elementsList._dropTargetIndex !== undefined) {
                    // Use indicator position (this is where the user intended to drop)
                    targetIndex = elementsList._dropTargetIndex;
                    elementsList._dropTargetIndex = null;
                } else {
                    // Fallback: calculate from element position (only if no indicator)
                    targetElement = e.target.closest('.element');
                    if (targetElement) {
                        // Handle both regular elements and child elements
                        const targetElementIndexStr = targetElement.dataset.elementIndex;
                        if (targetElementIndexStr) {
                            if (typeof targetElementIndexStr === 'string' && targetElementIndexStr.includes('-')) {
                                // Target is a child element - get its parent's index
                                const targetParentIndex = parseInt(targetElementIndexStr.split('-')[0]);
                                if (!isNaN(targetParentIndex)) {
                                    // Place after the target's parent
                                    targetIndex = targetParentIndex + 1;
                                }
                            } else {
                                // Target is a regular element
                                const targetElementIndex = parseInt(targetElementIndexStr);
                                if (!isNaN(targetElementIndex)) {
                                    targetIndex = targetElementIndex;
                                }
                            }
                        }
                    }
                }
                
                // If this is a nested element being dropped on empty space, un-nest and place below parent
                if (dragData.isChild && dragData.parentElementIndex !== null && !targetElement) {
                    const sourcePage = this.app.appState.documents.find(page => page.id === dragData.pageId);
                    const sourceBin = sourcePage?.groups?.find(bin => bin.id === dragData.binId);
                    if (sourceBin && bin.id === dragData.binId && pageId === dragData.pageId && sourceBin.items[dragData.parentElementIndex]) {
                        // Place immediately after parent
                        targetIndex = dragData.parentElementIndex + 1;
                        // console.log('Un-nesting element and placing below parent at index:', targetIndex);
                    }
                }
                
                // moveElement will handle un-nesting if isChild is true
                // console.log('Moving element within bin (un-nesting if needed):', dragData.pageId, dragData.binId, dragData.elementIndex, '->', pageId, bin.id, targetIndex);
                this.app.moveElement(dragData.pageId, dragData.binId, dragData.elementIndex, pageId, bin.id, targetIndex,
                    dragData.isChild || false, dragData.parentElementIndex || null, dragData.childIndex || null);
                
                // Clean up drag-over classes
                document.querySelectorAll('.drag-over').forEach(el => {
                    el.classList.remove('drag-over');
                });
            }
            
            // Clear dragData after processing
            this.app.appState.dragData = null;
        });
        
        return binDiv;
    }
}


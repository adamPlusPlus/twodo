// BinInteractions.js - Interaction handlers for bins
// Extracted from BinRenderer.js for reusability and maintainability

import { EventHelper } from './EventHelper.js';
import { ItemHierarchy } from './ItemHierarchy.js';
import { viewportConfig } from '../core/ViewportConfig.js';

/**
 * BinInteractions - Handles bin interaction events
 */
export class BinInteractions {
    constructor(app) {
        this.app = app;
    }
    
    /**
     * Handle bin click
     * @param {Object} bin - Bin data object
     * @param {string} pageId - Page ID
     * @param {Event} event - Click event
     */
    handleBinClick(bin, pageId, event) {
        if (this.app && this.app.appState) {
            this.app.appState.activeGroupId = bin.id;
        }
    }
    
    /**
     * Handle bin drag start
     * @param {Object} bin - Bin data object
     * @param {string} pageId - Page ID
     * @param {Event} event - Drag start event
     * @param {HTMLElement} binDiv - Bin div element
     */
    handleBinDragStart(bin, pageId, event, binDiv) {
        // Don't start drag if clicking on interactive elements
        if (event.target.closest('button') || event.target.closest('input')) {
            event.preventDefault();
            return;
        }
        
        // Don't start drag if editing bin title
        const titleElement = event.target.closest('.bin-title');
        if (titleElement && titleElement.contentEditable === 'true') {
            event.preventDefault();
            return;
        }
        
        // Don't start drag if the target is an element (elements handle their own drag)
        if (event.target.closest('.element')) {
            event.preventDefault();
            return;
        }
        
        event.dataTransfer.effectAllowed = 'move';
        const dragPayload = {
            type: 'bin',
            pageId: pageId,
            binId: bin.id
        };
        event.dataTransfer.setData('text/plain', JSON.stringify(dragPayload));
        
        if (this.app && this.app.appState) {
            this.app.appState.dragData = dragPayload;
            this.app.appState.isDragging = true;
        }
        
        binDiv.classList.add('dragging');
        
        // Show trash icon
        const trashIcon = document.getElementById('trash-icon');
        if (trashIcon) {
            trashIcon.style.display = 'flex';
        }
    }
    
    /**
     * Handle bin drag end
     * @param {Object} bin - Bin data object
     * @param {string} pageId - Page ID
     * @param {Event} event - Drag end event
     * @param {HTMLElement} binDiv - Bin div element
     */
    handleBinDragEnd(bin, pageId, event, binDiv) {
        binDiv.classList.remove('dragging');
        
        if (this.app && this.app.appState) {
            this.app.appState.isDragging = false;
        }
        
        // Hide trash icon
        const trashIcon = document.getElementById('trash-icon');
        if (trashIcon) {
            trashIcon.style.display = 'none';
            trashIcon.classList.remove('drag-over-trash');
            trashIcon.style.background = 'rgba(220, 53, 69, 0.9)';
            trashIcon.style.transform = 'scale(1)';
        }
        
        // Stop auto-scrolling
        if (this.app && this.app.appState && this.app.appState.autoScrollInterval) {
            clearInterval(this.app.appState.autoScrollInterval);
            this.app.appState.autoScrollInterval = null;
        }
        
        // Don't clear dragData here - let drop handler clear it after processing
        // If drop didn't fire (drag cancelled), clear it after a delay
        if (!event.dataTransfer.dropEffect || event.dataTransfer.dropEffect === 'none') {
            setTimeout(() => {
                if (this.app && this.app.appState) {
                    this.app.appState.dragData = null;
                }
            }, 50);
        }
        
        // Remove all drag-over classes
        document.querySelectorAll('.drag-over').forEach(el => {
            el.classList.remove('drag-over');
        });
    }
    
    /**
     * Handle bin drag over
     * @param {Object} bin - Bin data object
     * @param {string} pageId - Page ID
     * @param {Event} event - Drag over event
     * @param {HTMLElement} binDiv - Bin div element
     */
    handleBinDragOver(bin, pageId, event, binDiv) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        
        // Use stored dragData if available, otherwise try to parse from dataTransfer
        const dragData = (this.app && this.app.appState && this.app.appState.dragData) || (() => {
            try {
                return JSON.parse(event.dataTransfer.getData('text/plain') || '{}');
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
    }
    
    /**
     * Handle bin drag leave
     * @param {Object} bin - Bin data object
     * @param {string} pageId - Page ID
     * @param {Event} event - Drag leave event
     * @param {HTMLElement} binDiv - Bin div element
     */
    handleBinDragLeave(bin, pageId, event, binDiv) {
        // Only remove class if we're leaving the bin div itself
        if (!binDiv.contains(event.relatedTarget)) {
            binDiv.classList.remove('drag-over');
        }
    }
    
    /**
     * Handle bin drop
     * @param {Object} bin - Bin data object
     * @param {string} pageId - Page ID
     * @param {Event} event - Drop event
     * @param {HTMLElement} binDiv - Bin div element
     */
    handleBinDrop(bin, pageId, event, binDiv) {
        event.preventDefault();
        event.stopPropagation();
        binDiv.classList.remove('drag-over');
        
        let dragData = (this.app && this.app.appState && this.app.appState.dragData) || null;
        if (!dragData) {
            try {
                const dataStr = event.dataTransfer.getData('text/plain');
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
        
        if (dragData && dragData.type === 'bin') {
            if (this.app && this.app.binManager) {
                this.app.binManager.moveBin(dragData.pageId, dragData.binId, pageId, bin.id);
            }
        } else if (dragData && dragData.type === 'element') {
            if (this.app && this.app.moveElement) {
                // Handle element drop logic (delegated to app)
                this.app.moveElement(
                    dragData.pageId, dragData.binId, dragData.elementIndex,
                    pageId, bin.id, bin.items.length,
                    dragData.isChild || false,
                    dragData.parentElementIndex || null,
                    dragData.childIndex || null
                );
            }
        }
        
        // Clear dragData after processing
        if (this.app && this.app.appState) {
            this.app.appState.dragData = null;
        }
    }
    
    /**
     * Handle bin expand/collapse
     * @param {Object} bin - Bin data object
     * @param {string} pageId - Page ID
     * @param {HTMLElement} toggleArrow - Toggle arrow element
     * @param {HTMLElement} binContent - Bin content element
     */
    handleBinExpandCollapse(bin, pageId, toggleArrow, binContent) {
        if (!this.app || !this.app.appState) return;
        
        const isCurrentlyExpanded = this.app.appState.groupStates[bin.id] !== false; // default to true
        this.app.appState.groupStates[bin.id] = !isCurrentlyExpanded;
        
        if (binContent) {
            binContent.style.display = this.app.appState.groupStates[bin.id] ? 'block' : 'none';
        }
        
        if (toggleArrow) {
            toggleArrow.textContent = this.app.appState.groupStates[bin.id] ? '▼' : '▶';
        }
        
        if (this.app.dataManager) {
            this.app.dataManager.saveData(); // Save collapse state
        }
    }
    
    /**
     * Setup bin title editing
     * @param {HTMLElement} titleElement - Title element
     * @param {Object} bin - Bin data object
     * @param {string} pageId - Page ID
     * @param {number} doubleClickDelay - Double click delay
     */
    setupBinTitleEditing(titleElement, bin, pageId, doubleClickDelay) {
        if (!titleElement || !this.app) return;
        
        // Use EventHelper for double-click detection on bin title
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
            doubleClickDelay
        );
        
        // Handle blur to save title
        titleElement.addEventListener('blur', (e) => {
            // Only save if it was actually editable
            if (e.target.contentEditable === 'true') {
                bin.title = e.target.textContent.trim() || 'Untitled Bin';
                e.target.contentEditable = 'false';
                if (this.app.dataManager) {
                    this.app.dataManager.saveData();
                }
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
    
    /**
     * Setup double-click handler for bin context menu
     * @param {HTMLElement} binDiv - Bin div element
     * @param {Function} handleBinMenu - Menu handler function
     * @param {number} doubleClickDelay - Double click delay
     */
    setupBinDoubleClick(binDiv, handleBinMenu, doubleClickDelay) {
        if (!binDiv) return;
        
        EventHelper.setupDoubleClick(
            binDiv,
            (e) => {
                // Don't trigger if clicking on title (handled separately)
                if (e.target.closest('.bin-title')) {
                    return;
                }
                // Double click detected - show context menu
                if (handleBinMenu) {
                    handleBinMenu(e);
                }
            },
            doubleClickDelay
        );
    }
    
    /**
     * Setup element list drop indicator handlers
     * @param {HTMLElement} elementsList - Elements list container
     * @param {Object} bin - Bin data object
     * @param {string} pageId - Page ID
     * @param {Function} calculateDropPosition - Function to calculate drop position
     */
    setupElementListDropHandlers(elementsList, bin, pageId, calculateDropPosition) {
        if (!elementsList || !this.app) return;
        
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
        
        // Throttle indicator updates using requestAnimationFrame
        let pendingUpdate = null;
        let lastMouseY = null;
        const MOUSE_MOVE_THRESHOLD = 2; // Only recalculate if mouse moved more than 2px
        
        // Helper function to calculate and show drop indicator
        const updateDropIndicator = (e) => {
            const dragData = (this.app && this.app.appState && this.app.appState.dragData) || (() => {
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
                if (pendingUpdate) {
                    cancelAnimationFrame(pendingUpdate);
                    pendingUpdate = null;
                }
                return;
            }
            
            e.preventDefault();
            e.stopPropagation();
            e.dataTransfer.dropEffect = 'move';
            
            // Throttle updates: only recalculate if mouse moved significantly
            const currentMouseY = e.clientY;
            if (lastMouseY !== null && Math.abs(currentMouseY - lastMouseY) < MOUSE_MOVE_THRESHOLD) {
                return; // Skip update if mouse hasn't moved much
            }
            lastMouseY = currentMouseY;
            
            // Cancel any pending update
            if (pendingUpdate) {
                cancelAnimationFrame(pendingUpdate);
            }
            
            // Schedule update for next animation frame
            pendingUpdate = requestAnimationFrame(() => {
                pendingUpdate = null;
                
                // Get root items for virtualized calculation
                const { ItemHierarchy } = require('../utils/ItemHierarchy.js');
                const rootItems = ItemHierarchy.getRootItems(bin.items || []);
                
                // Calculate drop position using helper
                const { insertIndex, targetElement } = calculateDropPosition(
                    elementsList,
                    currentMouseY,
                    rootItems,
                    bin
                );
                
                // Show visual indicator at the insertion point
                const virtualScroller = elementsList._virtualScroller;
                const needsRecreate = dropTargetIndex !== insertIndex || dropIndicator === null;
                
                if (needsRecreate) {
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
                }
                
                // Position indicator based on virtualization status
                if (virtualScroller && targetElement === null) {
                    // For virtualized lists without a target element, calculate position from heights
                    const scrollTop = elementsList.scrollTop;
                    const defaultHeight = viewportConfig.getDefaultHeight();
                    const rootItems = ItemHierarchy.getRootItems(bin.items || []);
                    let accumulatedHeight = 0;
                    
                    for (let i = 0; i < insertIndex && i < rootItems.length; i++) {
                        accumulatedHeight += virtualScroller.heightCache.get(i) || defaultHeight;
                    }
                    
                    // Calculate relative position (subtract scroll to get viewport-relative)
                    const indicatorY = accumulatedHeight - scrollTop;
                    
                    // Update position directly if indicator already exists
                    if (needsRecreate) {
                        // Position absolutely within the container
                        dropIndicator.style.position = 'absolute';
                        dropIndicator.style.left = '0';
                        dropIndicator.style.right = '0';
                        dropIndicator.style.width = '100%';
                        
                        // Ensure container has relative positioning
                        if (getComputedStyle(elementsList).position === 'static') {
                            elementsList.style.position = 'relative';
                        }
                        
                        elementsList.appendChild(dropIndicator);
                    }
                    
                    // Update position (even if we just created it, to ensure it's correct)
                    dropIndicator.style.top = `${indicatorY}px`;
                } else {
                    // Non-virtualized or has target element: use existing logic
                    if (needsRecreate) {
                        if (targetElement && elementsList.contains(targetElement) && targetElement.parentElement === elementsList) {
                            elementsList.insertBefore(dropIndicator, targetElement);
                        } else {
                            // Fallback: append to end
                            elementsList.appendChild(dropIndicator);
                        }
                    }
                }
            });
        };
        
        elementsList.addEventListener('dragover', updateDropIndicator);
        
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
            
            let dragData = (this.app && this.app.appState && this.app.appState.dragData) || null;
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
            
            if (dragData && dragData.type === 'element') {
                // Remove drop indicator
                if (elementsList._dropIndicator) {
                    elementsList._dropIndicator.remove();
                    elementsList._dropIndicator = null;
                }
                
                // PRIORITY: Always use the indicator position if available
                let targetIndex = bin.items.length; // Default to end
                let targetElement = null;
                
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
                    const sourcePage = (this.app && this.app.appState && this.app.appState.documents)?.find(page => page.id === dragData.pageId);
                    const sourceBin = sourcePage?.groups?.find(bin => bin.id === dragData.binId);
                    if (sourceBin && bin.id === dragData.binId && pageId === dragData.pageId && sourceBin.items[dragData.parentElementIndex]) {
                        // Place immediately after parent
                        targetIndex = dragData.parentElementIndex + 1;
                    }
                }
                
                // moveElement will handle un-nesting if isChild is true
                if (this.app && this.app.moveElement) {
                    this.app.moveElement(
                        dragData.pageId, dragData.binId, dragData.elementIndex,
                        pageId, bin.id, targetIndex,
                        dragData.isChild || false,
                        dragData.parentElementIndex || null,
                        dragData.childIndex || null
                    );
                }
                
                // Clean up drag-over classes
                document.querySelectorAll('.drag-over').forEach(el => {
                    el.classList.remove('drag-over');
                });
            }
            
            // Clear dragData after processing
            if (this.app && this.app.appState) {
                this.app.appState.dragData = null;
            }
        });
    }
};

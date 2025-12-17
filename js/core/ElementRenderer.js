// ElementRenderer.js - Handles element and children rendering
// Extracted from app.js to improve modularity
import { eventBus } from './EventBus.js';
import { EVENTS } from './AppEvents.js';
import { ElementTypeRegistry } from './elements/ElementTypeRegistry.js';
import { SharedDragDrop } from '../utils/SharedDragDrop.js';

/**
 * ElementRenderer - Handles rendering of elements and their children
 * 
 * This class extracts element rendering logic from app.js to improve modularity.
 */
export class ElementRenderer {
    constructor(app) {
        this.app = app;
        this.typeRegistry = new ElementTypeRegistry(app);
        this.sharedDragDrop = null; // Initialize on first use
    }
    
    /**
     * Render children elements
     * @param {string} pageId - Page ID
     * @param {string} binId - Bin ID
     * @param {Object} parentElement - Parent element data
     * @param {number} parentElementIndex - Parent element index
     * @param {number} depth - Current nesting depth
     * @returns {HTMLElement|null} The rendered children container or null
     */
    renderChildren(pageId, binId, parentElement, parentElementIndex, depth = 0) {
        // Limit to one level for current implementation
        if (depth > 1) {
            return null;
        }
        
        if (!parentElement.children || !Array.isArray(parentElement.children) || parentElement.children.length === 0) {
            return null;
        }
        
        const container = document.createElement('div');
        container.className = 'children-container';
        
        // Get or initialize children state
        const childrenStateKey = `${binId}-${parentElementIndex}`;
        if (!(childrenStateKey in this.app.appState.subtaskStates)) {
            this.app.appState.subtaskStates[childrenStateKey] = this.app.appState.allSubtasksExpanded;
        }
        const isExpanded = this.app.appState.subtaskStates[childrenStateKey];
        
        const content = document.createElement('div');
        content.className = 'dropdown-content';
        content.style.display = isExpanded ? 'block' : 'none';
        content.dataset.pageId = pageId;
        content.dataset.binId = binId;
        content.dataset.parentElementIndex = parentElementIndex;
        
        // Add drop indicator support for nested children (same as regular elements)
        // Store indicator reference on the content container
        content._dropIndicator = null;
        content._dropTargetIndex = null;
        
        content.addEventListener('dragover', (e) => {
            // Only handle if dragging a child element within the same parent
            const dragData = this.app.appState.dragData || (() => {
                try {
                    return JSON.parse(e.dataTransfer.getData('text/plain') || '{}');
                } catch {
                    return {};
                }
            })();
            
            if (dragData.type !== 'element' || !dragData.isChild) {
                // Remove indicator if not dragging a child element
                if (content._dropIndicator) {
                    content._dropIndicator.remove();
                    content._dropIndicator = null;
                    content._dropTargetIndex = null;
                }
                return;
            }
            
            // Only show indicator if dragging a child of the same parent
            if (dragData.parentElementIndex !== parentElementIndex) {
                // Remove indicator if dragging from different parent
                if (content._dropIndicator) {
                    content._dropIndicator.remove();
                    content._dropIndicator = null;
                    content._dropTargetIndex = null;
                }
                return;
            }
            
            e.preventDefault();
            e.stopPropagation();
            e.dataTransfer.dropEffect = 'move';
            
            // Calculate drop position based on mouse Y - always show indicator
            const mouseY = e.clientY;
            const contentRect = content.getBoundingClientRect();
            const relativeY = mouseY - contentRect.top;
            
            // Find which position we're hovering over
            const childElements = Array.from(content.querySelectorAll('.element.child-element'));
            let insertIndex = parentElement.children.length; // Default to end
            let targetElement = null;
            
            for (let i = 0; i < childElements.length; i++) {
                const elementRect = childElements[i].getBoundingClientRect();
                const elementTop = elementRect.top - contentRect.top;
                const elementBottom = elementRect.bottom - contentRect.top;
                const elementMiddle = (elementTop + elementBottom) / 2;
                
                // If mouse is above the middle of this element, insert before it
                if (relativeY < elementMiddle) {
                    const childIndexStr = childElements[i].dataset.childIndex;
                    if (childIndexStr) {
                        const childIndex = parseInt(childIndexStr);
                        if (!isNaN(childIndex)) {
                            insertIndex = childIndex;
                            targetElement = childElements[i];
                        }
                    }
                    break;
                }
            }
            
            // Update drop indicator
            let childDropIndicator = content._dropIndicator;
            const currentTargetIndex = content._dropTargetIndex;
            
            if (currentTargetIndex !== insertIndex || childDropIndicator === null) {
                // Clear ALL drop indicators before showing a new one
                // Clear all elements list indicators
                document.querySelectorAll('.elements-list').forEach(list => {
                    if (list._dropIndicator) {
                        list._dropIndicator.remove();
                        list._dropIndicator = null;
                        list._dropTargetIndex = null;
                    }
                });
                
                // Clear all nested children container indicators
                document.querySelectorAll('.dropdown-content').forEach(c => {
                    if (c._dropIndicator) {
                        c._dropIndicator.remove();
                        c._dropIndicator = null;
                        c._dropTargetIndex = null;
                    }
                });
                
                // Also clear any orphaned indicators (safety check)
                document.querySelectorAll('.drop-indicator').forEach(indicator => {
                    indicator.remove();
                });
                
                childDropIndicator = null;
                
                // Create new indicator
                childDropIndicator = document.createElement('div');
                childDropIndicator.className = 'drop-indicator';
                childDropIndicator.style.cssText = `
                    height: 2px;
                    background: #4a9eff;
                    margin: 4px 0;
                    border-radius: 1px;
                    pointer-events: none;
                    position: relative;
                    z-index: 1000;
                `;
                
                // Store reference
                content._dropIndicator = childDropIndicator;
                content._dropTargetIndex = insertIndex;
                
                // Insert indicator at the correct position
                if (targetElement && content.contains(targetElement) && targetElement.parentElement === content) {
                    content.insertBefore(childDropIndicator, targetElement);
                } else {
                    // Fallback: append to end
                    content.appendChild(childDropIndicator);
                }
            }
        });
        
        content.addEventListener('dragleave', (e) => {
            // Remove indicator when leaving the children container
            if (!content.contains(e.relatedTarget)) {
                if (content._dropIndicator) {
                    content._dropIndicator.remove();
                    content._dropIndicator = null;
                    content._dropTargetIndex = null;
                }
            }
        });
        
        content.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // Remove indicator on drop
            if (content._dropIndicator) {
                content._dropIndicator.remove();
                content._dropIndicator = null;
            }
            
            // Handle drop between children (when dropping in gap, not on element)
            const dragData = this.app.appState.dragData || (() => {
                try {
                    return JSON.parse(e.dataTransfer.getData('text/plain') || '{}');
                } catch {
                    return {};
                }
            })();
            
            if (dragData.type === 'element' && dragData.isChild && dragData.parentElementIndex === parentElementIndex) {
                // Dropping a child element in a gap between children - reorder within same parent
                if (content._dropTargetIndex !== null && content._dropTargetIndex !== undefined) {
                    const pageFormat = this.app.formatRendererManager?.getPageFormat(pageId);
                    if (pageFormat) {
                        this.app.renderService.getRenderer()._preservingFormat = true;
                    }
                    this.app.reorderChildElement(pageId, binId, parentElementIndex, dragData.childIndex, content._dropTargetIndex);
                }
            }
            
            content._dropTargetIndex = null;
        });
        
        parentElement.children.forEach((child, childIndex) => {
            // For nested children, we use a special identifier: parentIndex-childIndex
            // But for rendering purposes, we still need to track the parent
            const childEl = this.renderElement(pageId, binId, child, `${parentElementIndex}-${childIndex}`, childIndex, depth + 1);
            if (childEl) {
                // Mark as child element for styling
                childEl.classList.add('child-element');
                content.appendChild(childEl);
            }
        });
        
        container.appendChild(content);
        return container;
    }

    
    /**
     * Render an element
     * @param {string} pageId - Page ID
     * @param {string} binId - Bin ID
     * @param {Object} element - Element data
     * @param {number|string} elementIndex - Element index (may be string like "0-1" for nested children)
     * @param {number|null} childIndex - Child index if nested
     * @param {number} depth - Current nesting depth
     * @returns {HTMLElement} The rendered element
     */
        renderElement(pageId, binId, element, elementIndex, childIndex = null, depth = 0) {
        const div = document.createElement('div');
        
        // Determine element classification for styling
        const classes = ['element', element.type];
        if (element.completed) classes.push('completed');
        
        // Classification logic (order matters - most specific first)
        // Persistent elements get no special styling class
        if (!(element.persistent || element.type === 'image' || element.type === 'calendar')) {
            // Determine primary classification (only one primary class)
            if (element.repeats === false) {
                // One-time task - will be deleted when completed and day resets
                classes.push('one-time');
            } else if (element.recurringSchedule && element.recurringSchedule !== 'daily') {
                // Recurring schedule (non-daily) - weekly, monthly, custom
                classes.push('recurring-schedule');
            } else if (element.repeats === true || (element.repeats !== false && !element.recurringSchedule)) {
                // Repeating daily - default repeating behavior
                classes.push('repeating-daily');
            }
            
            // Deadline can coexist with other classifications (add as secondary indicator)
            if (element.deadline) {
                classes.push('has-deadline');
            }
        }
        
        div.className = classes.join(' ');
        
        // Setup drag and drop - use shared functionality for text/checkbox elements in vertical/horizontal layouts
        // Check if we're in a format that supports shared drag-drop (vertical/horizontal)
        const pageFormat = this.app.formatRendererManager?.getPageFormat?.(pageId);
        const supportsSharedDragDrop = !pageFormat || pageFormat === 'grid-layout-format' || pageFormat === 'horizontal-layout-format';
        
        if (supportsSharedDragDrop && (element.type === 'task' || element.type === 'note' || element.type === 'header-checkbox' || element.type === 'text')) {
            // Use shared drag-drop for text/checkbox elements
            // Initialize shared drag-drop if not already done
            if (!this.sharedDragDrop) {
                this.sharedDragDrop = new SharedDragDrop(this.app);
            }
            this.sharedDragDrop.setupElementDragDrop(div, pageId, binId, elementIndex, element);
        } else {
            // Use standard drag-drop for other elements
            div.draggable = true;
            div.dataset.dragType = 'element';
            div.dataset.pageId = pageId;
            div.dataset.binId = binId;
            div.dataset.elementIndex = elementIndex;
        }
        
        // Add progress bar plugin if enabled
        if (element.progress !== undefined) {
            const progressBarPlugin = document.createElement('div');
            progressBarPlugin.className = 'element-progress-bar';
            progressBarPlugin.style.position = 'absolute';
            progressBarPlugin.style.top = '0';
            progressBarPlugin.style.left = '0';
            progressBarPlugin.style.width = `${Math.min(100, Math.max(0, element.progress))}%`;
            progressBarPlugin.style.height = '100%';
            progressBarPlugin.style.backgroundColor = 'rgba(74, 158, 255, 0.2)';
            progressBarPlugin.style.transition = 'width 0.3s ease';
            progressBarPlugin.style.pointerEvents = 'none';
            progressBarPlugin.style.zIndex = '0';
            div.appendChild(progressBarPlugin);
        }
        
        // Add deadline countdown if enabled
        if (element.deadline) {
            const deadlineDiv = document.createElement('div');
            deadlineDiv.className = 'element-deadline';
            deadlineDiv.style.position = 'absolute';
            deadlineDiv.style.top = '5px';
            deadlineDiv.style.right = '5px';
            deadlineDiv.style.fontSize = '11px';
            deadlineDiv.style.color = '#ff6b6b';
            deadlineDiv.style.zIndex = '10';
            deadlineDiv.style.pointerEvents = 'none';
            
            const updateDeadline = () => {
                const now = new Date();
                const deadline = new Date(element.deadline);
                const diff = deadline - now;
                
                if (diff < 0) {
                    deadlineDiv.textContent = 'Overdue';
                    deadlineDiv.style.color = '#ff0000';
                } else {
                    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                    
                    if (days > 0) {
                        deadlineDiv.textContent = `${days}d left`;
                    } else {
                        deadlineDiv.textContent = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
                    }
                    deadlineDiv.style.color = days === 0 ? '#ff6b6b' : '#ffa500';
                }
            };
            updateDeadline();
            // Update every minute
            const deadlineInterval = setInterval(updateDeadline, 60000);
            div._deadlineInterval = deadlineInterval;
            
            div.appendChild(deadlineDiv);
        }
        // Handle nested children - elementIndex might be a string like "0-1"
        if (typeof elementIndex === 'string' && elementIndex.includes('-')) {
            const parts = elementIndex.split('-');
            div.dataset.elementIndex = parts[0]; // Parent index
            div.dataset.childIndex = parts[1]; // Child index
            div.dataset.isChild = 'true';
        } else {
        div.dataset.elementIndex = elementIndex;
            div.dataset.isChild = 'false';
        }
        div.dataset.pageId = pageId;
        
        // Context menu is now handled by unified handler in EventHandler
        
        // Custom double-click detection with shorter delay
        let lastClickTime = 0;
        let isDragging = false;
        let mouseDownTime = 0;
        let mouseDownPos = null;
        let dragStarted = false;
        
        const handleMouseDown = (e) => {
            // Don't track if clicking on interactive elements (checkboxes, buttons, inputs)
            if (e.target.closest('input') || e.target.closest('button') || e.target.closest('textarea')) {
                return;
            }
            // Don't prevent default - let dragstart work normally
            mouseDownTime = Date.now();
            mouseDownPos = { x: e.clientX, y: e.clientY };
            isDragging = false;
            dragStarted = false;
        };
        
        const handleMouseMove = (e) => {
            // Detect if mouse moved significantly (dragging, not clicking)
            if (mouseDownPos && mouseDownTime > 0 && !dragStarted) {
                const dx = Math.abs(e.clientX - mouseDownPos.x);
                const dy = Math.abs(e.clientY - mouseDownPos.y);
                if (dx > 5 || dy > 5) {
                    isDragging = true;
                }
            }
        };
        
        const handleMouseUp = () => {
            if (!dragStarted) {
                mouseDownTime = 0;
                mouseDownPos = null;
                isDragging = false;
            }
        };
        
        div.addEventListener('mousedown', handleMouseDown);
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        
        // Store cleanup function on element
        div._cleanupDragListeners = () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
        
        div.addEventListener('click', (e) => {
            // Skip click handling if we were dragging or drag started
            if (isDragging || dragStarted) {
                isDragging = false;
                dragStarted = false;
                mouseDownTime = 0;
                mouseDownPos = null;
                return;
            }
            
            // Track active page
            this.app.appState.currentPageId = pageId;
            
            // Don't trigger on interactive elements (checkboxes, buttons, inputs)
            if (e.target.closest('input') || e.target.closest('button')) {
                return;
            }
            
            const now = Date.now();
            const timeSinceLastClick = now - lastClickTime;
            
            if (timeSinceLastClick < this.app.appState.doubleClickDelay && timeSinceLastClick > 0) {
                // Double click detected
                e.preventDefault();
                e.stopPropagation();
                lastClickTime = 0; // Reset to prevent triple-click
                this.app.showContextMenu(e, pageId, binId, elementIndex);
            } else {
                // Single click - wait to see if another click comes
                lastClickTime = now;
            }
            
            mouseDownTime = 0;
            mouseDownPos = null;
        });
        
        // Drag and drop handlers for elements
        div.addEventListener('dragstart', (e) => {
            // Don't start drag if clicking on interactive elements (checkboxes, buttons, inputs, etc.)
            if (e.target.closest('input') || e.target.closest('button') || e.target.closest('textarea')) {
                e.preventDefault();
                return;
            }
            
            // Stop propagation to prevent page dragstart from firing
            e.stopPropagation();
            
            // Clear all drag-over classes when starting a new drag
            document.querySelectorAll('.element.drag-over, .element.nest-target').forEach(el => {
                el.classList.remove('drag-over');
                el.classList.remove('nest-target');
            });
            this.app.appState.currentDragOverElement = null;
            
            dragStarted = true; // Mark that drag has started
            isDragging = true; // Mark as dragging to prevent click handler
            this.app.appState.isDragging = true; // Track dragging state for scroll handlers
            
            e.dataTransfer.effectAllowed = 'move';
            
            // Handle nested children - determine actual pageId and elementIndex
            let actualPageId = pageId;
            let actualElementIndex = elementIndex;
            let isChild = false;
            let parentElementIndex = null;
            let childIndex = null;
            
            if (typeof elementIndex === 'string' && elementIndex.includes('-')) {
                // This is a nested child
                const parts = elementIndex.split('-');
                actualElementIndex = parseInt(parts[0]);
                childIndex = parseInt(parts[1]);
                isChild = true;
                parentElementIndex = actualElementIndex;
            } else {
                actualElementIndex = parseInt(elementIndex);
            }
            
            const data = {
                type: 'element',
                pageId: actualPageId,
                binId: binId,
                elementIndex: actualElementIndex,
                isChild: isChild,
                parentElementIndex: parentElementIndex,
                childIndex: childIndex
            };
            // Log element selected for nesting debugging
            const sourcePage = this.app.appState.pages.find(p => p.id === actualPageId);
            const sourceBin = sourcePage?.bins?.find(b => b.id === binId);
            const sourceElement = isChild && parentElementIndex !== null && childIndex !== null
                ? (sourceBin?.elements[parentElementIndex]?.children?.[childIndex])
                : (sourceBin?.elements[actualElementIndex]);
            const elementText = sourceElement?.text || 'N/A';
            
            console.log('📌 ELEMENT SELECTED:', {
                page: actualPageId,
                index: actualElementIndex,
                isChild: isChild,
                parentIndex: parentElementIndex,
                childIndex: childIndex,
                text: elementText,
                location: `${actualPageId}-${actualElementIndex}${isChild ? ` (child of ${parentElementIndex})` : ''}`
            });
            
            e.dataTransfer.setData('text/plain', JSON.stringify(data));
            this.app.appState.dragData = data;
            div.classList.add('dragging');
            
            // Show trash icon
            const trashIcon = document.getElementById('trash-icon');
            if (trashIcon) {
                trashIcon.style.display = 'flex';
            }
        });
        
        
        // Store a reference to maintain highlight state
        // Use an object so child handlers can access it
        const dragLeaveTimeoutRef = { value: null };
        // Flag to track if we're actively dragging over this element
        const isDraggingOverRef = { value: false };
        
        // Helper function to check if mouse coordinates are within element bounds
        const isMouseInBounds = (x, y) => {
            const rect = div.getBoundingClientRect();
            return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
        };
        
        div.addEventListener('dragend', (e) => {
            div.classList.remove('dragging');
            isDragging = false;
            dragStarted = false;
            mouseDownTime = 0;
            mouseDownPos = null;
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
            
            // Clear nesting target
            this.app.appState.nestTargetElement = null;
            document.querySelectorAll('.nest-target').forEach(el => {
                el.classList.remove('nest-target');
            });
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
            // Clear the dragging flag
            isDraggingOverRef.value = false;
        });
        
        div.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation(); // Prevent page dragover from handling this

            const dragData = this.app.appState.dragData || (() => {
                try {
                    return JSON.parse(e.dataTransfer.getData('text/plain') || '{}');
                } catch {
                    return {};
                }
            })();
            
            // Clear any pending dragleave timeout (prevents flicker)
            if (dragLeaveTimeoutRef.value) {
                clearTimeout(dragLeaveTimeoutRef.value);
                dragLeaveTimeoutRef.value = null;
            }
            
            // Check if we're dragging over any part of this element (including gaps)
            // This includes child elements, task-header, or the div itself
            const isOverElement = div.contains(e.target) || e.target === div;
            const isOverChildElement = isOverElement && e.target !== div;
            
            // Also check if mouse is actually over the element using elementFromPoint
            // This catches gaps between child elements
            const elementUnderMouse = document.elementFromPoint(e.clientX, e.clientY);
            const isOverElementByPosition = elementUnderMouse && (div.contains(elementUnderMouse) || elementUnderMouse === div);
            
            // Check if dragging over a checkbox early - need to handle this before setting dropEffect
            const target = e.target;
            let checkbox = null;
            if (target && target.type === 'checkbox') {
                checkbox = target;
            } else if (target) {
                checkbox = target.closest('input[type="checkbox"]');
            }
            const isOverCheckbox = checkbox !== null && checkbox.closest('.element') === div;
            
            // Update drop indicator - check if we're in a nested children container first
            const targetIsChild = div.dataset.isChild === 'true';
            const childrenContent = div.closest('.dropdown-content');
            
            // If dragging a child element and hovering over a child element in the same parent, update children container indicator
            if (dragData.type === 'element' && dragData.isChild && targetIsChild) {
                const targetParentIndex = div.dataset.elementIndex ? parseInt(div.dataset.elementIndex.split('-')[0]) : null;
                if (childrenContent && dragData.parentElementIndex === targetParentIndex) {
                    // Calculate drop position in children container
                    const mouseY = e.clientY;
                    const contentRect = childrenContent.getBoundingClientRect();
                    const relativeY = mouseY - contentRect.top;
                    
                    const childElements = Array.from(childrenContent.querySelectorAll('.element.child-element'));
                    let insertIndex = childrenContent.dataset.parentElementIndex !== undefined ? 
                        (this.app.appState.pages.find(p => p.id === pageId)?.bins?.find(b => b.id === binId)?.elements[parseInt(childrenContent.dataset.parentElementIndex)]?.children?.length || 0) : 0;
                    let targetElement = null;
                    
                    for (let i = 0; i < childElements.length; i++) {
                        const elementRect = childElements[i].getBoundingClientRect();
                        const elementTop = elementRect.top - contentRect.top;
                        const elementBottom = elementRect.bottom - contentRect.top;
                        const elementMiddle = (elementTop + elementBottom) / 2;
                        
                        if (relativeY < elementMiddle) {
                            const childIndexStr = childElements[i].dataset.childIndex;
                            if (childIndexStr) {
                                const childIndex = parseInt(childIndexStr);
                                if (!isNaN(childIndex)) {
                                    insertIndex = childIndex;
                                    targetElement = childElements[i];
                                }
                            }
                            break;
                        }
                    }
                    
                    // Update children container drop indicator
                    let childDropIndicator = childrenContent._dropIndicator;
                    const currentTargetIndex = childrenContent._dropTargetIndex;
                    
                    if (currentTargetIndex !== insertIndex || childDropIndicator === null) {
                        // Clear ALL drop indicators before showing a new one
                        // Clear all elements list indicators
                        document.querySelectorAll('.elements-list').forEach(list => {
                            if (list._dropIndicator) {
                                list._dropIndicator.remove();
                                list._dropIndicator = null;
                                list._dropTargetIndex = null;
                            }
                        });
                        
                        // Clear all nested children container indicators
                        document.querySelectorAll('.dropdown-content').forEach(c => {
                            if (c._dropIndicator) {
                                c._dropIndicator.remove();
                                c._dropIndicator = null;
                                c._dropTargetIndex = null;
                            }
                        });
                        
                        // Also clear any orphaned indicators (safety check)
                        document.querySelectorAll('.drop-indicator').forEach(indicator => {
                            indicator.remove();
                        });
                        
                        childDropIndicator = null;
                        
                        childDropIndicator = document.createElement('div');
                        childDropIndicator.className = 'drop-indicator';
                        childDropIndicator.style.cssText = `
                            height: 2px;
                            background: #4a9eff;
                            margin: 4px 0;
                            border-radius: 1px;
                            pointer-events: none;
                            position: relative;
                            z-index: 1000;
                        `;
                        
                        childrenContent._dropIndicator = childDropIndicator;
                        childrenContent._dropTargetIndex = insertIndex;
                        
                        if (targetElement && childrenContent.contains(targetElement) && targetElement.parentElement === childrenContent) {
                            childrenContent.insertBefore(childDropIndicator, targetElement);
                        } else {
                            childrenContent.appendChild(childDropIndicator);
                        }
                    }
                }
            } else {
                // Update main elements list drop indicator for regular elements
                const elementsList = div.closest('.elements-list');
                if (elementsList && dragData.type === 'element') {
                    // Calculate drop position based on mouse Y
                    const mouseY = e.clientY;
                    const elementsListRect = elementsList.getBoundingClientRect();
                    const relativeY = mouseY - elementsListRect.top;
                    
                    // Get all regular elements (not nested children) in the list
                    const allElements = Array.from(elementsList.querySelectorAll('.element:not(.child-element)'));
                    let insertIndex = allElements.length; // Default to end
                    let targetElement = null;
                    
                    // Find which position we're hovering over
                    for (let i = 0; i < allElements.length; i++) {
                        const elementRect = allElements[i].getBoundingClientRect();
                        const elementTop = elementRect.top - elementsListRect.top;
                        const elementBottom = elementRect.bottom - elementsListRect.top;
                        const elementMiddle = (elementTop + elementBottom) / 2;
                        
                        // If mouse is above the middle of this element, insert before it
                        if (relativeY < elementMiddle) {
                            const elementIndexStr = allElements[i].dataset.elementIndex;
                            if (elementIndexStr) {
                                if (typeof elementIndexStr === 'string' && elementIndexStr.includes('-')) {
                                    const parentIndex = parseInt(elementIndexStr.split('-')[0]);
                                    if (!isNaN(parentIndex)) {
                                        insertIndex = parentIndex;
                                        targetElement = allElements[i];
                                    }
                                } else {
                                    const elementIndex = parseInt(elementIndexStr);
                                    if (!isNaN(elementIndex)) {
                                        insertIndex = elementIndex;
                                        targetElement = allElements[i];
                                    }
                                }
                            }
                            break;
                        }
                    }
                    
                    // If we didn't find a target element, check if we should append at the end
                    if (targetElement === null) {
                        const page = this.app.appState.pages.find(p => p.id === pageId);
                        const bin = page?.bins?.find(b => b.id === binId);
                        if (bin && insertIndex >= bin.elements.length) {
                            const addButton = elementsList.querySelector('.add-element-btn');
                            if (addButton) {
                                targetElement = addButton;
                            }
                        }
                    }
                    
                    // Update drop indicator
                    let dropIndicator = elementsList._dropIndicator;
                    const currentTargetIndex = elementsList._dropTargetIndex;
                    
                    if (currentTargetIndex !== insertIndex || dropIndicator === null) {
                        // Clear ALL drop indicators before showing a new one
                        // Clear all elements list indicators
                        document.querySelectorAll('.elements-list').forEach(list => {
                            if (list._dropIndicator) {
                                list._dropIndicator.remove();
                                list._dropIndicator = null;
                                list._dropTargetIndex = null;
                            }
                        });
                        
                        // Clear all nested children container indicators
                        document.querySelectorAll('.dropdown-content').forEach(c => {
                            if (c._dropIndicator) {
                                c._dropIndicator.remove();
                                c._dropIndicator = null;
                                c._dropTargetIndex = null;
                            }
                        });
                        
                        // Also clear any orphaned indicators (safety check)
                        document.querySelectorAll('.drop-indicator').forEach(indicator => {
                            indicator.remove();
                        });
                        
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
                }
            }
            
            // If over any part of the element (by target or by position), always allow drop to prevent "no" cursor
            // BUT don't set dropEffect yet if we're over a checkbox - let the checkbox handling code set it
            if ((isOverElement || isOverElementByPosition) && dragData.type === 'element') {
                // Clear drag-over from other elements first
                if (this.app.appState.currentDragOverElement && this.app.appState.currentDragOverElement !== div) {
                    this.app.appState.currentDragOverElement.classList.remove('drag-over');
                    this.app.appState.currentDragOverElement.classList.remove('nest-target');
                }
                
                // Only set dropEffect to 'move' if we're NOT over a checkbox
                // Checkbox handling will set it to 'copy' or 'move' as appropriate
                if (!isOverCheckbox) {
                e.dataTransfer.dropEffect = 'move';
                }
                div.classList.add('drag-over');
                this.app.appState.currentDragOverElement = div; // Track this as the current drag-over element
                // Set flag to indicate we're actively dragging over this element
                isDraggingOverRef.value = true;
                // Clear any pending dragleave timeout
                if (dragLeaveTimeoutRef.value) {
                    clearTimeout(dragLeaveTimeoutRef.value);
                    dragLeaveTimeoutRef.value = null;
                }
            } else {
                // Not over this element - clear flag and remove classes immediately
                isDraggingOverRef.value = false;
                div.classList.remove('drag-over');
                div.classList.remove('nest-target');
                if (this.app.appState.currentDragOverElement === div) {
                    this.app.appState.currentDragOverElement = null;
                }
            }
            

            // Only allow dropping elements on elements within the same page or different page
            // For child elements, compare parent indices; for regular elements, compare element indices
            const sourceIsChild = dragData.isChild || false;
            const sourceElementIndex = sourceIsChild ? dragData.parentElementIndex : dragData.elementIndex;
            // targetIsChild already declared above at line 2420
            let targetElementIndex = elementIndex;
            if (typeof elementIndex === 'string' && elementIndex.includes('-')) {
                targetElementIndex = parseInt(elementIndex.split('-')[0]);
            } else {
                targetElementIndex = parseInt(elementIndex);
            }
            
            // If dragging over any part of the element (by target or position), always allow drop and maintain highlight
            // This prevents flickering when moving between child elements or gaps
            const isOverAnyPart = isOverElement || isOverElementByPosition;
            const canDrop = isOverAnyPart && dragData.type === 'element' ? true :
                (dragData.type === 'element' &&
                (dragData.pageId !== pageId || sourceElementIndex !== targetElementIndex || 
                 (sourceIsChild && dragData.parentElementIndex !== targetElementIndex)));

            // Handle checkbox case FIRST - checkboxes always allow drop for nesting, even if canDrop is false
            if (isOverCheckbox && checkbox && dragData.type === 'element') {
                // Debug logging disabled
                // console.log('✅ CHECKBOX DRAGOVER DETECTED - handling checkbox case');
                    // Find the element that contains this checkbox
                    const checkboxContainer = checkbox.closest('.element');
                    let actualElementIndex = targetElementIndex;
                    if (checkboxContainer) {
                        const containerPageId = checkboxContainer.dataset.pageId;
                        const containerBinId = checkboxContainer.dataset.binId;
                        const containerElementIndexStr = checkboxContainer.dataset.elementIndex;
                        if (containerPageId === pageId && containerBinId === binId && containerElementIndexStr) {
                            // If it's a child element, get the parent index
                            if (typeof containerElementIndexStr === 'string' && containerElementIndexStr.includes('-')) {
                                actualElementIndex = parseInt(containerElementIndexStr.split('-')[0]);
                            } else {
                                actualElementIndex = parseInt(containerElementIndexStr);
                            }
                        }
                    }
                    
                    // Check if this is a valid nesting target
                    const targetPage = this.app.appState.pages.find(p => p.id === pageId);
                    const targetBin = targetPage?.bins?.find(b => b.id === binId);
                    const targetElement = targetBin && targetBin.elements[actualElementIndex];
                    // Check if any existing children have their own children (enforce one-level limit)
                    const hasNestedChildren = targetElement && targetElement.children &&
                        targetElement.children.some(child => child.children && child.children.length > 0);
                    const canNest = targetElement && !hasNestedChildren;

                    // Debug logging disabled
                    // console.log('🔍 CHECKBOX NESTING CHECK:', {
                    //     pageId,
                    //     binId,
                    //     actualElementIndex,
                    //     targetElementFound: !!targetElement,
                    //     targetElementText: targetElement?.text,
                    //     hasNestedChildren,
                    //     canNest,
                    //     dropEffectBefore: e.dataTransfer.dropEffect
                    // });

                    if (canNest) {
                        e.dataTransfer.dropEffect = 'copy'; // Visual indicator for nesting
                        const wasNestTarget = div.classList.contains('nest-target');
                        div.classList.add('nest-target');
                        this.app.appState.nestTargetElement = { pageId, binId, elementIndex: actualElementIndex };
                        // Debug logging disabled
                        // console.log('✅ CHECKBOX: canNest=true, set dropEffect=copy, nestTargetElement:', this.app.appState.nestTargetElement, 'dropEffectAfter:', e.dataTransfer.dropEffect);
                    } else {
                        // Even if can't nest, still allow drop to prevent "no" cursor
                        // The drop handler will prevent actual nesting if invalid
                        e.dataTransfer.dropEffect = 'move';
                        const wasNestTarget = div.classList.contains('nest-target');
                        div.classList.remove('nest-target');
                        this.app.appState.nestTargetElement = null;
                        // Debug logging disabled
                        // console.log('⚠️ CHECKBOX: canNest=false, set dropEffect=move (nesting not allowed but drop allowed), dropEffectAfter:', e.dataTransfer.dropEffect);
                    }
            } else if (canDrop) {
                // Debug logging disabled
                // console.log('✅ CAN_DROP=true (not checkbox), handling normal drop case');
                // Handle other drop cases (not checkbox)
                if (targetIsChild && !dragData.isChild) {
                    // Dropping a regular element over a child element - will nest as child of same parent
                    // Extract parent index from child element index (format: "parentIndex-childIndex")
                    const targetParentIndex = div.dataset.elementIndex ? parseInt(div.dataset.elementIndex.split('-')[0]) : null;
                    e.dataTransfer.dropEffect = 'copy'; // Visual indicator for nesting
                    const wasNestTarget = div.classList.contains('nest-target');
                    div.classList.add('nest-target');
                    // if (!wasNestTarget) {
                    //     console.log('🟢 HIGHLIGHT ON (nest-target, child parent):', `${pageId}-${targetParentIndex}`, 'at', e.clientX, e.clientY);
                    // }
                    // Set nest target to the parent element
                    if (targetParentIndex !== null) {
                        this.app.appState.nestTargetElement = { pageId, binId, elementIndex: targetParentIndex };
                    }
                } else {
                    // Check if this is rearranging nested children within the same parent
                    const targetParentIndex = div.dataset.elementIndex ? parseInt(div.dataset.elementIndex.split('-')[0]) : null;

                    if (dragData.isChild && targetIsChild && dragData.parentElementIndex === targetParentIndex) {
                        // Both source and target are children of the same parent - allow reordering
                        e.dataTransfer.dropEffect = 'move';
                        const wasDragOver = div.classList.contains('drag-over');
                        div.classList.add('drag-over');
                        // if (!wasDragOver) {
                        //     console.log('🟢 HIGHLIGHT ON (drag-over, reorder children):', `${pageId}-${elementIndex}`, 'at', e.clientX, e.clientY);
                        // }
                        const wasNestTarget = div.classList.contains('nest-target');
                        div.classList.remove('nest-target');
                        // if (wasNestTarget) {
                        //     console.log('🔴 HIGHLIGHT OFF (nest-target):', `${pageId}-${elementIndex}`, 'at', e.clientX, e.clientY);
                        // }
                        this.app.appState.nestTargetElement = null;
                    } else {
                        // Regular element move or un-nesting child element
                        e.dataTransfer.dropEffect = 'move';
                        const wasDragOver = div.classList.contains('drag-over');
                        div.classList.add('drag-over');
                        // if (!wasDragOver) {
                        //     console.log('🟢 HIGHLIGHT ON (drag-over, regular move):', `${pageId}-${elementIndex}`, 'at', e.clientX, e.clientY);
                        // }
                        const wasNestTarget = div.classList.contains('nest-target');
                        div.classList.remove('nest-target');
                        // if (wasNestTarget) {
                        //     console.log('🔴 HIGHLIGHT OFF (nest-target):', `${pageId}-${elementIndex}`, 'at', e.clientX, e.clientY);
                        // }
                        this.app.appState.nestTargetElement = null;
                    }
                }
            } else {
                // Debug logging disabled
                // console.log('❌ CAN_DROP=false, isOverAnyPart:', isOverAnyPart, 'dragData.type:', dragData.type);
                // If we're over any part of the element (including gaps), maintain highlight
                // This prevents "no" cursor when moving between text, arrow, and checkbox
                if (isOverAnyPart && dragData.type === 'element') {
                    // Over element area but canDrop is false - still allow drop to prevent "no" cursor
                    e.dataTransfer.dropEffect = 'move';
                    div.classList.add('drag-over');
                    // Debug logging disabled
                    // console.log('⚠️ CAN_DROP=false but isOverAnyPart=true, set dropEffect=move to prevent no cursor');
                } else {
                    // Not over element - remove highlight
                    e.dataTransfer.dropEffect = 'none';
                    const wasDragOver = div.classList.contains('drag-over');
                    const wasNestTarget = div.classList.contains('nest-target');
                    div.classList.remove('drag-over');
                    div.classList.remove('nest-target');
                    if (wasDragOver || wasNestTarget) {
                    }
                    this.app.appState.nestTargetElement = null;
                    // Debug logging disabled
                    // console.log('❌ Not over element, set dropEffect=none');
                }
            }
            
            // Defensive check: ensure highlight is present when over child element or by position
            if ((isOverChildElement || isOverElementByPosition) && dragData.type === 'element' && !div.classList.contains('drag-over')) {
                div.classList.add('drag-over');
                e.dataTransfer.dropEffect = 'move';
            }
            
        });
        
        div.addEventListener('dragleave', (e) => {
            const relatedTarget = e.relatedTarget;
            
            // First, check the actual mouse position to see if we're still over the element
            // This is the most reliable check, especially when moving between child elements
            const elementUnderMouse = document.elementFromPoint(e.clientX, e.clientY);
            const stillOverElementByPosition = elementUnderMouse && (div.contains(elementUnderMouse) || elementUnderMouse === div);
            const stillOverElementByBounds = isMouseInBounds(e.clientX, e.clientY);
            
            // If mouse is still over the element by position or bounds, ignore this dragleave
            // This handles the case when moving between child elements within the same parent
            if (stillOverElementByPosition || stillOverElementByBounds) {
                // Clear any pending timeout since we're still over the element
                if (dragLeaveTimeoutRef.value) {
                    clearTimeout(dragLeaveTimeoutRef.value);
                    dragLeaveTimeoutRef.value = null;
                }
                return; // Don't process leave at all
            }
            
            // Check if relatedTarget is still within this div (even if it's a different child)
            // This handles the architectural case: when moving from child A to child B,
            // relatedTarget will be child B or a descendant of child B
            let isRelatedTargetStillInDiv = false;
            
            if (relatedTarget) {
                // Handle text nodes: walk up to find the containing element
                let nodeToCheck = relatedTarget;
                if (relatedTarget.nodeType === Node.TEXT_NODE) {
                    nodeToCheck = relatedTarget.parentElement;
                }
                
                // Walk up the DOM tree to see if any ancestor is contained in this div
                // This catches cases where relatedTarget is deeply nested
                while (nodeToCheck && nodeToCheck !== div) {
                    if (div.contains(nodeToCheck)) {
                        isRelatedTargetStillInDiv = true;
                        break;
                    }
                    nodeToCheck = nodeToCheck.parentElement;
                }
                
                // Also check if relatedTarget is the div itself
                if (nodeToCheck === div) {
                    isRelatedTargetStillInDiv = true;
                }
            }
            
            // If relatedTarget (or any of its ancestors) is still within this div, ignore dragleave
            // This is the key architectural fix: we're moving between children, not leaving the parent
            if (isRelatedTargetStillInDiv) {
            // Clear any pending timeout
            if (dragLeaveTimeoutRef.value) {
                clearTimeout(dragLeaveTimeoutRef.value);
                dragLeaveTimeoutRef.value = null;
            }
                return; // Don't process leave - we're still within the element
            }
            
            // Clear any pending timeout
            if (dragLeaveTimeoutRef.value) {
                clearTimeout(dragLeaveTimeoutRef.value);
                dragLeaveTimeoutRef.value = null;
            }
            
            // We're actually leaving the element - process the leave
                // Clear the flag immediately when leaving
                isDraggingOverRef.value = false;
                
            // Use a timeout to verify we're really leaving (defensive check)
                dragLeaveTimeoutRef.value = setTimeout(() => {
                    // Check if flag is still set (meaning a dragover fired since dragleave)
                    if (isDraggingOverRef.value) {
                        dragLeaveTimeoutRef.value = null;
                        return;
                    }
                    
                    // Verify we're really leaving by checking:
                    // 1. Mouse position is outside element bounds
                    // 2. Element under mouse is not this element or a child
                const elementUnderMouseDelayed = document.elementFromPoint(e.clientX, e.clientY);
                const stillOverElementByTarget = elementUnderMouseDelayed && (div.contains(elementUnderMouseDelayed) || elementUnderMouseDelayed === div);
                const stillOverElementByBoundsDelayed = isMouseInBounds(e.clientX, e.clientY);
                const stillOverElement = stillOverElementByTarget || stillOverElementByBoundsDelayed;
                    
                    // Only remove if we're definitely not over the element
                    if (!stillOverElement) {
                        div.classList.remove('drag-over');
                        div.classList.remove('nest-target');
                        if (this.app.appState.currentDragOverElement === div) {
                            this.app.appState.currentDragOverElement = null;
                        }
                        if (this.app.appState.nestTargetElement && this.app.appState.nestTargetElement.pageId === pageId && 
                            this.app.appState.nestTargetElement.elementIndex === elementIndex) {
                            this.app.appState.nestTargetElement = null;
                        }
                    }
                    dragLeaveTimeoutRef.value = null;
                }, 30); // Reduced timeout for faster response
        });
        
        
        div.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation(); // Prevent page drop from handling this
            
            // Clear the dragging flag on drop
            isDraggingOverRef.value = false;
            
            // Clear all drag-over classes on drop (defensive cleanup)
            document.querySelectorAll('.element.drag-over, .element.nest-target').forEach(el => {
                el.classList.remove('drag-over');
                el.classList.remove('nest-target');
            });
            this.app.appState.currentDragOverElement = null;
            
            // Find the actual element div that was dropped on (might be different if dropped on checkbox)
            let actualElementDiv = div;
            if (e.target && e.target.type === 'checkbox') {
                actualElementDiv = e.target.closest('.element') || div;
            } else if (e.target && e.target.closest('input[type="checkbox"]')) {
                actualElementDiv = e.target.closest('.element') || div;
            }
            
            // Get the correct pageId and elementIndex from the actual element div
            const actualPageId = actualElementDiv.dataset.pageId || pageId;
            const actualBinId = actualElementDiv.dataset.binId || binId;
            const actualElementIndexStr = actualElementDiv.dataset.elementIndex;
            let actualElementIndex = elementIndex;
            if (actualElementIndexStr) {
                if (typeof actualElementIndexStr === 'string' && actualElementIndexStr.includes('-')) {
                    actualElementIndex = actualElementIndexStr; // Keep as string for child elements
                } else {
                    actualElementIndex = parseInt(actualElementIndexStr);
                }
            }
            
            div.classList.remove('drag-over');
            div.classList.remove('nest-target');
            
            let dragData = this.app.appState.dragData;
            if (!dragData) {
                try {
                    const dataStr = e.dataTransfer.getData('text/plain');
                    if (dataStr) {
                        dragData = JSON.parse(dataStr);
                    } else {
                        console.error('No drag data available in element drop');
                        return;
                    }
                } catch (err) {
                    console.error('Failed to parse drag data:', err);
                    return;
                }
            }
            
            // PRIORITY: Check for drop indicator position first (this is where the user intended to drop)
            // Check nested children container indicator first (if dragging child elements)
            const childrenContent = div.closest('.dropdown-content');
            let indicatorTargetIndex = null;
            let indicatorIsChild = false;
            
            if (dragData.isChild && childrenContent && childrenContent._dropTargetIndex !== null && childrenContent._dropTargetIndex !== undefined) {
                // Using nested children container indicator
                indicatorTargetIndex = childrenContent._dropTargetIndex;
                indicatorIsChild = true;
                // Clear the indicator
                if (childrenContent._dropIndicator) {
                    childrenContent._dropIndicator.remove();
                    childrenContent._dropIndicator = null;
                }
                childrenContent._dropTargetIndex = null;
            } else {
                // Check elements list indicator
                const elementsList = div.closest('.elements-list');
                if (elementsList && elementsList._dropTargetIndex !== null && elementsList._dropTargetIndex !== undefined) {
                    indicatorTargetIndex = elementsList._dropTargetIndex;
                    indicatorIsChild = false;
                    // Clear the indicator
                    if (elementsList._dropIndicator) {
                        elementsList._dropIndicator.remove();
                        elementsList._dropIndicator = null;
                    }
                    elementsList._dropTargetIndex = null;
                }
            }
            
            // console.log('Element drop event:', dragData, 'onto element:', actualPageId, actualElementIndex, 'target:', e.target.tagName, e.target.type);
            
            // Parse target element index properly (handle both regular and child elements)
            const targetIsChild = actualElementDiv.dataset.isChild === 'true';
            const targetParentIndex = actualElementDiv.dataset.elementIndex ? parseInt(actualElementDiv.dataset.elementIndex.split('-')[0]) : null;
            let targetElementIndex = actualElementIndex;
            if (typeof actualElementIndex === 'string' && actualElementIndex.includes('-')) {
                // If dropping on a child element, use the parent's index
                // This will be adjusted later based on whether we're nesting or un-nesting
                targetElementIndex = parseInt(actualElementIndex.split('-')[0]);
            } else {
                targetElementIndex = parseInt(actualElementIndex);
            }
            
            // If we have an indicator position, use it instead of the element position
            if (indicatorTargetIndex !== null) {
                if (indicatorIsChild) {
                    // Indicator is for nested children - use the parent's index and child index
                    targetElementIndex = targetParentIndex !== null ? targetParentIndex : targetElementIndex;
                } else {
                    // Indicator is for regular elements - use the indicator index
                    targetElementIndex = indicatorTargetIndex;
                }
            }
            
            // Check if nesting should occur (dropped over checkbox or child element) - MUST check before clearing nestTargetElement
            const target = e.target;
            // Check if we're over a checkbox - need to find the element that contains this checkbox
            let checkbox = null;
            if (target && target.type === 'checkbox') {
                checkbox = target;
            } else if (target) {
                checkbox = target.closest('input[type="checkbox"]');
            }
            const isOverCheckbox = checkbox !== null;
            
            // If we found a checkbox, find the element that contains it
            let checkboxElement = null;
            let checkboxElementIndex = targetElementIndex;
            if (isOverCheckbox && checkbox) {
                checkboxElement = checkbox.closest('.element');
                if (checkboxElement) {
                    const checkboxPageId = checkboxElement.dataset.pageId;
                    const checkboxBinId = checkboxElement.dataset.binId;
                    const checkboxElementIndexStr = checkboxElement.dataset.elementIndex;
                    // Use actualPageId and actualBinId from the drop event, not the renderElement scope
                    if (checkboxPageId === actualPageId && checkboxBinId === actualBinId && checkboxElementIndexStr) {
                        if (typeof checkboxElementIndexStr === 'string' && checkboxElementIndexStr.includes('-')) {
                            checkboxElementIndex = parseInt(checkboxElementIndexStr.split('-')[0]);
                        } else {
                            checkboxElementIndex = parseInt(checkboxElementIndexStr);
                        }
                    }
                }
            }
            
            const savedNestTarget = this.app.appState.nestTargetElement; // Save before clearing
            // Nesting occurs if:
            // 1. Dropped over checkbox AND nestTargetElement matches, OR
            // 2. Dropped over a child element (targetIsChild) AND we're not dragging a child (will nest under parent)
            let shouldNest = (isOverCheckbox && savedNestTarget && 
                savedNestTarget.pageId === actualPageId && 
                savedNestTarget.binId === actualBinId &&
                savedNestTarget.elementIndex === checkboxElementIndex) ||
                (targetIsChild && !dragData.isChild && savedNestTarget &&
                savedNestTarget.pageId === actualPageId &&
                savedNestTarget.binId === actualBinId &&
                savedNestTarget.elementIndex === targetParentIndex);
            
            // console.log('Nesting check:', {
            //     isOverCheckbox,
            //     checkboxFound: !!checkbox,
            //     checkboxElement: !!checkboxElement,
            //     checkboxElementIndex,
            //     savedNestTarget,
            //     actualPageId,
            //     pageId,
            //     targetElementIndex,
            //     actualElementIndex,
            //     shouldNest,
            //     targetType: target ? target.type : 'none',
            //     targetTag: target ? target.tagName : 'none',
            //     actualElementDiv: actualElementDiv === div ? 'same' : 'different'
            // });
            
            // Clear nesting state (after checking)
            this.app.appState.nestTargetElement = null;
            
            if (dragData && dragData.type === 'element') {
                // Log element mouse is released over
                const targetPage = this.app.appState.pages.find(p => p.id === actualPageId);
                const targetBin = targetPage?.bins?.find(b => b.id === actualBinId);
                let targetElement = null;
                let targetElementText = 'N/A';
                
                if (targetIsChild && targetParentIndex !== null) {
                    const parentEl = targetBin?.elements?.[targetParentIndex];
                    const childIdx = typeof actualElementIndex === 'string' ? parseInt(actualElementIndex.split('-')[1]) : 0;
                    targetElement = parentEl?.children?.[childIdx];
                    targetElementText = targetElement?.text || 'N/A';
                } else {
                    targetElement = targetBin?.elements?.[targetElementIndex];
                    targetElementText = targetElement?.text || 'N/A';
                }
                
                // Check if we're dropping a child on its own parent (should un-nest, not nest)
                const isDroppingChildOnOwnParent = dragData.isChild && 
                    !targetIsChild && 
                    dragData.parentElementIndex !== null &&
                    targetElementIndex === dragData.parentElementIndex;
                
                // IMPORTANT: If dropping a child on its own parent (not checkbox), we should un-nest, not nest
                // Override shouldNest to false in this case
                const originalShouldNest = shouldNest;
                if (isDroppingChildOnOwnParent && !isOverCheckbox) {
                    shouldNest = false;
                    // Debug logging disabled
                    // console.log('🔧 OVERRIDING shouldNest: was', originalShouldNest, 'now', shouldNest, 'because dropping child on own parent (not checkbox)');
                }
                
                // Debug logging disabled
                // console.log('🎯 ELEMENT RELEASED OVER:', {
                //     page: actualPageId,
                //     index: targetElementIndex,
                //     isChild: targetIsChild,
                //     parentIndex: targetParentIndex,
                //     text: targetElementText,
                //     location: `${actualPageId}-${targetElementIndex}${targetIsChild ? ` (child of ${targetParentIndex})` : ''}`,
                //     dragDataParentIndex: dragData.parentElementIndex,
                //     isDroppingChildOnOwnParent: isDroppingChildOnOwnParent,
                //     isOverCheckbox: isOverCheckbox,
                //     shouldNest: shouldNest,
                //     originalShouldNest: originalShouldNest,
                //     operation: shouldNest ? 'NEST' : (targetIsChild && !dragData.isChild) ? 'NEST_AS_CHILD' : 
                //               (dragData.isChild && targetIsChild && dragData.parentElementIndex === targetParentIndex) ? 'REORDER_CHILDREN' :
                //               (dragData.isChild && targetIsChild) ? 'MOVE_CHILD_TO_PARENT' :
                //               (dragData.isChild) ? 'UNNEST' : 'MOVE'
                // });
                
                if (shouldNest) {
                    // Nesting: drop on checkbox or child element - un-nest if child, then nest under new parent
                    // Use checkboxElementIndex if we dropped on a checkbox, otherwise use targetParentIndex for child elements
                    const nestTargetIndex = isOverCheckbox ? checkboxElementIndex : (targetIsChild ? targetParentIndex : targetElementIndex);
                    
                    // If dropping on a checkbox, always treat as regular element nesting (not child nesting)
                    // This ensures it becomes a direct child, not a grandchild
                    if (isOverCheckbox) {
                        // Check if source is currently a child - if so, we need to un-nest it first
                        if (dragData.isChild && dragData.parentElementIndex !== null && dragData.childIndex !== null) {
                            // First un-nest: move the child to become a regular element
                            // We'll place it temporarily, then nest it
                            const sourcePage = this.app.appState.pages.find(p => p.id === dragData.pageId);
                            const sourceBin = sourcePage?.bins?.find(b => b.id === dragData.binId);
                            const parentElement = sourceBin?.elements[dragData.parentElementIndex];
                            if (parentElement && parentElement.children && parentElement.children[dragData.childIndex]) {
                                const childElement = parentElement.children[dragData.childIndex];
                                // Remove from parent's children
                                parentElement.children.splice(dragData.childIndex, 1);
                                // Clean up empty children array to ensure UI updates correctly
                                if (parentElement.children.length === 0) {
                                    delete parentElement.children;
                                }
                                // Now nest it as a regular element (not a child)
                                this.this.app.nestElement(dragData.pageId, dragData.binId, dragData.parentElementIndex, actualPageId, actualBinId, nestTargetIndex,
                                    false, null, null, childElement);
                            } else {
                                // Fallback: use original logic
                                const pageFormat = this.app.formatRendererManager?.getPageFormat(actualPageId);
                                if (pageFormat) {
                                    this.app.renderService.getRenderer()._preservingFormat = true;
                                }
                                this.this.app.nestElement(dragData.pageId, dragData.binId, dragData.elementIndex, actualPageId, actualBinId, nestTargetIndex,
                                    dragData.isChild || false, dragData.parentElementIndex || null, dragData.childIndex || null);
                            }
                        } else {
                            // Source is already a regular element, nest normally
                            const pageFormat = this.app.formatRendererManager?.getPageFormat(actualPageId);
                            if (pageFormat) {
                                this.app.renderService.getRenderer()._preservingFormat = true;
                            }
                            this.this.app.nestElement(dragData.pageId, dragData.binId, dragData.elementIndex, actualPageId, actualBinId, nestTargetIndex,
                                false, null, null);
                        }
                    } else {
                        // Not dropping on checkbox - but check if we're dropping a child on its own parent
                        // If so, we should un-nest instead of nest
                        if (isDroppingChildOnOwnParent) {
                            // Don't nest - fall through to un-nest logic below
                            // This will be handled by the else if (dragData.isChild) block
                        } else {
                            // Not dropping on checkbox and not dropping on own parent - use original nesting logic
                            const pageFormat = this.app.formatRendererManager?.getPageFormat(actualPageId);
                            if (pageFormat) {
                                this.app.renderService.getRenderer()._preservingFormat = true;
                            }
                            this.this.app.nestElement(dragData.pageId, dragData.binId, dragData.elementIndex, actualPageId, actualBinId, nestTargetIndex,
                                dragData.isChild || false, dragData.parentElementIndex || null, dragData.childIndex || null);
                        }
                    }
                } else if (targetIsChild && !dragData.isChild) {
                    // Dropping a regular element over a child element - nest it as a child of the same parent
                    const pageFormat = this.app.formatRendererManager?.getPageFormat(actualPageId);
                    if (pageFormat) {
                        this.app.renderService.getRenderer()._preservingFormat = true;
                    }
                    this.this.app.nestElement(dragData.pageId, dragData.binId, dragData.elementIndex, actualPageId, actualBinId, targetParentIndex,
                        false, null, null);
                } else if (dragData.isChild && targetIsChild && dragData.parentElementIndex === targetParentIndex) {
                    // Rearranging nested children within the same parent
                    // Use indicator position if available (from nested children container), otherwise use element position
                    let targetChildIndex = null;
                    if (indicatorIsChild && indicatorTargetIndex !== null) {
                        targetChildIndex = indicatorTargetIndex;
                    } else {
                        targetChildIndex = typeof actualElementIndex === 'string' ? parseInt(actualElementIndex.split('-')[1]) : 0;
                    }
                    const pageFormat = this.app.formatRendererManager?.getPageFormat(actualPageId);
                    if (pageFormat) {
                        this.app.renderService.getRenderer()._preservingFormat = true;
                    }
                    this.app.reorderChildElement(actualPageId, actualBinId, dragData.parentElementIndex, dragData.childIndex, targetChildIndex);
                } else if (dragData.isChild && targetIsChild) {
                    // Child element being moved to different parent - nest under target's parent
                    const pageFormat = this.app.formatRendererManager?.getPageFormat(actualPageId);
                    if (pageFormat) {
                        this.app.renderService.getRenderer()._preservingFormat = true;
                    }
                    this.this.app.nestElement(dragData.pageId, dragData.binId, dragData.elementIndex, actualPageId, actualBinId, targetParentIndex,
                        dragData.isChild || false, dragData.parentElementIndex || null, dragData.childIndex || null);
                } else if (dragData.isChild) {
                    // Child element being un-nested and moved to a new position
                    // When dropped on a regular (non-nested) element (including its own parent), 
                    // always un-nest and place above the target element
                    
                    // IMPORTANT: When dropping a child on its parent (not checkbox), un-nest and place above parent
                    const isDroppingOnOwnParent = !targetIsChild && 
                        dragData.parentElementIndex !== null &&
                        targetElementIndex === dragData.parentElementIndex;
                    
                    // Use indicator position if available (from elements list), otherwise use element position
                    let unnestTargetIndex = indicatorTargetIndex !== null && !indicatorIsChild ? indicatorTargetIndex : targetElementIndex;
                    
                    // Check if we're dropping on the parent itself or a sibling
                    const isDroppingOnParent = isDroppingOnOwnParent;
                    const isDroppingOnSibling = !targetIsChild && 
                        dragData.parentElementIndex !== null &&
                        targetElementIndex !== dragData.parentElementIndex;
                    
                    if (targetIsChild && targetParentIndex !== null) {
                        // Dropped on a child element - place above its parent
                        unnestTargetIndex = targetParentIndex;
                    } else if (!targetIsChild && dragData.parentElementIndex !== null) {
                        // Dropped on a regular element (not nested) - un-nest and place appropriately
                        // This handles:
                        // - Dropping before the parent (un-nest and place at target position, which is above)
                        // - Dropping on the parent itself (un-nest and place above parent)
                        // - Dropping on any other element (un-nest and place above target element)
                        const sourcePage = this.app.appState.pages.find(p => p.id === dragData.pageId);
                        const sourceBin = sourcePage?.bins?.find(b => b.id === dragData.binId);
                        if (sourcePage && actualPageId === dragData.pageId && sourceBin?.elements[dragData.parentElementIndex]) {
                            // Check if dropping on the parent itself
                            const isDroppingOnParent = targetElementIndex === dragData.parentElementIndex;
                            
                            if (isDroppingOnParent) {
                                // Dropping on parent: place above parent
                                unnestTargetIndex = dragData.parentElementIndex;
                            } else if (targetElementIndex < dragData.parentElementIndex) {
                                // Dropping before parent: use the target position (places above target)
                                unnestTargetIndex = targetElementIndex;
                            } else {
                                // Dropping on element after parent: place above target element
                                unnestTargetIndex = targetElementIndex;
                            }
                            
                            // splice can insert at array.length to append, so we allow parentIndex + 1
                            // even if it equals or exceeds the array length (it will be handled in moveElement)
                            // No clamping needed here - moveElement will handle it correctly
                        }
                    }
                    
                    console.log('🔄 UNNESTING CHILD:', {
                        sourcePage: dragData.pageId,
                        parentIndex: dragData.parentElementIndex,
                        childIndex: dragData.childIndex,
                        targetPage: actualPageId,
                        targetElementIndex: targetElementIndex,
                        targetIsChild: targetIsChild,
                        isDroppingOnParent: isDroppingOnParent,
                        isDroppingOnSibling: isDroppingOnSibling,
                        calculatedTargetIndex: unnestTargetIndex,
                        sourceBinElementsLength: this.app.appState.pages.find(p => p.id === dragData.pageId)?.bins?.find(b => b.id === dragData.binId)?.elements.length,
                        parentElementBefore: this.app.appState.pages.find(p => p.id === dragData.pageId)?.bins?.find(b => b.id === dragData.binId)?.elements[dragData.parentElementIndex]?.children?.length || 0,
                        willUnnest: true
                    });
                    
                    // Always un-nest when dropping a child on a regular element (including its own parent)
                    // dragData.elementIndex is the parent's index when isChild is true
                    // For un-nesting, we must pass isChild=true, parentElementIndex, and childIndex
                    // Ensure we have the correct values for un-nesting
                    // dragData.elementIndex is the parent's index when isChild is true
                    const unnestIsChild = dragData.isChild === true; // Explicitly check for true
                    const unnestParentIndex = dragData.parentElementIndex;
                    const unnestChildIndex = dragData.childIndex;
                    
                    console.log('🔧 CALLING moveElement FOR UNNEST:', {
                        sourcePageId: dragData.pageId,
                        sourceElementIndex: dragData.elementIndex,
                        targetPageId: actualPageId,
                        targetElementIndex: unnestTargetIndex,
                        isChild: dragData.isChild,
                        isChildType: typeof dragData.isChild,
                        isChildValue: unnestIsChild,
                        parentElementIndex: unnestParentIndex,
                        childIndex: unnestChildIndex,
                        dragDataKeys: Object.keys(dragData)
                    });
                    
                    if (!unnestIsChild || unnestParentIndex === null || unnestParentIndex === undefined || unnestChildIndex === null || unnestChildIndex === undefined) {
                        console.error('❌ INVALID UNNEST PARAMETERS:', {
                            isChild: unnestIsChild,
                            parentElementIndex: unnestParentIndex,
                            childIndex: unnestChildIndex,
                            dragData: dragData
                        });
                        return;
                    }
                    
                    // Preserve format if using a format renderer
                    const pageFormat = this.app.formatRendererManager?.getPageFormat(actualPageId);
                    if (pageFormat) {
                        this.app.renderService.getRenderer()._preservingFormat = true;
                    }
                    this.app.moveElement(dragData.pageId, dragData.binId, dragData.elementIndex, actualPageId, actualBinId, unnestTargetIndex,
                        unnestIsChild, unnestParentIndex, unnestChildIndex);
                } else if (dragData.pageId !== actualPageId) {
                    // Moving to different page
                    // Preserve format if using a format renderer
                    const pageFormat = this.app.formatRendererManager?.getPageFormat(actualPageId);
                    if (pageFormat) {
                        this.app.renderService.getRenderer()._preservingFormat = true;
                    }
                    this.app.moveElement(dragData.pageId, dragData.binId, dragData.elementIndex, actualPageId, actualBinId, targetElementIndex,
                        dragData.isChild || false, dragData.parentElementIndex || null, dragData.childIndex || null);
                } else {
                    // Moving within same page
                    // Preserve format if using a format renderer
                    const pageFormat = this.app.formatRendererManager?.getPageFormat(actualPageId);
                    if (pageFormat) {
                        this.app.renderService.getRenderer()._preservingFormat = true;
                    }
                    this.app.moveElement(dragData.pageId, dragData.binId, dragData.elementIndex, actualPageId, actualBinId, targetElementIndex,
                        dragData.isChild || false, dragData.parentElementIndex || null, dragData.childIndex || null);
                }
            }

            // Clear drag data
            this.app.appState.dragData = null;
        });
        
        let tooltipText = '';
        if (element.timeAllocated) {
            tooltipText += `Time: ${element.timeAllocated}`;
        }
        if (element.funModifier) {
            tooltipText += tooltipText ? ` | Fun: ${element.funModifier}` : `Fun: ${element.funModifier}`;
        }
        
        // Delegate to element type renderer (pass renderChildren so type renderers can render nested children)
        this.typeRegistry.renderElement(div, pageId, binId, element, elementIndex, depth, (pageId, binId, parentElement, parentElementIndex, depth) => {
            return this.renderChildren(pageId, binId, parentElement, parentElementIndex, depth);
        });
        
        // Add relationship indicators if element has relationships
        if (element.relationships) {
            const hasRelationships = 
                (element.relationships.blocks?.length > 0) ||
                (element.relationships.dependsOn?.length > 0) ||
                (element.relationships.relatedTo?.length > 0);
            
            if (hasRelationships) {
                const relationshipIndicator = document.createElement('span');
                relationshipIndicator.className = 'relationship-indicator';
                relationshipIndicator.textContent = '🔗';
                relationshipIndicator.title = 'Has relationships - click to manage';
                relationshipIndicator.style.cssText = 'margin-left: 8px; cursor: pointer; font-size: 14px; opacity: 0.7;';
                relationshipIndicator.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const elementId = this.app.relationshipManager.getElementId(pageId, binId, elementIndex);
                    const relationships = this.app.relationshipManager.getRelationships(elementId);
                    const inverseRelationships = this.app.relationshipManager.getInverseRelationships(elementId);
                    
                    // Show relationships modal
                    const modal = document.getElementById('modal');
                    const modalBody = document.getElementById('modal-body');
                    
                    let html = `
                        <h3>Element Relationships</h3>
                        <div class="relationships-section">
                            <h4>Outgoing Relationships</h4>
                            <div id="outgoing-relationships">
                    `;
                    
                    if (relationships.length === 0) {
                        html += '<p>No outgoing relationships</p>';
                    } else {
                        relationships.forEach(rel => {
                            const target = this.app.relationshipManager.getElement(rel.to);
                            if (target) {
                                html += `
                                    <div class="relationship-item">
                                        <span class="relationship-type">${rel.type}</span>
                                        <span class="relationship-target">${this.app.escapeHtml(target.element.text || 'Untitled')}</span>
                                        <button class="remove-relationship" data-to="${rel.to}" data-type="${rel.type}">Remove</button>
                                    </div>
                                `;
                            }
                        });
                    }
                    
                    html += `
                            </div>
                            <h4>Incoming Relationships</h4>
                            <div id="incoming-relationships">
                    `;
                    
                    if (inverseRelationships.length === 0) {
                        html += '<p>No incoming relationships</p>';
                    } else {
                        inverseRelationships.forEach(rel => {
                            const source = this.app.relationshipManager.getElement(rel.from);
                            if (source) {
                                html += `
                                    <div class="relationship-item">
                                        <span class="relationship-source">${this.app.escapeHtml(source.element.text || 'Untitled')}</span>
                                        <span class="relationship-type">${rel.type}</span>
                                        <span>this element</span>
                                    </div>
                                `;
                            }
                        });
                    }
                    
                    html += `
                            </div>
                            <div class="add-relationship-section">
                                <h4>Add Relationship</h4>
                                <select id="relationship-type">
                                    <option value="dependsOn">Depends On</option>
                                    <option value="blocks">Blocks</option>
                                    <option value="relatedTo">Related To</option>
                                </select>
                                <select id="relationship-target">
                                    <option value="">Select element...</option>
                    `;
                    
                    // Add all elements as options
                    this.app.appState.pages.forEach(p => {
                        if (p.bins) {
                            p.bins.forEach(b => {
                                if (b.elements) {
                                    b.elements.forEach((el, idx) => {
                                        const targetId = this.app.relationshipManager.getElementId(p.id, b.id, idx);
                                        if (targetId !== elementId) {
                                            html += `<option value="${targetId}">${this.app.escapeHtml(el.text || 'Untitled')}</option>`;
                                        }
                                    });
                                }
                            });
                        }
                    });
                    
                    html += `
                                </select>
                                <button id="add-relationship-btn">Add Relationship</button>
                            </div>
                            <div style="margin-top: 20px;">
                                <button class="cancel" onclick="app.modalHandler.closeModal()">Close</button>
                            </div>
                        </div>
                    `;
                    
                    modalBody.innerHTML = html;
                    modal.classList.add('active');
                    
                    // Add event listeners
                    document.getElementById('add-relationship-btn').addEventListener('click', () => {
                        const type = document.getElementById('relationship-type').value;
                        const targetId = document.getElementById('relationship-target').value;
                        
                        if (!targetId) {
                            alert('Please select a target element');
                            return;
                        }
                        
                        const success = this.app.relationshipManager.addRelationship(elementId, targetId, type);
                        if (success) {
                            eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
                            this.app.modalHandler.closeModal();
                        } else {
                            alert('Failed to add relationship. Check console for details.');
                        }
                    });
                    
                    // Remove relationship buttons
                    document.querySelectorAll('.remove-relationship').forEach(btn => {
                        btn.addEventListener('click', () => {
                            const toId = btn.dataset.to;
                            const type = btn.dataset.type;
                            this.app.relationshipManager.removeRelationship(elementId, toId, type);
                            eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
                            this.app.modalHandler.closeModal();
                        });
                    });
                });
                
                // Add to task header if it exists, otherwise add to div
                const taskHeader = div.querySelector('.task-header');
                if (taskHeader) {
                    taskHeader.appendChild(relationshipIndicator);
                } else {
                    div.appendChild(relationshipIndicator);
                }
            }
        }
        
        // Add tags display if element has tags
        if (element.tags && element.tags.length > 0) {
            const tagsContainer = document.createElement('div');
            tagsContainer.className = 'element-tags';
            tagsContainer.style.cssText = 'display: flex; flex-wrap: wrap; gap: 3px; margin-top: 5px; font-size: 10px;';
            
            element.tags.forEach(tag => {
                const tagSpan = document.createElement('span');
                tagSpan.className = 'element-tag';
                tagSpan.textContent = tag;
                tagSpan.style.cssText = 'background: #4a9eff; color: white; padding: 2px 6px; border-radius: 10px;';
                tagsContainer.appendChild(tagSpan);
            });
            
            div.appendChild(tagsContainer);
        }
        
        return div;
    }

}

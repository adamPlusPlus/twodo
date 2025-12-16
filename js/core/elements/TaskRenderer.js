// TaskRenderer.js - Handles task element rendering
// TaskRenderer.js - Extracted from ElementRenderer.js to improve modularity
import { eventBus } from '../EventBus.js';
import { EVENTS } from '../AppEvents.js';

/**
 * TaskRenderer - Handles rendering of task elements
 */
export class TaskRenderer {
    constructor(app) {
        this.app = app;
    }
    
    /**
     * Render a task element
     * @param {HTMLElement} div - The element container div (already created with classes and drag handlers)
     * @param {string} pageId - Page ID
     * @param {string} binId - Bin ID
     * @param {Object} element - Element data
     * @param {number|string} elementIndex - Element index
     * @param {number} depth - Current nesting depth
     * @param {Function} renderChildren - Function to render children elements
     * @returns {void}
     */
    render(div, pageId, binId, element, elementIndex, depth, renderChildren) {
        const taskHeader = document.createElement('div');
        taskHeader.className = 'task-header';

        const hasChildren = element.children && element.children.length > 0;
        const childrenToggleId = `children-toggle-${pageId}-${elementIndex}`;
        const childrenContentId = `children-content-${pageId}-${elementIndex}`;

        const taskTextSpan = document.createElement('span');
        taskTextSpan.className = 'task-text';
        if (hasChildren) {
        // Get or initialize individual children state
        const childrenStateKey = `${binId}-${elementIndex}`;
        if (!(childrenStateKey in this.app.appState.subtaskStates)) {
        this.app.appState.subtaskStates[childrenStateKey] = this.app.appState.allSubtasksExpanded;
        }
        const isExpanded = this.app.appState.subtaskStates[childrenStateKey];
        const initialArrow = isExpanded ? '▼' : '▶';
    
        // Parse HTML in text if present, otherwise escape it
        const textFragment = this.app.parseLinks(element.text);
        const arrowSpan = document.createElement('span');
        arrowSpan.className = 'subtask-arrow';
        arrowSpan.id = childrenToggleId;
        arrowSpan.textContent = initialArrow;
        taskTextSpan.appendChild(arrowSpan);
        taskTextSpan.appendChild(document.createTextNode(' '));
        taskTextSpan.appendChild(textFragment);
        // For tasks with children, clicking the text toggles children, not completion
        taskTextSpan.onclick = (e) => {
        e.stopPropagation();
        const arrow = document.getElementById(childrenToggleId);
        const content = document.getElementById(childrenContentId);
        if (arrow && content) {
        // Toggle individual state
        this.app.appState.subtaskStates[childrenStateKey] = !this.app.appState.subtaskStates[childrenStateKey];
        const newState = this.app.appState.subtaskStates[childrenStateKey];
        content.style.display = newState ? 'block' : 'none';
        arrow.textContent = newState ? '▼' : '▶';
        }
        };
        } else {
        const textFragment = this.app.parseLinks(element.text);
        taskTextSpan.appendChild(textFragment);
        // Clicking text enables inline editing instead of toggling checkbox
        taskTextSpan.style.cursor = 'text';
        taskTextSpan.addEventListener('click', (e) => {
        // Don't enable editing if clicking on a link
        if (e.target.tagName === 'A') {
        return;
        }
        e.stopPropagation();
        this.app.enableInlineEditing(taskTextSpan, pageId, binId, elementIndex, element);
        });
        }

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = element.completed;
        checkbox.onchange = (e) => {
        e.stopPropagation();
        this.app.toggleElement(pageId, binId, elementIndex);
        };
        // Prevent text click from firing when clicking checkbox
        checkbox.addEventListener('click', (e) => {
        e.stopPropagation();
        });

        // Add dragover handler on checkbox to allow drops (required for input elements)
        checkbox.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        // Let the parent div's dragover handler set the dropEffect
        // We just need to prevent default to allow the drop
        });

        // Add drop handler on checkbox for nesting
        checkbox.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
    
        let dragData = this.app.appState.dragData;
        if (!dragData) {
        try {
        const dataStr = e.dataTransfer.getData('text/plain');
        if (dataStr) {
        dragData = JSON.parse(dataStr);
        } else {
        console.error('No drag data available in checkbox drop');
        return;
        }
        } catch (err) {
        console.error('Failed to parse drag data:', err);
        return;
        }
        }
    
        if (dragData && dragData.type === 'element') {
        // Get the element index from the checkbox's parent element
        const checkboxElement = checkbox.closest('.element');
        if (checkboxElement) {
        const checkboxPageId = checkboxElement.dataset.pageId;
        const actualBinId = checkboxElement.dataset.binId;
        const checkboxElementIndexStr = checkboxElement.dataset.elementIndex;
        let checkboxElementIndex = elementIndex;
        if (checkboxElementIndexStr) {
        if (typeof checkboxElementIndexStr === 'string' && checkboxElementIndexStr.includes('-')) {
        checkboxElementIndex = parseInt(checkboxElementIndexStr.split('-')[0]);
        } else {
        checkboxElementIndex = parseInt(checkboxElementIndexStr);
        }
        }
            
        // When dropping on checkbox, always treat as regular element nesting (not child nesting)
        // This ensures it becomes a direct child, not a grandchild
        if (dragData.isChild && dragData.parentElementIndex !== null && dragData.childIndex !== null) {
        // Un-nest the child first, then nest it as a regular element
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
        this.app.nestElement(dragData.pageId, dragData.binId, dragData.parentElementIndex, checkboxPageId, actualBinId, checkboxElementIndex,
        false, null, null, childElement);
        } else {
        // Fallback: use original logic
        this.app.nestElement(dragData.pageId, dragData.binId, dragData.elementIndex, checkboxPageId, actualBinId, checkboxElementIndex,
        dragData.isChild || false, dragData.parentElementIndex || null, dragData.childIndex || null);
        }
        } else {
        // Source is already a regular element, nest normally
        this.app.nestElement(dragData.pageId, dragData.binId, dragData.elementIndex, checkboxPageId, actualBinId, checkboxElementIndex,
        false, null, null);
        }
        }
        }
    
        // Clear drag data
        this.app.appState.dragData = null;
        });

        taskHeader.appendChild(checkbox);
        taskHeader.appendChild(taskTextSpan);
        div.appendChild(taskHeader);

        // Add tooltip hover handlers
        let tooltipText = '';
        if (element.timeAllocated) {
            tooltipText += `Time: ${element.timeAllocated}`;
        }
        if (element.funModifier) {
            tooltipText += tooltipText ? ` | Fun: ${element.funModifier}` : `Fun: ${element.funModifier}`;
        }
        if (tooltipText) {
            div.addEventListener('mouseenter', () => {
                this.app.showTooltip(tooltipText);
            });
            div.addEventListener('mouseleave', () => {
                this.app.hideTooltip();
            });
        }

        // Render children using renderChildren helper
        if (hasChildren) {
            const childrenContainer = renderChildren(pageId, binId, element, elementIndex, depth);
            if (childrenContainer) {
                // Update the content div ID for toggle functionality
                const contentDiv = childrenContainer.querySelector('.dropdown-content');
                if (contentDiv) {
                    contentDiv.id = childrenContentId;
                }
                div.appendChild(childrenContainer);
            }
        }
    }
}
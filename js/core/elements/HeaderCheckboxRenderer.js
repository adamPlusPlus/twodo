// HeaderCheckboxRenderer.js - Handles header-checkbox element rendering
// HeaderCheckboxRenderer.js - Extracted from ElementRenderer.js to improve modularity
import { eventBus } from '../EventBus.js';
import { EVENTS } from '../AppEvents.js';

/**
 * HeaderCheckboxRenderer - Handles rendering of header-checkbox elements
 */
export class HeaderCheckboxRenderer {
    constructor(app) {
        this.app = app;
    }
    
    /**
     * Render a header-checkbox element
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
        const headerCheckbox = document.createElement('input');
        headerCheckbox.type = 'checkbox';
        headerCheckbox.checked = element.completed;
        headerCheckbox.onchange = (e) => {
        e.stopPropagation();
        this.app.toggleElement(pageId, binId, elementIndex);
        };

        // Add dragover handler on checkbox to allow drops (required for input elements)
        headerCheckbox.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        // Let the parent div's dragover handler set the dropEffect
        // We just need to prevent default to allow the drop
        });

        // Add drop handler on checkbox for nesting
        headerCheckbox.addEventListener('drop', (e) => {
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
        const checkboxElement = headerCheckbox.closest('.element');
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
        const sourcePage = this.app.appState.documents?.find(p => p.id === dragData.pageId);
        const sourceBin = sourcePage?.groups?.find(b => b.id === dragData.binId);
        const items = sourceBin?.items || [];
        if (sourceBin) {
        sourceBin.items = items;
        }
        const parentElement = items[dragData.parentElementIndex];
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

        const headerText = document.createElement('span');
        headerText.className = 'header-text';
        const headerTextFragment = this.app.parseLinks(element.text);
        headerText.appendChild(headerTextFragment);
        // Clicking text enables inline editing instead of toggling checkbox
        headerText.style.cursor = 'text';
        headerText.addEventListener('click', (e) => {
        // Don't enable editing if clicking on a link
        if (e.target.tagName === 'A') {
        return;
        }
        e.stopPropagation();
        this.app.enableInlineEditing(headerText, pageId, binId, elementIndex, element);
        });

        div.appendChild(headerCheckbox);
        div.appendChild(headerText);

        // Prevent text click from firing when clicking checkbox
        headerCheckbox.addEventListener('click', (e) => {
            e.stopPropagation();
        });

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

        // Render children if they exist
        if (element.children && element.children.length > 0) {
            const childrenContainer = renderChildren(pageId, binId, element, elementIndex, depth);
            if (childrenContainer) {
                div.appendChild(childrenContainer);
            }
        }
    }
}
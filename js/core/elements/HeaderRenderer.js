// HeaderRenderer.js - Handles header element rendering (non-checkbox headers)
import { eventBus } from '../EventBus.js';
import { EVENTS } from '../AppEvents.js';

/**
 * HeaderRenderer - Handles rendering of header elements (without checkbox)
 */
export class HeaderRenderer {
    constructor(app) {
        this.app = app;
    }
    
    /**
     * Render a header element
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
        // Create header text element
        const headerText = document.createElement('div');
        headerText.className = 'header-text';
        const headerTextFragment = this.app.parseLinks(element.text || '');
        headerText.appendChild(headerTextFragment);
        
        // Enable inline editing
        headerText.style.cursor = 'text';
        headerText.addEventListener('click', (e) => {
            // Don't enable editing if clicking on a link
            if (e.target.tagName === 'A') {
                return;
            }
            e.stopPropagation();
            this.app.enableInlineEditing(headerText, pageId, binId, elementIndex, element);
        });

        div.appendChild(headerText);

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


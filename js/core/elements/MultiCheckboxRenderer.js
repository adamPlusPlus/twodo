// MultiCheckboxRenderer.js - Handles multi-checkbox element rendering
// MultiCheckboxRenderer.js - Extracted from ElementRenderer.js to improve modularity
import { eventBus } from '../EventBus.js';
import { EVENTS } from '../AppEvents.js';

/**
 * MultiCheckboxRenderer - Handles rendering of multi-checkbox elements
 */
export class MultiCheckboxRenderer {
    constructor(app) {
        this.app = app;
    }
    
    /**
     * Render a multi-checkbox element
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
        const itemsHtml = element.items.map((item, itemIndex) => {
        return `
        <div class="multi-checkbox-row" data-item-index="${itemIndex}">
        <input type="checkbox" ${item.completed ? 'checked' : ''} 
        onchange="this.app.toggleElement('${pageId}', '${binId}', ${elementIndex}, null, ${itemIndex})">
        <span class="checkbox-label">${this.app.escapeHtml(item.text)}</span>
        ${element.items.length > 1 ? `<button onclick="app.removeMultiCheckboxItem('${pageId}', '${binId}', ${elementIndex}, ${itemIndex})" style="padding: 2px 6px; font-size: 11px; background: #e74c3c;">×</button>` : ''}
        </div>
        `;
        }).join('');

        div.innerHTML = `
        ${itemsHtml}
        <div class="multi-checkbox-controls">
        <button onclick="app.addMultiCheckboxItem('${pageId}', '${binId}', ${elementIndex})">+ Add</button>
        </div>
        `;

        // Add event handlers for multi-checkbox items
        element.items.forEach((item, itemIndex) => {
        const row = div.querySelector(`.multi-checkbox-row[data-item-index="${itemIndex}"]`);
        if (row) {
        const checkbox = row.querySelector('input[type="checkbox"]');
        if (checkbox) {
        checkbox.onchange = (e) => {
        e.stopPropagation();
        const pageId = checkbox.dataset.pageId;
        const elementIndex = parseInt(checkbox.dataset.elementIndex);
        const itemIndex = parseInt(checkbox.dataset.itemIndex);
        this.app.toggleElement(pageId, binId, elementIndex, null, itemIndex);
        };
        }
        
        if (item.funModifier) {
        row.addEventListener('mouseenter', () => {
        this.app.showTooltip(`Fun: ${item.funModifier}`);
        });
        row.addEventListener('mouseleave', () => {
        this.app.hideTooltip();
        });
        }
        }
        });

        // Add tooltip handler for the main element
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
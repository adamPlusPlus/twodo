// CalendarRenderer.js - Handles calendar element rendering
// CalendarElementRenderer.js - Extracted from ElementRenderer.js to improve modularity
import { eventBus } from '../EventBus.js';
import { EVENTS } from '../AppEvents.js';

/**
 * CalendarElementRenderer - Handles rendering of calendar elements
 */
export class CalendarElementRenderer {
    constructor(app) {
        this.app = app;
    }
    
    /**
     * Render a calendar element
     * @param {HTMLElement} div - The element container div (already created with classes and drag handlers)
     * @param {string} pageId - Page ID
     * @param {string} binId - Bin ID
     * @param {Object} element - Element data
     * @param {number|string} elementIndex - Element index
     * @param {number} depth - Current nesting depth
     * @returns {void}
     */
    render(div, pageId, binId, element, elementIndex, depth) {
        // TEMPORARILY DISABLED - Calendar feature has syntax errors
        const disabledMsg = document.createElement('div');
        disabledMsg.style.padding = '20px';
        disabledMsg.style.textAlign = 'center';
        disabledMsg.style.color = '#888';
        disabledMsg.textContent = 'Calendar feature temporarily disabled';
        div.appendChild(disabledMsg);
        // this.app.renderService.getRenderer().renderCalendar(div, pageId, binId, element, elementIndex);
    }
}
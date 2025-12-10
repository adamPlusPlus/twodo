// TrackerRenderer.js - Handles tracker element rendering
// TrackerRenderer.js - Extracted from ElementRenderer.js to improve modularity
import { eventBus } from '../EventBus.js';
import { EVENTS } from '../AppEvents.js';

/**
 * TrackerRenderer - Handles rendering of tracker elements
 */
export class TrackerRenderer {
    constructor(app) {
        this.app = app;
    }
    
    /**
     * Render a tracker element
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
        // Initialize tracker state if needed
        if (element.mode === undefined) element.mode = 'daily';
        if (element.dailyCompletions === undefined) element.dailyCompletions = {};
        if (element.pageCompletions === undefined) element.pageCompletions = {};

        // Create tracker header container
        const trackerHeader = document.createElement('div');
        trackerHeader.className = 'task-header';

        // Add checkbox
        const trackerCheckbox = document.createElement('input');
        trackerCheckbox.type = 'checkbox';
        trackerCheckbox.checked = element.completed || false;
        trackerCheckbox.onchange = (e) => {
        e.stopPropagation();
        this.app.toggleElement(pageId, binId, elementIndex);
        };
        trackerHeader.appendChild(trackerCheckbox);

        // Add title text only if it has a custom title
        const trackerHasCustomTitle = element.text && element.text.trim() && element.text.trim() !== 'Tracker';
        if (trackerHasCustomTitle) {
        const trackerTextSpan = document.createElement('span');
        trackerTextSpan.className = 'task-text';
        const trackerTextFragment = this.app.parseLinks(element.text);
        trackerTextSpan.appendChild(trackerTextFragment);
        // Clicking text enables inline editing instead of toggling checkbox
        trackerTextSpan.style.cursor = 'text';
        trackerTextSpan.addEventListener('click', (e) => {
        // Don't enable editing if clicking on a link
        if (e.target.tagName === 'A') {
        return;
        }
        e.stopPropagation();
        this.app.enableInlineEditing(trackerTextSpan, pageId, binId, elementIndex, element);
        });
        trackerHeader.appendChild(trackerTextSpan);
        }

        // Prevent text click from firing when clicking checkbox
        trackerCheckbox.addEventListener('click', (e) => {
        e.stopPropagation();
        });

        // Tracker display inline
        const trackerDisplay = document.createElement('span');
        trackerDisplay.className = 'tracker-display';
        trackerDisplay.style.fontSize = '12px';
        trackerDisplay.style.marginLeft = '10px';
        trackerDisplay.style.whiteSpace = 'nowrap';

        const updateTrackerDisplay = () => {
        if (element.mode === 'daily') {
        const today = new Date().toISOString().split('T')[0];
        const todayData = element.dailyCompletions[today];
        const count = todayData?._count || (todayData ? Object.keys(todayData).filter(k => k !== '_count').length : 0);
        trackerDisplay.textContent = `${count} today`;
        } else {
        // Page mode - count unique checked elements in the page
        const count = element.pageCompletions?.count || 0;
        trackerDisplay.textContent = `${count} page`;
        }
        };
        updateTrackerDisplay();
        trackerHeader.appendChild(trackerDisplay);

        div.appendChild(trackerHeader);
    }
}
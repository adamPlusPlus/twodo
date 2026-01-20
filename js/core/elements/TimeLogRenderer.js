// TimeLogRenderer.js - Handles time-log element rendering
// TimeLogRenderer.js - Extracted from ElementRenderer.js to improve modularity
import { eventBus } from '../EventBus.js';
import { EVENTS } from '../AppEvents.js';

/**
 * TimeLogRenderer - Handles rendering of time-log elements
 */
export class TimeLogRenderer {
    constructor(app) {
        this.app = app;
    }
    
    /**
     * Render a time-log element
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
        const getTimeLogElement = () => {
        const document = this.app.appState.documents?.find(page => page.id === pageId);
        const group = document?.groups?.find(bin => bin.id === binId);
        if (!group) return null;
        const items = group.items || [];
        group.items = items;
        return items[elementIndex];
        };
        // Initialize time-log state if needed
        if (element.totalTime === undefined) element.totalTime = 0;
        if (element.isRunning === undefined) element.isRunning = false;
        if (element.startTime === undefined) element.startTime = null;
        if (element.sessions === undefined) element.sessions = [];

        // Create time-log header container
        const timeLogHeader = document.createElement('div');
        timeLogHeader.className = 'task-header';

        // Add checkbox
        const timeLogCheckbox = document.createElement('input');
        timeLogCheckbox.type = 'checkbox';
        timeLogCheckbox.checked = element.completed || false;
        timeLogCheckbox.onchange = (e) => {
        e.stopPropagation();
        this.app.toggleElement(pageId, binId, elementIndex);
        };
        // Prevent text click from firing when clicking checkbox
        timeLogCheckbox.addEventListener('click', (e) => {
        e.stopPropagation();
        });
        timeLogHeader.appendChild(timeLogCheckbox);

        // Time display inline
        const timeDisplay = document.createElement('span');
        timeDisplay.className = 'time-log-display';
        timeDisplay.style.fontSize = '14px';
        timeDisplay.style.fontWeight = 'bold';
        timeDisplay.style.marginLeft = '10px';
        timeDisplay.style.whiteSpace = 'nowrap';

        const updateTimeDisplay = () => {
        const totalSeconds = element.totalTime || 0;
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        timeDisplay.textContent = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        };
        updateTimeDisplay();
        timeLogHeader.appendChild(timeDisplay);

        // Start/Stop button inline
        const timeLogStartStopBtn = this.app.styleButton(element.isRunning ? '⏸' : '▶', (e) => {
        e.stopPropagation();
        const timeLogElement = getTimeLogElement();
        if (!timeLogElement) return;
    
        if (timeLogElement.isRunning) {
        // Stop
        timeLogElement.isRunning = false;
        if (timeLogElement.intervalId) {
        clearInterval(timeLogElement.intervalId);
        timeLogElement.intervalId = null;
        }
        timeLogStartStopBtn.textContent = '▶';
        } else {
        // Start
        timeLogElement.isRunning = true;
        timeLogElement.startTime = Date.now();
        timeLogStartStopBtn.textContent = '⏸';
        
        // Update display every second
        timeLogElement.intervalId = setInterval(() => {
        const timeLogElement = getTimeLogElement();
        if (!timeLogElement || !timeLogElement.isRunning) return;

        timeLogElement.totalTime = Math.floor((Date.now() - timeLogElement.startTime) / 1000) +
        (timeLogElement.pausedTotalTime || 0);
        updateTimeDisplay();
        }, 1000);
        }
        this.app.dataManager.saveData();
        });

        div.appendChild(timeLogHeader);
    }
}
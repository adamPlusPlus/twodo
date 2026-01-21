// CounterRenderer.js - Handles counter element rendering
// CounterRenderer.js - Extracted from ElementRenderer.js to improve modularity
import { eventBus } from '../EventBus.js';
import { EVENTS } from '../AppEvents.js';

/**
 * CounterRenderer - Handles rendering of counter elements
 */
export class CounterRenderer {
    constructor(app) {
        this.app = app;
    }
    
    /**
     * Render a counter element
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
        const getCounterElement = () => {
        const document = this.app.appState.documents?.find(page => page.id === pageId);
        const group = document?.groups?.find(bin => bin.id === binId);
        if (!group) return null;
        const items = group.items || [];
        group.items = items;
        return items[elementIndex];
        };
        // Create counter header container (like task elements)
        const counterHeader = document.createElement('div');
        counterHeader.className = 'task-header';

        // Add checkbox
        const counterCheckbox = document.createElement('input');
        counterCheckbox.type = 'checkbox';
        counterCheckbox.checked = element.completed || false;
        counterCheckbox.onchange = (e) => {
        e.stopPropagation();
        this.app.toggleElement(pageId, binId, elementIndex);
        };
        counterHeader.appendChild(counterCheckbox);

        // Add title text only if it has a custom title
        const counterHasCustomTitle = element.text && element.text.trim() && element.text.trim() !== 'Counter';
        if (counterHasCustomTitle) {
        const counterTextSpan = document.createElement('span');
        counterTextSpan.className = 'task-text';
        const counterTextFragment = this.app.parseLinks(element.text);
        counterTextSpan.appendChild(counterTextFragment);
        // Clicking text enables inline editing instead of toggling checkbox
        counterTextSpan.style.cursor = 'text';
        counterTextSpan.addEventListener('click', (e) => {
        // Don't enable editing if clicking on a link
        if (e.target.tagName === 'A') {
        return;
        }
        e.stopPropagation();
        this.app.enableInlineEditing(counterTextSpan, pageId, binId, elementIndex, element);
        });
        counterHeader.appendChild(counterTextSpan);
        }

        // Prevent text click from firing when clicking checkbox
        counterCheckbox.addEventListener('click', (e) => {
        e.stopPropagation();
        });

        div.appendChild(counterHeader);

        // Counter display and controls
        const counterControls = document.createElement('div');
        counterControls.className = 'counter-controls';
        counterControls.style.display = 'flex';
        counterControls.style.alignItems = 'center';
        counterControls.style.gap = '10px';
        counterControls.style.marginTop = '10px';

        // Decrement button
        const decBtn = document.createElement('button');
        decBtn.textContent = '−';
        decBtn.style.fontSize = '20px';
        decBtn.onclick = (e) => {
        e.stopPropagation();
        const counterElement = getCounterElement();
        if (counterElement) {
        counterElement.value = Math.max(0, counterElement.value - counterElement.increment1);
        valueDisplay.textContent = counterElement.value;
        this.app.dataManager.saveData();
        }
        };
        counterControls.appendChild(decBtn);

        // Value display
        const valueDisplay = document.createElement('span');
        valueDisplay.className = 'counter-value';
        valueDisplay.textContent = element.value || 0;
        valueDisplay.style.fontSize = '24px';
        valueDisplay.style.fontWeight = 'bold';
        valueDisplay.style.minWidth = '60px';
        valueDisplay.style.textAlign = 'center';
        counterControls.appendChild(valueDisplay);

        // Increment button
        const incBtn = document.createElement('button');
        incBtn.textContent = '+';
        incBtn.style.fontSize = '20px';
        incBtn.onclick = (e) => {
        e.stopPropagation();
        const counterElement = getCounterElement();
        if (counterElement) {
        counterElement.value = (counterElement.value || 0) + counterElement.increment1;
        valueDisplay.textContent = counterElement.value;
        this.app.dataManager.saveData();
        }
        };
        counterControls.appendChild(incBtn);

        // Custom increment buttons
        const customInc5 = document.createElement('button');
        customInc5.textContent = `+${element.increment5 || 5}`;
        customInc5.onclick = (e) => {
        e.stopPropagation();
        const counterElement = getCounterElement();
        if (counterElement) {
        counterElement.value = (counterElement.value || 0) + (counterElement.increment5 || 5);
        valueDisplay.textContent = counterElement.value;
        this.app.dataManager.saveData();
        }
        };
        counterControls.appendChild(customInc5);

        const customInc = document.createElement('button');
        customInc.textContent = `+${element.customIncrement || 10}`;
        customInc.onclick = (e) => {
        e.stopPropagation();
        const counterElement = getCounterElement();
        if (counterElement) {
        counterElement.value = (counterElement.value || 0) + (counterElement.customIncrement || 10);
        valueDisplay.textContent = counterElement.value;
        this.app.dataManager.saveData();
        }
        };
        counterControls.appendChild(customInc);

        div.appendChild(counterControls);

        // Render children if they exist
        if (Array.isArray(element.childIds) && element.childIds.length > 0) {
            const childrenContainer = renderChildren(pageId, binId, element, elementIndex, depth);
            if (childrenContainer) {
                div.appendChild(childrenContainer);
            }
        }
    }
}
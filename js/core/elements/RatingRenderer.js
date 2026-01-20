// RatingRenderer.js - Handles rating element rendering
// RatingRenderer.js - Extracted from ElementRenderer.js to improve modularity
import { eventBus } from '../EventBus.js';
import { EVENTS } from '../AppEvents.js';

/**
 * RatingRenderer - Handles rendering of rating elements
 */
export class RatingRenderer {
    constructor(app) {
        this.app = app;
    }
    
    /**
     * Render a rating element
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
        const getRatingElement = () => {
        const document = this.app.appState.documents?.find(page => page.id === pageId);
        const group = document?.groups?.find(bin => bin.id === binId);
        if (!group) return null;
        const items = group.items || [];
        group.items = items;
        return items[elementIndex];
        };
        // Initialize rating state if needed
        if (element.rating === undefined) element.rating = 0;
        if (element.review === undefined) element.review = '';

        // Create rating header container
        const ratingHeader = document.createElement('div');
        ratingHeader.className = 'task-header';

        // Add checkbox
        const ratingCheckbox = document.createElement('input');
        ratingCheckbox.type = 'checkbox';
        ratingCheckbox.checked = element.completed || false;
        ratingCheckbox.onchange = (e) => {
        e.stopPropagation();
        this.app.toggleElement(pageId, binId, elementIndex);
        };
        // Prevent text click from firing when clicking checkbox
        ratingCheckbox.addEventListener('click', (e) => {
        e.stopPropagation();
        });
        ratingHeader.appendChild(ratingCheckbox);

        // Rating stars inline
        const starsContainer = document.createElement('span');
        starsContainer.style.display = 'inline-flex';
        starsContainer.style.gap = '2px';
        starsContainer.style.marginLeft = '10px';
        starsContainer.style.alignItems = 'center';

        for (let i = 1; i <= 5; i++) {
        const star = document.createElement('span');
        star.textContent = i <= (element.rating || 0) ? '★' : '☆';
        star.style.fontSize = '16px';
        star.style.cursor = 'pointer';
        star.style.color = i <= (element.rating || 0) ? '#ffd700' : '#888';
        star.onclick = (e) => {
        e.stopPropagation();
        const ratingElement = getRatingElement();
        if (ratingElement) {
        ratingElement.rating = i;
        // Update all stars
        starsContainer.querySelectorAll('span').forEach((s, idx) => {
        s.textContent = idx + 1 <= i ? '★' : '☆';
        s.style.color = idx + 1 <= i ? '#ffd700' : '#888';
        });
        this.app.dataManager.saveData();
        }
        };
        starsContainer.appendChild(star);
        }
        ratingHeader.appendChild(starsContainer);

        div.appendChild(ratingHeader);
    }
}
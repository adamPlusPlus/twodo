// ElementTypeRegistry.js - Registry for element type renderers
// Maps element types to their renderer classes
import { TaskRenderer } from './TaskRenderer.js';
import { HeaderCheckboxRenderer } from './HeaderCheckboxRenderer.js';
import { MultiCheckboxRenderer } from './MultiCheckboxRenderer.js';
import { AudioRenderer } from './AudioRenderer.js';
import { TimerRenderer } from './TimerRenderer.js';
import { CounterRenderer } from './CounterRenderer.js';
import { TrackerRenderer } from './TrackerRenderer.js';
import { RatingRenderer } from './RatingRenderer.js';
import { TimeLogRenderer } from './TimeLogRenderer.js';
import { ImageRenderer } from './ImageRenderer.js';
import { CalendarElementRenderer } from './CalendarElementRenderer.js';

/**
 * ElementTypeRegistry - Maps element types to their renderer classes
 */
export class ElementTypeRegistry {
    constructor(app) {
        this.app = app;
        this.renderers = new Map();
        this.initializeRenderers();
    }
    
    /**
     * Initialize all element type renderers
     */
    initializeRenderers() {
        this.renderers.set('task', new TaskRenderer(this.app));
        this.renderers.set('header-checkbox', new HeaderCheckboxRenderer(this.app));
        this.renderers.set('multi-checkbox', new MultiCheckboxRenderer(this.app));
        this.renderers.set('audio', new AudioRenderer(this.app));
        this.renderers.set('timer', new TimerRenderer(this.app));
        this.renderers.set('counter', new CounterRenderer(this.app));
        this.renderers.set('tracker', new TrackerRenderer(this.app));
        this.renderers.set('rating', new RatingRenderer(this.app));
        this.renderers.set('time-log', new TimeLogRenderer(this.app));
        this.renderers.set('image', new ImageRenderer(this.app));
        // this.renderers.set('calendar', new CalendarElementRenderer(this.app)); // TEMPORARILY DISABLED
    }
    
    /**
     * Get renderer for an element type
     * @param {string} elementType - The element type
     * @returns {Object|null} The renderer instance or null if not found
     */
    getRenderer(elementType) {
        return this.renderers.get(elementType) || null;
    }
    
    /**
     * Render an element using the appropriate renderer
     * @param {HTMLElement} div - The element container div
     * @param {string} pageId - Page ID
     * @param {string} binId - Bin ID
     * @param {Object} element - Element data
     * @param {number|string} elementIndex - Element index
     * @param {number} depth - Current nesting depth
     * @param {Function} renderChildren - Function to render children elements
     * @returns {void}
     */
    renderElement(div, pageId, binId, element, elementIndex, depth, renderChildren) {
        const renderer = this.getRenderer(element.type);
        if (renderer) {
            // Pass renderChildren to the renderer so it can render nested children
            renderer.render(div, pageId, binId, element, elementIndex, depth, renderChildren);
        } else {
            console.warn(`No renderer found for element type: ${element.type}`);
        }
    }
}


// RenderService.js - Service that handles application rendering
// Listens to render requests via EventBus and delegates to AppRenderer
import { eventBus } from './EventBus.js';
import { EVENTS } from './AppEvents.js';
import { SERVICES, registerService } from './AppServices.js';
import { AppRenderer } from './AppRenderer.js';
import { performanceBudgetManager } from './PerformanceBudgetManager.js';

/**
 * RenderService - Handles application rendering via EventBus
 * 
 * This service listens for render requests and delegates to AppRenderer.
 */
export class RenderService {
    constructor(app) {
        this.app = app;
        this.appRenderer = new AppRenderer(app);
        this.isRendering = false;
        this.renderQueue = [];
        this.setupEventListeners();
        
        // Register as service
        registerService(SERVICES.RENDERER, this);
    }
    
    /**
     * Setup EventBus listeners for render requests
     */
    setupEventListeners() {
        eventBus.on(EVENTS.APP.RENDER_REQUESTED, () => {
            this.render();
        });
    }
    
    /**
     * Render the application
     * Delegates to AppRenderer
     */
    async render() {
        // Prevent multiple simultaneous renders
        if (this.isRendering) {
            return;
        }
        
        this.isRendering = true;
        
        try {
            // Delegate to AppRenderer with performance budget monitoring
            const result = performanceBudgetManager.measureOperation('RENDERING', async () => {
                await this.appRenderer.render();
            }, { source: 'RenderService-render' });
            
            // If measureOperation returns a Promise (for async operations), await it
            if (result instanceof Promise) {
                await result;
            }
            
            // Emit render complete event
            eventBus.emit(EVENTS.APP.RENDERED);
        } catch (error) {
            console.error('[RenderService] Render error:', error);
        } finally {
            this.isRendering = false;
        }
    }
    
    /**
     * Request a render (public API)
     */
    requestRender() {
        eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
    }
    
    /**
     * Get the AppRenderer instance
     */
    getRenderer() {
        return this.appRenderer;
    }
}


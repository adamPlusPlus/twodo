// DataHelper.js - Standardized data persistence and rendering utilities
// Provides unified methods for saving data and requesting renders

import { eventBus } from '../core/EventBus.js';
import { EVENTS } from '../core/AppEvents.js';

export class DataHelper {
    /**
     * Save data with optional sync control
     * @param {Object} app - App instance
     * @param {boolean} skipSync - Whether to skip sync (default: false)
     */
    static saveData(app, skipSync = false) {
        if (!app || !app.dataManager) {
            console.warn('[DataHelper] App or dataManager not available');
            return;
        }
        
        // Use event-based save for consistency
        eventBus.emit(EVENTS.DATA.SAVE_REQUESTED, skipSync);
    }
    
    /**
     * Request application render
     * @param {Object} app - App instance
     */
    static requestRender(app) {
        if (!app) {
            console.warn('[DataHelper] App not available');
            return;
        }
        
        // Use event-based render for consistency
        eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
    }
    
    /**
     * Save data and request render
     * @param {Object} app - App instance
     * @param {boolean} skipSync - Whether to skip sync (default: false)
     */
    static saveAndRender(app, skipSync = false) {
        this.saveData(app, skipSync);
        this.requestRender(app);
    }
    
    /**
     * Save data and render with format preservation
     * @param {Object} app - App instance
     * @param {boolean} skipSync - Whether to skip sync (default: false)
     */
    static saveAndRenderPreservingFormat(app, skipSync = false) {
        if (app) {
            app._preservingFormat = true;
        }
        this.saveAndRender(app, skipSync);
    }
}


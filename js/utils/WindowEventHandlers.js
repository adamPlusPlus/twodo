// WindowEventHandlers.js - Handles window-level events (beforeunload, visibilitychange)
import { getService, SERVICES } from '../core/AppServices.js';

export class WindowEventHandlers {
    constructor() {
        this._setupBeforeUnload();
        this._setupVisibilityChange();
    }
    
    /**
     * Get services
     */
    _getDataManager() {
        return getService(SERVICES.DATA_MANAGER);
    }
    
    /**
     * Setup beforeunload handler (flush pending autosave)
     */
    _setupBeforeUnload() {
        window.addEventListener('beforeunload', async (e) => {
            const dataManager = this._getDataManager();
            if (dataManager && typeof dataManager.flushPendingSave === 'function') {
                // Use sendBeacon or synchronous XHR for reliable save on unload
                // For now, try to flush but don't block unload
                dataManager.flushPendingSave().catch(err => {
                    console.warn('[WindowEventHandlers] Failed to flush pending save on unload:', err);
                });
            }
        });
    }
    
    /**
     * Setup visibilitychange handler (flush pending autosave on tab switch)
     */
    _setupVisibilityChange() {
        document.addEventListener('visibilitychange', async () => {
            if (document.hidden) {
                const dataManager = this._getDataManager();
                if (dataManager && typeof dataManager.flushPendingSave === 'function') {
                    dataManager.flushPendingSave().catch(err => {
                        console.warn('[WindowEventHandlers] Failed to flush pending save on visibility change:', err);
                    });
                }
            }
        });
    }
}

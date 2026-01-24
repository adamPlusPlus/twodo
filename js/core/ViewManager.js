// ViewManager.js - Manages multiple view projections and coordinates updates
// Used for Phase 4: View Projection Layer

import { eventBus } from './EventBus.js';
import { EVENTS } from './AppEvents.js';

/**
 * ViewManager - Manages multiple view projections
 * 
 * Responsibilities:
 * - Register/unregister view projections
 * - Apply operations to all relevant views
 * - Coordinate view updates
 * - Track active views per page/document
 * - Handle view lifecycle
 */
export class ViewManager {
    constructor() {
        this.views = new Map(); // {viewId: ViewProjection}
        this.pageViews = new Map(); // {pageId: Set<viewId>}
        this._operationSubscription = null;
        this._isSubscribed = false;
    }
    
    /**
     * Initialize ViewManager (subscribe to operations)
     */
    init() {
        if (this._isSubscribed) {
            return;
        }
        
        this._subscribeToOperations();
        this._isSubscribed = true;
    }
    
    /**
     * Register a view projection
     * @param {ViewProjection} view - View projection instance
     * @param {string} pageId - Optional page ID this view is for
     */
    registerView(view, pageId = null) {
        if (!view || !view.viewId) {
            console.error('[ViewManager] Invalid view provided');
            return false;
        }
        
        // If view already registered, unregister first
        if (this.views.has(view.viewId)) {
            this.unregisterView(view.viewId);
        }
        
        // Register view
        this.views.set(view.viewId, view);
        
        // Track by page if pageId provided
        if (pageId) {
            view.setPageId(pageId);
            if (!this.pageViews.has(pageId)) {
                this.pageViews.set(pageId, new Set());
            }
            this.pageViews.get(pageId).add(view.viewId);
        }
        
        console.log(`[ViewManager] Registered view: ${view.viewId}${pageId ? ` for page: ${pageId}` : ''}`);
        return true;
    }
    
    /**
     * Unregister a view projection
     * @param {string} viewId - View ID
     */
    unregisterView(viewId) {
        if (!this.views.has(viewId)) {
            return false;
        }
        
        const view = this.views.get(viewId);
        
        // Remove from page tracking
        for (const [pageId, viewIds] of this.pageViews.entries()) {
            if (viewIds.has(viewId)) {
                viewIds.delete(viewId);
                if (viewIds.size === 0) {
                    this.pageViews.delete(pageId);
                }
                break;
            }
        }
        
        // Destroy view if it has destroy method
        if (view && typeof view.destroy === 'function') {
            view.destroy();
        }
        
        // Remove from views map
        this.views.delete(viewId);
        
        console.log(`[ViewManager] Unregistered view: ${viewId}`);
        return true;
    }
    
    /**
     * Get view by ID
     * @param {string} viewId - View ID
     * @returns {ViewProjection|null} View projection or null
     */
    getView(viewId) {
        return this.views.get(viewId) || null;
    }
    
    /**
     * Get views for a page
     * @param {string} pageId - Page ID
     * @returns {Array<ViewProjection>} Array of view projections
     */
    getViewsForPage(pageId) {
        if (!this.pageViews.has(pageId)) {
            return [];
        }
        
        const viewIds = this.pageViews.get(pageId);
        const views = [];
        
        for (const viewId of viewIds) {
            const view = this.views.get(viewId);
            if (view) {
                views.push(view);
            }
        }
        
        return views;
    }
    
    /**
     * Get all registered views
     * @returns {Array<ViewProjection>} Array of all view projections
     */
    getAllViews() {
        return Array.from(this.views.values());
    }
    
    /**
     * Apply operation to all relevant views
     * @param {Object} operation - Operation object { op, itemId, params, ... }
     */
    applyOperationToViews(operation) {
        if (!operation) {
            return;
        }
        
        // Get all views that might be affected
        const affectedViews = [];
        
        // If operation has itemId, try to find which page it belongs to
        if (operation.itemId) {
            // Find views for pages that might contain this item
            for (const [pageId, viewIds] of this.pageViews.entries()) {
                for (const viewId of viewIds) {
                    const view = this.views.get(viewId);
                    if (view && view.isOperationRelevant && view.isOperationRelevant(operation)) {
                        affectedViews.push(view);
                    }
                }
            }
        } else {
            // No itemId - apply to all views
            affectedViews.push(...this.getAllViews());
        }
        
        // Apply operation to each affected view
        for (const view of affectedViews) {
            try {
                if (view.isActive && typeof view.applyOperation === 'function') {
                    view.applyOperation(operation);
                }
            } catch (error) {
                console.error(`[ViewManager] Error applying operation to view ${view.viewId}:`, error);
            }
        }
    }
    
    /**
     * Update all views (full re-project)
     * @param {string} pageId - Optional page ID to update only views for that page
     */
    updateAllViews(pageId = null) {
        const viewsToUpdate = pageId ? this.getViewsForPage(pageId) : this.getAllViews();
        
        for (const view of viewsToUpdate) {
            try {
                if (view.isActive && typeof view.update === 'function') {
                    view.update();
                }
            } catch (error) {
                console.error(`[ViewManager] Error updating view ${view.viewId}:`, error);
            }
        }
    }
    
    /**
     * Subscribe to operation events
     * @private
     */
    _subscribeToOperations() {
        if (this._operationSubscription) {
            return;
        }
        
        const handler = (event) => {
            const operation = event.operation;
            if (operation) {
                this.applyOperationToViews(operation);
            }
        };
        
        eventBus.on('operation:applied', handler);
        this._operationSubscription = handler;
    }
    
    /**
     * Unsubscribe from operation events
     * @private
     */
    _unsubscribeFromOperations() {
        if (this._operationSubscription) {
            eventBus.off('operation:applied', this._operationSubscription);
            this._operationSubscription = null;
        }
        this._isSubscribed = false;
    }
    
    /**
     * Destroy ViewManager (cleanup)
     */
    destroy() {
        // Unregister all views
        const viewIds = Array.from(this.views.keys());
        for (const viewId of viewIds) {
            this.unregisterView(viewId);
        }
        
        // Unsubscribe from events
        this._unsubscribeFromOperations();
        
        this.views.clear();
        this.pageViews.clear();
    }
    
    /**
     * Get view count
     * @returns {number} Number of registered views
     */
    getViewCount() {
        return this.views.size;
    }
    
    /**
     * Get page count (number of pages with views)
     * @returns {number} Number of pages with registered views
     */
    getPageCount() {
        return this.pageViews.size;
    }
}

// Export singleton instance
export const viewManager = new ViewManager();

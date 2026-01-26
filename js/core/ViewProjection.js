// ViewProjection.js - Base class for view projections that derive from canonical model
// Used for Phase 4: View Projection Layer

import { eventBus } from './EventBus.js';
import { EVENTS } from './AppEvents.js';
import { getService, SERVICES } from './AppServices.js';

/**
 * ViewProjection - Abstract base class for view projections
 * 
 * Views are projections of the canonical model (AppState). They:
 * - Read from canonical model (never modify directly)
 * - Subscribe to operation:applied events
 * - Update automatically when operations are applied
 * - Project canonical model to view-specific representation
 * 
 * Features:
 * - Operation subscription and filtering
 * - Incremental updates via applyOperation()
 * - Full re-project via project() and update()
 * - Lifecycle management (init, destroy)
 */
export class ViewProjection {
    constructor(config = {}) {
        this.viewId = config.viewId || `view-${Date.now()}`;
        this.canonicalModel = null; // Reference to AppState
        this.container = null; // DOM container
        this.isActive = false;
        this._operationSubscriptions = [];
        this._onUpdate = config.onUpdate || null; // Callback when view needs update
        this._filterOperations = config.filterOperations || null; // Function to filter relevant operations
        this._pageId = config.pageId || null; // Page ID this view is for (for filtering)
        this._lastProjectedData = null; // Cache last projected data
    }
    
    /**
     * Initialize view projection
     * @param {Object} canonicalModel - AppState instance
     * @param {HTMLElement} container - DOM container for view
     * @param {boolean} skipInitialUpdate - If true, don't call update() immediately
     */
    init(canonicalModel, container, skipInitialUpdate = false) {
        if (!canonicalModel) {
            console.error('[ViewProjection] canonicalModel is required');
            return;
        }
        
        this.canonicalModel = canonicalModel;
        this.container = container;
        this.isActive = true;
        
        // Subscribe to operation events
        this._subscribeToOperations();
        
        // Initial projection (skip if DOM not ready)
        if (!skipInitialUpdate) {
            this.update();
        }
    }
    
    /**
     * Project canonical model to view representation
     * Override in subclasses
     * @param {Object} canonicalModel - AppState instance
     * @returns {*} View-specific representation
     */
    project(canonicalModel) {
        // Override in subclasses
        console.warn('[ViewProjection] project() not implemented');
        return null;
    }
    
    /**
     * Apply operation to view (incremental update)
     * Override in subclasses for incremental updates
     * @param {Object} operation - Operation object { op, itemId, params, ... }
     * @returns {boolean} True if operation was handled, false otherwise
     */
    applyOperation(operation) {
        // Check if this update is from authoritative source
        // If so, skip view update to prevent circular updates
        const authorityManager = getService(SERVICES.AUTHORITY_MANAGER);
        if (authorityManager && this._pageId && this.viewId) {
            const isFromAuthoritativeSource = authorityManager.isUpdateFromAuthoritativeSource(
                this._pageId,
                this.viewId,
                operation
            );
            
            if (isFromAuthoritativeSource) {
                // This update came from the authoritative source (e.g., markdown edit)
                // Skip view update to prevent circular update loop
                console.log('[ViewProjection] Skipping update from authoritative source:', {
                    viewId: this.viewId,
                    pageId: this._pageId,
                    operation: operation.op
                });
                return true; // Handled, but no view update needed
            }
        }
        
        // Override in subclasses for incremental updates
        // Default: fallback to full re-project
        if (this.isOperationRelevant(operation)) {
            this.update();
            return true;
        }
        return false;
    }
    
    /**
     * Check if operation is relevant to this view
     * @param {Object} operation - Operation object
     * @returns {boolean} True if operation affects this view
     */
    isOperationRelevant(operation) {
        // If filter function provided, use it
        if (this._filterOperations && typeof this._filterOperations === 'function') {
            return this._filterOperations(operation);
        }
        
        // Default: check if operation affects current page
        if (this._pageId && operation.itemId) {
            // Check if item belongs to this page
            // This is a simplified check - subclasses can override
            return this._itemBelongsToPage(operation.itemId, this._pageId);
        }
        
        // If no page filter, consider all operations relevant
        return true;
    }
    
    /**
     * Check if item belongs to page (helper method)
     * @private
     * @param {string} itemId - Item ID
     * @param {string} pageId - Page ID
     * @returns {boolean}
     */
    _itemBelongsToPage(itemId, pageId) {
        if (!this.canonicalModel || !this.canonicalModel.documents) {
            return false;
        }
        
        const page = this.canonicalModel.documents.find(p => p.id === pageId);
        if (!page || !page.groups) {
            return false;
        }
        
        // Search through all groups and items
        for (const group of page.groups) {
            if (this._findItemInGroup(group, itemId)) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Recursively find item in group
     * @private
     * @param {Object} group - Group object
     * @param {string} itemId - Item ID to find
     * @returns {boolean}
     */
    _findItemInGroup(group, itemId) {
        if (!group.items) {
            return false;
        }
        
        for (const item of group.items) {
            if (item.id === itemId) {
                return true;
            }
            // Check children (if item has items property)
            if (item.items && this._findItemInGroup({ items: item.items }, itemId)) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Full update (re-project from canonical model)
     */
    update() {
        if (!this.isActive || !this.canonicalModel) {
            return;
        }
        
        try {
            // Project from canonical model
            const projectedData = this.project(this.canonicalModel);
            this._lastProjectedData = projectedData;
            
            // Call update callback if provided
            if (this._onUpdate && typeof this._onUpdate === 'function') {
                this._onUpdate(projectedData);
            }
        } catch (error) {
            console.error('[ViewProjection] Error updating view:', error);
        }
    }
    
    /**
     * Destroy view projection
     */
    destroy() {
        this.isActive = false;
        this._unsubscribeFromOperations();
        this.canonicalModel = null;
        this.container = null;
        this._lastProjectedData = null;
    }
    
    /**
     * Subscribe to operation events
     * @private
     */
    _subscribeToOperations() {
        if (this._operationSubscriptions.length > 0) {
            // Already subscribed
            return;
        }
        
        // Subscribe to operation:applied events
        const handler = (event) => {
            if (!this.isActive) {
                return;
            }
            
            const operation = event.operation;
            if (!operation) {
                return;
            }
            
            // Check if operation is relevant
            if (this.isOperationRelevant(operation)) {
                // Try incremental update first
                const handled = this.applyOperation(operation);
                
                // If not handled incrementally, fallback to full update
                if (!handled) {
                    this.update();
                }
            }
        };
        
        eventBus.on('operation:applied', handler);
        this._operationSubscriptions.push({
            event: 'operation:applied',
            handler: handler
        });
        
        // Also subscribe to data changed events as fallback
        const dataChangedHandler = (event) => {
            if (!this.isActive) {
                return;
            }
            
            // Full update on any data change
            this.update();
        };
        
        eventBus.on(EVENTS.DATA.CHANGED, dataChangedHandler);
        this._operationSubscriptions.push({
            event: EVENTS.DATA.CHANGED,
            handler: dataChangedHandler
        });
    }
    
    /**
     * Unsubscribe from operation events
     * @private
     */
    _unsubscribeFromOperations() {
        for (const subscription of this._operationSubscriptions) {
            eventBus.off(subscription.event, subscription.handler);
        }
        this._operationSubscriptions = [];
    }
    
    /**
     * Get last projected data
     * @returns {*} Last projected data
     */
    getLastProjectedData() {
        return this._lastProjectedData;
    }
    
    /**
     * Set page ID for filtering operations
     * @param {string} pageId} - Page ID
     */
    setPageId(pageId) {
        this._pageId = pageId;
    }
    
    /**
     * Get page ID
     * @returns {string|null} Page ID
     */
    getPageId() {
        return this._pageId;
    }
}

// PageKanbanFormat - Format renderer for page-level Kanban view (groups as columns, items as cards)
import { BaseFormatRenderer } from '../../core/BaseFormatRenderer.js';
import { DOMUtils } from '../../utils/dom.js';
import { StringUtils } from '../../utils/string.js';
import { eventBus } from '../../core/EventBus.js';
import { ItemHierarchy } from '../../utils/ItemHierarchy.js';
import { ViewportRenderer } from '../../core/ViewportRenderer.js';
import { ViewProjection } from '../../core/ViewProjection.js';
import { getService, SERVICES } from '../../core/AppServices.js';
import { KanbanColumnRenderer } from './kanban/KanbanColumnRenderer.js';
import { KanbanCardRenderer } from './kanban/KanbanCardRenderer.js';
import { KanbanInteractions } from './kanban/KanbanInteractions.js';
import { KanbanLayoutManager } from './kanban/KanbanLayoutManager.js';

export default class PageKanbanFormat extends BaseFormatRenderer {
    constructor(config = {}) {
        super({
            id: 'page-kanban-format',
            name: 'Page Kanban Board',
            formatName: 'page-kanban-format',
            version: '1.0.0',
            description: 'Kanban board view with groups as columns and items as cards',
            supportsPages: true,
            defaultConfig: {
                enabled: false,
                cardHeight: 'auto',
                showCardDetails: true
            },
            ...config
        });
        
        // Create ViewProjection for this format
        this.viewProjection = null;
        this.currentPageId = null;
        this._kanbanStructure = null; // Cache last projected structure
        
        // Initialize Kanban components
        this.columnRenderer = new KanbanColumnRenderer(this);
        this.cardRenderer = new KanbanCardRenderer(this);
        this.interactions = new KanbanInteractions(this);
        this.layoutManager = new KanbanLayoutManager();
    }
    
    async onInit() {
        // console.log(`${this.name} format renderer initialized.`);
        
        // Don't call registerFormat here - the plugin isn't registered in the registry yet
        // The FormatRendererManager will pick it up via:
        // 1. The 'plugin:loaded' event (emitted after plugin is registered)
        // 2. The scanForFormats() method which scans the registry
        // 3. The 'format:registered' event (if needed)
        
        // Emit event for registration - FormatRendererManager listens to this
        eventBus.emit('format:registered', { pluginId: this.id });
    }

    _getGroups(page) {
        return page?.groups || [];
    }

    _getItems(bin) {
        const items = bin.items || [];
        bin.items = items;
        return items;
    }
    
    /**
     * Project canonical model to Kanban representation
     * @param {Object} canonicalModel - AppState instance
     * @returns {Object} Kanban structure { groups: [...], items: {...} }
     */
    project(canonicalModel) {
        if (!canonicalModel || !canonicalModel.documents) {
            return { groups: [], items: {} };
        }
        
        const page = canonicalModel.documents.find(p => p.id === this.currentPageId);
        if (!page) {
            return { groups: [], items: {} };
        }
        
        // Convert page to Kanban structure
        const groups = this._getGroups(page);
        const items = {};
        
        // Build item map for quick lookup
        for (const bin of groups) {
            const binItems = this._getItems(bin);
            for (const item of binItems) {
                items[item.id] = item;
            }
        }
        
        const structure = { groups, items };
        this._kanbanStructure = structure;
        return structure;
    }
    
    /**
     * Apply operation to view (incremental update)
     * @param {Object} operation - Operation object
     * @returns {boolean} True if handled
     */
    applyOperation(operation) {
        if (!this.isOperationRelevant(operation)) {
            return false;
        }
        
        // Incremental updates for Kanban cards
        if (operation.op === 'setText') {
            this._updateCardText(operation.itemId, operation.params.text);
            return true;
        } else if (operation.op === 'move') {
            this._moveCard(operation.itemId, operation.params.newParentId);
            return true;
        } else if (operation.op === 'create') {
            // Trigger full update for new cards
            if (this.viewProjection) {
                this.viewProjection.update();
            }
            return true;
        } else if (operation.op === 'delete') {
            this._removeCard(operation.itemId);
            return true;
        }
        
        // Fallback to full update
        if (this.viewProjection) {
            this.viewProjection.update();
        }
        return true;
    }
    
    /**
     * Update card text incrementally
     * @private
     * @param {string} itemId - Item ID
     * @param {string} newText - New text
     */
    _updateCardText(itemId, newText) {
        const container = this.viewProjection?.container;
        if (!container) return;
        
        const card = container.querySelector(`[data-item-id="${itemId}"]`);
        if (card) {
            const textElement = card.querySelector('.kanban-card-text');
            if (textElement) {
                textElement.textContent = newText || 'Untitled';
            }
        }
    }
    
    /**
     * Move card to new column
     * @private
     * @param {string} itemId - Item ID
     * @param {string} newParentId - New parent (bin) ID
     */
    _moveCard(itemId, newParentId) {
        // For now, trigger full update
        // Future: implement incremental card movement
        if (this.viewProjection) {
            this.viewProjection.update();
        }
    }
    
    /**
     * Remove card from view
     * @private
     * @param {string} itemId - Item ID
     */
    _removeCard(itemId) {
        const container = this.viewProjection?.container;
        if (!container) return;
        
        const card = container.querySelector(`[data-item-id="${itemId}"]`);
        if (card) {
            card.remove();
        }
    }
    
    /**
     * Check if operation is relevant to this view
     * @param {Object} operation - Operation object
     * @returns {boolean}
     */
    isOperationRelevant(operation) {
        if (!this.currentPageId || !operation.itemId) {
            return false;
        }
        
        // Use ViewProjection's helper if available
        if (this.viewProjection) {
            return this.viewProjection.isOperationRelevant(operation);
        }
        
        return false;
    }
    
    /**
     * Render a page in Kanban format
     * @param {HTMLElement} container - Container element
     * @param {Object} page - Page data
     * @param {Object} options - Options with app reference
     */
    renderPage(container, page, options = {}) {
        const app = options.app;
        if (!app) return;
        
        this.currentPageId = page.id;
        
        // Initialize ViewProjection if not already done
        if (!this.viewProjection) {
            const appState = app.appState;
            if (appState) {
                const customProjection = new ViewProjection({
                    viewId: `kanban-${page.id}`,
                    pageId: page.id,
                    onUpdate: (projectedData) => {
                        // Update Kanban board when projection updates
                        this._updateKanbanDisplay(projectedData);
                    },
                    filterOperations: (operation) => {
                        return this.isOperationRelevant(operation);
                    }
                });
                
                // Override project() to call this format renderer's project method
                // Use arrow function to preserve 'this' context
                const formatRenderer = this;
                customProjection.project = (canonicalModel) => {
                    return formatRenderer.project(canonicalModel);
                };
                
                // Override applyOperation() to call this format renderer's applyOperation method
                customProjection.applyOperation = (operation) => {
                    return formatRenderer.applyOperation(operation);
                };
                
                this.viewProjection = customProjection;
                
                // Set up ViewProjection but don't call init() yet (wait for DOM)
                this.viewProjection.canonicalModel = appState;
                this.viewProjection.container = container;
                
                // Register with ViewManager
                const viewManager = getService(SERVICES.VIEW_MANAGER);
                if (viewManager) {
                    viewManager.registerView(this.viewProjection, page.id);
                }
            }
        } else {
            // Update page ID if changed
            if (this.currentPageId !== page.id) {
                this.currentPageId = page.id;
                this.viewProjection.setPageId(page.id);
            }
            // Update container reference
            this.viewProjection.container = container;
        }
        
        // Only clear if not preserving format (prevents flicker during drag operations)
        if (!app._preservingFormat) {
            container.innerHTML = '';
        }
        
        container.style.cssText = this.layoutManager.calculateContainerStyles();
        
        const groups = this._getGroups(page);
        if (!groups.length) {
            if (!app._preservingFormat) {
                container.innerHTML = `<p style="color: var(--header-color, #888); padding: 20px; font-family: var(--page-font-family);">No groups available. Add groups to see them as Kanban columns.</p>`;
            }
            return;
        }
        
        // If preserving format, update existing columns instead of clearing
        if (app._preservingFormat && container.children.length > 0) {
            // Update existing columns - find and update each column
            groups.forEach((bin, index) => {
                const existingColumn = container.querySelector(`[data-bin-id="${bin.id}"]`);
                if (existingColumn) {
                    // Update existing column content
                    const content = existingColumn.querySelector('.kanban-column-content');
                    if (content) {
                        // Clean up existing virtual scroller if any
                        if (content._virtualScroller) {
                            content._virtualScroller.destroy();
                            content._virtualScroller = null;
                        }
                        content.innerHTML = '';
                        const items = this._getItems(bin);
                        if (items.length > 0) {
                            // Use viewport rendering for 50+ items
                            const virtualScroller = ViewportRenderer.renderViewport(
                                content,
                                items,
                                (element, elementIndex) => {
                                    return this.cardRenderer.renderCard(element, page.id, bin.id, elementIndex, app, (child, childPageId, childBinId, childIndex, childApp) => {
                                        return this.cardRenderer.renderCard(child, childPageId, childBinId, childIndex, childApp, null);
                                    });
                                },
                                {
                                    threshold: 50
                                }
                            );
                            
                            // Store virtual scroller reference
                            if (virtualScroller) {
                                content._virtualScroller = virtualScroller;
                            }
                        } else {
                            const emptyState = DOMUtils.createElement('div', {
                                style: `text-align: center; color: var(--header-color, #666); padding: 20px; font-size: var(--element-font-size, 12px); font-family: var(--element-font-family);`
                            }, 'No items');
                            content.appendChild(emptyState);
                        }
                        
                        // Update count
                        const countElement = existingColumn.querySelector('.kanban-column-count');
                        if (countElement) {
                            countElement.textContent = items.length.toString();
                        }
                    }
                } else {
                    // New bin - add column
                    const column = this.columnRenderer.renderColumn(
                        bin, 
                        page.id, 
                        app,
                        (element, elementIndex) => {
                            return this.cardRenderer.renderCard(element, page.id, bin.id, elementIndex, app, (child, childPageId, childBinId, childIndex, childApp) => {
                                return this.cardRenderer.renderCard(child, childPageId, childBinId, childIndex, childApp, null);
                            });
                        },
                        (content, pageId, binId, app) => {
                            this.interactions.setupColumnDropZone(content, pageId, binId, app);
                        }
                    );
                    container.appendChild(column);
                }
            });
            
            // Remove columns for groups that no longer exist
            const existingColumns = container.querySelectorAll('.kanban-column');
            existingColumns.forEach(col => {
                const binId = col.dataset.binId;
                if (!groups.find(b => b.id === binId)) {
                    col.remove();
                }
            });
        } else {
            // Full render - clear and rebuild
            container.innerHTML = '';
            groups.forEach(bin => {
                const column = this.columnRenderer.renderColumn(
                    bin, 
                    page.id, 
                    app,
                    (element, elementIndex) => {
                        return this.cardRenderer.renderCard(element, page.id, bin.id, elementIndex, app, (child, childPageId, childBinId, childIndex, childApp) => {
                            return this.cardRenderer.renderCard(child, childPageId, childBinId, childIndex, childApp, null);
                        });
                    },
                    (content, pageId, binId, app) => {
                        this.interactions.setupColumnDropZone(content, pageId, binId, app);
                    }
                );
                container.appendChild(column);
            });
        }
        
        // Reset format preservation flag
        app._preservingFormat = false;
    }
    
    /**
     * Render a bin as a Kanban column
     * @param {Object} bin - Bin data
     * @param {string} pageId - Page ID
     * @param {Object} app - App instance
     */
    renderColumn(bin, pageId, app) {
        return this.columnRenderer.renderColumn(
            bin,
            pageId,
            app,
            (element, elementIndex) => {
                return this.cardRenderer.renderCard(element, pageId, bin.id, elementIndex, app, (child, childPageId, childBinId, childIndex, childApp) => {
                    return this.cardRenderer.renderCard(child, childPageId, childBinId, childIndex, childApp, null);
                });
            },
            (content, pageId, binId, app) => {
                this.interactions.setupColumnDropZone(content, pageId, binId, app);
            }
        );
    }
    
    /**
     * Render an element as a Kanban card
     * @param {Object} element - Element data
     * @param {string} pageId - Page ID
     * @param {string} binId - Bin ID
     * @param {number} elementIndex - Element index
     * @param {Object} app - App instance
     */
    renderCard(element, pageId, binId, elementIndex, app) {
        const card = this.cardRenderer.renderCard(
            element,
            pageId,
            binId,
            elementIndex,
            app,
            (child, childPageId, childBinId, childIndex, childApp) => {
                return this.cardRenderer.renderCard(child, childPageId, childBinId, childIndex, childApp, null);
            }
        );
        
        // Setup drag handlers
        this.interactions.setupCardDrag(card, pageId, binId, elementIndex);
        
        return card;
    }
    
    /**
     * Update Kanban display when projection updates
     * @private
     * @param {Object} structure - Kanban structure { groups, items }
     */
    _updateKanbanDisplay(structure) {
        if (!structure || !structure.groups) return;
        
        // For now, trigger full re-render
        // Future: implement incremental column/card updates
        const container = this.viewProjection?.container;
        if (container && this.viewProjection?.canonicalModel) {
            // Re-render using existing renderPage logic
            // Note: This is a simplified approach - full implementation would
            // update cards incrementally without full re-render
            const appState = this.viewProjection.canonicalModel;
            const page = appState?.documents?.find(p => p.id === this.currentPageId);
            if (page) {
                // Get app instance from window or service
                const app = window.app || getService(SERVICES.APP_STATE)?.app;
                if (app) {
                    // Preserve format flag to prevent flicker
                    app._preservingFormat = true;
                    this.renderPage(container, page, { app });
                    app._preservingFormat = false;
                }
            }
        }
    }
    
    /**
     * Destroy view projection when format is deactivated
     */
    destroy() {
        if (this.viewProjection) {
            const viewManager = getService(SERVICES.VIEW_MANAGER);
            if (viewManager) {
                viewManager.unregisterView(this.viewProjection.viewId);
            }
            this.viewProjection.destroy();
            this.viewProjection = null;
        }
        this._kanbanStructure = null;
        this.currentPageId = null;
    }
}


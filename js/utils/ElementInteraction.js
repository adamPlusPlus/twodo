// ElementInteraction.js - Shared utilities for element interactions across all views
// Provides drag-and-drop, context menus, visual customization, and relationships

export class ElementInteraction {
    constructor(app) {
        this.app = app;
    }
    
    /**
     * Setup all interactions for an element (drag-drop, context menu, visual settings)
     * @param {HTMLElement} elementEl - The element DOM node
     * @param {string} pageId - Page ID
     * @param {string} binId - Bin ID
     * @param {number} elementIndex - Element index
     * @param {Object} element - Element data
     * @param {Object} options - Options
     */
    setupElementInteractions(elementEl, pageId, binId, elementIndex, element, options = {}) {
        const {
            enableDragDrop = true,
            enableContextMenu = true,
            enableVisualSettings = true,
            dragDropType = 'standard', // 'standard', 'shared', 'none'
            customDragHandler = null
        } = options;
        
        // Apply visual settings
        if (enableVisualSettings && this.app.visualSettingsManager) {
            const elementId = `${pageId}-${binId}-${elementIndex}`;
            const page = this.app.appState?.pages?.find(p => p.id === pageId);
            const viewFormat = page?.format || 'default';
            this.app.visualSettingsManager.applyVisualSettings(elementEl, 'element', elementId, pageId, viewFormat);
        }
        
        // Setup drag and drop
        if (enableDragDrop) {
            if (dragDropType === 'shared') {
                // Use shared drag-drop for nesting
                if (!this.app.elementRenderer?.sharedDragDrop) {
                    // Dynamic import for SharedDragDrop
                    import('../utils/SharedDragDrop.js').then(({ SharedDragDrop }) => {
                        this.app.elementRenderer.sharedDragDrop = new SharedDragDrop(this.app);
                        this.app.elementRenderer.sharedDragDrop.setupElementDragDrop(elementEl, pageId, binId, elementIndex, element);
                    });
                } else {
                    this.app.elementRenderer.sharedDragDrop.setupElementDragDrop(elementEl, pageId, binId, elementIndex, element);
                }
            } else if (dragDropType === 'standard') {
                this.setupStandardDragDrop(elementEl, pageId, binId, elementIndex, element);
            } else if (customDragHandler) {
                customDragHandler(elementEl, pageId, binId, elementIndex, element);
            }
        }
        
        // Setup context menu
        if (enableContextMenu) {
            this.setupContextMenu(elementEl, pageId, binId, elementIndex, element);
        }
        
        // Add data attributes for identification
        elementEl.dataset.pageId = pageId;
        elementEl.dataset.binId = binId;
        elementEl.dataset.elementIndex = elementIndex;
        elementEl.dataset.elementType = element.type || 'task';
    }
    
    /**
     * Setup standard drag and drop
     * @param {HTMLElement} elementEl - Element DOM node
     * @param {string} pageId - Page ID
     * @param {string} binId - Bin ID
     * @param {number} elementIndex - Element index
     * @param {Object} element - Element data
     */
    setupStandardDragDrop(elementEl, pageId, binId, elementIndex, element) {
        elementEl.draggable = true;
        elementEl.dataset.dragType = 'element';
        
        elementEl.addEventListener('dragstart', (e) => {
            e.stopPropagation();
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', JSON.stringify({
                type: 'element',
                pageId,
                binId,
                elementIndex
            }));
            elementEl.style.opacity = '0.5';
        });
        
        elementEl.addEventListener('dragend', (e) => {
            elementEl.style.opacity = '1';
        });
        
        // Make droppable
        elementEl.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            e.dataTransfer.dropEffect = 'move';
        });
        
        elementEl.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const dragData = e.dataTransfer.getData('text/plain');
            if (!dragData) return;
            
            try {
                const data = JSON.parse(dragData);
                if (data.type === 'element' && this.app.dragDropHandler) {
                    // Handle element reordering
                    if (data.pageId === pageId && data.binId === binId) {
                        this.app.dragDropHandler.moveElement(
                            data.pageId, data.binId, data.elementIndex,
                            pageId, binId, elementIndex
                        );
                    }
                }
            } catch (err) {
                console.error('Error handling drop:', err);
            }
        });
    }
    
    /**
     * Setup context menu for element
     * @param {HTMLElement} elementEl - Element DOM node
     * @param {string} pageId - Page ID
     * @param {string} binId - Bin ID
     * @param {number} elementIndex - Element index
     * @param {Object} element - Element data
     */
    setupContextMenu(elementEl, pageId, binId, elementIndex, element) {
        elementEl.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            if (this.app.contextMenuHandler) {
                // Set context menu state
                if (this.app.appState.setContextMenuState) {
                    this.app.appState.setContextMenuState({
                        visible: true,
                        pageId: pageId,
                        binId: binId,
                        elementIndex: elementIndex,
                        subtaskIndex: null,
                        x: e.clientX,
                        y: e.clientY
                    });
                } else {
                    this.app.appState.contextMenuState = {
                        visible: true,
                        pageId: pageId,
                        binId: binId,
                        elementIndex: elementIndex,
                        subtaskIndex: null,
                        x: e.clientX,
                        y: e.clientY
                    };
                }
                
                // Show context menu
                this.app.contextMenuHandler.showContextMenu(e, pageId, binId, elementIndex);
            }
        });
    }
    
    /**
     * Setup interactions for a bin
     * @param {HTMLElement} binEl - Bin DOM node
     * @param {string} pageId - Page ID
     * @param {string} binId - Bin ID
     * @param {Object} bin - Bin data
     */
    setupBinInteractions(binEl, pageId, binId, bin) {
        // Apply visual settings
        if (this.app.visualSettingsManager) {
            const binIdStr = `${pageId}-${binId}`;
            const page = this.app.appState?.pages?.find(p => p.id === pageId);
            const viewFormat = page?.format || 'default';
            this.app.visualSettingsManager.applyVisualSettings(binEl, 'bin', binIdStr, pageId, viewFormat);
        }
        
        // Setup context menu
        binEl.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            if (this.app.contextMenuHandler) {
                if (this.app.appState.setContextMenuState) {
                    this.app.appState.setContextMenuState({
                        visible: true,
                        pageId: pageId,
                        binId: binId,
                        elementIndex: null,
                        subtaskIndex: null,
                        x: e.clientX,
                        y: e.clientY
                    });
                } else {
                    this.app.appState.contextMenuState = {
                        visible: true,
                        pageId: pageId,
                        binId: binId,
                        elementIndex: null,
                        subtaskIndex: null,
                        x: e.clientX,
                        y: e.clientY
                    };
                }
                
                this.app.contextMenuHandler.showBinContextMenu(e, pageId, binId);
            }
        });
        
        // Add data attributes
        binEl.dataset.pageId = pageId;
        binEl.dataset.binId = binId;
    }
    
    /**
     * Setup interactions for a page
     * @param {HTMLElement} pageEl - Page DOM node
     * @param {string} pageId - Page ID
     * @param {Object} page - Page data
     */
    setupPageInteractions(pageEl, pageId, page) {
        // Apply visual settings
        if (this.app.visualSettingsManager) {
            const viewFormat = page?.format || 'default';
            this.app.visualSettingsManager.applyVisualSettings(pageEl, 'page', pageId, pageId, viewFormat);
        }
        
        // Setup context menu
        pageEl.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            if (this.app.contextMenuHandler) {
                if (this.app.appState.setContextMenuState) {
                    this.app.appState.setContextMenuState({
                        visible: true,
                        pageId: pageId,
                        binId: undefined, // undefined indicates page-level
                        elementIndex: null,
                        subtaskIndex: null,
                        x: e.clientX,
                        y: e.clientY
                    });
                } else {
                    this.app.appState.contextMenuState = {
                        visible: true,
                        pageId: pageId,
                        binId: undefined,
                        elementIndex: null,
                        subtaskIndex: null,
                        x: e.clientX,
                        y: e.clientY
                    };
                }
                
                this.app.contextMenuHandler.showPageContextMenu(e, pageId);
            }
        });
        
        // Add data attributes
        pageEl.dataset.pageId = pageId;
    }
    
    /**
     * Render element with all interactions (uses ElementRenderer if available)
     * @param {string} pageId - Page ID
     * @param {string} binId - Bin ID
     * @param {Object} element - Element data
     * @param {number} elementIndex - Element index
     * @param {Object} options - Options
     * @returns {HTMLElement} Rendered element
     */
    renderElement(pageId, binId, element, elementIndex, options = {}) {
        const {
            useElementRenderer = true,
            customRenderer = null,
            interactionOptions = {}
        } = options;
        
        // Use ElementRenderer if available and requested
        if (useElementRenderer && this.app.elementRenderer) {
            return this.app.elementRenderer.renderElement(pageId, binId, element, elementIndex, null, 0);
        }
        
        // Use custom renderer if provided
        if (customRenderer) {
            const elementEl = customRenderer(element, pageId, binId, elementIndex);
            this.setupElementInteractions(elementEl, pageId, binId, elementIndex, element, interactionOptions);
            return elementEl;
        }
        
        // Fallback: create basic element
        const elementEl = document.createElement('div');
        elementEl.className = `element ${element.type || 'task'}`;
        elementEl.textContent = element.text || '';
        this.setupElementInteractions(elementEl, pageId, binId, elementIndex, element, interactionOptions);
        return elementEl;
    }
}


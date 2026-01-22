// ElementInteraction.js - Shared utilities for element interactions across all views
// Provides drag-and-drop, context menus, visual customization, and relationships

export class ElementInteraction {
    constructor(app) {
        this.app = app;
    }
    
    /**
     * Setup all interactions for an element (drag-drop, context menu, visual settings)
     * @param {HTMLElement} elementNode - The element DOM node
     * @param {string} pageId - Page ID
     * @param {string} binId - Bin ID
     * @param {number} elementIndex - Element index
     * @param {Object} element - Element data
     * @param {Object} options - Options
     */
    setupElementInteractions(elementNode, pageId, binId, elementIndex, element, options = {}) {
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
            const page = this.app.appState?.documents?.find(p => p.id === pageId);
            const viewFormat = page?.format || 'default';
            this.app.visualSettingsManager.applyVisualSettings(elementNode, 'element', elementId, pageId, viewFormat);
        }
        
        // Setup drag and drop
        if (enableDragDrop) {
            if (dragDropType === 'shared') {
                // Use shared drag-drop for nesting
                if (!this.app.elementRenderer?.sharedDragDrop) {
                    // Dynamic import for SharedDragDrop
                    import('../utils/SharedDragDrop.js').then(({ SharedDragDrop }) => {
                        this.app.elementRenderer.sharedDragDrop = new SharedDragDrop(this.app);
                        this.app.elementRenderer.sharedDragDrop.setupElementDragDrop(elementNode, pageId, binId, elementIndex, element);
                    });
                } else {
                    this.app.elementRenderer.sharedDragDrop.setupElementDragDrop(elementNode, pageId, binId, elementIndex, element);
                }
            } else if (dragDropType === 'standard') {
                this.setupStandardDragDrop(elementNode, pageId, binId, elementIndex, element);
            } else if (customDragHandler) {
                customDragHandler(elementNode, pageId, binId, elementIndex, element);
            }
        }
        
        // Setup context menu
        if (enableContextMenu) {
            this.setupContextMenu(elementNode, pageId, binId, elementIndex, element);
        }
        
        // Add data attributes for identification
        const elementId = `${pageId}-${binId}-${elementIndex}`;
        elementNode.dataset.pageId = pageId;
        elementNode.dataset.binId = binId;
        elementNode.dataset.elementIndex = elementIndex;
        elementNode.dataset.elementId = elementId;
        elementNode.setAttribute('data-element-id', elementId);
        elementNode.dataset.elementType = element.type || 'task';
    }
    
    /**
     * Setup standard drag and drop
     * @param {HTMLElement} elementNode - Element DOM node
     * @param {string} pageId - Page ID
     * @param {string} binId - Bin ID
     * @param {number} elementIndex - Element index
     * @param {Object} element - Element data
     */
    setupStandardDragDrop(elementNode, pageId, binId, elementIndex, element) {
        elementNode.draggable = true;
        elementNode.dataset.dragType = 'element';
        
        elementNode.addEventListener('dragstart', (e) => {
            e.stopPropagation();
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', JSON.stringify({
                type: 'element',
                pageId,
                binId,
                elementIndex
            }));
            elementNode.style.opacity = '0.5';
        });
        
        elementNode.addEventListener('dragend', (e) => {
            elementNode.style.opacity = '1';
        });
        
        // Make droppable
        elementNode.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            e.dataTransfer.dropEffect = 'move';
        });
        
        elementNode.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const dragData = e.dataTransfer.getData('text/plain');
            if (!dragData) return;
            
            try {
                const dragPayload = JSON.parse(dragData);
                if (dragPayload.type === 'element' && this.app.dragDropHandler) {
                    // Handle element reordering
                    if (dragPayload.pageId === pageId && dragPayload.binId === binId) {
                        this.app.dragDropHandler.moveElement(
                            dragPayload.pageId, dragPayload.binId, dragPayload.elementIndex,
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
     * @param {HTMLElement} elementNode - Element DOM node
     * @param {string} pageId - Page ID
     * @param {string} binId - Bin ID
     * @param {number} elementIndex - Element index
     * @param {Object} element - Element data
     */
    setupContextMenu(elementNode, pageId, binId, elementIndex, element) {
        elementNode.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            if (this.app.contextMenuHandler) {
                // Set context menu state
                if (this.app.appState.setContextMenuState) {
                    this.app.appState.setContextMenuState({
                        visible: true,
                        documentId: pageId,
                        groupId: binId,
                        elementIndex: elementIndex,
                        subtaskIndex: null,
                        x: e.clientX,
                        y: e.clientY
                    });
                } else {
                    this.app.appState.contextMenuState = {
                        visible: true,
                        documentId: pageId,
                        groupId: binId,
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
     * @param {HTMLElement} binElement - Bin DOM node
     * @param {string} pageId - Page ID
     * @param {string} binId - Bin ID
     * @param {Object} bin - Bin data
     */
    setupBinInteractions(binElement, pageId, binId, bin) {
        // Apply visual settings
        if (this.app.visualSettingsManager) {
            const binIdStr = `${pageId}-${binId}`;
            const page = this.app.appState?.documents?.find(p => p.id === pageId);
            const viewFormat = page?.format || 'default';
            this.app.visualSettingsManager.applyVisualSettings(binElement, 'bin', binIdStr, pageId, viewFormat);
        }
        
        // Setup context menu
        binElement.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            if (this.app.contextMenuHandler) {
                if (this.app.appState.setContextMenuState) {
                    this.app.appState.setContextMenuState({
                        visible: true,
                        documentId: pageId,
                        groupId: binId,
                        elementIndex: null,
                        subtaskIndex: null,
                        x: e.clientX,
                        y: e.clientY
                    });
                } else {
                    this.app.appState.contextMenuState = {
                        visible: true,
                        documentId: pageId,
                        groupId: binId,
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
        binElement.dataset.pageId = pageId;
        binElement.dataset.binId = binId;
    }
    
    /**
     * Setup interactions for a page
     * @param {HTMLElement} pageElement - Page DOM node
     * @param {string} pageId - Page ID
     * @param {Object} page - Page data
     */
    setupPageInteractions(pageElement, pageId, page) {
        // Apply visual settings
        if (this.app.visualSettingsManager) {
            const viewFormat = page?.format || 'default';
            this.app.visualSettingsManager.applyVisualSettings(pageElement, 'page', pageId, pageId, viewFormat);
        }
        
        // Setup context menu
        pageElement.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            if (this.app.contextMenuHandler) {
                if (this.app.appState.setContextMenuState) {
                    this.app.appState.setContextMenuState({
                        visible: true,
                        documentId: pageId,
                        groupId: null, // null indicates page-level
                        elementIndex: null,
                        subtaskIndex: null,
                        x: e.clientX,
                        y: e.clientY
                    });
                } else {
                    this.app.appState.contextMenuState = {
                        visible: true,
                        documentId: pageId,
                        groupId: null,
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
        pageElement.dataset.pageId = pageId;
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
            const elementNode = customRenderer(element, pageId, binId, elementIndex);
            this.setupElementInteractions(elementNode, pageId, binId, elementIndex, element, interactionOptions);
            return elementNode;
        }
        
        // Fallback: create basic element
        const elementNode = document.createElement('div');
        elementNode.className = `element ${element.type || 'task'}`;
        elementNode.textContent = element.text || '';
        this.setupElementInteractions(elementNode, pageId, binId, elementIndex, element, interactionOptions);
        return elementNode;
    }
}


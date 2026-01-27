// KanbanInteractions.js - Handles Kanban drag and drop interactions
export class KanbanInteractions {
    constructor(formatRenderer) {
        this.formatRenderer = formatRenderer;
    }
    
    /**
     * Setup drag handlers for a card
     * @param {HTMLElement} card - Card element
     * @param {string} pageId - Page ID
     * @param {string} binId - Bin ID
     * @param {number|string} elementIndex - Element index
     */
    setupCardDrag(card, pageId, binId, elementIndex) {
        card.addEventListener('dragstart', (e) => {
            e.dataTransfer.effectAllowed = 'move';
            
            // Check if this is a child element
            const elementIndexStr = String(elementIndex);
            const isChild = elementIndexStr.includes('-');
            let parentElementIndex = null;
            let childIndex = null;
            
            if (isChild) {
                const parts = elementIndexStr.split('-');
                parentElementIndex = parseInt(parts[0]);
                childIndex = parseInt(parts[1]);
            }
            
            // Store data in multiple formats for compatibility
            e.dataTransfer.setData('text/plain', JSON.stringify({
                type: 'kanban-card',
                pageId,
                binId,
                elementIndex: elementIndexStr,
                itemId: card.dataset.itemId || null,
                // Also include standard format for DragDropHandler compatibility
                sourcePageId: pageId,
                sourceBinId: binId,
                sourceElementIndex: isChild ? parentElementIndex : parseInt(elementIndexStr),
                isChild: isChild,
                parentElementIndex: parentElementIndex,
                childIndex: childIndex
            }));
            
            // Also set as 'element' type for compatibility with bin view drag handlers
            e.dataTransfer.setData('application/json', JSON.stringify({
                type: 'element',
                pageId,
                binId,
                elementIndex: elementIndexStr,
                itemId: card.dataset.itemId || null
            }));
            
            card.style.opacity = '0.5';
        });
        
        card.addEventListener('dragend', (e) => {
            card.style.opacity = '1';
            // Enable smooth transitions for movement
            card.style.transition = 'transform 0.2s, box-shadow 0.2s, transform 2.5s ease-out, opacity 0.2s';
        });
    }
    
    /**
     * Setup drop zone for a column
     * @param {HTMLElement} columnContent - Column content element
     * @param {string} pageId - Page ID
     * @param {string} binId - Bin ID
     * @param {Object} app - App instance
     */
    setupColumnDropZone(columnContent, pageId, binId, app) {
        columnContent.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            columnContent.style.background = 'rgba(74, 158, 255, 0.1)';
        });
        
        columnContent.addEventListener('dragleave', (e) => {
            // Only clear background if we're actually leaving the column
            if (!columnContent.contains(e.relatedTarget)) {
                columnContent.style.background = '';
            }
        });
        
        columnContent.addEventListener('drop', (e) => {
            e.preventDefault();
            columnContent.style.background = '';
            
            try {
                const dragPayload = JSON.parse(e.dataTransfer.getData('text/plain'));
                
                const sourcePage = app.documents?.find(p => p.id === dragPayload.pageId) ||
                    app.appState?.documents?.find(p => p.id === dragPayload.pageId);
                const targetPage = app.documents?.find(p => p.id === pageId) ||
                    app.appState?.documents?.find(p => p.id === pageId);
                const sourceBin = sourcePage?.groups?.find(b => b.id === dragPayload.binId);
                const targetBin = targetPage?.groups?.find(b => b.id === binId);
                const sourceItems = sourceBin ? this.formatRenderer._getItems(sourceBin) : [];
                const targetItems = targetBin ? this.formatRenderer._getItems(targetBin) : [];

                if (dragPayload.type === 'kanban-card') {
                    // Use DragDropHandler for proper element movement (handles children, relationships, etc.)
                    // Use itemId if available, fallback to elementIndex
                    let element = null;
                    if (dragPayload.itemId) {
                        element = sourceItems.find(item => item.id === dragPayload.itemId);
                    }
                    if (!element && dragPayload.elementIndex !== undefined) {
                        element = sourceItems[dragPayload.elementIndex];
                    }
                    
                    if (sourceBin && targetBin && element) {
                        // Check if element is a child
                        const elementIndexStr = String(dragPayload.elementIndex || '');
                        const isChild = elementIndexStr.includes('-');
                        let parentElementIndex = null;
                        let childIndex = null;
                        
                        if (isChild) {
                            const parts = elementIndexStr.split('-');
                            parentElementIndex = parseInt(parts[0]);
                            childIndex = parseInt(parts[1]);
                        }
                        
                        // Use DragDropHandler to move element (preserves format, handles all cases)
                        if (app.dragDropHandler) {
                            // Move to end of target bin
                            const targetIndex = targetItems.length;
                            
                            // Use ID-based move if available
                            if (dragPayload.itemId && element.id && app.dragDropHandler.moveElementById) {
                                app.dragDropHandler.moveElementById(
                                    element.id,
                                    null, // targetItemId
                                    null, // targetParentId
                                    targetIndex
                                );
                            } else {
                                // Fallback to index-based
                                app.dragDropHandler.moveElement(
                                    dragPayload.pageId, dragPayload.binId, dragPayload.elementIndex,
                                    pageId, binId, targetIndex,
                                    isChild, parentElementIndex, childIndex
                                );
                            }
                        } else {
                            // Fallback if DragDropHandler not available
                            const elementIndex = dragPayload.elementIndex !== undefined ? dragPayload.elementIndex : sourceItems.indexOf(element);
                            sourceItems.splice(elementIndex, 1);
                            targetItems.push(element);
                            app.dataManager.saveData();
                            
                            // Preserve format during re-render
                            app._preservingFormat = true;
                            app.render();
                        }
                    }
                } else if (dragPayload.type === 'element') {
                    // Handle drag from bin view or other sources
                    if (app.dragDropHandler) {
                        const targetIndex = targetItems.length;
                        
                        // Use ID-based move if available
                        if (dragPayload.itemId && app.dragDropHandler.moveElementById) {
                            app.dragDropHandler.moveElementById(
                                dragPayload.itemId,
                                null, // targetItemId
                                null, // targetParentId
                                targetIndex
                            );
                        } else {
                            // Fallback to index-based
                            app.dragDropHandler.moveElement(
                                dragPayload.pageId || dragPayload.sourcePageId, 
                                dragPayload.binId || dragPayload.sourceBinId, 
                                dragPayload.elementIndex || dragPayload.sourceElementIndex,
                                pageId, binId, targetIndex,
                                dragPayload.isChild || false,
                                dragPayload.parentElementIndex || null,
                                dragPayload.childIndex || null
                            );
                        }
                    }
                }
            } catch (err) {
                console.error('Error handling kanban drop:', err);
            }
        });
        
        // Now that DOM is ready, initialize ViewProjection if it exists
        if (this.formatRenderer.viewProjection && !this.formatRenderer.viewProjection.isActive) {
            this.formatRenderer.viewProjection.isActive = true;
            this.formatRenderer.viewProjection._subscribeToOperations();
            // Don't call update() here - let the normal render flow handle initial display
        }
    }
}

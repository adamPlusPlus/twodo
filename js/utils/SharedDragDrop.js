// SharedDragDrop.js - Shared drag-and-drop functionality for vertical/horizontal layouts
// Allows dragging elements over other elements to nest them

export class SharedDragDrop {
    constructor(app) {
        this.app = app;
        this.dragOverTimeout = null;
        this.nestIndicator = null;
    }
    
    /**
     * Setup drag and drop for an element in vertical/horizontal layouts
     * Allows nesting when dragging over elements with title/text
     * @param {HTMLElement} elementNode - The element DOM node
     * @param {string} pageId - Page ID
     * @param {string} binId - Bin ID
     * @param {number} elementIndex - Element index
     * @param {Object} element - Element data
     */
    setupElementDragDrop(elementNode, pageId, binId, elementIndex, element) {
        // Only allow dragging for text/note and task/checkbox elements
        const draggableTypes = ['task', 'note', 'header-checkbox', 'text'];
        if (!draggableTypes.includes(element.type)) {
            return; // Don't make non-text/checkbox elements draggable
        }
        
        const elementId = `${pageId}-${binId}-${elementIndex}`;
        elementNode.draggable = true;
        elementNode.dataset.dragType = 'element';
        elementNode.dataset.pageId = pageId;
        elementNode.dataset.binId = binId;
        elementNode.dataset.elementIndex = elementIndex;
        elementNode.dataset.elementId = elementId;
        elementNode.setAttribute('data-element-id', elementId);
        
        // Drag start
        elementNode.addEventListener('dragstart', (e) => {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', JSON.stringify({
                type: 'element',
                pageId,
                binId,
                elementIndex
            }));
            elementNode.style.opacity = '0.5';
        });
        
        // Drag end
        elementNode.addEventListener('dragend', (e) => {
            elementNode.style.opacity = '1';
            this.clearNestIndicator();
            if (this.dragOverTimeout) {
                clearTimeout(this.dragOverTimeout);
                this.dragOverTimeout = null;
            }
        });
        
        // Drag over - allow nesting on elements with title/text
        elementNode.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const dragData = e.dataTransfer.getData('text/plain');
            if (!dragData) return;
            
            let dragPayload;
            try {
                dragPayload = JSON.parse(dragData);
            } catch (err) {
                return;
            }
            
            // Only allow nesting if source is a text/checkbox element
            if (dragPayload.type !== 'element') return;
            
            // Check if target element has title or text (can be nested into)
            const hasTitleOrText = element.title || element.text || element.content;
            if (!hasTitleOrText) return;
            
            // Check if source element is a text/checkbox type
            const sourcePage = this.app.appState?.documents?.find(p => p.id === dragPayload.pageId) || 
                             this.app.documents?.find(p => p.id === dragPayload.pageId);
            if (!sourcePage) return;
            
            const sourceBin = sourcePage.groups?.find(b => b.id === dragPayload.binId);
            const items = sourceBin?.items || [];
            if (sourceBin) {
                sourceBin.items = items;
            }
            if (!sourceBin) return;
            
            const sourceElement = items[dragPayload.elementIndex];
            if (!sourceElement) return;
            
            const sourceTypes = ['task', 'note', 'header-checkbox', 'text'];
            if (!sourceTypes.includes(sourceElement.type)) return;
            
            // Prevent nesting into self or descendants
            if (dragPayload.pageId === pageId && dragPayload.binId === binId && dragPayload.elementIndex === elementIndex) {
                return;
            }
            
            // Show nest indicator
            this.showNestIndicator(elementNode);
            e.dataTransfer.dropEffect = 'move';
        });
        
        // Drag leave
        elementNode.addEventListener('dragleave', (e) => {
            // Only clear if we're leaving the element (not entering a child)
            if (!elementNode.contains(e.relatedTarget)) {
                this.clearNestIndicator();
            }
        });
        
        // Drop - nest the element
        elementNode.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const dragData = e.dataTransfer.getData('text/plain');
            if (!dragData) return;
            
            let dragPayload;
            try {
                dragPayload = JSON.parse(dragData);
            } catch (err) {
                return;
            }
            
            if (dragPayload.type !== 'element') return;
            
            // Check if target element has title or text
            const hasTitleOrText = element.title || element.text || element.content;
            if (!hasTitleOrText) return;
            
            // Prevent nesting into self
            if (dragPayload.pageId === pageId && dragPayload.binId === binId && dragPayload.elementIndex === elementIndex) {
                return;
            }
            
            // Use DragDropHandler to nest the element
            if (this.app.dragDropHandler) {
                this.app.dragDropHandler.nestElement(
                    dragPayload.pageId, dragPayload.binId, dragPayload.elementIndex,
                    pageId, binId, elementIndex
                );
            }
            
            this.clearNestIndicator();
        });
    }
    
    /**
     * Show visual indicator that element can be nested
     * @param {HTMLElement} targetElement - The target element
     */
    showNestIndicator(targetElement) {
        this.clearNestIndicator();
        
        const indicator = document.createElement('div');
        indicator.className = 'nest-indicator';
        indicator.style.cssText = `
            position: absolute;
            left: 0;
            right: 0;
            top: 0;
            bottom: 0;
            border: 2px dashed #4a9eff;
            background: rgba(74, 158, 255, 0.1);
            pointer-events: none;
            z-index: 1000;
            border-radius: 4px;
        `;
        
        // Make sure element has position relative
        const computedStyle = window.getComputedStyle(targetElement);
        if (computedStyle.position === 'static') {
            targetElement.style.position = 'relative';
        }
        
        targetElement.appendChild(indicator);
        this.nestIndicator = indicator;
    }
    
    /**
     * Clear the nest indicator
     */
    clearNestIndicator() {
        if (this.nestIndicator) {
            this.nestIndicator.remove();
            this.nestIndicator = null;
        }
    }
}



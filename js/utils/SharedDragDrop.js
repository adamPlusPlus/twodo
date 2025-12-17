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
     * @param {HTMLElement} elementEl - The element DOM node
     * @param {string} pageId - Page ID
     * @param {string} binId - Bin ID
     * @param {number} elementIndex - Element index
     * @param {Object} element - Element data
     */
    setupElementDragDrop(elementEl, pageId, binId, elementIndex, element) {
        // Only allow dragging for text/note and task/checkbox elements
        const draggableTypes = ['task', 'note', 'header-checkbox', 'text'];
        if (!draggableTypes.includes(element.type)) {
            return; // Don't make non-text/checkbox elements draggable
        }
        
        elementEl.draggable = true;
        elementEl.dataset.dragType = 'element';
        elementEl.dataset.pageId = pageId;
        elementEl.dataset.binId = binId;
        elementEl.dataset.elementIndex = elementIndex;
        
        // Drag start
        elementEl.addEventListener('dragstart', (e) => {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', JSON.stringify({
                type: 'element',
                pageId,
                binId,
                elementIndex
            }));
            elementEl.style.opacity = '0.5';
        });
        
        // Drag end
        elementEl.addEventListener('dragend', (e) => {
            elementEl.style.opacity = '1';
            this.clearNestIndicator();
            if (this.dragOverTimeout) {
                clearTimeout(this.dragOverTimeout);
                this.dragOverTimeout = null;
            }
        });
        
        // Drag over - allow nesting on elements with title/text
        elementEl.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const dragData = e.dataTransfer.getData('text/plain');
            if (!dragData) return;
            
            let data;
            try {
                data = JSON.parse(dragData);
            } catch (err) {
                return;
            }
            
            // Only allow nesting if source is a text/checkbox element
            if (data.type !== 'element') return;
            
            // Check if target element has title or text (can be nested into)
            const hasTitleOrText = element.title || element.text || element.content;
            if (!hasTitleOrText) return;
            
            // Check if source element is a text/checkbox type
            const sourcePage = this.app.appState?.pages?.find(p => p.id === data.pageId) || 
                             this.app.pages?.find(p => p.id === data.pageId);
            if (!sourcePage) return;
            
            const sourceBin = sourcePage.bins?.find(b => b.id === data.binId);
            if (!sourceBin || !sourceBin.elements) return;
            
            const sourceElement = sourceBin.elements[data.elementIndex];
            if (!sourceElement) return;
            
            const sourceTypes = ['task', 'note', 'header-checkbox', 'text'];
            if (!sourceTypes.includes(sourceElement.type)) return;
            
            // Prevent nesting into self or descendants
            if (data.pageId === pageId && data.binId === binId && data.elementIndex === elementIndex) {
                return;
            }
            
            // Show nest indicator
            this.showNestIndicator(elementEl);
            e.dataTransfer.dropEffect = 'move';
        });
        
        // Drag leave
        elementEl.addEventListener('dragleave', (e) => {
            // Only clear if we're leaving the element (not entering a child)
            if (!elementEl.contains(e.relatedTarget)) {
                this.clearNestIndicator();
            }
        });
        
        // Drop - nest the element
        elementEl.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const dragData = e.dataTransfer.getData('text/plain');
            if (!dragData) return;
            
            let data;
            try {
                data = JSON.parse(dragData);
            } catch (err) {
                return;
            }
            
            if (data.type !== 'element') return;
            
            // Check if target element has title or text
            const hasTitleOrText = element.title || element.text || element.content;
            if (!hasTitleOrText) return;
            
            // Prevent nesting into self
            if (data.pageId === pageId && data.binId === binId && data.elementIndex === elementIndex) {
                return;
            }
            
            // Use DragDropHandler to nest the element
            if (this.app.dragDropHandler) {
                this.app.dragDropHandler.nestElement(
                    data.pageId, data.binId, data.elementIndex,
                    pageId, binId, elementIndex
                );
            }
            
            this.clearNestIndicator();
        });
    }
    
    /**
     * Show visual indicator that element can be nested
     * @param {HTMLElement} elementEl - The target element
     */
    showNestIndicator(elementEl) {
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
        const computedStyle = window.getComputedStyle(elementEl);
        if (computedStyle.position === 'static') {
            elementEl.style.position = 'relative';
        }
        
        elementEl.appendChild(indicator);
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



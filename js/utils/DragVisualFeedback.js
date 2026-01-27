// DragVisualFeedback.js - Visual feedback utilities for drag and drop
// Extracted from DragDropHandler.js for reusability and maintainability

/**
 * DragVisualFeedback - Functions for providing visual feedback during drag operations
 */
export class DragVisualFeedback {
    constructor() {
        this.currentPreview = null;
        this.currentIndicator = null;
    }
    
    /**
     * Create drag preview element
     * @param {HTMLElement} element - Source element
     * @param {Object} dragData - Drag data object
     * @returns {HTMLElement} Preview element
     */
    createDragPreview(element, dragData) {
        if (!element) {
            return null;
        }
        
        // Clone the element for preview
        const preview = element.cloneNode(true);
        preview.style.opacity = '0.5';
        preview.style.position = 'fixed';
        preview.style.pointerEvents = 'none';
        preview.style.zIndex = '10000';
        preview.style.transform = 'rotate(5deg)';
        
        document.body.appendChild(preview);
        this.currentPreview = preview;
        
        return preview;
    }
    
    /**
     * Update drop indicator at target position
     * @param {HTMLElement} targetElement - Target element
     * @param {string} position - Position ('before' or 'after')
     * @param {HTMLElement} container - Container element
     * @returns {HTMLElement} Indicator element
     */
    updateDropIndicator(targetElement, position, container) {
        // Remove existing indicator
        this.removeDropIndicator();
        
        // Create new indicator
        const indicator = document.createElement('div');
        indicator.className = 'drop-indicator';
        indicator.style.cssText = `
            height: 2px;
            background: #4a9eff;
            margin: 4px 0;
            border-radius: 1px;
            pointer-events: none;
            position: relative;
            z-index: 1000;
        `;
        
        if (targetElement && container && container.contains(targetElement)) {
            if (position === 'before') {
                container.insertBefore(indicator, targetElement);
            } else {
                container.insertBefore(indicator, targetElement.nextSibling);
            }
        } else if (container) {
            container.appendChild(indicator);
        }
        
        this.currentIndicator = indicator;
        return indicator;
    }
    
    /**
     * Remove drop indicator
     */
    removeDropIndicator() {
        if (this.currentIndicator && this.currentIndicator.parentNode) {
            this.currentIndicator.remove();
        }
        this.currentIndicator = null;
    }
    
    /**
     * Highlight drop zone
     * @param {HTMLElement} dropZone - Drop zone element
     * @param {boolean} highlight - Whether to highlight
     */
    highlightDropZone(dropZone, highlight) {
        if (!dropZone) {
            return;
        }
        
        if (highlight) {
            dropZone.classList.add('drag-over');
        } else {
            dropZone.classList.remove('drag-over');
        }
    }
    
    /**
     * Update drag cursor
     * @param {string} cursor - Cursor style ('move', 'copy', 'not-allowed', etc.)
     */
    updateDragCursor(cursor) {
        document.body.style.cursor = cursor || 'default';
    }
    
    /**
     * Cleanup all visual feedback
     */
    cleanup() {
        this.removeDropIndicator();
        
        if (this.currentPreview && this.currentPreview.parentNode) {
            this.currentPreview.remove();
        }
        this.currentPreview = null;
        
        // Remove all drag-over classes
        document.querySelectorAll('.drag-over').forEach(el => {
            el.classList.remove('drag-over');
        });
        
        // Reset cursor
        document.body.style.cursor = '';
    }
}

// Export singleton instance
export const dragVisualFeedback = new DragVisualFeedback();

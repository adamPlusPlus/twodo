// DropZoneManager.js - Drop zone management utilities
// Extracted from DragDropHandler.js for reusability and maintainability

/**
 * DropZoneManager - Manages drop zones for drag and drop
 */
export class DropZoneManager {
    constructor() {
        this.dropZones = new Map();
    }
    
    /**
     * Register a drop zone
     * @param {HTMLElement} container - Container element
     * @param {Object} options - Drop zone options
     * @param {Function} options.onDrop - Drop handler function
     * @param {Function} options.onDragOver - Drag over handler
     * @param {Function} options.onDragLeave - Drag leave handler
     * @param {string} options.acceptType - Accept drag type ('element', 'bin', 'page', or null for all)
     */
    registerDropZone(container, options = {}) {
        if (!container) {
            return;
        }
        
        const {
            onDrop,
            onDragOver,
            onDragLeave,
            acceptType = null
        } = options;
        
        const zoneId = container.id || `dropzone-${Date.now()}`;
        
        // Setup event listeners
        if (onDragOver) {
            container.addEventListener('dragover', (e) => {
                e.preventDefault();
                if (onDragOver) {
                    onDragOver(e);
                }
            });
        }
        
        if (onDragLeave) {
            container.addEventListener('dragleave', (e) => {
                if (onDragLeave) {
                    onDragLeave(e);
                }
            });
        }
        
        if (onDrop) {
            container.addEventListener('drop', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (onDrop) {
                    onDrop(e);
                }
            });
        }
        
        this.dropZones.set(zoneId, {
            container,
            acceptType,
            onDrop,
            onDragOver,
            onDragLeave
        });
        
        return zoneId;
    }
    
    /**
     * Unregister a drop zone
     * @param {string} zoneId - Zone ID
     */
    unregisterDropZone(zoneId) {
        this.dropZones.delete(zoneId);
    }
    
    /**
     * Find drop zone at coordinates
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {Array<HTMLElement>} containers - Container elements to check
     * @returns {HTMLElement|null} Drop zone element or null
     */
    findDropZone(x, y, containers = null) {
        const elementsToCheck = containers || Array.from(this.dropZones.values()).map(zone => zone.container);
        
        // Check elements from top to bottom (last in DOM order)
        for (let i = elementsToCheck.length - 1; i >= 0; i--) {
            const element = elementsToCheck[i];
            if (!element) continue;
            
            const rect = element.getBoundingClientRect();
            if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
                return element;
            }
        }
        
        return null;
    }
    
    /**
     * Validate drop zone for drag data
     * @param {HTMLElement} dropZone - Drop zone element
     * @param {Object} dragData - Drag data object
     * @returns {boolean} True if valid
     */
    validateDropZone(dropZone, dragData) {
        if (!dropZone || !dragData) {
            return false;
        }
        
        // Find zone by container
        for (const [zoneId, zone] of this.dropZones.entries()) {
            if (zone.container === dropZone) {
                // Check if zone accepts this drag type
                if (zone.acceptType && dragData.type !== zone.acceptType) {
                    return false;
                }
                return true;
            }
        }
        
        // If not registered, allow by default
        return true;
    }
    
    /**
     * Handle drop on zone
     * @param {HTMLElement} dropZone - Drop zone element
     * @param {Object} dragData - Drag data object
     * @param {Event} event - Drop event
     * @returns {boolean} True if handled
     */
    handleDrop(dropZone, dragData, event) {
        if (!this.validateDropZone(dropZone, dragData)) {
            return false;
        }
        
        // Find zone handler
        for (const [zoneId, zone] of this.dropZones.entries()) {
            if (zone.container === dropZone && zone.onDrop) {
                zone.onDrop(event);
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Clear all drop zones
     */
    clear() {
        this.dropZones.clear();
    }
}

// Export singleton instance
export const dropZoneManager = new DropZoneManager();

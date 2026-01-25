// ViewportRenderer.js - High-level wrapper for viewport rendering
// Automatically applies virtualization when needed, falls back to normal rendering for small lists

import { viewportConfig } from './ViewportConfig.js';
import { VirtualScroller } from './VirtualScroller.js';

export class ViewportRenderer {
    /**
     * Render items with automatic virtualization
     * @param {HTMLElement} container - Container element
     * @param {Array} items - Items to render
     * @param {Function} renderItem - Function to render a single item: (item, index) => HTMLElement
     * @param {Object} options - Options
     * @param {number} options.itemHeight - Fixed item height (optional, for variable height leave undefined)
     * @param {number} options.threshold - Override virtualization threshold
     * @param {boolean} options.forceVirtualization - Force virtualization even for small lists
     * @returns {VirtualScroller|null} - VirtualScroller instance if virtualization is used, null otherwise
     */
    static renderViewport(container, items, renderItem, options = {}) {
        if (!container || !items || !Array.isArray(items)) {
            return null;
        }
        
        const threshold = options.threshold || viewportConfig.getThreshold();
        const forceVirtualization = options.forceVirtualization || false;
        
        // Check if virtualization is needed
        const shouldVirtualize = forceVirtualization || 
                                 (items.length >= threshold && viewportConfig.isEnabled('virtualization'));
        
        if (!shouldVirtualize) {
            // Normal rendering for small lists
            items.forEach((item, index) => {
                const element = renderItem(item, index);
                if (element) {
                    container.appendChild(element);
                }
            });
            return null;
        }
        
        // Use virtualization
        const virtualScroller = new VirtualScroller(container, items, renderItem, options);
        return virtualScroller;
    }
    
    /**
     * Check if virtualization should be used
     * @param {number} itemCount - Number of items
     * @param {Object} options - Options
     * @returns {boolean}
     */
    static shouldVirtualize(itemCount, options = {}) {
        const threshold = options.threshold || viewportConfig.getThreshold();
        return itemCount >= threshold && viewportConfig.isEnabled('virtualization');
    }
    
    /**
     * Get virtualization threshold
     * @returns {number}
     */
    static getThreshold() {
        return viewportConfig.getThreshold();
    }
}

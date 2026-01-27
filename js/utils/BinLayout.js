// BinLayout.js - Layout calculation utilities for bins
// Extracted from BinRenderer.js for reusability and maintainability

import { viewportConfig } from '../core/ViewportConfig.js';
import { ItemHierarchy } from './ItemHierarchy.js';

/**
 * BinLayout - Functions for calculating bin layouts and drop positions
 */
export const BinLayout = {
    /**
     * Calculate drop position for drag-drop operations
     * Works with both virtualized and non-virtualized lists
     * @param {HTMLElement} elementsList - The elements list container
     * @param {number} mouseY - Mouse Y position (clientY)
     * @param {Array} items - Items array (rootItems for virtualized, bin.items for non-virtualized)
     * @param {Object} bin - Bin data object
     * @returns {Object} - { insertIndex, targetElement }
     */
    calculateDropPosition(elementsList, mouseY, items, bin) {
        const virtualScroller = elementsList._virtualScroller;
        const elementsListRect = elementsList.getBoundingClientRect();
        const relativeY = mouseY - elementsListRect.top;
        
        let insertIndex = items.length; // Default to end
        let targetElement = null;
        
        if (virtualScroller) {
            // Virtualized calculation: use scroll position + item heights
            const scrollTop = elementsList.scrollTop;
            const absoluteY = relativeY + scrollTop;
            const defaultHeight = viewportConfig.getDefaultHeight();
            
            // Optimized linear search with early exit
            let accumulatedHeight = 0;
            
            for (let i = 0; i < items.length; i++) {
                const height = virtualScroller.heightCache.get(i) || defaultHeight;
                const itemTop = accumulatedHeight;
                const itemBottom = accumulatedHeight + height;
                const itemMiddle = (itemTop + itemBottom) / 2;
                
                // Check if mouse is within this item's bounds
                if (absoluteY >= itemTop && absoluteY < itemBottom) {
                    // Determine if above or below middle
                    insertIndex = absoluteY < itemMiddle ? i : i + 1;
                    break; // Early exit - found the item
                }
                
                // Track the last position we've passed (for when we're past all items)
                if (absoluteY >= itemBottom) {
                    insertIndex = i + 1;
                }
                
                accumulatedHeight = itemBottom;
            }
            
            // Clamp to valid range
            insertIndex = Math.max(0, Math.min(insertIndex, items.length));
            
            // Try to find the target element in the visible range
            const range = virtualScroller.getVisibleRange();
            for (let i = range.startIndex; i < range.endIndex && i < items.length; i++) {
                const element = elementsList.querySelector(`[data-element-index="${i}"]`);
                if (element && !element.classList.contains('child-element')) {
                    // Check if this is the target element
                    const elementRect = element.getBoundingClientRect();
                    const elementTop = elementRect.top - elementsListRect.top;
                    const elementBottom = elementRect.bottom - elementsListRect.top;
                    
                    if (relativeY >= elementTop && relativeY < elementBottom) {
                        targetElement = element;
                        break;
                    }
                }
            }
        } else {
            // Non-virtualized calculation: use existing DOM-based approach
            const elements = Array.from(elementsList.querySelectorAll('.element:not(.child-element)'));
            
            for (let i = 0; i < elements.length; i++) {
                const elementRect = elements[i].getBoundingClientRect();
                const elementTop = elementRect.top - elementsListRect.top;
                const elementBottom = elementRect.bottom - elementsListRect.top;
                const elementMiddle = (elementTop + elementBottom) / 2;
                
                // If mouse is above the middle of this element, insert before it
                if (relativeY < elementMiddle) {
                    const elementIndexStr = elements[i].dataset.elementIndex;
                    if (elementIndexStr) {
                        // Handle child elements - get parent index
                        if (typeof elementIndexStr === 'string' && elementIndexStr.includes('-')) {
                            const parentIndex = parseInt(elementIndexStr.split('-')[0]);
                            if (!isNaN(parentIndex)) {
                                insertIndex = parentIndex;
                                targetElement = elements[i];
                            }
                        } else {
                            const elementIndex = parseInt(elementIndexStr);
                            if (!isNaN(elementIndex)) {
                                insertIndex = elementIndex;
                                targetElement = elements[i];
                            }
                        }
                    }
                    break;
                }
            }
        }
        
        // If we didn't find a target element, check if we should append at the end
        if (targetElement === null && insertIndex >= items.length) {
            const addButton = elementsList.querySelector('.add-element-btn');
            if (addButton) {
                targetElement = addButton;
            }
        }
        
        return { insertIndex, targetElement };
    },
    
    /**
     * Calculate bin dimensions
     * @param {Object} bin - Bin data object
     * @param {HTMLElement} container - Container element
     * @returns {Object} Dimensions object
     */
    calculateBinDimensions(bin, container) {
        if (!container) {
            return { width: 0, height: 0 };
        }
        
        const rect = container.getBoundingClientRect();
        return {
            width: rect.width,
            height: rect.height,
            maxHeight: bin.maxHeight || null
        };
    },
    
    /**
     * Calculate element list layout
     * @param {Array} items - Items array
     * @param {HTMLElement} container - Container element
     * @returns {Object} Layout information
     */
    calculateElementListLayout(items, container) {
        const rootItems = ItemHierarchy.getRootItems(items || []);
        return {
            itemCount: items?.length || 0,
            rootItemCount: rootItems.length,
            containerHeight: container?.clientHeight || 0,
            scrollTop: container?.scrollTop || 0
        };
    },
    
    /**
     * Get visible range for virtualized lists
     * @param {number} scrollTop - Scroll position
     * @param {number} containerHeight - Container height
     * @param {Map|Object} itemHeights - Item heights cache
     * @param {number} defaultHeight - Default item height
     * @returns {Object} Visible range { startIndex, endIndex }
     */
    getVisibleRange(scrollTop, containerHeight, itemHeights, defaultHeight = 50) {
        let accumulatedHeight = 0;
        let startIndex = 0;
        let endIndex = 0;
        
        // Find start index
        for (let i = 0; i < 1000; i++) { // Safety limit
            const height = (itemHeights && itemHeights.get) ? itemHeights.get(i) : (itemHeights?.[i] || defaultHeight);
            if (accumulatedHeight + height >= scrollTop) {
                startIndex = Math.max(0, i - 1);
                break;
            }
            accumulatedHeight += height;
        }
        
        // Find end index
        accumulatedHeight = 0;
        for (let i = 0; i <= startIndex; i++) {
            const height = (itemHeights && itemHeights.get) ? itemHeights.get(i) : (itemHeights?.[i] || defaultHeight);
            accumulatedHeight += height;
        }
        
        for (let i = startIndex; i < 1000; i++) { // Safety limit
            const height = (itemHeights && itemHeights.get) ? itemHeights.get(i) : (itemHeights?.[i] || defaultHeight);
            if (accumulatedHeight > scrollTop + containerHeight) {
                endIndex = i;
                break;
            }
            accumulatedHeight += height;
        }
        
        return { startIndex, endIndex };
    }
};

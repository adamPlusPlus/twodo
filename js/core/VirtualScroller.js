// VirtualScroller.js - Core virtualization engine for viewport rendering
// Renders only visible items plus a buffer to maintain performance with large lists

import { viewportConfig } from './ViewportConfig.js';
import { performanceBudgetManager } from './PerformanceBudgetManager.js';

export class VirtualScroller {
    constructor(container, items, renderItem, options = {}) {
        this.container = container;
        this.items = items;
        this.renderItem = renderItem;
        this.options = {
            itemHeight: options.itemHeight || null, // Fixed height or null for variable
            threshold: options.threshold || viewportConfig.getThreshold(),
            ...options
        };
        
        // State
        this.startIndex = 0;
        this.endIndex = 0;
        this.visibleItems = [];
        this.itemElements = new Map(); // Cache of rendered elements
        this.heightCache = new Map(); // Cache of item heights
        this.scrollTop = 0;
        this.lastScrollTime = 0;
        this.scrollSpeed = 0;
        
        // DOM elements
        this.topSpacer = null;
        this.bottomSpacer = null;
        this.contentContainer = null;
        
        // Throttling
        this.scrollTimer = null;
        this.rafId = null;
        
        // Initialize
        this._initialize();
    }
    
    /**
     * Initialize the virtual scroller
     * @private
     */
    _initialize() {
        // Ensure container has proper styling for scrolling
        // Only set overflow if not already set (preserve existing styles)
        if (!this.container.style.overflowY && !this.container.style.overflow) {
            this.container.style.overflowY = 'auto';
        }
        if (!this.container.style.overflowX && !this.container.style.overflow) {
            this.container.style.overflowX = 'hidden';
        }
        if (!this.container.style.position || this.container.style.position === 'static') {
            this.container.style.position = 'relative';
        }
        
        // Clear existing content
        this.container.innerHTML = '';
        
        // Create content container
        this.contentContainer = document.createElement('div');
        this.contentContainer.style.position = 'relative';
        this.contentContainer.style.width = '100%';
        this.container.appendChild(this.contentContainer);
        
        // Create spacers
        this.topSpacer = document.createElement('div');
        this.topSpacer.style.width = '100%';
        this.topSpacer.style.flexShrink = '0';
        this.contentContainer.appendChild(this.topSpacer);
        
        this.bottomSpacer = document.createElement('div');
        this.bottomSpacer.style.width = '100%';
        this.bottomSpacer.style.flexShrink = '0';
        this.contentContainer.appendChild(this.bottomSpacer);
        
        // Setup scroll listener
        this._setupScrollListener();
        
        // Initial render
        this.update();
    }
    
    /**
     * Setup scroll event listener with throttling
     * @private
     */
    _setupScrollListener() {
        const throttleMs = viewportConfig.getScrollThrottle();
        const useRAF = viewportConfig.config.scroll.useRequestAnimationFrame;
        
        this.container.addEventListener('scroll', () => {
            performanceBudgetManager.measureOperation('SCROLLING', () => {
                // Calculate scroll speed
                const now = performance.now();
                const deltaTime = now - this.lastScrollTime;
                const deltaScroll = Math.abs(this.container.scrollTop - this.scrollTop);
                this.scrollSpeed = deltaTime > 0 ? deltaScroll / deltaTime : 0;
                this.lastScrollTime = now;
                this.scrollTop = this.container.scrollTop;
                
                // Throttle updates
                if (this.scrollTimer) {
                    clearTimeout(this.scrollTimer);
                }
                
                if (useRAF) {
                    if (this.rafId) {
                        cancelAnimationFrame(this.rafId);
                    }
                    this.rafId = requestAnimationFrame(() => {
                        this.update();
                    });
                } else {
                    this.scrollTimer = setTimeout(() => {
                        this.update();
                    }, throttleMs);
                }
            }, { source: 'VirtualScroller-scroll' });
        }, { passive: true });
    }
    
    /**
     * Update visible range and render items
     */
    update() {
        performanceBudgetManager.measureOperation('SCROLLING', () => {
            const newRange = this._calculateVisibleRange();
            
            if (newRange.startIndex !== this.startIndex || newRange.endIndex !== this.endIndex) {
                this.startIndex = newRange.startIndex;
                this.endIndex = newRange.endIndex;
                this._renderVisibleItems();
            }
        }, { source: 'VirtualScroller-update' });
    }
    
    /**
     * Calculate visible item range
     * @private
     */
    _calculateVisibleRange() {
        const container = this.container;
        const viewportHeight = container.clientHeight;
        const scrollTop = container.scrollTop;
        
        // Get buffer size (dynamic if enabled)
        const bufferSize = viewportConfig.getBufferSize(this.scrollSpeed);
        
        // Calculate visible range
        let startIndex = 0;
        let endIndex = this.items.length;
        
        if (this.options.itemHeight) {
            // Fixed height calculation
            const itemHeight = this.options.itemHeight;
            const visibleCount = Math.ceil(viewportHeight / itemHeight);
            
            startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - bufferSize);
            endIndex = Math.min(this.items.length, startIndex + visibleCount + bufferSize * 2);
        } else {
            // Variable height calculation
            startIndex = this._findStartIndex(scrollTop, bufferSize);
            endIndex = this._findEndIndex(startIndex, viewportHeight, bufferSize);
        }
        
        return { startIndex, endIndex };
    }
    
    /**
     * Find start index for variable height items
     * @private
     */
    _findStartIndex(scrollTop, bufferSize) {
        // Use cached heights to estimate position
        let accumulatedHeight = 0;
        let index = 0;
        const defaultHeight = viewportConfig.getDefaultHeight();
        
        for (let i = 0; i < this.items.length; i++) {
            const height = this.heightCache.get(i) || defaultHeight;
            const nextHeight = accumulatedHeight + height;
            
            if (nextHeight > scrollTop) {
                index = Math.max(0, i - bufferSize);
                break;
            }
            
            accumulatedHeight = nextHeight;
            index = i + 1;
        }
        
        return Math.min(index, this.items.length);
    }
    
    /**
     * Find end index for variable height items
     * @private
     */
    _findEndIndex(startIndex, viewportHeight, bufferSize) {
        let accumulatedHeight = 0;
        const defaultHeight = viewportConfig.getDefaultHeight();
        
        // Calculate height from start to viewport
        for (let i = startIndex; i < this.items.length; i++) {
            const height = this.heightCache.get(i) || defaultHeight;
            accumulatedHeight += height;
            
            if (accumulatedHeight > viewportHeight + (bufferSize * defaultHeight)) {
                return Math.min(i + bufferSize, this.items.length);
            }
        }
        
        return this.items.length;
    }
    
    /**
     * Render visible items
     * @private
     */
    _renderVisibleItems() {
        const visibleItems = this.items.slice(this.startIndex, this.endIndex);
        const fragment = document.createDocumentFragment();
        
        // Clear existing visible items (keep spacers)
        const existingItems = this.contentContainer.querySelectorAll('.virtual-item');
        existingItems.forEach(el => el.remove());
        
        // Render visible items
        visibleItems.forEach((item, relativeIndex) => {
            const absoluteIndex = this.startIndex + relativeIndex;
            let element = this.itemElements.get(absoluteIndex);
            
            if (!element) {
                // Render new item
                element = this.renderItem(item, absoluteIndex);
                if (element) {
                    element.classList.add('virtual-item');
                    element.dataset.virtualIndex = absoluteIndex;
                    this.itemElements.set(absoluteIndex, element);
                    
                    // Measure and cache height if variable height
                    if (!this.options.itemHeight && viewportConfig.shouldCacheHeights()) {
                        // Use next frame to ensure element is rendered, but also measure immediately
                        // for better initial accuracy
                        const measureHeight = () => {
                            const height = element.offsetHeight;
                            if (height > 0) {
                                this.heightCache.set(absoluteIndex, height);
                                // Update spacers if height changed
                                this._updateSpacers();
                            }
                        };
                        
                        // Try immediate measurement first
                        measureHeight();
                        
                        // Also measure after render (in case layout changes)
                        requestAnimationFrame(measureHeight);
                    }
                }
            } else {
                // Reuse existing element - ensure it's in the right place
                // (element recycling optimization)
            }
            
            if (element) {
                fragment.appendChild(element);
            }
        });
        
        // Insert items between spacers
        if (this.topSpacer.nextSibling !== this.bottomSpacer) {
            // Remove old items
            let node = this.topSpacer.nextSibling;
            while (node && node !== this.bottomSpacer) {
                const next = node.nextSibling;
                node.remove();
                node = next;
            }
        }
        this.topSpacer.after(fragment);
        
        // Update spacer heights
        this._updateSpacers();
    }
    
    /**
     * Update spacer heights
     * @private
     */
    _updateSpacers() {
        const defaultHeight = viewportConfig.getDefaultHeight();
        
        // Calculate top spacer height
        let topHeight = 0;
        if (this.startIndex > 0) {
            if (this.options.itemHeight) {
                topHeight = this.startIndex * this.options.itemHeight;
            } else {
                // Sum cached heights
                for (let i = 0; i < this.startIndex; i++) {
                    topHeight += this.heightCache.get(i) || defaultHeight;
                }
            }
        }
        this.topSpacer.style.height = `${topHeight}px`;
        
        // Calculate bottom spacer height
        let bottomHeight = 0;
        if (this.endIndex < this.items.length) {
            if (this.options.itemHeight) {
                bottomHeight = (this.items.length - this.endIndex) * this.options.itemHeight;
            } else {
                // Sum cached heights
                for (let i = this.endIndex; i < this.items.length; i++) {
                    bottomHeight += this.heightCache.get(i) || defaultHeight;
                }
            }
        }
        this.bottomSpacer.style.height = `${bottomHeight}px`;
    }
    
    /**
     * Update items list (for dynamic lists)
     * @param {Array} newItems - New items array
     */
    updateItems(newItems) {
        this.items = newItems;
        // Clear caches if items changed significantly
        if (Math.abs(newItems.length - this.items.length) > 10) {
            this.itemElements.clear();
            this.heightCache.clear();
        }
        this.update();
    }
    
    /**
     * Scroll to specific item
     * @param {number} index - Item index
     */
    scrollToIndex(index) {
        if (index < 0 || index >= this.items.length) {
            return;
        }
        
        let scrollTop = 0;
        const defaultHeight = viewportConfig.getDefaultHeight();
        
        if (this.options.itemHeight) {
            scrollTop = index * this.options.itemHeight;
        } else {
            // Sum cached heights up to index
            for (let i = 0; i < index; i++) {
                scrollTop += this.heightCache.get(i) || defaultHeight;
            }
        }
        
        this.container.scrollTop = scrollTop;
        this.update();
    }
    
    /**
     * Get visible item indices
     * @returns {Object} - {startIndex, endIndex}
     */
    getVisibleRange() {
        return {
            startIndex: this.startIndex,
            endIndex: this.endIndex
        };
    }
    
    /**
     * Cleanup and destroy
     */
    destroy() {
        if (this.scrollTimer) {
            clearTimeout(this.scrollTimer);
        }
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
        }
        
        // Remove scroll listener
        // Note: We can't easily remove passive listeners, but container cleanup will handle it
        
        // Clear caches
        this.itemElements.clear();
        this.heightCache.clear();
        
        // Clear container
        if (this.contentContainer && this.contentContainer.parentNode) {
            this.contentContainer.remove();
        }
    }
}

// PerformanceOptimizer.js - Performance optimization utilities
export class PerformanceOptimizer {
    constructor() {
        this.observers = new Map();
        this.debounceTimers = new Map();
    }
    
    /**
     * Debounce function calls
     */
    debounce(key, func, delay = 300) {
        if (this.debounceTimers.has(key)) {
            clearTimeout(this.debounceTimers.get(key));
        }
        
        const timer = setTimeout(() => {
            func();
            this.debounceTimers.delete(key);
        }, delay);
        
        this.debounceTimers.set(key, timer);
    }
    
    /**
     * Throttle function calls
     */
    throttle(key, func, limit = 100) {
        let lastRun = 0;
        
        return (...args) => {
            const now = Date.now();
            if (now - lastRun >= limit) {
                lastRun = now;
                func(...args);
            }
        };
    }
    
    /**
     * Lazy load images
     */
    lazyLoadImages(container) {
        if (!('IntersectionObserver' in window)) {
            // Fallback for browsers without IntersectionObserver
            return;
        }
        
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    if (img.dataset.src) {
                        img.src = img.dataset.src;
                        img.removeAttribute('data-src');
                        observer.unobserve(img);
                    }
                }
            });
        });
        
        container.querySelectorAll('img[data-src]').forEach(img => {
            imageObserver.observe(img);
        });
    }
    
    /**
     * Virtual scrolling for long lists
     * @deprecated Use ViewportRenderer.renderViewport() instead
     * This method is kept for backward compatibility but delegates to the new implementation
     */
    createVirtualScroller(container, items, itemHeight, renderItem) {
        // Import and use the new ViewportRenderer
        import('../core/ViewportRenderer.js').then(({ ViewportRenderer }) => {
            ViewportRenderer.renderViewport(
                container,
                items,
                renderItem,
                {
                    itemHeight: itemHeight,
                    threshold: 0 // Force virtualization
                }
            );
        }).catch(err => {
            console.warn('Failed to load ViewportRenderer, using fallback:', err);
            // Fallback to original implementation
            this._createVirtualScrollerFallback(container, items, itemHeight, renderItem);
        });
    }
    
    /**
     * Fallback virtual scroller implementation
     * @private
     */
    _createVirtualScrollerFallback(container, items, itemHeight, renderItem) {
        const viewportHeight = container.clientHeight;
        const visibleCount = Math.ceil(viewportHeight / itemHeight);
        const buffer = 5;
        
        let scrollTop = 0;
        let startIndex = 0;
        let endIndex = Math.min(startIndex + visibleCount + buffer, items.length);
        
        const updateView = () => {
            const visibleItems = items.slice(startIndex, endIndex);
            container.innerHTML = '';
            
            // Add spacer for items before visible range
            if (startIndex > 0) {
                const spacer = document.createElement('div');
                spacer.style.height = `${startIndex * itemHeight}px`;
                container.appendChild(spacer);
            }
            
            // Render visible items
            visibleItems.forEach((item, index) => {
                const itemElement = renderItem(item, startIndex + index);
                container.appendChild(itemElement);
            });
            
            // Add spacer for items after visible range
            if (endIndex < items.length) {
                const spacer = document.createElement('div');
                spacer.style.height = `${(items.length - endIndex) * itemHeight}px`;
                container.appendChild(spacer);
            }
        };
        
        container.addEventListener('scroll', () => {
            scrollTop = container.scrollTop;
            const newStartIndex = Math.floor(scrollTop / itemHeight);
            const newEndIndex = Math.min(newStartIndex + visibleCount + buffer * 2, items.length);
            
            if (newStartIndex !== startIndex || newEndIndex !== endIndex) {
                startIndex = Math.max(0, newStartIndex - buffer);
                endIndex = newEndIndex;
                updateView();
            }
        });
        
        updateView();
    }
    
    /**
     * Batch DOM updates
     */
    batchDOMUpdates(updates) {
        // Use requestAnimationFrame for batched updates
        requestAnimationFrame(() => {
            updates.forEach(update => update());
        });
    }
    
    /**
     * Memoize function results
     */
    memoize(func, keyGenerator = null) {
        const cache = new Map();
        
        return (...args) => {
            const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args);
            
            if (cache.has(key)) {
                return cache.get(key);
            }
            
            const result = func(...args);
            cache.set(key, result);
            return result;
        };
    }
    
    /**
     * Cleanup observers and timers
     */
    cleanup() {
        this.observers.forEach(observer => observer.disconnect());
        this.observers.clear();
        
        this.debounceTimers.forEach(timer => clearTimeout(timer));
        this.debounceTimers.clear();
    }
}


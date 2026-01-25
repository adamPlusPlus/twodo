// NavigationHelper.js - Centralized navigation and scrolling utilities
// Provides unified navigation, scrolling, and element highlighting

import { eventBus } from '../core/EventBus.js';
import { EVENTS } from '../core/AppEvents.js';
import { ElementFinder } from './ElementFinder.js';
import { ItemHierarchy } from './ItemHierarchy.js';

export class NavigationHelper {
    /**
     * Navigate to a specific element
     * @param {string} pageId - Page ID
     * @param {string} binId - Bin ID
     * @param {number} elementIndex - Element index
     * @param {Object} options - Navigation options
     * @param {Object} app - App instance
     * @param {boolean} options.highlight - Whether to highlight the element (default: true)
     * @param {string} options.highlightColor - Highlight color (default: 'rgba(74, 158, 255, 0.3)')
     * @param {number} options.highlightDuration - Highlight duration in ms (default: 2000)
     * @param {Object} options.scrollOptions - Options for scrollIntoView (default: { behavior: 'smooth', block: 'center' })
     * @param {number} options.delay - Delay before scrolling in ms (default: 100)
     */
    static navigateToElement(pageId, binId, elementIndex, app, options = {}) {
        const {
            highlight = true,
            highlightColor = 'rgba(74, 158, 255, 0.3)',
            highlightDuration = 2000,
            scrollOptions = { behavior: 'smooth', block: 'center' },
            delay = 100
        } = options;
        
        // Switch to page
        if (app && app.appState) {
            app.appState.currentDocumentId = pageId;
        }
        
        // Emit events
        eventBus.emit(EVENTS.PAGE.SWITCHED, { pageId });
        eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
        
        // Helper function to find and scroll to element
        const findAndScrollToElement = () => {
            const element = ElementFinder.findElement(pageId, binId, elementIndex);
            if (element) {
                this.scrollToElement(element, scrollOptions);
                if (highlight) {
                    this.highlightElement(element, highlightDuration, highlightColor);
                }
                return true;
            }
            return false;
        };
        
        // First, try immediate find (element might already be visible)
        let element = ElementFinder.findElement(pageId, binId, elementIndex);
        
        // If not found, check for virtualization
        if (!element) {
            const bin = this.findBin(pageId, binId);
            const elementsList = bin?.querySelector('.elements-list');
            const virtualScroller = elementsList?._virtualScroller;
            
            if (virtualScroller) {
                // Get root items to find correct index
                const document = app?.appState?.documents?.find(d => d.id === pageId);
                const group = document?.groups?.find(b => b.id === binId);
                
                if (group && group.items) {
                    const rootItems = ItemHierarchy.getRootItems(group.items);
                    
                    // Find root item index for this elementIndex
                    let rootItemIndex = -1;
                    const targetItem = group.items[elementIndex];
                    
                    if (targetItem) {
                        if (!targetItem.parentId) {
                            // It's a root item - find its index in root items
                            rootItemIndex = rootItems.findIndex(item => item === targetItem);
                        } else {
                            // It's a child - find parent root item
                            let currentItem = targetItem;
                            while (currentItem && currentItem.parentId) {
                                currentItem = group.items.find(item => item.id === currentItem.parentId);
                            }
                            if (currentItem) {
                                rootItemIndex = rootItems.findIndex(item => item === currentItem);
                            }
                        }
                    }
                    
                    if (rootItemIndex >= 0) {
                        // Scroll to root item to make it (and its children) visible
                        virtualScroller.scrollToIndex(rootItemIndex);
                        
                        // Wait for render and retry finding element
                        requestAnimationFrame(() => {
                            requestAnimationFrame(() => {
                                if (findAndScrollToElement()) {
                                    return; // Success
                                }
                                // If still not found, try one more time after a short delay
                                setTimeout(() => {
                                    findAndScrollToElement();
                                }, 100);
                            });
                        });
                        return;
                    }
                }
            }
        }
        
        // Existing logic for non-virtualized or if element found
        setTimeout(() => {
            if (!element) {
                element = ElementFinder.findElement(pageId, binId, elementIndex);
            }
            if (element) {
                this.scrollToElement(element, scrollOptions);
                if (highlight) {
                    this.highlightElement(element, highlightDuration, highlightColor);
                }
            }
        }, delay);
    }
    
    /**
     * Navigate to a specific page
     * @param {string} pageId - Page ID
     * @param {Object} app - App instance
     * @param {Object} options - Navigation options
     * @param {boolean} options.render - Whether to trigger render (default: true)
     */
    static navigateToPage(pageId, app, options = {}) {
        const { render = true } = options;
        
        if (app && app.appState) {
            app.appState.currentDocumentId = pageId;
        }
        
        if (render) {
            eventBus.emit(EVENTS.PAGE.SWITCHED, { pageId });
            eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
        }
    }
    
    /**
     * Navigate to a specific bin
     * @param {string} pageId - Page ID
     * @param {string} binId - Bin ID
     * @param {Object} app - App instance
     * @param {Object} options - Navigation options
     * @param {boolean} options.scroll - Whether to scroll to bin (default: true)
     */
    static navigateToBin(pageId, binId, app, options = {}) {
        const { scroll = true } = options;
        
        // Navigate to page first
        this.navigateToPage(pageId, app, options);
        
        if (scroll) {
            setTimeout(() => {
                const bin = this.findBin(pageId, binId);
                if (bin) {
                    this.scrollToElement(bin, { behavior: 'smooth', block: 'start' });
                }
            }, 100);
        }
    }
    
    /**
     * Highlight an element with a fade effect
     * @param {HTMLElement} element - Element to highlight
     * @param {number} duration - Duration in milliseconds (default: 2000)
     * @param {string} color - Highlight color (default: 'rgba(74, 158, 255, 0.3)')
     */
    static highlightElement(element, duration = 2000, color = 'rgba(74, 158, 255, 0.3)') {
        if (!element) return;
        
        const originalBackground = element.style.background;
        const originalTransition = element.style.transition;
        
        element.style.background = color;
        element.style.transition = 'background 0.3s';
        
        setTimeout(() => {
            element.style.background = originalBackground;
            setTimeout(() => {
                element.style.transition = originalTransition;
            }, 300);
        }, duration);
    }
    
    /**
     * Scroll to an element
     * @param {HTMLElement} element - Element to scroll to
     * @param {Object} options - Scroll options (passed to scrollIntoView)
     */
    static scrollToElement(element, options = {}) {
        if (!element) return;
        
        const defaultOptions = {
            behavior: 'smooth',
            block: 'center',
            inline: 'nearest'
        };
        
        element.scrollIntoView({ ...defaultOptions, ...options });
    }
    
    /**
     * Find element by data attributes
     * @param {string} pageId - Page ID
     * @param {string} binId - Bin ID
     * @param {number} elementIndex - Element index
     * @param {HTMLElement} context - Optional context element (default: document)
     * @param {number} childIndex - Optional child index for nested elements
     * @returns {HTMLElement|null} Found element or null
     */
    static findElementByData(pageId, binId, elementIndex, context = document, childIndex = null) {
        let selector = `[data-page-id="${pageId}"][data-bin-id="${binId}"][data-element-index="${elementIndex}"]`;
        
        if (childIndex !== null && childIndex !== undefined) {
            selector += `[data-child-index="${childIndex}"]`;
        }
        
        return context.querySelector(selector);
    }
    
    /**
     * Find bin element by data attributes
     * @param {string} pageId - Page ID
     * @param {string} binId - Bin ID
     * @param {HTMLElement} context - Optional context element (default: document)
     * @returns {HTMLElement|null} Found bin element or null
     */
    static findBin(pageId, binId, context = document) {
        return context.querySelector(`[data-page-id="${pageId}"][data-bin-id="${binId}"].bin`);
    }
    
    /**
     * Find page element by data attributes
     * @param {string} pageId - Page ID
     * @param {HTMLElement} context - Optional context element (default: document)
     * @returns {HTMLElement|null} Found page element or null
     */
    static findPage(pageId, context = document) {
        return context.querySelector(`[data-page-id="${pageId}"].page`);
    }
    
    /**
     * Find all elements in a bin
     * @param {string} pageId - Page ID
     * @param {string} binId - Bin ID
     * @param {HTMLElement} context - Optional context element (default: document)
     * @returns {NodeList} List of element nodes
     */
    static findAllElements(pageId, binId, context = document) {
        return context.querySelectorAll(`[data-page-id="${pageId}"][data-bin-id="${binId}"][data-element-index]`);
    }
}


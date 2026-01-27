// DragAutoScrollHandlers.js - Handles auto-scroll during drag operations
import { getService, SERVICES } from '../core/AppServices.js';

export class DragAutoScrollHandlers {
    constructor() {
        // No constructor needed
    }
    
    _getAppState() {
        return getService(SERVICES.APP_STATE);
    }
    
    /**
     * Setup drag auto-scroll handlers
     */
    setupDragAutoScroll() {
        // Auto-scroll during drag when near screen edges
        document.addEventListener('dragover', (e) => {
            const appState = this._getAppState();
            if (!appState.isDragging) return;
            
            const edgeThreshold = 50; // Distance from edge to trigger scrolling
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            const mouseX = e.clientX;
            const mouseY = e.clientY;
            
            let scrollX = 0;
            let scrollY = 0;
            
            // Check horizontal edges
            if (mouseX < edgeThreshold) {
                scrollX = -appState.edgeScrollSpeed;
            } else if (mouseX > viewportWidth - edgeThreshold) {
                scrollX = appState.edgeScrollSpeed;
            }
            
            // Check vertical edges
            if (mouseY < edgeThreshold) {
                scrollY = -appState.edgeScrollSpeed;
            } else if (mouseY > viewportHeight - edgeThreshold) {
                scrollY = appState.edgeScrollSpeed;
            }
            
            // Apply scrolling
            if (scrollX !== 0 || scrollY !== 0) {
                // Clear existing interval
                if (appState.autoScrollInterval) {
                    clearInterval(appState.autoScrollInterval);
                }
                
                // Start continuous scrolling
                appState.autoScrollInterval = setInterval(() => {
                    if (!appState.isDragging) {
                        clearInterval(appState.autoScrollInterval);
                        appState.autoScrollInterval = null;
                        return;
                    }
                    
                    const container = document.getElementById('bins-container');
                    if (container) {
                        if (scrollX !== 0) {
                            container.scrollLeft += scrollX;
                        }
                        if (scrollY !== 0) {
                            container.scrollTop += scrollY;
                        }
                    } else {
                        // Fallback to window scroll
                        if (scrollX !== 0) {
                            window.scrollBy(scrollX, 0);
                        }
                        if (scrollY !== 0) {
                            window.scrollBy(0, scrollY);
                        }
                    }
                }, 16); // ~60fps
            } else {
                // Stop scrolling if not near edge
                if (appState.autoScrollInterval) {
                    clearInterval(appState.autoScrollInterval);
                    appState.autoScrollInterval = null;
                }
            }
        });
        
        // Middle mouse wheel scrolling during drag
        document.addEventListener('wheel', (e) => {
            const appState = this._getAppState();
            if (!appState.isDragging) return;
            
            // Check if middle mouse button is pressed (button 1)
            // Note: We can't directly check button state during wheel event,
            // so we'll track it via mousedown/mouseup
            if (appState.middleMouseDown) {
                e.preventDefault();
                
                const container = document.getElementById('pages-container');
                if (container) {
                    // Scroll horizontally if shift is held, otherwise vertically
                    if (e.shiftKey) {
                        container.scrollLeft += e.deltaY;
                    } else {
                        container.scrollTop += e.deltaY;
                    }
                } else {
                    // Fallback to window scroll
                    if (e.shiftKey) {
                        window.scrollBy(e.deltaY, 0);
                    } else {
                        window.scrollBy(0, e.deltaY);
                    }
                }
            }
        }, { passive: false });
        
        // Track middle mouse button state (reuse appState from wheel handler scope)
        // Get appState for middle mouse tracking
        const appStateForMouse = this._getAppState();
        appStateForMouse.middleMouseDown = false;
        document.addEventListener('mousedown', (e) => {
            if (e.button === 1) { // Middle mouse button
                appStateForMouse.middleMouseDown = true;
            }
        });
        
        document.addEventListener('mouseup', (e) => {
            if (e.button === 1) { // Middle mouse button
                appStateForMouse.middleMouseDown = false;
            }
        });
        
        // Also handle contextmenu event for middle mouse (some browsers)
        document.addEventListener('contextmenu', (e) => {
            if (e.button === 1) {
                e.preventDefault();
            }
        });
    }
}

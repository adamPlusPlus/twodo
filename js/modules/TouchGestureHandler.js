// TouchGestureHandler.js - Handles touch gestures for mobile devices
import { eventBus } from '../core/EventBus.js';
import { EVENTS } from '../core/AppEvents.js';
import { getService, SERVICES, hasService } from '../core/AppServices.js';

export class TouchGestureHandler {
    constructor() {
    }
    
    /**
     * Get services
     */
    _getAppState() {
        return getService(SERVICES.APP_STATE);
    }
    
    _getDataManager() {
        return getService(SERVICES.DATA_MANAGER);
    }
    
    setupTouchGestures() {
        // Handle two-finger gesture: finger 1 held, finger 2 taps -> context menu at finger 1 position
        document.addEventListener('touchstart', (e) => {
            const touches = Array.from(e.touches);
            
            const appState = this._getAppState();
            // Store all current touches
            touches.forEach(touch => {
                if (!appState.touchPoints[touch.identifier]) {
                    // New touch - store it with timestamp
                    appState.touchPoints[touch.identifier] = {
                        x: touch.clientX,
                        y: touch.clientY,
                        target: document.elementFromPoint(touch.clientX, touch.clientY),
                        time: Date.now()
                    };
                }
            });
            
            // If we now have 2 touches (second finger just touched)
            if (touches.length === 2) {
                const touchIds = Object.keys(appState.touchPoints).map(id => parseInt(id));
                // Get the first touch (oldest)
                const firstTouchId = touchIds.sort((a, b) => 
                    appState.touchPoints[a].time - appState.touchPoints[b].time
                )[0];
                
                const firstTouch = appState.touchPoints[firstTouchId];
                const timeHeld = Date.now() - firstTouch.time;
                
                // If first touch has been held for at least 100ms
                if (timeHeld >= 100 && firstTouch.target) {
                    // Trigger context menu at first touch position
                    e.preventDefault();
                    e.stopPropagation();
                    
                    // Get fresh element at first touch position (in case DOM changed)
                    const targetAtPosition = document.elementFromPoint(firstTouch.x, firstTouch.y);
                    
                    // Create synthetic event for showContextMenu
                    const syntheticEvent = {
                        clientX: firstTouch.x,
                        clientY: firstTouch.y,
                        target: targetAtPosition || firstTouch.target,
                        preventDefault: () => {},
                        stopPropagation: () => {}
                    };
                    
                    // Find context menu data from the element at first touch position
                    this.triggerContextMenuFromTouch(syntheticEvent, syntheticEvent.target);
                }
            }
        }, { passive: false });
        
        document.addEventListener('touchmove', (e) => {
            // Update touch positions
            Array.from(e.touches).forEach(touch => {
                const appState = this._getAppState();
                if (appState.touchPoints[touch.identifier]) {
                    appState.touchPoints[touch.identifier].x = touch.clientX;
                    appState.touchPoints[touch.identifier].y = touch.clientY;
                }
            });
        });
        
        document.addEventListener('touchend', (e) => {
            // Remove ended touches
            Array.from(e.changedTouches).forEach(touch => {
                const appState = this._getAppState();
                delete appState.touchPoints[touch.identifier];
            });
            
            // Clear first touch data if no touches remain
            if (e.touches.length === 0) {
                this.app.firstTouchData = null;
                const appState = this._getAppState();
                appState.touchPoints = {};
            }
        });
    }
    
    triggerContextMenuFromTouch(e, target) {
        // Create a proper contextmenu event that will bubble and trigger all existing handlers
        // This ensures the touch gesture works exactly like a mouse right-click
        const contextMenuEvent = new MouseEvent('contextmenu', {
            bubbles: true,
            cancelable: true,
            clientX: e.clientX,
            clientY: e.clientY,
            button: 2, // Right mouse button
            buttons: 2,
            view: window
        });
        
        // Dispatch the event on the target element
        // This will trigger all existing contextmenu event listeners
        target.dispatchEvent(contextMenuEvent);
        
        // If the event wasn't prevented and no handler showed a menu,
        // fall back to the original logic for edge cases
        if (!contextMenuEvent.defaultPrevented && (!this.app.contextMenuState || !this.app.contextMenuState.visible)) {
            // Fallback: try to find context menu data manually
            this.fallbackContextMenuFromTouch(e, target);
        }
    }
    
    fallbackContextMenuFromTouch(e, target) {
        // Fallback method for edge cases where event didn't trigger handlers
        const element = target.closest('.element');
        const bin = target.closest('.bin');
        const binContent = target.closest('.bin-content');
        const elementsList = target.closest('.elements-list');
        const pageTab = target.closest('.page-tab');
        const tabsContainer = target.closest('.page-tabs');
        const binsContainer = target.closest('#bins-container');
        const page = target.closest('.page');
        const subtask = target.closest('.subtask');
        
        // Element context menu
        if (element) {
            const pageId = element.dataset.pageId;
            const binId = element.dataset.binId;
            let elementIndex = element.dataset.elementIndex;
            const isChild = element.dataset.isChild === 'true';
            const childIndex = element.dataset.childIndex;
            
            // Handle nested children
            if (isChild && childIndex !== undefined) {
                elementIndex = `${elementIndex}-${childIndex}`;
            } else {
                elementIndex = parseInt(elementIndex);
            }
            
            if (subtask) {
                // Find subtask index (legacy support)
                const subtaskContainer = element.querySelector('.subtask-container, .children-container');
                if (subtaskContainer) {
                    const subtasks = subtaskContainer.querySelectorAll('.subtask, .child-element');
                    const subtaskIndex = Array.from(subtasks).indexOf(subtask);
                    if (subtaskIndex !== -1) {
                        this.app.contextMenuHandler.showContextMenu(e, pageId, binId, elementIndex, subtaskIndex);
                        return;
                    }
                }
            }
            
            // Regular element
            if (pageId && binId && (typeof elementIndex === 'string' || !isNaN(elementIndex))) {
                this.app.contextMenuHandler.showContextMenu(e, pageId, binId, elementIndex);
                return;
            }
        }
        
        // Bin context menu (empty bin content area)
        if (bin && binContent && !target.closest('.element') && !target.closest('button')) {
            const pageId = bin.dataset.pageId;
            const binId = bin.dataset.binId;
            if (pageId && binId) {
                this.app.contextMenuHandler.showBinContextMenu(e, pageId, binId);
                return;
            }
        }
        
        // Elements list context menu (empty area in elements list)
        if (elementsList && !target.closest('.element')) {
            const bin = elementsList.closest('.bin');
            if (bin) {
                const pageId = bin.dataset.pageId;
                const binId = bin.dataset.binId;
                if (pageId && binId) {
                    this.app.contextMenuHandler.showBinContextMenu(e, pageId, binId);
                    return;
                }
            }
        }
        
        // Page tab context menu
        if (pageTab) {
            const pageId = pageTab.dataset.pageId;
            if (pageId) {
                this.app.contextMenuHandler.showPageContextMenu(e, pageId);
                return;
            }
        }
        
        // Tabs container context menu (empty area in tabs)
        if (tabsContainer && !target.closest('.page-tab')) {
            this.app.contextMenuHandler.showPageContextMenu(e);
            return;
        }
        
        // Bins container context menu (empty area)
        if (binsContainer && !target.closest('.bin') && !target.closest('.element')) {
            this.app.contextMenuHandler.showPageContextMenu(e);
            return;
        }
        
        // Page context menu (fallback)
        if (page) {
            const pageId = page.dataset.pageId;
            if (pageId) {
                const isInPageContent = target.closest('[id^="page-content-"]');
                const isElement = target.closest('.element');
                const isPageControl = target.closest('.page-controls');
                const isToggleArrow = target.closest('.page-toggle-arrow');
                const isAddElementBtn = target.closest('.add-element-btn');
                
                if (!isInPageContent && !isElement && !isPageControl && !isToggleArrow && !isAddElementBtn) {
                    this.app.contextMenuHandler.showPageContextMenu(e, pageId);
                    return;
                }
            }
        }
    }
    
    setupSwipeGestures() {
        // Swipe Gestures (4) - Swipe left to delete, swipe right to toggle completion
        let touchStartX = 0;
        let touchStartY = 0;
        let touchStartTime = 0;
        const swipeThreshold = 50; // pixels
        const maxSwipeTime = 500; // milliseconds
        let swipeElement = null;
        
        document.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                touchStartX = e.touches[0].clientX;
                touchStartY = e.touches[0].clientY;
                touchStartTime = Date.now();
                swipeElement = e.target.closest('.element');
                
                // Add visual feedback
                if (swipeElement) {
                    swipeElement.style.transition = 'transform 0.2s ease-out';
                }
            }
        }, { passive: true });
        
        document.addEventListener('touchmove', (e) => {
            if (swipeElement && e.touches.length === 1) {
                const currentX = e.touches[0].clientX;
                const currentY = e.touches[0].clientY;
                const diffX = currentX - touchStartX;
                const diffY = currentY - touchStartY;
                
                // Only allow horizontal swipes
                if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 10) {
                    e.preventDefault();
                    // Visual feedback during swipe
                    swipeElement.style.transform = `translateX(${diffX}px)`;
                    swipeElement.style.opacity = Math.max(0.5, 1 - Math.abs(diffX) / 200);
                }
            }
        }, { passive: false });
        
        document.addEventListener('touchend', (e) => {
            if (!swipeElement || !touchStartX || !touchStartY) {
                touchStartX = 0;
                touchStartY = 0;
                swipeElement = null;
                return;
            }
            
            const touchEndX = e.changedTouches[0].clientX;
            const touchEndY = e.changedTouches[0].clientY;
            const diffX = touchEndX - touchStartX;
            const diffY = touchEndY - touchStartY;
            const swipeTime = Date.now() - touchStartTime;
            
            // Reset transform
            if (swipeElement) {
                swipeElement.style.transform = '';
                swipeElement.style.opacity = '';
            }
            
            // Check if it's a valid horizontal swipe
            if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > swipeThreshold && swipeTime < maxSwipeTime) {
                const pageId = swipeElement.dataset.pageId;
                const binId = swipeElement.dataset.binId;
                let elementIndex = swipeElement.dataset.elementIndex;
                
                // Handle nested children
                if (typeof elementIndex === 'string' && elementIndex.includes('-')) {
                    // Don't allow swipe actions on nested children
                    touchStartX = 0;
                    touchStartY = 0;
                    swipeElement = null;
                    return;
                } else {
                    elementIndex = parseInt(elementIndex);
                }
                
                if (pageId && binId && !isNaN(elementIndex)) {
                    if (diffX > 0) {
                        // Swipe right - toggle completion
                        this.app.toggleElement(pageId, binId, elementIndex);
                    } else {
                        // Swipe left - delete
                        if (confirm('Delete this element?')) {
                            const appState = this._getAppState();
                            const page = appState.pages.find(p => p.id === pageId);
                            if (page) {
                                const bin = page.bins?.find(b => b.id === binId);
                                if (bin && bin.elements && bin.elements[elementIndex]) {
                                    bin.elements.splice(elementIndex, 1);
                                    const dataManager = this._getDataManager();
                                    if (dataManager) {
                                        dataManager.saveData();
                                    }
                                    eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
                                }
                            }
                        }
                    }
                }
            }
            
            touchStartX = 0;
            touchStartY = 0;
            swipeElement = null;
        }, { passive: true });
    }
}


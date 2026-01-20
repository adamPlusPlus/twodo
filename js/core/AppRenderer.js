// AppRenderer.js - Handles application rendering
// Extracted from app.js to reduce coupling and improve modularity
import { eventBus } from './EventBus.js';
import { EVENTS } from './AppEvents.js';
import { SERVICES, getService } from './AppServices.js';
import { BinRenderer } from './BinRenderer.js';
import { ElementRenderer } from './ElementRenderer.js';
// import { CalendarRenderer } from './CalendarRenderer.js'; // TEMPORARILY DISABLED
import { AnimationRenderer } from './AnimationRenderer.js';
import { PaneManager } from './PaneManager.js';

/**
 * AppRenderer - Manages all rendering operations
 * 
 * Handles DOM rendering, element rendering, and UI updates.
 * This class extracts rendering logic from app.js to improve modularity.
 */
export class AppRenderer {
    constructor(app) {
        this.app = app;
        this._preservingFormat = false;
        this.binRenderer = new BinRenderer(app);
        this.elementRenderer = new ElementRenderer(app);
        // this.calendarRenderer = new CalendarRenderer(app); // TEMPORARILY DISABLED
        this.animationRenderer = new AnimationRenderer(app);
        this.paneManager = new PaneManager(app, this);
        this._lastScrollTop = null;
        this._lastScrollLeft = null;
        this._setupScrollTracking();
    }
    
    /**
     * Setup scroll tracking for debugging
     */
    _setupScrollTracking() {
        // Only set up once
        if (this._scrollTrackingSetup) return;
        this._scrollTrackingSetup = true;
        
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this._setupScrollTracking());
            return;
        }
        
        const setupTracking = () => {
            const container = document.getElementById('bins-container');
            if (!container) {
                // Retry after a short delay if container doesn't exist yet
                setTimeout(setupTracking, 100);
                return;
            }
            
            // Remove existing listener if any
            if (this._scrollTrackingHandler) {
                container.removeEventListener('scroll', this._scrollTrackingHandler);
            }
            
            // Track programmatic scroll changes by monitoring scrollTop/scrollLeft
            let lastKnownScrollTop = container.scrollTop;
            let lastKnownScrollLeft = container.scrollLeft;
            
            // Function to check and log scroll changes
            const checkScrollChange = (source = 'unknown') => {
                const currentScrollTop = container.scrollTop;
                const currentScrollLeft = container.scrollLeft;
                
                if (currentScrollTop !== lastKnownScrollTop || currentScrollLeft !== lastKnownScrollLeft) {
                    const scrollHeight = container.scrollHeight;
                    const clientHeight = container.clientHeight;
                    const scrollPercentage = scrollHeight > clientHeight ? ((currentScrollTop / (scrollHeight - clientHeight)) * 100).toFixed(1) : 0;
                    
                    console.log('[SCROLL TRACK] Scroll position changed:', {
                        source,
                        scrollTop: currentScrollTop.toFixed(0),
                        scrollLeft: currentScrollLeft.toFixed(0),
                        scrollHeight,
                        clientHeight,
                        scrollPercentage: scrollPercentage + '%',
                        maxScrollTop: scrollHeight - clientHeight,
                        deltaTop: lastKnownScrollTop !== null ? (currentScrollTop - lastKnownScrollTop).toFixed(0) : 'N/A',
                        deltaLeft: lastKnownScrollLeft !== null ? (currentScrollLeft - lastKnownScrollLeft).toFixed(0) : 'N/A'
                    });
                    
                    lastKnownScrollTop = currentScrollTop;
                    lastKnownScrollLeft = currentScrollLeft;
                    this._lastScrollTop = currentScrollTop;
                    this._lastScrollLeft = currentScrollLeft;
                }
            };
            
            // Add scroll event listener (for user scrolling)
            this._scrollTrackingHandler = (e) => {
                checkScrollChange('user-scroll');
            };
            container.addEventListener('scroll', this._scrollTrackingHandler, { passive: true });
            
            // Monitor for programmatic changes using periodic checks
            this._scrollCheckInterval = setInterval(() => {
                checkScrollChange('programmatic');
            }, 50);
            
            console.log('[SCROLL TRACK] Scroll tracking enabled on bins-container');
        };
        
        setupTracking();
    }
    
    /**
     * Main render method
     * Renders the entire application UI
     */
    render() {
        // Preserve active modals (like visual customization modal) during render
        const activeModals = [];
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            if (modal.classList.contains('active')) {
                // Check if this is a modal we want to preserve (settings or visual customization)
                const modalBody = modal.querySelector('#modal-body, #settings-body');
                if (modalBody) {
                    const isVisualCustomization = modalBody.querySelector('#visual-instance-specific') !== null;
                    const isSettings = modalBody.querySelector('#settings-reset') !== null;
                    if (isVisualCustomization || isSettings) {
                        activeModals.push(modal);
                        return; // Skip closing this modal
                    }
                }
            }
            // Close other modals
            modal.classList.remove('active');
            modal.style.display = 'none';
        });
        
        // Render page tabs
        this.renderPageTabs();
        
        // Get current page (ensure default exists via PageManager)
        const pageManager = getService(SERVICES.PAGE_MANAGER);
        const currentPage = pageManager.ensureDefaultPage();
        
        // Check if multi-pane mode is enabled (for now, we'll add a flag later)
        const appState = getService(SERVICES.APP_STATE);
        const useMultiPane = appState.multiPaneEnabled !== false; // Default to true for now
        
        if (useMultiPane) {
            // Initialize pane manager if not already done
            if (!this.paneManager.rootLayout) {
                this.paneManager.initialize();
            }
            
            // Render all panes
            const allPanes = this.paneManager.getAllPanes();
            allPanes.forEach(pane => {
                this.paneManager.renderPane(pane);
            });
            
            // If no panes, create one with current page
            if (allPanes.length === 0) {
                this.paneManager.openPane(appState.currentDocumentId);
            }
            
            return;
        }
        
        // Legacy single-pane rendering
        const container = document.getElementById('bins-container');
        if (!container) return;
        
        // Get active page (reuse appState from line 63)
        const activePage = appState.documents.find(page => page.id === appState.currentDocumentId);
        
        // Store old positions before re-rendering (only if container has content)
        const hasContent = container.children.length > 0;
        const oldPositions = hasContent ? this.getCurrentPositions() : { bins: {}, elements: {} };
        
        // Preserve scroll position BEFORE any rendering or clearing
        const scrollTop = container.scrollTop;
        const scrollLeft = container.scrollLeft;
        console.log('[SCROLL DEBUG] Preserving scroll position:', { scrollTop, scrollLeft, containerHeight: container.scrollHeight, clientHeight: container.clientHeight });
        
        // Check if page has a format renderer BEFORE clearing
        const formatRendererManager = getService(SERVICES.FORMAT_RENDERER_MANAGER);
        const pageFormat = formatRendererManager?.getPageFormat(appState.currentDocumentId);
        const format = pageFormat ? formatRendererManager?.getFormat(pageFormat) : null;
        const shouldUseFormat = format && format.renderPage && activePage;
        
        // Only clear if we're not preserving format view (prevents flicker)
        if (!shouldUseFormat || !this._preservingFormat) {
            container.innerHTML = '';
        }
        
        // If we have a format renderer, use it
        if (shouldUseFormat) {
            // Apply theme for this page/view combination
            if (this.app.themeManager) {
                const viewFormat = pageFormat || 'default';
                this.app.themeManager.applyPageTheme(activePage.id, viewFormat, container);
            }
            
            // If format view is already rendered, update it instead of clearing
            if (this._preservingFormat && container.children.length > 0) {
                // Update existing format view
                console.log('[SCROLL DEBUG] Format render - updating existing (preserving format)', { scrollBeforeUpdate: { scrollTop: container.scrollTop, scrollLeft: container.scrollLeft } });
                format.renderPage(container, activePage, { app: this.app });
                console.log('[SCROLL DEBUG] Format render - after update', { scrollAfterUpdate: { scrollTop: container.scrollTop, scrollLeft: container.scrollLeft, scrollHeight: container.scrollHeight } });
            } else {
                // First render or format changed - clear and render
                console.log('[SCROLL DEBUG] Format render - clearing container', { scrollBeforeClear: { scrollTop, scrollLeft } });
                container.innerHTML = '';
                console.log('[SCROLL DEBUG] Format render - after clear', { scrollAfterClear: { scrollTop: container.scrollTop, scrollLeft: container.scrollLeft } });
                format.renderPage(container, activePage, { app: this.app });
                console.log('[SCROLL DEBUG] Format render - after renderPage', { scrollAfterRender: { scrollTop: container.scrollTop, scrollLeft: container.scrollLeft, scrollHeight: container.scrollHeight } });
            }
            
            // Reset format preservation flag after render
            this._preservingFormat = false;
            
            // Restore scroll position after format rendering
            // Use requestAnimationFrame to ensure DOM is fully updated
            requestAnimationFrame(() => {
                const beforeRestore = { scrollTop: container.scrollTop, scrollLeft: container.scrollLeft, scrollHeight: container.scrollHeight, clientHeight: container.clientHeight };
                console.log('[SCROLL DEBUG] Format render - About to restore scroll:', { 
                    preserved: { scrollTop, scrollLeft }, 
                    beforeRestore
                });
                container.scrollTop = scrollTop;
                container.scrollLeft = scrollLeft;
                const afterRestore = { scrollTop: container.scrollTop, scrollLeft: container.scrollLeft, scrollHeight: container.scrollHeight, clientHeight: container.clientHeight };
                console.log('[SCROLL DEBUG] Format render - After restore:', { 
                    afterRestore,
                    restored: afterRestore.scrollTop === scrollTop && afterRestore.scrollLeft === scrollLeft,
                    difference: { top: (afterRestore.scrollTop - scrollTop).toFixed(0), left: (afterRestore.scrollLeft - scrollLeft).toFixed(0) }
                });
                
                // Emit page:render event for plugins
                if (this.app.eventBus && activePage) {
                    this.app.eventBus.emit('page:render', {
                        pageElement: container,
                        pageData: activePage
                    });
                }
            });
            return;
        }
        
        // Apply theme for default view
        if (this.app.themeManager) {
            this.app.themeManager.applyPageTheme(activePage.id, 'default', container);
        }
        
        // Default rendering - reset container CSS to default vertical layout
        // Clear any format-specific CSS that was applied
        container.style.cssText = '';
        
        if (activePage && activePage.groups && activePage.groups.length > 0) {
            console.log('[SCROLL DEBUG] Default render - before appending bins', { scrollBeforeAppend: { scrollTop: container.scrollTop, scrollLeft: container.scrollLeft, scrollHeight: container.scrollHeight } });
            activePage.groups.forEach((bin, binIndex) => {
                const binElement = this.binRenderer.renderBin(activePage.id, bin);
                container.appendChild(binElement);
            });
            console.log('[SCROLL DEBUG] Default render - after appending bins', { scrollAfterAppend: { scrollTop: container.scrollTop, scrollLeft: container.scrollLeft, scrollHeight: container.scrollHeight } });
            
            // Restore scroll position and emit events after rendering
            // Use requestAnimationFrame to ensure DOM is fully updated
            requestAnimationFrame(() => {
                // Restore scroll position after rendering
                const beforeRestore = { scrollTop: container.scrollTop, scrollLeft: container.scrollLeft, scrollHeight: container.scrollHeight, clientHeight: container.clientHeight };
                console.log('[SCROLL DEBUG] Default render - About to restore scroll:', { 
                    preserved: { scrollTop, scrollLeft }, 
                    beforeRestore
                });
                container.scrollTop = scrollTop;
                container.scrollLeft = scrollLeft;
                const afterRestore = { scrollTop: container.scrollTop, scrollLeft: container.scrollLeft, scrollHeight: container.scrollHeight, clientHeight: container.clientHeight };
                console.log('[SCROLL DEBUG] Default render - After restore:', { 
                    afterRestore,
                    restored: afterRestore.scrollTop === scrollTop && afterRestore.scrollLeft === scrollLeft,
                    difference: { top: (afterRestore.scrollTop - scrollTop).toFixed(0), left: (afterRestore.scrollLeft - scrollLeft).toFixed(0) }
                });
                
                // Emit page:render event for plugins
                if (this.app.eventBus && activePage) {
                    const pageElement = document.querySelector(`[data-page-id="${activePage.id}"], .page, #bins-container`);
                    if (pageElement) {
                        this.app.eventBus.emit('page:render', {
                            pageElement: pageElement,
                            pageData: activePage
                        });
                    }
                }
            });
        }
        
        // If no bins, show empty state
        if (!activePage || !activePage.groups || activePage.groups.length === 0) {
            container.innerHTML = '<p>No bins yet. Add a bin to get started!</p>';
            return;
        }
    }
    
    /**
     * Render page tabs
     */
    renderPageTabs() {
        const tabsContainer = document.getElementById('page-tabs');
        if (!tabsContainer) return;
        
        tabsContainer.innerHTML = '';
        
        const appState = getService(SERVICES.APP_STATE);
        appState.documents.forEach((page, index) => {
            const tab = document.createElement('div');
            tab.className = 'page-tab';
            if (page.id === appState.currentDocumentId) {
                tab.classList.add('active');
            }
            tab.dataset.pageId = page.id;
            tab.textContent = index + 1; // Show page number (1, 2, 3, etc.)
            tab.title = `Page ${index + 1}`;
            
            // Click to switch page
            tab.addEventListener('click', (e) => {
                e.stopPropagation();
                appState.currentDocumentId = page.id;
                eventBus.emit(EVENTS.DATA.SAVE_REQUESTED);
                eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
            });
            
            // Context menu is now handled by unified handler in EventHandler
            
            tabsContainer.appendChild(tab);
        });

        // Context menu is now handled by unified handler in EventHandler
    }
    
    /**
     * Get current positions of bins and elements for animation
     */
    getCurrentPositions() {
        const positions = {
            groups: {},
            items: {}
        };
        
        // Get group positions
        document.querySelectorAll('.bin').forEach(binElement => {
            const binId = binElement.dataset.binId;
            if (binId) {
                const rect = binElement.getBoundingClientRect();
                positions.groups[binId] = {
                    top: rect.top,
                    left: rect.left
                };
            }
        });
        
        // Get item positions - use ElementFinder for consistency
        document.querySelectorAll('.element').forEach(elementElement => {
            const elementData = ElementFinder.getElementData(elementElement);
            if (elementData.pageId && elementData.binId && elementData.elementIndex !== null) {
                // Create a stable key using element's text/content
                let elementKey = `${elementData.pageId}-${elementData.binId}-${elementData.elementIndex}`;
                
                // Try to get element text for more stable matching
                const textElement = elementElement.querySelector('.task-text, .header-text, .audio-status');
                if (textElement) {
                    const text = textElement.textContent || textElement.innerText || '';
                    // Use first 20 chars of text as part of key for stability
                    elementKey = `${elementData.pageId}-${elementData.binId}-${text.substring(0, 20)}-${elementData.elementIndex}`;
                }
                
                const rect = elementElement.getBoundingClientRect();
                positions.items[elementKey] = {
                    top: rect.top,
                    left: rect.left,
                    pageId: elementData.pageId,
                    binId: elementData.binId,
                    elementIndex: elementData.elementIndex
                };
            }
        });
        
        return positions;
    }
    
    /**
     * Set format preservation flag
     * Used to prevent flicker when updating format views
     */
    setPreservingFormat(value) {
        this._preservingFormat = value;
    }
    
    /**
     * Render a bin - delegates to BinRenderer
     */
    renderBin(pageId, bin) {
        return this.binRenderer.renderBin(pageId, bin);
    }
    
    renderElement(pageId, binId, element, elementIndex, childIndex = null, depth = 0) {
        return this.elementRenderer.renderElement(pageId, binId, element, elementIndex, childIndex, depth);
    }
    
    renderChildren(pageId, binId, parentElement, parentElementIndex, depth = 0) {
        return this.elementRenderer.renderChildren(pageId, binId, parentElement, parentElementIndex, depth);
    }
    
    renderCalendar(container, pageId, binId, element, elementIndex) {
        // TEMPORARILY DISABLED - Calendar feature has syntax errors
        const disabledMsg = document.createElement('div');
        disabledMsg.style.padding = '20px';
        disabledMsg.style.textAlign = 'center';
        disabledMsg.style.color = '#888';
        disabledMsg.textContent = 'Calendar feature temporarily disabled';
        container.appendChild(disabledMsg);
        return;
        // return this.calendarRenderer.renderCalendar(container, pageId, binId, element, elementIndex);
    }
    
    renderCurrentDateView(container, element) {
        // TEMPORARILY DISABLED - Calendar feature has syntax errors
        return;
        // return this.calendarRenderer.renderCurrentDateView(container, element);
    }
    
    renderOneDayView(container, element) {
        // TEMPORARILY DISABLED - Calendar feature has syntax errors
        return;
        // return this.calendarRenderer.renderOneDayView(container, element);
    }
    
    renderWeekView(container, element) {
        // TEMPORARILY DISABLED - Calendar feature has syntax errors
        return;
        // return this.calendarRenderer.renderWeekView(container, element);
    }
    
    renderMonthView(container, element) {
        // TEMPORARILY DISABLED - Calendar feature has syntax errors
        return;
        // return this.calendarRenderer.renderMonthView(container, element);
    }
    
    animateMovements(oldPositions) {
        return this.animationRenderer.animateMovements(oldPositions);
    }
    
    styleButton(text, onClick) {
        const btn = document.createElement('button');
        btn.textContent = text;
        btn.style.padding = '4px 8px';
        btn.style.border = '1px solid #555';
        btn.style.background = '#333';
        btn.style.color = '#e0e0e0';
        btn.style.borderRadius = '4px';
        btn.style.cursor = 'pointer';
        btn.style.fontSize = '12px';
        btn.style.width = '32px'; // Consistent width for all buttons
        btn.style.minWidth = '32px'; // Ensure minimum width
        btn.onclick = (e) => {
            e.stopPropagation();
            onClick(e);
        };
        btn.onmouseenter = () => btn.style.background = '#444';
        btn.onmouseleave = () => btn.style.background = '#333';
        return btn;
    }
    
    toggleAllSubtasks() {
        const appState = getService(SERVICES.APP_STATE);
        appState.allSubtasksExpanded = !appState.allSubtasksExpanded;
        
        // Update all individual subtask states to match global state
        Object.keys(appState.subtaskStates || {}).forEach(key => {
            appState.subtaskStates[key] = appState.allSubtasksExpanded;
        });
        
        // Find all subtask content and arrow elements
        const subtaskContents = document.querySelectorAll('[id^="subtask-content-"]');
        const subtaskArrows = document.querySelectorAll('[id^="subtask-toggle-"]');
        
        subtaskContents.forEach(content => {
            content.style.display = appState.allSubtasksExpanded ? 'block' : 'none';
        });
        
        subtaskArrows.forEach(arrow => {
            arrow.textContent = appState.allSubtasksExpanded ? '▼' : '▶';
        });
    }
}


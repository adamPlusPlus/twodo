// AppRenderer.js - Handles application rendering
// Extracted from app.js to reduce coupling and improve modularity
import { eventBus } from './EventBus.js';
import { EVENTS } from './AppEvents.js';
import { SERVICES, getService } from './AppServices.js';
import { BinRenderer } from './BinRenderer.js';
import { ElementRenderer } from './ElementRenderer.js';
// import { CalendarRenderer } from './CalendarRenderer.js'; // TEMPORARILY DISABLED
import { AnimationRenderer } from './AnimationRenderer.js';

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
    }
    
    /**
     * Main render method
     * Renders the entire application UI
     */
    render() {
        // Ensure modals are closed (in case one got stuck open)
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            modal.classList.remove('active');
            modal.style.display = 'none';
        });
        
        // Render page tabs
        this.renderPageTabs();
        
        // Get current page
        const currentPage = this.app.appState.pages.find(p => p.id === this.app.appState.currentPageId);
        if (!currentPage) {
            // If current page doesn't exist, use first page or create default
            if (this.app.appState.pages.length > 0) {
                this.app.appState.currentPageId = this.app.appState.pages[0].id;
            } else {
                // Create default page with one bin
                this.app.appState.pages = [{
                    id: 'page-1',
                    bins: [{
                        id: 'bin-0',
                        title: 'Bin 1',
                        elements: []
                    }]
                }];
                this.app.appState.currentPageId = 'page-1';
            }
        }
        
        const container = document.getElementById('bins-container');
        if (!container) return;
        
        // Get active page
        const activePage = this.app.appState.pages.find(p => p.id === this.app.appState.currentPageId);
        
        // Store old positions before re-rendering (only if container has content)
        const hasContent = container.children.length > 0;
        const oldPositions = hasContent ? this.getCurrentPositions() : { bins: {}, elements: {} };
        
        // Check if page has a format renderer BEFORE clearing
        const pageFormat = this.app.formatRendererManager?.getPageFormat(this.app.appState.currentPageId);
        const format = pageFormat ? this.app.formatRendererManager?.getFormat(pageFormat) : null;
        const shouldUseFormat = format && format.renderPage && activePage;
        
        // Only clear if we're not preserving format view (prevents flicker)
        if (!shouldUseFormat || !this._preservingFormat) {
            container.innerHTML = '';
        }
        
        // If we have a format renderer, use it
        if (shouldUseFormat) {
            // If format view is already rendered, update it instead of clearing
            if (this._preservingFormat && container.children.length > 0) {
                // Update existing format view
                format.renderPage(container, activePage, { app: this.app });
            } else {
                // First render or format changed - clear and render
                container.innerHTML = '';
                format.renderPage(container, activePage, { app: this.app });
            }
            
            // Reset format preservation flag after render
            this._preservingFormat = false;
            
            // Emit page:render event for plugins
            setTimeout(() => {
                if (this.app.eventBus && activePage) {
                    this.app.eventBus.emit('page:render', {
                        pageElement: container,
                        pageData: activePage
                    });
                }
            }, 0);
            return;
        }
        
        // Default rendering - reset container CSS to default vertical layout
        // Clear any format-specific CSS that was applied
        container.style.cssText = '';
        
        if (activePage && activePage.bins && activePage.bins.length > 0) {
            activePage.bins.forEach((bin, binIndex) => {
                const binEl = this.binRenderer.renderBin(activePage.id, bin);
                container.appendChild(binEl);
            });
            
            // Emit page:render event for plugins (after a short delay to ensure DOM is ready)
            setTimeout(() => {
                if (this.app.eventBus && activePage) {
                    const pageElement = document.querySelector(`[data-page-id="${activePage.id}"], .page, #bins-container`);
                    if (pageElement) {
                        this.app.eventBus.emit('page:render', {
                            pageElement: pageElement,
                            pageData: activePage
                        });
                    }
                }
            }, 0);
        }
        
        // If no bins, show empty state
        if (!activePage || !activePage.bins || activePage.bins.length === 0) {
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
        
        this.app.appState.pages.forEach((page, index) => {
            const tab = document.createElement('div');
            tab.className = 'page-tab';
            if (page.id === this.app.appState.currentPageId) {
                tab.classList.add('active');
            }
            tab.dataset.pageId = page.id;
            tab.textContent = index + 1; // Show page number (1, 2, 3, etc.)
            tab.title = `Page ${index + 1}`;
            
            // Click to switch page
            tab.addEventListener('click', (e) => {
                e.stopPropagation();
                this.app.appState.currentPageId = page.id;
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
            bins: {},
            elements: {}
        };
        
        // Get bin positions
        document.querySelectorAll('.bin').forEach(binEl => {
            const binId = binEl.dataset.binId;
            if (binId) {
                const rect = binEl.getBoundingClientRect();
                positions.bins[binId] = {
                    top: rect.top,
                    left: rect.left
                };
            }
        });
        
        // Get element positions - use a combination of pageId, binId, element data to create stable keys
        document.querySelectorAll('.element').forEach(elementEl => {
            const pageId = elementEl.dataset.pageId;
            const binId = elementEl.dataset.binId;
            const elementIndex = elementEl.dataset.elementIndex;
            if (pageId && binId && elementIndex !== undefined) {
                // Create a stable key using element's text/content
                let elementKey = `${pageId}-${binId}-${elementIndex}`;
                
                // Try to get element text for more stable matching
                const textEl = elementEl.querySelector('.task-text, .header-text, .audio-status');
                if (textEl) {
                    const text = textEl.textContent || textEl.innerText || '';
                    // Use first 20 chars of text as part of key for stability
                    elementKey = `${pageId}-${binId}-${text.substring(0, 20)}-${elementIndex}`;
                }
                
                const rect = elementEl.getBoundingClientRect();
                positions.elements[elementKey] = {
                    top: rect.top,
                    left: rect.left,
                    pageId: pageId,
                    binId: binId,
                    elementIndex: elementIndex
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
        this.app.appState.allSubtasksExpanded = !this.app.appState.allSubtasksExpanded;
        
        // Update all individual subtask states to match global state
        Object.keys(this.app.appState.subtaskStates).forEach(key => {
            this.app.appState.subtaskStates[key] = this.app.appState.allSubtasksExpanded;
        });
        
        // Find all subtask content and arrow elements
        const subtaskContents = document.querySelectorAll('[id^="subtask-content-"]');
        const subtaskArrows = document.querySelectorAll('[id^="subtask-toggle-"]');
        
        subtaskContents.forEach(content => {
            content.style.display = this.app.appState.allSubtasksExpanded ? 'block' : 'none';
        });
        
        subtaskArrows.forEach(arrow => {
            arrow.textContent = this.app.appState.allSubtasksExpanded ? '▼' : '▶';
        });
    }
}


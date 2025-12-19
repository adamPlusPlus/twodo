// PaneManager.js - Manages multiple panes/windows for viewing pages
import { eventBus } from './EventBus.js';
import { EVENTS } from './AppEvents.js';
import { DOMBuilder } from '../utils/DOMBuilder.js';

/**
 * PaneManager - Manages multiple panes for viewing pages simultaneously
 * Supports split panes (horizontal/vertical), grid layouts, and multiple instances of the same page
 */
export class PaneManager {
    constructor(app, appRenderer = null) {
        this.app = app;
        this.appRenderer = appRenderer; // Store reference to AppRenderer for accessing binRenderer
        this.panes = new Map(); // Map of paneId -> pane data
        this.nextPaneId = 1;
        this.rootLayout = null; // Root layout container
        
        // Listen for page switching events
        if (this.app.eventBus) {
            this.app.eventBus.on(EVENTS.PAGE.SWITCHED, (data) => {
                this.handlePageSwitch(data.pageId);
            });
            
            // Listen for theme updates to refresh all panes
            this.app.eventBus.on('theme:updated', () => {
                this.updateThemesForAllPanes();
            });
        }
    }
    
    /**
     * Handle page switch - update active pane's tab or create new tab
     */
    handlePageSwitch(pageId) {
        const allPanes = this.getAllPanes();
        
        // If only one pane, update its active tab
        if (allPanes.length === 1) {
            const pane = allPanes[0];
            const activeTab = pane.tabs[pane.activeTabIndex];
            
            // Check if page is already open in a tab
            const existingTabIndex = pane.tabs.findIndex(t => t.pageId === pageId);
            
            if (existingTabIndex !== -1) {
                // Switch to existing tab
                this.setActiveTab(pane.id, pane.tabs[existingTabIndex].id);
            } else {
                // Update active tab to show new page
                const format = this.app.formatRendererManager?.getPageFormat(pageId) || null;
                activeTab.pageId = pageId;
                activeTab.format = format;
                this.renderPane(pane);
            }
        } else if (allPanes.length > 1) {
            // Multiple panes - find the first pane or create tab in first pane
            const firstPane = allPanes[0];
            const existingTabIndex = firstPane.tabs.findIndex(t => t.pageId === pageId);
            
            if (existingTabIndex !== -1) {
                // Switch to existing tab
                this.setActiveTab(firstPane.id, firstPane.tabs[existingTabIndex].id);
            } else {
                // Add new tab to first pane
                this.addTabToPane(firstPane.id, pageId);
            }
        } else {
            // No panes - create one
            this.openPane(pageId);
        }
    }
    
    /**
     * Initialize the pane system
     */
    initialize() {
        // Create root layout container
        const binsContainer = document.getElementById('bins-container');
        if (!binsContainer) return;
        
        // Clear existing content
        binsContainer.innerHTML = '';
        
        // Calculate header height dynamically
        const header = document.querySelector('header');
        const headerHeight = header ? header.offsetHeight : 60;
        
        binsContainer.style.cssText = `
            width: 100vw !important;
            height: calc(100vh - ${headerHeight}px) !important;
            position: fixed !important;
            top: ${headerHeight}px !important;
            left: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
            overflow: hidden !important;
            padding: 0 !important;
            margin: 0 !important;
            display: block !important;
            max-width: none !important;
            z-index: 1;
            box-sizing: border-box !important;
        `;
        
        // Also remove constraints from #app container when in multi-pane mode
        const appContainer = document.getElementById('app');
        if (appContainer) {
            appContainer.style.cssText = `
                max-width: none !important;
                margin: 0 !important;
                padding: 0 !important;
                width: 100vw !important;
                height: 100vh !important;
                position: relative !important;
                overflow: hidden !important;
            `;
        }
        
        // Prevent body/html scrolling - only panes should scroll
        document.body.style.cssText = `
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
            width: 100vw !important;
            height: 100vh !important;
        `;
        
        document.documentElement.style.cssText = `
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
            width: 100vw !important;
            height: 100vh !important;
        `;
        
        this.rootLayout = binsContainer;
        
        // Create initial single pane if no panes exist
        if (this.panes.size === 0) {
            const currentPageId = this.app.appState.currentPageId;
            if (currentPageId) {
                this.openPane(currentPageId);
            }
        }
    }
    
    /**
     * Open a new pane with a page
     * @param {string} pageId - Page ID to open
     * @param {string} format - Optional format to use
     * @param {string} parentPaneId - Optional parent pane to split
     * @param {string} direction - 'horizontal' or 'vertical' for splitting
     * @returns {string} Pane ID
     */
    openPane(pageId, format = null, parentPaneId = null, direction = 'vertical') {
        const paneId = `pane-${this.nextPaneId++}`;
        
        // Get page format if not specified
        if (!format) {
            format = this.app.formatRendererManager?.getPageFormat(pageId) || null;
        }
        
        const pane = {
            id: paneId,
            tabs: [{ // Start with one tab
                pageId: pageId,
                format: format,
                id: `tab-${Date.now()}-${Math.random()}`
            }],
            activeTabIndex: 0, // Index of active tab
            element: null,
            container: null,
            size: parentPaneId ? 50 : 100, // Percentage size
            parent: null,
            children: [],
            locked: false // Whether pane is locked (cannot be closed)
        };
        
        this.panes.set(paneId, pane);
        
        // If splitting an existing pane
        if (parentPaneId) {
            this.splitPane(parentPaneId, paneId, direction);
        } else {
            // Create new root pane
            this.renderPane(pane);
        }
        
        // Emit event
        eventBus.emit('pane:opened', { paneId, pageId, format });
        
        return paneId;
    }
    
    /**
     * Add a new tab to a pane
     * @param {string} paneId - Pane ID
     * @param {string} pageId - Page ID to open
     * @param {string} format - Optional format to use
     * @returns {string} Tab ID
     */
    addTabToPane(paneId, pageId, format = null) {
        const pane = this.panes.get(paneId);
        if (!pane) return null;
        
        // Get page format if not specified
        if (!format) {
            format = this.app.formatRendererManager?.getPageFormat(pageId) || null;
        }
        
        const tab = {
            pageId: pageId,
            format: format,
            id: `tab-${Date.now()}-${Math.random()}`
        };
        
        pane.tabs.push(tab);
        pane.activeTabIndex = pane.tabs.length - 1; // Activate new tab
        
        // Re-render pane to show new tab
        this.renderPane(pane);
        
        // Emit event
        eventBus.emit('tab:opened', { paneId, tabId: tab.id, pageId, format });
        
        return tab.id;
    }
    
    /**
     * Close a tab
     * @param {string} paneId - Pane ID
     * @param {string} tabId - Tab ID to close
     */
    closeTab(paneId, tabId) {
        const pane = this.panes.get(paneId);
        if (!pane || pane.tabs.length <= 1) return; // Don't close last tab
        
        const tabIndex = pane.tabs.findIndex(t => t.id === tabId);
        if (tabIndex === -1) return;
        
        pane.tabs.splice(tabIndex, 1);
        
        // Adjust active tab index
        if (pane.activeTabIndex >= pane.tabs.length) {
            pane.activeTabIndex = pane.tabs.length - 1;
        } else if (pane.activeTabIndex > tabIndex) {
            pane.activeTabIndex--;
        }
        
        // Re-render pane
        this.renderPane(pane);
        
        // Emit event
        eventBus.emit('tab:closed', { paneId, tabId });
    }
    
    /**
     * Set active tab in a pane
     * @param {string} paneId - Pane ID
     * @param {string} tabId - Tab ID to activate
     */
    setActiveTab(paneId, tabId) {
        const pane = this.panes.get(paneId);
        if (!pane) return;
        
        const tabIndex = pane.tabs.findIndex(t => t.id === tabId);
        if (tabIndex === -1) return;
        
        pane.activeTabIndex = tabIndex;
        this.renderPane(pane);
    }
    
    /**
     * Split an existing pane
     * @param {string} existingPaneId - Pane to split
     * @param {string} newPaneId - New pane ID (or null to create one)
     * @param {string} direction - 'horizontal' or 'vertical'
     * @param {string} newPageId - Page ID for new pane (or null to use same page)
     * @param {string} newFormat - Format for new pane (or null to use same format)
     */
    splitPane(existingPaneId, newPaneId = null, direction = 'vertical', newPageId = null, newFormat = null) {
        const existingPane = this.panes.get(existingPaneId);
        if (!existingPane) return;
        
        // Create new pane if needed
        if (!newPaneId) {
            // Use active tab from existing pane or current page
            const activeTab = existingPane.tabs[existingPane.activeTabIndex];
            newPageId = newPageId || (activeTab ? activeTab.pageId : this.app.appState.currentPageId);
            newFormat = newFormat || (activeTab ? activeTab.format : null);
            newPaneId = this.openPane(newPageId, newFormat);
        }
        
        const newPane = this.panes.get(newPaneId);
        if (!newPane) return;
        
        // Create split container
        const splitContainer = document.createElement('div');
        splitContainer.className = 'pane-split-container';
        splitContainer.dataset.direction = direction;
        splitContainer.style.cssText = `
            display: flex;
            flex-direction: ${direction === 'horizontal' ? 'row' : 'column'};
            width: 100%;
            height: 100%;
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
        `;
        
        // Get existing pane's parent or use root
        const parent = existingPane.parent || this.rootLayout;
        const existingElement = existingPane.element;
        
        // Replace existing element with split container
        if (existingElement && existingElement.parentNode) {
            existingElement.parentNode.replaceChild(splitContainer, existingElement);
        } else {
            parent.appendChild(splitContainer);
        }
        
        // Create panes in split
        const pane1 = document.createElement('div');
        pane1.className = 'pane-container';
        pane1.dataset.paneId = existingPaneId;
        pane1.style.cssText = `
            flex: ${existingPane.size};
            min-width: 0;
            min-height: 0;
            position: relative;
            overflow: hidden;
            width: 100%;
            height: 100%;
            border-right: ${direction === 'horizontal' ? '1px solid #3a3a3a' : 'none'};
            border-bottom: ${direction === 'vertical' ? '1px solid #3a3a3a' : 'none'};
        `;
        
        const pane2 = document.createElement('div');
        pane2.className = 'pane-container';
        pane2.dataset.paneId = newPaneId;
        pane2.style.cssText = `
            flex: ${newPane.size};
            min-width: 0;
            min-height: 0;
            position: relative;
            overflow: hidden;
            width: 100%;
            height: 100%;
        `;
        
        splitContainer.appendChild(pane1);
        splitContainer.appendChild(pane2);
        
        // Update pane references
        existingPane.element = pane1;
        existingPane.container = pane1;
        existingPane.size = 50;
        existingPane.parent = splitContainer;
        
        newPane.element = pane2;
        newPane.container = pane2;
        newPane.size = 50;
        newPane.parent = splitContainer;
        
        // Render both panes
        this.renderPane(existingPane);
        this.renderPane(newPane);
        
        // Add resize handle (only if one doesn't already exist)
        const existingHandle = splitContainer.querySelector('.pane-resize-handle');
        if (!existingHandle) {
            this.addResizeHandle(splitContainer, direction, existingPane, newPane);
        }
    }
    
    /**
     * Add resize handle to split container
     */
    addResizeHandle(splitContainer, direction, pane1, pane2) {
        // Remove any existing resize handles from this container
        const existingHandles = splitContainer.querySelectorAll('.pane-resize-handle');
        existingHandles.forEach(h => h.remove());
        
        const handle = document.createElement('div');
        handle.className = 'pane-resize-handle';
        handle.dataset.direction = direction;
        handle.dataset.pane1Id = pane1.id;
        handle.dataset.pane2Id = pane2.id;
        
        // Function to update handle position based on current pane sizes
        const updateHandlePosition = () => {
            const size1 = parseFloat(pane1.element.style.flex) || pane1.size || 50;
            const size2 = parseFloat(pane2.element.style.flex) || pane2.size || 50;
            const totalSize = size1 + size2;
            const percentage = (size1 / totalSize) * 100;
            
            if (direction === 'horizontal') {
                handle.style.cssText = `
                    position: absolute;
                    left: ${percentage}%;
                    top: 0;
                    bottom: 0;
                    width: 4px;
                    cursor: col-resize;
                    background: #3a3a3a;
                    z-index: 10;
                    transition: background 0.2s;
                    transform: translateX(-50%);
                `;
            } else {
                handle.style.cssText = `
                    position: absolute;
                    top: ${percentage}%;
                    left: 0;
                    right: 0;
                    height: 4px;
                    cursor: row-resize;
                    background: #3a3a3a;
                    z-index: 10;
                    transition: background 0.2s;
                    transform: translateY(-50%);
                `;
            }
        };
        
        // Initial position
        updateHandlePosition();
        
        handle.addEventListener('mouseenter', () => {
            handle.style.background = '#4a9eff';
        });
        
        handle.addEventListener('mouseleave', () => {
            handle.style.background = '#3a3a3a';
        });
        
        let isResizing = false;
        handle.addEventListener('mousedown', (e) => {
            e.preventDefault();
            e.stopPropagation();
            isResizing = true;
            document.body.style.cursor = direction === 'horizontal' ? 'col-resize' : 'row-resize';
            document.body.style.userSelect = 'none';
            
            const startPos = direction === 'horizontal' ? e.clientX : e.clientY;
            const startSize1 = parseFloat(pane1.element.style.flex) || pane1.size || 50;
            const startSize2 = parseFloat(pane2.element.style.flex) || pane2.size || 50;
            const totalSize = startSize1 + startSize2;
            
            const onMouseMove = (e) => {
                if (!isResizing) return;
                
                const currentPos = direction === 'horizontal' ? e.clientX : e.clientY;
                const containerRect = splitContainer.getBoundingClientRect();
                const containerSize = direction === 'horizontal' ? containerRect.width : containerRect.height;
                const startRect = direction === 'horizontal' ? containerRect.left : containerRect.top;
                const delta = ((currentPos - startPos) / containerSize) * 100;
                
                const newSize1 = Math.max(10, Math.min(90, startSize1 + delta));
                const newSize2 = totalSize - newSize1;
                
                pane1.size = newSize1;
                pane2.size = newSize2;
                
                pane1.element.style.flex = newSize1;
                pane2.element.style.flex = newSize2;
                
                // Update handle position in real-time
                updateHandlePosition();
            };
            
            const onMouseUp = () => {
                isResizing = false;
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
                // Final position update
                updateHandlePosition();
            };
            
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });
        
        splitContainer.appendChild(handle);
        
        // Store update function for later use
        handle._updatePosition = updateHandlePosition;
    }
    
    /**
     * Render a pane
     */
    renderPane(pane) {
        if (!pane.container) {
            // Create container if it doesn't exist
            const container = document.createElement('div');
            container.className = 'pane-container';
            container.dataset.paneId = pane.id;
            container.style.cssText = `
                width: 100% !important;
                height: 100% !important;
                position: absolute !important;
                top: 0 !important;
                left: 0 !important;
                right: 0 !important;
                bottom: 0 !important;
                overflow: hidden !important;
                margin: 0 !important;
                padding: 0 !important;
                box-sizing: border-box !important;
            `;
            
            if (!pane.element) {
                // Add to root if no parent
                if (this.rootLayout) {
                    this.rootLayout.appendChild(container);
                }
            }
            
            pane.container = container;
            pane.element = container;
        }
        
        // Get active tab first (needed for content container setup)
        const activeTab = pane.tabs[pane.activeTabIndex];
        if (!activeTab) {
            console.warn('No active tab in pane:', pane.id);
            return;
        }
        
        // Preserve scroll positions before rendering
        const scrollPositions = this.preserveScrollPositions(pane);
        
        // Create pane header
        const header = this.createPaneHeader(pane);
        pane.container.innerHTML = '';
        pane.container.appendChild(header);
        
        // Create content container
        const content = document.createElement('div');
        content.className = 'pane-content';
        content.dataset.pageId = activeTab.pageId; // Add pageId for event handlers
        content.style.cssText = `
            width: 100%;
            height: calc(100% - 40px);
            overflow: auto;
        `;
        pane.container.appendChild(content);
        
        // Render active tab's page in pane
        
        const page = this.app.appState.pages.find(p => p.id === activeTab.pageId);
        if (page) {
            // Check if format renderer exists
            const format = activeTab.format 
                ? this.app.formatRendererManager?.getFormat(activeTab.format)
                : null;
            
            if (format && format.renderPage) {
                // Apply theme for this page/view combination
                if (this.app.themeManager) {
                    const viewFormat = activeTab.format || 'default';
                    this.app.themeManager.applyPageTheme(page.id, viewFormat, content);
                }
                format.renderPage(content, page, { app: this.app });
            } else {
                // Apply theme for default view
                if (this.app.themeManager) {
                    this.app.themeManager.applyPageTheme(page.id, 'default', content);
                }
                // Default rendering
                if (page.bins && page.bins.length > 0) {
                    // Access binRenderer through appRenderer or renderService
                    const binRenderer = this.appRenderer?.binRenderer || 
                                       this.app.renderService?.getRenderer()?.binRenderer;
                    if (binRenderer) {
                        page.bins.forEach((bin) => {
                            const binEl = binRenderer.renderBin(page.id, bin);
                            content.appendChild(binEl);
                        });
                    } else {
                        console.warn('binRenderer not available');
                    }
                }
            }
        } else {
            console.warn('Page not found:', activeTab.pageId);
        }
        
        // Emit page:render event for plugins (after a short delay to ensure DOM is ready)
        if (page) {
            setTimeout(() => {
                if (this.app.eventBus) {
                    // Find the page element within this pane's content
                    const pageElement = content.querySelector(`[data-page-id="${activeTab.pageId}"], .page`) || content;
                    if (pageElement) {
                        this.app.eventBus.emit('page:render', {
                            pageElement: pageElement,
                            pageData: page
                        });
                    }
                }
                
                // Restore scroll positions after DOM is ready
                this.restoreScrollPositions(pane, scrollPositions);
            }, 0);
        }
        
        // Emit render event
        eventBus.emit('pane:rendered', { paneId: pane.id, pageId: activeTab.pageId });
    }
    
    /**
     * Update themes for all panes when theme changes
     */
    updateThemesForAllPanes() {
        if (!this.app.themeManager) return;
        
        // Apply global theme to root first (only once)
        this.app.themeManager.applyTheme(this.app.themeManager.themes.global, 'root');
        
        const allPanes = this.getAllPanes();
        allPanes.forEach(pane => {
            if (!pane.container) return;
            
            // Find the content container for this pane
            const content = pane.container.querySelector('.pane-content');
            if (!content) return;
            
            // Get active tab
            const activeTab = pane.tabs[pane.activeTabIndex];
            if (!activeTab) return;
            
            // Get the page
            const page = this.app.appState.pages.find(p => p.id === activeTab.pageId);
            if (!page) return;
            
            // Determine view format
            const viewFormat = activeTab.format || 'default';
            
            // Get effective theme for this page/view combination
            const effectiveTheme = this.app.themeManager.getEffectiveTheme(page.id, viewFormat);
            
            // Apply effective theme to this pane's content container
            this.app.themeManager.applyTheme(effectiveTheme, content);
        });
    }
    
    /**
     * Create pane header with tabs and controls
     */
    createPaneHeader(pane) {
        const header = document.createElement('div');
        header.className = 'pane-header';
        header.style.cssText = `
            display: flex;
            align-items: center;
            background: #2a2a2a;
            border-bottom: 1px solid #3a3a3a;
            height: 40px;
            box-sizing: border-box;
            overflow-x: auto;
            overflow-y: hidden;
        `;
        
        // Tabs container
        const tabsContainer = document.createElement('div');
        tabsContainer.className = 'pane-tabs-container';
        tabsContainer.style.cssText = `
            display: flex;
            flex: 1;
            min-width: 0;
            height: 100%;
            overflow-x: auto;
            overflow-y: hidden;
        `;
        
        // Render tabs
        pane.tabs.forEach((tab, index) => {
            const tabEl = this.createTabElement(pane, tab, index);
            tabsContainer.appendChild(tabEl);
        });
        
        header.appendChild(tabsContainer);
        
        // Controls container
        const controls = document.createElement('div');
        controls.className = 'pane-controls';
        controls.style.cssText = `
            display: flex;
            gap: 4px;
            align-items: center;
            padding: 0 8px;
            background: #2a2a2a;
            flex-shrink: 0;
        `;
        
        // Add tab button
        const addTabBtn = document.createElement('button');
        addTabBtn.innerHTML = '+';
        addTabBtn.title = 'Add Tab';
        addTabBtn.style.cssText = `
            padding: 4px 8px;
            background: #3a3a3a;
            color: #dcddde;
            border: none;
            border-radius: 3px;
            cursor: pointer;
            font-size: 14px;
            line-height: 1;
        `;
        addTabBtn.addEventListener('click', () => {
            // Show dialog to select page and format
            this.showAddTabDialog(pane.id);
        });
        
        // Split buttons
        const splitVerticalBtn = document.createElement('button');
        splitVerticalBtn.innerHTML = '⊞';
        splitVerticalBtn.title = 'Split Vertically';
        splitVerticalBtn.style.cssText = `
            padding: 4px 8px;
            background: #3a3a3a;
            color: #dcddde;
            border: none;
            border-radius: 3px;
            cursor: pointer;
            font-size: 12px;
        `;
        splitVerticalBtn.addEventListener('click', () => {
            this.splitPane(pane.id, null, 'vertical');
        });
        
        const splitHorizontalBtn = document.createElement('button');
        splitHorizontalBtn.innerHTML = '⊟';
        splitHorizontalBtn.title = 'Split Horizontally';
        splitHorizontalBtn.style.cssText = `
            padding: 4px 8px;
            background: #3a3a3a;
            color: #dcddde;
            border: none;
            border-radius: 3px;
            cursor: pointer;
            font-size: 12px;
        `;
        splitHorizontalBtn.addEventListener('click', () => {
            this.splitPane(pane.id, null, 'horizontal');
        });
        
        // Close button
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '×';
        closeBtn.title = 'Close Pane';
        closeBtn.style.cssText = `
            padding: 4px 8px;
            background: #3a3a3a;
            color: #dcddde;
            border: none;
            border-radius: 3px;
            cursor: pointer;
            font-size: 16px;
            line-height: 1;
        `;
        closeBtn.addEventListener('click', () => {
            this.closePane(pane.id);
        });
        
        controls.appendChild(addTabBtn);
        controls.appendChild(splitVerticalBtn);
        controls.appendChild(splitHorizontalBtn);
        controls.appendChild(closeBtn);
        header.appendChild(controls);
        
        return header;
    }
    
    /**
     * Create a tab element with drag-and-drop support
     */
    createTabElement(pane, tab, index) {
        const isActive = index === pane.activeTabIndex;
        const page = this.app.appState.pages.find(p => p.id === tab.pageId);
        const pageTitle = page ? (page.title || page.id) : tab.pageId;
        const formatName = tab.format 
            ? (this.app.formatRendererManager?.getFormat(tab.format)?.name || tab.format)
            : 'Default';
        
        // Use DOMBuilder for tab creation
        const title = DOMBuilder.create('span')
            .style({ flex: '1', overflow: 'hidden', textOverflow: 'ellipsis' })
            .text(pageTitle)
            .build();
        
        const closeBtn = DOMBuilder.create('button')
            .attr('title', 'Close Tab')
            .html('×')
            .style({
                padding: '0',
                background: 'transparent',
                color: '#888',
                border: 'none',
                cursor: 'pointer',
                fontSize: '16px',
                lineHeight: '1',
                width: '16px',
                height: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            })
            .on('click', (e) => {
                e.stopPropagation();
                this.closeTab(pane.id, tab.id);
            })
            .build();
        
        const tabEl = DOMBuilder.create('div')
            .class('pane-tab')
            .dataset({ tabId: tab.id, paneId: pane.id })
            .attr('draggable', 'true')
            .style({
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                background: isActive ? '#1e1e1e' : '#2a2a2a',
                color: '#dcddde',
                borderRight: '1px solid #3a3a3a',
                cursor: 'pointer',
                userSelect: 'none',
                whiteSpace: 'nowrap',
                fontSize: '12px',
                position: 'relative'
            })
            .child(title)
            .build();
        
        // Format badge
        if (tab.format) {
            const formatBadge = DOMBuilder.create('span')
                .text(formatName)
                .style({
                    padding: '2px 6px',
                    background: '#3a3a3a',
                    borderRadius: '3px',
                    fontSize: '10px',
                    opacity: '0.7'
                })
                .build();
            tabEl.appendChild(formatBadge);
        }
        
        tabEl.appendChild(closeBtn);
        
        // Click to activate tab
        tabEl.addEventListener('click', (e) => {
            if (e.target !== closeBtn && !closeBtn.contains(e.target)) {
                this.setActiveTab(pane.id, tab.id);
            }
        });
        
        // Right-click to show context menu for page
        tabEl.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // Set context menu state for page editing (binId must be undefined, not null, for page edit)
            // Also store tab info so modal can update the tab's format
            if (this.app.appState && this.app.contextMenuHandler) {
                // Store tab info for modal to use
                this.app.appState._editingTabInfo = {
                    paneId: pane.id,
                    tabId: tab.id
                };
                
                // Use setContextMenuState if available, otherwise set directly
                if (this.app.appState.setContextMenuState) {
                    this.app.appState.setContextMenuState({
                        visible: true,
                        pageId: tab.pageId,
                        binId: undefined, // undefined (not null) indicates page edit
                        elementIndex: null,
                        subtaskIndex: null,
                        x: e.clientX,
                        y: e.clientY
                    });
                } else {
                    this.app.appState.contextMenuState = {
                        visible: true,
                        pageId: tab.pageId,
                        binId: undefined, // undefined (not null) indicates page edit
                        elementIndex: null,
                        subtaskIndex: null,
                        x: e.clientX,
                        y: e.clientY
                    };
                }
                
                // Show page context menu
                this.app.contextMenuHandler.showPageContextMenu(e, tab.pageId);
            }
        });
        
        // Drag and drop for tabs
        this.setupTabDragDrop(tabEl, pane, tab, index);
        
        return tabEl;
    }
    
    /**
     * Setup drag and drop for tab
     */
    setupTabDragDrop(tabEl, pane, tab, index) {
        let dragData = null;
        let edgeIndicator = null;
        
        tabEl.addEventListener('dragstart', (e) => {
            e.dataTransfer.effectAllowed = 'move';
            dragData = {
                type: 'tab',
                paneId: pane.id,
                tabId: tab.id,
                tabIndex: index
            };
            e.dataTransfer.setData('text/plain', JSON.stringify(dragData));
            tabEl.style.opacity = '0.5';
        });
        
        tabEl.addEventListener('dragend', (e) => {
            tabEl.style.opacity = '1';
            // Remove all drop indicators
            document.querySelectorAll('.tab-drop-indicator').forEach(el => el.remove());
            if (edgeIndicator) {
                edgeIndicator.remove();
                edgeIndicator = null;
            }
            dragData = null;
        });
        
        // Track drag over panes to detect edge splits
        document.addEventListener('dragover', (e) => {
            if (!dragData || dragData.type !== 'tab') return;
            
            // Find pane container under cursor
            const paneContainers = document.querySelectorAll('.pane-container');
            let targetPane = null;
            let targetPaneId = null;
            
            for (const container of paneContainers) {
                const rect = container.getBoundingClientRect();
                if (e.clientX >= rect.left && e.clientX <= rect.right &&
                    e.clientY >= rect.top && e.clientY <= rect.bottom) {
                    targetPaneId = container.dataset.paneId;
                    targetPane = this.panes.get(targetPaneId);
                    break;
                }
            }
            
            if (!targetPane || targetPaneId === dragData.paneId) {
                if (edgeIndicator) {
                    edgeIndicator.remove();
                    edgeIndicator = null;
                }
                return;
            }
            
            // Check if near edges
            const container = targetPane.container || targetPane.element;
            if (!container) return;
            
            const rect = container.getBoundingClientRect();
            const edgeThreshold = 50; // pixels from edge
            
            const nearLeft = e.clientX - rect.left < edgeThreshold;
            const nearRight = rect.right - e.clientX < edgeThreshold;
            const nearTop = e.clientY - rect.top < edgeThreshold;
            const nearBottom = rect.bottom - e.clientY < edgeThreshold;
            
            // Remove old indicator
            if (edgeIndicator) {
                edgeIndicator.remove();
                edgeIndicator = null;
            }
            
            // Show edge indicator and prepare for split
            if (nearLeft || nearRight || nearTop || nearBottom) {
                edgeIndicator = document.createElement('div');
                edgeIndicator.className = 'pane-split-indicator';
                edgeIndicator.style.cssText = `
                    position: fixed;
                    background: rgba(74, 158, 255, 0.3);
                    border: 2px solid #4a9eff;
                    z-index: 10000;
                    pointer-events: none;
                `;
                
                let direction = null;
                if (nearLeft) {
                    direction = 'left';
                    edgeIndicator.style.left = `${rect.left}px`;
                    edgeIndicator.style.top = `${rect.top}px`;
                    edgeIndicator.style.width = `${rect.width / 2}px`;
                    edgeIndicator.style.height = `${rect.height}px`;
                } else if (nearRight) {
                    direction = 'right';
                    edgeIndicator.style.left = `${rect.left + rect.width / 2}px`;
                    edgeIndicator.style.top = `${rect.top}px`;
                    edgeIndicator.style.width = `${rect.width / 2}px`;
                    edgeIndicator.style.height = `${rect.height}px`;
                } else if (nearTop) {
                    direction = 'up';
                    edgeIndicator.style.left = `${rect.left}px`;
                    edgeIndicator.style.top = `${rect.top}px`;
                    edgeIndicator.style.width = `${rect.width}px`;
                    edgeIndicator.style.height = `${rect.height / 2}px`;
                } else if (nearBottom) {
                    direction = 'down';
                    edgeIndicator.style.left = `${rect.left}px`;
                    edgeIndicator.style.top = `${rect.top + rect.height / 2}px`;
                    edgeIndicator.style.width = `${rect.width}px`;
                    edgeIndicator.style.height = `${rect.height / 2}px`;
                }
                
                if (direction) {
                    edgeIndicator.dataset.direction = direction;
                    edgeIndicator.dataset.targetPaneId = targetPaneId;
                    document.body.appendChild(edgeIndicator);
                }
            }
        });
        
        // Handle drop on edge to split
        document.addEventListener('drop', (e) => {
            if (!dragData || dragData.type !== 'tab') return;
            if (!edgeIndicator) return;
            
            const direction = edgeIndicator.dataset.direction;
            const targetPaneId = edgeIndicator.dataset.targetPaneId;
            
            if (direction && targetPaneId) {
                e.preventDefault();
                e.stopPropagation();
                
                // Determine split direction
                let splitDirection = 'vertical';
                if (direction === 'left' || direction === 'right') {
                    splitDirection = 'horizontal';
                }
                
                // Split the target pane
                const targetPane = this.panes.get(targetPaneId);
                if (targetPane) {
                    // Create new pane with the dragged tab's page
                    const sourcePane = this.panes.get(dragData.paneId);
                    const sourceTab = sourcePane?.tabs.find(t => t.id === dragData.tabId);
                    
                    if (sourceTab) {
                        // Split target pane
                        const newPaneId = this.splitPane(targetPaneId, null, splitDirection, sourceTab.pageId, sourceTab.format);
                        
                        // Move tab to new pane
                        if (newPaneId) {
                            const newPane = this.panes.get(newPaneId);
                            if (newPane && newPane.tabs.length > 0) {
                                // Replace the default tab with our moved tab
                                newPane.tabs[0] = sourceTab;
                                this.renderPane(newPane);
                                
                                // Remove tab from source pane
                                const sourceTabIndex = sourcePane.tabs.findIndex(t => t.id === dragData.tabId);
                                if (sourceTabIndex !== -1) {
                                    sourcePane.tabs.splice(sourceTabIndex, 1);
                                    
                                    // Close source pane if it's the last tab (unless locked)
                                    if (sourcePane.tabs.length === 0 && !sourcePane.locked) {
                                        this.closePane(dragData.paneId);
                                    } else {
                                        if (sourcePane.activeTabIndex >= sourcePane.tabs.length) {
                                            sourcePane.activeTabIndex = Math.max(0, sourcePane.tabs.length - 1);
                                        }
                                        this.renderPane(sourcePane);
                                    }
                                }
                            }
                        }
                    }
                }
                
                if (edgeIndicator) {
                    edgeIndicator.remove();
                    edgeIndicator = null;
                }
            }
        }, true); // Use capture phase
        
        // Allow dropping tabs on other tabs
        tabEl.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const dragData = e.dataTransfer.getData('text/plain');
            if (!dragData) return;
            
            let data;
            try {
                data = JSON.parse(dragData);
            } catch (err) {
                return;
            }
            
            if (data.type !== 'tab') return;
            
            // Show drop indicator
            this.showTabDropIndicator(tabEl, e);
            e.dataTransfer.dropEffect = 'move';
        });
        
        tabEl.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const dragData = e.dataTransfer.getData('text/plain');
            if (!dragData) return;
            
            let data;
            try {
                data = JSON.parse(dragData);
            } catch (err) {
                return;
            }
            
            if (data.type !== 'tab') return;
            
            this.moveTab(data.paneId, data.tabId, pane.id, tab.id, index);
            
            // Remove drop indicators
            document.querySelectorAll('.tab-drop-indicator').forEach(el => el.remove());
        });
        
        // Allow dropping tabs on pane headers (to move to different pane)
        const header = tabEl.closest('.pane-header');
        if (header) {
            header.addEventListener('dragover', (e) => {
                if (e.target.closest('.pane-tab')) return; // Handled by tab
                
                e.preventDefault();
                e.stopPropagation();
                
                const dragData = e.dataTransfer.getData('text/plain');
                if (!dragData) return;
                
                let data;
                try {
                    data = JSON.parse(dragData);
                } catch (err) {
                    return;
                }
                
                if (data.type !== 'tab') return;
                
                e.dataTransfer.dropEffect = 'move';
            });
            
            header.addEventListener('drop', (e) => {
                if (e.target.closest('.pane-tab')) return; // Handled by tab
                
                e.preventDefault();
                e.stopPropagation();
                
                const dragData = e.dataTransfer.getData('text/plain');
                if (!dragData) return;
                
                let data;
                try {
                    data = JSON.parse(dragData);
                } catch (err) {
                    return;
                }
                
                if (data.type !== 'tab') return;
                
                // Move tab to this pane
                this.moveTabToPane(data.paneId, data.tabId, pane.id);
                
                // Remove drop indicators
                document.querySelectorAll('.tab-drop-indicator').forEach(el => el.remove());
            });
        }
    }
    
    /**
     * Show drop indicator for tab
     */
    showTabDropIndicator(tabEl, e) {
        // Remove existing indicators
        document.querySelectorAll('.tab-drop-indicator').forEach(el => el.remove());
        
        const indicator = document.createElement('div');
        indicator.className = 'tab-drop-indicator';
        indicator.style.cssText = `
            position: absolute;
            top: 0;
            bottom: 0;
            width: 2px;
            background: #4a9eff;
            z-index: 1000;
            pointer-events: none;
        `;
        
        const rect = tabEl.getBoundingClientRect();
        const x = e.clientX - rect.left;
        
        if (x < rect.width / 2) {
            // Insert before
            indicator.style.left = '0';
            tabEl.style.position = 'relative';
            tabEl.appendChild(indicator);
        } else {
            // Insert after
            indicator.style.right = '0';
            tabEl.style.position = 'relative';
            tabEl.appendChild(indicator);
        }
    }
    
    /**
     * Move a tab within or between panes
     */
    moveTab(sourcePaneId, tabId, targetPaneId, targetTabId, targetIndex) {
        const sourcePane = this.panes.get(sourcePaneId);
        const targetPane = this.panes.get(targetPaneId);
        if (!sourcePane || !targetPane) return;
        
        const tabIndex = sourcePane.tabs.findIndex(t => t.id === tabId);
        if (tabIndex === -1) return;
        
        const tab = sourcePane.tabs[tabIndex];
        
        // If moving to same pane, just reorder
        if (sourcePaneId === targetPaneId) {
            sourcePane.tabs.splice(tabIndex, 1);
            const newIndex = targetIndex < tabIndex ? targetIndex : targetIndex + 1;
            sourcePane.tabs.splice(newIndex, 0, tab);
            sourcePane.activeTabIndex = newIndex;
            this.renderPane(sourcePane);
        } else {
            // Move to different pane
            sourcePane.tabs.splice(tabIndex, 1);
            
            // Close source pane if it's the last tab (unless locked)
            if (sourcePane.tabs.length === 0 && !sourcePane.locked) {
                this.closePane(sourcePaneId);
            } else {
                if (sourcePane.activeTabIndex >= sourcePane.tabs.length) {
                    sourcePane.activeTabIndex = Math.max(0, sourcePane.tabs.length - 1);
                }
                this.renderPane(sourcePane);
            }
            
            const targetTabIndex = targetPane.tabs.findIndex(t => t.id === targetTabId);
            const insertIndex = targetTabIndex !== -1 ? targetTabIndex : targetIndex;
            targetPane.tabs.splice(insertIndex, 0, tab);
            targetPane.activeTabIndex = insertIndex;
            this.renderPane(targetPane);
        }
    }
    
    /**
     * Move a tab to a different pane (append to end)
     */
    moveTabToPane(sourcePaneId, tabId, targetPaneId) {
        const sourcePane = this.panes.get(sourcePaneId);
        const targetPane = this.panes.get(targetPaneId);
        if (!sourcePane || !targetPane) return;
        
        const tabIndex = sourcePane.tabs.findIndex(t => t.id === tabId);
        if (tabIndex === -1) return;
        
        const tab = sourcePane.tabs[tabIndex];
        sourcePane.tabs.splice(tabIndex, 1);
        
        // Close source pane if it's the last tab (unless locked)
        if (sourcePane.tabs.length === 0 && !sourcePane.locked) {
            this.closePane(sourcePaneId);
        } else {
            if (sourcePane.activeTabIndex >= sourcePane.tabs.length) {
                sourcePane.activeTabIndex = Math.max(0, sourcePane.tabs.length - 1);
            }
            // Re-render source pane
            this.renderPane(sourcePane);
        }
        
        targetPane.tabs.push(tab);
        targetPane.activeTabIndex = targetPane.tabs.length - 1;
        
        // Re-render target pane
        this.renderPane(targetPane);
    }
    
    /**
     * Close a pane
     */
    closePane(paneId) {
        const pane = this.panes.get(paneId);
        if (!pane) return;
        
        // If this is the last pane, don't close it
        if (this.panes.size === 1) {
            return;
        }
        
        // Remove from DOM
        if (pane.element && pane.element.parentNode) {
            const parent = pane.element.parentNode;
            
            // If parent is a split container, remove it and keep the other pane
            if (parent.classList.contains('pane-split-container')) {
                const siblingPane = Array.from(parent.children).find(
                    child => child.dataset.paneId !== paneId
                );
                
                if (siblingPane) {
                    const siblingPaneId = siblingPane.dataset.paneId;
                    const siblingPaneData = this.panes.get(siblingPaneId);
                    
                    // Replace split container with sibling pane
                    if (parent.parentNode) {
                        parent.parentNode.replaceChild(siblingPane, parent);
                        siblingPaneData.element = siblingPane;
                        siblingPaneData.parent = parent.parentNode === this.rootLayout ? null : parent.parentNode;
                        siblingPaneData.size = 100;
                        siblingPane.style.flex = '1';
                        siblingPane.style.border = 'none';
                    }
                }
            } else {
                pane.element.remove();
            }
        }
        
        // Remove from map
        this.panes.delete(paneId);
        
        // Emit event
        eventBus.emit('pane:closed', { paneId });
        
        // Re-render if needed
        if (this.panes.size > 0) {
            this.app.render();
        }
    }
    
    /**
     * Get all panes
     */
    getAllPanes() {
        return Array.from(this.panes.values());
    }
    
    /**
     * Get pane by ID
     */
    getPane(paneId) {
        return this.panes.get(paneId);
    }
    
    /**
     * Show dialog to add a new tab (page and format selector)
     */
    showAddTabDialog(paneId) {
        const pane = this.panes.get(paneId);
        if (!pane) return;
        
        // Get all available formats that support pages
        const allFormats = [];
        if (this.app.formatRendererManager) {
            const formats = this.app.formatRendererManager.getAllFormats();
            formats.forEach(format => {
                // Only include formats that support pages
                if (format.supportsPages !== false) {
                    const formatName = format.formatName || format.id;
                    allFormats.push({ 
                        id: formatName, 
                        name: format.name || format.formatLabel || formatName 
                    });
                }
            });
        }
        
        // Create modal for selecting page and format
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.7);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        
        const dialog = document.createElement('div');
        dialog.style.cssText = `
            background: #2a2a2a;
            border: 1px solid #3a3a3a;
            border-radius: 8px;
            padding: 20px;
            min-width: 400px;
            max-width: 600px;
        `;
        
        dialog.innerHTML = `
            <h3 style="margin: 0 0 20px 0; color: #ffffff;">Add Tab</h3>
            <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 8px; color: #dcddde;">Page:</label>
                <select id="add-tab-page-select" style="width: 100%; padding: 8px; background: #1a1a1a; color: #dcddde; border: 1px solid #3a3a3a; border-radius: 4px;">
                    ${this.app.appState.pages.map(page => 
                        `<option value="${page.id}">${page.title || page.id}</option>`
                    ).join('')}
                </select>
            </div>
            <div style="margin-bottom: 20px;">
                <label style="display: block; margin-bottom: 8px; color: #dcddde;">Format:</label>
                <select id="add-tab-format-select" style="width: 100%; padding: 8px; background: #1a1a1a; color: #dcddde; border: 1px solid #3a3a3a; border-radius: 4px;">
                    <option value="">Default</option>
                    ${allFormats.map(format => 
                        `<option value="${format.id}">${format.name}</option>`
                    ).join('')}
                </select>
            </div>
            <div style="display: flex; gap: 10px; justify-content: flex-end;">
                <button id="add-tab-cancel" style="padding: 8px 16px; background: #3a3a3a; color: #dcddde; border: none; border-radius: 4px; cursor: pointer;">Cancel</button>
                <button id="add-tab-ok" style="padding: 8px 16px; background: #4a9eff; color: white; border: none; border-radius: 4px; cursor: pointer;">Add Tab</button>
            </div>
        `;
        
        modal.appendChild(dialog);
        document.body.appendChild(modal);
        
        // Set default to current page
        const pageSelect = dialog.querySelector('#add-tab-page-select');
        const formatSelect = dialog.querySelector('#add-tab-format-select');
        if (pageSelect && this.app.appState.currentPageId) {
            pageSelect.value = this.app.appState.currentPageId;
        }
        
        // Set default format to active tab's format or page format
        if (formatSelect && pane.tabs.length > 0) {
            const activeTab = pane.tabs[pane.activeTabIndex];
            if (activeTab && activeTab.format) {
                formatSelect.value = activeTab.format;
            } else {
                // Try to get page format
                const selectedPageId = pageSelect.value;
                const pageFormat = this.app.formatRendererManager?.getPageFormat(selectedPageId);
                if (pageFormat) {
                    formatSelect.value = pageFormat;
                }
            }
        }
        
        // Update format options when page changes
        if (pageSelect && formatSelect) {
            pageSelect.addEventListener('change', () => {
                const selectedPageId = pageSelect.value;
                const pageFormat = this.app.formatRendererManager?.getPageFormat(selectedPageId);
                if (pageFormat) {
                    formatSelect.value = pageFormat;
                }
            });
        }
        
        // Cancel button
        dialog.querySelector('#add-tab-cancel').addEventListener('click', () => {
            document.body.removeChild(modal);
        });
        
        // OK button
        dialog.querySelector('#add-tab-ok').addEventListener('click', () => {
            const pageId = pageSelect.value;
            const format = formatSelect.value || null;
            
            // Check if this page+format combination already exists in this pane
            const existingTab = pane.tabs.find(t => t.pageId === pageId && t.format === format);
            if (existingTab) {
                // Switch to existing tab instead
                this.setActiveTab(pane.id, existingTab.id);
            } else {
                // Add new tab
                this.addTabToPane(pane.id, pageId, format);
            }
            
            document.body.removeChild(modal);
        });
        
        // Close on background click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
        
        // Close on Escape key
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                document.body.removeChild(modal);
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);
    }
    
    /**
     * Preserve scroll positions for a pane and all its scrollable children
     */
    preserveScrollPositions(pane) {
        const positions = {
            container: {},
            content: {},
            bins: {},
            elements: {}
        };
        
        // Preserve pane container scroll
        if (pane.container) {
            positions.container = {
                scrollTop: pane.container.scrollTop,
                scrollLeft: pane.container.scrollLeft
            };
        }
        
        // Preserve content container scroll
        const content = pane.container?.querySelector('.pane-content');
        if (content) {
            positions.content = {
                scrollTop: content.scrollTop,
                scrollLeft: content.scrollLeft
            };
        }
        
        // Preserve bin scroll positions (for bins with max-height)
        const bins = pane.container?.querySelectorAll('.bin-content');
        if (bins) {
            bins.forEach(binContent => {
                const binId = binContent.closest('.bin')?.dataset.binId;
                if (binId) {
                    positions.bins[binId] = {
                        scrollTop: binContent.scrollTop,
                        scrollLeft: binContent.scrollLeft
                    };
                }
            });
        }
        
        // Preserve any other scrollable elements (like nested containers)
        const scrollables = pane.container?.querySelectorAll('[style*="overflow"], [style*="overflow-y"], [style*="overflow-x"]');
        if (scrollables) {
            scrollables.forEach((el, index) => {
                const key = el.dataset.binId || el.dataset.elementIndex || `scrollable-${index}`;
                if (el.scrollTop > 0 || el.scrollLeft > 0) {
                    positions.elements[key] = {
                        scrollTop: el.scrollTop,
                        scrollLeft: el.scrollLeft
                    };
                }
            });
        }
        
        return positions;
    }
    
    /**
     * Restore scroll positions for a pane and all its scrollable children
     */
    restoreScrollPositions(pane, positions) {
        if (!positions) return;
        
        // Restore pane container scroll
        if (pane.container && positions.container) {
            pane.container.scrollTop = positions.container.scrollTop || 0;
            pane.container.scrollLeft = positions.container.scrollLeft || 0;
        }
        
        // Restore content container scroll
        const content = pane.container?.querySelector('.pane-content');
        if (content && positions.content) {
            content.scrollTop = positions.content.scrollTop || 0;
            content.scrollLeft = positions.content.scrollLeft || 0;
        }
        
        // Restore bin scroll positions
        if (positions.bins) {
            Object.keys(positions.bins).forEach(binId => {
                const binContent = pane.container?.querySelector(`.bin[data-bin-id="${binId}"] .bin-content`);
                if (binContent && positions.bins[binId]) {
                    binContent.scrollTop = positions.bins[binId].scrollTop || 0;
                    binContent.scrollLeft = positions.bins[binId].scrollLeft || 0;
                }
            });
        }
        
        // Restore other scrollable elements
        if (positions.elements) {
            Object.keys(positions.elements).forEach(key => {
                let element = null;
                if (key.startsWith('scrollable-')) {
                    const index = parseInt(key.replace('scrollable-', ''));
                    const scrollables = pane.container?.querySelectorAll('[style*="overflow"], [style*="overflow-y"], [style*="overflow-x"]');
                    if (scrollables && scrollables[index]) {
                        element = scrollables[index];
                    }
                } else {
                    element = pane.container?.querySelector(`[data-bin-id="${key}"], [data-element-index="${key}"]`);
                }
                
                if (element && positions.elements[key]) {
                    element.scrollTop = positions.elements[key].scrollTop || 0;
                    element.scrollLeft = positions.elements[key].scrollLeft || 0;
                }
            });
        }
    }
}


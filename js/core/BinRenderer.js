// BinRenderer.js - Handles bin rendering
// Extracted from app.js to improve modularity
import { eventBus } from './EventBus.js';
import { EventHelper } from '../utils/EventHelper.js';
import { ItemHierarchy } from '../utils/ItemHierarchy.js';
import { ViewportRenderer } from './ViewportRenderer.js';
import { viewportConfig } from './ViewportConfig.js';
import { activeSetManager } from './ActiveSetManager.js';
import { getService, SERVICES } from './AppServices.js';
import { BinLayout } from '../utils/BinLayout.js';
import { BinRenderUtils } from '../utils/BinRenderUtils.js';
import { BinInteractions } from '../utils/BinInteractions.js';
import { BinStyling } from '../utils/BinStyling.js';

/**
 * BinRenderer - Handles rendering of bins
 * 
 * This class extracts bin rendering logic from app.js to improve modularity.
 */
export class BinRenderer {
    constructor(app) {
        this.app = app;
        this.interactions = new BinInteractions(app);
    }
    
    /**
     * Calculate drop position for drag-drop operations
     * Works with both virtualized and non-virtualized lists
     * @param {HTMLElement} elementsList - The elements list container
     * @param {number} mouseY - Mouse Y position (clientY)
     * @param {Array} items - Items array (rootItems for virtualized, bin.items for non-virtualized)
     * @param {Object} bin - Bin data object
     * @returns {Object} - { insertIndex, targetElement }
     */
    _calculateDropPosition(elementsList, mouseY, items, bin) {
        return BinLayout.calculateDropPosition(elementsList, mouseY, items, bin);
    }
    
    /**
     * Render a bin element
     * @param {string} pageId - Page ID
     * @param {Object} bin - Bin data object
     * @returns {HTMLElement} The rendered bin element
     */
    async renderBin(pageId, bin) {
        // Create bin element
        const binDiv = BinRenderUtils.createBinElement(bin, pageId);
        
        // Check if document is loaded (for lazy loading support)
        const appState = getService(SERVICES.APP_STATE);
        let page = appState?.documents?.find(p => p.id === pageId);
        
        // If page is metadata-only or doesn't have groups, try to load it
        if (activeSetManager.config.isEnabled() && (!page || !page.groups)) {
            // Document might not be loaded - trigger loading
            const loadedPage = await activeSetManager.getDocument(pageId);
            if (loadedPage) {
                page = loadedPage;
                // Update bin from loaded page
                const loadedBin = page.groups?.find(g => g.id === bin.id);
                if (loadedBin) {
                    bin = loadedBin;
                }
            } else {
                // Show loading indicator if document can't be loaded
                const loadingDiv = BinRenderUtils.createLoadingIndicator();
                binDiv.appendChild(loadingDiv);
                return binDiv;
            }
        }
        
        // Apply visual settings for this bin
        if (this.app.visualSettingsManager) {
            const viewFormat = page?.format || 'default';
            BinStyling.applyBinStyles(binDiv, bin, pageId, this.app.visualSettingsManager, viewFormat);
        }
        
        // Initialize bin state if not set (default to expanded)
        if (!(bin.id in this.app.appState.groupStates)) {
            this.app.appState.groupStates[bin.id] = true;
        }
        const isExpanded = this.app.appState.groupStates[bin.id];
        
        // Create header and content
        const header = BinRenderUtils.createBinHeader(bin, isExpanded);
        const binContent = BinRenderUtils.createBinContent(bin, isExpanded);
        const binToggleId = `bin-toggle-${bin.id}`;
        const binContentId = `bin-content-${bin.id}`;
        
        // Create elements list
        const elementsList = BinRenderUtils.createElementList(bin);
        
        // Ensure bin.items exists and is an array
        const items = bin.items || [];
        if (!Array.isArray(items)) {
            console.warn('bin.items is not an array:', items, 'for bin:', bin.id);
        }
        bin.items = items;

        const rootItems = ItemHierarchy.getRootItems(items);
        
        // Use viewport rendering for large lists (50+ items)
        const virtualScroller = ViewportRenderer.renderViewport(
            elementsList,
            rootItems,
            (element, elIndex) => {
                return this.app.renderService.getRenderer().renderElement(pageId, bin.id, element, elIndex);
            },
            {
                threshold: 50 // Use virtualization for 50+ items
            }
        );
        
        // Store virtual scroller reference
        if (virtualScroller) {
            elementsList._virtualScroller = virtualScroller;
        }
        
        // Create add element button
        const addElementBtn = BinRenderUtils.createAddElementButton(() => {
            this.app.modalHandler.showAddElementModal(pageId, bin.id);
        });
        
        // Setup interactions
        binDiv.addEventListener('click', (e) => {
            this.interactions.handleBinClick(bin, pageId, e);
        });
        
        // Setup title editing
        const titleElement = header.querySelector('.bin-title');
        if (titleElement) {
            this.interactions.setupBinTitleEditing(titleElement, bin, pageId, this.app.appState.doubleClickDelay);
        }
        
        // Setup double-click for context menu (if handler exists)
        if (typeof handleBinMenu === 'function') {
            this.interactions.setupBinDoubleClick(binDiv, handleBinMenu, this.app.appState.doubleClickDelay);
        }
        
        // Apply bin structure
        BinRenderUtils.applyBinStructure(binDiv, header, binContent, elementsList, addElementBtn);
        
        // Emit bin:render event for plugins (after DOM is ready)
        setTimeout(() => {
            if (this.app.eventBus) {
                this.app.eventBus.emit('bin:render', {
                    binElement: binDiv,
                    pageId: pageId,
                    binData: bin
                });
            }
        }, 0);
        
        // Toggle handler for bin collapse/expand
        const toggleArrow = header.querySelector(`#${binToggleId}`);
        if (toggleArrow) {
            toggleArrow.addEventListener('click', (e) => {
                e.stopPropagation();
                this.interactions.handleBinExpandCollapse(bin, pageId, toggleArrow, binContent);
            });
        }
        
        // Drag and drop handlers for bins
        binDiv.addEventListener('dragstart', (e) => {
            this.interactions.handleBinDragStart(bin, pageId, e, binDiv);
        });
        
        binDiv.addEventListener('dragend', (e) => {
            this.interactions.handleBinDragEnd(bin, pageId, e, binDiv);
        });
        
        binDiv.addEventListener('dragover', (e) => {
            this.interactions.handleBinDragOver(bin, pageId, e, binDiv);
        });
        
        binDiv.addEventListener('dragleave', (e) => {
            this.interactions.handleBinDragLeave(bin, pageId, e, binDiv);
        });
        
        binDiv.addEventListener('drop', (e) => {
            this.interactions.handleBinDrop(bin, pageId, e, binDiv);
        });
        
        // Setup element list drop handlers with visual indicators
        this.interactions.setupElementListDropHandlers(
            elementsList,
            bin,
            pageId,
            (elementsList, mouseY, items, bin) => this._calculateDropPosition(elementsList, mouseY, items, bin)
        );
        
        return binDiv;
    }
}


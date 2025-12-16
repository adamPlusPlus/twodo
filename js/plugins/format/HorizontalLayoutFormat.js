// HorizontalLayoutFormat.js - Horizontal bin layout format renderer
import { BaseFormatRenderer } from '../../core/BaseFormatRenderer.js';

export default class HorizontalLayoutFormat extends BaseFormatRenderer {
    constructor(app = null) {
        super({
            id: 'horizontal-layout-format',
            name: 'Horizontal Layout',
            formatName: 'horizontal-layout-format',
            description: 'Display bins horizontally in a scrollable row with identical functionality to default view.',
            supportsPages: true,
            defaultConfig: {
                enabled: false
            }
        });
        if (app) {
            this.app = app;
        }
    }
    
    async onInit() {
        // console.log(`${this.name} format renderer initialized.`);
    }
    
    /**
     * Render a page in Horizontal format
     * @param {HTMLElement} container - Container element
     * @param {Object} page - Page data
     * @param {Object} options - Options with app reference
     */
    renderPage(container, page, options = {}) {
        const app = options.app || this.app;
        if (!app) return;
        
        // Apply horizontal layout CSS (always apply, even when preserving format)
        container.style.cssText = `
            display: flex;
            flex-direction: row;
            overflow-x: auto;
            gap: 20px;
            padding: 20px;
            background: #1a1a1a;
            min-height: calc(100vh - 100px);
        `;
        
        if (!page.bins || page.bins.length === 0) {
            if (!app._preservingFormat) {
                container.innerHTML = '<p style="color: #888; padding: 20px;">No bins available. Add bins to see them in horizontal layout.</p>';
            }
            return;
        }
        
        // When preserving format, update existing bins instead of creating new ones
        if (app._preservingFormat && container.children.length > 0) {
            // Update existing bins - find and update each bin
            page.bins.forEach((bin) => {
                const existingBin = container.querySelector(`[data-bin-id="${bin.id}"]`);
                if (existingBin) {
                    // Bin already exists - remove it and re-render to update content
                    existingBin.remove();
                }
                // Render the bin (will be added below)
                const binEl = app.renderBin(page.id, bin);
                // Add min-width to bins in horizontal layout to prevent squishing
                binEl.style.minWidth = '350px';
                binEl.style.maxWidth = '450px';
                container.appendChild(binEl);
            });
            
            // Remove bins that no longer exist
            const existingBins = container.querySelectorAll('.bin');
            existingBins.forEach(binEl => {
                const binId = binEl.dataset.binId;
                if (!page.bins.find(b => b.id === binId)) {
                    binEl.remove();
                }
            });
        } else {
            // First render or format changed - clear and render
            container.innerHTML = '';
            // Render each bin using the same renderBin method as default view
            // This ensures identical behavior and functionality
            page.bins.forEach((bin) => {
                const binEl = app.renderBin(page.id, bin);
                // Add min-width to bins in horizontal layout to prevent squishing
                binEl.style.minWidth = '350px';
                binEl.style.maxWidth = '450px';
                container.appendChild(binEl);
            });
        }
        
        // Emit page:render event for plugins (after a short delay to ensure DOM is ready)
        setTimeout(() => {
            if (app.eventBus && page) {
                app.eventBus.emit('page:render', {
                    pageElement: container,
                    pageData: page
                });
            }
        }, 0);
        
        // Reset format preservation flag
        app._preservingFormat = false;
    }
}


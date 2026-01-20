// GridLayoutFormat.js - Grid layout format renderer
import { BaseFormatRenderer } from '../../core/BaseFormatRenderer.js';

export default class GridLayoutFormat extends BaseFormatRenderer {
    constructor(app = null) {
        super({
            id: 'grid-layout-format',
            name: 'Grid Layout',
            formatName: 'grid-layout-format',
            description: 'Display groups in a grid layout with identical functionality to default view.',
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
     * Render a page in Grid format
     * @param {HTMLElement} container - Container element
     * @param {Object} page - Page data
     * @param {Object} options - Options with app reference
     */
    renderPage(container, page, options = {}) {
        const app = options.app || this.app;
        if (!app) return;
        
        // Get grid configuration from page.formatConfig or use defaults
        const gridConfig = page.formatConfig?.grid || {};
        const minColumnWidth = gridConfig.minColumnWidth || 350;
        const gap = gridConfig.gap || 20;
        const padding = gridConfig.padding || 20;
        const maxHeight = gridConfig.maxHeight || null;
        
        // Apply grid layout CSS (always apply, even when preserving format)
        let cssText = `
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(${minColumnWidth}px, 1fr));
            gap: ${gap}px;
            padding: ${padding}px;
            background: var(--bg-color, #1a1a1a);
            background-image: var(--background-texture, none);
            background-size: 100px 100px;
            min-height: calc(100vh - 100px);
            font-family: var(--page-font-family);
            color: var(--page-color);
        `;
        
        if (maxHeight) {
            cssText += `
            max-height: ${maxHeight}px;
            overflow-y: auto;
            `;
        }
        
        container.style.cssText = cssText;
        
        const groups = page.groups || [];
        if (!groups.length) {
            if (!app._preservingFormat) {
                container.innerHTML = `<p style="color: var(--header-color, #888); padding: 20px; font-family: var(--page-font-family);">No groups available. Add groups to see them in grid layout.</p>`;
            }
            return;
        }
        
        // When preserving format, update existing bins instead of creating new ones
        if (app._preservingFormat && container.children.length > 0) {
            // Update existing bins - find and update each bin
            groups.forEach((bin) => {
                const existingBin = container.querySelector(`[data-bin-id="${bin.id}"]`);
                if (existingBin) {
                    // Bin already exists - remove it and re-render to update content
                    existingBin.remove();
                }
                // Render the bin (will be added below)
                const binElement = app.renderBin(page.id, bin);
                container.appendChild(binElement);
            });
            
            // Remove bins that no longer exist
            const existingBins = container.querySelectorAll('.bin');
            existingBins.forEach(binElement => {
                const binId = binElement.dataset.binId;
                if (!groups.find(b => b.id === binId)) {
                    binElement.remove();
                }
            });
        } else {
            // First render or format changed - clear and render
            container.innerHTML = '';
            // Render each bin using the same renderBin method as default view
            // This ensures identical behavior and functionality
            groups.forEach((bin) => {
                const binElement = app.renderBin(page.id, bin);
                container.appendChild(binElement);
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


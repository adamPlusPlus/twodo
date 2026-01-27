// KanbanColumnRenderer.js - Renders Kanban columns (bins as columns)
import { DOMUtils } from '../../../utils/dom.js';
import { StringUtils } from '../../../utils/string.js';
import { ViewportRenderer } from '../../../core/ViewportRenderer.js';

export class KanbanColumnRenderer {
    constructor(formatRenderer) {
        this.formatRenderer = formatRenderer;
    }
    
    /**
     * Render a bin as a Kanban column
     * @param {Object} bin - Bin data
     * @param {string} pageId - Page ID
     * @param {Object} app - App instance
     * @param {Function} renderCardFn - Function to render cards
     * @param {Function} setupDropZoneFn - Function to setup drop zone
     * @returns {HTMLElement} Column element
     */
    renderColumn(bin, pageId, app, renderCardFn, setupDropZoneFn) {
        const column = DOMUtils.createElement('div', {
            class: 'kanban-column',
            'data-page-id': pageId,
            'data-bin-id': bin.id
        });
        
        column.style.cssText = `
            flex: 0 0 300px;
            background: var(--page-bg, #2a2a2a);
            background-image: var(--page-texture, none);
            background-size: 100px 100px;
            box-shadow: var(--page-shadow, none);
            border-radius: var(--page-border-radius, 8px);
            padding: var(--page-padding, 15px);
            display: flex;
            flex-direction: column;
            gap: 10px;
            max-height: calc(100vh - 150px);
            font-family: var(--page-font-family);
            color: var(--page-color);
        `;
        
        // Column header
        const header = this._renderHeader(bin);
        column.appendChild(header);
        
        // Column content (drop zone)
        const content = this._renderContent(bin, pageId, app, renderCardFn, setupDropZoneFn);
        column.appendChild(content);
        
        // Add element button
        const addBtn = this._renderAddButton(pageId, bin.id, app);
        column.appendChild(addBtn);
        
        return column;
    }
    
    /**
     * Render column header
     * @private
     */
    _renderHeader(bin) {
        const header = DOMUtils.createElement('div', {
            class: 'kanban-column-header'
        });
        
        header.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding-bottom: 10px;
            border-bottom: 2px solid #4a9eff;
            margin-bottom: 10px;
        `;
        
        const title = DOMUtils.createElement('h3', {
            style: `color: var(--page-title-color, #e0e0e0); margin: 0; font-size: var(--page-title-font-size, 16px); font-weight: 600;`
        }, StringUtils.escapeHtml(bin.title || 'Untitled'));
        
        const items = this.formatRenderer._getItems(bin);
        const count = DOMUtils.createElement('span', {
            class: 'kanban-column-count',
            style: `background: var(--bg-color, #1a1a1a); padding: 4px 10px; border-radius: 12px; font-size: 12px; color: var(--header-color, #888);`
        }, items.length.toString());
        
        header.appendChild(title);
        header.appendChild(count);
        return header;
    }
    
    /**
     * Render column content
     * @private
     */
    _renderContent(bin, pageId, app, renderCardFn, setupDropZoneFn) {
        const content = DOMUtils.createElement('div', {
            class: 'kanban-column-content',
            'data-page-id': pageId,
            'data-bin-id': bin.id
        });
        
        content.style.cssText = `
            flex: 1;
            min-height: 200px;
            padding: 10px 0;
            overflow-y: auto;
            max-height: calc(100vh - 250px);
        `;
        
        // Render items as cards with viewport rendering for large lists
        const items = this.formatRenderer._getItems(bin);
        if (items.length > 0) {
            // Use viewport rendering for 50+ items
            const virtualScroller = ViewportRenderer.renderViewport(
                content,
                items,
                renderCardFn,
                {
                    threshold: 50
                }
            );
            
            // Store virtual scroller reference
            if (virtualScroller) {
                content._virtualScroller = virtualScroller;
            }
        } else {
            // Empty state
            const emptyState = DOMUtils.createElement('div', {
                style: `text-align: center; color: var(--header-color, #666); padding: 20px; font-size: var(--element-font-size, 12px);`
            }, 'No items');
            content.appendChild(emptyState);
        }
        
        // Make column droppable
        if (setupDropZoneFn) {
            setupDropZoneFn(content, pageId, bin.id, app);
        }
        
        return content;
    }
    
    /**
     * Render add element button
     * @private
     */
    _renderAddButton(pageId, binId, app) {
        const addBtn = DOMUtils.createElement('button', {
            class: 'kanban-add-element-btn',
            style: `padding: 8px; background: var(--bg-color, #1a1a1a); color: var(--header-color, #888); border: 1px dashed #555; border-radius: 4px; cursor: pointer; width: 100%; margin-top: 5px; font-family: var(--element-font-family); font-size: var(--element-font-size);`
        }, '+ Add Element');
        
        addBtn.addEventListener('click', () => {
            if (app.modalHandler) {
                app.modalHandler.showAddElementModal(pageId, binId);
            }
        });
        
        return addBtn;
    }
}

// TrelloBoardFormat - Format renderer for Trello-style board view
import { BaseFormatRenderer } from '../../core/BaseFormatRenderer.js';
import { DOMUtils } from '../../utils/dom.js';
import { StringUtils } from '../../utils/string.js';

export default class TrelloBoardFormat extends BaseFormatRenderer {
    constructor(app = null, config = {}) {
        super({
            id: 'trello-board',
            name: 'Trello Board',
            version: '1.0.0',
            description: 'Trello-style board format with full-width columns',
            defaultConfig: {
                enabled: false,
                cardHeight: 'auto',
                showCardDetails: true
            },
            ...config
        });
        if (app) {
            this.app = app;
        }
    }
    
    async onInit() {
        // console.log(`${this.name} format renderer initialized.`);
    }
    
    /**
     * Render a page in Trello format
     * @param {HTMLElement} container - Container element
     * @param {Object} page - Page data
     * @param {Object} options - Options with app reference
     */
    renderPage(container, page, options = {}) {
        const app = options.app || this.app;
        if (!app) return;
        
        // Only clear if not preserving format (prevents flicker during drag operations)
        if (!app._preservingFormat) {
            container.innerHTML = '';
        }
        
        container.style.cssText = `
            display: flex;
            gap: 15px;
            padding: 20px;
            overflow-x: auto;
            min-height: calc(100vh - 100px);
            background: var(--bg-color, #1a1a1a);
            background-image: var(--background-texture, none);
            background-size: 100px 100px;
            font-family: var(--page-font-family);
            color: var(--page-color);
        `;
        
        if (!page.bins || page.bins.length === 0) {
            if (!app._preservingFormat) {
                container.innerHTML = `<p style="color: var(--header-color, #888); padding: 20px; font-family: var(--page-font-family);">No bins available. Add bins to see them as Trello columns.</p>`;
            }
            return;
        }
        
        // Render each bin as a column
        page.bins.forEach(bin => {
            const column = this.renderColumn(bin, page.id, app);
            container.appendChild(column);
        });
        
        // Reset format preservation flag
        app._preservingFormat = false;
    }
    
    renderColumn(bin, pageId, app) {
        const column = DOMUtils.createElement('div', {
            class: 'trello-column',
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
        const header = DOMUtils.createElement('div', {
            class: 'trello-column-header'
        });
        
        header.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding-bottom: 10px;
            border-bottom: 2px solid #4a9eff;
        `;
        
        const title = DOMUtils.createElement('h3', {
            style: `color: var(--page-title-color, #e0e0e0); margin: 0; font-size: var(--page-title-font-size, 16px); font-weight: 600;`
        }, StringUtils.escapeHtml(bin.title || 'Untitled'));
        
        const count = DOMUtils.createElement('span', {
            class: 'trello-column-count',
            style: `background: var(--bg-color, #1a1a1a); padding: 4px 10px; border-radius: 12px; font-size: var(--element-font-size, 12px); color: var(--header-color, #888);`
        }, (bin.elements?.length || 0).toString());
        
        header.appendChild(title);
        header.appendChild(count);
        column.appendChild(header);
        
        // Column content (scrollable)
        const content = DOMUtils.createElement('div', {
            class: 'trello-column-content'
        });
        
        content.style.cssText = `
            flex: 1;
            overflow-y: auto;
            overflow-x: hidden;
            padding: 5px 0;
        `;
        
        // Render cards
        if (bin.elements && bin.elements.length > 0) {
            bin.elements.forEach((element, index) => {
                const card = this.renderCard(element, pageId, bin.id, index, app);
                content.appendChild(card);
            });
        }
        
        // Add card button
        const addCardBtn = DOMUtils.createElement('button', {
            class: 'add-trello-card-btn',
            type: 'button'
        }, '+ Add Card');
        
        addCardBtn.style.cssText = `
            padding: 10px;
            background: transparent;
            color: var(--header-color, #888);
            border: none;
            border-radius: 4px;
            cursor: pointer;
            text-align: left;
            margin-top: 5px;
            font-family: var(--element-font-family);
            font-size: var(--element-font-size);
        `;
        
        addCardBtn.addEventListener('mouseenter', () => {
            addCardBtn.style.background = 'var(--bg-color, #1a1a1a)';
            addCardBtn.style.color = 'var(--element-color, #e0e0e0)';
        });
        
        addCardBtn.addEventListener('mouseleave', () => {
            addCardBtn.style.background = 'transparent';
            addCardBtn.style.color = 'var(--header-color, #888)';
        });
        
        addCardBtn.addEventListener('click', () => {
            if (app && app.modalHandler) {
                app.modalHandler.showAddElementModal(pageId, bin.id);
            }
        });
        
        column.appendChild(content);
        column.appendChild(addCardBtn);
        
        return column;
    }
    
    renderCard(element, pageId, binId, elementIndex, app) {
        const elementInteraction = new ElementInteraction(app);
        
        const card = DOMUtils.createElement('div', {
            class: 'trello-card',
            draggable: 'true',
            'data-page-id': pageId,
            'data-bin-id': binId,
            'data-element-index': elementIndex
        });
        
        // Use StyleHelper for style application
        StyleHelper.mergeStyles(card, {
            background: 'var(--element-bg, #1a1a1a)',
            backgroundImage: 'var(--element-texture, none)',
            backgroundSize: '50px 50px',
            boxShadow: 'var(--element-shadow, none)',
            borderLeft: '4px solid #4a9eff',
            borderRadius: 'var(--page-border-radius, 4px)',
            padding: 'var(--element-padding, 12px)',
            marginBottom: 'var(--element-gap, 10px)',
            cursor: 'move',
            transition: 'transform 0.2s, box-shadow 0.2s, transform 2.5s ease-out',
            fontFamily: 'var(--element-font-family)',
            fontSize: 'var(--element-font-size)',
            color: 'var(--element-color)',
            opacity: 'var(--element-opacity, 1)'
        });
        
        card.addEventListener('mouseenter', () => {
            card.style.transform = 'translateY(-2px)';
            card.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';
        });
        
        card.addEventListener('mouseleave', () => {
            card.style.transform = '';
            card.style.boxShadow = '';
        });
        
        // Card text with inline editing support
        const text = DOMUtils.createElement('div', {
            class: 'trello-card-text',
            style: `color: var(--element-color, #e0e0e0); font-size: var(--element-font-size, 14px); margin-bottom: 8px; line-height: 1.4; cursor: text; user-select: text;`
        });
        
        // Use parseLinks to handle HTML formatting consistently
        const textFragment = app && app.parseLinks ? app.parseLinks(element.text || 'Untitled') : document.createTextNode(element.text || 'Untitled');
        if (textFragment.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
            while (textFragment.firstChild) {
                text.appendChild(textFragment.firstChild);
            }
        } else {
            text.appendChild(textFragment);
        }
        
        // Enable inline editing on text click
        text.addEventListener('click', (e) => {
            // Don't enable editing if clicking on a link
            if (e.target.tagName === 'A') {
                return;
            }
            e.stopPropagation();
            if (app && app.enableInlineEditing) {
                app.enableInlineEditing(text, pageId, binId, elementIndex, element);
            }
        });
        
        card.appendChild(text);
        
        // Card metadata
        const metadata = DOMUtils.createElement('div', {
            class: 'trello-card-metadata',
            style: `display: flex; gap: 8px; align-items: center; margin-top: 8px; font-size: 11px; color: var(--header-color, #888);`
        });
        
        // Checkbox if applicable
        if (element.completed !== undefined) {
            const checkbox = DOMUtils.createElement('input', {
                type: 'checkbox',
                checked: element.completed || false,
                style: 'margin: 0;'
            });
            
            checkbox.addEventListener('change', (e) => {
                e.stopPropagation();
                if (!app) return;
                const page = app.pages.find(p => p.id === pageId);
                const bin = page?.bins?.find(b => b.id === binId);
                if (bin && bin.elements[elementIndex]) {
                    bin.elements[elementIndex].completed = e.target.checked;
                    app.dataManager.saveData();
                    app._preservingFormat = true;
                    app.render();
                }
            });
            
            metadata.appendChild(checkbox);
        }
        
        // Tags
        if (element.tags && element.tags.length > 0) {
            element.tags.forEach(tag => {
                const tagSpan = DOMUtils.createElement('span', {
                    style: 'background: #4a9eff; color: white; padding: 2px 6px; border-radius: 3px; font-size: 10px;'
                }, StringUtils.escapeHtml(tag));
                metadata.appendChild(tagSpan);
            });
        }
        
        if (metadata.children.length > 0) {
            card.appendChild(metadata);
        }
        
        // Double-click to edit
        card.addEventListener('dblclick', () => {
            if (app && app.modalHandler) {
                app.modalHandler.showEditModal(pageId, binId, elementIndex, element);
            }
        });
        
        // Setup drag handlers
        this.setupCardDrag(card, pageId, binId, elementIndex, app);
        
        return card;
    }
    
    setupCardDrag(card, pageId, binId, elementIndex, app) {
        card.addEventListener('dragstart', (e) => {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', JSON.stringify({
                type: 'element',
                pageId,
                binId,
                elementIndex
            }));
            card.style.opacity = '0.5';
            card.style.transition = 'opacity 0.2s';
        });
        
        card.addEventListener('dragend', (e) => {
            card.style.opacity = '1';
            // Enable smooth transitions for movement
            card.style.transition = 'transform 0.2s, box-shadow 0.2s, transform 2.5s ease-out, opacity 0.2s';
        });
    }
    
    renderSettingsUI() {
        return `
            <div>
                <label>
                    <input type="checkbox" id="trello-format-enabled" ${this.config.enabled ? 'checked' : ''}>
                    Enable Trello Board Format
                </label>
                <div style="margin-top: 15px;">
                    <label>Card Height:</label>
                    <select id="trello-card-height">
                        <option value="auto" ${this.config.cardHeight === 'auto' ? 'selected' : ''}>Auto</option>
                        <option value="fixed" ${this.config.cardHeight === 'fixed' ? 'selected' : ''}>Fixed</option>
                    </select>
                </div>
                <div style="margin-top: 10px;">
                    <label>
                        <input type="checkbox" id="trello-show-details" ${this.config.showCardDetails ? 'checked' : ''}>
                        Show Card Details
                    </label>
                </div>
            </div>
        `;
    }
    
    saveSettings(formData) {
        this.config.enabled = formData.get('trello-format-enabled') === 'on';
        this.config.cardHeight = formData.get('trello-card-height');
        this.config.showCardDetails = formData.get('trello-show-details') === 'on';
        console.log(`${this.name} settings saved:`, this.config);
    }
}


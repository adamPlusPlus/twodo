// CardRenderer.js - Standardized card rendering for Kanban/Trello views
// Provides unified card rendering logic to reduce duplication

import { DOMUtils } from './dom.js';
import { StyleHelper } from './StyleHelper.js';
import { SpecialElementRenderer } from './SpecialElementRenderer.js';
import { ElementInteraction } from './ElementInteraction.js';

export class CardRenderer {
    /**
     * Render a card for an element
     * @param {Object} element - Element data
     * @param {string} pageId - Page ID
     * @param {string} binId - Bin ID
     * @param {number} elementIndex - Element index
     * @param {Object} app - App instance
     * @param {Object} options - Rendering options
     * @param {string} options.cardClass - CSS class for card (default: 'kanban-card')
     * @param {Function} options.onCheckboxChange - Custom checkbox change handler
     * @param {Function} options.onTextClick - Custom text click handler
     * @param {boolean} options.showCheckbox - Whether to show checkbox (default: true if element supports it)
     * @param {Object} options.styleOverrides - Style overrides
     * @returns {HTMLElement} Rendered card element
     */
    static renderCard(element, pageId, binId, elementIndex, app, options = {}) {
        const {
            cardClass = 'kanban-card',
            onCheckboxChange = null,
            onTextClick = null,
            showCheckbox = true,
            styleOverrides = {}
        } = options;
        
        const elementInteraction = new ElementInteraction(app);
        
        // Create card container
        const card = DOMUtils.createElement('div', {
            class: cardClass,
            draggable: 'true',
            'data-page-id': pageId,
            'data-bin-id': binId,
            'data-element-index': elementIndex,
            'data-drag-type': 'element'
        });
        
        // Determine border color based on element state
        const borderColor = this._getBorderColor(element);
        
        // Apply card styles
        this.applyCardStyles(card, element, { borderColor, ...styleOverrides });
        
        // Setup hover effects
        card.addEventListener('mouseenter', () => {
            card.style.transform = 'translateY(-2px)';
            card.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';
        });
        
        card.addEventListener('mouseleave', () => {
            card.style.transform = '';
            card.style.boxShadow = '';
        });
        
        // Render card content
        const cardContent = this.renderCardContent(card, element, pageId, binId, elementIndex, app, {
            onCheckboxChange,
            onTextClick,
            showCheckbox
        });
        
        // Setup card interactions
        this.setupCardInteractions(card, element, pageId, binId, elementIndex, app);
        
        return card;
    }
    
    /**
     * Apply card styles
     * @param {HTMLElement} card - Card element
     * @param {Object} element - Element data
     * @param {Object} options - Style options
     * @param {string} options.borderColor - Border color
     */
    static applyCardStyles(card, element, options = {}) {
        const { borderColor = '#4a9eff', ...styleOverrides } = options;
        
        StyleHelper.mergeStyles(card, {
            background: 'var(--element-bg, #1a1a1a)',
            backgroundImage: 'var(--element-texture, none)',
            backgroundSize: '50px 50px',
            boxShadow: 'var(--element-shadow, none)',
            borderLeft: `4px solid ${borderColor}`,
            borderRadius: 'var(--page-border-radius, 4px)',
            padding: 'var(--element-padding, 12px)',
            marginBottom: 'var(--element-gap, 10px)',
            cursor: 'move',
            transition: 'transform 0.2s, box-shadow 0.2s',
            position: 'relative',
            fontFamily: 'var(--element-font-family)',
            fontSize: 'var(--element-font-size)',
            color: 'var(--element-color)',
            opacity: 'var(--element-opacity, 1)',
            ...styleOverrides
        });
    }
    
    /**
     * Render card content
     * @param {HTMLElement} card - Card element
     * @param {Object} element - Element data
     * @param {string} pageId - Page ID
     * @param {string} binId - Bin ID
     * @param {number} elementIndex - Element index
     * @param {Object} app - App instance
     * @param {Object} options - Rendering options
     * @returns {HTMLElement} Card content container
     */
    static renderCardContent(card, element, pageId, binId, elementIndex, app, options = {}) {
        const {
            onCheckboxChange = null,
            onTextClick = null,
            showCheckbox = true
        } = options;
        
        // Create card content wrapper
        const cardContent = DOMUtils.createElement('div', {
            style: 'display: flex; align-items: flex-start; gap: 8px;'
        });
        
        // Add checkbox if element supports it
        const supportsCompletion = element.type === 'task' || 
                                   element.type === 'header-checkbox' || 
                                   element.completed !== undefined;
        
        if (showCheckbox && supportsCompletion) {
            const isChecked = element.completed === true;
            const checkbox = DOMUtils.createElement('input', {
                type: 'checkbox',
                checked: isChecked,
                style: 'margin-top: 2px; flex-shrink: 0; cursor: pointer;'
            });
            
            checkbox.addEventListener('change', (e) => {
                e.stopPropagation();
                if (onCheckboxChange) {
                    onCheckboxChange(e, pageId, binId, elementIndex);
                } else {
                    // Default handler
                    const page = app.pages?.find(p => p.id === pageId) || 
                                app.appState?.pages?.find(p => p.id === pageId);
                    const bin = page?.bins?.find(b => b.id === binId);
                    if (bin && bin.elements[elementIndex]) {
                        bin.elements[elementIndex].completed = e.target.checked;
                        if (app.dataManager) {
                            app.dataManager.saveData();
                        }
                        if (app.render) {
                            app._preservingFormat = true;
                            app.render();
                        }
                    }
                }
            });
            
            cardContent.appendChild(checkbox);
        }
        
        // Create text container
        const textContainer = DOMUtils.createElement('div', {
            style: 'flex: 1; min-width: 0;'
        });
        
        // Check if this is a special element
        if (SpecialElementRenderer.isSpecialElement(element.type)) {
            // Render special element
            SpecialElementRenderer.renderSpecialElement(
                element,
                pageId,
                binId,
                elementIndex,
                app,
                textContainer,
                {
                    styleOverrides: {
                        flex: '1'
                    }
                }
            );
        } else {
            // Render regular element text
            const text = DOMUtils.createElement('div', {
                style: `color: ${element.completed ? '#888' : '#e0e0e0'}; font-size: 14px; line-height: 1.4; ${element.completed ? 'text-decoration: line-through;' : ''}; word-wrap: break-word; cursor: text; user-select: text;`
            });
            
            // Use parseLinks for consistent link handling
            const textFragment = app && app.parseLinks 
                ? app.parseLinks(element.text || 'Untitled') 
                : document.createTextNode(element.text || 'Untitled');
            
            if (textFragment.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
                while (textFragment.firstChild) {
                    text.appendChild(textFragment.firstChild);
                }
            } else {
                text.appendChild(textFragment);
            }
            
            // Setup text click handler
            if (onTextClick) {
                text.addEventListener('click', (e) => {
                    if (e.target.tagName !== 'A') {
                        e.stopPropagation();
                        onTextClick(e, pageId, binId, elementIndex, element);
                    }
                });
            } else if (app && app.enableInlineEditing) {
                text.addEventListener('click', (e) => {
                    if (e.target.tagName !== 'A') {
                        e.stopPropagation();
                        app.enableInlineEditing(text, pageId, binId, elementIndex, element);
                    }
                });
            }
            
            textContainer.appendChild(text);
        }
        
        cardContent.appendChild(textContainer);
        card.appendChild(cardContent);
        
        return cardContent;
    }
    
    /**
     * Setup card interactions (drag-drop, context menu, etc.)
     * @param {HTMLElement} card - Card element
     * @param {Object} element - Element data
     * @param {string} pageId - Page ID
     * @param {string} binId - Bin ID
     * @param {number} elementIndex - Element index
     * @param {Object} app - App instance
     */
    static setupCardInteractions(card, element, pageId, binId, elementIndex, app) {
        // Context menu
        card.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (app && app.showContextMenu) {
                app.showContextMenu(e, pageId, binId, elementIndex);
            }
        });
        
        // Drag handlers are typically handled by the format renderer
        // This method can be extended for additional interactions
    }
    
    /**
     * Get border color based on element state
     * @param {Object} element - Element data
     * @returns {string} Border color
     */
    static _getBorderColor(element) {
        if (element.completed) {
            return '#4caf50';
        } else if (element.type === 'header-checkbox') {
            return '#ffa500';
        } else if (element.deadline) {
            const deadline = new Date(element.deadline);
            const now = new Date();
            if (deadline < now) {
                return '#ff0000';
            } else if (deadline - now < 24 * 60 * 60 * 1000) {
                return '#ff6b6b';
            }
        }
        return '#4a9eff';
    }
}


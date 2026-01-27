// KanbanCardRenderer.js - Renders Kanban cards (elements as cards)
import { DOMUtils } from '../../../utils/dom.js';
import { StringUtils } from '../../../utils/string.js';
import { ItemHierarchy } from '../../../utils/ItemHierarchy.js';
import { StyleHelper } from '../../../utils/StyleHelper.js';
import { ElementInteraction } from '../../../utils/ElementInteraction.js';

export class KanbanCardRenderer {
    constructor(formatRenderer) {
        this.formatRenderer = formatRenderer;
    }
    
    /**
     * Render an element as a Kanban card
     * @param {Object} element - Element data
     * @param {string} pageId - Page ID
     * @param {string} binId - Bin ID
     * @param {number} elementIndex - Element index
     * @param {Object} app - App instance
     * @param {Function} renderCardFn - Recursive render function for child cards
     * @returns {HTMLElement} Card element
     */
    renderCard(element, pageId, binId, elementIndex, app, renderCardFn) {
        const elementInteraction = new ElementInteraction(app);
        
        const elementId = `${pageId}-${binId}-${elementIndex}`;
        const card = DOMUtils.createElement('div', {
            class: 'kanban-card',
            draggable: 'true',
            'data-page-id': pageId,
            'data-bin-id': binId,
            'data-element-index': elementIndex,
            'data-element-id': elementId,
            'data-item-id': element.id || null
        });
        
        // Determine border color based on element state and type
        const borderColor = this._calculateBorderColor(element);
        
        // Use StyleHelper for style application
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
            transition: 'transform 0.2s, box-shadow 0.2s, transform 2.5s ease-out',
            position: 'relative',
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
        
        // Card content wrapper
        const cardContent = DOMUtils.createElement('div', {
            style: 'display: flex; flex-direction: column; gap: 8px;'
        });
        
        // Main content row
        const mainRow = this._renderMainRow(element, pageId, binId, elementIndex, app);
        cardContent.appendChild(mainRow);
        
        // Progress bar if available
        if (element.progress !== undefined) {
            const progressBar = this._renderProgressBar(element);
            cardContent.appendChild(progressBar);
        }
        
        // Deadline indicator
        if (element.deadline) {
            const deadlineIndicator = this._renderDeadlineIndicator(element);
            cardContent.appendChild(deadlineIndicator);
        }
        
        // Child items (subitems)
        const childItems = this._getChildItems(element, pageId, binId, app);
        if (childItems.length > 0) {
            const childrenContainer = this._renderChildItems(childItems, pageId, binId, elementIndex, app, renderCardFn);
            cardContent.appendChild(childrenContainer);
        }
        
        // Relationships indicator
        if (element.relationships) {
            const relIndicator = this._renderRelationshipsIndicator(element);
            if (relIndicator) {
                cardContent.appendChild(relIndicator);
            }
        }
        
        // Element metadata (tags)
        if (element.tags && Array.isArray(element.tags) && element.tags.length > 0) {
            const tagsContainer = this._renderTags(element);
            cardContent.appendChild(tagsContainer);
        }
        
        card.appendChild(cardContent);
        
        return card;
    }
    
    /**
     * Calculate border color based on element state
     * @private
     */
    _calculateBorderColor(element) {
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
    
    /**
     * Render main content row (checkbox + text)
     * @private
     */
    _renderMainRow(element, pageId, binId, elementIndex, app) {
        const mainRow = DOMUtils.createElement('div', {
            style: 'display: flex; align-items: flex-start; gap: 8px;'
        });
        
        // Checkbox if element supports it
        if (element.completed !== undefined) {
            const checkbox = DOMUtils.createElement('input', {
                type: 'checkbox',
                checked: element.completed || false,
                style: 'margin-top: 2px; flex-shrink: 0;'
            });
            
            checkbox.addEventListener('change', (e) => {
                e.stopPropagation();
                const page = app.documents?.find(p => p.id === pageId) ||
                    app.appState?.documents?.find(p => p.id === pageId);
                const bin = page?.groups?.find(b => b.id === binId);
                const items = bin ? this.formatRenderer._getItems(bin) : [];
                if (items[elementIndex]) {
                    items[elementIndex].completed = e.target.checked;
                    app.dataManager.saveData();
                    // Preserve format during re-render
                    app._preservingFormat = true;
                    app.render();
                }
            });
            
            mainRow.appendChild(checkbox);
        }
        
        // Element text/content
        const textContainer = this._renderTextContent(element, pageId, binId, elementIndex, app);
        mainRow.appendChild(textContainer);
        
        return mainRow;
    }
    
    /**
     * Render text content (special elements or regular text)
     * @private
     */
    _renderTextContent(element, pageId, binId, elementIndex, app) {
        const textContainer = DOMUtils.createElement('div', {
            style: 'flex: 1; min-width: 0;'
        });
        
        // For special element types, render them using their renderers
        const specialElementTypes = ['timer', 'counter', 'tracker', 'rating', 'audio', 'image', 'time-log', 'calendar'];
        if (specialElementTypes.includes(element.type) && app.elementRenderer && app.elementRenderer.typeRegistry) {
            // Render special element using its renderer
            const elementDiv = document.createElement('div');
            elementDiv.className = 'element ' + element.type;
            if (element.completed) elementDiv.classList.add('completed');
            elementDiv.style.margin = '0';
            elementDiv.style.padding = '0';
            elementDiv.style.border = 'none';
            elementDiv.style.background = 'transparent';
            
            // Apply visual settings
            if (app.visualSettingsManager) {
                const elementId = `${pageId}-${binId}-${elementIndex}`;
                const page = app.appState?.documents?.find(p => p.id === pageId);
                const viewFormat = page?.format || 'default';
                app.visualSettingsManager.applyVisualSettings(elementDiv, 'element', elementId, pageId, viewFormat);
            }
            
            const renderer = app.elementRenderer.typeRegistry.getRenderer(element.type);
            if (renderer && renderer.render) {
                renderer.render(elementDiv, pageId, binId, element, elementIndex, 0, () => null);
                textContainer.appendChild(elementDiv);
            } else {
                // Fallback to text display
                const text = this._renderTextFallback(element, app);
                textContainer.appendChild(text);
            }
        } else {
            // Regular element - show type badge and text
            // Element type indicator
            if (element.type && element.type !== 'task') {
                const typeBadge = DOMUtils.createElement('span', {
                    style: 'display: inline-block; background: var(--bg-color, #2a2a2a); color: var(--header-color, #888); font-size: 10px; padding: 2px 6px; border-radius: 3px; margin-right: 6px; text-transform: uppercase;'
                }, element.type);
                textContainer.appendChild(typeBadge);
            }
            
            const text = this._renderTextFallback(element, app);
            
            // Enable inline editing on text click (like default view)
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
            
            textContainer.appendChild(text);
        }
        
        return textContainer;
    }
    
    /**
     * Render text fallback
     * @private
     */
    _renderTextFallback(element, app) {
        const text = DOMUtils.createElement('div', {
            style: `color: ${element.completed ? '#888' : '#e0e0e0'}; font-size: 14px; line-height: 1.4; ${element.completed ? 'text-decoration: line-through;' : ''}; word-wrap: break-word; cursor: text; user-select: text;`
        });
        
        // Use parseLinks to handle HTML formatting (strong, links, etc.) consistently with other views
        const textFragment = app.parseLinks ? app.parseLinks(element.text || 'Untitled') : document.createTextNode(element.text || 'Untitled');
        if (textFragment.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
            // Fragment - append all children
            while (textFragment.firstChild) {
                text.appendChild(textFragment.firstChild);
            }
        } else {
            // Single node or text
            text.appendChild(textFragment);
        }
        
        return text;
    }
    
    /**
     * Render progress bar
     * @private
     */
    _renderProgressBar(element) {
        const progressContainer = DOMUtils.createElement('div', {
            style: 'width: 100%; height: 4px; background: #2a2a2a; border-radius: 2px; overflow: hidden; margin-top: 4px;'
        });
        const progressBar = DOMUtils.createElement('div', {
            style: `width: ${Math.min(100, Math.max(0, element.progress))}%; height: 100%; background: #4a9eff; transition: width 0.3s;`
        });
        progressContainer.appendChild(progressBar);
        return progressContainer;
    }
    
    /**
     * Render deadline indicator
     * @private
     */
    _renderDeadlineIndicator(element) {
        const deadlineDiv = DOMUtils.createElement('div', {
            style: 'font-size: 11px; color: #ff6b6b; margin-top: 4px;'
        });
        const deadline = new Date(element.deadline);
        const now = new Date();
        const diff = deadline - now;
        if (diff < 0) {
            deadlineDiv.textContent = '⚠️ Overdue';
            deadlineDiv.style.color = '#ff0000';
        } else {
            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            if (days > 0) {
                deadlineDiv.textContent = `⏰ ${days}d left`;
            } else {
                const hours = Math.floor(diff / (1000 * 60 * 60));
                deadlineDiv.textContent = `⏰ ${hours}h left`;
            }
        }
        return deadlineDiv;
    }
    
    /**
     * Get child items
     * @private
     */
    _getChildItems(element, pageId, binId, app) {
        const document = app?.appState?.documents?.find(page => page.id === pageId);
        const group = document?.groups?.find(bin => bin.id === binId);
        const itemIndex = ItemHierarchy.buildItemIndex(group?.items || []);
        return ItemHierarchy.getChildItems(element, itemIndex);
    }
    
    /**
     * Render child items
     * @private
     */
    _renderChildItems(childItems, pageId, binId, elementIndex, app, renderCardFn) {
        const childrenContainer = DOMUtils.createElement('div', {
            style: 'margin-top: 8px; padding-top: 8px; border-top: 1px solid #2a2a2a;'
        });
        
        const childrenHeader = DOMUtils.createElement('div', {
            style: 'font-size: 11px; color: #888; margin-bottom: 6px;'
        }, `📋 ${childItems.length} subtask${childItems.length !== 1 ? 's' : ''}`);
        childrenContainer.appendChild(childrenHeader);
        
        childItems.forEach((child, childIndex) => {
            const childCard = renderCardFn(child, pageId, binId, `${elementIndex}-${childIndex}`, app);
            childCard.style.marginBottom = '6px';
            childCard.style.marginLeft = '12px';
            childCard.style.borderLeftWidth = '2px';
            childCard.style.padding = '8px';
            childCard.style.fontSize = '12px';
            childCard.classList.add('kanban-child-card');
            childrenContainer.appendChild(childCard);
        });
        
        return childrenContainer;
    }
    
    /**
     * Render relationships indicator
     * @private
     */
    _renderRelationshipsIndicator(element) {
        const relCount = (element.relationships.blocks?.length || 0) + 
                       (element.relationships.dependsOn?.length || 0) + 
                       (element.relationships.relatedTo?.length || 0);
        if (relCount > 0) {
            const relBadge = DOMUtils.createElement('div', {
                style: 'font-size: 10px; color: #888; margin-top: 4px; display: flex; align-items: center; gap: 4px;'
            });
            relBadge.innerHTML = `🔗 ${relCount} relationship${relCount !== 1 ? 's' : ''}`;
            return relBadge;
        }
        return null;
    }
    
    /**
     * Render tags
     * @private
     */
    _renderTags(element) {
        const tagsContainer = DOMUtils.createElement('div', {
            style: 'display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px;'
        });
        element.tags.forEach(tag => {
            const tagElement = DOMUtils.createElement('span', {
                style: 'background: #2a2a2a; color: #888; font-size: 10px; padding: 2px 6px; border-radius: 3px;'
            }, StringUtils.escapeHtml(tag));
            tagsContainer.appendChild(tagElement);
        });
        return tagsContainer;
    }
}

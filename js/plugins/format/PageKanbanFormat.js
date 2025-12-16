// PageKanbanFormat - Format renderer for page-level Kanban view (bins as columns, elements as cards)
import { BaseFormatRenderer } from '../../core/BaseFormatRenderer.js';
import { DOMUtils } from '../../utils/dom.js';
import { StringUtils } from '../../utils/string.js';
import { eventBus } from '../../core/EventBus.js';

export default class PageKanbanFormat extends BaseFormatRenderer {
    constructor(config = {}) {
        super({
            id: 'page-kanban-format',
            name: 'Page Kanban Board',
            formatName: 'page-kanban-format',
            version: '1.0.0',
            description: 'Kanban board view with bins as columns and elements as cards',
            supportsPages: true,
            defaultConfig: {
                enabled: false,
                cardHeight: 'auto',
                showCardDetails: true
            },
            ...config
        });
    }
    
    async onInit() {
        // console.log(`${this.name} format renderer initialized.`);
        
        // Don't call registerFormat here - the plugin isn't registered in the registry yet
        // The FormatRendererManager will pick it up via:
        // 1. The 'plugin:loaded' event (emitted after plugin is registered)
        // 2. The scanForFormats() method which scans the registry
        // 3. The 'format:registered' event (if needed)
        
        // Emit event for registration - FormatRendererManager listens to this
        eventBus.emit('format:registered', { pluginId: this.id });
    }
    
    /**
     * Render a page in Kanban format
     * @param {HTMLElement} container - Container element
     * @param {Object} page - Page data
     * @param {Object} options - Options with app reference
     */
    renderPage(container, page, options = {}) {
        const app = options.app;
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
            background: #1a1a1a;
        `;
        
        if (!page.bins || page.bins.length === 0) {
            if (!app._preservingFormat) {
                container.innerHTML = '<p style="color: #888; padding: 20px;">No bins available. Add bins to see them as Kanban columns.</p>';
            }
            return;
        }
        
        // If preserving format, update existing columns instead of clearing
        if (app._preservingFormat && container.children.length > 0) {
            // Update existing columns - find and update each column
            page.bins.forEach((bin, index) => {
                const existingColumn = container.querySelector(`[data-bin-id="${bin.id}"]`);
                if (existingColumn) {
                    // Update existing column content
                    const content = existingColumn.querySelector('.kanban-column-content');
                    if (content) {
                        content.innerHTML = '';
                        if (bin.elements && bin.elements.length > 0) {
                            bin.elements.forEach((element, elementIndex) => {
                                const card = this.renderCard(element, page.id, bin.id, elementIndex, app);
                                content.appendChild(card);
                            });
                        } else {
                            const emptyState = DOMUtils.createElement('div', {
                                style: 'text-align: center; color: #666; padding: 20px; font-size: 12px;'
                            }, 'No elements');
                            content.appendChild(emptyState);
                        }
                        
                        // Update count
                        const countEl = existingColumn.querySelector('.kanban-column-count');
                        if (countEl) {
                            countEl.textContent = (bin.elements?.length || 0).toString();
                        }
                    }
                } else {
                    // New bin - add column
                    const column = this.renderColumn(bin, page.id, app);
                    container.appendChild(column);
                }
            });
            
            // Remove columns for bins that no longer exist
            const existingColumns = container.querySelectorAll('.kanban-column');
            existingColumns.forEach(col => {
                const binId = col.dataset.binId;
                if (!page.bins.find(b => b.id === binId)) {
                    col.remove();
                }
            });
        } else {
            // Full render - clear and rebuild
            container.innerHTML = '';
            page.bins.forEach(bin => {
                const column = this.renderColumn(bin, page.id, app);
                container.appendChild(column);
            });
        }
        
        // Reset format preservation flag
        app._preservingFormat = false;
    }
    
    /**
     * Render a bin as a Kanban column
     * @param {Object} bin - Bin data
     * @param {string} pageId - Page ID
     * @param {Object} app - App instance
     */
    renderColumn(bin, pageId, app) {
        const column = DOMUtils.createElement('div', {
            class: 'kanban-column',
            'data-page-id': pageId,
            'data-bin-id': bin.id
        });
        
        column.style.cssText = `
            flex: 0 0 300px;
            background: #2a2a2a;
            border-radius: 8px;
            padding: 15px;
            display: flex;
            flex-direction: column;
            gap: 10px;
            max-height: calc(100vh - 150px);
        `;
        
        // Column header
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
            style: 'color: #e0e0e0; margin: 0; font-size: 16px; font-weight: 600;'
        }, StringUtils.escapeHtml(bin.title || 'Untitled'));
        
        const count = DOMUtils.createElement('span', {
            class: 'kanban-column-count',
            style: 'background: #1a1a1a; padding: 4px 10px; border-radius: 12px; font-size: 12px; color: #888;'
        }, (bin.elements?.length || 0).toString());
        
        header.appendChild(title);
        header.appendChild(count);
        column.appendChild(header);
        
        // Column content (drop zone)
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
        
        // Render elements as cards
        if (bin.elements && bin.elements.length > 0) {
            bin.elements.forEach((element, elementIndex) => {
                const card = this.renderCard(element, pageId, bin.id, elementIndex, app);
                content.appendChild(card);
            });
        } else {
            // Empty state
            const emptyState = DOMUtils.createElement('div', {
                style: 'text-align: center; color: #666; padding: 20px; font-size: 12px;'
            }, 'No elements');
            content.appendChild(emptyState);
        }
        
        // Make column droppable
        this.setupColumnDropZone(content, pageId, bin.id, app);
        
        column.appendChild(content);
        
        // Add element button
        const addBtn = DOMUtils.createElement('button', {
            class: 'kanban-add-element-btn',
            style: 'padding: 8px; background: #1a1a1a; color: #888; border: 1px dashed #555; border-radius: 4px; cursor: pointer; width: 100%; margin-top: 5px;'
        }, '+ Add Element');
        
        addBtn.addEventListener('click', () => {
            if (app.modalHandler) {
                app.modalHandler.showAddElementModal(pageId, bin.id);
            }
        });
        
        column.appendChild(addBtn);
        
        return column;
    }
    
    /**
     * Render an element as a Kanban card
     * @param {Object} element - Element data
     * @param {string} pageId - Page ID
     * @param {string} binId - Bin ID
     * @param {number} elementIndex - Element index
     * @param {Object} app - App instance
     */
    renderCard(element, pageId, binId, elementIndex, app) {
        const card = DOMUtils.createElement('div', {
            class: 'kanban-card',
            draggable: 'true',
            'data-page-id': pageId,
            'data-bin-id': binId,
            'data-element-index': elementIndex
        });
        
        // Determine border color based on element state and type
        let borderColor = '#4a9eff';
        if (element.completed) {
            borderColor = '#4caf50';
        } else if (element.type === 'header-checkbox') {
            borderColor = '#ffa500';
        } else if (element.deadline) {
            const deadline = new Date(element.deadline);
            const now = new Date();
            if (deadline < now) {
                borderColor = '#ff0000';
            } else if (deadline - now < 24 * 60 * 60 * 1000) {
                borderColor = '#ff6b6b';
            }
        }
        
        card.style.cssText = `
            background: #1a1a1a;
            border-left: 4px solid ${borderColor};
            border-radius: 4px;
            padding: 12px;
            margin-bottom: 10px;
            cursor: move;
            transition: transform 0.2s, box-shadow 0.2s;
            position: relative;
        `;
        
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
                const page = app.pages.find(p => p.id === pageId);
                const bin = page?.bins?.find(b => b.id === binId);
                if (bin && bin.elements[elementIndex]) {
                    bin.elements[elementIndex].completed = e.target.checked;
                    app.dataManager.saveData();
                    // Preserve format during re-render
                    app._preservingFormat = true;
                    app.render();
                }
            });
            
            mainRow.appendChild(checkbox);
        }
        
        // Element text/content
        const textContainer = DOMUtils.createElement('div', {
            style: 'flex: 1; min-width: 0;'
        });
        
        // Element type indicator
        if (element.type && element.type !== 'task') {
            const typeBadge = DOMUtils.createElement('span', {
                style: 'display: inline-block; background: #2a2a2a; color: #888; font-size: 10px; padding: 2px 6px; border-radius: 3px; margin-right: 6px; text-transform: uppercase;'
            }, element.type);
            textContainer.appendChild(typeBadge);
        }
        
        const text = DOMUtils.createElement('div', {
            style: `color: ${element.completed ? '#888' : '#e0e0e0'}; font-size: 14px; line-height: 1.4; ${element.completed ? 'text-decoration: line-through;' : ''}; word-wrap: break-word;`
        }, StringUtils.escapeHtml(element.text || 'Untitled'));
        
        text.addEventListener('click', () => {
            if (app.modalHandler) {
                app.modalHandler.showEditModal(pageId, binId, elementIndex, element);
            }
        });
        
        textContainer.appendChild(text);
        mainRow.appendChild(textContainer);
        cardContent.appendChild(mainRow);
        
        // Progress bar if available
        if (element.progress !== undefined) {
            const progressContainer = DOMUtils.createElement('div', {
                style: 'width: 100%; height: 4px; background: #2a2a2a; border-radius: 2px; overflow: hidden; margin-top: 4px;'
            });
            const progressBar = DOMUtils.createElement('div', {
                style: `width: ${Math.min(100, Math.max(0, element.progress))}%; height: 100%; background: #4a9eff; transition: width 0.3s;`
            });
            progressContainer.appendChild(progressBar);
            cardContent.appendChild(progressContainer);
        }
        
        // Deadline indicator
        if (element.deadline) {
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
            cardContent.appendChild(deadlineDiv);
        }
        
        // Child elements (subelements)
        if (element.children && Array.isArray(element.children) && element.children.length > 0) {
            const childrenContainer = DOMUtils.createElement('div', {
                style: 'margin-top: 8px; padding-top: 8px; border-top: 1px solid #2a2a2a;'
            });
            
            const childrenHeader = DOMUtils.createElement('div', {
                style: 'font-size: 11px; color: #888; margin-bottom: 6px;'
            }, `📋 ${element.children.length} subtask${element.children.length !== 1 ? 's' : ''}`);
            childrenContainer.appendChild(childrenHeader);
            
            element.children.forEach((child, childIndex) => {
                const childCard = this.renderCard(child, pageId, binId, `${elementIndex}-${childIndex}`, app);
                childCard.style.marginBottom = '6px';
                childCard.style.marginLeft = '12px';
                childCard.style.borderLeftWidth = '2px';
                childCard.style.padding = '8px';
                childCard.style.fontSize = '12px';
                childCard.classList.add('kanban-child-card');
                childrenContainer.appendChild(childCard);
            });
            
            cardContent.appendChild(childrenContainer);
        }
        
        // Relationships indicator
        if (element.relationships) {
            const relCount = (element.relationships.blocks?.length || 0) + 
                           (element.relationships.dependsOn?.length || 0) + 
                           (element.relationships.relatedTo?.length || 0);
            if (relCount > 0) {
                const relBadge = DOMUtils.createElement('div', {
                    style: 'font-size: 10px; color: #888; margin-top: 4px; display: flex; align-items: center; gap: 4px;'
                });
                relBadge.innerHTML = `🔗 ${relCount} relationship${relCount !== 1 ? 's' : ''}`;
                cardContent.appendChild(relBadge);
            }
        }
        
        // Element metadata (custom properties, tags, etc.)
        if (element.tags && Array.isArray(element.tags) && element.tags.length > 0) {
            const tagsContainer = DOMUtils.createElement('div', {
                style: 'display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px;'
            });
            element.tags.forEach(tag => {
                const tagEl = DOMUtils.createElement('span', {
                    style: 'background: #2a2a2a; color: #888; font-size: 10px; padding: 2px 6px; border-radius: 3px;'
                }, StringUtils.escapeHtml(tag));
                tagsContainer.appendChild(tagEl);
            });
            cardContent.appendChild(tagsContainer);
        }
        
        card.appendChild(cardContent);
        
        // Setup drag handlers
        this.setupCardDrag(card, pageId, binId, elementIndex, app);
        
        return card;
    }
    
    /**
     * Setup drag handlers for a card
     */
    setupCardDrag(card, pageId, binId, elementIndex, app) {
        card.addEventListener('dragstart', (e) => {
            e.dataTransfer.effectAllowed = 'move';
            
            // Check if this is a child element
            const elementIndexStr = String(elementIndex);
            const isChild = elementIndexStr.includes('-');
            let parentElementIndex = null;
            let childIndex = null;
            
            if (isChild) {
                const parts = elementIndexStr.split('-');
                parentElementIndex = parseInt(parts[0]);
                childIndex = parseInt(parts[1]);
            }
            
            // Store data in multiple formats for compatibility
            e.dataTransfer.setData('text/plain', JSON.stringify({
                type: 'kanban-card',
                pageId,
                binId,
                elementIndex: elementIndexStr,
                // Also include standard format for DragDropHandler compatibility
                sourcePageId: pageId,
                sourceBinId: binId,
                sourceElementIndex: isChild ? parentElementIndex : parseInt(elementIndexStr),
                isChild: isChild,
                parentElementIndex: parentElementIndex,
                childIndex: childIndex
            }));
            
            // Also set as 'element' type for compatibility with bin view drag handlers
            e.dataTransfer.setData('application/json', JSON.stringify({
                type: 'element',
                pageId,
                binId,
                elementIndex: elementIndexStr
            }));
            
            card.style.opacity = '0.5';
        });
        
        card.addEventListener('dragend', (e) => {
            card.style.opacity = '1';
        });
    }
    
    /**
     * Setup drop zone for a column
     */
    setupColumnDropZone(columnContent, pageId, binId, app) {
        columnContent.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            columnContent.style.background = 'rgba(74, 158, 255, 0.1)';
        });
        
        columnContent.addEventListener('dragleave', (e) => {
            // Only clear background if we're actually leaving the column
            if (!columnContent.contains(e.relatedTarget)) {
                columnContent.style.background = '';
            }
        });
        
        columnContent.addEventListener('drop', (e) => {
            e.preventDefault();
            columnContent.style.background = '';
            
            try {
                const data = JSON.parse(e.dataTransfer.getData('text/plain'));
                
                if (data.type === 'kanban-card') {
                    // Use DragDropHandler for proper element movement (handles children, relationships, etc.)
                    const sourcePage = app.pages.find(p => p.id === data.pageId);
                    const sourceBin = sourcePage?.bins?.find(b => b.id === data.binId);
                    const targetPage = app.pages.find(p => p.id === pageId);
                    const targetBin = targetPage?.bins?.find(b => b.id === binId);
                    
                    if (sourceBin && targetBin && sourceBin.elements[data.elementIndex]) {
                        // Check if element is a child
                        const elementIndexStr = String(data.elementIndex);
                        const isChild = elementIndexStr.includes('-');
                        let parentElementIndex = null;
                        let childIndex = null;
                        
                        if (isChild) {
                            const parts = elementIndexStr.split('-');
                            parentElementIndex = parseInt(parts[0]);
                            childIndex = parseInt(parts[1]);
                        }
                        
                        // Use DragDropHandler to move element (preserves format, handles all cases)
                        if (app.dragDropHandler) {
                            // Move to end of target bin
                            const targetIndex = targetBin.elements.length;
                            app.dragDropHandler.moveElement(
                                data.pageId, data.binId, data.elementIndex,
                                pageId, binId, targetIndex,
                                isChild, parentElementIndex, childIndex
                            );
                        } else {
                            // Fallback if DragDropHandler not available
                            const element = sourceBin.elements[data.elementIndex];
                            sourceBin.elements.splice(data.elementIndex, 1);
                            targetBin.elements.push(element);
                            app.dataManager.saveData();
                            
                            // Preserve format during re-render
                            app._preservingFormat = true;
                            app.render();
                        }
                    }
                } else if (data.type === 'element') {
                    // Handle drag from bin view or other sources
                    if (app.dragDropHandler) {
                        const targetIndex = targetBin.elements.length;
                        app.dragDropHandler.moveElement(
                            data.pageId || data.sourcePageId, 
                            data.binId || data.sourceBinId, 
                            data.elementIndex || data.sourceElementIndex,
                            pageId, binId, targetIndex,
                            data.isChild || false,
                            data.parentElementIndex || null,
                            data.childIndex || null
                        );
                    }
                }
            } catch (err) {
                console.error('Error handling kanban drop:', err);
            }
        });
    }
}


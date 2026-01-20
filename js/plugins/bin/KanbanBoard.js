// KanbanBoard - Bin plugin for Kanban board view
import { BasePlugin } from '../../core/BasePlugin.js';
import { DOMUtils } from '../../utils/dom.js';
import { StringUtils } from '../../utils/string.js';
import { eventBus } from '../../core/EventBus.js';

export default class KanbanBoard extends BasePlugin {
    constructor(config = {}) {
        super({
            id: 'kanban-board',
            name: 'Kanban Board',
            type: 'bin',
            version: '1.0.0',
            description: 'Trello-style Kanban board view for groups',
            defaultConfig: {
                enabled: false,
                useStatusColumns: false, // Option to use To Do/In Progress/Done columns
                columns: [] // Empty by default - will use headers
            },
            ...config
        });
    }
    
    async onInit() {
        if (this.app) {
            eventBus.on('bin:render', this.handleBinRender.bind(this));
        }
    }

    _getPages(appInstance) {
        return appInstance?.documents || appInstance?.appState?.documents || [];
    }

    _getGroups(page) {
        return page?.groups || [];
    }

    _getItems(bin) {
        const items = bin.items || [];
        bin.items = items;
        return items;
    }
    
    handleBinRender({ binElement, pageId, binData }) {
        if (!this.app) {
            return;
        }
        
        const binId = binElement?.dataset?.binId || binData?.id;
        const pageIdFromElement = binElement?.closest('.page')?.dataset?.pageId || pageId;
        
        if (!pageIdFromElement || !binId) {
            return;
        }
        
        const page = this._getPages(this.app).find(p => p.id === pageIdFromElement);
        const bin = page ? page.groups?.find(b => b.id === binId) : binData;
        if (!bin) {
            return;
        }
        
        // Check if plugin is enabled for this bin
        const isEnabled = bin.pluginConfigs?.[this.id]?.enabled || 
                         bin.plugins?.includes(this.id) ||
                         this.config.enabled;
        
        if (!isEnabled) {
            // Kanban is not enabled for this bin - do nothing
            return;
        }
        
        // Render Kanban board
        this.renderKanbanBoard(binElement, pageIdFromElement, binId, bin);
    }
    
    renderKanbanBoard(container, pageId, binId, bin) {
        // Hide regular bin content
        const binContent = container.querySelector('.bin-content, [id^="bin-content-"]');
        if (binContent) {
            binContent.style.display = 'none';
        }
        
        // Clear existing kanban board
        const existingKanban = container.querySelector('.kanban-board');
        if (existingKanban) {
            existingKanban.remove();
        }
        
        // List view toggle button removed
        
        const kanbanBoard = DOMUtils.createElement('div', {
            class: 'kanban-board'
        });
        
        kanbanBoard.style.cssText = `
            display: flex;
            gap: 15px;
            padding: 15px;
            overflow-x: auto;
            min-height: 400px;
        `;
        
        // Determine columns based on headers or use defaults
        const columns = this.determineColumns(bin);
        
        // Render each column
        columns.forEach((column, index) => {
            const columnDiv = this.renderColumn(column, pageId, binId, bin, index);
            kanbanBoard.appendChild(columnDiv);
        });
        
        // Show add column button if no headers (user needs to add headers to create columns)
        const hasHeaders = this._getItems(bin).some(el => el.type === 'header-checkbox');
        const useStatusColumns = this.config.useStatusColumns || bin.pluginConfigs?.[this.id]?.useStatusColumns;
        
        if (!hasHeaders && !useStatusColumns) {
            // Add column button
            const addColumnBtn = DOMUtils.createElement('button', {
                class: 'add-kanban-column-btn',
                type: 'button'
            }, '+ Add Column');
            
            addColumnBtn.style.cssText = `
                padding: 10px 20px;
                background: #2a2a2a;
                color: #e0e0e0;
                border: 2px dashed #555;
                border-radius: 4px;
                cursor: pointer;
                min-width: 200px;
                height: fit-content;
            `;
            
            addColumnBtn.addEventListener('click', () => {
                this.showAddColumnModal(pageId, binId);
            });
            
            kanbanBoard.appendChild(addColumnBtn);
        }
        
        container.appendChild(kanbanBoard);
    }
    
    /**
     * Determine columns based on headers or use defaults
     * @param {Object} bin - Bin data
     * @returns {Array} - Array of column objects
     */
    determineColumns(bin) {
        // Check if status-based columns are enabled
        const useStatusColumns = this.config.useStatusColumns || bin.pluginConfigs?.[this.id]?.useStatusColumns;
        
        if (useStatusColumns) {
            // Use To Do / In Progress / Done columns
            return [
                { id: 'todo', title: 'To Do', color: '#4a9eff' },
                { id: 'in-progress', title: 'In Progress', color: '#ffa500' },
                { id: 'done', title: 'Done', color: '#4caf50' }
            ];
        }
        
        // Check for custom columns in bin config
        const customColumns = bin.pluginConfigs?.[this.id]?.columns || this.config.columns;
        
        // Find all header elements
        const headers = [];
        const items = this._getItems(bin);
        if (items.length > 0) {
            items.forEach((element, index) => {
                if (element.type === 'header-checkbox') {
                    headers.push({
                        index: index,
                        title: element.text || 'Untitled',
                        id: `header-${index}`,
                        color: '#4a9eff'
                    });
                }
            });
        }
        
        // If headers found, create columns from them (headers take priority)
        if (headers.length > 0) {
            const columns = [];
            headers.forEach((header, headerIndex) => {
                const nextHeaderIndex = headerIndex < headers.length - 1 
                    ? headers[headerIndex + 1].index 
                    : items.length;
                
                // Count elements in this section (between this header and next)
                const elementCount = items.slice(header.index + 1, nextHeaderIndex)
                    .filter(el => el.type !== 'header-checkbox').length;
                
                columns.push({
                    id: header.id,
                    title: header.title,
                    color: header.color,
                    startIndex: header.index + 1,
                    endIndex: nextHeaderIndex,
                    elementCount: elementCount
                });
            });
            return columns;
        }
        
        // If custom columns exist, use them
        if (customColumns && customColumns.length > 0) {
            return customColumns;
        }
        
        // No headers and no custom columns - create a default column with all elements
        const nonHeaderElements = items.filter(el => el.type !== 'header-checkbox');
        if (nonHeaderElements.length > 0) {
            return [{
                id: 'all-items',
                title: 'All Items',
                color: '#4a9eff',
                startIndex: 0,
                endIndex: items.length,
                elementCount: nonHeaderElements.length
            }];
        }
        
        // No elements at all - return empty
        return [];
    }
    
    renderColumn(column, pageId, binId, bin, columnIndex) {
        const columnDiv = DOMUtils.createElement('div', {
            class: 'kanban-column',
            'data-column-id': column.id
        });
        
        columnDiv.style.cssText = `
            flex: 0 0 280px;
            background: #2a2a2a;
            border-radius: 8px;
            padding: 15px;
            display: flex;
            flex-direction: column;
            gap: 10px;
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
            border-bottom: 2px solid ${column.color || '#4a9eff'};
        `;
        
        const title = DOMUtils.createElement('h3', {
            style: `color: ${column.color || 'var(--page-title-color, #4a9eff)'}; margin: 0; font-size: var(--page-title-font-size, 16px);`
        }, column.title);
        
        const count = DOMUtils.createElement('span', {
            class: 'kanban-column-count',
            style: `background: var(--bg-color, #1a1a1a); padding: 2px 8px; border-radius: 12px; font-size: var(--element-font-size, 12px); color: var(--header-color, #888);`
        }, '0');
        
        header.appendChild(title);
        header.appendChild(count);
        columnDiv.appendChild(header);
        
        // Column content (drop zone)
        const content = DOMUtils.createElement('div', {
            class: 'kanban-column-content',
            'data-column-id': column.id
        });
        
        content.style.cssText = `
            flex: 1;
            min-height: 200px;
            padding: 10px 0;
            overflow-y: auto;
            max-height: calc(100vh - 250px);
        `;
        
        // Get elements for this column
        let columnElements = [];
        let elementIndices = [];
        
        const useStatusColumns = this.config.useStatusColumns || bin.pluginConfigs?.[this.id]?.useStatusColumns;
        const customColumns = bin.pluginConfigs?.[this.id]?.columns || this.config.columns;
        const isCustomColumn = customColumns && customColumns.length > 0 && customColumns.some(col => col.id === column.id);
        const items = this._getItems(bin);
        
        if (column.startIndex !== undefined && column.endIndex !== undefined) {
            // Column based on header or default "All Items" - get elements between indices
            for (let i = column.startIndex; i < column.endIndex; i++) {
                const element = items[i];
                if (element && element.type !== 'header-checkbox') {
                    columnElements.push(element);
                    elementIndices.push(i);
                }
            }
        } else if (isCustomColumn) {
            // Custom column - filter by kanbanColumn property
            // If element has kanbanColumn set, it must match this column
            // If element has no kanbanColumn, assign to first column by default
            const customColumns = bin.pluginConfigs?.[this.id]?.columns || this.config.columns;
            const isFirstColumn = customColumns && customColumns.length > 0 && customColumns[0].id === column.id;
            
            columnElements = items.filter((el, idx) => {
                if (el.type === 'header-checkbox') return false;
                // If element has kanbanColumn set, it must match this column
                if (el.kanbanColumn !== undefined) {
                    return el.kanbanColumn === column.id;
                }
                // If no kanbanColumn set and this is the first column, include it
                return isFirstColumn;
            });
            elementIndices = items
                .map((el, idx) => ({ el, idx }))
                .filter(({ el }) => columnElements.includes(el))
                .map(({ idx }) => idx);
        } else if (useStatusColumns) {
            // Status-based columns - filter by kanbanColumn property or completion status
            if (column.id === 'todo') {
                columnElements = items.filter((el, idx) => {
                    // Default completed to false if undefined
                    const isCompleted = el.completed === true;
                    return el.type !== 'header-checkbox' && 
                           !isCompleted && 
                           (!el.kanbanColumn || el.kanbanColumn === column.id);
                });
                elementIndices = items
                    .map((el, idx) => ({ el, idx }))
                    .filter(({ el }) => columnElements.includes(el))
                    .map(({ idx }) => idx);
            } else if (column.id === 'in-progress') {
                columnElements = items.filter((el, idx) => {
                    return el.type !== 'header-checkbox' && 
                           el.kanbanColumn === column.id;
                });
                elementIndices = items
                    .map((el, idx) => ({ el, idx }))
                    .filter(({ el }) => columnElements.includes(el))
                    .map(({ idx }) => idx);
            } else if (column.id === 'done') {
                columnElements = items.filter((el, idx) => {
                    // Explicitly check for completed === true
                    const isCompleted = el.completed === true;
                    return el.type !== 'header-checkbox' && 
                           isCompleted && 
                           (!el.kanbanColumn || el.kanbanColumn === column.id);
                });
                elementIndices = items
                    .map((el, idx) => ({ el, idx }))
                    .filter(({ el }) => columnElements.includes(el))
                    .map(({ idx }) => idx);
            }
        }
        
        // Update count
        count.textContent = columnElements.length;
        
        // Render cards with drop zones
        columnElements.forEach((element, cardIndex) => {
            const actualElementIndex = elementIndices[cardIndex];
            
            // Add drop zone above each card for reordering
            const dropZone = DOMUtils.createElement('div', {
                class: 'kanban-drop-zone',
                style: 'min-height: 10px; margin: 2px 0; transition: all 0.2s;'
            });
            dropZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.stopPropagation();
                e.dataTransfer.dropEffect = 'move';
                dropZone.style.background = 'rgba(74, 158, 255, 0.3)';
                dropZone.style.minHeight = '30px';
            });
            dropZone.addEventListener('dragleave', (e) => {
                if (!dropZone.contains(e.relatedTarget)) {
                    dropZone.style.background = '';
                    dropZone.style.minHeight = '10px';
                }
            });
            dropZone.addEventListener('drop', (e) => {
                e.preventDefault();
                e.stopPropagation();
                dropZone.style.background = '';
                dropZone.style.minHeight = '10px';
                // Drop above this card - use actualElementIndex as target (inserts before)
                this.handleCardDrop(e, pageId, binId, actualElementIndex, column.id, columnIndex);
            });
            content.appendChild(dropZone);
            
            const card = this.renderCard(element, pageId, binId, actualElementIndex, column.id, columnIndex);
            content.appendChild(card);
        });
        
        // Add drop zone at the end of column
        const endDropZone = DOMUtils.createElement('div', {
            class: 'kanban-drop-zone',
            style: 'min-height: 10px; margin: 2px 0; transition: all 0.2s;'
        });
        endDropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            e.dataTransfer.dropEffect = 'move';
            endDropZone.style.background = 'rgba(74, 158, 255, 0.3)';
            endDropZone.style.minHeight = '30px';
        });
        endDropZone.addEventListener('dragleave', (e) => {
            if (!endDropZone.contains(e.relatedTarget)) {
                endDropZone.style.background = '';
                endDropZone.style.minHeight = '10px';
            }
        });
        endDropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            endDropZone.style.background = '';
            endDropZone.style.minHeight = '10px';
            // Drop at end of column - use the last element index + 1
            const lastIndex = elementIndices.length > 0 ? elementIndices[elementIndices.length - 1] + 1 : items.length;
            this.handleCardDrop(e, pageId, binId, lastIndex, column.id, columnIndex);
        });
        content.appendChild(endDropZone);
        
        // Make column droppable
        this.setupColumnDropZone(content, pageId, binId, column.id, columnIndex);
        
        columnDiv.appendChild(content);
        
        return columnDiv;
    }
    
    renderCard(element, pageId, binId, elementIndex, columnId, columnIndex) {
        const elementInteraction = new ElementInteraction(this.app);
        if (!this.app) return DOMUtils.createElement('div');
        
        const card = DOMUtils.createElement('div', {
            class: 'kanban-card',
            draggable: 'true',
            'data-page-id': pageId,
            'data-bin-id': binId,
            'data-element-index': elementIndex,
            'data-column-id': columnId,
            'data-drag-type': 'element'
        });
        
        // Match element styling based on completion
        // Explicitly default to false if undefined
        if (element.completed === undefined) {
            element.completed = false;
        }
        const isCompleted = element.completed === true;
        const borderColor = isCompleted ? '#4caf50' : '#4a9eff';
        
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
            transition: 'transform 0.2s, box-shadow 0.2s',
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
        
        // Card content container
        const cardContent = DOMUtils.createElement('div', {
            style: 'display: flex; align-items: flex-start; gap: 8px;'
        });
        
        // Add checkbox if element supports it (most elements do)
        // Only show checkbox for elements that actually support completion
        const supportsCompletion = element.type === 'task' || 
                                   element.type === 'header-checkbox' || 
                                   element.completed !== undefined;
        
        if (supportsCompletion) {
            // Explicitly check if completed is true (not just truthy)
            // Default to false if undefined
            const isChecked = element.completed === true;
            
            const checkbox = DOMUtils.createElement('input', {
                type: 'checkbox',
                checked: isChecked,
                style: 'margin-top: 2px; flex-shrink: 0; cursor: pointer;'
            });
            
            checkbox.addEventListener('change', (e) => {
                e.stopPropagation();
                if (this.app && this.app.toggleElement) {
                    this.app.toggleElement(pageId, binId, elementIndex);
                }
            });
            
            // Add dragover handler to checkbox to allow drops
            checkbox.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
            
            cardContent.appendChild(checkbox);
        }
        
        // For special element types, render them using their renderers
        const specialElementTypes = ['timer', 'counter', 'tracker', 'rating', 'audio', 'image', 'time-log', 'calendar'];
        if (specialElementTypes.includes(element.type) && this.app && this.app.elementRenderer && this.app.elementRenderer.typeRegistry) {
            // Render special element using its renderer
            const elementDiv = document.createElement('div');
            elementDiv.className = 'element ' + element.type;
            if (element.completed) elementDiv.classList.add('completed');
            elementDiv.style.margin = '0';
            elementDiv.style.padding = '0';
            elementDiv.style.border = 'none';
            elementDiv.style.background = 'transparent';
            elementDiv.style.flex = '1';
            
            // Apply visual settings
            if (this.app.visualSettingsManager) {
                const elementId = `${pageId}-${binId}-${elementIndex}`;
                const page = this.app.appState?.documents?.find(p => p.id === pageId);
                const viewFormat = page?.format || 'default';
                this.app.visualSettingsManager.applyVisualSettings(elementDiv, 'element', elementId, pageId, viewFormat);
            }
            
            const renderer = this.app.elementRenderer.typeRegistry.getRenderer(element.type);
            if (renderer && renderer.render) {
                renderer.render(elementDiv, pageId, binId, element, elementIndex, 0, () => null);
                cardContent.appendChild(elementDiv);
            } else {
                // Fallback to text display
                const text = DOMUtils.createElement('div', {
                    style: `flex: 1; color: ${isCompleted ? '#888' : '#e0e0e0'}; font-size: 14px; line-height: 1.4; ${isCompleted ? 'text-decoration: line-through;' : ''}`
                });
                const textFragment = this.app && this.app.parseLinks ? this.app.parseLinks(element.text || 'Untitled') : document.createTextNode(element.text || 'Untitled');
                if (textFragment.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
                    while (textFragment.firstChild) {
                        text.appendChild(textFragment.firstChild);
                    }
                } else {
                    text.appendChild(textFragment);
                }
                cardContent.appendChild(text);
            }
        } else {
            // Regular element - show text
            const text = DOMUtils.createElement('div', {
                style: `flex: 1; color: ${isCompleted ? '#888' : '#e0e0e0'}; font-size: 14px; line-height: 1.4; ${isCompleted ? 'text-decoration: line-through;' : ''}`
            });
            
            // Use parseLinks to handle HTML formatting (strong, links, etc.) consistently with other views
            const textFragment = this.app && this.app.parseLinks ? this.app.parseLinks(element.text || 'Untitled') : document.createTextNode(element.text || 'Untitled');
            if (textFragment.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
                // Fragment - append all children
                while (textFragment.firstChild) {
                    text.appendChild(textFragment.firstChild);
                }
            } else {
                // Single node or text
                text.appendChild(textFragment);
            }
            
            text.addEventListener('click', () => {
                if (this.app && this.app.modalHandler) {
                    this.app.modalHandler.showEditModal(pageId, binId, elementIndex, element);
                }
            });
            
            cardContent.appendChild(text);
        }
        card.appendChild(cardContent);
        
        // Add context menu support
        card.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (this.app && this.app.showContextMenu) {
                this.app.showContextMenu(e, pageId, binId, elementIndex);
            }
        });
        
        // Setup drag handlers
        this.setupCardDrag(card, pageId, binId, elementIndex);
        
        // Make card itself droppable for reordering
        card.addEventListener('dragover', (e) => {
            // Only allow if dragging another card
            if (this.app?.dragData?.type === 'element' && this.app.dragData.elementIndex !== elementIndex) {
                e.preventDefault();
                e.stopPropagation();
                e.dataTransfer.dropEffect = 'move';
                card.style.borderTop = '3px solid #4a9eff';
            }
        });
        
        card.addEventListener('dragleave', (e) => {
            if (!card.contains(e.relatedTarget)) {
                card.style.borderTop = '';
            }
        });
        
        card.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            card.style.borderTop = '';
            // Drop on this card - insert above it (at its current index)
            this.handleCardDrop(e, pageId, binId, elementIndex, columnId, columnIndex);
        });
        
        return card;
    }
    
    setupCardDrag(card, pageId, binId, elementIndex) {
        card.addEventListener('dragstart', (e) => {
            // Don't start drag if clicking on checkbox or other interactive elements
            if (e.target.closest('input') || e.target.closest('button')) {
                e.preventDefault();
                return;
            }
            
            e.stopPropagation();
            e.dataTransfer.effectAllowed = 'move';
            
            const dragData = {
                type: 'element',
                pageId,
                binId,
                elementIndex: parseInt(elementIndex),
                columnId: card.dataset.columnId,
                fromKanban: true
            };
            
            e.dataTransfer.setData('text/plain', JSON.stringify(dragData));
            card.style.opacity = '0.5';
            
            // Also set app drag data if available (for main drag system)
            if (this.app) {
                this.app.dragData = dragData;
                this.app.isDragging = true;
            }
        });
        
        card.addEventListener('dragend', (e) => {
            card.style.opacity = '1';
            if (this.app) {
                this.app.dragData = null;
                this.app.isDragging = false;
            }
        });
    }
    
    handleCardDrop(e, pageId, binId, targetElementIndex, columnId, columnIndex) {
        if (!this.app) return;
        
        try {
            let dragPayload = this.app.dragData;
            if (!dragPayload) {
                const dataStr = e.dataTransfer.getData('text/plain');
                if (dataStr) {
                    dragPayload = JSON.parse(dataStr);
                }
            }
            
            if (!dragPayload || dragPayload.type !== 'element') return;
            
            const appInstance = window.app || this.app;
            const page = this._getPages(appInstance).find(p => p.id === pageId);
            const bin = page ? page.groups?.find(b => b.id === binId) : null;
            const items = bin ? this._getItems(bin) : [];
            if (!bin || !items[dragPayload.elementIndex]) return;
            
            const element = items[dragPayload.elementIndex];
            if (element.type === 'header-checkbox') return;
            
            if (appInstance.dragDropHandler) {
                const currentIndex = parseInt(dragPayload.elementIndex);
                let targetIndex = parseInt(targetElementIndex);
                
                // Check if using custom columns or status columns
                const useStatusColumns = this.config.useStatusColumns || bin.pluginConfigs?.[this.id]?.useStatusColumns;
                const customColumns = bin.pluginConfigs?.[this.id]?.columns || this.config.columns;
                const isCustomColumn = customColumns && customColumns.length > 0 && customColumns.some(col => col.id === columnId);
                
                // Check if using header-based columns
                const headers = items
                    .map((el, idx) => ({ el, idx }))
                    .filter(({ el }) => el.type === 'header-checkbox');
                const isHeaderBased = headers.length > 0 && !useStatusColumns && !isCustomColumn;
                
                // Check if moving within same column (for custom/status columns)
                const wasInColumn = (useStatusColumns || isCustomColumn) && element.kanbanColumn === columnId;
                
                // For custom/status columns, set kanbanColumn property
                if (useStatusColumns || isCustomColumn) {
                    element.kanbanColumn = columnId;
                }
                
                // For header-based columns, check if we're moving within the same column
                if (isHeaderBased && columnIndex !== undefined && columnIndex < headers.length) {
                    const targetHeader = headers[columnIndex];
                    // If moving within same column, use header-based positioning
                    if (currentIndex >= targetHeader.idx && 
                        (columnIndex === headers.length - 1 || currentIndex < headers[columnIndex + 1].idx)) {
                        // Moving within same column - use targetElementIndex directly
                        // targetElementIndex is already the correct position
                    } else {
                        // Moving to different column - position after header
                        targetIndex = targetHeader.idx + 1;
                    }
                }
                
                // For custom/status columns moving within same column, targetIndex is already correct
                // (it's the position in the bin where we want to insert)
                
                // Only move if index actually changed or column changed
                if (currentIndex !== targetIndex || (!wasInColumn && (useStatusColumns || isCustomColumn))) {
                    // Use requestAnimationFrame to prevent flash
                    e.preventDefault();
                    requestAnimationFrame(() => {
                        appInstance.dragDropHandler.moveElement(
                            pageId, binId, currentIndex,
                            pageId, binId, targetIndex
                        );
                    });
                }
            }
        } catch (err) {
            console.error('Error handling card drop:', err);
        }
    }
    
    setupColumnDropZone(columnContent, pageId, binId, columnId, columnIndex) {
        columnContent.addEventListener('dragover', (e) => {
            // Don't interfere with card drop zones
            if (e.target.closest('.kanban-drop-zone') || e.target.closest('.kanban-card')) {
                return;
            }
            e.preventDefault();
            e.stopPropagation();
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
            // Don't handle if dropped on a card or drop zone (they have their own handlers)
            if (e.target.closest('.kanban-drop-zone') || e.target.closest('.kanban-card')) {
                return;
            }
            // Don't prevent default here - let card/drop zone handlers handle it
            // This is just a fallback for empty column areas
            e.stopPropagation();
            columnContent.style.background = '';
            
            if (!this.app) {
                return;
            }
            
            try {
                // Try to get data from app.dragData first (set by dragstart)
                let dragPayload = this.app.dragData;
                if (!dragPayload) {
                    // Fallback: don't handle if no data
                    return;
                }
                
                if (!dragPayload || dragPayload.type !== 'element') {
                    return;
                }
                
                // Move element within the same bin to a different column
                const appInstance = window.app || this.app;
                const page = this._getPages(appInstance).find(p => p.id === pageId);
                const bin = page ? page.groups?.find(b => b.id === binId) : null;
                const items = bin ? this._getItems(bin) : [];
                if (!bin || !items[dragPayload.elementIndex]) return;
                
                const element = items[dragPayload.elementIndex];
                
                // Don't move headers themselves
                if (element.type === 'header-checkbox') {
                    return;
                }
                
                // Use the main drag handler for proper element movement
                if (appInstance.dragDropHandler) {
                    // Check if using header-based columns
                    const headers = items
                        .map((el, idx) => ({ el, idx }))
                        .filter(({ el }) => el.type === 'header-checkbox');
                    
                    const useStatusColumns = this.config.useStatusColumns || bin.pluginConfigs?.[this.id]?.useStatusColumns;
                    const customColumns = bin.pluginConfigs?.[this.id]?.columns || this.config.columns;
                    const isCustomColumn = customColumns && customColumns.length > 0 && customColumns.some(col => col.id === columnId);
                    let targetIndex;
                    
                    if (useStatusColumns || isCustomColumn) {
                        // Status/custom columns: append to end and set kanbanColumn
                        targetIndex = items.length;
                        element.kanbanColumn = columnId;
                    } else if (headers.length > 0 && columnIndex !== undefined && columnIndex < headers.length) {
                        // Header-based: move element to after the header for this column
                        const targetHeader = headers[columnIndex];
                        targetIndex = targetHeader.idx + 1;
                        
                        // If moving within same column, don't do anything
                        const currentIndex = parseInt(data.elementIndex);
                        if (currentIndex >= targetHeader.idx && 
                            (columnIndex === headers.length - 1 || currentIndex < headers[columnIndex + 1].idx)) {
                            // Already in this column
                            return;
                        }
                    } else {
                        // No headers and not status columns - append to end
                        targetIndex = items.length;
                    }
                    
                    // Use drag handler to move element
                    const currentIndex = parseInt(data.elementIndex);
                    if (currentIndex !== targetIndex) {
                        e.preventDefault();
                        requestAnimationFrame(() => {
                            appInstance.dragDropHandler.moveElement(
                                pageId, binId, currentIndex,
                                pageId, binId, targetIndex
                            );
                        });
                    }
                }
            } catch (err) {
                console.error('Error handling kanban drop:', err);
            }
        });
    }
    
    showAddColumnModal(pageId, binId) {
        const modal = document.getElementById('modal');
        const modalBody = document.getElementById('modal-body');
        
        // Store pageId and binId on the modal for access in the callback
        modal.dataset.kanbanPageId = pageId;
        modal.dataset.kanbanBinId = binId;
        
        let html = `
            <h3>Add Kanban Column</h3>
            <label>Column Title:</label>
            <input type="text" id="kanban-column-title" placeholder="Column name" />
            <label>Column Color:</label>
            <input type="color" id="kanban-column-color" value="#4a9eff" />
            <div style="margin-top: 20px;">
                <button id="add-kanban-column-btn">Add Column</button>
                <button class="cancel" onclick="app.modalHandler.closeModal()">Cancel</button>
            </div>
        `;
        
        modalBody.innerHTML = html;
        modal.classList.add('active');
        
        // Use setTimeout to ensure DOM is ready
        setTimeout(() => {
            const addBtn = document.getElementById('add-kanban-column-btn');
            if (addBtn) {
                // Remove any existing listeners by cloning
                const newBtn = addBtn.cloneNode(true);
                addBtn.parentNode.replaceChild(newBtn, addBtn);
                
                newBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    if (!this.app) {
                        console.error('[KanbanBoard] No app instance');
                        return;
                    }
                    
                    // Get pageId and binId from modal dataset
                    const modalPageId = modal.dataset.kanbanPageId;
                    const modalBinId = modal.dataset.kanbanBinId;
                    
                    if (!modalPageId || !modalBinId) {
                        console.error('[KanbanBoard] Missing pageId or binId in modal dataset', { modalPageId, modalBinId });
                        return;
                    }
                    
                    const titleInput = document.getElementById('kanban-column-title');
                    const colorInput = document.getElementById('kanban-column-color');
                    
                    if (!titleInput) {
                        console.error('[KanbanBoard] Title input not found');
                        return;
                    }
                    
                    const title = titleInput.value.trim();
                    const color = colorInput?.value || '#4a9eff';
                    
                    if (!title) {
                        alert('Please enter a column title');
                        return;
                    }
                    
                    // Get or create bin config
                    // Access pages through window.app as fallback
                    const appInstance = window.app || this.app;
                    if (!appInstance) {
                        alert('Error: App instance not available. Please refresh the page.');
                        return;
                    }
                    
                    let page = null;
                    page = this._getPages(appInstance).find(p => p.id === modalPageId);
                    
                    if (!page) {
                        console.error('[KanbanBoard] Page not found', { 
                            modalPageId,
                            availablePages: this._getPages(appInstance).map(p => p.id) || 'none'
                        });
                        alert(`Error: Could not find page "${modalPageId}". Please try again.`);
                        return;
                    }
                    
                    const bin = page.groups?.find(b => b.id === modalBinId);
                    if (!bin) {
                        console.error('[KanbanBoard] Bin not found', { 
                            modalBinId, 
                            availableBins: this._getGroups(page).map(b => b.id) || 'none' 
                        });
                        alert(`Error: Could not find bin "${modalBinId}". Please try again.`);
                        return;
                    }
                    
                    if (!bin.pluginConfigs) bin.pluginConfigs = {};
                    if (!bin.pluginConfigs[this.id]) bin.pluginConfigs[this.id] = {};
                    if (!bin.pluginConfigs[this.id].columns) bin.pluginConfigs[this.id].columns = [];
                    
                    const newColumn = {
                        id: title.toLowerCase().replace(/\s+/g, '-'),
                        title: title,
                        color: color
                    };
                    
                    bin.pluginConfigs[this.id].columns.push(newColumn);
                    
                    // Also update this.config.columns for consistency
                    if (!this.config.columns) this.config.columns = [];
                    this.config.columns.push(newColumn);
                    
                    // Save data
                    if (this.app.dataManager) {
                        this.app.dataManager.saveData();
                    }
                    
                    // Close modal
                    if (this.app.modalHandler) {
                        this.app.modalHandler.closeModal();
                    }
                    
                    // Re-render
                    if (this.app.render) {
                        this.app.render();
                    }
                });
            } else {
                console.error('[KanbanBoard] Add button not found');
            }
        }, 10);
    }
    
    renderSettingsUI() {
        let html = `
            <div>
                <label>
                    <input type="checkbox" id="kanban-enabled" ${this.config.enabled ? 'checked' : ''}>
                    Enable Kanban Board
                </label>
                <div id="kanban-columns-list" style="margin-top: 15px;">
                    <h4>Columns</h4>
        `;
        
        this.config.columns.forEach((column, index) => {
            html += `
                <div class="kanban-column-setting" style="margin-bottom: 10px; padding: 10px; background: #1a1a1a; border-radius: 4px;">
                    <input type="text" class="kanban-column-title" data-index="${index}" value="${StringUtils.escapeHtml(column.title)}" style="width: 200px; margin-right: 10px;" />
                    <input type="color" class="kanban-column-color" data-index="${index}" value="${column.color}" style="margin-right: 10px;" />
                    <button class="remove-kanban-column" data-index="${index}">Remove</button>
                </div>
            `;
        });
        
        html += `
                    <button id="add-kanban-column-setting" style="margin-top: 10px;">+ Add Column</button>
                </div>
            </div>
        `;
        
        return html;
    }
    
    saveSettings(formData) {
        this.config.enabled = formData.get('kanban-enabled') === 'on';
        
        // Update columns from settings
        const columnTitles = document.querySelectorAll('.kanban-column-title');
        const columnColors = document.querySelectorAll('.kanban-column-color');
        
        this.config.columns = [];
        columnTitles.forEach((titleInput, index) => {
            const colorInput = Array.from(columnColors).find(c => c.dataset.index === titleInput.dataset.index);
            if (titleInput.value.trim()) {
                this.config.columns.push({
                    id: titleInput.value.toLowerCase().replace(/\s+/g, '-'),
                    title: titleInput.value.trim(),
                    color: colorInput ? colorInput.value : '#4a9eff'
                });
            }
        });
        
    }
    
    async onDestroy() {
        if (this.app) {
            eventBus.off('bin:render', this.handleBinRender.bind(this));
        }
    }
}


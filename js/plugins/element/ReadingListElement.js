// ReadingListElement.js - Reading list element type
import { BaseElementType } from '../../core/BaseElementType.js';
import { DOMUtils } from '../../utils/dom.js';
import { StringUtils } from '../../utils/string.js';

export default class ReadingListElement extends BaseElementType {
    constructor() {
        super({
            id: 'reading-list-element',
            name: 'Reading List',
            description: 'Track books and articles with progress.',
            elementType: 'reading',
            keyboardShortcut: 'r'
        });
    }
    
    getDefaultData() {
        return {
            type: 'reading',
            text: 'Reading List',
            items: [],
            completed: false,
            persistent: true,
            children: []
        };
    }
    
    render(element, pageId, binId, elementIndex, container) {
        const readingDiv = DOMUtils.createElement('div', {
            className: 'element reading-element',
            dataset: {
                pageId: pageId,
                binId: binId,
                elementIndex: elementIndex
            },
            style: 'padding: 15px; background: #2a2a2a; border-radius: 4px; margin-bottom: 10px; border-left: 4px solid #3498db;'
        });
        
        // Title
        const title = DOMUtils.createElement('div', {
            className: 'reading-title',
            style: 'font-weight: bold; font-size: 14px; color: #e0e0e0; margin-bottom: 10px;'
        }, StringUtils.escapeHtml(element.text || 'Reading List'));
        
        readingDiv.appendChild(title);
        
        // Items list
        const itemsList = DOMUtils.createElement('div', {
            className: 'reading-items-list',
            style: 'max-height: 300px; overflow-y: auto;'
        });
        
        (element.items || []).forEach((item, index) => {
            const itemDiv = DOMUtils.createElement('div', {
                style: 'padding: 10px; background: #1a1a1a; border-radius: 4px; margin-bottom: 5px;'
            });
            
            const itemHeader = DOMUtils.createElement('div', {
                style: 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;'
            });
            
            const itemTitle = DOMUtils.createElement('div', {
                style: 'font-weight: bold; color: #e0e0e0;'
            }, StringUtils.escapeHtml(item.title || 'Untitled'));
            
            const statusBadge = DOMUtils.createElement('span', {
                style: `padding: 2px 8px; border-radius: 12px; font-size: 10px; background: ${this.getStatusColor(item.status)}; color: white;`
            }, StringUtils.escapeHtml(item.status || 'not-started'));
            
            itemHeader.appendChild(itemTitle);
            itemHeader.appendChild(statusBadge);
            itemDiv.appendChild(itemHeader);
            
            if (item.author) {
                const author = DOMUtils.createElement('div', {
                    style: 'font-size: 11px; color: #888; margin-bottom: 3px;'
                }, `by ${StringUtils.escapeHtml(item.author)}`);
                itemDiv.appendChild(author);
            }
            
            if (item.progress !== undefined) {
                const progressBar = DOMUtils.createElement('div', {
                    style: 'width: 100%; height: 6px; background: #1a1a1a; border-radius: 3px; overflow: hidden; margin-top: 5px;'
                });
                
                const progressFill = DOMUtils.createElement('div', {
                    style: `width: ${item.progress}%; height: 100%; background: #3498db; transition: width 0.3s;`
                });
                
                progressBar.appendChild(progressFill);
                itemDiv.appendChild(progressBar);
                
                const progressText = DOMUtils.createElement('div', {
                    style: 'font-size: 10px; color: #888; margin-top: 3px;'
                }, `${item.progress}% complete`);
                itemDiv.appendChild(progressText);
            }
            
            itemsList.appendChild(itemDiv);
        });
        
        readingDiv.appendChild(itemsList);
        container.appendChild(readingDiv);
    }
    
    getStatusColor(status) {
        const colors = {
            'not-started': '#888',
            'reading': '#3498db',
            'completed': '#27ae60',
            'paused': '#f39c12'
        };
        return colors[status] || '#888';
    }
    
    renderEditModalContent(elementData, pageId, binId, elementIndex) {
        const items = elementData.items || [];
        
        let html = `
            <div style="margin-top: 15px;">
                <label>Title:</label>
                <input type="text" id="reading-title-input" value="${StringUtils.escapeHtml(elementData.text || '')}" 
                       style="width: 100%; padding: 8px; margin-top: 5px; background: #1a1a1a; color: #e0e0e0; border: 1px solid #555; border-radius: 4px;" />
            </div>
            <div style="margin-top: 15px;">
                <label>Items:</label>
                <div id="reading-items-list" style="margin-top: 5px; max-height: 300px; overflow-y: auto;">
        `;
        
        items.forEach((item, index) => {
            html += `
                <div style="padding: 10px; background: #1a1a1a; border-radius: 4px; margin-bottom: 5px;">
                    <div style="display: flex; gap: 5px; margin-bottom: 5px;">
                        <input type="text" class="reading-item-title-input" data-index="${index}" value="${StringUtils.escapeHtml(item.title || '')}" placeholder="Title" style="flex: 2; padding: 6px; background: #2a2a2a; color: #e0e0e0; border: 1px solid #555; border-radius: 4px;" />
                        <input type="text" class="reading-item-author-input" data-index="${index}" value="${StringUtils.escapeHtml(item.author || '')}" placeholder="Author" style="flex: 1; padding: 6px; background: #2a2a2a; color: #e0e0e0; border: 1px solid #555; border-radius: 4px;" />
                    </div>
                    <div style="display: flex; gap: 5px; margin-bottom: 5px;">
                        <select class="reading-item-status-input" data-index="${index}" style="flex: 1; padding: 6px; background: #2a2a2a; color: #e0e0e0; border: 1px solid #555; border-radius: 4px;">
                            <option value="not-started" ${item.status === 'not-started' ? 'selected' : ''}>Not Started</option>
                            <option value="reading" ${item.status === 'reading' ? 'selected' : ''}>Reading</option>
                            <option value="paused" ${item.status === 'paused' ? 'selected' : ''}>Paused</option>
                            <option value="completed" ${item.status === 'completed' ? 'selected' : ''}>Completed</option>
                        </select>
                        <input type="number" class="reading-item-progress-input" data-index="${index}" value="${item.progress || 0}" placeholder="Progress %" min="0" max="100" style="width: 100px; padding: 6px; background: #2a2a2a; color: #e0e0e0; border: 1px solid #555; border-radius: 4px;" />
                        <button type="button" class="remove-reading-item-btn" data-index="${index}" style="padding: 2px 8px; background: #e74c3c; color: white; border: none; border-radius: 4px; cursor: pointer;">×</button>
                    </div>
                </div>
            `;
        });
        
        html += `
                </div>
                <button type="button" id="add-reading-item-btn" style="padding: 5px 10px; background: #4a9eff; color: white; border: none; border-radius: 4px; cursor: pointer; margin-top: 5px;">+ Add Item</button>
            </div>
        `;
        
        return html;
    }
    
    setupEditModalEventListeners(elementData, pageId, binId, elementIndex, modalBody) {
        // Add item
        const addBtn = modalBody.querySelector('#add-reading-item-btn');
        if (addBtn) {
            addBtn.addEventListener('click', () => {
                if (!elementData.items) elementData.items = [];
                elementData.items.push({
                    title: '',
                    author: '',
                    status: 'not-started',
                    progress: 0
                });
                this.app.modalHandler.showEditModal(pageId, binId, elementIndex, elementData);
            });
        }
        
        // Remove item
        modalBody.querySelectorAll('.remove-reading-item-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                elementData.items.splice(index, 1);
                this.app.modalHandler.showEditModal(pageId, binId, elementIndex, elementData);
            });
        });
    }
    
    saveEditModalContent(elementData, modalBody) {
        const titleInput = modalBody.querySelector('#reading-title-input');
        if (titleInput) {
            elementData.text = titleInput.value.trim();
        }
        
        // Save items
        const titleInputs = modalBody.querySelectorAll('.reading-item-title-input');
        const authorInputs = modalBody.querySelectorAll('.reading-item-author-input');
        const statusInputs = modalBody.querySelectorAll('.reading-item-status-input');
        const progressInputs = modalBody.querySelectorAll('.reading-item-progress-input');
        
        elementData.items = Array.from(titleInputs).map((input, index) => ({
            title: input.value.trim(),
            author: authorInputs[index]?.value.trim() || '',
            status: statusInputs[index]?.value || 'not-started',
            progress: parseInt(progressInputs[index]?.value || 0)
        }));
    }
}


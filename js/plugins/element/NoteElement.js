// NoteElement.js - Rich text note/journal element type
import { BaseElementType } from '../../core/BaseElementType.js';
import { DOMUtils } from '../../utils/dom.js';
import { StringUtils } from '../../utils/string.js';

export default class NoteElement extends BaseElementType {
    constructor() {
        super({
            id: 'note-element',
            name: 'Note/Journal',
            description: 'Rich text note and journal element with Markdown support.',
            elementType: 'note'
        });
    }
    
    getDefaultData() {
        return {
            type: 'note',
            text: '',
            content: '', // Rich text content (HTML or Markdown)
            format: 'markdown', // 'markdown' or 'html'
            completed: false,
            persistent: true, // Notes are persistent
            children: []
        };
    }
    
    render(element, pageId, binId, elementIndex, container) {
        const noteDiv = DOMUtils.createElement('div', {
            className: 'element note-element',
            dataset: {
                pageId: pageId,
                binId: binId,
                elementIndex: elementIndex
            },
            style: 'padding: 15px; background: #2a2a2a; border-radius: 4px; margin-bottom: 10px;'
        });
        
        // Note header
        const header = DOMUtils.createElement('div', {
            className: 'note-header',
            style: 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;'
        });
        
        const title = DOMUtils.createElement('div', {
            className: 'note-title',
            style: 'font-weight: bold; font-size: 14px; color: #e0e0e0;'
        }, StringUtils.escapeHtml(element.text || 'Untitled Note'));
        
        const editBtn = DOMUtils.createElement('button', {
            className: 'note-edit-btn',
            style: 'padding: 4px 8px; background: #4a9eff; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px;'
        }, 'Edit');
        
        editBtn.addEventListener('click', () => {
            this.app.modalHandler.showEditModal(pageId, binId, elementIndex, element);
        });
        
        header.appendChild(title);
        header.appendChild(editBtn);
        noteDiv.appendChild(header);
        
        // Note content
        const contentDiv = DOMUtils.createElement('div', {
            className: 'note-content',
            style: 'color: #ccc; font-size: 13px; line-height: 1.6; max-height: 300px; overflow-y: auto;'
        });
        
        if (element.format === 'markdown') {
            // Simple Markdown rendering (basic)
            contentDiv.innerHTML = this.renderMarkdown(element.content || '');
        } else {
            contentDiv.innerHTML = element.content || '<em>No content</em>';
        }
        
        noteDiv.appendChild(contentDiv);
        
        container.appendChild(noteDiv);
    }
    
    /**
     * Simple Markdown renderer (basic implementation)
     */
    renderMarkdown(markdown) {
        if (!markdown) return '';
        
        let html = StringUtils.escapeHtml(markdown);
        
        // Headers
        html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
        html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
        html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
        
        // Bold
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        
        // Italic
        html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
        
        // Links
        html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
        
        // Line breaks
        html = html.replace(/\n/g, '<br>');
        
        return html;
    }
    
    renderEditModalContent(elementData, pageId, binId, elementIndex) {
        return `
            <div style="margin-top: 15px;">
                <label>Note Title:</label>
                <input type="text" id="note-title-input" value="${StringUtils.escapeHtml(elementData.text || '')}" 
                       style="width: 100%; padding: 8px; margin-top: 5px; background: #1a1a1a; color: #e0e0e0; border: 1px solid #555; border-radius: 4px;" />
            </div>
            <div style="margin-top: 15px;">
                <label>Content Format:</label>
                <select id="note-format-select" style="width: 100%; padding: 8px; margin-top: 5px; background: #1a1a1a; color: #e0e0e0; border: 1px solid #555; border-radius: 4px;">
                    <option value="markdown" ${elementData.format === 'markdown' ? 'selected' : ''}>Markdown</option>
                    <option value="html" ${elementData.format === 'html' ? 'selected' : ''}>HTML</option>
                </select>
            </div>
            <div style="margin-top: 15px;">
                <label>Content:</label>
                <textarea id="note-content-input" 
                          style="width: 100%; height: 300px; padding: 8px; margin-top: 5px; background: #1a1a1a; color: #e0e0e0; border: 1px solid #555; border-radius: 4px; font-family: monospace;"
                          placeholder="Write your note here...">${StringUtils.escapeHtml(elementData.content || '')}</textarea>
            </div>
        `;
    }
    
    setupEditModalEventListeners(elementData, pageId, binId, elementIndex, modalBody) {
        // Event listeners are handled in ModalHandler's saveEdit
    }
    
    saveEditModalContent(elementData, modalBody) {
        const titleInput = modalBody.querySelector('#note-title-input');
        const formatSelect = modalBody.querySelector('#note-format-select');
        const contentInput = modalBody.querySelector('#note-content-input');
        
        if (titleInput) {
            elementData.text = titleInput.value.trim();
        }
        if (formatSelect) {
            elementData.format = formatSelect.value;
        }
        if (contentInput) {
            elementData.content = contentInput.value;
        }
    }
}



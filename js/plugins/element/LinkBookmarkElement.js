// LinkBookmarkElement.js - Link/bookmark element type
import { BaseElementType } from '../../core/BaseElementType.js';
import { DOMUtils } from '../../utils/dom.js';
import { StringUtils } from '../../utils/string.js';

export default class LinkBookmarkElement extends BaseElementType {
    constructor() {
        super({
            id: 'link-bookmark-element',
            name: 'Link/Bookmark',
            description: 'Save URLs with previews and metadata.',
            elementType: 'link',
            keyboardShortcut: 'l'
        });
    }
    
    getDefaultData() {
        return {
            type: 'link',
            text: '',
            url: '',
            description: '',
            favicon: '',
            preview: null, // { title, description, image }
            completed: false,
            persistent: true,
            children: []
        };
    }
    
    render(element, pageId, binId, elementIndex, container) {
        const linkDiv = DOMUtils.createElement('div', {
            className: 'element link-element',
            dataset: {
                pageId: pageId,
                binId: binId,
                elementIndex: elementIndex
            },
            style: 'padding: 15px; background: #2a2a2a; border-radius: 4px; margin-bottom: 10px; border-left: 4px solid #4a9eff;'
        });
        
        // Link header
        const header = DOMUtils.createElement('div', {
            className: 'link-header',
            style: 'display: flex; align-items: center; gap: 10px; margin-bottom: 10px;'
        });
        
        // Favicon or default icon
        const icon = DOMUtils.createElement('img', {
            src: element.favicon || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%234a9eff"><path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/></svg>',
            alt: 'Link',
            style: 'width: 20px; height: 20px;'
        });
        
        const title = DOMUtils.createElement('a', {
            href: element.url || '#',
            target: '_blank',
            rel: 'noopener noreferrer',
            className: 'link-title',
            style: 'font-weight: bold; color: #4a9eff; text-decoration: none; flex: 1;'
        }, StringUtils.escapeHtml(element.text || element.url || 'Untitled Link'));
        
        title.addEventListener('click', (e) => {
            if (!element.url) {
                e.preventDefault();
                this.app.modalHandler.showEditModal(pageId, binId, elementIndex, element);
            }
        });
        
        header.appendChild(icon);
        header.appendChild(title);
        linkDiv.appendChild(header);
        
        // Description
        if (element.description) {
            const desc = DOMUtils.createElement('div', {
                className: 'link-description',
                style: 'color: #888; font-size: 12px; margin-bottom: 5px;'
            }, StringUtils.escapeHtml(element.description));
            linkDiv.appendChild(desc);
        }
        
        // Preview
        if (element.preview && element.preview.image) {
            const previewImg = DOMUtils.createElement('img', {
                src: element.preview.image,
                alt: element.preview.title || '',
                style: 'width: 100%; max-height: 200px; object-fit: cover; border-radius: 4px; margin-top: 10px;'
            });
            linkDiv.appendChild(previewImg);
        }
        
        // URL display
        if (element.url) {
            const urlDisplay = DOMUtils.createElement('div', {
                className: 'link-url',
                style: 'color: #666; font-size: 11px; margin-top: 5px; word-break: break-all;'
            }, StringUtils.escapeHtml(element.url));
            linkDiv.appendChild(urlDisplay);
        }
        
        container.appendChild(linkDiv);
    }
    
    renderEditModalContent(elementData, pageId, binId, elementIndex) {
        return `
            <div style="margin-top: 15px;">
                <label>Link Title:</label>
                <input type="text" id="link-title-input" value="${StringUtils.escapeHtml(elementData.text || '')}" 
                       style="width: 100%; padding: 8px; margin-top: 5px; background: #1a1a1a; color: #e0e0e0; border: 1px solid #555; border-radius: 4px;" />
            </div>
            <div style="margin-top: 15px;">
                <label>URL:</label>
                <input type="url" id="link-url-input" value="${StringUtils.escapeHtml(elementData.url || '')}" 
                       placeholder="https://example.com"
                       style="width: 100%; padding: 8px; margin-top: 5px; background: #1a1a1a; color: #e0e0e0; border: 1px solid #555; border-radius: 4px;" />
            </div>
            <div style="margin-top: 15px;">
                <label>Description:</label>
                <textarea id="link-description-input" 
                          style="width: 100%; height: 80px; padding: 8px; margin-top: 5px; background: #1a1a1a; color: #e0e0e0; border: 1px solid #555; border-radius: 4px;"
                          placeholder="Optional description">${StringUtils.escapeHtml(elementData.description || '')}</textarea>
            </div>
            <div style="margin-top: 15px;">
                <button type="button" id="fetch-link-preview-btn" style="padding: 8px 15px; background: #4a9eff; color: white; border: none; border-radius: 4px; cursor: pointer;">Fetch Preview</button>
            </div>
        `;
    }
    
    setupEditModalEventListeners(elementData, pageId, binId, elementIndex, modalBody) {
        const fetchBtn = modalBody.querySelector('#fetch-link-preview-btn');
        if (fetchBtn) {
            fetchBtn.addEventListener('click', async () => {
                const urlInput = modalBody.querySelector('#link-url-input');
                const url = urlInput.value.trim();
                if (!url) {
                    alert('Please enter a URL');
                    return;
                }
                
                fetchBtn.disabled = true;
                fetchBtn.textContent = 'Fetching...';
                
                try {
                    // Simple preview fetch (in production, use a backend service)
                    const preview = await this.fetchLinkPreview(url);
                    elementData.preview = preview;
                    elementData.favicon = preview.favicon || '';
                    alert('Preview fetched!');
                } catch (error) {
                    alert('Failed to fetch preview: ' + error.message);
                } finally {
                    fetchBtn.disabled = false;
                    fetchBtn.textContent = 'Fetch Preview';
                }
            });
        }
    }
    
    async fetchLinkPreview(url) {
        // Simple implementation - in production, use a backend service or API
        // For now, return basic data
        try {
            const domain = new URL(url).hostname;
            return {
                title: domain,
                description: '',
                image: '',
                favicon: `https://www.google.com/s2/favicons?domain=${domain}&sz=32`
            };
        } catch (error) {
            return {
                title: '',
                description: '',
                image: '',
                favicon: ''
            };
        }
    }
    
    saveEditModalContent(elementData, modalBody) {
        const titleInput = modalBody.querySelector('#link-title-input');
        const urlInput = modalBody.querySelector('#link-url-input');
        const descriptionInput = modalBody.querySelector('#link-description-input');
        
        if (titleInput) {
            elementData.text = titleInput.value.trim();
        }
        if (urlInput) {
            elementData.url = urlInput.value.trim();
        }
        if (descriptionInput) {
            elementData.description = descriptionInput.value.trim();
        }
    }
}


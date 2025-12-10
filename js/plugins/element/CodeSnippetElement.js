// CodeSnippetElement.js - Code snippet element type
import { BaseElementType } from '../../core/BaseElementType.js';
import { DOMUtils } from '../../utils/dom.js';
import { StringUtils } from '../../utils/string.js';

export default class CodeSnippetElement extends BaseElementType {
    constructor() {
        super({
            id: 'code-snippet-element',
            name: 'Code Snippet',
            description: 'Syntax-highlighted code blocks.',
            elementType: 'code',
            keyboardShortcut: 'k'
        });
    }
    
    getDefaultData() {
        return {
            type: 'code',
            text: '',
            code: '',
            language: 'javascript',
            completed: false,
            persistent: true,
            children: []
        };
    }
    
    render(element, pageId, binId, elementIndex, container) {
        const codeDiv = DOMUtils.createElement('div', {
            className: 'element code-element',
            dataset: {
                pageId: pageId,
                binId: binId,
                elementIndex: elementIndex
            },
            style: 'padding: 15px; background: #2a2a2a; border-radius: 4px; margin-bottom: 10px; border-left: 4px solid #27ae60;'
        });
        
        // Code header
        const header = DOMUtils.createElement('div', {
            className: 'code-header',
            style: 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;'
        });
        
        const title = DOMUtils.createElement('div', {
            className: 'code-title',
            style: 'font-weight: bold; font-size: 14px; color: #e0e0e0;'
        }, StringUtils.escapeHtml(element.text || 'Code Snippet'));
        
        const languageBadge = DOMUtils.createElement('span', {
            className: 'code-language',
            style: 'padding: 2px 8px; background: #27ae60; color: white; border-radius: 12px; font-size: 10px;'
        }, StringUtils.escapeHtml(element.language || 'text'));
        
        header.appendChild(title);
        header.appendChild(languageBadge);
        codeDiv.appendChild(header);
        
        // Code block
        const codeBlock = DOMUtils.createElement('pre', {
            className: 'code-block',
            style: 'background: #1a1a1a; padding: 15px; border-radius: 4px; overflow-x: auto; margin: 0;'
        });
        
        const codeElement = DOMUtils.createElement('code', {
            className: `language-${element.language || 'text'}`,
            style: 'color: #e0e0e0; font-family: "Courier New", monospace; font-size: 13px; line-height: 1.5;'
        }, StringUtils.escapeHtml(element.code || '// No code yet'));
        
        codeBlock.appendChild(codeElement);
        codeDiv.appendChild(codeBlock);
        
        // Copy button
        const copyBtn = DOMUtils.createElement('button', {
            className: 'code-copy-btn',
            style: 'margin-top: 10px; padding: 5px 10px; background: #4a9eff; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px;'
        }, 'Copy Code');
        
        copyBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(element.code || '').then(() => {
                copyBtn.textContent = 'Copied!';
                setTimeout(() => {
                    copyBtn.textContent = 'Copy Code';
                }, 2000);
            });
        });
        
        codeDiv.appendChild(copyBtn);
        container.appendChild(codeDiv);
    }
    
    renderEditModalContent(elementData, pageId, binId, elementIndex) {
        const languages = [
            'text', 'javascript', 'typescript', 'python', 'java', 'cpp', 'c', 'csharp',
            'php', 'ruby', 'go', 'rust', 'swift', 'kotlin', 'html', 'css', 'scss',
            'json', 'xml', 'yaml', 'markdown', 'sql', 'bash', 'shell', 'dockerfile'
        ];
        
        return `
            <div style="margin-top: 15px;">
                <label>Title:</label>
                <input type="text" id="code-title-input" value="${StringUtils.escapeHtml(elementData.text || '')}" 
                       style="width: 100%; padding: 8px; margin-top: 5px; background: #1a1a1a; color: #e0e0e0; border: 1px solid #555; border-radius: 4px;" />
            </div>
            <div style="margin-top: 15px;">
                <label>Language:</label>
                <select id="code-language-select" style="width: 100%; padding: 8px; margin-top: 5px; background: #1a1a1a; color: #e0e0e0; border: 1px solid #555; border-radius: 4px;">
                    ${languages.map(lang => 
                        `<option value="${lang}" ${elementData.language === lang ? 'selected' : ''}>${lang}</option>`
                    ).join('')}
                </select>
            </div>
            <div style="margin-top: 15px;">
                <label>Code:</label>
                <textarea id="code-content-input" 
                          style="width: 100%; height: 300px; padding: 8px; margin-top: 5px; background: #1a1a1a; color: #e0e0e0; border: 1px solid #555; border-radius: 4px; font-family: monospace; font-size: 12px;"
                          placeholder="Enter your code here...">${StringUtils.escapeHtml(elementData.code || '')}</textarea>
            </div>
        `;
    }
    
    saveEditModalContent(elementData, modalBody) {
        const titleInput = modalBody.querySelector('#code-title-input');
        const languageSelect = modalBody.querySelector('#code-language-select');
        const codeInput = modalBody.querySelector('#code-content-input');
        
        if (titleInput) {
            elementData.text = titleInput.value.trim();
        }
        if (languageSelect) {
            elementData.language = languageSelect.value;
        }
        if (codeInput) {
            elementData.code = codeInput.value;
        }
    }
}


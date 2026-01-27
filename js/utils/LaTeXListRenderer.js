// LaTeXListRenderer.js - Renders LaTeX list environments
export class LaTeXListRenderer {
    constructor(latexRenderer) {
        this.latexRenderer = latexRenderer;
    }
    
    /**
     * Render list
     * @param {string} type - List type (itemize, enumerate, description)
     * @param {Array} contentBlocks - Content blocks
     * @returns {Promise<HTMLElement>} Rendered list
     */
    async renderList(type, contentBlocks) {
        const container = document.createElement('div');
        container.className = `latex-list latex-${type}`;
        container.style.cssText = 'margin: 10px 0; padding-left: 30px;';
        
        const listType = type === 'enumerate' ? 'ol' : 'ul';
        const list = document.createElement(listType);
        
        let currentItem = null;
        for (const block of contentBlocks) {
            if (block.type === 'command' && block.command === 'item') {
                if (currentItem) {
                    list.appendChild(currentItem);
                }
                currentItem = document.createElement('li');
                const itemText = block.requiredArg || '';
                if (itemText) {
                    currentItem.textContent = itemText;
                }
            } else if (currentItem) {
                // Add content to current item
                const rendered = await this.latexRenderer.renderBlock(block);
                if (rendered) {
                    if (typeof rendered === 'string') {
                        currentItem.appendChild(document.createTextNode(rendered));
                    } else {
                        currentItem.appendChild(rendered);
                    }
                }
            }
        }
        
        if (currentItem) {
            list.appendChild(currentItem);
        }
        
        container.appendChild(list);
        return container;
    }
}

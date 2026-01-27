// LaTeXTableRenderer.js - Renders LaTeX table environments
export class LaTeXTableRenderer {
    constructor() {
        // No constructor needed
    }
    
    /**
     * Render table
     * @param {Array} contentBlocks - Content blocks
     * @returns {Promise<HTMLElement>} Rendered table
     */
    async renderTable(contentBlocks) {
        const container = document.createElement('div');
        container.className = 'latex-table';
        container.style.cssText = 'margin: 20px 0; overflow-x: auto;';
        
        // Find tabletitle command
        const titleBlock = contentBlocks.find(b => 
            b.type === 'command' && b.command === 'tabletitle'
        );
        
        if (titleBlock) {
            const title = document.createElement('div');
            title.className = 'latex-table-title';
            title.textContent = titleBlock.requiredArg || titleBlock.optionalArg || '';
            title.style.cssText = 'font-weight: bold; margin-bottom: 10px;';
            container.appendChild(title);
        }
        
        // Find tabular environment
        const tabularContent = contentBlocks.find(b => 
            b.type === 'environment' && b.environment === 'tabular'
        );
        
        if (tabularContent) {
            const table = document.createElement('table');
            table.style.cssText = 'border-collapse: collapse; width: 100%; margin: 10px 0;';
            
            // Parse tabular content (simplified)
            let content = tabularContent.content;
            content = content.replace(/\\tch\{([^}]+)\}/g, '$1');
            content = content.replace(/\\tsh\{([^}]+)\}/g, '$1');
            content = content.replace(/\\multicolumn\{[^}]+\}\{([^}]+)\}\{([^}]+)\}/g, '$2');
            content = content.replace(/\\hline/g, '');
            content = content.replace(/\\\[[0-9]+pt\]/g, '');
            
            const rows = content.split('\\\\').filter(r => r.trim());
            rows.forEach((row, i) => {
                const tr = document.createElement('tr');
                const cells = row.split('&').map(c => c.trim().replace(/[{}]/g, ''));
                cells.forEach(cell => {
                    const td = document.createElement(i === 0 ? 'th' : 'td');
                    td.textContent = cell;
                    td.style.cssText = 'border: 1px solid #ddd; padding: 8px; text-align: left;';
                    tr.appendChild(td);
                });
                if (cells.length > 0) {
                    table.appendChild(tr);
                }
            });
            
            container.appendChild(table);
        }
        
        return container;
    }
}

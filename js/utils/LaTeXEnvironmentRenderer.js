// LaTeXEnvironmentRenderer.js - Coordinates LaTeX environment rendering
import { LaTeXListRenderer } from './LaTeXListRenderer.js';
import { LaTeXTableRenderer } from './LaTeXTableRenderer.js';
import { LaTeXFigureRenderer } from './LaTeXFigureRenderer.js';
import { LaTeXSpecialEnvironmentRenderer } from './LaTeXSpecialEnvironmentRenderer.js';

export class LaTeXEnvironmentRenderer {
    constructor(latexRenderer) {
        this.latexRenderer = latexRenderer;
        this.listRenderer = new LaTeXListRenderer(latexRenderer);
        this.tableRenderer = new LaTeXTableRenderer();
        this.figureRenderer = new LaTeXFigureRenderer();
        this.specialRenderer = new LaTeXSpecialEnvironmentRenderer(latexRenderer);
    }
    
    /**
     * Render environment
     * @param {Object} block - Environment block
     * @param {Object} options - Rendering options
     * @returns {Promise<HTMLElement>} Rendered element
     */
    async renderEnvironment(block, options = {}) {
        const { environment, content } = block;
        
        // Parse environment content
        let contentBlocks = [];
        if (options.parser) {
            contentBlocks = options.parser.parse(content);
        } else {
            // Simple fallback: treat as text
            contentBlocks = [{ type: 'text', content: content }];
        }
        
        // Handle specific environments
        switch (environment) {
            case 'itemize':
            case 'enumerate':
            case 'description':
                return await this.listRenderer.renderList(environment, contentBlocks);
            
            case 'table':
                return await this.tableRenderer.renderTable(contentBlocks);
            
            case 'figure':
                return await this.figureRenderer.renderFigure(contentBlocks);
            
            case 'equation':
                return this.renderEquation(contentBlocks);
            
            case 'verbatim':
                return this.renderVerbatim(content);
            
            case 'theorem':
            case 'proof':
            case 'definition':
            case 'lemma':
            case 'corollary':
            case 'proposition':
            case 'example':
                return await this.specialRenderer.renderTheorem(environment, contentBlocks);
            
            case 'quote':
            case 'quotation':
                return await this.specialRenderer.renderQuote(environment, contentBlocks);
            
            case 'VT1':
            case 'VF':
                return await this.specialRenderer.renderVF(environment, contentBlocks);
            
            case 'shadebox':
            case 'shortbox':
                return await this.specialRenderer.renderBox(environment, contentBlocks);
            
            case 'extract':
                return await this.specialRenderer.renderExtract(contentBlocks);
            
            case 'Glossary':
                return await this.specialRenderer.renderGlossary(contentBlocks);
            
            case 'center':
                return await this._renderCenter(contentBlocks, options);
            
            default:
                return await this._renderGenericEnvironment(environment, contentBlocks, options);
        }
    }
    
    /**
     * Render list (delegates to list renderer)
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
    
    /**
     * Render table
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
    
    /**
     * Render figure
     */
    async renderFigure(contentBlocks) {
        const container = document.createElement('div');
        container.className = 'latex-figure';
        container.style.cssText = 'margin: 20px 0; text-align: center;';
        
        // Find center environment or subfigures
        const centerEnv = contentBlocks.find(b => 
            b.type === 'environment' && b.environment === 'center'
        );
        
        if (centerEnv) {
            // Handle subfigures
            const subfigures = [];
            for (const block of contentBlocks) {
                if (block.type === 'command' && block.command === 'subfigure') {
                    subfigures.push(block);
                }
            }
            
            if (subfigures.length > 0) {
                const subContainer = document.createElement('div');
                subContainer.style.cssText = 'display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;';
                
                for (const subfig of subfigures) {
                    const sub = document.createElement('div');
                    sub.style.cssText = 'border: 1px dashed #888; padding: 20px; background: #2a2a2a; min-width: 150px;';
                    const label = subfig.optionalArg ? `[${subfig.optionalArg}]` : '';
                    const graphics = subfig.requiredArg || '';
                    sub.textContent = `[Subfigure ${label}: ${graphics}]`;
                    subContainer.appendChild(sub);
                }
                container.appendChild(subContainer);
            }
        }
        
        // Find includegraphics
        const graphics = contentBlocks.find(b => 
            b.type === 'command' && b.command === 'includegraphics'
        );
        
        if (graphics) {
            const img = document.createElement('div');
            img.textContent = `[Image: ${graphics.requiredArg || ''}]`;
            img.style.cssText = 'border: 1px dashed #888; padding: 40px; background: #2a2a2a; margin: 10px auto; max-width: 100%;';
            container.appendChild(img);
        }
        
        // Find caption
        const caption = contentBlocks.find(b => 
            b.type === 'command' && b.command === 'caption'
        );
        
        if (caption) {
            const cap = document.createElement('div');
            const captionText = caption.optionalArg || caption.requiredArg || '';
            cap.textContent = `Figure: ${captionText}`;
            cap.style.cssText = 'margin-top: 10px; font-style: italic;';
            container.appendChild(cap);
        }
        
        return container;
    }
    
    /**
     * Render equation
     */
    renderEquation(contentBlocks) {
        const container = document.createElement('div');
        container.className = 'latex-equation';
        container.style.cssText = 'margin: 20px 0; text-align: center;';
        
        // Extract math content
        const mathBlock = contentBlocks.find(b => 
            b.type === 'display-math' || b.type === 'inline-math'
        );
        
        if (mathBlock) {
            const mathRenderer = this.latexRenderer.mathRenderer;
            const rendered = mathRenderer.renderDisplayMath(mathBlock);
            container.appendChild(rendered);
        }
        
        return container;
    }
    
    /**
     * Render verbatim
     */
    renderVerbatim(content) {
        const element = document.createElement('pre');
        element.className = 'latex-verbatim';
        element.textContent = content;
        element.style.cssText = `
            background: #1a1a1a;
            padding: 15px;
            border-radius: 4px;
            overflow-x: auto;
            font-family: 'Courier New', monospace;
            margin: 10px 0;
        `;
        return element;
    }
    
    /**
     * Render theorem (delegates to special renderer)
     */
    async renderTheorem(type, contentBlocks) {
        return await this.specialRenderer.renderTheorem(type, contentBlocks);
    }
    
    /**
     * Render quote (delegates to special renderer)
     */
    async renderQuote(type, contentBlocks) {
        return await this.specialRenderer.renderQuote(type, contentBlocks);
    }
    
    /**
     * Render VF (delegates to special renderer)
     */
    async renderVF(type, contentBlocks) {
        return await this.specialRenderer.renderVF(type, contentBlocks);
    }
    
    /**
     * Render box (delegates to special renderer)
     */
    async renderBox(type, contentBlocks) {
        return await this.specialRenderer.renderBox(type, contentBlocks);
    }
    
    /**
     * Render extract (delegates to special renderer)
     */
    async renderExtract(contentBlocks) {
        return await this.specialRenderer.renderExtract(contentBlocks);
    }
    
    /**
     * Render glossary (delegates to special renderer)
     */
    async renderGlossary(contentBlocks) {
        return await this.specialRenderer.renderGlossary(contentBlocks);
    }
    
    /**
     * Render center environment
     * @private
     */
    async _renderCenter(contentBlocks, options) {
        const centerContainer = document.createElement('div');
        centerContainer.style.cssText = 'text-align: center; margin: 10px 0;';
        const centerRendered = await this.latexRenderer.render(contentBlocks, { ...options, parser: options.parser });
        centerContainer.appendChild(centerRendered);
        return centerContainer;
    }
    
    /**
     * Render generic environment
     * @private
     */
    async _renderGenericEnvironment(environment, contentBlocks, options) {
        const container = document.createElement('div');
        container.className = `latex-environment latex-${environment}`;
        const rendered = await this.latexRenderer.render(contentBlocks, { ...options, parser: options.parser });
        container.appendChild(rendered);
        container.style.cssText = 'margin: 10px 0; padding: 10px; border-left: 3px solid #4a9eff;';
        return container;
    }
}

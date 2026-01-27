// LaTeXSpecialEnvironmentRenderer.js - Renders special LaTeX environments (theorem, quote, VF, box, etc.)
export class LaTeXSpecialEnvironmentRenderer {
    constructor(latexRenderer) {
        this.latexRenderer = latexRenderer;
    }
    
    /**
     * Render theorem-like environment
     */
    async renderTheorem(type, contentBlocks) {
        const container = document.createElement('div');
        container.className = `latex-theorem latex-${type}`;
        container.style.cssText = `
            margin: 15px 0;
            padding: 15px;
            border-left: 4px solid #4a9eff;
            background: rgba(74, 158, 255, 0.1);
        `;
        
        const heading = document.createElement('div');
        heading.textContent = type.charAt(0).toUpperCase() + type.slice(1);
        heading.style.cssText = 'font-weight: bold; margin-bottom: 10px; color: #4a9eff;';
        container.appendChild(heading);
        
        // Render content
        for (const block of contentBlocks) {
            const rendered = await this.latexRenderer.renderBlock(block);
            if (rendered) {
                container.appendChild(rendered);
            }
        }
        
        return container;
    }
    
    /**
     * Render quote
     */
    async renderQuote(type, contentBlocks) {
        const container = document.createElement('blockquote');
        container.className = `latex-quote latex-${type}`;
        container.style.cssText = `
            margin: 15px 0;
            padding: 10px 20px;
            border-left: 3px solid #888;
            font-style: italic;
        `;
        
        for (const block of contentBlocks) {
            const rendered = await this.latexRenderer.renderBlock(block);
            if (rendered) {
                container.appendChild(rendered);
            }
        }
        
        return container;
    }
    
    /**
     * Render VF/VT1 environment
     */
    async renderVF(type, contentBlocks) {
        const container = document.createElement('div');
        container.className = `latex-vf latex-${type}`;
        container.style.cssText = `
            margin: 20px 0;
            padding: 15px;
            border-left: 4px solid #4a9eff;
            background: rgba(74, 158, 255, 0.1);
            font-style: italic;
        `;
        
        for (const block of contentBlocks) {
            // Handle \VA, \VH, \VT, \VTA commands specially
            if (block.type === 'command') {
                if (block.command === 'VA' || block.command === 'VTA') {
                    const va = document.createElement('div');
                    va.style.cssText = 'text-align: right; margin-top: 10px; font-weight: bold;';
                    va.textContent = block.requiredArg || '';
                    if (block.optionalArg) {
                        const sub = document.createElement('div');
                        sub.style.cssText = 'font-size: 0.9em; font-weight: normal; font-style: italic;';
                        sub.textContent = block.optionalArg;
                        va.appendChild(sub);
                    }
                    container.appendChild(va);
                    continue;
                } else if (block.command === 'VH') {
                    const vh = document.createElement('div');
                    vh.style.cssText = 'text-align: center; font-weight: bold; margin: 15px 0; font-style: italic;';
                    vh.textContent = block.requiredArg || '';
                    container.appendChild(vh);
                    continue;
                } else if (block.command === 'VT') {
                    const vt = document.createElement('div');
                    vt.style.cssText = 'margin: 10px 0;';
                    container.appendChild(vt);
                    continue;
                }
            }
            
            const rendered = await this.latexRenderer.renderBlock(block);
            if (rendered) {
                container.appendChild(rendered);
            }
        }
        
        return container;
    }
    
    /**
     * Render box environment
     */
    async renderBox(type, contentBlocks) {
        const container = document.createElement('div');
        container.className = `latex-box latex-${type}`;
        container.style.cssText = `
            margin: 15px 0;
            padding: 15px;
            ${type === 'shadebox' ? 'background: rgba(128, 128, 128, 0.2);' : 'border: 1px solid #888;'}
            border-radius: 4px;
        `;
        
        for (const block of contentBlocks) {
            // Handle \Boxhead command
            if (block.type === 'command' && block.command === 'Boxhead') {
                const heading = document.createElement('div');
                heading.textContent = block.requiredArg || '';
                heading.style.cssText = 'font-weight: bold; margin-bottom: 10px; text-align: center;';
                container.appendChild(heading);
                continue;
            }
            
            const rendered = await this.latexRenderer.renderBlock(block);
            if (rendered) {
                container.appendChild(rendered);
            }
        }
        
        return container;
    }
    
    /**
     * Render extract environment
     */
    async renderExtract(contentBlocks) {
        const container = document.createElement('div');
        container.className = 'latex-extract';
        container.style.cssText = `
            margin: 15px 0;
            padding: 15px;
            border-left: 3px solid #888;
            font-style: italic;
            background: rgba(128, 128, 128, 0.1);
        `;
        
        for (const block of contentBlocks) {
            const rendered = await this.latexRenderer.renderBlock(block);
            if (rendered) {
                container.appendChild(rendered);
            }
        }
        
        return container;
    }
    
    /**
     * Render Glossary environment
     */
    async renderGlossary(contentBlocks) {
        const container = document.createElement('div');
        container.className = 'latex-glossary';
        container.style.cssText = 'margin: 20px 0;';
        
        const heading = document.createElement('div');
        heading.textContent = 'Glossary';
        heading.style.cssText = 'font-weight: bold; font-size: 1.2em; margin-bottom: 15px;';
        container.appendChild(heading);
        
        const list = document.createElement('dl');
        list.style.cssText = 'margin: 0; padding: 0;';
        
        let currentTerm = null;
        for (const block of contentBlocks) {
            if (block.type === 'command' && block.command === 'item') {
                if (currentTerm) {
                    list.appendChild(currentTerm);
                }
                currentTerm = document.createElement('div');
                currentTerm.style.cssText = 'margin: 10px 0; padding: 5px 0;';
                
                // Parse item argument for term and definition
                const itemArg = block.requiredArg || '';
                const match = itemArg.match(/\[([^\]]+)\](.+)/);
                if (match) {
                    const term = document.createElement('dt');
                    term.textContent = match[1];
                    term.style.cssText = 'font-weight: bold; margin-bottom: 5px;';
                    currentTerm.appendChild(term);
                    
                    const def = document.createElement('dd');
                    def.textContent = match[2];
                    def.style.cssText = 'margin-left: 20px; margin-bottom: 10px;';
                    currentTerm.appendChild(def);
                } else {
                    const term = document.createElement('dt');
                    term.textContent = itemArg;
                    term.style.cssText = 'font-weight: bold;';
                    currentTerm.appendChild(term);
                }
            } else if (currentTerm) {
                const rendered = await this.latexRenderer.renderBlock(block);
                if (rendered) {
                    const dd = currentTerm.querySelector('dd') || document.createElement('dd');
                    if (!currentTerm.querySelector('dd')) {
                        dd.style.cssText = 'margin-left: 20px;';
                        currentTerm.appendChild(dd);
                    }
                    dd.appendChild(rendered);
                }
            }
        }
        
        if (currentTerm) {
            list.appendChild(currentTerm);
        }
        
        container.appendChild(list);
        return container;
    }
}

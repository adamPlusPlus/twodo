// LaTeXFigureRenderer.js - Renders LaTeX figure environments
export class LaTeXFigureRenderer {
    constructor() {
        // No constructor needed
    }
    
    /**
     * Render figure
     * @param {Array} contentBlocks - Content blocks
     * @returns {Promise<HTMLElement>} Rendered figure
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
}

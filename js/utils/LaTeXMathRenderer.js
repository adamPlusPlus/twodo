// LaTeXMathRenderer.js - Renders LaTeX math expressions
export class LaTeXMathRenderer {
    constructor() {
        // No constructor needed
    }
    
    /**
     * Render inline math
     * @param {Object} block - Math block
     * @returns {HTMLElement} Rendered element
     */
    renderInlineMath(block) {
        const element = document.createElement('span');
        element.className = 'latex-inline-math';
        element.setAttribute('data-latex', block.content);
        
        if (window.katex) {
            try {
                katex.render(block.content, element, { 
                    displayMode: false, 
                    throwOnError: false 
                });
            } catch (e) {
                element.textContent = `$${block.content}$`;
                element.style.color = '#ff5555';
            }
        } else {
            element.textContent = `$${block.content}$`;
        }
        
        return element;
    }
    
    /**
     * Render display math
     * @param {Object} block - Math block
     * @returns {HTMLElement} Rendered element
     */
    renderDisplayMath(block) {
        const element = document.createElement('div');
        element.className = 'latex-display-math';
        element.style.cssText = 'margin: 20px 0; text-align: center;';
        element.setAttribute('data-latex', block.content);
        
        if (window.katex) {
            try {
                katex.render(block.content, element, { 
                    displayMode: true, 
                    throwOnError: false 
                });
            } catch (e) {
                element.textContent = `$$${block.content}$$`;
                element.style.color = '#ff5555';
            }
        } else {
            element.textContent = `$$${block.content}$$`;
        }
        
        return element;
    }
}

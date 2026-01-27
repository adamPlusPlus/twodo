// LaTeXUtils.js - LaTeX rendering utilities
export class LaTeXUtils {
    constructor() {
        // No constructor needed
    }
    
    /**
     * Render text block
     * @param {Object} block - Text block
     * @returns {HTMLElement} Rendered element
     */
    renderText(block) {
        const element = document.createElement('div');
        element.className = 'latex-text';
        element.textContent = block.content;
        element.style.cssText = 'margin: 8px 0;';
        return element;
    }
    
    /**
     * Render comment
     * @param {Object} block - Comment block
     * @returns {HTMLElement} Rendered element
     */
    renderComment(block) {
        const element = document.createElement('div');
        element.className = 'latex-comment';
        element.textContent = block.content;
        element.style.cssText = 'color: #888; font-style: italic; margin: 4px 0;';
        return element;
    }
    
    /**
     * Load KaTeX library
     * @returns {Promise<void>}
     */
    async loadKaTeX() {
        return new Promise((resolve) => {
            if (window.katex) {
                resolve();
                return;
            }
            
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css';
            document.head.appendChild(link);
            
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js';
            script.onload = () => {
                resolve();
            };
            script.onerror = () => {
                console.error('Failed to load KaTeX');
                resolve(); // Resolve anyway
            };
            document.head.appendChild(script);
        });
    }
    
    /**
     * Render file include
     * @param {string} command - Include command type
     * @param {string} filename - Filename to include
     * @param {Object} options - Rendering options
     * @param {Object} fileManager - File manager instance
     * @param {Function} renderFn - Render function
     * @returns {Promise<HTMLElement>} Rendered element
     */
    async renderInclude(command, filename, options, fileManager, renderFn) {
        if (!fileManager) {
            const element = document.createElement('span');
            element.textContent = `[Include: ${filename}]`;
            element.style.cssText = 'color: #888; font-style: italic;';
            return element;
        }
        
        try {
            // Load included file
            const { content } = await fileManager.importFromTex(filename);
            if (!content) {
                const element = document.createElement('span');
                element.textContent = `[File not found: ${filename}]`;
                element.style.cssText = 'color: #ff5555; font-style: italic;';
                return element;
            }
            
            // Parse and render included content
            const parser = options?.parser || new (await import('./LaTeXParser.js')).LaTeXParser();
            const blocks = parser.parse(content);
            const container = document.createElement('div');
            container.className = `latex-include latex-${command}`;
            container.style.cssText = 'margin: 10px 0; padding: 10px; border-left: 2px solid #888;';
            
            const rendered = await renderFn(blocks, { ...options, parser });
            container.appendChild(rendered);
            
            return container;
        } catch (error) {
            console.error(`Error loading include ${filename}:`, error);
            const element = document.createElement('span');
            element.textContent = `[Error loading: ${filename}]`;
            element.style.cssText = 'color: #ff5555; font-style: italic;';
            return element;
        }
    }
}

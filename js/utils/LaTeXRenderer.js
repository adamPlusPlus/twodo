// LaTeXRenderer.js - Enhanced LaTeX renderer for full document support
import { LaTeXMathRenderer } from './LaTeXMathRenderer.js';
import { LaTeXCommandRenderer } from './LaTeXCommandRenderer.js';
import { LaTeXEnvironmentRenderer } from './LaTeXEnvironmentRenderer.js';
import { LaTeXBlockRenderer } from './LaTeXBlockRenderer.js';
import { LaTeXUtils } from './LaTeXUtils.js';

export class LaTeXRenderer {
    constructor(fileManager = null) {
        this.fileManager = fileManager;
        this.katexLoaded = false;
        
        // Initialize renderers
        this.utils = new LaTeXUtils();
        this.mathRenderer = new LaTeXMathRenderer();
        this.commandRenderer = new LaTeXCommandRenderer(this);
        this.environmentRenderer = new LaTeXEnvironmentRenderer(this);
        this.blockRenderer = new LaTeXBlockRenderer(this);
    }
    
    /**
     * Render LaTeX blocks to HTML
     * @param {Array<Object>} blocks - Parsed LaTeX blocks
     * @param {Object} options - Rendering options
     * @returns {Promise<HTMLElement>} Rendered container
     */
    async render(blocks, options = {}) {
        const container = document.createElement('div');
        container.className = 'latex-rendered-document';
        container.style.cssText = `
            max-width: 100%;
            word-wrap: break-word;
            line-height: 1.6;
            font-family: 'Times New Roman', serif;
        `;
        
        // Load KaTeX if needed
        if (!this.katexLoaded && window.katex) {
            this.katexLoaded = true;
        } else if (!this.katexLoaded) {
            await this.utils.loadKaTeX();
            this.katexLoaded = true;
        }
        
        for (const block of blocks) {
            const element = await this.blockRenderer.renderBlock(block, options);
            if (element) {
                container.appendChild(element);
            }
        }
        
        return container;
    }
    
    /**
     * Render a single block (delegates to block renderer)
     */
    async renderBlock(block, options = {}) {
        return await this.blockRenderer.renderBlock(block, options);
    }
    
    /**
     * Render text block (delegates to utils)
     */
    renderText(block) {
        return this.utils.renderText(block);
    }
    
    /**
     * Render comment (delegates to utils)
     */
    renderComment(block) {
        return this.utils.renderComment(block);
    }
    
    /**
     * Render inline math (delegates to math renderer)
     */
    renderInlineMath(block) {
        return this.mathRenderer.renderInlineMath(block);
    }
    
    /**
     * Render display math (delegates to math renderer)
     */
    renderDisplayMath(block) {
        return this.mathRenderer.renderDisplayMath(block);
    }
    
    /**
     * Render command (delegates to command renderer)
     */
    async renderCommand(block, options = {}) {
        return await this.commandRenderer.renderCommand(block, options);
    }
    
    /**
     * Render environment (delegates to environment renderer)
     */
    async renderEnvironment(block, options = {}) {
        return await this.environmentRenderer.renderEnvironment(block, options);
    }
    
    /**
     * Render section (delegates to command renderer)
     */
    renderSection(type, title) {
        return this.commandRenderer.renderSection(type, title);
    }
    
    /**
     * Render text format (delegates to command renderer)
     */
    renderTextFormat(command, text) {
        return this.commandRenderer.renderTextFormat(command, text);
    }
    
    /**
     * Render reference (delegates to command renderer)
     */
    renderReference(type, target) {
        return this.commandRenderer.renderReference(type, target);
    }
    
    /**
     * Render list (delegates to environment renderer)
     */
    async renderList(type, contentBlocks) {
        return await this.environmentRenderer.renderList(type, contentBlocks);
    }
    
    /**
     * Render table (delegates to environment renderer)
     */
    async renderTable(contentBlocks) {
        return await this.environmentRenderer.renderTable(contentBlocks);
    }
    
    /**
     * Render figure (delegates to environment renderer)
     */
    async renderFigure(contentBlocks) {
        return await this.environmentRenderer.renderFigure(contentBlocks);
    }
    
    /**
     * Render equation (delegates to environment renderer)
     */
    renderEquation(contentBlocks) {
        return this.environmentRenderer.renderEquation(contentBlocks);
    }
    
    /**
     * Render verbatim (delegates to environment renderer)
     */
    renderVerbatim(content) {
        return this.environmentRenderer.renderVerbatim(content);
    }
    
    /**
     * Render theorem (delegates to environment renderer)
     */
    async renderTheorem(type, contentBlocks) {
        return await this.environmentRenderer.renderTheorem(type, contentBlocks);
    }
    
    /**
     * Render quote (delegates to environment renderer)
     */
    async renderQuote(type, contentBlocks) {
        return await this.environmentRenderer.renderQuote(type, contentBlocks);
    }
    
    /**
     * Render VF (delegates to environment renderer)
     */
    async renderVF(type, contentBlocks) {
        return await this.environmentRenderer.renderVF(type, contentBlocks);
    }
    
    /**
     * Render box (delegates to environment renderer)
     */
    async renderBox(type, contentBlocks) {
        return await this.environmentRenderer.renderBox(type, contentBlocks);
    }
    
    /**
     * Render extract (delegates to environment renderer)
     */
    async renderExtract(contentBlocks) {
        return await this.environmentRenderer.renderExtract(contentBlocks);
    }
    
    /**
     * Render glossary (delegates to environment renderer)
     */
    async renderGlossary(contentBlocks) {
        return await this.environmentRenderer.renderGlossary(contentBlocks);
    }
    
    /**
     * Render file include (delegates to utils)
     */
    async renderInclude(command, filename, options = {}) {
        return await this.utils.renderInclude(command, filename, options, this.fileManager, (blocks, opts) => {
            return this.render(blocks, opts);
        });
    }
    
    /**
     * Load KaTeX library (delegates to utils)
     */
    async loadKaTeX() {
        await this.utils.loadKaTeX();
        this.katexLoaded = true;
    }
}

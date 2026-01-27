// LaTeXBlockRenderer.js - Dispatches block rendering to appropriate renderers
export class LaTeXBlockRenderer {
    constructor(latexRenderer) {
        this.latexRenderer = latexRenderer;
    }
    
    /**
     * Render a single block
     * @param {Object} block - Block to render
     * @param {Object} options - Rendering options
     * @returns {Promise<HTMLElement|null>} Rendered element
     */
    async renderBlock(block, options = {}) {
        switch (block.type) {
            case 'text':
                return this.latexRenderer.utils.renderText(block);
            case 'comment':
                return options.showComments ? this.latexRenderer.utils.renderComment(block) : null;
            case 'inline-math':
                return this.latexRenderer.mathRenderer.renderInlineMath(block);
            case 'display-math':
                return this.latexRenderer.mathRenderer.renderDisplayMath(block);
            case 'command':
                return await this.latexRenderer.commandRenderer.renderCommand(block, options);
            case 'environment':
                return await this.latexRenderer.environmentRenderer.renderEnvironment(block, options);
            default:
                return this.latexRenderer.utils.renderText(block);
        }
    }
}

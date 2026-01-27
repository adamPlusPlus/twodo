// LaTeXCommandRenderer.js - Renders LaTeX commands
export class LaTeXCommandRenderer {
    constructor(latexRenderer) {
        this.latexRenderer = latexRenderer;
    }
    
    /**
     * Render command
     * @param {Object} block - Command block
     * @param {Object} options - Rendering options
     * @returns {Promise<HTMLElement|null>} Rendered element
     */
    async renderCommand(block, options = {}) {
        const { command, optionalArg, requiredArg } = block;
        
        // Handle sectioning commands
        if (['section', 'subsection', 'subsubsection', 'chapter', 'part', 'paragraph', 'subparagraph'].includes(command)) {
            return this.renderSection(command, requiredArg || '');
        }
        
        // Handle chapter author
        if (command === 'chapterauthor') {
            return this._renderChapterAuthor(block);
        }
        
        // Handle text formatting
        if (['textbf', 'textit', 'emph', 'texttt', 'textsc', 'underline'].includes(command)) {
            return this.renderTextFormat(command, requiredArg || '');
        }
        
        // Handle references
        if (['ref', 'pageref', 'cite'].includes(command)) {
            return this.renderReference(command, requiredArg || '');
        }
        
        // Handle invisible commands
        if (['label', 'index', 'makeindex', 'newcommand', 'renewcommand', 'newtheorem', 'newenvironment',
             'documentclass', 'usepackage', 'title', 'author', 'date', 'subtitle', 'edition', 'editor'].includes(command)) {
            return null;
        }
        
        // Handle maketitle
        if (command === 'maketitle') {
            return this._renderMaketitle();
        }
        
        // Handle document structure
        if (['frontmatter', 'mainmatter', 'backmatter'].includes(command)) {
            return this._renderDocumentStructure(command);
        }
        
        // Handle table of contents, lists
        if (['tableofcontents', 'listoffigures', 'listoftables'].includes(command)) {
            return this._renderTOC(command);
        }
        
        // Handle bibliography
        if (command === 'bibliographystyle' || command === 'bibliography') {
            return this._renderBibliography(command, requiredArg);
        }
        
        // Handle printindex
        if (command === 'printindex') {
            return this._renderPrintIndex();
        }
        
        // Handle includes
        if (['input', 'include'].includes(command) && this.latexRenderer.fileManager && requiredArg) {
            return await this.latexRenderer.renderInclude(command, requiredArg, options);
        }
        
        // Handle subfigure
        if (command === 'subfigure') {
            return this._renderSubfigure(optionalArg, requiredArg);
        }
        
        // Handle table commands
        if (command === 'tabletitle') {
            return this._renderTableTitle(optionalArg, requiredArg);
        }
        
        if (command === 'tch' || command === 'tsh') {
            return this._renderTableCell(command, requiredArg);
        }
        
        // Handle Boxhead
        if (command === 'Boxhead') {
            return this._renderBoxhead(requiredArg);
        }
        
        // Handle percent sign
        if (command === '%') {
            return this._renderPercent();
        }
        
        // Default: render as text
        return this._renderDefaultCommand(command, optionalArg, requiredArg);
    }
    
    /**
     * Render section
     */
    renderSection(type, title) {
        const element = document.createElement('div');
        element.className = `latex-${type}`;
        
        const tagMap = {
            'part': 'h1',
            'chapter': 'h1',
            'section': 'h2',
            'subsection': 'h3',
            'subsubsection': 'h4',
            'paragraph': 'h5',
            'subparagraph': 'h6'
        };
        
        const tag = tagMap[type] || 'h2';
        const heading = document.createElement(tag);
        heading.textContent = title;
        heading.style.cssText = `
            font-weight: bold;
            margin: 20px 0 10px 0;
            ${type === 'part' || type === 'chapter' ? 'font-size: 1.8em;' : ''}
            ${type === 'section' ? 'font-size: 1.5em;' : ''}
            ${type === 'subsection' ? 'font-size: 1.3em;' : ''}
        `;
        
        element.appendChild(heading);
        return element;
    }
    
    /**
     * Render text format
     */
    renderTextFormat(command, text) {
        const element = document.createElement('span');
        element.className = `latex-${command}`;
        element.textContent = text;
        
        const styleMap = {
            'textbf': 'font-weight: bold;',
            'textit': 'font-style: italic;',
            'emph': 'font-style: italic;',
            'texttt': 'font-family: monospace;',
            'textsc': 'font-variant: small-caps;',
            'underline': 'text-decoration: underline;'
        };
        
        element.style.cssText = styleMap[command] || '';
        return element;
    }
    
    /**
     * Render reference
     */
    renderReference(type, target) {
        const element = document.createElement('span');
        element.className = `latex-${type}`;
        element.textContent = `[${type}: ${target}]`;
        element.style.cssText = 'color: #4a9eff; cursor: pointer; text-decoration: underline;';
        element.title = `Reference to ${target}`;
        return element;
    }
    
    /**
     * Render chapter author
     * @private
     */
    _renderChapterAuthor(block) {
        const element = document.createElement('div');
        element.className = 'latex-chapterauthor';
        const args = block.requiredArgs || (block.requiredArg ? [block.requiredArg] : []);
        if (args.length > 0) {
            element.textContent = args[0] || '';
            element.style.cssText = 'font-style: italic; margin: 10px 0; text-align: right;';
            if (args.length > 1 && args[1]) {
                const affiliation = document.createElement('div');
                affiliation.textContent = args[1];
                affiliation.style.cssText = 'font-size: 0.9em; margin-top: 5px;';
                element.appendChild(affiliation);
            }
        }
        return element;
    }
    
    /**
     * Render maketitle
     * @private
     */
    _renderMaketitle() {
        const element = document.createElement('div');
        element.className = 'latex-titlepage';
        element.style.cssText = 'margin: 30px 0; padding: 20px; text-align: center; border: 2px solid #4a9eff;';
        const heading = document.createElement('div');
        heading.textContent = '[Title Page]';
        heading.style.cssText = 'font-size: 1.5em; font-weight: bold; color: #4a9eff;';
        element.appendChild(heading);
        return element;
    }
    
    /**
     * Render document structure
     * @private
     */
    _renderDocumentStructure(command) {
        const element = document.createElement('div');
        element.className = `latex-${command}`;
        element.style.cssText = 'margin: 20px 0; padding: 10px; border-top: 2px solid #4a9eff;';
        const heading = document.createElement('div');
        heading.textContent = command.charAt(0).toUpperCase() + command.slice(1);
        heading.style.cssText = 'font-weight: bold; color: #4a9eff;';
        element.appendChild(heading);
        return element;
    }
    
    /**
     * Render table of contents
     * @private
     */
    _renderTOC(command) {
        const element = document.createElement('div');
        element.className = `latex-${command}`;
        element.style.cssText = 'margin: 20px 0; padding: 15px; background: rgba(74, 158, 255, 0.1); border-left: 4px solid #4a9eff;';
        const heading = document.createElement('div');
        heading.textContent = command === 'tableofcontents' ? 'Table of Contents' : 
                             command === 'listoffigures' ? 'List of Figures' : 'List of Tables';
        heading.style.cssText = 'font-weight: bold; margin-bottom: 10px; color: #4a9eff;';
        element.appendChild(heading);
        const note = document.createElement('div');
        note.textContent = '[Table of contents would be generated here]';
        note.style.cssText = 'color: #888; font-style: italic;';
        element.appendChild(note);
        return element;
    }
    
    /**
     * Render bibliography
     * @private
     */
    _renderBibliography(command, requiredArg) {
        const element = document.createElement('div');
        element.className = 'latex-bibliography';
        element.style.cssText = 'margin: 20px 0; padding: 15px; background: rgba(74, 158, 255, 0.1); border-left: 4px solid #4a9eff;';
        const heading = document.createElement('div');
        heading.textContent = 'Bibliography';
        heading.style.cssText = 'font-weight: bold; margin-bottom: 10px; color: #4a9eff;';
        element.appendChild(heading);
        if (command === 'bibliography' && requiredArg) {
            const note = document.createElement('div');
            note.textContent = `[Bibliography from ${requiredArg}.bib]`;
            note.style.cssText = 'color: #888; font-style: italic;';
            element.appendChild(note);
        }
        return element;
    }
    
    /**
     * Render printindex
     * @private
     */
    _renderPrintIndex() {
        const element = document.createElement('div');
        element.className = 'latex-index';
        element.style.cssText = 'margin: 20px 0; padding: 15px; background: rgba(74, 158, 255, 0.1); border-left: 4px solid #4a9eff;';
        const heading = document.createElement('div');
        heading.textContent = 'Index';
        heading.style.cssText = 'font-weight: bold; margin-bottom: 10px; color: #4a9eff;';
        element.appendChild(heading);
        const note = document.createElement('div');
        note.textContent = '[Index would be generated here]';
        note.style.cssText = 'color: #888; font-style: italic;';
        element.appendChild(note);
        return element;
    }
    
    /**
     * Render subfigure
     * @private
     */
    _renderSubfigure(optionalArg, requiredArg) {
        const element = document.createElement('div');
        element.className = 'latex-subfigure';
        element.style.cssText = 'display: inline-block; margin: 5px; border: 1px dashed #888; padding: 15px; background: #2a2a2a;';
        const label = optionalArg ? `[${optionalArg}]` : '';
        const graphics = requiredArg || '';
        element.textContent = `[Subfigure ${label}: ${graphics}]`;
        return element;
    }
    
    /**
     * Render table title
     * @private
     */
    _renderTableTitle(optionalArg, requiredArg) {
        const element = document.createElement('div');
        element.className = 'latex-table-title';
        element.textContent = optionalArg || requiredArg || '';
        element.style.cssText = 'font-weight: bold; margin: 10px 0;';
        return element;
    }
    
    /**
     * Render table cell
     * @private
     */
    _renderTableCell(command, requiredArg) {
        const element = document.createElement('span');
        element.className = `latex-${command}`;
        element.textContent = requiredArg || '';
        element.style.cssText = command === 'tch' ? 'font-weight: bold;' : 'font-weight: bold; font-style: italic;';
        return element;
    }
    
    /**
     * Render Boxhead
     * @private
     */
    _renderBoxhead(requiredArg) {
        const element = document.createElement('div');
        element.className = 'latex-boxhead';
        element.textContent = requiredArg || '';
        element.style.cssText = 'font-weight: bold; text-align: center; margin: 10px 0;';
        return element;
    }
    
    /**
     * Render percent sign
     * @private
     */
    _renderPercent() {
        const element = document.createElement('span');
        element.textContent = '%';
        return element;
    }
    
    /**
     * Render default command
     * @private
     */
    _renderDefaultCommand(command, optionalArg, requiredArg) {
        const element = document.createElement('span');
        element.className = 'latex-command';
        element.textContent = `\\${command}${optionalArg ? `[${optionalArg}]` : ''}${requiredArg ? `{${requiredArg}}` : ''}`;
        element.style.cssText = 'color: #888; font-style: italic;';
        return element;
    }
}

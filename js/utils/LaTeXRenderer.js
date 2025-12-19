// LaTeXRenderer.js - Enhanced LaTeX renderer for full document support
export class LaTeXRenderer {
    constructor(fileManager = null) {
        this.fileManager = fileManager;
        this.katexLoaded = false;
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
            await this.loadKaTeX();
        }
        
        for (const block of blocks) {
            const element = await this.renderBlock(block, options);
            if (element) {
                container.appendChild(element);
            }
        }
        
        return container;
    }
    
    /**
     * Render a single block
     */
    async renderBlock(block, options = {}) {
        switch (block.type) {
            case 'text':
                return this.renderText(block);
            case 'comment':
                return options.showComments ? this.renderComment(block) : null;
            case 'inline-math':
                return this.renderInlineMath(block);
            case 'display-math':
                return this.renderDisplayMath(block);
            case 'command':
                return await this.renderCommand(block, options);
            case 'environment':
                return await this.renderEnvironment(block, options);
            default:
                return this.renderText(block);
        }
    }
    
    /**
     * Render text block
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
     */
    renderComment(block) {
        const element = document.createElement('div');
        element.className = 'latex-comment';
        element.textContent = block.content;
        element.style.cssText = 'color: #888; font-style: italic; margin: 4px 0;';
        return element;
    }
    
    /**
     * Render inline math
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
    
    /**
     * Render command
     */
    async renderCommand(block) {
        const { command, optionalArg, requiredArg } = block;
        
        // Handle sectioning commands
        if (['section', 'subsection', 'subsubsection', 'chapter', 'part', 'paragraph', 'subparagraph'].includes(command)) {
            return this.renderSection(command, requiredArg || '');
        }
        
        // Handle chapter author (can have multiple arguments)
        if (command === 'chapterauthor') {
            const element = document.createElement('div');
            element.className = 'latex-chapterauthor';
            const args = block.requiredArgs || (requiredArg ? [requiredArg] : []);
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
        
        // Handle text formatting
        if (['textbf', 'textit', 'emph', 'texttt', 'textsc', 'underline'].includes(command)) {
            return this.renderTextFormat(command, requiredArg || '');
        }
        
        // Handle references
        if (['ref', 'pageref', 'cite'].includes(command)) {
            return this.renderReference(command, requiredArg || '');
        }
        
        // Handle labels (invisible in preview)
        if (command === 'label') {
            return null; // Labels are not visible
        }
        
        // Handle index (invisible but could show tooltip)
        if (command === 'index') {
            return null; // Index entries are not visible in preview
        }
        
        // Handle document structure commands
        if (['frontmatter', 'mainmatter', 'backmatter'].includes(command)) {
            const element = document.createElement('div');
            element.className = `latex-${command}`;
            element.style.cssText = 'margin: 20px 0; padding: 10px; border-top: 2px solid #4a9eff;';
            const heading = document.createElement('div');
            heading.textContent = command.charAt(0).toUpperCase() + command.slice(1);
            heading.style.cssText = 'font-weight: bold; color: #4a9eff;';
            element.appendChild(heading);
            return element;
        }
        
        // Handle table of contents, lists
        if (['tableofcontents', 'listoffigures', 'listoftables'].includes(command)) {
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
        
        // Handle bibliography
        if (command === 'bibliographystyle' || command === 'bibliography') {
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
        
        // Handle printindex
        if (command === 'printindex') {
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
        
        // Handle makeindex
        if (command === 'makeindex') {
            return null; // Invisible command
        }
        
        // Handle newcommand, newtheorem, newenvironment (document-level definitions)
        if (['newcommand', 'renewcommand', 'newtheorem', 'newenvironment'].includes(command)) {
            return null; // These are document-level definitions, not rendered
        }
        
        // Handle documentclass and usepackage (preamble commands)
        if (['documentclass', 'usepackage'].includes(command)) {
            return null; // Preamble commands are not rendered in body
        }
        
        // Handle title, author, date, maketitle
        if (command === 'title' || command === 'author' || command === 'date' || 
            command === 'subtitle' || command === 'edition' || command === 'editor') {
            return null; // These are used by \maketitle
        }
        
        if (command === 'maketitle') {
            const element = document.createElement('div');
            element.className = 'latex-titlepage';
            element.style.cssText = 'margin: 30px 0; padding: 20px; text-align: center; border: 2px solid #4a9eff;';
            const heading = document.createElement('div');
            heading.textContent = '[Title Page]';
            heading.style.cssText = 'font-size: 1.5em; font-weight: bold; color: #4a9eff;';
            element.appendChild(heading);
            return element;
        }
        
        // Handle includes (render included content)
        if (['input', 'include'].includes(command) && this.fileManager && requiredArg) {
            return await this.renderInclude(command, requiredArg, options);
        }
        
        // Handle subfigure command
        if (command === 'subfigure') {
            const element = document.createElement('div');
            element.className = 'latex-subfigure';
            element.style.cssText = 'display: inline-block; margin: 5px; border: 1px dashed #888; padding: 15px; background: #2a2a2a;';
            const label = optionalArg ? `[${optionalArg}]` : '';
            const graphics = requiredArg || '';
            element.textContent = `[Subfigure ${label}: ${graphics}]`;
            return element;
        }
        
        // Handle tabletitle, tch, tsh (table commands)
        if (command === 'tabletitle') {
            const element = document.createElement('div');
            element.className = 'latex-table-title';
            element.textContent = optionalArg || requiredArg || '';
            element.style.cssText = 'font-weight: bold; margin: 10px 0;';
            return element;
        }
        
        if (command === 'tch' || command === 'tsh') {
            const element = document.createElement('span');
            element.className = `latex-${command}`;
            element.textContent = requiredArg || '';
            element.style.cssText = command === 'tch' ? 'font-weight: bold;' : 'font-weight: bold; font-style: italic;';
            return element;
        }
        
        // Handle Boxhead
        if (command === 'Boxhead') {
            const element = document.createElement('div');
            element.className = 'latex-boxhead';
            element.textContent = requiredArg || '';
            element.style.cssText = 'font-weight: bold; text-align: center; margin: 10px 0;';
            return element;
        }
        
        // Handle percent sign (escaped)
        if (command === '%') {
            const element = document.createElement('span');
            element.textContent = '%';
            return element;
        }
        
        // Default: render as text
        const element = document.createElement('span');
        element.className = 'latex-command';
        element.textContent = `\\${command}${optionalArg ? `[${optionalArg}]` : ''}${requiredArg ? `{${requiredArg}}` : ''}`;
        element.style.cssText = 'color: #888; font-style: italic;';
        return element;
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
     * Render environment
     */
    async renderEnvironment(block, options = {}) {
        const { environment, content } = block;
        
        // Parse environment content
        // Note: We'll parse it here, but ideally parser should be passed in
        let contentBlocks = [];
        if (options.parser) {
            contentBlocks = options.parser.parse(content);
        } else {
            // Simple fallback: treat as text
            contentBlocks = [{ type: 'text', content: content }];
        }
        
        const container = document.createElement('div');
        container.className = `latex-environment latex-${environment}`;
        
        // Handle specific environments
        switch (environment) {
            case 'itemize':
            case 'enumerate':
            case 'description':
                return await this.renderList(environment, contentBlocks);
            
            case 'table':
                return await this.renderTable(contentBlocks);
            
            case 'figure':
                return await this.renderFigure(contentBlocks);
            
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
                return this.renderTheorem(environment, contentBlocks);
            
            case 'quote':
            case 'quotation':
                return await this.renderQuote(environment, contentBlocks);
            
            case 'VT1':
            case 'VF':
                return await this.renderVF(environment, contentBlocks);
            
            case 'shadebox':
            case 'shortbox':
                return await this.renderBox(environment, contentBlocks);
            
            case 'extract':
                return await this.renderExtract(contentBlocks);
            
            case 'Glossary':
                return await this.renderGlossary(contentBlocks);
            
            case 'center':
                // Center environment - just render content centered
                const centerContainer = document.createElement('div');
                centerContainer.style.cssText = 'text-align: center; margin: 10px 0;';
                const centerRendered = await this.render(contentBlocks, { ...options, parser: options.parser });
                centerContainer.appendChild(centerRendered);
                return centerContainer;
            
            default:
                // Generic environment
                const rendered = await this.render(contentBlocks, { ...options, parser: options.parser });
                container.appendChild(rendered);
                container.style.cssText = 'margin: 10px 0; padding: 10px; border-left: 3px solid #4a9eff;';
                return container;
        }
    }
    
    /**
     * Render list
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
                const rendered = await this.renderBlock(block);
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
            // Remove LaTeX commands and parse rows
            let content = tabularContent.content;
            // Replace \tch{...} and \tsh{...} with just the content
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
            const rendered = this.renderDisplayMath(mathBlock);
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
            const rendered = await this.renderBlock(block);
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
            const rendered = await this.renderBlock(block);
            if (rendered) {
                container.appendChild(rendered);
            }
        }
        
        return container;
    }
    
    /**
     * Render file include
     */
    async renderInclude(command, filename, options = {}) {
        if (!this.fileManager) {
            const element = document.createElement('span');
            element.textContent = `[Include: ${filename}]`;
            element.style.cssText = 'color: #888; font-style: italic;';
            return element;
        }
        
        try {
            // Load included file
            const { content } = await this.fileManager.importFromTex(filename);
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
            
            const rendered = await this.render(blocks, { ...options, parser });
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
            
            const rendered = await this.renderBlock(block);
            if (rendered) {
                container.appendChild(rendered);
            }
        }
        
        return container;
    }
    
    /**
     * Render box environment (shadebox, shortbox)
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
            
            const rendered = await this.renderBlock(block);
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
            const rendered = await this.renderBlock(block);
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
                const rendered = await this.renderBlock(block);
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
    
    /**
     * Load KaTeX library
     */
    async loadKaTeX() {
        return new Promise((resolve) => {
            if (window.katex) {
                this.katexLoaded = true;
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
                this.katexLoaded = true;
                resolve();
            };
            script.onerror = () => {
                console.error('Failed to load KaTeX');
                resolve(); // Resolve anyway
            };
            document.head.appendChild(script);
        });
    }
}


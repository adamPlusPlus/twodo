// LaTeXParser.js - Advanced LaTeX parser for full document support
export class LaTeXParser {
    constructor() {
        // Known LaTeX environments
        this.environments = new Set([
            'document', 'abstract', 'titlepage', 'equation', 'align', 'gather', 'multline', 'split',
            'itemize', 'enumerate', 'description', 'table', 'tabular', 'figure', 'center',
            'verbatim', 'lstlisting', 'quote', 'quotation', 'verse', 'minipage', 'parbox',
            'theorem', 'proof', 'definition', 'lemma', 'corollary', 'proposition', 'example',
            'VF', 'shadebox', 'extract', 'Glossary', 'shortbox', 'VT1', 'notelist', 'wherelist',
            'unnumlist', 'contributorlist', 'thebibliography', 'theindex'
        ]);
        
        // Known LaTeX commands that take arguments
        this.commandsWithArgs = new Set([
            'documentclass', 'usepackage', 'title', 'author', 'date', 'section', 'subsection',
            'subsubsection', 'chapter', 'part', 'label', 'ref', 'pageref', 'cite', 'href',
            'url', 'includegraphics', 'caption', 'textbf', 'textit', 'emph', 'texttt',
            'textsc', 'underline', 'sout', 'input', 'include', 'bibliography', 'bibliographystyle',
            'newtheorem', 'newenvironment', 'newcommand', 'renewcommand', 'def', 'edef', 'gdef',
            'chapterauthor', 'subtitle', 'edition', 'editor', 'maketitle', 'tableofcontents',
            'listoffigures', 'listoftables', 'printindex', 'frontmatter', 'mainmatter', 'backmatter'
        ]);
    }
    
    /**
     * Parse LaTeX document into structured blocks
     * @param {string} latex - LaTeX content
     * @returns {Array<Object>} Array of parsed blocks
     */
    parse(latex) {
        const blocks = [];
        let position = 0;
        let inComment = false;
        let commentStart = 0;
        
        while (position < latex.length) {
            const char = latex[position];
            const nextChar = position < latex.length - 1 ? latex[position + 1] : '';
            
            // Handle comments
            if (char === '%' && !inComment) {
                inComment = true;
                commentStart = position;
                position++;
                continue;
            }
            
            if (inComment) {
                if (char === '\n') {
                    // End of comment
                    blocks.push({
                        type: 'comment',
                        content: latex.substring(commentStart, position),
                        startIndex: commentStart,
                        endIndex: position
                    });
                    inComment = false;
                }
                position++;
                continue;
            }
            
            // Handle display math: $$ or \[
            if (char === '$' && nextChar === '$') {
                const mathBlock = this.parseDisplayMath(latex, position);
                if (mathBlock) {
                    blocks.push(mathBlock);
                    position = mathBlock.endIndex;
                    continue;
                }
            }
            
            if (char === '\\' && nextChar === '[') {
                const mathBlock = this.parseDisplayMathBracket(latex, position);
                if (mathBlock) {
                    blocks.push(mathBlock);
                    position = mathBlock.endIndex;
                    continue;
                }
            }
            
            // Handle inline math: $
            if (char === '$' && nextChar !== '$') {
                const mathBlock = this.parseInlineMath(latex, position);
                if (mathBlock) {
                    blocks.push(mathBlock);
                    position = mathBlock.endIndex;
                    continue;
                }
            }
            
            // Handle commands: \command[opt]{arg}
            if (char === '\\') {
                const commandBlock = this.parseCommand(latex, position);
                if (commandBlock) {
                    blocks.push(commandBlock);
                    position = commandBlock.endIndex;
                    continue;
                }
            }
            
            // Handle environments: \begin{env}...\end{env}
            if (char === '\\' && latex.substring(position, position + 6) === '\\begin') {
                const envBlock = this.parseEnvironment(latex, position);
                if (envBlock) {
                    blocks.push(envBlock);
                    position = envBlock.endIndex;
                    continue;
                }
            }
            
            // Regular text
            position++;
        }
        
        // Handle remaining comment
        if (inComment) {
            blocks.push({
                type: 'comment',
                content: latex.substring(commentStart),
                startIndex: commentStart,
                endIndex: latex.length
            });
        }
        
        // Merge adjacent text blocks
        return this.mergeTextBlocks(blocks, latex);
    }
    
    /**
     * Parse display math: $$...$$
     */
    parseDisplayMath(latex, start) {
        let pos = start + 2; // Skip $$
        let content = '';
        
        while (pos < latex.length - 1) {
            if (latex[pos] === '$' && latex[pos + 1] === '$') {
                return {
                    type: 'display-math',
                    content: content,
                    startIndex: start,
                    endIndex: pos + 2
                };
            }
            content += latex[pos];
            pos++;
        }
        
        return null; // Unclosed
    }
    
    /**
     * Parse display math: \[...\]
     */
    parseDisplayMathBracket(latex, start) {
        let pos = start + 2; // Skip \[
        let content = '';
        
        while (pos < latex.length - 1) {
            if (latex[pos] === '\\' && latex[pos + 1] === ']') {
                return {
                    type: 'display-math',
                    content: content,
                    startIndex: start,
                    endIndex: pos + 2
                };
            }
            content += latex[pos];
            pos++;
        }
        
        return null; // Unclosed
    }
    
    /**
     * Parse inline math: $...$
     */
    parseInlineMath(latex, start) {
        let pos = start + 1; // Skip $
        let content = '';
        
        while (pos < latex.length) {
            if (latex[pos] === '$' && (pos === 0 || latex[pos - 1] !== '$') && 
                (pos === latex.length - 1 || latex[pos + 1] !== '$')) {
                return {
                    type: 'inline-math',
                    content: content,
                    startIndex: start,
                    endIndex: pos + 1
                };
            }
            content += latex[pos];
            pos++;
        }
        
        return null; // Unclosed
    }
    
    /**
     * Parse LaTeX command: \command[opt]{arg} or \command{arg} or \command
     */
    parseCommand(latex, start) {
        let pos = start + 1; // Skip \
        let commandName = '';
        
        // Parse command name
        while (pos < latex.length && /[a-zA-Z@]/.test(latex[pos])) {
            commandName += latex[pos];
            pos++;
        }
        
        if (!commandName) return null;
        
        const commandStart = start;
        let optionalArg = null;
        let requiredArgs = [];
        
        // Parse optional argument [opt]
        if (pos < latex.length && latex[pos] === '[') {
            const optResult = this.parseBrackets(latex, pos);
            if (optResult) {
                optionalArg = optResult.content;
                pos = optResult.endIndex;
            }
        }
        
        // Parse required arguments {arg} (can have multiple)
        while (pos < latex.length && latex[pos] === '{') {
            const argResult = this.parseBraces(latex, pos);
            if (argResult) {
                requiredArgs.push(argResult.content);
                pos = argResult.endIndex;
            } else {
                break;
            }
        }
        
        // For backward compatibility, set requiredArg to first arg if exists
        const requiredArg = requiredArgs.length > 0 ? requiredArgs[0] : null;
        
        return {
            type: 'command',
            command: commandName,
            optionalArg: optionalArg,
            requiredArg: requiredArg,
            requiredArgs: requiredArgs, // All arguments
            startIndex: commandStart,
            endIndex: pos
        };
    }
    
    /**
     * Parse environment: \begin{env}...\end{env}
     */
    parseEnvironment(latex, start) {
        const beginMatch = latex.substring(start).match(/^\\begin\{([^}]+)\}/);
        if (!beginMatch) return null;
        
        const envName = beginMatch[1];
        const beginEnd = start + beginMatch[0].length;
        
        // Find matching \end{envName}
        let depth = 1;
        let pos = beginEnd;
        const endPattern = `\\end{${envName}}`;
        
        while (pos < latex.length) {
            // Check for nested \begin{envName}
            if (latex.substring(pos).startsWith(`\\begin{${envName}}`)) {
                depth++;
                pos += `\\begin{${envName}}`.length;
                continue;
            }
            
            // Check for matching \end{envName}
            if (latex.substring(pos).startsWith(endPattern)) {
                depth--;
                if (depth === 0) {
                    const endPos = pos + endPattern.length;
                    const content = latex.substring(beginEnd, pos);
                    
                    return {
                        type: 'environment',
                        environment: envName,
                        content: content,
                        startIndex: start,
                        endIndex: endPos
                    };
                }
                pos += endPattern.length;
                continue;
            }
            
            pos++;
        }
        
        return null; // Unclosed environment
    }
    
    /**
     * Parse braces: {content}
     */
    parseBraces(latex, start) {
        if (latex[start] !== '{') return null;
        
        let depth = 1;
        let pos = start + 1;
        
        while (pos < latex.length) {
            if (latex[pos] === '{' && (pos === 0 || latex[pos - 1] !== '\\')) {
                depth++;
            } else if (latex[pos] === '}' && (pos === 0 || latex[pos - 1] !== '\\')) {
                depth--;
                if (depth === 0) {
                    return {
                        content: latex.substring(start + 1, pos),
                        endIndex: pos + 1
                    };
                }
            }
            pos++;
        }
        
        return null; // Unclosed
    }
    
    /**
     * Parse brackets: [content]
     */
    parseBrackets(latex, start) {
        if (latex[start] !== '[') return null;
        
        let depth = 1;
        let pos = start + 1;
        
        while (pos < latex.length) {
            if (latex[pos] === '[' && (pos === 0 || latex[pos - 1] !== '\\')) {
                depth++;
            } else if (latex[pos] === ']' && (pos === 0 || latex[pos - 1] !== '\\')) {
                depth--;
                if (depth === 0) {
                    return {
                        content: latex.substring(start + 1, pos),
                        endIndex: pos + 1
                    };
                }
            }
            pos++;
        }
        
        return null; // Unclosed
    }
    
    /**
     * Merge adjacent text blocks
     */
    mergeTextBlocks(blocks, latex) {
        if (blocks.length === 0) return blocks;
        
        const merged = [];
        let currentText = '';
        let textStart = 0;
        let lastEnd = 0;
        
        // Sort blocks by startIndex
        const sorted = [...blocks].sort((a, b) => a.startIndex - b.startIndex);
        
        for (let i = 0; i < sorted.length; i++) {
            const block = sorted[i];
            
            // Add text before this block
            if (block.startIndex > lastEnd) {
                const textContent = latex.substring(lastEnd, block.startIndex);
                if (textContent.trim()) {
                    merged.push({
                        type: 'text',
                        content: textContent,
                        startIndex: lastEnd,
                        endIndex: block.startIndex
                    });
                }
            }
            
            merged.push(block);
            lastEnd = block.endIndex;
        }
        
        // Add remaining text
        if (lastEnd < latex.length) {
            const textContent = latex.substring(lastEnd);
            if (textContent.trim()) {
                merged.push({
                    type: 'text',
                    content: textContent,
                    startIndex: lastEnd,
                    endIndex: latex.length
                });
            }
        }
        
        return merged;
    }
    
    /**
     * Extract document structure (sections, chapters, etc.)
     */
    extractStructure(latex) {
        const structure = [];
        const sectionRegex = /\\(part|chapter|section|subsection|subsubsection|paragraph|subparagraph)\{([^}]+)\}/g;
        let match;
        
        while ((match = sectionRegex.exec(latex)) !== null) {
            structure.push({
                type: match[1],
                title: match[2],
                position: match.index,
                line: latex.substring(0, match.index).split('\n').length
            });
        }
        
        return structure;
    }
    
    /**
     * Find all labels in document
     */
    findLabels(latex) {
        const labels = [];
        const labelRegex = /\\label\{([^}]+)\}/g;
        let match;
        
        while ((match = labelRegex.exec(latex)) !== null) {
            labels.push({
                name: match[1],
                position: match.index,
                line: latex.substring(0, match.index).split('\n').length
            });
        }
        
        return labels;
    }
    
    /**
     * Find all references in document
     */
    findReferences(latex) {
        const refs = [];
        const refRegex = /\\(ref|pageref|cite)\{([^}]+)\}/g;
        let match;
        
        while ((match = refRegex.exec(latex)) !== null) {
            refs.push({
                type: match[1],
                target: match[2],
                position: match.index,
                line: latex.substring(0, match.index).split('\n').length
            });
        }
        
        return refs;
    }
    
    /**
     * Find all file includes
     */
    findIncludes(latex) {
        const includes = [];
        const includeRegex = /\\(input|include)\{([^}]+)\}/g;
        let match;
        
        while ((match = includeRegex.exec(latex)) !== null) {
            includes.push({
                command: match[1],
                filename: match[2],
                position: match.index,
                line: latex.substring(0, match.index).split('\n').length
            });
        }
        
        return includes;
    }
}


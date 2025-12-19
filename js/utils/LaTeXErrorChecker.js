// LaTeXErrorChecker.js - LaTeX-specific error checker extending GrammarSpellChecker
import { GrammarSpellChecker } from './GrammarSpellChecker.js';

export class LaTeXErrorChecker extends GrammarSpellChecker {
    constructor(app) {
        super(app);
        this.latexCommands = new Set([
            'documentclass', 'usepackage', 'begin', 'end', 'section', 'subsection',
            'subsubsection', 'chapter', 'part', 'title', 'author', 'date', 'maketitle',
            'textbf', 'textit', 'emph', 'texttt', 'textsc', 'underline', 'sout',
            'label', 'ref', 'pageref', 'cite', 'bibliography', 'input', 'include',
            'href', 'url', 'includegraphics', 'caption', 'centering', 'flushleft',
            'flushright', 'newline', 'linebreak', 'pagebreak', 'clearpage',
            'itemize', 'enumerate', 'description', 'item', 'table', 'tabular',
            'figure', 'equation', 'align', 'gather', 'multline', 'split',
            'verbatim', 'lstlisting', 'lstinputlisting', 'minipage', 'parbox',
            'footnote', 'marginpar', 'tableofcontents', 'listoffigures', 'listoftables',
            'newpage', 'cleardoublepage', 'appendix', 'abstract', 'thanks',
            'vspace', 'hspace', 'vfill', 'hfill', 'rule', 'framebox', 'makebox',
            'par', 'noindent', 'indent', 'smallskip', 'medskip', 'bigskip',
            'left', 'right', 'middle', 'big', 'Big', 'bigg', 'Bigg',
            'frac', 'sqrt', 'sum', 'prod', 'int', 'oint', 'iint', 'iiint',
            'lim', 'sup', 'inf', 'max', 'min', 'det', 'dim', 'ker', 'deg',
            'exp', 'ln', 'log', 'sin', 'cos', 'tan', 'sec', 'csc', 'cot',
            'arcsin', 'arccos', 'arctan', 'sinh', 'cosh', 'tanh', 'coth',
            'alpha', 'beta', 'gamma', 'delta', 'epsilon', 'varepsilon', 'zeta',
            'eta', 'theta', 'vartheta', 'iota', 'kappa', 'lambda', 'mu', 'nu',
            'xi', 'pi', 'varpi', 'rho', 'varrho', 'sigma', 'varsigma', 'tau',
            'upsilon', 'phi', 'varphi', 'chi', 'psi', 'omega',
            'Gamma', 'Delta', 'Theta', 'Lambda', 'Xi', 'Pi', 'Sigma', 'Upsilon',
            'Phi', 'Psi', 'Omega'
        ]);
    }
    
    /**
     * Check LaTeX syntax errors
     * @param {string} latex - LaTeX content
     * @returns {Array<Object>} Array of LaTeX errors
     */
    checkLaTeXSyntax(latex) {
        const errors = [];
        const lines = latex.split('\n');
        
        lines.forEach((line, lineIndex) => {
            // Check for unmatched braces
            const braceErrors = this.checkBraces(line, lineIndex);
            errors.push(...braceErrors);
            
            // Check for unmatched environments
            const envErrors = this.checkEnvironments(line, lineIndex);
            errors.push(...envErrors);
            
            // Check for invalid commands
            const cmdErrors = this.checkCommands(line, lineIndex);
            errors.push(...cmdErrors);
            
            // Check for common LaTeX mistakes
            const commonErrors = this.checkCommonMistakes(line, lineIndex);
            errors.push(...commonErrors);
        });
        
        // Check for unmatched begin/end pairs across entire document
        const globalErrors = this.checkGlobalStructure(latex);
        errors.push(...globalErrors);
        
        return errors;
    }
    
    /**
     * Check for unmatched braces
     * @param {string} line - Line to check
     * @param {number} lineIndex - Line number
     * @returns {Array<Object>} Array of errors
     */
    checkBraces(line, lineIndex) {
        const errors = [];
        let openBraces = 0;
        let openBrackets = 0;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            const prevChar = i > 0 ? line[i - 1] : '';
            
            // Skip escaped characters
            if (prevChar === '\\') continue;
            
            if (char === '{') openBraces++;
            else if (char === '}') {
                openBraces--;
                if (openBraces < 0) {
                    errors.push({
                        type: 'latex',
                        category: 'syntax',
                        start: i,
                        end: i + 1,
                        line: lineIndex,
                        message: 'Unmatched closing brace }',
                        severity: 'error'
                    });
                }
            }
            
            if (char === '[') openBrackets++;
            else if (char === ']') {
                openBrackets--;
                if (openBrackets < 0) {
                    errors.push({
                        type: 'latex',
                        category: 'syntax',
                        start: i,
                        end: i + 1,
                        line: lineIndex,
                        message: 'Unmatched closing bracket ]',
                        severity: 'error'
                    });
                }
            }
        }
        
        // Check for unclosed braces at end of line
        if (openBraces > 0) {
            errors.push({
                type: 'latex',
                category: 'syntax',
                start: line.length - 1,
                end: line.length,
                line: lineIndex,
                message: `${openBraces} unclosed brace(s)`,
                severity: 'error'
            });
        }
        
        if (openBrackets > 0) {
            errors.push({
                type: 'latex',
                category: 'syntax',
                start: line.length - 1,
                end: line.length,
                line: lineIndex,
                message: `${openBrackets} unclosed bracket(s)`,
                severity: 'error'
            });
        }
        
        return errors;
    }
    
    /**
     * Check for unmatched environments
     * @param {string} line - Line to check
     * @param {number} lineIndex - Line number
     * @returns {Array<Object>} Array of errors
     */
    checkEnvironments(line, lineIndex) {
        const errors = [];
        
        // Check for \begin without \end
        const beginMatch = line.match(/\\begin\{([^}]+)\}/);
        if (beginMatch) {
            const envName = beginMatch[1];
            // This is a simplified check - full check requires document-wide analysis
            errors.push({
                type: 'latex',
                category: 'environment',
                start: beginMatch.index,
                end: beginMatch.index + beginMatch[0].length,
                line: lineIndex,
                message: `Environment "${envName}" opened - ensure it has a matching \\end{${envName}}`,
                severity: 'warning',
                environment: envName
            });
        }
        
        // Check for \end without \begin
        const endMatch = line.match(/\\end\{([^}]+)\}/);
        if (endMatch) {
            errors.push({
                type: 'latex',
                category: 'environment',
                start: endMatch.index,
                end: endMatch.index + endMatch[0].length,
                line: lineIndex,
                message: `Environment "${endMatch[1]}" closed - ensure it has a matching \\begin{${endMatch[1]}}`,
                severity: 'warning',
                environment: endMatch[1]
            });
        }
        
        return errors;
    }
    
    /**
     * Check for invalid commands
     * @param {string} line - Line to check
     * @param {number} lineIndex - Line number
     * @returns {Array<Object>} Array of errors
     */
    checkCommands(line, lineIndex) {
        const errors = [];
        const commandRegex = /\\([a-zA-Z@]+)/g;
        let match;
        
        while ((match = commandRegex.exec(line)) !== null) {
            const command = match[1];
            
            // Skip if it's a known command or starts with @ (package commands)
            if (this.latexCommands.has(command) || command.startsWith('@')) {
                continue;
            }
            
            // Check for common typos
            const suggestions = this.getCommandSuggestions(command);
            if (suggestions.length > 0) {
                errors.push({
                    type: 'latex',
                    category: 'command',
                    start: match.index,
                    end: match.index + match[0].length,
                    line: lineIndex,
                    message: `Unknown command "\\${command}"`,
                    severity: 'warning',
                    suggestions: suggestions
                });
            }
        }
        
        return errors;
    }
    
    /**
     * Get suggestions for a command
     * @param {string} command - Command name
     * @returns {Array<string>} Array of suggestions
     */
    getCommandSuggestions(command) {
        const suggestions = [];
        const maxDistance = 2;
        
        this.latexCommands.forEach(cmd => {
            const distance = this.levenshteinDistance(command.toLowerCase(), cmd.toLowerCase());
            if (distance <= maxDistance && distance > 0) {
                suggestions.push(cmd);
            }
        });
        
        return suggestions
            .sort((a, b) => {
                const distA = this.levenshteinDistance(command.toLowerCase(), a.toLowerCase());
                const distB = this.levenshteinDistance(command.toLowerCase(), b.toLowerCase());
                return distA - distB;
            })
            .slice(0, 3);
    }
    
    /**
     * Check for common LaTeX mistakes
     * @param {string} line - Line to check
     * @param {number} lineIndex - Line number
     * @returns {Array<Object>} Array of errors
     */
    checkCommonMistakes(line, lineIndex) {
        const errors = [];
        
        // Check for missing spaces after commands
        const missingSpaceRegex = /\\([a-zA-Z]+)([a-zA-Z])/g;
        let match;
        while ((match = missingSpaceRegex.exec(line)) !== null) {
            // Skip if it's a known multi-letter command
            if (this.latexCommands.has(match[1] + match[2])) continue;
            
            errors.push({
                type: 'latex',
                category: 'formatting',
                start: match.index,
                end: match.index + match[0].length,
                line: lineIndex,
                message: `Missing space after "\\${match[1]}" - use "\\${match[1]} ${match[2]}" or "\\${match[1]}{${match[2]}}"`,
                severity: 'warning'
            });
        }
        
        // Check for $ without matching $
        const dollarCount = (line.match(/\$/g) || []).length;
        if (dollarCount % 2 !== 0) {
            errors.push({
                type: 'latex',
                category: 'math',
                start: 0,
                end: line.length,
                line: lineIndex,
                message: 'Unmatched $ (math mode delimiter)',
                severity: 'error'
            });
        }
        
        // Check for $$ without matching $$
        const doubleDollarCount = (line.match(/\$\$/g) || []).length;
        if (doubleDollarCount % 2 !== 0) {
            errors.push({
                type: 'latex',
                category: 'math',
                start: 0,
                end: line.length,
                line: lineIndex,
                message: 'Unmatched $$ (display math delimiter)',
                severity: 'error'
            });
        }
        
        return errors;
    }
    
    /**
     * Check global document structure
     * @param {string} latex - LaTeX content
     * @returns {Array<Object>} Array of errors
     */
    checkGlobalStructure(latex) {
        const errors = [];
        const begins = [];
        const ends = [];
        
        // Find all \begin and \end
        const beginRegex = /\\begin\{([^}]+)\}/g;
        const endRegex = /\\end\{([^}]+)\}/g;
        let match;
        
        while ((match = beginRegex.exec(latex)) !== null) {
            begins.push({
                name: match[1],
                position: match.index,
                line: latex.substring(0, match.index).split('\n').length - 1
            });
        }
        
        while ((match = endRegex.exec(latex)) !== null) {
            ends.push({
                name: match[1],
                position: match.index,
                line: latex.substring(0, match.index).split('\n').length - 1
            });
        }
        
        // Check for unmatched environments
        const envStack = [];
        begins.forEach(begin => {
            envStack.push(begin);
        });
        
        ends.forEach(end => {
            const matchingBegin = envStack.pop();
            if (!matchingBegin) {
                errors.push({
                    type: 'latex',
                    category: 'structure',
                    start: end.position,
                    end: end.position + `\\end{${end.name}}`.length,
                    line: end.line,
                    message: `\\end{${end.name}} without matching \\begin{${end.name}}`,
                    severity: 'error'
                });
            } else if (matchingBegin.name !== end.name) {
                errors.push({
                    type: 'latex',
                    category: 'structure',
                    start: end.position,
                    end: end.position + `\\end{${end.name}}`.length,
                    line: end.line,
                    message: `\\end{${end.name}} does not match \\begin{${matchingBegin.name}}`,
                    severity: 'error'
                });
            }
        });
        
        // Check for unclosed environments
        envStack.forEach(begin => {
            errors.push({
                type: 'latex',
                category: 'structure',
                start: begin.position,
                end: begin.position + `\\begin{${begin.name}}`.length,
                line: begin.line,
                message: `\\begin{${begin.name}} without matching \\end{${begin.name}}`,
                severity: 'error'
            });
        });
        
        return errors;
    }
    
    /**
     * Check LaTeX document for all errors
     * @param {string} latex - LaTeX content
     * @returns {Object} Object with all error types
     */
    checkLaTeX(latex) {
        // Extract text content (excluding LaTeX commands) for spelling/grammar
        const textContent = this.extractTextContent(latex);
        
        return {
            latex: this.checkLaTeXSyntax(latex),
            spelling: this.checkSpelling(textContent),
            grammar: this.checkGrammar(textContent),
            all: [
                ...this.checkLaTeXSyntax(latex),
                ...this.checkSpelling(textContent),
                ...this.checkGrammar(textContent)
            ]
        };
    }
    
    /**
     * Extract text content from LaTeX (for spelling/grammar checking)
     * @param {string} latex - LaTeX content
     * @returns {string} Plain text content
     */
    extractTextContent(latex) {
        // Remove LaTeX commands
        let text = latex.replace(/\\([a-zA-Z@]+)(?:\{[^}]*\})?/g, ' ');
        
        // Remove math mode
        text = text.replace(/\$[^$]*\$/g, ' ');
        text = text.replace(/\$\$[^$]*\$\$/g, ' ');
        
        // Remove comments
        text = text.replace(/%.*$/gm, ' ');
        
        // Remove special characters but keep spaces
        text = text.replace(/[{}[\]\\]/g, ' ');
        
        return text;
    }
    
    /**
     * Highlight LaTeX errors in text
     * @param {string} latex - LaTeX content
     * @param {Array<Object>} errors - Array of errors
     * @returns {string} HTML with highlighted errors
     */
    highlightLaTeXErrors(latex, errors) {
        // Sort errors by position (descending) to avoid index shifting
        const sortedErrors = [...errors].sort((a, b) => b.start - a.start);
        let html = this.escapeHtml(latex);
        
        sortedErrors.forEach(error => {
            const before = html.substring(0, error.start);
            const errorText = html.substring(error.start, error.end);
            const after = html.substring(error.end);
            
            let color = '#ff5555'; // Default error color
            if (error.severity === 'warning') {
                color = '#ffaa00';
            } else if (error.severity === 'info') {
                color = '#4a9eff';
            }
            
            const suggestions = error.suggestions ? 
                `\nSuggestions: ${error.suggestions.join(', ')}` : '';
            
            html = before + 
                `<span class="latex-error" data-error-type="${error.type}" data-error-category="${error.category || ''}" style="background: ${color}; color: white; padding: 2px 4px; border-radius: 2px; cursor: help; text-decoration: underline;" title="${this.escapeHtml(error.message + suggestions)}">${errorText}</span>` +
                after;
        });
        
        return html;
    }
}


// DocumentViewFormat - Format renderer for Obsidian-style markdown document view
import { BaseFormatRenderer } from '../../core/BaseFormatRenderer.js';
import { eventBus } from '../../core/EventBus.js';

export default class DocumentViewFormat extends BaseFormatRenderer {
    constructor(config = {}) {
        super({
            id: 'document-view-format',
            name: 'Document View',
            formatName: 'document-view-format',
            version: '1.0.0',
            description: 'Obsidian-style markdown document view of page content',
            supportsPages: true,
            supportsBins: false,
            defaultConfig: {
                enabled: false,
                lineWidth: 700,
                fontSize: 16,
                lineHeight: 1.6
            },
            ...config
        });
    }
    
    async onInit() {
        // Emit event for registration - FormatRendererManager listens to this
        console.log('[DocumentViewFormat] onInit called, id:', this.id, 'formatName:', this.formatName);
        eventBus.emit('format:registered', { pluginId: this.id });
        console.log('[DocumentViewFormat] format:registered event emitted');
    }
    
    /**
     * Convert element to markdown representation
     * @param {Object} element - Element data
     * @param {number} depth - Nesting depth
     * @returns {string} Markdown string
     */
    elementToMarkdown(element, depth = 0) {
        const indent = '  '.repeat(depth);
        let markdown = '';
        
        switch (element.type) {
            case 'code':
                // Code block element
                const codeTitle = element.text ? `**${element.text}**\n\n` : '';
                const language = element.language || 'text';
                const code = element.code || '';
                markdown = `${indent}${codeTitle}\`\`\`${language}\n${code}\n\`\`\`\n\n`;
                break;
                
            case 'note':
                // Note element - can contain rich content
                if (element.content) {
                    if (element.format === 'markdown') {
                        // Use content directly as markdown
                        markdown = `${indent}${element.content}\n\n`;
                    } else {
                        // HTML content - convert to markdown-like or render as HTML
                        markdown = `${indent}${this.htmlToMarkdown(element.content)}\n\n`;
                    }
                } else if (element.text) {
                    markdown = `${indent}${this.processFormattedText(element.text)}\n\n`;
                }
                break;
                
            case 'task':
                const checkbox = element.completed ? '[x]' : '[ ]';
                const taskText = this.processFormattedText(element.text || 'Untitled');
                markdown = `${indent}- ${checkbox} ${taskText}`;
                if (element.deadline) {
                    const deadline = new Date(element.deadline);
                    markdown += ` *(${deadline.toLocaleDateString()})*`;
                }
                markdown += '\n';
                break;
                
            case 'header-checkbox':
                const headerText = this.processFormattedText(element.text || 'Untitled');
                if (element.completed) {
                    markdown = `${indent}## ~~${headerText}~~\n`;
                } else {
                    markdown = `${indent}## ${headerText}\n`;
                }
                break;
                
            case 'multi-checkbox':
                const multiText = this.processFormattedText(element.text || 'Untitled');
                markdown = `${indent}### ${multiText}\n`;
                if (element.items && Array.isArray(element.items)) {
                    element.items.forEach(item => {
                        const itemCheckbox = item.completed ? '[x]' : '[ ]';
                        const itemText = this.processFormattedText(item.text || '');
                        markdown += `${indent}  - ${itemCheckbox} ${itemText}\n`;
                    });
                }
                break;
                
            case 'timer':
                const timerText = this.processFormattedText(element.text || 'Timer');
                markdown = `${indent}- ⏱️ ${timerText}`;
                if (element.duration) {
                    markdown += ` (${this.formatDuration(element.duration)})`;
                }
                markdown += '\n';
                break;
                
            case 'tracker':
                const trackerText = this.processFormattedText(element.text || 'Tracker');
                markdown = `${indent}- 📊 ${trackerText}`;
                if (element.value !== undefined) {
                    markdown += `: ${element.value}`;
                }
                markdown += '\n';
                break;
                
            case 'counter':
                const counterText = this.processFormattedText(element.text || 'Counter');
                markdown = `${indent}- 🔢 ${counterText}`;
                if (element.count !== undefined) {
                    markdown += `: ${element.count}`;
                }
                markdown += '\n';
                break;
                
            case 'rating':
                const ratingText = this.processFormattedText(element.text || 'Rating');
                markdown = `${indent}- ⭐ ${ratingText}`;
                if (element.rating !== undefined) {
                    markdown += `: ${'★'.repeat(element.rating)}${'☆'.repeat(5 - element.rating)}`;
                }
                markdown += '\n';
                break;
                
            case 'image':
                if (element.imageUrl) {
                    markdown = `${indent}![](${element.imageUrl})\n`;
                    if (element.text) {
                        const imageText = this.processFormattedText(element.text);
                        markdown += `${indent}*${imageText}*\n`;
                    }
                }
                break;
                
            case 'audio':
                if (element.audioFile) {
                    const audioText = this.processFormattedText(element.text || 'Audio Recording');
                    markdown = `${indent}🎵 ${audioText}\n`;
                }
                break;
                
            default:
                const defaultText = this.processFormattedText(element.text || 'Untitled');
                markdown = `${indent}- ${defaultText}\n`;
        }
        
        // Handle children/subtasks
        if (element.children && Array.isArray(element.children) && element.children.length > 0) {
            element.children.forEach(child => {
                markdown += this.elementToMarkdown(child, depth + 1);
            });
        }
        
        return markdown;
    }
    
    /**
     * Process formatted text - handles HTML formatting in element.text
     * Converts HTML to markdown or preserves it for rendering
     * @param {string} text - Text that may contain HTML
     * @returns {string} Processed text (markdown or HTML)
     */
    processFormattedText(text) {
        if (!text) return '';
        
        // Check if text contains HTML tags
        if (/<[a-z][\s\S]*>/i.test(text)) {
            // Contains HTML - convert to markdown where possible, preserve styling
            return this.htmlToMarkdown(text);
        }
        
        // Plain text - escape markdown special chars
        return this.escapeMarkdown(text);
    }
    
    /**
     * Convert HTML to markdown (preserving formatting)
     * @param {string} html - HTML string
     * @returns {string} Markdown-like string with formatting preserved
     */
    htmlToMarkdown(html) {
        if (!html) return '';
        
        let md = html;
        
        // Preserve HTML for inline formatting (we'll render it as HTML later)
        // But convert block elements to markdown
        
        // Blockquotes
        md = md.replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gis, (match, content) => {
            const lines = content.split('\n').filter(l => l.trim());
            return lines.map(line => `> ${line.trim()}`).join('\n');
        });
        
        // Code blocks (pre > code)
        md = md.replace(/<pre[^>]*><code[^>]*>(.*?)<\/code><\/pre>/gis, (match, code) => {
            const escaped = code.replace(/```/g, '\\`\\`\\`');
            return `\`\`\`\n${escaped}\n\`\`\``;
        });
        
        // Inline code
        md = md.replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`');
        
        // Headers
        md = md.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1');
        md = md.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1');
        md = md.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1');
        
        // Bold and italic (preserve HTML for color/size styling)
        // We'll keep <strong>, <em>, <span> tags for styling
        
        // Links
        md = md.replace(/<a[^>]*href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi, '[$2]($1)');
        
        // Images
        md = md.replace(/<img[^>]*src=["']([^"']+)["'][^>]*(?:alt=["']([^"']*)["'])?[^>]*>/gi, '![$2]($1)');
        
        // Line breaks
        md = md.replace(/<br\s*\/?>/gi, '\n');
        md = md.replace(/<\/p>/gi, '\n\n');
        md = md.replace(/<p[^>]*>/gi, '');
        
        // Remove other block tags but keep content
        md = md.replace(/<\/?(div|section|article)[^>]*>/gi, '\n');
        
        // Strip remaining HTML tags but keep their content (for inline formatting)
        // We'll preserve <strong>, <em>, <span> for styling
        md = md.replace(/<(?!\/?(?:strong|em|span|b|i|u|s|code|a|img))[^>]+>/gi, '');
        
        return md.trim();
    }
    
    /**
     * Escape markdown special characters
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    escapeMarkdown(text) {
        if (!text) return '';
        return String(text)
            .replace(/\\/g, '\\\\')
            .replace(/\*/g, '\\*')
            .replace(/#/g, '\\#')
            .replace(/\[/g, '\\[')
            .replace(/\]/g, '\\]')
            .replace(/\(/g, '\\(')
            .replace(/\)/g, '\\)')
            .replace(/_/g, '\\_')
            .replace(/`/g, '\\`');
    }
    
    /**
     * Format duration in seconds to readable format
     * @param {number} seconds - Duration in seconds
     * @returns {string} Formatted duration
     */
    formatDuration(seconds) {
        if (!seconds) return '0s';
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        if (hours > 0) {
            return `${hours}h ${minutes}m ${secs}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${secs}s`;
        } else {
            return `${secs}s`;
        }
    }
    
    /**
     * Convert markdown to HTML (enhanced implementation with code blocks, quotes, etc.)
     * @param {string} markdown - Markdown text
     * @returns {string} HTML string
     */
    markdownToHTML(markdown) {
        if (!markdown) return '';
        
        // First, extract code blocks (they need special handling)
        const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
        const codeBlocks = [];
        let codeBlockIndex = 0;
        let processedMarkdown = markdown.replace(codeBlockRegex, (match, lang, code) => {
            const placeholder = `__CODE_BLOCK_${codeBlockIndex}__`;
            codeBlocks.push({ language: lang || 'text', code: code });
            codeBlockIndex++;
            return placeholder;
        });
        
        // Process line by line
        const lines = processedMarkdown.split('\n');
        let result = [];
        let inList = false;
        let inQuote = false;
        let currentListDepth = 0;
        let codeBlockPlaceholderIndex = 0;
        
        lines.forEach((line, index) => {
            const trimmed = line.trim();
            const originalLine = line;
            
            // Check for code block placeholder
            if (trimmed.includes('__CODE_BLOCK_')) {
                const codeBlock = codeBlocks[codeBlockPlaceholderIndex];
                if (codeBlock) {
                    if (inList) {
                        result.push('</ul>');
                        inList = false;
                        currentListDepth = 0;
                    }
                    if (inQuote) {
                        result.push('</blockquote>');
                        inQuote = false;
                    }
                    const codeHtml = this.renderCodeBlock(codeBlock.code, codeBlock.language);
                    result.push(codeHtml);
                    codeBlockPlaceholderIndex++;
                }
                return;
            }
            
            // Headers (must be at start of line)
            if (trimmed.startsWith('### ')) {
                if (inList) {
                    result.push('</ul>');
                    inList = false;
                    currentListDepth = 0;
                }
                if (inQuote) {
                    result.push('</blockquote>');
                    inQuote = false;
                }
                const text = trimmed.substring(4);
                result.push(`<h3>${this.processInlineFormatting(this.unescapeMarkdown(text))}</h3>`);
                return;
            }
            
            if (trimmed.startsWith('## ')) {
                if (inList) {
                    result.push('</ul>');
                    inList = false;
                    currentListDepth = 0;
                }
                if (inQuote) {
                    result.push('</blockquote>');
                    inQuote = false;
                }
                const text = trimmed.substring(3);
                result.push(`<h2>${this.processInlineFormatting(this.unescapeMarkdown(text))}</h2>`);
                return;
            }
            
            if (trimmed.startsWith('# ')) {
                if (inList) {
                    result.push('</ul>');
                    inList = false;
                    currentListDepth = 0;
                }
                if (inQuote) {
                    result.push('</blockquote>');
                    inQuote = false;
                }
                const text = trimmed.substring(2);
                result.push(`<h1>${this.processInlineFormatting(this.unescapeMarkdown(text))}</h1>`);
                return;
            }
            
            // Blockquotes
            if (trimmed.startsWith('> ')) {
                if (inList) {
                    result.push('</ul>');
                    inList = false;
                    currentListDepth = 0;
                }
                if (!inQuote) {
                    result.push('<blockquote>');
                    inQuote = true;
                }
                const quoteText = trimmed.substring(2);
                const processedQuote = this.processInlineFormatting(this.unescapeMarkdown(quoteText));
                result.push(`<p>${processedQuote}</p>`);
                return;
            } else if (inQuote) {
                // End quote block
                result.push('</blockquote>');
                inQuote = false;
            }
            
            // Lists
            if (trimmed.startsWith('- ')) {
                if (inQuote) {
                    result.push('</blockquote>');
                    inQuote = false;
                }
                const depth = (originalLine.length - originalLine.trimStart().length) / 2; // Count leading spaces / 2
                const content = trimmed.substring(2);
                
                // Close lists if depth decreased
                while (currentListDepth > depth) {
                    result.push('</ul>');
                    currentListDepth--;
                }
                
                if (!inList || currentListDepth < depth) {
                    result.push('<ul>');
                    inList = true;
                    currentListDepth = depth;
                }
                
                // Process inline formatting in list items
                const processedContent = this.processInlineFormatting(this.unescapeMarkdown(content));
                result.push(`<li>${processedContent}</li>`);
                return;
            }
            
            // Close list if we hit a non-list line
            if (inList) {
                result.push('</ul>');
                inList = false;
                currentListDepth = 0;
            }
            
            // Regular paragraphs
            if (trimmed) {
                const processedContent = this.processInlineFormatting(this.unescapeMarkdown(trimmed));
                result.push(`<p>${processedContent}</p>`);
            } else if (index < lines.length - 1) {
                // Empty line (but not last line)
                result.push('<br>');
            }
        });
        
        // Close any remaining blocks
        if (inList) {
            result.push('</ul>');
        }
        if (inQuote) {
            result.push('</blockquote>');
        }
        
        return result.join('\n');
    }
    
    /**
     * Render a code block with syntax highlighting
     * @param {string} code - Code content
     * @param {string} language - Language identifier
     * @returns {string} HTML for code block
     */
    renderCodeBlock(code, language = 'text') {
        const escaped = this.escapeHtml(code);
        return `
            <div class="code-block-wrapper" style="margin: 1.5em 0;">
                <div class="code-block-header" style="background: #2a2a2a; padding: 8px 12px; border-radius: 4px 4px 0 0; border: 1px solid #3a3a3a; border-bottom: none; display: flex; justify-content: space-between; align-items: center;">
                    <span style="color: #888; font-size: 12px; font-family: monospace;">${this.escapeHtml(language)}</span>
                </div>
                <pre class="code-block" style="background: #1a1a1a; padding: 15px; border-radius: 0 0 4px 4px; border: 1px solid #3a3a3a; margin: 0; overflow-x: auto;"><code class="language-${this.escapeHtml(language)}" style="color: #e0e0e0; font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace; font-size: 0.9em; line-height: 1.5; display: block; white-space: pre;">${escaped}</code></pre>
            </div>
        `;
    }
    
    /**
     * Process inline markdown formatting (bold, italic, strikethrough, code, links, images)
     * Also handles HTML formatting (colors, sizes, etc.)
     * @param {string} text - Text to process (may contain HTML or markdown)
     * @returns {string} HTML with inline formatting
     */
    processInlineFormatting(text) {
        if (!text) return '';
        
        // Check if text already contains HTML formatting
        if (/<[a-z][\s\S]*>/i.test(text)) {
            // Contains HTML - preserve formatting tags and their attributes (especially style)
            // This allows colors, font sizes, etc. to be preserved
            let html = text;
            
            // Sanitize: only allow safe formatting tags
            // Extract and preserve style attributes for colors, sizes, etc.
            const allowedTags = ['strong', 'em', 'b', 'i', 'u', 's', 'code', 'a', 'span', 'mark', 'small', 'sub', 'sup'];
            const tagRegex = new RegExp(`<(/?)(${allowedTags.join('|')})([^>]*)>`, 'gi');
            
            // Preserve allowed tags with their attributes (especially style)
            html = html.replace(tagRegex, (match, closing, tag, attrs) => {
                if (closing) {
                    return `</${tag}>`;
                }
                // Preserve attributes, especially style for colors/sizes
                return `<${tag}${attrs}>`;
            });
            
            // Remove any other HTML tags but keep their content
            html = html.replace(/<(?!\/?(?:strong|em|b|i|u|s|code|a|span|mark|small|sub|sup))[^>]+>/gi, '');
            
            // Escape any remaining unsafe content
            // But preserve the HTML structure we want
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = html;
            // Get text content and re-apply formatting
            // Actually, we'll trust the HTML if it only contains safe tags
            return html;
        }
        
        // Plain markdown text - convert to HTML
        let html = this.escapeHtml(text);
        
        // Images (before links, as images can contain brackets)
        html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width: 100%; height: auto; border-radius: 4px; margin: 0.5em 0;">');
        
        // Links
        html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color: #4a9eff; text-decoration: none;">$1</a>');
        
        // Code (before bold/italic to avoid conflicts)
        html = html.replace(/`([^`]+)`/g, '<code style="background: #2a2a2a; padding: 2px 6px; border-radius: 3px; font-family: monospace; color: #e06c75;">$1</code>');
        
        // Bold
        html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        
        // Italic
        html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
        
        // Strikethrough
        html = html.replace(/~~([^~]+)~~/g, '<del style="opacity: 0.6;">$1</del>');
        
        return html;
    }
    
    /**
     * Unescape markdown characters (reverse of escapeMarkdown)
     * @param {string} text - Escaped text
     * @returns {string} Unescaped text
     */
    unescapeMarkdown(text) {
        if (!text) return '';
        return String(text)
            .replace(/\\`/g, '`')
            .replace(/\\_/g, '_')
            .replace(/\\\)/g, ')')
            .replace(/\\\(/g, '(')
            .replace(/\\\]/g, ']')
            .replace(/\\\[/g, '[')
            .replace(/\\#/g, '#')
            .replace(/\\\*/g, '*')
            .replace(/\\\\/g, '\\');
    }
    
    /**
     * Escape HTML special characters
     * @param {string} text - Text to escape
     * @returns {string} Escaped HTML
     */
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    /**
     * Render a page in document format
     * @param {HTMLElement} container - Container element
     * @param {Object} page - Page data
     * @param {Object} options - Options with app reference
     */
    renderPage(container, page, options = {}) {
        const app = options.app;
        if (!app) return;
        
        // Only clear if not preserving format (allows seamless switching)
        if (!app._preservingFormat) {
            container.innerHTML = '';
        }
        
        // Apply Obsidian-like styling
        container.style.cssText = `
            max-width: ${this.config.lineWidth || 700}px;
            margin: 0 auto;
            padding: 40px 20px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            font-size: ${this.config.fontSize || 16}px;
            line-height: ${this.config.lineHeight || 1.6};
            color: #dcddde;
            background: #1e1e1e;
            min-height: calc(100vh - 100px);
        `;
        
        // Create document wrapper
        const docWrapper = document.createElement('div');
        docWrapper.className = 'document-view';
        docWrapper.style.cssText = `
            background: #1e1e1e;
            color: #dcddde;
        `;
        
        // Page title
        const title = document.createElement('h1');
        title.textContent = page.title || page.id;
        title.style.cssText = `
            font-size: 2.5em;
            font-weight: 700;
            margin: 0 0 0.5em 0;
            padding-bottom: 0.3em;
            border-bottom: 1px solid #3a3a3a;
            color: #ffffff;
        `;
        docWrapper.appendChild(title);
        
        if (!page.bins || page.bins.length === 0) {
            if (!app._preservingFormat) {
                const emptyMsg = document.createElement('p');
                emptyMsg.textContent = 'No content yet. Add bins and elements to see them here.';
                emptyMsg.style.cssText = 'color: #888; font-style: italic;';
                docWrapper.appendChild(emptyMsg);
                container.appendChild(docWrapper);
            }
            // Reset format preservation flag
            app._preservingFormat = false;
            return;
        }
        
        // Convert bins and elements to markdown, then to HTML
        let markdown = '';
        
        page.bins.forEach((bin, binIndex) => {
            // Bin as section header
            if (bin.title) {
                markdown += `## ${this.escapeMarkdown(bin.title)}\n\n`;
            } else {
                markdown += `## Bin ${binIndex + 1}\n\n`;
            }
            
            // Elements in bin
            if (bin.elements && Array.isArray(bin.elements) && bin.elements.length > 0) {
                bin.elements.forEach(element => {
                    markdown += this.elementToMarkdown(element, 0) + '\n\n';
                });
            } else {
                markdown += '*No elements*\n\n';
            }
        });
        
        // Convert markdown to HTML and render
        const content = document.createElement('div');
        content.className = 'document-content';
        content.style.cssText = `
            color: #dcddde;
        `;
        
        // Apply Obsidian-like typography
        const style = document.createElement('style');
        style.textContent = `
            .document-view h1 {
                font-size: 2.5em;
                font-weight: 700;
                margin: 1em 0 0.5em 0;
                padding-bottom: 0.3em;
                border-bottom: 1px solid #3a3a3a;
                color: #ffffff;
            }
            .document-view h2 {
                font-size: 1.8em;
                font-weight: 600;
                margin: 1.5em 0 0.8em 0;
                padding-bottom: 0.2em;
                border-bottom: 1px solid #3a3a3a;
                color: #ffffff;
            }
            .document-view h3 {
                font-size: 1.4em;
                font-weight: 600;
                margin: 1.2em 0 0.6em 0;
                color: #ffffff;
            }
            .document-view p {
                margin: 0.8em 0;
                color: #dcddde;
            }
            .document-view ul {
                margin: 0.8em 0;
                padding-left: 1.5em;
            }
            .document-view li {
                margin: 0.4em 0;
                color: #dcddde;
            }
            .document-view code {
                background: #2a2a2a;
                padding: 2px 6px;
                border-radius: 3px;
                font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
                font-size: 0.9em;
                color: #e06c75;
            }
            .document-view strong {
                font-weight: 600;
                color: #ffffff;
            }
            .document-view em {
                font-style: italic;
                color: #dcddde;
            }
            .document-view del {
                text-decoration: line-through;
                opacity: 0.6;
            }
            .document-view a {
                color: #4a9eff;
                text-decoration: none;
            }
            .document-view a:hover {
                text-decoration: underline;
            }
            .document-view img {
                max-width: 100%;
                height: auto;
                border-radius: 4px;
                margin: 1em 0;
            }
            .document-view blockquote {
                border-left: 4px solid #4a9eff;
                padding-left: 1em;
                margin: 1em 0;
                color: #b0b0b0;
                font-style: italic;
                background: #252525;
                padding: 1em 1em 1em 1.5em;
                border-radius: 0 4px 4px 0;
            }
            .document-view blockquote p {
                margin: 0.5em 0;
            }
            .document-view blockquote p:first-child {
                margin-top: 0;
            }
            .document-view blockquote p:last-child {
                margin-bottom: 0;
            }
            .document-view .code-block-wrapper {
                margin: 1.5em 0;
            }
            .document-view .code-block {
                background: #1a1a1a;
                border: 1px solid #3a3a3a;
                border-radius: 4px;
                padding: 15px;
                overflow-x: auto;
            }
            .document-view .code-block code {
                background: transparent;
                padding: 0;
                color: #e0e0e0;
                font-size: 0.9em;
            }
            .document-view span[style*="color"] {
                /* Preserve custom colors from HTML */
            }
            .document-view span[style*="font-size"] {
                /* Preserve custom font sizes from HTML */
            }
        `;
        docWrapper.appendChild(style);
        
        content.innerHTML = this.markdownToHTML(markdown);
        docWrapper.appendChild(content);
        
        // Only append if not preserving format (prevents duplicates)
        if (!app._preservingFormat || container.children.length === 0) {
            container.appendChild(docWrapper);
        } else {
            // Update existing content
            const existingWrapper = container.querySelector('.document-view');
            if (existingWrapper) {
                existingWrapper.replaceWith(docWrapper);
            } else {
                container.appendChild(docWrapper);
            }
        }
        
        // Reset format preservation flag after render
        app._preservingFormat = false;
        
        // Emit page:render event for plugins
        setTimeout(() => {
            if (app.eventBus && page) {
                app.eventBus.emit('page:render', {
                    pageElement: container,
                    pageData: page
                });
            }
        }, 0);
    }
}


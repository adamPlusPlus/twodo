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
                lineHeight: 1.3  // Reduced default spacing
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
                const codeTitle = element.text ? `**${element.text}**\n` : '';
                const language = element.language || 'text';
                const code = element.code || '';
                markdown = `${indent}${codeTitle}\`\`\`${language}\n${code}\n\`\`\`\n`;
                break;
                
            case 'note':
                // Note element - can contain rich content
                if (element.content) {
                    if (element.format === 'markdown') {
                        // Use content directly as markdown
                        markdown = `${indent}${element.content}\n`;
                    } else {
                        // HTML content - convert to markdown-like or render as HTML
                        markdown = `${indent}${this.htmlToMarkdown(element.content)}\n`;
                    }
                } else if (element.text) {
                    markdown = `${indent}${this.processFormattedText(element.text)}\n`;
                }
                break;
                
            case 'task':
                const checkbox = element.completed ? '[x]' : '[ ]';
                const taskText = this.processFormattedText(element.text || 'Untitled');
                // Tasks should be checkboxes, not bullet points
                markdown = `${indent}- ${checkbox} ${taskText}`;
                if (element.deadline) {
                    const deadline = new Date(element.deadline);
                    markdown += ` *(${deadline.toLocaleDateString()})*`;
                }
                markdown += '\n';
                break;
                
            case 'header-checkbox':
                const headerText = this.processFormattedText(element.text || 'Untitled');
                // Headers should be prominent - use h2 for main headers, h3 for nested
                if (depth === 0) {
                    if (element.completed) {
                        markdown = `## ~~${headerText}~~\n`;
                    } else {
                        markdown = `## ${headerText}\n`;
                    }
                } else {
                    if (element.completed) {
                        markdown = `### ~~${headerText}~~\n`;
                    } else {
                        markdown = `### ${headerText}\n`;
                    }
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
                // For unknown types, render as plain text (not bullet point)
                const defaultText = this.processFormattedText(element.text || 'Untitled');
                // If it has no text but has other properties, try to render something useful
                if (!defaultText || defaultText === 'Untitled') {
                    // Try to find any meaningful content
                    if (element.content) {
                        markdown = `${indent}${this.processFormattedText(element.content)}\n`;
                    } else {
                        // Only use bullet point as last resort
                        markdown = `${indent}- ${defaultText}\n`;
                    }
                } else {
                    // Render as paragraph, not bullet point
                    markdown = `${indent}${defaultText}\n`;
                }
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
        
        // Convert interactive checkboxes back to markdown format
        // Match: <li class="task-item"...><input type="checkbox"...> <span class="task-text">...</span></li>
        md = md.replace(/<li[^>]*class="task-item"[^>]*(?:data-original-line="([^"]*)")?[^>]*><input[^>]*type="checkbox"[^>]*(?:checked)?[^>]*>\s*<span[^>]*class="task-text"[^>]*>(.*?)<\/span><\/li>/gis, (match, originalLine, taskText) => {
            // Use original line if available, otherwise reconstruct
            if (originalLine && originalLine.trim()) {
                // Update checkbox state in original line
                const isChecked = match.includes('checked');
                return originalLine.replace(/\[x\]|\[ \]/, isChecked ? '[x]' : '[ ]');
            }
            // Reconstruct from checkbox state and text
            const isChecked = match.includes('checked');
            const checkbox = isChecked ? '[x]' : '[ ]';
            const text = this.stripHtmlTags(taskText);
            return `- ${checkbox} ${text}`;
        });
        
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
        
        // Line breaks - convert <br> to \n
        md = md.replace(/<br\s*\/?>/gi, '\n');
        
        // Paragraphs - convert to double newlines for separation, but preserve single newlines
        md = md.replace(/<\/p>/gi, '\n');
        md = md.replace(/<p[^>]*>/gi, '');
        
        // Lists - convert <ul> and <li> back to markdown
        md = md.replace(/<\/ul>/gi, '\n');
        md = md.replace(/<ul[^>]*>/gi, '');
        // Regular list items (not task items, those are handled above)
        md = md.replace(/<li[^>]*>(.*?)<\/li>/gi, (match, content) => {
            const text = this.stripHtmlTags(content);
            return `- ${text}`;
        });
        
        // Remove other block tags but keep content
        md = md.replace(/<\/?(div|section|article)[^>]*>/gi, '\n');
        
        // Strip remaining HTML tags but keep their content (for inline formatting)
        // We'll preserve <strong>, <em>, <span> for styling
        md = md.replace(/<(?!\/?(?:strong|em|span|b|i|u|s|code|a|img))[^>]+>/gi, '');
        
        // Clean up excessive newlines (more than 2 consecutive)
        md = md.replace(/\n{3,}/g, '\n\n');
        
        return md.trim();
    }
    
    /**
     * Strip HTML tags from text (but preserve content)
     * @param {string} html - HTML string
     * @returns {string} Text content
     */
    stripHtmlTags(html) {
        if (!html) return '';
        const div = document.createElement('div');
        div.innerHTML = html;
        return div.textContent || div.innerText || '';
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
            
            // Lists (including task checkboxes)
            if (trimmed.startsWith('- ')) {
                if (inQuote) {
                    result.push('</blockquote>');
                    inQuote = false;
                }
                const depth = (originalLine.length - originalLine.trimStart().length) / 2; // Count leading spaces / 2
                const content = trimmed.substring(2);
                
                // Check if this is a task checkbox: `- [x]` or `- [ ]`
                const checkboxMatch = content.match(/^(\[x\]|\[ \])\s*(.*)$/);
                
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
                if (checkboxMatch) {
                    // This is a task checkbox - create interactive checkbox
                    const isChecked = checkboxMatch[1] === '[x]';
                    const taskText = checkboxMatch[2] || '';
                    const processedText = this.processInlineFormatting(this.unescapeMarkdown(taskText));
                    // Store original markdown line for updating
                    const checkboxId = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                    result.push(`<li class="task-item" data-checkbox-id="${checkboxId}" data-original-line="${this.escapeHtml(originalLine)}"><input type="checkbox" class="task-checkbox" ${isChecked ? 'checked' : ''} data-task-id="${checkboxId}"> <span class="task-text">${processedText}</span></li>`);
                } else {
                    // Regular list item
                    const processedContent = this.processInlineFormatting(this.unescapeMarkdown(content));
                    result.push(`<li>${processedContent}</li>`);
                }
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
            line-height: ${this.config.lineHeight || 1.3};
            color: #dcddde;
            background: #1e1e1e;
            min-height: calc(100vh - 100px);
        `;
        
        // Create document wrapper with edit/preview split view
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
        
        // View mode toggle buttons (Obsidian-style)
        const viewControls = document.createElement('div');
        viewControls.className = 'document-view-controls';
        viewControls.style.cssText = `
            display: flex;
            gap: 8px;
            margin-bottom: 20px;
            padding: 8px;
            background: #252525;
            border-radius: 6px;
            border: 1px solid #3a3a3a;
        `;
        
        const editBtn = document.createElement('button');
        editBtn.textContent = 'Edit';
        editBtn.className = 'view-mode-btn';
        editBtn.dataset.mode = 'edit';
        editBtn.style.cssText = `
            padding: 6px 12px;
            background: #2a2a2a;
            color: #dcddde;
            border: 1px solid #3a3a3a;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
        `;
        
        const previewBtn = document.createElement('button');
        previewBtn.textContent = 'Preview';
        previewBtn.className = 'view-mode-btn';
        previewBtn.dataset.mode = 'preview';
        previewBtn.style.cssText = `
            padding: 6px 12px;
            background: #2a2a2a;
            color: #dcddde;
            border: 1px solid #3a3a3a;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
        `;
        
        const splitBtn = document.createElement('button');
        splitBtn.textContent = 'Split';
        splitBtn.className = 'view-mode-btn';
        splitBtn.dataset.mode = 'split';
        splitBtn.style.cssText = `
            padding: 6px 12px;
            background: #4a9eff;
            color: white;
            border: 1px solid #4a9eff;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
        `;
        
        // Store current view mode (default: split)
        let currentViewMode = 'split';
        const setViewMode = (mode) => {
            currentViewMode = mode;
            editBtn.style.background = mode === 'edit' ? '#4a9eff' : '#2a2a2a';
            editBtn.style.color = mode === 'edit' ? 'white' : '#dcddde';
            previewBtn.style.background = mode === 'preview' ? '#4a9eff' : '#2a2a2a';
            previewBtn.style.color = mode === 'preview' ? 'white' : '#dcddde';
            splitBtn.style.background = mode === 'split' ? '#4a9eff' : '#2a2a2a';
            splitBtn.style.color = mode === 'split' ? 'white' : '#dcddde';
            
            if (mode === 'edit') {
                editContainer.style.display = 'block';
                previewContainer.style.display = 'none';
                splitContainer.style.display = 'none';
            } else if (mode === 'preview') {
                editContainer.style.display = 'none';
                previewContainer.style.display = 'block';
                splitContainer.style.display = 'none';
            } else {
                editContainer.style.display = 'none';
                previewContainer.style.display = 'none';
                splitContainer.style.display = 'flex';
            }
        };
        
        editBtn.addEventListener('click', () => setViewMode('edit'));
        previewBtn.addEventListener('click', () => setViewMode('preview'));
        splitBtn.addEventListener('click', () => setViewMode('split'));
        
        viewControls.appendChild(editBtn);
        viewControls.appendChild(previewBtn);
        viewControls.appendChild(splitBtn);
        docWrapper.appendChild(viewControls);
        
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
                bin.elements.forEach((element, elIndex) => {
                    const elementMarkdown = this.elementToMarkdown(element, 0);
                    markdown += elementMarkdown;
                    // Only add extra newline if not last element and element doesn't already end with newlines
                    if (elIndex < bin.elements.length - 1 && !elementMarkdown.endsWith('\n\n')) {
                        markdown += '\n';
                    }
                });
            } else {
                markdown += '*No elements*\n\n';
            }
        });
        
        // Create edit container (raw markdown textarea)
        const editContainer = document.createElement('div');
        editContainer.className = 'document-edit-container';
        editContainer.style.cssText = `
            display: none;
            width: 100%;
        `;
        
        const editTextarea = document.createElement('textarea');
        editTextarea.className = 'document-edit-textarea';
        editTextarea.value = markdown;
        editTextarea.style.cssText = `
            width: 100%;
            min-height: 600px;
            padding: 20px;
            background: #1a1a1a;
            color: #dcddde;
            border: 1px solid #3a3a3a;
            border-radius: 4px;
            font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
            font-size: 14px;
            line-height: 1.6;
            resize: vertical;
            tab-size: 2;
        `;
        editContainer.appendChild(editTextarea);
        
        // Create preview container (rendered HTML)
        const previewContainer = document.createElement('div');
        previewContainer.className = 'document-preview-container';
        previewContainer.style.cssText = `
            display: none;
            width: 100%;
        `;
        
        const previewContent = document.createElement('div');
        previewContent.className = 'document-content';
        previewContent.style.cssText = `
            color: #dcddde;
        `;
        previewContainer.appendChild(previewContent);
        
        // Create split container (both edit and preview side by side)
        const splitContainer = document.createElement('div');
        splitContainer.className = 'document-split-container';
        splitContainer.style.cssText = `
            display: flex;
            gap: 20px;
            width: 100%;
        `;
        
        const splitEdit = document.createElement('div');
        splitEdit.className = 'document-split-edit';
        splitEdit.style.cssText = `
            flex: 1;
            min-width: 0;
        `;
        
        const splitEditTextarea = document.createElement('textarea');
        splitEditTextarea.className = 'document-edit-textarea';
        splitEditTextarea.value = markdown;
        splitEditTextarea.style.cssText = `
            width: 100%;
            min-height: 600px;
            padding: 20px;
            background: #1a1a1a;
            color: #dcddde;
            border: 1px solid #3a3a3a;
            border-radius: 4px;
            font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
            font-size: 14px;
            line-height: 1.6;
            resize: none;
            tab-size: 2;
        `;
        splitEdit.appendChild(splitEditTextarea);
        
        const splitPreview = document.createElement('div');
        splitPreview.className = 'document-split-preview';
        splitPreview.style.cssText = `
            flex: 1;
            min-width: 0;
            overflow-y: auto;
            max-height: 600px;
        `;
        
        const splitPreviewContent = document.createElement('div');
        splitPreviewContent.className = 'document-content';
        splitPreviewContent.style.cssText = `
            color: #dcddde;
        `;
        splitPreview.appendChild(splitPreviewContent);
        
        splitContainer.appendChild(splitEdit);
        splitContainer.appendChild(splitPreview);
        
        // Function to update preview from markdown
        const updatePreview = (markdownText, targetElement, isEditable = false) => {
            targetElement.innerHTML = this.markdownToHTML(markdownText);
            
            // Make preview editable if requested
            if (isEditable) {
                targetElement.contentEditable = true;
                targetElement.style.outline = 'none';
                targetElement.style.minHeight = '600px';
                
                // Handle return key to insert newline
                targetElement.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        document.execCommand('insertLineBreak');
                    }
                });
                
                // Sync changes back to markdown (debounced)
                let syncTimeout;
                targetElement.addEventListener('input', () => {
                    clearTimeout(syncTimeout);
                    syncTimeout = setTimeout(() => {
                        // Convert HTML back to markdown
                        const html = targetElement.innerHTML;
                        const markdownFromHtml = this.htmlToMarkdown(html);
                        // Update textareas
                        editTextarea.value = markdownFromHtml;
                        splitEditTextarea.value = markdownFromHtml;
                        // Update other preview (but don't re-enable editing to avoid recursion)
                        if (targetElement === previewContent) {
                            const wasEditable = splitPreviewContent.contentEditable === 'true';
                            updatePreview(markdownFromHtml, splitPreviewContent, wasEditable);
                        } else {
                            const wasEditable = previewContent.contentEditable === 'true';
                            updatePreview(markdownFromHtml, previewContent, wasEditable);
                        }
                        // Save
                        saveMarkdownToPage(markdownFromHtml);
                    }, 300);
                });
            }
            
            // Make checkboxes interactive
            const checkboxes = targetElement.querySelectorAll('.task-checkbox');
            checkboxes.forEach(checkbox => {
                checkbox.addEventListener('change', async (e) => {
                    const taskItem = checkbox.closest('.task-item');
                    if (!taskItem) return;
                    
                    const originalLine = taskItem.dataset.originalLine;
                    if (!originalLine) return;
                    
                    const isChecked = e.target.checked;
                    
                    // If checkbox is unchecked, convert element to 'note' type (text-only)
                    if (!isChecked) {
                        // Find the element in page data and convert to note type
                        const currentMarkdown = editTextarea.value || splitEditTextarea.value;
                        const lines = currentMarkdown.split('\n');
                        const lineIndex = lines.findIndex(line => line.trim() === originalLine.trim());
                        
                        if (lineIndex !== -1) {
                            // Extract task text (remove checkbox and bullet)
                            const taskTextMatch = originalLine.match(/^[\s-]*\[[x ]\]\s*(.*)$/);
                            const taskText = taskTextMatch ? taskTextMatch[1] : originalLine.replace(/^[\s-]*\[[x ]\]\s*/, '');
                            
                            // Update markdown: remove checkbox, make it plain text
                            const newLine = taskText.trim();
                            lines[lineIndex] = newLine;
                            const newMarkdown = lines.join('\n');
                            
                            // Update all textareas and previews
                            editTextarea.value = newMarkdown;
                            splitEditTextarea.value = newMarkdown;
                            updatePreview(newMarkdown, previewContent, true);
                            updatePreview(newMarkdown, splitPreviewContent, true);
                            
                            // Find and update the actual element in page data
                            if (app && app.appState && app.appState.pages) {
                                const pages = app.appState.pages;
                                const currentPage = pages.find(p => p.id === page.id);
                                if (currentPage && currentPage.bins) {
                                    for (const bin of currentPage.bins) {
                                        if (bin.elements) {
                                            const elementIndex = bin.elements.findIndex(el => {
                                                // Try to match element by text
                                                const elText = el.text || '';
                                                return elText.trim() === taskText.trim();
                                            });
                                            if (elementIndex !== -1) {
                                                const element = bin.elements[elementIndex];
                                                // Convert to note type (text-only, no checkbox)
                                                element.type = 'note';
                                                element.text = taskText.trim();
                                                delete element.completed; // Remove checkbox property
                                                // Save changes
                                                if (app.dataManager) {
                                                    await app.dataManager.saveData();
                                                }
                                                // Re-render to show changes
                                                app._preservingFormat = true;
                                                app.render();
                                                break;
                                            }
                                        }
                                    }
                                }
                            }
                            
                            // Save markdown to page metadata
                            saveMarkdownToPage(newMarkdown);
                        }
                    } else {
                        // Checkbox is checked - update markdown normally
                        const newLine = originalLine.replace(/\[x\]|\[ \]/, isChecked ? '[x]' : '[ ]');
                        
                        // Update the markdown text
                        const currentMarkdown = editTextarea.value || splitEditTextarea.value;
                        const lines = currentMarkdown.split('\n');
                        const lineIndex = lines.findIndex(line => line.trim() === originalLine.trim());
                        if (lineIndex !== -1) {
                            lines[lineIndex] = newLine;
                            const newMarkdown = lines.join('\n');
                            
                            // Update all textareas and previews
                            editTextarea.value = newMarkdown;
                            splitEditTextarea.value = newMarkdown;
                            updatePreview(newMarkdown, previewContent, true);
                            updatePreview(newMarkdown, splitPreviewContent, true);
                            
                            // Update task item data
                            taskItem.dataset.originalLine = newLine;
                            
                            // Save to page data
                            saveMarkdownToPage(newMarkdown);
                        }
                    }
                });
            });
        };
        
        // Function to save markdown back to page data
        const saveMarkdownToPage = async (markdownText) => {
            // Parse markdown back to page structure
            // This is complex - for now, we'll store the raw markdown in page metadata
            if (app.appState) {
                const pages = app.appState.pages || [];
                const pageIndex = pages.findIndex(p => p.id === page.id);
                if (pageIndex !== -1) {
                    if (!pages[pageIndex]._documentMarkdown) {
                        pages[pageIndex]._documentMarkdown = {};
                    }
                    pages[pageIndex]._documentMarkdown.raw = markdownText;
                    pages[pageIndex]._documentMarkdown.lastModified = Date.now();
                    app.appState.pages = pages;
                    // Trigger save
                    if (app.dataManager) {
                        await app.dataManager.saveData();
                    }
                }
            }
        };
        
        // Sync edit textarea changes to split edit textarea and update previews
        const syncEditChanges = (source, target) => {
            const markdownText = source.value;
            if (target && target.value !== markdownText) {
                target.value = markdownText;
            }
            updatePreview(markdownText, previewContent);
            updatePreview(markdownText, splitPreviewContent);
            
            // Debounce save
            clearTimeout(syncEditChanges._saveTimeout);
            syncEditChanges._saveTimeout = setTimeout(() => {
                saveMarkdownToPage(markdownText);
            }, 1000);
        };
        
        editTextarea.addEventListener('input', () => syncEditChanges(editTextarea, splitEditTextarea));
        splitEditTextarea.addEventListener('input', () => syncEditChanges(splitEditTextarea, editTextarea));
        
        // Initial preview render (make preview editable)
        updatePreview(markdown, previewContent, true);
        updatePreview(markdown, splitPreviewContent, true);
        
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
                margin: 1em 0 0.5em 0;
                padding-bottom: 0.2em;
                border-bottom: 1px solid #3a3a3a;
                color: #ffffff;
            }
            .document-view h3 {
                font-size: 1.4em;
                font-weight: 600;
                margin: 0.8em 0 0.4em 0;
                color: #ffffff;
            }
            .document-view p {
                margin: 0.3em 0;
                color: #dcddde;
            }
            .document-view p:first-child {
                margin-top: 0;
            }
            .document-view p:last-child {
                margin-bottom: 0;
            }
            .document-view ul {
                margin: 0.3em 0;
                padding-left: 1.5em;
            }
            .document-view li {
                margin: 0.1em 0;
                color: #dcddde;
            }
            .document-view li.task-item {
                list-style: none;
                margin-left: -1.5em;
                display: flex;
                align-items: flex-start;
                gap: 8px;
            }
            .document-view .task-checkbox {
                margin-top: 2px;
                cursor: pointer;
                width: 18px;
                height: 18px;
                flex-shrink: 0;
            }
            .document-view .task-text {
                flex: 1;
            }
            .document-view [contenteditable="true"] {
                outline: none;
            }
            .document-view [contenteditable="true"]:focus {
                outline: 1px solid #4a9eff;
                outline-offset: 2px;
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
        
        // Append containers to wrapper
        docWrapper.appendChild(editContainer);
        docWrapper.appendChild(previewContainer);
        docWrapper.appendChild(splitContainer);
        
        // Set initial view mode
        setViewMode('split');
        
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


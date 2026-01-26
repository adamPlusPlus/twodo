// DocumentViewFormat - Format renderer for Obsidian-style markdown document view
import { BaseFormatRenderer } from '../../core/BaseFormatRenderer.js';
import { eventBus } from '../../core/EventBus.js';
import { ItemHierarchy } from '../../utils/ItemHierarchy.js';
import { performanceBudgetManager } from '../../core/PerformanceBudgetManager.js';
import { ViewProjection } from '../../core/ViewProjection.js';
import { getService, SERVICES } from '../../core/AppServices.js';
import { AUTHORITY_MODES } from '../../core/AuthorityManager.js';
import { markdownDiffParser } from '../../utils/MarkdownDiffParser.js';

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
        
        // Create ViewProjection for this format
        this.viewProjection = null;
        this.currentPageId = null;
        this._markdownCache = null; // Cache last projected markdown
    }
    
    async onInit() {
        // Emit event for registration - FormatRendererManager listens to this
        console.log('[DocumentViewFormat] onInit called, id:', this.id, 'formatName:', this.formatName);
        eventBus.emit('format:registered', { pluginId: this.id });
        console.log('[DocumentViewFormat] format:registered event emitted');
    }

    _getPages(app) {
        return app?.appState?.documents || [];
    }

    _getGroups(page) {
        return page?.groups || [];
    }

    _getItems(bin) {
        const items = bin.items || [];
        bin.items = items;
        return ItemHierarchy.getRootItems(items);
    }
    
    /**
     * Convert element to markdown representation
     * @param {Object} element - Element data
     * @param {number} depth - Nesting depth
     * @returns {string} Markdown string
     */
    elementToMarkdown(element, depth = 0, itemIndex = null) {
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
                
            case 'time-log':
                const timeLogText = this.processFormattedText(element.text || 'Time Log');
                markdown = `${indent}⏰ ${timeLogText}`;
                if (element.entries && Array.isArray(element.entries) && element.entries.length > 0) {
                    markdown += `\n${indent}  Entries: ${element.entries.length}`;
                }
                markdown += '\n';
                break;
                
            case 'calendar':
                const calendarText = this.processFormattedText(element.text || 'Calendar');
                markdown = `${indent}📅 ${calendarText}\n`;
                if (element.events && Array.isArray(element.events) && element.events.length > 0) {
                    markdown += `${indent}  Events: ${element.events.length}\n`;
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
        if (itemIndex) {
            const childItems = ItemHierarchy.getChildItems(element, itemIndex);
            childItems.forEach(child => {
                markdown += this.elementToMarkdown(child, depth + 1, itemIndex);
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
        // But convert block items to markdown
        
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
            
            // Check for element placeholder (before code block check)
            if (trimmed.includes('__ELEMENT_')) {
                if (inList) {
                    result.push('</ul>');
                    inList = false;
                    currentListDepth = 0;
                }
                if (inQuote) {
                    result.push('</blockquote>');
                    inQuote = false;
                }
                // Leave placeholder as-is for later replacement
                result.push(trimmed);
                return;
            }
            
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
            
            // Check for element placeholder
            if (trimmed.includes('__ELEMENT_')) {
                // This is an element placeholder - leave it as-is for later replacement
                result.push(trimmed);
                return;
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
        
        // Links - use app.parseLinks if available for internal references
        // Otherwise, handle markdown links
        if (this.app && this.app.parseLinks) {
            // Use LinkHandler for unified link parsing
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = html;
            const textContent = tempDiv.textContent || tempDiv.innerText || '';
            const context = { pageId: this.currentDocumentId };
            const linkFragment = this.app.parseLinks(textContent, context);
            
            // Replace links in HTML
            tempDiv.innerHTML = '';
            tempDiv.appendChild(linkFragment);
            html = tempDiv.innerHTML;
        } else {
            // Fallback: markdown links only
            html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color: #4a9eff; text-decoration: none;">$1</a>');
        }
        
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
     * Project canonical model to markdown representation
     * @param {Object} canonicalModel - AppState instance
     * @returns {string} Markdown representation
     */
    project(canonicalModel) {
        if (!canonicalModel || !canonicalModel.documents) {
            return '';
        }
        
        const page = canonicalModel.documents.find(p => p.id === this.currentPageId);
        if (!page) {
            return '';
        }
        
        // Convert page to markdown
        let markdown = '';
        
        // Page title
        if (page.title) {
            markdown += `# ${page.title}\n\n`;
        }
        
        // Convert groups and items to markdown
        const groups = this._getGroups(page);
        const itemIndex = this._buildItemIndex(page);
        
        for (const bin of groups) {
            const items = this._getItems(bin);
            for (let i = 0; i < items.length; i++) {
                const element = items[i];
                markdown += this.elementToMarkdown(element, 0, itemIndex);
            }
        }
        
        this._markdownCache = markdown;
        return markdown;
    }
    
    /**
     * Apply operation to view (incremental update)
     * @param {Object} operation - Operation object
     * @returns {boolean} True if handled
     */
    applyOperation(operation) {
        if (!this.isOperationRelevant(operation)) {
            return false;
        }
        
        // For now, fallback to full re-project for most operations
        // Future: implement incremental markdown updates
        if (operation.op === 'setText' || operation.op === 'move' || operation.op === 'create' || operation.op === 'delete') {
            // Trigger full update
            if (this.viewProjection) {
                this.viewProjection.update();
            }
            return true;
        }
        
        return false;
    }
    
    /**
     * Check if operation is relevant to this view
     * @param {Object} operation - Operation object
     * @returns {boolean}
     */
    isOperationRelevant(operation) {
        if (!this.currentPageId || !operation.itemId) {
            return false;
        }
        
        // Use ViewProjection's helper if available
        if (this.viewProjection) {
            return this.viewProjection.isOperationRelevant(operation);
        }
        
        return false;
    }
    
    /**
     * Build item index for hierarchy traversal
     * @private
     * @param {Object} page - Page object
     * @returns {Object} Item index
     */
    _buildItemIndex(page) {
        const itemIndex = {};
        const groups = this._getGroups(page);
        
        for (const bin of groups) {
            const items = bin.items || [];
            ItemHierarchy.buildIndex(items, itemIndex);
        }
        
        return itemIndex;
    }
    
    /**
     * Render a page in document format
     * @param {HTMLElement} container - Container element
     * @param {Object} page - Page data
     * @param {Object} options - Options with app reference
     */
    renderPage(container, page, options = {}) {
        this.app = options.app;
        this.currentDocumentId = page.id;
        this.currentPageId = page.id;
        const app = options.app;
        if (!app) return;
        
        // Store references for update callback (will be set after DOM creation)
        let editTextareaRef = null;
        let splitEditTextareaRef = null;
        let previewContentRef = null;
        let splitPreviewContentRef = null;
        let updatePreviewRef = null;
        
        // Define update callback (will be enhanced after DOM elements are created)
        this._updateMarkdownDisplay = (markdown) => {
            if (!markdown) return;
            
            // Use stored references if available, otherwise query DOM
            const editTextarea = editTextareaRef || container.querySelector('.edit-textarea') || container.querySelector('.document-edit-textarea');
            const splitEditTextarea = splitEditTextareaRef || container.querySelector('.split-edit-textarea');
            const previewContent = previewContentRef || container.querySelector('.preview-content');
            const splitPreviewContent = splitPreviewContentRef || container.querySelector('.split-preview-content');
            
            if (editTextarea && editTextarea.value !== markdown) {
                editTextarea.value = markdown;
                if (editTextarea.updateLineNumbers) {
                    editTextarea.updateLineNumbers();
                }
            }
            
            if (splitEditTextarea && splitEditTextarea.value !== markdown) {
                splitEditTextarea.value = markdown;
                if (splitEditTextarea.updateLineNumbers) {
                    splitEditTextarea.updateLineNumbers();
                }
            }
            
            // Update previews if updatePreview function is available
            if (updatePreviewRef) {
                if (previewContent) {
                    updatePreviewRef(markdown, previewContent);
                }
                if (splitPreviewContent) {
                    updatePreviewRef(markdown, splitPreviewContent);
                }
            }
        };
        
        // Initialize ViewProjection if not already done (but don't call init() yet - wait for DOM)
        if (!this.viewProjection) {
            const appState = app.appState;
            if (appState) {
                // Create a custom ViewProjection that delegates project() to this format renderer
                const customProjection = new ViewProjection({
                    viewId: `document-view-${page.id}`,
                    pageId: page.id,
                    onUpdate: (projectedData) => {
                        // Update markdown display when projection updates
                        if (this._updateMarkdownDisplay) {
                            this._updateMarkdownDisplay(projectedData);
                        }
                    },
                    filterOperations: (operation) => {
                        return this.isOperationRelevant(operation);
                    }
                });
                
                // Override project() to call this format renderer's project method
                // Use arrow function to preserve 'this' context
                const formatRenderer = this;
                customProjection.project = (canonicalModel) => {
                    return formatRenderer.project(canonicalModel);
                };
                
                // Override applyOperation() to call this format renderer's applyOperation method
                customProjection.applyOperation = (operation) => {
                    return formatRenderer.applyOperation(operation);
                };
                
                this.viewProjection = customProjection;
                
                // Set up ViewProjection but don't initialize yet (wait for DOM)
                this.viewProjection.canonicalModel = appState;
                this.viewProjection.container = container;
                
                // Register with ViewManager (will initialize after DOM is ready)
                const viewManager = getService(SERVICES.VIEW_MANAGER);
                if (viewManager) {
                    viewManager.registerView(this.viewProjection, page.id);
                }
            }
        } else {
            // Update page ID if changed
            if (this.currentPageId !== page.id) {
                this.currentPageId = page.id;
                this.viewProjection.setPageId(page.id);
            }
            // Update container reference
            this.viewProjection.container = container;
        }
        
        // Only clear if not preserving format (allows seamless switching)
        if (!app._preservingFormat) {
            container.innerHTML = '';
        }
        
        // Apply Obsidian-like styling - flexible width to fill window
        container.style.cssText = `
            width: 100%;
            max-width: 100%;
            margin: 0;
            padding: var(--page-padding, 40px 20px);
            font-family: var(--page-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif);
            font-size: ${this.config.fontSize || 16}px;
            line-height: ${this.config.lineHeight || 1.3};
            color: var(--page-color, #dcddde);
            background: var(--page-bg, #1e1e1e);
            background-image: var(--page-texture, none);
            background-size: 100px 100px;
            box-shadow: var(--page-shadow, none);
            min-height: calc(100vh - 100px);
            box-sizing: border-box;
        `;
        
        // Create document wrapper with edit/preview split view
        const docWrapper = document.createElement('div');
        docWrapper.className = 'document-view';
        docWrapper.style.cssText = `
            width: 100%;
            max-width: 100%;
            background: var(--page-bg, #1e1e1e);
            background-image: var(--page-texture, none);
            color: var(--page-color, #dcddde);
            box-sizing: border-box;
        `;
        
        // Page title
        const title = document.createElement('h1');
        title.textContent = page.title || page.id;
        title.style.cssText = `
            font-size: var(--page-title-font-size, 2.5em);
            font-weight: 700;
            margin: 0 0 var(--page-title-margin-bottom, 0.5em) 0;
            padding-bottom: 0.3em;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            color: var(--page-title-color, #ffffff);
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
        
        // Authority toggle button
        const authorityBtn = document.createElement('button');
        authorityBtn.textContent = 'Markdown is source';
        authorityBtn.className = 'authority-toggle-btn';
        authorityBtn.title = 'Toggle: When enabled, markdown edits update the canonical model';
        authorityBtn.style.cssText = `
            padding: 6px 12px;
            background: #2a2a2a;
            color: #888;
            border: 1px solid #444;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            margin-left: auto;
        `;
        
        // Check current authority mode
        const authorityManager = getService(SERVICES.AUTHORITY_MANAGER);
        const viewId = this.viewProjection?.viewId;
        const isAuthoritative = authorityManager && viewId && 
            authorityManager.isAuthoritative(page.id, viewId, AUTHORITY_MODES.MARKDOWN_SOURCE);
        
        if (isAuthoritative) {
            authorityBtn.style.background = '#4a9eff';
            authorityBtn.style.color = '#fff';
            authorityBtn.style.borderColor = '#4a9eff';
        }
        
        authorityBtn.addEventListener('click', () => {
            if (authorityManager && viewId) {
                const currentMode = authorityManager.getAuthority(page.id, viewId);
                const newMode = currentMode === AUTHORITY_MODES.MARKDOWN_SOURCE
                    ? AUTHORITY_MODES.CANONICAL
                    : AUTHORITY_MODES.MARKDOWN_SOURCE;
                
                authorityManager.setAuthority(page.id, viewId, newMode);
                
                // Update button appearance
                if (newMode === AUTHORITY_MODES.MARKDOWN_SOURCE) {
                    authorityBtn.style.background = '#4a9eff';
                    authorityBtn.style.color = '#fff';
                    authorityBtn.style.borderColor = '#4a9eff';
                } else {
                    authorityBtn.style.background = '#2a2a2a';
                    authorityBtn.style.color = '#888';
                    authorityBtn.style.borderColor = '#444';
                }
            }
        });
        
        viewControls.appendChild(authorityBtn);
        
        // Store current view mode (restore from page metadata or default to split)
        const pageViewModeKey = `_documentViewMode_${page.id}`;
        let currentViewMode = page._documentViewMode || 'split';
        const setViewMode = (mode) => {
            currentViewMode = mode;
            // Persist view mode to page metadata
            if (app && app.appState) {
                const pages = this._getPages(app);
                const pageIndex = pages.findIndex(p => p.id === page.id);
                if (pageIndex !== -1) {
                    pages[pageIndex]._documentViewMode = mode;
                }
            }
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
        
        const groups = this._getGroups(page);
        if (!groups.length) {
            if (!app._preservingFormat) {
                const emptyMsg = document.createElement('p');
                emptyMsg.textContent = 'No content yet. Add groups and items to see them here.';
                emptyMsg.style.cssText = 'color: #888; font-style: italic;';
                docWrapper.appendChild(emptyMsg);
                container.appendChild(docWrapper);
            }
            // Reset format preservation flag
            app._preservingFormat = false;
            return;
        }
        
        // Store element references for interactive rendering
        const elementMap = new Map(); // Maps placeholder IDs to element data
        let elementPlaceholderIndex = 0;
        
        // Special element types that should be rendered interactively
        const interactiveElementTypes = ['timer', 'counter', 'tracker', 'rating', 'audio', 'image', 'time-log', 'calendar'];
        
        // Convert groups and items to markdown, then to HTML
        let markdown = '';
        
        groups.forEach((bin, binIndex) => {
            // Group as section header
            if (bin.title) {
                markdown += `## ${this.escapeMarkdown(bin.title)}\n\n`;
            } else {
                markdown += `## Group ${binIndex + 1}\n\n`;
            }
            
            // Items in group
            // NOTE: DocumentViewFormat converts items to markdown first, then renders as HTML.
            // Virtualization would need to happen at the markdown block level or HTML block level,
            // which is more complex. For now, all items are rendered. Future enhancement: 
            // implement block-level virtualization for large documents.
            const itemIndex = ItemHierarchy.buildItemIndex(bin.items || []);
            const items = this._getItems(bin);
            if (items.length > 0) {
                items.forEach((element, elIndex) => {
                    // For interactive items, use placeholder instead of markdown
                    if (interactiveElementTypes.includes(element.type)) {
                        const placeholderId = `__ELEMENT_${elementPlaceholderIndex}__`;
                        elementMap.set(placeholderId, {
                            element,
                            pageId: page.id,
                            binId: bin.id,
                            elementIndex: elIndex
                        });
                        markdown += `${placeholderId}\n\n`;
                        elementPlaceholderIndex++;
                    } else {
                        const elementMarkdown = this.elementToMarkdown(element, 0, itemIndex);
                        markdown += elementMarkdown;
                        // Only add extra newline if not last element and element doesn't already end with newlines
                        if (elIndex < items.length - 1 && !elementMarkdown.endsWith('\n\n')) {
                            markdown += '\n';
                        }
                    }
                });
            } else {
                markdown += '*No items*\n\n';
            }
        });
        
        // Helper function to create textarea with line numbers
        const createTextareaWithLineNumbers = (value, container) => {
            const wrapper = document.createElement('div');
            wrapper.style.cssText = `
                display: flex;
                width: 100%;
                max-width: 100%;
                position: relative;
                background: #1a1a1a;
                border: 1px solid #3a3a3a;
                border-radius: 4px;
                overflow: hidden;
                box-sizing: border-box;
            `;
            
            // Line numbers container
            const lineNumbers = document.createElement('div');
            lineNumbers.className = 'line-numbers';
            lineNumbers.style.cssText = `
                padding: 20px 10px 20px 20px;
                background: #1a1a1a;
                color: #666;
                font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
                font-size: 14px;
                line-height: 1.6;
                text-align: right;
                user-select: none;
                white-space: pre;
                min-width: 50px;
                border-right: 1px solid #3a3a3a;
                overflow: hidden;
            `;
            
            // Textarea
            const textarea = document.createElement('textarea');
            textarea.className = 'document-edit-textarea';
            textarea.value = value;
            textarea.style.cssText = `
                flex: 1;
                min-height: 600px;
                padding: 20px;
                background: #1a1a1a;
                color: #dcddde;
                border: none;
                outline: none;
                font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
                font-size: 14px;
                line-height: 1.6;
                resize: vertical;
                tab-size: 2;
            `;
            
            // Function to update line numbers
            const updateLineNumbers = () => {
                const lines = textarea.value.split('\n');
                const lineCount = lines.length;
                lineNumbers.textContent = Array.from({ length: lineCount }, (_, i) => i + 1).join('\n');
            };
            
            // Sync scrolling
            textarea.addEventListener('scroll', () => {
                lineNumbers.scrollTop = textarea.scrollTop;
            });
            
            // Update line numbers on input
            textarea.addEventListener('input', () => {
                performanceBudgetManager.measureOperation('TYPING', () => {
                    updateLineNumbers();
                }, { source: 'DocumentViewFormat-lineNumbers' });
            });
            
            // Store update function on textarea for external access
            textarea.updateLineNumbers = updateLineNumbers;
            
            // Initial line numbers
            updateLineNumbers();
            
            wrapper.appendChild(lineNumbers);
            wrapper.appendChild(textarea);
            container.appendChild(wrapper);
            
            return textarea;
        };
        
        // Create edit container (raw markdown textarea)
        const editContainer = document.createElement('div');
        editContainer.className = 'document-edit-container';
        editContainer.style.cssText = `
            display: none;
            width: 100%;
            max-width: 100%;
            box-sizing: border-box;
        `;
        
        const editTextarea = createTextareaWithLineNumbers(markdown, editContainer);
        editTextareaRef = editTextarea; // Store reference for update callback
        
        // Create preview container (rendered HTML)
        const previewContainer = document.createElement('div');
        previewContainer.className = 'document-preview-container';
        previewContainer.style.cssText = `
            display: none;
            width: 100%;
            max-width: 100%;
            box-sizing: border-box;
        `;
        
        const previewContent = document.createElement('div');
        previewContent.className = 'document-content';
        previewContent.style.cssText = `
            color: #dcddde;
        `;
        previewContainer.appendChild(previewContent);
        previewContentRef = previewContent; // Store reference
        
        // Create split container (both edit and preview side by side)
        const splitContainer = document.createElement('div');
        splitContainer.className = 'document-split-container';
        splitContainer.style.cssText = `
            display: flex;
            gap: 20px;
            width: 100%;
            max-width: 100%;
            box-sizing: border-box;
        `;
        
        const splitEdit = document.createElement('div');
        splitEdit.className = 'document-split-edit';
        splitEdit.style.cssText = `
            flex: 1;
            min-width: 0;
        `;
        
        const splitEditTextarea = createTextareaWithLineNumbers(markdown, splitEdit);
        splitEditTextareaRef = splitEditTextarea; // Store reference
        
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
        splitPreviewContentRef = splitPreviewContent; // Store reference
        
        splitContainer.appendChild(splitEdit);
        splitContainer.appendChild(splitPreview);
        
        // Function to render interactive items
        const renderInteractiveElement = (elementData) => {
            const { element, pageId, binId, elementIndex } = elementData;
            const elementDiv = document.createElement('div');
            elementDiv.className = 'element document-view-element';
            elementDiv.style.margin = '10px 0';
            elementDiv.style.padding = '10px';
            elementDiv.style.border = '1px solid rgba(255, 255, 255, 0.1)';
            elementDiv.style.borderRadius = '4px';
            
            // Use the same renderers as the default view
            if (app.elementRenderer && app.elementRenderer.typeRegistry) {
                const renderer = app.elementRenderer.typeRegistry.getRenderer(element.type);
                if (renderer && renderer.render) {
                    // Create a temporary container for the renderer
                    const tempDiv = document.createElement('div');
                    tempDiv.className = 'element ' + element.type;
                    if (element.completed) tempDiv.classList.add('completed');
                    
                    // Apply visual settings
                    if (app.visualSettingsManager) {
                        const elementId = `${pageId}-${binId}-${elementIndex}`;
                        const page = app.appState?.documents?.find(p => p.id === pageId);
                        const viewFormat = page?.format || 'default';
                        app.visualSettingsManager.applyVisualSettings(tempDiv, 'element', elementId, pageId, viewFormat);
                    }
                    
                    // Render the element
                    renderer.render(tempDiv, pageId, binId, element, elementIndex, 0, () => null);
                    
                    // Move content to our container
                    while (tempDiv.firstChild) {
                        elementDiv.appendChild(tempDiv.firstChild);
                    }
                } else {
                    // Fallback: render as text
                    elementDiv.textContent = element.text || element.type;
                }
            } else {
                // Fallback: render as text
                elementDiv.textContent = element.text || element.type;
            }
            
            return elementDiv;
        };
        
        // Function to update preview from markdown
        const updatePreview = (markdownText, targetElement, isEditable = false) => {
            updatePreviewRef = updatePreview; // Store reference for update callback
            let html = this.markdownToHTML(markdownText);
            
            // Replace element placeholders with interactive components
            elementMap.forEach((elementData, placeholderId) => {
                const placeholderRegex = new RegExp(placeholderId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
                if (html.includes(placeholderId)) {
                    const interactiveElement = renderInteractiveElement(elementData);
                    const tempDiv = document.createElement('div');
                    tempDiv.appendChild(interactiveElement);
                    const elementHtml = tempDiv.innerHTML;
                    html = html.replace(placeholderRegex, elementHtml);
                }
            });
            
            targetElement.innerHTML = html;
            
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
                    performanceBudgetManager.measureOperation('TYPING', () => {
                        clearTimeout(syncTimeout);
                        syncTimeout = setTimeout(() => {
                            // Convert HTML back to markdown
                            const html = targetElement.innerHTML;
                            const markdownFromHtml = this.htmlToMarkdown(html);
                            // Update textareas
                            editTextarea.value = markdownFromHtml;
                            if (editTextarea.updateLineNumbers) editTextarea.updateLineNumbers();
                            splitEditTextarea.value = markdownFromHtml;
                            if (splitEditTextarea.updateLineNumbers) splitEditTextarea.updateLineNumbers();
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
                    }, { source: 'DocumentViewFormat-contentEditable' });
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
                            if (editTextarea.updateLineNumbers) editTextarea.updateLineNumbers();
                            splitEditTextarea.value = newMarkdown;
                            if (splitEditTextarea.updateLineNumbers) splitEditTextarea.updateLineNumbers();
                            updatePreview(newMarkdown, previewContent, true);
                            updatePreview(newMarkdown, splitPreviewContent, true);
                            
                            // Find and update the actual element in page data
                            if (app && app.appState) {
                                const pages = this._getPages(app);
                                const currentPage = pages.find(p => p.id === page.id);
                                const groups = currentPage ? this._getGroups(currentPage) : [];
                                if (groups.length) {
                                    for (const bin of groups) {
                                        const items = this._getItems(bin);
                                        const elementIndex = items.findIndex(el => {
                                            // Try to match element by text
                                            const elText = el.text || '';
                                            return elText.trim() === taskText.trim();
                                        });
                                        if (elementIndex !== -1) {
                                            const element = items[elementIndex];
                                            // Convert to note type (text-only, no checkbox)
                                            element.type = 'note';
                                            element.text = taskText.trim();
                                            delete element.completed; // Remove checkbox property
                                            // Save changes
                                            if (app.dataManager) {
                                                await app.dataManager.saveData();
                                            }
                                            // Re-render to show changes
                                            // Preserve format AND view mode
                                            app._preservingFormat = true;
                                            // Store current view mode before render
                                            const savedViewMode = currentViewMode;
                                            app.render();
                                            // Restore view mode after render (will be handled by setViewMode on next render)
                                            if (app.appState) {
                                                const pages = this._getPages(app);
                                                const pageIndex = pages.findIndex(p => p.id === page.id);
                                                if (pageIndex !== -1) {
                                                    pages[pageIndex]._documentViewMode = savedViewMode;
                                                }
                                            }
                                            break;
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
                            if (editTextarea.updateLineNumbers) editTextarea.updateLineNumbers();
                            splitEditTextarea.value = newMarkdown;
                            if (splitEditTextarea.updateLineNumbers) splitEditTextarea.updateLineNumbers();
                            updatePreview(newMarkdown, previewContent, true);
                            updatePreview(newMarkdown, splitPreviewContent, true);
                            
                            // Update task item data
                            taskItem.dataset.originalLine = newLine;
                            
                            // Find and update the actual element in page data
                            if (app && app.appState) {
                                const pages = this._getPages(app);
                                const currentPage = pages.find(p => p.id === page.id);
                                const groups = currentPage ? this._getGroups(currentPage) : [];
                                if (groups.length) {
                                    // Extract task text to find the element
                                    const taskTextMatch = originalLine.match(/^[\s-]*\[[x ]\]\s*(.*)$/);
                                    const taskText = taskTextMatch ? taskTextMatch[1] : originalLine.replace(/^[\s-]*\[[x ]\]\s*/, '');
                                    
                                    for (const bin of groups) {
                                        const items = this._getItems(bin);
                                        const elementIndex = items.findIndex(el => {
                                                // Try to match element by text
                                                const elText = el.text || '';
                                                return elText.trim() === taskText.trim();
                                        });
                                        if (elementIndex !== -1) {
                                            const element = items[elementIndex];
                                            // Update completed status
                                            element.completed = isChecked;
                                            // Ensure it's a task type (not note)
                                            if (element.type === 'note') {
                                                element.type = 'task';
                                            }
                                            // Save changes
                                            if (app.dataManager) {
                                                await app.dataManager.saveData();
                                            }
                                            // Re-render to show changes in other views
                                            // Preserve format AND view mode
                                            app._preservingFormat = true;
                                            // Store current view mode before render
                                            const savedViewMode = currentViewMode;
                                            app.render();
                                            // Restore view mode after render (will be handled by setViewMode on next render)
                                            if (app.appState) {
                                                const pages = this._getPages(app);
                                                const pageIndex = pages.findIndex(p => p.id === page.id);
                                                if (pageIndex !== -1) {
                                                    pages[pageIndex]._documentViewMode = savedViewMode;
                                                }
                                            }
                                            break;
                                        }
                                    }
                                }
                            }
                            
                            // Save to page data
                            saveMarkdownToPage(newMarkdown);
                        }
                    }
                });
            });
        };
        
        // Function to save markdown back to page data
        // Phase 5: When markdown is authoritative, parse diff and generate operations
        const saveMarkdownToPage = async (markdownText) => {
            const authorityManager = getService(SERVICES.AUTHORITY_MANAGER);
            const semanticOpManager = getService(SERVICES.SEMANTIC_OPERATION_MANAGER);
            const viewId = this.viewProjection?.viewId;
            
            const isAuthoritative = authorityManager && viewId && 
                authorityManager.isAuthoritative(page.id, viewId, AUTHORITY_MODES.MARKDOWN_SOURCE);
            
            if (isAuthoritative && semanticOpManager) {
                // Markdown is authoritative - parse diff and generate operations
                const oldMarkdown = this._markdownCache || '';
                
                if (oldMarkdown !== markdownText) {
                    try {
                        // Parse diff and generate operations
                        const operations = markdownDiffParser.parseDiff(oldMarkdown, markdownText, page.id);
                        
                        // Prevent circular updates
                        authorityManager.preventCircularUpdate(page.id, viewId, 'markdown');
                        
                        // Apply operations
                        for (const op of operations) {
                            const operation = semanticOpManager.createOperation(
                                op.op,
                                op.itemId,
                                op.params
                            );
                            
                            if (operation) {
                                const result = semanticOpManager.applyOperation(operation);
                                if (result && result.success) {
                                    // Record for undo/redo
                                    const undoRedoManager = getService(SERVICES.UNDO_REDO_MANAGER);
                                    if (undoRedoManager) {
                                        undoRedoManager.recordOperation(operation);
                                    }
                                }
                            }
                        }
                        
                        // Update cache
                        this._markdownCache = markdownText;
                        
                        // Save data
                        if (app.dataManager) {
                            await app.dataManager.saveData();
                        }
                    } catch (error) {
                        console.error('[DocumentViewFormat] Error parsing markdown diff:', error);
                        // Fallback to metadata storage
                        this._saveMarkdownMetadata(markdownText, app);
                    }
                }
            } else {
                // Not authoritative - store as metadata only
                this._saveMarkdownMetadata(markdownText, app);
            }
        };
        
        // Helper function to save markdown as metadata
        this._saveMarkdownMetadata = async (markdownText, app) => {
            if (app.appState) {
                const pages = this._getPages(app);
                const pageIndex = pages.findIndex(p => p.id === page.id);
                if (pageIndex !== -1) {
                    if (!pages[pageIndex]._documentMarkdown) {
                        pages[pageIndex]._documentMarkdown = {};
                    }
                    pages[pageIndex]._documentMarkdown.raw = markdownText;
                    pages[pageIndex]._documentMarkdown.lastModified = Date.now();
                    // Trigger save (metadata only)
                    if (app.dataManager) {
                        await app.dataManager.saveData();
                    }
                }
            }
        };
        
        // Note: _updateMarkdownDisplay is now defined at the start of renderPage
        
        // Sync edit textarea changes to split edit textarea and update previews
        const syncEditChanges = (source, target) => {
            const markdownText = source.value;
            if (target && target.value !== markdownText) {
                target.value = markdownText;
                // Update line numbers for target if it has the function
                if (target.updateLineNumbers) {
                    target.updateLineNumbers();
                }
            }
            // Update line numbers for source if it has the function
            if (source.updateLineNumbers) {
                source.updateLineNumbers();
            }
            updatePreview(markdownText, previewContent);
            updatePreview(markdownText, splitPreviewContent);
            
            // Debounce save
            clearTimeout(syncEditChanges._saveTimeout);
            syncEditChanges._saveTimeout = setTimeout(() => {
                saveMarkdownToPage(markdownText);
            }, 1000);
        };
        
        editTextarea.addEventListener('input', () => {
            performanceBudgetManager.measureOperation('TYPING', () => {
                syncEditChanges(editTextarea, splitEditTextarea);
            }, { source: 'DocumentViewFormat-editTextarea' });
        });
        splitEditTextarea.addEventListener('input', () => {
            performanceBudgetManager.measureOperation('TYPING', () => {
                syncEditChanges(splitEditTextarea, editTextarea);
            }, { source: 'DocumentViewFormat-splitEditTextarea' });
        });
        
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
        
        // Now that DOM is ready, initialize ViewProjection if it exists
        try {
            if (this.viewProjection && !this.viewProjection.isActive) {
                this.viewProjection.isActive = true;
                this.viewProjection._subscribeToOperations();
                // Don't call update() here - let the normal render flow handle initial display
            }
        } catch (initError) {
            console.error('[DocumentViewFormat] Error initializing ViewProjection:', initError);
            // Continue with normal rendering even if ViewProjection initialization fails
        }
        
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


// String Utilities - String manipulation and parsing
export const StringUtils = {
    /**
     * Escape HTML special characters
     * @param {string} text - Text to escape
     * @returns {string}
     */
    escapeHtml(text) {
        if (typeof text !== 'string') return text;
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },
    
    /**
     * Unescape HTML entities
     * @param {string} html - HTML to unescape
     * @returns {string}
     */
    unescapeHtml(html) {
        if (typeof html !== 'string') return html;
        const div = document.createElement('div');
        div.innerHTML = html;
        return div.textContent || div.innerText || '';
    },
    
    /**
     * Capitalize first letter
     * @param {string} str - String to capitalize
     * @returns {string}
     */
    capitalize(str) {
        if (!str) return str;
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    },
    
    /**
     * Convert to camelCase
     * @param {string} str - String to convert
     * @returns {string}
     */
    camelCase(str) {
        return str.replace(/-([a-z])/g, (g) => g[1].toUpperCase())
                  .replace(/^[A-Z]/, (g) => g.toLowerCase());
    },
    
    /**
     * Convert to kebab-case
     * @param {string} str - String to convert
     * @returns {string}
     */
    kebabCase(str) {
        return str.replace(/([a-z])([A-Z])/g, '$1-$2')
                  .replace(/[\s_]+/g, '-')
                  .toLowerCase();
    },
    
    /**
     * Convert to snake_case
     * @param {string} str - String to convert
     * @returns {string}
     */
    snakeCase(str) {
        return str.replace(/([a-z])([A-Z])/g, '$1_$2')
                  .replace(/[\s-]+/g, '_')
                  .toLowerCase();
    },
    
    /**
     * Truncate string with ellipsis
     * @param {string} str - String to truncate
     * @param {number} length - Maximum length
     * @param {string} suffix - Suffix (default: '...')
     * @returns {string}
     */
    truncate(str, length, suffix = '...') {
        if (!str || str.length <= length) return str;
        return str.slice(0, length) + suffix;
    },
    
    /**
     * Strip HTML tags
     * @param {string} html - HTML string
     * @returns {string}
     */
    stripHtml(html) {
        if (typeof html !== 'string') return html;
        const div = document.createElement('div');
        div.innerHTML = html;
        return div.textContent || div.innerText || '';
    },
    
    /**
     * Detect and extract URLs from text
     * @param {string} text - Text to search
     * @returns {Array<Object>} - Array of { url, index, length }
     */
    detectUrls(text) {
        if (typeof text !== 'string') return [];
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const urls = [];
        let match;
        
        while ((match = urlRegex.exec(text)) !== null) {
            urls.push({
                url: match[0],
                index: match.index,
                length: match[0].length
            });
        }
        
        return urls;
    },
    
    /**
     * Convert URLs in text to links
     * @param {string} text - Text to convert
     * @returns {string} - HTML with links
     */
    linkify(text) {
        if (typeof text !== 'string') return text;
        const urls = this.detectUrls(text);
        if (urls.length === 0) return this.escapeHtml(text);
        
        let result = '';
        let lastIndex = 0;
        
        urls.forEach(({ url, index, length }) => {
            result += this.escapeHtml(text.slice(lastIndex, index));
            result += `<a href="${this.escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${this.escapeHtml(url)}</a>`;
            lastIndex = index + length;
        });
        
        result += this.escapeHtml(text.slice(lastIndex));
        return result;
    },
    
    /**
     * Parse text and make URLs clickable (returns DocumentFragment)
     * @param {string} text - Text to parse
     * @returns {DocumentFragment} Fragment containing text nodes and link elements
     */
    parseLinks(text) {
        if (!text || typeof text !== 'string') return document.createDocumentFragment();
        
        try {
            // Check if text contains HTML tags (simple check for opening tags)
            const hasHtml = /<[a-z][a-z0-9]*[^>]*>/i.test(text);
            
            if (hasHtml) {
                // Text contains HTML - render it directly
                // Use a safer approach: create a container, set innerHTML, then extract children
                const tempDiv = document.createElement('div');
                // Sanitize: only allow safe HTML tags
                const allowedTags = /<\/?(strong|em|code|a|b|i|u|span|div|p|br)[^>]*>/gi;
                if (allowedTags.test(text) || text.match(/<[a-z][a-z0-9]*[^>]*>/i)) {
                    tempDiv.innerHTML = text;
                } else {
                    // If it looks like HTML but doesn't match allowed tags, escape it
                    tempDiv.textContent = text;
                }
                
                const fragment = document.createDocumentFragment();
                
                // Move all children to fragment
                while (tempDiv.firstChild) {
                    fragment.appendChild(tempDiv.firstChild);
                }
                
                // Style any existing links
                fragment.querySelectorAll('a').forEach(link => {
                    link.target = '_blank';
                    link.rel = 'noopener noreferrer';
                    if (!link.style.color) {
                        link.style.color = '#4a9eff';
                    }
                    if (!link.style.textDecoration) {
                        link.style.textDecoration = 'underline';
                    }
                    link.onclick = (e) => e.stopPropagation();
                });
                
                return fragment;
            } else {
            // No HTML - use original link parsing logic
            const urlPattern = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9-]+\.[a-zA-Z]{2,}[^\s]*)/g;
            const parts = text.split(urlPattern);
            const fragment = document.createDocumentFragment();
            
            parts.forEach((part) => {
                if (urlPattern.test(part)) {
                    // This is a URL
                    let href = part;
                    if (!href.startsWith('http://') && !href.startsWith('https://')) {
                        href = 'https://' + href;
                    }
                    const link = document.createElement('a');
                    link.href = href;
                    link.textContent = part;
                    link.target = '_blank';
                    link.rel = 'noopener noreferrer';
                    link.style.color = '#4a9eff';
                    link.style.textDecoration = 'underline';
                    link.onclick = (e) => e.stopPropagation(); // Prevent element click when clicking link
                    fragment.appendChild(link);
                } else if (part) {
                    // Regular text
                    const textNode = document.createTextNode(part);
                    fragment.appendChild(textNode);
                }
            });
            
            return fragment;
            }
        } catch (error) {
            console.error('Error parsing links:', error);
            // Fallback: return text as plain text node
            const fragment = document.createDocumentFragment();
            fragment.appendChild(document.createTextNode(text));
            return fragment;
        }
    },
    
    /**
     * Parse markdown-like syntax (basic)
     * @param {string} text - Text to parse
     * @returns {string} - HTML
     */
    parseMarkdown(text) {
        if (typeof text !== 'string') return text;
        
        // Bold: **text** or __text__
        text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        text = text.replace(/__(.+?)__/g, '<strong>$1</strong>');
        
        // Italic: *text* or _text_
        text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
        text = text.replace(/_(.+?)_/g, '<em>$1</em>');
        
        // Code: `code`
        text = text.replace(/`(.+?)`/g, '<code>$1</code>');
        
        // Links: [text](url)
        text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
        
        return text;
    },
    
    /**
     * Generate unique ID
     * @param {string} prefix - ID prefix
     * @returns {string}
     */
    generateId(prefix = 'id') {
        return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    },
    
    /**
     * Slugify string (for URLs, IDs, etc.)
     * @param {string} str - String to slugify
     * @returns {string}
     */
    slugify(str) {
        if (typeof str !== 'string') return '';
        return str.toLowerCase()
                  .trim()
                  .replace(/[^\w\s-]/g, '')
                  .replace(/[\s_-]+/g, '-')
                  .replace(/^-+|-+$/g, '');
    },
    
    /**
     * Pad string to specified length
     * @param {string} str - String to pad
     * @param {number} length - Target length
     * @param {string} padString - Padding string
     * @param {string} side - 'left' or 'right'
     * @returns {string}
     */
    pad(str, length, padString = ' ', side = 'right') {
        if (typeof str !== 'string') str = String(str);
        const pad = padString.repeat(Math.max(0, length - str.length));
        return side === 'left' ? pad + str : str + pad;
    },
    
    /**
     * Remove whitespace from string
     * @param {string} str - String to trim
     * @returns {string}
     */
    trim(str) {
        return typeof str === 'string' ? str.trim() : str;
    },
    
    /**
     * Replace all occurrences
     * @param {string} str - String to replace in
     * @param {string|RegExp} search - Search string or regex
     * @param {string} replace - Replacement string
     * @returns {string}
     */
    replaceAll(str, search, replace) {
        if (typeof str !== 'string') return str;
        if (search instanceof RegExp) {
            return str.replace(search, replace);
        }
        return str.split(search).join(replace);
    }
};


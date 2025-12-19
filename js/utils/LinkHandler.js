// LinkHandler.js - Unified link handling system for external URLs and internal references
import { eventBus } from '../core/EventBus.js';
import { EVENTS } from '../core/AppEvents.js';
import { NavigationHelper } from './NavigationHelper.js';

export class LinkHandler {
    constructor(app) {
        this.app = app;
    }
    
    /**
     * Parse text and create links (external URLs and internal references)
     * @param {string} text - Text to parse
     * @param {Object} context - Context (pageId, binId, elementIndex)
     * @returns {DocumentFragment} Fragment containing text nodes and link elements
     */
    parseLinks(text, context = {}) {
        if (!text || typeof text !== 'string') {
            return document.createDocumentFragment();
        }
        
        const fragment = document.createDocumentFragment();
        
        // Pattern for internal references: [[page-name]], [[element-id]], [[bin-name]]
        // Also supports: [[page-name|display text]], [[element-id|display text]]
        const internalRefPattern = /\[\[([^\]]+)\]\]/g;
        
        // Pattern for markdown links: [text](url)
        const markdownLinkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
        
        // Pattern for URLs: http://, https://, www., or domain.com
        const urlPattern = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9-]+\.[a-zA-Z]{2,}[^\s]*)/g;
        
        // First, handle markdown links and internal references (they have priority)
        let processedText = text;
        const linkMatches = [];
        
        // Collect all link matches with their positions
        let match;
        
        // Markdown links
        while ((match = markdownLinkPattern.exec(text)) !== null) {
            linkMatches.push({
                type: 'markdown',
                start: match.index,
                end: match.index + match[0].length,
                text: match[1],
                url: match[2],
                fullMatch: match[0]
            });
        }
        
        // Internal references
        while ((match = internalRefPattern.exec(text)) !== null) {
            const refText = match[1];
            const parts = refText.split('|');
            const ref = parts[0].trim();
            const displayText = parts[1] ? parts[1].trim() : ref;
            
            linkMatches.push({
                type: 'internal',
                start: match.index,
                end: match.index + match[0].length,
                ref: ref,
                displayText: displayText,
                fullMatch: match[0]
            });
        }
        
        // Sort matches by position
        linkMatches.sort((a, b) => a.start - b.start);
        
        // Build fragment by processing text segments
        let lastIndex = 0;
        
        linkMatches.forEach(linkMatch => {
            // Add text before link
            if (linkMatch.start > lastIndex) {
                const beforeText = text.substring(lastIndex, linkMatch.start);
                this._addTextWithUrls(fragment, beforeText);
            }
            
            // Add link
            if (linkMatch.type === 'markdown') {
                const link = this._createExternalLink(linkMatch.url, linkMatch.text);
                fragment.appendChild(link);
            } else if (linkMatch.type === 'internal') {
                const link = this._createInternalLink(linkMatch.ref, linkMatch.displayText, context);
                fragment.appendChild(link);
            }
            
            lastIndex = linkMatch.end;
        });
        
        // Add remaining text
        if (lastIndex < text.length) {
            const remainingText = text.substring(lastIndex);
            this._addTextWithUrls(fragment, remainingText);
        }
        
        // Process markdown formatting (bold, italic, code, strikethrough)
        this._processMarkdownFormatting(fragment);
        
        return fragment;
    }
    
    /**
     * Add text with URL detection (for text outside of markdown/internal links)
     * @param {DocumentFragment} fragment - Fragment to add to
     * @param {string} text - Text to process
     */
    _addTextWithUrls(fragment, text) {
        if (!text) return;
        
        const urlPattern = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9-]+\.[a-zA-Z]{2,}[^\s]*)/g;
        const parts = text.split(urlPattern);
        
        parts.forEach(part => {
            if (urlPattern.test(part)) {
                // This is a URL
                let href = part;
                if (!href.startsWith('http://') && !href.startsWith('https://')) {
                    href = 'https://' + href;
                }
                const link = this._createExternalLink(href, part);
                fragment.appendChild(link);
            } else if (part) {
                // Regular text
                const textNode = document.createTextNode(part);
                fragment.appendChild(textNode);
            }
        });
    }
    
    /**
     * Process markdown formatting in fragment (bold, italic, code, strikethrough)
     * @param {DocumentFragment} fragment - Fragment to process
     */
    _processMarkdownFormatting(fragment) {
        // Convert fragment to string, process, then rebuild
        const tempDiv = document.createElement('div');
        tempDiv.appendChild(fragment.cloneNode(true));
        
        let html = tempDiv.innerHTML;
        
        // Process markdown (order matters)
        // Code (before bold/italic to avoid conflicts)
        html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
        // Bold
        html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        // Italic (but not if it's part of bold)
        html = html.replace(/(?<!\*)\*([^*]+?)\*(?!\*)/g, '<em>$1</em>');
        // Strikethrough
        html = html.replace(/~~([^~]+)~~/g, '<del>$1</del>');
        
        // Rebuild fragment
        tempDiv.innerHTML = html;
        // Clear fragment properly (DocumentFragments don't have innerHTML)
        while (fragment.firstChild) {
            fragment.removeChild(fragment.firstChild);
        }
        while (tempDiv.firstChild) {
            fragment.appendChild(tempDiv.firstChild);
        }
    }
    
    /**
     * Create external link element
     * @param {string} href - URL
     * @param {string} text - Link text
     * @returns {HTMLElement} Link element
     */
    _createExternalLink(href, text) {
        const link = document.createElement('a');
        link.href = href;
        link.textContent = text;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.style.color = '#4a9eff';
        link.style.textDecoration = 'underline';
        link.className = 'external-link';
        link.onclick = (e) => {
            e.stopPropagation();
            // Allow default navigation to external URLs
        };
        return link;
    }
    
    /**
     * Create internal link element (to page, element, or bin)
     * @param {string} ref - Reference (page name, element ID, bin name)
     * @param {string} displayText - Display text
     * @param {Object} context - Context (pageId, binId, elementIndex)
     * @returns {HTMLElement} Link element
     */
    _createInternalLink(ref, displayText, context) {
        const link = document.createElement('a');
        link.textContent = displayText;
        link.href = '#';
        link.className = 'internal-link';
        link.style.color = '#4a9eff';
        link.style.textDecoration = 'underline';
        link.style.cursor = 'pointer';
        link.dataset.internalRef = ref;
        
        link.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.navigateToReference(ref, context);
        };
        
        return link;
    }
    
    /**
     * Navigate to an internal reference (page, element, or bin)
     * @param {string} ref - Reference string
     * @param {Object} context - Current context
     */
    navigateToReference(ref, context = {}) {
        if (!this.app) return;
        
        const pages = this.app.appState?.pages || this.app.pages || [];
        
        // Try to find by page title/ID
        let targetPage = pages.find(p => 
            p.id === ref || 
            p.title?.toLowerCase() === ref.toLowerCase() ||
            p.title?.toLowerCase().replace(/\s+/g, '-') === ref.toLowerCase()
        );
        
        if (targetPage) {
            // Navigate to page
            this.app.appState.currentPageId = targetPage.id;
            eventBus.emit(EVENTS.PAGE.SWITCHED, { pageId: targetPage.id });
            eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
            
            // Scroll to top
            setTimeout(() => {
                const container = document.getElementById('bins-container');
                if (container) {
                    container.scrollTop = 0;
                }
            }, 100);
            return;
        }
        
        // Try to find by element ID or text
        for (const page of pages) {
            if (!page.bins) continue;
            
            for (const bin of page.bins) {
                if (!bin.elements) continue;
                
                for (let i = 0; i < bin.elements.length; i++) {
                    const element = bin.elements[i];
                    
                    // Check element ID (if it exists)
                    if (element.id === ref) {
                        this._navigateToElement(page.id, bin.id, i);
                        return;
                    }
                    
                    // Check element text
                    if (element.text && element.text.toLowerCase().includes(ref.toLowerCase())) {
                        this._navigateToElement(page.id, bin.id, i);
                        return;
                    }
                }
                
                // Check bin title
                if (bin.title && bin.title.toLowerCase() === ref.toLowerCase()) {
                    this.app.appState.currentPageId = page.id;
                    eventBus.emit(EVENTS.PAGE.SWITCHED, { pageId: page.id });
                    eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
                    
                    // Scroll to bin
                    setTimeout(() => {
                        const binElement = document.querySelector(`[data-bin-id="${bin.id}"]`);
                        if (binElement) {
                            binElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            binElement.style.background = 'rgba(74, 158, 255, 0.2)';
                            setTimeout(() => {
                                binElement.style.background = '';
                            }, 2000);
                        }
                    }, 100);
                    return;
                }
            }
        }
        
        // Not found - show message or create new page?
        console.warn(`[LinkHandler] Reference not found: ${ref}`);
    }
    
    /**
     * Navigate to a specific element
     * @param {string} pageId - Page ID
     * @param {string} binId - Bin ID
     * @param {number} elementIndex - Element index
     */
    _navigateToElement(pageId, binId, elementIndex) {
        NavigationHelper.navigateToElement(pageId, binId, elementIndex, this.app);
    }
}


// MarkdownDiffParser.js - Parse markdown changes and generate semantic operations
// Used for Phase 5: Representation Authority

import { getService, SERVICES } from '../core/AppServices.js';
import { ItemHierarchy } from './ItemHierarchy.js';

/**
 * MarkdownDiffParser - Parses markdown diffs and generates semantic operations
 * 
 * Algorithm:
 * 1. Tokenize both old and new markdown
 * 2. Match elements by structure and content
 * 3. Identify changes and generate operations
 */
export class MarkdownDiffParser {
    /**
     * Parse markdown diff and generate operations
     * @param {string} oldMarkdown - Old markdown text
     * @param {string} newMarkdown - New markdown text
     * @param {string} pageId - Page ID
     * @returns {Array} Array of operation objects
     */
    parseDiff(oldMarkdown, newMarkdown, pageId) {
        if (!pageId) {
            console.error('[MarkdownDiffParser] pageId is required');
            return [];
        }
        
        // Get current page structure
        const appState = getService(SERVICES.APP_STATE);
        if (!appState || !appState.documents) {
            console.error('[MarkdownDiffParser] AppState not available');
            return [];
        }
        
        const page = appState.documents.find(p => p.id === pageId);
        if (!page) {
            console.error('[MarkdownDiffParser] Page not found:', pageId);
            return [];
        }
        
        // Tokenize both markdowns
        const oldTokens = this._tokenizeMarkdown(oldMarkdown);
        const newTokens = this._tokenizeMarkdown(newMarkdown);
        
        // Match elements
        const matches = this._matchElements(oldTokens, newTokens, page);
        
        // Generate operations
        const operations = this._generateOperations(matches, page);
        
        return operations;
    }
    
    /**
     * Tokenize markdown into elements
     * @private
     * @param {string} markdown - Markdown text
     * @returns {Array} Array of token objects
     */
    _tokenizeMarkdown(markdown) {
        if (!markdown) {
            return [];
        }
        
        const tokens = [];
        const lines = markdown.split('\n');
        let currentToken = null;
        let codeBlock = null;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmed = line.trim();
            
            // Handle code blocks
            if (trimmed.startsWith('```')) {
                if (codeBlock) {
                    // End of code block
                    codeBlock.content += '\n' + line;
                    tokens.push(codeBlock);
                    codeBlock = null;
                } else {
                    // Start of code block
                    const language = trimmed.slice(3).trim() || 'text';
                    codeBlock = {
                        type: 'code',
                        language,
                        content: line + '\n',
                        line: i,
                        indent: line.length - line.trimStart().length
                    };
                }
                continue;
            }
            
            if (codeBlock) {
                codeBlock.content += '\n' + line;
                continue;
            }
            
            // Handle headings
            const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
            if (headingMatch) {
                if (currentToken) {
                    tokens.push(currentToken);
                }
                currentToken = {
                    type: 'heading',
                    level: headingMatch[1].length,
                    text: headingMatch[2],
                    line: i,
                    indent: line.length - line.trimStart().length
                };
                tokens.push(currentToken);
                currentToken = null;
                continue;
            }
            
            // Handle task items
            const taskMatch = trimmed.match(/^-\s+\[([ x])\]\s+(.+)$/);
            if (taskMatch) {
                if (currentToken) {
                    tokens.push(currentToken);
                }
                currentToken = {
                    type: 'task',
                    completed: taskMatch[1] === 'x',
                    text: taskMatch[2],
                    line: i,
                    indent: line.length - line.trimStart().length
                };
                tokens.push(currentToken);
                currentToken = null;
                continue;
            }
            
            // Handle list items
            if (trimmed.match(/^[-*+]\s+/)) {
                if (currentToken) {
                    tokens.push(currentToken);
                }
                currentToken = {
                    type: 'list',
                    text: trimmed.replace(/^[-*+]\s+/, ''),
                    line: i,
                    indent: line.length - line.trimStart().length
                };
                tokens.push(currentToken);
                currentToken = null;
                continue;
            }
            
            // Handle regular text
            if (trimmed) {
                if (currentToken && currentToken.type === 'text') {
                    currentToken.text += '\n' + trimmed;
                } else {
                    if (currentToken) {
                        tokens.push(currentToken);
                    }
                    currentToken = {
                        type: 'text',
                        text: trimmed,
                        line: i,
                        indent: line.length - line.trimStart().length
                    };
                }
            } else {
                // Empty line - end current token
                if (currentToken) {
                    tokens.push(currentToken);
                    currentToken = null;
                }
            }
        }
        
        if (currentToken) {
            tokens.push(currentToken);
        }
        
        return tokens;
    }
    
    /**
     * Match elements between old and new tokens
     * @private
     * @param {Array} oldTokens - Old tokens
     * @param {Array} newTokens - New tokens
     * @param {Object} page - Page object
     * @returns {Array} Array of match objects
     */
    _matchElements(oldTokens, newTokens, page) {
        const matches = [];
        
        // Build a map of existing items by their markdown representation
        const existingItems = this._buildItemMap(page);
        
        // Match tokens to items
        let oldIndex = 0;
        let newIndex = 0;
        
        while (oldIndex < oldTokens.length || newIndex < newTokens.length) {
            const oldToken = oldTokens[oldIndex];
            const newToken = newTokens[newIndex];
            
            if (!oldToken) {
                // New token - create operation
                matches.push({
                    type: 'create',
                    token: newToken,
                    item: null
                });
                newIndex++;
                continue;
            }
            
            if (!newToken) {
                // Deleted token - delete operation
                const item = this._findItemForToken(oldToken, existingItems);
                matches.push({
                    type: 'delete',
                    token: oldToken,
                    item
                });
                oldIndex++;
                continue;
            }
            
            // Try to match by content similarity
            const similarity = this._calculateSimilarity(oldToken, newToken);
            
            if (similarity > 0.7) {
                // Likely the same element
                const item = this._findItemForToken(oldToken, existingItems);
                if (item) {
                    matches.push({
                        type: similarity === 1.0 ? 'unchanged' : 'update',
                        token: newToken,
                        oldToken,
                        item
                    });
                } else {
                    matches.push({
                        type: 'create',
                        token: newToken,
                        item: null
                    });
                }
                oldIndex++;
                newIndex++;
            } else {
                // Different elements - check if old was deleted or new was created
                const oldItem = this._findItemForToken(oldToken, existingItems);
                const newItem = this._findItemForToken(newToken, existingItems);
                
                if (oldItem && !newItem) {
                    // Old deleted
                    matches.push({
                        type: 'delete',
                        token: oldToken,
                        item: oldItem
                    });
                    oldIndex++;
                } else if (!oldItem && newItem) {
                    // New created
                    matches.push({
                        type: 'create',
                        token: newToken,
                        item: null
                    });
                    newIndex++;
                } else {
                    // Both exist but different - update old, create new
                    if (oldItem) {
                        matches.push({
                            type: 'update',
                            token: newToken,
                            oldToken,
                            item: oldItem
                        });
                    } else {
                        matches.push({
                            type: 'create',
                            token: newToken,
                            item: null
                        });
                    }
                    oldIndex++;
                    newIndex++;
                }
            }
        }
        
        return matches;
    }
    
    /**
     * Build a map of existing items
     * @private
     * @param {Object} page - Page object
     * @returns {Map} Map of item ID to item object
     */
    _buildItemMap(page) {
        const itemMap = new Map();
        
        if (!page.groups) {
            return itemMap;
        }
        
        for (const group of page.groups) {
            if (!group.items) continue;
            
            const itemIndex = ItemHierarchy.buildItemIndex(group.items);
            const allItems = ItemHierarchy.getAllItems(group.items, itemIndex);
            
            for (const item of allItems) {
                if (item && item.id) {
                    itemMap.set(item.id, item);
                }
            }
        }
        
        return itemMap;
    }
    
    /**
     * Find item for a token (simplified - matches by text content)
     * @private
     * @param {Object} token - Token object
     * @param {Map} itemMap - Item map
     * @returns {Object|null} Item or null
     */
    _findItemForToken(token, itemMap) {
        // Simple matching by text content
        // In a full implementation, this would use more sophisticated matching
        for (const [itemId, item] of itemMap) {
            if (this._tokenMatchesItem(token, item)) {
                return item;
            }
        }
        return null;
    }
    
    /**
     * Check if token matches item
     * @private
     * @param {Object} token - Token object
     * @param {Object} item - Item object
     * @returns {boolean} True if matches
     */
    _tokenMatchesItem(token, item) {
        if (!token || !item) return false;
        
        const itemText = item.text || '';
        const tokenText = token.text || '';
        
        // Simple text matching
        if (token.type === 'task' && item.type === 'task') {
            return itemText.trim() === tokenText.trim();
        }
        
        if (token.type === 'heading' && item.type === 'note') {
            // Headings might be stored as notes
            return itemText.trim() === tokenText.trim();
        }
        
        if (token.type === 'text' && item.type === 'note') {
            return itemText.trim() === tokenText.trim();
        }
        
        return false;
    }
    
    /**
     * Calculate similarity between two tokens
     * @private
     * @param {Object} token1 - First token
     * @param {Object} token2 - Second token
     * @returns {number} Similarity score (0-1)
     */
    _calculateSimilarity(token1, token2) {
        if (token1.type !== token2.type) {
            return 0;
        }
        
        const text1 = (token1.text || '').trim();
        const text2 = (token2.text || '').trim();
        
        if (text1 === text2) {
            return 1.0;
        }
        
        // Simple similarity based on common words
        const words1 = text1.toLowerCase().split(/\s+/);
        const words2 = text2.toLowerCase().split(/\s+/);
        
        const commonWords = words1.filter(w => words2.includes(w));
        const totalWords = Math.max(words1.length, words2.length);
        
        return commonWords.length / totalWords;
    }
    
    /**
     * Generate operations from matches
     * @private
     * @param {Array} matches - Match objects
     * @param {Object} page - Page object
     * @returns {Array} Array of operation objects
     */
    _generateOperations(matches, page) {
        const operations = [];
        
        for (const match of matches) {
            if (match.type === 'unchanged') {
                continue;
            }
            
            if (match.type === 'update' && match.item) {
                // Generate setText operation
                const newText = match.token.text || '';
                const oldText = match.oldToken.text || '';
                
                if (newText !== oldText) {
                    operations.push({
                        op: 'setText',
                        itemId: match.item.id,
                        params: {
                            text: newText,
                            oldText: oldText
                        }
                    });
                }
            } else if (match.type === 'delete' && match.item) {
                // Generate delete operation
                operations.push({
                    op: 'delete',
                    itemId: match.item.id,
                    params: {
                        deletedItem: match.item
                    }
                });
            } else if (match.type === 'create') {
                // Generate create operation
                // Find parent and index
                const { parentId, index } = this._findInsertLocation(match.token, page);
                
                const itemType = this._tokenTypeToItemType(match.token.type);
                const newItemId = `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                
                operations.push({
                    op: 'create',
                    itemId: newItemId,
                    params: {
                        type: itemType,
                        parentId,
                        index,
                        itemData: {
                            text: match.token.text || '',
                            type: itemType,
                            completed: match.token.completed || false
                        }
                    }
                });
            }
        }
        
        return operations;
    }
    
    /**
     * Find insert location for new item
     * @private
     * @param {Object} token - Token object
     * @param {Object} page - Page object
     * @returns {Object} {parentId, index}
     */
    _findInsertLocation(token, page) {
        // Default: insert at end of first group
        if (!page.groups || page.groups.length === 0) {
            return { parentId: null, index: 0 };
        }
        
        const firstGroup = page.groups[0];
        const items = firstGroup.items || [];
        
        return {
            parentId: firstGroup.id,
            index: items.length
        };
    }
    
    /**
     * Convert token type to item type
     * @private
     * @param {string} tokenType - Token type
     * @returns {string} Item type
     */
    _tokenTypeToItemType(tokenType) {
        const typeMap = {
            'task': 'task',
            'heading': 'note',
            'text': 'note',
            'list': 'note',
            'code': 'code'
        };
        
        return typeMap[tokenType] || 'note';
    }
}

// Export singleton instance
export const markdownDiffParser = new MarkdownDiffParser();

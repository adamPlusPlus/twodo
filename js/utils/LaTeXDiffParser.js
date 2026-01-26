// LaTeXDiffParser.js - Parse LaTeX changes and generate semantic operations
// Used for Phase 5: Representation Authority

import { getService, SERVICES } from '../core/AppServices.js';
import { LaTeXParser } from './LaTeXParser.js';
import { ItemHierarchy } from './ItemHierarchy.js';

/**
 * LaTeXDiffParser - Parses LaTeX diffs and generates semantic operations
 * 
 * Algorithm:
 * 1. Parse both old and new LaTeX using LaTeXParser
 * 2. Compare parsed structures
 * 3. Generate operations for changes
 */
export class LaTeXDiffParser {
    constructor() {
        this.parser = new LaTeXParser();
    }
    
    /**
     * Parse LaTeX diff and generate operations
     * @param {string} oldLaTeX - Old LaTeX text
     * @param {string} newLaTeX - New LaTeX text
     * @param {string} pageId - Page ID
     * @returns {Array} Array of operation objects
     */
    parseDiff(oldLaTeX, newLaTeX, pageId) {
        if (!pageId) {
            console.error('[LaTeXDiffParser] pageId is required');
            return [];
        }
        
        // Get current page structure
        const appState = getService(SERVICES.APP_STATE);
        if (!appState || !appState.documents) {
            console.error('[LaTeXDiffParser] AppState not available');
            return [];
        }
        
        const page = appState.documents.find(p => p.id === pageId);
        if (!page) {
            console.error('[LaTeXDiffParser] Page not found:', pageId);
            return [];
        }
        
        // Parse both LaTeX documents
        const oldBlocks = this._parseLaTeX(oldLaTeX);
        const newBlocks = this._parseLaTeX(newLaTeX);
        
        // Compare and generate operations
        const operations = this._compareAndGenerateOperations(oldBlocks, newBlocks, page);
        
        return operations;
    }
    
    /**
     * Parse LaTeX into blocks
     * @private
     * @param {string} latex - LaTeX text
     * @returns {Array} Array of block objects
     */
    _parseLaTeX(latex) {
        if (!latex) {
            return [];
        }
        
        try {
            // Use LaTeXParser to parse structure
            const parsed = this.parser.parse(latex);
            
            // Convert parsed structure to blocks
            const blocks = [];
            
            if (parsed && parsed.blocks) {
                for (const block of parsed.blocks) {
                    blocks.push({
                        type: block.type || 'text',
                        command: block.command,
                        content: block.content || block.text || '',
                        args: block.args || block.requiredArgs || [],
                        line: block.line || 0
                    });
                }
            }
            
            return blocks;
        } catch (error) {
            console.error('[LaTeXDiffParser] Error parsing LaTeX:', error);
            return [];
        }
    }
    
    /**
     * Compare blocks and generate operations
     * @private
     * @param {Array} oldBlocks - Old blocks
     * @param {Array} newBlocks - New blocks
     * @param {Object} page - Page object
     * @returns {Array} Array of operation objects
     */
    _compareAndGenerateOperations(oldBlocks, newBlocks, page) {
        const operations = [];
        
        // Build item map
        const itemMap = this._buildItemMap(page);
        
        // Simple diff algorithm: match by position and content
        const maxLength = Math.max(oldBlocks.length, newBlocks.length);
        
        for (let i = 0; i < maxLength; i++) {
            const oldBlock = oldBlocks[i];
            const newBlock = newBlocks[i];
            
            if (!oldBlock && newBlock) {
                // New block - create operation
                const { parentId, index } = this._findInsertLocation(i, page);
                const itemType = this._blockTypeToItemType(newBlock.type);
                const newItemId = `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                
                operations.push({
                    op: 'create',
                    itemId: newItemId,
                    params: {
                        type: itemType,
                        parentId,
                        index,
                        itemData: {
                            text: this._blockToText(newBlock),
                            type: itemType
                        }
                    }
                });
            } else if (oldBlock && !newBlock) {
                // Deleted block - delete operation
                const item = this._findItemForBlock(oldBlock, itemMap, i);
                if (item) {
                    operations.push({
                        op: 'delete',
                        itemId: item.id,
                        params: {
                            deletedItem: item
                        }
                    });
                }
            } else if (oldBlock && newBlock) {
                // Compare content
                const oldText = this._blockToText(oldBlock);
                const newText = this._blockToText(newBlock);
                
                if (oldText !== newText) {
                    // Content changed - setText operation
                    const item = this._findItemForBlock(oldBlock, itemMap, i);
                    if (item) {
                        operations.push({
                            op: 'setText',
                            itemId: item.id,
                            params: {
                                text: newText,
                                oldText: oldText
                            }
                        });
                    }
                }
            }
        }
        
        return operations;
    }
    
    /**
     * Build item map
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
     * Find item for block
     * @private
     * @param {Object} block - Block object
     * @param {Map} itemMap - Item map
     * @param {number} position - Position index
     * @returns {Object|null} Item or null
     */
    _findItemForBlock(block, itemMap, position) {
        // Try to match by content and position
        const blockText = this._blockToText(block);
        
        // Simple matching: find item with similar text at similar position
        let itemIndex = 0;
        for (const [itemId, item] of itemMap) {
            if (itemIndex === position) {
                const itemText = item.text || '';
                if (itemText.trim() === blockText.trim() || 
                    itemText.includes(blockText) || 
                    blockText.includes(itemText)) {
                    return item;
                }
            }
            itemIndex++;
        }
        
        // Fallback: find by text similarity
        for (const [itemId, item] of itemMap) {
            const itemText = item.text || '';
            if (itemText.trim() === blockText.trim()) {
                return item;
            }
        }
        
        return null;
    }
    
    /**
     * Convert block to text
     * @private
     * @param {Object} block - Block object
     * @returns {string} Text content
     */
    _blockToText(block) {
        if (block.content) {
            return block.content;
        }
        
        if (block.args && block.args.length > 0) {
            return block.args[0] || '';
        }
        
        if (block.text) {
            return block.text;
        }
        
        return '';
    }
    
    /**
     * Find insert location
     * @private
     * @param {number} position - Position index
     * @param {Object} page - Page object
     * @returns {Object} {parentId, index}
     */
    _findInsertLocation(position, page) {
        // Default: insert at end of first group
        if (!page.groups || page.groups.length === 0) {
            return { parentId: null, index: 0 };
        }
        
        const firstGroup = page.groups[0];
        const items = firstGroup.items || [];
        
        return {
            parentId: firstGroup.id,
            index: Math.min(position, items.length)
        };
    }
    
    /**
     * Convert block type to item type
     * @private
     * @param {string} blockType - Block type
     * @returns {string} Item type
     */
    _blockTypeToItemType(blockType) {
        const typeMap = {
            'section': 'note',
            'subsection': 'note',
            'text': 'note',
            'command': 'note'
        };
        
        return typeMap[blockType] || 'note';
    }
}

// Export singleton instance
export const latexDiffParser = new LaTeXDiffParser();

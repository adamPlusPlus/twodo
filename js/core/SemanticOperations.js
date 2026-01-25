// SemanticOperations.js - Semantic operation type classes
// Each operation represents a semantic edit action (not raw property changes)

import { getService, SERVICES } from './AppServices.js';
import { ItemHierarchy } from '../utils/ItemHierarchy.js';

/**
 * Base class for all semantic operations
 */
class BaseOperation {
    constructor(itemId, params, timestamp = null) {
        this.itemId = itemId;
        this.params = params || {};
        this.timestamp = timestamp || Date.now();
        this.clientId = 'local'; // For Level A (single client)
    }
    
    /**
     * Get operation type
     * @returns {string} Operation type
     */
    getType() {
        const className = this.constructor.name;
        // Convert "SetTextOperation" -> "setText", "SplitOperation" -> "split", etc.
        if (className === 'SetTextOperation') return 'setText';
        const baseName = className.replace('Operation', '');
        // Convert camelCase to camelCase (already correct for most)
        return baseName.charAt(0).toLowerCase() + baseName.slice(1);
    }
    
    /**
     * Validate operation parameters
     * @returns {boolean} True if valid
     */
    validate() {
        if (!this.itemId) {
            console.error(`[${this.constructor.name}] Missing itemId`);
            return false;
        }
        return true;
    }
    
    /**
     * Apply operation to canonical model
     * @returns {Object|null} Result or null if failed
     */
    apply() {
        throw new Error('Must implement apply()');
    }
    
    /**
     * Create inverse operation for undo
     * @returns {BaseOperation} Inverse operation
     */
    invert() {
        throw new Error('Must implement invert()');
    }
    
    /**
     * Find item by ID in canonical model
     * @returns {Object|null} Item with location info
     */
    _findItem() {
        const appState = getService(SERVICES.APP_STATE);
        if (!appState) return null;
        
        const documents = appState.documents || [];
        for (const document of documents) {
            if (!document.groups) continue;
            
            for (const group of document.groups) {
                if (!group.items) continue;
                
                const itemIndex = ItemHierarchy.buildItemIndex(group.items);
                
                // Check root items
                for (let i = 0; i < group.items.length; i++) {
                    const item = group.items[i];
                    if (item && item.id === this.itemId) {
                        return {
                            item,
                            documentId: document.id,
                            groupId: group.id,
                            itemIndex: i,
                            isChild: false,
                            group
                        };
                    }
                    
                    // Check child items
                    if (item) {
                        const children = ItemHierarchy.getChildItems(item, itemIndex);
                        for (let j = 0; j < children.length; j++) {
                            const child = children[j];
                            if (child && child.id === this.itemId) {
                                return {
                                    item: child,
                                    documentId: document.id,
                                    groupId: group.id,
                                    itemIndex: i,
                                    childIndex: j,
                                    isChild: true,
                                    parentItem: item,
                                    group
                                };
                            }
                        }
                    }
                }
            }
        }
        
        return null;
    }
}

/**
 * SetTextOperation - Update item text
 */
export class SetTextOperation extends BaseOperation {
    constructor(itemId, text, oldText, timestamp = null) {
        super(itemId, { text, oldText }, timestamp);
    }
    
    validate() {
        if (!super.validate()) return false;
        if (this.params.text === undefined) {
            console.error('[SetTextOperation] Missing text parameter');
            return false;
        }
        return true;
    }
    
    apply() {
        if (!this.validate()) return null;
        
        const location = this._findItem();
        if (!location) {
            console.error(`[SetTextOperation] Item not found: ${this.itemId}`);
            return null;
        }
        
        const oldText = location.item.text || '';
        location.item.text = this.params.text;
        
        return {
            success: true,
            oldText,
            newText: this.params.text
        };
    }
    
    invert() {
        return new SetTextOperation(
            this.itemId,
            this.params.oldText || '',
            this.params.text,
            this.timestamp
        );
    }
}

/**
 * SplitOperation - Split block at caret position
 */
export class SplitOperation extends BaseOperation {
    constructor(itemId, caretPosition, newItemId, timestamp = null) {
        super(itemId, { caretPosition, newItemId }, timestamp);
    }
    
    validate() {
        if (!super.validate()) return false;
        if (this.params.caretPosition === undefined) {
            console.error('[SplitOperation] Missing caretPosition parameter');
            return false;
        }
        if (!this.params.newItemId) {
            console.error('[SplitOperation] Missing newItemId parameter');
            return false;
        }
        return true;
    }
    
    apply() {
        if (!this.validate()) return null;
        
        const location = this._findItem();
        if (!location) {
            console.error(`[SplitOperation] Item not found: ${this.itemId}`);
            return null;
        }
        
        const item = location.item;
        const text = item.text || '';
        const caretPos = this.params.caretPosition;
        
        // Split text at caret
        const beforeText = text.substring(0, caretPos);
        const afterText = text.substring(caretPos);
        
        // Update current item
        item.text = beforeText;
        
        // Create new item
        const newItem = {
            id: this.params.newItemId,
            type: item.type,
            text: afterText,
            completed: false,
            parentId: item.parentId || null,
            childIds: [],
            config: { ...item.config }
        };
        
        // Insert new item after current item
        const insertIndex = location.itemIndex + 1;
        location.group.items.splice(insertIndex, 0, newItem);
        
        return {
            success: true,
            newItemId: this.params.newItemId,
            insertIndex
        };
    }
    
    invert() {
        // Invert split = merge
        return new MergeOperation(
            this.params.newItemId,
            this.itemId,
            this.timestamp
        );
    }
}

/**
 * MergeOperation - Merge item with previous item
 */
export class MergeOperation extends BaseOperation {
    constructor(itemId, previousItemId, timestamp = null) {
        super(itemId, { previousItemId }, timestamp);
    }
    
    validate() {
        if (!super.validate()) return false;
        if (!this.params.previousItemId) {
            console.error('[MergeOperation] Missing previousItemId parameter');
            return false;
        }
        return true;
    }
    
    apply() {
        if (!this.validate()) return null;
        
        const location = this._findItem();
        if (!location) {
            console.error(`[MergeOperation] Item not found: ${this.itemId}`);
            return null;
        }
        
        const previousLocation = new BaseOperation(this.params.previousItemId, {})._findItem();
        if (!previousLocation) {
            console.error(`[MergeOperation] Previous item not found: ${this.params.previousItemId}`);
            return null;
        }
        
        // Must be in same group
        if (location.groupId !== previousLocation.groupId) {
            console.error('[MergeOperation] Items must be in same group');
            return null;
        }
        
        const item = location.item;
        const previousItem = previousLocation.item;
        
        // Store original text for invert (if needed)
        this.params.originalText = item.text || '';
        this.params.originalPreviousText = previousItem.text || '';
        this.params.caretPosition = (previousItem.text || '').length;
        
        // Merge text
        const mergedText = (previousItem.text || '') + (item.text || '');
        previousItem.text = mergedText;
        
        // Remove merged item
        location.group.items.splice(location.itemIndex, 1);
        
        return {
            success: true,
            mergedText,
            removedItemId: this.itemId
        };
    }
    
    invert() {
        // Invert merge = split (restore original text positions)
        if (this.params.originalText !== undefined && this.params.originalPreviousText !== undefined) {
            // We have original text, can create proper split
            // But we need to recreate the deleted item first
            // For now, return a placeholder - full implementation would need to store more state
            console.warn('[MergeOperation] Invert not fully implemented - requires item recreation');
            return null;
        }
        // Fallback: create split at end of previous item
        return new SplitOperation(
            this.params.previousItemId,
            this.params.caretPosition || 0,
            this.itemId,
            this.timestamp
        );
    }
}

/**
 * MoveOperation - Move item to new position
 */
export class MoveOperation extends BaseOperation {
    constructor(itemId, newParentId, newIndex, oldParentId = null, oldIndex = null, timestamp = null) {
        super(itemId, { newParentId, newIndex, oldParentId, oldIndex }, timestamp);
    }
    
    validate() {
        if (!super.validate()) return false;
        if (this.params.newIndex === undefined) {
            console.error('[MoveOperation] Missing newIndex parameter');
            return false;
        }
        return true;
    }
    
    apply() {
        if (!this.validate()) return null;
        
        const location = this._findItem();
        if (!location) {
            console.error(`[MoveOperation] Item not found: ${this.itemId}`);
            return null;
        }
        
        const item = location.item;
        const oldParentId = item.parentId || null;
        const oldIndex = location.itemIndex;
        
        // Store old location for invert
        this.params.oldParentId = oldParentId;
        this.params.oldIndex = oldIndex;
        
        // Remove from old location
        location.group.items.splice(location.itemIndex, 1);
        
        // Update parent
        item.parentId = this.params.newParentId;
        
        // Find new location
        let newGroup = location.group;
        if (this.params.newParentId) {
            const newParentLocation = new BaseOperation(this.params.newParentId, {})._findItem();
            if (!newParentLocation) {
                console.error(`[MoveOperation] New parent not found: ${this.params.newParentId}`);
                return null;
            }
            newGroup = newParentLocation.group;
        }
        
        // Insert at new position
        const insertIndex = Math.min(this.params.newIndex, newGroup.items.length);
        newGroup.items.splice(insertIndex, 0, item);
        
        // Update parent's childIds if needed
        if (oldParentId) {
            const oldParent = new BaseOperation(oldParentId, {})._findItem();
            if (oldParent && oldParent.item.childIds) {
                const childIndex = oldParent.item.childIds.indexOf(this.itemId);
                if (childIndex !== -1) {
                    oldParent.item.childIds.splice(childIndex, 1);
                }
            }
        }
        
        if (this.params.newParentId) {
            const newParent = new BaseOperation(this.params.newParentId, {})._findItem();
            if (newParent && newParent.item) {
                if (!newParent.item.childIds) {
                    newParent.item.childIds = [];
                }
                if (!newParent.item.childIds.includes(this.itemId)) {
                    newParent.item.childIds.push(this.itemId);
                }
            }
        }
        
        return {
            success: true,
            oldParentId,
            oldIndex,
            newParentId: this.params.newParentId,
            newIndex: insertIndex
        };
    }
    
    invert() {
        return new MoveOperation(
            this.itemId,
            this.params.oldParentId,
            this.params.oldIndex,
            this.params.newParentId,
            this.params.newIndex,
            this.timestamp
        );
    }
}

/**
 * ReparentOperation - Change item parent/depth
 */
export class ReparentOperation extends BaseOperation {
    constructor(itemId, newParentId, newDepth, oldParentId = null, oldDepth = null, timestamp = null) {
        super(itemId, { newParentId, newDepth, oldParentId, oldDepth }, timestamp);
    }
    
    validate() {
        if (!super.validate()) return false;
        if (this.params.newDepth === undefined) {
            console.error('[ReparentOperation] Missing newDepth parameter');
            return false;
        }
        return true;
    }
    
    apply() {
        if (!this.validate()) return null;
        
        const location = this._findItem();
        if (!location) {
            console.error(`[ReparentOperation] Item not found: ${this.itemId}`);
            return null;
        }
        
        const item = location.item;
        const oldParentId = item.parentId || null;
        const oldDepth = this._calculateDepth(item);
        
        // Store old values for invert
        this.params.oldParentId = oldParentId;
        this.params.oldDepth = oldDepth;
        
        // Update parent
        item.parentId = this.params.newParentId;
        
        // Update parent's childIds
        if (oldParentId) {
            const oldParent = new BaseOperation(oldParentId, {})._findItem();
            if (oldParent && oldParent.item.childIds) {
                const childIndex = oldParent.item.childIds.indexOf(this.itemId);
                if (childIndex !== -1) {
                    oldParent.item.childIds.splice(childIndex, 1);
                }
            }
        }
        
        if (this.params.newParentId) {
            const newParent = new BaseOperation(this.params.newParentId, {})._findItem();
            if (newParent && newParent.item) {
                if (!newParent.item.childIds) {
                    newParent.item.childIds = [];
                }
                if (!newParent.item.childIds.includes(this.itemId)) {
                    newParent.item.childIds.push(this.itemId);
                }
            }
        }
        
        return {
            success: true,
            oldParentId,
            oldDepth,
            newParentId: this.params.newParentId,
            newDepth: this.params.newDepth
        };
    }
    
    _calculateDepth(item) {
        // Calculate depth by counting parent chain
        let depth = 0;
        let current = item;
        const visited = new Set();
        
        while (current && current.parentId && !visited.has(current.id)) {
            visited.add(current.id);
            const parent = new BaseOperation(current.parentId, {})._findItem();
            if (parent && parent.item) {
                depth++;
                current = parent.item;
            } else {
                break;
            }
        }
        
        return depth;
    }
    
    invert() {
        return new ReparentOperation(
            this.itemId,
            this.params.oldParentId,
            this.params.oldDepth,
            this.params.newParentId,
            this.params.newDepth,
            this.timestamp
        );
    }
}

/**
 * DeleteOperation - Delete item
 */
export class DeleteOperation extends BaseOperation {
    constructor(itemId, deletedItem = null, timestamp = null) {
        super(itemId, { deletedItem }, timestamp);
    }
    
    validate() {
        return super.validate();
    }
    
    apply() {
        if (!this.validate()) return null;
        
        const location = this._findItem();
        if (!location) {
            console.error(`[DeleteOperation] Item not found: ${this.itemId}`);
            return null;
        }
        
        // Store deleted item for invert
        const deletedItem = JSON.parse(JSON.stringify(location.item));
        this.params.deletedItem = deletedItem;
        this.params.deletedIndex = location.itemIndex;
        this.params.deletedParentId = location.item.parentId || null;
        
        // Remove from parent's childIds if needed
        if (location.item.parentId) {
            const parent = new BaseOperation(location.item.parentId, {})._findItem();
            if (parent && parent.item.childIds) {
                const childIndex = parent.item.childIds.indexOf(this.itemId);
                if (childIndex !== -1) {
                    parent.item.childIds.splice(childIndex, 1);
                }
            }
        }
        
        // Remove item
        location.group.items.splice(location.itemIndex, 1);
        
        return {
            success: true,
            deletedItem
        };
    }
    
    invert() {
        return new CreateOperation(
            this.itemId,
            this.params.deletedItem.type,
            this.params.deletedParentId,
            this.params.deletedIndex,
            this.params.deletedItem,
            this.timestamp
        );
    }
}

/**
 * CreateOperation - Create new item
 */
export class CreateOperation extends BaseOperation {
    constructor(itemId, type, parentId, index, itemData = null, timestamp = null) {
        super(itemId, { type, parentId, index, itemData }, timestamp);
    }
    
    validate() {
        if (!super.validate()) return false;
        if (!this.params.type) {
            console.error('[CreateOperation] Missing type parameter');
            return false;
        }
        if (this.params.index === undefined) {
            console.error('[CreateOperation] Missing index parameter');
            return false;
        }
        return true;
    }
    
    apply() {
        if (!this.validate()) return null;
        
        // Find parent group
        const appState = getService(SERVICES.APP_STATE);
        if (!appState) return null;
        
        const documents = appState.documents || [];
        let targetGroup = null;
        
        if (this.params.parentId) {
            // Find parent item's group
            const parentLocation = new BaseOperation(this.params.parentId, {})._findItem();
            if (!parentLocation) {
                console.error(`[CreateOperation] Parent not found: ${this.params.parentId}`);
                return null;
            }
            targetGroup = parentLocation.group;
        } else {
            // Find first group in current document
            const currentDoc = documents.find(d => d.id === appState.currentDocumentId);
            if (currentDoc && currentDoc.groups && currentDoc.groups.length > 0) {
                targetGroup = currentDoc.groups[0];
            }
        }
        
        if (!targetGroup) {
            console.error('[CreateOperation] No target group found');
            return null;
        }
        
        // Create new item
        const newItem = this.params.itemData || {
            id: this.itemId,
            type: this.params.type,
            text: '',
            completed: false,
            parentId: this.params.parentId || null,
            childIds: [],
            config: {}
        };
        
        // Ensure ID matches
        newItem.id = this.itemId;
        
        // Insert at index
        const insertIndex = Math.min(this.params.index, targetGroup.items.length);
        targetGroup.items.splice(insertIndex, 0, newItem);
        
        // Update parent's childIds if needed
        if (this.params.parentId) {
            const parent = new BaseOperation(this.params.parentId, {})._findItem();
            if (parent && parent.item) {
                if (!parent.item.childIds) {
                    parent.item.childIds = [];
                }
                if (!parent.item.childIds.includes(this.itemId)) {
                    parent.item.childIds.push(this.itemId);
                }
            }
        }
        
        return {
            success: true,
            newItem,
            insertIndex
        };
    }
    
    invert() {
        return new DeleteOperation(
            this.itemId,
            this.params.itemData,
            this.timestamp
        );
    }
}

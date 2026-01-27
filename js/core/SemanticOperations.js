// SemanticOperations.js - Semantic operation type classes
// Each operation represents a semantic edit action (not raw property changes)

import { getService, SERVICES } from './AppServices.js';
import { ItemHierarchy } from '../utils/ItemHierarchy.js';
import { OperationValidator } from '../utils/OperationValidator.js';
import { OperationInverter } from '../utils/OperationInverter.js';
import { OperationApplier } from '../utils/OperationApplier.js';

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
        return OperationApplier.findItem(this.itemId);
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
        return OperationInverter.invertSetTextOperation(this, SetTextOperation);
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
        const insertIndex = OperationApplier.insertItemAt(location.group, newItem, location.itemIndex + 1);
        
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
        return OperationValidator.validateMergeOperation(this);
    }
    
    apply() {
        if (!this.validate()) return null;
        
        const location = this._findItem();
        if (!location) {
            console.error(`[MergeOperation] Item not found: ${this.itemId}`);
            return null;
        }
        
        const previousLocation = OperationApplier.findItem(this.params.previousItemId);
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
        OperationApplier.removeItemAt(location.group, location.itemIndex);
        
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
        return OperationValidator.validateMoveOperation(this);
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
            const newParentLocation = OperationApplier.findItem(this.params.newParentId);
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
        // This is now handled by updateParentChildIds, but keeping for backward compatibility
        if (oldParentId) {
            OperationApplier.removeFromParentChildIds(oldParentId, this.itemId);
        }
        
        if (this.params.newParentId) {
            const newParent = OperationApplier.findItem(this.params.newParentId);
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
        return OperationInverter.invertMoveOperation(this, MoveOperation);
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
        const oldDepth = OperationApplier.calculateDepth(item);
        
        // Store old values for invert
        this.params.oldParentId = oldParentId;
        this.params.oldDepth = oldDepth;
        
        // Update parent
        item.parentId = this.params.newParentId;
        
        // Update parent's childIds
        OperationApplier.updateParentChildIds(oldParentId, this.params.newParentId, this.itemId);
        
        return {
            success: true,
            oldParentId,
            oldDepth,
            newParentId: this.params.newParentId,
            newDepth: this.params.newDepth
        };
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
        return OperationValidator.validateDeleteOperation(this);
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
            const parent = OperationApplier.findItem(location.item.parentId);
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
        return OperationInverter.invertDeleteOperation(this, CreateOperation);
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
        
        // Find target group
        const appState = getService(SERVICES.APP_STATE);
        if (!appState) return null;
        
        const targetGroup = OperationApplier.findTargetGroup(this.params.parentId, appState);
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
        const insertIndex = OperationApplier.insertItemAt(targetGroup, newItem, this.params.index);
        
        // Update parent's childIds if needed
        if (this.params.parentId) {
            OperationApplier.addToParentChildIds(this.params.parentId, this.itemId);
        }
        
        return {
            success: true,
            newItem,
            insertIndex
        };
    }
    
    invert() {
        return OperationInverter.invertCreateOperation(this, DeleteOperation);
    }
}

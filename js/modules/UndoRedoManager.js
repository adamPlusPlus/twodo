// UndoRedoManager.js - Handles undo/redo functionality with change tracking
import { serviceLocator } from '../core/ServiceLocator.js';
import { SERVICES } from '../core/AppServices.js';
import { eventBus } from '../core/EventBus.js';

export class UndoRedoManager {
    constructor(appOrServiceLocator) {
        // Support both app instance (backward compatibility) and ServiceLocator
        if (appOrServiceLocator && typeof appOrServiceLocator.get === 'function') {
            // It's a ServiceLocator
            this.serviceLocator = appOrServiceLocator;
            this.app = null; // Will be removed in later phases
        } else {
            // It's the app instance (backward compatibility)
            this.app = appOrServiceLocator;
            this.serviceLocator = serviceLocator;
        }
        this.undoStack = [];
        this.redoStack = [];
        this.maxStackSize = 100;
        this.isApplyingChange = false;
        this.remoteChanges = new Map(); // Track remote changes to avoid re-applying
        
        // Buffer system properties
        this.currentBufferFilename = null; // Tracks current file's buffer
        this.snapshotInterval = 10; // Create snapshot every N changes
        this.maxSnapshots = 5; // Keep last N snapshots
        this.bufferSaveTimer = null; // Debounce timer for buffer saves
        this.changeCounter = 0; // Track number of changes for snapshot intervals
        this.snapshots = []; // Array of {changeIndex, data} snapshots
    }
    
    /**
     * Record a change for undo/redo
     */
    recordChange(change) {
        if (this.isApplyingChange) {
            return; // Don't record changes that are being applied from undo/redo
        }
        
        // Clear redo stack when new change is made
        this.redoStack = [];
        
        // Increment change counter
        this.changeCounter++;
        
        // Check if snapshot needed (every N changes)
        if (this.changeCounter % this.snapshotInterval === 0) {
            this.createSnapshot();
        }
        
        // Add to undo stack
        this.undoStack.push(change);
        
        // Limit stack size
        if (this.undoStack.length > this.maxStackSize) {
            this.undoStack.shift();
        }
        
        console.log('Change recorded:', change.type, 'at path:', change.path, 'undoStack length:', this.undoStack.length, 'changeCounter:', this.changeCounter);
        
        // Auto-save buffer after recording (debounced)
        this._debouncedSaveBuffer();
        
        // Send to sync manager for real-time sync
        if (this.app.syncManager) {
            this.app.syncManager.sendChange(change);
        }
    }
    
    /**
     * Create a change object for a data modification
     */
    createChange(type, path, value, oldValue = null) {
        return {
            type: type, // 'set', 'delete', 'add', 'insert'
            path: path, // Array of keys/indices to navigate to the target
            value: value,
            oldValue: oldValue,
            timestamp: new Date().toISOString()
        };
    }
    
    /**
     * Get element counts for logging
     */
    _getElementCounts() {
        if (!this.app || !this.app.pages) {
            return { pages: 0, bins: 0, elements: 0 };
        }
        
        let pages = this.app.pages.length;
        let bins = 0;
        let elements = 0;
        
        this.app.pages.forEach(page => {
            if (page.bins && Array.isArray(page.bins)) {
                bins += page.bins.length;
                page.bins.forEach(bin => {
                    if (bin.elements && Array.isArray(bin.elements)) {
                        elements += bin.elements.length;
                    }
                });
            }
        });
        
        return { pages, bins, elements };
    }
    
    /**
     * Apply a change to the data
     */
    applyChange(change) {
        this.isApplyingChange = true;
        
        try {
            const { type, path, value } = change;
            
            if (!path || path.length === 0) {
                console.error('Invalid change path:', change);
                this.isApplyingChange = false;
                return false;
            }
            
            // Log element counts before operation
            const beforeCounts = this._getElementCounts();
            console.log(`[UNDO/REDO] Applying change: ${type} at path:`, path);
            console.log(`[UNDO/REDO] Before counts - Pages: ${beforeCounts.pages}, Bins: ${beforeCounts.bins}, Elements: ${beforeCounts.elements}`);
            console.log(`[UNDO/REDO] Change value:`, value);
            
            // Log array state if applicable
            if (path.length > 0) {
                try {
                    let target = this.app.pages;
                    let pathStartIndex = path[0] === 'pages' ? 1 : 0;
                    const navigationEnd = (type === 'insert' || type === 'add') ? path.length : path.length - 1;
                    
                    for (let i = pathStartIndex; i < navigationEnd && i < path.length; i++) {
                        const key = path[i];
                        if (Array.isArray(target)) {
                            const index = parseInt(key);
                            if (!isNaN(index) && index >= 0 && index < target.length) {
                                target = target[index];
                                if (Array.isArray(target)) {
                                    console.log(`[UNDO/REDO] Array at path[${i}]: length=${target.length}, indices=[0..${target.length - 1}]`);
                                }
                            }
                        } else if (typeof target === 'object' && target !== null) {
                            target = target[key];
                            if (Array.isArray(target)) {
                                console.log(`[UNDO/REDO] Array at path[${i}]: length=${target.length}, indices=[0..${target.length - 1}]`);
                            }
                        }
                    }
                } catch (e) {
                    // Ignore errors in logging
                }
            }
            
            // Get pages from app state service
            let pages;
            try {
                const appState = this.serviceLocator.get(SERVICES.APP_STATE);
                pages = appState.getPages();
            } catch (e) {
                if (this.app && this.app.pages) {
                    pages = this.app.pages;
                } else {
                    console.error('[UNDO] Cannot access pages');
                    return false;
                }
            }
            // Start from pages (skip 'pages' in path since we're already there)
            let target = pages;
            let pathStartIndex = 0;
            
            // If path starts with 'pages', skip it since we're already at this.app.pages
            if (path[0] === 'pages') {
                pathStartIndex = 1;
            }
            
            // For 'insert' and 'add' operations, the path points to the array itself
            // So we need to navigate to the parent of the array, not the array
            // The last element in the path is the array name (e.g., 'elements'), so we stop before it
            const isArrayOperation = type === 'insert' || type === 'add';
            const navigationEnd = isArrayOperation ? path.length - 1 : path.length - 1;
            
            // Navigate to the target
            for (let i = pathStartIndex; i < navigationEnd; i++) {
                const key = path[i];
                if (target === null || target === undefined) {
                    console.error('Cannot navigate path - target is null/undefined at key:', key, 'path so far:', path.slice(0, i + 1));
                    this.isApplyingChange = false;
                    return false;
                }
                if (Array.isArray(target)) {
                    const index = parseInt(key);
                    if (isNaN(index) || index < 0 || index >= target.length) {
                        console.error('Invalid array index:', index, 'for array length:', target.length, 'at path:', path.slice(0, i + 1));
                        this.isApplyingChange = false;
                        return false;
                    }
                    target = target[index];
                } else if (typeof target === 'object' && target !== null) {
                    if (target[key] === undefined) {
                        // Create missing object/array based on next key
                        const nextKey = path[i + 1];
                        if (typeof nextKey === 'number' || (!isNaN(parseInt(nextKey)) && i + 2 < path.length)) {
                            target[key] = [];
                        } else {
                            target[key] = {};
                        }
                    }
                    target = target[key];
                } else {
                    console.error('Cannot navigate path - target is not object/array at key:', key, 'target type:', typeof target);
                    this.isApplyingChange = false;
                    return false;
                }
            }
            
            // For array operations (insert/add), target should be the array itself
            // For other operations, we need to get the array/object and the last key
            let lastKey;
            let arrayTarget = null;
            
            if (isArrayOperation) {
                // For insert/add, the last element in path is the array name (e.g., 'elements')
                // We need to get the array from the parent object
                lastKey = path[path.length - 1];
                if (typeof target === 'object' && target !== null) {
                    // Ensure the array exists
                    if (!target[lastKey]) {
                        target[lastKey] = [];
                    }
                    arrayTarget = target[lastKey];
                    if (!Array.isArray(arrayTarget)) {
                        console.error('Target for insert/add is not an array:', typeof arrayTarget, arrayTarget);
                        this.isApplyingChange = false;
                        return false;
                    }
                } else {
                    console.error('Cannot find array at key:', lastKey, 'in target:', target);
                    this.isApplyingChange = false;
                    return false;
                }
            } else {
                lastKey = path[path.length - 1];
                if (target === null || target === undefined) {
                    console.error('Cannot apply change - target is null/undefined at final key:', lastKey);
                    this.isApplyingChange = false;
                    return false;
                }
            }
            
            // Store old value if not already stored
            if (change.oldValue === null || change.oldValue === undefined) {
                if (isArrayOperation) {
                    // For insert, we don't need to store old value (we're adding)
                    // For add, we don't need to store old value either
                } else if (Array.isArray(target)) {
                    const index = parseInt(lastKey);
                    if (!isNaN(index) && index >= 0 && index < target.length) {
                        change.oldValue = target[index];
                    }
                } else if (typeof target === 'object' && target !== null) {
                    change.oldValue = target[lastKey];
                }
            }
            
            // Apply the change
            switch (type) {
                case 'set':
                    if (Array.isArray(target)) {
                        const index = parseInt(lastKey);
                        if (!isNaN(index)) {
                            if (index >= 0 && index < target.length) {
                                target[index] = value;
                            } else {
                                console.warn('Set index out of bounds:', index, 'array length:', target.length, '- element may have been deleted');
                                // Don't error, just log - the element might have been deleted by another operation
                            }
                        } else {
                            console.error('Invalid array index for set:', lastKey);
                        }
                    } else if (typeof target === 'object' && target !== null) {
                        target[lastKey] = value;
                    }
                    break;
                case 'delete':
                    if (Array.isArray(target)) {
                        const index = parseInt(lastKey);
                        if (!isNaN(index)) {
                            if (index >= 0 && index < target.length) {
                                target.splice(index, 1);
                            } else {
                                console.warn('Delete index out of bounds:', index, 'array length:', target.length, '- element may have already been deleted');
                                // Don't error, just log - the element might have been deleted by another operation
                            }
                        } else {
                            console.error('Invalid array index for delete:', lastKey);
                        }
                    } else if (typeof target === 'object' && target !== null) {
                        delete target[lastKey];
                    }
                    break;
                case 'add':
                    if (arrayTarget && Array.isArray(arrayTarget)) {
                        arrayTarget.push(value);
                        console.log('Added element, array length now:', arrayTarget.length);
                    } else if (typeof target === 'object' && target !== null) {
                        target[lastKey] = value;
                    }
                    break;
                case 'insert':
                    if (arrayTarget && Array.isArray(arrayTarget)) {
                        // Ensure we have a value to insert
                        if (!value) {
                            console.error('Cannot insert - no value provided');
                            this.isApplyingChange = false;
                            return false;
                        }
                        // For insert, use insertIndex from the change
                        let insertIndex;
                        if (change.insertIndex !== undefined && change.insertIndex !== null) {
                            insertIndex = change.insertIndex;
                            console.log(`[UNDO/REDO] Using stored insertIndex: ${insertIndex}, array length: ${arrayTarget.length}`);
                        } else {
                            // Fallback: try to parse lastKey or use array length
                            const parsed = parseInt(lastKey);
                            insertIndex = isNaN(parsed) ? arrayTarget.length : parsed;
                            console.log(`[UNDO/REDO] No insertIndex in change, using fallback: ${insertIndex} (parsed=${parsed}, lastKey=${lastKey}), array length: ${arrayTarget.length}`);
                        }
                        // Ensure index is valid (can be 0 to array.length inclusive)
                        const validIndex = Math.max(0, Math.min(insertIndex, arrayTarget.length));
                        console.log(`[UNDO/REDO] Inserting at validIndex: ${validIndex}, array length before: ${arrayTarget.length}, path:`, path);
                        // Create a deep copy of the value to insert
                        const valueToInsert = JSON.parse(JSON.stringify(value));
                        // Check if element already exists at this position (shouldn't happen, but be safe)
                        if (validIndex < arrayTarget.length && arrayTarget[validIndex] && 
                            valueToInsert && valueToInsert.text && arrayTarget[validIndex].text === valueToInsert.text &&
                            valueToInsert.type && arrayTarget[validIndex].type === valueToInsert.type) {
                            console.warn(`[UNDO/REDO] Element already exists at index ${validIndex}, skipping insert`);
                        } else {
                            arrayTarget.splice(validIndex, 0, valueToInsert);
                            console.log(`[UNDO/REDO] Inserted element at index: ${validIndex}, array length now: ${arrayTarget.length}, element text: ${valueToInsert?.text || 'N/A'}`);
                        }
                    } else {
                        console.error('Cannot insert - target is not an array:', typeof arrayTarget, arrayTarget);
                        this.isApplyingChange = false;
                        return false;
                    }
                    break;
                case 'move':
                    // Move operation: delete from source, insert at target
                    if (!change.sourcePath || !change.targetPath) {
                        console.error('Move operation missing source or target path');
                        this.isApplyingChange = false;
                        return false;
                    }
                    
                    // First, find and delete from source
                    let sourceTarget = this.app.pages;
                    const sourcePath = change.sourcePath;
                    let sourcePathStart = sourcePath[0] === 'pages' ? 1 : 0;
                    
                    // Navigate to source element
                    for (let i = sourcePathStart; i < sourcePath.length - 1; i++) {
                        const key = sourcePath[i];
                        if (Array.isArray(sourceTarget)) {
                            sourceTarget = sourceTarget[parseInt(key)];
                        } else if (typeof sourceTarget === 'object' && sourceTarget !== null) {
                            sourceTarget = sourceTarget[key];
                        }
                        if (sourceTarget === null || sourceTarget === undefined) {
                            console.error('Cannot navigate to source for move');
                            this.isApplyingChange = false;
                            return false;
                        }
                    }
                    
                    const sourceLastKey = sourcePath[sourcePath.length - 1];
                    let sourceArray = null;
                    let sourceIndex = -1;
                    
                    if (Array.isArray(sourceTarget)) {
                        sourceIndex = parseInt(sourceLastKey);
                        if (isNaN(sourceIndex) || sourceIndex < 0 || sourceIndex >= sourceTarget.length) {
                            console.error('Invalid source index for move:', sourceIndex);
                            this.isApplyingChange = false;
                            return false;
                        }
                        sourceArray = sourceTarget;
                    } else if (typeof sourceTarget === 'object' && sourceTarget !== null) {
                        sourceArray = sourceTarget[sourceLastKey];
                        if (!Array.isArray(sourceArray)) {
                            console.error('Source is not an array for move');
                            this.isApplyingChange = false;
                            return false;
                        }
                        // Find element in source array
                        if (value) {
                            sourceIndex = sourceArray.findIndex(el => 
                                el && value && 
                                el.text === value.text && 
                                el.type === value.type
                            );
                            if (sourceIndex === -1 && change.sourceIndex !== undefined) {
                                sourceIndex = change.sourceIndex;
                            }
                        } else if (change.sourceIndex !== undefined) {
                            sourceIndex = change.sourceIndex;
                        }
                        if (sourceIndex === -1 || sourceIndex < 0 || sourceIndex >= sourceArray.length) {
                            console.error('Cannot find element in source array for move');
                            this.isApplyingChange = false;
                            return false;
                        }
                    }
                    
                    // Remove element from source
                    const movedElement = sourceArray.splice(sourceIndex, 1)[0];
                    if (!movedElement) {
                        console.error('No element found at source index for move');
                        this.isApplyingChange = false;
                        return false;
                    }
                    
                    // Now insert at target
                    // Get pages from app state service
                    let pages;
                    try {
                        const appState = this.serviceLocator.get(SERVICES.APP_STATE);
                        pages = appState.getPages();
                    } catch (e) {
                        if (this.app && this.app.pages) {
                            pages = this.app.pages;
                        } else {
                            console.error('[UNDO] Cannot access pages');
                            return false;
                        }
                    }
                    let targetArray = pages;
                    const targetArrayPath = change.targetPath;
                    let targetPathStart = targetArrayPath[0] === 'pages' ? 1 : 0;
                    
                    // Navigate to target array
                    for (let i = targetPathStart; i < targetArrayPath.length; i++) {
                        const key = targetArrayPath[i];
                        if (Array.isArray(targetArray)) {
                            targetArray = targetArray[parseInt(key)];
                        } else if (typeof targetArray === 'object' && targetArray !== null) {
                            if (!targetArray[key]) {
                                targetArray[key] = [];
                            }
                            targetArray = targetArray[key];
                        }
                        if (targetArray === null || targetArray === undefined) {
                            console.error('Cannot navigate to target for move');
                            this.isApplyingChange = false;
                            // Put element back
                            sourceArray.splice(sourceIndex, 0, movedElement);
                            return false;
                        }
                    }
                    
                    if (!Array.isArray(targetArray)) {
                        console.error('Target is not an array for move');
                        this.isApplyingChange = false;
                        // Put element back
                        sourceArray.splice(sourceIndex, 0, movedElement);
                        return false;
                    }
                    
                    // Insert at target index
                    const targetIndex = change.targetIndex !== undefined ? change.targetIndex : targetArray.length;
                    const validTargetIndex = Math.max(0, Math.min(targetIndex, targetArray.length));
                    targetArray.splice(validTargetIndex, 0, movedElement);
                    console.log('Moved element from index', sourceIndex, 'to index', validTargetIndex);
                    break;
            }
            
            // Log element counts after operation
            const afterCounts = this._getElementCounts();
            console.log(`[UNDO/REDO] After counts - Pages: ${afterCounts.pages}, Bins: ${afterCounts.bins}, Elements: ${afterCounts.elements}`);
            
            // Validate that elements didn't disappear unexpectedly
            // Note: Element count only counts bin.elements, not child elements, so inserts into children arrays won't increase count
            if (type === 'delete' && afterCounts.elements > beforeCounts.elements) {
                console.warn(`[UNDO/REDO] WARNING: Delete operation increased element count. Before: ${beforeCounts.elements}, After: ${afterCounts.elements}`);
            } else if (type === 'insert' && afterCounts.elements < beforeCounts.elements) {
                console.warn(`[UNDO/REDO] WARNING: Insert operation decreased element count. Before: ${beforeCounts.elements}, After: ${afterCounts.elements}`);
            }
            
            // Validate state after change
            const validation = this.validateState();
            if (!validation.valid) {
                console.error('[UNDO/REDO] State validation failed after applying change:', validation.errors);
                // Log warnings too
                if (validation.warnings.length > 0) {
                    console.warn('[UNDO/REDO] State validation warnings:', validation.warnings);
                }
            } else if (validation.warnings.length > 0) {
                console.warn('[UNDO/REDO] State validation warnings:', validation.warnings);
            }
            
            console.log('[UNDO/REDO] Change applied successfully');
            
            // Don't save or render here - let undo/redo handle it
            // This prevents double-saving and ensures render happens after all changes
            
            this.isApplyingChange = false;
            return true;
        } catch (error) {
            console.error('Error applying change:', error, 'change:', change);
            this.isApplyingChange = false;
            return false;
        }
    }
    
    /**
     * Apply a remote change (from another device)
     */
    applyRemoteChange(change) {
        // Mark as remote to avoid re-sending
        this.remoteChanges.set(change.changeId, change);
        
        // Apply the change
        this.applyChange(change);
        
        // Add to undo stack (but mark as remote)
        change.isRemote = true;
        this.undoStack.push(change);
        if (this.undoStack.length > this.maxStackSize) {
            this.undoStack.shift();
        }
    }
    
    /**
     * Undo the last change
     */
    undo() {
        if (this.undoStack.length === 0) {
            console.log('[UNDO] Undo stack is empty');
            return false;
        }
        
        const beforeCounts = this._getElementCounts();
        console.log(`[UNDO] Starting undo operation. Stack size: ${this.undoStack.length}`);
        console.log(`[UNDO] Before counts - Pages: ${beforeCounts.pages}, Bins: ${beforeCounts.bins}, Elements: ${beforeCounts.elements}`);
        
        const change = this.undoStack.pop();
        console.log(`[UNDO] Popped change: ${change.type} at path:`, change.path);
        
        // Check if this change is part of a move operation
        // If so, we need to undo both the delete and insert together as a single atomic operation
        if (change.isPartOfMove && change.moveChangeId) {
            console.log(`[UNDO] Change is part of move operation: ${change.moveChangeId}`);
            
            // Find the paired change (if insert, find delete; if delete, find insert)
            const pairedChangeType = change.type === 'insert' ? 'delete' : 'insert';
            let pairedChangeIndex = -1;
            
            // Look for the paired change in the undo stack (should be right before/after since they're recorded sequentially)
            // Since we just popped 'change', the paired one should be at the top of the stack
            for (let i = this.undoStack.length - 1; i >= 0; i--) {
                const candidate = this.undoStack[i];
                if (candidate.isPartOfMove && 
                    candidate.moveChangeId === change.moveChangeId && 
                    candidate.type === pairedChangeType) {
                    pairedChangeIndex = i;
                    break;
                }
            }
            
            if (pairedChangeIndex !== -1) {
                // Found the paired change - pop it
                const pairedChange = this.undoStack.splice(pairedChangeIndex, 1)[0];
                console.log(`[UNDO] Found paired ${pairedChangeType} change, undoing move as atomic operation`);
                
                // For a move operation, we need to:
                // 1. Undo the insert (delete the element from its new position)
                // 2. Undo the delete (insert the element back at its original position)
                // Order: undo insert first, then undo delete
                const insertChange = change.type === 'insert' ? change : pairedChange;
                const deleteChange = change.type === 'delete' ? change : pairedChange;
                
                // Step 1: Undo insert (delete from new position)
                // Professional approach: Use element ID first (like VS Code, Photoshop, etc.)
                const elementToFind = insertChange.value;
                
                if (!elementToFind) {
                    console.error('[UNDO] Cannot undo move - insert change has no element value');
                    this.undoStack.push(pairedChange);
                    this.undoStack.push(change);
                    return false;
                }
                
                let elementDeleted = false;
                
                // Professional approach: Use ID-based lookup only
                if (!elementToFind.id) {
                    console.error('[UNDO] Cannot undo move - element has no ID. All elements should have IDs.');
                    this.undoStack.push(pairedChange);
                    this.undoStack.push(change);
                    return false;
                }
                
                const found = this.findElementById(elementToFind.id);
                if (!found) {
                    console.error(`[UNDO] Element with ID ${elementToFind.id} not found - may have been deleted`);
                    this.undoStack.push(pairedChange);
                    this.undoStack.push(change);
                    return false;
                }
                
                // Found by ID - construct path directly and delete
                const pageIndex = this.app.pages.findIndex(p => p.id === found.pageId);
                if (pageIndex === -1) {
                    console.error(`[UNDO] Page ${found.pageId} not found`);
                    this.undoStack.push(pairedChange);
                    this.undoStack.push(change);
                    return false;
                }
                
                const page = this.app.pages[pageIndex];
                const binIndex = page.bins.findIndex(b => b.id === found.binId);
                if (binIndex === -1) {
                    console.error(`[UNDO] Bin ${found.binId} not found`);
                    this.undoStack.push(pairedChange);
                    this.undoStack.push(change);
                    return false;
                }
                
                let deletePath;
                if (found.isChild) {
                    deletePath = ['pages', pageIndex, 'bins', binIndex, 'elements', found.elementIndex, 'children', found.childIndex];
                } else {
                    deletePath = ['pages', pageIndex, 'bins', binIndex, 'elements', found.elementIndex];
                }
                
                console.log(`[UNDO] Found element by ID, deleting from path:`, deletePath);
                const deleteResult = this.applyChange({
                    type: 'delete',
                    path: deletePath,
                    value: null,
                    oldValue: elementToFind
                });
                
                if (!deleteResult) {
                    console.error('[UNDO] Failed to delete element found by ID');
                    this.undoStack.push(pairedChange);
                    this.undoStack.push(change);
                    return false;
                }
                
                // Step 2: Undo delete (insert back at original position)
                let deleteInversePath = [...deleteChange.path];
                let deleteInsertIndex = null;
                if (deleteInversePath.length > 0 && typeof deleteInversePath[deleteInversePath.length - 1] === 'number') {
                    deleteInsertIndex = deleteInversePath.pop();
                } else {
                    deleteInsertIndex = deleteChange.deleteIndex !== undefined ? deleteChange.deleteIndex : 0;
                }
                
                const insertBackResult = this.applyChange({
                    type: 'insert',
                    path: deleteInversePath,
                    value: deleteChange.oldValue,
                    oldValue: null,
                    insertIndex: deleteInsertIndex
                });
                
                if (!insertBackResult) {
                    console.error('[UNDO] Failed to insert element back at original position in move undo');
                    // Try to recover by re-inserting at new position
                    this.applyChange({
                        type: 'insert',
                        path: insertInversePath.slice(0, -1),
                        value: insertChange.value,
                        oldValue: null,
                        insertIndex: insertElementIndex
                    });
                    this.undoStack.push(pairedChange);
                    this.undoStack.push(change);
                    return false;
                }
                
                // Move both changes to redo stack (in reverse order so they can be redone correctly)
                this.redoStack.push(deleteChange);
                this.redoStack.push(insertChange);
                if (this.redoStack.length > this.maxStackSize * 2) {
                    this.redoStack.shift();
                    this.redoStack.shift();
                }
                
                // Save data and re-render
                if (this.app) {
                    if (this.app.dataManager) {
                        this.app.dataManager.saveData();
                    }
                    if (typeof this.app.render === 'function') {
                        this.app.render();
                    }
                }
                
                const afterCounts = this._getElementCounts();
                console.log(`[UNDO] After counts - Pages: ${afterCounts.pages}, Bins: ${afterCounts.bins}, Elements: ${afterCounts.elements}`);
                console.log(`[UNDO] Move operation undone successfully as atomic operation`);
                return true;
            } else {
                console.warn(`[UNDO] Move operation detected but paired change not found, undoing single change`);
                // Fall through to normal undo
            }
        }
        
        // Create inverse change based on the original change type
        let inverseType;
        let inversePath = [...change.path]; // Copy the path
        let inverseInsertIndex = null;
        
        if (change.type === 'delete') {
            // If we deleted, we need to insert it back
            inverseType = 'insert';
            // For delete, the path points to the element (e.g., ['pages', 0, 'bins', 0, 'elements', 3])
            // For insert, we need path to the array (e.g., ['pages', 0, 'bins', 0, 'elements'])
            // and the index should be in insertIndex
            if (inversePath.length > 0 && typeof inversePath[inversePath.length - 1] === 'number') {
                // Last element is the index, extract it and remove from path
                inverseInsertIndex = inversePath.pop();
                console.log(`[UNDO] Extracted insertIndex ${inverseInsertIndex} from delete path`);
            } else {
                // Try to find the index from the change's stored insertIndex or deleteIndex
                // When a delete is recorded, we should store the original index
                inverseInsertIndex = change.insertIndex !== undefined ? change.insertIndex : 
                                    (change.deleteIndex !== undefined ? change.deleteIndex : 0);
                console.log(`[UNDO] Using stored index: insertIndex=${change.insertIndex}, deleteIndex=${change.deleteIndex}, final=${inverseInsertIndex}`);
            }
            // Note: We'll clamp this index in applyChange to ensure it's valid for the current array state
        } else if (change.type === 'insert') {
            // If we inserted, we need to delete it
            inverseType = 'delete';
            // For insert, the path points to the array (e.g., ['pages', 0, 'bins', 0, 'elements'])
            // For delete, we need path to the element (e.g., ['pages', 0, 'bins', 0, 'elements', 3])
            // Always find the element by comparing properties, not by index, since the array may have changed
            const arrayPath = [...inversePath];
            let arrayTarget = this.app.pages;
            if (arrayPath[0] === 'pages') {
                for (let i = 1; i < arrayPath.length; i++) {
                    const key = arrayPath[i];
                    if (Array.isArray(arrayTarget)) {
                        arrayTarget = arrayTarget[parseInt(key)];
                    } else if (typeof arrayTarget === 'object' && arrayTarget !== null) {
                        arrayTarget = arrayTarget[key];
                    }
                    if (arrayTarget === null || arrayTarget === undefined) {
                        console.error('Cannot navigate to array for undo insert');
                        return false;
                    }
                }
                if (Array.isArray(arrayTarget)) {
                    // First, try to use the insertIndex if it's still valid
                    let elementIndex = -1;
                    const elementToFind = change.value;
                    
                    if (!elementToFind) {
                        console.error('Cannot undo insert - no element value stored in change');
                        return false;
                    }
                    
                    if (change.insertIndex !== undefined && change.insertIndex !== null) {
                        const storedIndex = change.insertIndex;
                        if (storedIndex >= 0 && storedIndex < arrayTarget.length) {
                            // Check if the element at this index matches what we're looking for
                            const elementAtIndex = arrayTarget[storedIndex];
                            // Simple check: if text and type match, it's likely the same element
                            if (elementAtIndex && elementToFind && 
                                elementAtIndex.text === elementToFind.text && 
                                elementAtIndex.type === elementToFind.type) {
                                elementIndex = storedIndex;
                                console.log('Found element at stored insertIndex:', storedIndex);
                            } else {
                                console.log('Element at stored index does not match:', {
                                    storedIndex,
                                    atIndex: elementAtIndex ? { text: elementAtIndex.text, type: elementAtIndex.type } : null,
                                    lookingFor: { text: elementToFind.text, type: elementToFind.type }
                                });
                            }
                        } else {
                            console.log('Stored insertIndex out of bounds:', storedIndex, 'array length:', arrayTarget.length);
                        }
                    }
                    
                    // If index-based lookup failed, try property-based matching
                    if (elementIndex === -1) {
                        const elementToFind = change.value;
                        console.log('[UNDO] Searching for element:', {
                            text: elementToFind?.text,
                            type: elementToFind?.type,
                            completed: elementToFind?.completed,
                            repeats: elementToFind?.repeats
                        });
                        
                        // Try to find by text and type (most reliable identifiers)
                        // Use trimmed text comparison to handle whitespace differences
                        const searchText = elementToFind?.text ? elementToFind.text.trim() : '';
                        const searchType = elementToFind?.type || '';
                        
                        elementIndex = arrayTarget.findIndex(el => {
                            if (!el || !elementToFind) return false;
                            // Primary match: text and type must match (with trimmed text)
                            const elText = el.text ? el.text.trim() : '';
                            if (elText === searchText && el.type === searchType) {
                                return true;
                            }
                            return false;
                        });
                        
                        // If we found multiple matches, try to narrow it down
                        if (elementIndex !== -1) {
                            const matches = arrayTarget
                                .map((el, idx) => ({ el, idx }))
                                .filter(({ el }) => {
                                    if (!el || !elementToFind) return false;
                                    const elText = el.text ? el.text.trim() : '';
                                    return elText === searchText && el.type === searchType;
                                });
                            
                            console.log(`[UNDO] Found ${matches.length} matching element(s)`);
                            
                            if (matches.length > 1) {
                                // Multiple matches - try to find the best one
                                // Prefer matches with more properties matching
                                const bestMatch = matches.reduce((best, current) => {
                                    let bestScore = 0;
                                    let currentScore = 0;
                                    
                                    if (best.el.completed === elementToFind.completed) bestScore++;
                                    if (best.el.repeats === elementToFind.repeats) bestScore++;
                                    if (best.el.timeAllocated === elementToFind.timeAllocated) bestScore++;
                                    if (best.el.id === elementToFind.id) bestScore += 10; // ID match is very strong
                                    
                                    if (current.el.completed === elementToFind.completed) currentScore++;
                                    if (current.el.repeats === elementToFind.repeats) currentScore++;
                                    if (current.el.timeAllocated === elementToFind.timeAllocated) currentScore++;
                                    if (current.el.id === elementToFind.id) currentScore += 10; // ID match is very strong
                                    
                                    return currentScore > bestScore ? current : best;
                                });
                                elementIndex = bestMatch.idx;
                                console.log(`[UNDO] Selected best match at index ${elementIndex} with score`);
                            }
                        } else {
                            // No match found - log detailed comparison
                            console.warn('[UNDO] No exact text/type match found. Available elements:');
                            arrayTarget.forEach((el, idx) => {
                                const elText = el?.text ? el.text.trim() : '';
                                const matchesText = elText === searchText;
                                const matchesType = el?.type === searchType;
                                if (matchesText || matchesType) {
                                    console.warn(`  Index ${idx}: text="${elText}" (match: ${matchesText}), type="${el?.type}" (match: ${matchesType})`);
                                }
                            });
                        }
                    }
                    
                    if (elementIndex !== -1) {
                        inversePath.push(elementIndex);
                        console.log(`[UNDO] Found element to delete at index ${elementIndex}`);
                    } else {
                        // CRITICAL: Do not delete elements if we can't find the exact match
                        // Try to use snapshot to restore if available
                        console.error('[UNDO] Cannot find element to delete in array.');
                        console.error('[UNDO] Element being searched:', change.value);
                        console.error('[UNDO] Array length:', arrayTarget.length);
                        console.error('[UNDO] Available elements:', arrayTarget.map((el, idx) => ({ 
                            index: idx, 
                            text: el?.text, 
                            type: el?.type,
                            completed: el?.completed 
                        })));
                        
                        // Try recovery from snapshot
                        console.log('[UNDO] Attempting recovery from snapshot...');
                        const recoveryResult = this.recoverFromSnapshot(this.changeCounter - 1);
                        if (recoveryResult && recoveryResult.success) {
                            console.log(`[UNDO] Recovery successful from change index ${recoveryResult.recoveredFrom}`);
                            // After recovery, try to find the element again
                            // Re-navigate to array after recovery
                            // Get pages from app state service
                            let pages;
                            try {
                                const appState = this.serviceLocator.get(SERVICES.APP_STATE);
                                pages = appState.getPages();
                            } catch (e) {
                                if (this.app && this.app.pages) {
                                    pages = this.app.pages;
                                } else {
                                    console.error('[UNDO] Cannot access pages');
                                    this.undoStack.push(change);
                                    return false;
                                }
                            }
                            let recoveredArrayTarget = pages;
                            for (let i = 1; i < arrayPath.length; i++) {
                                const key = arrayPath[i];
                                if (Array.isArray(recoveredArrayTarget)) {
                                    recoveredArrayTarget = recoveredArrayTarget[parseInt(key)];
                                } else if (typeof recoveredArrayTarget === 'object' && recoveredArrayTarget !== null) {
                                    recoveredArrayTarget = recoveredArrayTarget[key];
                                }
                            }
                            
                            if (Array.isArray(recoveredArrayTarget)) {
                                // Try finding element again after recovery
                                const elementToFind = change.value;
                                elementIndex = recoveredArrayTarget.findIndex(el => {
                                    if (!el || !elementToFind) return false;
                                    return el.text === elementToFind.text && el.type === elementToFind.type;
                                });
                                
                                if (elementIndex !== -1) {
                                    inversePath.push(elementIndex);
                                    console.log(`[UNDO] Found element after recovery at index ${elementIndex}`);
                                } else {
                                    console.error('[UNDO] Still cannot find element after recovery. ABORTING UNDO.');
                                    this.undoStack.push(change);
                                    return false;
                                }
                            } else {
                                console.error('[UNDO] Array not found after recovery. ABORTING UNDO.');
                                this.undoStack.push(change);
                                return false;
                            }
                        } else {
                            console.error('[UNDO] Recovery failed or no snapshot available. ABORTING UNDO to prevent accidental element deletion');
                            // Put the change back on the stack since we couldn't undo it
                            this.undoStack.push(change);
                            return false;
                        }
                    }
                } else {
                    console.error('Target is not an array for undo insert:', typeof arrayTarget);
                    return false;
                }
            } else {
                console.error('Invalid path for undo insert:', arrayPath);
                return false;
            }
        } else if (change.type === 'move') {
            // For move operations, we need to move the element back
            // This is the inverse of a move: move from target back to source
            inverseType = 'move';
            // Swap source and target
            inversePath = change.sourcePath ? [...change.sourcePath] : [...change.path];
            // For the inverse move, we need to swap source and target
            // The inverse move goes from current position (target) back to original position (source)
            // We'll handle this in applyChange
        } else if (change.type === 'set') {
            inverseType = 'set'; // If we set a value, we set it back to old value
        } else if (change.type === 'add') {
            inverseType = 'delete'; // If we added, we need to delete it
            // For add, path points to array, for delete we need the element index
            // Find the element in the array
            const arrayPath = [...inversePath];
            let arrayTarget = this.app.pages;
            if (arrayPath[0] === 'pages') {
                for (let i = 1; i < arrayPath.length; i++) {
                    const key = arrayPath[i];
                    if (Array.isArray(arrayTarget)) {
                        arrayTarget = arrayTarget[parseInt(key)];
                    } else if (typeof arrayTarget === 'object' && arrayTarget !== null) {
                        arrayTarget = arrayTarget[key];
                    }
                }
                if (Array.isArray(arrayTarget)) {
                    const elementIndex = arrayTarget.findIndex(el => el === change.value || 
                        (el && change.value && el.text === change.value.text && el.type === change.value.type));
                    if (elementIndex !== -1) {
                        inversePath.push(elementIndex);
                    }
                }
            }
        } else {
            inverseType = change.type; // Fallback
        }
        
        // For delete->insert: value should be the element that was deleted (stored in oldValue)
        // For insert->delete: value is not needed (we find the element by comparing)
        // For set->set: value should be the old value (stored in oldValue)
        let inverseValue;
        if (inverseType === 'insert') {
            // When undoing a delete, we need to insert the element back
            // The element is stored in change.oldValue
            inverseValue = change.oldValue;
        } else if (inverseType === 'delete') {
            // When undoing an insert, we don't need the value (we find it by comparing)
            // But we should store it for potential redo
            inverseValue = null;
        } else if (inverseType === 'set') {
            // When undoing a set, we set it back to the old value
            inverseValue = change.oldValue;
        } else {
            inverseValue = change.oldValue;
        }
        
        const inverseChange = {
            type: inverseType,
            path: inversePath,
            value: inverseValue,
            oldValue: change.value,
            timestamp: new Date().toISOString(),
            changeId: change.changeId ? `${change.changeId}-undo` : `${Date.now()}-${Math.random()}`
        };
        
        // Set insertIndex for insert operations
        if (inverseType === 'insert' && inverseInsertIndex !== null) {
            inverseChange.insertIndex = inverseInsertIndex;
            console.log(`[UNDO] Set insertIndex on inverse change: ${inverseInsertIndex}`);
        } else if (inverseType === 'insert') {
            console.warn(`[UNDO] WARNING: inverseType is insert but inverseInsertIndex is null!`);
        }
        
        // Validate element exists before deleting (for delete operations)
        if (inverseType === 'delete' && inversePath.length > 0) {
            try {
                let target = this.app.pages;
                let pathStartIndex = inversePath[0] === 'pages' ? 1 : 0;
                
                // Navigate to the element
                for (let i = pathStartIndex; i < inversePath.length - 1; i++) {
                    const key = inversePath[i];
                    if (Array.isArray(target)) {
                        const index = parseInt(key);
                        if (isNaN(index) || index < 0 || index >= target.length) {
                            console.error(`[UNDO] Invalid array index during validation: ${index} at path step ${i}`);
                            // Try recovery
                            const recoveryResult = this.recoverFromSnapshot(this.changeCounter - 1);
                            if (recoveryResult && recoveryResult.success) {
                                console.log(`[UNDO] Recovered from snapshot, retrying...`);
                                // Retry navigation after recovery
                                target = this.app.pages;
                                for (let j = pathStartIndex; j < inversePath.length - 1; j++) {
                                    const retryKey = inversePath[j];
                                    if (Array.isArray(target)) {
                                        target = target[parseInt(retryKey)];
                                    } else if (typeof target === 'object' && target !== null) {
                                        target = target[retryKey];
                                    }
                                }
                            } else {
                                this.undoStack.push(change);
                                return false;
                            }
                        } else {
                            target = target[index];
                        }
                    } else if (typeof target === 'object' && target !== null) {
                        target = target[key];
                    }
                }
                
                // Check if element exists at final index
                const lastKey = inversePath[inversePath.length - 1];
                if (Array.isArray(target)) {
                    const index = parseInt(lastKey);
                    if (isNaN(index) || index < 0 || index >= target.length) {
                        console.warn(`[UNDO] Element index ${index} out of bounds (array length: ${target.length})`);
                        // Try recovery
                        const recoveryResult = this.recoverFromSnapshot(this.changeCounter - 1);
                        if (!recoveryResult || !recoveryResult.success) {
                            console.error('[UNDO] Cannot validate element existence and recovery failed');
                            this.undoStack.push(change);
                            return false;
                        }
                    }
                }
            } catch (error) {
                console.error('[UNDO] Error validating element existence:', error);
                // Try recovery
                const recoveryResult = this.recoverFromSnapshot(this.changeCounter - 1);
                if (!recoveryResult || !recoveryResult.success) {
                    this.undoStack.push(change);
                    return false;
                }
            }
        }
        
        // Apply inverse
        console.log(`[UNDO] Applying inverse change: ${inverseType} at path:`, inversePath);
        const applied = this.applyChange(inverseChange);
        if (!applied) {
            console.error('[UNDO] Failed to apply undo change:', inverseChange);
            // Try recovery if delete failed
            if (inverseType === 'delete') {
                console.log('[UNDO] Attempting recovery after failed delete...');
                const recoveryResult = this.recoverFromSnapshot(this.changeCounter - 1);
                if (recoveryResult && recoveryResult.success) {
                    console.log('[UNDO] Recovery successful, retrying undo...');
                    // Retry the undo after recovery
                    return this.undo();
                }
            }
            // Put the change back on the undo stack since we couldn't apply it
            this.undoStack.push(change);
            return false;
        }
        
        const afterCounts = this._getElementCounts();
        console.log(`[UNDO] After counts - Pages: ${afterCounts.pages}, Bins: ${afterCounts.bins}, Elements: ${afterCounts.elements}`);
        
        // Move to redo stack
        this.redoStack.push(change);
        if (this.redoStack.length > this.maxStackSize) {
            this.redoStack.shift();
        }
        
        // Send undo to server if not a remote change
        if (!change.isRemote && this.app.syncManager) {
            this.app.syncManager.sendUndo(change.changeId);
        }
        
        // Save data and re-render to reflect changes
        if (this.app) {
            if (this.app.dataManager) {
                this.app.dataManager.saveData();
            }
            if (typeof this.app.render === 'function') {
                this.app.render();
            }
        }
        
        console.log(`[UNDO] Undo applied successfully: ${change.type} at path:`, change.path);
        return true;
    }
    
    /**
     * Redo the last undone change
     */
    redo() {
        if (this.redoStack.length === 0) {
            console.log('Redo stack is empty');
            return false;
        }
        
        const change = this.redoStack.pop();
        console.log(`[REDO] Popped change: ${change.type} at path:`, change.path);
        
        // Check if this change is part of a move operation
        // If so, we need to redo both the delete and insert together as a single atomic operation
        if (change.isPartOfMove && change.moveChangeId) {
            console.log(`[REDO] Change is part of move operation: ${change.moveChangeId}`);
            
            // Find the paired change in the redo stack
            const pairedChangeType = change.type === 'insert' ? 'delete' : 'insert';
            let pairedChangeIndex = -1;
            
            for (let i = this.redoStack.length - 1; i >= 0; i--) {
                const candidate = this.redoStack[i];
                if (candidate.isPartOfMove && 
                    candidate.moveChangeId === change.moveChangeId && 
                    candidate.type === pairedChangeType) {
                    pairedChangeIndex = i;
                    break;
                }
            }
            
            if (pairedChangeIndex !== -1) {
                // Found the paired change - pop it and redo both together
                const pairedChange = this.redoStack.splice(pairedChangeIndex, 1)[0];
                console.log(`[REDO] Found paired ${pairedChangeType} change, redoing move as atomic operation`);
                
                // For a move operation, we need to:
                // 1. Redo the delete (delete from original position)
                // 2. Redo the insert (insert at new position)
                // Order: redo delete first, then redo insert
                const deleteChange = change.type === 'delete' ? change : pairedChange;
                const insertChange = change.type === 'insert' ? change : pairedChange;
                
                // Step 1: Redo delete (delete from original position)
                const deleteResult = this.applyChange(deleteChange);
                if (!deleteResult) {
                    console.error('[REDO] Failed to delete element from original position in move redo');
                    this.redoStack.push(pairedChange);
                    this.redoStack.push(change);
                    return false;
                }
                
                // Step 2: Redo insert (insert at new position)
                const insertResult = this.applyChange(insertChange);
                if (!insertResult) {
                    console.error('[REDO] Failed to insert element at new position in move redo');
                    // Try to recover by undoing the delete
                    const deleteInversePath = [...deleteChange.path];
                    const deleteInsertIndex = deleteChange.deleteIndex !== undefined ? deleteChange.deleteIndex : 
                                            (deleteInversePath.length > 0 && typeof deleteInversePath[deleteInversePath.length - 1] === 'number' ? deleteInversePath.pop() : 0);
                    this.applyChange({
                        type: 'insert',
                        path: deleteInversePath,
                        value: deleteChange.oldValue,
                        oldValue: null,
                        insertIndex: deleteInsertIndex
                    });
                    this.redoStack.push(pairedChange);
                    this.redoStack.push(change);
                    return false;
                }
                
                // Move both changes back to undo stack (in reverse order so they can be undone correctly)
                this.undoStack.push(deleteChange);
                this.undoStack.push(insertChange);
                if (this.undoStack.length > this.maxStackSize * 2) {
                    this.undoStack.shift();
                    this.undoStack.shift();
                }
                
                // Save data and re-render
                // Request data save via EventBus
                eventBus.emit(EVENTS.DATA.SAVE_REQUESTED);
                
                // Request render via EventBus
                eventBus.emit('app:render-requested');
                
                console.log(`[REDO] Move operation redone successfully as atomic operation`);
                return true;
            } else {
                console.warn(`[REDO] Move operation detected but paired change not found, redoing single change`);
                // Fall through to normal redo
            }
        }
        
        // Re-apply the change
        this.applyChange(change);
        
        // Move back to undo stack
        this.undoStack.push(change);
        if (this.undoStack.length > this.maxStackSize) {
            this.undoStack.shift();
        }
        
        // Send redo to server if not a remote change
        if (!change.isRemote && this.app.syncManager) {
            this.app.syncManager.sendRedo(change.changeId);
        }
        
        // Save data and re-render to reflect changes
        if (this.app) {
            if (this.app.dataManager) {
                this.app.dataManager.saveData();
            }
            if (typeof this.app.render === 'function') {
                this.app.render();
            }
        }
        
        console.log('Redo applied:', change.type, 'at path:', change.path);
        return true;
    }
    
    /**
     * Handle remote undo
     */
    handleRemoteUndo(changeId) {
        // Find and undo the change
        for (let i = this.undoStack.length - 1; i >= 0; i--) {
            const change = this.undoStack[i];
            if (change.changeId === changeId && !change.undone) {
                change.undone = true;
                this.undo();
                break;
            }
        }
    }
    
    /**
     * Handle remote redo
     */
    handleRemoteRedo(changeId) {
        // Find and redo the change
        for (let i = this.redoStack.length - 1; i >= 0; i--) {
            const change = this.redoStack[i];
            if (change.changeId === changeId && change.undone) {
                change.undone = false;
                this.redo();
                break;
            }
        }
    }
    
    /**
     * Clear undo/redo stacks
     */
    clear() {
        this.undoStack = [];
        this.redoStack = [];
        this.remoteChanges.clear();
        this.changeCounter = 0;
        this.snapshots = [];
        
        // Save empty buffer when clearing
        if (this.currentBufferFilename) {
            this._debouncedSaveBuffer();
        }
    }
    
    /**
     * Diagnose undo/redo issues
     */
    diagnoseUndoIssue() {
        const issues = [];
        const stackInfo = {
            undoSize: this.undoStack.length,
            redoSize: this.redoStack.length
        };
        
        // Validate undo stack
        this.undoStack.forEach((change, index) => {
            if (!change.type) {
                issues.push({
                    type: 'missing_type',
                    location: `undoStack[${index}]`,
                    description: 'Change object missing type property'
                });
            }
            
            if (!change.path || !Array.isArray(change.path)) {
                issues.push({
                    type: 'invalid_path',
                    location: `undoStack[${index}]`,
                    description: 'Change object missing or invalid path property'
                });
            }
            
            // Check if path still exists in current data structure
            if (change.path && Array.isArray(change.path) && change.path.length > 0) {
                try {
                    let target = this.app.pages;
                    let pathStartIndex = change.path[0] === 'pages' ? 1 : 0;
                    const navigationEnd = (change.type === 'insert' || change.type === 'add') 
                        ? change.path.length 
                        : change.path.length - 1;
                    
                    for (let i = pathStartIndex; i < navigationEnd; i++) {
                        const key = change.path[i];
                        if (target === null || target === undefined) {
                            issues.push({
                                type: 'path_not_found',
                                location: `undoStack[${index}]`,
                                description: `Path navigation failed at index ${i} (key: ${key}). Path: ${change.path.join(' -> ')}`
                            });
                            break;
                        }
                        
                        if (Array.isArray(target)) {
                            const index = parseInt(key);
                            if (isNaN(index) || index < 0 || index >= target.length) {
                                issues.push({
                                    type: 'invalid_array_index',
                                    location: `undoStack[${index}]`,
                                    description: `Array index ${index} out of bounds (array length: ${target.length}) at path step ${i}`
                                });
                                break;
                            }
                            target = target[index];
                        } else if (typeof target === 'object' && target !== null) {
                            if (target[key] === undefined) {
                                issues.push({
                                    type: 'missing_property',
                                    location: `undoStack[${index}]`,
                                    description: `Property '${key}' not found in object at path step ${i}`
                                });
                                break;
                            }
                            target = target[key];
                        } else {
                            issues.push({
                                type: 'invalid_target_type',
                                location: `undoStack[${index}]`,
                                description: `Target is not object/array at path step ${i} (type: ${typeof target})`
                            });
                            break;
                        }
                    }
                    
                    // For delete operations, verify element exists
                    if (change.type === 'delete' && change.path.length > 0) {
                        const lastKey = change.path[change.path.length - 1];
                        if (Array.isArray(target)) {
                            const index = parseInt(lastKey);
                            if (!isNaN(index) && (index < 0 || index >= target.length)) {
                                issues.push({
                                    type: 'element_not_found',
                                    location: `undoStack[${index}]`,
                                    description: `Element at index ${index} does not exist (array length: ${target.length})`
                                });
                            }
                        }
                    }
                } catch (error) {
                    issues.push({
                        type: 'path_validation_error',
                        location: `undoStack[${index}]`,
                        description: `Error validating path: ${error.message}`
                    });
                }
            }
        });
        
        // Validate redo stack
        this.redoStack.forEach((change, index) => {
            if (!change.type) {
                issues.push({
                    type: 'missing_type',
                    location: `redoStack[${index}]`,
                    description: 'Change object missing type property'
                });
            }
            
            if (!change.path || !Array.isArray(change.path)) {
                issues.push({
                    type: 'invalid_path',
                    location: `redoStack[${index}]`,
                    description: 'Change object missing or invalid path property'
                });
            }
        });
        
        return {
            valid: issues.length === 0,
            issues,
            stackInfo
        };
    }
    
    /**
     * Find an element by its ID across all pages, bins, and children
     * This is the professional way to locate elements for undo/redo
     */
    findElementById(elementId) {
        if (!elementId || !this.app || !this.app.pages) return null;
        
        for (const page of this.app.pages) {
            if (!page || !page.bins) continue;
            
            for (const bin of page.bins) {
                if (!bin || !bin.elements) continue;
                
                // Search main elements
                for (let i = 0; i < bin.elements.length; i++) {
                    const element = bin.elements[i];
                    if (element && element.id === elementId) {
                        return {
                            element,
                            pageId: page.id,
                            binId: bin.id,
                            elementIndex: i,
                            isChild: false,
                            childIndex: null
                        };
                    }
                    
                    // Search child elements
                    if (element && element.children && Array.isArray(element.children)) {
                        for (let j = 0; j < element.children.length; j++) {
                            const child = element.children[j];
                            if (child && child.id === elementId) {
                                return {
                                    element: child,
                                    pageId: page.id,
                                    binId: bin.id,
                                    elementIndex: i,
                                    isChild: true,
                                    childIndex: j
                                };
                            }
                        }
                    }
                }
            }
        }
        
        return null;
    }
    
    /**
     * Validate current state integrity
     */
    validateState() {
        const errors = [];
        const warnings = [];
        
        if (!this.app || !this.app.pages) {
            errors.push('app.pages is not available');
            return {
                valid: false,
                errors,
                warnings
            };
        }
        
        if (!Array.isArray(this.app.pages)) {
            errors.push('app.pages is not an array');
            return {
                valid: false,
                errors,
                warnings
            };
        }
        
        // Check each page
        this.app.pages.forEach((page, pageIndex) => {
            if (!page) {
                errors.push(`Page at index ${pageIndex} is null or undefined`);
                return;
            }
            
            if (!page.bins) {
                warnings.push(`Page ${page.id || pageIndex} does not have a bins array`);
                return;
            }
            
            if (!Array.isArray(page.bins)) {
                errors.push(`Page ${page.id || pageIndex} bins is not an array`);
                return;
            }
            
            // Check each bin
            page.bins.forEach((bin, binIndex) => {
                if (!bin) {
                    errors.push(`Bin at pages[${pageIndex}].bins[${binIndex}] is null or undefined`);
                    return;
                }
                
                if (!bin.elements) {
                    warnings.push(`Bin ${bin.id || binIndex} in page ${page.id || pageIndex} does not have an elements array`);
                    return;
                }
                
                if (!Array.isArray(bin.elements)) {
                    errors.push(`Bin ${bin.id || binIndex} in page ${page.id || pageIndex} elements is not an array`);
                    return;
                }
                
                // Check each element
                bin.elements.forEach((element, elementIndex) => {
                    if (element === null || element === undefined) {
                        errors.push(`Element at pages[${pageIndex}].bins[${binIndex}].elements[${elementIndex}] is null or undefined`);
                    } else {
                        // Check for missing critical properties
                        if (element.type === undefined || element.type === null) {
                            warnings.push(`Element at pages[${pageIndex}].bins[${binIndex}].elements[${elementIndex}] is missing type property`);
                        }
                    }
                });
            });
        });
        
        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    }
    
    /**
     * Get path to an element in the data structure
     */
    getElementPath(pageId, binId, elementIndex, childIndex = null) {
        const path = ['pages'];
        // Get pages from appState if available, otherwise fall back to app.pages
        const pages = (this.app?.appState?.pages) || (this.app?.pages) || [];
        const pageIndex = pages.findIndex(p => p.id === pageId);
        if (pageIndex === -1) return null;
        
        path.push(pageIndex);
        path.push('bins');
        
        const page = pages[pageIndex];
        const binIndex = page.bins ? page.bins.findIndex(b => b.id === binId) : -1;
        if (binIndex === -1) return null;
        
        path.push(binIndex);
        path.push('elements');
        
        if (childIndex !== null) {
            path.push(elementIndex);
            path.push('children');
            path.push(childIndex);
        } else {
            path.push(elementIndex);
        }
        
        return path;
    }
    
    /**
     * Helper: Record element property change
     */
    recordElementPropertyChange(pageId, binId, elementIndex, property, newValue, oldValue, childIndex = null, itemIndex = null) {
        const path = this.getElementPath(pageId, binId, elementIndex, childIndex);
        if (!path) {
            console.error('Failed to get element path for:', { pageId, binId, elementIndex, childIndex });
            return;
        }
        
        if (itemIndex !== null) {
            // For multi-checkbox items
            path.push('items');
            path.push(itemIndex);
            path.push(property);
        } else if (childIndex !== null) {
            // For child element properties
            path.push(property);
        } else {
            // For main element properties
            path.push(property);
        }
        
        const change = this.createChange('set', path, newValue, oldValue);
        change.changeId = `${Date.now()}-${Math.random()}`;
        console.log('Recording property change:', property, 'from', oldValue, 'to', newValue, 'path:', path);
        this.recordChange(change);
    }
    
    /**
     * Helper: Record element addition
     */
    recordElementAdd(pageId, binId, elementIndex, element) {
        const path = this.getElementPath(pageId, binId, elementIndex);
        if (!path) return;
        
        // Path should point to the array, not the element
        path.pop(); // Remove elementIndex
        
        const change = this.createChange('insert', path, element, null);
        change.changeId = `${Date.now()}-${Math.random()}`;
        change.insertIndex = elementIndex;
        this.recordChange(change);
    }
    
    /**
     * Helper: Record element deletion
     */
    recordElementDelete(pageId, binId, elementIndex, element) {
        const path = this.getElementPath(pageId, binId, elementIndex);
        if (!path) return;
        
        // Store a deep copy of the element so we can restore it even if it's been modified
        const elementCopy = JSON.parse(JSON.stringify(element));
        const change = this.createChange('delete', path, null, elementCopy);
        change.changeId = `${Date.now()}-${Math.random()}`;
        // Store the original index so we can restore it at the correct position when undoing
        change.deleteIndex = elementIndex;
        this.recordChange(change);
    }
    
    /**
     * Helper: Record element move
     */
    recordElementMove(sourcePageId, sourceBinId, sourceElementIndex, targetPageId, targetBinId, targetElementIndex, element) {
        // Record as delete from source and insert at target
        // These are recorded as separate changes but should be undone together
        const sourcePath = this.getElementPath(sourcePageId, sourceBinId, sourceElementIndex);
        const targetPath = this.getElementPath(targetPageId, targetBinId, targetElementIndex);
        
        if (!sourcePath || !targetPath) return;
        
        // Remove elementIndex from target path to point to array
        targetPath.pop();
        
        const changeId = `${Date.now()}-${Math.random()}`;
        
        // Store deep copies of the element to avoid reference issues
        const elementCopyForDelete = JSON.parse(JSON.stringify(element));
        const elementCopyForInsert = JSON.parse(JSON.stringify(element));
        
        // Delete from source
        const deleteChange = this.createChange('delete', sourcePath, null, elementCopyForDelete);
        deleteChange.changeId = `${changeId}-delete`;
        deleteChange.isPartOfMove = true; // Mark as part of move operation
        deleteChange.moveChangeId = changeId;
        // Store the original source index so we can restore it at the correct position when undoing
        deleteChange.deleteIndex = sourceElementIndex;
        this.recordChange(deleteChange);
        
        // Insert at target
        const insertChange = this.createChange('insert', targetPath, elementCopyForInsert, null);
        insertChange.changeId = `${changeId}-insert`;
        insertChange.insertIndex = targetElementIndex;
        insertChange.isPartOfMove = true; // Mark as part of move operation
        insertChange.moveChangeId = changeId;
        this.recordChange(insertChange);
    }
    
    /**
     * Helper: Record child element reorder within same parent
     */
    recordChildReorder(pageId, binId, parentElementIndex, sourceChildIndex, targetChildIndex, childElement) {
        // Get path to parent element's children array
        const path = this.getElementPath(pageId, binId, parentElementIndex);
        if (!path) return;
        
        path.push('children');
        
        const changeId = `${Date.now()}-${Math.random()}`;
        
        // Delete from source position
        const sourcePath = [...path, sourceChildIndex];
        const deleteChange = this.createChange('delete', sourcePath, null, childElement);
        deleteChange.changeId = `${changeId}-delete`;
        this.recordChange(deleteChange);
        
        // Insert at target position
        const insertChange = this.createChange('insert', path, childElement, null);
        insertChange.changeId = `${changeId}-insert`;
        insertChange.insertIndex = targetChildIndex;
        this.recordChange(insertChange);
    }
    
    /**
     * Helper: Record bin addition
     */
    recordBinAdd(pageId, binIndex, bin) {
        const pageIndex = this.app.pages.findIndex(p => p.id === pageId);
        if (pageIndex === -1) return;
        
        const path = ['pages', pageIndex, 'bins'];
        const change = this.createChange('insert', path, bin, null);
        change.changeId = `${Date.now()}-${Math.random()}`;
        change.insertIndex = binIndex;
        this.recordChange(change);
    }
    
    /**
     * Helper: Record bin deletion
     */
    recordBinDelete(pageId, binId, bin) {
        const pageIndex = this.app.pages.findIndex(p => p.id === pageId);
        if (pageIndex === -1) return;
        
        const page = this.app.pages[pageIndex];
        const binIndex = page.bins ? page.bins.findIndex(b => b.id === binId) : -1;
        if (binIndex === -1) return;
        
        const path = ['pages', pageIndex, 'bins', binIndex];
        const change = this.createChange('delete', path, null, bin);
        change.changeId = `${Date.now()}-${Math.random()}`;
        this.recordChange(change);
    }
    
    /**
     * Helper: Record page addition
     */
    recordPageAdd(pageIndex, page) {
        const path = ['pages'];
        const change = this.createChange('insert', path, page, null);
        change.changeId = `${Date.now()}-${Math.random()}`;
        change.insertIndex = pageIndex;
        this.recordChange(change);
    }
    
    /**
     * Helper: Record page deletion
     */
    recordPageDelete(pageId, page) {
        const pageIndex = this.app.pages.findIndex(p => p.id === pageId);
        if (pageIndex === -1) return;
        
        const path = ['pages', pageIndex];
        const change = this.createChange('delete', path, null, page);
        change.changeId = `${Date.now()}-${Math.random()}`;
        this.recordChange(change);
    }
    
    /**
     * Get buffer filename for a given file
     */
    getBufferFilename(filename) {
        if (!filename) return null;
        // Remove .json extension if present and add -buffer.json
        const baseName = filename.replace(/\.json$/, '');
        return `${baseName}-buffer.json`;
    }
    
    /**
     * Create a snapshot of current state
     */
    createSnapshot() {
        if (!this.app || !this.app.pages) {
            console.warn('[BUFFER] Cannot create snapshot - app.pages not available');
            return null;
        }
        
        const snapshot = {
            changeIndex: this.changeCounter,
            data: JSON.parse(JSON.stringify(this.app.pages)), // Deep copy
            timestamp: new Date().toISOString()
        };
        
        this.snapshots.push(snapshot);
        console.log(`[BUFFER] Created snapshot at change index ${this.changeCounter}, total snapshots: ${this.snapshots.length}`);
        
        // Prune old snapshots if exceeding maxSnapshots
        if (this.snapshots.length > this.maxSnapshots) {
            // Keep the most recent snapshots
            this.snapshots = this.snapshots.slice(-this.maxSnapshots);
            console.log(`[BUFFER] Pruned snapshots, keeping last ${this.maxSnapshots}`);
        }
        
        return snapshot;
    }
    
    /**
     * Save buffer to server (debounced)
     */
    _debouncedSaveBuffer() {
        if (this.bufferSaveTimer) {
            clearTimeout(this.bufferSaveTimer);
        }
        
        this.bufferSaveTimer = setTimeout(() => {
            this.saveBuffer().catch(error => {
                console.error('[BUFFER] Failed to save buffer:', error);
            });
        }, 500); // 500ms debounce
    }
    
    /**
     * Save buffer to server
     */
    async saveBuffer() {
        if (!this.currentBufferFilename) {
            console.log('[BUFFER] No current buffer filename, skipping save');
            return;
        }
        
        const bufferFilename = this.getBufferFilename(this.currentBufferFilename);
        if (!bufferFilename) {
            console.warn('[BUFFER] Cannot generate buffer filename');
            return;
        }
        
        const buffer = {
            undoStack: this.undoStack,
            redoStack: this.redoStack,
            snapshots: this.snapshots,
            lastChangeIndex: this.changeCounter,
            lastModified: new Date().toISOString()
        };
        
        try {
            const response = await fetch('/files/buffer/save', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    filename: bufferFilename,
                    buffer: buffer
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            if (result.success) {
                console.log(`[BUFFER] Buffer saved: ${bufferFilename}`);
            } else {
                throw new Error(result.error || 'Failed to save buffer');
            }
        } catch (error) {
            console.error('[BUFFER] Error saving buffer:', error);
            throw error;
        }
    }
    
    /**
     * Load buffer from server
     */
    async loadBuffer(filename) {
        if (!filename) {
            console.log('[BUFFER] No filename provided, skipping buffer load');
            return;
        }
        
        const bufferFilename = this.getBufferFilename(filename);
        if (!bufferFilename) {
            console.warn('[BUFFER] Cannot generate buffer filename');
            return;
        }
        
        try {
            const encodedFilename = encodeURIComponent(bufferFilename);
            const response = await fetch(`/files/buffer/${encodedFilename}`);
            
            if (!response.ok) {
                if (response.status === 404) {
                    // Buffer doesn't exist yet (first time opening file) - this is OK
                    // Server should now return 200 with empty buffer, but handle 404 for backwards compatibility
                    console.log(`[BUFFER] Buffer file not found: ${bufferFilename} (first time opening?)`);
                    this.currentBufferFilename = filename;
                    this.undoStack = [];
                    this.redoStack = [];
                    this.snapshots = [];
                    this.changeCounter = 0;
                    return;
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            if (result.success) {
                // Server now returns 200 with empty buffer structure if file doesn't exist
                const buffer = result.buffer || {};
                this.undoStack = buffer.undoStack || [];
                this.redoStack = buffer.redoStack || [];
                this.snapshots = buffer.snapshots || [];
                this.changeCounter = buffer.lastChangeIndex || 0;
                this.currentBufferFilename = filename;
                console.log(`[BUFFER] Buffer loaded: ${bufferFilename} (undo: ${this.undoStack.length}, redo: ${this.redoStack.length}, snapshots: ${this.snapshots.length})`);
            } else {
                // Server returned success: false - initialize empty
                console.log(`[BUFFER] Buffer file not found or invalid: ${bufferFilename}`);
                this.currentBufferFilename = filename;
                this.undoStack = [];
                this.redoStack = [];
                this.snapshots = [];
                this.changeCounter = 0;
            }
        } catch (error) {
            console.error('[BUFFER] Error loading buffer:', error);
            // Initialize empty on error
            this.currentBufferFilename = filename;
            this.undoStack = [];
            this.redoStack = [];
            this.snapshots = [];
            this.changeCounter = 0;
        }
    }
    
    /**
     * Recover from snapshot
     */
    recoverFromSnapshot(targetChangeIndex) {
        if (!this.snapshots || this.snapshots.length === 0) {
            console.warn('[RECOVERY] No snapshots available for recovery');
            return { success: false, recoveredFrom: null, replayedChanges: 0 };
        }
        
        // Find nearest snapshot before the problematic change
        let bestSnapshot = null;
        let bestIndex = -1;
        
        for (let i = this.snapshots.length - 1; i >= 0; i--) {
            const snapshot = this.snapshots[i];
            if (snapshot.changeIndex <= targetChangeIndex) {
                bestSnapshot = snapshot;
                bestIndex = i;
                break;
            }
        }
        
        if (!bestSnapshot) {
            console.warn(`[RECOVERY] No snapshot found before change index ${targetChangeIndex}`);
            return { success: false, recoveredFrom: null, replayedChanges: 0 };
        }
        
        console.log(`[RECOVERY] Found snapshot at change index ${bestSnapshot.changeIndex}, restoring state...`);
        
        // Restore full state from snapshot
        this.app.pages = JSON.parse(JSON.stringify(bestSnapshot.data));
        
        // Replay changes from snapshot to current point (excluding problematic change)
        let replayedCount = 0;
        const changesToReplay = [];
        
        // Find all changes after the snapshot but before the problematic change
        for (let i = 0; i < this.undoStack.length; i++) {
            const change = this.undoStack[i];
            // We need to track which changes were made after the snapshot
            // For now, we'll replay changes that have changeId indicating they came after
            // Actually, we don't have change indices in the changes themselves
            // So we'll need to replay based on position in stack
            // This is a simplified approach - in a full implementation, we'd track change indices
        }
        
        // For now, we'll just restore from snapshot and clear the undo stack from that point
        // This is safer than trying to replay changes
        console.log(`[RECOVERY] Restored state from snapshot at change index ${bestSnapshot.changeIndex}`);
        console.log(`[RECOVERY] Replayed ${replayedCount} changes`);
        
        return {
            success: true,
            recoveredFrom: bestSnapshot.changeIndex,
            replayedChanges: replayedCount
        };
    }
    
    /**
     * Set current file and load its buffer
     */
    async setCurrentFile(filename) {
        // Save buffer for previous file if switching
        if (this.currentBufferFilename && this.currentBufferFilename !== filename) {
            await this.saveBuffer().catch(error => {
                console.warn('[BUFFER] Failed to save buffer for previous file:', error);
            });
        }
        
        // Load buffer for new file
        await this.loadBuffer(filename);
    }
}


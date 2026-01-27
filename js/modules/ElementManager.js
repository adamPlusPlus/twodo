// ElementManager.js - Handles element-related operations
import { getService, SERVICES } from '../core/AppServices.js';
import { ItemHierarchy } from '../utils/ItemHierarchy.js';
import { ElementFactory } from '../utils/ElementFactory.js';
import { ElementQueries } from '../utils/ElementQueries.js';
import { ElementValidator } from '../utils/ElementValidator.js';
import { ElementEventEmitter } from '../utils/ElementEventEmitter.js';

export class ElementManager {
    constructor() {
        // Get services via ServiceLocator
        // Use lazy access for services that might not be registered yet
        this.appState = getService(SERVICES.APP_STATE);
        this.undoRedoManager = getService(SERVICES.UNDO_REDO_MANAGER);
        this.dataManager = getService(SERVICES.DATA_MANAGER);
        // ElementTypeManager is created later, so access lazily
        this._elementTypeManager = null;
    }
    
    /**
     * Get ElementTypeManager (lazy access since it's created after ElementManager)
     */
    get elementTypeManager() {
        if (!this._elementTypeManager) {
            try {
                this._elementTypeManager = getService(SERVICES.ELEMENT_TYPE_MANAGER);
            } catch (e) {
                // Service not available yet, return null
                return null;
            }
        }
        return this._elementTypeManager;
    }
    
    addElement(pageId, binId, elementType) {
        const docValidation = ElementValidator.validateDocumentExists(this.appState, pageId);
        if (!docValidation.valid) return;
        const document = docValidation.document;
        
        const groupValidation = ElementValidator.validateGroupExists(document, binId);
        if (!groupValidation.valid) return;
        const group = groupValidation.group;
        
        const newElement = ElementFactory.createTemplate(elementType, this.elementTypeManager);
        ElementFactory.initializeElement(newElement);
        
        // Use CreateOperation if available
        const semanticOpManager = getService(SERVICES.SEMANTIC_OPERATION_MANAGER);
        
        if (semanticOpManager) {
            const index = group.items ? group.items.length : 0;
            const operation = semanticOpManager.createOperation('create', newElement.id, {
                type: elementType,
                parentId: null,
                index: index,
                itemData: newElement
            });
            
            if (operation) {
                const result = semanticOpManager.applyOperation(operation);
                if (result && result.success) {
                    // Record for undo/redo
                    if (this.undoRedoManager) {
                        this.undoRedoManager.recordOperation(operation);
                    }
                    
                    const newElementIndex = group.items ? group.items.length - 1 : 0;
                    
                    ElementEventEmitter.emitDataSaveRequested();
                    ElementEventEmitter.emitElementCreated(pageId, binId, newElementIndex, newElement);
                    ElementEventEmitter.emitRenderRequested();
                    ElementEventEmitter.emitEditModalRequested(pageId, binId, newElementIndex, newElement);
                    
                    return;
                }
            }
        }
        
        // Fallback to direct array push if operation system not available
        const items = ElementQueries.ensureItemsArray(group);
        const newElementIndex = items.length;
        items.push(newElement);
        
        // Record undo/redo change
        if (this.undoRedoManager) {
            this.undoRedoManager.recordElementAdd(pageId, binId, newElementIndex, newElement);
        }
        
        ElementEventEmitter.emitDataSaveRequested();
        ElementEventEmitter.emitElementCreated(pageId, binId, newElementIndex, newElement);
        ElementEventEmitter.emitRenderRequested();
        
        // Automatically open edit modal for the newly created element via event
        setTimeout(() => {
            ElementEventEmitter.emitShowEditModal(pageId, binId, newElementIndex, newElement);
            // Focus on the text input
            setTimeout(() => {
                ElementEventEmitter.emitFocusInput('edit-text', true);
            }, 50);
        }, 50);
    }
    
    createElementTemplate(type) {
        return ElementFactory.createTemplate(type, this.elementTypeManager);
    }
    
    toggleElement(pageId, binId, elementIndex, subtaskIndex = null, itemIndex = null) {
        // Handle nested children - elementIndex might be a string like "0-1" for nested children
        const parsed = ElementQueries.parseNestedIndex(elementIndex);
        const actualPageId = pageId;
        const actualBinId = binId;
        const actualElementIndex = parsed.elementIndex;
        const childIndex = parsed.childIndex;
        
        const docValidation = ElementValidator.validateDocumentExists(this.appState, actualPageId);
        if (!docValidation.valid) return;
        const document = docValidation.document;
        
        const groupValidation = ElementValidator.validateGroupExists(document, actualBinId);
        if (!groupValidation.valid) return;
        const group = groupValidation.group;
        
        const items = ElementQueries.ensureItemsArray(group);
        
        const elementValidation = ElementValidator.validateElementExists(group, actualElementIndex);
        if (!elementValidation.valid) return;
        const element = elementValidation.element;
        const itemIndexMap = ItemHierarchy.buildItemIndex(items);
        
        // If we have a childIndex, we're toggling a nested child
        if (childIndex !== null) {
            const childItems = ItemHierarchy.getChildItems(element, itemIndexMap);
            const child = childItems[childIndex];
            if (!child) {
                return;
            }
            const oldValue = child.completed;
            child.completed = !child.completed;
            element.completed = childItems.every(ch => ch.completed);
            
            // Record undo/redo change
            if (this.undoRedoManager) {
                this.undoRedoManager.recordElementPropertyChange(pageId, binId, actualElementIndex, 'completed', child.completed, oldValue, childIndex);
                this.undoRedoManager.recordElementPropertyChange(pageId, binId, actualElementIndex, 'completed', element.completed, !element.completed);
            }
        } else if (itemIndex !== null && element.items) {
            // Toggle multi-checkbox item
            const oldItemValue = element.items[itemIndex].completed;
            element.items[itemIndex].completed = !element.items[itemIndex].completed;
            const oldElementValue = element.completed;
            element.completed = element.items.every(item => item.completed);
            
            // Record undo/redo change
            if (this.undoRedoManager) {
                this.undoRedoManager.recordElementPropertyChange(pageId, binId, actualElementIndex, 'completed', element.items[itemIndex].completed, oldItemValue, null, itemIndex);
                this.undoRedoManager.recordElementPropertyChange(pageId, binId, actualElementIndex, 'completed', element.completed, oldElementValue);
            }
        } else if (subtaskIndex !== null) {
            // Legacy subtask support (for backward compatibility)
            if (element.subtasks && element.subtasks[subtaskIndex]) {
                const oldValue = element.subtasks[subtaskIndex].completed;
                element.subtasks[subtaskIndex].completed = !element.subtasks[subtaskIndex].completed;
                element.completed = element.subtasks.every(st => st.completed);
                
                // Record undo/redo change
                if (this.undoRedoManager) {
                    this.undoRedoManager.recordElementPropertyChange(pageId, binId, actualElementIndex, 'completed', element.subtasks[subtaskIndex].completed, oldValue, subtaskIndex);
                    this.undoRedoManager.recordElementPropertyChange(pageId, binId, actualElementIndex, 'completed', element.completed, !element.completed);
                }
            } else {
                const childItems = ItemHierarchy.getChildItems(element, itemIndexMap);
                if (!childItems[subtaskIndex]) {
                    return;
                }
                // Use childIds if subtasks don't exist
                const oldValue = childItems[subtaskIndex].completed;
                childItems[subtaskIndex].completed = !childItems[subtaskIndex].completed;
                element.completed = childItems.every(ch => ch.completed);
                
                // Record undo/redo change
                if (this.undoRedoManager) {
                    this.undoRedoManager.recordElementPropertyChange(pageId, binId, actualElementIndex, 'completed', childItems[subtaskIndex].completed, oldValue, subtaskIndex);
                    this.undoRedoManager.recordElementPropertyChange(pageId, binId, actualElementIndex, 'completed', element.completed, !element.completed);
                }
            }
        } else {
            // Toggle main element
            const wasChecked = element.completed;
            const oldValue = element.completed;
            element.completed = !element.completed;
            // Record undo/redo change for main element
            if (this.undoRedoManager) {
                this.undoRedoManager.recordElementPropertyChange(pageId, binId, actualElementIndex, 'completed', element.completed, oldValue);
            }
            
            const childItems = ItemHierarchy.getChildItems(element, itemIndexMap);
            childItems.forEach((child, idx) => {
                if (child.repeats !== false) {
                    const oldChildValue = child.completed;
                    child.completed = element.completed;
                    // Record child changes
                    if (this.undoRedoManager && oldChildValue !== child.completed) {
                        this.undoRedoManager.recordElementPropertyChange(pageId, binId, actualElementIndex, 'completed', child.completed, oldChildValue, idx);
                    }
                }
            });
            // Legacy subtask support
            if (element.subtasks) {
                element.subtasks.forEach((st, idx) => {
                    if (st.repeats !== false) {
                        const oldSubtaskValue = st.completed;
                        st.completed = element.completed;
                        // Record subtask changes
                        if (this.undoRedoManager && oldSubtaskValue !== st.completed) {
                            this.undoRedoManager.recordElementPropertyChange(pageId, binId, actualElementIndex, 'completed', st.completed, oldSubtaskValue, idx);
                        }
                    }
                });
            }
            
            // Emit events for automation
            if (element.completed && !wasChecked) {
                // Element was just completed
                ElementEventEmitter.emitElementCompleted(actualPageId, actualBinId, actualElementIndex, element);
            }
            
            // Always emit updated event
            ElementEventEmitter.emitElementUpdated(actualPageId, actualBinId, actualElementIndex, element);
            
            // Update tracker elements if any exist (only if element was just checked)
            if (element.completed && !wasChecked) {
                this.updateTrackers(actualPageId, actualBinId, actualElementIndex, true);
            } else {
                // Still update to refresh page mode counts
                this.updateTrackers(actualPageId, actualBinId);
            }
        }
        
        // Don't delete one-time tasks immediately - they'll be deleted on day reset if completed
        
        ElementEventEmitter.emitDataSaveRequested();
        ElementEventEmitter.emitRenderRequested();
    }
    
    updateTrackers(pageId, binId, toggledElementIndex = null, wasChecked = false) {
        const docValidation = ElementValidator.validateDocumentExists(this.appState, pageId);
        if (!docValidation.valid) return;
        const document = docValidation.document;
        
        const groupValidation = ElementValidator.validateGroupExists(document, binId);
        if (!groupValidation.valid) return;
        const group = groupValidation.group;
        
        const items = ElementQueries.ensureItemsArray(group);
        
        const today = new Date().toISOString().split('T')[0];
        
        items.forEach((trackerElement, trackerIdx) => {
            if (trackerElement.type === 'tracker') {
                if (trackerElement.mode === 'daily') {
                    // Track daily completions - one check per day per element
                    if (!trackerElement.dailyCompletions) trackerElement.dailyCompletions = {};
                    if (!trackerElement.dailyCompletions[today]) {
                        trackerElement.dailyCompletions[today] = {};
                    }
                    
                    // If an element was just checked, mark it as completed today
                    if (toggledElementIndex !== null && wasChecked) {
                        const elementKey = `${pageId}-${binId}-${toggledElementIndex}`;
                        if (!trackerElement.dailyCompletions[today][elementKey]) {
                            trackerElement.dailyCompletions[today][elementKey] = true;
                        }
                    }
                    
                    // Count unique elements completed today
                    const todayCount = Object.keys(trackerElement.dailyCompletions[today] || {}).length;
                    trackerElement.dailyCompletions[today]._count = todayCount;
                } else if (trackerElement.mode === 'page') {
                    // Count unique checked elements in the page (each element counts once)
                    let uniqueCount = 0;
                    items.forEach((el, elIdx) => {
                        if (el.completed && el.type !== 'tracker') {
                            uniqueCount++;
                        }
                    });
                    // Store the count
                    if (!trackerElement.pageCompletions) trackerElement.pageCompletions = {};
                    trackerElement.pageCompletions.count = uniqueCount;
                }
            }
        });
    }
    
    addMultiCheckboxItem(pageId, binId, elementIndex) {
        const docValidation = ElementValidator.validateDocumentExists(this.appState, pageId);
        if (!docValidation.valid) return;
        const document = docValidation.document;
        
        const groupValidation = ElementValidator.validateGroupExists(document, binId);
        if (!groupValidation.valid) return;
        const group = groupValidation.group;
        
        const items = ElementQueries.ensureItemsArray(group);
        
        const elementValidation = ElementValidator.validateElementExists(group, elementIndex);
        if (!elementValidation.valid) return;
        const element = elementValidation.element;
        if (element && element.items) {
            const newItem = {
                text: 'New item',
                completed: false,
                funModifier: ''
            };
            const itemIndex = element.items.length;
            element.items.push(newItem);
            
            // Record undo/redo change
            if (this.undoRedoManager) {
                const path = this.undoRedoManager.getElementPath(pageId, binId, elementIndex);
                if (path) {
                    path.push('items');
                    const change = this.undoRedoManager.createChange('add', path, newItem, null);
                    change.changeId = `${Date.now()}-${Math.random()}`;
                    this.undoRedoManager.recordChange(change);
                }
            }
            
            this.dataManager.saveData();
            ElementEventEmitter.emitRenderRequested();
        }
    }
    
    removeMultiCheckboxItem(pageId, binId, elementIndex, itemIndex) {
        const docValidation = ElementValidator.validateDocumentExists(this.appState, pageId);
        if (!docValidation.valid) return;
        const document = docValidation.document;
        
        const groupValidation = ElementValidator.validateGroupExists(document, binId);
        if (!groupValidation.valid) return;
        const group = groupValidation.group;
        
        const items = ElementQueries.ensureItemsArray(group);
        
        const elementValidation = ElementValidator.validateElementExists(group, elementIndex);
        if (!elementValidation.valid) return;
        const element = elementValidation.element;
        if (element && element.items && element.items.length > 1) {
            const removedItem = element.items[itemIndex];
            const oldCompleted = element.completed;
            element.items.splice(itemIndex, 1);
            element.completed = element.items.length > 0 && element.items.every(item => item.completed);
            
            // Record undo/redo change
            if (this.undoRedoManager) {
                const path = this.undoRedoManager.getElementPath(pageId, binId, elementIndex);
                if (path) {
                    path.push('items');
                    path.push(itemIndex);
                    const change = this.undoRedoManager.createChange('delete', path, null, removedItem);
                    change.changeId = `${Date.now()}-${Math.random()}`;
                    this.undoRedoManager.recordChange(change);
                    
                    // Also record completed state change if it changed
                    if (oldCompleted !== element.completed) {
                        this.undoRedoManager.recordElementPropertyChange(pageId, binId, elementIndex, 'completed', element.completed, oldCompleted);
                    }
                }
            }
            
            this.dataManager.saveData();
            ElementEventEmitter.emitRenderRequested();
        }
    }
    
    addElementAfter(pageId, binId, elementIndex, elementType) {
        const docValidation = ElementValidator.validateDocumentExists(this.appState, pageId);
        if (!docValidation.valid) return;
        const document = docValidation.document;
        
        const groupValidation = ElementValidator.validateGroupExists(document, binId);
        if (!groupValidation.valid) return;
        const group = groupValidation.group;
        
        const items = ElementQueries.ensureItemsArray(group);
        
        const newElement = ElementFactory.createTemplate(elementType, this.elementTypeManager);
        ElementFactory.initializeElement(newElement);
        
        const insertIndex = elementIndex + 1;
        items.splice(insertIndex, 0, newElement);
        
        // Record undo/redo change
        if (this.undoRedoManager) {
            this.undoRedoManager.recordElementAdd(pageId, binId, insertIndex, newElement);
        }
        
        ElementEventEmitter.emitDataSaveRequested();
        ElementEventEmitter.emitRenderRequested();
    }
}

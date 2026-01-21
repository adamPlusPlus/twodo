// ElementManager.js - Handles element-related operations
import { eventBus } from '../core/EventBus.js';
import { EVENTS } from '../core/AppEvents.js';
import { getService, SERVICES } from '../core/AppServices.js';
import { ItemHierarchy } from '../utils/ItemHierarchy.js';

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
        const document = this.appState.documents.find(p => p.id === pageId);
        if (!document) return;
        
        const group = document.groups?.find(b => b.id === binId);
        if (!group) return;
        
        const newElement = this.createElementTemplate(elementType);
        newElement.parentId = null;
        newElement.childIds = Array.isArray(newElement.childIds) ? newElement.childIds : [];
        // Generate unique ID for the element
        if (!newElement.id) {
            newElement.id = `element-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        }
        if (!group.items) group.items = [];
        const newElementIndex = group.items.length;
        group.items.push(newElement);
        
        // Record undo/redo change
        if (this.undoRedoManager) {
            this.undoRedoManager.recordElementAdd(pageId, binId, newElementIndex, newElement);
        }
        
        // Request data save via EventBus
        eventBus.emit(EVENTS.DATA.SAVE_REQUESTED);
        
        // Emit element created event for automation
        eventBus.emit(EVENTS.ELEMENT.CREATED, {
            pageId,
            binId,
            documentId: pageId,
            groupId: binId,
            elementIndex: newElementIndex,
            element: newElement
        });
        
        // Request render via EventBus
        eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
        
        // Automatically open edit modal for the newly created element via event
        setTimeout(() => {
            eventBus.emit(EVENTS.UI.SHOW_EDIT_MODAL, {
                pageId,
                binId,
                documentId: pageId,
                groupId: binId,
                elementIndex: newElementIndex,
                element: newElement
            });
            // Focus on the text input
            setTimeout(() => {
                eventBus.emit(EVENTS.UI.FOCUS_INPUT, {
                    inputId: 'edit-text',
                    select: true
                });
            }, 50);
        }, 50);
    }
    
    createElementTemplate(type) {
        // Try to use ElementTypeManager if available
        if (this.elementTypeManager) {
            const template = this.elementTypeManager.createTemplate(type);
            if (template) {
                return template;
            }
        }
        
        // Fallback to default templates
        const templates = {
            'task': {
                type: 'task',
                text: 'New task',
                completed: false,
                repeats: true,
                timeAllocated: '',
                funModifier: '',
                parentId: null,
                childIds: []
            },
            'header-checkbox': {
                type: 'header-checkbox',
                text: 'New Header',
                completed: false,
                repeats: true,
                timeAllocated: '',
                funModifier: '',
                parentId: null,
                childIds: []
            },
            'multi-checkbox': {
                type: 'multi-checkbox',
                items: [
                    { text: 'Item 1', completed: false, funModifier: '' },
                    { text: 'Item 2', completed: false, funModifier: '' }
                ],
                completed: false,
                repeats: true,
                timeAllocated: '',
                funModifier: '',
                parentId: null,
                childIds: []
            },
            'one-time': {
                type: 'task',
                text: 'One-time task',
                completed: false,
                repeats: false,
                timeAllocated: '',
                funModifier: '',
                parentId: null,
                childIds: []
            },
            'audio': {
                type: 'audio',
                text: 'Audio Recording',
                audioFile: null,
                date: null,
                completed: false,
                repeats: true,
                parentId: null,
                childIds: []
            },
            'timer': {
                type: 'timer',
                text: 'Timer',
                duration: 3600, // Total duration in seconds (default 1 hour)
                elapsed: 0, // Elapsed time in seconds
                running: false, // Whether timer is currently running
                alarmSound: '/sounds/alarm.mp3', // Default alarm sound file path
                startTime: null, // Timestamp when timer was started
                pausedAt: 0, // Elapsed time when paused
                completed: false,
                alarmPlaying: false, // Whether alarm is currently playing
                alarmAudio: null, // Reference to alarm audio element
                repeats: true,
                parentId: null,
                childIds: []
            },
            'counter': {
                type: 'counter',
                text: 'Counter',
                value: 0,
                increment1: 1,
                increment5: 5,
                customIncrement: 10,
                completed: false,
                repeats: true,
                parentId: null,
                childIds: []
            },
            'tracker': {
                type: 'tracker',
                text: 'Tracker',
                mode: 'daily', // 'daily' or 'page'
                dailyCompletions: {}, // { date: count } for daily mode
                pageCompletions: {}, // { elementId: count } for page mode
                completed: false,
                repeats: true,
                parentId: null,
                childIds: []
            },
            'rating': {
                type: 'rating',
                text: 'Rating',
                rating: 0, // 0-5 stars
                review: '',
                completed: false,
                repeats: true,
                parentId: null,
                childIds: []
            },
            'image': {
                type: 'image',
                text: 'Image',
                imageUrl: null,
                imageAlignment: 'left',
                imageWidth: 300,
                completed: false,
                repeats: true,
                parentId: null,
                childIds: []
            },
            'time-log': {
                type: 'time-log',
                text: 'Time Log',
                totalTime: 0, // Total time in seconds
                isRunning: false,
                startTime: null,
                sessions: [], // Array of { start, end, duration }
                completed: false,
                repeats: true,
                parentId: null,
                childIds: []
            },
            'calendar': {
                type: 'calendar',
                text: 'Calendar',
                displayMode: 'current-date', // 'current-date', 'one-day', 'week', 'month'
                currentDate: new Date().toISOString().split('T')[0], // For one-day scrollable mode
                targetingMode: 'default', // 'default', 'specific', 'tags'
                targetPages: [], // Array of page IDs for specific mode
                targetBins: [], // Array of {pageId, binId} for specific mode
                targetElements: [], // Array of {pageId, binId, elementIndex} for specific mode
                targetTags: [], // Array of tag strings for tags mode
                completed: false,
                persistent: true, // Calendars are persistent
                parentId: null,
                childIds: []
            },
            'note': {
                type: 'note',
                text: 'New Note',
                content: '',
                format: 'markdown',
                completed: false,
                persistent: true,
                parentId: null,
                childIds: []
            },
            'text': {
                type: 'text',
                text: 'New Text',
                completed: false,
                repeats: true,
                parentId: null,
                childIds: []
            }
        };
        
        return templates[type] || templates['task'];
    }
    
    toggleElement(pageId, binId, elementIndex, subtaskIndex = null, itemIndex = null) {
        // Handle nested children - elementIndex might be a string like "0-1" for nested children
        let actualPageId = pageId;
        let actualBinId = binId;
        let actualElementIndex = elementIndex;
        let childIndex = null;
        
        if (typeof elementIndex === 'string' && elementIndex.includes('-')) {
            // This is a nested child - parse the index
            const parts = elementIndex.split('-');
            actualElementIndex = parseInt(parts[0]);
            childIndex = parseInt(parts[1]);
        }
        
        const document = this.appState.documents.find(p => p.id === actualPageId);
        if (!document) return;
        
        const group = document.groups?.find(b => b.id === actualBinId);
        if (!group) return;
        const items = group.items || [];
        group.items = items;
        
        const element = items[actualElementIndex];
        if (!element) return;
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
                eventBus.emit(EVENTS.ELEMENT.COMPLETED, {
                    pageId: actualPageId,
                    binId: actualBinId,
                    documentId: actualPageId,
                    groupId: actualBinId,
                    elementIndex: actualElementIndex,
                    element: element
                });
            }
            
            // Always emit updated event
            eventBus.emit(EVENTS.ELEMENT.UPDATED, {
                pageId: actualPageId,
                binId: actualBinId,
                documentId: actualPageId,
                groupId: actualBinId,
                elementIndex: actualElementIndex,
                element: element
            });
            
            // Update tracker elements if any exist (only if element was just checked)
            if (element.completed && !wasChecked) {
                this.updateTrackers(actualPageId, actualBinId, actualElementIndex, true);
            } else {
                // Still update to refresh page mode counts
                this.updateTrackers(actualPageId, actualBinId);
            }
        }
        
        // Don't delete one-time tasks immediately - they'll be deleted on day reset if completed
        
        eventBus.emit(EVENTS.DATA.SAVE_REQUESTED);
        eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
    }
    
    updateTrackers(pageId, binId, toggledElementIndex = null, wasChecked = false) {
        const document = this.appState.documents.find(p => p.id === pageId);
        if (!document) return;
        
        const group = document.groups?.find(b => b.id === binId);
        if (!group) return;
        const items = group.items || [];
        group.items = items;
        
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
        const document = this.appState.documents.find(p => p.id === pageId);
        if (!document) return;
        
        const group = document.groups?.find(b => b.id === binId);
        if (!group) return;
        const items = group.items || [];
        group.items = items;
        
        const element = items[elementIndex];
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
            eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
        }
    }
    
    removeMultiCheckboxItem(pageId, binId, elementIndex, itemIndex) {
        const document = this.appState.documents.find(p => p.id === pageId);
        if (!document) return;
        
        const group = document.groups?.find(b => b.id === binId);
        if (!group) return;
        const items = group.items || [];
        group.items = items;
        
        const element = items[elementIndex];
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
            eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
        }
    }
    
    addElementAfter(pageId, binId, elementIndex, elementType) {
        const document = this.appState.documents.find(p => p.id === pageId);
        if (!document) return;
        
        const group = document.groups?.find(b => b.id === binId);
        if (!group) return;
        const items = group.items || [];
        group.items = items;
        
        const newElement = this.createElementTemplate(elementType);
        newElement.parentId = null;
        newElement.childIds = Array.isArray(newElement.childIds) ? newElement.childIds : [];
        // Generate unique ID for the element
        if (!newElement.id) {
            newElement.id = `element-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        }
        if (!group.items) group.items = items;
        const insertIndex = elementIndex + 1;
        group.items.splice(insertIndex, 0, newElement);
        
        // Record undo/redo change
        if (this.undoRedoManager) {
            this.undoRedoManager.recordElementAdd(pageId, binId, insertIndex, newElement);
        }
        
        eventBus.emit(EVENTS.DATA.SAVE_REQUESTED);
        eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
    }
}

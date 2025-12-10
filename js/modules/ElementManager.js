// ElementManager.js - Handles element-related operations
import { eventBus } from '../core/EventBus.js';
import { EVENTS } from '../core/AppEvents.js';

export class ElementManager {
    constructor(app) {
        this.app = app;
    }
    
    addElement(pageId, binId, elementType) {
        const page = this.app.pages.find(p => p.id === pageId);
        if (!page) return;
        
        const bin = page.bins?.find(b => b.id === binId);
        if (!bin) return;
        
        const newElement = this.createElementTemplate(elementType);
        // Generate unique ID for the element
        if (!newElement.id) {
            newElement.id = `element-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        }
        if (!bin.elements) bin.elements = [];
        const newElementIndex = bin.elements.length;
        bin.elements.push(newElement);
        
        // Record undo/redo change
        if (this.app.undoRedoManager) {
            this.app.undoRedoManager.recordElementAdd(pageId, binId, newElementIndex, newElement);
        }
        
        // Request data save via EventBus
        eventBus.emit(EVENTS.DATA.SAVE_REQUESTED);
        
        // Emit element created event for automation
        if (this.app.eventBus) {
            this.app.eventBus.emit('element:created', {
                pageId,
                binId,
                elementIndex: newElementIndex,
                element: newElement
            });
        }
        
        this.app.render();
        
        // Automatically open edit modal for the newly created element
        setTimeout(() => {
            this.app.modalHandler.showEditModal(pageId, binId, newElementIndex, newElement);
            // Focus on the text input
            setTimeout(() => {
                const textInput = document.getElementById('edit-text');
                if (textInput) {
                    textInput.focus();
                    textInput.select();
                }
            }, 50);
        }, 50);
    }
    
    createElementTemplate(type) {
        // Try to use ElementTypeManager if available
        if (this.app.elementTypeManager) {
            const template = this.app.elementTypeManager.createTemplate(type);
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
                children: []
            },
            'header-checkbox': {
                type: 'header-checkbox',
                text: 'New Header',
                completed: false,
                repeats: true,
                timeAllocated: '',
                funModifier: '',
                children: []
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
                children: []
            },
            'one-time': {
                type: 'task',
                text: 'One-time task',
                completed: false,
                repeats: false,
                timeAllocated: '',
                funModifier: '',
                children: []
            },
            'audio': {
                type: 'audio',
                text: 'Audio Recording',
                audioFile: null,
                date: null,
                completed: false,
                repeats: true,
                children: []
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
                children: []
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
                children: []
            },
            'tracker': {
                type: 'tracker',
                text: 'Tracker',
                mode: 'daily', // 'daily' or 'page'
                dailyCompletions: {}, // { date: count } for daily mode
                pageCompletions: {}, // { elementId: count } for page mode
                completed: false,
                repeats: true,
                children: []
            },
            'rating': {
                type: 'rating',
                text: 'Rating',
                rating: 0, // 0-5 stars
                review: '',
                completed: false,
                repeats: true,
                children: []
            },
            'image': {
                type: 'image',
                text: 'Image',
                imageUrl: null,
                imageAlignment: 'left',
                imageWidth: 300,
                completed: false,
                repeats: true,
                children: []
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
                children: []
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
                children: []
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
        
        const page = this.app.pages.find(p => p.id === actualPageId);
        if (!page) return;
        
        const bin = page.bins?.find(b => b.id === actualBinId);
        if (!bin) return;
        
        const element = bin.elements[actualElementIndex];
        if (!element) return;
        
        // If we have a childIndex, we're toggling a nested child
        if (childIndex !== null && element.children && element.children[childIndex]) {
            const child = element.children[childIndex];
            const oldValue = child.completed;
            child.completed = !child.completed;
            element.completed = element.children.every(ch => ch.completed);
            
            // Record undo/redo change
            if (this.app.undoRedoManager) {
                this.app.undoRedoManager.recordElementPropertyChange(pageId, binId, actualElementIndex, 'completed', child.completed, oldValue, childIndex);
                this.app.undoRedoManager.recordElementPropertyChange(pageId, binId, actualElementIndex, 'completed', element.completed, !element.completed);
            }
        } else if (itemIndex !== null && element.items) {
            // Toggle multi-checkbox item
            const oldItemValue = element.items[itemIndex].completed;
            element.items[itemIndex].completed = !element.items[itemIndex].completed;
            const oldElementValue = element.completed;
            element.completed = element.items.every(item => item.completed);
            
            // Record undo/redo change
            if (this.app.undoRedoManager) {
                this.app.undoRedoManager.recordElementPropertyChange(pageId, binId, actualElementIndex, 'completed', element.items[itemIndex].completed, oldItemValue, null, itemIndex);
                this.app.undoRedoManager.recordElementPropertyChange(pageId, binId, actualElementIndex, 'completed', element.completed, oldElementValue);
            }
        } else if (subtaskIndex !== null) {
            // Legacy subtask support (for backward compatibility)
            if (element.subtasks && element.subtasks[subtaskIndex]) {
                const oldValue = element.subtasks[subtaskIndex].completed;
                element.subtasks[subtaskIndex].completed = !element.subtasks[subtaskIndex].completed;
                element.completed = element.subtasks.every(st => st.completed);
                
                // Record undo/redo change
                if (this.app.undoRedoManager) {
                    this.app.undoRedoManager.recordElementPropertyChange(pageId, binId, actualElementIndex, 'completed', element.subtasks[subtaskIndex].completed, oldValue, subtaskIndex);
                    this.app.undoRedoManager.recordElementPropertyChange(pageId, binId, actualElementIndex, 'completed', element.completed, !element.completed);
                }
            } else if (element.children && element.children[subtaskIndex]) {
                // Use children if subtasks don't exist
                const oldValue = element.children[subtaskIndex].completed;
                element.children[subtaskIndex].completed = !element.children[subtaskIndex].completed;
                element.completed = element.children.every(ch => ch.completed);
                
                // Record undo/redo change
                if (this.app.undoRedoManager) {
                    this.app.undoRedoManager.recordElementPropertyChange(pageId, binId, actualElementIndex, 'completed', element.children[subtaskIndex].completed, oldValue, subtaskIndex);
                    this.app.undoRedoManager.recordElementPropertyChange(pageId, binId, actualElementIndex, 'completed', element.completed, !element.completed);
                }
            }
        } else {
            // Toggle main element
            const wasChecked = element.completed;
            const oldValue = element.completed;
            element.completed = !element.completed;
            // Record undo/redo change for main element
            if (this.app.undoRedoManager) {
                this.app.undoRedoManager.recordElementPropertyChange(pageId, binId, actualElementIndex, 'completed', element.completed, oldValue);
            }
            
            if (element.children) {
                element.children.forEach((ch, idx) => {
                    if (ch.repeats !== false) {
                        const oldChildValue = ch.completed;
                        ch.completed = element.completed;
                        // Record child changes
                        if (this.app.undoRedoManager && oldChildValue !== ch.completed) {
                            this.app.undoRedoManager.recordElementPropertyChange(pageId, binId, actualElementIndex, 'completed', ch.completed, oldChildValue, idx);
                        }
                    }
                });
            }
            // Legacy subtask support
            if (element.subtasks) {
                element.subtasks.forEach((st, idx) => {
                    if (st.repeats !== false) {
                        const oldSubtaskValue = st.completed;
                        st.completed = element.completed;
                        // Record subtask changes
                        if (this.app.undoRedoManager && oldSubtaskValue !== st.completed) {
                            this.app.undoRedoManager.recordElementPropertyChange(pageId, binId, actualElementIndex, 'completed', st.completed, oldSubtaskValue, idx);
                        }
                    }
                });
            }
            
            // Emit events for automation
            if (this.app.eventBus) {
                if (element.completed && !wasChecked) {
                    // Element was just completed
                    this.app.eventBus.emit('element:completed', {
                        pageId: actualPageId,
                        binId: actualBinId,
                        elementIndex: actualElementIndex,
                        element: element
                    });
                }
                
                // Always emit updated event
                this.app.eventBus.emit('element:updated', {
                    pageId: actualPageId,
                    binId: actualBinId,
                    elementIndex: actualElementIndex,
                    element: element
                });
            }
            
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
        const page = this.app.pages.find(p => p.id === pageId);
        if (!page) return;
        
        const bin = page.bins?.find(b => b.id === binId);
        if (!bin) return;
        
        const today = new Date().toISOString().split('T')[0];
        
        bin.elements.forEach((trackerElement, trackerIdx) => {
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
                    bin.elements.forEach((el, elIdx) => {
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
        const page = this.app.pages.find(p => p.id === pageId);
        if (!page) return;
        
        const bin = page.bins?.find(b => b.id === binId);
        if (!bin) return;
        
        const element = bin.elements[elementIndex];
        if (element && element.items) {
            const newItem = {
                text: 'New item',
                completed: false,
                funModifier: ''
            };
            const itemIndex = element.items.length;
            element.items.push(newItem);
            
            // Record undo/redo change
            if (this.app.undoRedoManager) {
                const path = this.app.undoRedoManager.getElementPath(pageId, binId, elementIndex);
                if (path) {
                    path.push('items');
                    const change = this.app.undoRedoManager.createChange('add', path, newItem, null);
                    change.changeId = `${Date.now()}-${Math.random()}`;
                    this.app.undoRedoManager.recordChange(change);
                }
            }
            
            this.app.dataManager.saveData();
            this.app.render();
        }
    }
    
    removeMultiCheckboxItem(pageId, binId, elementIndex, itemIndex) {
        const page = this.app.pages.find(p => p.id === pageId);
        if (!page) return;
        
        const bin = page.bins?.find(b => b.id === binId);
        if (!bin) return;
        
        const element = bin.elements[elementIndex];
        if (element && element.items && element.items.length > 1) {
            const removedItem = element.items[itemIndex];
            const oldCompleted = element.completed;
            element.items.splice(itemIndex, 1);
            element.completed = element.items.length > 0 && element.items.every(item => item.completed);
            
            // Record undo/redo change
            if (this.app.undoRedoManager) {
                const path = this.app.undoRedoManager.getElementPath(pageId, binId, elementIndex);
                if (path) {
                    path.push('items');
                    path.push(itemIndex);
                    const change = this.app.undoRedoManager.createChange('delete', path, null, removedItem);
                    change.changeId = `${Date.now()}-${Math.random()}`;
                    this.app.undoRedoManager.recordChange(change);
                    
                    // Also record completed state change if it changed
                    if (oldCompleted !== element.completed) {
                        this.app.undoRedoManager.recordElementPropertyChange(pageId, binId, elementIndex, 'completed', element.completed, oldCompleted);
                    }
                }
            }
            
            this.app.dataManager.saveData();
            this.app.render();
        }
    }
    
    addElementAfter(pageId, binId, elementIndex, elementType) {
        const page = this.app.pages.find(p => p.id === pageId);
        if (!page) return;
        
        const bin = page.bins?.find(b => b.id === binId);
        if (!bin) return;
        
        const newElement = this.createElementTemplate(elementType);
        // Generate unique ID for the element
        if (!newElement.id) {
            newElement.id = `element-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        }
        if (!bin.elements) bin.elements = [];
        const insertIndex = elementIndex + 1;
        bin.elements.splice(insertIndex, 0, newElement);
        
        // Record undo/redo change
        if (this.app.undoRedoManager) {
            this.app.undoRedoManager.recordElementAdd(pageId, binId, insertIndex, newElement);
        }
        
        eventBus.emit(EVENTS.DATA.SAVE_REQUESTED);
        eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
    }
}

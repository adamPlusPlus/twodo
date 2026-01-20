// AppState.js - Manages application state
// Provides getters/setters with validation and emits state change events
import { eventBus } from './EventBus.js';
import { EVENTS } from './AppEvents.js';

/**
 * AppState - Centralized state management for TodoApp
 * 
 * Manages all application state including documents, current document, UI state, etc.
 * Emits events when state changes to allow other modules to react.
 */
export class AppState {
    constructor() {
        // Core data
        this._documents = [];
        this._currentDocumentId = 'document-1';
        
        // UI state
        this._currentEditModal = null;
        this._contextMenuState = {
            visible: false,
            documentId: null,
            groupId: null,
            elementIndex: null,
            subtaskIndex: null,
            x: 0,
            y: 0
        };
        this._allSubtasksExpanded = true;
        this._lastRightClickTime = 0;
        this._doubleClickThreshold = 300;
        this._doubleClickDelay = 150;
        this._clickTimeout = null;
        this._groupStates = {}; // Track collapsed/expanded state of groups
        this._subtaskStates = {}; // Track individual subtask visibility
        this._activeGroupId = null;
        this._currentEnterKeyHandler = null;
        this._multiEditState = null;
        this._documentStates = {}; // Track collapsed/expanded state of documents
        
        // Drag and drop state
        this._dragData = null;
        this._nestTargetElement = null;
        this._lastMovedElement = null;
        this._isDragging = false;
        this._autoScrollInterval = null;
        this._edgeScrollSpeed = 10;
        this._currentDragOverElement = null;
        
        // Touch gesture state
        this._touchPoints = {};
        this._firstTouchData = null;
        
        // Mouse state
        this._middleMouseDown = false;
        
        // Audio recording state (legacy)
        this._mediaRecorder = null;
        this._audioChunks = [];
        this._recordingStartTime = null;
        this._recordingTimer = null;
        this._inlineAudioRecorders = {};
        this._inlineAudioPlayers = {};
        
        // Multi-pane state
        this._multiPaneEnabled = true; // Enable multi-pane by default
    }
    
    // Multi-pane enabled getter/setter
    get multiPaneEnabled() {
        return this._multiPaneEnabled;
    }
    
    set multiPaneEnabled(value) {
        this._multiPaneEnabled = value;
        eventBus.emit(EVENTS.UI.CHANGED, { type: 'multiPaneEnabled', value });
    }
    
    // Documents getter/setter (canonical)
    get documents() {
        return this._documents;
    }
    
    set documents(value) {
        if (!Array.isArray(value)) {
            console.warn('[AppState] documents must be an array');
            return;
        }
        this._documents = value;
        eventBus.emit(EVENTS.DATA.CHANGED, { type: 'documents', value });
    }
    
    // Current document ID getter/setter (canonical)
    get currentDocumentId() {
        return this._currentDocumentId;
    }
    
    set currentDocumentId(value) {
        if (typeof value !== 'string') {
            console.warn('[AppState] currentDocumentId must be a string');
            return;
        }
        const oldValue = this._currentDocumentId;
        this._currentDocumentId = value;
        if (oldValue !== value) {
            eventBus.emit(EVENTS.PAGE.SWITCHED, { pageId: value });
        }
    }
    
    // Current edit modal getter/setter
    get currentEditModal() {
        return this._currentEditModal;
    }
    
    set currentEditModal(value) {
        this._currentEditModal = value;
    }
    
    // Context menu state getter/setter
    get contextMenuState() {
        return this._contextMenuState;
    }
    
    setContextMenuState(state) {
        const merged = { ...this._contextMenuState, ...state };
        this._contextMenuState = merged;
    }
    
    // Subtasks expanded state
    get allSubtasksExpanded() {
        return this._allSubtasksExpanded;
    }
    
    set allSubtasksExpanded(value) {
        this._allSubtasksExpanded = Boolean(value);
    }
    
    // Group states
    get groupStates() {
        return this._groupStates;
    }
    
    set groupStates(value) {
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
            console.warn('[AppState] groupStates must be an object');
            return;
        }
        this._groupStates = value || {};
    }
    
    setGroupState(groupId, state) {
        this._groupStates[groupId] = state;
    }
    
    getGroupState(groupId) {
        return this._groupStates[groupId];
    }
    
    // Subtask states
    get subtaskStates() {
        return this._subtaskStates;
    }
    
    set subtaskStates(value) {
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
            console.warn('[AppState] subtaskStates must be an object');
            return;
        }
        this._subtaskStates = value || {};
    }
    
    setSubtaskState(key, state) {
        this._subtaskStates[key] = state;
    }
    
    getSubtaskState(key) {
        return this._subtaskStates[key];
    }
    
    // Document states
    get documentStates() {
        return this._documentStates;
    }
    
    set documentStates(value) {
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
            console.warn('[AppState] documentStates must be an object');
            return;
        }
        this._documentStates = value || {};
    }
    
    setDocumentState(documentId, state) {
        this._documentStates[documentId] = state;
    }
    
    getDocumentState(documentId) {
        return this._documentStates[documentId];
    }
    
    // Active group ID
    get activeGroupId() {
        return this._activeGroupId;
    }
    
    set activeGroupId(value) {
        this._activeGroupId = value;
    }
    
    // Drag data
    get dragData() {
        return this._dragData;
    }
    
    set dragData(value) {
        this._dragData = value;
    }
    
    // Is dragging
    get isDragging() {
        return this._isDragging;
    }
    
    set isDragging(value) {
        this._isDragging = Boolean(value);
    }
    
    // Inline audio recorders
    get inlineAudioRecorders() {
        return this._inlineAudioRecorders;
    }
    
    // Inline audio players
    get inlineAudioPlayers() {
        return this._inlineAudioPlayers;
    }
    
    // Last right click time
    get lastRightClickTime() {
        return this._lastRightClickTime;
    }
    
    set lastRightClickTime(value) {
        this._lastRightClickTime = Number(value) || 0;
    }
    
    // Double click threshold
    get doubleClickThreshold() {
        return this._doubleClickThreshold;
    }
    
    set doubleClickThreshold(value) {
        this._doubleClickThreshold = Number(value) || 300;
    }
    
    // Double click delay
    get doubleClickDelay() {
        return this._doubleClickDelay;
    }
    
    set doubleClickDelay(value) {
        this._doubleClickDelay = Number(value) || 150;
    }
    
    // Click timeout
    get clickTimeout() {
        return this._clickTimeout;
    }
    
    set clickTimeout(value) {
        this._clickTimeout = value;
    }
    
    // Current enter key handler
    get currentEnterKeyHandler() {
        return this._currentEnterKeyHandler;
    }
    
    set currentEnterKeyHandler(value) {
        this._currentEnterKeyHandler = value;
    }
    
    // Nest target element
    get nestTargetElement() {
        return this._nestTargetElement;
    }
    
    set nestTargetElement(value) {
        this._nestTargetElement = value;
    }
    
    // Last moved element
    get lastMovedElement() {
        return this._lastMovedElement;
    }
    
    set lastMovedElement(value) {
        this._lastMovedElement = value;
    }
    
    // Auto scroll interval
    get autoScrollInterval() {
        return this._autoScrollInterval;
    }
    
    set autoScrollInterval(value) {
        this._autoScrollInterval = value;
    }
    
    // Middle mouse button state
    get middleMouseDown() {
        return this._middleMouseDown;
    }
    
    set middleMouseDown(value) {
        this._middleMouseDown = value;
    }
    
    // Edge scroll speed
    get edgeScrollSpeed() {
        return this._edgeScrollSpeed;
    }
    
    set edgeScrollSpeed(value) {
        this._edgeScrollSpeed = Number(value) || 10;
    }
    
    // Current drag over element
    get currentDragOverElement() {
        return this._currentDragOverElement;
    }
    
    set currentDragOverElement(value) {
        this._currentDragOverElement = value;
    }
    
    // Touch points
    get touchPoints() {
        return this._touchPoints;
    }
    
    set touchPoints(value) {
        this._touchPoints = value || {};
    }
    
    // First touch data
    get firstTouchData() {
        return this._firstTouchData;
    }
    
    set firstTouchData(value) {
        this._firstTouchData = value;
    }
    
    // Media recorder
    get mediaRecorder() {
        return this._mediaRecorder;
    }
    
    set mediaRecorder(value) {
        this._mediaRecorder = value;
    }
    
    // Audio chunks
    get audioChunks() {
        return this._audioChunks;
    }
    
    set audioChunks(value) {
        this._audioChunks = Array.isArray(value) ? value : [];
    }
    
    // Recording start time
    get recordingStartTime() {
        return this._recordingStartTime;
    }
    
    set recordingStartTime(value) {
        this._recordingStartTime = value;
    }
    
    // Recording timer
    get recordingTimer() {
        return this._recordingTimer;
    }
    
    set recordingTimer(value) {
        this._recordingTimer = value;
    }
    
    // Direct property access for backward compatibility
    // These allow app.js to access properties directly during transition
    getProperty(name) {
        return this[`_${name}`];
    }
    
    setProperty(name, value) {
        this[`_${name}`] = value;
    }
    
    /**
     * Initialize state from app instance (for migration)
     * @param {Object} app - TodoApp instance
     */
    initializeFromApp(app) {
        this._documents = app.documents || [];
        this._currentDocumentId = app.currentDocumentId || 'document-1';
        this._currentEditModal = app.currentEditModal || null;
        this._contextMenuState = app.contextMenuState || this._contextMenuState;
        this._allSubtasksExpanded = app.allSubtasksExpanded !== undefined ? app.allSubtasksExpanded : true;
        this._lastRightClickTime = app.lastRightClickTime || 0;
        this._doubleClickThreshold = app.doubleClickThreshold || 300;
        this._doubleClickDelay = app.doubleClickDelay || 150;
        this._clickTimeout = app.clickTimeout || null;
        this._groupStates = app.groupStates || {};
        this._subtaskStates = app.subtaskStates || {};
        this._activeGroupId = app.activeGroupId || null;
        this._currentEnterKeyHandler = app.currentEnterKeyHandler || null;
        this._dragData = app.dragData || null;
        this._nestTargetElement = app.nestTargetElement || null;
        this._lastMovedElement = app.lastMovedElement || null;
        this._isDragging = app.isDragging || false;
        this._autoScrollInterval = app.autoScrollInterval || null;
        this._edgeScrollSpeed = app.edgeScrollSpeed || 10;
        this._currentDragOverElement = app.currentDragOverElement || null;
        this._touchPoints = app.touchPoints || {};
        this._firstTouchData = app.firstTouchData || null;
        this._mediaRecorder = app.mediaRecorder || null;
        this._audioChunks = app.audioChunks || [];
        this._recordingStartTime = app.recordingStartTime || null;
        this._recordingTimer = app.recordingTimer || null;
        this._inlineAudioRecorders = app.inlineAudioRecorders || {};
        this._inlineAudioPlayers = app.inlineAudioPlayers || {};
        this._documentStates = app.documentStates || {};
    }
    
    /**
     * Sync state back to app instance (for backward compatibility during transition)
     * @param {Object} app - TodoApp instance
     */
    syncToApp(app) {
        app.documents = this._documents;
        app.currentDocumentId = this._currentDocumentId;
        app.currentEditModal = this._currentEditModal;
        app.contextMenuState = this._contextMenuState;
        app.allSubtasksExpanded = this._allSubtasksExpanded;
        app.lastRightClickTime = this._lastRightClickTime;
        app.doubleClickThreshold = this._doubleClickThreshold;
        app.doubleClickDelay = this._doubleClickDelay;
        app.clickTimeout = this._clickTimeout;
        app.groupStates = this._groupStates;
        app.subtaskStates = this._subtaskStates;
        app.activeGroupId = this._activeGroupId;
        app.currentEnterKeyHandler = this._currentEnterKeyHandler;
        app.multiEditState = this._multiEditState;
        app.documentStates = this._documentStates;
        app.dragData = this._dragData;
        app.nestTargetElement = this._nestTargetElement;
        app.lastMovedElement = this._lastMovedElement;
        app.isDragging = this._isDragging;
        app.autoScrollInterval = this._autoScrollInterval;
        app.edgeScrollSpeed = this._edgeScrollSpeed;
        app.currentDragOverElement = this._currentDragOverElement;
        app.touchPoints = this._touchPoints;
        app.firstTouchData = this._firstTouchData;
        app.mediaRecorder = this._mediaRecorder;
        app.audioChunks = this._audioChunks;
        app.recordingStartTime = this._recordingStartTime;
        app.recordingTimer = this._recordingTimer;
        app.inlineAudioRecorders = this._inlineAudioRecorders;
        app.inlineAudioPlayers = this._inlineAudioPlayers;
    }
}


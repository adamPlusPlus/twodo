// AppEvents.js - Event name constants and payload documentation
// Standardizes event names across the application to prevent typos and improve maintainability

/**
 * Application Event Constants
 * 
 * All events emitted through the EventBus should use these constants.
 * This ensures consistency and makes it easier to track event usage.
 */
export const EVENTS = {
    /**
     * Application-level events
     */
    APP: {
        /** Request application render
         * @event app:render-requested
         * @type {void}
         * Emitted when any module needs the UI to be re-rendered
         */
        RENDER_REQUESTED: 'app:render-requested',
        
        /** Application render completed
         * @event app:rendered
         * @type {void}
         * Emitted after render is complete
         */
        RENDERED: 'app:rendered',
        
        /** Application initialized
         * @event app:initialized
         * @type {void}
         * Emitted when app initialization is complete
         */
        INITIALIZED: 'app:initialized',
    },
    
    /**
     * Data management events
     */
    DATA: {
        /** Request data save
         * @event data:save-requested
         * @type {void}
         * Emitted when data should be saved
         */
        SAVE_REQUESTED: 'data:save-requested',
        
        /** Data saved
         * @event data:saved
         * @type {void}
         * Emitted after data is successfully saved
         */
        SAVED: 'data:saved',
        
        /** Data loaded
         * @event data:loaded
         * @type {{data: Object}}
         * Emitted when data is loaded from storage
         */
        LOADED: 'data:loaded',
        
        /** Data changed
         * @event data:changed
         * @type {{change: Object}}
         * Emitted when data structure changes
         */
        CHANGED: 'data:changed',
    },
    
    /**
     * Element events
     */
    ELEMENT: {
        /** Element created
         * @event element:created
         * @type {{pageId: string, binId: string, elementIndex: number, element: Object}}
         */
        CREATED: 'element:created',
        
        /** Element updated
         * @event element:updated
         * @type {{pageId: string, binId: string, elementIndex: number, element: Object}}
         */
        UPDATED: 'element:updated',
        
        /** Element completed
         * @event element:completed
         * @type {{pageId: string, binId: string, elementIndex: number, element: Object}}
         */
        COMPLETED: 'element:completed',
        
        /** Element deleted
         * @event element:deleted
         * @type {{pageId: string, binId: string, elementIndex: number}}
         */
        DELETED: 'element:deleted',
        
        /** Element moved
         * @event element:moved
         * @type {{sourcePageId: string, sourceBinId: string, sourceElementIndex: number, targetPageId: string, targetBinId: string, targetElementIndex: number}}
         */
        MOVED: 'element:moved',
    },
    
    /**
     * Page events
     */
    PAGE: {
        /** Page created
         * @event page:created
         * @type {{pageId: string, page: Object}}
         */
        CREATED: 'page:created',
        
        /** Page deleted
         * @event page:deleted
         * @type {{pageId: string}}
         */
        DELETED: 'page:deleted',
        
        /** Page switched
         * @event page:switched
         * @type {{pageId: string}}
         */
        SWITCHED: 'page:switched',
    },
    
    /**
     * Bin events
     */
    BIN: {
        /** Bin created
         * @event bin:created
         * @type {{pageId: string, binId: string, bin: Object}}
         */
        CREATED: 'bin:created',
        
        /** Bin deleted
         * @event bin:deleted
         * @type {{pageId: string, binId: string}}
         */
        DELETED: 'bin:deleted',
    },
    
    /**
     * Undo/Redo events
     */
    UNDO_REDO: {
        /** Change recorded
         * @event undo-redo:change-recorded
         * @type {{change: Object}}
         */
        CHANGE_RECORDED: 'undo-redo:change-recorded',
        
        /** Undo performed
         * @event undo-redo:undo
         * @type {{change: Object}}
         */
        UNDO: 'undo-redo:undo',
        
        /** Redo performed
         * @event undo-redo:redo
         * @type {{change: Object}}
         */
        REDO: 'undo-redo:redo',
    },
    
    /**
     * Sync events
     */
    SYNC: {
        /** Change received from remote
         * @event sync:change-received
         * @type {{change: Object, clientId: string}}
         */
        CHANGE_RECEIVED: 'sync:change-received',
        
        /** Connected to sync server
         * @event sync:connected
         * @type {{clientId: string}}
         */
        CONNECTED: 'sync:connected',
        
        /** Disconnected from sync server
         * @event sync:disconnected
         * @type {void}
         */
        DISCONNECTED: 'sync:disconnected',
    },
    
    /**
     * Format renderer events
     */
    FORMAT: {
        /** Format registered
         * @event format:registered
         * @type {{pluginId: string, formatName: string}}
         */
        REGISTERED: 'format:registered',
        
        /** Format changed for page/bin
         * @event format:changed
         * @type {{pageId: string, binId?: string, formatName: string}}
         */
        CHANGED: 'format:changed',
    },
    
    /**
     * Plugin events
     */
    PLUGIN: {
        /** Plugin loaded
         * @event plugin:loaded
         * @type {{pluginId: string, plugin: Object}}
         */
        LOADED: 'plugin:loaded',
        
        /** Plugin enabled
         * @event plugin:enabled
         * @type {{pluginId: string}}
         */
        ENABLED: 'plugin:enabled',
        
        /** Plugin disabled
         * @event plugin:disabled
         * @type {{pluginId: string}}
         */
        DISABLED: 'plugin:disabled',
    },
    
    /**
     * UI events
     */
    UI: {
        /** UI state changed
         * @event ui:changed
         * @type {{type: string, value: any}}
         * Emitted when UI state changes (e.g., multiPaneEnabled)
         */
        CHANGED: 'ui:changed',
        
        /** Show edit modal
         * @event ui:show-edit-modal
         * @type {{pageId: string, binId: string, elementIndex: number, element: Object}}
         */
        SHOW_EDIT_MODAL: 'ui:show-edit-modal',
        
        /** Show add element modal
         * @event ui:show-add-element-modal
         * @type {{pageId: string, binId?: string, elementIndex?: number}}
         */
        SHOW_ADD_ELEMENT_MODAL: 'ui:show-add-element-modal',
        
        /** Show add child element modal
         * @event ui:show-add-child-element-modal
         * @type {{pageId: string, binId: string, elementIndex: number}}
         */
        SHOW_ADD_CHILD_ELEMENT_MODAL: 'ui:show-add-child-element-modal',
        
        /** Show add subtasks modal
         * @event ui:show-add-subtasks-modal
         * @type {{pageId: string, binId: string, elementIndex: number, element: Object}}
         */
        SHOW_ADD_SUBTASKS_MODAL: 'ui:show-add-subtasks-modal',
        
        /** Show view data modal
         * @event ui:show-view-data-modal
         * @type {{element: Object, isSubtask?: boolean}}
         */
        SHOW_VIEW_DATA_MODAL: 'ui:show-view-data-modal',
        
        /** Show edit page modal
         * @event ui:show-edit-page-modal
         * @type {{pageId: string}}
         */
        SHOW_EDIT_PAGE_MODAL: 'ui:show-edit-page-modal',
        
        /** Show edit bin modal
         * @event ui:show-edit-bin-modal
         * @type {{pageId: string, binId: string}}
         */
        SHOW_EDIT_BIN_MODAL: 'ui:show-edit-bin-modal',
        
        /** Show visual customization modal
         * @event ui:show-visual-customization-modal
         * @type {{targetType: string, targetId: string, context: Object}}
         */
        SHOW_VISUAL_CUSTOMIZATION_MODAL: 'ui:show-visual-customization-modal',
        
        /** Close modal
         * @event ui:close-modal
         * @type {void}
         */
        CLOSE_MODAL: 'ui:close-modal',
        
        /** Focus input element
         * @event ui:focus-input
         * @type {{inputId: string, select?: boolean}}
         */
        FOCUS_INPUT: 'ui:focus-input',
    },
};

/**
 * Helper function to emit events with type safety
 * @param {string} eventName - Event name from EVENTS constants
 * @param {*} payload - Event payload
 */
export function emitEvent(eventName, payload = null) {
    // This will be used with EventBus once we have a reference
    // For now, it's a placeholder for documentation
    console.warn('emitEvent called without EventBus reference. Use eventBus.emit() directly.');
}


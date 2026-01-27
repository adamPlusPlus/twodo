// DocumentEventHandlers.js - Coordinates document-level event handlers
import { ContextMenuHandlers } from './ContextMenuHandlers.js';
import { KeyboardShortcutHandlers } from './KeyboardShortcutHandlers.js';
import { BinsContainerHandlers } from './BinsContainerHandlers.js';
import { ModalHandlers } from './ModalHandlers.js';
import { DragAutoScrollHandlers } from './DragAutoScrollHandlers.js';
import { TouchGestureHandlers } from './TouchGestureHandlers.js';

export class DocumentEventHandlers {
    constructor(eventHandler) {
        this.eventHandler = eventHandler;
        this.contextMenuHandlers = new ContextMenuHandlers(eventHandler);
        this.keyboardShortcutHandlers = new KeyboardShortcutHandlers(eventHandler);
        this.binsContainerHandlers = new BinsContainerHandlers(eventHandler);
        this.modalHandlers = new ModalHandlers();
        this.dragAutoScrollHandlers = new DragAutoScrollHandlers();
        this.touchGestureHandlers = new TouchGestureHandlers();
    }
    
    /**
     * Setup all document event handlers
     */
    setupAll() {
        this.contextMenuHandlers.setupContextMenuItems();
        this.contextMenuHandlers.setupContextMenuClose();
        this.contextMenuHandlers.setupContextMenuRouting();
        this.keyboardShortcutHandlers.setupKeyboardShortcuts();
        this.binsContainerHandlers.setupBinsContainerHandlers();
        this.binsContainerHandlers.setupBinsContainerDragDrop();
        this.modalHandlers.setupModalHandlers();
        this.dragAutoScrollHandlers.setupDragAutoScroll();
        this.touchGestureHandlers.setupTouchGestures();
    }
}

// ModalEventBridge.js - Bridges UI events to modal methods
// Listens to UI events and calls appropriate modal methods
import { eventBus } from './EventBus.js';
import { EVENTS } from './AppEvents.js';
import { getService, SERVICES } from './AppServices.js';

/**
 * ModalEventBridge - Bridges UI modal events to ModalHandler methods
 * 
 * This module bridges UI events to modal handler methods, keeping
 * modules decoupled from direct modal calls.
 */
export class ModalEventBridge {
    constructor() {
        this.setupEventListeners();
    }
    
    /**
     * Setup event listeners for UI modal events
     */
    setupEventListeners() {
        // Show edit modal
        eventBus.on(EVENTS.UI.SHOW_EDIT_MODAL, ({ pageId, binId, elementIndex, element }) => {
            const modalHandler = getService(SERVICES.MODAL_HANDLER);
            modalHandler.showEditModal(pageId, binId, elementIndex, element);
        });
        
        // Show add element modal
        eventBus.on(EVENTS.UI.SHOW_ADD_ELEMENT_MODAL, ({ pageId, binId, elementIndex }) => {
            const modalHandler = getService(SERVICES.MODAL_HANDLER);
            modalHandler.showAddElementModal(pageId, binId, elementIndex);
        });
        
        // Show add child element modal
        eventBus.on(EVENTS.UI.SHOW_ADD_CHILD_ELEMENT_MODAL, ({ pageId, binId, elementIndex }) => {
            const modalHandler = getService(SERVICES.MODAL_HANDLER);
            modalHandler.showAddChildElementModal(pageId, binId, elementIndex);
        });
        
        // Show add subtasks modal
        eventBus.on(EVENTS.UI.SHOW_ADD_SUBTASKS_MODAL, ({ pageId, binId, elementIndex, element }) => {
            const modalHandler = getService(SERVICES.MODAL_HANDLER);
            modalHandler.showAddSubtasksModal(pageId, binId, elementIndex, element);
        });
        
        // Show view data modal
        eventBus.on(EVENTS.UI.SHOW_VIEW_DATA_MODAL, ({ element, isSubtask = false }) => {
            const modalHandler = getService(SERVICES.MODAL_HANDLER);
            modalHandler.showViewDataModal(element, isSubtask);
        });
        
        // Show edit page modal
        eventBus.on(EVENTS.UI.SHOW_EDIT_PAGE_MODAL, ({ pageId }) => {
            const modalHandler = getService(SERVICES.MODAL_HANDLER);
            modalHandler.showEditPageModal(pageId);
        });
        
        // Show edit bin modal
        eventBus.on(EVENTS.UI.SHOW_EDIT_BIN_MODAL, ({ pageId, binId }) => {
            const modalHandler = getService(SERVICES.MODAL_HANDLER);
            modalHandler.showEditBinModal(pageId, binId);
        });
        
        // Show visual customization modal
        eventBus.on(EVENTS.UI.SHOW_VISUAL_CUSTOMIZATION_MODAL, ({ targetType, targetId, context }) => {
            const modalHandler = getService(SERVICES.MODAL_HANDLER);
            modalHandler.showVisualCustomizationModal(targetType, targetId, context);
        });
        
        // Close modal
        eventBus.on(EVENTS.UI.CLOSE_MODAL, () => {
            const modalHandler = getService(SERVICES.MODAL_HANDLER);
            modalHandler.closeModal();
        });
        
        // Focus input
        eventBus.on(EVENTS.UI.FOCUS_INPUT, ({ inputId, select = false }) => {
            const input = document.getElementById(inputId);
            if (input) {
                input.focus();
                if (select) {
                    input.select();
                }
            }
        });
    }
}

// Create and export singleton instance
export const modalEventBridge = new ModalEventBridge();

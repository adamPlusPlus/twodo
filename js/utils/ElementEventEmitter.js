// ElementEventEmitter.js - Event emission helpers for element operations
// Extracted from ElementManager.js for reusability and maintainability

import { eventBus } from '../core/EventBus.js';
import { EVENTS } from '../core/AppEvents.js';

/**
 * ElementEventEmitter - Helper functions for emitting element-related events
 */
export const ElementEventEmitter = {
    /**
     * Emit element created event
     * @param {string} pageId - Page ID
     * @param {string} binId - Bin/group ID
     * @param {number} elementIndex - Element index
     * @param {Object} element - Element object
     */
    emitElementCreated(pageId, binId, elementIndex, element) {
        eventBus.emit(EVENTS.ELEMENT.CREATED, {
            pageId,
            binId,
            documentId: pageId,
            groupId: binId,
            elementIndex,
            element
        });
    },
    
    /**
     * Emit element updated event
     * @param {string} pageId - Page ID
     * @param {string} binId - Bin/group ID
     * @param {number} elementIndex - Element index
     * @param {Object} element - Element object
     */
    emitElementUpdated(pageId, binId, elementIndex, element) {
        eventBus.emit(EVENTS.ELEMENT.UPDATED, {
            pageId,
            binId,
            documentId: pageId,
            groupId: binId,
            elementIndex,
            element
        });
    },
    
    /**
     * Emit element completed event
     * @param {string} pageId - Page ID
     * @param {string} binId - Bin/group ID
     * @param {number} elementIndex - Element index
     * @param {Object} element - Element object
     */
    emitElementCompleted(pageId, binId, elementIndex, element) {
        eventBus.emit(EVENTS.ELEMENT.COMPLETED, {
            pageId,
            binId,
            documentId: pageId,
            groupId: binId,
            elementIndex,
            element
        });
    },
    
    /**
     * Emit data save requested event
     */
    emitDataSaveRequested() {
        eventBus.emit(EVENTS.DATA.SAVE_REQUESTED);
    },
    
    /**
     * Emit render requested event
     */
    emitRenderRequested() {
        eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
    },
    
    /**
     * Emit edit modal requested event
     * @param {string} pageId - Page ID
     * @param {string} binId - Bin/group ID
     * @param {number} elementIndex - Element index
     * @param {Object} element - Element object
     */
    emitEditModalRequested(pageId, binId, elementIndex, element) {
        eventBus.emit(EVENTS.ELEMENT.EDIT_REQUESTED, {
            pageId,
            binId,
            elementIndex,
            element
        });
    },
    
    /**
     * Emit UI show edit modal event (alternative modal event)
     * @param {string} pageId - Page ID
     * @param {string} binId - Bin/group ID
     * @param {number} elementIndex - Element index
     * @param {Object} element - Element object
     */
    emitShowEditModal(pageId, binId, elementIndex, element) {
        eventBus.emit(EVENTS.UI.SHOW_EDIT_MODAL, {
            pageId,
            binId,
            documentId: pageId,
            groupId: binId,
            elementIndex,
            element
        });
    },
    
    /**
     * Emit focus input event
     * @param {string} inputId - Input element ID
     * @param {boolean} select - Whether to select text
     */
    emitFocusInput(inputId, select = false) {
        eventBus.emit(EVENTS.UI.FOCUS_INPUT, {
            inputId,
            select
        });
    }
};

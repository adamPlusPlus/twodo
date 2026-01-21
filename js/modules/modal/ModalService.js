// ModalService.js - Handles modal business logic
// Extracted from ModalHandler to separate business logic from UI

/**
 * ModalService - Handles business logic for modals
 * 
 * This class is responsible for:
 * - Processing form data
 * - Interacting with data managers
 * - Business rule enforcement
 * - Data transformations
 */
export class ModalService {
    constructor() {
    }
    
    /**
     * Process element data from form
     * @param {Object} formData - Raw form data
     * @returns {Object} Processed element data
     */
    processElementData(formData) {
        // Process and transform form data into element structure
        // This is a placeholder - actual implementation will extract from ModalHandler
        return formData;
    }

    applyTextUpdate({ element, newText, undoRedoManager, pageId, binId, elementIndex }) {
        if (!element) {
            return;
        }
        const oldText = element.text || '';
        const nextText = (newText ?? '').trim();
        if (oldText !== nextText && undoRedoManager) {
            undoRedoManager.recordElementPropertyChange(pageId, binId, elementIndex, 'text', nextText, oldText);
        }
        element.text = nextText;
    }

    applyElementEditUpdates({ element, updates, undoRedoManager, pageId, binId, elementIndex }) {
        if (!element || !updates) {
            return;
        }

        if (updates.text !== undefined) {
            this.applyTextUpdate({
                element,
                newText: updates.text,
                undoRedoManager,
                pageId,
                binId,
                elementIndex
            });
        }

        if (updates.progressEnabled !== undefined) {
            if (updates.progressEnabled) {
                element.progress = parseInt(updates.progressValue, 10) || 0;
            } else {
                delete element.progress;
            }
        }

        if (updates.recurringEnabled !== undefined) {
            if (updates.recurringEnabled) {
                element.recurringSchedule = updates.recurringSchedule;
                if (updates.recurringSchedule === 'custom') {
                    element.recurringCustomPattern = (updates.recurringCustomPattern || '').trim();
                } else {
                    delete element.recurringCustomPattern;
                }
            } else {
                delete element.recurringSchedule;
                delete element.recurringCustomPattern;
            }
        }

        if (updates.deadlineEnabled !== undefined) {
            if (updates.deadlineEnabled && updates.deadlineDate) {
                const timeValue = updates.deadlineTime || '00:00';
                element.deadline = `${updates.deadlineDate}T${timeValue}:00`;
            } else {
                delete element.deadline;
            }
        }

        if (updates.persistentEnabled !== undefined) {
            if (updates.persistentEnabled) {
                element.persistent = true;
            } else if (element.type !== 'image') {
                delete element.persistent;
            }
        }

        if (updates.timeEnabled !== undefined) {
            if (updates.timeEnabled) {
                element.timeAllocated = (updates.timeValue || '').trim();
            } else {
                element.timeAllocated = '';
            }
        } else if (updates.timeValue !== undefined) {
            element.timeAllocated = (updates.timeValue || '').trim();
        }

        if (updates.funEnabled !== undefined) {
            if (updates.funEnabled) {
                element.funModifier = (updates.funValue || '').trim();
            } else {
                element.funModifier = '';
            }
        } else if (updates.funValue !== undefined) {
            element.funModifier = (updates.funValue || '').trim();
        }

        if (updates.repeatsEnabled !== undefined) {
            element.repeats = updates.repeatsEnabled;
        }
    }
    
    /**
     * Process page data from form
     * @param {Object} formData - Raw form data
     * @returns {Object} Processed page data
     */
    processPageData(formData) {
        return formData;
    }
    
    /**
     * Process bin data from form
     * @param {Object} formData - Raw form data
     * @returns {Object} Processed bin data
     */
    processBinData(formData) {
        return formData;
    }
}

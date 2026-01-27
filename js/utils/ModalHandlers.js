// ModalHandlers.js - Handles modal events
import { getService, SERVICES } from '../core/AppServices.js';

export class ModalHandlers {
    constructor() {
        // No constructor needed
    }
    
    _getModalHandler() {
        return getService(SERVICES.MODAL_HANDLER);
    }
    
    _getAppState() {
        return getService(SERVICES.APP_STATE);
    }
    
    /**
     * Setup modal handlers
     */
    setupModalHandlers() {
        // Modal close handlers
        // Store the current edit info for the close button
        let currentEditInfo = null;
        
        document.querySelector('.modal-close').addEventListener('click', () => {
            // Use currentEdit if available, otherwise try to find it from the modal
            const appState = this._getAppState();
            const currentEdit = appState.currentEditModal;
            if (currentEdit && currentEdit.pageId && currentEdit.elementIndex !== undefined) {
                const modalHandler = this._getModalHandler();
                if (modalHandler && currentEdit) {
                    modalHandler.saveEdit(currentEdit.pageId, currentEdit.elementIndex);
                }
            } else if (currentEditInfo) {
                const modalHandler = this._getModalHandler();
                if (modalHandler) {
                    modalHandler.saveEdit(currentEditInfo.pageId, currentEditInfo.elementIndex);
                }
            } else {
                // Fallback: close modal
                const modalHandler = this._getModalHandler();
                if (modalHandler) {
                    modalHandler.closeModal();
                }
            }
        });
        
        // Track mouse down location to prevent closing when clicking inside and releasing outside
        let modalMouseDownTarget = null;
        const modalElement = document.getElementById('modal');
        
        modalElement.addEventListener('mousedown', (e) => {
            // Track what element was clicked on mousedown
            modalMouseDownTarget = e.target;
        });
        
        modalElement.addEventListener('click', (e) => {
            // Only close if both mousedown and click were on the modal background (not modal-content)
            // This prevents closing when clicking inside and releasing outside
            if (e.target.id === 'modal' && modalMouseDownTarget && modalMouseDownTarget.id === 'modal') {
                const modalHandler = this._getModalHandler();
                if (modalHandler) {
                    modalHandler.closeModal();
                }
            }
            modalMouseDownTarget = null; // Reset
        });
    }
}

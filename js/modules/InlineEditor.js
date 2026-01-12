// InlineEditor.js - Handles inline text editing functionality
import { eventBus } from '../core/EventBus.js';
import { EVENTS } from '../core/AppEvents.js';
import { getService, SERVICES, hasService } from '../core/AppServices.js';

export class InlineEditor {
    constructor() {
    }
    
    /**
     * Get services
     */
    _getAppState() {
        return getService(SERVICES.APP_STATE);
    }
    
    _getUndoRedoManager() {
        return getService(SERVICES.UNDO_REDO_MANAGER);
    }
    
    _getDataManager() {
        return getService(SERVICES.DATA_MANAGER);
    }
    
    /**
     * Enable inline editing for element text
     * @param {HTMLElement} textElement - The DOM element to make editable
     * @param {string} pageId - Page ID
     * @param {string} binId - Bin ID
     * @param {number} elementIndex - Element index
     * @param {Object} element - Element data object
     */
    enableInlineEditing(textElement, pageId, binId, elementIndex, element) {
        // Don't enable if already editing
        if (textElement.contentEditable === 'true') {
            return;
        }
        
        // Store original text
        const originalText = element.text || '';
        
        // Get plain text from element (remove HTML from links)
        let plainText = '';
        if (textElement.textContent) {
            plainText = textElement.textContent.trim();
        } else {
            plainText = originalText;
        }
        
        // Make element editable
        textElement.contentEditable = 'true';
        textElement.textContent = plainText;
        textElement.style.outline = '2px solid #4a9eff';
        textElement.style.outlineOffset = '2px';
        textElement.style.borderRadius = '2px';
        
        // Focus and select all
        textElement.focus();
        const range = document.createRange();
        range.selectNodeContents(textElement);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        
        // Handle blur (save on focus loss)
        const handleBlur = () => {
            const newText = textElement.textContent.trim();
            textElement.contentEditable = 'false';
            textElement.style.outline = '';
            textElement.style.outlineOffset = '';
            textElement.style.borderRadius = '';
            
            // Update element text if changed
            // Store as plain text (inline editing extracts plain text, which is correct)
            // Users can use markdown/HTML syntax which will be rendered by parseLinks
            if (newText !== originalText) {
                const appState = this._getAppState();
                const page = appState.pages.find(p => p.id === pageId);
                const bin = page?.bins?.find(b => b.id === binId);
                const el = bin?.elements[elementIndex];
                if (el) {
                    // Record undo/redo change
                    const undoRedoManager = this._getUndoRedoManager();
                    if (undoRedoManager) {
                        undoRedoManager.recordElementPropertyChange(pageId, binId, elementIndex, 'text', newText, originalText);
                    }
                    el.text = newText;
                    const dataManager = this._getDataManager();
                    if (dataManager) {
                        dataManager.saveData();
                    }
                    // Re-render to update links and formatting
                    eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
                }
            } else {
                // Restore original formatting even if text didn't change
                eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
            }
            
            textElement.removeEventListener('blur', handleBlur);
            textElement.removeEventListener('keydown', handleKeyDown);
        };
        
        // Handle Enter key (save and exit)
        const handleKeyDown = (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                textElement.blur();
            } else if (e.key === 'Escape') {
                // Cancel editing - restore original text
                textElement.textContent = originalText;
                textElement.blur();
            }
        };
        
        textElement.addEventListener('blur', handleBlur);
        textElement.addEventListener('keydown', handleKeyDown);
    }
}


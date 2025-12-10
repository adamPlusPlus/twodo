// InlineEditor.js - Handles inline text editing functionality
import { eventBus } from '../core/EventBus.js';
import { EVENTS } from '../core/AppEvents.js';

export class InlineEditor {
    constructor(app) {
        this.app = app;
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
            if (newText !== originalText) {
                const page = this.app.appState.pages.find(p => p.id === pageId);
                const bin = page?.bins?.find(b => b.id === binId);
                const el = bin?.elements[elementIndex];
                if (el) {
                    // Record undo/redo change
                    if (this.app.undoRedoManager) {
                        this.app.undoRedoManager.recordElementPropertyChange(pageId, binId, elementIndex, 'text', newText, originalText);
                    }
                    el.text = newText;
                    this.app.dataManager.saveData();
                    // Re-render to update links and formatting
                    eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
                }
            } else {
                // Restore original formatting even if text didn't change
                this.app.render();
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


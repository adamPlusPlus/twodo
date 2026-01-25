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
                const page = appState.documents.find(p => p.id === pageId);
                const bin = page?.groups?.find(b => b.id === binId);
                const items = bin?.items || [];
                if (bin) {
                    bin.items = items;
                }
                const el = items[elementIndex];
                if (el && el.id) {
                    // Use semantic operation if item has ID
                    const semanticOpManager = getService(SERVICES.SEMANTIC_OPERATION_MANAGER);
                    if (semanticOpManager) {
                        // Create and apply setText operation
                        const operation = semanticOpManager.createOperation('setText', el.id, {
                            text: newText,
                            oldText: originalText
                        });
                        
                        if (operation) {
                            const result = semanticOpManager.applyOperation(operation);
                            
                            if (result && result.success) {
                                // Record operation for undo/redo
                                const undoRedoManager = this._getUndoRedoManager();
                                if (undoRedoManager) {
                                    undoRedoManager.recordOperation(operation);
                                }
                                
                                // Save data
                                const dataManager = this._getDataManager();
                                if (dataManager) {
                                    dataManager.saveData();
                                }
                                
                                // Re-render (operation:applied event already emitted)
                                eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
                            } else {
                                console.error('[InlineEditor] Failed to apply setText operation');
                                // Fallback to direct manipulation
                                el.text = newText;
                                const dataManager = this._getDataManager();
                                if (dataManager) {
                                    dataManager.saveData();
                                }
                                eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
                            }
                        } else {
                            // Fallback if operation creation failed
                            el.text = newText;
                            const dataManager = this._getDataManager();
                            if (dataManager) {
                                dataManager.saveData();
                            }
                            eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
                        }
                    } else {
                        // Fallback to direct manipulation if manager not available
                        const undoRedoManager = this._getUndoRedoManager();
                        if (undoRedoManager) {
                            undoRedoManager.recordElementPropertyChange(pageId, binId, elementIndex, 'text', newText, originalText);
                        }
                        el.text = newText;
                        const dataManager = this._getDataManager();
                        if (dataManager) {
                            dataManager.saveData();
                        }
                        eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
                    }
                } else if (el) {
                    // Fallback for items without ID (backward compatibility)
                    const undoRedoManager = this._getUndoRedoManager();
                    if (undoRedoManager) {
                        undoRedoManager.recordElementPropertyChange(pageId, binId, elementIndex, 'text', newText, originalText);
                    }
                    el.text = newText;
                    const dataManager = this._getDataManager();
                    if (dataManager) {
                        dataManager.saveData();
                    }
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


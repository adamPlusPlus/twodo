// ModalRenderer.js - Handles modal UI rendering (DOM manipulation)
// Extracted from ModalHandler to separate UI concerns from business logic
import { StringUtils } from '../../utils/string.js';
import { DOMUtils } from '../../utils/dom.js';
import { ModalBuilder } from '../../utils/ModalBuilder.js?v=103';
import { DOMBuilder } from '../../utils/DOMBuilder.js?v=103';

/**
 * ModalRenderer - Handles all modal DOM rendering
 * 
 * This class is responsible for:
 * - Creating modal DOM structures
 * - Rendering modal content
 * - Managing modal visibility
 * - DOM manipulation for modals
 */
export class ModalRenderer {
    constructor() {
        this.modal = document.getElementById('modal');
        this.modalContent = this.modal?.querySelector('.modal-content');
    }
    
    /**
     * Show modal
     */
    show() {
        if (this.modal) {
            this.modal.classList.add('active');
        }
    }
    
    /**
     * Hide modal
     */
    hide() {
        if (this.modal) {
            this.modal.classList.remove('active');
            this.modal.style.display = 'none';
        }
    }
    
    /**
     * Set modal content HTML
     * @param {string} html - HTML content
     */
    setContent(html) {
        if (this.modalContent) {
            this.modalContent.innerHTML = html;
        }
    }
    
    /**
     * Get modal body element
     * @returns {HTMLElement|null}
     */
    getModalBody() {
        return document.getElementById('modal-body');
    }
    
    /**
     * Escape HTML for safe rendering
     * @param {string} text - Text to escape
     * @returns {string}
     */
    escapeHtml(text) {
        return StringUtils.escapeHtml(text);
    }
    
    /**
     * Render element type options HTML
     * @param {Array} options - Array of {key, type, label}
     * @returns {string} HTML string
     */
    renderElementTypeOptions(options) {
        return options.map(opt => {
            const keyDisplay = opt.key.toUpperCase();
            return `<div class="element-type-option" data-type="${opt.type}" data-key="${opt.key}" style="padding: 5px; cursor: pointer; user-select: none;"><strong>${keyDisplay}</strong> - ${this.escapeHtml(opt.label)}</div>`;
        }).join('');
    }
    
    /**
     * Setup close button handler
     * @param {Function} onClose - Close handler function
     */
    setupCloseButton(onClose) {
        const closeBtn = this.modalContent?.querySelector('.modal-close');
        if (closeBtn) {
            closeBtn.onclick = onClose;
        }
    }
}

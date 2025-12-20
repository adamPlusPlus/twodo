// ModalBuilder.js - Standardized modal creation utility
// Reduces boilerplate in modal creation code
// Version: 1766175000

import { DOMBuilder } from './DOMBuilder.js?v=103';
import { StringUtils } from './string.js';

export class ModalBuilder {
    constructor(app) {
        this.app = app;
        this.modal = null;
        this.modalContent = null;
        this.modalBody = null;
        this.title = '';
        this.content = '';
        this.buttons = [];
        this.inputs = [];
        this.size = { width: 'auto', height: 'auto' };
        this.onCloseHandler = null;
        this.closable = true;
        this.id = StringUtils.generateId('modal');
    }
    
    /**
     * Set modal title
     * @param {string} title - Modal title
     * @returns {ModalBuilder} This builder for chaining
     */
    setTitle(title) {
        this.title = title;
        return this;
    }
    
    /**
     * Set modal body content
     * @param {string|HTMLElement} content - Content (HTML string or element)
     * @returns {ModalBuilder} This builder for chaining
     */
    setContent(content) {
        this.content = content;
        return this;
    }
    
    /**
     * Add a button to the modal
     * @param {string} text - Button text
     * @param {Function} handler - Click handler
     * @param {Object} options - Button options
     * @param {string} options.class - Button CSS class
     * @param {boolean} options.primary - Whether button is primary (default: false)
     * @param {boolean} options.closeOnClick - Whether to close modal on click (default: true)
     * @returns {ModalBuilder} This builder for chaining
     */
    addButton(text, handler, options = {}) {
        const {
            class: className = '',
            primary = false,
            closeOnClick = true
        } = options;
        
        console.log('[ModalBuilder.addButton] Entry - text:', text, 'className:', className, 'type:', typeof className, 'primary:', primary, 'options:', options);
        
        // Clean up className - remove empty strings and whitespace-only strings
        // CRITICAL: Never allow empty string to be stored - always use null
        let finalClassName = null; // Use null instead of empty string
        
        if (primary) {
            // If className is empty or whitespace, just use 'primary'
            if (className && typeof className === 'string' && className.trim()) {
                const combined = `primary ${className.trim()}`.trim();
                finalClassName = combined || 'primary';
            } else {
                finalClassName = 'primary';
            }
        } else if (className && typeof className === 'string') {
            const trimmed = className.trim();
            // Only set if trimmed has actual content - NEVER set to empty string
            if (trimmed && trimmed.length > 0) {
                finalClassName = trimmed;
            }
            // If trimmed is empty, finalClassName stays null (not empty string)
        }
        // If className is empty string '', finalClassName stays null
        // If className is null/undefined, finalClassName stays null
        
        console.log('[ModalBuilder.addButton] finalClassName:', finalClassName, 'type:', typeof finalClassName, 'isNull:', finalClassName === null, 'isEmptyString:', finalClassName === '', 'willStore:', finalClassName);
        
        // FINAL SAFETY CHECK: Never push empty string
        if (finalClassName === '') {
            console.error('[ModalBuilder.addButton] CRITICAL: finalClassName is empty string! Setting to null.');
            finalClassName = null;
        }
        
        this.buttons.push({
            text,
            handler,
            className: finalClassName, // Store null if no valid class, NEVER empty string
            closeOnClick
        });
        return this;
    }
    
    /**
     * Add an input field to the modal
     * @param {string} id - Input ID
     * @param {string} label - Input label
     * @param {string} type - Input type (default: 'text')
     * @param {*} value - Initial value
     * @param {Object} options - Input options
     * @param {string} options.placeholder - Placeholder text
     * @param {boolean} options.required - Whether input is required
     * @returns {ModalBuilder} This builder for chaining
     */
    addInput(id, label, type = 'text', value = '', options = {}) {
        const {
            placeholder = '',
            required = false
        } = options;
        
        this.inputs.push({
            id,
            label,
            type,
            value,
            placeholder,
            required
        });
        return this;
    }
    
    /**
     * Set modal size
     * @param {string|number} width - Modal width
     * @param {string|number} height - Modal height
     * @returns {ModalBuilder} This builder for chaining
     */
    setSize(width, height) {
        this.size = { width, height };
        return this;
    }
    
    /**
     * Set close handler
     * @param {Function} handler - Handler function called when modal closes
     * @returns {ModalBuilder} This builder for chaining
     */
    onClose(handler) {
        this.onCloseHandler = handler;
        return this;
    }
    
    /**
     * Set whether modal is closable
     * @param {boolean} closable - Whether modal can be closed (default: true)
     * @returns {ModalBuilder} This builder for chaining
     */
    setClosable(closable) {
        this.closable = closable;
        return this;
    }
    
    /**
     * Set modal ID
     * @param {string} id - Modal ID
     * @returns {ModalBuilder} This builder for chaining
     */
    setId(id) {
        this.id = id;
        return this;
    }
    
    /**
     * Build and show the modal
     * @returns {HTMLElement} The modal element
     */
    show() {
        // Get or create modal container
        let modal = document.getElementById('modal');
        if (!modal) {
            modal = DOMBuilder.create('div')
                .attr('id', 'modal')
                .class('modal')
                .build();
            document.body.appendChild(modal);
        }
        
        // Create modal content
        const modalContent = DOMBuilder.create('div')
            .class('modal-content')
            .build();
        
        // Set size if specified
        if (this.size.width !== 'auto') {
            modalContent.style.width = typeof this.size.width === 'number' 
                ? `${this.size.width}px` 
                : this.size.width;
        }
        if (this.size.height !== 'auto') {
            modalContent.style.height = typeof this.size.height === 'number' 
                ? `${this.size.height}px` 
                : this.size.height;
        }
        
        // Add close button if closable
        if (this.closable) {
            const closeBtn = DOMBuilder.create('span')
                .class('modal-close')
                .text('×')
                .on('click', () => this.close())
                .build();
            modalContent.appendChild(closeBtn);
        }
        
        // Add title if provided
        if (this.title) {
            const titleEl = DOMBuilder.create('h3')
                .text(this.title)
                .build();
            modalContent.appendChild(titleEl);
        }
        
        // Create modal body
        const modalBody = DOMBuilder.create('div')
            .attr('id', 'modal-body')
            .build();
        
        // Add inputs
        this.inputs.forEach(input => {
            const inputContainer = DOMBuilder.create('div')
                .class('modal-input-group')
                .build();
            
            if (input.label) {
                const label = DOMBuilder.create('label')
                    .attr('for', input.id)
                    .text(input.label)
                    .build();
                inputContainer.appendChild(label);
            }
            
            const inputEl = DOMBuilder.create('input')
                .attr('id', input.id)
                .attr('type', input.type)
                .attr('value', input.value)
                .attr('placeholder', input.placeholder)
                .attr('required', input.required)
                .build();
            
            inputContainer.appendChild(inputEl);
            modalBody.appendChild(inputContainer);
        });
        
        // Add content
        if (this.content) {
            if (typeof this.content === 'string') {
                const contentDiv = DOMBuilder.create('div')
                    .html(this.content)
                    .build();
                modalBody.appendChild(contentDiv);
            } else if (this.content instanceof HTMLElement) {
                modalBody.appendChild(this.content);
            }
        }
        
        // Add buttons
        if (this.buttons.length > 0) {
            const buttonContainer = DOMBuilder.create('div')
                .class('modal-buttons')
                .build();
            
            this.buttons.forEach((button, index) => {
                console.log('[ModalBuilder.show] Processing button', index, '- text:', button.text, 'className:', button.className, 'type:', typeof button.className, 'isNull:', button.className === null, 'isEmptyString:', button.className === '');
                
                const btn = DOMBuilder.create('button');
                
                // CRITICAL: Only add class if it exists, is not empty, and has non-whitespace content
                // Multiple safety checks to prevent any empty strings from reaching DOMBuilder
                const className = button.className;
                
                // SAFETY CHECK: If somehow we got an empty string, convert to null
                if (className === '') {
                    console.error('[ModalBuilder.show] CRITICAL: button.className is empty string! Skipping class addition.');
                    // Don't call btn.class() at all
                } else if (className && 
                    typeof className === 'string' && 
                    className !== '' &&
                    className.trim().length > 0) {
                    const trimmed = className.trim();
                    // Final check before calling class()
                    if (trimmed && trimmed.length > 0) {
                        console.log('[ModalBuilder.show] Calling btn.class() with:', trimmed);
                        btn.class(trimmed);
                    } else {
                        console.warn('[ModalBuilder.show] Skipping btn.class() - trimmed is empty');
                    }
                } else {
                    console.log('[ModalBuilder.show] Skipping btn.class() - className is null/undefined/empty');
                }
                
                const btnElement = btn.text(button.text)
                    .on('click', (e) => {
                        if (button.handler) {
                            button.handler(e);
                        }
                        if (button.closeOnClick) {
                            this.close();
                        }
                    })
                    .build();
                buttonContainer.appendChild(btnElement);
            });
            
            modalBody.appendChild(buttonContainer);
        }
        
        modalContent.appendChild(modalBody);
        modal.innerHTML = '';
        modal.appendChild(modalContent);
        
        // Store references
        this.modal = modal;
        this.modalContent = modalContent;
        this.modalBody = modalBody;
        
        // Show modal
        modal.classList.add('active');
        
        // Focus first input if available
        if (this.inputs.length > 0) {
            setTimeout(() => {
                const firstInput = modalBody.querySelector('input');
                if (firstInput) {
                    firstInput.focus();
                    firstInput.select();
                }
            }, 50);
        }
        
        // Setup click outside to close
        if (this.closable) {
            const clickOutsideHandler = (e) => {
                if (e.target === modal) {
                    this.close();
                }
            };
            modal.addEventListener('click', clickOutsideHandler);
            this._clickOutsideHandler = clickOutsideHandler;
        }
        
        return modal;
    }
    
    /**
     * Close the modal
     */
    close() {
        if (this.modal) {
            this.modal.classList.remove('active');
            
            // Remove click outside handler
            if (this._clickOutsideHandler) {
                this.modal.removeEventListener('click', this._clickOutsideHandler);
                this._clickOutsideHandler = null;
            }
            
            // Call close handler
            if (this.onCloseHandler) {
                this.onCloseHandler();
            }
        }
    }
    
    /**
     * Get the modal element
     * @returns {HTMLElement|null} Modal element
     */
    getModal() {
        return this.modal;
    }
    
    /**
     * Get the modal body element
     * @returns {HTMLElement|null} Modal body element
     */
    getBody() {
        return this.modalBody;
    }
}


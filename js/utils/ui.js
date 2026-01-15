// UI Component Utilities - Modal, form, and UI component helpers
import { DOMUtils } from './dom.js';
import { StringUtils } from './string.js';

export const UIUtils = {
    /**
     * Create modal element
     * @param {Object} options - Modal options
     * @returns {HTMLElement}
     */
    createModal(options = {}) {
        const {
            id = StringUtils.generateId('modal'),
            title = '',
            content = '',
            footer = '',
            closable = true,
            size = 'medium' // small, medium, large, fullscreen
        } = options;
        
        const modal = DOMUtils.createElement('div', {
            id,
            class: 'modal'
        });
        
        const sizeClasses = {
            small: 'modal-small',
            medium: 'modal-medium',
            large: 'modal-large',
            fullscreen: 'modal-fullscreen'
        };
        
        const modalContent = DOMUtils.createElement('div', {
            class: `modal-content ${sizeClasses[size] || ''}`
        });
        
        if (closable) {
            const closeBtn = DOMUtils.createElement('span', {
                class: 'modal-close'
            }, '×');
            modalContent.appendChild(closeBtn);
        }
        
        if (title) {
            const titleElement = DOMUtils.createElement('h3', {}, title);
            modalContent.appendChild(titleElement);
        }
        
        const body = DOMUtils.createElement('div', {
            class: 'modal-body'
        });
        
        if (typeof content === 'string') {
            body.innerHTML = content;
        } else if (content instanceof Node) {
            body.appendChild(content);
        }
        
        modalContent.appendChild(body);
        
        if (footer) {
            const footerElement = DOMUtils.createElement('div', {
                class: 'modal-footer'
            });
            
            if (typeof footer === 'string') {
                footerElement.innerHTML = footer;
            } else if (footer instanceof Node) {
                footerElement.appendChild(footer);
            }
            
            modalContent.appendChild(footerElement);
        }
        
        modal.appendChild(modalContent);
        
        return modal;
    },
    
    /**
     * Show modal
     * @param {HTMLElement|string} modal - Modal element or ID
     */
    showModal(modal) {
        const modalElement = typeof modal === 'string' 
            ? document.getElementById(modal) 
            : modal;
        
        if (modalElement) {
            DOMUtils.addClass(modalElement, 'active');
        }
    },
    
    /**
     * Hide modal
     * @param {HTMLElement|string} modal - Modal element or ID
     */
    hideModal(modal) {
        const modalElement = typeof modal === 'string' 
            ? document.getElementById(modal) 
            : modal;
        
        if (modalElement) {
            DOMUtils.removeClass(modalElement, 'active');
        }
    },
    
    /**
     * Create button element
     * @param {Object} options - Button options
     * @returns {HTMLElement}
     */
    createButton(options = {}) {
        const {
            text = 'Button',
            onClick = null,
            type = 'button',
            class: className = '',
            disabled = false,
            icon = ''
        } = options;
        
        const button = DOMUtils.createElement('button', {
            type,
            class: className,
            disabled
        });
        
        if (icon) {
            const iconElement = DOMUtils.createElement('span', {
                class: 'button-icon'
            }, icon);
            button.appendChild(iconElement);
        }
        
        button.appendChild(document.createTextNode(text));
        
        if (onClick) {
            button.addEventListener('click', onClick);
        }
        
        return button;
    },
    
    /**
     * Create input element
     * @param {Object} options - Input options
     * @returns {HTMLElement}
     */
    createInput(options = {}) {
        const {
            type = 'text',
            name = '',
            value = '',
            placeholder = '',
            required = false,
            disabled = false,
            class: className = '',
            id = ''
        } = options;
        
        return DOMUtils.createElement('input', {
            type,
            id,
            name,
            value,
            placeholder,
            required,
            disabled,
            class: className
        });
    },
    
    /**
     * Create select element
     * @param {Object} options - Select options
     * @returns {HTMLElement}
     */
    createSelect(options = {}) {
        const {
            name = '',
            options: selectOptions = [],
            value = '',
            class: className = '',
            id = ''
        } = options;
        
        const select = DOMUtils.createElement('select', {
            id,
            name,
            class: className
        });
        
        selectOptions.forEach(opt => {
            const option = DOMUtils.createElement('option', {
                value: opt.value || opt,
                selected: (opt.value || opt) === value
            }, opt.label || opt);
            select.appendChild(option);
        });
        
        return select;
    },
    
    /**
     * Create form element
     * @param {Object} options - Form options
     * @returns {HTMLElement}
     */
    createForm(options = {}) {
        const {
            fields = [],
            onSubmit = null,
            class: className = ''
        } = options;
        
        const form = DOMUtils.createElement('form', {
            class: className
        });
        
        fields.forEach(field => {
            const fieldContainer = DOMUtils.createElement('div', {
                class: 'form-field'
            });
            
            if (field.label) {
                const label = DOMUtils.createElement('label', {
                    for: field.id || field.name
                }, field.label);
                fieldContainer.appendChild(label);
            }
            
            let input;
            switch (field.type) {
                case 'select':
                    input = this.createSelect(field);
                    break;
                case 'textarea':
                    input = DOMUtils.createElement('textarea', {
                        id: field.id,
                        name: field.name,
                        placeholder: field.placeholder,
                        required: field.required
                    }, field.value || '');
                    break;
                default:
                    input = this.createInput(field);
            }
            
            fieldContainer.appendChild(input);
            
            if (field.error) {
                const error = DOMUtils.createElement('div', {
                    class: 'form-error'
                }, field.error);
                fieldContainer.appendChild(error);
            }
            
            form.appendChild(fieldContainer);
        });
        
        if (onSubmit) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                onSubmit(new FormData(form));
            });
        }
        
        return form;
    },
    
    /**
     * Show tooltip
     * @param {HTMLElement} element - Target element
     * @param {string} text - Tooltip text
     * @param {Object} options - Tooltip options
     */
    showTooltip(element, text, options = {}) {
        const {
            position = 'top',
            delay = 0
        } = options;
        
        const tooltip = DOMUtils.createElement('div', {
            class: `tooltip tooltip-${position}`
        }, text);
        
        document.body.appendChild(tooltip);
        
        const rect = element.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();
        
        let top, left;
        switch (position) {
            case 'top':
                top = rect.top - tooltipRect.height - 8;
                left = rect.left + (rect.width - tooltipRect.width) / 2;
                break;
            case 'bottom':
                top = rect.bottom + 8;
                left = rect.left + (rect.width - tooltipRect.width) / 2;
                break;
            case 'left':
                top = rect.top + (rect.height - tooltipRect.height) / 2;
                left = rect.left - tooltipRect.width - 8;
                break;
            case 'right':
                top = rect.top + (rect.height - tooltipRect.height) / 2;
                left = rect.right + 8;
                break;
        }
        
        tooltip.style.position = 'fixed';
        tooltip.style.top = `${top}px`;
        tooltip.style.left = `${left}px`;
        tooltip.style.zIndex = '10000';
        
        setTimeout(() => {
            DOMUtils.addClass(tooltip, 'active');
        }, delay);
        
        return () => {
            DOMUtils.remove(tooltip);
        };
    },
    
    /**
     * Show loading indicator
     * @param {HTMLElement|string} container - Container element or ID
     * @param {string} text - Loading text
     */
    showLoading(container, text = 'Loading...') {
        const containerElement = typeof container === 'string' 
            ? document.getElementById(container) 
            : container;
        
        if (!containerElement) return;
        
        const loader = DOMUtils.createElement('div', {
            class: 'loading-indicator'
        });
        
        const spinner = DOMUtils.createElement('div', {
            class: 'spinner'
        });
        loader.appendChild(spinner);
        
        if (text) {
            const textElement = DOMUtils.createElement('div', {
                class: 'loading-text'
            }, text);
            loader.appendChild(textElement);
        }
        
        containerElement.appendChild(loader);
        
        return () => {
            DOMUtils.remove(loader);
        };
    }
};


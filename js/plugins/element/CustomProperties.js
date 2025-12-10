// CustomProperties - Element plugin for custom properties
import { BaseElementType } from '../../core/BaseElementType.js';
import { DOMUtils } from '../../utils/dom.js';
import { StringUtils } from '../../utils/string.js';

export default class CustomProperties extends BaseElementType {
    constructor() {
        super({
            id: 'custom-properties',
            name: 'Custom Properties',
            elementType: 'custom-properties',
            version: '1.0.0',
            description: 'Add custom properties to elements'
        });
    }
    
    createTemplate() {
        return {
            type: 'task',
            text: '',
            completed: false,
            repeats: false,
            persistent: false,
            children: [],
            customProperties: {}
        };
    }
    
    render(container, element, context) {
        // This plugin doesn't render a new element type
        // Instead, it adds UI to existing elements for managing custom properties
        return container;
    }
    
    /**
     * Render custom properties UI in edit modal
     * @param {HTMLElement} container - Container element
     * @param {Object} element - Element data
     * @param {Object} context - Context
     * @returns {HTMLElement}
     */
    renderEditUI(container, element, context) {
        if (!element.customProperties) {
            element.customProperties = {};
        }
        
        const section = DOMUtils.createElement('div', {
            class: 'custom-properties-section'
        });
        
        const title = DOMUtils.createElement('h4', {}, 'Custom Properties');
        section.appendChild(title);
        
        const propertiesList = DOMUtils.createElement('div', {
            id: 'custom-properties-list',
            class: 'custom-properties-list'
        });
        
        // Render existing properties
        Object.keys(element.customProperties).forEach(key => {
            const propertyItem = this.renderPropertyItem(key, element.customProperties[key]);
            propertiesList.appendChild(propertyItem);
        });
        
        section.appendChild(propertiesList);
        
        const addBtn = DOMUtils.createElement('button', {
            type: 'button',
            class: 'add-custom-property-btn'
        }, '+ Add Property');
        
        addBtn.addEventListener('click', () => {
            this.showAddPropertyModal(element, context);
        });
        
        section.appendChild(addBtn);
        container.appendChild(section);
        
        return section;
    }
    
    renderPropertyItem(key, value) {
        const item = DOMUtils.createElement('div', {
            class: 'custom-property-item',
            style: 'display: flex; gap: 10px; margin-bottom: 10px; padding: 8px; background: #1a1a1a; border-radius: 4px; align-items: center;'
        });
        
        const keyInput = DOMUtils.createElement('input', {
            type: 'text',
            class: 'custom-property-key',
            value: key,
            placeholder: 'Property name',
            style: 'flex: 1; padding: 6px; background: #2a2a2a; color: #e0e0e0; border: 1px solid #555; border-radius: 4px;'
        });
        
        const valueInput = DOMUtils.createElement('input', {
            type: 'text',
            class: 'custom-property-value',
            value: value,
            placeholder: 'Property value',
            style: 'flex: 1; padding: 6px; background: #2a2a2a; color: #e0e0e0; border: 1px solid #555; border-radius: 4px;'
        });
        
        const removeBtn = DOMUtils.createElement('button', {
            type: 'button',
            class: 'remove-custom-property-btn',
            style: 'padding: 6px 12px; background: #e74c3c; color: white; border: none; border-radius: 4px; cursor: pointer;'
        }, 'Remove');
        
        removeBtn.addEventListener('click', () => {
            item.remove();
        });
        
        item.appendChild(keyInput);
        item.appendChild(valueInput);
        item.appendChild(removeBtn);
        
        return item;
    }
    
    showAddPropertyModal(element, context) {
        const modal = document.getElementById('modal');
        const modalBody = document.getElementById('modal-body');
        
        let html = `
            <h3>Add Custom Property</h3>
            <label>Property Name:</label>
            <input type="text" id="new-property-key" placeholder="e.g., priority, status, assignee" style="width: 100%; padding: 8px; margin-bottom: 15px; background: #1a1a1a; color: #e0e0e0; border: 1px solid #555; border-radius: 4px;" />
            <label>Property Value:</label>
            <input type="text" id="new-property-value" placeholder="Property value" style="width: 100%; padding: 8px; margin-bottom: 15px; background: #1a1a1a; color: #e0e0e0; border: 1px solid #555; border-radius: 4px;" />
            <div style="margin-top: 20px;">
                <button id="add-property-confirm-btn" style="padding: 8px 16px; background: #4a9eff; color: white; border: none; border-radius: 4px; cursor: pointer; margin-right: 10px;">
                    Add Property
                </button>
                <button class="cancel" onclick="app.modalHandler.closeModal()">Cancel</button>
            </div>
        `;
        
        modalBody.innerHTML = html;
        modal.classList.add('active');
        
        document.getElementById('add-property-confirm-btn').addEventListener('click', () => {
            const key = document.getElementById('new-property-key').value.trim();
            const value = document.getElementById('new-property-value').value.trim();
            
            if (!key) {
                alert('Please enter a property name');
                return;
            }
            
            if (!element.customProperties) {
                element.customProperties = {};
            }
            
            element.customProperties[key] = value;
            
            this.app.dataManager.saveData();
            this.app.modalHandler.closeModal();
            
            // Re-open edit modal to show new property
            setTimeout(() => {
                this.app.modalHandler.showEditModal(context.pageId, context.binId, context.elementIndex, element);
            }, 100);
        });
        
        // Focus on key input
        setTimeout(() => {
            document.getElementById('new-property-key').focus();
        }, 100);
    }
    
    /**
     * Save custom properties from edit modal
     * @param {Object} element - Element data
     * @param {HTMLElement} modalBody - Modal body element
     */
    saveEditModalContent(element, modalBody) {
        if (!element.customProperties) {
            element.customProperties = {};
        }
        
        // Get all property items
        const propertyItems = modalBody.querySelectorAll('.custom-property-item');
        const newProperties = {};
        
        propertyItems.forEach(item => {
            const keyInput = item.querySelector('.custom-property-key');
            const valueInput = item.querySelector('.custom-property-value');
            
            if (keyInput && valueInput) {
                const key = keyInput.value.trim();
                const value = valueInput.value.trim();
                
                if (key) {
                    newProperties[key] = value;
                }
            }
        });
        
        element.customProperties = newProperties;
    }
}


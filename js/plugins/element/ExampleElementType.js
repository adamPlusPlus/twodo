// ExampleElementType - Example element type plugin template
import { BaseElementType } from '../../core/BaseElementType.js';
import { DOMUtils } from '../../utils/dom.js';
import { StringUtils } from '../../utils/string.js';

export default class ExampleElementType extends BaseElementType {
    constructor() {
        super({
            id: 'example-element-type',
            name: 'Example Element',
            elementType: 'example',
            keyboardShortcut: 'e',
            icon: '📝',
            version: '1.0.0',
            description: 'An example element type demonstrating the element plugin API'
        });
    }
    
    createTemplate() {
        return {
            type: 'example',
            text: 'Example element',
            completed: false,
            repeats: false,
            persistent: false,
            children: [],
            exampleData: 'default value'
        };
    }
    
    render(container, element, context) {
        // Render element
        const elementId = `${context.pageId}-${context.binId}-${context.elementIndex}`;
        const elementDiv = DOMUtils.createElement('div', {
            class: 'element example-element',
            'data-page-id': context.pageId,
            'data-bin-id': context.binId,
            'data-element-index': context.elementIndex,
            'data-element-id': elementId
        });
        
        const checkbox = DOMUtils.createElement('input', {
            type: 'checkbox',
            checked: element.completed || false,
            class: 'element-checkbox'
        });
        
        checkbox.addEventListener('change', (e) => {
            const page = this.app.documents?.find(p => p.id === context.pageId);
            const bin = page?.groups?.find(b => b.id === context.binId);
            const items = bin?.items || [];
            if (bin) {
                bin.items = items;
            }
            if (items[context.elementIndex]) {
                items[context.elementIndex].completed = e.target.checked;
                this.app.dataManager.saveData();
                this.app.render();
            }
        });
        
        const textSpan = DOMUtils.createElement('span', {
            class: 'element-text'
        }, element.text || 'Example element');
        
        elementDiv.appendChild(checkbox);
        elementDiv.appendChild(textSpan);
        container.appendChild(elementDiv);
        return elementDiv;
    }
    
    renderEditUI(container, element, context) {
        // Render edit UI
        const form = DOMUtils.createElement('div', {
            class: 'element-edit-form'
        });
        
        const textLabel = DOMUtils.createElement('label', {}, 'Text:');
        form.appendChild(textLabel);
        
        const textInput = DOMUtils.createElement('input', {
            type: 'text',
            id: 'edit-example-text',
            value: element.text || ''
        });
        form.appendChild(textInput);
        
        const dataLabel = DOMUtils.createElement('label', {}, 'Example Data:');
        form.appendChild(dataLabel);
        
        const dataInput = DOMUtils.createElement('input', {
            type: 'text',
            id: 'edit-example-data',
            value: element.exampleData || ''
        });
        form.appendChild(dataInput);
        
        container.appendChild(form);
        return form;
    }
    
    validate(element) {
        const errors = [];
        
        if (!element.text || element.text.trim().length === 0) {
            errors.push('Text is required');
        }
        
        return {
            valid: errors.length === 0,
            errors
        };
    }
}


// ContactElement.js - Contact information element type
import { BaseElementType } from '../../core/BaseElementType.js';
import { DOMUtils } from '../../utils/dom.js';
import { StringUtils } from '../../utils/string.js';

export default class ContactElement extends BaseElementType {
    constructor() {
        super({
            id: 'contact-element',
            name: 'Contact',
            description: 'Store contact information.',
            elementType: 'contact',
            keyboardShortcut: 'o'
        });
    }
    
    getDefaultData() {
        return {
            type: 'contact',
            text: '',
            contact: {
                name: '',
                email: '',
                phone: '',
                company: '',
                address: '',
                notes: ''
            },
            completed: false,
            persistent: true,
            children: []
        };
    }
    
    render(element, pageId, binId, elementIndex, container) {
        const contactDiv = DOMUtils.createElement('div', {
            className: 'element contact-element',
            dataset: {
                pageId: pageId,
                binId: binId,
                elementIndex: elementIndex
            },
            style: 'padding: 15px; background: #2a2a2a; border-radius: 4px; margin-bottom: 10px; border-left: 4px solid #9b59b6;'
        });
        
        const contact = element.contact || {};
        
        // Contact name
        const name = DOMUtils.createElement('div', {
            className: 'contact-name',
            style: 'font-weight: bold; font-size: 16px; color: #e0e0e0; margin-bottom: 10px;'
        }, StringUtils.escapeHtml(contact.name || element.text || 'Unnamed Contact'));
        
        contactDiv.appendChild(name);
        
        // Contact details
        const details = DOMUtils.createElement('div', {
            className: 'contact-details',
            style: 'font-size: 12px; color: #ccc; line-height: 1.8;'
        });
        
        if (contact.email) {
            const email = DOMUtils.createElement('div', {
                style: 'display: flex; align-items: center; gap: 5px;'
            });
            email.innerHTML = `<span>📧</span> <a href="mailto:${StringUtils.escapeHtml(contact.email)}" style="color: #4a9eff;">${StringUtils.escapeHtml(contact.email)}</a>`;
            details.appendChild(email);
        }
        
        if (contact.phone) {
            const phone = DOMUtils.createElement('div', {
                style: 'display: flex; align-items: center; gap: 5px;'
            });
            phone.innerHTML = `<span>📞</span> <a href="tel:${StringUtils.escapeHtml(contact.phone)}" style="color: #4a9eff;">${StringUtils.escapeHtml(contact.phone)}</a>`;
            details.appendChild(phone);
        }
        
        if (contact.company) {
            const company = DOMUtils.createElement('div', {
                style: 'display: flex; align-items: center; gap: 5px;'
            });
            company.innerHTML = `<span>🏢</span> ${StringUtils.escapeHtml(contact.company)}`;
            details.appendChild(company);
        }
        
        if (contact.address) {
            const address = DOMUtils.createElement('div', {
                style: 'display: flex; align-items: center; gap: 5px;'
            });
            address.innerHTML = `<span>📍</span> ${StringUtils.escapeHtml(contact.address)}`;
            details.appendChild(address);
        }
        
        if (contact.notes) {
            const notes = DOMUtils.createElement('div', {
                style: 'margin-top: 10px; padding: 8px; background: #1a1a1a; border-radius: 4px; font-style: italic;'
            }, StringUtils.escapeHtml(contact.notes));
            details.appendChild(notes);
        }
        
        contactDiv.appendChild(details);
        container.appendChild(contactDiv);
    }
    
    renderEditModalContent(elementData, pageId, binId, elementIndex) {
        const contact = elementData.contact || {};
        
        return `
            <div style="margin-top: 15px;">
                <label>Name:</label>
                <input type="text" id="contact-name-input" value="${StringUtils.escapeHtml(contact.name || elementData.text || '')}" 
                       style="width: 100%; padding: 8px; margin-top: 5px; background: #1a1a1a; color: #e0e0e0; border: 1px solid #555; border-radius: 4px;" />
            </div>
            <div style="margin-top: 15px;">
                <label>Email:</label>
                <input type="email" id="contact-email-input" value="${StringUtils.escapeHtml(contact.email || '')}" 
                       style="width: 100%; padding: 8px; margin-top: 5px; background: #1a1a1a; color: #e0e0e0; border: 1px solid #555; border-radius: 4px;" />
            </div>
            <div style="margin-top: 15px;">
                <label>Phone:</label>
                <input type="tel" id="contact-phone-input" value="${StringUtils.escapeHtml(contact.phone || '')}" 
                       style="width: 100%; padding: 8px; margin-top: 5px; background: #1a1a1a; color: #e0e0e0; border: 1px solid #555; border-radius: 4px;" />
            </div>
            <div style="margin-top: 15px;">
                <label>Company:</label>
                <input type="text" id="contact-company-input" value="${StringUtils.escapeHtml(contact.company || '')}" 
                       style="width: 100%; padding: 8px; margin-top: 5px; background: #1a1a1a; color: #e0e0e0; border: 1px solid #555; border-radius: 4px;" />
            </div>
            <div style="margin-top: 15px;">
                <label>Address:</label>
                <textarea id="contact-address-input" 
                          style="width: 100%; height: 60px; padding: 8px; margin-top: 5px; background: #1a1a1a; color: #e0e0e0; border: 1px solid #555; border-radius: 4px;"
                          placeholder="Street, City, State, ZIP">${StringUtils.escapeHtml(contact.address || '')}</textarea>
            </div>
            <div style="margin-top: 15px;">
                <label>Notes:</label>
                <textarea id="contact-notes-input" 
                          style="width: 100%; height: 80px; padding: 8px; margin-top: 5px; background: #1a1a1a; color: #e0e0e0; border: 1px solid #555; border-radius: 4px;"
                          placeholder="Additional notes">${StringUtils.escapeHtml(contact.notes || '')}</textarea>
            </div>
        `;
    }
    
    saveEditModalContent(elementData, modalBody) {
        const nameInput = modalBody.querySelector('#contact-name-input');
        const emailInput = modalBody.querySelector('#contact-email-input');
        const phoneInput = modalBody.querySelector('#contact-phone-input');
        const companyInput = modalBody.querySelector('#contact-company-input');
        const addressInput = modalBody.querySelector('#contact-address-input');
        const notesInput = modalBody.querySelector('#contact-notes-input');
        
        if (!elementData.contact) elementData.contact = {};
        
        if (nameInput) {
            elementData.text = nameInput.value.trim();
            elementData.contact.name = nameInput.value.trim();
        }
        if (emailInput) {
            elementData.contact.email = emailInput.value.trim();
        }
        if (phoneInput) {
            elementData.contact.phone = phoneInput.value.trim();
        }
        if (companyInput) {
            elementData.contact.company = companyInput.value.trim();
        }
        if (addressInput) {
            elementData.contact.address = addressInput.value.trim();
        }
        if (notesInput) {
            elementData.contact.notes = notesInput.value.trim();
        }
    }
}


// ElementRelationships - Element relationships plugin
import { BaseElementType } from '../../core/BaseElementType.js';
import { DOMUtils } from '../../utils/dom.js';
import { StringUtils } from '../../utils/string.js';

export default class ElementRelationships extends BaseElementType {
    constructor() {
        super({
            id: 'element-relationships',
            name: 'Element Relationships',
            elementType: 'relationship',
            version: '1.0.0',
            description: 'Link elements with relationships (blocks, depends on, related to)'
        });
    }
    
    /**
     * Create relationship template (not used as element type, but as feature)
     */
    createTemplate() {
        return {
            type: 'task',
            text: '',
            completed: false,
            repeats: false,
            persistent: false,
            children: [],
            relationships: {
                blocks: [],
                dependsOn: [],
                relatedTo: []
            }
        };
    }
    
    /**
     * Render relationship indicators on element
     * @param {HTMLElement} container - Container element
     * @param {Object} element - Element data
     * @param {Object} context - Context
     * @returns {HTMLElement}
     */
    render(container, element, context) {
        // This is called to add relationship indicators to existing elements
        if (!element.relationships) return container;
        
        const hasRelationships = 
            (element.relationships.blocks?.length > 0) ||
            (element.relationships.dependsOn?.length > 0) ||
            (element.relationships.relatedTo?.length > 0);
        
        if (!hasRelationships) return container;
        
        // Add relationship indicator icon
        const indicator = DOMUtils.createElement('span', {
            class: 'relationship-indicator',
            title: 'Has relationships'
        }, '🔗');
        
        // Add click handler to show relationships
        indicator.addEventListener('click', (e) => {
            e.stopPropagation();
            this.showRelationshipsModal(element, context);
        });
        
        container.appendChild(indicator);
        return container;
    }
    
    /**
     * Show relationships modal
     * @param {Object} element - Element data
     * @param {Object} context - Context
     */
    showRelationshipsModal(element, context) {
        const modal = document.getElementById('modal');
        const modalBody = document.getElementById('modal-body');
        
        const relationshipManager = this.app.relationshipManager;
        const elementId = relationshipManager.getElementId(
            context.pageId,
            context.binId,
            context.elementIndex
        );
        
        const relationships = relationshipManager.getRelationships(elementId);
        const inverseRelationships = relationshipManager.getInverseRelationships(elementId);
        
        let html = `
            <h3>Element Relationships</h3>
            <div class="relationships-section">
                <h4>Outgoing Relationships</h4>
                <div id="outgoing-relationships">
        `;
        
        if (relationships.length === 0) {
            html += '<p>No outgoing relationships</p>';
        } else {
            relationships.forEach(rel => {
                const target = relationshipManager.getElement(rel.to);
                if (target) {
                    html += `
                        <div class="relationship-item">
                            <span class="relationship-type">${rel.type}</span>
                            <span class="relationship-target">${StringUtils.escapeHtml(target.element.text || 'Untitled')}</span>
                            <button class="remove-relationship" data-to="${rel.to}" data-type="${rel.type}">Remove</button>
                        </div>
                    `;
                }
            });
        }
        
        html += `
                </div>
                <h4>Incoming Relationships</h4>
                <div id="incoming-relationships">
        `;
        
        if (inverseRelationships.length === 0) {
            html += '<p>No incoming relationships</p>';
        } else {
            inverseRelationships.forEach(rel => {
                const source = relationshipManager.getElement(rel.from);
                if (source) {
                    html += `
                        <div class="relationship-item">
                            <span class="relationship-source">${StringUtils.escapeHtml(source.element.text || 'Untitled')}</span>
                            <span class="relationship-type">${rel.type}</span>
                            <span>this element</span>
                        </div>
                    `;
                }
            });
        }
        
        html += `
                </div>
                <div class="add-relationship-section">
                    <h4>Add Relationship</h4>
                    <select id="relationship-type">
                        ${this.app.relationshipManager.getRelationshipTypes().map(relType => 
                            `<option value="${relType.type}">${relType.label}${relType.description ? ` - ${relType.description}` : ''}</option>`
                        ).join('')}
                    </select>
                    <select id="relationship-target">
                        <option value="">Select element...</option>
        `;
        
        // Add all elements as options
        this.app.pages.forEach(page => {
            if (page.bins) {
                page.bins.forEach(bin => {
                    if (bin.elements) {
                        bin.elements.forEach((el, idx) => {
                            const targetId = relationshipManager.getElementId(page.id, bin.id, idx);
                            if (targetId !== elementId) {
                                html += `<option value="${targetId}">${StringUtils.escapeHtml(el.text || 'Untitled')}</option>`;
                            }
                        });
                    }
                });
            }
        });
        
        html += `
                    </select>
                    <button id="add-relationship-btn">Add Relationship</button>
                </div>
                <div style="margin-top: 20px;">
                    <button class="cancel" onclick="app.modalHandler.closeModal()">Close</button>
                </div>
            </div>
        `;
        
        modalBody.innerHTML = html;
        modal.classList.add('active');
        
        // Add event listeners
        document.getElementById('add-relationship-btn').addEventListener('click', () => {
            const type = document.getElementById('relationship-type').value;
            const targetId = document.getElementById('relationship-target').value;
            
            if (!targetId) {
                alert('Please select a target element');
                return;
            }
            
            const success = relationshipManager.addRelationship(elementId, targetId, type);
            if (success) {
                this.app.render();
                this.showRelationshipsModal(element, context);
            } else {
                alert('Failed to add relationship. Check console for details.');
            }
        });
        
        // Remove relationship buttons
        document.querySelectorAll('.remove-relationship').forEach(btn => {
            btn.addEventListener('click', () => {
                const toId = btn.dataset.to;
                const type = btn.dataset.type;
                relationshipManager.removeRelationship(elementId, toId, type);
                this.app.render();
                this.showRelationshipsModal(element, context);
            });
        });
    }
    
    /**
     * Render relationship UI in element edit modal
     * @param {HTMLElement} container - Container element
     * @param {Object} element - Element data
     * @param {Object} context - Context
     * @returns {HTMLElement}
     */
    renderEditUI(container, element, context) {
        const relationshipManager = this.app.relationshipManager;
        const elementId = relationshipManager.getElementId(
            context.pageId,
            context.binId,
            context.elementIndex
        );
        
        const relationships = relationshipManager.getRelationships(elementId);
        
        const section = DOMUtils.createElement('div', {
            class: 'relationships-edit-section'
        });
        
        const title = DOMUtils.createElement('h4', {}, 'Relationships');
        section.appendChild(title);
        
        if (relationships.length > 0) {
            const list = DOMUtils.createElement('div', {
                class: 'relationships-list'
            });
            
            relationships.forEach(rel => {
                const item = DOMUtils.createElement('div', {
                    class: 'relationship-item'
                });
                
                const target = relationshipManager.getElement(rel.to);
                if (target) {
                    const typeSpan = DOMUtils.createElement('span', {
                        class: 'relationship-type'
                    }, rel.type);
                    item.appendChild(typeSpan);
                    
                    const targetSpan = DOMUtils.createElement('span', {
                        class: 'relationship-target'
                    }, target.element.text || 'Untitled');
                    targetSpan.style.cursor = 'pointer';
                    targetSpan.addEventListener('click', () => {
                        // Navigate to related element using NavigationHelper
                        import('../../utils/NavigationHelper.js').then(({ NavigationHelper }) => {
                            NavigationHelper.navigateToElement(
                                target.pageId, 
                                target.binId, 
                                target.elementIndex, 
                                this.app
                            );
                        });
                        this.app.modalHandler.closeModal();
                    });
                    item.appendChild(targetSpan);
                }
                
                list.appendChild(item);
            });
            
            section.appendChild(list);
        } else {
            const noRels = DOMUtils.createElement('p', {}, 'No relationships');
            section.appendChild(noRels);
        }
        
        const addBtn = DOMUtils.createElement('button', {
            type: 'button',
            class: 'add-relationship-btn'
        }, 'Manage Relationships');
        
        addBtn.addEventListener('click', () => {
            this.showRelationshipsModal(element, context);
        });
        
        section.appendChild(addBtn);
        container.appendChild(section);
        
        return section;
    }
}


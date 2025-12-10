// PageTemplates - Page plugin for template management
import { BasePlugin } from '../../core/BasePlugin.js';
import { DOMUtils } from '../../utils/dom.js';
import { StringUtils } from '../../utils/string.js';

export default class PageTemplates extends BasePlugin {
    constructor(config = {}) {
        super({
            id: 'page-templates',
            name: 'Page Templates',
            type: 'page',
            version: '1.0.0',
            description: 'Save and load page configurations as templates',
            defaultConfig: {
                enabled: true
            },
            ...config
        });
    }
    
    async onInit() {
        console.log(`${this.name} initialized for page.`);
    }
    
    renderSettingsUI() {
        return `
            <div>
                <h4>Page Templates</h4>
                <p style="color: #888; font-size: 12px; margin-bottom: 15px;">
                    Save this page as a template or load from existing templates.
                </p>
                <div style="margin-bottom: 15px;">
                    <button id="save-page-template-btn" style="padding: 8px 16px; background: #4a9eff; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        Save as Template
                    </button>
                </div>
                <div>
                    <h5>Available Templates</h5>
                    <div id="page-templates-list" style="max-height: 200px; overflow-y: auto; margin-top: 10px;">
                        ${this.renderTemplatesList()}
                    </div>
                </div>
            </div>
        `;
    }
    
    renderTemplatesList() {
        if (!this.app || !this.app.templateManager) {
            return '<p style="color: #888;">Template manager not available</p>';
        }
        
        const templates = this.app.templateManager.getPageTemplates();
        
        if (templates.length === 0) {
            return '<p style="color: #888;">No page templates saved</p>';
        }
        
        return templates.map(template => `
            <div class="template-item" style="padding: 8px; background: #1a1a1a; border-radius: 4px; margin-bottom: 5px; display: flex; justify-content: space-between; align-items: center;">
                <span style="color: #e0e0e0;">${StringUtils.escapeHtml(template.name)}</span>
                <div>
                    <button class="load-template-btn" data-template-id="${template.id}" style="padding: 4px 8px; background: #4a9eff; color: white; border: none; border-radius: 3px; cursor: pointer; margin-right: 5px; font-size: 11px;">
                        Load
                    </button>
                    <button class="delete-template-btn" data-template-id="${template.id}" style="padding: 4px 8px; background: #e74c3c; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 11px;">
                        Delete
                    </button>
                </div>
            </div>
        `).join('');
    }
    
    saveSettings(formData) {
        // Templates are managed through UI actions, not form data
        console.log(`${this.name} settings saved.`);
    }
    
    /**
     * Show save template modal
     * @param {string} pageId - Page ID to save
     */
    showSaveTemplateModal(pageId) {
        const modal = document.getElementById('modal');
        const modalBody = document.getElementById('modal-body');
        
        let html = `
            <h3>Save Page as Template</h3>
            <label>Template Name:</label>
            <input type="text" id="template-name" placeholder="Enter template name" style="width: 100%; padding: 8px; margin-bottom: 15px; background: #1a1a1a; color: #e0e0e0; border: 1px solid #555; border-radius: 4px;" />
            <div style="margin-top: 20px;">
                <button id="save-template-confirm-btn" style="padding: 8px 16px; background: #4a9eff; color: white; border: none; border-radius: 4px; cursor: pointer; margin-right: 10px;">
                    Save Template
                </button>
                <button class="cancel" onclick="app.modalHandler.closeModal()">Cancel</button>
            </div>
        `;
        
        modalBody.innerHTML = html;
        modal.classList.add('active');
        
        document.getElementById('save-template-confirm-btn').addEventListener('click', () => {
            const templateName = document.getElementById('template-name').value.trim();
            
            if (!templateName) {
                alert('Please enter a template name');
                return;
            }
            
            if (this.app && this.app.templateManager) {
                const success = this.app.templateManager.savePageAsTemplate(pageId, templateName);
                if (success) {
                    alert('Template saved successfully!');
                    this.app.modalHandler.closeModal();
                    // Refresh page edit modal if open
                    this.app.render();
                } else {
                    alert('Failed to save template');
                }
            }
        });
        
        // Focus on input
        setTimeout(() => {
            document.getElementById('template-name').focus();
        }, 100);
    }
    
    /**
     * Show load template modal
     */
    showLoadTemplateModal() {
        const modal = document.getElementById('modal');
        const modalBody = document.getElementById('modal-body');
        
        if (!this.app || !this.app.templateManager) {
            alert('Template manager not available');
            return;
        }
        
        const templates = this.app.templateManager.getPageTemplates();
        
        let html = `
            <h3>Load Page Template</h3>
            <div style="max-height: 400px; overflow-y: auto; margin-top: 15px;">
        `;
        
        if (templates.length === 0) {
            html += '<p style="color: #888;">No templates available</p>';
        } else {
            templates.forEach(template => {
                html += `
                    <div class="template-option" style="padding: 12px; background: #1a1a1a; border-radius: 4px; margin-bottom: 10px; cursor: pointer; border: 2px solid transparent; transition: border-color 0.2s;" data-template-id="${template.id}">
                        <div style="font-weight: 600; color: #e0e0e0; margin-bottom: 5px;">${StringUtils.escapeHtml(template.name)}</div>
                        <div style="font-size: 11px; color: #888;">
                            Created: ${new Date(template.createdAt).toLocaleDateString()}
                            ${template.data.bins ? ` | ${template.data.bins.length} bins` : ''}
                        </div>
                    </div>
                `;
            });
        }
        
        html += `
            </div>
            <div style="margin-top: 20px;">
                <button class="cancel" onclick="app.modalHandler.closeModal()">Cancel</button>
            </div>
        `;
        
        modalBody.innerHTML = html;
        modal.classList.add('active');
        
        // Add click handlers for template options
        document.querySelectorAll('.template-option').forEach(option => {
            option.addEventListener('click', () => {
                const templateId = option.dataset.templateId;
                this.loadTemplate(templateId);
            });
            
            option.addEventListener('mouseenter', () => {
                option.style.borderColor = '#4a9eff';
            });
            
            option.addEventListener('mouseleave', () => {
                option.style.borderColor = 'transparent';
            });
        });
    }
    
    /**
     * Load a template and create a new page
     * @param {string} templateId - Template ID
     */
    loadTemplate(templateId) {
        if (!this.app || !this.app.templateManager) {
            alert('Template manager not available');
            return;
        }
        
        const newPage = this.app.templateManager.createPageFromTemplate(templateId);
        if (!newPage) {
            alert('Failed to load template');
            return;
        }
        
        // Add page to app
        this.app.pages.push(newPage);
        this.app.dataManager.saveData();
        this.app.render();
        
        // Switch to new page
        this.app.currentPageId = newPage.id;
        this.app.render();
        
        this.app.modalHandler.closeModal();
    }
}


// TemplateManager - Manages document and group templates
import { StorageUtils } from '../utils/storage.js';
import { DataUtils } from '../utils/data.js';
import { getService, SERVICES, hasService } from '../core/AppServices.js';

export class TemplateManager {
    constructor() {
        this.templatesKey = 'twodo-templates';
        this.templates = this.loadTemplates();
    }
    
    /**
     * Get AppState service
     */
    _getAppState() {
        return getService(SERVICES.APP_STATE);
    }
    
    /**
     * Load templates from storage
     * @returns {Object} - Templates object
     */
    loadTemplates() {
        const stored = StorageUtils.get(this.templatesKey) || {};
        return {
            documents: stored.documents || [],
            groups: stored.groups || []
        };
    }
    
    /**
     * Save templates to storage
     */
    saveTemplates() {
        StorageUtils.set(this.templatesKey, this.templates);
    }
    
    /**
     * Save a page as a template
     * @param {string} pageId - Page ID to save
     * @param {string} templateName - Name for the template
     * @returns {boolean} - Success status
     */
    savePageAsTemplate(pageId, templateName) {
        const appState = this._getAppState();
        const page = appState.documents.find(p => p.id === pageId);
        if (!page) return false;
        
        // Create template copy (deep clone)
        const template = {
            id: `template-${Date.now()}`,
            name: templateName,
            type: 'page',
            createdAt: Date.now(),
            data: DataUtils.deepClone(page)
        };
        
        // Remove ID from template data to allow new page creation
        delete template.data.id;
        
        this.templates.documents.push(template);
        this.saveTemplates();
        
        return true;
    }
    
    /**
     * Save a bin as a template
     * @param {string} pageId - Page ID containing the bin
     * @param {string} binId - Bin ID to save
     * @param {string} templateName - Name for the template
     * @returns {boolean} - Success status
     */
    saveBinAsTemplate(pageId, binId, templateName) {
        const appState = this._getAppState();
        const page = appState.documents.find(p => p.id === pageId);
        if (!page) return false;
        
        const bin = page.groups?.find(b => b.id === binId);
        if (!bin) return false;
        const items = bin.items || [];
        bin.items = items;
        
        // Create template copy (deep clone)
        const template = {
            id: `template-${Date.now()}`,
            name: templateName,
            type: 'bin',
            createdAt: Date.now(),
            data: DataUtils.deepClone(bin)
        };
        
        // Remove ID from template data to allow new bin creation
        delete template.data.id;
        
        this.templates.groups.push(template);
        this.saveTemplates();
        
        return true;
    }
    
    /**
     * Get all page templates
     * @returns {Array} - Array of page templates
     */
    getPageTemplates() {
        return this.templates.documents || [];
    }
    
    /**
     * Get all bin templates
     * @returns {Array} - Array of bin templates
     */
    getBinTemplates() {
        return this.templates.groups || [];
    }
    
    /**
     * Get a template by ID
     * @param {string} templateId - Template ID
     * @returns {Object|null} - Template object or null
     */
    getTemplate(templateId) {
        const pageTemplate = this.templates.documents.find(t => t.id === templateId);
        if (pageTemplate) return pageTemplate;
        
        const binTemplate = this.templates.groups.find(t => t.id === templateId);
        if (binTemplate) return binTemplate;
        
        return null;
    }
    
    /**
     * Create a page from a template
     * @param {string} templateId - Template ID
     * @returns {Object|null} - New page object or null
     */
    createPageFromTemplate(templateId) {
        const template = this.getTemplate(templateId);
        if (!template || template.type !== 'page') return null;
        
        // Deep clone template data
        const newPage = DataUtils.deepClone(template.data);
        
        // Generate new ID
        newPage.id = `page-${Date.now()}`;
        
        // Generate new IDs for bins and elements
        const groups = newPage.groups || [];
        groups.forEach(bin => {
                bin.id = `bin-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                const items = bin.items || [];
                bin.items = items;
                if (items.length > 0) {
                    items.forEach(() => {
                        // Template elements are validated elsewhere
                    });
                }
            });
        newPage.groups = groups;
        
        return newPage;
    }
    
    /**
     * Create a bin from a template
     * @param {string} templateId - Template ID
     * @returns {Object|null} - New bin object or null
     */
    createBinFromTemplate(templateId) {
        const template = this.getTemplate(templateId);
        if (!template || template.type !== 'bin') return null;
        
        // Deep clone template data
        const newBin = DataUtils.deepClone(template.data);
        
        // Generate new ID
        newBin.id = `bin-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // Ensure elements have proper structure
        const items = newBin.items || [];
        newBin.items = items;
        if (items.length > 0) {
            items.forEach(() => {
                // Template elements are validated elsewhere
            });
        }
        
        return newBin;
    }
    
    /**
     * Delete a template
     * @param {string} templateId - Template ID
     * @returns {boolean} - Success status
     */
    deleteTemplate(templateId) {
        const pageIndex = this.templates.documents.findIndex(t => t.id === templateId);
        if (pageIndex !== -1) {
            this.templates.documents.splice(pageIndex, 1);
            this.saveTemplates();
            return true;
        }
        
        const binIndex = this.templates.groups.findIndex(t => t.id === templateId);
        if (binIndex !== -1) {
            this.templates.groups.splice(binIndex, 1);
            this.saveTemplates();
            return true;
        }
        
        return false;
    }
    
    /**
     * Export template as JSON
     * @param {string} templateId - Template ID
     * @returns {string|null} - JSON string or null
     */
    exportTemplate(templateId) {
        const template = this.getTemplate(templateId);
        if (!template) return null;
        
        return JSON.stringify(template, null, 2);
    }
    
    /**
     * Import template from JSON
     * @param {string} jsonString - JSON string
     * @returns {boolean} - Success status
     */
    importTemplate(jsonString) {
        try {
            const template = JSON.parse(jsonString);
            
            if (!template.type || !template.data) {
                return false;
            }
            
            // Generate new ID
            template.id = `template-${Date.now()}`;
            template.createdAt = Date.now();
            
            if (template.type === 'page') {
                this.templates.documents.push(template);
            } else if (template.type === 'bin') {
                this.templates.groups.push(template);
            } else {
                return false;
            }
            
            this.saveTemplates();
            return true;
        } catch (err) {
            console.error('Error importing template:', err);
            return false;
        }
    }
}


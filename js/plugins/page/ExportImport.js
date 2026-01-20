// ExportImport.js - Page plugin for export and import functionality
import { BasePlugin } from '../../core/BasePlugin.js';
import { DOMUtils } from '../../utils/dom.js';
import { StringUtils } from '../../utils/string.js';

export default class ExportImport extends BasePlugin {
    constructor(app = null, config = {}) {
        super({
            id: 'export-import',
            name: 'Export & Import',
            description: 'Export documents to various formats and import from other apps.',
            type: 'page',
            defaultConfig: {
                enabled: true
            },
            ...config
        });
        if (app) {
            this.app = app;
        }
    }

    async onInit() {
        if (this.config.enabled) {
            this.app.eventBus.on('modal:editPage:rendered', this.injectExportImportUI.bind(this));
        }
    }

    async onDestroy() {
        this.app.eventBus.off('modal:editPage:rendered', this.injectExportImportUI.bind(this));
    }

    injectExportImportUI({ pageId, modalBody }) {
        const section = DOMUtils.createElement('div', {
            style: 'margin-top: 20px; padding: 15px; background: #2a2a2a; border-radius: 4px; border: 1px solid #444;'
        });
        
        section.innerHTML = `
            <label style="font-weight: 600; margin-bottom: 10px; display: block;">Export & Import:</label>
            <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 10px;">
                <button type="button" class="export-btn" data-format="json" style="padding: 6px 12px; background: #4a9eff; color: white; border: none; border-radius: 4px; cursor: pointer;">Export JSON</button>
                <button type="button" class="export-btn" data-format="csv" style="padding: 6px 12px; background: #4a9eff; color: white; border: none; border-radius: 4px; cursor: pointer;">Export CSV</button>
                <button type="button" class="export-btn" data-format="markdown" style="padding: 6px 12px; background: #4a9eff; color: white; border: none; border-radius: 4px; cursor: pointer;">Export Markdown</button>
                <button type="button" class="export-btn" data-format="pdf" style="padding: 6px 12px; background: #4a9eff; color: white; border: none; border-radius: 4px; cursor: pointer;">Export PDF</button>
            </div>
            <div style="margin-top: 10px;">
                <label style="display: block; margin-bottom: 5px;">Import Page:</label>
                <input type="file" id="import-file-input" accept=".json,.csv,.md,.markdown" style="width: 100%; padding: 6px; background: #1a1a1a; color: #e0e0e0; border: 1px solid #555; border-radius: 4px; margin-bottom: 5px;" />
                <button type="button" id="import-btn" style="padding: 6px 12px; background: #27ae60; color: white; border: none; border-radius: 4px; cursor: pointer;">Import</button>
            </div>
        `;
        
        modalBody.appendChild(section);
        
        // Export buttons
        section.querySelectorAll('.export-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const format = btn.dataset.format;
                try {
                    await this.app.exportService.exportPage(pageId, format);
                    alert(`Page exported as ${format.toUpperCase()}!`);
                } catch (error) {
                    alert(`Export failed: ${error.message}`);
                }
            });
        });
        
        // Import button
        const importBtn = section.querySelector('#import-btn');
        const importInput = section.querySelector('#import-file-input');
        if (importBtn && importInput) {
            importBtn.addEventListener('click', async () => {
                const file = importInput.files[0];
                if (!file) {
                    alert('Please select a file to import');
                    return;
                }
                
                try {
                    const importedPage = await this.app.importService.importPage(file);
                    const pages = this.app.documents || [];
                    pages.push(importedPage);
                    this.app.documents = pages;
                    this.app.dataManager.saveData();
                    this.app.render();
                    alert(`Page imported successfully!`);
                    this.app.modalHandler.closeModal();
                } catch (error) {
                    alert(`Import failed: ${error.message}`);
                }
            });
        }
    }
}


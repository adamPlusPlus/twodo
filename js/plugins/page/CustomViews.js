// CustomViews.js - Page plugin for custom views
import { BasePlugin } from '../../core/BasePlugin.js';
import { StorageUtils } from '../../utils/storage.js';
import { DOMUtils } from '../../utils/dom.js';
import { StringUtils } from '../../utils/string.js';
import { eventBus } from '../../core/EventBus.js';

export default class CustomViews extends BasePlugin {
    constructor(app = null, config = {}) {
        super({
            id: 'custom-views',
            name: 'Custom Views',
            description: 'Save and switch between custom filter/sort combinations.',
            type: 'page',
            defaultConfig: {
                enabled: true,
                views: [],
                currentView: null
            },
            ...config
        });
        if (app) {
            this.app = app;
        }
        this.storageKey = 'twodo-custom-views';
    }

    async onInit() {
        this.loadViews();
        
        if (this.config.enabled && this.app) {
            eventBus.on('page:render', this.handlePageRender.bind(this));
        }
    }

    loadViews() {
        const stored = StorageUtils.get(this.storageKey);
        if (stored) {
            this.config.views = stored;
        }
    }

    saveViews() {
        StorageUtils.set(this.storageKey, this.config.views);
    }

    async onDestroy() {
        if (this.app) {
            eventBus.off('page:render', this.handlePageRender.bind(this));
        }
    }

    handlePageRender({ pageElement, pageData }) {
        // Check if plugin is enabled
        const isEnabled = pageData.pluginConfigs?.[this.id]?.enabled || 
                         pageData.plugins?.includes(this.id) ||
                         this.config.enabled;
        
        if (!isEnabled) return;

        // Find the page tabs container or create a header area
        const pageTabsContainer = document.querySelector('#page-tabs');
        const activeTab = document.querySelector(`.page-tab.active[data-page-id="${pageData.id}"]`);
        
        // Try to find or create a header area near the page tabs
        let headerArea = document.querySelector('.page-controls-header');
        if (!headerArea && pageTabsContainer) {
            headerArea = DOMUtils.createElement('div', {
                className: 'page-controls-header',
                style: 'display: flex; align-items: center; gap: 10px; padding: 5px 10px; background: #1a1a1a; border-bottom: 1px solid #444;'
            });
            pageTabsContainer.parentNode.insertBefore(headerArea, pageTabsContainer.nextSibling);
        }
        
        if (headerArea) {
            const existingSelector = headerArea.querySelector('.custom-view-selector');
            if (existingSelector) existingSelector.remove();

            const selector = DOMUtils.createElement('div', {
                className: 'custom-view-selector',
                style: 'display: flex; gap: 5px; align-items: center;'
            });

            selector.innerHTML = `
                <select class="view-select" style="padding: 4px; background: #2a2a2a; color: #e0e0e0; border: 1px solid #555; border-radius: 4px; font-size: 12px;">
                    <option value="">Default View</option>
                    ${(this.config.views || []).map((view, index) => 
                        `<option value="${index}" ${pageData.pluginConfigs?.[this.id]?.currentView === index ? 'selected' : ''}>${StringUtils.escapeHtml(view.name)}</option>`
                    ).join('')}
                </select>
                <button class="save-view-btn" style="padding: 4px 8px; background: #4a9eff; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;" title="Save current view">+</button>
            `;

            headerArea.appendChild(selector);

            // Setup event listeners
            const viewSelect = selector.querySelector('.view-select');
            const saveBtn = selector.querySelector('.save-view-btn');

            viewSelect.addEventListener('change', (e) => {
                if (e.target.value) {
                    this.applyView(pageData.id, parseInt(e.target.value));
                } else {
                    this.clearView(pageData.id);
                }
            });

            saveBtn.addEventListener('click', () => {
                this.showSaveViewModal(pageData.id);
            });
        }
    }

    applyView(pageId, viewIndex) {
        const view = this.config.views[viewIndex];
        if (!view) return;

        const page = this.app.documents?.find(p => p.id === pageId);
        if (!page) return;

        if (!page.pluginConfigs) page.pluginConfigs = {};
        if (!page.pluginConfigs[this.id]) page.pluginConfigs[this.id] = {};
        page.pluginConfigs[this.id].currentView = viewIndex;

        // Apply view settings (filters, sort, etc.)
        // This would integrate with filter and sort systems
        this.app.dataManager.saveData();
        this.app.render();
    }

    clearView(pageId) {
        const page = this.app.documents?.find(p => p.id === pageId);
        if (!page) return;

        if (page.pluginConfigs?.[this.id]) {
            delete page.pluginConfigs[this.id].currentView;
        }

        this.app.dataManager.saveData();
        this.app.render();
    }

    showSaveViewModal(pageId) {
        const modal = document.getElementById('modal');
        const modalBody = document.getElementById('modal-body');

        modalBody.innerHTML = `
            <h3>Save Custom View</h3>
            <div style="margin-top: 15px;">
                <label>View Name:</label>
                <input type="text" id="view-name-input" placeholder="e.g., Urgent Tasks" style="width: 100%; padding: 8px; margin-top: 5px; background: #1a1a1a; color: #e0e0e0; border: 1px solid #555; border-radius: 4px;" />
            </div>
            <div style="margin-top: 15px;">
                <label>View Settings (JSON):</label>
                <textarea id="view-settings-input" placeholder='{"filters": {}, "sort": {}}' style="width: 100%; height: 100px; padding: 8px; margin-top: 5px; background: #1a1a1a; color: #e0e0e0; border: 1px solid #555; border-radius: 4px; font-family: monospace;"></textarea>
            </div>
            <div style="margin-top: 20px;">
                <button id="save-view-btn" style="padding: 8px 15px; background: #27ae60; color: white; border: none; border-radius: 4px; cursor: pointer;">Save View</button>
                <button class="cancel" onclick="app.modalHandler.closeModal()" style="margin-left: 10px;">Cancel</button>
            </div>
        `;

        modal.classList.add('active');

        const saveBtn = modalBody.querySelector('#save-view-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                const name = modalBody.querySelector('#view-name-input').value.trim();
                const settingsText = modalBody.querySelector('#view-settings-input').value.trim();

                if (!name) {
                    alert('Please enter a view name');
                    return;
                }

                try {
                    const settings = settingsText ? JSON.parse(settingsText) : {};
                    const view = {
                        name,
                        settings,
                        createdAt: new Date().toISOString()
                    };

                    if (!this.config.views) this.config.views = [];
                    this.config.views.push(view);
                    this.saveViews();
                    this.updateConfig({ views: this.config.views }, true);

                    this.app.modalHandler.closeModal();
                    this.app.render();
                } catch (error) {
                    alert('Invalid JSON for settings: ' + error.message);
                }
            });
        }
    }
}


// FilterPresets.js - Bin plugin for filter presets
import { BasePlugin } from '../../core/BasePlugin.js';
import { StorageUtils } from '../../utils/storage.js';
import { DOMUtils } from '../../utils/dom.js';
import { StringUtils } from '../../utils/string.js';

export default class FilterPresets extends BasePlugin {
    constructor(app = null, config = {}) {
        super({
            id: 'filter-presets',
            name: 'Filter Presets',
            description: 'Save and quickly apply filter combinations.',
            type: 'bin',
            defaultConfig: {
                enabled: true,
                presets: []
            },
            ...config
        });
        if (app) {
            this.app = app;
        }
        this.storageKey = 'twodo-filter-presets';
    }

    async onInit() {
        this.loadPresets();
    }

    loadPresets() {
        const stored = StorageUtils.get(this.storageKey);
        if (stored) {
            this.config.presets = stored;
        }
    }

    savePresets() {
        StorageUtils.set(this.storageKey, this.config.presets);
    }

    async onInit() {
        if (this.config.enabled) {
            this.app.eventBus.on('bin:render', this.handleBinRender.bind(this));
        }
    }

    async onDestroy() {
        this.app.eventBus.off('bin:render', this.handleBinRender.bind(this));
    }

    handleBinRender({ binElement, pageId, binData }) {
        if (!binData.pluginConfigs?.[this.id]?.enabled) {
            return;
        }

        const binHeader = binElement.querySelector('.bin-header');
        if (binHeader) {
            const existingPresets = binHeader.querySelector('.filter-presets-controls');
            if (existingPresets) existingPresets.remove();

            const presetsControls = DOMUtils.createElement('div', {
                className: 'filter-presets-controls',
                style: 'display: flex; gap: 5px; align-items: center; margin-left: 10px;'
            });

            presetsControls.innerHTML = `
                <select class="filter-preset-select" style="padding: 4px; background: #2a2a2a; color: #e0e0e0; border: 1px solid #555; border-radius: 4px; font-size: 12px;">
                    <option value="">Filter Presets...</option>
                    ${(this.config.presets || []).map((preset, index) => 
                        `<option value="${index}">${StringUtils.escapeHtml(preset.name)}</option>`
                    ).join('')}
                </select>
                <button class="save-filter-preset-btn" style="padding: 4px 8px; background: #4a9eff; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;" title="Save current filter as preset">+</button>
                <button class="manage-filter-presets-btn" style="padding: 4px 8px; background: #3a3a3a; color: #e0e0e0; border: 1px solid #555; border-radius: 4px; cursor: pointer; font-size: 12px;" title="Manage presets">⚙</button>
            `;

            binHeader.appendChild(presetsControls);

            // Setup event listeners
            const presetSelect = presetsControls.querySelector('.filter-preset-select');
            const saveBtn = presetsControls.querySelector('.save-filter-preset-btn');
            const manageBtn = presetsControls.querySelector('.manage-filter-presets-btn');

            presetSelect.addEventListener('change', (e) => {
                if (e.target.value) {
                    this.applyPreset(pageId, binData.id, parseInt(e.target.value));
                }
            });

            saveBtn.addEventListener('click', () => {
                this.showSavePresetModal(pageId, binData.id);
            });

            manageBtn.addEventListener('click', () => {
                this.showManagePresetsModal();
            });
        }
    }

    applyPreset(pageId, binId, presetIndex) {
        const preset = this.config.presets[presetIndex];
        if (!preset) return;

        // Apply filters (this would integrate with a filter system)
        // For now, we'll store the active filter in bin config
        const page = this.app.pages.find(p => p.id === pageId);
        const bin = page?.bins?.find(b => b.id === binId);
        if (!bin) return;

        if (!bin.pluginConfigs) bin.pluginConfigs = {};
        if (!bin.pluginConfigs[this.id]) bin.pluginConfigs[this.id] = {};
        bin.pluginConfigs[this.id].activeFilter = preset.filters;

        this.app.dataManager.saveData();
        this.app.render();
    }

    showSavePresetModal(pageId, binId) {
        const modal = document.getElementById('modal');
        const modalBody = document.getElementById('modal-body');

        modalBody.innerHTML = `
            <h3>Save Filter Preset</h3>
            <div style="margin-top: 15px;">
                <label>Preset Name:</label>
                <input type="text" id="preset-name-input" placeholder="e.g., Urgent Tasks" style="width: 100%; padding: 8px; margin-top: 5px; background: #1a1a1a; color: #e0e0e0; border: 1px solid #555; border-radius: 4px;" />
            </div>
            <div style="margin-top: 15px;">
                <label>Filters (JSON):</label>
                <textarea id="preset-filters-input" placeholder='{"tags": ["urgent"], "completed": false}' style="width: 100%; height: 100px; padding: 8px; margin-top: 5px; background: #1a1a1a; color: #e0e0e0; border: 1px solid #555; border-radius: 4px; font-family: monospace;"></textarea>
            </div>
            <div style="margin-top: 20px;">
                <button id="save-preset-btn" style="padding: 8px 15px; background: #27ae60; color: white; border: none; border-radius: 4px; cursor: pointer;">Save Preset</button>
                <button class="cancel" onclick="app.modalHandler.closeModal()" style="margin-left: 10px;">Cancel</button>
            </div>
        `;

        modal.classList.add('active');

        const saveBtn = modalBody.querySelector('#save-preset-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                const name = modalBody.querySelector('#preset-name-input').value.trim();
                const filtersText = modalBody.querySelector('#preset-filters-input').value.trim();

                if (!name) {
                    alert('Please enter a preset name');
                    return;
                }

                try {
                    const filters = filtersText ? JSON.parse(filtersText) : {};
                    const preset = {
                        name,
                        filters,
                        createdAt: new Date().toISOString()
                    };

                    if (!this.config.presets) this.config.presets = [];
                    this.config.presets.push(preset);
                    this.savePresets();
                    this.updateConfig({ presets: this.config.presets }, true);

                    this.app.modalHandler.closeModal();
                    this.app.render();
                } catch (error) {
                    alert('Invalid JSON for filters: ' + error.message);
                }
            });
        }
    }

    showManagePresetsModal() {
        const modal = document.getElementById('modal');
        const modalBody = document.getElementById('modal-body');

        modalBody.innerHTML = `
            <h3>Manage Filter Presets</h3>
            <div id="presets-list" style="margin-top: 15px; max-height: 400px; overflow-y: auto;">
                ${(this.config.presets || []).map((preset, index) => `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; background: #2a2a2a; border-radius: 4px; margin-bottom: 5px;">
                        <div>
                            <strong>${StringUtils.escapeHtml(preset.name)}</strong>
                            <div style="font-size: 11px; color: #888; margin-top: 3px;">
                                ${JSON.stringify(preset.filters)}
                            </div>
                        </div>
                        <button class="delete-preset-btn" data-index="${index}" style="padding: 4px 8px; background: #e74c3c; color: white; border: none; border-radius: 4px; cursor: pointer;">Delete</button>
                    </div>
                `).join('')}
            </div>
            <div style="margin-top: 20px;">
                <button class="cancel" onclick="app.modalHandler.closeModal()">Close</button>
            </div>
        `;

        modal.classList.add('active');

        modalBody.querySelectorAll('.delete-preset-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                if (confirm('Delete this preset?')) {
                    this.config.presets.splice(index, 1);
                    this.savePresets();
                    this.updateConfig({ presets: this.config.presets }, true);
                    this.app.modalHandler.closeModal();
                    this.app.render();
                }
            });
        });
    }
}


// BinArchive.js - Bin plugin for archiving elements
import { BasePlugin } from '../../core/BasePlugin.js';
import { StorageUtils } from '../../utils/storage.js';
import { DOMUtils } from '../../utils/dom.js';
import { StringUtils } from '../../utils/string.js';

export default class BinArchive extends BasePlugin {
    constructor(app = null, config = {}) {
        super({
            id: 'bin-archive',
            name: 'Bin Archive',
            description: 'Archive completed or old elements.',
            type: 'bin',
            defaultConfig: {
                enabled: true,
                autoArchiveCompleted: false,
                archiveAfterDays: 30
            },
            ...config
        });
        if (app) {
            this.app = app;
        }
        this.storageKey = 'twodo-bin-archives';
        this.archives = {};
    }

    async onInit() {
        this.archives = this.loadArchives();
    }

    loadArchives() {
        return StorageUtils.get(this.storageKey) || {};
    }

    saveArchives() {
        StorageUtils.set(this.storageKey, this.archives);
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
            const existingArchive = binHeader.querySelector('.bin-archive-controls');
            if (existingArchive) existingArchive.remove();

            const archiveControls = DOMUtils.createElement('div', {
                className: 'bin-archive-controls',
                style: 'display: flex; gap: 5px; align-items: center; margin-left: 10px;'
            });

            archiveControls.innerHTML = `
                <button class="archive-completed-btn" style="padding: 4px 8px; background: #9b59b6; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;" title="Archive completed elements">Archive</button>
                <button class="view-archive-btn" style="padding: 4px 8px; background: #3a3a3a; color: #e0e0e0; border: 1px solid #555; border-radius: 4px; cursor: pointer; font-size: 12px;" title="View archived elements">View Archive</button>
            `;

            binHeader.appendChild(archiveControls);

            // Setup event listeners
            const archiveBtn = archiveControls.querySelector('.archive-completed-btn');
            const viewBtn = archiveControls.querySelector('.view-archive-btn');

            archiveBtn.addEventListener('click', () => {
                this.archiveCompleted(pageId, binData.id);
            });

            viewBtn.addEventListener('click', () => {
                this.showArchiveModal(pageId, binData.id);
            });
        }
    }

    archiveCompleted(pageId, binId) {
        const page = this.app.pages.find(p => p.id === pageId);
        const bin = page?.bins?.find(b => b.id === binId);
        if (!bin) return;

        const archiveKey = `${pageId}-${binId}`;
        if (!this.archives[archiveKey]) {
            this.archives[archiveKey] = [];
        }

        const completedElements = bin.elements.filter(el => el.completed);
        if (completedElements.length === 0) {
            alert('No completed elements to archive');
            return;
        }

        if (!confirm(`Archive ${completedElements.length} completed element(s)?`)) {
            return;
        }

        // Move to archive
        completedElements.forEach(element => {
            this.archives[archiveKey].push({
                ...element,
                archivedAt: new Date().toISOString()
            });
        });

        // Remove from bin
        bin.elements = bin.elements.filter(el => !el.completed);

        this.saveArchives();
        this.app.dataManager.saveData();
        this.app.render();
    }

    showArchiveModal(pageId, binId) {
        const modal = document.getElementById('modal');
        const modalBody = document.getElementById('modal-body');
        const archiveKey = `${pageId}-${binId}`;
        const archived = this.archives[archiveKey] || [];

        modalBody.innerHTML = `
            <h3>Archived Elements</h3>
            <div id="archive-list" style="margin-top: 15px; max-height: 400px; overflow-y: auto;">
                ${archived.length === 0 ? '<p style="color: #888;">No archived elements</p>' : ''}
                ${archived.map((element, index) => `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; background: #2a2a2a; border-radius: 4px; margin-bottom: 5px;">
                        <div>
                            <strong>${StringUtils.escapeHtml(element.text || 'Untitled')}</strong>
                            <div style="font-size: 11px; color: #888; margin-top: 3px;">
                                Archived: ${new Date(element.archivedAt).toLocaleDateString()}
                            </div>
                        </div>
                        <button class="restore-archived-btn" data-index="${index}" style="padding: 4px 8px; background: #27ae60; color: white; border: none; border-radius: 4px; cursor: pointer;">Restore</button>
                    </div>
                `).join('')}
            </div>
            <div style="margin-top: 20px;">
                <button class="cancel" onclick="app.modalHandler.closeModal()">Close</button>
            </div>
        `;

        modal.classList.add('active');

        modalBody.querySelectorAll('.restore-archived-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                this.restoreElement(pageId, binId, index);
            });
        });
    }

    restoreElement(pageId, binId, archiveIndex) {
        const page = this.app.pages.find(p => p.id === pageId);
        const bin = page?.bins?.find(b => b.id === binId);
        if (!bin) return;

        const archiveKey = `${pageId}-${binId}`;
        const archived = this.archives[archiveKey];
        if (!archived || !archived[archiveIndex]) return;

        const element = archived[archiveIndex];
        delete element.archivedAt;

        if (!bin.elements) bin.elements = [];
        bin.elements.push(element);
        archived.splice(archiveIndex, 1);

        this.saveArchives();
        this.app.dataManager.saveData();
        this.app.modalHandler.closeModal();
        this.app.render();
    }
}


// CustomSorting.js - Bin plugin for custom sorting options
import { BasePlugin } from '../../core/BasePlugin.js';
import { DOMUtils } from '../../utils/dom.js';
import { StringUtils } from '../../utils/string.js';

export default class CustomSorting extends BasePlugin {
    constructor(app = null, config = {}) {
        super({
            id: 'custom-sorting',
            name: 'Custom Sorting',
            description: 'Sort group items by various criteria.',
            type: 'bin',
            defaultConfig: {
                enabled: true,
                sortBy: 'none', // 'none', 'alphabetical', 'date', 'completed', 'custom'
                sortOrder: 'asc' // 'asc', 'desc'
            },
            ...config
        });
        if (app) {
            this.app = app;
        }
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

        const sortConfig = binData.pluginConfigs[this.id] || this.config;
        const sortBy = sortConfig.sortBy || 'none';
        const sortOrder = sortConfig.sortOrder || 'asc';

        // Add sort controls to bin header
        const binHeader = binElement.querySelector('.bin-header');
        if (binHeader) {
            // Remove existing sort controls if any
            const existingSort = binHeader.querySelector('.custom-sort-controls');
            if (existingSort) existingSort.remove();

            const sortControls = DOMUtils.createElement('div', {
                className: 'custom-sort-controls',
                style: 'display: flex; gap: 5px; align-items: center; margin-left: auto;'
            });

            sortControls.innerHTML = `
                <select class="sort-by-select" style="padding: 4px; background: #2a2a2a; color: #e0e0e0; border: 1px solid #555; border-radius: 4px; font-size: 12px;">
                    <option value="none" ${sortBy === 'none' ? 'selected' : ''}>No Sort</option>
                    <option value="alphabetical" ${sortBy === 'alphabetical' ? 'selected' : ''}>Alphabetical</option>
                    <option value="date" ${sortBy === 'date' ? 'selected' : ''}>Date</option>
                    <option value="deadline" ${sortBy === 'deadline' ? 'selected' : ''}>Deadline</option>
                    <option value="completed" ${sortBy === 'completed' ? 'selected' : ''}>Completed</option>
                    <option value="custom" ${sortBy === 'custom' ? 'selected' : ''}>Custom Order</option>
                </select>
                <button class="sort-order-btn" data-order="${sortOrder}" style="padding: 4px 8px; background: #3a3a3a; color: #e0e0e0; border: 1px solid #555; border-radius: 4px; cursor: pointer; font-size: 12px;" title="Toggle sort order">
                    ${sortOrder === 'asc' ? '↑' : '↓'}
                </button>
            `;

            binHeader.appendChild(sortControls);

            // Setup event listeners
            const sortSelect = sortControls.querySelector('.sort-by-select');
            const sortOrderBtn = sortControls.querySelector('.sort-order-btn');

            sortSelect.addEventListener('change', (e) => {
                this.applySort(pageId, binData.id, e.target.value, sortOrder);
            });

            sortOrderBtn.addEventListener('click', () => {
                const newOrder = sortOrder === 'asc' ? 'desc' : 'asc';
                this.applySort(pageId, binData.id, sortBy, newOrder);
            });
        }

        // Apply sorting to elements
        if (sortBy !== 'none') {
            this.sortElements(pageId, binData, sortBy, sortOrder);
        }
    }

    applySort(pageId, binId, sortBy, sortOrder) {
        const page = this.app.documents?.find(p => p.id === pageId);
        const bin = page?.groups?.find(b => b.id === binId);
        if (!bin) return;
        const items = bin.items || [];
        bin.items = items;

        if (!bin.pluginConfigs) bin.pluginConfigs = {};
        if (!bin.pluginConfigs[this.id]) bin.pluginConfigs[this.id] = {};
        bin.pluginConfigs[this.id].sortBy = sortBy;
        bin.pluginConfigs[this.id].sortOrder = sortOrder;

        this.updateConfig({ sortBy, sortOrder }, true);
        this.sortElements(pageId, bin, sortBy, sortOrder);
        this.app.dataManager.saveData();
        this.app.render();
    }

    sortElements(pageId, bin, sortBy, sortOrder) {
        const items = bin.items || [];
        bin.items = items;
        if (!items.length) return;

        const sorted = [...items].sort((a, b) => {
            let comparison = 0;

            switch (sortBy) {
                case 'alphabetical':
                    const textA = (a.text || '').toLowerCase();
                    const textB = (b.text || '').toLowerCase();
                    comparison = textA.localeCompare(textB);
                    break;
                case 'date':
                    const dateA = a.date ? new Date(a.date).getTime() : 0;
                    const dateB = b.date ? new Date(b.date).getTime() : 0;
                    comparison = dateA - dateB;
                    break;
                case 'deadline':
                    const deadlineA = a.deadline ? new Date(a.deadline).getTime() : Infinity;
                    const deadlineB = b.deadline ? new Date(b.deadline).getTime() : Infinity;
                    comparison = deadlineA - deadlineB;
                    break;
                case 'completed':
                    comparison = (a.completed ? 1 : 0) - (b.completed ? 1 : 0);
                    break;
                case 'custom':
                    // Custom order uses a stored order array
                    if (!bin.pluginConfigs?.[this.id]?.customOrder) {
                        bin.pluginConfigs[this.id].customOrder = items.map((_, i) => i);
                    }
                    const customOrder = bin.pluginConfigs[this.id].customOrder;
                    const indexA = customOrder.indexOf(items.indexOf(a));
                    const indexB = customOrder.indexOf(items.indexOf(b));
                    comparison = indexA - indexB;
                    break;
                default:
                    return 0;
            }

            return sortOrder === 'asc' ? comparison : -comparison;
        });

        // Update bin items
        bin.items = sorted;
    }
}


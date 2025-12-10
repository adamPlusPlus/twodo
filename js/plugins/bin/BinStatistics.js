// BinStatistics.js - Bin plugin for statistics panel
import { BasePlugin } from '../../core/BasePlugin.js';
import { DOMUtils } from '../../utils/dom.js';
import { StringUtils } from '../../utils/string.js';

export default class BinStatistics extends BasePlugin {
    constructor(app = null, config = {}) {
        super({
            id: 'bin-statistics',
            name: 'Bin Statistics',
            description: 'Display statistics and metrics for bin elements.',
            type: 'bin',
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

        const elements = binData.elements || [];
        const stats = this.calculateStats(elements);

        // Add statistics panel to bin header
        const binHeader = binElement.querySelector('.bin-header');
        if (binHeader) {
            const existingStats = binHeader.querySelector('.bin-statistics-panel');
            if (existingStats) existingStats.remove();

            const statsPanel = DOMUtils.createElement('div', {
                className: 'bin-statistics-panel',
                style: 'display: flex; gap: 15px; margin-left: auto; font-size: 11px; color: #888;'
            });

            statsPanel.innerHTML = `
                <div>Total: <strong style="color: #e0e0e0;">${stats.total}</strong></div>
                <div>Completed: <strong style="color: #27ae60;">${stats.completed}</strong></div>
                <div>Progress: <strong style="color: #4a9eff;">${stats.progress}%</strong></div>
                ${stats.withDeadline > 0 ? `<div>Deadlines: <strong>${stats.withDeadline}</strong></div>` : ''}
            `;

            binHeader.appendChild(statsPanel);
        }
    }

    calculateStats(elements) {
        const total = elements.length;
        const completed = elements.filter(el => el.completed).length;
        const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
        const withDeadline = elements.filter(el => el.deadline).length;

        return {
            total,
            completed,
            progress,
            withDeadline
        };
    }
}



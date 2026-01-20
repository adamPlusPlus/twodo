// ProgressTracker.js - Bin plugin for tracking progress
import { BasePlugin } from '../../core/BasePlugin.js';
import { DOMUtils } from '../../utils/dom.js';
import { StringUtils } from '../../utils/string.js';

export default class ProgressTracker extends BasePlugin {
    constructor(app = null, config = {}) {
        super({
            id: 'progress-tracker',
            name: 'Progress Tracker',
            description: 'Track completion progress for group items.',
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

        const items = binData.items || [];
        binData.items = items;
        const total = items.length;
        const completed = items.filter(el => el.completed).length;
        const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

        // Add progress bar to bin header
        const binHeader = binElement.querySelector('.bin-header');
        if (binHeader) {
            const existingProgress = binHeader.querySelector('.bin-progress-tracker');
            if (existingProgress) existingProgress.remove();

            const progressDiv = DOMUtils.createElement('div', {
                className: 'bin-progress-tracker',
                style: 'margin-left: 10px; flex: 1; max-width: 200px;'
            });

            progressDiv.innerHTML = `
                <div style="display: flex; justify-content: space-between; font-size: 11px; color: #888; margin-bottom: 3px;">
                    <span>${completed}/${total}</span>
                    <span>${progress}%</span>
                </div>
                <div style="width: 100%; height: 8px; background: #1a1a1a; border-radius: 4px; overflow: hidden;">
                    <div style="width: ${progress}%; height: 100%; background: #27ae60; transition: width 0.3s;"></div>
                </div>
            `;

            binHeader.appendChild(progressDiv);
        }
    }
}


// TimeEstimates.js - Bin plugin for time estimates
import { BasePlugin } from '../../core/BasePlugin.js';
import { DOMUtils } from '../../utils/dom.js';
import { StringUtils } from '../../utils/string.js';

export default class TimeEstimates extends BasePlugin {
    constructor(app = null, config = {}) {
        super({
            id: 'time-estimates',
            name: 'Time Estimates',
            description: 'Track and display time estimates for group items.',
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
        const totalTime = this.calculateTotalTime(items);

        // Add time summary to bin header
        const binHeader = binElement.querySelector('.bin-header');
        if (binHeader) {
            const existingTime = binHeader.querySelector('.bin-time-estimates');
            if (existingTime) existingTime.remove();

            const timeDiv = DOMUtils.createElement('div', {
                className: 'bin-time-estimates',
                style: 'margin-left: 10px; font-size: 11px; color: #888;'
            });

            timeDiv.textContent = `Total: ${totalTime}`;
            binHeader.appendChild(timeDiv);
        }

        // Add time display to each item
        binElement.querySelectorAll('.element').forEach((elementElement, index) => {
            const element = items[index];
            if (element && element.timeAllocated) {
                const existingTime = elementElement.querySelector('.element-time-estimate');
                if (existingTime) existingTime.remove();

                const timeSpan = DOMUtils.createElement('span', {
                    className: 'element-time-estimate',
                    style: 'font-size: 10px; color: #888; margin-left: 5px;'
                }, `(${element.timeAllocated})`);

                const textElement = elementElement.querySelector('.task-text, .element-text');
                if (textElement) {
                    textElement.appendChild(timeSpan);
                }
            }
        });
    }

    calculateTotalTime(elements) {
        let totalMinutes = 0;

        elements.forEach(element => {
            if (element.timeAllocated) {
                const timeStr = element.timeAllocated.toLowerCase();
                // Parse formats like "30 min", "1h", "2 hours", "30 min+"
                const minutesMatch = timeStr.match(/(\d+)\s*min/);
                const hoursMatch = timeStr.match(/(\d+)\s*h/);
                
                if (minutesMatch) {
                    totalMinutes += parseInt(minutesMatch[1]);
                }
                if (hoursMatch) {
                    totalMinutes += parseInt(hoursMatch[1]) * 60;
                }
            }
        });

        if (totalMinutes === 0) return '0 min';
        if (totalMinutes < 60) return `${totalMinutes} min`;
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        return minutes > 0 ? `${hours}h ${minutes}min` : `${hours}h`;
    }
}


// PageGoalSetting.js - Page plugin for goal setting and tracking
import { BasePlugin } from '../../core/BasePlugin.js';
import { DOMUtils } from '../../utils/dom.js';
import { StringUtils } from '../../utils/string.js';

export default class PageGoalSetting extends BasePlugin {
    constructor(app = null, config = {}) {
        super({
            id: 'page-goal-setting',
            name: 'Goal Setting',
            description: 'Set and track goals for documents with progress visualization.',
            type: 'page',
            defaultConfig: {
                enabled: true,
                goals: []
            },
            ...config
        });
        if (app) {
            this.app = app;
        }
    }

    async onInit() {
        if (this.config.enabled) {
            this.app.eventBus.on('page:render', this.handlePageRender.bind(this));
        }
    }

    async onDestroy() {
        this.app.eventBus.off('page:render', this.handlePageRender.bind(this));
    }

    handlePageRender({ pageElement, pageData }) {
        if (!pageData.pluginConfigs?.[this.id]?.enabled) {
            return;
        }

        const goals = pageData.pluginConfigs[this.id]?.goals || [];
        if (goals.length === 0) return;

        // Add goals widget to page
        const pageContent = pageElement.querySelector('.page-content, [id^="page-content-"]');
        if (pageContent) {
            const existingWidget = pageContent.querySelector('.goals-widget');
            if (existingWidget) existingWidget.remove();

            const widget = this.renderGoalsWidget(pageData.id, goals);
            pageContent.insertBefore(widget, pageContent.firstChild);
        }
    }

    renderGoalsWidget(pageId, goals) {
        const widget = DOMUtils.createElement('div', {
            className: 'goals-widget',
            style: 'padding: 15px; background: #2a2a2a; border-radius: 4px; margin-bottom: 15px;'
        });

        widget.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 10px; color: #e0e0e0;">Goals</div>
            ${goals.map((goal, index) => {
                const progress = this.calculateGoalProgress(pageId, goal);
                return `
                    <div style="margin-bottom: 10px;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 12px;">
                            <span>${StringUtils.escapeHtml(goal.name)}</span>
                            <span>${progress}%</span>
                        </div>
                        <div style="width: 100%; height: 8px; background: #1a1a1a; border-radius: 4px; overflow: hidden;">
                            <div style="width: ${progress}%; height: 100%; background: #4a9eff; transition: width 0.3s;"></div>
                        </div>
                    </div>
                `;
            }).join('')}
        `;

        return widget;
    }

    calculateGoalProgress(pageId, goal) {
        const page = this.app.documents?.find(p => p.id === pageId);
        if (!page) return 0;

        // Calculate progress based on goal type
        if (goal.type === 'completion') {
            let total = 0;
            let completed = 0;

            page.groups?.forEach(bin => {
                const items = bin.items || [];
                bin.items = items;
                items.forEach(element => {
                    total++;
                    if (element.completed) completed++;
                });
            });

            const currentProgress = total > 0 ? (completed / total) * 100 : 0;
            return Math.min(100, Math.round((currentProgress / goal.target) * 100));
        } else if (goal.type === 'count') {
            let count = 0;
            page.groups?.forEach(bin => {
                const items = bin.items || [];
                bin.items = items;
                count += items.length;
            });
            return Math.min(100, Math.round((count / goal.target) * 100));
        }

        return 0;
    }

    renderConfigUI(container, pageData) {
        const goals = pageData.pluginConfigs?.[this.id]?.goals || [];

        let html = `
            <div style="margin-top: 15px; padding: 10px; background: #1a1a1a; border-radius: 4px;">
                <label style="font-weight: 600;">Goals:</label>
                <div id="goals-list" style="margin-top: 10px;">
                    ${goals.map((goal, index) => `
                        <div style="display: flex; gap: 5px; margin-bottom: 5px; align-items: center;">
                            <input type="text" class="goal-name-input" data-index="${index}" value="${StringUtils.escapeHtml(goal.name)}" placeholder="Goal name" style="flex: 1; padding: 6px; background: #2a2a2a; color: #e0e0e0; border: 1px solid #555; border-radius: 4px;" />
                            <select class="goal-type-input" data-index="${index}" style="padding: 6px; background: #2a2a2a; color: #e0e0e0; border: 1px solid #555; border-radius: 4px;">
                                <option value="completion" ${goal.type === 'completion' ? 'selected' : ''}>Completion %</option>
                                <option value="count" ${goal.type === 'count' ? 'selected' : ''}>Element Count</option>
                            </select>
                            <input type="number" class="goal-target-input" data-index="${index}" value="${goal.target}" placeholder="Target" style="width: 80px; padding: 6px; background: #2a2a2a; color: #e0e0e0; border: 1px solid #555; border-radius: 4px;" />
                            <button type="button" class="remove-goal-btn" data-index="${index}" style="padding: 2px 8px; background: #e74c3c; color: white; border: none; border-radius: 4px; cursor: pointer;">×</button>
                        </div>
                    `).join('')}
                </div>
                <button type="button" id="add-goal-btn" style="padding: 5px 10px; background: #4a9eff; color: white; border: none; border-radius: 4px; cursor: pointer; margin-top: 5px;">+ Add Goal</button>
            </div>
        `;
        container.innerHTML = html;

        // Event listeners
        const addBtn = container.querySelector('#add-goal-btn');
        if (addBtn) {
            addBtn.addEventListener('click', () => {
                if (!pageData.pluginConfigs) pageData.pluginConfigs = {};
                if (!pageData.pluginConfigs[this.id]) pageData.pluginConfigs[this.id] = {};
                if (!pageData.pluginConfigs[this.id].goals) pageData.pluginConfigs[this.id].goals = [];

                pageData.pluginConfigs[this.id].goals.push({
                    name: 'New Goal',
                    type: 'completion',
                    target: 100
                });

                this.updateConfig({ goals: pageData.pluginConfigs[this.id].goals }, true);
                this.app.render();
            });
        }

        container.querySelectorAll('.remove-goal-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                pageData.pluginConfigs[this.id].goals.splice(index, 1);
                this.updateConfig({ goals: pageData.pluginConfigs[this.id].goals }, true);
                this.app.render();
            });
        });

        // Update goals on change
        container.querySelectorAll('.goal-name-input, .goal-type-input, .goal-target-input').forEach(input => {
            input.addEventListener('change', () => {
                const index = parseInt(input.dataset.index);
                const nameInput = container.querySelector(`.goal-name-input[data-index="${index}"]`);
                const typeInput = container.querySelector(`.goal-type-input[data-index="${index}"]`);
                const targetInput = container.querySelector(`.goal-target-input[data-index="${index}"]`);

                pageData.pluginConfigs[this.id].goals[index] = {
                    name: nameInput.value,
                    type: typeInput.value,
                    target: parseInt(targetInput.value) || 100
                };

                this.updateConfig({ goals: pageData.pluginConfigs[this.id].goals }, true);
                this.app.render();
            });
        });
    }
}



// BinNotificationRules.js - Bin plugin for notification rules
import { BasePlugin } from '../../core/BasePlugin.js';
import { DOMUtils } from '../../utils/dom.js';
import { StringUtils } from '../../utils/string.js';

export default class BinNotificationRules extends BasePlugin {
    constructor(app = null, config = {}) {
        super({
            id: 'bin-notification-rules',
            name: 'Notification Rules',
            description: 'Set up notification rules for bin events.',
            type: 'bin',
            defaultConfig: {
                enabled: true,
                rules: []
            },
            ...config
        });
        if (app) {
            this.app = app;
        }
    }

    async onInit() {
        if (this.config.enabled) {
            this.setupNotificationListeners();
        }
    }

    async onDestroy() {
        // Cleanup listeners
    }

    setupNotificationListeners() {
        this.app.eventBus.on('element:completed', (data) => {
            this.checkRules(data, 'element:completed');
        });
        
        this.app.eventBus.on('element:created', (data) => {
            this.checkRules(data, 'element:created');
        });
    }

    checkRules(eventData, eventType) {
        const { pageId, binId } = eventData;
        const page = this.app.documents?.find(p => p.id === pageId);
        const bin = page?.groups?.find(b => b.id === binId);
        if (!bin) return;

        const rules = bin.pluginConfigs?.[this.id]?.rules || [];
        
        rules.forEach(rule => {
            if (rule.event === eventType && rule.enabled) {
                this.triggerNotification(rule, eventData);
            }
        });
    }

    triggerNotification(rule, eventData) {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(rule.title || 'Notification', {
                body: rule.message || 'A rule was triggered',
                icon: '/favicon.ico'
            });
        }
    }

    renderConfigUI(container, binData) {
        const rules = binData.pluginConfigs?.[this.id]?.rules || [];

        let html = `
            <div style="margin-top: 15px; padding: 10px; background: #1a1a1a; border-radius: 4px;">
                <label style="font-weight: 600;">Notification Rules:</label>
                <div id="notification-rules-list" style="margin-top: 10px;">
                    ${rules.map((rule, index) => `
                        <div style="display: flex; flex-direction: column; gap: 5px; margin-bottom: 10px; padding: 8px; background: #2a2a2a; border-radius: 4px;">
                            <div style="display: flex; gap: 5px; align-items: center;">
                                <select class="notification-event-select" data-index="${index}" style="flex: 1; padding: 6px; background: #1a1a1a; color: #e0e0e0; border: 1px solid #555; border-radius: 4px;">
                                    <option value="element:completed" ${rule.event === 'element:completed' ? 'selected' : ''}>Element Completed</option>
                                    <option value="element:created" ${rule.event === 'element:created' ? 'selected' : ''}>Element Created</option>
                                </select>
                                <label style="display: flex; align-items: center; gap: 5px;">
                                    <input type="checkbox" class="notification-enabled-checkbox" data-index="${index}" ${rule.enabled ? 'checked' : ''} />
                                    <span style="font-size: 11px;">Enabled</span>
                                </label>
                            </div>
                            <input type="text" class="notification-title-input" data-index="${index}" value="${StringUtils.escapeHtml(rule.title || '')}" placeholder="Notification title" style="padding: 6px; background: #1a1a1a; color: #e0e0e0; border: 1px solid #555; border-radius: 4px;" />
                            <textarea class="notification-message-input" data-index="${index}" placeholder="Notification message" style="padding: 6px; background: #1a1a1a; color: #e0e0e0; border: 1px solid #555; border-radius: 4px; min-height: 50px;">${StringUtils.escapeHtml(rule.message || '')}</textarea>
                            <button type="button" class="remove-notification-rule-btn" data-index="${index}" style="padding: 2px 8px; background: #e74c3c; color: white; border: none; border-radius: 4px; cursor: pointer;">Remove</button>
                        </div>
                    `).join('')}
                </div>
                <button type="button" id="add-notification-rule-btn" style="padding: 5px 10px; background: #4a9eff; color: white; border: none; border-radius: 4px; cursor: pointer; margin-top: 5px;">+ Add Rule</button>
            </div>
        `;
        container.innerHTML = html;

        // Event listeners
        const addBtn = container.querySelector('#add-notification-rule-btn');
        if (addBtn) {
            addBtn.addEventListener('click', () => {
                if (!binData.pluginConfigs) binData.pluginConfigs = {};
                if (!binData.pluginConfigs[this.id]) binData.pluginConfigs[this.id] = {};
                if (!binData.pluginConfigs[this.id].rules) binData.pluginConfigs[this.id].rules = [];

                binData.pluginConfigs[this.id].rules.push({
                    event: 'element:completed',
                    title: 'New Notification',
                    message: '',
                    enabled: true
                });

                this.updateConfig({ rules: binData.pluginConfigs[this.id].rules }, true);
                this.app.render();
            });
        }

        container.querySelectorAll('.remove-notification-rule-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                binData.pluginConfigs[this.id].rules.splice(index, 1);
                this.updateConfig({ rules: binData.pluginConfigs[this.id].rules }, true);
                this.app.render();
            });
        });

        // Update rules on change
        container.querySelectorAll('.notification-event-select, .notification-title-input, .notification-message-input, .notification-enabled-checkbox').forEach(input => {
            input.addEventListener('change', () => {
                const index = parseInt(input.dataset.index);
                const eventSelect = container.querySelector(`.notification-event-select[data-index="${index}"]`);
                const titleInput = container.querySelector(`.notification-title-input[data-index="${index}"]`);
                const messageInput = container.querySelector(`.notification-message-input[data-index="${index}"]`);
                const enabledCheckbox = container.querySelector(`.notification-enabled-checkbox[data-index="${index}"]`);

                binData.pluginConfigs[this.id].rules[index] = {
                    event: eventSelect.value,
                    title: titleInput.value,
                    message: messageInput.value,
                    enabled: enabledCheckbox.checked
                };

                this.updateConfig({ rules: binData.pluginConfigs[this.id].rules }, true);
            });
        });
    }
}



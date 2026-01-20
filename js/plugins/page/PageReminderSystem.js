// PageReminderSystem.js - Page plugin for reminder notifications
import { BasePlugin } from '../../core/BasePlugin.js';
import { DOMUtils } from '../../utils/dom.js';
import { StringUtils } from '../../utils/string.js';

export default class PageReminderSystem extends BasePlugin {
    constructor(app = null, config = {}) {
        super({
            id: 'page-reminder-system',
            name: 'Reminder System',
            description: 'Set reminders and notifications for page-level deadlines.',
            type: 'page',
            defaultConfig: {
                enabled: true,
                reminders: []
            },
            ...config
        });
        if (app) {
            this.app = app;
        }
        this.checkInterval = null;
    }

    async onInit() {
        if (this.config.enabled) {
            this.startReminderChecker();
            this.app.eventBus.on('page:render', this.handlePageRender.bind(this));
        }
    }

    async onDestroy() {
        this.stopReminderChecker();
        this.app.eventBus.off('page:render', this.handlePageRender.bind(this));
    }

    startReminderChecker() {
        // Check reminders every minute
        this.checkInterval = setInterval(() => {
            this.checkReminders();
        }, 60000);
        
        // Initial check
        this.checkReminders();
    }

    stopReminderChecker() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
    }

    checkReminders() {
        const pages = this.app.documents || [];
        pages.forEach(page => {
            const reminders = page.pluginConfigs?.[this.id]?.reminders || [];
            const now = new Date();
            
            reminders.forEach(reminder => {
                if (reminder.triggered) return;
                
                const reminderTime = new Date(reminder.datetime);
                if (now >= reminderTime) {
                    this.triggerReminder(page.id, reminder);
                    reminder.triggered = true;
                }
            });
        });
    }

    triggerReminder(pageId, reminder) {
        // Show browser notification if permission granted
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(reminder.title || 'Reminder', {
                body: reminder.message || 'You have a reminder',
                icon: '/favicon.ico'
            });
        } else if ('Notification' in window && Notification.permission !== 'denied') {
            // Request permission
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    new Notification(reminder.title || 'Reminder', {
                        body: reminder.message || 'You have a reminder',
                        icon: '/favicon.ico'
                    });
                }
            });
        }
        
        // Show in-app notification
        this.showInAppNotification(reminder);
    }

    showInAppNotification(reminder) {
        const notification = DOMUtils.createElement('div', {
            className: 'reminder-notification',
            style: `
                position: fixed; top: 20px; right: 20px; z-index: 10000;
                padding: 15px; background: #4a9eff; color: white; border-radius: 4px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3); max-width: 300px;
            `
        });
        
        notification.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 5px;">${StringUtils.escapeHtml(reminder.title || 'Reminder')}</div>
            <div style="font-size: 12px;">${StringUtils.escapeHtml(reminder.message || '')}</div>
            <button class="close-notification" style="position: absolute; top: 5px; right: 5px; background: transparent; border: none; color: white; cursor: pointer; font-size: 18px;">×</button>
        `;
        
        document.body.appendChild(notification);
        
        notification.querySelector('.close-notification').addEventListener('click', () => {
            notification.remove();
        });
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }

    handlePageRender({ pageElement, pageData }) {
        // Reminders are checked in background, no UI needed here
    }

    renderConfigUI(container, pageData) {
        const reminders = pageData.pluginConfigs?.[this.id]?.reminders || [];

        let html = `
            <div style="margin-top: 15px; padding: 10px; background: #1a1a1a; border-radius: 4px;">
                <label style="font-weight: 600;">Reminders:</label>
                <div id="reminders-list" style="margin-top: 10px;">
                    ${reminders.map((reminder, index) => `
                        <div style="display: flex; flex-direction: column; gap: 5px; margin-bottom: 10px; padding: 8px; background: #2a2a2a; border-radius: 4px;">
                            <input type="text" class="reminder-title-input" data-index="${index}" value="${StringUtils.escapeHtml(reminder.title || '')}" placeholder="Reminder title" style="padding: 6px; background: #1a1a1a; color: #e0e0e0; border: 1px solid #555; border-radius: 4px;" />
                            <textarea class="reminder-message-input" data-index="${index}" placeholder="Reminder message" style="padding: 6px; background: #1a1a1a; color: #e0e0e0; border: 1px solid #555; border-radius: 4px; min-height: 50px;">${StringUtils.escapeHtml(reminder.message || '')}</textarea>
                            <input type="datetime-local" class="reminder-datetime-input" data-index="${index}" value="${reminder.datetime ? new Date(reminder.datetime).toISOString().slice(0, 16) : ''}" style="padding: 6px; background: #1a1a1a; color: #e0e0e0; border: 1px solid #555; border-radius: 4px;" />
                            <button type="button" class="remove-reminder-btn" data-index="${index}" style="padding: 2px 8px; background: #e74c3c; color: white; border: none; border-radius: 4px; cursor: pointer;">Remove</button>
                        </div>
                    `).join('')}
                </div>
                <button type="button" id="add-reminder-btn" style="padding: 5px 10px; background: #4a9eff; color: white; border: none; border-radius: 4px; cursor: pointer; margin-top: 5px;">+ Add Reminder</button>
            </div>
        `;
        container.innerHTML = html;

        // Event listeners
        const addBtn = container.querySelector('#add-reminder-btn');
        if (addBtn) {
            addBtn.addEventListener('click', () => {
                if (!pageData.pluginConfigs) pageData.pluginConfigs = {};
                if (!pageData.pluginConfigs[this.id]) pageData.pluginConfigs[this.id] = {};
                if (!pageData.pluginConfigs[this.id].reminders) pageData.pluginConfigs[this.id].reminders = [];

                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                tomorrow.setHours(9, 0, 0, 0);

                pageData.pluginConfigs[this.id].reminders.push({
                    title: 'New Reminder',
                    message: '',
                    datetime: tomorrow.toISOString(),
                    triggered: false
                });

                this.updateConfig({ reminders: pageData.pluginConfigs[this.id].reminders }, true);
                this.app.render();
            });
        }

        container.querySelectorAll('.remove-reminder-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                pageData.pluginConfigs[this.id].reminders.splice(index, 1);
                this.updateConfig({ reminders: pageData.pluginConfigs[this.id].reminders }, true);
                this.app.render();
            });
        });

        // Update reminders on change
        container.querySelectorAll('.reminder-title-input, .reminder-message-input, .reminder-datetime-input').forEach(input => {
            input.addEventListener('change', () => {
                const index = parseInt(input.dataset.index);
                const titleInput = container.querySelector(`.reminder-title-input[data-index="${index}"]`);
                const messageInput = container.querySelector(`.reminder-message-input[data-index="${index}"]`);
                const datetimeInput = container.querySelector(`.reminder-datetime-input[data-index="${index}"]`);

                pageData.pluginConfigs[this.id].reminders[index] = {
                    title: titleInput.value,
                    message: messageInput.value,
                    datetime: new Date(datetimeInput.value).toISOString(),
                    triggered: pageData.pluginConfigs[this.id].reminders[index]?.triggered || false
                };

                this.updateConfig({ reminders: pageData.pluginConfigs[this.id].reminders }, true);
            });
        });
    }
}



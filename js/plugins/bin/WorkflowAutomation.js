// WorkflowAutomation - Bin plugin for workflow automation
import { BasePlugin } from '../../core/BasePlugin.js';
import { DOMUtils } from '../../utils/dom.js';
import { StringUtils } from '../../utils/string.js';

export default class WorkflowAutomation extends BasePlugin {
    constructor(config = {}) {
        super({
            id: 'workflow-automation',
            name: 'Workflow Automation',
            type: 'bin',
            version: '1.0.0',
            description: 'Automate element workflows with rules',
            defaultConfig: {
                enabled: false,
                rules: []
            },
            ...config
        });
    }
    
    async onInit() {
        // console.log(`${this.name} initialized for bin.`);
        
        // Initialize automation engine if not exists
        if (!this.app.automationEngine) {
            const { AutomationEngine } = await import('../../core/AutomationEngine.js');
            this.app.automationEngine = new AutomationEngine(this.app);
        }
    }
    
    renderSettingsUI() {
        if (!this.app || !this.app.automationEngine) {
            return '<p style="color: #888;">Automation engine not available</p>';
        }
        
        const rules = this.app.automationEngine.getRules(this.config.pageId || '', this.config.binId || '');
        
        let html = `
            <div>
                <label>
                    <input type="checkbox" id="workflow-automation-enabled" ${this.config.enabled ? 'checked' : ''}>
                    Enable Workflow Automation
                </label>
                <div style="margin-top: 20px;">
                    <h4>Automation Rules</h4>
                    <div id="automation-rules-list" style="max-height: 300px; overflow-y: auto; margin-top: 10px;">
        `;
        
        if (rules.length === 0) {
            html += '<p style="color: #888;">No automation rules configured</p>';
        } else {
            rules.forEach(rule => {
                html += `
                    <div class="automation-rule-item" style="padding: 10px; background: #1a1a1a; border-radius: 4px; margin-bottom: 10px;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <strong style="color: #e0e0e0;">${StringUtils.escapeHtml(rule.name)}</strong>
                                <div style="font-size: 11px; color: #888; margin-top: 3px;">
                                    Trigger: ${rule.trigger?.type || 'none'} | 
                                    Actions: ${rule.actions?.length || 0}
                                </div>
                            </div>
                            <div>
                                <button class="edit-rule-btn" data-rule-id="${rule.id}" style="padding: 4px 8px; background: #4a9eff; color: white; border: none; border-radius: 3px; cursor: pointer; margin-right: 5px; font-size: 11px;">
                                    Edit
                                </button>
                                <button class="delete-rule-btn" data-rule-id="${rule.id}" style="padding: 4px 8px; background: #e74c3c; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 11px;">
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            });
        }
        
        html += `
                    </div>
                    <button id="add-automation-rule-btn" style="margin-top: 10px; padding: 8px 16px; background: #4a9eff; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        + Add Rule
                    </button>
                </div>
            </div>
        `;
        
        return html;
    }
    
    saveSettings(formData) {
        this.config.enabled = formData.get('workflow-automation-enabled') === 'on';
        console.log(`${this.name} settings saved.`);
    }
    
    /**
     * Show add/edit rule modal
     * @param {string} pageId - Page ID
     * @param {string} binId - Bin ID
     * @param {string} ruleId - Optional rule ID for editing
     */
    showRuleModal(pageId, binId, ruleId = null) {
        const modal = document.getElementById('modal');
        const modalBody = document.getElementById('modal-body');
        
        const isEditing = ruleId !== null;
        const rule = isEditing ? 
            this.app.automationEngine.getRules(pageId, binId).find(r => r.id === ruleId) : 
            null;
        
        let html = `
            <h3>${isEditing ? 'Edit' : 'Add'} Automation Rule</h3>
            <label>Rule Name:</label>
            <input type="text" id="rule-name" value="${rule?.name || ''}" placeholder="Enter rule name" style="width: 100%; padding: 8px; margin-bottom: 15px; background: #1a1a1a; color: #e0e0e0; border: 1px solid #555; border-radius: 4px;" />
            
            <label>Trigger Type:</label>
            <select id="rule-trigger-type" style="width: 100%; padding: 8px; margin-bottom: 15px; background: #1a1a1a; color: #e0e0e0; border: 1px solid #555; border-radius: 4px;">
                <option value="elementCompleted" ${rule?.trigger?.type === 'elementCompleted' ? 'selected' : ''}>Element Completed</option>
                <option value="elementCreated" ${rule?.trigger?.type === 'elementCreated' ? 'selected' : ''}>Element Created</option>
                <option value="elementUpdated" ${rule?.trigger?.type === 'elementUpdated' ? 'selected' : ''}>Element Updated</option>
                <option value="timeBased" ${rule?.trigger?.type === 'timeBased' ? 'selected' : ''}>Time Based</option>
            </select>
            
            <div id="trigger-options" style="margin-bottom: 15px;">
                ${this.renderTriggerOptions(rule?.trigger)}
            </div>
            
            <label>Actions:</label>
            <div id="rule-actions-list" style="margin-bottom: 15px;">
                ${this.renderActionsList(rule?.actions || [])}
            </div>
            <button id="add-action-btn" style="padding: 6px 12px; background: #4a9eff; color: white; border: none; border-radius: 4px; cursor: pointer; margin-bottom: 15px;">
                + Add Action
            </button>
            
            <div style="margin-top: 20px;">
                <button id="save-rule-btn" style="padding: 8px 16px; background: #4a9eff; color: white; border: none; border-radius: 4px; cursor: pointer; margin-right: 10px;">
                    ${isEditing ? 'Update' : 'Create'} Rule
                </button>
                <button class="cancel" onclick="app.modalHandler.closeModal()">Cancel</button>
            </div>
        `;
        
        modalBody.innerHTML = html;
        modal.classList.add('active');
        
        // Update trigger options when trigger type changes
        document.getElementById('rule-trigger-type').addEventListener('change', (e) => {
            const triggerOptions = document.getElementById('trigger-options');
            triggerOptions.innerHTML = this.renderTriggerOptions({ type: e.target.value });
        });
        
        // Add action button
        document.getElementById('add-action-btn').addEventListener('click', () => {
            this.showAddActionModal();
        });
        
        // Save rule button
        document.getElementById('save-rule-btn').addEventListener('click', () => {
            this.saveRule(pageId, binId, ruleId);
        });
    }
    
    renderTriggerOptions(trigger) {
        if (!trigger || !trigger.type) {
            return '<p style="color: #888; font-size: 12px;">Select a trigger type</p>';
        }
        
        switch (trigger.type) {
            case 'elementCompleted':
            case 'elementCreated':
            case 'elementUpdated':
                return `
                    <label>Element Index (optional):</label>
                    <input type="number" id="trigger-element-index" value="${trigger.elementIndex || ''}" placeholder="Leave empty for any element" style="width: 100%; padding: 8px; background: #1a1a1a; color: #e0e0e0; border: 1px solid #555; border-radius: 4px;" />
                `;
            case 'timeBased':
                return `
                    <label>Hour:</label>
                    <input type="number" id="trigger-hour" value="${trigger.schedule?.hour || 9}" min="0" max="23" style="width: 100%; padding: 8px; background: #1a1a1a; color: #e0e0e0; border: 1px solid #555; border-radius: 4px; margin-bottom: 10px;" />
                    <label>Minute:</label>
                    <input type="number" id="trigger-minute" value="${trigger.schedule?.minute || 0}" min="0" max="59" style="width: 100%; padding: 8px; background: #1a1a1a; color: #e0e0e0; border: 1px solid #555; border-radius: 4px; margin-bottom: 10px;" />
                    <label>Days of Week:</label>
                    <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                        ${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => `
                            <label style="display: flex; align-items: center; gap: 5px;">
                                <input type="checkbox" class="trigger-day" value="${index}" ${trigger.schedule?.days?.includes(index) ? 'checked' : ''} />
                                <span>${day}</span>
                            </label>
                        `).join('')}
                    </div>
                `;
            default:
                return '';
        }
    }
    
    renderActionsList(actions) {
        if (actions.length === 0) {
            return '<p style="color: #888; font-size: 12px;">No actions configured</p>';
        }
        
        return actions.map((action, index) => `
            <div class="action-item" style="padding: 8px; background: #2a2a2a; border-radius: 4px; margin-bottom: 5px; display: flex; justify-content: space-between; align-items: center;">
                <span style="color: #e0e0e0; font-size: 12px;">
                    ${action.type}: ${this.getActionDescription(action)}
                </span>
                <button class="remove-action-btn" data-index="${index}" style="padding: 2px 6px; background: #e74c3c; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 11px;">
                    Remove
                </button>
            </div>
        `).join('');
    }
    
    getActionDescription(action) {
        switch (action.type) {
            case 'moveElement':
                return `Move to ${action.targetBinId || 'target bin'}`;
            case 'setProperty':
                return `Set ${action.property} = ${action.value}`;
            case 'addTag':
                return `Add tag: ${action.tag}`;
            case 'removeTag':
                return `Remove tag: ${action.tag}`;
            case 'createElement':
                return `Create element: ${action.elementData?.text || 'new'}`;
            case 'deleteElement':
                return 'Delete element';
            default:
                return action.type;
        }
    }
    
    showAddActionModal() {
        // This would show a modal to add actions
        // For now, we'll add a simple action inline
        alert('Action builder coming soon. For now, rules can be configured programmatically.');
    }
    
    saveRule(pageId, binId, ruleId) {
        const name = document.getElementById('rule-name').value.trim();
        const triggerType = document.getElementById('rule-trigger-type').value;
        
        if (!name) {
            alert('Please enter a rule name');
            return;
        }
        
        const trigger = {
            type: triggerType,
            pageId: pageId,
            binId: binId
        };
        
        // Add trigger-specific options
        if (triggerType === 'elementCompleted' || triggerType === 'elementCreated' || triggerType === 'elementUpdated') {
            const elementIndex = document.getElementById('trigger-element-index')?.value;
            if (elementIndex) {
                trigger.elementIndex = parseInt(elementIndex);
            }
        } else if (triggerType === 'timeBased') {
            trigger.schedule = {
                hour: parseInt(document.getElementById('trigger-hour').value),
                minute: parseInt(document.getElementById('trigger-minute').value),
                days: Array.from(document.querySelectorAll('.trigger-day:checked')).map(cb => parseInt(cb.value))
            };
        }
        
        const rule = {
            name,
            enabled: true,
            trigger,
            conditions: [],
            actions: [] // Actions would be populated from the actions list
        };
        
        if (ruleId) {
            // Update existing rule
            this.app.automationEngine.removeRule(pageId, binId, ruleId);
        }
        
        this.app.automationEngine.addRule(pageId, binId, rule);
        
        // Save to bin config
        const page = this.app.documents?.find(p => p.id === pageId);
        const bin = page?.groups?.find(b => b.id === binId);
        if (bin) {
            if (!bin.pluginConfigs) bin.pluginConfigs = {};
            if (!bin.pluginConfigs.WorkflowAutomation) bin.pluginConfigs.WorkflowAutomation = {};
            bin.pluginConfigs.WorkflowAutomation.rules = this.app.automationEngine.getRulesForSaving(pageId, binId);
            this.app.dataManager.saveData();
        }
        
        this.app.modalHandler.closeModal();
        this.app.render();
    }
    
    async onDestroy() {
        // Cleanup is handled by AutomationEngine
        console.log(`${this.name} destroyed.`);
    }
}


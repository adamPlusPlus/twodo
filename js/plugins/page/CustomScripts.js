// CustomScripts - Page plugin for custom JavaScript scripts
import { BasePlugin } from '../../core/BasePlugin.js';
import { DOMUtils } from '../../utils/dom.js';

export default class CustomScripts extends BasePlugin {
    constructor(config = {}) {
        super({
            id: 'custom-scripts',
            name: 'Custom Scripts',
            type: 'page',
            version: '1.0.0',
            description: 'Run custom JavaScript on page events',
            defaultConfig: {
                enabled: false,
                script: ''
            },
            ...config
        });
    }
    
    async onInit() {
        console.log(`${this.name} initialized for page.`);
        
        // Initialize script sandbox if not exists
        if (!this.app.scriptSandbox) {
            const { ScriptSandbox } = await import('../../core/ScriptSandbox.js');
            this.app.scriptSandbox = new ScriptSandbox(this.app);
        }
    }
    
    renderSettingsUI() {
        const script = this.config.script || '';
        
        return `
            <div>
                <label>
                    <input type="checkbox" id="custom-scripts-enabled" ${this.config.enabled ? 'checked' : ''}>
                    Enable Custom Scripts
                </label>
                <div style="margin-top: 15px;">
                    <label>Script Code:</label>
                    <textarea id="custom-script-code" rows="15" style="width: 100%; padding: 10px; background: #1a1a1a; color: #e0e0e0; border: 1px solid #555; border-radius: 4px; font-family: monospace; font-size: 12px;" placeholder="// Example:&#10;on('element:completed', (data) => {&#10;  api.log('Element completed:', data.element.text);&#10;});">${this.escapeHtml(script)}</textarea>
                    <div style="margin-top: 10px; font-size: 11px; color: #888;">
                        <strong>Available API:</strong><br>
                        • api.getPage() - Get current page<br>
                        • api.getBins() - Get all bins in page<br>
                        • api.getElements(binId) - Get elements in bin<br>
                        • api.createElement(binId, elementData) - Create element<br>
                        • api.updateElement(binId, elementIndex, updates) - Update element<br>
                        • api.deleteElement(binId, elementIndex) - Delete element<br>
                        • api.emit(event, data) - Emit event<br>
                        • api.log(...args) - Log to console<br>
                        • on(eventName, handler) - Register event handler<br>
                    </div>
                    <div style="margin-top: 10px;">
                        <button id="validate-script-btn" style="padding: 6px 12px; background: #4a9eff; color: white; border: none; border-radius: 4px; cursor: pointer; margin-right: 10px;">
                            Validate Script
                        </button>
                        <button id="test-script-btn" style="padding: 6px 12px; background: #4caf50; color: white; border: none; border-radius: 4px; cursor: pointer;">
                            Test Script
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
    
    saveSettings(formData) {
        this.config.enabled = formData.get('custom-scripts-enabled') === 'on';
        const scriptCode = document.getElementById('custom-script-code')?.value || '';
        this.config.script = scriptCode;
        
        // Load script if enabled
        if (this.config.enabled && scriptCode && this.app.scriptSandbox) {
            const pageId = this.config.pageId;
            if (pageId) {
                // Validate first
                const validation = this.app.scriptSandbox.validateScript(scriptCode);
                if (!validation.valid) {
                    alert(`Script validation failed: ${validation.error}`);
                    return;
                }
                
                // Wrap script to provide on() function and expose context
                const wrappedScript = `
                    const on = function(eventName, handler) {
                        context.scriptSandbox.registerEventHandler(context.pageId, eventName, handler);
                    };
                    ${scriptCode}
                `;
                
                this.app.scriptSandbox.loadScript(pageId, wrappedScript);
            }
        }
        
        console.log(`${this.name} settings saved.`);
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    async onDestroy() {
        // Cleanup script when plugin is destroyed
        const pageId = this.config.pageId;
        if (pageId && this.app.scriptSandbox) {
            this.app.scriptSandbox.clearScript(pageId);
        }
        console.log(`${this.name} destroyed.`);
    }
}


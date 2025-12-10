// ExamplePagePlugin - Example page plugin template
import { BasePlugin } from '../../core/BasePlugin.js';
import { DOMUtils } from '../../utils/dom.js';

export default class ExamplePagePlugin extends BasePlugin {
    constructor() {
        super({
            id: 'example-page-plugin',
            name: 'Example Page Plugin',
            type: 'page',
            version: '1.0.0',
            description: 'An example page plugin demonstrating the plugin API',
            defaultConfig: {
                enabled: true,
                customSetting: 'default value'
            }
        });
    }
    
    async onInit() {
        // Custom initialization logic
        console.log('ExamplePagePlugin initialized');
    }
    
    async onEnable() {
        // Custom enable logic
        console.log('ExamplePagePlugin enabled');
    }
    
    async onDisable() {
        // Custom disable logic
        console.log('ExamplePagePlugin disabled');
    }
    
    setupEventListeners() {
        // Subscribe to events
        this.unsubscribers = [];
        this.unsubscribers.push(
            this.app.eventBus.on('page:created', (data) => {
                console.log('Page created:', data);
            })
        );
    }
    
    removeEventListeners() {
        // Unsubscribe from events
        if (this.unsubscribers) {
            this.unsubscribers.forEach(unsub => unsub());
            this.unsubscribers = [];
        }
    }
    
    render(container, page) {
        // Render plugin UI for the page
        const pluginDiv = DOMUtils.createElement('div', {
            class: 'example-page-plugin'
        });
        
        const title = DOMUtils.createElement('h4', {}, 'Example Page Plugin');
        pluginDiv.appendChild(title);
        
        const content = DOMUtils.createElement('p', {}, 
            `This is an example page plugin for page: ${page.id}`
        );
        pluginDiv.appendChild(content);
        
        container.appendChild(pluginDiv);
        return pluginDiv;
    }
    
    renderConfigUI(container) {
        // Render configuration UI
        const configDiv = DOMUtils.createElement('div', {
            class: 'plugin-config'
        });
        
        const label = DOMUtils.createElement('label', {}, 'Custom Setting:');
        configDiv.appendChild(label);
        
        const input = DOMUtils.createElement('input', {
            type: 'text',
            value: this.config.customSetting || '',
            id: 'plugin-custom-setting'
        });
        
        input.addEventListener('change', (e) => {
            this.updateConfig({ customSetting: e.target.value });
        });
        
        configDiv.appendChild(input);
        container.appendChild(configDiv);
        return configDiv;
    }
}


// ExampleBinPlugin - Example bin plugin template
import { BasePlugin } from '../../core/BasePlugin.js';
import { DOMUtils } from '../../utils/dom.js';

export default class ExampleBinPlugin extends BasePlugin {
    constructor() {
        super({
            id: 'example-bin-plugin',
            name: 'Example Bin Plugin',
            type: 'bin',
            version: '1.0.0',
            description: 'An example bin plugin demonstrating the plugin API',
            defaultConfig: {
                enabled: true,
                showStats: true
            }
        });
    }
    
    async onInit() {
        // Custom initialization logic
        console.log('ExampleBinPlugin initialized');
    }
    
    async onEnable() {
        // Custom enable logic
        console.log('ExampleBinPlugin enabled');
    }
    
    async onDisable() {
        // Custom disable logic
        console.log('ExampleBinPlugin disabled');
    }
    
    setupEventListeners() {
        // Subscribe to events
        this.unsubscribers = [];
        this.unsubscribers.push(
            this.app.eventBus.on('bin:created', (data) => {
                console.log('Bin created:', data);
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
    
    render(container, bin, context) {
        // Render plugin UI for the bin
        const pluginDiv = DOMUtils.createElement('div', {
            class: 'example-bin-plugin'
        });
        
        const title = DOMUtils.createElement('h4', {}, 'Example Bin Plugin');
        pluginDiv.appendChild(title);
        
        if (this.config.showStats && bin.elements) {
            const completed = bin.elements.filter(e => e.completed).length;
            const total = bin.elements.length;
            const stats = DOMUtils.createElement('p', {}, 
                `Completed: ${completed}/${total}`
            );
            pluginDiv.appendChild(stats);
        }
        
        container.appendChild(pluginDiv);
        return pluginDiv;
    }
    
    renderConfigUI(container) {
        // Render configuration UI
        const configDiv = DOMUtils.createElement('div', {
            class: 'plugin-config'
        });
        
        const checkbox = DOMUtils.createElement('input', {
            type: 'checkbox',
            id: 'plugin-show-stats',
            checked: this.config.showStats || false
        });
        
        checkbox.addEventListener('change', (e) => {
            this.updateConfig({ showStats: e.target.checked });
        });
        
        const label = DOMUtils.createElement('label', {}, 'Show Statistics');
        label.insertBefore(checkbox, label.firstChild);
        
        configDiv.appendChild(label);
        container.appendChild(configDiv);
        return configDiv;
    }
}


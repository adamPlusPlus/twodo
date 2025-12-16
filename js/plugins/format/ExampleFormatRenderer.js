// ExampleFormatRenderer - Example format renderer plugin template
import { BaseFormatRenderer } from '../../core/BaseFormatRenderer.js';
import { DOMUtils } from '../../utils/dom.js';

export default class ExampleFormatRenderer extends BaseFormatRenderer {
    constructor() {
        super({
            id: 'example-format-renderer',
            name: 'Example Format',
            formatName: 'example',
            formatLabel: 'Example Format',
            supportsPages: true,
            supportsBins: true,
            version: '1.0.0',
            description: 'An example format renderer demonstrating the format plugin API',
            defaultConfig: {
                compact: false,
                showMetadata: true
            }
        });
    }
    
    async onInit() {
        // Custom initialization logic
        // console.log('ExampleFormatRenderer initialized');
    }
    
    renderPage(container, page, context) {
        // Render page in this format
        const formatDiv = DOMUtils.createElement('div', {
            class: 'format-example format-page'
        });
        
        const title = DOMUtils.createElement('h2', {}, `Page: ${page.id}`);
        formatDiv.appendChild(title);
        
        if (this.config.showMetadata) {
            const metadata = DOMUtils.createElement('p', {}, 
                `Format: ${this.formatName}, Bins: ${page.bins?.length || 0}`
            );
            formatDiv.appendChild(metadata);
        }
        
        if (page.bins) {
            page.bins.forEach(bin => {
                const binDiv = DOMUtils.createElement('div', {
                    class: 'format-bin'
                });
                binDiv.textContent = `Bin: ${bin.title || bin.id}`;
                formatDiv.appendChild(binDiv);
            });
        }
        
        container.appendChild(formatDiv);
        return formatDiv;
    }
    
    renderBin(container, bin, context) {
        // Render bin in this format
        const formatDiv = DOMUtils.createElement('div', {
            class: 'format-example format-bin'
        });
        
        const title = DOMUtils.createElement('h3', {}, `Bin: ${bin.title || bin.id}`);
        formatDiv.appendChild(title);
        
        if (this.config.showMetadata && bin.elements) {
            const metadata = DOMUtils.createElement('p', {}, 
                `Elements: ${bin.elements.length}`
            );
            formatDiv.appendChild(metadata);
        }
        
        if (bin.elements && !this.config.compact) {
            const elementsList = DOMUtils.createElement('ul', {
                class: 'format-elements'
            });
            
            bin.elements.forEach(element => {
                const li = DOMUtils.createElement('li', {}, element.text || 'Untitled');
                elementsList.appendChild(li);
            });
            
            formatDiv.appendChild(elementsList);
        }
        
        container.appendChild(formatDiv);
        return formatDiv;
    }
    
    renderSettingsUI(container, currentSettings) {
        // Render format settings UI
        const settingsDiv = DOMUtils.createElement('div', {
            class: 'format-settings'
        });
        
        const compactLabel = DOMUtils.createElement('label', {}, 'Compact Mode');
        const compactCheckbox = DOMUtils.createElement('input', {
            type: 'checkbox',
            checked: currentSettings?.compact || false
        });
        compactCheckbox.addEventListener('change', (e) => {
            this.applySettings({ ...currentSettings, compact: e.target.checked });
        });
        compactLabel.insertBefore(compactCheckbox, compactLabel.firstChild);
        settingsDiv.appendChild(compactLabel);
        
        const metadataLabel = DOMUtils.createElement('label', {}, 'Show Metadata');
        const metadataCheckbox = DOMUtils.createElement('input', {
            type: 'checkbox',
            checked: currentSettings?.showMetadata !== false
        });
        metadataCheckbox.addEventListener('change', (e) => {
            this.applySettings({ ...currentSettings, showMetadata: e.target.checked });
        });
        metadataLabel.insertBefore(metadataCheckbox, metadataLabel.firstChild);
        settingsDiv.appendChild(metadataLabel);
        
        container.appendChild(settingsDiv);
        return settingsDiv;
    }
    
    getDefaultSettings() {
        return {
            compact: false,
            showMetadata: true
        };
    }
}


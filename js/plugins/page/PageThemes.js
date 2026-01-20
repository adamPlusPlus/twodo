// PageThemes.js - Page plugin for custom themes
import { BasePlugin } from '../../core/BasePlugin.js';
import { DOMUtils } from '../../utils/dom.js';
import { StringUtils } from '../../utils/string.js';

export default class PageThemes extends BasePlugin {
    constructor(app = null, config = {}) {
        super({
            id: 'page-themes',
            name: 'Page Themes',
            description: 'Apply custom color schemes and themes to documents.',
            type: 'page',
            defaultConfig: {
                enabled: true,
                theme: 'default',
                customColors: {
                    background: '#1e1e1e',
                    text: '#e0e0e0',
                    accent: '#4a9eff'
                }
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

        const themeConfig = pageData.pluginConfigs[this.id] || this.config;
        const customColors = themeConfig.customColors || this.config.customColors;

        // Apply custom colors
        if (pageElement) {
            pageElement.style.background = customColors.background;
            pageElement.style.color = customColors.text;
        }
    }

    renderConfigUI(container, pageData) {
        const themeConfig = pageData.pluginConfigs?.[this.id] || this.config;
        const customColors = themeConfig.customColors || this.config.customColors;

        let html = `
            <div style="margin-top: 15px; padding: 10px; background: #1a1a1a; border-radius: 4px;">
                <label style="font-weight: 600;">Theme Colors:</label>
                <div style="margin-top: 10px;">
                    <label style="display: block; margin-bottom: 5px; font-size: 12px;">Background:</label>
                    <input type="color" id="theme-bg-color" value="${customColors.background}" style="width: 100%; height: 40px; border: none; padding: 0;" />
                </div>
                <div style="margin-top: 10px;">
                    <label style="display: block; margin-bottom: 5px; font-size: 12px;">Text:</label>
                    <input type="color" id="theme-text-color" value="${customColors.text}" style="width: 100%; height: 40px; border: none; padding: 0;" />
                </div>
                <div style="margin-top: 10px;">
                    <label style="display: block; margin-bottom: 5px; font-size: 12px;">Accent:</label>
                    <input type="color" id="theme-accent-color" value="${customColors.accent}" style="width: 100%; height: 40px; border: none; padding: 0;" />
                </div>
            </div>
        `;
        container.innerHTML = html;

        // Update colors on change
        ['bg', 'text', 'accent'].forEach(type => {
            const input = container.querySelector(`#theme-${type}-color`);
            if (input) {
                input.addEventListener('change', (e) => {
                    if (!pageData.pluginConfigs) pageData.pluginConfigs = {};
                    if (!pageData.pluginConfigs[this.id]) pageData.pluginConfigs[this.id] = {};
                    if (!pageData.pluginConfigs[this.id].customColors) {
                        pageData.pluginConfigs[this.id].customColors = { ...customColors };
                    }
                    
                    const colorKey = type === 'bg' ? 'background' : type;
                    pageData.pluginConfigs[this.id].customColors[colorKey] = e.target.value;
                    
                    this.updateConfig({ customColors: pageData.pluginConfigs[this.id].customColors }, true);
                    this.app.dataManager.saveData();
                    this.app.render();
                });
            }
        });
    }
}


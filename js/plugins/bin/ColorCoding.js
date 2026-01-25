// ColorCoding.js - Bin plugin for color coding items
import { BasePlugin } from '../../core/BasePlugin.js';
import { DOMUtils } from '../../utils/dom.js';
import { StringUtils } from '../../utils/string.js';
import { ItemHierarchy } from '../../utils/ItemHierarchy.js';

export default class ColorCoding extends BasePlugin {
    constructor(app = null, config = {}) {
        super({
            id: 'color-coding',
            name: 'Color Coding',
            description: 'Apply color coding to group items based on tags or properties.',
            type: 'bin',
            defaultConfig: {
                enabled: true,
                colorRules: [] // Array of { condition, color }
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
        // Clean up mutation observer
        if (this._mutationObserver) {
            this._mutationObserver.disconnect();
            this._mutationObserver = null;
        }
    }

    handleBinRender({ binElement, pageId, binData }) {
        if (!binData.pluginConfigs?.[this.id]?.enabled) {
            return;
        }

        const colorRules = binData.pluginConfigs[this.id]?.colorRules || this.config.colorRules || [];
        
        // Apply color coding to items
        const items = binData.items || [];
        binData.items = items;
        
        const elementsList = binElement.querySelector('.elements-list');
        const virtualScroller = elementsList?._virtualScroller;

        if (virtualScroller) {
            // Virtualized: Process visible elements only
            const range = virtualScroller.getVisibleRange();
            const rootItems = ItemHierarchy.getRootItems(items);
            
            for (let i = range.startIndex; i < range.endIndex && i < rootItems.length; i++) {
                const elementNode = elementsList.querySelector(`[data-element-index="${i}"]`);
                if (elementNode) {
                    const element = rootItems[i];
                    if (element) {
                        this._applyColorCoding(elementNode, element, colorRules);
                    }
                }
            }
            
            // Set up MutationObserver to process new elements as they appear
            this._setupVirtualizationObserver(elementsList, items, (elementNode, element) => {
                this._applyColorCoding(elementNode, element, colorRules);
            });
        } else {
            // Non-virtualized: Process all elements
            binElement.querySelectorAll('.element').forEach((elementNode, index) => {
                const element = items[index];
                if (element) {
                    this._applyColorCoding(elementNode, element, colorRules);
                }
            });
        }
    }

    /**
     * Apply color coding to an element based on rules
     * @param {HTMLElement} elementNode - The element DOM node
     * @param {Object} element - Element data
     * @param {Array} colorRules - Array of color rules
     */
    _applyColorCoding(elementNode, element, colorRules) {
        if (!element) return;

        // Find matching color rule
        let color = null;
        for (const rule of colorRules) {
            if (this.matchesRule(element, rule.condition)) {
                color = rule.color;
                break;
            }
        }

        if (color) {
            elementNode.style.borderLeft = `4px solid ${color}`;
        } else {
            // Remove color if no rule matches
            elementNode.style.borderLeft = '';
        }
    }

    /**
     * Set up MutationObserver to process new elements as they appear in virtualized lists
     * @param {HTMLElement} elementsList - The elements-list container
     * @param {Array} items - Full items array
     * @param {Function} processCallback - Callback to process each new element: (elementNode, element) => void
     */
    _setupVirtualizationObserver(elementsList, items, processCallback) {
        // Clean up existing observer if any
        if (this._mutationObserver) {
            this._mutationObserver.disconnect();
        }
        
        const rootItems = ItemHierarchy.getRootItems(items);
        
        // Create observer to watch for new elements
        this._mutationObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE && 
                        node.classList.contains('element') &&
                        node.dataset.elementIndex !== undefined) {
                        
                        const elementIndex = parseInt(node.dataset.elementIndex);
                        
                        // Find corresponding element data (elementIndex is root item index in virtualized lists)
                        const element = rootItems[elementIndex];
                        
                        if (element) {
                            processCallback(node, element);
                        }
                    }
                });
            });
        });
        
        // Observe the elements-list container
        this._mutationObserver.observe(elementsList, {
            childList: true,
            subtree: true
        });
    }

    matchesRule(element, condition) {
        if (!condition) return false;

        // Simple condition matching
        if (condition.type === 'tag') {
            return element.tags && element.tags.includes(condition.value);
        }
        if (condition.type === 'completed') {
            return element.completed === condition.value;
        }
        if (condition.type === 'hasDeadline') {
            return !!element.deadline;
        }
        if (condition.type === 'type') {
            return element.type === condition.value;
        }

        return false;
    }

    renderConfigUI(container, binData) {
        const colorRules = binData.pluginConfigs?.[this.id]?.colorRules || [];

        let html = `
            <div style="margin-top: 15px; padding: 10px; background: #1a1a1a; border-radius: 4px;">
                <label style="font-weight: 600;">Color Rules:</label>
                <div id="color-rules-list" style="margin-top: 10px;">
                    ${colorRules.map((rule, index) => `
                        <div style="display: flex; gap: 5px; margin-bottom: 5px; align-items: center;">
                            <select class="color-rule-type" data-index="${index}" style="flex: 1; padding: 6px; background: #2a2a2a; color: #e0e0e0; border: 1px solid #555; border-radius: 4px;">
                                <option value="tag" ${rule.condition?.type === 'tag' ? 'selected' : ''}>Tag</option>
                                <option value="completed" ${rule.condition?.type === 'completed' ? 'selected' : ''}>Completed</option>
                                <option value="hasDeadline" ${rule.condition?.type === 'hasDeadline' ? 'selected' : ''}>Has Deadline</option>
                                <option value="type" ${rule.condition?.type === 'type' ? 'selected' : ''}>Type</option>
                            </select>
                            <input type="text" class="color-rule-value" data-index="${index}" value="${StringUtils.escapeHtml(rule.condition?.value || '')}" placeholder="Value" style="flex: 1; padding: 6px; background: #2a2a2a; color: #e0e0e0; border: 1px solid #555; border-radius: 4px;" />
                            <input type="color" class="color-rule-color" data-index="${index}" value="${rule.color || '#4a9eff'}" style="width: 50px; height: 30px; border: none; padding: 0;" />
                            <button type="button" class="remove-color-rule-btn" data-index="${index}" style="padding: 2px 8px; background: #e74c3c; color: white; border: none; border-radius: 4px; cursor: pointer;">×</button>
                        </div>
                    `).join('')}
                </div>
                <button type="button" id="add-color-rule-btn" style="padding: 5px 10px; background: #4a9eff; color: white; border: none; border-radius: 4px; cursor: pointer; margin-top: 5px;">+ Add Rule</button>
            </div>
        `;
        container.innerHTML = html;

        // Event listeners
        const addBtn = container.querySelector('#add-color-rule-btn');
        if (addBtn) {
            addBtn.addEventListener('click', () => {
                if (!binData.pluginConfigs) binData.pluginConfigs = {};
                if (!binData.pluginConfigs[this.id]) binData.pluginConfigs[this.id] = {};
                if (!binData.pluginConfigs[this.id].colorRules) binData.pluginConfigs[this.id].colorRules = [];
                
                binData.pluginConfigs[this.id].colorRules.push({
                    condition: { type: 'tag', value: '' },
                    color: '#4a9eff'
                });
                
                this.updateConfig({ colorRules: binData.pluginConfigs[this.id].colorRules }, true);
                this.app.render();
            });
        }

        container.querySelectorAll('.remove-color-rule-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                binData.pluginConfigs[this.id].colorRules.splice(index, 1);
                this.updateConfig({ colorRules: binData.pluginConfigs[this.id].colorRules }, true);
                this.app.render();
            });
        });

        // Update rules on change
        container.querySelectorAll('.color-rule-type, .color-rule-value, .color-rule-color').forEach(input => {
            input.addEventListener('change', () => {
                const index = parseInt(input.dataset.index);
                const type = container.querySelector(`.color-rule-type[data-index="${index}"]`).value;
                const value = container.querySelector(`.color-rule-value[data-index="${index}"]`).value;
                const color = container.querySelector(`.color-rule-color[data-index="${index}"]`).value;
                
                binData.pluginConfigs[this.id].colorRules[index] = {
                    condition: { type, value },
                    color
                };
                
                this.updateConfig({ colorRules: binData.pluginConfigs[this.id].colorRules }, true);
                this.app.render();
            });
        });
    }
}


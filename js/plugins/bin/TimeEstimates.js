// TimeEstimates.js - Bin plugin for time estimates
import { BasePlugin } from '../../core/BasePlugin.js';
import { DOMUtils } from '../../utils/dom.js';
import { StringUtils } from '../../utils/string.js';
import { ItemHierarchy } from '../../utils/ItemHierarchy.js';

export default class TimeEstimates extends BasePlugin {
    constructor(app = null, config = {}) {
        super({
            id: 'time-estimates',
            name: 'Time Estimates',
            description: 'Track and display time estimates for group items.',
            type: 'bin',
            defaultConfig: {
                enabled: true
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

        const items = binData.items || [];
        binData.items = items;
        const totalTime = this.calculateTotalTime(items);

        // Add time summary to bin header
        const binHeader = binElement.querySelector('.bin-header');
        if (binHeader) {
            const existingTime = binHeader.querySelector('.bin-time-estimates');
            if (existingTime) existingTime.remove();

            const timeDiv = DOMUtils.createElement('div', {
                className: 'bin-time-estimates',
                style: 'margin-left: 10px; font-size: 11px; color: #888;'
            });

            timeDiv.textContent = `Total: ${totalTime}`;
            binHeader.appendChild(timeDiv);
        }

        // Add time display to each item
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
                    if (element && element.timeAllocated) {
                        this._addTimeEstimate(elementNode, element.timeAllocated);
                    }
                }
            }
            
            // Set up MutationObserver to process new elements as they appear
            this._setupVirtualizationObserver(elementsList, items, (elementNode, element) => {
                if (element && element.timeAllocated) {
                    this._addTimeEstimate(elementNode, element.timeAllocated);
                }
            });
        } else {
            // Non-virtualized: Process all elements
            binElement.querySelectorAll('.element').forEach((elementNode, index) => {
                const element = items[index];
                if (element && element.timeAllocated) {
                    this._addTimeEstimate(elementNode, element.timeAllocated);
                }
            });
        }
    }

    /**
     * Add time estimate display to an element
     * @param {HTMLElement} elementNode - The element DOM node
     * @param {string} timeAllocated - Time allocated string
     */
    _addTimeEstimate(elementNode, timeAllocated) {
        const existingTime = elementNode.querySelector('.element-time-estimate');
        if (existingTime) existingTime.remove();

        const timeSpan = DOMUtils.createElement('span', {
            className: 'element-time-estimate',
            style: 'font-size: 10px; color: #888; margin-left: 5px;'
        }, `(${timeAllocated})`);

        const textElement = elementNode.querySelector('.task-text, .element-text');
        if (textElement) {
            textElement.appendChild(timeSpan);
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

    calculateTotalTime(elements) {
        let totalMinutes = 0;

        elements.forEach(element => {
            if (element.timeAllocated) {
                const timeStr = element.timeAllocated.toLowerCase();
                // Parse formats like "30 min", "1h", "2 hours", "30 min+"
                const minutesMatch = timeStr.match(/(\d+)\s*min/);
                const hoursMatch = timeStr.match(/(\d+)\s*h/);
                
                if (minutesMatch) {
                    totalMinutes += parseInt(minutesMatch[1]);
                }
                if (hoursMatch) {
                    totalMinutes += parseInt(hoursMatch[1]) * 60;
                }
            }
        });

        if (totalMinutes === 0) return '0 min';
        if (totalMinutes < 60) return `${totalMinutes} min`;
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        return minutes > 0 ? `${hours}h ${minutes}min` : `${hours}h`;
    }
}


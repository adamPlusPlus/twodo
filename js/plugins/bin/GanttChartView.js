// GanttChartView.js - Bin plugin for Gantt chart view
import { BasePlugin } from '../../core/BasePlugin.js';
import { DOMUtils } from '../../utils/dom.js';
import { StringUtils } from '../../utils/string.js';

export default class GanttChartView extends BasePlugin {
    constructor(app = null, config = {}) {
        super({
            id: 'gantt-chart-view',
            name: 'Gantt Chart View',
            description: 'Display group items as a Gantt chart with timeline and dependencies.',
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
    }

    handleBinRender({ binElement, pageId, binData }) {
        if (!binData.pluginConfigs?.[this.id]?.enabled) {
            return;
        }

        // Replace bin content with Gantt chart
        binElement.innerHTML = '';
        binElement.classList.add('gantt-chart-container');
        
        const ganttDiv = DOMUtils.createElement('div', {
            className: 'gantt-chart',
            style: 'width: 100%; height: 400px; overflow-x: auto; background: #1a1a1a; padding: 10px; border-radius: 4px;'
        });

        // Calculate timeline
        const items = binData.items || [];
        binData.items = items;
        const timeline = this.calculateTimeline(items);
        
        // Render Gantt chart
        this.renderGanttChart(ganttDiv, items, timeline, pageId, binData.id);
        
        binElement.appendChild(ganttDiv);
    }

    calculateTimeline(elements) {
        const dates = [];
        
        elements.forEach(element => {
            if (element.deadline) {
                dates.push(new Date(element.deadline));
            }
            if (element.startDate) {
                dates.push(new Date(element.startDate));
            }
        });
        
        if (dates.length === 0) {
            // Default to current month
            const today = new Date();
            return {
                start: new Date(today.getFullYear(), today.getMonth(), 1),
                end: new Date(today.getFullYear(), today.getMonth() + 1, 0)
            };
        }
        
        const minDate = new Date(Math.min(...dates));
        const maxDate = new Date(Math.max(...dates));
        
        // Add padding
        minDate.setDate(minDate.getDate() - 7);
        maxDate.setDate(maxDate.getDate() + 7);
        
        return { start: minDate, end: maxDate };
    }

    renderGanttChart(container, elements, timeline, pageId, binId) {
        const days = this.getDaysBetween(timeline.start, timeline.end);
        const dayWidth = 30; // pixels per day
        const rowHeight = 40;
        
        // Create Gantt structure
        const ganttTable = DOMUtils.createElement('table', {
            style: 'width: 100%; border-collapse: collapse;'
        });
        
        // Header row with dates
        const headerRow = DOMUtils.createElement('tr');
        const nameHeader = DOMUtils.createElement('th', {
            style: 'position: sticky; left: 0; background: #2a2a2a; padding: 8px; text-align: left; border: 1px solid #444; min-width: 200px; z-index: 10;'
        }, 'Task');
        headerRow.appendChild(nameHeader);
        
        days.forEach(day => {
            const dayHeader = DOMUtils.createElement('th', {
                style: 'padding: 8px; text-align: center; border: 1px solid #444; min-width: ' + dayWidth + 'px; font-size: 10px; background: #2a2a2a;'
            }, day.getDate());
            headerRow.appendChild(dayHeader);
        });
        
        ganttTable.appendChild(headerRow);
        
        // Task rows
        elements.forEach((element, index) => {
            const row = DOMUtils.createElement('tr', {
                style: 'height: ' + rowHeight + 'px;'
            });
            
            // Task name cell
            const nameCell = DOMUtils.createElement('td', {
                style: 'position: sticky; left: 0; background: #2a2a2a; padding: 8px; border: 1px solid #444; z-index: 5;'
            }, StringUtils.escapeHtml(element.text || 'Untitled'));
            row.appendChild(nameCell);
            
            // Timeline cells
            const startDate = element.startDate ? new Date(element.startDate) : null;
            const endDate = element.deadline ? new Date(element.deadline) : null;
            
            days.forEach((day, dayIndex) => {
                const dayCell = DOMUtils.createElement('td', {
                    style: 'padding: 0; border: 1px solid #333; position: relative;'
                });
                
                // Check if this day is within the task's date range
                if (startDate && endDate && day >= startDate && day <= endDate) {
                    const bar = DOMUtils.createElement('div', {
                        style: `
                            position: absolute; top: 0; left: 0; right: 0; bottom: 0;
                            background: ${element.completed ? '#27ae60' : '#4a9eff'};
                            opacity: 0.7;
                            display: flex; align-items: center; justify-content: center;
                            font-size: 9px; color: white;
                        `
                    });
                    
                    if (dayIndex === 0 || day.getDate() === startDate.getDate()) {
                        bar.textContent = element.completed ? '✓' : '●';
                    }
                    
                    dayCell.appendChild(bar);
                } else if (day.getDate() === new Date().getDate() && 
                          day.getMonth() === new Date().getMonth() &&
                          day.getFullYear() === new Date().getFullYear()) {
                    // Today indicator
                    dayCell.style.borderLeft = '2px solid #f39c12';
                }
                
                row.appendChild(dayCell);
            });
            
            ganttTable.appendChild(row);
        });
        
        container.appendChild(ganttTable);
    }

    getDaysBetween(start, end) {
        const days = [];
        const current = new Date(start);
        
        while (current <= end) {
            days.push(new Date(current));
            current.setDate(current.getDate() + 1);
        }
        
        return days;
    }
}



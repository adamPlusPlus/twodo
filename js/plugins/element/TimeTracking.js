// TimeTracking.js - Element plugin for time tracking
import { BaseElementType } from '../../core/BaseElementType.js';
import { DOMUtils } from '../../utils/dom.js';
import { StringUtils } from '../../utils/string.js';

export default class TimeTracking extends BaseElementType {
    constructor(app = null) {
        super({
            id: 'time-tracking',
            name: 'Time Tracking',
            description: 'Track time spent on items with start/stop timer.',
            elementType: 'task' // Extends existing task elements
        });
        if (app) {
            this.app = app;
        }
    }
    
    render(element, pageId, binId, elementIndex, container) {
        // Inject time tracking UI into existing element
        const elementElement = container.querySelector(`[data-element-index="${elementIndex}"]`);
        if (!elementElement) return;
        
        const isActive = this.app.timeTracker?.isTimerActive(pageId, binId, elementIndex);
        const totalTime = this.app.timeTracker?.getTotalTime(pageId, binId, elementIndex) || 0;
        const activeDuration = isActive ? this.app.timeTracker.getActiveTimerDuration(pageId, binId, elementIndex) : 0;
        
        // Add time tracking controls
        const timeControls = DOMUtils.createElement('div', {
            className: 'time-tracking-controls',
            style: 'display: flex; gap: 5px; align-items: center; margin-top: 5px; font-size: 11px;'
        });
        
        const timeDisplay = DOMUtils.createElement('span', {
            className: 'time-display',
            style: 'color: #888; margin-right: 5px;'
        }, isActive 
            ? `⏱️ ${this.app.timeTracker.formatTime(activeDuration)} (running)`
            : `⏱️ ${this.app.timeTracker.formatTime(totalTime)}`
        );
        
        const startBtn = DOMUtils.createElement('button', {
            className: 'time-start-btn',
            style: 'padding: 3px 8px; background: #27ae60; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 10px;'
        }, 'Start');
        
        const stopBtn = DOMUtils.createElement('button', {
            className: 'time-stop-btn',
            style: 'padding: 3px 8px; background: #e74c3c; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 10px; display: none;'
        }, 'Stop');
        
        if (isActive) {
            startBtn.style.display = 'none';
            stopBtn.style.display = 'inline-block';
        }
        
        startBtn.addEventListener('click', () => {
            this.app.timeTracker.startTimer(pageId, binId, elementIndex);
            this.app.render();
        });
        
        stopBtn.addEventListener('click', () => {
            this.app.timeTracker.stopTimer(pageId, binId, elementIndex);
            this.app.render();
        });
        
        timeControls.appendChild(timeDisplay);
        timeControls.appendChild(startBtn);
        timeControls.appendChild(stopBtn);
        
        elementElement.appendChild(timeControls);
        
        // Update display if timer is active
        if (isActive) {
            const updateInterval = setInterval(() => {
                if (!this.app.timeTracker.isTimerActive(pageId, binId, elementIndex)) {
                    clearInterval(updateInterval);
                    this.app.render();
                } else {
                    const duration = this.app.timeTracker.getActiveTimerDuration(pageId, binId, elementIndex);
                    timeDisplay.textContent = `⏱️ ${this.app.timeTracker.formatTime(duration)} (running)`;
                }
            }, 1000);
        }
    }
}



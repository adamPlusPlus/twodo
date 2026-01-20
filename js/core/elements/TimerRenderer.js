// TimerRenderer.js - Handles timer element rendering
// TimerRenderer.js - Extracted from ElementRenderer.js to improve modularity
import { eventBus } from '../EventBus.js';
import { EVENTS } from '../AppEvents.js';

/**
 * TimerRenderer - Handles rendering of timer elements
 */
export class TimerRenderer {
    constructor(app) {
        this.app = app;
    }
    
    /**
     * Render a timer element
     * @param {HTMLElement} div - The element container div (already created with classes and drag handlers)
     * @param {string} pageId - Page ID
     * @param {string} binId - Bin ID
     * @param {Object} element - Element data
     * @param {number|string} elementIndex - Element index
     * @param {number} depth - Current nesting depth
     * @param {Function} renderChildren - Function to render children elements
     * @returns {void}
     */
    render(div, pageId, binId, element, elementIndex, depth, renderChildren) {
        const getTimerElement = () => {
            const document = this.app.appState.documents?.find(page => page.id === pageId);
            const group = document?.groups?.find(bin => bin.id === binId);
            if (!group) return null;
            const items = group.items || [];
            group.items = items;
            return items[elementIndex];
        };

        // Initialize timer state if needed
        if (element.duration === undefined) element.duration = 3600;
        if (element.elapsed === undefined) element.elapsed = 0;
        if (element.running === undefined) element.running = false;
        if (element.pausedAt === undefined) element.pausedAt = 0;
        if (element.alarmSound === undefined || element.alarmSound === null) element.alarmSound = '/sounds/alarm.mp3';
        if (element.alarmPlaying === undefined) element.alarmPlaying = false;
        if (element.completed === undefined) element.completed = false;

        // Restore running timer state if it was running when saved
        if (element.running && !element.intervalId) {
        element.startTime = Date.now() - (element.elapsed * 1000);
        element.intervalId = setInterval(() => {
        const timerElement = getTimerElement();
        if (!timerElement || !timerElement.running) return;

        timerElement.elapsed = Math.floor((Date.now() - timerElement.startTime) / 1000) + timerElement.pausedAt;
        updateTimerDisplay();

        // Autosave timer state every 5 seconds
        const currentTime = Date.now();
        if (!timerElement.lastSaveTime || currentTime - timerElement.lastSaveTime >= 5000) {
        timerElement.lastSaveTime = currentTime;
        this.app.dataManager.saveData();
        }

        // Check if timer reached duration
        if (timerElement.elapsed >= timerElement.duration) {
        timerElement.elapsed = timerElement.duration;
        timerElement.running = false;
        if (timerElement.intervalId) {
        clearInterval(timerElement.intervalId);
        timerElement.intervalId = null;
        }
        updateTimerDisplay();

        // Play looping alarm sound if set and not already playing and checkbox not checked
        if (timerElement.alarmSound && !timerElement.alarmPlaying && !timerElement.completed) {
        const audio = new Audio(timerElement.alarmSound);
        audio.loop = true;
        audio.play().then(() => {
        timerElement.alarmPlaying = true;
        timerElement.alarmAudio = audio;
        }).catch(err => console.log('Alarm play failed:', err));
        }
        }
        }, 100);
        }

        // Create timer header container (like task elements)
        const timerHeader = document.createElement('div');
        timerHeader.className = 'task-header';
        timerHeader.style.position = 'relative';

        // Create progress bar background
        const progressBar = document.createElement('div');
        progressBar.className = 'timer-progress-bar';
        progressBar.style.position = 'absolute';
        progressBar.style.top = '0';
        progressBar.style.left = '0';
        progressBar.style.width = '0%';
        progressBar.style.height = '100%';
        progressBar.style.backgroundColor = 'rgba(74, 158, 255, 0.3)';
        progressBar.style.transition = 'width 0.1s linear';
        progressBar.style.pointerEvents = 'none';
        progressBar.style.zIndex = '0';
        timerHeader.appendChild(progressBar);

        // Add checkbox
        const timerCheckbox = document.createElement('input');
        timerCheckbox.type = 'checkbox';
        timerCheckbox.checked = element.completed || false;
        // Prevent text click from firing when clicking checkbox
        timerCheckbox.addEventListener('click', (e) => {
        e.stopPropagation();
        });
        timerHeader.appendChild(timerCheckbox);

        // Timer display and controls inline (need to define before checkbox handler)
        const timerDisplay = document.createElement('span');
        timerDisplay.className = 'timer-display';
        timerDisplay.style.fontSize = '14px';
        timerDisplay.style.fontWeight = 'bold';
        timerDisplay.style.marginLeft = '10px';
        timerDisplay.style.whiteSpace = 'nowrap';

        const updateTimerDisplay = () => {
        const remaining = Math.max(0, element.duration - element.elapsed);
        const hours = Math.floor(remaining / 3600);
        const minutes = Math.floor((remaining % 3600) / 60);
        const seconds = remaining % 60;
        timerDisplay.textContent = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    
        // Update progress bar
        const progress = element.duration > 0 ? (element.elapsed / element.duration) * 100 : 0;
        progressBar.style.width = `${Math.min(100, progress)}%`;
        };
        updateTimerDisplay();
        timerHeader.appendChild(timerDisplay);

        // Start/Stop button inline (need to define before checkbox handler)
        const timerStartStopBtn = this.app.styleButton(element.running ? '⏸' : '▶', (e) => {
        e.stopPropagation();
        const timerElement = getTimerElement();
        if (!timerElement) return;
    
        if (timerElement.running) {
        // Pause
        timerElement.running = false;
        timerElement.pausedAt = timerElement.elapsed;
        if (timerElement.intervalId) {
        clearInterval(timerElement.intervalId);
        timerElement.intervalId = null;
        }
        timerStartStopBtn.textContent = '▶';
        } else {
        // Start
        timerElement.running = true;
        timerElement.startTime = Date.now() - (timerElement.elapsed * 1000);
        timerElement.intervalId = setInterval(() => {
        const timerElement = getTimerElement();
        if (!timerElement || !timerElement.running) return;
            
        timerElement.elapsed = Math.floor((Date.now() - timerElement.startTime) / 1000) + timerElement.pausedAt;
        updateTimerDisplay();

        // Autosave timer state every 5 seconds
        const currentTime = Date.now();
        if (!timerElement.lastSaveTime || currentTime - timerElement.lastSaveTime >= 5000) {
        timerElement.lastSaveTime = currentTime;
        this.app.dataManager.saveData();
        }
            
        // Check if timer reached duration
        if (timerElement.elapsed >= timerElement.duration) {
        timerElement.elapsed = timerElement.duration;
        timerElement.running = false;
        if (timerElement.intervalId) {
        clearInterval(timerElement.intervalId);
        timerElement.intervalId = null;
        }
        updateTimerDisplay();
        timerStartStopBtn.textContent = '▶';
                
        // Play looping alarm sound if set and not already playing and checkbox not checked
        if (timerElement.alarmSound && !timerElement.alarmPlaying && !timerElement.completed) {
        const audio = new Audio(timerElement.alarmSound);
        audio.loop = true;
        audio.play().then(() => {
        timerElement.alarmPlaying = true;
        timerElement.alarmAudio = audio;
        }).catch(err => console.log('Alarm play failed:', err));
        }
        }
        }, 100);
        timerStartStopBtn.textContent = '⏸';
        }
        this.app.dataManager.saveData();
        });
        timerStartStopBtn.style.marginLeft = '8px';
        timerHeader.appendChild(timerStartStopBtn);

        // Now set up the checkbox handler (after timerStartStopBtn is defined)
        timerCheckbox.onchange = (e) => {
        e.stopPropagation();
        const timerElement = getTimerElement();
        if (!timerElement) return;
    
        timerElement.completed = timerCheckbox.checked;
    
        if (timerElement.completed) {
        // Checkbox checked - stop alarm if playing
        if (timerElement.alarmPlaying && timerElement.alarmAudio) {
        timerElement.alarmAudio.pause();
        timerElement.alarmAudio.currentTime = 0;
        timerElement.alarmPlaying = false;
        timerElement.alarmAudio = null;
        }
        } else {
        // Checkbox unchecked - reset timer and stop alarm (don't restart)
        timerElement.running = false;
        timerElement.elapsed = 0;
        timerElement.pausedAt = 0;
        timerElement.completed = false;
        if (timerElement.intervalId) {
        clearInterval(timerElement.intervalId);
        timerElement.intervalId = null;
        }
        if (timerElement.alarmPlaying && timerElement.alarmAudio) {
        timerElement.alarmAudio.pause();
        timerElement.alarmAudio.currentTime = 0;
        timerElement.alarmPlaying = false;
        timerElement.alarmAudio = null;
        }
        updateTimerDisplay();
        timerStartStopBtn.textContent = '▶';
        }
        this.app.dataManager.saveData();
        };

        // Reset button inline
        const timerResetBtn = this.app.styleButton('↻', (e) => {
        e.stopPropagation();
        const page = this.app.appState.documents.find(p => p.id === pageId);
        const bin = page?.groups?.find(b => b.id === binId);
        const timerElement = bin?.items?.[elementIndex];
        if (!timerElement) return;
    
        // Stop timer and reset to zero
        timerElement.running = false;
        timerElement.elapsed = 0;
        timerElement.pausedAt = 0;
        timerElement.completed = false;
        if (timerElement.intervalId) {
        clearInterval(timerElement.intervalId);
        timerElement.intervalId = null;
        }
        if (timerElement.alarmPlaying && timerElement.alarmAudio) {
        timerElement.alarmAudio.pause();
        timerElement.alarmAudio.currentTime = 0;
        timerElement.alarmPlaying = false;
        timerElement.alarmAudio = null;
        }
        updateTimerDisplay();
        timerStartStopBtn.textContent = '▶';
        this.app.dataManager.saveData();
        });
        timerResetBtn.style.marginLeft = '4px';
        timerResetBtn.title = 'Reset timer';
        timerHeader.appendChild(timerResetBtn);

        div.appendChild(timerHeader);
    }
}
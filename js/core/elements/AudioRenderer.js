// AudioRenderer.js - Handles audio element rendering
// AudioRenderer.js - Extracted from ElementRenderer.js to improve modularity
import { eventBus } from '../EventBus.js';
import { EVENTS } from '../AppEvents.js';

/**
 * AudioRenderer - Handles rendering of audio elements
 */
export class AudioRenderer {
    constructor(app) {
        this.app = app;
    }
    
    /**
     * Render a audio element
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
        // Handle nested children - elementIndex might be a string like "0-1"
        let audioPageId = pageId;
        let audioElementIndex = elementIndex;
        if (typeof elementIndex === 'string' && elementIndex.includes('-')) {
        // For nested children, use parent elementIndex for audio key
        const parts = elementIndex.split('-');
        audioElementIndex = parseInt(parts[0]);
        } else {
        audioElementIndex = parseInt(elementIndex);
        }
        const audioKey = `${audioPageId}-${binId}-${audioElementIndex}`;
        const hasFile = element.audioFile && element.audioFile !== null;

        // Create audio header container
        const audioHeader = document.createElement('div');
        audioHeader.className = 'task-header';

        // Add checkbox for audio element
        const audioCheckbox = document.createElement('input');
        audioCheckbox.type = 'checkbox';
        audioCheckbox.checked = element.completed || false;
        audioCheckbox.onchange = (e) => {
        e.stopPropagation();
        this.app.toggleElement(pageId, binId, elementIndex);
        };
        // Prevent text click from firing when clicking checkbox
        audioCheckbox.addEventListener('click', (e) => {
        e.stopPropagation();
        });
        audioHeader.appendChild(audioCheckbox);

        // Get recorder for button state
        const recorder = this.app.appState.inlineAudioRecorders[audioKey];
        const isRecording = recorder && recorder.recorder && recorder.recorder.state === 'recording';

        // Audio status inline - reflect current state
        const audioStatus = document.createElement('span');
        audioStatus.className = 'audio-status';
        audioStatus.style.fontSize = '12px';
        audioStatus.style.marginLeft = '10px';
        audioStatus.style.whiteSpace = 'nowrap';

        // Set status text based on current state
        if (isRecording) {
        audioStatus.textContent = '🔴 Recording...';
        audioStatus.style.color = '#ff5555';
        } else if (hasFile) {
        // Show filename and date if available
        const fileInfo = element.audioFile + (element.date ? ` (${element.date})` : '');
        audioStatus.textContent = `📁 ${fileInfo}`;
        audioStatus.style.color = '#888';
        } else {
        audioStatus.textContent = '🎤 Ready to record';
        audioStatus.style.color = '#888';
        }
        audioHeader.appendChild(audioStatus);

        // Record button (always visible, toggles between start/stop/append)
        // Store original elementIndex for DOM updates (may be string like "0-1" for nested children)
        const originalElementIndex = elementIndex;
        const recordBtn = this.app.styleButton(isRecording ? '⏹' : '🔴', async () => {
        if (isRecording) {
        await this.app.stopInlineRecording(audioPageId, binId, audioElementIndex, originalElementIndex);
        } else {
        // If file exists, automatically append; otherwise create new
        if (hasFile) {
        await this.app.appendInlineRecording(audioPageId, binId, audioElementIndex, originalElementIndex);
        } else {
        await this.app.startInlineRecording(audioPageId, binId, audioElementIndex, originalElementIndex);
        }
        }
        eventBus.emit(EVENTS.APP.RENDER_REQUESTED); // Re-render to update button states
        });
        recordBtn.style.marginLeft = '8px';
        // Make icon red, not the button background
        recordBtn.style.color = '#ff5555';
        if (isRecording) {
        recordBtn.title = 'Stop recording';
        } else {
        recordBtn.title = hasFile ? 'Append to existing recording' : 'Start recording';
        }
        audioHeader.appendChild(recordBtn);

        // Play/Stop controls (always visible)
        const player = this.app.appState.inlineAudioPlayers[audioKey];
        const isPlaying = player && player.audio && !player.audio.paused;
        const playStopBtn = this.app.styleButton(isPlaying ? '⏸' : '▶', () => {
        if (isPlaying) {
        this.app.stopInlineAudio(audioPageId, binId, audioElementIndex);
        } else {
        this.app.playInlineAudio(audioPageId, binId, audioElementIndex);
        }
        eventBus.emit(EVENTS.APP.RENDER_REQUESTED); // Re-render to update button state
        });
        playStopBtn.style.marginLeft = '4px';
        if (!hasFile) {
        playStopBtn.disabled = true;
        playStopBtn.style.opacity = '0.5';
        }
        audioHeader.appendChild(playStopBtn);

        div.appendChild(audioHeader);

        // Audio progress bar (shown during playback)
        const progressBarContainer = document.createElement('div');
        progressBarContainer.className = 'audio-progress-container';
        progressBarContainer.id = `audio-progress-${audioKey}`;
        progressBarContainer.style.display = isPlaying ? 'block' : 'none';
        progressBarContainer.style.marginTop = '8px';
        progressBarContainer.style.marginLeft = '10px';
        progressBarContainer.style.marginRight = '10px';

        const audioProgressBarInput = document.createElement('input');
        audioProgressBarInput.type = 'range';
        audioProgressBarInput.min = '0';
        audioProgressBarInput.max = '100';
        audioProgressBarInput.value = '0';
        audioProgressBarInput.step = '0.1';
        audioProgressBarInput.className = 'audio-progress-bar';
        audioProgressBarInput.style.width = '100%';
        audioProgressBarInput.style.height = '4px';
        audioProgressBarInput.style.background = '#404040';
        audioProgressBarInput.style.borderRadius = '2px';
        audioProgressBarInput.style.outline = 'none';
        audioProgressBarInput.style.cursor = 'pointer';
    
        // Style the progress bar thumb
        audioProgressBarInput.style.setProperty('-webkit-appearance', 'none');
        audioProgressBarInput.style.setProperty('appearance', 'none');

        // Webkit thumb styling
        const style = document.createElement('style');
        style.textContent = `
        .audio-progress-bar::-webkit-slider-thumb {
        appearance: none;
        width: 12px;
        height: 12px;
        background: #4a9eff;
        border-radius: 50%;
        cursor: pointer;
        }
        .audio-progress-bar::-moz-range-thumb {
        width: 12px;
        height: 12px;
        background: #4a9eff;
        border-radius: 50%;
        cursor: pointer;
        border: none;
        }
        `;
        if (!document.getElementById('audio-progress-bar-styles')) {
        style.id = 'audio-progress-bar-styles';
        document.head.appendChild(style);
        }

        // Progress bar will be set up when playback starts

        progressBarContainer.appendChild(audioProgressBarInput);
        div.appendChild(progressBarContainer);

        // Render children if they exist
        if (Array.isArray(element.childIds) && element.childIds.length > 0) {
            const childrenContainer = renderChildren(pageId, binId, element, elementIndex, depth);
            if (childrenContainer) {
                div.appendChild(childrenContainer);
            }
        }
    }
}
// AudioHandler.js - Handles audio recording and playback
import { ElementFinder } from '../utils/ElementFinder.js';
import { eventBus } from '../core/EventBus.js';
import { EVENTS } from '../core/AppEvents.js';
import { getService, SERVICES, hasService } from '../core/AppServices.js';
import { AudioFormats } from '../utils/AudioFormats.js';
import { AudioPlayer } from '../utils/AudioPlayer.js';
import { AudioRecorder } from '../utils/AudioRecorder.js';
import { AudioFileIO } from '../utils/AudioFileIO.js';

export class AudioHandler {
    constructor() {
    }
    
    /**
     * Get services
     */
    _getDataManager() {
        return getService(SERVICES.DATA_MANAGER);
    }
    
    _getFileManager() {
        return getService(SERVICES.FILE_MANAGER);
    }
    
    _getAppState() {
        return getService(SERVICES.APP_STATE);
    }

    _getGroup(pageId, binId) {
        const appState = this._getAppState();
        const page = appState.documents?.find(p => p.id === pageId);
        const bin = page?.groups?.find(b => b.id === binId);
        if (!bin) return null;
        const items = bin.items || [];
        bin.items = items;
        return bin;
    }
    
    showAudioRecordingModal() {
        const modal = document.getElementById('audio-recording-modal');
        const startBtn = document.getElementById('audio-start-btn');
        const stopBtn = document.getElementById('audio-stop-btn');
        const statusDiv = document.getElementById('audio-recording-status');
        const timeDiv = document.getElementById('audio-recording-time');
        const previewAudio = document.getElementById('audio-preview');
        const saveControls = document.getElementById('audio-save-controls');
        const filenameInput = document.getElementById('audio-filename');
        
        // Reset UI
        statusDiv.textContent = 'Ready to record';
        statusDiv.style.color = '#e0e0e0';
        startBtn.style.display = 'block';
        stopBtn.style.display = 'none';
        timeDiv.style.display = 'none';
        previewAudio.style.display = 'none';
        saveControls.style.display = 'none';
        filenameInput.value = '';
        const appState = this._getAppState();
        appState.audioChunks = [];
        
        // Close button
        const closeBtn = document.getElementById('audio-recording-close');
        closeBtn.onclick = () => {
            this.stopAudioRecording();
            this.closeAudioRecordingModal();
        };
        
        // Close on outside click
        const existingHandler = modal._clickHandler;
        if (existingHandler) {
            modal.removeEventListener('click', existingHandler);
        }
        modal._clickHandler = (e) => {
            if (e.target.id === 'audio-recording-modal') {
                this.stopAudioRecording();
                this.closeAudioRecordingModal();
            }
        };
        modal.addEventListener('click', modal._clickHandler);
        
        // Start recording button
        startBtn.onclick = () => {
            this.startAudioRecording();
        };
        
        // Stop recording button
        stopBtn.onclick = () => {
            this.stopAudioRecording();
        };
        
        // Save button
        document.getElementById('audio-save-btn').onclick = () => {
            this.saveAudioRecording();
        };
        
        modal.classList.add('active');
    }
    
    async startAudioRecording() {
        try {
            const stream = await AudioRecorder.requestMicrophoneAccess();
            const appState = this._getAppState();
            appState.audioChunks = [];
            
            const recorderData = AudioRecorder.startRecording(stream, {
                onDataAvailable: (event, chunks) => {
                    if (event.size > 0) {
                        appState.audioChunks.push(event);
                    }
                },
                onStop: (audioBlob, audioUrl) => {
                    const previewAudio = document.getElementById('audio-preview');
                    previewAudio.src = audioUrl;
                    previewAudio.style.display = 'block';
                }
            });
            
            appState.mediaRecorder = recorderData.recorder;
            appState.recordingStartTime = recorderData.startTime;
            
            // Update UI
            const startBtn = document.getElementById('audio-start-btn');
            const stopBtn = document.getElementById('audio-stop-btn');
            const statusDiv = document.getElementById('audio-recording-status');
            const timeDiv = document.getElementById('audio-recording-time');
            
            startBtn.style.display = 'none';
            stopBtn.style.display = 'block';
            statusDiv.textContent = 'Recording...';
            statusDiv.style.color = '#ff5555';
            timeDiv.style.display = 'block';
            
            // Start timer
            appState.recordingTimer = AudioRecorder.createRecordingTimer(appState.recordingStartTime, (timeString) => {
                timeDiv.textContent = timeString;
            });
            
        } catch (error) {
            console.error('Error accessing microphone:', error);
            alert('Failed to access microphone. Please ensure microphone permissions are granted.');
        }
    }
    
    stopAudioRecording() {
        const appState = this._getAppState();
        if (appState.mediaRecorder && appState.mediaRecorder.state !== 'inactive') {
            appState.mediaRecorder.stop();
        }
        
        if (appState.recordingTimer) {
            clearInterval(appState.recordingTimer);
            appState.recordingTimer = null;
        }
        
        const startBtn = document.getElementById('audio-start-btn');
        const stopBtn = document.getElementById('audio-stop-btn');
        const statusDiv = document.getElementById('audio-recording-status');
        const saveControls = document.getElementById('audio-save-controls');
        
        startBtn.style.display = 'block';
        stopBtn.style.display = 'none';
        statusDiv.textContent = 'Recording stopped. Preview and save below.';
        statusDiv.style.color = '#4a9eff';
        saveControls.style.display = 'block';
    }
    
    async saveAudioRecording() {
        const appState = this._getAppState();
        if (appState.audioChunks.length === 0) {
            alert('No recording to save.');
            return;
        }
        
        const audioBlob = new Blob(appState.audioChunks, { type: AudioFormats.getAudioMimeType('webm') });
        const filenameInput = document.getElementById('audio-filename');
        let filename = filenameInput.value.trim();
        
        // Generate filename if not provided
        if (!filename) {
            filename = AudioFormats.generateAudioFilename();
        } else {
            filename = AudioFormats.ensureWebMExtension(filename);
        }
        
        const statusDiv = document.getElementById('audio-recording-status');
        statusDiv.textContent = 'Saving...';
        
        try {
            const result = await AudioFileIO.saveAudioFile(audioBlob, filename);
            
            statusDiv.textContent = `Saved as: ${filename}`;
            statusDiv.style.color = '#4a9eff';
            alert(`Audio saved successfully as: ${filename}`);
            
            // Reset after a delay
            setTimeout(() => {
                this.closeAudioRecordingModal();
            }, 2000);
        } catch (error) {
            statusDiv.textContent = 'Failed to save audio: ' + error.message;
            statusDiv.style.color = '#ff5555';
            alert('Failed to save audio: ' + error.message);
        }
    }
    
    closeAudioRecordingModal() {
        this.stopAudioRecording();
        const modal = document.getElementById('audio-recording-modal');
        modal.classList.remove('active');
    }
    
    // Inline audio recording methods with binId support
    async startInlineRecording(pageId, binId, elementIndex, originalElementIndex = null, shouldOverwrite = false) {
        const audioKey = AudioRecorder.generateRecordingKey(pageId, binId, elementIndex);
        const domElementIndex = originalElementIndex !== null ? originalElementIndex : elementIndex;
        try {
            const stream = await AudioRecorder.requestMicrophoneAccess();
            const recorderData = AudioRecorder.startRecording(stream, {
                onError: () => {
                    // Error handling without logging
                }
            });
            
            const appState = this._getAppState();
            if (!appState.inlineAudioRecorders) {
                appState.inlineAudioRecorders = {};
            }
            appState.inlineAudioRecorders[audioKey] = {
                ...recorderData,
                domElementIndex: domElementIndex,
                shouldOverwrite: shouldOverwrite
            };
            
            // Update status using original elementIndex for correct DOM targeting
            this.updateAudioStatus(pageId, binId, domElementIndex, 'Recording...', '#ff5555');
        } catch (error) {
            alert('Failed to access microphone. Please ensure microphone permissions are granted.');
        }
    }
    
    async stopInlineRecording(pageId, binId, elementIndex, originalElementIndex = null) {
        const audioKey = AudioRecorder.generateRecordingKey(pageId, binId, elementIndex);
        const domElementIndex = originalElementIndex !== null ? originalElementIndex : elementIndex;
        const appState = this._getAppState();
        const recorderData = appState.inlineAudioRecorders?.[audioKey];
        
        if (recorderData && recorderData.recorder && recorderData.recorder.state !== 'inactive') {
            const result = await AudioRecorder.stopRecording(recorderData);
            
            // Save the recording - use domElementIndex from recorderData if available
            const saveDomIndex = recorderData.domElementIndex || domElementIndex;
            await this.saveInlineRecording(pageId, binId, elementIndex, result.chunks, saveDomIndex);
            
            // Clean up
            delete appState.inlineAudioRecorders[audioKey];
        }
    }
    
    async saveInlineRecording(pageId, binId, elementIndex, chunks, domElementIndex = null) {
        if (!chunks || chunks.length === 0) {
            alert('No recording to save.');
            return;
        }
        
        const appState = this._getAppState();
        const page = appState.documents.find(p => p.id === pageId);
        if (!page) {
            return;
        }
        
        const bin = page.groups?.find(b => b.id === binId);
        if (!bin) {
            return;
        }
        const items = bin.items || [];
        bin.items = items;
        
        // Find the element by checking if it exists at the given index
        let element = items[elementIndex];
        if (!element) {
            // Try to find an audio element in the bin that might be the moved element
            element = items.find(el => el.type === 'audio');
            if (!element) {
                return;
            }
            // Update elementIndex to the correct index
            elementIndex = items.indexOf(element);
        }

        // element is already declared above in error handling
        const audioKey = `${pageId}-${binId}-${elementIndex}`;
        // Reuse appState from line 312
        const recorderData = appState.inlineAudioRecorders?.[audioKey];
        
        let audioBlob = new Blob(chunks, { type: AudioFormats.getAudioMimeType('webm') });
        let filename = element.audioFile;
        const today = new Date().toISOString().split('T')[0];
        
        // Check if this is an overwrite (from edit modal)
        if (recorderData && recorderData.shouldOverwrite && filename) {
            // Overwrite existing file - keep same filename
        } else if (recorderData && recorderData.isAppend && recorderData.existingBlob) {
            // Appending - combine existing blob with new recording
            audioBlob = AudioRecorder.appendToRecording(recorderData.existingBlob, chunks);
            // Keep existing filename
        } else {
            // New recording - generate new filename
            filename = AudioFormats.generateAudioFilename();
        }
        
        try {
            const result = await AudioFileIO.saveAudioFile(audioBlob, filename);
            
            if (result.success) {
                // Update element with file reference
                element.audioFile = filename;
                element.date = today;
                const dataManager = this._getDataManager();
                if (dataManager) {
                    dataManager.saveData();
                }
                // Use domElementIndex for status update if provided, otherwise use elementIndex
                const statusIndex = domElementIndex !== null ? domElementIndex : elementIndex;
                this.updateAudioStatus(pageId, binId, statusIndex, `File: ${filename} (${today})`, '#4a9eff');
                eventBus.emit(EVENTS.APP.RENDER_REQUESTED); // Re-render to show new controls
            } else {
                throw new Error(result.error || 'Unknown error');
            }
        } catch (error) {
            alert('Failed to save audio: ' + error.message);
            const statusIndex = domElementIndex !== null ? domElementIndex : elementIndex;
            this.updateAudioStatus(pageId, binId, statusIndex, 'Failed to save', '#ff5555');
        }
    }
    
    async appendInlineRecording(pageId, binId, elementIndex, originalElementIndex = null) {
        const domElementIndex = originalElementIndex !== null ? originalElementIndex : elementIndex;
        const audioKey = `${pageId}-${binId}-${elementIndex}`;
        const appState = this._getAppState();
        const page = appState.documents.find(p => p.id === pageId);
        if (!page) {
            return;
        }

        const bin = page.groups?.find(b => b.id === binId);
        if (!bin) {
            return;
        }
        const items = bin.items || [];
        bin.items = items;
        
        // Use parsed elementIndex to access element (it's already parsed when passed from render)
        const element = items[elementIndex];
        if (!element || !element.audioFile) {
            alert('No existing recording to append to.');
            return;
        }
        
        const existingFile = element.audioFile;
        
        // Fetch existing audio file
        try {
            const existingBlob = await AudioFileIO.loadAudioFile(existingFile);
            
            // Start new recording (will automatically append)
            await this.startInlineRecording(pageId, binId, elementIndex, domElementIndex, false);
            
            // Mark as append mode and store existing blob
            const appState = this._getAppState();
            if (appState.inlineAudioRecorders?.[audioKey]) {
                appState.inlineAudioRecorders[audioKey].isAppend = true;
                appState.inlineAudioRecorders[audioKey].existingBlob = existingBlob;
            }
        } catch (error) {
            alert('Failed to load existing recording for appending.');
        }
    }
    
    async playInlineAudio(pageId, binId, elementIndex) {
        const audioKey = `${pageId}-${binId}-${elementIndex}`;
        const appState = this._getAppState();
        const page = appState.documents.find(p => p.id === pageId);
        
        if (!page) {
            return;
        }

        const bin = page.groups?.find(b => b.id === binId);
        const items = bin?.items || [];
        if (bin) {
            bin.items = items;
        }
        if (!bin || !items[elementIndex] || !items[elementIndex].audioFile) {
            alert('No recording to play.');
            return;
        }
        
        const element = items[elementIndex];
        const filename = element.audioFile;

        try {
            // Create player if it doesn't exist
            const appState = this._getAppState();
            if (!appState.inlineAudioPlayers) {
                appState.inlineAudioPlayers = {};
            }
            if (!appState.inlineAudioPlayers[audioKey]) {
                const player = await AudioPlayer.createPlayer(audioKey, filename, appState.inlineAudioPlayers);
            }

            const player = appState.inlineAudioPlayers?.[audioKey];

            if (player.isPlaying) {
                // Pause
                AudioPlayer.pause(player);
                this.updateAudioStatus(pageId, binId, elementIndex, `File: ${filename}`, '#888');
                this.hideAudioProgressBar(pageId, binId, elementIndex);
            } else {
                // Play
                await AudioPlayer.play(player);
                this.updateAudioStatus(pageId, binId, elementIndex, 'Playing...', '#4a9eff');
                this.showAudioProgressBar(pageId, binId, elementIndex);

                // Set up progress bar updates
                AudioPlayer.setupProgress(player, audioKey, {
                    onEnded: () => {
                        this.updateAudioStatus(pageId, binId, elementIndex, `File: ${filename}`, '#888');
                        this.hideAudioProgressBar(pageId, binId, elementIndex);
                    },
                    onError: () => {
                        alert('Error playing audio file.');
                        this.hideAudioProgressBar(pageId, binId, elementIndex);
                    }
                });
            }
        } catch (error) {
            alert('Failed to play audio: ' + error.message);
        }
    }
    
    stopInlineAudio(pageId, binId, elementIndex) {
        const audioKey = `${pageId}-${binId}-${elementIndex}`;
        const appState = this._getAppState();
        const player = appState.inlineAudioPlayers?.[audioKey];
        const page = appState.documents.find(p => p.id === pageId);

        if (!page) {
            console.error('Page not found:', pageId);
            return;
        }

        const bin = page.groups?.find(b => b.id === binId);
        const items = bin?.items || [];
        if (bin) {
            bin.items = items;
        }
        if (!bin || !items[elementIndex]) {
            console.error('Element not found:', elementIndex);
            return;
        }

        const element = items[elementIndex];
        
        if (player && player.audio) {
            AudioPlayer.stop(player);
            this.updateAudioStatus(pageId, binId, elementIndex, `File: ${element.audioFile}`, '#888');
            this.hideAudioProgressBar(pageId, binId, elementIndex);
        }
    }
    
    showAudioProgressBar(pageId, binId, elementIndex) {
        const audioKey = `${pageId}-${binId}-${elementIndex}`;
        const progressContainer = document.getElementById(`audio-progress-${audioKey}`);
        if (progressContainer) {
            progressContainer.style.display = 'block';
        }
    }
    
    hideAudioProgressBar(pageId, binId, elementIndex) {
        const audioKey = `${pageId}-${binId}-${elementIndex}`;
        const progressContainer = document.getElementById(`audio-progress-${audioKey}`);
        if (progressContainer) {
            progressContainer.style.display = 'none';
            const audioProgressBarInput = progressContainer.querySelector('input[type="range"]');
            if (audioProgressBarInput) {
                audioProgressBarInput.value = '0';
            }
        }
    }
    
    updateAudioStatus(pageId, binId, elementIndex, text, color) {
        // Find audio element using ElementFinder - handle both regular and nested children
        let element = null;
        if (typeof elementIndex === 'string' && elementIndex.includes('-')) {
            const parts = elementIndex.split('-');
            element = ElementFinder.findElement(pageId, binId, parseInt(parts[0]), document, parseInt(parts[1]));
        } else {
            element = ElementFinder.findElement(pageId, binId, elementIndex);
        }
        if (element) {
            const statusDiv = element.querySelector('.audio-status');
            if (statusDiv) {
                statusDiv.textContent = text;
                statusDiv.style.color = color;
            }
        }
    }
    
    toggleArchiveView(pageId, binId, elementIndex) {
        const audioKey = `${pageId}-${binId}-${elementIndex}`;
        const archiveView = document.getElementById(`archive-view-${audioKey}`);
        if (!archiveView) return;
        
        if (archiveView.style.display === 'none') {
            // Show archive
            const dataManager = this._getDataManager();
            const archived = dataManager ? dataManager.getArchivedRecordings(pageId, elementIndex) : [];
            if (archived.length === 0) {
                archiveView.innerHTML = '<div style="padding: 10px; color: #888;">No archived recordings</div>';
            } else {
                let html = '<div style="padding: 10px; border-top: 1px solid #404040; margin-top: 10px;"><strong>Archived Recordings:</strong><ul style="margin-top: 10px; padding-left: 20px;">';
                archived.forEach(entry => {
                    html += `<li style="margin: 5px 0;"><button onclick="app.dataManager.playArchivedAudio('${entry.filename}')" style="background: #4a9eff; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; margin-right: 8px;">Play</button>${entry.date} - ${entry.filename}</li>`;
                });
                html += '</ul></div>';
                archiveView.innerHTML = html;
            }
            archiveView.style.display = 'block';
        } else {
            archiveView.style.display = 'none';
        }
    }
}


// AudioHandler.js - Handles audio recording and playback
export class AudioHandler {
    constructor(app) {
        this.app = app;
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
        this.app.appState.audioChunks = [];
        
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
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            this.app.appState.mediaRecorder = new MediaRecorder(stream);
            this.app.appState.audioChunks = [];
            
            this.app.appState.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.app.appState.audioChunks.push(event.data);
                }
            };
            
            this.app.appState.mediaRecorder.onstop = () => {
                const audioBlob = new Blob(this.app.appState.audioChunks, { type: 'audio/webm' });
                const audioUrl = URL.createObjectURL(audioBlob);
                const previewAudio = document.getElementById('audio-preview');
                previewAudio.src = audioUrl;
                previewAudio.style.display = 'block';
                
                // Stop all tracks
                stream.getTracks().forEach(track => track.stop());
            };
            
            this.app.appState.mediaRecorder.start();
            this.app.appState.recordingStartTime = Date.now();
            
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
            this.app.appState.recordingTimer = setInterval(() => {
                const elapsed = Math.floor((Date.now() - this.app.appState.recordingStartTime) / 1000);
                const minutes = Math.floor(elapsed / 60);
                const seconds = elapsed % 60;
                timeDiv.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
            }, 100);
            
        } catch (error) {
            console.error('Error accessing microphone:', error);
            alert('Failed to access microphone. Please ensure microphone permissions are granted.');
        }
    }
    
    stopAudioRecording() {
        if (this.app.appState.mediaRecorder && this.app.appState.mediaRecorder.state !== 'inactive') {
            this.app.appState.mediaRecorder.stop();
        }
        
        if (this.app.appState.recordingTimer) {
            clearInterval(this.app.appState.recordingTimer);
            this.app.appState.recordingTimer = null;
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
        if (this.app.appState.audioChunks.length === 0) {
            alert('No recording to save.');
            return;
        }
        
        const audioBlob = new Blob(this.app.appState.audioChunks, { type: 'audio/webm' });
        const filenameInput = document.getElementById('audio-filename');
        let filename = filenameInput.value.trim();
        
        // Generate filename if not provided
        if (!filename) {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
            filename = `recording-${timestamp}.webm`;
        } else {
            // Ensure .webm extension
            if (!filename.endsWith('.webm')) {
                filename += '.webm';
            }
        }
        
        const statusDiv = document.getElementById('audio-recording-status');
        statusDiv.textContent = 'Saving...';
        
        try {
            const formData = new FormData();
            formData.append('audio', audioBlob, filename);
            
            const url = window.location.origin + '/save-audio';
            const response = await fetch(url, {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.success) {
                statusDiv.textContent = `Saved as: ${filename}`;
                statusDiv.style.color = '#4a9eff';
                alert(`Audio saved successfully as: ${filename}`);
                
                // Reset after a delay
                setTimeout(() => {
                    this.closeAudioRecordingModal();
                }, 2000);
            } else {
                throw new Error(result.error || 'Unknown error');
            }
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
        const audioKey = `${pageId}-${binId}-${elementIndex}`;
        const domElementIndex = originalElementIndex !== null ? originalElementIndex : elementIndex;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            const chunks = [];
            
            recorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    chunks.push(event.data);
                }
            };
            
            recorder.onstop = () => {
                stream.getTracks().forEach(track => track.stop());
            };

            recorder.onerror = (event) => {
                // Error handling without logging
            };
            
            recorder.start();
            const startTime = Date.now();
            
            this.app.appState.inlineAudioRecorders[audioKey] = {
                recorder: recorder,
                chunks: chunks,
                startTime: startTime,
                timer: null,
                stream: stream,
                domElementIndex: domElementIndex,  // Store original for DOM updates
                shouldOverwrite: shouldOverwrite   // Flag for overwrite mode
            };
            
            // Update status using original elementIndex for correct DOM targeting
            this.updateAudioStatus(pageId, binId, domElementIndex, 'Recording...', '#ff5555');
        } catch (error) {
            alert('Failed to access microphone. Please ensure microphone permissions are granted.');
        }
    }
    
    async stopInlineRecording(pageId, binId, elementIndex, originalElementIndex = null) {
        const audioKey = `${pageId}-${binId}-${elementIndex}`;
        const domElementIndex = originalElementIndex !== null ? originalElementIndex : elementIndex;
        const recorderData = this.app.appState.inlineAudioRecorders[audioKey];
        
        if (recorderData && recorderData.recorder && recorderData.recorder.state !== 'inactive') {
            recorderData.recorder.stop();
            
            if (recorderData.timer) {
                clearInterval(recorderData.timer);
            }
            
            // Wait for recorder to stop and process chunks
            await new Promise(resolve => {
                recorderData.recorder.onstop = () => {
                    resolve();
                };
            });
            
            // Save the recording - use domElementIndex from recorderData if available
            const saveDomIndex = recorderData.domElementIndex || domElementIndex;
            await this.saveInlineRecording(pageId, binId, elementIndex, recorderData.chunks, saveDomIndex);
            
            // Clean up
            delete this.app.appState.inlineAudioRecorders[audioKey];
        }
    }
    
    async saveInlineRecording(pageId, binId, elementIndex, chunks, domElementIndex = null) {
        if (!chunks || chunks.length === 0) {
            alert('No recording to save.');
            return;
        }
        
        const page = this.app.appState.pages.find(p => p.id === pageId);
        if (!page) {
            return;
        }
        
        const bin = page.bins?.find(b => b.id === binId);
        if (!bin) {
            return;
        }
        
        // Find the element by checking if it exists at the given index
        let element = bin.elements[elementIndex];
        if (!element) {
            // Try to find an audio element in the bin that might be the moved element
            element = bin.elements.find(el => el.type === 'audio');
            if (!element) {
                return;
            }
            // Update elementIndex to the correct index
            elementIndex = bin.elements.indexOf(element);
        }

        // element is already declared above in error handling
        const audioKey = `${pageId}-${binId}-${elementIndex}`;
        const recorderData = this.app.appState.inlineAudioRecorders[audioKey];
        
        let audioBlob = new Blob(chunks, { type: 'audio/webm' });
        let filename = element.audioFile;
        const today = new Date().toISOString().split('T')[0];
        
        // Check if this is an overwrite (from edit modal)
        if (recorderData && recorderData.shouldOverwrite && filename) {
            // Overwrite existing file - keep same filename
        } else if (recorderData && recorderData.isAppend && recorderData.existingBlob) {
            // Appending - combine existing blob with new recording
            const combinedChunks = [recorderData.existingBlob, audioBlob];
            audioBlob = new Blob(combinedChunks, { type: 'audio/webm' });
            // Keep existing filename
        } else {
            // New recording - generate new filename
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
            filename = `recording-${timestamp}.webm`;
        }
        
        try {
            const formData = new FormData();
            formData.append('audio', audioBlob, filename);
            
            const url = window.location.origin + '/save-audio';
            const response = await fetch(url, {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.success) {
                // Update element with file reference
                element.audioFile = filename;
                element.date = today;
                this.app.dataManager.saveData();
                // Use domElementIndex for status update if provided, otherwise use elementIndex
                const statusIndex = domElementIndex !== null ? domElementIndex : elementIndex;
                this.updateAudioStatus(pageId, binId, statusIndex, `File: ${filename} (${today})`, '#4a9eff');
                this.app.render(); // Re-render to show new controls
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
        const page = this.app.appState.pages.find(p => p.id === pageId);
        if (!page) {
            return;
        }

        const bin = page.bins?.find(b => b.id === binId);
        if (!bin) {
            return;
        }
        
        // Use parsed elementIndex to access element (it's already parsed when passed from render)
        const element = bin.elements[elementIndex];
        if (!element || !element.audioFile) {
            alert('No existing recording to append to.');
            return;
        }
        
        const existingFile = element.audioFile;
        
        // Fetch existing audio file
        try {
            const response = await fetch(`/saved_files/recordings/${existingFile}`);
            if (!response.ok) {
                throw new Error('Failed to load existing recording');
            }
            const existingBlob = await response.blob();
            
            // Start new recording (will automatically append)
            await this.startInlineRecording(pageId, binId, elementIndex, domElementIndex, false);
            
            // Mark as append mode and store existing blob
            if (this.app.appState.inlineAudioRecorders[audioKey]) {
                this.app.appState.inlineAudioRecorders[audioKey].isAppend = true;
                this.app.appState.inlineAudioRecorders[audioKey].existingBlob = existingBlob;
            }
        } catch (error) {
            alert('Failed to load existing recording for appending.');
        }
    }
    
    async playInlineAudio(pageId, binId, elementIndex) {
        const audioKey = `${pageId}-${binId}-${elementIndex}`;
        const page = this.app.appState.pages.find(p => p.id === pageId);
        
        if (!page) {
            return;
        }

        const bin = page.bins?.find(b => b.id === binId);
        if (!bin || !bin.elements[elementIndex] || !bin.elements[elementIndex].audioFile) {
            alert('No recording to play.');
            return;
        }
        
        const element = bin.elements[elementIndex];
        const filename = element.audioFile;

        try {
            // Create player if it doesn't exist
            if (!this.app.appState.inlineAudioPlayers[audioKey]) {
                const response = await fetch(`/saved_files/recordings/${filename}`);
                if (!response.ok) {
                    throw new Error(`Failed to load audio file: ${response.status}`);
                }

                const blob = await response.blob();
                const audioUrl = URL.createObjectURL(blob);
                const audio = new Audio(audioUrl);

                this.app.appState.inlineAudioPlayers[audioKey] = {
                    audio: audio,
                    isPlaying: false,
                    url: audioUrl
                };
            }

            const player = this.app.appState.inlineAudioPlayers[audioKey];

            if (player.isPlaying) {
                // Pause
                player.audio.pause();
                player.isPlaying = false;
                this.updateAudioStatus(pageId, binId, elementIndex, `File: ${filename}`, '#888');
                this.hideAudioProgressBar(pageId, binId, elementIndex);
            } else {
                // Play
                await player.audio.play();
                player.isPlaying = true;
                this.updateAudioStatus(pageId, binId, elementIndex, 'Playing...', '#4a9eff');
                this.showAudioProgressBar(pageId, binId, elementIndex);

                // Set up progress bar updates
                const audioKeyForProgress = `${pageId}-${binId}-${elementIndex}`;
                const audioProgressBar = document.querySelector(`#audio-progress-${audioKeyForProgress} input[type="range"]`);
                if (audioProgressBar) {
                    const updateProgress = () => {
                        if (player.audio && !player.audio.paused) {
                            const percent = (player.audio.currentTime / player.audio.duration) * 100;
                            audioProgressBar.value = percent || 0;
                        }
                    };
                    
                    // Remove old listener if exists
                    if (player.progressUpdateHandler) {
                        player.audio.removeEventListener('timeupdate', player.progressUpdateHandler);
                    }
                    player.progressUpdateHandler = updateProgress;
                    player.audio.addEventListener('timeupdate', updateProgress);
                    
                    // Allow seeking
                    audioProgressBar.oninput = (e) => {
                        if (player.audio) {
                            const seekTime = (e.target.value / 100) * player.audio.duration;
                            player.audio.currentTime = seekTime;
                        }
                    };
                }
            
                player.audio.onended = () => {
                    player.isPlaying = false;
                    this.updateAudioStatus(pageId, binId, elementIndex, `File: ${filename}`, '#888');
                    this.hideAudioProgressBar(pageId, binId, elementIndex);
                };

                player.audio.onerror = (error) => {
                    alert('Error playing audio file.');
                    this.hideAudioProgressBar(pageId, binId, elementIndex);
                };
            }
        } catch (error) {
            alert('Failed to play audio: ' + error.message);
        }
    }
    
    stopInlineAudio(pageId, binId, elementIndex) {
        const audioKey = `${pageId}-${binId}-${elementIndex}`;
        const player = this.app.appState.inlineAudioPlayers[audioKey];
        const page = this.app.appState.pages.find(p => p.id === pageId);

        if (!page) {
            console.error('Page not found:', pageId);
            return;
        }

        const bin = page.bins?.find(b => b.id === binId);
        if (!bin || !bin.elements[elementIndex]) {
            console.error('Element not found:', elementIndex);
            return;
        }

        const element = bin.elements[elementIndex];
        
        if (player && player.audio) {
            player.audio.pause();
            player.audio.currentTime = 0;
            player.isPlaying = false;
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
        // Find audio element - handle both regular and nested children
        let selector = `[data-page-id="${pageId}"][data-bin-id="${binId}"]`;
        if (typeof elementIndex === 'string' && elementIndex.includes('-')) {
            const parts = elementIndex.split('-');
            selector += `[data-element-index="${parts[0]}"][data-child-index="${parts[1]}"]`;
        } else {
            selector += `[data-element-index="${elementIndex}"]`;
        }
        const element = document.querySelector(selector);
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
            const archived = this.app.dataManager.getArchivedRecordings(pageId, elementIndex);
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


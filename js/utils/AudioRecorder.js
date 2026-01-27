// AudioRecorder.js - Audio recording control utilities
// Extracted from AudioHandler.js for reusability and maintainability

/**
 * AudioRecorder - Static class for audio recording operations
 */
export class AudioRecorder {
    /**
     * Generate unique recording key
     * @param {string} pageId - Page ID
     * @param {string} binId - Bin ID
     * @param {number} elementIndex - Element index
     * @returns {string} Recording key
     */
    static generateRecordingKey(pageId, binId, elementIndex) {
        return `${pageId}-${binId}-${elementIndex}`;
    }
    
    /**
     * Create MediaRecorder with event handlers
     * @param {MediaStream} stream - Media stream from getUserMedia
     * @param {Object} callbacks - Callback functions { onDataAvailable, onStop, onError }
     * @returns {MediaRecorder} MediaRecorder instance
     */
    static createMediaRecorder(stream, callbacks = {}) {
        const recorder = new MediaRecorder(stream);
        const chunks = [];
        
        recorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                chunks.push(event.data);
            }
            if (callbacks.onDataAvailable) {
                callbacks.onDataAvailable(event.data, chunks);
            }
        };
        
        recorder.onstop = () => {
            // Stop all tracks
            stream.getTracks().forEach(track => track.stop());
            
            if (callbacks.onStop) {
                const audioBlob = new Blob(chunks, { type: 'audio/webm' });
                const audioUrl = URL.createObjectURL(audioBlob);
                callbacks.onStop(audioBlob, audioUrl, chunks);
            }
        };
        
        if (callbacks.onError) {
            recorder.onerror = (event) => {
                callbacks.onError(event);
            };
        }
        
        return recorder;
    }
    
    /**
     * Start audio recording
     * @param {MediaStream} stream - Media stream from getUserMedia
     * @param {Object} options - Recording options { onDataAvailable, onStop, onError }
     * @returns {Object} Recording data object { recorder, chunks, startTime, stream }
     */
    static startRecording(stream, options = {}) {
        const recorder = AudioRecorder.createMediaRecorder(stream, {
            onDataAvailable: options.onDataAvailable,
            onStop: options.onStop,
            onError: options.onError
        });
        
        const chunks = [];
        const startTime = Date.now();
        
        // Override ondataavailable to track chunks
        const originalOnDataAvailable = recorder.ondataavailable;
        recorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                chunks.push(event.data);
            }
            if (originalOnDataAvailable) {
                originalOnDataAvailable(event);
            }
        };
        
        recorder.start();
        
        return {
            recorder: recorder,
            chunks: chunks,
            startTime: startTime,
            stream: stream,
            timer: null
        };
    }
    
    /**
     * Stop audio recording
     * @param {Object} recorderData - Recording data object from startRecording
     * @returns {Promise<Object>} Promise resolving to { audioBlob, audioUrl, chunks }
     */
    static async stopRecording(recorderData) {
        if (!recorderData || !recorderData.recorder) {
            throw new Error('Invalid recorder data');
        }
        
        if (recorderData.recorder.state === 'inactive') {
            // Already stopped, return existing chunks
            const audioBlob = new Blob(recorderData.chunks, { type: 'audio/webm' });
            const audioUrl = URL.createObjectURL(audioBlob);
            return { audioBlob, audioUrl, chunks: recorderData.chunks };
        }
        
        // Clear timer if exists
        if (recorderData.timer) {
            clearInterval(recorderData.timer);
            recorderData.timer = null;
        }
        
        // Stop recorder
        recorderData.recorder.stop();
        
        // Wait for recorder to stop
        await new Promise(resolve => {
            recorderData.recorder.onstop = () => {
                resolve();
            };
        });
        
        // Create blob from chunks
        const audioBlob = new Blob(recorderData.chunks, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        
        return { audioBlob, audioUrl, chunks: recorderData.chunks };
    }
    
    /**
     * Append new recording to existing blob
     * @param {Blob} existingBlob - Existing audio blob
     * @param {Array<Blob>} newChunks - New recording chunks
     * @returns {Blob} Combined audio blob
     */
    static appendToRecording(existingBlob, newChunks) {
        if (!existingBlob || !newChunks || newChunks.length === 0) {
            throw new Error('Invalid input for append');
        }
        
        const combinedChunks = [existingBlob, ...newChunks];
        return new Blob(combinedChunks, { type: 'audio/webm' });
    }
    
    /**
     * Request microphone access
     * @param {Object} constraints - Media constraints (default: { audio: true })
     * @returns {Promise<MediaStream>} Media stream
     */
    static async requestMicrophoneAccess(constraints = { audio: true }) {
        try {
            return await navigator.mediaDevices.getUserMedia(constraints);
        } catch (error) {
            throw new Error(`Failed to access microphone: ${error.message}`);
        }
    }
    
    /**
     * Create recording timer callback
     * @param {number} startTime - Recording start timestamp
     * @param {Function} onUpdate - Callback function(timeString)
     * @returns {number} Timer interval ID
     */
    static createRecordingTimer(startTime, onUpdate) {
        return setInterval(() => {
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            const minutes = Math.floor(elapsed / 60);
            const seconds = elapsed % 60;
            const timeString = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
            onUpdate(timeString);
        }, 100);
    }
}

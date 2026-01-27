// AudioArchiveManager.js - Audio archive management
// Extracted from DataManager.js for reusability and maintainability

/**
 * AudioArchiveManager - Handles audio recording archiving and playback
 */
export class AudioArchiveManager {
    constructor() {
        this.archiveKey = 'twodo-audio-archive';
    }
    
    /**
     * Archive an audio recording
     * @param {string} pageId - Page ID
     * @param {number} elementIndex - Element index
     * @param {string} audioFile - Audio filename
     * @param {string} date - Date string
     */
    archiveAudioRecording(pageId, elementIndex, audioFile, date) {
        let archive = [];
        const stored = localStorage.getItem(this.archiveKey);
        if (stored) {
            try {
                archive = JSON.parse(stored);
            } catch (e) {
                console.error('Failed to parse archive:', e);
            }
        }
        
        archive.push({
            pageId: pageId,
            elementIndex: elementIndex,
            filename: audioFile,
            date: date,
            archivedDate: new Date().toISOString().split('T')[0]
        });
        
        localStorage.setItem(this.archiveKey, JSON.stringify(archive));
    }
    
    /**
     * Get archived recordings for a specific page and element
     * @param {string} pageId - Page ID
     * @param {number} elementIndex - Element index
     * @returns {Array} Array of archived recording entries
     */
    getArchivedRecordings(pageId, elementIndex) {
        const stored = localStorage.getItem(this.archiveKey);
        if (!stored) return [];
        
        try {
            const archive = JSON.parse(stored);
            return archive.filter(entry => entry.pageId === pageId && entry.elementIndex === elementIndex);
        } catch (e) {
            console.error('Failed to parse archive:', e);
            return [];
        }
    }
    
    /**
     * Play an archived audio file
     * @param {string} filename - Audio filename
     */
    playArchivedAudio(filename) {
        const audio = document.createElement('audio');
        audio.src = `/saved_files/recordings/${filename}`;
        audio.controls = true;
        audio.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 10000; background: #2d2d2d; padding: 20px; border-radius: 8px;';
        document.body.appendChild(audio);
        audio.play();
        
        audio.onended = () => {
            audio.remove();
        };
    }
    
    /**
     * Clear all archived recordings
     */
    clearArchive() {
        localStorage.removeItem(this.archiveKey);
    }
    
    /**
     * Get all archived recordings
     * @returns {Array} All archived recordings
     */
    getAllArchivedRecordings() {
        const stored = localStorage.getItem(this.archiveKey);
        if (!stored) return [];
        
        try {
            return JSON.parse(stored);
        } catch (e) {
            console.error('Failed to parse archive:', e);
            return [];
        }
    }
}

// Export singleton instance
export const audioArchiveManager = new AudioArchiveManager();

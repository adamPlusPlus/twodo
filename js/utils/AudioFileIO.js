// AudioFileIO.js - Audio file I/O operations
// Extracted from AudioHandler.js for reusability and maintainability

/**
 * AudioFileIO - Utility functions for audio file operations
 */
export const AudioFileIO = {
    /**
     * Get URL for audio file
     * @param {string} filename - Audio filename
     * @returns {string} URL path to audio file
     */
    getAudioFileUrl(filename) {
        return `/saved_files/recordings/${filename}`;
    },
    
    /**
     * Create FormData for audio file upload
     * @param {Blob} audioBlob - Audio blob to upload
     * @param {string} filename - Audio filename
     * @returns {FormData} FormData object ready for POST request
     */
    createFormData(audioBlob, filename) {
        const formData = new FormData();
        formData.append('audio', audioBlob, filename);
        return formData;
    },
    
    /**
     * Save audio file to server
     * @param {Blob} audioBlob - Audio blob to save
     * @param {string} filename - Audio filename
     * @returns {Promise<Object>} Server response { success: boolean, filename?: string, error?: string }
     */
    async saveAudioFile(audioBlob, filename) {
        if (!audioBlob || !filename) {
            throw new Error('Audio blob and filename are required');
        }
        
        const formData = AudioFileIO.createFormData(audioBlob, filename);
        const url = window.location.origin + '/save-audio';
        
        const response = await fetch(url, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || 'Unknown error');
        }
        
        return result;
    },
    
    /**
     * Load audio file from server
     * @param {string} filename - Audio filename
     * @returns {Promise<Blob>} Audio blob
     */
    async loadAudioFile(filename) {
        if (!filename) {
            throw new Error('Filename is required');
        }
        
        const url = AudioFileIO.getAudioFileUrl(filename);
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Failed to load audio file: ${response.status}`);
        }
        
        return await response.blob();
    },
    
    /**
     * Check if audio file exists on server
     * @param {string} filename - Audio filename
     * @returns {Promise<boolean>} True if file exists
     */
    async fileExists(filename) {
        try {
            const url = AudioFileIO.getAudioFileUrl(filename);
            const response = await fetch(url, { method: 'HEAD' });
            return response.ok;
        } catch (error) {
            return false;
        }
    }
};

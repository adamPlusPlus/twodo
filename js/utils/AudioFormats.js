// AudioFormats.js - Audio format validation and filename handling utilities
// Extracted from AudioHandler.js for reusability and maintainability

/**
 * AudioFormats - Utility functions for audio format handling
 */
export const AudioFormats = {
    /**
     * Validate audio file format
     * @param {string} filename - Audio filename
     * @returns {boolean} True if valid audio format
     */
    validateAudioFormat(filename) {
        if (!filename || typeof filename !== 'string') {
            return false;
        }
        const validExtensions = ['.webm', '.mp3', '.wav', '.ogg', '.m4a'];
        return validExtensions.some(ext => filename.toLowerCase().endsWith(ext));
    },
    
    /**
     * Ensure filename has .webm extension
     * @param {string} filename - Audio filename
     * @returns {string} Filename with .webm extension
     */
    ensureWebMExtension(filename) {
        if (!filename) {
            return '';
        }
        if (!filename.endsWith('.webm')) {
            return filename + '.webm';
        }
        return filename;
    },
    
    /**
     * Generate timestamped audio filename
     * @param {string} prefix - Filename prefix (default: 'recording')
     * @returns {string} Generated filename with timestamp
     */
    generateAudioFilename(prefix = 'recording') {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        return `${prefix}-${timestamp}.webm`;
    },
    
    /**
     * Get MIME type for audio format
     * @param {string} format - Audio format (default: 'webm')
     * @returns {string} MIME type string
     */
    getAudioMimeType(format = 'webm') {
        const mimeTypes = {
            'webm': 'audio/webm',
            'mp3': 'audio/mpeg',
            'wav': 'audio/wav',
            'ogg': 'audio/ogg',
            'm4a': 'audio/mp4'
        };
        return mimeTypes[format.toLowerCase()] || 'audio/webm';
    },
    
    /**
     * Get file extension from filename
     * @param {string} filename - Audio filename
     * @returns {string} File extension (without dot)
     */
    getFileExtension(filename) {
        if (!filename || typeof filename !== 'string') {
            return '';
        }
        const lastDot = filename.lastIndexOf('.');
        if (lastDot === -1) {
            return '';
        }
        return filename.substring(lastDot + 1).toLowerCase();
    }
};

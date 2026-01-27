// AudioPlayer.js - Audio playback control utilities
// Extracted from AudioHandler.js for reusability and maintainability

/**
 * AudioPlayer - Static class for audio playback operations
 */
export class AudioPlayer {
    /**
     * Load audio file from server
     * @param {string} filename - Audio filename
     * @returns {Promise<Blob>} Audio blob
     */
    static async loadAudioFile(filename) {
        const response = await fetch(`/saved_files/recordings/${filename}`);
        if (!response.ok) {
            throw new Error(`Failed to load audio file: ${response.status}`);
        }
        return await response.blob();
    }
    
    /**
     * Create audio player from blob
     * @param {Blob} blob - Audio blob
     * @returns {Object} Audio player object with audio element and URL
     */
    static createPlayerFromBlob(blob) {
        const audioUrl = URL.createObjectURL(blob);
        const audio = new Audio(audioUrl);
        
        return {
            audio: audio,
            isPlaying: false,
            url: audioUrl
        };
    }
    
    /**
     * Create and cache audio player
     * @param {string} audioKey - Unique key for player cache
     * @param {string} filename - Audio filename
     * @param {Object} playersCache - Cache object to store players
     * @returns {Promise<Object>} Audio player object
     */
    static async createPlayer(audioKey, filename, playersCache) {
        if (playersCache[audioKey]) {
            return playersCache[audioKey];
        }
        
        const blob = await AudioPlayer.loadAudioFile(filename);
        const player = AudioPlayer.createPlayerFromBlob(blob);
        playersCache[audioKey] = player;
        
        return player;
    }
    
    /**
     * Play audio
     * @param {Object} player - Audio player object
     * @returns {Promise<void>}
     */
    static async play(player) {
        if (!player || !player.audio) {
            throw new Error('Invalid player');
        }
        await player.audio.play();
        player.isPlaying = true;
    }
    
    /**
     * Pause audio
     * @param {Object} player - Audio player object
     */
    static pause(player) {
        if (!player || !player.audio) {
            return;
        }
        player.audio.pause();
        player.isPlaying = false;
    }
    
    /**
     * Stop audio and reset to beginning
     * @param {Object} player - Audio player object
     */
    static stop(player) {
        if (!player || !player.audio) {
            return;
        }
        player.audio.pause();
        player.audio.currentTime = 0;
        player.isPlaying = false;
    }
    
    /**
     * Setup progress bar for audio playback
     * @param {Object} player - Audio player object
     * @param {string} audioKey - Unique key for progress bar element
     * @param {Object} callbacks - Callback functions { onProgress, onSeek, onEnded, onError }
     */
    static setupProgress(player, audioKey, callbacks = {}) {
        if (!player || !player.audio) {
            return;
        }
        
        const audioProgressBar = document.querySelector(`#audio-progress-${audioKey} input[type="range"]`);
        if (!audioProgressBar) {
            return;
        }
        
        // Remove old listener if exists
        if (player.progressUpdateHandler) {
            player.audio.removeEventListener('timeupdate', player.progressUpdateHandler);
        }
        
        // Update progress bar
        const updateProgress = () => {
            if (player.audio && !player.audio.paused) {
                const percent = (player.audio.currentTime / player.audio.duration) * 100;
                audioProgressBar.value = percent || 0;
                if (callbacks.onProgress) {
                    callbacks.onProgress(percent, player.audio.currentTime, player.audio.duration);
                }
            }
        };
        
        player.progressUpdateHandler = updateProgress;
        player.audio.addEventListener('timeupdate', updateProgress);
        
        // Allow seeking
        audioProgressBar.oninput = (e) => {
            if (player.audio) {
                const seekTime = (e.target.value / 100) * player.audio.duration;
                player.audio.currentTime = seekTime;
                if (callbacks.onSeek) {
                    callbacks.onSeek(seekTime);
                }
            }
        };
        
        // Handle ended event
        if (callbacks.onEnded) {
            player.audio.onended = () => {
                player.isPlaying = false;
                callbacks.onEnded();
            };
        }
        
        // Handle error event
        if (callbacks.onError) {
            player.audio.onerror = (error) => {
                player.isPlaying = false;
                callbacks.onError(error);
            };
        }
    }
    
    /**
     * Cleanup player resources
     * @param {Object} player - Audio player object
     */
    static cleanup(player) {
        if (!player) {
            return;
        }
        
        if (player.audio) {
            player.audio.pause();
            if (player.progressUpdateHandler) {
                player.audio.removeEventListener('timeupdate', player.progressUpdateHandler);
            }
        }
        
        if (player.url) {
            URL.revokeObjectURL(player.url);
        }
    }
}

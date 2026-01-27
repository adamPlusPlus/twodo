// SyncState.js - State management for sync operations
// Extracted from SyncManager.js for reusability and maintainability

/**
 * SyncState - Manages sync-related state
 */
export class SyncState {
    constructor() {
        this.isConnected = false;
        this.clientId = null;
        this.currentFilename = null;
        this.pendingFileJoin = null;
        this.syncedFiles = new Set();
        this.lastSyncedSequence = 0;
        this._applyingRemoteOperation = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 10;
        this.reconnectDelay = 1000;
    }
    
    /**
     * Get connection state
     * @returns {boolean} True if connected
     */
    getConnectionState() {
        return this.isConnected;
    }
    
    /**
     * Set connection state
     * @param {boolean} state - Connection state
     */
    setConnectionState(state) {
        this.isConnected = state;
        if (!state) {
            // Reset reconnect attempts on disconnect
            this.reconnectAttempts = 0;
        }
    }
    
    /**
     * Get client ID
     * @returns {string|null} Client ID
     */
    getClientId() {
        return this.clientId;
    }
    
    /**
     * Set client ID
     * @param {string} id - Client ID
     */
    setClientId(id) {
        this.clientId = id;
    }
    
    /**
     * Get current filename
     * @returns {string|null} Current filename
     */
    getCurrentFilename() {
        return this.currentFilename;
    }
    
    /**
     * Set current filename
     * @param {string} filename - Filename
     */
    setCurrentFilename(filename) {
        this.currentFilename = filename;
    }
    
    /**
     * Get pending file join
     * @returns {string|null} Pending file to join
     */
    getPendingFileJoin() {
        return this.pendingFileJoin;
    }
    
    /**
     * Set pending file join
     * @param {string|null} filename - Filename to join when connected
     */
    setPendingFileJoin(filename) {
        this.pendingFileJoin = filename;
    }
    
    /**
     * Mark file as synced
     * @param {string} filename - File name
     */
    markFileSynced(filename) {
        this.syncedFiles.add(filename);
    }
    
    /**
     * Check if file has been synced
     * @param {string} filename - File name
     * @returns {boolean} True if file has been synced
     */
    hasSyncedFile(filename) {
        return this.syncedFiles.has(filename);
    }
    
    /**
     * Update last synced sequence number
     * @param {number} sequence - Sequence number
     */
    updateLastSyncedSequence(sequence) {
        if (sequence > this.lastSyncedSequence) {
            this.lastSyncedSequence = sequence;
        }
    }
    
    /**
     * Get last synced sequence number
     * @returns {number} Last synced sequence
     */
    getLastSyncedSequence() {
        return this.lastSyncedSequence;
    }
    
    /**
     * Set applying remote operation flag
     * @param {boolean} flag - Flag value
     */
    setApplyingRemoteOperation(flag) {
        this._applyingRemoteOperation = flag;
    }
    
    /**
     * Check if applying remote operation
     * @returns {boolean} True if applying remote operation
     */
    isApplyingRemoteOperation() {
        return this._applyingRemoteOperation;
    }
    
    /**
     * Increment reconnect attempts
     * @returns {number} New reconnect attempt count
     */
    incrementReconnectAttempts() {
        this.reconnectAttempts++;
        return this.reconnectAttempts;
    }
    
    /**
     * Get reconnect attempts
     * @returns {number} Reconnect attempt count
     */
    getReconnectAttempts() {
        return this.reconnectAttempts;
    }
    
    /**
     * Reset reconnect attempts
     */
    resetReconnectAttempts() {
        this.reconnectAttempts = 0;
    }
    
    /**
     * Check if max reconnect attempts reached
     * @returns {boolean} True if max attempts reached
     */
    hasReachedMaxReconnectAttempts() {
        return this.reconnectAttempts >= this.maxReconnectAttempts;
    }
    
    /**
     * Get reconnect delay
     * @returns {number} Reconnect delay in milliseconds
     */
    getReconnectDelay() {
        return this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    }
    
    /**
     * Clear all synced files
     */
    clearSyncedFiles() {
        this.syncedFiles.clear();
    }
    
    /**
     * Get all synced files
     * @returns {Set<string>} Set of synced filenames
     */
    getSyncedFiles() {
        return new Set(this.syncedFiles);
    }
}

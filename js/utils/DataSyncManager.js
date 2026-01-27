// DataSyncManager.js - Data synchronization and autosave logic
// Extracted from DataManager.js for reusability and maintainability

import { getService, SERVICES } from '../core/AppServices.js';
import { performanceBudgetManager } from '../core/PerformanceBudgetManager.js';

/**
 * DataSyncManager - Handles WebSocket sync and autosave operations
 */
export class DataSyncManager {
    constructor(dataManager) {
        this.dataManager = dataManager;
        this._lastSyncTimestamp = 0;
        this._autosaveTimer = null;
        this._syncTimer = null;
        this._hasPendingSave = false;
    }
    
    /**
     * Get last sync timestamp
     * @returns {number} Timestamp
     */
    getLastSyncTimestamp() {
        return this._lastSyncTimestamp;
    }
    
    /**
     * Set last sync timestamp
     * @param {number} timestamp - Timestamp
     */
    setLastSyncTimestamp(timestamp) {
        this._lastSyncTimestamp = timestamp;
    }
    
    /**
     * Sync data to WebSocket for real-time updates
     * Uses full_sync only for initial sync, operations for subsequent changes
     */
    syncDataToWebSocket() {
        performanceBudgetManager.measureOperation('SYNC', () => {
            const syncManager = this._getSyncManager();
            const fileManager = this._getFileManager();
            
            if (!syncManager || !syncManager.isConnected) {
                return;
            }
            
            if (!fileManager || !fileManager.currentFilename) {
                return;
            }
            
            // Check if this is initial sync (first time syncing this file)
            const isInitialSync = !syncManager._hasSyncedFile(fileManager.currentFilename);
            
            if (isInitialSync) {
                // Send full state for initial sync
                this._lastSyncTimestamp = Date.now();
                
                const appState = this._getAppState();
                const settingsManager = this._getSettingsManager();
                const documents = appState.documents;
                const syncPayload = {
                    documents,
                    currentDocumentId: appState.currentDocumentId,
                    groupStates: appState.groupStates || {},
                    subtaskStates: appState.subtaskStates || {},
                    allSubtasksExpanded: appState.allSubtasksExpanded,
                    settings: settingsManager ? settingsManager.loadSettings() : {},
                    timestamp: this._lastSyncTimestamp
                };
                
                // Send as a "full sync" change
                syncManager.send({
                    type: 'full_sync',
                    filename: fileManager.currentFilename,
                    data: syncPayload,
                    timestamp: this._lastSyncTimestamp
                });
                
                // Mark file as synced
                syncManager._markFileSynced(fileManager.currentFilename);
            } else {
                // After initial sync, operations are sent via operation:applied events
                // No need to send full state here
                // Update timestamp for tracking
                this._lastSyncTimestamp = Date.now();
            }
        }, { source: 'DataSyncManager-syncDataToWebSocket' });
    }
    
    /**
     * Autosave to server if a file is currently open
     * This is called automatically after saveData() with debouncing
     */
    async autosaveToServer() {
        // Only autosave if a file is currently open
        const fileManager = this._getFileManager();
        if (!fileManager || !fileManager.currentFilename) {
            console.log('[DataSyncManager] Autosave skipped - no currentFilename:', {
                hasFileManager: !!fileManager,
                currentFilename: fileManager?.currentFilename
            });
            return;
        }
        
        const currentFilename = fileManager.currentFilename;
        console.log('[DataSyncManager] Autosaving to:', currentFilename);
        
        try {
            const appState = this._getAppState();
            const autosaveData = {
                documents: appState.documents
            };
            
            // Use FileManager's saveFile method to save to server (silent mode for autosave)
            await fileManager.saveFile(currentFilename, autosaveData, true);
            console.log('[DataSyncManager] Autosave successful:', currentFilename);
            // Mark save as complete
            this._hasPendingSave = false;
            // Silently save - don't show alerts for autosave
        } catch (error) {
            // Silently fail for autosave - don't interrupt user workflow
            console.warn('[DataSyncManager] Autosave failed:', error);
            this._hasPendingSave = false;
        }
    }
    
    /**
     * Flush any pending autosave before page unload
     * This ensures changes are saved even if user refreshes quickly
     */
    async flushPendingSave() {
        if (this._autosaveTimer) {
            // Clear the timer and save immediately
            clearTimeout(this._autosaveTimer);
            this._autosaveTimer = null;
            await this.autosaveToServer();
        } else if (this._hasPendingSave) {
            // Save is in progress, wait for it to complete
            // Note: This is best-effort - we can't guarantee completion on unload
            await this.autosaveToServer();
        }
    }
    
    /**
     * Schedule autosave with debouncing
     * @param {number} delay - Delay in milliseconds (default: 500)
     */
    scheduleAutosave(delay = 500) {
        if (this._autosaveTimer) {
            clearTimeout(this._autosaveTimer);
        }
        
        this._autosaveTimer = setTimeout(() => {
            this.autosaveToServer();
        }, delay);
        
        // Track that there's a pending save
        this._hasPendingSave = true;
    }
    
    /**
     * Schedule WebSocket sync with debouncing
     * @param {number} delay - Delay in milliseconds (default: 200)
     * @param {boolean} skipSync - Whether to skip sync
     */
    scheduleSync(delay = 200, skipSync = false) {
        // Skip sync if this is from a remote update to prevent loops
        if (!skipSync) {
            if (this._syncTimer) {
                clearTimeout(this._syncTimer);
            }
            
            this._syncTimer = setTimeout(() => {
                // Send full data sync via WebSocket for real-time updates
                const syncManager = this._getSyncManager();
                const fileManager = this._getFileManager();
                if (syncManager && syncManager.isConnected && fileManager && fileManager.currentFilename) {
                    this.syncDataToWebSocket();
                }
            }, delay);
        }
    }
    
    /**
     * Get AppState service
     * @private
     */
    _getAppState() {
        return getService(SERVICES.APP_STATE);
    }
    
    /**
     * Get SettingsManager service
     * @private
     */
    _getSettingsManager() {
        return getService(SERVICES.SETTINGS_MANAGER);
    }
    
    /**
     * Get SyncManager service
     * @private
     */
    _getSyncManager() {
        return getService(SERVICES.SYNC_MANAGER);
    }
    
    /**
     * Get FileManager service
     * @private
     */
    _getFileManager() {
        return getService(SERVICES.FILE_MANAGER);
    }
}

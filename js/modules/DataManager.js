// DataManager.js - Handles all data loading, saving, and migration
import { eventBus } from '../core/EventBus.js';
import { EVENTS } from '../core/AppEvents.js';
import { getService, SERVICES, hasService } from '../core/AppServices.js';
import { ItemHierarchy } from '../utils/ItemHierarchy.js';
import { performanceBudgetManager } from '../core/PerformanceBudgetManager.js';
import { activeSetManager } from '../core/ActiveSetManager.js';
import { DataValidator } from '../utils/DataValidator.js';
import { dataTransformer } from '../utils/DataTransformer.js';
import { dataPersistence } from '../utils/DataPersistence.js';
import { DataMigration } from '../utils/DataMigration.js';
import { DailyResetManager } from '../utils/DailyResetManager.js';
import { DataSyncManager } from '../utils/DataSyncManager.js';
import { DataFileManager } from '../utils/DataFileManager.js';
import { audioArchiveManager } from '../utils/AudioArchiveManager.js';

export class DataManager {
    constructor() {
        this.storageKey = 'twodo-data';
        this.lastResetKey = 'twodo-last-reset';
        this._lastSyncTimestamp = 0; // Track last sync timestamp to prevent conflicts
        try {
            this.dailyResetManager = new DailyResetManager(this);
            this.dataSyncManager = new DataSyncManager(this);
        } catch (e) {
            console.warn('[DataManager] Sub-manager init failed, using fallbacks:', e);
            this.dailyResetManager = this.dailyResetManager || null;
            this.dataSyncManager = this.dataSyncManager || null;
        }
        // When active-set is enabled, set load function immediately so any early getDocument() succeeds
        const storageKey = this.storageKey;
        if (typeof activeSetManager !== 'undefined' && activeSetManager.config?.isEnabled?.()) {
            activeSetManager.setLoadFunction(async (documentId) => {
                const stored = dataPersistence.loadFromStorage(storageKey);
                const norm = dataTransformer.normalizeDataModel(stored);
                const docs = (norm && norm.documents) || [];
                return docs.find(d => d && d.id === documentId) || null;
            });
        }
        this.setupEventListeners();
    }
    
    /**
     * Get AppState service
     */
    _getAppState() {
        return getService(SERVICES.APP_STATE);
    }
    
    /**
     * Get SettingsManager service
     */
    _getSettingsManager() {
        return getService(SERVICES.SETTINGS_MANAGER);
    }
    
    /**
     * Get SyncManager service
     */
    _getSyncManager() {
        return getService(SERVICES.SYNC_MANAGER);
    }
    
    /**
     * Get FileManager service
     */
    _getFileManager() {
        return getService(SERVICES.FILE_MANAGER);
    }
    
    /**
     * Setup EventBus listeners for save requests
     */
    setupEventListeners() {
        eventBus.on(EVENTS.DATA.SAVE_REQUESTED, (skipSync = false) => {
            this.saveData(skipSync);
        });
    }
    
    checkDailyReset() {
        this.dailyResetManager?.checkDailyReset(this.storageKey);
    }
    
    loadFromStorage() {
        return dataPersistence.loadFromStorage(this.storageKey);
    }

    _normalizeDataModel(rawData) {
        return dataTransformer.normalizeDataModel(rawData);
    }

    normalizeDataModel(rawData) {
        return dataTransformer.normalizeDataModel(rawData);
    }
    
    migrateSubtasksToChildren(data) {
        return DataMigration.migrateSubtasksToChildren(data);
    }
    
    loadData() {
        // Run daily reset on storage first (only touches storage; never AppState or saveData)
        this.dailyResetManager.checkDailyReset(this.storageKey);
        const normalized = this._normalizeDataModel(this.loadFromStorage());
        const appState = this._getAppState();
        
        // Normalize all documents (for metadata extraction)
        const allDocuments = (normalized.documents || []).map((document) => {
            const groups = document.groups || [];
            if (groups.length === 0) {
                return {
                    ...document,
                    groups: [{
                        id: 'group-0',
                        title: 'Group 1',
                        items: [],
                        level: 0,
                        parentGroupId: null
                    }]
                };
            }
            return {
                ...document,
                groups
            };
        });
        
        // If active-set is enabled, set load function and metadata before any documents assignment
        const defaultDocument = [{
            id: 'document-1',
            groups: [{
                id: 'group-0',
                title: 'Group 1',
                items: [],
                level: 0,
                parentGroupId: null
            }]
        }];
        if (activeSetManager.config.isEnabled()) {
            const initialDocuments = allDocuments.length > 0 ? allDocuments : defaultDocument;
            activeSetManager.setLoadFunction(async (documentId) => {
                const doc = initialDocuments.find(d => d.id === documentId);
                if (doc) return doc;
                const stored = this.loadFromStorage();
                const normalizedStored = this._normalizeDataModel(stored);
                const fromStorage = (normalizedStored.documents || []).find(d => d.id === documentId);
                if (fromStorage) return fromStorage;
                if (documentId === 'document-1' && initialDocuments.length > 0) return initialDocuments[0];
                return null;
            });
            activeSetManager.setMetadataBatch(initialDocuments);
            const storedCurrentId = normalized.currentDocumentId;
            const currentId = storedCurrentId || initialDocuments[0].id;
            appState.currentDocumentId = currentId;
            if (currentId) {
                const currentDoc = initialDocuments.find(doc => doc.id === currentId);
                if (currentDoc) {
                    activeSetManager.getDocument(currentId).then(() => {
                        appState._updateDocumentsFromActiveSet();
                    }).catch(err => {
                        console.error('[DataManager] Error loading current document:', err);
                    });
                }
            }
            appState.documents = initialDocuments;
        } else {
            // Active-set disabled: load all documents as before
            if (allDocuments.length > 0) {
                appState.documents = allDocuments;
            } else {
                appState.documents = defaultDocument;
            }
            const storedCurrentId = normalized.currentDocumentId;
            if (storedCurrentId) {
                appState.currentDocumentId = storedCurrentId;
            } else if (appState.documents.length > 0) {
                appState.currentDocumentId = appState.documents[0].id;
            }
        }
        
        if (normalized.documentStates) {
            appState.documentStates = normalized.documentStates;
        }
        
        if (normalized.groupStates) {
            appState.groupStates = normalized.groupStates;
        }
        
        if (normalized.subtaskStates) {
            if (appState.setSubtaskState) {
                Object.keys(normalized.subtaskStates).forEach(key => {
                    appState.setSubtaskState(key, normalized.subtaskStates[key]);
                });
            } else {
                appState.subtaskStates = normalized.subtaskStates;
            }
        }
        if (normalized.allSubtasksExpanded !== undefined) {
            appState.allSubtasksExpanded = normalized.allSubtasksExpanded;
        }
        
        if (normalized.settings) {
            const settingsManager = this._getSettingsManager();
            if (settingsManager) {
                settingsManager.saveSettings(normalized.settings);
            }
        }
        
        this.saveData();
    }
    
    saveData(skipSync = false) {
        this.dataSyncManager?.scheduleAutosave(500);
        this.dataSyncManager?.scheduleSync(200, skipSync);
        const appState = this._getAppState();
        const settingsManager = this._getSettingsManager();
        const documents = appState.documents;
        const localData = {
            documents,
            currentDocumentId: appState.currentDocumentId,
            lastModified: new Date().toISOString(),
            groupStates: appState.groupStates || {},
            subtaskStates: appState.subtaskStates || {},
            allSubtasksExpanded: appState.allSubtasksExpanded,
            settings: settingsManager ? settingsManager.loadSettings() : {}
        };
        dataPersistence.saveToStorage(this.storageKey, localData);
    }
    
    /**
     * Sync data to WebSocket for real-time updates
     * Phase 3: Uses full_sync only for initial sync, operations for subsequent changes
     */
    _syncDataToWebSocket() {
        const syncManager = this._getSyncManager();
        if (syncManager) syncManager.syncDataToWebSocket();
    }
    
    /**
     * Autosave to server if a file is currently open
     * This is called automatically after saveData() with debouncing
     */
    async _autosaveToServer() {
        const syncManager = this._getSyncManager();
        if (syncManager) await syncManager.autosaveToServer();
    }
    
    /**
     * Flush any pending autosave before page unload
     * This ensures changes are saved even if user refreshes quickly
     */
    async flushPendingSave() {
        const syncManager = this._getSyncManager();
        if (syncManager) await syncManager.flushPendingSave();
    }
    
    async loadDefaultFile() {
        const fileManager = this._getFileManager();
        if (fileManager) await fileManager.loadDefaultFile();
    }
    
    saveToFile() {
        const fileManager = this._getFileManager();
        if (fileManager) fileManager.saveToFile();
    }
    
    async saveAsDefault() {
        const fileManager = this._getFileManager();
        if (fileManager) await fileManager.saveAsDefault();
    }
    
    async loadFromFile(event) {
        const fileManager = this._getFileManager();
        if (fileManager) await fileManager.loadFromFile(event);
    }
    
    archiveAudioRecording(pageId, elementIndex, audioFile, date) {
        audioArchiveManager.archiveAudioRecording(pageId, elementIndex, audioFile, date);
    }
    
    getArchivedRecordings(pageId, elementIndex) {
        return audioArchiveManager.getArchivedRecordings(pageId, elementIndex);
    }
    
    playArchivedAudio(filename) {
        audioArchiveManager.playArchivedAudio(filename);
    }
}

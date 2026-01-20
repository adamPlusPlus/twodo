// DataManager.js - Handles all data loading, saving, and migration
import { eventBus } from '../core/EventBus.js';
import { EVENTS } from '../core/AppEvents.js';
import { getService, SERVICES, hasService } from '../core/AppServices.js';

export class DataManager {
    constructor() {
        this.storageKey = 'twodo-data';
        this.lastResetKey = 'twodo-last-reset';
        this._lastSyncTimestamp = 0; // Track last sync timestamp to prevent conflicts
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
        const today = new Date().toDateString();
        const lastReset = localStorage.getItem(this.lastResetKey);
        
        if (lastReset !== today) {
            // Reset all repeating tasks
            const storedData = this._normalizeDataModel(this.loadFromStorage());
            if (storedData && storedData.documents) {
                // Delete completed one-time tasks first
                storedData.documents.forEach(document => {
                    if (document.groups) {
                        document.groups.forEach(group => {
                            if (group.items) {
                                group.items = group.items.filter(item => {
                                    // Delete one-time tasks that are completed
                                    if (item.repeats === false && item.completed) {
                                        return false;
                                    }
                                    return true;
                                });
                            }
                        });
                    } else if (document.items) {
                        // Legacy support: migrate old structure
                        document.items = document.items.filter(item => {
                            // Delete one-time tasks that are completed
                            if (item.repeats === false && item.completed) {
                                return false;
                            }
                            return true;
                        });
                    }
                });
                
                // Reset all repeating tasks
                const resetItem = (item, documentId, itemIndex) => {
                    if (item.repeats !== false) {
                        item.completed = false;
                        
                        // Reset children (one level for current implementation)
                        if (item.children && Array.isArray(item.children)) {
                            item.children.forEach(child => {
                                if (child.repeats !== false) {
                                    child.completed = false;
                                }
                            });
                        }
                        
                        // Handle audio elements - archive and clear
                        if (item.type === 'audio' && item.repeats !== false) {
                            if (item.audioFile && item.date) {
                                this.archiveAudioRecording(documentId, itemIndex, item.audioFile, item.date);
                            }
                            item.audioFile = null;
                            item.date = null;
                        }
                        
                        if (item.items) {
                            item.items.forEach(subItem => {
                                if (subItem.repeats !== false) {
                                    subItem.completed = false;
                                }
                            });
                        }
                    }
                };
                
                storedData.documents.forEach(document => {
                    if (document.groups) {
                        document.groups.forEach(group => {
                            if (group.items) {
                                group.items.forEach((item, itemIndex) => {
                                    resetItem(item, document.id, itemIndex);
                                });
                            }
                        });
                    } else if (document.items) {
                        // Legacy support
                        document.items.forEach((item, itemIndex) => {
                            resetItem(item, document.id, itemIndex);
                        });
                    }
                });
                const appState = this._getAppState();
                appState.documents = storedData.documents;
                this.saveData();
            }
            localStorage.setItem(this.lastResetKey, today);
        }
    }
    
    loadFromStorage() {
        const stored = localStorage.getItem(this.storageKey);
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch (e) {
                console.error('Failed to parse stored data:', e);
            }
        }
        return null;
    }

    _normalizeDataModel(rawData) {
        if (!rawData || typeof rawData !== 'object') {
            return { documents: [] };
        }

        const normalized = { ...rawData };
        normalized.documents = normalized.documents || [];
        normalized.documentStates = normalized.documentStates || {};
        normalized.groupStates = normalized.groupStates || {};

        return normalized;
    }
    
    migrateSubtasksToChildren(data) {
        // Recursively migrate subtasks to children for all items
        if (!data) {
            return data;
        }
        
        const migrateElement = (element) => {
            if (!element) return element;
            
            // Initialize children array if it doesn't exist
            if (!element.children) {
                element.children = [];
            }
            
            // Migrate subtasks to children if they exist
            if (element.subtasks && Array.isArray(element.subtasks) && element.subtasks.length > 0) {
                element.subtasks.forEach(subtask => {
                    // Convert subtask to full element object
                    const childElement = {
                        type: 'task',
                        text: subtask.text || 'Subtask',
                        completed: subtask.completed || false,
                        timeAllocated: subtask.timeAllocated || '',
                        repeats: subtask.repeats !== undefined ? subtask.repeats : true,
                        funModifier: subtask.funModifier || '',
                        children: [] // Initialize children for nested elements
                    };
                    element.children.push(childElement);
                });
                // Remove subtasks property after migration
                delete element.subtasks;
            }
            
            // Recursively migrate children (for future unlimited depth support)
            if (element.children && Array.isArray(element.children)) {
                element.children.forEach(child => {
                    migrateElement(child);
                });
            }
            
            return element;
        };
        
        const documents = data.documents || [];
        documents.forEach(document => {
            const groups = document.groups || [];
            groups.forEach(group => {
                const items = group.items || [];
                items.forEach(element => {
                    migrateElement(element);
                });
            });
        });
        
        return data;
    }
    
    loadData() {
        const normalized = this._normalizeDataModel(this.loadFromStorage());
        const migratedData = this.migrateSubtasksToChildren(normalized);
        const appState = this._getAppState();
        
        const documents = (migratedData.documents || []).map((document) => {
            const groups = document.groups || [];
            const normalizedGroups = groups.map((group) => {
                const items = group.items || [];
                return {
                    ...group,
                    items
                };
            });
            if (normalizedGroups.length === 0) {
                return {
                    ...document,
                    groups: [{
                        id: 'group-0',
                        title: 'Group 1',
                        items: []
                    }]
                };
            }
            return {
                ...document,
                groups: normalizedGroups
            };
        });
        
        if (documents.length > 0) {
            appState.documents = documents;
        } else {
            appState.documents = [{
                id: 'document-1',
                groups: [{
                    id: 'group-0',
                    title: 'Group 1',
                    items: []
                }]
            }];
        }
        
        const storedCurrentId = migratedData.currentDocumentId;
        if (storedCurrentId) {
            appState.currentDocumentId = storedCurrentId;
        } else if (appState.documents.length > 0) {
            appState.currentDocumentId = appState.documents[0].id;
        }
        
        if (migratedData.documentStates) {
            appState.documentStates = migratedData.documentStates;
        }
        
        if (migratedData.groupStates) {
            appState.groupStates = migratedData.groupStates;
        }
        
        if (migratedData.subtaskStates) {
            if (appState.setSubtaskState) {
                Object.keys(migratedData.subtaskStates).forEach(key => {
                    appState.setSubtaskState(key, migratedData.subtaskStates[key]);
                });
            } else {
                appState.subtaskStates = migratedData.subtaskStates;
            }
        }
        if (migratedData.allSubtasksExpanded !== undefined) {
            appState.allSubtasksExpanded = migratedData.allSubtasksExpanded;
        }
        
        if (migratedData.settings) {
            const settingsManager = this._getSettingsManager();
            if (settingsManager) {
                settingsManager.saveSettings(migratedData.settings);
            }
        }
        
        this.saveData();
    }
    
    saveData(skipSync = false) {
        // Debounce autosave to server
        if (this._autosaveTimer) {
            clearTimeout(this._autosaveTimer);
        }
        
        this._autosaveTimer = setTimeout(() => {
            this._autosaveToServer();
        }, 500); // Wait 500ms after last change before saving
        
        // Track that there's a pending save
        this._hasPendingSave = true;
        
        // Debounce WebSocket sync (shorter delay for real-time feel)
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
                    this._syncDataToWebSocket();
                }
            }, 200); // Wait 200ms after last change before syncing
        }
        
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
        localStorage.setItem(this.storageKey, JSON.stringify(localData));
    }
    
    /**
     * Sync data to WebSocket for real-time updates
     */
    _syncDataToWebSocket() {
        const syncManager = this._getSyncManager();
        const fileManager = this._getFileManager();
        
        if (!syncManager || !syncManager.isConnected) {
            return;
        }
        
        if (!fileManager || !fileManager.currentFilename) {
            return;
        }
        
        // Update last sync timestamp
        this._lastSyncTimestamp = Date.now();
        
        // Send full data state for sync
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
    }
    
    /**
     * Autosave to server if a file is currently open
     * This is called automatically after saveData() with debouncing
     */
    async _autosaveToServer() {
        // Only autosave if a file is currently open
        const fileManager = this._getFileManager();
        if (!fileManager || !fileManager.currentFilename) {
            console.log('[DataManager] Autosave skipped - no currentFilename:', {
                hasFileManager: !!fileManager,
                currentFilename: fileManager?.currentFilename
            });
            return;
        }
        
        const currentFilename = fileManager.currentFilename;
        console.log('[DataManager] Autosaving to:', currentFilename);
        
        try {
            const appState = this._getAppState();
            const autosaveData = {
                documents: appState.documents
            };
            
            // Use FileManager's saveFile method to save to server (silent mode for autosave)
            await fileManager.saveFile(currentFilename, autosaveData, true);
            console.log('[DataManager] Autosave successful:', currentFilename);
            // Mark save as complete
            this._hasPendingSave = false;
            // Silently save - don't show alerts for autosave
        } catch (error) {
            // Silently fail for autosave - don't interrupt user workflow
            console.warn('[DataManager] Autosave failed:', error);
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
            await this._autosaveToServer();
        } else if (this._hasPendingSave) {
            // Save is in progress, wait for it to complete
            // Note: This is best-effort - we can't guarantee completion on unload
            await this._autosaveToServer();
        }
    }
    
    async loadDefaultFile() {
        try {
            // Use cache: 'no-store' to bypass browser cache and always fetch fresh file
            const response = await fetch('default.json?' + Date.now(), {
                cache: 'no-store'
            });
            const defaultData = await response.json();
            const normalizedDefault = this._normalizeDataModel(defaultData);
            
            if (!normalizedDefault.documents || !Array.isArray(normalizedDefault.documents)) {
                alert('Invalid default.json format. Expected a JSON file with a "documents" array.');
                return;
            }
            
            if (confirm(`Load ${normalizedDefault.documents.length} document(s) from default.json? This will replace your current data.`)) {
                // Migrate subtasks to children before loading
                const migratedData = this.migrateSubtasksToChildren(normalizedDefault);
                const appState = this._getAppState();
                appState.documents = migratedData.documents;
                
                // Restore collapse states if they exist, otherwise reset to closed state
                if (normalizedDefault.documentStates) {
                    appState.documentStates = normalizedDefault.documentStates;
                }
                if (normalizedDefault.groupStates) {
                    appState.groupStates = normalizedDefault.groupStates;
                }
                
                if (migratedData.subtaskStates) {
                    Object.keys(migratedData.subtaskStates).forEach(key => {
                        if (appState.setSubtaskState) {
                            appState.setSubtaskState(key, migratedData.subtaskStates[key]);
                        }
                    });
                }
                
                if (normalizedDefault.allSubtasksExpanded !== undefined) {
                    appState.allSubtasksExpanded = normalizedDefault.allSubtasksExpanded;
                } else {
                    appState.allSubtasksExpanded = false;
                }
                
                // Restore settings if they exist
                if (normalizedDefault.settings) {
                    const settingsManager = this._getSettingsManager();
                    if (settingsManager) {
                        settingsManager.saveSettings(normalizedDefault.settings);
                    }
                }
                
                this.saveData();
                eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
                alert('default.json loaded successfully!');
            }
        } catch (error) {
            console.error('Failed to load default.json:', error);
            alert('Failed to load default.json. Make sure it exists in the twodo directory.');
        }
    }
    
    saveToFile() {
        const appState = this._getAppState();
        const settingsManager = this._getSettingsManager();
        const exportData = {
            documents: appState.documents,
            lastModified: new Date().toISOString(),
            version: '1.0',
            documentStates: {}, // Legacy - documentStates now in AppState
            subtaskStates: appState.subtaskStates || {},
            allSubtasksExpanded: appState.allSubtasksExpanded,
            settings: settingsManager ? settingsManager.loadSettings() : {}
        };
        
        const json = JSON.stringify(exportData, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        const dateStr = new Date().toISOString().split('T')[0];
        a.download = `twodo-backup-${dateStr}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    
    async saveAsDefault() {
        if (!confirm('This will overwrite the default.json file on the server with your current data. Continue?')) {
            return;
        }
        
        const appState = this._getAppState();
        const settingsManager = this._getSettingsManager();
        const defaultPayload = {
            documents: appState.documents,
            lastModified: new Date().toISOString(),
            version: '1.0',
            documentStates: {}, // Legacy - documentStates now in AppState
            subtaskStates: appState.subtaskStates || {},
            allSubtasksExpanded: appState.allSubtasksExpanded,
            settings: settingsManager ? settingsManager.loadSettings() : {}
        };
        
        try {
            // Use absolute URL to work from any device
            const url = window.location.origin + '/save-default.json';
            console.log('Saving to:', url);
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(defaultPayload)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.success) {
                alert('default.json saved successfully!');
            } else {
                alert('Failed to save default.json: ' + (result.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('Failed to save default.json:', error);
            alert('Failed to save default.json: ' + error.message + '. Make sure the server is running and supports POST requests.');
        }
    }
    
    loadFromFile(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target.result);
                const normalizedImport = this._normalizeDataModel(importedData);
                
                if (!normalizedImport.documents || !Array.isArray(normalizedImport.documents)) {
                    alert('Invalid file format. Expected a JSON file with a "documents" array.');
                    return;
                }
                
                // Ask for confirmation
                if (confirm(`Load ${normalizedImport.documents.length} document(s) from file? This will replace your current data.`)) {
                    // Migrate subtasks to children before loading
                    const migratedData = this.migrateSubtasksToChildren(normalizedImport);
                    const appState = this._getAppState();
                    appState.documents = migratedData.documents;
                    
                    // Restore collapse states if they exist, otherwise reset to closed state
                    if (normalizedImport.documentStates) {
                        appState.documentStates = normalizedImport.documentStates;
                    }
                    if (normalizedImport.groupStates) {
                        appState.groupStates = normalizedImport.groupStates;
                    }
                    
                    if (migratedData.subtaskStates) {
                        Object.keys(migratedData.subtaskStates).forEach(key => {
                            if (appState.setSubtaskState) {
                                appState.setSubtaskState(key, migratedData.subtaskStates[key]);
                            }
                        });
                    }
                    
                    if (normalizedImport.allSubtasksExpanded !== undefined) {
                        appState.allSubtasksExpanded = normalizedImport.allSubtasksExpanded;
                    } else {
                        appState.allSubtasksExpanded = false;
                    }
                    
                    // Restore settings if they exist
                    if (normalizedImport.settings) {
                        const settingsManager = this._getSettingsManager();
                        if (settingsManager) {
                            settingsManager.saveSettings(normalizedImport.settings);
                        }
                    }
                    
                    this.saveData();
                    eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
                    alert('File loaded successfully!');
                }
            } catch (error) {
                console.error('Failed to load file:', error);
                alert('Failed to load file. Make sure it is a valid JSON file.');
            }
        };
        reader.readAsText(file);
        
        // Reset file input so the same file can be loaded again
        event.target.value = '';
    }
    
    archiveAudioRecording(pageId, elementIndex, audioFile, date) {
        const archiveKey = 'twodo-audio-archive';
        let archive = [];
        const stored = localStorage.getItem(archiveKey);
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
        
        localStorage.setItem(archiveKey, JSON.stringify(archive));
    }
    
    getArchivedRecordings(pageId, elementIndex) {
        const archiveKey = 'twodo-audio-archive';
        const stored = localStorage.getItem(archiveKey);
        if (!stored) return [];
        
        try {
            const archive = JSON.parse(stored);
            return archive.filter(entry => entry.pageId === pageId && entry.elementIndex === elementIndex);
        } catch (e) {
            console.error('Failed to parse archive:', e);
            return [];
        }
    }
    
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
}

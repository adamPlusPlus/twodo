// DataManager.js - Handles all data loading, saving, and migration
import { eventBus } from '../core/EventBus.js';
import { EVENTS } from '../core/AppEvents.js';
import { getService, SERVICES, hasService } from '../core/AppServices.js';
import { ItemHierarchy } from '../utils/ItemHierarchy.js';
import { performanceBudgetManager } from '../core/PerformanceBudgetManager.js';
import { activeSetManager } from '../core/ActiveSetManager.js';

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
                                const removeIds = new Set(
                                    group.items
                                        .filter(item => item?.repeats === false && item?.completed)
                                        .map(item => item.id)
                                );
                                group.items = group.items.filter(item => !removeIds.has(item.id));
                                group.items.forEach(item => {
                                    if (Array.isArray(item.childIds)) {
                                        item.childIds = item.childIds.filter(id => !removeIds.has(id));
                                    }
                                    if (item.parentId && removeIds.has(item.parentId)) {
                                        item.parentId = null;
                                    }
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
                const resetItem = (item, documentId, itemIndex, itemIndexMap) => {
                    if (item.repeats !== false) {
                        item.completed = false;
                        
                        // Reset children (one level for current implementation)
                        if (itemIndexMap) {
                            const childItems = ItemHierarchy.getChildItems(item, itemIndexMap);
                            childItems.forEach(child => {
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
                                const itemIndexMap = ItemHierarchy.buildItemIndex(group.items);
                                group.items.forEach((item, itemIndex) => {
                                    resetItem(item, document.id, itemIndex, itemIndexMap);
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
        normalized.documents = this._migrateDocumentsToIdLinks(normalized.documents);
        return normalized;
    }

    normalizeDataModel(rawData) {
        return this._normalizeDataModel(rawData);
    }

    _generateItemId() {
        return `item-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    }

    _ensureDocumentDefaults(document) {
        const config = document.config && typeof document.config === 'object' ? document.config : {};
        const groupMode = document.groupMode || config.groupMode || 'manual';
        return {
            ...document,
            groups: Array.isArray(document.groups) ? document.groups : [],
            config: { ...config, groupMode },
            groupMode
        };
    }

    _ensureGroupDefaults(group) {
        return {
            ...group,
            items: Array.isArray(group.items) ? group.items : [],
            level: typeof group.level === 'number' ? group.level : 0,
            parentGroupId: group.parentGroupId ?? null
        };
    }

    _migrateItemsToIdLinks(items) {
        const flatItems = [];
        const seen = new Set();

        const addItem = (item, parentId = null) => {
            if (!item || typeof item !== 'object') {
                return null;
            }

            const itemId = item.id || this._generateItemId();
            item.id = itemId;
            if (parentId !== null) {
                item.parentId = parentId;
            } else if (!item.parentId) {
                item.parentId = null;
            }

            const existingChildIds = Array.isArray(item.childIds) ? [...item.childIds] : [];
            const children = Array.isArray(item.children) ? item.children : [];

            if (Array.isArray(item.subtasks) && item.subtasks.length > 0) {
                item.subtasks.forEach(subtask => {
                    const childItem = {
                        id: this._generateItemId(),
                        type: 'task',
                        text: subtask.text || 'Subtask',
                        completed: subtask.completed || false,
                        timeAllocated: subtask.timeAllocated || '',
                        repeats: subtask.repeats !== undefined ? subtask.repeats : true,
                        funModifier: subtask.funModifier || '',
                        parentId: itemId,
                        childIds: [],
                        config: {}
                    };
                    children.push(childItem);
                });
                delete item.subtasks;
            }

            if (!seen.has(itemId)) {
                flatItems.push(item);
                seen.add(itemId);
            }

            item.childIds = [];
            children.forEach(child => {
                const childId = addItem(child, itemId);
                if (childId) {
                    item.childIds.push(childId);
                }
            });

            if (item.childIds.length === 0 && existingChildIds.length > 0) {
                item.childIds = existingChildIds;
            }

            delete item.children;
            return itemId;
        };

        (items || []).forEach(item => addItem(item, null));

        const itemIndex = ItemHierarchy.buildItemIndex(flatItems);
        flatItems.forEach(item => {
            if (item.parentId && itemIndex[item.parentId]) {
                const parent = itemIndex[item.parentId];
                if (!Array.isArray(parent.childIds)) {
                    parent.childIds = [];
                }
                if (!parent.childIds.includes(item.id)) {
                    parent.childIds.push(item.id);
                }
            }
        });

        flatItems.forEach(item => {
            const childIds = Array.isArray(item.childIds) ? item.childIds : [];
            item.childIds = childIds.filter(childId => itemIndex[childId]);
            if (item.parentId && !itemIndex[item.parentId]) {
                item.parentId = null;
            }
        });

        return flatItems;
    }

    _migrateDocumentsToIdLinks(documents) {
        return documents.map(rawDocument => {
            const document = this._ensureDocumentDefaults(rawDocument);
            let groups = document.groups;

            if ((!groups || groups.length === 0) && Array.isArray(document.items)) {
                groups = [{
                    id: 'group-0',
                    title: 'Group 1',
                    items: document.items,
                    level: 0,
                    parentGroupId: null
                }];
                delete document.items;
            }

            const normalizedGroups = (groups || []).map(group => {
                const normalizedGroup = this._ensureGroupDefaults(group);
                normalizedGroup.items = this._migrateItemsToIdLinks(normalizedGroup.items);
                return normalizedGroup;
            });

            return {
                ...document,
                groups: normalizedGroups
            };
        });
    }
    
    migrateSubtasksToChildren(data) {
        if (!data) {
            return data;
        }
        data.documents = this._migrateDocumentsToIdLinks(data.documents || []);
        return data;
    }
    
    loadData() {
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
        
        // If active-set is enabled, load metadata only initially
        if (activeSetManager.config.isEnabled() && allDocuments.length > 0) {
            // Set up load function for ActiveSetManager
            activeSetManager.setLoadFunction(async (documentId) => {
                // Find document in normalized data
                const document = allDocuments.find(doc => doc.id === documentId);
                if (document) {
                    // Return normalized document
                    return document;
                }
                // If not found, try loading from storage
                const stored = this.loadFromStorage();
                const normalizedStored = this._normalizeDataModel(stored);
                return (normalizedStored.documents || []).find(doc => doc.id === documentId) || null;
            });
            
            // Store metadata for all documents
            activeSetManager.setMetadataBatch(allDocuments);
            
            // Determine current document ID
            const storedCurrentId = normalized.currentDocumentId;
            const currentId = storedCurrentId || (allDocuments.length > 0 ? allDocuments[0].id : 'document-1');
            appState.currentDocumentId = currentId;
            
            // Load current document immediately
            if (currentId) {
                const currentDoc = allDocuments.find(doc => doc.id === currentId);
                if (currentDoc) {
                    // Load current document into active set
                    activeSetManager.getDocument(currentId).then(() => {
                        // Update appState documents after loading
                        appState._updateDocumentsFromActiveSet();
                    }).catch(err => {
                        console.error('[DataManager] Error loading current document:', err);
                    });
                }
            }
            
            // Set documents to metadata initially (will be updated when current doc loads)
            appState.documents = allDocuments; // This will trigger metadata storage via setter
        } else {
            // Active-set disabled: load all documents as before
            if (allDocuments.length > 0) {
                appState.documents = allDocuments;
            } else {
                appState.documents = [{
                    id: 'document-1',
                    groups: [{
                        id: 'group-0',
                        title: 'Group 1',
                        items: [],
                        level: 0,
                        parentGroupId: null
                    }]
                }];
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
     * Phase 3: Uses full_sync only for initial sync, operations for subsequent changes
     */
    _syncDataToWebSocket() {
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
        }, { source: 'DataManager-_syncDataToWebSocket' });
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
                const appState = this._getAppState();
                appState.documents = normalizedDefault.documents;
                
                // Restore collapse states if they exist, otherwise reset to closed state
                if (normalizedDefault.documentStates) {
                    appState.documentStates = normalizedDefault.documentStates;
                }
                if (normalizedDefault.groupStates) {
                    appState.groupStates = normalizedDefault.groupStates;
                }
                
                if (normalizedDefault.subtaskStates) {
                    Object.keys(normalizedDefault.subtaskStates).forEach(key => {
                        if (appState.setSubtaskState) {
                            appState.setSubtaskState(key, normalizedDefault.subtaskStates[key]);
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
                    const appState = this._getAppState();
                    appState.documents = normalizedImport.documents;
                    
                    // Restore collapse states if they exist, otherwise reset to closed state
                    if (normalizedImport.documentStates) {
                        appState.documentStates = normalizedImport.documentStates;
                    }
                    if (normalizedImport.groupStates) {
                        appState.groupStates = normalizedImport.groupStates;
                    }
                    
                    if (normalizedImport.subtaskStates) {
                        Object.keys(normalizedImport.subtaskStates).forEach(key => {
                            if (appState.setSubtaskState) {
                                appState.setSubtaskState(key, normalizedImport.subtaskStates[key]);
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

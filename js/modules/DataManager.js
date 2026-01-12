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
            const data = this.loadFromStorage();
            if (data && data.pages) {
                // Delete completed one-time tasks first
                data.pages.forEach(page => {
                    if (page.bins) {
                        page.bins.forEach(bin => {
                            if (bin.elements) {
                                bin.elements = bin.elements.filter(element => {
                                    // Delete one-time tasks that are completed
                                    if (element.repeats === false && element.completed) {
                                        return false;
                                    }
                                    return true;
                                });
                            }
                        });
                    } else if (page.elements) {
                        // Legacy support: migrate old structure
                        page.elements = page.elements.filter(element => {
                            // Delete one-time tasks that are completed
                            if (element.repeats === false && element.completed) {
                                return false;
                            }
                            return true;
                        });
                    }
                });
                
                // Reset all repeating tasks
                const resetElement = (element, pageId, elementIndex) => {
                    if (element.repeats !== false) {
                        element.completed = false;
                        
                        // Reset children (one level for current implementation)
                        if (element.children && Array.isArray(element.children)) {
                            element.children.forEach(child => {
                                if (child.repeats !== false) {
                                    child.completed = false;
                                }
                            });
                        }
                        
                        // Handle audio elements - archive and clear
                        if (element.type === 'audio' && element.repeats !== false) {
                            if (element.audioFile && element.date) {
                                this.archiveAudioRecording(pageId, elementIndex, element.audioFile, element.date);
                            }
                            element.audioFile = null;
                            element.date = null;
                        }
                        
                        if (element.items) {
                            element.items.forEach(item => {
                                if (item.repeats !== false) {
                                    item.completed = false;
                                }
                            });
                        }
                    }
                };
                
                data.pages.forEach(page => {
                    if (page.bins) {
                        page.bins.forEach(bin => {
                            if (bin.elements) {
                                bin.elements.forEach((element, elementIndex) => {
                                    resetElement(element, page.id, elementIndex);
                                });
                            }
                        });
                    } else if (page.elements) {
                        // Legacy support
                        page.elements.forEach((element, elementIndex) => {
                            resetElement(element, page.id, elementIndex);
                        });
                    }
                });
                const appState = this._getAppState();
                appState.pages = data.pages;
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
    
    migrateSubtasksToChildren(data) {
        // Recursively migrate subtasks to children for all elements
        if (!data || !data.pages) {
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
        
        // Migrate all pages and their elements
        data.pages.forEach(page => {
            if (page.elements && Array.isArray(page.elements)) {
                page.elements.forEach(element => {
                    migrateElement(element);
                });
            }
        });
        
        return data;
    }
    
    loadData() {
        const stored = this.loadFromStorage();
        if (stored && stored.pages) {
            // Migrate subtasks to children before processing
            const migratedData = this.migrateSubtasksToChildren(stored);
            
            // Migrate old page structure to new page->bins structure
            if (migratedData.pages && migratedData.pages.length > 0) {
                // Check if data is already in new format (has bins property)
                const isNewFormat = migratedData.pages[0].bins !== undefined;
                
                const appState = this._getAppState();
                if (isNewFormat) {
                    // Already in new format
                    const pages = migratedData.pages;
                    appState.pages = pages;
                } else {
                    // Old format: migrate pages to bins under Page 1
                    const pages = [{
                        id: 'page-1',
                        bins: migratedData.pages.map((oldPage, index) => ({
                            id: `bin-${index}`,
                            title: oldPage.title || `Bin ${index + 1}`,
                            elements: oldPage.elements || []
                        }))
                    }];
                    appState.pages = pages;
                }
            } else {
                // No pages, create default
                const pages = [{
                    id: 'page-1',
                    bins: [{
                        id: 'bin-0',
                        title: 'Bin 1',
                        elements: []
                    }]
                }];
                const appState = this._getAppState();
                appState.pages = pages;
            }
            
            // Set current page to first page
            const appState = this._getAppState();
            if (appState.pages.length > 0) {
                const firstPageId = appState.pages[0].id;
                appState.currentPageId = firstPageId;
            }
            
            // Restore collapse states if they exist (migrate pageStates to binStates)
            if (migratedData.pageStates) {
                // Migrate old pageStates keys (pageId) to new binStates keys (binId)
                const binStates = {};
                Object.keys(migratedData.pageStates).forEach(oldKey => {
                    // Old key format: "page-0", new format: "bin-0"
                    const newKey = oldKey.replace(/^page-/, 'bin-');
                    binStates[newKey] = migratedData.pageStates[oldKey];
                });
                // Store in AppState if it has binStates property
                if (appState.setBinState) {
                    Object.keys(binStates).forEach(binId => {
                        appState.setBinState(binId, binStates[binId]);
                    });
                } else {
                    appState.binStates = binStates;
                }
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
            
            // Restore settings if they exist
            if (migratedData.settings) {
                const settingsManager = this._getSettingsManager();
                if (settingsManager) {
                    settingsManager.saveSettings(migratedData.settings);
                }
            }
            
            // Save migrated data back to storage
            this.saveData();
        } else {
            // Default: one page with one bin
            const appState = this._getAppState();
            appState.pages = [{
                id: 'page-1',
                bins: [{
                    id: 'bin-0',
                    title: 'Bin 1',
                    elements: []
                }]
            }];
            appState.currentPageId = 'page-1';
        }
    }
    
    saveData(skipSync = false) {
        // Debounce autosave to server
        if (this._autosaveTimer) {
            clearTimeout(this._autosaveTimer);
        }
        
        this._autosaveTimer = setTimeout(() => {
            this._autosaveToServer();
        }, 500); // Wait 500ms after last change before saving
        
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
        const data = {
            pages: appState.pages,
            currentPageId: appState.currentPageId,
            lastModified: new Date().toISOString(),
            binStates: appState.binStates || {},
            subtaskStates: appState.subtaskStates || {},
            allSubtasksExpanded: appState.allSubtasksExpanded,
            settings: settingsManager ? settingsManager.loadSettings() : {}
        };
        localStorage.setItem(this.storageKey, JSON.stringify(data));
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
        const data = {
            pages: appState.pages,
            currentPageId: appState.currentPageId,
            binStates: appState.binStates || {},
            subtaskStates: appState.subtaskStates || {},
            allSubtasksExpanded: appState.allSubtasksExpanded,
            settings: settingsManager ? settingsManager.loadSettings() : {},
            timestamp: this._lastSyncTimestamp
        };
        
        // Send as a "full sync" change
        syncManager.send({
            type: 'full_sync',
            filename: fileManager.currentFilename,
            data: data,
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
            const data = {
                pages: appState.pages
            };
            
            // Use FileManager's saveFile method to save to server (silent mode for autosave)
            await fileManager.saveFile(currentFilename, data, true);
            console.log('[DataManager] Autosave successful:', currentFilename);
            // Silently save - don't show alerts for autosave
        } catch (error) {
            // Silently fail for autosave - don't interrupt user workflow
            console.warn('[DataManager] Autosave failed:', error);
        }
    }
    
    async loadDefaultFile() {
        try {
            // Use cache: 'no-store' to bypass browser cache and always fetch fresh file
            const response = await fetch('default.json?' + Date.now(), {
                cache: 'no-store'
            });
            const data = await response.json();
            
            if (!data.pages || !Array.isArray(data.pages)) {
                alert('Invalid default.json format. Expected a JSON file with a "pages" array.');
                return;
            }
            
            if (confirm(`Load ${data.pages.length} page(s) from default.json? This will replace your current data.`)) {
                // Migrate subtasks to children before loading
                const migratedData = this.migrateSubtasksToChildren(data);
                const appState = this._getAppState();
                appState.pages = migratedData.pages;
                
                // Restore collapse states if they exist, otherwise reset to closed state
                if (data.pageStates) {
                    // Migrate pageStates to binStates
                    Object.keys(data.pageStates).forEach(pageId => {
                        const binId = pageId.replace(/^page-/, 'bin-');
                        if (appState.setBinState) {
                            appState.setBinState(binId, data.pageStates[pageId]);
                        }
                    });
                }
                
                if (migratedData.subtaskStates) {
                    Object.keys(migratedData.subtaskStates).forEach(key => {
                        if (appState.setSubtaskState) {
                            appState.setSubtaskState(key, migratedData.subtaskStates[key]);
                        }
                    });
                }
                
                if (data.allSubtasksExpanded !== undefined) {
                    appState.allSubtasksExpanded = data.allSubtasksExpanded;
                } else {
                    appState.allSubtasksExpanded = false;
                }
                
                // Restore settings if they exist
                if (data.settings) {
                    const settingsManager = this._getSettingsManager();
                    if (settingsManager) {
                        settingsManager.saveSettings(data.settings);
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
        const data = {
            pages: appState.pages,
            lastModified: new Date().toISOString(),
            version: '1.0',
            pageStates: {}, // Legacy - binStates are now in AppState
            subtaskStates: appState.subtaskStates || {},
            allSubtasksExpanded: appState.allSubtasksExpanded,
            settings: settingsManager ? settingsManager.loadSettings() : {}
        };
        
        const json = JSON.stringify(data, null, 2);
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
        const data = {
            pages: appState.pages,
            lastModified: new Date().toISOString(),
            version: '1.0',
            pageStates: {}, // Legacy - binStates are now in AppState
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
                body: JSON.stringify(data)
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
                const data = JSON.parse(e.target.result);
                
                if (!data.pages || !Array.isArray(data.pages)) {
                    alert('Invalid file format. Expected a JSON file with a "pages" array.');
                    return;
                }
                
                // Ask for confirmation
                if (confirm(`Load ${data.pages.length} page(s) from file? This will replace your current data.`)) {
                    // Migrate subtasks to children before loading
                    const migratedData = this.migrateSubtasksToChildren(data);
                    const appState = this._getAppState();
                    appState.pages = migratedData.pages;
                    
                    // Restore collapse states if they exist, otherwise reset to closed state
                    if (data.pageStates) {
                        // Migrate pageStates to binStates
                        Object.keys(data.pageStates).forEach(pageId => {
                            const binId = pageId.replace(/^page-/, 'bin-');
                            if (appState.setBinState) {
                                appState.setBinState(binId, data.pageStates[pageId]);
                            }
                        });
                    }
                    
                    if (migratedData.subtaskStates) {
                        Object.keys(migratedData.subtaskStates).forEach(key => {
                            if (appState.setSubtaskState) {
                                appState.setSubtaskState(key, migratedData.subtaskStates[key]);
                            }
                        });
                    }
                    
                    if (data.allSubtasksExpanded !== undefined) {
                        appState.allSubtasksExpanded = data.allSubtasksExpanded;
                    } else {
                        appState.allSubtasksExpanded = false;
                    }
                    
                    // Restore settings if they exist
                    if (data.settings) {
                        const settingsManager = this._getSettingsManager();
                        if (settingsManager) {
                            settingsManager.saveSettings(data.settings);
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

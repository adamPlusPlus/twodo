// DataFileManager.js - File I/O operations for data
// Extracted from DataManager.js for reusability and maintainability

import { getService, SERVICES } from '../core/AppServices.js';
import { eventBus } from '../core/EventBus.js';
import { EVENTS } from '../core/AppEvents.js';
import { dataPersistence } from './DataPersistence.js';
import { dataTransformer } from './DataTransformer.js';

/**
 * DataFileManager - Handles file loading and saving operations
 */
export class DataFileManager {
    constructor(dataManager) {
        this.dataManager = dataManager;
    }
    
    /**
     * Load default file from server
     */
    async loadDefaultFile() {
        try {
            // Use cache: 'no-store' to bypass browser cache and always fetch fresh file
            const defaultData = await dataPersistence.loadFromFile('default.json?' + Date.now());
            if (!defaultData) {
                throw new Error('Failed to load default.json');
            }
            const normalizedDefault = dataTransformer.normalizeDataModel(defaultData);
            
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
                
                this.dataManager.saveData();
                eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
                alert('default.json loaded successfully!');
            }
        } catch (error) {
            console.error('Failed to load default.json:', error);
            alert('Failed to load default.json. Make sure it exists in the twodo directory.');
        }
    }
    
    /**
     * Save data to downloadable file
     */
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
        
        const dateStr = new Date().toISOString().split('T')[0];
        const filename = `twodo-backup-${dateStr}.json`;
        dataPersistence.downloadAsFile(exportData, filename);
    }
    
    /**
     * Save current data as default.json on server
     */
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
        
        const success = await dataPersistence.saveToFile('default.json', defaultPayload, false);
        if (success) {
            alert('default.json saved successfully!');
        } else {
            alert('Failed to save default.json. Make sure the server is running and supports POST requests.');
        }
    }
    
    /**
     * Load data from file input
     * @param {Event} event - File input change event
     */
    async loadFromFile(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const importedData = await dataPersistence.loadFromFileInput(file);
        if (!importedData) {
            alert('Failed to load file. Make sure it is a valid JSON file.');
            return;
        }
        
        try {
            const normalizedImport = dataTransformer.normalizeDataModel(importedData);
            
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
                
                this.dataManager.saveData();
                eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
                alert('File loaded successfully!');
            }
        } catch (error) {
            console.error('Failed to load file:', error);
            alert('Failed to load file. Make sure it is a valid JSON file.');
        }
        
        // Reset file input so the same file can be loaded again
        event.target.value = '';
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
}

// DailyResetManager.js - Daily reset logic for repeating tasks
// Extracted from DataManager.js for reusability and maintainability

import { ItemHierarchy } from './ItemHierarchy.js';
import { dataTransformer } from './DataTransformer.js';
import { dataPersistence } from './DataPersistence.js';
import { audioArchiveManager } from './AudioArchiveManager.js';

/**
 * DailyResetManager - Handles daily reset of repeating tasks
 */
export class DailyResetManager {
    constructor(dataManager) {
        this.dataManager = dataManager;
        this.lastResetKey = 'twodo-last-reset';
    }
    
    /**
     * Check and perform daily reset if needed
     * @param {string} storageKey - Storage key for data
     */
    checkDailyReset(storageKey) {
        const today = new Date().toDateString();
        const lastReset = localStorage.getItem(this.lastResetKey);
        
        if (lastReset !== today) {
            // Reset all repeating tasks
            const storedData = dataTransformer.normalizeDataModel(dataPersistence.loadFromStorage(storageKey));
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
                                audioArchiveManager.archiveAudioRecording(documentId, itemIndex, item.audioFile, item.date);
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
                
                // Persist reset data directly; do not set appState.documents here
                // (that would trigger ActiveSetManager before load function is set).
                // loadData() will run next and load the reset data from storage.
                dataPersistence.saveToStorage(storageKey, storedData);
            }
            localStorage.setItem(this.lastResetKey, today);
        }
    }
}

// BinManager.js - Handles bin-related operations (renamed from PageManager)
import { eventBus } from '../core/EventBus.js';
import { EVENTS } from '../core/AppEvents.js';
import { getService, SERVICES, hasService } from '../core/AppServices.js';

export class BinManager {
    constructor() {
    }
    
    /**
     * Get services
     */
    _getAppState() {
        return getService(SERVICES.APP_STATE);
    }
    
    _getUndoRedoManager() {
        return getService(SERVICES.UNDO_REDO_MANAGER);
    }
    
    _getDataManager() {
        return getService(SERVICES.DATA_MANAGER);
    }
    
    _getBinPluginManager() {
        return getService(SERVICES.BIN_PLUGIN_MANAGER);
    }
    
    async addBin(pageId, afterBinId = null) {
        const appState = this._getAppState();
        const document = appState.documents.find(p => p.id === pageId);
        if (!document) return;

        if (!document.groups) {
            document.groups = [];
        }

        // Generate unique group ID that doesn't conflict with existing groups
        let binId;
        let counter = 0;
        do {
            binId = `bin-${counter}`;
            counter++;
        } while (document.groups.some(b => b.id === binId));

        const binNum = document.groups.length + 1;
        const newGroup = {
            id: binId,
            title: `Group ${binNum}`,
            items: [],
            plugins: [],
            format: null,
            config: {}
        };
        
        // Insert bin at specific position if afterBinId is provided
        let binIndex;
        if (afterBinId) {
            const afterBinIndex = document.groups.findIndex(b => b.id === afterBinId);
            if (afterBinIndex !== -1) {
                // Insert after the specified bin
                binIndex = afterBinIndex + 1;
                document.groups.splice(binIndex, 0, newGroup);
            } else {
                // Bin not found, just append
                binIndex = document.groups.length;
                document.groups.push(newGroup);
            }
        } else {
            // No position specified, append to end
            binIndex = document.groups.length;
            document.groups.push(newGroup);
        }
        
        // Record undo/redo change
        const undoRedoManager = this._getUndoRedoManager();
        if (undoRedoManager) {
            undoRedoManager.recordBinAdd(pageId, binIndex, newGroup);
        }
        
        // Initialize plugins for new bin
        const binPluginManager = this._getBinPluginManager();
        if (binPluginManager) {
            await binPluginManager.initializeBinPlugins(pageId, binId);
        }
        
        // Emit event
        eventBus.emit(EVENTS.BIN.CREATED, { pageId, documentId: pageId, binId, groupId: binId, bin: newGroup, group: newGroup });
        
        const dataManager = this._getDataManager();
        if (dataManager) {
            dataManager.saveData();
        }
        eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
    }
    
    async deleteBin(pageId, binId) {
        const appState = this._getAppState();
        const document = appState.documents.find(p => p.id === pageId);
        if (!document || !document.groups) return;
        
        const group = document.groups.find(b => b.id === binId);
        if (!group) return;
        
        // Record undo/redo change before deletion
        const undoRedoManager = this._getUndoRedoManager();
        if (undoRedoManager) {
            undoRedoManager.recordBinDelete(pageId, binId, JSON.parse(JSON.stringify(group)));
        }
        
        // Cleanup plugins for bin
        const binPluginManager = this._getBinPluginManager();
        if (binPluginManager) {
            await binPluginManager.cleanupBinPlugins(pageId, binId);
        }
        
        // Emit event before deletion
        eventBus.emit(EVENTS.BIN.DELETED, { pageId, documentId: pageId, binId, groupId: binId });
        
        document.groups = document.groups.filter(b => b.id !== binId);
        
        // If no groups left, create a default one
        if (document.groups.length === 0) {
            const defaultGroup = {
                id: 'bin-0',
                title: 'Group 1',
                items: []
            };
            document.groups = [defaultGroup];
            
            // Record addition of default bin
            if (undoRedoManager) {
                undoRedoManager.recordBinAdd(pageId, 0, defaultGroup);
            }
        }
        
        const dataManager = this._getDataManager();
        if (dataManager) {
            dataManager.saveData();
        }
        eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
    }
    
    moveBin(sourcePageId, sourceBinId, targetPageId, targetBinId) {
        if (sourcePageId === targetPageId && sourceBinId === targetBinId) return;
        
        const appState = this._getAppState();
        const sourcePage = appState.documents.find(p => p.id === sourcePageId);
        const targetPage = appState.documents.find(p => p.id === targetPageId);
        
        if (!sourcePage || !targetPage || !sourcePage.groups || !targetPage.groups) return;
        
        const sourceBin = sourcePage.groups.find(b => b.id === sourceBinId);
        const targetBin = targetPage.groups.find(b => b.id === targetBinId);
        
        if (!sourceBin || !targetBin) return;
        
        const sourceIndex = sourcePage.groups.indexOf(sourceBin);
        const targetIndex = targetPage.groups.indexOf(targetBin);
        
        // Remove from source
        sourcePage.groups.splice(sourceIndex, 1);
        
        // Insert at target (adjust if same page and source was before target)
        if (sourcePageId === targetPageId) {
            const insertIndex = sourceIndex < targetIndex ? targetIndex - 1 : targetIndex;
            targetPage.groups.splice(insertIndex, 0, sourceBin);
        } else {
            targetPage.groups.splice(targetIndex, 0, sourceBin);
        }
        
        const dataManager = this._getDataManager();
        if (dataManager) {
            dataManager.saveData();
        }
        requestAnimationFrame(() => {
            eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
        });
    }
}


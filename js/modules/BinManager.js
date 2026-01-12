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
        const page = appState.pages.find(p => p.id === pageId);
        if (!page) return;

        if (!page.bins) {
            page.bins = [];
        }

        // Generate unique bin ID that doesn't conflict with existing bins
        let binId;
        let counter = 0;
        do {
            binId = `bin-${counter}`;
            counter++;
        } while (page.bins.some(b => b.id === binId));

        const binNum = page.bins.length + 1;
        const newBin = {
            id: binId,
            title: `Bin ${binNum}`,
            elements: [],
            plugins: [],
            format: null,
            config: {}
        };
        
        // Insert bin at specific position if afterBinId is provided
        let binIndex;
        if (afterBinId) {
            const afterBinIndex = page.bins.findIndex(b => b.id === afterBinId);
            if (afterBinIndex !== -1) {
                // Insert after the specified bin
                binIndex = afterBinIndex + 1;
                page.bins.splice(binIndex, 0, newBin);
            } else {
                // Bin not found, just append
                binIndex = page.bins.length;
                page.bins.push(newBin);
            }
        } else {
            // No position specified, append to end
            binIndex = page.bins.length;
            page.bins.push(newBin);
        }
        
        // Record undo/redo change
        const undoRedoManager = this._getUndoRedoManager();
        if (undoRedoManager) {
            undoRedoManager.recordBinAdd(pageId, binIndex, newBin);
        }
        
        // Initialize plugins for new bin
        const binPluginManager = this._getBinPluginManager();
        if (binPluginManager) {
            await binPluginManager.initializeBinPlugins(pageId, binId);
        }
        
        // Emit event
        eventBus.emit(EVENTS.BIN.CREATED, { pageId, binId, bin: newBin });
        
        const dataManager = this._getDataManager();
        if (dataManager) {
            dataManager.saveData();
        }
        eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
    }
    
    async deleteBin(pageId, binId) {
        const appState = this._getAppState();
        const page = appState.pages.find(p => p.id === pageId);
        if (!page || !page.bins) return;
        
        const bin = page.bins.find(b => b.id === binId);
        if (!bin) return;
        
        // Record undo/redo change before deletion
        const undoRedoManager = this._getUndoRedoManager();
        if (undoRedoManager) {
            undoRedoManager.recordBinDelete(pageId, binId, JSON.parse(JSON.stringify(bin)));
        }
        
        // Cleanup plugins for bin
        const binPluginManager = this._getBinPluginManager();
        if (binPluginManager) {
            await binPluginManager.cleanupBinPlugins(pageId, binId);
        }
        
        // Emit event before deletion
        eventBus.emit(EVENTS.BIN.DELETED, { pageId, binId });
        
        page.bins = page.bins.filter(b => b.id !== binId);
        
        // If no bins left, create a default one
        if (page.bins.length === 0) {
            const defaultBin = {
                id: 'bin-0',
                title: 'Bin 1',
                elements: []
            };
            page.bins = [defaultBin];
            
            // Record addition of default bin
            if (undoRedoManager) {
                undoRedoManager.recordBinAdd(pageId, 0, defaultBin);
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
        const sourcePage = appState.pages.find(p => p.id === sourcePageId);
        const targetPage = appState.pages.find(p => p.id === targetPageId);
        
        if (!sourcePage || !targetPage || !sourcePage.bins || !targetPage.bins) return;
        
        const sourceBin = sourcePage.bins.find(b => b.id === sourceBinId);
        const targetBin = targetPage.bins.find(b => b.id === targetBinId);
        
        if (!sourceBin || !targetBin) return;
        
        const sourceIndex = sourcePage.bins.indexOf(sourceBin);
        const targetIndex = targetPage.bins.indexOf(targetBin);
        
        // Remove from source
        sourcePage.bins.splice(sourceIndex, 1);
        
        // Insert at target (adjust if same page and source was before target)
        if (sourcePageId === targetPageId) {
            const insertIndex = sourceIndex < targetIndex ? targetIndex - 1 : targetIndex;
            targetPage.bins.splice(insertIndex, 0, sourceBin);
        } else {
            targetPage.bins.splice(targetIndex, 0, sourceBin);
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


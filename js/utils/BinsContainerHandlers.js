// BinsContainerHandlers.js - Handles bins container events and drag/drop
import { eventBus } from '../core/EventBus.js';
import { EVENTS } from '../core/AppEvents.js';
import { EventHelper } from './EventHelper.js';
import { getService, SERVICES } from '../core/AppServices.js';

export class BinsContainerHandlers {
    constructor(eventHandler) {
        this.eventHandler = eventHandler;
    }
    
    _getContextMenuHandler() {
        return getService(SERVICES.CONTEXT_MENU_HANDLER);
    }
    
    _getAppState() {
        return getService(SERVICES.APP_STATE);
    }
    
    _getDataManager() {
        return getService(SERVICES.DATA_MANAGER);
    }
    
    _getBinManager() {
        return getService(SERVICES.BIN_MANAGER);
    }
    
    /**
     * Setup bins container event handlers
     */
    setupBinsContainerHandlers() {
        const binsContainer = document.getElementById('bins-container');
        if (!binsContainer) {
            console.warn('bins-container not found, skipping container event listeners');
            return;
        }
        
        // Handle right-click on bins container (empty area) for bin-level menu
        const handleBinsContainerMenu = (e) => {
            // Show page context menu for empty bins container area (not on a bin, element, or header)
            if (!e.target.closest('.bin') && !e.target.closest('.element')) {
                e.preventDefault();
                e.stopPropagation();
                const contextMenuHandler = this._getContextMenuHandler();
                if (contextMenuHandler) {
                    contextMenuHandler.showPageContextMenu(e);
                }
            }
        };
        binsContainer.addEventListener('contextmenu', handleBinsContainerMenu);
        
        // Use EventHelper for double-click detection on bins container
        const appState = this._getAppState();
        const handlePageContainerMenu = (e) => {
            // This should be implemented in EventHandler or delegated
            if (this.eventHandler && typeof this.eventHandler.handlePageContainerMenu === 'function') {
                this.eventHandler.handlePageContainerMenu(e);
            }
        };
        
        EventHelper.setupDoubleClick(
            binsContainer,
            (e) => {
                // Only trigger on empty area, not on interactive elements
                if (!e.target.closest('.page') && !e.target.closest('.element') && 
                    !e.target.closest('input') && !e.target.closest('button')) {
                    // Double click detected
                    handlePageContainerMenu(e);
                }
            },
            appState.doubleClickDelay,
            {
                filter: (e) => {
                    // Only process clicks on empty area
                    return !e.target.closest('.page') && !e.target.closest('.element') && 
                           !e.target.closest('input') && !e.target.closest('button');
                }
            }
        );
    }
    
    /**
     * Setup drag and drop handlers for bins container
     */
    setupBinsContainerDragDrop() {
        const binsContainer = document.getElementById('bins-container');
        if (!binsContainer) return;
        
        binsContainer.addEventListener('dragover', (e) => {
            // Check if dragging files
            if (e.dataTransfer.types.includes('Files')) {
                e.preventDefault();
                e.stopPropagation();
                e.dataTransfer.dropEffect = 'copy';
                binsContainer.classList.add('drag-over');
                return;
            }
            
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            
            const appState = this._getAppState();
            const dragData = appState.dragData || (() => {
                try {
                    return JSON.parse(e.dataTransfer.getData('text/plain') || '{}');
                } catch {
                    return {};
                }
            })();
            
            if (dragData.type === 'bin') {
                // Find the bin we're hovering over
                const binElement = e.target.closest('.bin');
                if (binElement) {
                    binElement.classList.add('drag-over');
                } else if (!e.target.closest('.bin')) {
                    // Hovering over empty space, add class to container
                    binsContainer.classList.add('drag-over');
                }
            }
        });
        
        binsContainer.addEventListener('dragleave', (e) => {
            // Only remove if we're leaving the container itself
            if (!binsContainer.contains(e.relatedTarget)) {
                binsContainer.classList.remove('drag-over');
                document.querySelectorAll('.bin.drag-over').forEach(el => {
                    el.classList.remove('drag-over');
                });
            }
        });
        
        binsContainer.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // Check if dropping files
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                Array.from(e.dataTransfer.files).forEach(file => {
                    if (this.eventHandler && typeof this.eventHandler.processDroppedFile === 'function') {
                        this.eventHandler.processDroppedFile(file);
                    }
                });
                return;
            }
            
            const appState = this._getAppState();
            let dragData = appState.dragData;
            if (!dragData) {
                try {
                    const dataStr = e.dataTransfer.getData('text/plain');
                    if (dataStr) {
                        dragData = JSON.parse(dataStr);
                    } else {
                        console.error('No drag data available');
                        return;
                    }
                } catch (err) {
                    console.error('Failed to parse drag data:', err);
                    return;
                }
            }
            
            if (dragData && dragData.type === 'bin') {
                const binElement = e.target.closest('.bin');
                if (binElement) {
                    const targetPageId = binElement.dataset.pageId;
                    const targetBinId = binElement.dataset.binId;
                    const binManager = this._getBinManager();
                    if (binManager) {
                        binManager.moveBin(dragData.pageId, dragData.binId, targetPageId, targetBinId);
                    }
                } else {
                    // Dropped on empty space, move to end of current page
                    const page = appState.documents.find(p => p.id === dragData.pageId);
                    if (page) {
                        const bin = page.groups?.find(b => b.id === dragData.binId);
                        if (bin) {
                            const sourceIndex = page.groups.indexOf(bin);
                            page.groups.splice(sourceIndex, 1);
                            page.groups.push(bin);
                            const dataManager = this._getDataManager();
                            if (dataManager) {
                                dataManager.saveData();
                            }
                            eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
                        }
                    }
                }
                
                // Clean up drag-over classes
                binsContainer.classList.remove('drag-over');
                document.querySelectorAll('.drag-over').forEach(el => {
                    el.classList.remove('drag-over');
                });
            }
            
            // Clear dragData after processing
            appState.dragData = null;
        });
    }
}

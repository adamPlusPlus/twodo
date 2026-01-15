// EventHandler.js - Sets up all event listeners
import { eventBus } from '../core/EventBus.js';
import { EVENTS } from '../core/AppEvents.js';
import { EventHelper } from '../utils/EventHelper.js';
import { getService, SERVICES, hasService } from '../core/AppServices.js';

export class EventHandler {
    constructor(app = null) {
        this.app = app;
    }
    
    /**
     * Get services
     */
    _getDataManager() {
        return getService(SERVICES.DATA_MANAGER);
    }
    
    _getFileManager() {
        return getService(SERVICES.FILE_MANAGER);
    }
    
    _getElementManager() {
        return getService(SERVICES.ELEMENT_MANAGER);
    }
    
    _getModalHandler() {
        return getService(SERVICES.MODAL_HANDLER);
    }
    
    _getBinManager() {
        return getService(SERVICES.BIN_MANAGER);
    }
    
    _getAppState() {
        return getService(SERVICES.APP_STATE);
    }
    
    _getContextMenuHandler() {
        return getService(SERVICES.CONTEXT_MENU_HANDLER);
    }
    
    setupEventListeners() {
        // Flush pending autosave before page unload
        window.addEventListener('beforeunload', async (e) => {
            const dataManager = this._getDataManager();
            if (dataManager && typeof dataManager.flushPendingSave === 'function') {
                // Use sendBeacon or synchronous XHR for reliable save on unload
                // For now, try to flush but don't block unload
                dataManager.flushPendingSave().catch(err => {
                    console.warn('[EventHandler] Failed to flush pending save on unload:', err);
                });
            }
        });
        
        // Also flush on visibility change (tab switch, minimize, etc.)
        document.addEventListener('visibilitychange', async () => {
            if (document.hidden) {
                const dataManager = this._getDataManager();
                if (dataManager && typeof dataManager.flushPendingSave === 'function') {
                    dataManager.flushPendingSave().catch(err => {
                        console.warn('[EventHandler] Failed to flush pending save on visibility change:', err);
                    });
                }
            }
        });
        const loadDefaultBtn = document.getElementById('load-default');
        if (loadDefaultBtn) {
            loadDefaultBtn.addEventListener('click', () => {
                const dataManager = this._getDataManager();
                if (dataManager) {
                    dataManager.loadDefaultFile();
                }
            });
        }
        
        const fileManagerBtn = document.getElementById('file-manager');
        if (fileManagerBtn) {
            fileManagerBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent event from bubbling to document click handler
                const fileManager = this._getFileManager();
                if (fileManager) {
                    fileManager.showFileManager();
                }
            }, true); // Use capture phase to ensure this runs first
        }
        
        const saveDefaultBtn = document.getElementById('save-default');
        if (saveDefaultBtn) {
            saveDefaultBtn.addEventListener('click', () => {
                const dataManager = this._getDataManager();
                if (dataManager) {
                    dataManager.saveAsDefault();
                }
            });
        }
        
        // Keep file input for backward compatibility (load from local file)
        const fileInput = document.getElementById('file-input');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                const dataManager = this._getDataManager();
                if (dataManager) {
                    dataManager.loadFromFile(e);
                }
            });
        }
        
        // File input for images/JSON
        const fileInputImagesJson = document.getElementById('file-input-images-json');
        const openFilesBtn = document.getElementById('open-files');
        if (openFilesBtn && fileInputImagesJson) {
            openFilesBtn.addEventListener('click', () => {
                fileInputImagesJson.click();
            });
        }
        
        if (fileInputImagesJson) {
            fileInputImagesJson.addEventListener('change', (e) => {
                this.handleFileInput(e);
            });
        }
        
        // Audio recording button
        const recordAudioBtn = document.getElementById('record-audio');
        if (recordAudioBtn) {
            recordAudioBtn.addEventListener('click', () => {
                const audioHandler = this._getAudioHandler();
                if (audioHandler) {
                    audioHandler.showAudioRecordingModal();
                }
            });
        }
        
        // Undo button
        const undoBtn = document.getElementById('undo-btn');
        if (undoBtn) {
            undoBtn.addEventListener('click', () => {
                const undoRedoManager = this._getUndoRedoManager();
                if (undoRedoManager) {
                    const success = undoRedoManager.undo();
                    if (!success) {
                        console.log('Nothing to undo');
                    }
                }
            });
        }
        
        // Redo button
        const redoBtn = document.getElementById('redo-btn');
        if (redoBtn) {
            redoBtn.addEventListener('click', () => {
                const undoRedoManager = this._getUndoRedoManager();
                if (undoRedoManager) {
                    const success = undoRedoManager.redo();
                    if (!success) {
                        console.log('Nothing to redo');
                    }
                }
            });
        }
        
        // Header pin button (toggle fixed header)
        const headerPinBtn = document.getElementById('header-pin-btn');
        if (headerPinBtn) {
            // Load saved preference
            const isFixed = localStorage.getItem('headerFixed') === 'true';
            if (isFixed) {
                document.querySelector('header').classList.add('header-fixed');
                document.body.classList.add('header-fixed-active');
                headerPinBtn.textContent = '📍'; // Pinned icon
                headerPinBtn.title = 'Unpin header (scrolls with page)';
            }
            
            headerPinBtn.addEventListener('click', () => {
                const header = document.querySelector('header');
                const isCurrentlyFixed = header.classList.contains('header-fixed');
                
                if (isCurrentlyFixed) {
                    // Unpin: remove fixed positioning
                    header.classList.remove('header-fixed');
                    document.body.classList.remove('header-fixed-active');
                    headerPinBtn.textContent = '📌'; // Unpinned icon
                    headerPinBtn.title = 'Pin header to top of window';
                    localStorage.setItem('headerFixed', 'false');
                } else {
                    // Pin: add fixed positioning
                    header.classList.add('header-fixed');
                    document.body.classList.add('header-fixed-active');
                    headerPinBtn.textContent = '📍'; // Pinned icon
                    headerPinBtn.title = 'Unpin header (scrolls with page)';
                    localStorage.setItem('headerFixed', 'true');
                }
            });
        }
        
        // Settings button
        const settingsBtn = document.getElementById('settings-btn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => {
                const settingsManager = getService(SERVICES.SETTINGS_MANAGER);
                if (settingsManager) {
                    settingsManager.showSettingsModal();
                }
            });
        }
        
        // Settings modal close button
        const settingsCloseBtn = document.getElementById('settings-close');
        if (settingsCloseBtn) {
            settingsCloseBtn.addEventListener('click', () => {
                const settingsManager = getService(SERVICES.SETTINGS_MANAGER);
                if (settingsManager) {
                    settingsManager.closeSettingsModal();
                }
            });
        }
        
        // Close settings modal when clicking outside
        const settingsModal = document.getElementById('settings-modal');
        if (settingsModal) {
            settingsModal.addEventListener('click', (e) => {
                if (e.target.id === 'settings-modal') {
                    const settingsManager = getService(SERVICES.SETTINGS_MANAGER);
                if (settingsManager) {
                    settingsManager.closeSettingsModal();
                }
                }
            });
        }
        
        // Dropdown menu toggle
        const dropdownToggle = document.querySelector('.dropdown-toggle');
        const dropdownMenu = document.querySelector('.dropdown-menu');
        
        if (dropdownToggle && dropdownMenu) {
            const toggleMenu = () => {
                const isActive = dropdownMenu.classList.toggle('active');
                dropdownToggle.classList.toggle('active', isActive);
            };
            
            dropdownToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleMenu();
            });
            
            // Close dropdown when clicking outside
            document.addEventListener('click', (e) => {
                if (!e.target.closest('.dropdown')) {
                    dropdownMenu.classList.remove('active');
                    dropdownToggle.classList.remove('active');
                }
            });
            
            // Close dropdown when clicking on menu items
            // Use capture phase to ensure this runs after specific button handlers
            dropdownMenu.querySelectorAll('button').forEach(button => {
                button.addEventListener('click', (e) => {
                    // Only close if this isn't the file-manager button (it has its own handler)
                    if (button.id !== 'file-manager') {
                        dropdownMenu.classList.remove('active');
                        dropdownToggle.classList.remove('active');
                    } else {
                        // For file-manager, close dropdown after a short delay to allow handler to fire
                        setTimeout(() => {
                            dropdownMenu.classList.remove('active');
                            dropdownToggle.classList.remove('active');
                        }, 100);
                    }
                }, true); // Use capture phase
            });
        }
        
        // Context menu event listeners
        document.getElementById('context-edit').addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('[EventHandler] context-edit clicked');
            const app = this.app || window.app;
            if (app && app.handleContextEdit) {
                app.handleContextEdit();
            } else {
                console.error('[EventHandler] app.handleContextEdit not available', { hasThisApp: !!this.app, hasWindowApp: !!window.app });
            }
        });
        
        const customizeVisualsBtn = document.getElementById('context-customize-visuals');
        if (customizeVisualsBtn) {
            customizeVisualsBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const app = this.app || window.app;
                if (app && app.handleContextCustomizeVisuals) {
                    app.handleContextCustomizeVisuals();
                }
            });
        }
        
        document.getElementById('context-view-data').addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const app = this.app || window.app;
            if (app && app.handleContextViewData) {
                app.handleContextViewData();
            }
        });
        
        document.getElementById('context-add-element').addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const app = this.app || window.app;
            if (app && app.handleContextAddElement) {
                app.handleContextAddElement();
            }
        });
        
        document.getElementById('context-add-child-element').addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const app = this.app || window.app;
            if (app && app.handleContextAddChildElement) {
                app.handleContextAddChildElement();
            }
        });
        
        document.getElementById('context-add-element-page').addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const app = this.app || window.app;
            if (app && app.handleContextAddElementPage) {
                app.handleContextAddElementPage();
            }
        });
        
        document.getElementById('context-delete-element').addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const app = this.app || window.app;
            if (app && app.handleContextDeleteElement) {
                app.handleContextDeleteElement();
            }
        });
        
        document.getElementById('context-collapse-page').addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const app = this.app || window.app;
            if (app && app.handleContextCollapsePage) {
                app.handleContextCollapsePage();
            }
        });
        
        document.getElementById('context-add-page').addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const app = this.app || window.app;
            if (app && app.handleContextAddPage) {
                app.handleContextAddPage();
            }
        });
        
        document.getElementById('context-add-bin').addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const app = this.app || window.app;
            if (app && app.handleContextAddBin) {
                app.handleContextAddBin();
            }
        });
        
        document.getElementById('context-delete-bin').addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const app = this.app || window.app;
            if (app && app.handleContextDeleteBin) {
                app.handleContextDeleteBin();
            }
        });
        
        document.getElementById('context-delete-page').addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const app = this.app || window.app;
            if (app && app.handleContextDeletePage) {
                app.handleContextDeletePage();
            }
        });
        
        document.getElementById('context-toggle-subtasks').addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const app = this.app || window.app;
            if (app && app.handleContextToggleSubtasks) {
                app.handleContextToggleSubtasks();
            }
        });
        
        document.getElementById('context-reset-day').addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const app = this.app || window.app;
            if (app && app.handleContextResetDay) {
                app.handleContextResetDay();
            }
        });
        
        document.getElementById('context-collapse-all-pages').addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const app = this.app || window.app;
            if (app && app.handleContextCollapseAllPages) {
                app.handleContextCollapseAllPages();
            }
        });
        
        // Close context menu on outside click (use capture phase to run early)
        document.addEventListener('click', (e) => {
            const contextMenuHandler = this._getContextMenuHandler();
            if (!contextMenuHandler) return;
            
            const appState = this._getAppState();
            const menu = document.getElementById('context-menu');
            
            // Only process if context menu is visible
            if (!menu || !menu.classList.contains('active')) {
                // Track active page when clicking on pages
                const pageElement = e.target.closest('.page');
                if (pageElement) {
                    appState.currentPageId = pageElement.dataset.pageId;
                }
                return;
            }
            
            // Don't close if clicking on the context menu or its items
            if (e.target.closest('.context-menu')) {
                return;
            }
            
            // Click is outside the context menu - hide it
            contextMenuHandler.hideContextMenu();
            
            // Track active page when clicking on pages
            const pageElement = e.target.closest('.page');
            if (pageElement) {
                appState.currentPageId = pageElement.dataset.pageId;
            }
        }, true); // Use capture phase to ensure this runs before other handlers
        
        // Keyboard shortcuts for adding elements
        document.addEventListener('keydown', (e) => {
            // Only trigger if not typing in an input/textarea
            if (e.target.tagName === 'INPUT' || 
                e.target.tagName === 'TEXTAREA' || 
                e.target.closest('.modal')) {
                return;
            }
            
            // Don't trigger if editing a page title
            if (e.target.classList.contains('page-title') && e.target.contentEditable === 'true') {
                return;
            }
            
            // Ctrl+Shift+1-5 for adding element types
            if (e.ctrlKey && e.shiftKey) {
                const types = {
                    '1': 'task',
                    '2': 'header-checkbox',
                    '3': 'header-checkbox',
                    '4': 'multi-checkbox',
                    '5': 'one-time'
                };
                
                if (types[e.key]) {
                    e.preventDefault();
                    // Use active page or first page
                    const appState = this._getAppState();
                    const targetPageId = appState.currentPageId || (appState.pages.length > 0 ? appState.pages[0].id : null);
                    const targetBinId = appState.activeBinId || (appState.pages.find(p => p.id === targetPageId)?.bins?.[0]?.id || null);
                    if (targetPageId && targetBinId) {
                        const elementManager = this._getElementManager();
                        if (elementManager) {
                            elementManager.addElement(targetPageId, targetBinId, types[e.key]);
                        }
                    }
                }
            }
            
            // Ctrl+N for adding element (shows modal)
            if (e.ctrlKey && e.key === 'n') {
                e.preventDefault();
                const appState = this._getAppState();
                const targetPageId = this.app?.activePageId || (appState.pages.length > 0 ? appState.pages[0].id : null);
                const targetBinId = this.app?.activeBinId || (appState.pages.find(p => p.id === targetPageId)?.bins?.[0]?.id || null);
                if (targetPageId && targetBinId) {
                    const modalHandler = this._getModalHandler();
                    if (modalHandler) {
                        modalHandler.showAddElementModal(targetPageId, targetBinId);
                    }
                }
            }
            
            // Ctrl+Z for undo
            if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                if (this.app.undoRedoManager) {
                    this.app.undoRedoManager.undo();
                }
            }
            
            // Ctrl+Shift+Z or Ctrl+Y for redo
            if ((e.ctrlKey && e.shiftKey && e.key === 'z') || (e.ctrlKey && e.key === 'y')) {
                e.preventDefault();
                if (this.app.undoRedoManager) {
                    this.app.undoRedoManager.redo();
                }
            }
        });
        
        // Handle right-click on bins container (empty area) for bin-level menu
        const binsContainer = document.getElementById('bins-container');
        if (!binsContainer) {
            console.warn('bins-container not found, skipping container event listeners');
            return;
        }
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
        
        // Drag and drop handlers for bins-container
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
        
        // File drag and drop on bins container (handled in drop event above)
        
        binsContainer.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // Check if dropping files
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                Array.from(e.dataTransfer.files).forEach(file => {
                    this.processDroppedFile(file);
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
                    const page = appState.pages.find(p => p.id === dragData.pageId);
                    if (page) {
                        const bin = page.bins?.find(b => b.id === dragData.binId);
                        if (bin) {
                            const sourceIndex = page.bins.indexOf(bin);
                            page.bins.splice(sourceIndex, 1);
                            page.bins.push(bin);
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
        
        // Close context menu on left-click anywhere
        document.addEventListener('click', (e) => {
            const contextMenuHandler = this._getContextMenuHandler();
            if (contextMenuHandler) {
                contextMenuHandler.hideContextMenu();
            }
        });

        // Unified contextmenu handler - routes to appropriate ContextMenuHandler methods
        document.addEventListener('contextmenu', (e) => {
            const target = e.target;
            const binsContainer = document.getElementById('bins-container');
            
            // Find the closest element, bin, or page tab
            const elementElement = target.closest('.element');
            const binElement = target.closest('.bin');
            const pageTabElement = target.closest('.page-tab');
            
            // Route to appropriate handler
            if (elementElement) {
                // Element context menu
                const appState = this._getAppState();
                const pageId = elementElement.dataset.pageId || appState.currentPageId;
                const binId = elementElement.dataset.binId;
                const elementIndexStr = elementElement.dataset.elementIndex;
                const elementIndex = elementIndexStr !== undefined && elementIndexStr !== '' ? parseInt(elementIndexStr, 10) : null;
                const contextMenuHandler = this._getContextMenuHandler();
                if (contextMenuHandler) {
                    contextMenuHandler.showContextMenu(e, pageId, binId, elementIndex);
                }
                return;
            }
            
            if (binElement && !elementElement) {
                // Bin context menu
                const pageId = binElement.dataset.pageId || appState.currentPageId;
                const binId = binElement.dataset.binId;
                const contextMenuHandler = this._getContextMenuHandler();
                if (contextMenuHandler) {
                    contextMenuHandler.showBinContextMenu(e, pageId, binId);
                }
                return;
            }
            
            if (pageTabElement) {
                // Page tab context menu
                const pageId = pageTabElement.dataset.pageId;
                const contextMenuHandler = this._getContextMenuHandler();
                if (contextMenuHandler) {
                    contextMenuHandler.showPageContextMenu(e, pageId);
                }
                return;
            }
            
            // Empty area context menu (bins container or app area)
            if (binsContainer) {
                const contextMenuHandler = this._getContextMenuHandler();
                if (contextMenuHandler) {
                    contextMenuHandler.showPageContextMenu(e);
                }
                return;
            }
            
            // If no specific handler, hide any active context menu
            const contextMenuHandler = getService(SERVICES.CONTEXT_MENU_HANDLER);
            if (contextMenuHandler) {
                contextMenuHandler.hideContextMenu();
            }
        }, true); // Use capture phase
        
        // Touch gesture handlers for mobile two-finger context menu
        const touchGestureHandler = getService(SERVICES.TOUCH_GESTURE_HANDLER);
        if (touchGestureHandler) {
            touchGestureHandler.setupTouchGestures();
            
            // Swipe gesture handlers for mobile
            touchGestureHandler.setupSwipeGestures();
        }
        
        // Modal close handlers
        // Store the current edit info for the close button
        let currentEditInfo = null;
        
        document.querySelector('.modal-close').addEventListener('click', () => {
            // Use currentEdit if available, otherwise try to find it from the modal
            const appState = this._getAppState();
            const currentEdit = appState.currentEditModal;
            if (currentEdit && currentEdit.pageId && currentEdit.elementIndex !== undefined) {
                const modalHandler = this._getModalHandler();
                if (modalHandler && currentEdit) {
                    modalHandler.saveEdit(currentEdit.pageId, currentEdit.elementIndex);
                }
            } else if (currentEditInfo) {
                const modalHandler = this._getModalHandler();
                if (modalHandler) {
                    modalHandler.saveEdit(currentEditInfo.pageId, currentEditInfo.elementIndex);
                }
            } else {
                // Fallback: close modal
                const modalHandler = this._getModalHandler();
                if (modalHandler) {
                    modalHandler.closeModal();
                }
            }
        });
        
        // Track mouse down location to prevent closing when clicking inside and releasing outside
        let modalMouseDownTarget = null;
        const modalElement = document.getElementById('modal');
        
        modalElement.addEventListener('mousedown', (e) => {
            // Track what element was clicked on mousedown
            modalMouseDownTarget = e.target;
        });
        
        modalElement.addEventListener('click', (e) => {
            // Only close if both mousedown and click were on the modal background (not modal-content)
            // This prevents closing when clicking inside and releasing outside
            if (e.target.id === 'modal' && modalMouseDownTarget && modalMouseDownTarget.id === 'modal') {
                const modalHandler = this._getModalHandler();
                if (modalHandler) {
                    modalHandler.closeModal();
                }
            }
            modalMouseDownTarget = null; // Reset
        });
        
        // Auto-scroll during drag when near screen edges
        document.addEventListener('dragover', (e) => {
            const appState = this._getAppState();
            if (!appState.isDragging) return;
            
            const edgeThreshold = 50; // Distance from edge to trigger scrolling
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            const mouseX = e.clientX;
            const mouseY = e.clientY;
            
            let scrollX = 0;
            let scrollY = 0;
            
            // Check horizontal edges
            if (mouseX < edgeThreshold) {
                scrollX = -appState.edgeScrollSpeed;
            } else if (mouseX > viewportWidth - edgeThreshold) {
                scrollX = appState.edgeScrollSpeed;
            }
            
            // Check vertical edges
            if (mouseY < edgeThreshold) {
                scrollY = -appState.edgeScrollSpeed;
            } else if (mouseY > viewportHeight - edgeThreshold) {
                scrollY = appState.edgeScrollSpeed;
            }
            
            // Apply scrolling
            if (scrollX !== 0 || scrollY !== 0) {
                // Clear existing interval
                if (appState.autoScrollInterval) {
                    clearInterval(appState.autoScrollInterval);
                }
                
                // Start continuous scrolling
                appState.autoScrollInterval = setInterval(() => {
                    if (!appState.isDragging) {
                        clearInterval(appState.autoScrollInterval);
                        appState.autoScrollInterval = null;
                        return;
                    }
                    
                    const container = document.getElementById('bins-container');
                    if (container) {
                        if (scrollX !== 0) {
                            container.scrollLeft += scrollX;
                        }
                        if (scrollY !== 0) {
                            container.scrollTop += scrollY;
                        }
                    } else {
                        // Fallback to window scroll
                        if (scrollX !== 0) {
                            window.scrollBy(scrollX, 0);
                        }
                        if (scrollY !== 0) {
                            window.scrollBy(0, scrollY);
                        }
                    }
                }, 16); // ~60fps
            } else {
                // Stop scrolling if not near edge
                if (appState.autoScrollInterval) {
                    clearInterval(appState.autoScrollInterval);
                    appState.autoScrollInterval = null;
                }
            }
        });
        
        // Middle mouse wheel scrolling during drag
        document.addEventListener('wheel', (e) => {
            const appState = this._getAppState();
            if (!appState.isDragging) return;
            
            // Check if middle mouse button is pressed (button 1)
            // Note: We can't directly check button state during wheel event,
            // so we'll track it via mousedown/mouseup
            if (appState.middleMouseDown) {
                e.preventDefault();
                
                const container = document.getElementById('pages-container');
                if (container) {
                    // Scroll horizontally if shift is held, otherwise vertically
                    if (e.shiftKey) {
                        container.scrollLeft += e.deltaY;
                    } else {
                        container.scrollTop += e.deltaY;
                    }
                } else {
                    // Fallback to window scroll
                    if (e.shiftKey) {
                        window.scrollBy(e.deltaY, 0);
                    } else {
                        window.scrollBy(0, e.deltaY);
                    }
                }
            }
        }, { passive: false });
        
        // Track middle mouse button state (reuse appState from wheel handler scope)
        // Get appState for middle mouse tracking
        const appStateForMouse = this._getAppState();
        appStateForMouse.middleMouseDown = false;
        document.addEventListener('mousedown', (e) => {
            if (e.button === 1) { // Middle mouse button
                appStateForMouse.middleMouseDown = true;
            }
        });
        
        document.addEventListener('mouseup', (e) => {
            if (e.button === 1) { // Middle mouse button
                appStateForMouse.middleMouseDown = false;
            }
        });
        
        // Also handle contextmenu event for middle mouse (some browsers)
        document.addEventListener('contextmenu', (e) => {
            if (e.button === 1) {
                e.preventDefault();
            }
        });
    }
}


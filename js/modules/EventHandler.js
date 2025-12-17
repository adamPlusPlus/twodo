// EventHandler.js - Sets up all event listeners
import { eventBus } from '../core/EventBus.js';
import { EVENTS } from '../core/AppEvents.js';

export class EventHandler {
    constructor(app) {
        this.app = app;
    }
    
    setupEventListeners() {
        const loadDefaultBtn = document.getElementById('load-default');
        if (loadDefaultBtn) {
            loadDefaultBtn.addEventListener('click', () => {
                this.app.dataManager.loadDefaultFile();
            });
        }
        
        const fileManagerBtn = document.getElementById('file-manager');
        if (fileManagerBtn) {
            fileManagerBtn.addEventListener('click', () => {
                this.app.fileManager.showFileManager();
            });
        }
        
        const saveDefaultBtn = document.getElementById('save-default');
        if (saveDefaultBtn) {
            saveDefaultBtn.addEventListener('click', () => {
                this.app.dataManager.saveAsDefault();
            });
        }
        
        // Keep file input for backward compatibility (load from local file)
        const fileInput = document.getElementById('file-input');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                this.app.dataManager.loadFromFile(e);
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
                this.app.audioHandler.showAudioRecordingModal();
            });
        }
        
        // Undo button
        const undoBtn = document.getElementById('undo-btn');
        if (undoBtn) {
            undoBtn.addEventListener('click', () => {
                if (this.app.undoRedoManager) {
                    const success = this.app.undoRedoManager.undo();
                    if (!success) {
                        console.log('Nothing to undo');
                    }
                } else {
                    console.error('UndoRedoManager not initialized');
                }
            });
        }
        
        // Redo button
        const redoBtn = document.getElementById('redo-btn');
        if (redoBtn) {
            redoBtn.addEventListener('click', () => {
                if (this.app.undoRedoManager) {
                    const success = this.app.undoRedoManager.redo();
                    if (!success) {
                        console.log('Nothing to redo');
                    }
                } else {
                    console.error('UndoRedoManager not initialized');
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
                this.app.settingsManager.showSettingsModal();
            });
        }
        
        // Settings modal close button
        const settingsCloseBtn = document.getElementById('settings-close');
        if (settingsCloseBtn) {
            settingsCloseBtn.addEventListener('click', () => {
                this.app.settingsManager.closeSettingsModal();
            });
        }
        
        // Close settings modal when clicking outside
        const settingsModal = document.getElementById('settings-modal');
        if (settingsModal) {
            settingsModal.addEventListener('click', (e) => {
                if (e.target.id === 'settings-modal') {
                    this.app.settingsManager.closeSettingsModal();
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
            dropdownMenu.querySelectorAll('button').forEach(button => {
                button.addEventListener('click', () => {
                    dropdownMenu.classList.remove('active');
                    dropdownToggle.classList.remove('active');
                });
            });
        }
        
        // Context menu event listeners
        document.getElementById('context-edit').addEventListener('click', () => {
            this.app.handleContextEdit();
        });
        
        document.getElementById('context-view-data').addEventListener('click', () => {
            this.app.handleContextViewData();
        });
        
        document.getElementById('context-add-element').addEventListener('click', () => {
            this.app.handleContextAddElement();
        });
        
        document.getElementById('context-add-child-element').addEventListener('click', () => {
            this.app.handleContextAddChildElement();
        });
        
        document.getElementById('context-add-element-page').addEventListener('click', () => {
            this.app.handleContextAddElementPage();
        });
        
        document.getElementById('context-delete-element').addEventListener('click', () => {
            this.app.handleContextDeleteElement();
        });
        
        document.getElementById('context-collapse-page').addEventListener('click', () => {
            this.app.handleContextCollapsePage();
        });
        
        document.getElementById('context-add-page').addEventListener('click', () => {
            this.app.handleContextAddPage();
        });
        
        document.getElementById('context-add-bin').addEventListener('click', () => {
            this.app.handleContextAddBin();
        });
        
        document.getElementById('context-delete-bin').addEventListener('click', () => {
            this.app.handleContextDeleteBin();
        });
        
        document.getElementById('context-delete-page').addEventListener('click', () => {
            this.app.handleContextDeletePage();
        });
        
        document.getElementById('context-toggle-subtasks').addEventListener('click', () => {
            this.app.handleContextToggleSubtasks();
        });
        
        document.getElementById('context-reset-day').addEventListener('click', () => {
            this.app.handleContextResetDay();
        });
        
        document.getElementById('context-collapse-all-pages').addEventListener('click', () => {
            this.app.handleContextCollapseAllPages();
        });
        
        // Close context menu on outside click
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.context-menu')) {
                this.app.contextMenuHandler.hideContextMenu();
            }
            // Track active page when clicking on pages
            const pageEl = e.target.closest('.page');
            if (pageEl) {
                this.app.activePageId = pageEl.dataset.pageId;
            }
        });
        
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
                    const targetPageId = this.app.activePageId || (this.app.pages.length > 0 ? this.app.pages[0].id : null);
                    const targetBinId = this.app.activeBinId || (this.app.pages.find(p => p.id === targetPageId)?.bins?.[0]?.id || null);
                    if (targetPageId && targetBinId) {
                        this.app.elementManager.addElement(targetPageId, targetBinId, types[e.key]);
                    }
                }
            }
            
            // Ctrl+N for adding element (shows modal)
            if (e.ctrlKey && e.key === 'n') {
                e.preventDefault();
                const targetPageId = this.app.activePageId || (this.app.pages.length > 0 ? this.app.pages[0].id : null);
                const targetBinId = this.app.activeBinId || (this.app.pages.find(p => p.id === targetPageId)?.bins?.[0]?.id || null);
                if (targetPageId && targetBinId) {
                    this.app.modalHandler.showAddElementModal(targetPageId, targetBinId);
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
                this.app.contextMenuHandler.showPageContextMenu(e);
            }
        };
        binsContainer.addEventListener('contextmenu', handleBinsContainerMenu);
        
        // Custom double-click detection for bins container
        let containerLastClickTime = 0;
        binsContainer.addEventListener('click', (e) => {
            // Only trigger on empty area, not on interactive elements
            if (!e.target.closest('.page') && !e.target.closest('.element') && 
                !e.target.closest('input') && !e.target.closest('button')) {
                const now = Date.now();
                const timeSinceLastClick = now - containerLastClickTime;
                
                if (timeSinceLastClick < this.app.doubleClickDelay && timeSinceLastClick > 0) {
                    // Double click detected
                    e.preventDefault();
                    e.stopPropagation();
                    containerLastClickTime = 0;
                    handlePageContainerMenu(e);
                } else {
                    containerLastClickTime = now;
                }
            }
        });
        
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
            
            const dragData = this.app.dragData || (() => {
                try {
                    return JSON.parse(e.dataTransfer.getData('text/plain') || '{}');
                } catch {
                    return {};
                }
            })();
            
            if (dragData.type === 'bin') {
                // Find the bin we're hovering over
                const binEl = e.target.closest('.bin');
                if (binEl) {
                    binEl.classList.add('drag-over');
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
            
            let dragData = this.app.dragData;
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
                const binEl = e.target.closest('.bin');
                if (binEl) {
                    const targetPageId = binEl.dataset.pageId;
                    const targetBinId = binEl.dataset.binId;
                    this.app.binManager.moveBin(dragData.pageId, dragData.binId, targetPageId, targetBinId);
                } else {
                    // Dropped on empty space, move to end of current page
                    const page = this.app.pages.find(p => p.id === dragData.pageId);
                    if (page) {
                        const bin = page.bins?.find(b => b.id === dragData.binId);
                        if (bin) {
                            const sourceIndex = page.bins.indexOf(bin);
                            page.bins.splice(sourceIndex, 1);
                            page.bins.push(bin);
                            this.app.dataManager.saveData();
                            this.app.render();
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
            this.app.dragData = null;
        });
        
        // Close context menu on left-click anywhere
        document.addEventListener('click', (e) => {
            this.app.contextMenuHandler.hideContextMenu();
        });

        // Unified contextmenu handler - routes to appropriate ContextMenuHandler methods
        document.addEventListener('contextmenu', (e) => {
            const target = e.target;
            const binsContainer = document.getElementById('bins-container');
            
            // Find the closest element, bin, or page tab
            const elementEl = target.closest('.element');
            const binEl = target.closest('.bin');
            const pageTabEl = target.closest('.page-tab');
            
            // Route to appropriate handler
            if (elementEl) {
                // Element context menu
                const pageId = elementEl.dataset.pageId || this.app.appState.currentPageId;
                const binId = elementEl.dataset.binId;
                const elementIndex = parseInt(elementEl.dataset.elementIndex);
                this.app.contextMenuHandler.showContextMenu(e, pageId, binId, elementIndex);
                return;
            }
            
            if (binEl && !elementEl) {
                // Bin context menu
                const pageId = binEl.dataset.pageId || this.app.appState.currentPageId;
                const binId = binEl.dataset.binId;
                this.app.contextMenuHandler.showBinContextMenu(e, pageId, binId);
                return;
            }
            
            if (pageTabEl) {
                // Page tab context menu
                const pageId = pageTabEl.dataset.pageId;
                this.app.contextMenuHandler.showPageContextMenu(e, pageId);
                return;
            }
            
            // Empty area context menu (bins container or app area)
            if (this.app && binsContainer) {
                this.app.contextMenuHandler.showPageContextMenu(e);
                return;
            }
            
            // If no specific handler, hide any active context menu
            this.app.contextMenuHandler.hideContextMenu();
        }, true); // Use capture phase
        
        // Touch gesture handlers for mobile two-finger context menu
        this.app.touchGestureHandler.setupTouchGestures();
        
        // Swipe gesture handlers for mobile
        this.app.touchGestureHandler.setupSwipeGestures();
        
        // Modal close handlers
        // Store the current edit info for the close button
        let currentEditInfo = null;
        
        document.querySelector('.modal-close').addEventListener('click', () => {
            // Use currentEdit if available, otherwise try to find it from the modal
            if (this.app.currentEdit && this.app.currentEdit.pageId && this.app.currentEdit.elementIndex !== undefined) {
                this.app.modalHandler.saveEdit(this.app.currentEdit.pageId, this.app.currentEdit.elementIndex);
            } else if (currentEditInfo) {
                this.app.modalHandler.saveEdit(currentEditInfo.pageId, currentEditInfo.elementIndex);
            } else {
                // Fallback: close modal
                this.app.modalHandler.closeModal();
            }
        });
        
        // Track mouse down location to prevent closing when clicking inside and releasing outside
        let modalMouseDownTarget = null;
        const modalEl = document.getElementById('modal');
        
        modalEl.addEventListener('mousedown', (e) => {
            // Track what element was clicked on mousedown
            modalMouseDownTarget = e.target;
        });
        
        modalEl.addEventListener('click', (e) => {
            // Only close if both mousedown and click were on the modal background (not modal-content)
            // This prevents closing when clicking inside and releasing outside
            if (e.target.id === 'modal' && modalMouseDownTarget && modalMouseDownTarget.id === 'modal') {
                this.app.modalHandler.closeModal();
            }
            modalMouseDownTarget = null; // Reset
        });
        
        // Auto-scroll during drag when near screen edges
        document.addEventListener('dragover', (e) => {
            if (!this.app.isDragging) return;
            
            const edgeThreshold = 50; // Distance from edge to trigger scrolling
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            const mouseX = e.clientX;
            const mouseY = e.clientY;
            
            let scrollX = 0;
            let scrollY = 0;
            
            // Check horizontal edges
            if (mouseX < edgeThreshold) {
                scrollX = -this.app.edgeScrollSpeed;
            } else if (mouseX > viewportWidth - edgeThreshold) {
                scrollX = this.app.edgeScrollSpeed;
            }
            
            // Check vertical edges
            if (mouseY < edgeThreshold) {
                scrollY = -this.app.edgeScrollSpeed;
            } else if (mouseY > viewportHeight - edgeThreshold) {
                scrollY = this.app.edgeScrollSpeed;
            }
            
            // Apply scrolling
            if (scrollX !== 0 || scrollY !== 0) {
                // Clear existing interval
                if (this.app.autoScrollInterval) {
                    clearInterval(this.app.autoScrollInterval);
                }
                
                // Start continuous scrolling
                this.app.autoScrollInterval = setInterval(() => {
                    if (!this.app.isDragging) {
                        clearInterval(this.app.autoScrollInterval);
                        this.app.autoScrollInterval = null;
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
                if (this.app.autoScrollInterval) {
                    clearInterval(this.app.autoScrollInterval);
                    this.app.autoScrollInterval = null;
                }
            }
        });
        
        // Middle mouse wheel scrolling during drag
        document.addEventListener('wheel', (e) => {
            if (!this.app.isDragging) return;
            
            // Check if middle mouse button is pressed (button 1)
            // Note: We can't directly check button state during wheel event,
            // so we'll track it via mousedown/mouseup
            if (this.app.middleMouseDown) {
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
        
        // Track middle mouse button state
        this.app.middleMouseDown = false;
        document.addEventListener('mousedown', (e) => {
            if (e.button === 1) { // Middle mouse button
                this.app.middleMouseDown = true;
            }
        });
        
        document.addEventListener('mouseup', (e) => {
            if (e.button === 1) { // Middle mouse button
                this.app.middleMouseDown = false;
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


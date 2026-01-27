// UIEventHandlers.js - Handles UI button clicks, file inputs, and dropdown menus
import { getService, SERVICES } from '../core/AppServices.js';

export class UIEventHandlers {
    constructor(eventHandler) {
        this.eventHandler = eventHandler;
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
    
    _getAudioHandler() {
        return getService(SERVICES.AUDIO_HANDLER);
    }
    
    _getUndoRedoManager() {
        return getService(SERVICES.UNDO_REDO_MANAGER);
    }
    
    /**
     * Setup load default button handler
     */
    setupLoadDefaultButton() {
        const loadDefaultBtn = document.getElementById('load-default');
        if (loadDefaultBtn) {
            loadDefaultBtn.addEventListener('click', () => {
                const dataManager = this._getDataManager();
                if (dataManager) {
                    dataManager.loadDefaultFile();
                }
            });
        }
    }
    
    /**
     * Setup file manager button handler
     */
    setupFileManagerButton() {
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
    }
    
    /**
     * Setup save default button handler
     */
    setupSaveDefaultButton() {
        const saveDefaultBtn = document.getElementById('save-default');
        if (saveDefaultBtn) {
            saveDefaultBtn.addEventListener('click', () => {
                const dataManager = this._getDataManager();
                if (dataManager) {
                    dataManager.saveAsDefault();
                }
            });
        }
    }
    
    /**
     * Setup file input handler (backward compatibility)
     */
    setupFileInput() {
        const fileInput = document.getElementById('file-input');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                const dataManager = this._getDataManager();
                if (dataManager) {
                    dataManager.loadFromFile(e);
                }
            });
        }
    }
    
    /**
     * Setup file input for images/JSON
     */
    setupFileInputImagesJson() {
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
    }
    
    /**
     * Handle file input change event
     */
    handleFileInput(e) {
        // This method should be implemented in EventHandler or delegated
        // For now, we'll delegate to the eventHandler if it has this method
        if (this.eventHandler && typeof this.eventHandler.handleFileInput === 'function') {
            this.eventHandler.handleFileInput(e);
        }
    }
    
    /**
     * Setup audio recording button handler
     */
    setupRecordAudioButton() {
        const recordAudioBtn = document.getElementById('record-audio');
        if (recordAudioBtn) {
            recordAudioBtn.addEventListener('click', () => {
                const audioHandler = this._getAudioHandler();
                if (audioHandler) {
                    audioHandler.showAudioRecordingModal();
                }
            });
        }
    }
    
    /**
     * Setup undo button handler
     */
    setupUndoButton() {
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
    }
    
    /**
     * Setup redo button handler
     */
    setupRedoButton() {
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
    }
    
    /**
     * Setup header pin button handler
     */
    setupHeaderPinButton() {
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
    }
    
    /**
     * Setup settings button handler
     */
    setupSettingsButton() {
        const settingsBtn = document.getElementById('settings-btn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => {
                const settingsManager = getService(SERVICES.SETTINGS_MANAGER);
                if (settingsManager) {
                    settingsManager.showSettingsModal();
                }
            });
        }
    }
    
    /**
     * Setup settings modal close handlers
     */
    setupSettingsModalClose() {
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
    }
    
    /**
     * Setup dropdown menu handlers
     */
    setupDropdownMenu() {
        try {
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
            } else {
                console.warn('[UIEventHandlers] Dropdown elements not found:', { dropdownToggle, dropdownMenu });
            }
        } catch (dropdownError) {
            console.error('[UIEventHandlers] Error setting up dropdown:', dropdownError);
        }
    }
    
    /**
     * Setup all UI event handlers
     */
    setupAll() {
        this.setupLoadDefaultButton();
        this.setupFileManagerButton();
        this.setupSaveDefaultButton();
        this.setupFileInput();
        this.setupFileInputImagesJson();
        this.setupRecordAudioButton();
        this.setupUndoButton();
        this.setupRedoButton();
        this.setupHeaderPinButton();
        this.setupSettingsButton();
        this.setupSettingsModalClose();
        this.setupDropdownMenu();
    }
}

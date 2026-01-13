// FileManager.js - Handles server-side file management
import { eventBus } from '../core/EventBus.js';
import { EVENTS } from '../core/AppEvents.js';
import { getService, SERVICES, hasService } from '../core/AppServices.js';

export class FileManager {
    constructor() {
        this.currentFilename = null;
        this.lastOpenedFileKey = 'twodo-last-opened-file';
        // Backup loading state
        this.originalFilename = null;  // The original file that was backed up
        this.tempFilename = null;  // Temporary filename for saves (filename-1.json, overwritten by autosaves)
        this.isBackupLoaded = false;  // Whether a backup file was loaded
        this.backupDiffers = false;  // Whether the backup differs from current file
    }
    
    /**
     * Get services
     */
    _getModalHandler() {
        return getService(SERVICES.MODAL_HANDLER);
    }
    
    _getUndoRedoManager() {
        return getService(SERVICES.UNDO_REDO_MANAGER);
    }
    
    _getAppState() {
        return getService(SERVICES.APP_STATE);
    }
    
    async listFiles() {
        try {
            const response = await fetch('/files');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const result = await response.json();
            if (result.success) {
                return result.files || [];
            } else {
                throw new Error(result.error || 'Failed to list files');
            }
        } catch (error) {
            console.error('Error listing files:', error);
            const modalHandler = this._getModalHandler();
            if (modalHandler) {
                modalHandler.showAlert('Failed to list files: ' + error.message);
            } else {
                alert('Failed to list files: ' + error.message);
            }
            return [];
        }
    }
    
    async saveFile(filename, data, silent = false) {
        try {
            // If backup is loaded and differs, use temp filename for saves
            let actualFilename = filename;
            if (this.isBackupLoaded && this.backupDiffers && this.tempFilename) {
                actualFilename = this.tempFilename;
            }
            
            const response = await fetch('/files/save', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    filename: actualFilename,
                    data: data,
                    createBackup: !silent  // Create backup only for manual saves (not autosave)
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            if (result.success) {
                // If this was an autosave with temp file, keep using the same temp filename (overwrite)
                if (this.isBackupLoaded && this.backupDiffers && silent && this.tempFilename) {
                    this.currentFilename = this.tempFilename;
                    // Keep tempFilename the same - autosaves overwrite the same temp file
                } else if (!this.isBackupLoaded || !this.backupDiffers || !silent) {
                    // Normal save or manual save that resolved temp file
                    this.currentFilename = result.filename;
                } else {
                    this.currentFilename = this.tempFilename;
                }
                
                // Trigger buffer save after main file save
                const undoRedoManager = this._getUndoRedoManager();
                if (undoRedoManager) {
                    undoRedoManager._debouncedSaveBuffer();
                }
                
                return result;
            } else {
                throw new Error(result.error || 'Failed to save file');
            }
        } catch (error) {
            console.error('Error saving file:', error);
            // Only show alert if not silent (for autosave)
            if (!silent) {
                const modalHandler = this._getModalHandler();
                if (modalHandler) {
                    await modalHandler.showAlert('Failed to save file: ' + error.message);
                } else {
                    alert('Failed to save file: ' + error.message);
                }
            }
            throw error;
        }
    }
    
    async saveAsFile(filename, data) {
        try {
            const response = await fetch('/files/save-as', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    filename: filename,
                    data: data,
                    createBackup: true  // Always create backup for Save As (manual save)
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            if (result.success) {
                this.currentFilename = result.filename;
                return result;
            } else {
                throw new Error(result.error || 'Failed to save file');
            }
        } catch (error) {
            console.error('Error saving file:', error);
            const modalHandler = this._getModalHandler();
            if (modalHandler) {
                await modalHandler.showAlert('Failed to save file: ' + error.message);
            } else {
                alert('Failed to save file: ' + error.message);
            }
            throw error;
        }
    }
    
    async loadFile(filename, loadBuffer = true) {
        const perfStart = performance.now();
        try {
            const encodedFilename = encodeURIComponent(filename);
            // Use AbortController for timeout handling
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            
            try {
                const fetchStart = performance.now();
                // Add timestamp to bypass browser cache and ensure fresh data
                const fetchUrl = `/files/${encodedFilename}?t=${Date.now()}`;
                
                // Check how many requests are in flight before our fetch
                const requestsBefore = performance.getEntriesByType('resource').length;
                // console.log(`[DIAG] FileManager.loadFile(): ${requestsBefore} resource requests before fetch`);
                
                const response = await fetch(fetchUrl, {
                    signal: controller.signal,
                    cache: 'no-store' // Use no-store instead of no-cache for stronger cache bypass
                });
                const fetchTime = performance.now() - fetchStart;
                clearTimeout(timeoutId);
                
                // Extract network timing - wait a bit for timing to be available
                setTimeout(() => {
                    const resourceTimings = performance.getEntriesByType('resource');
                    const resourceTiming = resourceTimings.find(entry => entry.name.includes(encodedFilename));
                    if (resourceTiming) {
                        // console.log('[DIAG] FileManager.loadFile() network timing:', {
                        //     stalled: (resourceTiming.requestStart - resourceTiming.fetchStart).toFixed(1) + 'ms',
                        //     dns: (resourceTiming.domainLookupEnd - resourceTiming.domainLookupStart).toFixed(1) + 'ms',
                        //     tcp: (resourceTiming.connectEnd - resourceTiming.connectStart).toFixed(1) + 'ms',
                        //     ttfb: (resourceTiming.responseStart - resourceTiming.requestStart).toFixed(1) + 'ms',
                        //     download: (resourceTiming.responseEnd - resourceTiming.responseStart).toFixed(1) + 'ms',
                        //     total: resourceTiming.duration.toFixed(1) + 'ms'
                        // });
                    } else {
                        // console.log('[DIAG] FileManager.loadFile(): Could not find resource timing entry');
                    }
                }, 100);
                
                if (!response.ok) {
                    // If 404, the file doesn't exist - rethrow to allow caller to handle
                    if (response.status === 404) {
                        const error = new Error(`File not found: ${filename}`);
                        error.status = 404;
                        throw error;
                    }
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const parseStart = performance.now();
                const result = await response.json();
                const parseTime = performance.now() - parseStart;
                
                if (result.success) {
                    this.currentFilename = result.filename;
                    
                    // Set timestamp to prevent stale sync data from overwriting freshly loaded data
                    const dataManager = this._getDataManager();
                    if (dataManager) {
                        dataManager._lastSyncTimestamp = Date.now();
                    }
                    
                    // Load corresponding buffer file after loading main file (if requested)
                    if (loadBuffer) {
                        const undoRedoManager = this._getUndoRedoManager();
                        if (undoRedoManager) {
                            const bufferStart = performance.now();
                            await undoRedoManager.loadBuffer(result.filename);
                            const bufferTime = performance.now() - bufferStart;
                            console.log(`[PERF] Buffer load: ${bufferTime.toFixed(1)}ms`);
                        }
                    }
                    
                    const totalTime = performance.now() - perfStart;
                    console.log(`[PERF] File load ${filename}: fetch=${fetchTime.toFixed(1)}ms, parse=${parseTime.toFixed(1)}ms, total=${totalTime.toFixed(1)}ms`);
                    
                    return result.data;
                } else {
                    throw new Error(result.error || 'Failed to load file');
                }
            } catch (fetchError) {
                clearTimeout(timeoutId);
                if (fetchError.name === 'AbortError') {
                    throw new Error('File load timeout');
                }
                throw fetchError;
            }
        } catch (error) {
            // Only show alert for non-404 errors (404 is handled by caller)
            if (error.status !== 404 && !error.message.includes('timeout')) {
                console.error('Error loading file:', error);
                const modalHandler = this._getModalHandler();
                if (modalHandler) {
                    await modalHandler.showAlert('Failed to load file: ' + error.message);
                } else {
                    alert('Failed to load file: ' + error.message);
                }
            }
            throw error;
        }
    }
    
    async renameFile(oldFilename, newFilename) {
        try {
            const encodedFilename = encodeURIComponent(oldFilename);
            const response = await fetch(`/files/${encodedFilename}/rename`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    filename: newFilename
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            if (result.success) {
                if (this.currentFilename === oldFilename) {
                    this.currentFilename = result.filename;
                }
                return result;
            } else {
                throw new Error(result.error || 'Failed to rename file');
            }
        } catch (error) {
            console.error('Error renaming file:', error);
            const modalHandler = this._getModalHandler();
            if (modalHandler) {
                await modalHandler.showAlert('Failed to rename file: ' + error.message);
            } else {
                alert('Failed to rename file: ' + error.message);
            }
            throw error;
        }
    }
    
    async deleteFile(filename) {
        try {
            const encodedFilename = encodeURIComponent(filename);
            const response = await fetch(`/files/${encodedFilename}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            if (result.success) {
                if (this.currentFilename === filename) {
                    this.currentFilename = null;
                }
                return result;
            } else {
                throw new Error(result.error || 'Failed to delete file');
            }
        } catch (error) {
            console.error('Error deleting file:', error);
            const modalHandler = this._getModalHandler();
            if (modalHandler) {
                await modalHandler.showAlert('Failed to delete file: ' + error.message);
            } else {
                alert('Failed to delete file: ' + error.message);
            }
            throw error;
        }
    }
    
    showFileManager() {
        const modal = document.getElementById('modal');
        const modalBody = document.getElementById('modal-body');
        
        if (!modal || !modalBody) {
            console.error('[FileManager] Modal elements not found!');
            return;
        }
        
        modalBody.innerHTML = `
            <h3>File Manager</h3>
            <div style="margin-top: 20px;">
                <div style="display: flex; gap: 10px; margin-bottom: 20px;">
                    <button id="file-manager-new" style="padding: 8px 16px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 18px; line-height: 1;">+</button>
                    <button id="file-manager-save" style="padding: 8px 16px; background: #4a9eff; color: white; border: none; border-radius: 4px; cursor: pointer;">💾 Save</button>
                    <button id="file-manager-save-as" style="padding: 8px 16px; background: #4a9eff; color: white; border: none; border-radius: 4px; cursor: pointer;">💾 Save As</button>
                    <button id="file-manager-refresh" style="padding: 8px 16px; background: #555; color: white; border: none; border-radius: 4px; cursor: pointer;">🔄 Refresh</button>
                </div>
                <div id="file-manager-list" style="max-height: 400px; overflow-y: auto; border: 1px solid #444; border-radius: 4px; padding: 10px; background: #1a1a1a;">
                    <div style="text-align: center; color: #888; padding: 20px;">Loading files...</div>
                </div>
            </div>
        `;
        
        modal.classList.add('active');
        
        // Attach event listeners
        const newBtn = document.getElementById('file-manager-new');
        const saveBtn = document.getElementById('file-manager-save');
        const saveAsBtn = document.getElementById('file-manager-save-as');
        const refreshBtn = document.getElementById('file-manager-refresh');
        
        if (newBtn) {
            newBtn.onclick = () => this.handleNew();
        }
        if (saveBtn) {
            saveBtn.onclick = () => this.handleSave();
        }
        if (saveAsBtn) {
            saveAsBtn.onclick = () => this.handleSaveAs();
        }
        if (refreshBtn) {
            refreshBtn.onclick = () => this.refreshFileList();
        }
        
        // Load file list
        this.refreshFileList();
    }
    
    async refreshFileList() {
        const listDiv = document.getElementById('file-manager-list');
        if (!listDiv) return;
        
        listDiv.innerHTML = '<div style="text-align: center; color: #888; padding: 20px;">Loading files...</div>';
        
        const files = await this.listFiles();
        
        if (files.length === 0) {
            listDiv.innerHTML = '<div style="text-align: center; color: #888; padding: 20px;">No saved files</div>';
            return;
        }
        
        let html = '<div style="display: flex; flex-direction: column; gap: 8px;">';
        files.forEach(file => {
            const isCurrent = file.filename === this.currentFilename;
            const modifiedDate = new Date(file.modified * 1000).toLocaleString();
            const sizeKB = (file.size / 1024).toFixed(1);
            
            html += `
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px; background: ${isCurrent ? '#2a4a6a' : '#2a2a2a'}; border-radius: 4px; border: 1px solid #444;">
                    <div style="flex: 1;">
                        <div style="font-weight: ${isCurrent ? 'bold' : 'normal'}; color: ${isCurrent ? '#4a9eff' : '#e0e0e0'};">
                            ${file.filename} ${isCurrent ? '(current)' : ''}
                        </div>
                        <div style="font-size: 12px; color: #888; margin-top: 4px;">
                            ${sizeKB} KB • ${modifiedDate}
                        </div>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button onclick="window.app.fileManager.handleLoad('${file.filename}')" 
                                style="padding: 6px 12px; background: #4a9eff; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">📂 Load</button>
                        <button onclick="window.app.fileManager.handleLoadBackup('${file.filename}')" 
                                style="padding: 6px 12px; background: #6a8eff; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">💾 Load .bak</button>
                        <button onclick="window.app.fileManager.handleRename('${file.filename}')" 
                                style="padding: 6px 12px; background: #888; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">✏️ Rename</button>
                        <button onclick="window.app.fileManager.handleDelete('${file.filename}')" 
                                style="padding: 6px 12px; background: #ff5555; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">🗑️ Delete</button>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        
        listDiv.innerHTML = html;
    }
    
    async handleSave() {
        // If backup was loaded and differs, prompt user to overwrite or save as
        if (this.isBackupLoaded && this.backupDiffers && this.originalFilename) {
            let choice;
            if (this.app && this.app.modalHandler) {
                choice = await this.app.modalHandler.showConfirm(
                    `You loaded a backup file that differs from ${this.originalFilename}.\n\n` +
                    `Do you want to overwrite ${this.originalFilename} with your current changes?\n\n` +
                    `Click OK to overwrite, or Cancel to save as a new file.`
                );
            } else {
                choice = confirm(
                    `You loaded a backup file that differs from ${this.originalFilename}.\n\n` +
                    `Do you want to overwrite ${this.originalFilename} with your current changes?\n\n` +
                    `Click OK to overwrite, or Cancel to save as a new file.`
                );
            }
            
            if (choice) {
                // Overwrite original file
                try {
                    const data = {
                        pages: this._getAppState().pages
                    };
                    
                    // Store temp filename for cleanup
                    const tempFileToDelete = this.tempFilename;
                    
                    // Reset backup loading state BEFORE saving so saveFile uses original filename
                    const originalFile = this.originalFilename;
                    this.originalFilename = null;
                    this.tempFilename = null;
                    this.isBackupLoaded = false;
                    this.backupDiffers = false;
                    
                    // Now save to original file
                    await this.saveFile(originalFile, data);
                    
                    // Clean up temporary file
                    if (tempFileToDelete) {
                        await this.deleteFile(tempFileToDelete).catch(err => {
                            console.warn('Failed to delete temp file:', err);
                        });
                    }
                    
                    if (this.app && this.app.modalHandler) {
                        await this.app.modalHandler.showAlert(`File saved: ${originalFile}`);
                    } else {
                        alert(`File saved: ${originalFile}`);
                    }
                    this.refreshFileList();
                } catch (error) {
                    // Error already shown in saveFile
                }
            } else {
                // Save as new file
                this.handleSaveAs();
            }
            return;
        }
        
        // Normal save flow
        if (!this.currentFilename) {
            this.handleSaveAs();
            return;
        }
        
        try {
            const data = {
                pages: this._getAppState().pages
            };
            
            console.log('[FileManager] Manual save - currentFilename:', this.currentFilename);
            await this.saveFile(this.currentFilename, data);
            console.log('[FileManager] Manual save successful');
            
            // If we just saved and had a temp file, clean it up and reset state
            if (this.isBackupLoaded && this.tempFilename && this.currentFilename === this.tempFilename) {
                // This shouldn't happen in normal flow, but handle it just in case
                this.isBackupLoaded = false;
                this.backupDiffers = false;
                this.tempFilename = null;
                this.originalFilename = null;
                this.tempFileCounter = 0;
            }
            
            if (this.app && this.app.modalHandler) {
                await this.app.modalHandler.showAlert(`File saved: ${this.currentFilename}`);
            } else {
                alert(`File saved: ${this.currentFilename}`);
            }
            this.refreshFileList();
        } catch (error) {
            // Error already shown in saveFile
        }
    }
    
    async handleSaveAs() {
        const defaultName = this.currentFilename ? this.currentFilename.replace('.json', '').replace(/-\d+$/, '') : '';
        let filename;
        
        if (this.app && this.app.modalHandler) {
            filename = await this.app.modalHandler.showPrompt('Enter filename (without .json extension):', defaultName);
        } else {
            filename = prompt('Enter filename (without .json extension):', defaultName);
        }
        
        if (!filename) return;
        
        try {
            const data = {
                pages: this._getAppState().pages
            };
            
            // Store temp filename for cleanup
            const tempFileToDelete = this.tempFilename;
            
            // Reset backup loading state BEFORE saving
            this.originalFilename = null;
            this.tempFilename = null;
            this.isBackupLoaded = false;
            this.backupDiffers = false;
            
            await this.saveAsFile(filename, data);
            
            // Clean up temporary file if backup was loaded
            if (tempFileToDelete) {
                await this.deleteFile(tempFileToDelete).catch(err => {
                    console.warn('Failed to delete temp file:', err);
                });
            }
            
            if (this.app && this.app.modalHandler) {
                await this.app.modalHandler.showAlert(`File saved as: ${this.currentFilename}`);
            } else {
                alert(`File saved as: ${this.currentFilename}`);
            }
            this.refreshFileList();
        } catch (error) {
            // Error already shown in saveAsFile
        }
    }
    
    async handleLoad(filename) {
        let confirmed;
        if (this.app && this.app.modalHandler) {
            confirmed = await this.app.modalHandler.showConfirm(`Load ${filename}? This will replace your current data.`);
        } else {
            confirmed = confirm(`Load ${filename}? This will replace your current data.`);
        }
        
        if (!confirmed) {
            return;
        }
        
        try {
            const data = await this.loadFile(filename);
            
            if (!data.pages || !Array.isArray(data.pages)) {
                if (this.app && this.app.modalHandler) {
                    await this.app.modalHandler.showAlert('Invalid file format. Expected a JSON file with a "pages" array.');
                } else {
                    alert('Invalid file format. Expected a JSON file with a "pages" array.');
                }
                return;
            }
            
            // Update appState.pages
            const appState = this._getAppState();
            appState.pages = data.pages;
            // Update currentPageId if needed
            if (data.pages.length > 0 && !data.pages.find(p => p.id === appState.currentPageId)) {
                appState.currentPageId = data.pages[0].id;
            }
            
            // Store last opened file in localStorage (device-specific)
            localStorage.setItem(this.lastOpenedFileKey, filename);
            
            // Request render via EventBus
            eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
            const modalHandler = this._getModalHandler();
            if (modalHandler) {
                modalHandler.closeModal();
                await modalHandler.showAlert(`File loaded: ${filename}`);
            } else {
                alert(`File loaded: ${filename}`);
            }
            this.refreshFileList();
            
            // Connect to sync and join file session
            if (this.app.syncManager) {
                if (!this.app.syncManager.isConnected) {
                    await this.app.syncManager.connect();
                }
                this.app.syncManager.joinFile(filename);
            }
            
            // Set current file in undo/redo manager (this loads the buffer)
            if (this.app.undoRedoManager) {
                await this.app.undoRedoManager.setCurrentFile(filename);
            }
        } catch (error) {
            // Error already shown in loadFile
        }
    }
    
    async handleLoadBackup(filename) {
        const backupFilename = filename + '.bak';
        let confirmed;
        if (this.app && this.app.modalHandler) {
            confirmed = await this.app.modalHandler.showConfirm(`Load backup file ${backupFilename}? This will replace your current data.`);
        } else {
            confirmed = confirm(`Load backup file ${backupFilename}? This will replace your current data.`);
        }
        
        if (!confirmed) {
            return;
        }
        
        try {
            // Load the backup file
            const backupData = await this.loadFile(backupFilename);
            
            if (!backupData.pages || !Array.isArray(backupData.pages)) {
                if (this.app && this.app.modalHandler) {
                    await this.app.modalHandler.showAlert('Invalid file format. Expected a JSON file with a "pages" array.');
                } else {
                    alert('Invalid file format. Expected a JSON file with a "pages" array.');
                }
                return;
            }
            
            // Load the current file to compare
            let currentData = null;
            let differs = true;
            try {
                currentData = await this.loadFile(filename);
                // Compare the pages data (normalize by stringifying)
                const backupPagesStr = JSON.stringify(backupData.pages);
                const currentPagesStr = JSON.stringify(currentData.pages || []);
                differs = backupPagesStr !== currentPagesStr;
            } catch (error) {
                // Current file doesn't exist or can't be loaded - assume it differs
                differs = true;
            }
            
            // Set backup loading state
            this.originalFilename = filename;
            this.isBackupLoaded = true;
            this.backupDiffers = differs;
            
            // Generate temporary filename if backup differs (always use -1, autosaves will overwrite it)
            if (differs) {
                const baseName = filename.replace('.json', '');
                this.tempFilename = `${baseName}-1.json`;
                this.currentFilename = this.tempFilename;
            } else {
                // Backup is same as current, no temp file needed
                this.tempFilename = null;
                this.currentFilename = filename;
            }
            
            // Update appState.pages
            const appState = this._getAppState();
            appState.pages = backupData.pages;
            // Update currentPageId if needed
            if (backupData.pages.length > 0 && !backupData.pages.find(p => p.id === appState.currentPageId)) {
                appState.currentPageId = backupData.pages[0].id;
            }
            
            // Store last opened file in localStorage (device-specific) - use original filename, not backup
            localStorage.setItem(this.lastOpenedFileKey, filename);
            
            // Request render via EventBus
            eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
            const modalHandler = this._getModalHandler();
            if (modalHandler) {
                modalHandler.closeModal();
                
                if (differs) {
                    await modalHandler.showAlert(`Backup file loaded: ${backupFilename}\n\nThis backup differs from the current file. Saves will go to temporary file: ${this.tempFilename}\n\nWhen you manually save, you'll be asked to overwrite the original or save as a new file.`);
                } else {
                    await modalHandler.showAlert(`Backup file loaded: ${backupFilename}\n\nThis backup is identical to the current file.`);
                }
            } else {
                if (differs) {
                    alert(`Backup file loaded: ${backupFilename}\n\nThis backup differs from the current file. Saves will go to temporary file: ${this.tempFilename}\n\nWhen you manually save, you'll be asked to overwrite the original or save as a new file.`);
                } else {
                    alert(`Backup file loaded: ${backupFilename}\n\nThis backup is identical to the current file.`);
                }
            }
            
            this.refreshFileList();
            
            // Connect to sync and join file session (use original filename, not backup)
            if (this.app.syncManager) {
                if (!this.app.syncManager.isConnected) {
                    await this.app.syncManager.connect();
                }
                this.app.syncManager.joinFile(filename);
            }
            
            // Set current file in undo/redo manager (this loads the buffer) - use original filename
            if (this.app.undoRedoManager) {
                await this.app.undoRedoManager.setCurrentFile(filename);
            }
        } catch (error) {
            if (this.app && this.app.modalHandler) {
                await this.app.modalHandler.showAlert(`Failed to load backup file: ${error.message}`);
            } else {
                alert(`Failed to load backup file: ${error.message}`);
            }
        }
    }
    
    async handleRename(filename) {
        const defaultName = filename.replace('.json', '');
        let newFilename;
        
        if (this.app && this.app.modalHandler) {
            newFilename = await this.app.modalHandler.showPrompt('Enter new filename (without .json extension):', defaultName);
        } else {
            newFilename = prompt('Enter new filename (without .json extension):', defaultName);
        }
        
        if (!newFilename || newFilename === defaultName) return;
        
        try {
            await this.renameFile(filename, newFilename);
            if (this.app && this.app.modalHandler) {
                await this.app.modalHandler.showAlert(`File renamed to: ${newFilename}.json`);
            } else {
                alert(`File renamed to: ${newFilename}.json`);
            }
            this.refreshFileList();
        } catch (error) {
            // Error already shown in renameFile
        }
    }
    
    async handleDelete(filename) {
        let confirmed;
        if (this.app && this.app.modalHandler) {
            confirmed = await this.app.modalHandler.showConfirm(`Delete ${filename}? This cannot be undone.`);
        } else {
            confirmed = confirm(`Delete ${filename}? This cannot be undone.`);
        }
        
        if (!confirmed) {
            return;
        }
        
        try {
            await this.deleteFile(filename);
            if (this.app && this.app.modalHandler) {
                await this.app.modalHandler.showAlert(`File deleted: ${filename}`);
            } else {
                alert(`File deleted: ${filename}`);
            }
            this.refreshFileList();
        } catch (error) {
            // Error already shown in deleteFile
        }
    }
    
    async handleNew() {
        let filename;
        if (this.app && this.app.modalHandler) {
            filename = await this.app.modalHandler.showPrompt('Enter filename for new todo file (without .json extension):', 'new-todo');
        } else {
            filename = prompt('Enter filename for new todo file (without .json extension):', 'new-todo');
        }
        
        if (!filename) return;
        
        try {
            // Auto-save current file if one is open
            const appState = this._getAppState();
            if (this.currentFilename && appState && appState.pages) {
                try {
                    const currentData = {
                        pages: this._getAppState().pages
                    };
                    await this.saveFile(this.currentFilename, currentData);
                } catch (saveError) {
                    // Log but don't block - continue with creating new file
                    console.warn('Failed to auto-save current file:', saveError);
                }
            }
            
            // Create a new empty todo file with default structure
            const newFileData = {
                pages: []
            };
            
            await this.saveAsFile(filename, newFileData);
            
            // Verify currentFilename was set
            if (!this.currentFilename) {
                console.error('[FileManager] currentFilename not set after saveAsFile!');
                if (this.app && this.app.modalHandler) {
                    await this.app.modalHandler.showAlert('Error: File was created but currentFilename was not set. Please reload the page.');
                }
                return;
            }
            
            console.log('[FileManager] New file created, currentFilename:', this.currentFilename);
            
            // Load the new file into the UI
            const loadedData = await this.loadFile(this.currentFilename);
            
            if (!loadedData.pages || !Array.isArray(loadedData.pages)) {
                if (this.app && this.app.modalHandler) {
                    await this.app.modalHandler.showAlert('Invalid file format. Expected a JSON file with a "pages" array.');
                } else {
                    alert('Invalid file format. Expected a JSON file with a "pages" array.');
                }
                return;
            }
            
            // Update appState.pages (reuse appState from line 791)
            appState.pages = loadedData.pages;
            // Update currentPageId if needed
            if (loadedData.pages.length > 0 && !loadedData.pages.find(p => p.id === appState.currentPageId)) {
                appState.currentPageId = loadedData.pages[0].id;
            }
            
            // Store last opened file in localStorage (device-specific)
            localStorage.setItem(this.lastOpenedFileKey, this.currentFilename);
            
            // Request render via EventBus
            eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
            const modalHandler = this._getModalHandler();
            if (modalHandler) {
                modalHandler.closeModal();
            }
            
            // Refresh file list to show the new file as current
            this.refreshFileList();
            
            // Connect to sync and join file session
            if (this.app.syncManager) {
                if (!this.app.syncManager.isConnected) {
                    await this.app.syncManager.connect();
                }
                this.app.syncManager.joinFile(this.currentFilename);
            }
            
            // Set current file in undo/redo manager (this initializes empty buffer for new file)
            if (this.app.undoRedoManager) {
                await this.app.undoRedoManager.setCurrentFile(this.currentFilename);
                // Clear stacks for new file
                this.app.undoRedoManager.clear();
            }
        } catch (error) {
            // Error already shown in saveAsFile or loadFile
        }
    }
    
    /**
     * Diagnose file integrity - checks for structural issues
     */
    async diagnoseFileIntegrity(filename) {
        const issues = [];
        let elementCounts = { pages: 0, bins: 0, elements: 0 };
        const structure = { pages: [], bins: [], elements: [] };
        
        try {
            // Load the file
            const data = await this.loadFile(filename);
            
            if (!data || !data.pages) {
                issues.push({
                    type: 'missing_pages',
                    location: 'root',
                    description: 'File does not contain a pages array'
                });
                return {
                    isValid: false,
                    issues,
                    elementCounts,
                    structure
                };
            }
            
            if (!Array.isArray(data.pages)) {
                issues.push({
                    type: 'invalid_pages',
                    location: 'root',
                    description: 'Pages is not an array'
                });
                return {
                    isValid: false,
                    issues,
                    elementCounts,
                    structure
                };
            }
            
            elementCounts.pages = data.pages.length;
            
            // Check each page
            data.pages.forEach((page, pageIndex) => {
                const pageId = page.id || `page-${pageIndex}`;
                structure.pages.push({ id: pageId, index: pageIndex });
                
                if (!page.bins) {
                    issues.push({
                        type: 'missing_bins',
                        location: `pages[${pageIndex}]`,
                        description: `Page ${pageId} does not have a bins array`
                    });
                    return;
                }
                
                if (!Array.isArray(page.bins)) {
                    issues.push({
                        type: 'invalid_bins',
                        location: `pages[${pageIndex}]`,
                        description: `Page ${pageId} bins is not an array`
                    });
                    return;
                }
                
                elementCounts.bins += page.bins.length;
                
                // Check each bin
                page.bins.forEach((bin, binIndex) => {
                    const binId = bin.id || `bin-${binIndex}`;
                    structure.bins.push({ 
                        pageId, 
                        binId, 
                        pageIndex, 
                        binIndex 
                    });
                    
                    if (!bin.elements) {
                        issues.push({
                            type: 'missing_elements',
                            location: `pages[${pageIndex}].bins[${binIndex}]`,
                            description: `Bin ${binId} does not have an elements array`
                        });
                        return;
                    }
                    
                    if (!Array.isArray(bin.elements)) {
                        issues.push({
                            type: 'invalid_elements',
                            location: `pages[${pageIndex}].bins[${binIndex}]`,
                            description: `Bin ${binId} elements is not an array`
                        });
                        return;
                    }
                    
                    elementCounts.elements += bin.elements.length;
                    
                    // Check each element
                    bin.elements.forEach((element, elementIndex) => {
                        structure.elements.push({
                            pageId,
                            binId,
                            pageIndex,
                            binIndex,
                            elementIndex
                        });
                        
                        // Check for null/undefined elements
                        if (element === null || element === undefined) {
                            issues.push({
                                type: 'null_element',
                                location: `pages[${pageIndex}].bins[${binIndex}].elements[${elementIndex}]`,
                                description: `Element at index ${elementIndex} is null or undefined`
                            });
                            return;
                        }
                        
                        // Check for missing critical properties
                        if (element.type === undefined || element.type === null) {
                            issues.push({
                                type: 'missing_type',
                                location: `pages[${pageIndex}].bins[${binIndex}].elements[${elementIndex}]`,
                                description: `Element at index ${elementIndex} is missing type property`
                            });
                        }
                        
                        // Check for orphaned children references
                        if (element.children && Array.isArray(element.children)) {
                            element.children.forEach((child, childIndex) => {
                                if (child === null || child === undefined) {
                                    issues.push({
                                        type: 'null_child',
                                        location: `pages[${pageIndex}].bins[${binIndex}].elements[${elementIndex}].children[${childIndex}]`,
                                        description: `Child element at index ${childIndex} is null or undefined`
                                    });
                                }
                            });
                        }
                    });
                });
            });
            
            // Check for array length mismatches (if we have structure info)
            // This would require comparing with expected counts, which we don't have
            // So we'll just report what we found
            
            return {
                isValid: issues.length === 0,
                issues,
                elementCounts,
                structure
            };
        } catch (error) {
            issues.push({
                type: 'load_error',
                location: 'file',
                description: `Failed to load file: ${error.message}`
            });
            return {
                isValid: false,
                issues,
                elementCounts,
                structure
            };
        }
    }
}


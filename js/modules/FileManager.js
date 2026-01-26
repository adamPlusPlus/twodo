// FileManager.js - Handles server-side file management
import { eventBus } from '../core/EventBus.js';
import { EVENTS } from '../core/AppEvents.js';
import { getService, SERVICES, hasService } from '../core/AppServices.js';
import { activeSetManager } from '../core/ActiveSetManager.js';

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

    _getDataManager() {
        return getService(SERVICES.DATA_MANAGER);
    }

    _normalizeFileData(rawData) {
        if (!rawData || typeof rawData !== 'object') {
            return { documents: [] };
        }
        const normalized = { ...rawData };
        normalized.documents = normalized.documents || [];
        const dataManager = this._getDataManager();
        return dataManager ? dataManager.normalizeDataModel(normalized) : normalized;
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
    
    async saveFile(filename, data, silent = false, saveIndexes = true) {
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
                
                if (saveIndexes) {
                    await this._saveDerivedIndexes(actualFilename, data, true);
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
    
    async saveAsFile(filename, data, saveIndexes = true) {
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
                if (saveIndexes) {
                    await this._saveDerivedIndexes(result.filename, data, true);
                }
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

    _buildGroupIndexPayload(documents) {
        const payload = {
            generatedAt: new Date().toISOString(),
            documents: {}
        };

        (documents || []).forEach(doc => {
            const groupIndex = {};
            const groups = doc.groups || [];
            groups.forEach(group => {
                groupIndex[group.id] = {
                    id: group.id,
                    parentGroupId: group.parentGroupId ?? null,
                    level: typeof group.level === 'number' ? group.level : 0,
                    childIds: [],
                    ancestorIds: []
                };
            });

            groups.forEach(group => {
                const entry = groupIndex[group.id];
                if (!entry) return;
                const parentId = entry.parentGroupId;
                if (parentId && groupIndex[parentId]) {
                    groupIndex[parentId].childIds.push(group.id);
                }
            });

            Object.values(groupIndex).forEach(entry => {
                const ancestors = [];
                let currentParent = entry.parentGroupId;
                while (currentParent && groupIndex[currentParent]) {
                    ancestors.push(currentParent);
                    currentParent = groupIndex[currentParent].parentGroupId;
                }
                entry.ancestorIds = ancestors;
            });

            payload.documents[doc.id] = {
                groupMode: doc.groupMode || doc.config?.groupMode || 'manual',
                groups: groupIndex
            };
        });

        return payload;
    }

    async _saveDerivedIndexes(filename, data, silent = true) {
        if (!data || !Array.isArray(data.documents)) {
            return;
        }

        const indexPayload = this._buildGroupIndexPayload(data.documents);
        const indexFilename = `indexes/${filename}.groups.json`;
        await this.saveFile(indexFilename, indexPayload, silent, false);
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
        // Wait a bit to ensure DOM is ready (in case called during render)
        let modal = document.getElementById('modal');
        let modalBody = document.getElementById('modal-body');
        
        // If modal doesn't exist, try to find it or wait
        if (!modal) {
            console.warn('[FileManager] Modal not found, waiting for DOM...');
            setTimeout(() => {
                this.showFileManager();
            }, 200);
            return;
        }
        
        // Ensure modal-content exists
        let modalContent = modal.querySelector('.modal-content');
        if (!modalContent) {
            console.warn('[FileManager] Modal content not found, creating it...');
            modalContent = document.createElement('div');
            modalContent.className = 'modal-content';
            modal.appendChild(modalContent);
        }
        
        // Ensure modal-body exists
        if (!modalBody) {
            console.warn('[FileManager] Modal body not found, creating it...');
            modalBody = document.createElement('div');
            modalBody.id = 'modal-body';
            modalContent.appendChild(modalBody);
        }
        
        // Ensure modal-close exists
        let modalClose = modalContent.querySelector('.modal-close');
        if (!modalClose) {
            modalClose = document.createElement('span');
            modalClose.className = 'modal-close';
            modalClose.innerHTML = '&times;';
            modalClose.onclick = () => {
                modal.classList.remove('active');
                modal.style.display = 'none';
            };
            modalContent.insertBefore(modalClose, modalContent.firstChild);
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
        
        // Make sure modal is visible
        modal.style.display = 'block';
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
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px; background: ${isCurrent ? '#2a4a6a' : '#2a2a2a'}; border-radius: 4px; border: 1px solid #444; gap: 10px;">
                    <div style="flex: 1; min-width: 0; overflow: hidden;">
                        <div style="font-weight: ${isCurrent ? 'bold' : 'normal'}; color: ${isCurrent ? '#4a9eff' : '#e0e0e0'}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                            ${file.filename} ${isCurrent ? '(current)' : ''}
                        </div>
                        <div style="font-size: 12px; color: #888; margin-top: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                            ${sizeKB} KB • ${modifiedDate}
                        </div>
                    </div>
                    <div style="display: flex; gap: 8px; flex-shrink: 0;">
                        <button onclick="window.app.fileManager.handleLoad('${file.filename.replace(/'/g, "\\'")}')" 
                                style="padding: 6px 12px; background: #4a9eff; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; white-space: nowrap;">📂 Load</button>
                        <button onclick="window.app.fileManager.handleLoadBackup('${file.filename.replace(/'/g, "\\'")}')" 
                                style="padding: 6px 12px; background: #6a8eff; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; white-space: nowrap;">💾 Load .bak</button>
                        <button onclick="window.app.fileManager.handleRename('${file.filename.replace(/'/g, "\\'")}')" 
                                style="padding: 6px 12px; background: #888; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; white-space: nowrap;">✏️ Rename</button>
                        <button onclick="window.app.fileManager.handleDelete('${file.filename.replace(/'/g, "\\'")}')" 
                                style="padding: 6px 12px; background: #ff5555; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; white-space: nowrap;">🗑️ Delete</button>
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
                    const fileData = {
                        documents: this._getAppState().documents
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
                    await this.saveFile(originalFile, fileData);
                    
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
            const fileData = {
                documents: this._getAppState().documents
            };
            
            console.log('[FileManager] Manual save - currentFilename:', this.currentFilename);
            await this.saveFile(this.currentFilename, fileData);
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
            const fileData = {
                documents: this._getAppState().documents
            };
            
            // Store temp filename for cleanup
            const tempFileToDelete = this.tempFilename;
            
            // Reset backup loading state BEFORE saving
            this.originalFilename = null;
            this.tempFilename = null;
            this.isBackupLoaded = false;
            this.backupDiffers = false;
            
            await this.saveAsFile(filename, fileData);
            
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
            const fileData = await this.loadFile(filename);
            const normalizedFile = this._normalizeFileData(fileData);
            
            if (!normalizedFile.documents || !Array.isArray(normalizedFile.documents)) {
                if (this.app && this.app.modalHandler) {
                    await this.app.modalHandler.showAlert('Invalid file format. Expected a JSON file with a "documents" array.');
                } else {
                    alert('Invalid file format. Expected a JSON file with a "documents" array.');
                }
                return;
            }
            
            // Update appState.documents
            const appState = this._getAppState();
            appState.documents = normalizedFile.documents;
            // Update currentDocumentId if needed
            if (normalizedFile.documents.length > 0 && !normalizedFile.documents.find(doc => doc.id === appState.currentDocumentId)) {
                appState.currentDocumentId = normalizedFile.documents[0].id;
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
            const normalizedBackup = this._normalizeFileData(backupData);
            
            if (!normalizedBackup.documents || !Array.isArray(normalizedBackup.documents)) {
                if (this.app && this.app.modalHandler) {
                    await this.app.modalHandler.showAlert('Invalid file format. Expected a JSON file with a "documents" array.');
                } else {
                    alert('Invalid file format. Expected a JSON file with a "documents" array.');
                }
                return;
            }
            
            // Load the current file to compare
            let currentData = null;
            let differs = true;
            try {
                currentData = await this.loadFile(filename);
                // Compare the documents data (normalize by stringifying)
                const backupDocsStr = JSON.stringify(normalizedBackup.documents);
                const currentDocsStr = JSON.stringify(currentData.documents || []);
                differs = backupDocsStr !== currentDocsStr;
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
            
            // Update appState.documents
            const appState = this._getAppState();
            appState.documents = normalizedBackup.documents;
            // Update currentDocumentId if needed
            if (normalizedBackup.documents.length > 0 && !normalizedBackup.documents.find(doc => doc.id === appState.currentDocumentId)) {
                appState.currentDocumentId = normalizedBackup.documents[0].id;
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
            if (this.currentFilename && appState && appState.documents) {
                try {
                    const currentData = {
                        documents: this._getAppState().documents
                    };
                    await this.saveFile(this.currentFilename, currentData);
                } catch (saveError) {
                    // Log but don't block - continue with creating new file
                    console.warn('Failed to auto-save current file:', saveError);
                }
            }
            
            // Create a new empty todo file with default structure
            const newFileData = {
                documents: []
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
            const normalizedLoaded = this._normalizeFileData(loadedData);
            
            if (!normalizedLoaded.documents || !Array.isArray(normalizedLoaded.documents)) {
                if (this.app && this.app.modalHandler) {
                    await this.app.modalHandler.showAlert('Invalid file format. Expected a JSON file with a "documents" array.');
                } else {
                    alert('Invalid file format. Expected a JSON file with a "documents" array.');
                }
                return;
            }
            
            // Update appState.documents (reuse appState from line 791)
            appState.documents = normalizedLoaded.documents;
            // Update currentDocumentId if needed
            if (normalizedLoaded.documents.length > 0 && !normalizedLoaded.documents.find(doc => doc.id === appState.currentDocumentId)) {
                appState.currentDocumentId = normalizedLoaded.documents[0].id;
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
        let elementCounts = { documents: 0, groups: 0, items: 0 };
        const structure = { documents: [], groups: [], items: [] };
        
        try {
            // Load the file
            const fileData = await this.loadFile(filename);
            const normalizedFile = this._normalizeFileData(fileData);
            
            if (!normalizedFile || !normalizedFile.documents) {
                issues.push({
                    type: 'missing_documents',
                    location: 'root',
                    description: 'File does not contain a documents array'
                });
                return {
                    isValid: false,
                    issues,
                    elementCounts,
                    structure
                };
            }
            
            if (!Array.isArray(normalizedFile.documents)) {
                issues.push({
                    type: 'invalid_documents',
                    location: 'root',
                    description: 'Documents is not an array'
                });
                return {
                    isValid: false,
                    issues,
                    elementCounts,
                    structure
                };
            }
            
            elementCounts.documents = normalizedFile.documents.length;
            
            // Check each document
            normalizedFile.documents.forEach((document, documentIndex) => {
                const documentId = document.id || `document-${documentIndex}`;
                structure.documents.push({ id: documentId, index: documentIndex });
                
                if (!document.groups) {
                    issues.push({
                        type: 'missing_groups',
                        location: `documents[${documentIndex}]`,
                        description: `Document ${documentId} does not have a groups array`
                    });
                    return;
                }
                
                if (!Array.isArray(document.groups)) {
                    issues.push({
                        type: 'invalid_groups',
                        location: `documents[${documentIndex}]`,
                        description: `Document ${documentId} groups is not an array`
                    });
                    return;
                }
                
                elementCounts.groups += document.groups.length;
                
                // Check each group
                document.groups.forEach((group, groupIndex) => {
                    const groupId = group.id || `group-${groupIndex}`;
                    structure.groups.push({ 
                        documentId, 
                        groupId, 
                        documentIndex, 
                        groupIndex 
                    });
                    
                    if (!group.items) {
                        issues.push({
                            type: 'missing_items',
                            location: `documents[${documentIndex}].groups[${groupIndex}]`,
                            description: `Group ${groupId} does not have an items array`
                        });
                        return;
                    }
                    
                    if (!Array.isArray(group.items)) {
                        issues.push({
                            type: 'invalid_items',
                            location: `documents[${documentIndex}].groups[${groupIndex}]`,
                            description: `Group ${groupId} items is not an array`
                        });
                        return;
                    }
                    
                    elementCounts.items += group.items.length;
                    
                    const itemIndexMap = {};
                    group.items.forEach(item => {
                        if (item && item.id) {
                            itemIndexMap[item.id] = item;
                        }
                    });
                    
                    // Check each item
                    group.items.forEach((item, itemIndex) => {
                        structure.items.push({
                            documentId,
                            groupId,
                            documentIndex,
                            groupIndex,
                            itemIndex
                        });
                        
                        // Check for null/undefined items
                        if (item === null || item === undefined) {
                            issues.push({
                                type: 'null_item',
                                location: `documents[${documentIndex}].groups[${groupIndex}].items[${itemIndex}]`,
                                description: `Item at index ${itemIndex} is null or undefined`
                            });
                            return;
                        }
                        
                        // Check for missing critical properties
                        if (item.type === undefined || item.type === null) {
                            issues.push({
                                type: 'missing_type',
                                location: `documents[${documentIndex}].groups[${groupIndex}].items[${itemIndex}]`,
                                description: `Item at index ${itemIndex} is missing type property`
                            });
                        }
                        
                        // Check for orphaned child ID references
                        if (Array.isArray(item.childIds)) {
                            item.childIds.forEach((childId, childIndex) => {
                                if (!itemIndexMap[childId]) {
                                    issues.push({
                                        type: 'missing_child',
                                        location: `documents[${documentIndex}].groups[${groupIndex}].items[${itemIndex}].childIds[${childIndex}]`,
                                        description: `Child id ${childId} at index ${childIndex} is missing from items`
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
    
    /**
     * Load document on demand (for active-set memory management)
     * @param {string} documentId - Document ID
     * @returns {Promise<Object|null>} - Loaded document or null
     */
    async loadDocument(documentId) {
        try {
            // Get document from current file data
            const appState = this._getAppState();
            if (appState) {
                // Try to get from active set first
                const doc = await activeSetManager.getDocument(documentId);
                if (doc) {
                    return doc;
                }
                
                // If not in active set, try loading from current file
                if (this.currentFilename) {
                    const fileData = await this.loadFile(this.currentFilename, false);
                    if (fileData && fileData.documents) {
                        const document = fileData.documents.find(doc => doc.id === documentId);
                        if (document) {
                            // Add to active set
                            await activeSetManager.getDocument(documentId);
                            return document;
                        }
                    }
                }
            }
            
            return null;
        } catch (error) {
            console.error(`[FileManager] Error loading document ${documentId}:`, error);
            return null;
        }
    }
    
    /**
     * Unload document from memory (for active-set memory management)
     * @param {string} documentId - Document ID
     * @returns {boolean} - True if unloaded
     */
    unloadDocument(documentId) {
        return activeSetManager.unloadDocument(documentId);
    }
    
    /**
     * Get document metadata without loading full document
     * @param {string} documentId - Document ID
     * @returns {Object|null} - Metadata object or null
     */
    getDocumentMetadata(documentId) {
        // Try active set manager first
        const metadata = activeSetManager.getMetadata(documentId);
        if (metadata) {
            return metadata;
        }
        
        // Fallback: try to get from appState documents
        const appState = this._getAppState();
        if (appState && appState.documents) {
            const doc = appState.documents.find(doc => doc.id === documentId);
            if (doc) {
                // Extract metadata
                return {
                    id: doc.id,
                    title: doc.title || '',
                    lastModified: doc.lastModified || Date.now(),
                    size: JSON.stringify(doc).length
                };
            }
        }
        
        return null;
    }
}


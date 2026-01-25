// SyncManager.js - Handles real-time synchronization via WebSocket
import { eventBus } from '../core/EventBus.js';
import { EVENTS } from '../core/AppEvents.js';
import { getService, SERVICES, hasService } from '../core/AppServices.js';
import { performanceBudgetManager } from '../core/PerformanceBudgetManager.js';

export class SyncManager {
    constructor() {
        this.ws = null;
        this.clientId = null;
        this.currentFilename = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 10;
        this.reconnectDelay = 1000;
        this.isConnected = false;
        this.pendingChanges = [];
        this.pendingFileJoin = null; // File to join once connected
        this.syncedFiles = new Set(); // Track files that have been synced (for initial sync detection)
        this._applyingRemoteOperation = false; // Flag to prevent echo when applying remote operations
        this.lastSyncedSequence = 0; // Track last synced sequence number
        
        // Listen to operation:applied events for operation-based sync
        eventBus.on('operation:applied', (event) => {
            this._handleOperationApplied(event);
        });
    }
    
    /**
     * Get services
     */
    _getAppState() {
        return getService(SERVICES.APP_STATE);
    }
    
    _getFileManager() {
        return getService(SERVICES.FILE_MANAGER);
    }
    
    _getDataManager() {
        return getService(SERVICES.DATA_MANAGER);
    }
    
    async connect() {
        // Don't reconnect if already connected
        if (this.isConnected && this.ws && this.ws.readyState === WebSocket.OPEN) {
            console.log('WebSocket already connected');
            return;
        }
        
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        // Use window.location.hostname which will be the actual IP when accessed from another device
        // or localhost when accessed locally
        const host = window.location.hostname;
        const wsPort = '8001'; // WebSocket server port
        
        const wsUrl = `${protocol}//${host}:${wsPort}`;
        
        console.log(`Connecting to WebSocket at ${wsUrl}`);
        
        return new Promise((resolve, reject) => {
            try {
                this.ws = new WebSocket(wsUrl);
                
                // Store resolve function to call when we get 'connected' message
                this._connectResolve = resolve;
                this._connectReject = reject;
                
                const timeout = setTimeout(() => {
                    if (this.ws && this.ws.readyState !== WebSocket.OPEN) {
                        this.ws.close();
                        if (this._connectReject) {
                            this._connectReject(new Error('WebSocket connection timeout'));
                            this._connectReject = null;
                        }
                    }
                }, 3000); // 3 second timeout - fail fast to avoid blocking initialization
                
                this.ws.onopen = () => {
                    console.log('WebSocket connected');
                    this.isConnected = true;
                    this.reconnectAttempts = 0;
                    
                    // Don't resolve yet - wait for 'connected' message with clientId
                    // The resolve will happen in handleMessage when we receive 'connected'
                };
                
                this.ws.onmessage = (event) => {
                    this.handleMessage(JSON.parse(event.data));
                };
                
                this.ws.onerror = (error) => {
                    clearTimeout(timeout);
                    console.error('WebSocket error:', error);
                    if (this._connectReject) {
                        this._connectReject(error);
                        this._connectReject = null;
                    }
                };
                
                this.ws.onclose = () => {
                    clearTimeout(timeout);
                    console.log('WebSocket disconnected');
                    this.isConnected = false;
                    this._connectResolve = null;
                    this._connectReject = null;
                    // Only attempt reconnect if this wasn't a manual close
                    if (!this.ws || this.ws.readyState === WebSocket.CLOSED) {
                        this.attemptReconnect();
                    }
                };
            } catch (error) {
                console.error('Failed to create WebSocket:', error);
                reject(error);
                this.attemptReconnect();
            }
        });
    }
    
    attemptReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
            console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})...`);
            setTimeout(() => this.connect(), delay);
        } else {
            console.error('Max reconnection attempts reached');
        }
    }
    
    handleMessage(message) {
        const { type } = message;
        
        switch (type) {
            case 'connected':
                this.clientId = message.clientId;
                console.log(`Received client ID: ${this.clientId}`);
                
                // Now that we have clientId, we can join files and send messages
                // Send any pending changes
                this.flushPendingChanges();
                
                // Join current file if any, or pending file join
                const fileToJoin = this.currentFilename || this.pendingFileJoin;
                if (fileToJoin) {
                    this.currentFilename = fileToJoin;
                    this.pendingFileJoin = null;
                    this.joinFile(fileToJoin);
                }
                
                // Resolve the connect promise if it's waiting
                if (this._connectResolve) {
                    this._connectResolve();
                    this._connectResolve = null;
                    this._connectReject = null;
                }
                break;
            case 'file_joined':
                this.handleFileJoined(message);
                break;
            case 'full_sync':
                this.handleFullSync(message);
                break;
            case 'change':
                this.handleRemoteChange(message);
                break;
            case 'undo':
                this.handleRemoteUndo(message);
                break;
            case 'redo':
                this.handleRemoteRedo(message);
                break;
            case 'client_joined':
                console.log(`Client ${message.clientId} joined ${message.filename}`);
                break;
            case 'client_left':
                console.log(`Client ${message.clientId} left ${message.filename}`);
                break;
            case 'operation_sync':
                this.handleOperationSync(message);
                break;
            case 'operations_response':
                this.handleOperationsResponse(message);
                break;
        }
    }
    
    /**
     * Handle operation:applied event (send operation to server)
     * @private
     */
    _handleOperationApplied(event) {
        // Don't send if applying remote operation (prevent echo)
        if (this._applyingRemoteOperation) {
            return;
        }
        
        // Don't send if not connected or no current file
        if (!this.isConnected || !this.currentFilename) {
            return;
        }
        
        const operation = event.operation;
        
        // Only send if operation has sequence (was logged)
        if (operation.sequence) {
            this.sendOperation(operation);
        }
    }
    
    /**
     * Send operation to server
     * @param {Object} operation - Operation object with sequence
     */
    sendOperation(operation) {
        if (!this.isConnected || !this.clientId || !this.currentFilename) {
            return;
        }
        
        this.send({
            type: 'operation_sync',
            filename: this.currentFilename,
            operation: {
                sequence: operation.sequence,
                op: operation.op,
                itemId: operation.itemId,
                params: operation.params,
                timestamp: operation.timestamp,
                clientId: this.clientId
            }
        });
        
        // Update last synced sequence
        if (operation.sequence > this.lastSyncedSequence) {
            this.lastSyncedSequence = operation.sequence;
        }
    }
    
    /**
     * Handle incoming operation sync message
     * @param {Object} message - Message from server
     */
    handleOperationSync(message) {
        performanceBudgetManager.measureOperation('SYNC', () => {
            if (message.filename !== this.currentFilename) return;
            if (message.clientId === this.clientId) return; // Ignore own operations
            
            const operation = message.operation;
            if (!operation) return;
            
            // Apply remote operation
            const semanticOpManager = getService(SERVICES.SEMANTIC_OPERATION_MANAGER);
            if (!semanticOpManager) {
                console.error('[SyncManager] SemanticOperationManager not available');
                return;
            }
            
            // Create operation instance
            const opInstance = semanticOpManager.createOperation(
                operation.op,
                operation.itemId,
                operation.params,
                operation.timestamp
            );
            
            if (!opInstance) {
                console.error('[SyncManager] Failed to create operation instance');
                return;
            }
            
            // Set client ID and sequence
            opInstance.clientId = operation.clientId;
            opInstance.sequence = operation.sequence;
            opInstance._skipLogging = true; // Don't log remote operations (already logged on server)
            
            // Apply operation (will emit operation:applied, but we skip sync)
            this._applyingRemoteOperation = true;
            const result = semanticOpManager.applyOperation(opInstance);
            this._applyingRemoteOperation = false;
            
            if (result && result.success) {
                // Update last synced sequence
                if (operation.sequence > this.lastSyncedSequence) {
                    this.lastSyncedSequence = operation.sequence;
                }
                
                // Also append to local operation log (for consistency)
                import('../core/OperationLog.js').then(({ getOperationLog }) => {
                    const fileManager = this._getFileManager();
                    if (fileManager && fileManager.currentFilename) {
                        const operationLog = getOperationLog(fileManager.currentFilename);
                        if (operationLog) {
                            // Check if operation already exists (by sequence)
                            const existing = operationLog.getOperations(operation.sequence - 1)
                                .find(op => op.sequence === operation.sequence);
                            if (!existing) {
                                // Append with existing sequence (don't assign new one)
                                operationLog.operations.push({
                                    sequence: operation.sequence,
                                    op: operation.op,
                                    itemId: operation.itemId,
                                    params: operation.params,
                                    timestamp: operation.timestamp,
                                    clientId: operation.clientId,
                                    filename: this.currentFilename
                                });
                                operationLog.save();
                            }
                        }
                    }
                }).catch(error => {
                    console.error('[SyncManager] Failed to import OperationLog:', error);
                });
            }
        }, { source: 'SyncManager-handleOperationSync' });
    }
    
    /**
     * Request operations since sequence (for catch-up sync)
     * @param {number} sinceSequence - Sequence number to start from
     */
    requestOperations(sinceSequence = 0) {
        if (!this.isConnected || !this.currentFilename) {
            return;
        }
        
        this.send({
            type: 'request_operations',
            filename: this.currentFilename,
            sinceSequence: sinceSequence
        });
    }
    
    /**
     * Handle operations response (catch-up sync)
     * @param {Object} message - Message from server
     */
    handleOperationsResponse(message) {
        if (message.filename !== this.currentFilename) return;
        
        const operations = message.operations || [];
        if (operations.length === 0) return;
        
        const semanticOpManager = getService(SERVICES.SEMANTIC_OPERATION_MANAGER);
        if (!semanticOpManager) {
            console.error('[SyncManager] SemanticOperationManager not available');
            return;
        }
        
        // Apply operations in order
        this._applyingRemoteOperation = true;
        
        // Also append to local operation log (for consistency)
        import('../core/OperationLog.js').then(({ getOperationLog }) => {
            const fileManager = this._getFileManager();
            if (fileManager && fileManager.currentFilename) {
                const operationLog = getOperationLog(fileManager.currentFilename);
                if (operationLog) {
                    for (const opData of operations) {
                        // Skip own operations
                        if (opData.clientId === this.clientId) {
                            continue;
                        }
                        
                        // Check if operation already exists (by sequence)
                        const existing = operationLog.getOperations(opData.sequence - 1)
                            .find(op => op.sequence === opData.sequence);
                        if (!existing) {
                            // Append with existing sequence (don't assign new one)
                            operationLog.operations.push({
                                sequence: opData.sequence,
                                op: opData.op,
                                itemId: opData.itemId,
                                params: opData.params,
                                timestamp: opData.timestamp,
                                clientId: opData.clientId,
                                filename: this.currentFilename
                            });
                        }
                    }
                    // Sort by sequence and save
                    operationLog.operations.sort((a, b) => (a.sequence || 0) - (b.sequence || 0));
                    operationLog.save();
                }
            }
        }).catch(error => {
            console.error('[SyncManager] Failed to import OperationLog:', error);
        });
        
        for (const opData of operations) {
            // Skip own operations
            if (opData.clientId === this.clientId) {
                continue;
            }
            
            const opInstance = semanticOpManager.createOperation(
                opData.op,
                opData.itemId,
                opData.params,
                opData.timestamp
            );
            
            if (opInstance) {
                opInstance.clientId = opData.clientId;
                opInstance.sequence = opData.sequence;
                opInstance._skipLogging = true; // Don't log (already logged)
                
                semanticOpManager.applyOperation(opInstance);
                
                // Update last synced sequence
                if (opData.sequence > this.lastSyncedSequence) {
                    this.lastSyncedSequence = opData.sequence;
                }
            }
        }
        this._applyingRemoteOperation = false;
        
        console.log(`[SyncManager] Applied ${operations.length} operations for catch-up sync`);
    }
    
    /**
     * Check if file has been synced (for initial sync detection)
     * @param {string} filename - File name
     * @returns {boolean}
     */
    _hasSyncedFile(filename) {
        return this.syncedFiles.has(filename);
    }
    
    /**
     * Mark file as synced
     * @param {string} filename - File name
     */
    _markFileSynced(filename) {
        this.syncedFiles.add(filename);
    }
    
    handleFileJoined(message) {
        // File data received from server
        const fileManager = this._getFileManager();
        if (message.data && fileManager) {
            // Update app data if it matches current file
            if (this.currentFilename === message.filename) {
                const appState = this._getAppState();
                const dataManager = this._getDataManager();
                
                // Compare data FIRST - if identical, skip entirely
                const currentData = JSON.stringify(appState.documents);
                const newData = JSON.stringify(message.data.documents || []);
                
                if (currentData === newData) {
                    console.log('[SyncManager] File join data matches local data exactly, skipping update');
                    // Update timestamp to match remote but don't overwrite data
                    const remoteTimestamp = message.timestamp || message.data?._lastSyncTimestamp || message.data?.timestamp || 0;
                    if (remoteTimestamp > 0 && dataManager) {
                        dataManager._lastSyncTimestamp = remoteTimestamp;
                    }
                    return;
                }
                
                // Data is different - check timestamps
                const remoteTimestamp = message.timestamp || message.data?._lastSyncTimestamp || message.data?.timestamp || 0;
                const localTimestamp = dataManager?._lastSyncTimestamp || 0;
                
                // If we just loaded the file (timestamp was set recently), be very conservative
                // Only apply remote if it's significantly newer (more than 2 seconds)
                if (localTimestamp > 0) {
                    const timeSinceLoad = Date.now() - localTimestamp;
                    // If we loaded less than 3 seconds ago, only apply remote if it's significantly newer
                    if (timeSinceLoad < 3000) {
                        const timeDiff = remoteTimestamp - localTimestamp;
                        if (timeDiff < 2000) {
                            console.log(`[SyncManager] Ignoring file join - just loaded file ${timeSinceLoad}ms ago, remote not significantly newer (diff: ${timeDiff}ms)`);
                            return;
                        }
                    }
                }
                
                // Only apply if remote change is newer (or if we don't have a local timestamp)
                if (remoteTimestamp < localTimestamp && localTimestamp > 0) {
                    console.log(`[SyncManager] Ignoring older file join (remote: ${remoteTimestamp}, local: ${localTimestamp})`);
                    return;
                }
                
                // Update local timestamp
                if (remoteTimestamp > 0) {
                    if (dataManager) {
                        dataManager._lastSyncTimestamp = remoteTimestamp;
                    }
                }
                
                // Apply remote data
                console.log('[SyncManager] Applying file join data (remote is newer or equal)');
                appState.documents = message.data.documents || [];
                appState.currentDocumentId = message.data.currentDocumentId || (appState.documents.length > 0 ? appState.documents[0].id : 'document-1');
                appState.groupStates = message.data.groupStates || {};
                appState.subtaskStates = message.data.subtaskStates || {};
                appState.allSubtasksExpanded = message.data.allSubtasksExpanded !== undefined ? message.data.allSubtasksExpanded : true;
                if (message.data.settings) {
                    const settingsManager = getService(SERVICES.SETTINGS_MANAGER);
                    if (settingsManager) {
                        settingsManager.saveSettings(message.data.settings);
                    }
                }
                
                // Mark file as synced (initial sync complete)
                this._markFileSynced(message.filename);
                
                eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
            }
        }
    }
    
    handleFullSync(message) {
        performanceBudgetManager.measureOperation('SYNC', () => {
            // Handle full data sync from another device
            // Don't apply if it's from ourselves (prevent echo)
            if (message.clientId && message.clientId === this.clientId) {
                return;
            }
            
            if (message.filename === this.currentFilename) {
            const appState = this._getAppState();
            const dataManager = this._getDataManager();
            
            // Check timestamp to prevent older changes from overwriting newer ones
            const remoteTimestamp = message.timestamp || message.data?.timestamp || 0;
            const localTimestamp = dataManager?._lastSyncTimestamp || 0;
            
            // Only apply if remote change is newer (or if we don't have a local timestamp)
            if (remoteTimestamp < localTimestamp && localTimestamp > 0) {
                console.log(`Ignoring older sync (remote: ${remoteTimestamp}, local: ${localTimestamp})`);
                return;
            }
            
            // Only update if data is different to avoid unnecessary renders
            const currentData = JSON.stringify(appState.documents);
            const newData = JSON.stringify(message.data.documents || []);
            if (currentData !== newData) {
                // Update local timestamp to match remote
                if (dataManager) {
                    dataManager._lastSyncTimestamp = remoteTimestamp;
                }
                
                // Temporarily disable sync to prevent echo loop
                const wasConnected = this.isConnected;
                this.isConnected = false;
                
                appState.documents = message.data.documents || [];
                appState.currentDocumentId = message.data.currentDocumentId || (appState.documents.length > 0 ? appState.documents[0].id : 'document-1');
                appState.groupStates = message.data.groupStates || {};
                appState.subtaskStates = message.data.subtaskStates || {};
                appState.allSubtasksExpanded = message.data.allSubtasksExpanded !== undefined ? message.data.allSubtasksExpanded : true;
                if (message.data.settings) {
                    const settingsManager = getService(SERVICES.SETTINGS_MANAGER);
                    if (settingsManager) {
                        settingsManager.saveSettings(message.data.settings);
                    }
                }
                
                // Mark file as synced (if not already)
                this._markFileSynced(message.filename);
                
                // Save to localStorage but don't trigger sync (we're already synced)
                // Request data save with skipSync flag via EventBus
                eventBus.emit(EVENTS.DATA.SAVE_REQUESTED, true);
                
                eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
                
                // Re-enable sync after a brief delay
                setTimeout(() => {
                    this.isConnected = wasConnected;
                }, 100);
            }
            }
        }, { source: 'SyncManager-handleFullSync' });
    }
    
    handleRemoteChange(message) {
        performanceBudgetManager.measureOperation('SYNC', () => {
            // Apply remote change
            if (message.filename === this.currentFilename && this.app && this.app.undoRedoManager) {
                this.app.undoRedoManager.applyRemoteChange(message.change);
            }
        }, { source: 'SyncManager-handleRemoteChange' });
    }
    
    handleRemoteUndo(message) {
        if (message.filename === this.currentFilename && this.app && this.app.undoRedoManager) {
            this.app.undoRedoManager.handleRemoteUndo(message.changeId);
        }
    }
    
    handleRemoteRedo(message) {
        if (message.filename === this.currentFilename && this.app && this.app.undoRedoManager) {
            this.app.undoRedoManager.handleRemoteRedo(message.changeId);
        }
    }
    
    joinFile(filename) {
        if (!this.isConnected || !this.clientId) {
            console.warn('WebSocket not connected, cannot join file');
            return;
        }
        
        this.currentFilename = filename;
        this.send({
            type: 'join_file',
            filename: filename
        });
    }
    
    leaveFile(filename) {
        if (!this.isConnected || !this.clientId) {
            return;
        }
        
        this.send({
            type: 'leave_file',
            filename: filename
        });
        
        if (this.currentFilename === filename) {
            this.currentFilename = null;
        }
    }
    
    sendChange(change) {
        if (!this.isConnected || !this.clientId || !this.currentFilename) {
            // Queue for later
            this.pendingChanges.push(change);
            return;
        }
        
        this.send({
            type: 'change',
            filename: this.currentFilename,
            change: change
        });
    }
    
    sendUndo(changeId) {
        if (!this.isConnected || !this.currentFilename) {
            return;
        }
        
        this.send({
            type: 'undo',
            filename: this.currentFilename,
            changeId: changeId
        });
    }
    
    sendRedo(changeId) {
        if (!this.isConnected || !this.currentFilename) {
            return;
        }
        
        this.send({
            type: 'redo',
            filename: this.currentFilename,
            changeId: changeId
        });
    }
    
    send(message) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        } else {
            console.warn('WebSocket not ready, queuing message');
            this.pendingChanges.push(message);
        }
    }
    
    flushPendingChanges() {
        while (this.pendingChanges.length > 0) {
            const change = this.pendingChanges.shift();
            if (change.type === 'change') {
                this.sendChange(change.change);
            } else {
                this.send(change);
            }
        }
    }
    
    disconnect() {
        if (this.currentFilename) {
            this.leaveFile(this.currentFilename);
        }
        if (this.ws) {
            this.ws.close();
        }
    }
}


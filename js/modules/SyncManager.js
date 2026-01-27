// SyncManager.js - Handles real-time synchronization via WebSocket
import { eventBus } from '../core/EventBus.js';
import { EVENTS } from '../core/AppEvents.js';
import { getService, SERVICES, hasService } from '../core/AppServices.js';
import { performanceBudgetManager } from '../core/PerformanceBudgetManager.js';
import { SyncConflictResolver } from '../utils/SyncConflictResolver.js';
import { SyncQueue } from '../utils/SyncQueue.js';
import { SyncProtocol } from '../utils/SyncProtocol.js';
import { SyncState } from '../utils/SyncState.js';

export class SyncManager {
    constructor() {
        this.ws = null;
        this.state = new SyncState();
        this.queue = new SyncQueue();
        
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
        if (this.state.getConnectionState() && this.ws && this.ws.readyState === WebSocket.OPEN) {
            console.log('WebSocket already connected');
            return;
        }
        
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        // Use window.location.hostname which will be the actual IP when accessed from another device
        // or localhost when accessed locally
        const host = window.location.hostname;
        const wsPort = '8000'; // WebSocket server port
        
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
                    this.state.setConnectionState(false);
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
        if (!SyncProtocol.validateMessage(message)) {
            console.error('[SyncManager] Invalid message received');
            return;
        }
        
        const handlers = {
            'connected': (msg) => {
                this.state.setClientId(msg.clientId);
                console.log(`Received client ID: ${this.state.getClientId()}`);
                
                // Now that we have clientId, we can join files and send messages
                // Send any pending changes
                this.flushPendingChanges();
                
                // Join current file if any, or pending file join
                const fileToJoin = this.state.getCurrentFilename() || this.state.getPendingFileJoin();
                if (fileToJoin) {
                    this.state.setCurrentFilename(fileToJoin);
                    this.state.setPendingFileJoin(null);
                    this.joinFile(fileToJoin);
                }
                
                // Resolve the connect promise if it's waiting
                if (this._connectResolve) {
                    this._connectResolve();
                    this._connectResolve = null;
                    this._connectReject = null;
                }
            },
            'file_joined': (msg) => this.handleFileJoined(msg),
            'full_sync': (msg) => this.handleFullSync(msg),
            'change': (msg) => this.handleRemoteChange(msg),
            'undo': (msg) => this.handleRemoteUndo(msg),
            'redo': (msg) => this.handleRemoteRedo(msg),
            'client_joined': (msg) => {
                console.log(`Client ${msg.clientId} joined ${msg.filename}`);
            },
            'client_left': (msg) => {
                console.log(`Client ${msg.clientId} left ${msg.filename}`);
            },
            'operation_sync': (msg) => this.handleOperationSync(msg),
            'operations_response': (msg) => this.handleOperationsResponse(msg)
        };
        
        SyncProtocol.routeMessage(message, handlers);
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
        if (!this.state.getConnectionState() || !this.state.getClientId() || !this.state.getCurrentFilename()) {
            return;
        }
        
        const message = SyncProtocol.createOperationSyncMessage(
            this.state.getCurrentFilename(),
            operation,
            this.state.getClientId()
        );
        
        this.send(message);
        
        // Update last synced sequence
        this.state.updateLastSyncedSequence(operation.sequence);
    }
    
    /**
     * Handle incoming operation sync message
     * @param {Object} message - Message from server
     */
    handleOperationSync(message) {
        performanceBudgetManager.measureOperation('SYNC', () => {
            if (message.filename !== this.state.getCurrentFilename()) return;
            if (message.clientId === this.state.getClientId()) return; // Ignore own operations
            
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
                                    filename: this.state.getCurrentFilename()
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
        if (message.filename !== this.state.getCurrentFilename()) return;
        
        const operations = message.operations || [];
        if (operations.length === 0) return;
        
        const semanticOpManager = getService(SERVICES.SEMANTIC_OPERATION_MANAGER);
        if (!semanticOpManager) {
            console.error('[SyncManager] SemanticOperationManager not available');
            return;
        }
        
        // Apply operations in order
        this.state.setApplyingRemoteOperation(true);
        
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
            if (opData.clientId === this.state.getClientId()) {
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
                this.state.updateLastSyncedSequence(opData.sequence);
            }
        }
        this.state.setApplyingRemoteOperation(false);
        
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
            if (this.state.getCurrentFilename() === message.filename) {
                const appState = this._getAppState();
                const dataManager = this._getDataManager();
                
                const localData = appState.documents;
                const remoteData = message.data.documents || [];
                const remoteTimestamp = SyncConflictResolver.extractTimestamp(message);
                const localTimestamp = dataManager?._lastSyncTimestamp || 0;
                const timeSinceLoad = localTimestamp > 0 ? Date.now() - localTimestamp : 0;
                
                // Resolve conflict
                const resolution = SyncConflictResolver.resolveDataConflict(
                    localData,
                    remoteData,
                    localTimestamp,
                    remoteTimestamp,
                    { timeSinceLoad }
                );
                
                if (!resolution.shouldApply) {
                    console.log(`[SyncManager] Not applying file join: ${resolution.reason}`);
                    return;
                }
                
                // Update timestamp if needed
                if (remoteTimestamp > 0 && dataManager) {
                    dataManager._lastSyncTimestamp = remoteTimestamp;
                }
                
                // Skip data update if data is identical
                if (resolution.skipDataUpdate) {
                    console.log('[SyncManager] File join data matches local data exactly, skipping update');
                    return;
                }
                
                // Apply remote data
                console.log('[SyncManager] Applying file join data (remote is newer or equal)');
                appState.documents = remoteData;
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
                this.state.markFileSynced(message.filename);
                
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
            if (message.filename === this.state.getCurrentFilename() && this.app && this.app.undoRedoManager) {
                this.app.undoRedoManager.applyRemoteChange(message.change);
            }
        }, { source: 'SyncManager-handleRemoteChange' });
    }
    
    handleRemoteUndo(message) {
        if (message.filename === this.state.getCurrentFilename() && this.app && this.app.undoRedoManager) {
            this.app.undoRedoManager.handleRemoteUndo(message.changeId);
        }
    }
    
    handleRemoteRedo(message) {
        if (message.filename === this.state.getCurrentFilename() && this.app && this.app.undoRedoManager) {
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
        if (!this.state.getConnectionState() || !this.state.getClientId() || !this.state.getCurrentFilename()) {
            // Queue for later
            this.queue.enqueue({ type: 'change', change });
            return;
        }
        
        const message = SyncProtocol.createChangeMessage(this.state.getCurrentFilename(), change);
        this.send(message);
    }
    
    sendUndo(changeId) {
        if (!this.state.getConnectionState() || !this.state.getCurrentFilename()) {
            return;
        }
        
        const message = SyncProtocol.createUndoMessage(this.state.getCurrentFilename(), changeId);
        this.send(message);
    }
    
    sendRedo(changeId) {
        if (!this.state.getConnectionState() || !this.state.getCurrentFilename()) {
            return;
        }
        
        const message = SyncProtocol.createRedoMessage(this.state.getCurrentFilename(), changeId);
        this.send(message);
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
        if (this.state.getCurrentFilename()) {
            this.leaveFile(this.state.getCurrentFilename());
        }
        if (this.ws) {
            this.ws.close();
        }
    }
}


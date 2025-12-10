// SyncManager.js - Handles real-time synchronization via WebSocket
import { eventBus } from '../core/EventBus.js';
import { EVENTS } from '../core/AppEvents.js';

export class SyncManager {
    constructor(app) {
        this.app = app;
        this.ws = null;
        this.clientId = null;
        this.currentFilename = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 10;
        this.reconnectDelay = 1000;
        this.isConnected = false;
        this.pendingChanges = [];
        this.pendingFileJoin = null; // File to join once connected
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
        }
    }
    
    handleFileJoined(message) {
        // File data received from server
        if (message.data && this.app && this.app.fileManager) {
            // Update app data if it matches current file
            if (this.currentFilename === message.filename) {
                // Check timestamp to prevent older changes from overwriting newer ones
                const remoteTimestamp = message.timestamp || message.data?._lastSyncTimestamp || message.data?.timestamp || 0;
                const localTimestamp = this.app.dataManager._lastSyncTimestamp || 0;
                
                // Only apply if remote change is newer (or if we don't have a local timestamp)
                if (remoteTimestamp < localTimestamp && localTimestamp > 0) {
                    console.log(`Ignoring older file join (remote: ${remoteTimestamp}, local: ${localTimestamp})`);
                    return;
                }
                
                // Update local timestamp
                if (remoteTimestamp > 0) {
                    this.app.dataManager._lastSyncTimestamp = remoteTimestamp;
                }
                
                // Only update if data is different to avoid unnecessary renders
                const currentData = JSON.stringify(this.app.pages);
                const newData = JSON.stringify(message.data.pages || []);
                if (currentData !== newData) {
                    this.app.pages = message.data.pages || [];
                    this.app.currentPageId = message.data.currentPageId || (this.app.pages.length > 0 ? this.app.pages[0].id : 'page-1');
                    this.app.binStates = message.data.binStates || {};
                    this.app.subtaskStates = message.data.subtaskStates || {};
                    this.app.allSubtasksExpanded = message.data.allSubtasksExpanded !== undefined ? message.data.allSubtasksExpanded : true;
                    if (message.data.settings) {
                        this.app.settingsManager.saveSettings(message.data.settings);
                    }
                    this.app.render();
                }
            }
        }
    }
    
    handleFullSync(message) {
        // Handle full data sync from another device
        // Don't apply if it's from ourselves (prevent echo)
        if (message.clientId && message.clientId === this.clientId) {
            return;
        }
        
        if (message.filename === this.currentFilename && this.app) {
            // Check timestamp to prevent older changes from overwriting newer ones
            const remoteTimestamp = message.timestamp || message.data?.timestamp || 0;
            const localTimestamp = this.app.dataManager._lastSyncTimestamp || 0;
            
            // Only apply if remote change is newer (or if we don't have a local timestamp)
            if (remoteTimestamp < localTimestamp && localTimestamp > 0) {
                console.log(`Ignoring older sync (remote: ${remoteTimestamp}, local: ${localTimestamp})`);
                return;
            }
            
            // Only update if data is different to avoid unnecessary renders
            const currentData = JSON.stringify(this.app.pages);
            const newData = JSON.stringify(message.data.pages || []);
            if (currentData !== newData) {
                // Update local timestamp to match remote
                this.app.dataManager._lastSyncTimestamp = remoteTimestamp;
                
                // Temporarily disable sync to prevent echo loop
                const wasConnected = this.isConnected;
                this.isConnected = false;
                
                this.app.pages = message.data.pages || [];
                this.app.currentPageId = message.data.currentPageId || (this.app.pages.length > 0 ? this.app.pages[0].id : 'page-1');
                this.app.binStates = message.data.binStates || {};
                this.app.subtaskStates = message.data.subtaskStates || {};
                this.app.allSubtasksExpanded = message.data.allSubtasksExpanded !== undefined ? message.data.allSubtasksExpanded : true;
                if (message.data.settings) {
                    this.app.settingsManager.saveSettings(message.data.settings);
                }
                
                // Save to localStorage but don't trigger sync (we're already synced)
                // Request data save with skipSync flag via EventBus
                eventBus.emit(EVENTS.DATA.SAVE_REQUESTED, true);
                
                this.app.render();
                
                // Re-enable sync after a brief delay
                setTimeout(() => {
                    this.isConnected = wasConnected;
                }, 100);
            }
        }
    }
    
    handleRemoteChange(message) {
        // Apply remote change
        if (message.filename === this.currentFilename && this.app && this.app.undoRedoManager) {
            this.app.undoRedoManager.applyRemoteChange(message.change);
        }
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


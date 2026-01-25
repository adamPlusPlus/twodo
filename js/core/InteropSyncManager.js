// InteropSyncManager.js - Bidirectional sync manager for interoperability
import { DataUtils } from '../utils/data.js';
import { eventBus } from './EventBus.js';
import { performanceBudgetManager } from './PerformanceBudgetManager.js';

export class InteropSyncManager {
    constructor(app) {
        this.app = app;
        this.syncConfigs = {}; // pageId -> sync configuration
        this.syncStatus = {}; // pageId -> sync status
        this.syncQueue = []; // Queue of sync operations
        this.isSyncing = false;
        this.initEventListeners();
    }
    
    initEventListeners() {
        eventBus.on('element:created', this.handleElementChange.bind(this));
        eventBus.on('element:updated', this.handleElementChange.bind(this));
        eventBus.on('element:deleted', this.handleElementChange.bind(this));
    }

    _getDocument(pageId) {
        const documents = this.app.documents || this.app.appState?.documents || [];
        return documents.find(page => page.id === pageId) || null;
    }
    
    handleElementChange({ pageId }) {
        // Queue sync if page has active sync config
        if (this.syncConfigs[pageId]?.enabled) {
            this.queueSync(pageId);
        }
    }
    
    /**
     * Register sync configuration for a page
     */
    registerSync(pageId, config) {
        this.syncConfigs[pageId] = {
            enabled: true,
            service: config.service, // 'todoist', 'trello', 'notion', etc.
            direction: config.direction || 'bidirectional', // 'bidirectional', 'import', 'export'
            conflictResolution: config.conflictResolution || 'last-write-wins',
            syncInterval: config.syncInterval || 300000, // 5 minutes default
            lastSync: null,
            ...config
        };
        
        // Start sync interval if enabled
        if (this.syncConfigs[pageId].enabled) {
            this.startSyncInterval(pageId);
        }
    }
    
    /**
     * Start periodic sync for a page
     */
    startSyncInterval(pageId) {
        const config = this.syncConfigs[pageId];
        if (!config || config.syncIntervalId) return;
        
        config.syncIntervalId = setInterval(() => {
            this.syncPage(pageId);
        }, config.syncInterval);
    }
    
    /**
     * Stop sync for a page
     */
    stopSync(pageId) {
        const config = this.syncConfigs[pageId];
        if (config?.syncIntervalId) {
            clearInterval(config.syncIntervalId);
            delete config.syncIntervalId;
        }
        if (this.syncConfigs[pageId]) {
            this.syncConfigs[pageId].enabled = false;
        }
    }
    
    /**
     * Queue a sync operation
     */
    queueSync(pageId) {
        if (!this.syncQueue.includes(pageId)) {
            this.syncQueue.push(pageId);
        }
        
        if (!this.isSyncing) {
            this.processSyncQueue();
        }
    }
    
    /**
     * Process sync queue
     */
    async processSyncQueue() {
        if (this.isSyncing || this.syncQueue.length === 0) return;
        
        this.isSyncing = true;
        
        while (this.syncQueue.length > 0) {
            const pageId = this.syncQueue.shift();
            try {
                await this.syncPage(pageId);
            } catch (error) {
                console.error(`Sync failed for page ${pageId}:`, error);
                this.syncStatus[pageId] = {
                    status: 'error',
                    error: error.message,
                    lastAttempt: new Date().toISOString()
                };
            }
        }
        
        this.isSyncing = false;
    }
    
    /**
     * Sync a specific page
     */
    async syncPage(pageId) {
        return performanceBudgetManager.measureOperation('SYNC', async () => {
            const config = this.syncConfigs[pageId];
            if (!config || !config.enabled) return;
            
            this.syncStatus[pageId] = {
                status: 'syncing',
                lastSync: new Date().toISOString()
            };
            
            try {
                const page = this._getDocument(pageId);
                if (!page) {
                    throw new Error('Page not found');
                }
                
                // Get service client
                const client = this.getServiceClient(config.service);
                if (!client) {
                    throw new Error(`Service client not available: ${config.service}`);
                }
                
                // Perform sync based on direction
                if (config.direction === 'export' || config.direction === 'bidirectional') {
                    await this.exportToService(pageId, client, config);
                }
                
                if (config.direction === 'import' || config.direction === 'bidirectional') {
                    await this.importFromService(pageId, client, config);
                }
                
                config.lastSync = new Date().toISOString();
                this.syncStatus[pageId] = {
                    status: 'success',
                    lastSync: config.lastSync
                };
                
                eventBus.emit('sync:completed', { pageId, status: 'success' });
            } catch (error) {
                this.syncStatus[pageId] = {
                    status: 'error',
                    error: error.message,
                    lastSync: new Date().toISOString()
                };
                eventBus.emit('sync:failed', { pageId, error: error.message });
                throw error;
            }
        }, { source: 'InteropSyncManager-syncPage', pageId });
    }
    
    /**
     * Export page to external service
     */
    async exportToService(pageId, client, config) {
        const page = this._getDocument(pageId);
        if (!page) return;
        
        // Transform page data to service format
        const serviceData = this.transformToServiceFormat(page, config.service);
        
        // Send to service
        await client.syncTasks(serviceData, config);
    }
    
    /**
     * Import from external service
     */
    async importFromService(pageId, client, config) {
        const page = this._getDocument(pageId);
        if (!page) return;
        
        // Fetch from service
        const serviceData = await client.getTasks(config);
        
        // Transform to twodo format
        const twodoData = this.transformFromServiceFormat(serviceData, config.service);
        
        // Merge with existing page (handle conflicts)
        this.mergeData(page, twodoData, config);
        
        this.app.dataManager.saveData();
        this.app.render();
    }
    
    /**
     * Transform twodo data to service format
     */
    transformToServiceFormat(page, service) {
        // Override in service-specific implementations
        return {
            title: page.title,
            items: page.groups?.flatMap(bin => 
                bin.items?.map(element => ({
                    content: element.text,
                    completed: element.completed,
                    due_date: element.deadline,
                    labels: element.tags || []
                })) || []
            ) || []
        };
    }
    
    /**
     * Transform service data to twodo format
     */
    transformFromServiceFormat(serviceData, service) {
        // Override in service-specific implementations
        return {
            groups: [{
                id: 'bin-0',
                title: 'Imported',
                items: (serviceData.items || []).map(item => ({
                    type: 'task',
                    text: item.content || item.name,
                    completed: item.completed || false,
                    deadline: item.due_date || item.due,
                    tags: item.labels || []
                }))
            }]
        };
    }
    
    /**
     * Merge imported data with existing page
     */
    mergeData(page, importedData, config) {
        // Simple merge - add new elements, update existing if conflict resolution allows
        if (config.conflictResolution === 'last-write-wins') {
            // Replace with imported data
            if (importedData.groups) {
                page.groups = importedData.groups;
            }
        } else if (config.conflictResolution === 'merge') {
            // Merge groups and items
            importedData.groups?.forEach(importedGroup => {
                const existingGroup = page.groups?.find(b => b.id === importedGroup.id);
                if (existingGroup) {
                    // Merge items
                    importedGroup.items?.forEach(element => {
                        const existing = existingGroup.items?.find(e => e.text === element.text);
                        if (!existing) {
                            existingGroup.items.push(element);
                        }
                    });
                } else {
                    if (!page.groups) page.groups = [];
                    page.groups.push(importedGroup);
                }
            });
        }
    }
    
    /**
     * Get service client instance
     */
    getServiceClient(service) {
        // This would return service-specific clients
        // For now, return null (clients would be registered separately)
        return this.app.serviceClients?.[service] || null;
    }
    
    /**
     * Get sync status for a page
     */
    getSyncStatus(pageId) {
        return this.syncStatus[pageId] || { status: 'idle' };
    }
}



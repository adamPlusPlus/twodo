// AppInitializationManager.js - Handles application initialization
// Extracted from app.js to reduce coupling and improve modularity
import { eventBus } from './EventBus.js';
import { EVENTS } from './AppEvents.js';
import { pluginDiscovery } from './PluginDiscoveryManager.js';

/**
 * AppInitializationManager - Manages application initialization sequence
 * 
 * Handles plugin loading, async initialization, and startup sequence.
 */
export class AppInitializationManager {
    constructor(app) {
        this.app = app;
    }
    
    /**
     * Initialize the application
     * This is the main initialization method called from app.js
     */
    async init() {
        // Load settings first
        const settings = this.app.settingsManager.loadSettings();
        this.app.settingsManager.applySettings(settings);
        
        // Check for file parameter in URL (before loading other data)
        const urlParams = new URLSearchParams(window.location.search);
        const fileParam = urlParams.get('file');
        if (fileParam) {
            try {
                // Load the file specified in URL
                const fileData = await this.app.fileManager.loadFile(fileParam);
                const documents = fileData.documents || [];
                if (Array.isArray(documents)) {
                    this.app.documents = documents;
                    if (this.app.appState) {
                        this.app.appState.documents = documents;
                        const currentId = fileData.currentDocumentId;
                        if (currentId) {
                            this.app.appState.currentDocumentId = currentId;
                        }
                    }
                    // Store as last opened file
                    localStorage.setItem('twodo-last-opened-file', fileParam);
                    console.log(`Loaded file from URL: ${fileParam}`);
                }
            } catch (error) {
                console.warn('Failed to load file from URL:', error);
                // Fall through to load last opened file or default
            }
        } else {
            // Check daily reset before loading data (only if no URL file param)
            this.app.dataManager.checkDailyReset();
            
            // Load data (only once, only if no URL file param)
            this.app.dataManager.loadData();
        }
        
        // Initialize format renderer manager from loaded data
        if (this.app.formatRendererManager) {
            this.app.formatRendererManager.initializeFromSavedData();
        }
        
        // Initialize relationships from loaded data (fast, synchronous)
        this.app.relationshipManager.initializeFromData();
        
        // Set up event listeners
        this.app.eventHandler.setupEventListeners();
        this.app.setupTrashIcon();
        
        // Load last opened file BEFORE rendering to ensure we have the correct data
        // This prevents rendering with empty/default data and then re-rendering
        const initLoadStart = performance.now();
        await this.app.loadLastOpenedFile();
        const initLoadTime = performance.now() - initLoadStart;
        // console.log(`[DIAG] AppInitializer.init() - loadLastOpenedFile took: ${initLoadTime.toFixed(1)}ms`);
        
        // Now render with the loaded data
        eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
        
        // Now do async operations in the background (non-blocking)
        // Connect to sync if needed
        (async () => {
            // After loading file, connect to sync if needed
            if (this.app.fileManager && this.app.fileManager.currentFilename && this.app.syncManager) {
                // Store filename to join once connected
                this.app.syncManager.pendingFileJoin = this.app.fileManager.currentFilename;
                
                // Connect to WebSocket (non-blocking, will retry automatically)
                // Don't await - let it connect in the background
                this.app.syncManager.connect().catch(error => {
                    console.warn('WebSocket connection failed, will retry:', error);
                    // Connection will retry automatically, and joinFile will be called on connect
                });
            }
        })();
        
        // Initialize plugin system in background (loads in parallel for faster startup)
        // This happens after initial render so the UI appears quickly
        this.app.initializePlugins().catch(err => console.error('Plugin initialization error:', err));
        
        // Initialize global search in background
        this.app.initializeGlobalSearch().catch(err => console.error('Global search initialization error:', err));
        
        // Rebuild search index in background (non-blocking)
        if (this.app.searchIndex) {
            // Use requestIdleCallback if available, otherwise setTimeout
            if (window.requestIdleCallback) {
                requestIdleCallback(() => this.app.searchIndex.rebuildIndex());
            } else {
                setTimeout(() => this.app.searchIndex.rebuildIndex(), 0);
            }
        }
    }
    
    /**
     * Load all available plugins
     * Uses PluginDiscovery to load plugins from manifest
     */
    async loadAllPlugins() {
        // Get plugin definitions from PluginDiscovery
        const plugins = await pluginDiscovery.getAllPlugins();
        
        // Load all plugins
        const loadPromises = [];
        
        // Load element types
        for (const pluginDef of plugins.elementTypes) {
            loadPromises.push(
                this.app.pluginLoader.loadPlugin(pluginDef.path, pluginDef.name, this.app)
                    .catch(err => {
                        // Silently ignore connection/fetch errors (file doesn't exist or server issue)
                        // These are expected for optional plugins that may not be implemented yet
                        const isFetchError = err instanceof TypeError && 
                            (err.message.includes('Failed to fetch') || 
                             err.message.includes('ERR_CONNECTION_REFUSED') ||
                             err.message.includes('dynamically imported module'));
                        if (isFetchError) {
                            return null;
                        }
                        // Log other unexpected errors
                        console.warn(`Failed to load element type ${pluginDef.name}:`, err);
                        return null;
                    })
            );
        }
        
        // Load page plugins
        for (const pluginDef of plugins.pagePlugins) {
            loadPromises.push(
                this.app.pluginLoader.loadPlugin(pluginDef.path, pluginDef.name, this.app)
                    .catch(err => {
                        const isFetchError = err instanceof TypeError && 
                            (err.message.includes('Failed to fetch') || 
                             err.message.includes('ERR_CONNECTION_REFUSED') ||
                             err.message.includes('dynamically imported module'));
                        if (isFetchError) {
                            return null;
                        }
                        console.warn(`Failed to load page plugin ${pluginDef.name}:`, err);
                        return null;
                    })
            );
        }
        
        // Load bin plugins
        for (const pluginDef of plugins.binPlugins) {
            loadPromises.push(
                this.app.pluginLoader.loadPlugin(pluginDef.path, pluginDef.name, this.app)
                    .catch(err => {
                        const isFetchError = err instanceof TypeError && 
                            (err.message.includes('Failed to fetch') || 
                             err.message.includes('ERR_CONNECTION_REFUSED') ||
                             err.message.includes('dynamically imported module'));
                        if (isFetchError) {
                            return null;
                        }
                        console.warn(`Failed to load bin plugin ${pluginDef.name}:`, err);
                        return null;
                    })
            );
        }
        
        // Load format renderers
        for (const pluginDef of plugins.formatRenderers) {
            loadPromises.push(
                this.app.pluginLoader.loadPlugin(pluginDef.path, pluginDef.name, this.app)
                    .catch(err => {
                        const isFetchError = err instanceof TypeError && 
                            (err.message.includes('Failed to fetch') || 
                             err.message.includes('ERR_CONNECTION_REFUSED') ||
                             err.message.includes('dynamically imported module'));
                        if (isFetchError) {
                            return null;
                        }
                        console.warn(`Failed to load format renderer ${pluginDef.name}:`, err);
                        return null;
                    })
            );
        }
        
        // Wait for all plugins to load
        await Promise.allSettled(loadPromises);
        console.log('All plugins loaded');
        
        // Rescan for formats after all plugins are loaded
        if (this.app.formatRendererManager) {
            console.log('[AppInitializer] Rescanning for formats after plugin load...');
            this.app.formatRendererManager.scanForFormats();
        }
    }
    
    /**
     * Initialize plugin system
     */
    async initializePlugins() {
        // Load all available plugins first (already parallel)
        await this.loadAllPlugins();
        
        // Initialize plugins for existing documents and groups in parallel
        const initPromises = [];
        for (const page of this.app.documents) {
            initPromises.push(
                this.app.pagePluginManager.initializePagePlugins(page.id)
                    .catch(err => console.warn(`Failed to initialize page plugins for ${page.id}:`, err))
            );
            if (page.groups) {
                for (const bin of page.groups) {
                    initPromises.push(
                        this.app.binPluginManager.initializeBinPlugins(page.id, bin.id)
                            .catch(err => console.warn(`Failed to initialize bin plugins for ${page.id}/${bin.id}:`, err))
                    );
                }
            }
        }
        // Wait for all plugin initializations in parallel
        await Promise.allSettled(initPromises);
    }
    
    /**
     * Initialize global search feature
     */
    async initializeGlobalSearch() {
        try {
            const SearchFilter = (await import('/js/plugins/page/SearchFilter.js')).default;
            this.app.globalSearchFilter = new SearchFilter(this.app);
            await this.app.globalSearchFilter.onInit();
        } catch (error) {
            console.error('Failed to initialize global search:', error);
        }
        
        // Setup search index update listeners
        this.app.eventBus.on('element:created', () => {
            if (this.app.searchIndex) {
                this.app.searchIndex.rebuildIndex();
            }
        });
        this.app.eventBus.on('element:updated', ({ pageId, binId, elementIndex }) => {
            if (this.app.searchIndex) {
                this.app.searchIndex.updateElement(pageId, binId, elementIndex);
            }
        });
        this.app.eventBus.on('element:deleted', ({ pageId, binId, elementIndex }) => {
            if (this.app.searchIndex) {
                this.app.searchIndex.removeElement(pageId, binId, elementIndex);
            }
        });
    }
}


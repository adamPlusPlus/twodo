// Daily Todo Tracker App
import { DataManager } from './js/modules/DataManager.js';
import { SettingsManager } from './js/modules/SettingsManager.js';
import { ThemeManager } from './js/modules/ThemeManager.js';
import { VisualSettingsManager } from './js/modules/VisualSettingsManager.js';
import { PageManager } from './js/modules/PageManager.js';
import { BinManager } from './js/modules/BinManager.js';
import { ElementManager } from './js/modules/ElementManager.js';
import { DragDropHandler } from './js/modules/DragDropHandler.js';
import { AudioHandler } from './js/modules/AudioHandler.js';
import { EventHandler } from './js/modules/EventHandler.js';
import { ContextMenuHandler } from './js/modules/ContextMenuHandler.js';
import { TouchGestureHandler } from './js/modules/TouchGestureHandler.js';
import { ModalHandler } from './js/modules/ModalHandler.js';
import { FileManager } from './js/modules/FileManager.js';
// Plugin system imports
import { PagePluginManager } from './js/modules/PagePluginManager.js';
import { BinPluginManager } from './js/modules/BinPluginManager.js';
import { ElementTypeManager } from './js/modules/ElementTypeManager.js';
import { FormatRendererManager } from './js/modules/FormatRendererManager.js';
import { pluginRegistry } from './js/core/PluginRegistry.js';
import { eventBus } from './js/core/EventBus.js';
import { pluginLoader } from './js/core/PluginLoader.js';
import { RelationshipManager } from './js/modules/RelationshipManager.js';
import { TemplateManager } from './js/modules/TemplateManager.js';
import { AutomationEngine } from './js/core/AutomationEngine.js';
import { TagManager } from './js/modules/TagManager.js';
import { SearchIndex } from './js/modules/SearchIndex.js';
import { ExportService } from './js/modules/ExportService.js';
import { ImportService } from './js/modules/ImportService.js';
import { OAuthManager } from './js/core/OAuthManager.js';
import { SyncManager } from './js/modules/SyncManager.js';
import { UndoRedoManager } from './js/modules/UndoRedoManager.js';
import { TimeTracker } from './js/modules/TimeTracker.js';
import { registerAllServices, registerService, SERVICES } from './js/core/AppServices.js';
import { RenderService } from './js/core/RenderService.js';
import { EVENTS } from './js/core/AppEvents.js';
import { AppState } from './js/core/AppState.js';
import { AppInitializer } from './js/core/AppInitializer.js';
import { StringUtils } from './js/utils/string.js';
import { DailyResetManager } from './js/modules/DailyResetManager.js';
import { InlineEditor } from './js/modules/InlineEditor.js';
import { LinkHandler } from './js/utils/LinkHandler.js';
import { modalEventBridge } from './js/core/ModalEventBridge.js';
import { pluginDiscovery } from './js/core/PluginDiscovery.js';

class TodoApp {
    constructor() {
        performance.mark('app-constructor-start');
        const constructorStart = performance.now();
        
        // Initialize app state first (needed by services)
        this.appState = new AppState();
        
        // Initialize managers
        this.dataManager = new DataManager();
        this.settingsManager = new SettingsManager();
        this.themeManager = new ThemeManager();
        this.visualSettingsManager = new VisualSettingsManager();
        this.pageManager = new PageManager();
        this.binManager = new BinManager();
        
        // Initialize undoRedoManager early (needed by ElementManager)
        this.undoRedoManager = new UndoRedoManager();
        
        // Register core services first (before creating modules that need them)
        // Register services that don't depend on modules created later
        // Use imported eventBus singleton (this.eventBus is assigned later)
        registerService(SERVICES.EVENT_BUS, eventBus);
        registerService(SERVICES.APP_STATE, this.appState);
        registerService(SERVICES.DATA_MANAGER, this.dataManager);
        registerService(SERVICES.UNDO_REDO_MANAGER, this.undoRedoManager);
        registerService(SERVICES.SETTINGS_MANAGER, this.settingsManager);
        registerService(SERVICES.PAGE_MANAGER, this.pageManager);
        registerService(SERVICES.BIN_MANAGER, this.binManager);
        
        // Initialize modules that use ServiceLocator (no app parameter)
        // These can now access the services registered above
        this.elementManager = new ElementManager();
        
        // Create handlers and managers that need to be registered
        this.dragDropHandler = new DragDropHandler();
        this.audioHandler = new AudioHandler();
        this.eventHandler = new EventHandler(this);
        this.contextMenuHandler = new ContextMenuHandler();
        this.touchGestureHandler = new TouchGestureHandler();
        this.modalHandler = new ModalHandler();
        this.fileManager = new FileManager();
        
        // Register remaining services (including ElementManager and others)
        // Must be called AFTER all services are created
        registerAllServices(this);
        
        // Initialize relationship manager
        this.relationshipManager = new RelationshipManager();
        
        // Initialize template manager
        this.templateManager = new TemplateManager();
        
        // Initialize automation engine
        this.automationEngine = new AutomationEngine();
        
        // Initialize tag manager
        this.tagManager = new TagManager();
        
        // Initialize search index
        this.searchIndex = new SearchIndex();
        
        // Initialize export/import services
        this.exportService = new ExportService();
        this.importService = new ImportService();
        
        // Initialize OAuth and sync managers
        this.oauthManager = new OAuthManager();
        this.syncManager = new SyncManager();
        
        // Start loading file early (in parallel with other initialization)
        // This prevents the file request from being queued behind other operations
        this._fileLoadPromise = null;
        const lastOpenedFile = localStorage.getItem('twodo-last-opened-file');
        if (lastOpenedFile) {
            performance.mark('preload-start');
            const preloadInitStart = performance.now();
            const requestsBeforePreload = performance.getEntriesByType('resource').length;
            // console.log('[DIAG] Starting preload:', lastOpenedFile);
            // console.log(`[DIAG] Preload init: ${requestsBeforePreload} resource requests already loaded`);
            // Start the fetch immediately, but don't await it yet
            this._fileLoadPromise = this._preloadFile(lastOpenedFile);
            const preloadInitTime = performance.now() - preloadInitStart;
            // console.log(`[DIAG] Preload promise created in: ${preloadInitTime.toFixed(1)}ms`);
        }
        
        // Initialize time tracker
        this.timeTracker = new TimeTracker();
        
        // Initialize daily reset manager
        this.dailyResetManager = new DailyResetManager();
        
        // Initialize inline editor
        this.inlineEditor = new InlineEditor();
        
        // Initialize link handler
        this.linkHandler = new LinkHandler();
        
        // Initialize plugin system managers
        this.pagePluginManager = new PagePluginManager();
        this.binPluginManager = new BinPluginManager();
        this.elementTypeManager = new ElementTypeManager();
        this.formatRendererManager = new FormatRendererManager();
        
        // Expose plugin system to window for debugging
        this.pluginRegistry = pluginRegistry;
        this.eventBus = eventBus;
        this.pluginLoader = pluginLoader;
        
        // Initialize render service (registers itself in ServiceLocator)
        this.renderService = new RenderService(this);
        
        // Initialize modal event bridge (bridges UI events to modal methods)
        // This is initialized after services are registered
        this.modalEventBridge = modalEventBridge;
        
        // Initialize app initializer
        this.appInitializer = new AppInitializer(this);
        
        // Listen for render requests from EventBus (handled by RenderService now)
        
        performance.mark('app-constructor-end');
        const constructorTime = performance.now() - constructorStart;
        // console.log(`[DIAG] Constructor took: ${constructorTime.toFixed(1)}ms`);
        // console.log(`[DIAG] Preload started: ${this._fileLoadPromise ? 'YES' : 'NO'}`);
        
        this.init();
    }
    
    /**
     * Preload file data early (non-blocking)
     * This starts the fetch immediately so it can happen in parallel with other initialization
     */
    async _preloadFile(filename) {
        performance.mark('preload-fetch-start');
        const preloadStart = performance.now();
        // console.log(`[DIAG] _preloadFile() called for: ${filename}`);
        
        try {
            const encodedFilename = encodeURIComponent(filename);
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            
            try {
                const fetchStart = performance.now();
                const fetchUrl = `/files/${encodedFilename}`;
                
                // Check how many requests are in flight before our fetch
                const requestsBefore = performance.getEntriesByType('resource').length;
                // console.log(`[DIAG] Preload: ${requestsBefore} resource requests before fetch`);
                
                const response = await fetch(fetchUrl, {
                    signal: controller.signal,
                    cache: 'no-cache'
                });
                const fetchEnd = performance.now();
                const fetchTime = fetchEnd - fetchStart;
                clearTimeout(timeoutId);
                
                // Extract network timing - wait a bit for timing to be available
                setTimeout(() => {
                    const resourceTimings = performance.getEntriesByType('resource');
                    const resourceTiming = resourceTimings.find(entry => entry.name.includes(encodedFilename));
                    if (resourceTiming) {
                        // console.log('[DIAG] Preload network timing:', {
                        //     stalled: (resourceTiming.requestStart - resourceTiming.fetchStart).toFixed(1) + 'ms',
                        //     dns: (resourceTiming.domainLookupEnd - resourceTiming.domainLookupStart).toFixed(1) + 'ms',
                        //     tcp: (resourceTiming.connectEnd - resourceTiming.connectStart).toFixed(1) + 'ms',
                        //     ttfb: (resourceTiming.responseStart - resourceTiming.requestStart).toFixed(1) + 'ms',
                        //     download: (resourceTiming.responseEnd - resourceTiming.responseStart).toFixed(1) + 'ms',
                        //     total: resourceTiming.duration.toFixed(1) + 'ms'
                        // });
                    } else {
                        // console.log('[DIAG] Preload: Could not find resource timing entry');
                    }
                }, 100);
                
                if (!response.ok) {
                    if (response.status === 404) {
                        // console.log('[DIAG] Preload: File not found (404)');
                        return null; // File doesn't exist
                    }
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const parseStart = performance.now();
                const result = await response.json();
                const parseTime = performance.now() - parseStart;
                
                if (result.success) {
                    performance.mark('preload-fetch-end');
                    const preloadTime = performance.now() - preloadStart;
                    // console.log(`[DIAG] Preload fetch: ${fetchTime.toFixed(1)}ms, parse: ${parseTime.toFixed(1)}ms, total: ${preloadTime.toFixed(1)}ms`);
                    return result.data; // Return the data for later use
                } else {
                    throw new Error(result.error || 'Failed to load file');
                }
            } catch (fetchError) {
                clearTimeout(timeoutId);
                if (fetchError.name === 'AbortError') {
                    // console.log('[DIAG] Preload: Timeout');
                    throw new Error('File load timeout');
                }
                throw fetchError;
            }
        } catch (error) {
            // console.log(`[DIAG] Preload failed: ${error.message}`);
            // Silently fail - will be handled in loadLastOpenedFile
            return null;
        }
    }
    
    /**
     * Load the last opened file from server (device-specific)
     */
    async loadLastOpenedFile() {
        performance.mark('load-file-start');
        const loadStart = performance.now();
        // console.log('[DIAG] loadLastOpenedFile() called');
        
        try {
            const lastOpenedFile = localStorage.getItem('twodo-last-opened-file');
            if (!lastOpenedFile) {
                // console.log('[DIAG] No last opened file in localStorage');
                return; // No last opened file, use default data
            }
            
            // Use preloaded data if available (started in constructor)
            let data;
            if (this._fileLoadPromise) {
                // console.log('[DIAG] Preload promise exists, awaiting...');
                const preloadAwaitStart = performance.now();
                const preloadedData = await this._fileLoadPromise;
                const preloadAwaitTime = performance.now() - preloadAwaitStart;
                // console.log(`[DIAG] Preload await took: ${preloadAwaitTime.toFixed(1)}ms`);
                
                if (preloadedData) {
                    // Use preloaded data - fetch already completed!
                    // console.log('[DIAG] Using preloaded data');
                    data = preloadedData;
                    this.fileManager.currentFilename = lastOpenedFile;
                } else {
                    // Preload failed or file doesn't exist, try normal load
                    // console.log('[DIAG] Preload returned null, doing normal load');
                    const loadPromise = this.fileManager.loadFile(lastOpenedFile, false);
                    const timeoutPromise = new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('File load timeout')), 5000)
                    );
                    data = await Promise.race([loadPromise, timeoutPromise]);
                }
            } else {
                // No preload started, do normal load
                // console.log('[DIAG] No preload promise, doing normal load');
                const loadPromise = this.fileManager.loadFile(lastOpenedFile, false);
                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('File load timeout')), 5000)
                );
                data = await Promise.race([loadPromise, timeoutPromise]);
            }
            
            if (!data.pages || !Array.isArray(data.pages)) {
                console.warn('Last opened file has invalid format, using default data');
                localStorage.removeItem('twodo-last-opened-file');
                return;
            }
            
            // Update app with loaded file data
            this.appState.pages = data.pages;
            // Set timestamp to prevent stale sync data from overwriting freshly loaded data
            if (this.dataManager) {
                this.dataManager._lastSyncTimestamp = Date.now();
            }
            console.log(`Loaded last opened file: ${lastOpenedFile}`);
            // Don't render here - let init() handle rendering after load completes
            
            performance.mark('load-file-end');
            const loadTime = performance.now() - loadStart;
            // console.log(`[DIAG] Total loadLastOpenedFile: ${loadTime.toFixed(1)}ms`);
            
            // Load buffer in background (non-blocking)
            if (this.undoRedoManager) {
                this.undoRedoManager.loadBuffer(lastOpenedFile).catch(err => {
                    console.warn('Failed to load buffer in background:', err);
                });
            }
        } catch (error) {
            // If file not found (404) or timeout, clear the stored preference
            if (error.status === 404 || error.message.includes('not found') || error.message.includes('timeout')) {
                localStorage.removeItem('twodo-last-opened-file');
                console.log('Last opened file not found or timeout, cleared preference');
            } else {
                // For other errors, log but don't block initialization
                console.warn('Failed to load last opened file:', error);
            }
        }
    }
    
    async init() {
        // Load and apply settings on initialization
        const settings = this.settingsManager.loadSettings();
        this.settingsManager.applySettings(settings);
        
        // Check for file parameter in URL (before loading other data)
        const urlParams = new URLSearchParams(window.location.search);
        const fileParam = urlParams.get('file');
        if (fileParam) {
            try {
                // Load the file specified in URL
                const data = await this.fileManager.loadFile(fileParam);
                if (data.pages && Array.isArray(data.pages)) {
                    this.appState.pages = data.pages;
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
            this.dataManager.checkDailyReset();
            
            // Load data (only once, only if no URL file param)
            this.dataManager.loadData();
        }
        
        // Initialize format renderer manager from loaded data
        if (this.formatRendererManager) {
            this.formatRendererManager.initializeFromSavedData();
        }
        
        // Initialize relationships from loaded data (fast, synchronous)
        this.relationshipManager.initializeFromData();
        
        // Set up event listeners
        this.eventHandler.setupEventListeners();
        this.setupTrashIcon();
        
        // Load last opened file BEFORE rendering to ensure we have the correct data
        // This prevents rendering with empty/default data and then re-rendering
        await this.loadLastOpenedFile();
        
        // Now render with the loaded data
        eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
        
        // Now do async operations in the background (non-blocking)
        // Connect to sync if needed
        (async () => {
            // After loading file, connect to sync if needed
            if (this.fileManager && this.fileManager.currentFilename && this.syncManager) {
                // Store filename to join once connected
                this.syncManager.pendingFileJoin = this.fileManager.currentFilename;
                
                // Connect to WebSocket (non-blocking, will retry automatically)
                // Don't await - let it connect in the background
                this.syncManager.connect().catch(error => {
                    console.warn('WebSocket connection failed, will retry:', error);
                    // Connection will retry automatically, and joinFile will be called on connect
                });
            }
        })();
        
        // Initialize plugin system in background (loads in parallel for faster startup)
        // This happens after initial render so the UI appears quickly
        this.initializePlugins().catch(err => console.error('Plugin initialization error:', err));
        
        // Initialize global search in background
        this.initializeGlobalSearch().catch(err => console.error('Global search initialization error:', err));
        
        // Rebuild search index in background (non-blocking)
        if (this.searchIndex) {
            // Use requestIdleCallback if available, otherwise setTimeout
            if (window.requestIdleCallback) {
                requestIdleCallback(() => this.searchIndex.rebuildIndex());
            } else {
                setTimeout(() => this.searchIndex.rebuildIndex(), 0);
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
                this.pluginLoader.loadPlugin(pluginDef.path, pluginDef.name, this)
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
                this.pluginLoader.loadPlugin(pluginDef.path, pluginDef.name, this)
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
                this.pluginLoader.loadPlugin(pluginDef.path, pluginDef.name, this)
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
                this.pluginLoader.loadPlugin(pluginDef.path, pluginDef.name, this)
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
        if (this.formatRendererManager) {
            console.log('[app.js] Rescanning for formats after plugin load...');
            this.formatRendererManager.scanForFormats();
        }
    }
    
    /**
     * Initialize plugin system
     */
    async initializePlugins() {
        // Load all available plugins first (already parallel)
        await this.loadAllPlugins();
        
        // Initialize plugins for existing pages and bins in parallel
        const initPromises = [];
        for (const page of this.appState.pages) {
            initPromises.push(
                this.pagePluginManager.initializePagePlugins(page.id)
                    .catch(err => console.warn(`Failed to initialize page plugins for ${page.id}:`, err))
            );
            if (page.bins) {
                for (const bin of page.bins) {
                    initPromises.push(
                        this.binPluginManager.initializeBinPlugins(page.id, bin.id)
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
            const SearchFilter = (await import('./js/plugins/page/SearchFilter.js')).default;
            this.globalSearchFilter = new SearchFilter(this);
            await this.globalSearchFilter.onInit();
        } catch (error) {
            console.error('Failed to initialize global search:', error);
        }
        
        // Setup search index update listeners
        this.eventBus.on('element:created', () => {
            if (this.searchIndex) {
                this.searchIndex.rebuildIndex();
            }
        });
        this.eventBus.on('element:updated', ({ pageId, binId, elementIndex }) => {
            if (this.searchIndex) {
                this.searchIndex.updateElement(pageId, binId, elementIndex);
            }
        });
        this.eventBus.on('element:deleted', ({ pageId, binId, elementIndex }) => {
            if (this.searchIndex) {
                this.searchIndex.removeElement(pageId, binId, elementIndex);
            }
        });
    }
    
    setupTrashIcon() {
        return this.dragDropHandler.setupTrashIcon();
    }
    
    // setupEventListeners is now in EventHandler.js

    // Helper method to create and style buttons - delegated to AppRenderer
    styleButton(text, onClick) {
        if (this.renderService && this.renderService.getRenderer) {
            return this.renderService.getRenderer().styleButton(text, onClick);
        }
        // Fallback if renderer not available
        const btn = document.createElement('button');
        btn.textContent = text;
        btn.onclick = (e) => {
            e.stopPropagation();
            onClick(e);
        };
        return btn;
    }
    
    resetToday() {
        return this.dailyResetManager.resetToday();
    }
    
    // Page and element management methods are now in PageManager, ElementManager, and DragDropHandler
    // Delegating to managers for backward compatibility
    addPage() {
        return this.pageManager.addPage();
    }
    
    deletePage(pageId) {
        return this.pageManager.deletePage(pageId);
    }
    
    movePage(sourcePageId, targetPageId) {
        return this.pageManager.movePage(sourcePageId, targetPageId);
    }
    
    addBin(pageId) {
        return this.binManager.addBin(pageId);
    }
    
    deleteBin(pageId, binId) {
        return this.binManager.deleteBin(pageId, binId);
    }
    
    moveBin(sourcePageId, sourceBinId, targetPageId, targetBinId) {
        return this.binManager.moveBin(sourcePageId, sourceBinId, targetPageId, targetBinId);
    }
    
    moveElement(sourcePageId, sourceBinId, sourceElementIndex, targetPageId, targetBinId, targetElementIndex, isChild = false, parentElementIndex = null, childIndex = null) {
        return this.dragDropHandler.moveElement(sourcePageId, sourceBinId, sourceElementIndex, targetPageId, targetBinId, targetElementIndex, isChild, parentElementIndex, childIndex);
    }
    
    reorderChildElement(pageId, binId, parentElementIndex, sourceChildIndex, targetChildIndex) {
        return this.dragDropHandler.reorderChildElement(pageId, binId, parentElementIndex, sourceChildIndex, targetChildIndex);
    }

    nestElement(sourcePageId, sourceBinId, sourceElementIndex, targetPageId, targetBinId, targetElementIndex, isChild = false, parentElementIndex = null, childIndex = null, elementToNest = null) {
        return this.dragDropHandler.nestElement(sourcePageId, sourceBinId, sourceElementIndex, targetPageId, targetBinId, targetElementIndex, isChild, parentElementIndex, childIndex, elementToNest);
    }
    
    addElement(pageId, binId, elementType) {
        return this.elementManager.addElement(pageId, binId, elementType);
    }
    
    createElementTemplate(type) {
        return this.elementManager.createElementTemplate(type);
    }
    
    enableInlineEditing(textElement, pageId, binId, elementIndex, element) {
        return this.inlineEditor.enableInlineEditing(textElement, pageId, binId, elementIndex, element);
    }
    
    toggleElement(pageId, binId, elementIndex, subtaskIndex = null, itemIndex = null) {
        return this.elementManager.toggleElement(pageId, binId, elementIndex, subtaskIndex, itemIndex);
    }
    
    addMultiCheckboxItem(pageId, binId, elementIndex) {
        return this.elementManager.addMultiCheckboxItem(pageId, binId, elementIndex);
    }
    
    removeMultiCheckboxItem(pageId, binId, elementIndex, itemIndex) {
        return this.elementManager.removeMultiCheckboxItem(pageId, binId, elementIndex, itemIndex);
    }
    
    toggleAllSubtasks() {
        // Delegate to AppRenderer
        if (this.renderService && this.renderService.getRenderer) {
            this.renderService.getRenderer().toggleAllSubtasks();
        }
    }
    
    render() {
        // Delegate to AppRenderer via RenderService
        if (this.renderService && this.renderService.getRenderer) {
            this.renderService.getRenderer().render();
        }
    }
    
    renderPageTabs() {
        // Delegate to AppRenderer
        if (this.renderService && this.renderService.getRenderer) {
            this.renderService.getRenderer().renderPageTabs();
        }
    }
    
    getCurrentPositions() {
        // Delegate to AppRenderer
        if (this.renderService && this.renderService.getRenderer) {
            return this.renderService.getRenderer().getCurrentPositions();
        }
        return { bins: {}, elements: {} };
    }
    
    // Animation method moved to AnimationRenderer.js
    animateMovements(oldPositions) {
        // Delegate to AppRenderer
        if (this.renderService && this.renderService.getRenderer) {
            return this.renderService.getRenderer().animateMovements(oldPositions);
        }
    }
    
    renderBin(pageId, bin) {
        // Delegate to AppRenderer
        if (this.renderService && this.renderService.getRenderer) {
            return this.renderService.getRenderer().renderBin(pageId, bin);
        }
        // Fallback - should not happen
        console.error('RenderService not available');
        return document.createElement('div');
    }
    
    // renderBin implementation moved to BinRenderer.js
    
    // renderBin implementation moved to BinRenderer.js
    // renderChildren and renderElement implementations moved to ElementRenderer.js
    
    renderElement(pageId, binId, element, elementIndex, childIndex = null, depth = 0) {
        // Delegate to AppRenderer
        if (this.renderService && this.renderService.getRenderer) {
            return this.renderService.getRenderer().renderElement(pageId, binId, element, elementIndex, childIndex, depth);
        }
        return null;
    }
    
    renderChildren(pageId, binId, parentElement, parentElementIndex, depth = 0) {
        // Delegate to AppRenderer
        if (this.renderService && this.renderService.getRenderer) {
            return this.renderService.getRenderer().renderChildren(pageId, binId, parentElement, parentElementIndex, depth);
        }
        return null;
    }
    
    // Calendar rendering methods moved to CalendarRenderer.js
    renderCalendar(container, pageId, binId, element, elementIndex) {
        // Delegate to AppRenderer
        if (this.renderService && this.renderService.getRenderer) {
            return this.renderService.getRenderer().renderCalendar(container, pageId, binId, element, elementIndex);
        }
    }
    
    
    showAddElementModal(pageId, elementIndex = null) {
        return this.modalHandler.showAddElementModal(pageId, elementIndex);
    }
    
    
    // Utility methods moved to StringUtils
    escapeHtml(text) {
        return StringUtils.escapeHtml(text);
    }
    
    parseLinks(text, context = {}) {
        // Use LinkHandler for unified link parsing (supports internal and external links)
        if (this.linkHandler) {
            return this.linkHandler.parseLinks(text, context);
        }
        // Fallback to StringUtils for backward compatibility
        return StringUtils.parseLinks(text);
    }
    
    showContextMenu(e, pageId, binId, elementIndex, subtaskIndex = null) {
        // If binId not provided, try to find it
        if (!binId) {
            binId = this.appState.activeBinId;
            if (!binId) {
                const page = this.appState.pages.find(p => p.id === pageId);
                if (page && page.bins && page.bins.length > 0) {
                    binId = page.bins[0].id;
                }
            }
        }
        return this.contextMenuHandler.showContextMenu(e, pageId, binId, elementIndex, subtaskIndex);
    }
    
    hideContextMenu() {
        return this.contextMenuHandler.hideContextMenu();
    }
    
    setupTouchGestures() {
        return this.touchGestureHandler.setupTouchGestures();
    }
    
    triggerContextMenuFromTouch(e, target) {
        return this.touchGestureHandler.triggerContextMenuFromTouch(e, target);
    }
    
    showPageContextMenu(e, pageId = null) {
        return this.contextMenuHandler.showPageContextMenu(e, pageId);
    }
    
    /**
     * Helper to validate elementIndex
     * @param {*} elementIndex - Element index to validate
     * @returns {boolean} True if elementIndex is a valid number
     */
    _isValidElementIndex(elementIndex) {
        return elementIndex !== null && 
               elementIndex !== undefined && 
               !isNaN(elementIndex) && 
               (typeof elementIndex === 'number' || (typeof elementIndex === 'string' && !isNaN(parseInt(elementIndex, 10))));
    }
    
    handleContextEdit() {
        const { pageId, binId, elementIndex } = this.appState.contextMenuState;
        console.log('[handleContextEdit] Called with:', { pageId, binId, elementIndex, contextMenuState: this.appState.contextMenuState });
        
        if (pageId === null) {
            console.warn('[handleContextEdit] pageId is null');
            return;
        }
        
        const page = this.appState.pages.find(p => p.id === pageId);
        if (!page) {
            console.warn('[handleContextEdit] Page not found:', pageId);
            return;
        }
        
        this.hideContextMenu();
        
        // Determine what we're editing:
        // - If elementIndex is a valid number → element edit
        // - If elementIndex is null and binId is explicitly set (not undefined) → bin edit
        // - If elementIndex is null and binId is undefined → page edit
        
        // Check if elementIndex is a valid number (not null, not undefined, not NaN)
        const isValidElementIndex = this._isValidElementIndex(elementIndex);
        console.log('[handleContextEdit] isValidElementIndex:', isValidElementIndex);
        
        if (isValidElementIndex) {
            // Edit element - find binId from contextMenuState or use active bin
            let targetBinId = binId || this.appState.activeBinId;
            if (!targetBinId) {
                // Try to find bin containing this element
                for (const bin of page.bins || []) {
                    if (bin.elements && bin.elements[elementIndex]) {
                        targetBinId = bin.id;
                        break;
                    }
                }
                if (!targetBinId && page.bins && page.bins.length > 0) {
                    targetBinId = page.bins[0].id;
                }
            }
            const bin = page.bins?.find(b => b.id === targetBinId);
            if (!bin) {
                console.warn('[handleContextEdit] Bin not found:', { pageId, targetBinId, elementIndex });
                return;
            }
            const element = bin.elements[elementIndex];
            if (!element) {
                console.warn('[handleContextEdit] Element not found:', { pageId, targetBinId, elementIndex, elementsLength: bin.elements?.length });
                return;
            }
            this.showEditModal(pageId, targetBinId, elementIndex, element);
        } else if (binId !== null && binId !== undefined) {
            // Edit bin - show bin edit modal
            this.modalHandler.showEditBinModal(pageId, binId);
        } else {
            // Edit page - show page edit modal
            this.modalHandler.showEditPageModal(pageId);
        }
    }
    
    handleContextCustomizeVisuals() {
        const { pageId, binId, elementIndex } = this.appState.contextMenuState;
        this.hideContextMenu();
        
        // Determine what we're customizing:
        // - If elementIndex is a valid number → element visual customization
        // - If elementIndex is null and binId is explicitly set (not undefined) → bin visual customization
        // - If elementIndex is null and binId is undefined → page visual customization
        // - Check for pane customization (from pane context menu)
        
        if (this._isValidElementIndex(elementIndex) && pageId) {
            // Customize element visuals
            const page = this.appState.pages.find(p => p.id === pageId);
            if (!page) return;
            
            let targetBinId = binId || this.appState.activeBinId;
            if (!targetBinId) {
                for (const bin of page.bins || []) {
                    if (bin.elements && bin.elements[elementIndex]) {
                        targetBinId = bin.id;
                        break;
                    }
                }
            }
            
            if (targetBinId) {
                // Create unique element ID (pageId-binId-elementIndex)
                const elementId = `${pageId}-${targetBinId}-${elementIndex}`;
                const pageFormat = page.format || 'default';
                this.modalHandler.showVisualCustomizationModal('element', elementId, {
                    pageId: pageId,
                    viewFormat: pageFormat
                });
            }
        } else if (binId !== null && binId !== undefined && pageId) {
            // Customize bin visuals
            const pageFormat = this.appState.pages.find(p => p.id === pageId)?.format || 'default';
            this.modalHandler.showVisualCustomizationModal('bin', binId, {
                pageId: pageId,
                viewFormat: pageFormat
            });
        } else if (pageId) {
            // Customize page visuals
            const page = this.appState.pages.find(p => p.id === pageId);
            const pageFormat = page?.format || 'default';
            this.modalHandler.showVisualCustomizationModal('page', pageId, {
                viewFormat: pageFormat
            });
        } else {
            // Could be pane customization - check if we have pane context
            // For now, if no pageId, we can't customize
            console.warn('Cannot customize visuals: no pageId provided');
        }
    }
    
    async saveBinEdit(pageId, binId) {
        const page = this.appState.pages.find(p => p.id === pageId);
        if (!page) return;
        const bin = page.bins?.find(b => b.id === binId);
        if (!bin) return;
        
        const titleInput = document.getElementById('edit-bin-title');
        if (titleInput) {
            bin.title = titleInput.value.trim() || bin.id;
        }
        
        const maxHeightInput = document.getElementById('edit-bin-max-height');
        if (maxHeightInput) {
            const maxHeightValue = maxHeightInput.value.trim();
            if (maxHeightValue === '') {
                delete bin.maxHeight;
            } else {
                const height = parseInt(maxHeightValue, 10);
                if (!isNaN(height) && height > 0) {
                    bin.maxHeight = height;
                } else {
                    delete bin.maxHeight;
                }
            }
        }
        
        this.dataManager.saveData();
        this.render();
        this.closeModal();
    }
    
    async savePageEdit(pageId) {
        const page = this.appState.pages.find(p => p.id === pageId);
        if (!page) return;
        
        const titleInput = document.getElementById('edit-page-title');
        
        // Save grid layout configuration if grid layout is selected
        const formatSelect = document.getElementById('page-format-select');
        const selectedFormat = formatSelect ? formatSelect.value : this.formatRendererManager?.getPageFormat(pageId);
        if (selectedFormat === 'grid-layout-format') {
            const minColumnWidthInput = document.getElementById('grid-min-column-width');
            const gapInput = document.getElementById('grid-gap');
            const paddingInput = document.getElementById('grid-padding');
            const maxHeightInput = document.getElementById('grid-max-height');
            
            if (!page.formatConfig) {
                page.formatConfig = {};
            }
            
            page.formatConfig.grid = {
                minColumnWidth: minColumnWidthInput ? parseInt(minColumnWidthInput.value, 10) || 350 : 350,
                gap: gapInput ? parseInt(gapInput.value, 10) || 20 : 20,
                padding: paddingInput ? parseInt(paddingInput.value, 10) || 20 : 20,
                maxHeight: maxHeightInput && maxHeightInput.value.trim() ? parseInt(maxHeightInput.value, 10) : null
            };
        } else if (page.formatConfig?.grid) {
            // Remove grid config if not using grid layout
            delete page.formatConfig.grid;
            if (Object.keys(page.formatConfig).length === 0) {
                delete page.formatConfig;
            }
        }
        if (titleInput) {
            page.title = titleInput.value.trim() || page.id;
            this.dataManager.saveData();
            this.render();
        }
        
        this.closeModal();
    }
    
    handleContextAddBin() {
        const { pageId, binId } = this.appState.contextMenuState;
        if (pageId === null) return;
        
        this.hideContextMenu();
        // Add bin below the selected bin (afterBinId will be binId if provided, null otherwise)
        this.binManager.addBin(pageId, binId || null);
    }
    
    handleContextDeleteBin() {
        const { pageId, binId } = this.appState.contextMenuState;
        if (pageId === null || binId === null) return;
        
        const page = this.appState.pages.find(p => p.id === pageId);
        if (!page) return;
        const bin = page.bins?.find(b => b.id === binId);
        if (!bin) return;
        
        if (!confirm(`Delete bin "${bin.title || binId}"?`)) return;
        
        this.hideContextMenu();
        this.deleteBin(pageId, binId);
        this.render();
    }
    
    handleContextAddSubtasks() {
        const { pageId, binId, elementIndex } = this.appState.contextMenuState;
        if (pageId === null || !this._isValidElementIndex(elementIndex)) return;
        
        const page = this.appState.pages.find(p => p.id === pageId);
        if (!page) return;
        const bin = page.bins?.find(b => b.id === (binId || this.appState.activeBinId));
        if (!bin) return;
        
        const element = bin.elements[elementIndex];
        if (!element) return;
        
        // Only tasks and header-checkbox can have subtasks
        if (element.type !== 'task' && element.type !== 'header-checkbox') {
            alert('This element type cannot have subtasks');
            this.hideContextMenu();
            return;
        }
        
        this.hideContextMenu();
        this.showAddSubtasksModal(pageId, elementIndex, element);
    }
    
    handleContextViewData() {
        const { pageId, binId, elementIndex, subtaskIndex } = this.appState.contextMenuState;
        if (pageId === null || !this._isValidElementIndex(elementIndex)) return;
        
        const page = this.appState.pages.find(p => p.id === pageId);
        if (!page) return;
        const bin = page.bins?.find(b => b.id === (binId || this.appState.activeBinId));
        if (!bin) return;
        
        const element = bin.elements[elementIndex];
        if (!element) return;
        
        // If it's a subtask, show subtask data
        if (subtaskIndex !== null && element.subtasks && element.subtasks[subtaskIndex]) {
            const subtask = element.subtasks[subtaskIndex];
            this.hideContextMenu();
            this.showViewDataModal(subtask, true);
            return;
        }
        
        this.hideContextMenu();
        this.showViewDataModal(element);
    }
    
    handleContextDeleteElement() {
        const { pageId, binId, elementIndex, subtaskIndex } = this.appState.contextMenuState;
        if (pageId === null || !this._isValidElementIndex(elementIndex)) return;
        
        const page = this.appState.pages.find(p => p.id === pageId);
        if (!page) return;
        const targetBinId = binId || this.appState.activeBinId;
        if (!targetBinId) return;
        const bin = page.bins?.find(b => b.id === targetBinId);
        if (!bin) return;
        
        this.hideContextMenu();
        
        // Handle nested children - elementIndex might be a string like "0-1"
        let actualElementIndex = elementIndex;
        let childIndex = null;
        let isChild = false;
        
        if (typeof elementIndex === 'string' && elementIndex.includes('-')) {
            const parts = elementIndex.split('-');
            actualElementIndex = parseInt(parts[0]);
            childIndex = parseInt(parts[1]);
            isChild = true;
        } else {
            actualElementIndex = parseInt(elementIndex);
        }
        
        // If it's a child or subtask, delete from parent's children/subtasks
        if (isChild && childIndex !== null) {
            const parentElement = bin.elements[actualElementIndex];
            if (parentElement && parentElement.children && parentElement.children[childIndex]) {
                parentElement.children.splice(childIndex, 1);
                // If no children remain, set children to empty array
                if (parentElement.children.length === 0) {
                    parentElement.children = [];
                }
                // Update parent completion status
                parentElement.completed = parentElement.children.length > 0 && parentElement.children.every(ch => ch.completed);
                this.dataManager.saveData();
                this.render();
            }
        } else if (subtaskIndex !== null) {
            // Legacy subtask support
            const element = bin.elements[actualElementIndex];
            if (element && element.subtasks && element.subtasks[subtaskIndex]) {
                element.subtasks.splice(subtaskIndex, 1);
                if (element.subtasks.length === 0) {
                    element.subtasks = [];
                }
                element.completed = element.subtasks.length > 0 && element.subtasks.every(st => st.completed);
                this.dataManager.saveData();
                this.render();
            } else if (element && element.children && element.children[subtaskIndex]) {
                // Use children if subtasks don't exist
                element.children.splice(subtaskIndex, 1);
                if (element.children.length === 0) {
                    element.children = [];
                }
                element.completed = element.children.length > 0 && element.children.every(ch => ch.completed);
                this.dataManager.saveData();
                this.render();
            }
        } else {
            // Delete main element
            if (bin.elements && bin.elements[actualElementIndex]) {
                bin.elements.splice(actualElementIndex, 1);
                this.dataManager.saveData();
                this.render();
            }
        }
    }
    
    handleContextAddElement() {
        const { pageId, binId, elementIndex } = this.appState.contextMenuState;
        if (pageId === null || !this._isValidElementIndex(elementIndex)) return;
        
        const page = this.appState.pages.find(p => p.id === pageId);
        if (!page) return;
        const targetBinId = binId || this.appState.activeBinId || (page.bins?.[0]?.id);
        if (!targetBinId) return;
        
        this.hideContextMenu();
        // Use the same modal as bin-level add element
        this.modalHandler.showAddElementModal(pageId, targetBinId, elementIndex);
    }
    
    handleContextAddChildElement() {
        const { pageId, binId, elementIndex } = this.appState.contextMenuState;
        if (pageId === null || !this._isValidElementIndex(elementIndex)) return;
        
        const page = this.appState.pages.find(p => p.id === pageId);
        if (!page) return;
        const bin = page.bins?.find(b => b.id === (binId || this.appState.activeBinId));
        if (!bin) return;
        
        const element = bin.elements[elementIndex];
        if (!element) return;
        
        // Check if element's children have their own children (one-level limit)
        const hasNestedChildren = element.children && element.children.some(child => 
            child.children && child.children.length > 0
        );
        if (hasNestedChildren) {
            alert('This element has children with their own children. One-level nesting limit enforced.');
            this.hideContextMenu();
            return;
        }
        
        this.hideContextMenu();
        // Show modal to select child element type, then add to element's children
        // Use binId from contextMenuState or find it
        const targetBinId = binId || this.appState.activeBinId || (page.bins?.[0]?.id);
        if (targetBinId) {
            this.showAddChildElementModal(pageId, targetBinId, elementIndex);
        }
    }
    
    showAddChildElementModal(pageId, binId, elementIndex) {
        return this.modalHandler.showAddChildElementModal(pageId, binId, elementIndex);
    }
    
    addElementAfter(pageId, binId, elementIndex, elementType) {
        const page = this.appState.pages.find(p => p.id === pageId);
        if (!page) return;
        
        const bin = page.bins?.find(b => b.id === (binId || this.appState.activeBinId));
        if (!bin) return;
        if (!bin.elements) bin.elements = [];
        
        const newElement = this.elementManager.createElementTemplate(elementType);
        // Insert after the clicked element (at elementIndex + 1)
        const insertIndex = elementIndex + 1;
        bin.elements.splice(insertIndex, 0, newElement);
        this.dataManager.saveData();
        this.render();
    }
    
    handleContextAddPage() {
        this.hideContextMenu();
        this.addPage();
    }
    
    handleContextAddElementPage() {
        const { pageId, binId } = this.appState.contextMenuState;
        const targetPageId = pageId || this.activePageId;
        const targetBinId = binId || this.appState.activeBinId;
        
        if (!targetPageId || !targetBinId) {
            this.hideContextMenu();
            return;
        }
        
        this.hideContextMenu();
        this.modalHandler.showAddElementModal(targetPageId, targetBinId);
    }
    
    handleContextDeletePage() {
        const { pageId } = this.appState.contextMenuState;
        const targetPageId = pageId || this.activePageId;
        
        if (!targetPageId) {
            this.hideContextMenu();
            return;
        }
        
        const page = this.appState.pages.find(p => p.id === targetPageId);
        if (!page) {
            this.hideContextMenu();
            return;
        }
        
        this.hideContextMenu();
        this.deletePage(targetPageId);
    }
    
    handleContextToggleSubtasks() {
        this.hideContextMenu();
        this.toggleAllSubtasks();
    }
    
    handleContextResetDay() {
        this.hideContextMenu();
        this.resetToday();
    }
    
    handleContextCollapseAllPages() {
        this.hideContextMenu();
        
        // Collapse all pages
        this.appState.pages.forEach(page => {
            // Set page state to collapsed
            this.pageStates[page.id] = false;
        });
        
        // Update UI for all pages using querySelector to ensure we get all
        const allPageArrows = document.querySelectorAll('[id^="page-toggle-"]');
        const allPageContents = document.querySelectorAll('[id^="page-content-"]');
        
        allPageArrows.forEach(arrow => {
            arrow.textContent = '▶';
        });
        
        allPageContents.forEach(content => {
            content.style.display = 'none';
        });
    }
    
    handleContextCollapsePage() {
        const { pageId } = this.appState.contextMenuState;
        if (pageId === null) return;
        
        const page = this.appState.pages.find(p => p.id === pageId);
        if (!page) return;
        
        // Toggle page collapse state
        const pageStates = this.appState.pageStates || {};
        if (!(pageId in pageStates)) {
            this.appState.setPageState(pageId, true);
        } else {
            const currentState = this.appState.getPageState(pageId);
            this.appState.setPageState(pageId, !currentState);
        }
        
        this.hideContextMenu();
        
        // Update the page UI
        const pageToggleId = `page-toggle-${pageId}`;
        const pageContentId = `page-content-${pageId}`;
        
        const arrow = document.getElementById(pageToggleId);
        const content = document.getElementById(pageContentId);
        
        if (arrow && content) {
            const isExpanded = this.pageStates[pageId];
            arrow.textContent = isExpanded ? '▼' : '▶';
            content.style.display = isExpanded ? 'block' : 'none';
        }
    }
    
    showEditModal(pageId, binId, elementIndex, element) {
        // If binId not provided, try to find it from active bin or element location
        if (!binId) {
            binId = this.appState.activeBinId;
            if (!binId) {
                const page = this.appState.pages.find(p => p.id === pageId);
                if (page && page.bins && page.bins.length > 0) {
                    binId = page.bins[0].id;
                }
            }
        }
        return this.modalHandler.showEditModal(pageId, binId, elementIndex, element);
    }
    
    addEditItem() {
        return this.modalHandler.addEditItem();
    }
    
    removeEditItem(idx) {
        return this.modalHandler.removeEditItem(idx);
    }
    
    saveEdit(pageId, elementIndex, skipClose = false) {
        return this.modalHandler.saveEdit(pageId, elementIndex, skipClose);
    }
    
    addEditSubtaskModal() {
        const container = document.getElementById('edit-subtasks-in-modal');
        if (!container) return;
        const idx = container.children.length;
        const newSubtask = document.createElement('div');
        newSubtask.className = 'subtask-item';
        newSubtask.innerHTML = `
            <input type="text" class="edit-subtask-text-modal" data-index="${idx}" value="New subtask" placeholder="Subtask text" />
            <input type="text" class="edit-subtask-time-modal" data-index="${idx}" value="" placeholder="Time" />
            <label class="edit-subtask-repeat-label">
                <input type="checkbox" class="edit-subtask-repeats-modal" data-index="${idx}" checked />
                Repeats
            </label>
            <button onclick="app.removeEditSubtaskModal(${idx})" class="remove-subtask-btn">×</button>
        `;
        container.appendChild(newSubtask);
        // Scroll to bottom to show new item
        container.scrollTop = container.scrollHeight;
    }
    
    removeEditSubtaskModal(idx) {
        return this.modalHandler.removeEditSubtaskModal(idx);
    }
    
    removeAllSubtasksModal() {
        return this.modalHandler.removeAllSubtasksModal();
    }
    
    addEditChildModal() {
        return this.modalHandler.addEditChildModal();
    }
    
    removeEditChildModal(idx) {
        return this.modalHandler.removeEditChildModal(idx);
    }
    
    removeAllChildrenModal() {
        return this.modalHandler.removeAllChildrenModal();
    }
    
    toggleArchiveViewInEdit(pageId, elementIndex) {
        return this.modalHandler.toggleArchiveViewInEdit(pageId, elementIndex);
    }
    
    showAddSubtasksModal(pageId, elementIndex, element) {
        return this.modalHandler.showAddSubtasksModal(pageId, elementIndex, element);
    }
    
    addEditSubtask() {
        const container = document.getElementById('edit-subtasks');
        const idx = container.children.length;
        const newSubtask = document.createElement('div');
        newSubtask.className = 'subtask-item';
        newSubtask.innerHTML = `
            <input type="text" class="edit-subtask-text" data-index="${idx}" value="New subtask" />
            <input type="text" class="edit-subtask-time" data-index="${idx}" value="" placeholder="Time" />
            <label>
                <input type="checkbox" class="edit-subtask-repeats" data-index="${idx}" checked />
                Repeats
            </label>
            <button onclick="app.removeEditSubtask(${idx})">×</button>
        `;
        container.appendChild(newSubtask);
    }
    
    removeEditSubtask(idx) {
        const container = document.getElementById('edit-subtasks');
        const item = container.querySelector(`.edit-subtask-text[data-index="${idx}"]`)?.closest('.subtask-item');
        if (item) {
            item.remove();
        }
    }
    
    saveChildren(pageId, elementIndex) {
        return this.modalHandler.saveChildren(pageId, elementIndex);
    }
    
    // Legacy method name for backward compatibility
    saveSubtasks(pageId, elementIndex) {
        return this.modalHandler.saveSubtasks(pageId, elementIndex);
    }
    
    showViewDataModal(element, isSubtask = false) {
        return this.modalHandler.showViewDataModal(element, isSubtask);
    }
    
    closeModal() {
        return this.modalHandler.closeModal();
    }
    
    showTooltip(text) {
        const tooltip = document.getElementById('global-tooltip');
        if (tooltip) {
            tooltip.textContent = text;
            tooltip.classList.add('visible');
        }
    }
    
    hideTooltip() {
        const tooltip = document.getElementById('global-tooltip');
        if (tooltip) {
            tooltip.classList.remove('visible');
        }
    }
    
    showAudioRecordingModal() {
        return this.audioHandler.showAudioRecordingModal();
    }
    
    async startAudioRecording() {
        return this.audioHandler.startAudioRecording();
    }
    
    stopAudioRecording() {
        return this.audioHandler.stopAudioRecording();
    }
    
    async saveAudioRecording() {
        return this.audioHandler.saveAudioRecording();
    }
    
    closeAudioRecordingModal() {
        return this.audioHandler.closeAudioRecordingModal();
    }
    
    // Inline audio recording methods - delegate to AudioHandler
    async startInlineRecording(pageId, binId, elementIndex, originalElementIndex = null, shouldOverwrite = false) {
        return this.audioHandler.startInlineRecording(pageId, binId, elementIndex, originalElementIndex, shouldOverwrite);
    }
    
    async stopInlineRecording(pageId, binId, elementIndex, originalElementIndex = null) {
        return this.audioHandler.stopInlineRecording(pageId, binId, elementIndex, originalElementIndex);
    }
    
    async saveInlineRecording(pageId, binId, elementIndex, chunks, domElementIndex = null) {
        return this.audioHandler.saveInlineRecording(pageId, binId, elementIndex, chunks, domElementIndex);
    }
    
    async appendInlineRecording(pageId, binId, elementIndex, originalElementIndex = null) {
        return this.audioHandler.appendInlineRecording(pageId, binId, elementIndex, originalElementIndex);
    }
    
    async playInlineAudio(pageId, binId, elementIndex) {
        return this.audioHandler.playInlineAudio(pageId, binId, elementIndex);
    }
    
    stopInlineAudio(pageId, binId, elementIndex) {
        return this.audioHandler.stopInlineAudio(pageId, binId, elementIndex);
    }
    
    showAudioProgressBar(pageId, binId, elementIndex) {
        return this.audioHandler.showAudioProgressBar(pageId, binId, elementIndex);
    }
    
    hideAudioProgressBar(pageId, binId, elementIndex) {
        return this.audioHandler.hideAudioProgressBar(pageId, binId, elementIndex);
    }
    
    updateAudioStatus(pageId, binId, elementIndex, text, color) {
        return this.audioHandler.updateAudioStatus(pageId, binId, elementIndex, text, color);
    }
    
    toggleArchiveView(pageId, binId, elementIndex) {
        return this.audioHandler.toggleArchiveView(pageId, binId, elementIndex);
    }
    
}

// Initialize app
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new TodoApp();
    // Make app globally accessible for onclick handlers in modals
    window.app = app;
});




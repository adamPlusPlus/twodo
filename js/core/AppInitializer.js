// AppInitializer.js - Handles application initialization
// Extracted from app.js to reduce coupling and improve modularity
import { eventBus } from './EventBus.js';
import { EVENTS } from './AppEvents.js';

/**
 * AppInitializer - Manages application initialization sequence
 * 
 * Handles plugin loading, async initialization, and startup sequence.
 */
export class AppInitializer {
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
                const data = await this.app.fileManager.loadFile(fileParam);
                if (data.pages && Array.isArray(data.pages)) {
                    this.app.pages = data.pages;
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
        console.log(`[DIAG] AppInitializer.init() - loadLastOpenedFile took: ${initLoadTime.toFixed(1)}ms`);
        
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
     * Extracted from app.js for better organization
     */
    async loadAllPlugins() {
        // Define all plugin paths
        const elementTypes = [
            'LinkBookmarkElement', 'CodeSnippetElement', 'TableElement',
            'ContactElement', 'ExpenseTrackerElement', 'ReadingListElement',
            'RecipeElement', 'WorkoutElement', 'MoodTrackerElement',
            'NoteElement', 'HabitTracker', 'TimeTracking',
            'ElementRelationships', 'CustomProperties'
        ];
        
        const pagePlugins = [
            'SearchFilter', 'ExportImport', 'PageTemplates', 'CustomScripts',
            'PageThemes', 'CustomViews', 'AnalyticsDashboard',
            'PageGoalSetting', 'PageReminderSystem'
        ];
        
        const binPlugins = [
            'KanbanBoard', 'WorkflowAutomation', 'BatchOperations', 'CustomSorting',
            'FilterPresets', 'ProgressTracker', 'TimeEstimates', 'ColorCoding',
            'BinArchive', 'BinStatistics', 'BinNotificationRules', 'GanttChartView'
        ];
        
        const formatRenderers = [
            'TrelloBoardFormat', 'GridLayoutFormat', 'HorizontalLayoutFormat', 'PageKanbanFormat'
        ];
        
        // Load all plugins
        const loadPromises = [];
        
        // Load element types
        for (const type of elementTypes) {
            loadPromises.push(
                this.app.pluginLoader.loadPlugin(`/js/plugins/element/${type}.js`, null, this.app)
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
                        console.warn(`Failed to load element type ${type}:`, err);
                        return null;
                    })
            );
        }
        
        // Load page plugins
        for (const plugin of pagePlugins) {
            loadPromises.push(
                this.app.pluginLoader.loadPlugin(`/js/plugins/page/${plugin}.js`, null, this.app)
                    .catch(err => {
                        const isFetchError = err instanceof TypeError && 
                            (err.message.includes('Failed to fetch') || 
                             err.message.includes('ERR_CONNECTION_REFUSED') ||
                             err.message.includes('dynamically imported module'));
                        if (isFetchError) {
                            return null;
                        }
                        console.warn(`Failed to load page plugin ${plugin}:`, err);
                        return null;
                    })
            );
        }
        
        // Load bin plugins
        for (const plugin of binPlugins) {
            loadPromises.push(
                this.app.pluginLoader.loadPlugin(`/js/plugins/bin/${plugin}.js`, null, this.app)
                    .catch(err => {
                        const isFetchError = err instanceof TypeError && 
                            (err.message.includes('Failed to fetch') || 
                             err.message.includes('ERR_CONNECTION_REFUSED') ||
                             err.message.includes('dynamically imported module'));
                        if (isFetchError) {
                            return null;
                        }
                        console.warn(`Failed to load bin plugin ${plugin}:`, err);
                        return null;
                    })
            );
        }
        
        // Load format renderers
        for (const format of formatRenderers) {
            loadPromises.push(
                this.app.pluginLoader.loadPlugin(`/js/plugins/format/${format}.js`, null, this.app)
                    .catch(err => {
                        const isFetchError = err instanceof TypeError && 
                            (err.message.includes('Failed to fetch') || 
                             err.message.includes('ERR_CONNECTION_REFUSED') ||
                             err.message.includes('dynamically imported module'));
                        if (isFetchError) {
                            return null;
                        }
                        console.warn(`Failed to load format renderer ${format}:`, err);
                        return null;
                    })
            );
        }
        
        // Wait for all plugins to load
        await Promise.allSettled(loadPromises);
        console.log('All plugins loaded');
    }
    
    /**
     * Initialize plugin system
     */
    async initializePlugins() {
        // Load all available plugins first (already parallel)
        await this.loadAllPlugins();
        
        // Initialize plugins for existing pages and bins in parallel
        const initPromises = [];
        for (const page of this.app.pages) {
            initPromises.push(
                this.app.pagePluginManager.initializePagePlugins(page.id)
                    .catch(err => console.warn(`Failed to initialize page plugins for ${page.id}:`, err))
            );
            if (page.bins) {
                for (const bin of page.bins) {
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


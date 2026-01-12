// PluginDiscovery.js - Discovers and loads plugins from manifest files
// Replaces hardcoded plugin lists with configuration-based discovery

/**
 * PluginDiscovery - Discovers plugins from manifest files
 * 
 * Supports:
 * - Loading plugins from manifest.json
 * - Scanning plugin directories
 * - Configuration-based plugin loading
 * - Optional plugins (graceful failure)
 */
export class PluginDiscovery {
    constructor() {
        this.manifestPath = '/js/plugins/plugin-manifest.json';
        this.manifest = null;
    }
    
    /**
     * Load plugin manifest
     * @returns {Promise<Object>} Manifest object
     */
    async loadManifest() {
        if (this.manifest) {
            return this.manifest;
        }
        
        try {
            const response = await fetch(this.manifestPath);
            if (!response.ok) {
                console.warn('[PluginDiscovery] Manifest not found, using defaults');
                return this.getDefaultManifest();
            }
            this.manifest = await response.json();
            return this.manifest;
        } catch (error) {
            console.warn('[PluginDiscovery] Failed to load manifest:', error);
            return this.getDefaultManifest();
        }
    }
    
    /**
     * Get default manifest (fallback if manifest file doesn't exist)
     * @returns {Object} Default manifest
     */
    getDefaultManifest() {
        return {
            elementTypes: [
                { name: 'LinkBookmarkElement', path: '/js/plugins/element/LinkBookmarkElement.js' },
                { name: 'CodeSnippetElement', path: '/js/plugins/element/CodeSnippetElement.js' },
                { name: 'TableElement', path: '/js/plugins/element/TableElement.js' },
                { name: 'ContactElement', path: '/js/plugins/element/ContactElement.js' },
                { name: 'ExpenseTrackerElement', path: '/js/plugins/element/ExpenseTrackerElement.js' },
                { name: 'ReadingListElement', path: '/js/plugins/element/ReadingListElement.js' },
                { name: 'RecipeElement', path: '/js/plugins/element/RecipeElement.js' },
                { name: 'WorkoutElement', path: '/js/plugins/element/WorkoutElement.js' },
                { name: 'MoodTrackerElement', path: '/js/plugins/element/MoodTrackerElement.js' },
                { name: 'NoteElement', path: '/js/plugins/element/NoteElement.js' },
                { name: 'HabitTracker', path: '/js/plugins/element/HabitTracker.js' },
                { name: 'TimeTracking', path: '/js/plugins/element/TimeTracking.js' },
                { name: 'ElementRelationships', path: '/js/plugins/element/ElementRelationships.js' },
                { name: 'CustomProperties', path: '/js/plugins/element/CustomProperties.js' }
            ],
            pagePlugins: [
                { name: 'SearchFilter', path: '/js/plugins/page/SearchFilter.js' },
                { name: 'ExportImport', path: '/js/plugins/page/ExportImport.js' },
                { name: 'PageTemplates', path: '/js/plugins/page/PageTemplates.js' },
                { name: 'CustomScripts', path: '/js/plugins/page/CustomScripts.js' },
                { name: 'PageThemes', path: '/js/plugins/page/PageThemes.js' },
                { name: 'CustomViews', path: '/js/plugins/page/CustomViews.js' },
                { name: 'AnalyticsDashboard', path: '/js/plugins/page/AnalyticsDashboard.js' },
                { name: 'PageGoalSetting', path: '/js/plugins/page/PageGoalSetting.js' },
                { name: 'PageReminderSystem', path: '/js/plugins/page/PageReminderSystem.js' }
            ],
            binPlugins: [
                { name: 'KanbanBoard', path: '/js/plugins/bin/KanbanBoard.js' },
                { name: 'WorkflowAutomation', path: '/js/plugins/bin/WorkflowAutomation.js' },
                { name: 'BatchOperations', path: '/js/plugins/bin/BatchOperations.js' },
                { name: 'CustomSorting', path: '/js/plugins/bin/CustomSorting.js' },
                { name: 'FilterPresets', path: '/js/plugins/bin/FilterPresets.js' },
                { name: 'ProgressTracker', path: '/js/plugins/bin/ProgressTracker.js' },
                { name: 'TimeEstimates', path: '/js/plugins/bin/TimeEstimates.js' },
                { name: 'ColorCoding', path: '/js/plugins/bin/ColorCoding.js' },
                { name: 'BinArchive', path: '/js/plugins/bin/BinArchive.js' },
                { name: 'BinStatistics', path: '/js/plugins/bin/BinStatistics.js' },
                { name: 'BinNotificationRules', path: '/js/plugins/bin/BinNotificationRules.js' },
                { name: 'GanttChartView', path: '/js/plugins/bin/GanttChartView.js' }
            ],
            formatRenderers: [
                { name: 'TrelloBoardFormat', path: '/js/plugins/format/TrelloBoardFormat.js' },
                { name: 'GridLayoutFormat', path: '/js/plugins/format/GridLayoutFormat.js' },
                { name: 'HorizontalLayoutFormat', path: '/js/plugins/format/HorizontalLayoutFormat.js' },
                { name: 'PageKanbanFormat', path: '/js/plugins/format/PageKanbanFormat.js' },
                { name: 'DocumentViewFormat', path: '/js/plugins/format/DocumentViewFormat.js' },
                { name: 'LaTeXEditorFormat', path: '/js/plugins/format/LaTeXEditorFormat.js' },
                { name: 'MindMapFormat', path: '/js/plugins/format/MindMapFormat.js' },
                { name: 'LogicGraphFormat', path: '/js/plugins/format/LogicGraphFormat.js' },
                { name: 'FlowchartFormat', path: '/js/plugins/format/FlowchartFormat.js' }
            ]
        };
    }
    
    /**
     * Get element type plugins
     * @returns {Promise<Array>} Array of plugin definitions
     */
    async getElementTypes() {
        const manifest = await this.loadManifest();
        return manifest.elementTypes || [];
    }
    
    /**
     * Get page plugins
     * @returns {Promise<Array>} Array of plugin definitions
     */
    async getPagePlugins() {
        const manifest = await this.loadManifest();
        return manifest.pagePlugins || [];
    }
    
    /**
     * Get bin plugins
     * @returns {Promise<Array>} Array of plugin definitions
     */
    async getBinPlugins() {
        const manifest = await this.loadManifest();
        return manifest.binPlugins || [];
    }
    
    /**
     * Get format renderers
     * @returns {Promise<Array>} Array of plugin definitions
     */
    async getFormatRenderers() {
        const manifest = await this.loadManifest();
        return manifest.formatRenderers || [];
    }
    
    /**
     * Get all plugins
     * @returns {Promise<Object>} Object with all plugin types
     */
    async getAllPlugins() {
        const manifest = await this.loadManifest();
        return {
            elementTypes: manifest.elementTypes || [],
            pagePlugins: manifest.pagePlugins || [],
            binPlugins: manifest.binPlugins || [],
            formatRenderers: manifest.formatRenderers || []
        };
    }
}

// Export singleton instance
export const pluginDiscovery = new PluginDiscovery();

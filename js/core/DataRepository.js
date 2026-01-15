// DataRepository.js - Abstract data access layer
// Provides a repository pattern for data access, allowing different storage backends

/**
 * DataRepository - Abstract data access layer
 * 
 * Provides a clean interface for data access operations, allowing
 * different storage backends (localStorage, IndexedDB, API, etc.)
 */
export class DataRepository {
    constructor() {
        this.storageKey = 'twodo-data';
    }
    
    /**
     * Get all pages
     * @returns {Array} Array of pages
     */
    getPages() {
        // This will be implemented to get from AppState service
        // For now, placeholder
        return [];
    }
    
    /**
     * Get a specific page by ID
     * @param {string} pageId - Page ID
     * @returns {Object|null} Page object or null
     */
    getPage(pageId) {
        const pages = this.getPages();
        return pages.find(page => page.id === pageId) || null;
    }
    
    /**
     * Save pages
     * @param {Array} pages - Array of pages to save
     */
    savePages(pages) {
        // This will be implemented to update AppState
        // For now, placeholder
    }
    
    /**
     * Get current page ID
     * @returns {string} Current page ID
     */
    getCurrentPageId() {
        // Placeholder - will get from AppState
        return null;
    }
    
    /**
     * Set current page ID
     * @param {string} pageId - Page ID
     */
    setCurrentPageId(pageId) {
        // Placeholder - will set in AppState
    }
    
    /**
     * Get bin states
     * @returns {Object} Bin states object
     */
    getBinStates() {
        // Placeholder
        return {};
    }
    
    /**
     * Get subtask states
     * @returns {Object} Subtask states object
     */
    getSubtaskStates() {
        // Placeholder
        return {};
    }
    
    /**
     * Get all subtasks expanded flag
     * @returns {boolean}
     */
    getAllSubtasksExpanded() {
        // Placeholder
        return false;
    }
}

/**
 * AppStateRepository - Implementation using AppState service
 */
export class AppStateRepository extends DataRepository {
    constructor() {
        super();
        // Will get AppState from ServiceLocator when needed
    }
    
    /**
     * Get AppState service (lazy)
     */
    _getAppState() {
        // This will use ServiceLocator when services are available
        // For now, placeholder
        return null;
    }
    
    getPages() {
        const appState = this._getAppState();
        return appState ? appState.pages : [];
    }
    
    getPage(pageId) {
        const pages = this.getPages();
        return pages.find(page => page.id === pageId) || null;
    }
    
    savePages(pages) {
        const appState = this._getAppState();
        if (appState) {
            appState.pages = pages;
        }
    }
    
    getCurrentPageId() {
        const appState = this._getAppState();
        return appState ? appState.currentPageId : null;
    }
    
    setCurrentPageId(pageId) {
        const appState = this._getAppState();
        if (appState) {
            appState.currentPageId = pageId;
        }
    }
    
    getBinStates() {
        const appState = this._getAppState();
        return appState ? appState.binStates : {};
    }
    
    getSubtaskStates() {
        const appState = this._getAppState();
        return appState ? appState.subtaskStates : {};
    }
    
    getAllSubtasksExpanded() {
        const appState = this._getAppState();
        return appState ? appState.allSubtasksExpanded : false;
    }
}

// Export default implementation
export default AppStateRepository;

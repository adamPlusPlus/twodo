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
     * Get all documents
     * @returns {Array} Array of documents
     */
    getDocuments() {
        // This will be implemented to get from AppState service
        // For now, placeholder
        return [];
    }

    /**
     * Get a specific document by ID
     * @param {string} documentId - Document ID
     * @returns {Object|null} Document object or null
     */
    getDocument(documentId) {
        const documents = this.getDocuments();
        return documents.find(document => document.id === documentId) || null;
    }

    /**
     * Save documents
     * @param {Array} documents - Array of documents to save
     */
    saveDocuments(documents) {
        // This will be implemented to update AppState
        // For now, placeholder
    }

    /**
     * Get current document ID
     * @returns {string} Current document ID
     */
    getCurrentDocumentId() {
        // Placeholder - will get from AppState
        return null;
    }

    /**
     * Set current document ID
     * @param {string} documentId - Document ID
     */
    setCurrentDocumentId(documentId) {
        // Placeholder - will set in AppState
    }

    /**
     * Get group states
     * @returns {Object} Group states object
     */
    getGroupStates() {
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
    
    getDocuments() {
        const appState = this._getAppState();
        return appState ? appState.documents : [];
    }
    
    getDocument(documentId) {
        const documents = this.getDocuments();
        return documents.find(document => document.id === documentId) || null;
    }
    
    saveDocuments(documents) {
        const appState = this._getAppState();
        if (appState) {
            appState.documents = documents;
        }
    }
    
    getCurrentDocumentId() {
        const appState = this._getAppState();
        return appState ? appState.currentDocumentId : null;
    }
    
    setCurrentDocumentId(documentId) {
        const appState = this._getAppState();
        if (appState) {
            appState.currentDocumentId = documentId;
        }
    }
    
    getGroupStates() {
        const appState = this._getAppState();
        return appState ? appState.groupStates : {};
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

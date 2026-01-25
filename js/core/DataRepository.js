// DataRepository.js - Wrapper for VaultRepository
// Provides backward-compatible interface using RepositoryManager

import { repositoryManager } from './RepositoryManager.js';
import { VaultRepository } from './repositories/VaultRepository.js';
import { getService, SERVICES } from './AppServices.js';

/**
 * DataRepository - Wrapper for VaultRepository
 * 
 * Provides backward-compatible interface while using the new repository system
 */
export class DataRepository {
    constructor() {
        this.storageKey = 'twodo-data';
        this._vaultRepository = null;
    }
    
    /**
     * Get VaultRepository instance
     * @private
     * @returns {VaultRepository} - Vault repository
     */
    _getVaultRepository() {
        if (!this._vaultRepository) {
            // Get or create vault repository
            if (repositoryManager.hasRepository('vault')) {
                this._vaultRepository = repositoryManager.getRepository('vault');
            } else {
                // Create and register vault repository
                this._vaultRepository = new VaultRepository(this.storageKey);
                repositoryManager.registerRepository('vault', this._vaultRepository);
            }
        }
        return this._vaultRepository;
    }
    
    /**
     * Get AppState service
     * @private
     * @returns {Object|null} - AppState service
     */
    _getAppState() {
        return getService(SERVICES.APP_STATE);
    }
    
    /**
     * Get all documents
     * @returns {Array} Array of documents
     */
    getDocuments() {
        const appState = this._getAppState();
        return appState ? appState.documents : [];
    }

    /**
     * Get a specific document by ID
     * @param {string} documentId - Document ID
     * @returns {Promise<Object|null>} Document object or null
     */
    async getDocument(documentId) {
        const vaultRepo = this._getVaultRepository();
        return await vaultRepo.getItem(documentId);
    }

    /**
     * Save documents
     * @param {Array} documents - Array of documents to save
     */
    async saveDocuments(documents) {
        const vaultRepo = this._getVaultRepository();
        for (const doc of documents) {
            if (doc && doc.id) {
                await vaultRepo.saveItem(doc.id, doc);
            }
        }
    }

    /**
     * Get current document ID
     * @returns {string} Current document ID
     */
    getCurrentDocumentId() {
        const appState = this._getAppState();
        return appState ? appState.currentDocumentId : null;
    }

    /**
     * Set current document ID
     * @param {string} documentId - Document ID
     */
    setCurrentDocumentId(documentId) {
        const appState = this._getAppState();
        if (appState) {
            appState.currentDocumentId = documentId;
        }
    }

    /**
     * Get group states
     * @returns {Object} Group states object
     */
    getGroupStates() {
        const appState = this._getAppState();
        return appState ? appState.groupStates : {};
    }

    /**
     * Get subtask states
     * @returns {Object} Subtask states object
     */
    getSubtaskStates() {
        const appState = this._getAppState();
        return appState ? appState.subtaskStates : {};
    }
    
    /**
     * Get all subtasks expanded flag
     * @returns {boolean}
     */
    getAllSubtasksExpanded() {
        const appState = this._getAppState();
        return appState ? appState.allSubtasksExpanded : false;
    }
}

/**
 * AppStateRepository - Implementation using AppState service (backward compatibility)
 * @deprecated Use DataRepository with VaultRepository instead
 */
export class AppStateRepository extends DataRepository {
    constructor() {
        super();
    }
}

// Export default implementation
export default DataRepository;

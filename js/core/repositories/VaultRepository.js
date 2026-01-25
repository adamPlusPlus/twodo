// VaultRepository.js - Vault/workspace repository for documents
// Manages documents with active-set memory integration

import { Repository } from '../Repository.js';
import { getService, SERVICES } from '../AppServices.js';

export class VaultRepository extends Repository {
    constructor(storageKey = 'twodo-data') {
        super('vault', storageKey);
    }
    
    /**
     * Load document from storage
     * @protected
     * @param {string} documentId - Document ID
     * @returns {Promise<Object|null>} - Document or null
     */
    async _loadItem(documentId) {
        // Get from AppState or localStorage
        const appState = getService(SERVICES.APP_STATE);
        if (appState && appState.documents) {
            const doc = appState.documents.find(d => d.id === documentId);
            if (doc && doc.groups) {
                // Full document
                return doc;
            }
        }
        
        // Try loading from localStorage
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                const data = JSON.parse(stored);
                const documents = data.documents || [];
                return documents.find(d => d.id === documentId) || null;
            }
        } catch (error) {
            console.error(`[VaultRepository] Error loading document ${documentId}:`, error);
        }
        
        return null;
    }
    
    /**
     * Save document to storage
     * @protected
     * @param {string} documentId - Document ID
     * @param {Object} document - Document data
     * @returns {Promise<void>}
     */
    async _saveItem(documentId, document) {
        // Update AppState
        const appState = getService(SERVICES.APP_STATE);
        if (appState && appState.documents) {
            const index = appState.documents.findIndex(d => d.id === documentId);
            if (index >= 0) {
                appState.documents[index] = document;
            } else {
                appState.documents.push(document);
            }
        }
        
        // Save to localStorage
        try {
            const stored = localStorage.getItem(this.storageKey);
            const data = stored ? JSON.parse(stored) : { documents: [] };
            const documents = data.documents || [];
            const index = documents.findIndex(d => d.id === documentId);
            if (index >= 0) {
                documents[index] = document;
            } else {
                documents.push(document);
            }
            data.documents = documents;
            localStorage.setItem(this.storageKey, JSON.stringify(data));
        } catch (error) {
            console.error(`[VaultRepository] Error saving document ${documentId}:`, error);
        }
    }
    
    /**
     * Delete document from storage
     * @protected
     * @param {string} documentId - Document ID
     * @returns {Promise<void>}
     */
    async _deleteItem(documentId) {
        // Remove from AppState
        const appState = getService(SERVICES.APP_STATE);
        if (appState && appState.documents) {
            appState.documents = appState.documents.filter(d => d.id !== documentId);
        }
        
        // Remove from localStorage
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                const data = JSON.parse(stored);
                data.documents = (data.documents || []).filter(d => d.id !== documentId);
                localStorage.setItem(this.storageKey, JSON.stringify(data));
            }
        } catch (error) {
            console.error(`[VaultRepository] Error deleting document ${documentId}:`, error);
        }
    }
    
    /**
     * Get all document IDs
     * @returns {Promise<Array<string>>} - Array of document IDs
     */
    async getAllItemIds() {
        const appState = getService(SERVICES.APP_STATE);
        if (appState && appState.documents) {
            return appState.documents.map(d => d.id).filter(Boolean);
        }
        
        // Fallback to localStorage
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                const data = JSON.parse(stored);
                return (data.documents || []).map(d => d.id).filter(Boolean);
            }
        } catch (error) {
            console.error('[VaultRepository] Error getting document IDs:', error);
        }
        
        return [];
    }
}

// ActiveSetManager.js - Manages active-set memory with LRU eviction
// Only keeps open documents + small working set in memory to prevent "vault crawl"

import { activeSetConfig } from './ActiveSetConfig.js';
import { eventBus } from './EventBus.js';
import { performanceBudgetManager } from './PerformanceBudgetManager.js';

export class ActiveSetManager {
    constructor() {
        this.config = activeSetConfig;
        
        // LRU cache: Map of documentId -> { document, lastAccessed }
        this.activeCache = new Map();
        
        // Metadata store: Map of documentId -> metadata
        this.metadataStore = new Map();
        
        // Load function: (documentId) => Promise<document>
        this.loadFunction = null;
        
        // Unload function: (documentId, document) => void
        this.unloadFunction = null;
        
        // Statistics
        this.stats = {
            loads: 0,
            unloads: 0,
            hits: 0,
            misses: 0
        };
    }
    
    /**
     * Set the function to load documents on demand
     * @param {Function} loadFn - Async function (documentId) => Promise<document>
     */
    setLoadFunction(loadFn) {
        this.loadFunction = loadFn;
    }
    
    /**
     * Set the function to handle document unloads
     * @param {Function} unloadFn - Function (documentId, document) => void
     */
    setUnloadFunction(unloadFn) {
        this.unloadFunction = unloadFn;
    }
    
    /**
     * Get document metadata without loading full document
     * @param {string} documentId - Document ID
     * @returns {Object|null} - Metadata object or null
     */
    getMetadata(documentId) {
        return this.metadataStore.get(documentId) || null;
    }
    
    /**
     * Set document metadata
     * @param {string} documentId - Document ID
     * @param {Object} metadata - Metadata object
     */
    setMetadata(documentId, metadata) {
        this.metadataStore.set(documentId, metadata);
    }
    
    /**
     * Set metadata for multiple documents
     * @param {Array<Object>} documents - Array of { id, ...metadata } objects
     */
    setMetadataBatch(documents) {
        documents.forEach(doc => {
            if (doc && doc.id) {
                const metadata = {
                    id: doc.id,
                    title: doc.title || '',
                    lastModified: doc.lastModified || Date.now(),
                    size: this._estimateSize(doc),
                    ...doc
                };
                // Remove full data, keep only metadata
                delete metadata.groups;
                delete metadata.items;
                this.metadataStore.set(doc.id, metadata);
            }
        });
    }
    
    /**
     * Get document from active set (loads if not in cache)
     * @param {string} documentId - Document ID
     * @returns {Promise<Object|null>} - Document or null if not found
     */
    async getDocument(documentId) {
        if (!this.config.isEnabled()) {
            // If disabled, just return null (fallback to direct access)
            return null;
        }
        
        // Check cache first
        if (this.activeCache.has(documentId)) {
            const entry = this.activeCache.get(documentId);
            entry.lastAccessed = Date.now();
            this.stats.hits++;
            
            if (this.config.shouldLogHits()) {
                console.log(`[ActiveSetManager] Cache hit: ${documentId}`);
            }
            
            return entry.document;
        }
        
        this.stats.misses++;
        
        // Load document
        return await this._loadDocument(documentId);
    }
    
    /**
     * Load document into active set
     * @private
     * @param {string} documentId - Document ID
     * @returns {Promise<Object|null>} - Loaded document or null
     */
    async _loadDocument(documentId) {
        if (!this.loadFunction) {
            console.warn(`[ActiveSetManager] No load function set, cannot load: ${documentId}`);
            return null;
        }
        
        return performanceBudgetManager.measureOperation('RENDERING', async () => {
            const startTime = performance.now();
            
            try {
                // Load document using provided function
                const document = await this.loadFunction(documentId);
                
                if (!document) {
                    return null;
                }
                
                // Ensure document has ID
                if (!document.id) {
                    document.id = documentId;
                }
                
                // Evict if needed
                this._evictIfNeeded();
                
                // Add to cache
                this.activeCache.set(documentId, {
                    document,
                    lastAccessed: Date.now()
                });
                
                this.stats.loads++;
                
                const duration = performance.now() - startTime;
                
                if (this.config.shouldLogLoads()) {
                    console.log(`[ActiveSetManager] Loaded: ${documentId} (${duration.toFixed(2)}ms)`);
                }
                
                // Emit event
                eventBus.emit('active-set:document-loaded', {
                    documentId,
                    duration,
                    activeCount: this.activeCache.size
                });
                
                return document;
            } catch (error) {
                console.error(`[ActiveSetManager] Error loading document ${documentId}:`, error);
                return null;
            }
        }, { source: 'ActiveSetManager.loadDocument', documentId });
    }
    
    /**
     * Unload document from active set
     * @param {string} documentId - Document ID
     * @returns {boolean} - True if unloaded
     */
    unloadDocument(documentId) {
        if (!this.activeCache.has(documentId)) {
            return false;
        }
        
        const entry = this.activeCache.get(documentId);
        this.activeCache.delete(documentId);
        
        this.stats.unloads++;
        
        if (this.config.shouldLogUnloads()) {
            console.log(`[ActiveSetManager] Unloaded: ${documentId}`);
        }
        
        // Call unload function if provided
        if (this.unloadFunction) {
            try {
                this.unloadFunction(documentId, entry.document);
            } catch (error) {
                console.error(`[ActiveSetManager] Error in unload function for ${documentId}:`, error);
            }
        }
        
        // Emit event
        eventBus.emit('active-set:document-unloaded', {
            documentId,
            activeCount: this.activeCache.size
        });
        
        return true;
    }
    
    /**
     * Evict documents if cache exceeds limit
     * @private
     */
    _evictIfNeeded() {
        const maxActive = this.config.getMaxActiveDocuments();
        
        if (this.activeCache.size < maxActive) {
            return; // No eviction needed
        }
        
        const strategy = this.config.getEvictionStrategy();
        
        if (strategy === 'LRU') {
            // Find least recently used document
            let lruId = null;
            let lruTime = Infinity;
            
            for (const [id, entry] of this.activeCache.entries()) {
                if (entry.lastAccessed < lruTime) {
                    lruTime = entry.lastAccessed;
                    lruId = id;
                }
            }
            
            if (lruId) {
                this.unloadDocument(lruId);
            }
        }
    }
    
    /**
     * Get all active document IDs
     * @returns {Array<string>} - Array of document IDs in active set
     */
    getActiveDocumentIds() {
        return Array.from(this.activeCache.keys());
    }
    
    /**
     * Get all document metadata
     * @returns {Array<Object>} - Array of metadata objects
     */
    getAllMetadata() {
        return Array.from(this.metadataStore.values());
    }
    
    /**
     * Check if document is in active set
     * @param {string} documentId - Document ID
     * @returns {boolean} - True if active
     */
    isActive(documentId) {
        return this.activeCache.has(documentId);
    }
    
    /**
     * Clear all active documents
     */
    clear() {
        const documentIds = Array.from(this.activeCache.keys());
        documentIds.forEach(id => this.unloadDocument(id));
    }
    
    /**
     * Clear metadata store
     */
    clearMetadata() {
        this.metadataStore.clear();
    }
    
    /**
     * Get statistics
     * @returns {Object} - Statistics object
     */
    getStats() {
        return {
            ...this.stats,
            activeCount: this.activeCache.size,
            metadataCount: this.metadataStore.size,
            hitRate: this.stats.hits + this.stats.misses > 0 
                ? this.stats.hits / (this.stats.hits + this.stats.misses) 
                : 0
        };
    }
    
    /**
     * Reset statistics
     */
    resetStats() {
        this.stats = {
            loads: 0,
            unloads: 0,
            hits: 0,
            misses: 0
        };
    }
    
    /**
     * Estimate document size in bytes
     * @private
     * @param {Object} document - Document object
     * @returns {number} - Estimated size
     */
    _estimateSize(document) {
        try {
            return JSON.stringify(document).length;
        } catch (error) {
            return 0;
        }
    }
}

// Export singleton instance
export const activeSetManager = new ActiveSetManager();

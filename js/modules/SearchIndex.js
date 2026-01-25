// SearchIndex.js - Builds and maintains a search index for all elements
import { DataUtils } from '../utils/data.js';
import { getService, SERVICES, hasService } from '../core/AppServices.js';
import { ItemHierarchy } from '../utils/ItemHierarchy.js';
import { performanceBudgetManager } from '../core/PerformanceBudgetManager.js';
import { asyncIndexer } from '../core/AsyncIndexer.js';

export class SearchIndex {
    constructor() {
        this.index = new Map(); // elementId -> searchable data
        
        // Set up async indexer
        asyncIndexer.setIndexFunction((documentId) => this.indexDocument(documentId));
        
        // Start async rebuild (non-blocking)
        this.rebuildIndex();
    }
    
    /**
     * Get AppState service
     */
    _getAppState() {
        return getService(SERVICES.APP_STATE);
    }
    
    /**
     * Rebuild the entire search index (async, incremental)
     */
    async rebuildIndex() {
        // Clear existing index
        this.index.clear();
        
        const appState = this._getAppState();
        // Check if app and pages exist and is an array
        if (!appState || !appState.documents || !Array.isArray(appState.documents)) {
            return;
        }
        
        // Get all document IDs
        const documentIds = appState.documents
            .filter(page => page && page.id)
            .map(page => page.id);
        
        if (documentIds.length === 0) {
            return;
        }
        
        // Start async incremental indexing
        await asyncIndexer.indexDocuments(documentIds, {
            priority: 'low',
            onProgress: (processed, total) => {
                if (asyncIndexer.config.shouldLogProgress()) {
                    console.log(`[SearchIndex] Indexing progress: ${processed}/${total}`);
                }
            },
            onComplete: (processed, total) => {
                if (asyncIndexer.config.shouldLogCompletion()) {
                    console.log(`[SearchIndex] Indexing complete: ${processed}/${total} documents`);
                }
            }
        });
    }
    
    /**
     * Index a single document incrementally
     * @param {string} documentId - Document ID
     * @returns {Promise<void>}
     */
    async indexDocument(documentId) {
        const appState = this._getAppState();
        if (!appState || !appState.documents) {
            return;
        }
        
        // Find document (may need to load from active set)
        let page = appState.documents.find(p => p.id === documentId);
        
        // If document not found or is metadata-only, try to load it
        if (!page || !page.groups) {
            // Document might be in active set or needs loading
            // For now, skip metadata-only documents
            return;
        }
        
        // Index all elements in this document
        if (page.groups) {
            page.groups.forEach(bin => {
                const items = bin.items || [];
                if (items.length > 0) {
                    const itemIndex = ItemHierarchy.buildItemIndex(items);
                    items.forEach((element, elementIndex) => {
                        const elementId = this.getElementId(page.id, bin.id, elementIndex);
                        this.index.set(elementId, this.extractSearchableData(page, bin, element, elementIndex, itemIndex));
                    });
                }
            });
        }
    }
    
    /**
     * Index multiple documents in batch
     * @param {Array<string>} documentIds - Array of document IDs
     * @returns {Promise<void>}
     */
    async indexDocuments(documentIds) {
        await asyncIndexer.indexDocuments(documentIds, {
            priority: 'normal'
        });
    }
    
    /**
     * Cancel in-progress indexing
     */
    cancelIndexing() {
        asyncIndexer.cancelIndexing();
    }
    
    /**
     * Get unique element ID
     */
    getElementId(pageId, binId, elementIndex) {
        return `${pageId}-${binId}-${elementIndex}`;
    }
    
    /**
     * Extract searchable data from an element
     */
    extractSearchableData(page, bin, element, elementIndex, itemIndex) {
        const childItems = itemIndex ? ItemHierarchy.getChildItems(element, itemIndex) : [];
        const searchableData = {
            pageId: page.id,
            pageTitle: page.title || '',
            binId: bin.id,
            binTitle: bin.title || '',
            elementIndex: elementIndex,
            text: element.text || '',
            type: element.type || 'task',
            tags: element.tags || [],
            completed: element.completed || false,
            deadline: element.deadline || null,
            timeAllocated: element.timeAllocated || '',
            funModifier: element.funModifier || '',
            customProperties: element.customProperties || {},
            // Include children text
            childrenText: childItems.map(child => child.text || '').join(' '),
            // Include items text for multi-checkbox
            itemsText: (element.items || []).map(item => item.text || '').join(' ')
        };
        
        return searchableData;
    }
    
    /**
     * Search the index
     * @param {string} query - Search query
     * @param {Object} filters - Filter options
     * @returns {Array} - Array of matching element data
     */
    search(query, filters = {}) {
        return performanceBudgetManager.measureOperation('SEARCH', () => {
            const normalizedQuery = query ? query.toLowerCase().trim() : '';
            const results = [];
            
            for (const [elementId, elementData] of this.index.entries()) {
            let matches = true;
            
            // Text search
            if (normalizedQuery) {
                const searchableText = [
                    elementData.text,
                    elementData.pageTitle,
                    elementData.binTitle,
                    elementData.timeAllocated,
                    elementData.funModifier,
                    elementData.childrenText,
                    elementData.itemsText,
                    ...elementData.tags,
                    ...Object.values(elementData.customProperties)
                ].join(' ').toLowerCase();
                
                if (!searchableText.includes(normalizedQuery)) {
                    matches = false;
                }
            }
            
            // Apply filters
            if (filters.tags && filters.tags.length > 0) {
                const hasMatchingTag = filters.tags.some(tag => 
                    elementData.tags.includes(tag.toLowerCase())
                );
                if (!hasMatchingTag) matches = false;
            }
            
            if (filters.completed !== undefined) {
                if (elementData.completed !== filters.completed) matches = false;
            }
            
            if (filters.type && filters.type.length > 0) {
                if (!filters.type.includes(elementData.type)) matches = false;
            }
            
            if (filters.pageId && filters.pageId.length > 0) {
                if (!filters.pageId.includes(elementData.pageId)) matches = false;
            }
            
            if (filters.binId && filters.binId.length > 0) {
                if (!filters.binId.includes(elementData.binId)) matches = false;
            }
            
            if (filters.hasDeadline !== undefined) {
                if ((elementData.deadline !== null) !== filters.hasDeadline) matches = false;
            }
            
            if (filters.deadlineBefore) {
                if (!elementData.deadline || new Date(elementData.deadline) > new Date(filters.deadlineBefore)) {
                    matches = false;
                }
            }
            
            if (filters.deadlineAfter) {
                if (!elementData.deadline || new Date(elementData.deadline) < new Date(filters.deadlineAfter)) {
                    matches = false;
                }
            }
            
                if (matches) {
                    results.push({
                        ...elementData,
                        elementId
                    });
                }
            }
            
            return results;
        }, { source: 'SearchIndex-search' });
    }
    
    /**
     * Update index for a single element
     */
    updateElement(pageId, binId, elementIndex) {
        const appState = this._getAppState();
        const page = appState.documents.find(p => p.id === pageId);
        if (!page) return;
        
        const bin = page.groups?.find(b => b.id === binId);
        if (!bin) return;
        
        const items = bin.items || [];
        bin.items = items;
        const element = items?.[elementIndex];
        if (!element) return;
        
        const elementId = this.getElementId(pageId, binId, elementIndex);
        this.index.set(elementId, this.extractSearchableData(page, bin, element, elementIndex));
    }
    
    /**
     * Remove element from index
     */
    removeElement(pageId, binId, elementIndex) {
        const elementId = this.getElementId(pageId, binId, elementIndex);
        this.index.delete(elementId);
    }
    
    /**
     * Get all unique tags from index
     */
    getAllTags() {
        const tags = new Set();
        for (const entry of this.index.values()) {
            entry.tags.forEach(tag => tags.add(tag));
        }
        return Array.from(tags).sort();
    }
    
    /**
     * Get all element types from index
     */
    getAllTypes() {
        const types = new Set();
        for (const entry of this.index.values()) {
            types.add(entry.type);
        }
        return Array.from(types).sort();
    }
}


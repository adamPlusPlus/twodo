// SearchIndex.js - Builds and maintains a search index for all elements
import { DataUtils } from '../utils/data.js';
import { getService, SERVICES, hasService } from '../core/AppServices.js';

export class SearchIndex {
    constructor() {
        this.index = new Map(); // elementId -> searchable data
        this.rebuildIndex();
    }
    
    /**
     * Get AppState service
     */
    _getAppState() {
        return getService(SERVICES.APP_STATE);
    }
    
    /**
     * Rebuild the entire search index
     */
    rebuildIndex() {
        this.index.clear();
        
        const appState = this._getAppState();
        // Check if app and pages exist and is an array
        if (!appState || !appState.pages || !Array.isArray(appState.pages)) {
            return;
        }
        
        appState.pages.forEach(page => {
            if (page && page.bins) {
                page.bins.forEach(bin => {
                    if (bin && bin.elements) {
                        bin.elements.forEach((element, elementIndex) => {
                            const elementId = this.getElementId(page.id, bin.id, elementIndex);
                            this.index.set(elementId, this.extractSearchableData(page, bin, element, elementIndex));
                        });
                    }
                });
            }
        });
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
    extractSearchableData(page, bin, element, elementIndex) {
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
            childrenText: (element.children || []).map(child => child.text || '').join(' '),
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
    }
    
    /**
     * Update index for a single element
     */
    updateElement(pageId, binId, elementIndex) {
        const appState = this._getAppState();
        const page = appState.pages.find(p => p.id === pageId);
        if (!page) return;
        
        const bin = page.bins?.find(b => b.id === binId);
        if (!bin) return;
        
        const element = bin.elements?.[elementIndex];
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


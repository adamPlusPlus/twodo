// RelationshipManager - Manages element relationships
import { DataUtils } from '../utils/data.js';
import { eventBus } from '../core/EventBus.js';

export class RelationshipManager {
    constructor(app) {
        this.app = app;
        this.relationships = new Map(); // elementId -> Set of relationship objects
    }
    
    /**
     * Add a relationship between two elements
     * @param {string} fromElementId - Source element ID (pageId:binId:elementIndex)
     * @param {string} toElementId - Target element ID
     * @param {string} type - Relationship type ('blocks', 'dependsOn', 'relatedTo')
     * @returns {boolean} - Success status
     */
    addRelationship(fromElementId, toElementId, type) {
        if (!this.isValidRelationshipType(type)) {
            console.error(`Invalid relationship type: ${type}`);
            return false;
        }
        
        if (fromElementId === toElementId) {
            console.error('Cannot create relationship to self');
            return false;
        }
        
        // Check for circular dependencies
        if (type === 'dependsOn' || type === 'blocks') {
            if (this.wouldCreateCycle(fromElementId, toElementId, type)) {
                console.error('Would create circular dependency');
                return false;
            }
        }
        
        // Get or create relationship set for source element
        if (!this.relationships.has(fromElementId)) {
            this.relationships.set(fromElementId, new Set());
        }
        
        const relationship = {
            to: toElementId,
            type: type,
            createdAt: Date.now()
        };
        
        this.relationships.get(fromElementId).add(relationship);
        
        // Update element data
        this.updateElementRelationships(fromElementId);
        
        // Emit event
        eventBus.emit('relationship:added', {
            from: fromElementId,
            to: toElementId,
            type: type
        });
        
        return true;
    }
    
    /**
     * Remove a relationship
     * @param {string} fromElementId - Source element ID
     * @param {string} toElementId - Target element ID
     * @param {string} type - Relationship type
     * @returns {boolean} - Success status
     */
    removeRelationship(fromElementId, toElementId, type) {
        const relSet = this.relationships.get(fromElementId);
        if (!relSet) return false;
        
        for (const rel of relSet) {
            if (rel.to === toElementId && rel.type === type) {
                relSet.delete(rel);
                this.updateElementRelationships(fromElementId);
                
                eventBus.emit('relationship:removed', {
                    from: fromElementId,
                    to: toElementId,
                    type: type
                });
                
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Get all relationships for an element
     * @param {string} elementId - Element ID
     * @returns {Array<Object>} - Array of relationships
     */
    getRelationships(elementId) {
        const relSet = this.relationships.get(elementId);
        return relSet ? Array.from(relSet) : [];
    }
    
    /**
     * Get relationships by type
     * @param {string} elementId - Element ID
     * @param {string} type - Relationship type
     * @returns {Array<Object>} - Array of relationships
     */
    getRelationshipsByType(elementId, type) {
        return this.getRelationships(elementId).filter(rel => rel.type === type);
    }
    
    /**
     * Get all elements that relate to this element (inverse relationships)
     * @param {string} elementId - Element ID
     * @returns {Array<Object>} - Array of {from, type}
     */
    getInverseRelationships(elementId) {
        const inverse = [];
        
        for (const [fromId, relSet] of this.relationships.entries()) {
            for (const rel of relSet) {
                if (rel.to === elementId) {
                    inverse.push({
                        from: fromId,
                        type: rel.type
                    });
                }
            }
        }
        
        return inverse;
    }
    
    /**
     * Check if relationship type is valid
     * @param {string} type - Relationship type
     * @returns {boolean}
     */
    isValidRelationshipType(type) {
        return ['blocks', 'dependsOn', 'relatedTo'].includes(type);
    }
    
    /**
     * Check if adding relationship would create a cycle
     * @param {string} fromElementId - Source element ID
     * @param {string} toElementId - Target element ID
     * @param {string} type - Relationship type
     * @returns {boolean}
     */
    wouldCreateCycle(fromElementId, toElementId, type) {
        // For dependsOn and blocks, check if target depends on source
        if (type === 'dependsOn') {
            return this.hasPath(toElementId, fromElementId, 'dependsOn');
        } else if (type === 'blocks') {
            return this.hasPath(toElementId, fromElementId, 'blocks');
        }
        
        return false;
    }
    
    /**
     * Check if there's a path from source to target
     * @param {string} fromId - Source element ID
     * @param {string} toId - Target element ID
     * @param {string} type - Relationship type to follow
     * @returns {boolean}
     */
    hasPath(fromId, toId, type) {
        if (fromId === toId) return true;
        
        const visited = new Set();
        const queue = [fromId];
        visited.add(fromId);
        
        while (queue.length > 0) {
            const current = queue.shift();
            const relationships = this.getRelationshipsByType(current, type);
            
            for (const rel of relationships) {
                if (rel.to === toId) {
                    return true;
                }
                
                if (!visited.has(rel.to)) {
                    visited.add(rel.to);
                    queue.push(rel.to);
                }
            }
        }
        
        return false;
    }
    
    /**
     * Update element data with relationships
     * @param {string} elementId - Element ID
     */
    updateElementRelationships(elementId) {
        const [pageId, binId, elementIndex] = elementId.split(':');
        const page = this.app.pages.find(p => p.id === pageId);
        if (!page) return;
        
        const bin = page.bins?.find(b => b.id === binId);
        if (!bin || !bin.elements) return;
        
        const element = bin.elements[parseInt(elementIndex)];
        if (!element) return;
        
        // Initialize relationships object
        if (!element.relationships) {
            element.relationships = {
                blocks: [],
                dependsOn: [],
                relatedTo: []
            };
        }
        
        // Get all relationships
        const relationships = this.getRelationships(elementId);
        
        // Group by type
        element.relationships.blocks = relationships
            .filter(rel => rel.type === 'blocks')
            .map(rel => rel.to);
        
        element.relationships.dependsOn = relationships
            .filter(rel => rel.type === 'dependsOn')
            .map(rel => rel.to);
        
        element.relationships.relatedTo = relationships
            .filter(rel => rel.type === 'relatedTo')
            .map(rel => rel.to);
        
        // Save data
        this.app.dataManager.saveData();
    }
    
    /**
     * Load relationships from element data
     * @param {string} elementId - Element ID
     * @param {Object} element - Element data
     */
    loadRelationships(elementId, element) {
        if (!element.relationships) return;
        
        const relSet = new Set();
        
        // Load blocks
        if (Array.isArray(element.relationships.blocks)) {
            element.relationships.blocks.forEach(toId => {
                relSet.add({
                    to: toId,
                    type: 'blocks',
                    createdAt: Date.now()
                });
            });
        }
        
        // Load dependsOn
        if (Array.isArray(element.relationships.dependsOn)) {
            element.relationships.dependsOn.forEach(toId => {
                relSet.add({
                    to: toId,
                    type: 'dependsOn',
                    createdAt: Date.now()
                });
            });
        }
        
        // Load relatedTo
        if (Array.isArray(element.relationships.relatedTo)) {
            element.relationships.relatedTo.forEach(toId => {
                relSet.add({
                    to: toId,
                    type: 'relatedTo',
                    createdAt: Date.now()
                });
            });
        }
        
        if (relSet.size > 0) {
            this.relationships.set(elementId, relSet);
        }
    }
    
    /**
     * Get element ID from page, bin, and index
     * @param {string} pageId - Page ID
     * @param {string} binId - Bin ID
     * @param {number} elementIndex - Element index
     * @returns {string}
     */
    getElementId(pageId, binId, elementIndex) {
        return `${pageId}:${binId}:${elementIndex}`;
    }
    
    /**
     * Parse element ID into components
     * @param {string} elementId - Element ID
     * @returns {Object} - {pageId, binId, elementIndex}
     */
    parseElementId(elementId) {
        const parts = elementId.split(':');
        return {
            pageId: parts[0],
            binId: parts[1],
            elementIndex: parseInt(parts[2])
        };
    }
    
    /**
     * Get element by ID
     * @param {string} elementId - Element ID
     * @returns {Object|null} - Element data and context
     */
    getElement(elementId) {
        const { pageId, binId, elementIndex } = this.parseElementId(elementId);
        const page = this.app.pages.find(p => p.id === pageId);
        if (!page) return null;
        
        const bin = page.bins?.find(b => b.id === binId);
        if (!bin || !bin.elements) return null;
        
        const element = bin.elements[elementIndex];
        if (!element) return null;
        
        return {
            element,
            pageId,
            binId,
            elementIndex,
            page,
            bin
        };
    }
    
    /**
     * Initialize relationships from all elements
     */
    initializeFromData() {
        this.relationships.clear();
        
        this.app.pages.forEach(page => {
            if (page.bins) {
                page.bins.forEach(bin => {
                    if (bin.elements) {
                        bin.elements.forEach((element, index) => {
                            const elementId = this.getElementId(page.id, bin.id, index);
                            this.loadRelationships(elementId, element);
                        });
                    }
                });
            }
        });
    }
}


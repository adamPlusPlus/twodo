// RelationshipManager - Manages element relationships
import { DataUtils } from '../utils/data.js';
import { eventBus } from '../core/EventBus.js';
import { getService, SERVICES, hasService } from '../core/AppServices.js';

export class RelationshipManager {
    constructor() {
        this.relationships = new Map(); // elementId -> Set of relationship objects
    }
    
    /**
     * Get AppState service
     */
    _getAppState() {
        return getService(SERVICES.APP_STATE);
    }
    
    /**
     * Get DataManager service
     */
    _getDataManager() {
        return getService(SERVICES.DATA_MANAGER);
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
        
        // Check for circular dependencies (only for non-cyclic relationship types)
        if (!this.allowsCycles(type)) {
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
     * Get all available relationship types
     * @returns {Array<Object>} - Array of {type, label, description, directional, cyclic}
     */
    getRelationshipTypes() {
        return [
            // Dependency relationships (directional, non-cyclic)
            { type: 'dependsOn', label: 'Depends On', description: 'This element depends on the target', directional: true, cyclic: false },
            { type: 'blocks', label: 'Blocks', description: 'This element blocks the target', directional: true, cyclic: false },
            { type: 'requiredBy', label: 'Required By', description: 'This element is required by the target', directional: true, cyclic: false },
            { type: 'enables', label: 'Enables', description: 'This element enables the target', directional: true, cyclic: false },
            { type: 'prevents', label: 'Prevents', description: 'This element prevents the target', directional: true, cyclic: false },
            
            // Temporal relationships (directional, can be cyclic)
            { type: 'precedes', label: 'Precedes', description: 'This element comes before the target', directional: true, cyclic: true },
            { type: 'follows', label: 'Follows', description: 'This element comes after the target', directional: true, cyclic: true },
            { type: 'causes', label: 'Causes', description: 'This element causes the target', directional: true, cyclic: false },
            { type: 'triggers', label: 'Triggers', description: 'This element triggers the target', directional: true, cyclic: false },
            
            // Hierarchical relationships (directional, can be cyclic)
            { type: 'contains', label: 'Contains', description: 'This element contains the target', directional: true, cyclic: false },
            { type: 'partOf', label: 'Part Of', description: 'This element is part of the target', directional: true, cyclic: false },
            { type: 'parentOf', label: 'Parent Of', description: 'This element is parent of the target', directional: true, cyclic: false },
            { type: 'childOf', label: 'Child Of', description: 'This element is child of the target', directional: true, cyclic: false },
            
            // Reference relationships (directional, can be cyclic)
            { type: 'references', label: 'References', description: 'This element references the target', directional: true, cyclic: true },
            { type: 'referencedBy', label: 'Referenced By', description: 'This element is referenced by the target', directional: true, cyclic: true },
            { type: 'linksTo', label: 'Links To', description: 'This element links to the target', directional: true, cyclic: true },
            { type: 'linkedFrom', label: 'Linked From', description: 'This element is linked from the target', directional: true, cyclic: true },
            
            // Similarity relationships (bidirectional, can be cyclic)
            { type: 'relatedTo', label: 'Related To', description: 'This element is related to the target', directional: false, cyclic: true },
            { type: 'similarTo', label: 'Similar To', description: 'This element is similar to the target', directional: false, cyclic: true },
            { type: 'oppositeTo', label: 'Opposite To', description: 'This element is opposite to the target', directional: false, cyclic: true },
            { type: 'conflictsWith', label: 'Conflicts With', description: 'This element conflicts with the target', directional: false, cyclic: true },
            { type: 'complements', label: 'Complements', description: 'This element complements the target', directional: false, cyclic: true },
            
            // Flow relationships (directional, can be cyclic)
            { type: 'leadsTo', label: 'Leads To', description: 'This element leads to the target', directional: true, cyclic: true },
            { type: 'flowsInto', label: 'Flows Into', description: 'This element flows into the target', directional: true, cyclic: true },
            { type: 'branchesTo', label: 'Branches To', description: 'This element branches to the target', directional: true, cyclic: true },
            { type: 'mergesWith', label: 'Merges With', description: 'This element merges with the target', directional: true, cyclic: true },
            
            // Logical relationships (directional, can be cyclic)
            { type: 'implies', label: 'Implies', description: 'This element implies the target', directional: true, cyclic: false },
            { type: 'contradicts', label: 'Contradicts', description: 'This element contradicts the target', directional: false, cyclic: true },
            { type: 'supports', label: 'Supports', description: 'This element supports the target', directional: true, cyclic: false },
            { type: 'opposes', label: 'Opposes', description: 'This element opposes the target', directional: false, cyclic: true }
        ];
    }
    
    /**
     * Get relationship type metadata
     * @param {string} type - Relationship type
     * @returns {Object|null} - Relationship type metadata
     */
    getRelationshipTypeMetadata(type) {
        const types = this.getRelationshipTypes();
        return types.find(t => t.type === type) || null;
    }
    
    /**
     * Check if relationship type is valid
     * @param {string} type - Relationship type
     * @returns {boolean}
     */
    isValidRelationshipType(type) {
        return this.getRelationshipTypes().some(t => t.type === type);
    }
    
    /**
     * Check if relationship type allows cycles
     * @param {string} type - Relationship type
     * @returns {boolean}
     */
    allowsCycles(type) {
        const metadata = this.getRelationshipTypeMetadata(type);
        return metadata ? metadata.cyclic : false;
    }
    
    /**
     * Check if relationship type is directional
     * @param {string} type - Relationship type
     * @returns {boolean}
     */
    isDirectional(type) {
        const metadata = this.getRelationshipTypeMetadata(type);
        return metadata ? metadata.directional : true;
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
        const appState = this._getAppState();
        const page = appState.documents.find(p => p.id === pageId);
        if (!page) return;
        
        const bin = page.groups?.find(b => b.id === binId);
        if (!bin) return;
        const items = bin.items || [];
        bin.items = items;
        if (!items) return;
        
        const element = items[parseInt(elementIndex)];
        if (!element) return;
        
        // Initialize relationships object with all relationship types
        if (!element.relationships) {
            element.relationships = {};
            this.getRelationshipTypes().forEach(relType => {
                element.relationships[relType.type] = [];
            });
        }
        
        // Get all relationships
        const relationships = this.getRelationships(elementId);
        
        // Group by type - dynamically create arrays for all relationship types
        const allTypes = this.getRelationshipTypes().map(t => t.type);
        allTypes.forEach(relType => {
            if (!element.relationships[relType]) {
                element.relationships[relType] = [];
            }
            element.relationships[relType] = relationships
                .filter(rel => rel.type === relType)
                .map(rel => rel.to);
        });
        
        // Keep backward compatibility with old structure
        if (!element.relationships.blocks) element.relationships.blocks = [];
        if (!element.relationships.dependsOn) element.relationships.dependsOn = [];
        if (!element.relationships.relatedTo) element.relationships.relatedTo = [];
        
        // Save data
        const dataManager = this._getDataManager();
        if (dataManager) {
            dataManager.saveData();
        }
    }
    
    /**
     * Load relationships from element data
     * @param {string} elementId - Element ID
     * @param {Object} element - Element data
     */
    loadRelationships(elementId, element) {
        if (!element.relationships) return;
        
        const relSet = new Set();
        
        // Load all relationship types dynamically
        if (element.relationships && typeof element.relationships === 'object') {
            Object.keys(element.relationships).forEach(relType => {
                if (this.isValidRelationshipType(relType) && Array.isArray(element.relationships[relType])) {
                    element.relationships[relType].forEach(toId => {
                        relSet.add({
                            to: toId,
                            type: relType,
                            createdAt: Date.now()
                        });
                    });
                }
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
        const appState = this._getAppState();
        const page = appState.documents.find(p => p.id === pageId);
        if (!page) return null;
        
        const bin = page.groups?.find(b => b.id === binId);
        if (!bin) return null;
        const items = bin.items || [];
        bin.items = items;
        if (!items) return null;
        
        const element = items[elementIndex];
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
        
        const appState = this._getAppState();
        appState.documents.forEach(page => {
            if (page.groups) {
                page.groups.forEach(bin => {
                    const items = bin.items || [];
                    bin.items = items;
                    items.forEach((element, index) => {
                            const elementId = this.getElementId(page.id, bin.id, index);
                            this.loadRelationships(elementId, element);
                        });
                });
            }
        });
    }
}


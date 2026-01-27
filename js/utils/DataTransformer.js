// DataTransformer.js - Data transformation utilities
// Extracted from DataManager.js for reusability and maintainability

import { ItemHierarchy } from './ItemHierarchy.js';

/**
 * DataTransformer - Functions for transforming and normalizing data
 */
export class DataTransformer {
    constructor() {
        this._generateItemId = () => {
            return `item-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        };
    }
    
    /**
     * Generate a unique item ID
     * @returns {string} Item ID
     */
    generateItemId() {
        return this._generateItemId();
    }
    
    /**
     * Ensure document has default values
     * @param {Object} document - Document object
     * @returns {Object} Document with defaults
     */
    ensureDocumentDefaults(document) {
        const config = document.config && typeof document.config === 'object' ? document.config : {};
        const groupMode = document.groupMode || config.groupMode || 'manual';
        return {
            ...document,
            groups: Array.isArray(document.groups) ? document.groups : [],
            config: { ...config, groupMode },
            groupMode
        };
    }
    
    /**
     * Ensure group has default values
     * @param {Object} group - Group object
     * @returns {Object} Group with defaults
     */
    ensureGroupDefaults(group) {
        return {
            ...group,
            items: Array.isArray(group.items) ? group.items : [],
            level: typeof group.level === 'number' ? group.level : 0,
            parentGroupId: group.parentGroupId ?? null
        };
    }
    
    /**
     * Migrate items to ID-based links (flatten nested structure)
     * @param {Array} items - Items array
     * @returns {Array} Flattened items array
     */
    migrateItemsToIdLinks(items) {
        const flatItems = [];
        const seen = new Set();

        const addItem = (item, parentId = null) => {
            if (!item || typeof item !== 'object') {
                return null;
            }

            const itemId = item.id || this.generateItemId();
            item.id = itemId;
            if (parentId !== null) {
                item.parentId = parentId;
            } else if (!item.parentId) {
                item.parentId = null;
            }

            const existingChildIds = Array.isArray(item.childIds) ? [...item.childIds] : [];
            const children = Array.isArray(item.children) ? item.children : [];

            if (Array.isArray(item.subtasks) && item.subtasks.length > 0) {
                item.subtasks.forEach(subtask => {
                    const childItem = {
                        id: this.generateItemId(),
                        type: 'task',
                        text: subtask.text || 'Subtask',
                        completed: subtask.completed || false,
                        timeAllocated: subtask.timeAllocated || '',
                        repeats: subtask.repeats !== undefined ? subtask.repeats : true,
                        funModifier: subtask.funModifier || '',
                        parentId: itemId,
                        childIds: [],
                        config: {}
                    };
                    children.push(childItem);
                });
                delete item.subtasks;
            }

            if (!seen.has(itemId)) {
                flatItems.push(item);
                seen.add(itemId);
            }

            item.childIds = [];
            children.forEach(child => {
                const childId = addItem(child, itemId);
                if (childId) {
                    item.childIds.push(childId);
                }
            });

            if (item.childIds.length === 0 && existingChildIds.length > 0) {
                item.childIds = existingChildIds;
            }

            delete item.children;
            return itemId;
        };

        (items || []).forEach(item => addItem(item, null));

        const itemIndex = ItemHierarchy.buildItemIndex(flatItems);
        flatItems.forEach(item => {
            if (item.parentId && itemIndex[item.parentId]) {
                const parent = itemIndex[item.parentId];
                if (!Array.isArray(parent.childIds)) {
                    parent.childIds = [];
                }
                if (!parent.childIds.includes(item.id)) {
                    parent.childIds.push(item.id);
                }
            }
        });

        flatItems.forEach(item => {
            const childIds = Array.isArray(item.childIds) ? item.childIds : [];
            item.childIds = childIds.filter(childId => itemIndex[childId]);
            if (item.parentId && !itemIndex[item.parentId]) {
                item.parentId = null;
            }
        });

        return flatItems;
    }
    
    /**
     * Migrate documents to ID-based links
     * @param {Array} documents - Documents array
     * @returns {Array} Migrated documents array
     */
    migrateDocumentsToIdLinks(documents) {
        return documents.map(rawDocument => {
            const document = this.ensureDocumentDefaults(rawDocument);
            let groups = document.groups;

            if ((!groups || groups.length === 0) && Array.isArray(document.items)) {
                groups = [{
                    id: 'group-0',
                    title: 'Group 1',
                    items: document.items,
                    level: 0,
                    parentGroupId: null
                }];
                delete document.items;
            }

            const normalizedGroups = (groups || []).map(group => {
                const normalizedGroup = this.ensureGroupDefaults(group);
                normalizedGroup.items = this.migrateItemsToIdLinks(normalizedGroup.items);
                return normalizedGroup;
            });

            return {
                ...document,
                groups: normalizedGroups
            };
        });
    }
    
    /**
     * Normalize data model
     * @param {any} rawData - Raw data object
     * @returns {Object} Normalized data model
     */
    normalizeDataModel(rawData) {
        if (!rawData || typeof rawData !== 'object') {
            return { documents: [] };
        }

        const normalized = { ...rawData };
        normalized.documents = normalized.documents || [];
        normalized.documentStates = normalized.documentStates || {};
        normalized.groupStates = normalized.groupStates || {};
        normalized.documents = this.migrateDocumentsToIdLinks(normalized.documents);
        return normalized;
    }
    
    /**
     * Normalize single document
     * @param {Object} document - Document object
     * @returns {Object} Normalized document
     */
    normalizeDocument(document) {
        return this.ensureDocumentDefaults(document);
    }
    
    /**
     * Normalize single group
     * @param {Object} group - Group object
     * @returns {Object} Normalized group
     */
    normalizeGroup(group) {
        return this.ensureGroupDefaults(group);
    }
    
    /**
     * Transform legacy data format
     * @param {Object} legacyData - Legacy data object
     * @returns {Object} Transformed data
     */
    transformLegacyData(legacyData) {
        if (!legacyData || typeof legacyData !== 'object') {
            return { documents: [] };
        }
        
        // Handle old format with items at document level
        if (legacyData.documents) {
            return this.normalizeDataModel(legacyData);
        }
        
        // Handle very old format
        if (Array.isArray(legacyData)) {
            return {
                documents: legacyData.map(doc => this.normalizeDocument(doc))
            };
        }
        
        return this.normalizeDataModel(legacyData);
    }
}

// Export singleton instance
export const dataTransformer = new DataTransformer();

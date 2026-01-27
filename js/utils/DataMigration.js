// DataMigration.js - Data migration utilities
// Extracted from DataManager.js for reusability and maintainability

import { dataTransformer } from './DataTransformer.js';

/**
 * DataMigration - Functions for migrating data between versions
 */
export const DataMigration = {
    /**
     * Current data version
     */
    CURRENT_VERSION: '2.0',
    
    /**
     * Detect data version from data structure
     * @param {Object} data - Data object
     * @returns {string} Detected version
     */
    detectDataVersion(data) {
        if (!data || typeof data !== 'object') {
            return '1.0'; // Assume oldest version
        }
        
        // Check for version field
        if (data.version) {
            return data.version;
        }
        
        // Check structure to infer version
        if (data.documents && Array.isArray(data.documents)) {
            // Check if documents have groups (v2.0+)
            const hasGroups = data.documents.some(doc => doc.groups && Array.isArray(doc.groups));
            if (hasGroups) {
                return '2.0';
            }
            
            // Check if documents have items directly (v1.0)
            const hasItems = data.documents.some(doc => doc.items && Array.isArray(doc.items));
            if (hasItems) {
                return '1.0';
            }
        }
        
        // Default to current version if structure is modern
        return DataMigration.CURRENT_VERSION;
    },
    
    /**
     * Migrate data model from one version to another
     * @param {Object} data - Data object
     * @param {string} fromVersion - Source version
     * @param {string} toVersion - Target version
     * @returns {Object} Migrated data
     */
    migrateDataModel(data, fromVersion, toVersion) {
        if (!data || typeof data !== 'object') {
            return { documents: [] };
        }
        
        // If already at target version, return as-is
        if (fromVersion === toVersion) {
            return data;
        }
        
        let migrated = { ...data };
        
        // Migrate from 1.0 to 2.0
        if (fromVersion === '1.0' && toVersion === '2.0') {
            migrated = DataMigration.migrateDocumentsStructure(migrated);
            migrated.version = '2.0';
        }
        
        // Future migrations can be added here
        // if (fromVersion === '2.0' && toVersion === '3.0') { ... }
        
        return migrated;
    },
    
    /**
     * Migrate documents structure (v1.0 to v2.0)
     * @param {Object} data - Data object
     * @returns {Object} Migrated data
     */
    migrateDocumentsStructure(data) {
        if (!data || !data.documents) {
            return data;
        }
        
        // Use DataTransformer to migrate documents
        const migrated = {
            ...data,
            documents: dataTransformer.migrateDocumentsToIdLinks(data.documents)
        };
        
        return migrated;
    },
    
    /**
     * Migrate item structure
     * @param {Object} item - Item object
     * @returns {Object} Migrated item
     */
    migrateItemStructure(item) {
        if (!item || typeof item !== 'object') {
            return item;
        }
        
        const migrated = { ...item };
        
        // Ensure item has ID
        if (!migrated.id) {
            migrated.id = dataTransformer.generateItemId();
        }
        
        // Migrate subtasks to children
        if (Array.isArray(migrated.subtasks) && migrated.subtasks.length > 0) {
            if (!migrated.childIds) {
                migrated.childIds = [];
            }
            
            // Convert subtasks to child items
            migrated.subtasks.forEach(subtask => {
                const childItem = {
                    id: dataTransformer.generateItemId(),
                    type: 'task',
                    text: subtask.text || 'Subtask',
                    completed: subtask.completed || false,
                    timeAllocated: subtask.timeAllocated || '',
                    repeats: subtask.repeats !== undefined ? subtask.repeats : true,
                    funModifier: subtask.funModifier || '',
                    parentId: migrated.id,
                    childIds: [],
                    config: {}
                };
                // Note: Child items would need to be added to the items array separately
                // This is handled by migrateItemsToIdLinks
            });
            
            delete migrated.subtasks;
        }
        
        // Migrate children array to childIds
        if (Array.isArray(migrated.children) && migrated.children.length > 0) {
            if (!migrated.childIds) {
                migrated.childIds = [];
            }
            // Children will be processed by migrateItemsToIdLinks
            // Just ensure childIds exists
        }
        
        return migrated;
    },
    
    /**
     * Apply migration to data
     * @param {Object} data - Data object
     * @param {string} version - Target version (optional, defaults to current)
     * @returns {Object} Migrated data
     */
    applyMigration(data, version = null) {
        const targetVersion = version || DataMigration.CURRENT_VERSION;
        const detectedVersion = DataMigration.detectDataVersion(data);
        
        if (detectedVersion === targetVersion) {
            return data;
        }
        
        return DataMigration.migrateDataModel(data, detectedVersion, targetVersion);
    },
    
    /**
     * Migrate subtasks to children (legacy method)
     * @param {Object} data - Data object
     * @returns {Object} Migrated data
     */
    migrateSubtasksToChildren(data) {
        if (!data) {
            return data;
        }
        
        return {
            ...data,
            documents: dataTransformer.migrateDocumentsToIdLinks(data.documents || [])
        };
    }
};

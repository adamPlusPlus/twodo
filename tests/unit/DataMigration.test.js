// tests/unit/DataMigration.test.js
import { describe, it, expect } from 'vitest';
import { DataMigration } from '../../js/utils/DataMigration.js';

describe('DataMigration', () => {
    describe('detectDataVersion', () => {
        it('should detect version 2.0 from structure', () => {
            const data = {
                documents: [
                    { id: 'doc-1', groups: [] }
                ]
            };
            
            expect(DataMigration.detectDataVersion(data)).toBe('2.0');
        });
        
        it('should detect version 1.0 from structure', () => {
            const data = {
                documents: [
                    { id: 'doc-1', items: [] }
                ]
            };
            
            expect(DataMigration.detectDataVersion(data)).toBe('1.0');
        });
        
        it('should use version field if present', () => {
            const data = { version: '3.0', documents: [] };
            expect(DataMigration.detectDataVersion(data)).toBe('3.0');
        });
    });
    
    describe('migrateDataModel', () => {
        it('should migrate from 1.0 to 2.0', () => {
            const data = {
                version: '1.0',
                documents: [
                    { id: 'doc-1', items: [{ id: 'item-1', text: 'Test' }] }
                ]
            };
            
            const migrated = DataMigration.migrateDataModel(data, '1.0', '2.0');
            
            expect(migrated.version).toBe('2.0');
            expect(migrated.documents[0].groups).toBeDefined();
        });
        
        it('should return data unchanged if versions match', () => {
            const data = { version: '2.0', documents: [] };
            const migrated = DataMigration.migrateDataModel(data, '2.0', '2.0');
            
            expect(migrated).toBe(data);
        });
    });
    
    describe('applyMigration', () => {
        it('should apply migration to current version', () => {
            const data = {
                version: '1.0',
                documents: [{ id: 'doc-1', items: [] }]
            };
            
            const migrated = DataMigration.applyMigration(data);
            
            expect(migrated.documents[0].groups).toBeDefined();
        });
    });
    
    describe('migrateSubtasksToChildren', () => {
        it('should migrate subtasks to children', () => {
            const data = {
                documents: [
                    {
                        id: 'doc-1',
                        groups: [
                            {
                                id: 'group-1',
                                items: [
                                    { id: 'item-1', subtasks: [{ text: 'Subtask' }] }
                                ]
                            }
                        ]
                    }
                ]
            };
            
            const migrated = DataMigration.migrateSubtasksToChildren(data);
            
            expect(migrated).toBeDefined();
            expect(migrated.documents).toBeDefined();
        });
    });
});

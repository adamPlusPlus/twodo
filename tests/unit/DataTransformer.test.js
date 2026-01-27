// tests/unit/DataTransformer.test.js
import { describe, it, expect } from 'vitest';
import { dataTransformer } from '../../js/utils/DataTransformer.js';

describe('DataTransformer', () => {
    describe('generateItemId', () => {
        it('should generate unique item IDs', () => {
            const id1 = dataTransformer.generateItemId();
            const id2 = dataTransformer.generateItemId();
            
            expect(id1).toBeDefined();
            expect(id2).toBeDefined();
            expect(id1).not.toBe(id2);
        });
    });
    
    describe('ensureDocumentDefaults', () => {
        it('should add default values to document', () => {
            const doc = { id: 'doc-1' };
            const normalized = dataTransformer.ensureDocumentDefaults(doc);
            
            expect(Array.isArray(normalized.groups)).toBe(true);
            expect(normalized.groupMode).toBeDefined();
        });
    });
    
    describe('ensureGroupDefaults', () => {
        it('should add default values to group', () => {
            const group = { id: 'group-1' };
            const normalized = dataTransformer.ensureGroupDefaults(group);
            
            expect(Array.isArray(normalized.items)).toBe(true);
            expect(normalized.level).toBe(0);
        });
    });
    
    describe('normalizeDataModel', () => {
        it('should normalize data model', () => {
            const rawData = {
                documents: [
                    { id: 'doc-1', items: [{ id: 'item-1', text: 'Test' }] }
                ]
            };
            
            const normalized = dataTransformer.normalizeDataModel(rawData);
            
            expect(normalized.documents).toBeDefined();
            expect(Array.isArray(normalized.documents)).toBe(true);
            expect(normalized.documents[0].groups).toBeDefined();
        });
        
        it('should handle null/undefined data', () => {
            expect(dataTransformer.normalizeDataModel(null).documents).toEqual([]);
            expect(dataTransformer.normalizeDataModel(undefined).documents).toEqual([]);
        });
    });
    
    describe('migrateItemsToIdLinks', () => {
        it('should migrate items with children to ID links', () => {
            const items = [
                {
                    id: 'item-1',
                    text: 'Parent',
                    children: [
                        { id: 'item-2', text: 'Child' }
                    ]
                }
            ];
            
            const migrated = dataTransformer.migrateItemsToIdLinks(items);
            
            expect(migrated.length).toBeGreaterThan(0);
            expect(migrated[0].childIds).toBeDefined();
            expect(Array.isArray(migrated[0].childIds)).toBe(true);
        });
    });
    
    describe('migrateDocumentsToIdLinks', () => {
        it('should migrate documents structure', () => {
            const documents = [
                {
                    id: 'doc-1',
                    items: [{ id: 'item-1', text: 'Test' }]
                }
            ];
            
            const migrated = dataTransformer.migrateDocumentsToIdLinks(documents);
            
            expect(migrated[0].groups).toBeDefined();
            expect(Array.isArray(migrated[0].groups)).toBe(true);
            expect(migrated[0].items).toBeUndefined();
        });
    });
});

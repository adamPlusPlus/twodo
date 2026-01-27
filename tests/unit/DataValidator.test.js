// tests/unit/DataValidator.test.js
import { describe, it, expect } from 'vitest';
import { DataValidator } from '../../js/utils/DataValidator.js';

describe('DataValidator', () => {
    describe('validateDocument', () => {
        it('should validate correct document', () => {
            const doc = { id: 'doc-1', groups: [] };
            expect(DataValidator.validateDocument(doc)).toBe(true);
        });
        
        it('should reject document without id', () => {
            const doc = { groups: [] };
            expect(DataValidator.validateDocument(doc)).toBe(false);
        });
        
        it('should reject document with non-array groups', () => {
            const doc = { id: 'doc-1', groups: 'invalid' };
            expect(DataValidator.validateDocument(doc)).toBe(false);
        });
    });
    
    describe('validateGroup', () => {
        it('should validate correct group', () => {
            const group = { id: 'group-1', items: [] };
            expect(DataValidator.validateGroup(group)).toBe(true);
        });
        
        it('should reject group without id', () => {
            const group = { items: [] };
            expect(DataValidator.validateGroup(group)).toBe(false);
        });
    });
    
    describe('validateItem', () => {
        it('should validate correct item', () => {
            const item = { id: 'item-1', type: 'task', text: 'Test' };
            expect(DataValidator.validateItem(item)).toBe(true);
        });
        
        it('should reject item without id', () => {
            const item = { type: 'task' };
            expect(DataValidator.validateItem(item)).toBe(false);
        });
    });
    
    describe('validateDataModel', () => {
        it('should validate correct data model', () => {
            const data = {
                documents: [
                    {
                        id: 'doc-1',
                        groups: [
                            {
                                id: 'group-1',
                                items: [
                                    { id: 'item-1', type: 'task' }
                                ]
                            }
                        ]
                    }
                ]
            };
            
            const result = DataValidator.validateDataModel(data);
            expect(result.valid).toBe(true);
            expect(result.errors.length).toBe(0);
        });
        
        it('should return errors for invalid data', () => {
            const data = {
                documents: [
                    { id: 'doc-1', groups: 'invalid' }
                ]
            };
            
            const result = DataValidator.validateDataModel(data);
            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
        });
    });
    
    describe('sanitizeData', () => {
        it('should sanitize data by deep cloning', () => {
            const data = { a: 1, b: { c: 2 } };
            const sanitized = DataValidator.sanitizeData(data);
            
            expect(sanitized).not.toBe(data);
            expect(sanitized.a).toBe(data.a);
            expect(sanitized.b).not.toBe(data.b);
        });
        
        it('should return null for invalid data', () => {
            const circular = { a: 1 };
            circular.self = circular;
            
            const sanitized = DataValidator.sanitizeData(circular);
            // JSON.stringify will fail on circular refs, so should return null
            expect(sanitized).toBeNull();
        });
    });
});

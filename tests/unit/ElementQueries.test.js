// tests/unit/ElementQueries.test.js
import { describe, it, expect } from 'vitest';
import { ElementQueries } from '../../js/utils/ElementQueries.js';

describe('ElementQueries', () => {
    const mockAppState = {
        documents: [
            {
                id: 'page-1',
                title: 'Page 1',
                groups: [
                    {
                        id: 'group-1',
                        items: [
                            { id: 'item-1', text: 'Item 1' },
                            { id: 'item-2', text: 'Item 2' }
                        ]
                    }
                ]
            }
        ]
    };
    
    describe('findDocument', () => {
        it('should find document by page ID', () => {
            const document = ElementQueries.findDocument(mockAppState, 'page-1');
            
            expect(document).toBeTruthy();
            expect(document.id).toBe('page-1');
            expect(document.title).toBe('Page 1');
        });
        
        it('should return null for non-existent page', () => {
            const document = ElementQueries.findDocument(mockAppState, 'page-999');
            
            expect(document).toBeNull();
        });
        
        it('should return null for invalid appState', () => {
            expect(ElementQueries.findDocument(null, 'page-1')).toBeNull();
            expect(ElementQueries.findDocument({}, 'page-1')).toBeNull();
        });
        
        it('should return null for missing pageId', () => {
            expect(ElementQueries.findDocument(mockAppState, null)).toBeNull();
            expect(ElementQueries.findDocument(mockAppState, '')).toBeNull();
        });
    });
    
    describe('findGroup', () => {
        const document = mockAppState.documents[0];
        
        it('should find group by bin ID', () => {
            const group = ElementQueries.findGroup(document, 'group-1');
            
            expect(group).toBeTruthy();
            expect(group.id).toBe('group-1');
            expect(Array.isArray(group.items)).toBe(true);
        });
        
        it('should return null for non-existent group', () => {
            const group = ElementQueries.findGroup(document, 'group-999');
            
            expect(group).toBeNull();
        });
        
        it('should return null for invalid document', () => {
            expect(ElementQueries.findGroup(null, 'group-1')).toBeNull();
            expect(ElementQueries.findGroup({}, 'group-1')).toBeNull();
        });
        
        it('should return null for missing binId', () => {
            expect(ElementQueries.findGroup(document, null)).toBeNull();
        });
    });
    
    describe('findElement', () => {
        const group = mockAppState.documents[0].groups[0];
        
        it('should find element by index', () => {
            const element = ElementQueries.findElement(group, 0);
            
            expect(element).toBeTruthy();
            expect(element.id).toBe('item-1');
            expect(element.text).toBe('Item 1');
        });
        
        it('should find element by string index', () => {
            const element = ElementQueries.findElement(group, '1');
            
            expect(element).toBeTruthy();
            expect(element.id).toBe('item-2');
        });
        
        it('should return null for out of range index', () => {
            expect(ElementQueries.findElement(group, 999)).toBeNull();
            expect(ElementQueries.findElement(group, -1)).toBeNull();
        });
        
        it('should return null for invalid group', () => {
            expect(ElementQueries.findElement(null, 0)).toBeNull();
            expect(ElementQueries.findElement({}, 0)).toBeNull();
        });
        
        it('should handle nested index strings', () => {
            const element = ElementQueries.findElement(group, '0-1');
            
            // Should return parent element (simplified implementation)
            expect(element).toBeTruthy();
        });
    });
    
    describe('parseNestedIndex', () => {
        it('should parse simple index', () => {
            const result = ElementQueries.parseNestedIndex(0);
            
            expect(result.elementIndex).toBe(0);
            expect(result.childIndex).toBeNull();
        });
        
        it('should parse nested index string', () => {
            const result = ElementQueries.parseNestedIndex('0-1');
            
            expect(result.elementIndex).toBe(0);
            expect(result.childIndex).toBe(1);
        });
        
        it('should parse string index', () => {
            const result = ElementQueries.parseNestedIndex('5');
            
            expect(result.elementIndex).toBe(5);
            expect(result.childIndex).toBeNull();
        });
    });
    
    describe('ensureItemsArray', () => {
        it('should return existing items array', () => {
            const group = { items: [{ id: 'item-1' }] };
            const items = ElementQueries.ensureItemsArray(group);
            
            expect(items).toBe(group.items);
            expect(items.length).toBe(1);
        });
        
        it('should create items array if missing', () => {
            const group = {};
            const items = ElementQueries.ensureItemsArray(group);
            
            expect(Array.isArray(items)).toBe(true);
            expect(items.length).toBe(0);
            expect(group.items).toBe(items);
        });
        
        it('should return empty array for null group', () => {
            const items = ElementQueries.ensureItemsArray(null);
            
            expect(Array.isArray(items)).toBe(true);
            expect(items.length).toBe(0);
        });
    });
});

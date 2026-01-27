// tests/unit/DragDropHelpers.test.js
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DragDropHelpers } from '../../js/utils/DragDropHelpers.js';

describe('DragDropHelpers', () => {
    beforeEach(() => {
        // Mock AppState service
        vi.spyOn(require('../../js/core/AppServices.js'), 'getService').mockImplementation((service) => {
            if (service === 'APP_STATE') {
                return {
                    documents: [
                        {
                            id: 'page-1',
                            groups: [
                                {
                                    id: 'bin-1',
                                    items: [
                                        { id: 'item-1', text: 'Item 1' }
                                    ]
                                }
                            ]
                        }
                    ]
                };
            }
            return null;
        });
    });
    
    describe('getDocument', () => {
        it('should get document by page ID', () => {
            const doc = DragDropHelpers.getDocument('page-1');
            expect(doc).toBeDefined();
            expect(doc.id).toBe('page-1');
        });
        
        it('should return null for non-existent page', () => {
            const doc = DragDropHelpers.getDocument('non-existent');
            expect(doc).toBeNull();
        });
    });
    
    describe('getGroup', () => {
        it('should get group by page and bin ID', () => {
            const group = DragDropHelpers.getGroup('page-1', 'bin-1');
            expect(group).toBeDefined();
            expect(group.id).toBe('bin-1');
        });
    });
    
    describe('getRootItems', () => {
        it('should get root items from items array', () => {
            const items = [
                { id: 'item-1', parentId: null },
                { id: 'item-2', parentId: 'item-1' }
            ];
            
            const rootItems = DragDropHelpers.getRootItems(items);
            
            expect(rootItems.length).toBe(1);
            expect(rootItems[0].id).toBe('item-1');
        });
    });
});

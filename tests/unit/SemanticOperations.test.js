// tests/unit/SemanticOperations.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import {
    SetTextOperation,
    SplitOperation,
    MergeOperation,
    MoveOperation,
    ReparentOperation,
    DeleteOperation,
    CreateOperation
} from '../../js/core/SemanticOperations.js';
import { createMockAppState, createMockItem, createMockGroup, createMockPage } from '../helpers/mockAppState.js';
import { setupMockServices } from '../helpers/mockServices.js';
import { registerService, SERVICES } from '../../js/core/AppServices.js';

describe('SemanticOperations', () => {
    let mockAppState;
    let mockServices;
    
    beforeEach(() => {
        mockAppState = createMockAppState({
            documents: [
                createMockPage({
                    id: 'page-1',
                    groups: [
                        createMockGroup({
                            id: 'group-1',
                            items: [
                                createMockItem({ id: 'item-1', text: 'Item 1' }),
                                createMockItem({ id: 'item-2', text: 'Item 2' }),
                                createMockItem({ id: 'item-3', text: 'Item 3' })
                            ]
                        })
                    ]
                })
            ]
        });
        
        mockServices = setupMockServices({ appState: mockAppState });
        registerService(SERVICES.APP_STATE, mockAppState);
    });
    
    describe('SetTextOperation', () => {
        it('should validate with text parameter', () => {
            const op = new SetTextOperation('item-1', 'New text', 'Old text');
            expect(op.validate()).toBe(true);
        });
        
        it('should fail validation without text', () => {
            const op = new SetTextOperation('item-1', undefined, 'Old text');
            expect(op.validate()).toBe(false);
        });
        
        it('should apply and update item text', () => {
            const op = new SetTextOperation('item-1', 'New text', 'Item 1');
            const result = op.apply();
            
            expect(result).toBeTruthy();
            expect(result.success).toBe(true);
            expect(result.newText).toBe('New text');
            
            const item = mockAppState.getItem('page-1', 'group-1', 'item-1');
            expect(item.text).toBe('New text');
        });
        
        it('should invert correctly', () => {
            const op = new SetTextOperation('item-1', 'New text', 'Old text');
            const inverse = op.invert();
            
            expect(inverse.itemId).toBe('item-1');
            expect(inverse.params.text).toBe('Old text');
            expect(inverse.params.oldText).toBe('New text');
        });
        
        it('should return null if item not found', () => {
            const op = new SetTextOperation('item-nonexistent', 'New text', 'Old text');
            const result = op.apply();
            expect(result).toBeNull();
        });
    });
    
    describe('SplitOperation', () => {
        it('should validate with caretPosition and newItemId', () => {
            const op = new SplitOperation('item-1', 5, 'item-new');
            expect(op.validate()).toBe(true);
        });
        
        it('should fail validation without caretPosition', () => {
            const op = new SplitOperation('item-1', undefined, 'item-new');
            expect(op.validate()).toBe(false);
        });
        
        it('should split item at caret position', () => {
            const op = new SplitOperation('item-1', 5, 'item-new');
            const result = op.apply();
            
            expect(result).toBeTruthy();
            expect(result.success).toBe(true);
            
            const item1 = mockAppState.getItem('page-1', 'group-1', 'item-1');
            const itemNew = mockAppState.getItem('page-1', 'group-1', 'item-new');
            
            expect(item1).toBeTruthy();
            expect(itemNew).toBeTruthy();
        });
        
        it('should invert correctly', () => {
            const op = new SplitOperation('item-1', 5, 'item-new');
            const inverse = op.invert();
            
            expect(inverse).toBeTruthy();
            expect(inverse.getType()).toBe('merge');
        });
    });
    
    describe('MergeOperation', () => {
        it('should merge item with previous item', () => {
            const op = new MergeOperation('item-2', 'item-1');
            const result = op.apply();
            
            expect(result).toBeTruthy();
            expect(result.success).toBe(true);
        });
        
        it('should invert correctly', () => {
            const op = new MergeOperation('item-2', 'item-1');
            const inverse = op.invert();
            
            expect(inverse).toBeTruthy();
            expect(inverse.getType()).toBe('split');
        });
    });
    
    describe('MoveOperation', () => {
        it('should move item to new position', () => {
            // Ensure item exists and group has enough items
            const page = mockAppState.documents.find(p => p.id === 'page-1');
            if (page && page.groups && page.groups[0]) {
                // Add item-1 if it doesn't exist
                if (!page.groups[0].items.find(item => item.id === 'item-1')) {
                    page.groups[0].items.push({ id: 'item-1', text: 'Item 1', type: 'note' });
                }
                // Add more items for move operation
                if (page.groups[0].items.length < 3) {
                    page.groups[0].items.push({ id: 'item-2', text: 'Item 2', type: 'note' });
                    page.groups[0].items.push({ id: 'item-3', text: 'Item 3', type: 'note' });
                }
            }
            
            const op = new MoveOperation('item-1', null, 2, null, 0);
            const result = op.apply();
            
            expect(result).toBeTruthy();
            expect(result.success).toBe(true);
        });
        
        it('should invert correctly', () => {
            const op = new MoveOperation('item-1', 'group-1', 2, 'group-1', 0);
            const inverse = op.invert();
            
            expect(inverse.itemId).toBe('item-1');
            expect(inverse.params.newParentId).toBe('group-1');
            expect(inverse.params.newIndex).toBe(0);
        });
    });
    
    describe('ReparentOperation', () => {
        it('should reparent item', () => {
            const op = new ReparentOperation('item-1', 'group-1', 1, null, 0);
            const result = op.apply();
            
            expect(result).toBeTruthy();
            expect(result.success).toBe(true);
        });
        
        it('should invert correctly', () => {
            const op = new ReparentOperation('item-1', 'group-1', 1, null, 0);
            const inverse = op.invert();
            
            expect(inverse.itemId).toBe('item-1');
            expect(inverse.params.newParentId).toBe(null);
            expect(inverse.params.newDepth).toBe(0);
        });
    });
    
    describe('DeleteOperation', () => {
        it('should delete item', () => {
            const item = mockAppState.getItem('page-1', 'group-1', 'item-1');
            const op = new DeleteOperation('item-1', item);
            const result = op.apply();
            
            expect(result).toBeTruthy();
            expect(result.success).toBe(true);
            
            // Item should be removed
            const deletedItem = mockAppState.getItem('page-1', 'group-1', 'item-1');
            expect(deletedItem).toBeNull();
        });
        
        it('should invert correctly (create)', () => {
            const item = mockAppState.getItem('page-1', 'group-1', 'item-1');
            const op = new DeleteOperation('item-1', item);
            const inverse = op.invert();
            
            expect(inverse).toBeTruthy();
            expect(inverse.getType()).toBe('create');
        });
    });
    
    describe('CreateOperation', () => {
        it('should create new item', () => {
            // Ensure group exists and set currentDocumentId
            const page = mockAppState.documents.find(p => p.id === 'page-1');
            if (page && page.groups && page.groups[0]) {
                mockAppState.currentDocumentId = 'page-1';
                
                const op = new CreateOperation('item-new', 'note', null, 0, {
                    text: 'New item',
                    type: 'note'
                });
                const result = op.apply();
                
                expect(result).toBeTruthy();
                expect(result.success).toBe(true);
                
                const newItem = mockAppState.getItem('page-1', 'group-1', 'item-new');
                expect(newItem).toBeTruthy();
                expect(newItem.text).toBe('New item');
            }
        });
        
        it('should invert correctly (delete)', () => {
            const op = new CreateOperation('item-new', 'note', 'group-1', 0, {
                text: 'New item',
                type: 'note'
            });
            const inverse = op.invert();
            
            expect(inverse).toBeTruthy();
            expect(inverse.getType()).toBe('delete');
        });
    });
    
    describe('Operation validation', () => {
        it('should fail validation without itemId', () => {
            const op = new SetTextOperation(null, 'Text', 'Old');
            expect(op.validate()).toBe(false);
        });
        
        it('should fail validation with empty itemId', () => {
            const op = new SetTextOperation('', 'Text', 'Old');
            expect(op.validate()).toBe(false);
        });
    });
    
    describe('Operation getType', () => {
        it('should return correct type for SetTextOperation', () => {
            const op = new SetTextOperation('item-1', 'Text', 'Old');
            expect(op.getType()).toBe('setText');
        });
        
        it('should return correct type for all operations', () => {
            expect(new SplitOperation('item-1', 5, 'item-new').getType()).toBe('split');
            expect(new MergeOperation('item-1', 'item-2').getType()).toBe('merge');
            expect(new MoveOperation('item-1', 'group-1', 0).getType()).toBe('move');
            expect(new ReparentOperation('item-1', 'group-1', 1).getType()).toBe('reparent');
            expect(new DeleteOperation('item-1').getType()).toBe('delete');
            expect(new CreateOperation('item-1', 'note', 'group-1', 0).getType()).toBe('create');
        });
    });
});

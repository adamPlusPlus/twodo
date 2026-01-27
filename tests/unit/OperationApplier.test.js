// tests/unit/OperationApplier.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import { OperationApplier } from '../../js/utils/OperationApplier.js';
import { getService, SERVICES, registerService } from '../../js/core/AppServices.js';
import { serviceLocator } from '../../js/core/ServiceLocator.js';

describe('OperationApplier', () => {
    let mockAppState;
    
    beforeEach(() => {
        serviceLocator.clear();
        mockAppState = {
            documents: [
                {
                    id: 'page-1',
                    groups: [
                        {
                            id: 'group-1',
                            items: [
                                { id: 'item-1', text: 'Item 1', parentId: null, childIds: [] },
                                { id: 'item-2', text: 'Item 2', parentId: null, childIds: ['item-3'] },
                                { id: 'item-3', text: 'Item 3', parentId: 'item-2', childIds: [] }
                            ]
                        }
                    ]
                }
            ],
            currentDocumentId: 'page-1'
        };
        registerService(SERVICES.APP_STATE, mockAppState);
    });
    
    describe('findItem', () => {
        it('should find root item', () => {
            const location = OperationApplier.findItem('item-1', mockAppState);
            
            expect(location).toBeTruthy();
            expect(location.item.id).toBe('item-1');
            expect(location.isChild).toBe(false);
            expect(location.itemIndex).toBe(0);
        });
        
        it('should find child item', () => {
            const location = OperationApplier.findItem('item-3', mockAppState);
            
            expect(location).toBeTruthy();
            expect(location.item.id).toBe('item-3');
            expect(location.isChild).toBe(true);
            expect(location.parentItem.id).toBe('item-2');
        });
        
        it('should return null for non-existent item', () => {
            const location = OperationApplier.findItem('item-999', mockAppState);
            expect(location).toBeNull();
        });
        
        it('should fetch AppState if not provided', () => {
            const location = OperationApplier.findItem('item-1');
            expect(location).toBeTruthy();
            expect(location.item.id).toBe('item-1');
        });
    });
    
    describe('removeFromParentChildIds', () => {
        it('should remove item from parent childIds', () => {
            const parent = mockAppState.documents[0].groups[0].items[1];
            expect(parent.childIds).toContain('item-3');
            
            const result = OperationApplier.removeFromParentChildIds('item-2', 'item-3', mockAppState);
            
            expect(result).toBe(true);
            expect(parent.childIds).not.toContain('item-3');
        });
        
        it('should return false if parent not found', () => {
            const result = OperationApplier.removeFromParentChildIds('item-999', 'item-3', mockAppState);
            expect(result).toBe(false);
        });
    });
    
    describe('addToParentChildIds', () => {
        it('should add item to parent childIds', () => {
            const parent = mockAppState.documents[0].groups[0].items[0];
            expect(parent.childIds).not.toContain('item-3');
            
            const result = OperationApplier.addToParentChildIds('item-1', 'item-3', mockAppState);
            
            expect(result).toBe(true);
            expect(parent.childIds).toContain('item-3');
        });
        
        it('should create childIds array if missing', () => {
            const parent = mockAppState.documents[0].groups[0].items[0];
            delete parent.childIds;
            
            const result = OperationApplier.addToParentChildIds('item-1', 'item-4', mockAppState);
            
            expect(result).toBe(true);
            expect(Array.isArray(parent.childIds)).toBe(true);
            expect(parent.childIds).toContain('item-4');
        });
    });
    
    describe('updateParentChildIds', () => {
        it('should update parent childIds (remove from old, add to new)', () => {
            const oldParent = mockAppState.documents[0].groups[0].items[1];
            const newParent = mockAppState.documents[0].groups[0].items[0];
            
            expect(oldParent.childIds).toContain('item-3');
            expect(newParent.childIds || []).not.toContain('item-3');
            
            const result = OperationApplier.updateParentChildIds('item-2', 'item-1', 'item-3', mockAppState);
            
            expect(result).toBe(true);
            expect(oldParent.childIds).not.toContain('item-3');
            expect(newParent.childIds).toContain('item-3');
        });
    });
    
    describe('findTargetGroup', () => {
        it('should find group for parent item', () => {
            const group = OperationApplier.findTargetGroup('item-2', mockAppState);
            
            expect(group).toBeTruthy();
            expect(group.id).toBe('group-1');
        });
        
        it('should find first group in current document if no parent', () => {
            const group = OperationApplier.findTargetGroup(null, mockAppState);
            
            expect(group).toBeTruthy();
            expect(group.id).toBe('group-1');
        });
    });
    
    describe('insertItemAt', () => {
        it('should insert item at index', () => {
            const group = mockAppState.documents[0].groups[0];
            const newItem = { id: 'item-4', text: 'Item 4' };
            
            const index = OperationApplier.insertItemAt(group, newItem, 1);
            
            expect(index).toBe(1);
            expect(group.items[1].id).toBe('item-4');
        });
        
        it('should clamp index to array length', () => {
            const group = mockAppState.documents[0].groups[0];
            const newItem = { id: 'item-5', text: 'Item 5' };
            
            const index = OperationApplier.insertItemAt(group, newItem, 999);
            
            expect(index).toBe(group.items.length - 1);
        });
    });
    
    describe('removeItemAt', () => {
        it('should remove item at index', () => {
            const group = mockAppState.documents[0].groups[0];
            const originalLength = group.items.length;
            
            const removed = OperationApplier.removeItemAt(group, 0);
            
            expect(removed).toBeTruthy();
            expect(removed.id).toBe('item-1');
            expect(group.items.length).toBe(originalLength - 1);
        });
        
        it('should return null for invalid index', () => {
            const group = mockAppState.documents[0].groups[0];
            const removed = OperationApplier.removeItemAt(group, 999);
            expect(removed).toBeNull();
        });
    });
    
    describe('cloneItem', () => {
        it('should deep clone item', () => {
            const item = { id: 'item-1', text: 'Test', config: { key: 'value' } };
            const cloned = OperationApplier.cloneItem(item);
            
            expect(cloned).not.toBe(item);
            expect(cloned.id).toBe(item.id);
            expect(cloned.text).toBe(item.text);
            expect(cloned.config).not.toBe(item.config);
            expect(cloned.config.key).toBe(item.config.key);
        });
        
        it('should return null for null input', () => {
            expect(OperationApplier.cloneItem(null)).toBeNull();
        });
    });
    
    describe('calculateDepth', () => {
        it('should calculate depth for root item', () => {
            const item = mockAppState.documents[0].groups[0].items[0];
            const depth = OperationApplier.calculateDepth(item, mockAppState);
            expect(depth).toBe(0);
        });
        
        it('should calculate depth for child item', () => {
            const item = mockAppState.documents[0].groups[0].items[2]; // item-3
            const depth = OperationApplier.calculateDepth(item, mockAppState);
            expect(depth).toBe(1);
        });
    });
});

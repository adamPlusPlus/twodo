// tests/unit/DragValidator.test.js
import { describe, it, expect } from 'vitest';
import { DragValidator } from '../../js/utils/DragValidator.js';
import { ItemHierarchy } from '../../js/utils/ItemHierarchy.js';

describe('DragValidator', () => {
    describe('canDrag', () => {
        it('should allow dragging valid items', () => {
            const sourceLocation = {
                item: { id: 'item-1', text: 'Test' },
                documentId: 'page-1',
                groupId: 'bin-1',
                itemIndex: 0
            };
            
            expect(DragValidator.canDrag('item-1', sourceLocation)).toBe(true);
        });
        
        it('should reject invalid source location', () => {
            expect(DragValidator.canDrag('item-1', null)).toBe(false);
            expect(DragValidator.canDrag(null, {})).toBe(false);
        });
    });
    
    describe('canDrop', () => {
        it('should allow valid drops', () => {
            const dragData = {
                pageId: 'page-1',
                binId: 'bin-1',
                elementIndex: 0
            };
            const targetLocation = {
                documentId: 'page-1',
                groupId: 'bin-1',
                itemIndex: 1
            };
            
            expect(DragValidator.canDrop(dragData, targetLocation)).toBe(true);
        });
        
        it('should reject dropping on itself', () => {
            const dragData = {
                pageId: 'page-1',
                binId: 'bin-1',
                elementIndex: 0
            };
            const targetLocation = {
                documentId: 'page-1',
                groupId: 'bin-1',
                itemIndex: 0
            };
            
            expect(DragValidator.canDrop(dragData, targetLocation)).toBe(false);
        });
    });
    
    describe('validateDragTarget', () => {
        it('should validate valid drag target', () => {
            const itemIndex = {
                'item-1': { id: 'item-1', text: 'Source' },
                'item-2': { id: 'item-2', text: 'Target' }
            };
            
            const result = DragValidator.validateDragTarget('item-1', 'item-2', itemIndex);
            
            expect(result.valid).toBe(true);
        });
        
        it('should reject self-nesting', () => {
            const itemIndex = {
                'item-1': { id: 'item-1', text: 'Item' }
            };
            
            const result = DragValidator.validateDragTarget('item-1', 'item-1', itemIndex);
            
            expect(result.valid).toBe(false);
            expect(result.reason).toContain('itself');
        });
    });
    
    describe('isDescendant', () => {
        it('should detect descendant relationships', () => {
            const parent = { id: 'parent', childIds: ['child'] };
            const child = { id: 'child' };
            const itemIndex = {
                'parent': parent,
                'child': child
            };
            
            expect(DragValidator.isDescendant(parent, child, itemIndex)).toBe(true);
        });
        
        it('should return false for non-descendants', () => {
            const item1 = { id: 'item-1' };
            const item2 = { id: 'item-2' };
            const itemIndex = {
                'item-1': item1,
                'item-2': item2
            };
            
            expect(DragValidator.isDescendant(item1, item2, itemIndex)).toBe(false);
        });
    });
    
    describe('getDragConstraints', () => {
        it('should return constraints for item', () => {
            const itemIndex = {
                'item-1': { id: 'item-1', text: 'Test' }
            };
            
            const constraints = DragValidator.getDragConstraints('item-1', itemIndex);
            
            expect(constraints.canDrag).toBe(true);
            expect(constraints.maxDepth).toBe(1);
        });
    });
});

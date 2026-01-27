// tests/unit/DragOperations.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DragOperations } from '../../js/utils/DragOperations.js';

describe('DragOperations', () => {
    let mockAppState;
    
    beforeEach(() => {
        mockAppState = {
            dragData: null,
            isDragging: false
        };
    });
    
    describe('createDragData', () => {
        it('should create drag data from source location', () => {
            const sourceLocation = {
                documentId: 'page-1',
                groupId: 'bin-1',
                itemIndex: 0,
                isChild: false
            };
            
            const dragData = DragOperations.createDragData('item-1', sourceLocation);
            
            expect(dragData.type).toBe('element');
            expect(dragData.pageId).toBe('page-1');
            expect(dragData.binId).toBe('bin-1');
        });
        
        it('should handle child elements', () => {
            const sourceLocation = {
                documentId: 'page-1',
                groupId: 'bin-1',
                itemIndex: 0,
                childIndex: 1,
                isChild: true
            };
            
            const dragData = DragOperations.createDragData('item-1', sourceLocation);
            
            expect(dragData.isChild).toBe(true);
            expect(dragData.childIndex).toBe(1);
        });
    });
    
    describe('startDrag', () => {
        it('should set drag state', () => {
            const sourceLocation = {
                documentId: 'page-1',
                groupId: 'bin-1',
                itemIndex: 0,
                isChild: false
            };
            
            const dragData = DragOperations.startDrag('item-1', sourceLocation, mockAppState);
            
            expect(dragData).toBeDefined();
            expect(mockAppState.dragData).toBe(dragData);
            expect(mockAppState.isDragging).toBe(true);
        });
    });
    
    describe('endDrag', () => {
        it('should clear drag state', () => {
            mockAppState.dragData = { type: 'element' };
            mockAppState.isDragging = true;
            
            DragOperations.endDrag({}, null, mockAppState);
            
            expect(mockAppState.isDragging).toBe(false);
            expect(mockAppState.dragData).toBeNull();
        });
    });
    
    describe('validateDragOperation', () => {
        it('should validate valid drag operation', () => {
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
            
            expect(DragOperations.validateDragOperation(dragData, targetLocation)).toBe(true);
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
            
            expect(DragOperations.validateDragOperation(dragData, targetLocation)).toBe(false);
        });
    });
});

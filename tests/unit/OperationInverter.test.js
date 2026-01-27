// tests/unit/OperationInverter.test.js
import { describe, it, expect } from 'vitest';
import { OperationInverter } from '../../js/utils/OperationInverter.js';
import { SetTextOperation, SplitOperation, MergeOperation, MoveOperation, ReparentOperation, DeleteOperation, CreateOperation } from '../../js/core/SemanticOperations.js';

describe('OperationInverter', () => {
    const operationClasses = {
        SetTextOperation,
        SplitOperation,
        MergeOperation,
        MoveOperation,
        ReparentOperation,
        DeleteOperation,
        CreateOperation
    };
    
    describe('invertSetTextOperation', () => {
        it('should invert SetTextOperation', () => {
            const operation = new SetTextOperation('item-1', 'New text', 'Old text', 123456);
            const inverted = OperationInverter.invertSetTextOperation(operation, SetTextOperation);
            
            expect(inverted).toBeInstanceOf(SetTextOperation);
            expect(inverted.itemId).toBe('item-1');
            expect(inverted.params.text).toBe('Old text');
            expect(inverted.params.oldText).toBe('New text');
        });
    });
    
    describe('invertSplitOperation', () => {
        it('should invert SplitOperation to MergeOperation', () => {
            const operation = new SplitOperation('item-1', 5, 'item-2', 123456);
            const inverted = OperationInverter.invertSplitOperation(operation, MergeOperation);
            
            expect(inverted).toBeInstanceOf(MergeOperation);
            expect(inverted.itemId).toBe('item-2');
            expect(inverted.params.previousItemId).toBe('item-1');
        });
    });
    
    describe('invertMergeOperation', () => {
        it('should invert MergeOperation to SplitOperation', () => {
            const operation = new MergeOperation('item-2', 'item-1', 123456);
            operation.params.caretPosition = 10;
            const inverted = OperationInverter.invertMergeOperation(operation, SplitOperation);
            
            expect(inverted).toBeInstanceOf(SplitOperation);
            expect(inverted.itemId).toBe('item-1');
            expect(inverted.params.newItemId).toBe('item-2');
        });
    });
    
    describe('invertMoveOperation', () => {
        it('should invert MoveOperation', () => {
            const operation = new MoveOperation('item-1', 'parent-2', 5, 'parent-1', 2, 123456);
            const inverted = OperationInverter.invertMoveOperation(operation, MoveOperation);
            
            expect(inverted).toBeInstanceOf(MoveOperation);
            expect(inverted.itemId).toBe('item-1');
            expect(inverted.params.newParentId).toBe('parent-1');
            expect(inverted.params.newIndex).toBe(2);
            expect(inverted.params.oldParentId).toBe('parent-2');
            expect(inverted.params.oldIndex).toBe(5);
        });
    });
    
    describe('invertReparentOperation', () => {
        it('should invert ReparentOperation', () => {
            const operation = new ReparentOperation('item-1', 'parent-2', 2, 'parent-1', 1, 123456);
            const inverted = OperationInverter.invertReparentOperation(operation, ReparentOperation);
            
            expect(inverted).toBeInstanceOf(ReparentOperation);
            expect(inverted.itemId).toBe('item-1');
            expect(inverted.params.newParentId).toBe('parent-1');
            expect(inverted.params.newDepth).toBe(1);
        });
    });
    
    describe('invertDeleteOperation', () => {
        it('should invert DeleteOperation to CreateOperation', () => {
            const deletedItem = { id: 'item-1', type: 'task', text: 'Test' };
            const operation = new DeleteOperation('item-1', deletedItem, 123456);
            operation.params.deletedParentId = 'parent-1';
            operation.params.deletedIndex = 0;
            
            const inverted = OperationInverter.invertDeleteOperation(operation, CreateOperation);
            
            expect(inverted).toBeInstanceOf(CreateOperation);
            expect(inverted.itemId).toBe('item-1');
            expect(inverted.params.type).toBe('task');
        });
    });
    
    describe('invertCreateOperation', () => {
        it('should invert CreateOperation to DeleteOperation', () => {
            const itemData = { id: 'item-1', type: 'task', text: 'Test' };
            const operation = new CreateOperation('item-1', 'task', 'parent-1', 0, itemData, 123456);
            const inverted = OperationInverter.invertCreateOperation(operation, DeleteOperation);
            
            expect(inverted).toBeInstanceOf(DeleteOperation);
            expect(inverted.itemId).toBe('item-1');
            expect(inverted.params.deletedItem).toBe(itemData);
        });
    });
    
    describe('invertOperation', () => {
        it('should route to correct inverter for setText', () => {
            const operation = new SetTextOperation('item-1', 'New', 'Old', 123456);
            const inverted = OperationInverter.invertOperation(operation, operationClasses);
            
            expect(inverted).toBeInstanceOf(SetTextOperation);
        });
        
        it('should route to correct inverter for split', () => {
            const operation = new SplitOperation('item-1', 5, 'item-2', 123456);
            const inverted = OperationInverter.invertOperation(operation, operationClasses);
            
            expect(inverted).toBeInstanceOf(MergeOperation);
        });
        
        it('should return null for unknown operation type', () => {
            const operation = { getType: () => 'unknown', itemId: 'item-1' };
            const inverted = OperationInverter.invertOperation(operation, operationClasses);
            
            expect(inverted).toBeNull();
        });
    });
});

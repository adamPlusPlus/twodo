// tests/unit/OperationValidator.test.js
import { describe, it, expect } from 'vitest';
import { OperationValidator } from '../../js/utils/OperationValidator.js';

describe('OperationValidator', () => {
    describe('validateBaseOperation', () => {
        it('should validate operation with itemId', () => {
            const operation = { itemId: 'item-1', params: {} };
            expect(OperationValidator.validateBaseOperation(operation, 'TestOperation')).toBe(true);
        });
        
        it('should reject operation without itemId', () => {
            const operation = { params: {} };
            expect(OperationValidator.validateBaseOperation(operation, 'TestOperation')).toBe(false);
        });
        
        it('should reject null operation', () => {
            expect(OperationValidator.validateBaseOperation(null, 'TestOperation')).toBe(false);
        });
    });
    
    describe('validateSetTextOperation', () => {
        it('should validate SetTextOperation with text', () => {
            const operation = { itemId: 'item-1', params: { text: 'New text' } };
            expect(OperationValidator.validateSetTextOperation(operation)).toBe(true);
        });
        
        it('should reject SetTextOperation without text', () => {
            const operation = { itemId: 'item-1', params: {} };
            expect(OperationValidator.validateSetTextOperation(operation)).toBe(false);
        });
    });
    
    describe('validateSplitOperation', () => {
        it('should validate SplitOperation with all params', () => {
            const operation = { itemId: 'item-1', params: { caretPosition: 5, newItemId: 'item-2' } };
            expect(OperationValidator.validateSplitOperation(operation)).toBe(true);
        });
        
        it('should reject SplitOperation without caretPosition', () => {
            const operation = { itemId: 'item-1', params: { newItemId: 'item-2' } };
            expect(OperationValidator.validateSplitOperation(operation)).toBe(false);
        });
        
        it('should reject SplitOperation without newItemId', () => {
            const operation = { itemId: 'item-1', params: { caretPosition: 5 } };
            expect(OperationValidator.validateSplitOperation(operation)).toBe(false);
        });
    });
    
    describe('validateMergeOperation', () => {
        it('should validate MergeOperation with previousItemId', () => {
            const operation = { itemId: 'item-1', params: { previousItemId: 'item-0' } };
            expect(OperationValidator.validateMergeOperation(operation)).toBe(true);
        });
        
        it('should reject MergeOperation without previousItemId', () => {
            const operation = { itemId: 'item-1', params: {} };
            expect(OperationValidator.validateMergeOperation(operation)).toBe(false);
        });
    });
    
    describe('validateMoveOperation', () => {
        it('should validate MoveOperation with newIndex', () => {
            const operation = { itemId: 'item-1', params: { newIndex: 2 } };
            expect(OperationValidator.validateMoveOperation(operation)).toBe(true);
        });
        
        it('should reject MoveOperation without newIndex', () => {
            const operation = { itemId: 'item-1', params: {} };
            expect(OperationValidator.validateMoveOperation(operation)).toBe(false);
        });
    });
    
    describe('validateReparentOperation', () => {
        it('should validate ReparentOperation with newDepth', () => {
            const operation = { itemId: 'item-1', params: { newDepth: 2 } };
            expect(OperationValidator.validateReparentOperation(operation)).toBe(true);
        });
        
        it('should reject ReparentOperation without newDepth', () => {
            const operation = { itemId: 'item-1', params: {} };
            expect(OperationValidator.validateReparentOperation(operation)).toBe(false);
        });
    });
    
    describe('validateDeleteOperation', () => {
        it('should validate DeleteOperation with itemId', () => {
            const operation = { itemId: 'item-1', params: {} };
            expect(OperationValidator.validateDeleteOperation(operation)).toBe(true);
        });
    });
    
    describe('validateCreateOperation', () => {
        it('should validate CreateOperation with type and index', () => {
            const operation = { itemId: 'item-1', params: { type: 'task', index: 0 } };
            expect(OperationValidator.validateCreateOperation(operation)).toBe(true);
        });
        
        it('should reject CreateOperation without type', () => {
            const operation = { itemId: 'item-1', params: { index: 0 } };
            expect(OperationValidator.validateCreateOperation(operation)).toBe(false);
        });
        
        it('should reject CreateOperation without index', () => {
            const operation = { itemId: 'item-1', params: { type: 'task' } };
            expect(OperationValidator.validateCreateOperation(operation)).toBe(false);
        });
    });
    
    describe('validateOperation', () => {
        it('should validate setText operation', () => {
            const operation = { getType: () => 'setText', itemId: 'item-1', params: { text: 'Test' } };
            expect(OperationValidator.validateOperation(operation)).toBe(true);
        });
        
        it('should validate split operation', () => {
            const operation = { getType: () => 'split', itemId: 'item-1', params: { caretPosition: 5, newItemId: 'item-2' } };
            expect(OperationValidator.validateOperation(operation)).toBe(true);
        });
        
        it('should reject unknown operation type', () => {
            const operation = { getType: () => 'unknown', itemId: 'item-1', params: {} };
            expect(OperationValidator.validateOperation(operation)).toBe(false);
        });
    });
});

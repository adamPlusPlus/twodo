// tests/unit/OperationSerializer.test.js
import { describe, it, expect } from 'vitest';
import { OperationSerializer } from '../../js/utils/OperationSerializer.js';
import { SetTextOperation } from '../../js/core/SemanticOperations.js';

describe('OperationSerializer', () => {
    describe('serializeOperation', () => {
        it('should serialize operation to object', () => {
            const operation = new SetTextOperation('item-1', 'New text', 'Old text', 123456);
            const serialized = OperationSerializer.serializeOperation(operation);
            
            expect(serialized).toEqual({
                op: 'setText',
                itemId: 'item-1',
                params: { text: 'New text', oldText: 'Old text' },
                timestamp: 123456,
                clientId: 'local'
            });
        });
        
        it('should handle operation with getType method', () => {
            const operation = {
                getType: () => 'setText',
                itemId: 'item-1',
                params: { text: 'Test' },
                timestamp: 123456,
                clientId: 'local'
            };
            const serialized = OperationSerializer.serializeOperation(operation);
            
            expect(serialized.op).toBe('setText');
        });
        
        it('should return null for null operation', () => {
            expect(OperationSerializer.serializeOperation(null)).toBeNull();
        });
    });
    
    describe('deserializeOperation', () => {
        it('should deserialize operation from object', () => {
            const operationData = {
                op: 'setText',
                itemId: 'item-1',
                params: { text: 'New text', oldText: 'Old text' },
                timestamp: 123456
            };
            
            const createOperation = (op, itemId, params, timestamp) => {
                if (op === 'setText') {
                    return new SetTextOperation(itemId, params.text, params.oldText, timestamp);
                }
                return null;
            };
            
            const operation = OperationSerializer.deserializeOperation(operationData, createOperation);
            
            expect(operation).toBeInstanceOf(SetTextOperation);
            expect(operation.itemId).toBe('item-1');
            expect(operation.params.text).toBe('New text');
        });
        
        it('should return null for invalid data', () => {
            expect(OperationSerializer.deserializeOperation(null, () => null)).toBeNull();
            expect(OperationSerializer.deserializeOperation({}, () => null)).toBeNull();
        });
    });
    
    describe('serializeOperationBatch', () => {
        it('should serialize array of operations', () => {
            const operations = [
                new SetTextOperation('item-1', 'Text 1', 'Old 1', 123456),
                new SetTextOperation('item-2', 'Text 2', 'Old 2', 123457)
            ];
            
            const serialized = OperationSerializer.serializeOperationBatch(operations);
            
            expect(serialized.length).toBe(2);
            expect(serialized[0].itemId).toBe('item-1');
            expect(serialized[1].itemId).toBe('item-2');
        });
        
        it('should handle empty array', () => {
            expect(OperationSerializer.serializeOperationBatch([])).toEqual([]);
        });
    });
    
    describe('deserializeOperationBatch', () => {
        it('should deserialize array of operations', () => {
            const operationsData = [
                { op: 'setText', itemId: 'item-1', params: { text: 'Text 1' }, timestamp: 123456 },
                { op: 'setText', itemId: 'item-2', params: { text: 'Text 2' }, timestamp: 123457 }
            ];
            
            const createOperation = (op, itemId, params, timestamp) => {
                if (op === 'setText') {
                    return new SetTextOperation(itemId, params.text, params.oldText, timestamp);
                }
                return null;
            };
            
            const operations = OperationSerializer.deserializeOperationBatch(operationsData, createOperation);
            
            expect(operations.length).toBe(2);
            expect(operations[0]).toBeInstanceOf(SetTextOperation);
        });
    });
    
    describe('toJSONString', () => {
        it('should convert operation to JSON string', () => {
            const operation = new SetTextOperation('item-1', 'Text', 'Old', 123456);
            const json = OperationSerializer.toJSONString(operation);
            
            expect(typeof json).toBe('string');
            const parsed = JSON.parse(json);
            expect(parsed.op).toBe('setText');
            expect(parsed.itemId).toBe('item-1');
        });
    });
    
    describe('fromJSONString', () => {
        it('should parse operation from JSON string', () => {
            const json = '{"op":"setText","itemId":"item-1","params":{"text":"Text","oldText":"Old"},"timestamp":123456}';
            
            const createOperation = (op, itemId, params, timestamp) => {
                if (op === 'setText') {
                    return new SetTextOperation(itemId, params.text, params.oldText, timestamp);
                }
                return null;
            };
            
            const operation = OperationSerializer.fromJSONString(json, createOperation);
            
            expect(operation).toBeInstanceOf(SetTextOperation);
            expect(operation.itemId).toBe('item-1');
        });
        
        it('should return null for invalid JSON', () => {
            const createOperation = () => null;
            expect(OperationSerializer.fromJSONString('invalid json', createOperation)).toBeNull();
        });
    });
});

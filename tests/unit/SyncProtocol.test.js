// tests/unit/SyncProtocol.test.js
import { describe, it, expect } from 'vitest';
import { SyncProtocol } from '../../js/utils/SyncProtocol.js';

describe('SyncProtocol', () => {
    describe('routeMessage', () => {
        it('should route message to correct handler', () => {
            const handlers = {
                'test': (msg) => {
                    expect(msg.type).toBe('test');
                }
            };
            
            expect(SyncProtocol.routeMessage({ type: 'test' }, handlers)).toBe(true);
        });
        
        it('should return false for invalid message', () => {
            expect(SyncProtocol.routeMessage(null, {})).toBe(false);
            expect(SyncProtocol.routeMessage({}, {})).toBe(false);
        });
        
        it('should return false for unknown message type', () => {
            expect(SyncProtocol.routeMessage({ type: 'unknown' }, {})).toBe(false);
        });
    });
    
    describe('createMessage', () => {
        it('should create message with type and data', () => {
            const message = SyncProtocol.createMessage('test', { data: 123 });
            expect(message.type).toBe('test');
            expect(message.data).toBe(123);
            expect(message.timestamp).toBeDefined();
        });
        
        it('should use provided timestamp', () => {
            const message = SyncProtocol.createMessage('test', { timestamp: 123456 });
            expect(message.timestamp).toBe(123456);
        });
    });
    
    describe('validateMessage', () => {
        it('should validate correct message', () => {
            expect(SyncProtocol.validateMessage({ type: 'test' })).toBe(true);
        });
        
        it('should reject invalid messages', () => {
            expect(SyncProtocol.validateMessage(null)).toBe(false);
            expect(SyncProtocol.validateMessage({})).toBe(false);
            expect(SyncProtocol.validateMessage({ type: 123 })).toBe(false);
        });
    });
    
    describe('createOperationSyncMessage', () => {
        it('should create operation sync message', () => {
            const operation = {
                sequence: 1,
                op: 'setText',
                itemId: 'item-1',
                params: { text: 'Test' },
                timestamp: 123456
            };
            
            const message = SyncProtocol.createOperationSyncMessage('file.json', operation, 'client-1');
            
            expect(message.type).toBe('operation_sync');
            expect(message.filename).toBe('file.json');
            expect(message.operation.sequence).toBe(1);
            expect(message.operation.clientId).toBe('client-1');
        });
    });
    
    describe('createJoinFileMessage', () => {
        it('should create join file message', () => {
            const message = SyncProtocol.createJoinFileMessage('file.json');
            expect(message.type).toBe('join_file');
            expect(message.filename).toBe('file.json');
        });
    });
    
    describe('createLeaveFileMessage', () => {
        it('should create leave file message', () => {
            const message = SyncProtocol.createLeaveFileMessage('file.json');
            expect(message.type).toBe('leave_file');
            expect(message.filename).toBe('file.json');
        });
    });
    
    describe('createRequestOperationsMessage', () => {
        it('should create request operations message', () => {
            const message = SyncProtocol.createRequestOperationsMessage('file.json', 10);
            expect(message.type).toBe('request_operations');
            expect(message.filename).toBe('file.json');
            expect(message.sinceSequence).toBe(10);
        });
    });
    
    describe('createChangeMessage', () => {
        it('should create change message', () => {
            const change = { type: 'update', path: 'test' };
            const message = SyncProtocol.createChangeMessage('file.json', change);
            expect(message.type).toBe('change');
            expect(message.filename).toBe('file.json');
            expect(message.change).toBe(change);
        });
    });
    
    describe('createUndoMessage', () => {
        it('should create undo message', () => {
            const message = SyncProtocol.createUndoMessage('file.json', 'change-1');
            expect(message.type).toBe('undo');
            expect(message.filename).toBe('file.json');
            expect(message.changeId).toBe('change-1');
        });
    });
    
    describe('createRedoMessage', () => {
        it('should create redo message', () => {
            const message = SyncProtocol.createRedoMessage('file.json', 'change-1');
            expect(message.type).toBe('redo');
            expect(message.filename).toBe('file.json');
            expect(message.changeId).toBe('change-1');
        });
    });
    
    describe('createFullSyncMessage', () => {
        it('should create full sync message', () => {
            const data = { documents: [] };
            const message = SyncProtocol.createFullSyncMessage('file.json', data, 123456);
            expect(message.type).toBe('full_sync');
            expect(message.filename).toBe('file.json');
            expect(message.data).toBe(data);
            expect(message.timestamp).toBe(123456);
        });
    });
});

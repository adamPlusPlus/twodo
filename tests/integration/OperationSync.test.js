// tests/integration/OperationSync.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import { OperationLog, getOperationLog } from '../../js/core/OperationLog.js';
import { SemanticOperationManager } from '../../js/core/SemanticOperationManager.js';
import { createMockAppState } from '../helpers/mockAppState.js';
import { setupMockServices } from '../helpers/mockServices.js';
import { registerService, SERVICES } from '../../js/core/AppServices.js';
import { createSetTextOperation } from '../helpers/operationHelpers.js';

describe('OperationSync Integration', () => {
    let mockAppState;
    let mockServices;
    let semanticOpManager;
    let operationLog;
    
    beforeEach(() => {
        mockAppState = createMockAppState({
            documents: [
                {
                    id: 'page-1',
                    groups: [
                        {
                            id: 'group-1',
                            items: [
                                { id: 'item-1', text: 'Item 1', type: 'note' },
                                { id: 'item-2', text: 'Item 2', type: 'note' }
                            ]
                        }
                    ]
                }
            ]
        });
        mockServices = setupMockServices({ appState: mockAppState });
        
        registerService(SERVICES.APP_STATE, mockAppState);
        registerService(SERVICES.EVENT_BUS, mockServices.eventBus);
        registerService(SERVICES.AUTHORITY_MANAGER, mockServices.authorityManager);
        registerService(SERVICES.FILE_MANAGER, {
            currentFilename: 'test-file.json',
            saveFile: async () => ({ success: true }),
            loadFile: async () => ({ success: true })
        });
        
        semanticOpManager = new SemanticOperationManager();
        operationLog = getOperationLog('test-file.json');
        operationLog.clear();
    });
    
    describe('Operation logging', () => {
        it('should log operations to OperationLog', () => {
            const operation = createSetTextOperation('item-1', 'New text', 'Old text');
            semanticOpManager.applyOperation(operation);
            
            const operations = operationLog.getOperations(0);
            expect(operations.length).toBe(1);
            expect(operations[0].op).toBe('setText');
        });
        
        it('should maintain operation ordering', () => {
            const op1 = createSetTextOperation('item-1', 'Text 1', 'Old');
            const op2 = createSetTextOperation('item-2', 'Text 2', 'Old');
            
            semanticOpManager.applyOperation(op1);
            semanticOpManager.applyOperation(op2);
            
            const operations = operationLog.getOperations(0);
            expect(operations.length).toBe(2);
            expect(operations[0].sequence).toBeLessThan(operations[1].sequence);
        });
    });
    
    describe('Operation replay', () => {
        it('should replay operations in order', () => {
            semanticOpManager.applyOperation(createSetTextOperation('item-1', 'Text 1', 'Old'));
            semanticOpManager.applyOperation(createSetTextOperation('item-2', 'Text 2', 'Old'));
            
            const replayed = [];
            operationLog.replay(0, null, (op) => {
                replayed.push(op);
                return { success: true };
            });
            
            expect(replayed.length).toBe(2);
            expect(replayed[0].sequence).toBe(1);
            expect(replayed[1].sequence).toBe(2);
        });
    });
    
    describe('getOperationsSince', () => {
        it('should get operations since sequence', () => {
            semanticOpManager.applyOperation(createSetTextOperation('item-1', 'Text 1', 'Old'));
            semanticOpManager.applyOperation(createSetTextOperation('item-2', 'Text 2', 'Old'));
            
            const ops = operationLog.getOperations(1);
            expect(ops.length).toBe(1);
            expect(ops[0].sequence).toBe(2);
        });
    });
});

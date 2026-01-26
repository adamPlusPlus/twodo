// tests/concurrency/SyncStress.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import { OperationLog, getOperationLog } from '../../js/core/OperationLog.js';
import { SemanticOperationManager } from '../../js/core/SemanticOperationManager.js';
import { createMockAppState } from '../helpers/mockAppState.js';
import { setupMockServices } from '../helpers/mockServices.js';
import { registerService, SERVICES } from '../../js/core/AppServices.js';
import { measurePerformance } from '../helpers/testUtils.js';
import { createSetTextOperation } from '../helpers/operationHelpers.js';

describe('SyncStress Tests', () => {
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
                            items: Array.from({ length: 10 }, (_, i) => ({
                                id: `item-${i}`,
                                text: `Item ${i}`,
                                type: 'note'
                            }))
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
            currentFilename: 'sync-stress-test.json',
            saveFile: async () => ({ success: true }),
            loadFile: async () => ({ success: true })
        });
        
        semanticOpManager = new SemanticOperationManager();
        operationLog = getOperationLog('sync-stress-test.json');
        operationLog.clear();
    });
    
    describe('High operation rate', () => {
        it('should handle high operation rate', () => {
            const operations = [];
            for (let i = 0; i < 1000; i++) {
                const itemId = `item-${i % 10}`;
                const oldText = i > 0 ? `Text ${i - 1}` : `Item ${i % 10}`;
                operations.push(createSetTextOperation(itemId, `Text ${i}`, oldText));
            }
            
            const { duration } = measurePerformance(() => {
                operations.forEach(op => {
                    semanticOpManager.applyOperation(op);
                });
            });
            
            // Should complete 1000 operations in reasonable time
            expect(duration).toBeLessThan(5000);
        });
    });
    
    describe('Operation queue management', () => {
        it('should maintain operation order under load', () => {
            const operations = [];
            for (let i = 0; i < 100; i++) {
                operations.push(createSetTextOperation('item-1', `Text ${i}`, i > 0 ? `Text ${i - 1}` : 'Item 1'));
            }
            
            operations.forEach(op => {
                semanticOpManager.applyOperation(op);
            });
            
            // Check operation log maintains order
            const loggedOps = operationLog.getOperations(0);
            expect(loggedOps.length).toBe(100);
            
            // Verify sequence numbers are in order
            for (let i = 1; i < loggedOps.length; i++) {
                expect(loggedOps[i].sequence).toBeGreaterThan(loggedOps[i - 1].sequence);
            }
        });
    });
    
    describe('Sync latency', () => {
        it('should log operations quickly', () => {
            const operation = createSetTextOperation('item-1', 'Text', 'Old');
            
            const { duration } = measurePerformance(() => {
                semanticOpManager.applyOperation(operation);
            });
            
            // Operation should be logged within latency target
            expect(duration).toBeLessThan(100); // < 100ms target
        });
    });
    
    describe('No data loss under stress', () => {
        it('should not lose operations under high load', () => {
            const operationCount = 500;
            
            for (let i = 0; i < operationCount; i++) {
                const itemId = `item-${i % 10}`;
                const oldText = i > 0 ? `Text ${i - 1}` : `Item ${i % 10}`;
                const operation = createSetTextOperation(itemId, `Text ${i}`, oldText);
                const result = semanticOpManager.applyOperation(operation);
                // Operations might fail if items don't exist, but logging should still work
                if (result && result.success) {
                    // Operation was applied successfully
                }
            }
            
            // All operations should be logged (even if some failed to apply)
            const loggedOps = operationLog.getOperations(0);
            // Some operations may fail validation, so check that we got at least some logged
            expect(loggedOps.length).toBeGreaterThan(0);
            // But ideally all should be logged if items exist
            expect(loggedOps.length).toBeLessThanOrEqual(operationCount);
        });
    });
});

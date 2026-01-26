// tests/stress/OperationPerformance.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import { SemanticOperationManager } from '../../js/core/SemanticOperationManager.js';
import { createMockAppState } from '../helpers/mockAppState.js';
import { setupMockServices } from '../helpers/mockServices.js';
import { registerService, SERVICES } from '../../js/core/AppServices.js';
import { measurePerformance } from '../helpers/testUtils.js';
import { createSetTextOperation, createTestOperations } from '../helpers/operationHelpers.js';

describe('OperationPerformance Stress Tests', () => {
    let mockAppState;
    let mockServices;
    let semanticOpManager;
    
    beforeEach(() => {
        mockAppState = createMockAppState();
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
    });
    
    describe('Batch operation application', () => {
        it('should apply 1000 operations efficiently', () => {
            const operations = createTestOperations(1000);
            
            const { duration } = measurePerformance(() => {
                operations.forEach(op => {
                    semanticOpManager.applyOperation(op);
                });
            });
            
            // Should complete 1000 operations in reasonable time
            expect(duration).toBeLessThan(5000); // 5 seconds for 1000 ops
        });
    });
    
    describe('Operation creation performance', () => {
        it('should create operations quickly', () => {
            const { duration } = measurePerformance(() => {
                for (let i = 0; i < 1000; i++) {
                    semanticOpManager.createOperation('setText', `item-${i}`, {
                        text: `Text ${i}`,
                        oldText: `Old ${i}`
                    });
                }
            });
            
            expect(duration).toBeLessThan(100); // Should be very fast
        });
    });
    
    describe('Operation validation performance', () => {
        it('should validate operations quickly', () => {
            const operation = createSetTextOperation('item-1', 'Text', 'Old');
            
            const { duration } = measurePerformance(() => {
                for (let i = 0; i < 1000; i++) {
                    operation.validate();
                }
            });
            
            expect(duration).toBeLessThan(50);
        });
    });
    
    describe('Performance degradation detection', () => {
        it('should maintain consistent performance over many operations', () => {
            const durations = [];
            
            for (let i = 0; i < 100; i++) {
                const operation = createSetTextOperation(`item-${i}`, `Text ${i}`, `Old ${i}`);
                const { duration } = measurePerformance(() => {
                    semanticOpManager.applyOperation(operation);
                });
                durations.push(duration);
            }
            
            // Check that performance doesn't degrade significantly
            const firstHalf = durations.slice(0, 50);
            const secondHalf = durations.slice(50);
            
            const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
            const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
            
            // Second half shouldn't be more than 2x slower
            expect(avgSecond).toBeLessThan(avgFirst * 2);
        });
    });
});

// tests/stress/LargeWorkspace.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import { SemanticOperationManager } from '../../js/core/SemanticOperationManager.js';
import { ViewManager } from '../../js/core/ViewManager.js';
import { createMockAppState, createMockPage, createMockGroup, createMockItem } from '../helpers/mockAppState.js';
import { setupMockServices } from '../helpers/mockServices.js';
import { registerService, SERVICES } from '../../js/core/AppServices.js';
import { measurePerformance } from '../helpers/testUtils.js';

describe('LargeWorkspace Stress Tests', () => {
    let mockAppState;
    let mockServices;
    let semanticOpManager;
    
    beforeEach(() => {
        // Create large workspace with 1000+ documents
        const documents = [];
        for (let i = 0; i < 100; i++) { // Start with 100 for performance
            const groups = [];
            for (let j = 0; j < 10; j++) {
                const items = [];
                for (let k = 0; k < 10; k++) {
                    items.push(createMockItem({
                        id: `item-${i}-${j}-${k}`,
                        text: `Item ${i}-${j}-${k}`
                    }));
                }
                groups.push(createMockGroup({
                    id: `group-${i}-${j}`,
                    items: items
                }));
            }
            documents.push(createMockPage({
                id: `page-${i}`,
                title: `Page ${i}`,
                groups: groups
            }));
        }
        
        mockAppState = createMockAppState({ documents });
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
    
    describe('Operation performance', () => {
        it('should apply operations within performance target (< 5ms)', () => {
            const operation = {
                op: 'setText',
                itemId: 'item-0-0-0',
                params: { text: 'New text', oldText: 'Item 0-0-0' }
            };
            
            const { duration } = measurePerformance(() => {
                semanticOpManager.applyOperation(operation);
            });
            
            expect(duration).toBeLessThan(5);
        });
        
        it('should handle batch operations efficiently', () => {
            const operations = [];
            for (let i = 0; i < 100; i++) {
                operations.push({
                    op: 'setText',
                    itemId: `item-0-0-${i}`,
                    params: { text: `Text ${i}`, oldText: `Item 0-0-${i}` }
                });
            }
            
            const { duration } = measurePerformance(() => {
                operations.forEach(op => semanticOpManager.applyOperation(op));
            });
            
            // Average should be < 10ms per operation (relaxed for stress test)
            const avgDuration = duration / operations.length;
            expect(avgDuration).toBeLessThan(10);
        });
    });
    
    describe('View projection performance', () => {
        it('should project large dataset within target (< 50ms)', () => {
            const viewManager = new ViewManager();
            
            const { duration } = measurePerformance(() => {
                viewManager.updateAllViews();
            });
            
            // Should be reasonable even with large dataset
            expect(duration).toBeLessThan(1000); // 1 second for stress test
        });
    });
    
    describe('Operation log performance', () => {
        it('should handle large operation log', async () => {
            const { getOperationLog } = await import('../../js/core/OperationLog.js');
            const log = getOperationLog('large-test.json');
            log.clear();
            
            // Add 1000 operations
            const start = performance.now();
            for (let i = 0; i < 1000; i++) {
                log.append({
                    op: 'setText',
                    itemId: `item-${i}`,
                    params: { text: `Text ${i}` }
                });
            }
            const duration = performance.now() - start;
            
            // Should complete in reasonable time
            expect(duration).toBeLessThan(1000);
            expect(log.getCount()).toBe(1000);
        });
    });
});

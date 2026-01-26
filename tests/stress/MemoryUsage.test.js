// tests/stress/MemoryUsage.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import { SemanticOperationManager } from '../../js/core/SemanticOperationManager.js';
import { OperationLog, getOperationLog } from '../../js/core/OperationLog.js';
import { ViewManager } from '../../js/core/ViewManager.js';
import { createMockAppState } from '../helpers/mockAppState.js';
import { setupMockServices } from '../helpers/mockServices.js';
import { registerService, SERVICES } from '../../js/core/AppServices.js';

describe('MemoryUsage Stress Tests', () => {
    let mockAppState;
    let mockServices;
    
    beforeEach(() => {
        mockAppState = createMockAppState();
        mockServices = setupMockServices({ appState: mockAppState });
        registerService(SERVICES.APP_STATE, mockAppState);
        registerService(SERVICES.EVENT_BUS, mockServices.eventBus);
        registerService(SERVICES.AUTHORITY_MANAGER, mockServices.authorityManager);
    });
    
    describe('Operation history size limits', () => {
        it('should limit operation history size', () => {
            const manager = new SemanticOperationManager();
            
            // Add more than maxHistorySize operations
            for (let i = 0; i < 1100; i++) {
                const operation = {
                    op: 'setText',
                    itemId: `item-${i}`,
                    params: { text: `Text ${i}`, oldText: `Old ${i}` }
                };
                manager.applyOperation(operation);
            }
            
            const history = manager.getHistory();
            expect(history.length).toBeLessThanOrEqual(manager.maxHistorySize);
        });
    });
    
    describe('Operation log size limits', () => {
        it('should limit operation log size', () => {
            const log = getOperationLog('memory-test.json', 100);
            log.clear();
            
            // Add more than maxOperations
            for (let i = 0; i < 150; i++) {
                log.append({
                    op: 'setText',
                    itemId: `item-${i}`,
                    params: { text: `Text ${i}` }
                });
            }
            
            expect(log.getCount()).toBeLessThanOrEqual(100);
        });
    });
    
    describe('View projection memory', () => {
        it('should cleanup views on destruction', () => {
            const viewManager = new ViewManager();
            const views = [];
            
            // Create many views
            for (let i = 0; i < 100; i++) {
                const view = {
                    viewId: `view-${i}`,
                    pageId: 'page-1',
                    isActive: true,
                    setPageId: (pageId) => { view.pageId = pageId; },
                    destroy: () => {}
                };
                viewManager.registerView(view, 'page-1');
                views.push(view);
            }
            
            expect(viewManager.getViewCount()).toBe(100);
            
            // Destroy all views
            views.forEach(view => viewManager.unregisterView(view.viewId));
            
            expect(viewManager.getViewCount()).toBe(0);
        });
    });
});

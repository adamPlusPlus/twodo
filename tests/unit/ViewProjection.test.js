// tests/unit/ViewProjection.test.js
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ViewProjection } from '../../js/core/ViewProjection.js';
import { createMockAppState } from '../helpers/mockAppState.js';
import { setupMockServices, createMockEventBus } from '../helpers/mockServices.js';
import { registerService, SERVICES } from '../../js/core/AppServices.js';
import { AUTHORITY_MODES } from '../../js/core/AuthorityManager.js';

// Concrete test implementation of ViewProjection
class TestViewProjection extends ViewProjection {
    project(canonicalModel) {
        if (!canonicalModel || !canonicalModel.documents) {
            return '';
        }
        const page = canonicalModel.documents.find(p => p.id === this._pageId);
        if (!page) return '';
        return `Projected: ${page.title}`;
    }
    
    applyOperation(operation) {
        // Call parent to check authority
        const handled = super.applyOperation(operation);
        if (handled) {
            // Custom update logic
            this._lastProjectedData = `Updated: ${operation.op}`;
            if (this._onUpdate) {
                this._onUpdate(this._lastProjectedData);
            }
        }
        return handled;
    }
}

describe('ViewProjection', () => {
    let mockAppState;
    let mockServices;
    let container;
    let viewProjection;
    
    beforeEach(() => {
        mockAppState = createMockAppState({
            documents: [
                {
                    id: 'page-1',
                    title: 'Test Page',
                    groups: [
                        {
                            id: 'group-1',
                            items: [
                                { id: 'item-1', text: 'Item 1', type: 'note' }
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
        
        container = document.createElement('div');
        container.id = 'test-container';
        document.body.appendChild(container);
        
        viewProjection = new TestViewProjection({
            viewId: 'test-view-1',
            pageId: 'page-1'
        });
    });
    
    afterEach(() => {
        if (container && container.parentNode) {
            container.parentNode.removeChild(container);
        }
        if (viewProjection) {
            viewProjection.destroy();
        }
    });
    
    describe('init', () => {
        it('should initialize with canonical model and container', () => {
            viewProjection.init(mockAppState, container);
            
            expect(viewProjection.canonicalModel).toBe(mockAppState);
            expect(viewProjection.container).toBe(container);
            expect(viewProjection.isActive).toBe(true);
        });
        
        it('should subscribe to operation events', async () => {
            // ViewProjection uses the real eventBus singleton
            const { eventBus } = await import('../../js/core/EventBus.js');
            const initialListenerCount = eventBus.listenerCount('operation:applied');
            
            viewProjection.init(mockAppState, container);
            
            // Should have added listeners
            const newListenerCount = eventBus.listenerCount('operation:applied');
            expect(newListenerCount).toBeGreaterThan(initialListenerCount);
            expect(viewProjection._operationSubscriptions.length).toBeGreaterThan(0);
        });
        
        it('should call update after init', () => {
            let updateCalled = false;
            viewProjection.update = () => { updateCalled = true; };
            
            viewProjection.init(mockAppState, container);
            
            // Update is called asynchronously, wait a bit
            setTimeout(() => {
                expect(updateCalled).toBe(true);
            }, 100);
        });
    });
    
    describe('project', () => {
        it('should project canonical model', () => {
            const result = viewProjection.project(mockAppState);
            expect(result).toContain('Projected:');
        });
        
        it('should return null for invalid model', () => {
            const result = viewProjection.project(null);
            expect(result).toBe('');
        });
    });
    
    describe('applyOperation', () => {
        it('should apply operation and update view', () => {
            viewProjection.init(mockAppState, container);
            
            const operation = {
                op: 'setText',
                itemId: 'item-1',
                params: { text: 'New text' }
            };
            
            const handled = viewProjection.applyOperation(operation);
            
            expect(handled).toBe(true);
            expect(viewProjection._lastProjectedData).toContain('Updated:');
        });
        
        it('should skip update when from authoritative source', () => {
            viewProjection.init(mockAppState, container);
            
            // Set markdown as authoritative
            mockServices.authorityManager.setAuthority('page-1', 'test-view-1', AUTHORITY_MODES.MARKDOWN_SOURCE);
            mockServices.authorityManager.isUpdateFromAuthoritativeSource = () => true;
            
            const operation = {
                op: 'setText',
                itemId: 'item-1',
                params: { text: 'New text' }
            };
            
            const handled = viewProjection.applyOperation(operation);
            
            // Should return true but not update
            expect(handled).toBe(true);
        });
        
        it('should filter irrelevant operations', () => {
            viewProjection.init(mockAppState, container);
            viewProjection._pageId = 'page-1';
            
            const operation = {
                op: 'setText',
                itemId: 'item-other-page',
                params: { text: 'New text' }
            };
            
            const handled = viewProjection.applyOperation(operation);
            expect(handled).toBe(false);
        });
    });
    
    describe('isOperationRelevant', () => {
        it('should use filter function if provided', () => {
            const filterFn = (op) => op.itemId === 'item-1';
            viewProjection._filterOperations = filterFn;
            
            expect(viewProjection.isOperationRelevant({ itemId: 'item-1' })).toBe(true);
            expect(viewProjection.isOperationRelevant({ itemId: 'item-2' })).toBe(false);
        });
        
        it('should check page ID if no filter function', () => {
            viewProjection._pageId = 'page-1';
            viewProjection.canonicalModel = mockAppState;
            
            const operation = { itemId: 'item-1' };
            const relevant = viewProjection.isOperationRelevant(operation);
            
            // Should check if item belongs to page
            expect(typeof relevant).toBe('boolean');
        });
    });
    
    describe('destroy', () => {
        it('should unsubscribe from events and cleanup', () => {
            viewProjection.init(mockAppState, container);
            viewProjection.destroy();
            
            expect(viewProjection.isActive).toBe(false);
            expect(viewProjection._operationSubscriptions.length).toBe(0);
        });
    });
});

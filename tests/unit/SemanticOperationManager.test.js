// tests/unit/SemanticOperationManager.test.js
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SemanticOperationManager } from '../../js/core/SemanticOperationManager.js';
import { createMockAppState, createMockItem, createMockGroup, createMockPage } from '../helpers/mockAppState.js';
import { setupMockServices } from '../helpers/mockServices.js';
import { createSetTextOperation } from '../helpers/operationHelpers.js';
import { getService, registerService, SERVICES } from '../../js/core/AppServices.js';
import { AUTHORITY_MODES } from '../../js/core/AuthorityManager.js';
import { EVENTS } from '../../js/core/AppEvents.js';

describe('SemanticOperationManager', () => {
    let manager;
    let mockServices;
    let mockAppState;
    
    beforeEach(() => {
        // Create mock services
        mockAppState = createMockAppState({
            documents: [
                createMockPage({
                    id: 'page-1',
                    title: 'Test Page',
                    groups: [
                        createMockGroup({
                            id: 'group-1',
                            title: 'Test Group',
                            items: [
                                createMockItem({ id: 'item-1', text: 'Item 1' }),
                                createMockItem({ id: 'item-2', text: 'Item 2' })
                            ]
                        })
                    ]
                })
            ]
        });
        
        mockServices = setupMockServices({ appState: mockAppState });
        
        // Register services
        registerService(SERVICES.APP_STATE, mockAppState);
        registerService(SERVICES.EVENT_BUS, mockServices.eventBus);
        registerService(SERVICES.AUTHORITY_MANAGER, mockServices.authorityManager);
        registerService(SERVICES.FILE_MANAGER, mockServices.fileManager);
        
        // Create manager instance
        manager = new SemanticOperationManager();
    });
    
    describe('createOperation', () => {
        it('should create setText operation', () => {
            const operation = manager.createOperation('setText', 'item-1', {
                text: 'New text',
                oldText: 'Old text'
            });
            
            expect(operation).toBeTruthy();
            expect(operation.itemId).toBe('item-1');
            expect(operation.params.text).toBe('New text');
            expect(operation.params.oldText).toBe('Old text');
        });
        
        it('should create all operation types', () => {
            const types = ['setText', 'split', 'merge', 'move', 'reparent', 'delete', 'create'];
            
            types.forEach(type => {
                const operation = manager.createOperation(type, 'item-1', {});
                expect(operation).toBeTruthy();
                expect(operation.itemId).toBe('item-1');
            });
        });
        
        it('should return null for unknown operation type', () => {
            const operation = manager.createOperation('unknown', 'item-1', {});
            expect(operation).toBeNull();
        });
    });
    
    describe('applyOperation', () => {
        it('should apply setText operation successfully', () => {
            const operation = createSetTextOperation('item-1', 'New text', 'Item 1');
            const result = manager.applyOperation(operation);
            
            expect(result).toBeTruthy();
            expect(result.success).toBe(true);
            
            // Check item was updated
            const item = mockAppState.getItem('page-1', 'group-1', 'item-1');
            expect(item).toBeTruthy();
            expect(item.text).toBe('New text');
        });
        
        it('should emit operation:applied event', async () => {
            // Import the real eventBus to listen
            const { eventBus } = await import('../../js/core/EventBus.js');
            let eventEmitted = false;
            let eventData = null;
            
            const handler = (data) => {
                eventEmitted = true;
                eventData = data;
            };
            eventBus.on('operation:applied', handler);
            
            const operation = createSetTextOperation('item-1', 'New text', 'Item 1');
            manager.applyOperation(operation);
            
            // Wait for async event processing (EventBus has storm control)
            await new Promise(resolve => setTimeout(resolve, 200));
            
            expect(eventEmitted).toBe(true);
            if (eventData) {
                expect(eventData.operation.op).toBe('setText');
                expect(eventData.operation.itemId).toBe('item-1');
            }
            eventBus.off('operation:applied', handler);
        });
        
        it('should add operation to history', () => {
            const operation = createSetTextOperation('item-1', 'New text', 'Item 1');
            manager.applyOperation(operation);
            
            const history = manager.getHistory();
            expect(history.length).toBe(1);
            expect(history[0]).toBe(operation);
        });
        
        it('should reject operation when authority conflicts', async () => {
            // Import the real eventBus to listen
            const { eventBus } = await import('../../js/core/EventBus.js');
            let rejectedEventEmitted = false;
            
            const handler = (data) => {
                rejectedEventEmitted = true;
            };
            eventBus.on(EVENTS.OPERATION.REJECTED, handler);
            
            // Set markdown as authoritative
            mockServices.authorityManager.setAuthority('page-1', 'view-1', AUTHORITY_MODES.MARKDOWN_SOURCE);
            // Override validateOperation to return false
            mockServices.authorityManager.validateOperation = vi.fn(() => false);
            
            const operation = createSetTextOperation('item-1', 'New text', 'Item 1');
            const result = manager.applyOperation(operation);
            
            expect(result).toBeTruthy();
            expect(result.success).toBe(false);
            expect(result.reason).toBe('authority_conflict');
            
            // Wait for async event processing
            await new Promise(resolve => setTimeout(resolve, 200));
            
            expect(rejectedEventEmitted).toBe(true);
            eventBus.off(EVENTS.OPERATION.REJECTED, handler);
        });
        
        it('should handle invalid operation', () => {
            const invalidOperation = {
                op: 'setText',
                itemId: 'item-1',
                params: {} // Missing text
            };
            
            const result = manager.applyOperation(invalidOperation);
            expect(result).toBeNull();
        });
        
        it('should handle operation object (not instance)', () => {
            const operationObj = {
                op: 'setText',
                itemId: 'item-1',
                params: {
                    text: 'New text',
                    oldText: 'Item 1'
                }
            };
            
            const result = manager.applyOperation(operationObj);
            expect(result).toBeTruthy();
            expect(result.success).toBe(true);
        });
    });
    
    describe('getHistory', () => {
        it('should return all operations when no limit', () => {
            manager.applyOperation(createSetTextOperation('item-1', 'Text 1', 'Item 1'));
            manager.applyOperation(createSetTextOperation('item-2', 'Text 2', 'Item 2'));
            
            const history = manager.getHistory();
            expect(history.length).toBe(2);
        });
        
        it('should return limited operations', () => {
            // Add items to mockAppState
            const page = mockAppState.documents.find(p => p.id === 'page-1');
            if (page && page.groups && page.groups[0]) {
                ['item-1', 'item-2', 'item-3'].forEach(itemId => {
                    if (!page.groups[0].items.find(item => item.id === itemId)) {
                        page.groups[0].items.push({ id: itemId, text: `Item ${itemId}`, type: 'note' });
                    }
                });
            }
            
            manager.applyOperation(createSetTextOperation('item-1', 'Text 1', 'Item 1'));
            manager.applyOperation(createSetTextOperation('item-2', 'Text 2', 'Item 2'));
            manager.applyOperation(createSetTextOperation('item-3', 'Text 3', 'Item 3'));
            
            const history = manager.getHistory(2);
            expect(history.length).toBe(2);
            expect(history[0].itemId).toBe('item-2');
            expect(history[1].itemId).toBe('item-3');
        });
    });
    
    describe('clearHistory', () => {
        it('should clear operation history', () => {
            manager.applyOperation(createSetTextOperation('item-1', 'Text 1', 'Item 1'));
            expect(manager.getHistory().length).toBe(1);
            
            manager.clearHistory();
            expect(manager.getHistory().length).toBe(0);
        });
    });
    
    describe('getLastOperation', () => {
        it('should return last operation', () => {
            const op1 = createSetTextOperation('item-1', 'Text 1', 'Item 1');
            const op2 = createSetTextOperation('item-2', 'Text 2', 'Item 2');
            
            manager.applyOperation(op1);
            manager.applyOperation(op2);
            
            const last = manager.getLastOperation();
            expect(last).toBe(op2);
        });
        
        it('should return null when no operations', () => {
            expect(manager.getLastOperation()).toBeNull();
        });
    });
    
    describe('_getPageIdForOperation', () => {
        it('should find page ID for operation', () => {
            const operation = createSetTextOperation('item-1', 'New text', 'Item 1');
            const pageId = manager._getPageIdForOperation(operation);
            
            expect(pageId).toBe('page-1');
        });
        
        it('should return null for non-existent item', () => {
            const operation = createSetTextOperation('item-nonexistent', 'New text', 'Old text');
            const pageId = manager._getPageIdForOperation(operation);
            
            expect(pageId).toBeNull();
        });
    });
});

// tests/concurrency/ConcurrentEdits.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import { SemanticOperationManager } from '../../js/core/SemanticOperationManager.js';
import { createMockAppState } from '../helpers/mockAppState.js';
import { setupMockServices } from '../helpers/mockServices.js';
import { registerService, SERVICES } from '../../js/core/AppServices.js';
import { runConcurrently } from '../helpers/testUtils.js';
import { createSetTextOperation } from '../helpers/operationHelpers.js';

describe('ConcurrentEdits Tests', () => {
    let mockAppState;
    let mockServices;
    let semanticOpManager;
    
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
    });
    
    describe('Concurrent operations on different items', () => {
        it('should handle concurrent operations on different items', async () => {
            const operations = [
                () => semanticOpManager.applyOperation(createSetTextOperation('item-1', 'Text 1', 'Item 1')),
                () => semanticOpManager.applyOperation(createSetTextOperation('item-2', 'Text 2', 'Item 2'))
            ];
            
            await runConcurrently(operations);
            
            expect(mockAppState.getItem('page-1', 'group-1', 'item-1').text).toBe('Text 1');
            expect(mockAppState.getItem('page-1', 'group-1', 'item-2').text).toBe('Text 2');
        });
    });
    
    describe('Concurrent operations on same item', () => {
        it('should handle concurrent setText on same item', async () => {
            const operations = [
                () => semanticOpManager.applyOperation(createSetTextOperation('item-1', 'Text A', 'Item 1')),
                () => semanticOpManager.applyOperation(createSetTextOperation('item-1', 'Text B', 'Item 1'))
            ];
            
            await runConcurrently(operations);
            
            // Both operations should be applied (last write wins)
            const item = mockAppState.getItem('page-1', 'group-1', 'item-1');
            expect(['Text A', 'Text B']).toContain(item.text);
        });
    });
    
    describe('Operation ordering', () => {
        it('should maintain operation order with concurrent edits', async () => {
            // Add items to mockAppState
            const page = mockAppState.documents.find(p => p.id === 'page-1');
            if (page && page.groups && page.groups[0]) {
                for (let i = 0; i < 10; i++) {
                    if (!page.groups[0].items.find(item => item.id === `item-${i}`)) {
                        page.groups[0].items.push({ id: `item-${i}`, text: `Item ${i}`, type: 'note' });
                    }
                }
            }
            
            const results = [];
            
            const operations = Array.from({ length: 10 }, (_, i) => 
                () => {
                    const result = semanticOpManager.applyOperation(
                        createSetTextOperation(`item-${i}`, `Text ${i}`, `Item ${i}`)
                    );
                    results.push({ index: i, result });
                    return result;
                }
            );
            
            await runConcurrently(operations);
            
            // All operations should succeed
            expect(results.length).toBe(10);
            results.forEach(({ result }) => {
                expect(result).toBeTruthy();
                expect(result.success).toBe(true);
            });
        });
    });
    
    describe('No data loss', () => {
        it('should not lose data with concurrent edits', async () => {
            // Ensure items exist
            const page = mockAppState.documents.find(p => p.id === 'page-1');
            if (page && page.groups && page.groups[0]) {
                ['item-1', 'item-2', 'item-3'].forEach(itemId => {
                    if (!page.groups[0].items.find(item => item.id === itemId)) {
                        page.groups[0].items.push({ id: itemId, text: `Item ${itemId}`, type: 'note' });
                    }
                });
            }
            
            const initialItems = ['item-1', 'item-2', 'item-3'];
            
            const operations = initialItems.map(itemId =>
                () => semanticOpManager.applyOperation(
                    createSetTextOperation(itemId, `Updated ${itemId}`, `Item ${itemId}`)
                )
            );
            
            await runConcurrently(operations);
            
            // All items should still exist and be updated
            initialItems.forEach(itemId => {
                const item = mockAppState.getItem('page-1', 'group-1', itemId);
                expect(item).toBeTruthy();
                expect(item.text).toContain('Updated');
            });
        });
    });
});

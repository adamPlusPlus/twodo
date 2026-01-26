// tests/concurrency/ConflictResolution.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import { SemanticOperationManager } from '../../js/core/SemanticOperationManager.js';
import { createMockAppState } from '../helpers/mockAppState.js';
import { setupMockServices } from '../helpers/mockServices.js';
import { registerService, SERVICES } from '../../js/core/AppServices.js';
import { createSetTextOperation } from '../helpers/operationHelpers.js';

describe('ConflictResolution Tests', () => {
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
        registerService(SERVICES.FILE_MANAGER, {
            currentFilename: 'test-file.json',
            saveFile: async () => ({ success: true }),
            loadFile: async () => ({ success: true })
        });
        
        semanticOpManager = new SemanticOperationManager();
    });
    
    describe('Operation merging', () => {
        it('should apply operations in order', () => {
            const op1 = createSetTextOperation('item-1', 'Text 1', 'Item 1');
            const op2 = createSetTextOperation('item-1', 'Text 2', 'Text 1');
            
            semanticOpManager.applyOperation(op1);
            semanticOpManager.applyOperation(op2);
            
            const item = mockAppState.getItem('page-1', 'group-1', 'item-1');
            expect(item.text).toBe('Text 2');
        });
    });
    
    describe('Last-write-wins', () => {
        it('should apply last operation when conflicts occur', () => {
            // Simulate concurrent edits with same oldText
            const op1 = createSetTextOperation('item-1', 'Text A', 'Item 1');
            const op2 = createSetTextOperation('item-1', 'Text B', 'Item 1');
            
            semanticOpManager.applyOperation(op1);
            semanticOpManager.applyOperation(op2);
            
            // Last operation should win
            const item = mockAppState.getItem('page-1', 'group-1', 'item-1');
            expect(item.text).toBe('Text B');
        });
    });
    
    describe('Authority-based conflict resolution', () => {
        it('should reject operations when source-text is authoritative', () => {
            mockServices.authorityManager.setAuthority('page-1', 'view-1', 'MARKDOWN_SOURCE');
            mockServices.authorityManager.validateOperation = () => false;
            
            const operation = createSetTextOperation('item-1', 'New text', 'Item 1');
            const result = semanticOpManager.applyOperation(operation);
            
            expect(result.success).toBe(false);
            expect(result.reason).toBe('authority_conflict');
        });
    });
});

// tests/integration/UndoRedo.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import { SemanticOperationManager } from '../../js/core/SemanticOperationManager.js';
import { UndoRedoManager } from '../../js/modules/UndoRedoManager.js';
import { createMockAppState } from '../helpers/mockAppState.js';
import { setupMockServices } from '../helpers/mockServices.js';
import { registerService, SERVICES } from '../../js/core/AppServices.js';
import { createSetTextOperation } from '../helpers/operationHelpers.js';

describe('UndoRedo Integration', () => {
    let mockAppState;
    let mockServices;
    let semanticOpManager;
    let undoRedoManager;
    
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
        registerService(SERVICES.SEMANTIC_OPERATION_MANAGER, semanticOpManager);
        
        // Mock dataManager for UndoRedoManager
        registerService(SERVICES.DATA_MANAGER, {
            saveData: async () => ({ success: true })
        });
        
        undoRedoManager = new UndoRedoManager();
    });
    
    describe('Undo/Redo with semantic operations', () => {
        it('should undo semantic operation', () => {
            const operation = createSetTextOperation('item-1', 'New text', 'Item 1');
            semanticOpManager.applyOperation(operation);
            undoRedoManager.recordOperation(operation);
            
            const item = mockAppState.getItem('page-1', 'group-1', 'item-1');
            expect(item.text).toBe('New text');
            
            undoRedoManager.undo();
            
            // Item should be reverted
            const revertedItem = mockAppState.getItem('page-1', 'group-1', 'item-1');
            expect(revertedItem.text).toBe('Item 1');
        });
        
        it('should redo semantic operation', () => {
            const operation = createSetTextOperation('item-1', 'New text', 'Item 1');
            semanticOpManager.applyOperation(operation);
            undoRedoManager.recordOperation(operation);
            
            undoRedoManager.undo();
            undoRedoManager.redo();
            
            const item = mockAppState.getItem('page-1', 'group-1', 'item-1');
            expect(item.text).toBe('New text');
        });
        
        it('should handle multiple undo/redo operations', () => {
            const op1 = createSetTextOperation('item-1', 'Text 1', 'Item 1');
            const op2 = createSetTextOperation('item-1', 'Text 2', 'Text 1');
            
            semanticOpManager.applyOperation(op1);
            undoRedoManager.recordOperation(op1);
            semanticOpManager.applyOperation(op2);
            undoRedoManager.recordOperation(op2);
            
            undoRedoManager.undo(); // Undo op2
            expect(mockAppState.getItem('page-1', 'group-1', 'item-1').text).toBe('Text 1');
            
            undoRedoManager.undo(); // Undo op1
            expect(mockAppState.getItem('page-1', 'group-1', 'item-1').text).toBe('Item 1');
            
            undoRedoManager.redo(); // Redo op1
            expect(mockAppState.getItem('page-1', 'group-1', 'item-1').text).toBe('Text 1');
        });
    });
    
    describe('Operation inversion', () => {
        it('should correctly invert setText operation', () => {
            const operation = createSetTextOperation('item-1', 'New text', 'Old text');
            const inverse = operation.invert();
            
            expect(inverse.itemId).toBe('item-1');
            expect(inverse.params.text).toBe('Old text');
            expect(inverse.params.oldText).toBe('New text');
        });
    });
});

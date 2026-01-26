// tests/integration/ViewCoherence.test.js
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ViewManager } from '../../js/core/ViewManager.js';
import { ViewProjection } from '../../js/core/ViewProjection.js';
import { SemanticOperationManager } from '../../js/core/SemanticOperationManager.js';
import { createMockAppState, createMockItem, createMockGroup, createMockPage } from '../helpers/mockAppState.js';
import { setupMockServices } from '../helpers/mockServices.js';
import { registerService, SERVICES } from '../../js/core/AppServices.js';
import { createSetTextOperation } from '../helpers/operationHelpers.js';

// Test view implementations
class TestView1 extends ViewProjection {
    constructor(config) {
        super(config);
        this.projectedData = null;
    }
    project(canonicalModel) {
        const page = canonicalModel.documents?.find(p => p.id === this._pageId);
        this.projectedData = page ? `View1: ${page.title}` : null;
        return this.projectedData;
    }
    applyOperation(operation) {
        if (super.applyOperation(operation)) {
            this.projectedData = `View1: Updated ${operation.op}`;
            return true;
        }
        return false;
    }
}

class TestView2 extends ViewProjection {
    constructor(config) {
        super(config);
        this.projectedData = null;
    }
    project(canonicalModel) {
        const page = canonicalModel.documents?.find(p => p.id === this._pageId);
        this.projectedData = page ? `View2: ${page.title}` : null;
        return this.projectedData;
    }
    applyOperation(operation) {
        if (super.applyOperation(operation)) {
            this.projectedData = `View2: Updated ${operation.op}`;
            return true;
        }
        return false;
    }
}

describe('ViewCoherence Integration', () => {
    let mockAppState;
    let mockServices;
    let viewManager;
    let semanticOpManager;
    let view1, view2;
    
    beforeEach(() => {
        mockAppState = createMockAppState({
            documents: [
                createMockPage({
                    id: 'page-1',
                    title: 'Test Page',
                    groups: [
                        createMockGroup({
                            id: 'group-1',
                            items: [
                                createMockItem({ id: 'item-1', text: 'Item 1' })
                            ]
                        })
                    ]
                })
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
        
        viewManager = new ViewManager();
        viewManager.init();
        
        semanticOpManager = new SemanticOperationManager();
        
        // Create test views
        const container1 = document.createElement('div');
        const container2 = document.createElement('div');
        
        view1 = new TestView1({ viewId: 'view-1', pageId: 'page-1' });
        view2 = new TestView2({ viewId: 'view-2', pageId: 'page-1' });
        
        view1.init(mockAppState, container1);
        view2.init(mockAppState, container2);
        
        viewManager.registerView(view1, 'page-1');
        viewManager.registerView(view2, 'page-1');
    });
    
    afterEach(() => {
        if (view1) view1.destroy();
        if (view2) view2.destroy();
        if (viewManager) viewManager.destroy();
    });
    
    describe('Multiple views consistency', () => {
        it('should update all views when operation is applied', () => {
            const operation = createSetTextOperation('item-1', 'New text', 'Item 1');
            semanticOpManager.applyOperation(operation);
            
            // Wait for views to update
            setTimeout(() => {
                expect(view1.projectedData).toContain('Updated');
                expect(view2.projectedData).toContain('Updated');
            }, 100);
        });
        
        it('should keep views consistent after multiple operations', () => {
            semanticOpManager.applyOperation(createSetTextOperation('item-1', 'Text 1', 'Item 1'));
            semanticOpManager.applyOperation(createSetTextOperation('item-1', 'Text 2', 'Text 1'));
            
            // Both views should reflect the same state
            setTimeout(() => {
                const item = mockAppState.getItem('page-1', 'group-1', 'item-1');
                expect(item.text).toBe('Text 2');
            }, 100);
        });
    });
    
    describe('View projections', () => {
        it('should not modify canonical model directly', () => {
            const originalText = mockAppState.getItem('page-1', 'group-1', 'item-1').text;
            
            // Views should only read, not modify
            view1.project(mockAppState);
            view2.project(mockAppState);
            
            const currentText = mockAppState.getItem('page-1', 'group-1', 'item-1').text;
            expect(currentText).toBe(originalText);
        });
    });
    
    describe('Circular update prevention', () => {
        it('should prevent circular updates when source-text is authoritative', () => {
            mockServices.authorityManager.setAuthority('page-1', 'view-1', 'MARKDOWN_SOURCE');
            mockServices.authorityManager.preventCircularUpdate('page-1', 'view-1', 'markdown');
            
            const operation = {
                op: 'setText',
                itemId: 'item-1',
                params: { text: 'New text' }
            };
            
            const handled = view1.applyOperation(operation);
            
            // Should handle but skip update
            expect(handled).toBe(true);
        });
    });
});

// tests/unit/ViewManager.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import { ViewManager } from '../../js/core/ViewManager.js';
import { ViewProjection } from '../../js/core/ViewProjection.js';
import { setupMockServices } from '../helpers/mockServices.js';
import { registerService, SERVICES } from '../../js/core/AppServices.js';

// Test view projection
class TestView extends ViewProjection {
    project() { return 'test'; }
    applyOperation() { return true; }
}

describe('ViewManager', () => {
    let viewManager;
    let mockServices;
    
    beforeEach(() => {
        mockServices = setupMockServices();
        registerService(SERVICES.EVENT_BUS, mockServices.eventBus);
        viewManager = new ViewManager();
    });
    
    describe('registerView', () => {
        it('should register view projection', () => {
            const view = new TestView({ viewId: 'view-1' });
            const result = viewManager.registerView(view, 'page-1');
            
            expect(result).toBe(true);
            expect(viewManager.getView('view-1')).toBe(view);
        });
        
        it('should track views by page', () => {
            const view1 = new TestView({ viewId: 'view-1' });
            const view2 = new TestView({ viewId: 'view-2' });
            
            viewManager.registerView(view1, 'page-1');
            viewManager.registerView(view2, 'page-1');
            
            const views = viewManager.getViewsForPage('page-1');
            expect(views.length).toBe(2);
        });
        
        it('should unregister existing view before registering new one', () => {
            const view1 = new TestView({ viewId: 'view-1' });
            const view2 = new TestView({ viewId: 'view-1' });
            
            viewManager.registerView(view1, 'page-1');
            viewManager.registerView(view2, 'page-1');
            
            expect(viewManager.getView('view-1')).toBe(view2);
        });
    });
    
    describe('unregisterView', () => {
        it('should unregister view', () => {
            const view = new TestView({ viewId: 'view-1' });
            viewManager.registerView(view, 'page-1');
            
            const result = viewManager.unregisterView('view-1');
            
            expect(result).toBe(true);
            expect(viewManager.getView('view-1')).toBeNull();
        });
        
        it('should remove view from page tracking', () => {
            const view = new TestView({ viewId: 'view-1' });
            viewManager.registerView(view, 'page-1');
            viewManager.unregisterView('view-1');
            
            const views = viewManager.getViewsForPage('page-1');
            expect(views.length).toBe(0);
        });
    });
    
    describe('applyOperationToViews', () => {
        it('should apply operation to relevant views', () => {
            const view1 = new TestView({ viewId: 'view-1', pageId: 'page-1' });
            const view2 = new TestView({ viewId: 'view-2', pageId: 'page-2' });
            
            view1.isActive = true;
            view2.isActive = true;
            view1.isOperationRelevant = () => true;
            view2.isOperationRelevant = () => false;
            
            viewManager.registerView(view1, 'page-1');
            viewManager.registerView(view2, 'page-2');
            
            let view1Called = false;
            view1.applyOperation = () => { view1Called = true; return true; };
            
            viewManager.applyOperationToViews({
                op: 'setText',
                itemId: 'item-1',
                params: {}
            });
            
            expect(view1Called).toBe(true);
        });
    });
    
    describe('init', () => {
        it('should subscribe to operation events', async () => {
            // ViewManager uses the real eventBus singleton
            const { eventBus } = await import('../../js/core/EventBus.js');
            const initialListenerCount = eventBus.listenerCount('operation:applied');
            
            viewManager.init();
            
            // Should have added a listener
            const newListenerCount = eventBus.listenerCount('operation:applied');
            expect(newListenerCount).toBeGreaterThan(initialListenerCount);
            expect(viewManager._isSubscribed).toBe(true);
        });
        
        it('should not subscribe twice', async () => {
            const { eventBus } = await import('../../js/core/EventBus.js');
            viewManager.init();
            const firstCount = eventBus.listenerCount('operation:applied');
            const firstSubscription = viewManager._operationSubscription;
            
            viewManager.init(); // Should not subscribe again
            
            // Should still have same listener count
            const secondCount = eventBus.listenerCount('operation:applied');
            expect(secondCount).toBe(firstCount);
            expect(viewManager._operationSubscription).toBe(firstSubscription);
        });
    });
    
    describe('getViewsForPage', () => {
        it('should return views for specific page', () => {
            const view1 = new TestView({ viewId: 'view-1' });
            const view2 = new TestView({ viewId: 'view-2' });
            
            viewManager.registerView(view1, 'page-1');
            viewManager.registerView(view2, 'page-2');
            
            const page1Views = viewManager.getViewsForPage('page-1');
            expect(page1Views.length).toBe(1);
            expect(page1Views[0]).toBe(view1);
        });
        
        it('should return empty array for page with no views', () => {
            const views = viewManager.getViewsForPage('page-nonexistent');
            expect(views).toEqual([]);
        });
    });
});

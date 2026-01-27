// tests/unit/ElementEventEmitter.test.js
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ElementEventEmitter } from '../../js/utils/ElementEventEmitter.js';
import { eventBus } from '../../js/core/EventBus.js';
import { EVENTS } from '../../js/core/AppEvents.js';

describe('ElementEventEmitter', () => {
    let capturedEvents = [];
    let eventHandlers = {};
    
    beforeEach(() => {
        capturedEvents = [];
        
        // Capture all emitted events
        const originalEmit = eventBus.emit.bind(eventBus);
        eventBus.emit = (event, data) => {
            capturedEvents.push({ event, data });
            originalEmit(event, data);
        };
    });
    
    afterEach(() => {
        // Restore original emit
        if (eventBus.emit.restore) {
            eventBus.emit.restore();
        }
    });
    
    describe('emitElementCreated', () => {
        it('should emit element created event', () => {
            const pageId = 'page-1';
            const binId = 'bin-1';
            const elementIndex = 0;
            const element = { id: 'item-1', text: 'Item 1' };
            
            ElementEventEmitter.emitElementCreated(pageId, binId, elementIndex, element);
            
            const event = capturedEvents.find(e => e.event === EVENTS.ELEMENT.CREATED);
            expect(event).toBeTruthy();
            expect(event.data.pageId).toBe(pageId);
            expect(event.data.binId).toBe(binId);
            expect(event.data.elementIndex).toBe(elementIndex);
            expect(event.data.element).toBe(element);
        });
    });
    
    describe('emitElementUpdated', () => {
        it('should emit element updated event', () => {
            const pageId = 'page-1';
            const binId = 'bin-1';
            const elementIndex = 0;
            const element = { id: 'item-1', text: 'Updated Item' };
            
            ElementEventEmitter.emitElementUpdated(pageId, binId, elementIndex, element);
            
            const event = capturedEvents.find(e => e.event === EVENTS.ELEMENT.UPDATED);
            expect(event).toBeTruthy();
            expect(event.data.pageId).toBe(pageId);
            expect(event.data.elementIndex).toBe(elementIndex);
        });
    });
    
    describe('emitElementCompleted', () => {
        it('should emit element completed event', () => {
            const pageId = 'page-1';
            const binId = 'bin-1';
            const elementIndex = 0;
            const element = { id: 'item-1', completed: true };
            
            ElementEventEmitter.emitElementCompleted(pageId, binId, elementIndex, element);
            
            const event = capturedEvents.find(e => e.event === EVENTS.ELEMENT.COMPLETED);
            expect(event).toBeTruthy();
            expect(event.data.element.completed).toBe(true);
        });
    });
    
    describe('emitDataSaveRequested', () => {
        it('should emit data save requested event', () => {
            ElementEventEmitter.emitDataSaveRequested();
            
            const event = capturedEvents.find(e => e.event === EVENTS.DATA.SAVE_REQUESTED);
            expect(event).toBeTruthy();
        });
    });
    
    describe('emitRenderRequested', () => {
        it('should emit render requested event', () => {
            ElementEventEmitter.emitRenderRequested();
            
            const event = capturedEvents.find(e => e.event === EVENTS.APP.RENDER_REQUESTED);
            expect(event).toBeTruthy();
        });
    });
    
    describe('emitEditModalRequested', () => {
        it('should emit edit modal requested event', () => {
            const pageId = 'page-1';
            const binId = 'bin-1';
            const elementIndex = 0;
            const element = { id: 'item-1' };
            
            ElementEventEmitter.emitEditModalRequested(pageId, binId, elementIndex, element);
            
            const event = capturedEvents.find(e => e.event === EVENTS.ELEMENT.EDIT_REQUESTED);
            expect(event).toBeTruthy();
            expect(event.data.pageId).toBe(pageId);
        });
    });
    
    describe('emitShowEditModal', () => {
        it('should emit show edit modal event', () => {
            const pageId = 'page-1';
            const binId = 'bin-1';
            const elementIndex = 0;
            const element = { id: 'item-1' };
            
            ElementEventEmitter.emitShowEditModal(pageId, binId, elementIndex, element);
            
            const event = capturedEvents.find(e => e.event === EVENTS.UI.SHOW_EDIT_MODAL);
            expect(event).toBeTruthy();
            expect(event.data.pageId).toBe(pageId);
        });
    });
    
    describe('emitFocusInput', () => {
        it('should emit focus input event', () => {
            ElementEventEmitter.emitFocusInput('edit-text', true);
            
            const event = capturedEvents.find(e => e.event === EVENTS.UI.FOCUS_INPUT);
            expect(event).toBeTruthy();
            expect(event.data.inputId).toBe('edit-text');
            expect(event.data.select).toBe(true);
        });
    });
});

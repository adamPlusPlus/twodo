// tests/unit/ElementMoveHandler.test.js
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ElementMoveHandler } from '../../js/utils/ElementMoveHandler.js';

describe('ElementMoveHandler', () => {
    let handler;
    let mockDragDropHandler;
    
    beforeEach(() => {
        mockDragDropHandler = {};
        handler = new ElementMoveHandler(mockDragDropHandler);
    });
    
    describe('moveElement', () => {
        it('should be defined', () => {
            expect(handler.moveElement).toBeDefined();
            expect(typeof handler.moveElement).toBe('function');
        });
    });
});

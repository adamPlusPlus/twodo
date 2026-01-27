// tests/unit/ElementNestHandler.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import { ElementNestHandler } from '../../js/utils/ElementNestHandler.js';

describe('ElementNestHandler', () => {
    let handler;
    let mockDragDropHandler;
    
    beforeEach(() => {
        mockDragDropHandler = {};
        handler = new ElementNestHandler(mockDragDropHandler);
    });
    
    describe('nestElement', () => {
        it('should be defined', () => {
            expect(handler.nestElement).toBeDefined();
            expect(typeof handler.nestElement).toBe('function');
        });
    });
});

// tests/unit/TrashIconHandler.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import { TrashIconHandler } from '../../js/utils/TrashIconHandler.js';

describe('TrashIconHandler', () => {
    let handler;
    let mockDragDropHandler;
    
    beforeEach(() => {
        mockDragDropHandler = {};
        handler = new TrashIconHandler(mockDragDropHandler);
    });
    
    describe('setupTrashIcon', () => {
        it('should be defined', () => {
            expect(handler.setupTrashIcon).toBeDefined();
            expect(typeof handler.setupTrashIcon).toBe('function');
        });
    });
});

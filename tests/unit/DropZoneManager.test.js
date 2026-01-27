// tests/unit/DropZoneManager.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import { DropZoneManager } from '../../js/utils/DropZoneManager.js';

describe('DropZoneManager', () => {
    let manager;
    
    beforeEach(() => {
        manager = new DropZoneManager();
    });
    
    describe('registerDropZone', () => {
        it('should register drop zone', () => {
            const container = document.createElement('div');
            const onDrop = vi.fn();
            
            const zoneId = manager.registerDropZone(container, { onDrop });
            
            expect(zoneId).toBeDefined();
        });
    });
    
    describe('unregisterDropZone', () => {
        it('should unregister drop zone', () => {
            const container = document.createElement('div');
            const zoneId = manager.registerDropZone(container, {});
            
            manager.unregisterDropZone(zoneId);
            
            // Zone should be removed
            expect(manager.dropZones.has(zoneId)).toBe(false);
        });
    });
    
    describe('findDropZone', () => {
        it('should find drop zone at coordinates', () => {
            const container = document.createElement('div');
            container.style.width = '100px';
            container.style.height = '100px';
            container.style.position = 'absolute';
            container.style.left = '0px';
            container.style.top = '0px';
            // Ensure container is in DOM before registering
            document.body.appendChild(container);
            
            // Force layout calculation
            container.getBoundingClientRect();
            
            const zoneId = manager.registerDropZone(container, {});
            const rect = container.getBoundingClientRect();
            
            // Test with coordinates inside container bounds
            const testX = rect.left + rect.width / 2;
            const testY = rect.top + rect.height / 2;
            
            const found = manager.findDropZone(testX, testY);
            
            expect(found).toBe(container);
            
            // Cleanup
            document.body.removeChild(container);
        });
    });
    
    describe('validateDropZone', () => {
        it('should validate drop zone for drag data', () => {
            const container = document.createElement('div');
            const zoneId = manager.registerDropZone(container, { acceptType: 'element' });
            
            const dragData = { type: 'element' };
            expect(manager.validateDropZone(container, dragData)).toBe(true);
        });
        
        it('should reject incompatible drag types', () => {
            const container = document.createElement('div');
            manager.registerDropZone(container, { acceptType: 'element' });
            
            const dragData = { type: 'bin' };
            expect(manager.validateDropZone(container, dragData)).toBe(false);
        });
    });
});

// tests/unit/BinLayout.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import { BinLayout } from '../../js/utils/BinLayout.js';

describe('BinLayout', () => {
    let mockElementsList;
    let mockItems;
    
    beforeEach(() => {
        mockElementsList = document.createElement('div');
        mockElementsList.className = 'elements-list';
        mockItems = [
            { id: 'item-1', text: 'Item 1' },
            { id: 'item-2', text: 'Item 2' },
            { id: 'item-3', text: 'Item 3' }
        ];
    });
    
    describe('calculateDropPosition', () => {
        it('should calculate drop position for non-virtualized list', () => {
            const mockElement = document.createElement('div');
            mockElement.className = 'element';
            mockElement.dataset.elementIndex = '1';
            mockElement.style.height = '50px';
            mockElementsList.appendChild(mockElement);
            
            const rect = mockElementsList.getBoundingClientRect();
            const mouseY = rect.top + 25; // Middle of first element
            
            const result = BinLayout.calculateDropPosition(mockElementsList, mouseY, mockItems, {});
            
            expect(result.insertIndex).toBeDefined();
            expect(result.targetElement).toBeDefined();
        });
        
        it('should default to end if no target found', () => {
            const result = BinLayout.calculateDropPosition(mockElementsList, 9999, mockItems, {});
            expect(result.insertIndex).toBe(mockItems.length);
        });
    });
    
    describe('calculateBinDimensions', () => {
        it('should calculate bin dimensions', () => {
            const bin = { maxHeight: 500 };
            const container = document.createElement('div');
            container.style.width = '300px';
            container.style.height = '400px';
            // Append to DOM so getBoundingClientRect works
            document.body.appendChild(container);
            
            const dimensions = BinLayout.calculateBinDimensions(bin, container);
            
            expect(dimensions.width).toBeGreaterThan(0);
            expect(dimensions.height).toBeGreaterThan(0);
            expect(dimensions.maxHeight).toBe(500);
            
            // Cleanup
            document.body.removeChild(container);
        });
        
        it('should return zero dimensions for null container', () => {
            const dimensions = BinLayout.calculateBinDimensions({}, null);
            expect(dimensions.width).toBe(0);
            expect(dimensions.height).toBe(0);
        });
    });
    
    describe('calculateElementListLayout', () => {
        it('should calculate element list layout', () => {
            const container = document.createElement('div');
            container.style.height = '200px';
            // Append to DOM so clientHeight works
            document.body.appendChild(container);
            
            const layout = BinLayout.calculateElementListLayout(mockItems, container);
            
            expect(layout.itemCount).toBe(3);
            expect(layout.rootItemCount).toBe(3);
            expect(layout.containerHeight).toBe(200);
            
            // Cleanup
            document.body.removeChild(container);
        });
        
        it('should handle null container', () => {
            const layout = BinLayout.calculateElementListLayout(mockItems, null);
            expect(layout.itemCount).toBe(3);
            expect(layout.rootItemCount).toBe(3);
            expect(layout.containerHeight).toBe(0);
        });
    });
    
    describe('getVisibleRange', () => {
        it('should calculate visible range', () => {
            const itemHeights = new Map();
            itemHeights.set(0, 50);
            itemHeights.set(1, 50);
            itemHeights.set(2, 50);
            
            const range = BinLayout.getVisibleRange(25, 100, itemHeights, 50);
            
            expect(range.startIndex).toBeGreaterThanOrEqual(0);
            expect(range.endIndex).toBeGreaterThanOrEqual(range.startIndex);
        });
    });
});

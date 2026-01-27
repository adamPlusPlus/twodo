// tests/unit/DragVisualFeedback.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import { DragVisualFeedback } from '../../js/utils/DragVisualFeedback.js';

describe('DragVisualFeedback', () => {
    let feedback;
    
    beforeEach(() => {
        feedback = new DragVisualFeedback();
    });
    
    describe('createDragPreview', () => {
        it('should create drag preview element', () => {
            const element = document.createElement('div');
            element.textContent = 'Test';
            const dragData = { type: 'element' };
            
            const preview = feedback.createDragPreview(element, dragData);
            
            expect(preview).toBeDefined();
            expect(preview.style.opacity).toBe('0.5');
        });
    });
    
    describe('updateDropIndicator', () => {
        it('should create drop indicator', () => {
            const targetElement = document.createElement('div');
            const container = document.createElement('div');
            container.appendChild(targetElement);
            
            const indicator = feedback.updateDropIndicator(targetElement, 'before', container);
            
            expect(indicator).toBeDefined();
            expect(indicator.className).toBe('drop-indicator');
        });
    });
    
    describe('removeDropIndicator', () => {
        it('should remove drop indicator', () => {
            const indicator = document.createElement('div');
            indicator.className = 'drop-indicator';
            document.body.appendChild(indicator);
            feedback.currentIndicator = indicator;
            
            feedback.removeDropIndicator();
            
            expect(feedback.currentIndicator).toBeNull();
        });
    });
    
    describe('highlightDropZone', () => {
        it('should add drag-over class when highlighting', () => {
            const dropZone = document.createElement('div');
            
            feedback.highlightDropZone(dropZone, true);
            
            expect(dropZone.classList.contains('drag-over')).toBe(true);
        });
        
        it('should remove drag-over class when not highlighting', () => {
            const dropZone = document.createElement('div');
            dropZone.classList.add('drag-over');
            
            feedback.highlightDropZone(dropZone, false);
            
            expect(dropZone.classList.contains('drag-over')).toBe(false);
        });
    });
    
    describe('cleanup', () => {
        it('should cleanup all visual feedback', () => {
            const indicator = document.createElement('div');
            const preview = document.createElement('div');
            document.body.appendChild(indicator);
            document.body.appendChild(preview);
            feedback.currentIndicator = indicator;
            feedback.currentPreview = preview;
            
            feedback.cleanup();
            
            expect(feedback.currentIndicator).toBeNull();
            expect(feedback.currentPreview).toBeNull();
        });
    });
});

// tests/unit/BinRenderUtils.test.js
import { describe, it, expect } from 'vitest';
import { BinRenderUtils } from '../../js/utils/BinRenderUtils.js';

describe('BinRenderUtils', () => {
    describe('createBinElement', () => {
        it('should create bin element with correct attributes', () => {
            const bin = { id: 'bin-1', title: 'Test Bin' };
            const binDiv = BinRenderUtils.createBinElement(bin, 'page-1');
            
            expect(binDiv.className).toBe('bin');
            expect(binDiv.dataset.binId).toBe('bin-1');
            expect(binDiv.dataset.pageId).toBe('page-1');
            expect(binDiv.draggable).toBe(true);
        });
    });
    
    describe('createElementList', () => {
        it('should create element list container', () => {
            const bin = { id: 'bin-1' };
            const elementsList = BinRenderUtils.createElementList(bin);
            
            expect(elementsList.className).toBe('elements-list');
            expect(elementsList.id).toBe('elements-list-bin-1');
        });
    });
    
    describe('createBinHeader', () => {
        it('should create bin header with expanded arrow', () => {
            const bin = { id: 'bin-1', title: 'Test Bin' };
            const header = BinRenderUtils.createBinHeader(bin, true);
            
            expect(header.className).toBe('bin-header');
            expect(header.innerHTML).toContain('▼');
            expect(header.innerHTML).toContain('Test Bin');
        });
        
        it('should create bin header with collapsed arrow', () => {
            const bin = { id: 'bin-1', title: 'Test Bin' };
            const header = BinRenderUtils.createBinHeader(bin, false);
            
            expect(header.innerHTML).toContain('▶');
        });
    });
    
    describe('createBinContent', () => {
        it('should create bin content with correct display', () => {
            const bin = { id: 'bin-1' };
            const content = BinRenderUtils.createBinContent(bin, true);
            
            expect(content.id).toBe('bin-content-bin-1');
            expect(content.style.display).toBe('block');
        });
        
        it('should apply max-height if set', () => {
            const bin = { id: 'bin-1', maxHeight: 500 };
            const content = BinRenderUtils.createBinContent(bin, true);
            
            expect(content.style.maxHeight).toBe('500px');
            expect(content.style.overflowY).toBe('auto');
        });
    });
    
    describe('createAddElementButton', () => {
        it('should create add element button', () => {
            const button = BinRenderUtils.createAddElementButton();
            
            expect(button.className).toBe('add-element-btn');
            expect(button.textContent).toBe('+ Add Element');
        });
        
        it('should attach click handler if provided', () => {
            let clicked = false;
            const button = BinRenderUtils.createAddElementButton(() => {
                clicked = true;
            });
            
            button.click();
            expect(clicked).toBe(true);
        });
    });
    
    describe('applyBinStructure', () => {
        it('should apply bin structure to DOM', () => {
            const binDiv = document.createElement('div');
            const header = document.createElement('div');
            const content = document.createElement('div');
            const elementsList = document.createElement('div');
            const addButton = document.createElement('button');
            
            BinRenderUtils.applyBinStructure(binDiv, header, content, elementsList, addButton);
            
            expect(binDiv.children.length).toBe(2);
            expect(content.children.length).toBe(2);
        });
    });
    
    describe('createLoadingIndicator', () => {
        it('should create loading indicator', () => {
            const indicator = BinRenderUtils.createLoadingIndicator();
            
            expect(indicator.className).toBe('loading-indicator');
            expect(indicator.textContent).toBe('Loading document...');
        });
    });
});

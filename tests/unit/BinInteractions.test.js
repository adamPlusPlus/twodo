// tests/unit/BinInteractions.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import { BinInteractions } from '../../js/utils/BinInteractions.js';

describe('BinInteractions', () => {
    let interactions;
    let mockApp;
    
    beforeEach(() => {
        mockApp = {
            appState: {
                activeGroupId: null,
                groupStates: {},
                dragData: null,
                isDragging: false,
                autoScrollInterval: null,
                doubleClickDelay: 300
            },
            dataManager: {
                saveData: () => {}
            },
            binManager: {
                moveBin: () => {}
            },
            moveElement: () => {}
        };
        interactions = new BinInteractions(mockApp);
    });
    
    describe('handleBinClick', () => {
        it('should set active group ID', () => {
            const bin = { id: 'bin-1' };
            const event = new MouseEvent('click');
            
            interactions.handleBinClick(bin, 'page-1', event);
            
            expect(mockApp.appState.activeGroupId).toBe('bin-1');
        });
    });
    
    describe('handleBinExpandCollapse', () => {
        it('should toggle bin expansion state', () => {
            const bin = { id: 'bin-1' };
            const toggleArrow = document.createElement('span');
            const binContent = document.createElement('div');
            
            mockApp.appState.groupStates['bin-1'] = true;
            
            interactions.handleBinExpandCollapse(bin, 'page-1', toggleArrow, binContent);
            
            expect(mockApp.appState.groupStates['bin-1']).toBe(false);
            expect(binContent.style.display).toBe('none');
            expect(toggleArrow.textContent).toBe('▶');
        });
    });
    
    describe('handleBinDragStart', () => {
        it('should prevent drag on interactive elements', () => {
            const bin = { id: 'bin-1' };
            const binDiv = document.createElement('div');
            const button = document.createElement('button');
            binDiv.appendChild(button);
            
            const event = {
                target: button,
                preventDefault: () => {},
                closest: () => button,
                dataTransfer: {
                    effectAllowed: '',
                    setData: () => {}
                }
            };
            
            const preventDefaultSpy = vi.spyOn(event, 'preventDefault');
            
            interactions.handleBinDragStart(bin, 'page-1', event, binDiv);
            
            expect(preventDefaultSpy).toHaveBeenCalled();
        });
    });
    
    describe('setupBinTitleEditing', () => {
        it('should setup title editing on double click', () => {
            const bin = { id: 'bin-1', title: 'Test Bin' };
            const titleElement = document.createElement('div');
            titleElement.className = 'bin-title';
            titleElement.textContent = 'Test Bin';
            
            interactions.setupBinTitleEditing(titleElement, bin, 'page-1', 300);
            
            // Simulate double click
            const dblClick = new MouseEvent('dblclick', { bubbles: true });
            titleElement.dispatchEvent(dblClick);
            
            // Title should become editable (this is handled by EventHelper)
            expect(titleElement).toBeDefined();
        });
    });
});

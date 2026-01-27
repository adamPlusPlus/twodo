// tests/unit/BinStyling.test.js
import { describe, it, expect } from 'vitest';
import { BinStyling } from '../../js/utils/BinStyling.js';

describe('BinStyling', () => {
    describe('applyBinStyles', () => {
        it('should apply visual styles if manager provided', () => {
            const binDiv = document.createElement('div');
            const bin = { id: 'bin-1' };
            const visualSettingsManager = {
                applyVisualSettings: vi.fn()
            };
            
            BinStyling.applyBinStyles(binDiv, bin, 'page-1', visualSettingsManager, 'default');
            
            expect(visualSettingsManager.applyVisualSettings).toHaveBeenCalled();
        });
        
        it('should not apply styles if manager not provided', () => {
            const binDiv = document.createElement('div');
            const bin = { id: 'bin-1' };
            
            expect(() => {
                BinStyling.applyBinStyles(binDiv, bin, 'page-1', null);
            }).not.toThrow();
        });
    });
    
    describe('updateBinTheme', () => {
        it('should update bin theme class', () => {
            const binDiv = document.createElement('div');
            
            BinStyling.updateBinTheme(binDiv, 'dark');
            
            expect(binDiv.classList.contains('theme-dark')).toBe(true);
        });
        
        it('should remove old theme classes', () => {
            const binDiv = document.createElement('div');
            binDiv.classList.add('theme-light');
            
            BinStyling.updateBinTheme(binDiv, 'dark');
            
            expect(binDiv.classList.contains('theme-light')).toBe(false);
            expect(binDiv.classList.contains('theme-dark')).toBe(true);
        });
    });
    
    describe('applyBinClasses', () => {
        it('should apply expanded class', () => {
            const binDiv = document.createElement('div');
            const bin = { id: 'bin-1' };
            
            BinStyling.applyBinClasses(binDiv, bin, { expanded: true });
            
            expect(binDiv.classList.contains('expanded')).toBe(true);
            expect(binDiv.classList.contains('collapsed')).toBe(false);
        });
        
        it('should apply collapsed class', () => {
            const binDiv = document.createElement('div');
            const bin = { id: 'bin-1' };
            
            BinStyling.applyBinClasses(binDiv, bin, { expanded: false });
            
            expect(binDiv.classList.contains('collapsed')).toBe(true);
            expect(binDiv.classList.contains('expanded')).toBe(false);
        });
        
        it('should apply active class', () => {
            const binDiv = document.createElement('div');
            const bin = { id: 'bin-1' };
            
            BinStyling.applyBinClasses(binDiv, bin, { active: true });
            
            expect(binDiv.classList.contains('active')).toBe(true);
        });
    });
    
    describe('getBinStyleConfig', () => {
        it('should return style configuration', () => {
            const bin = { id: 'bin-1', maxHeight: 500 };
            const config = BinStyling.getBinStyleConfig(bin, 'page-1');
            
            expect(config.maxHeight).toBe(500);
            expect(config.overflowY).toBe('auto');
            expect(config.overflowX).toBe('hidden');
        });
        
        it('should handle null maxHeight', () => {
            const bin = { id: 'bin-1' };
            const config = BinStyling.getBinStyleConfig(bin, 'page-1');
            
            expect(config.maxHeight).toBeNull();
        });
    });
    
    describe('applyBinContentStyles', () => {
        it('should apply styles to bin content', () => {
            const binContent = document.createElement('div');
            const config = {
                maxHeight: 500,
                overflowY: 'auto',
                overflowX: 'hidden'
            };
            
            BinStyling.applyBinContentStyles(binContent, config);
            
            expect(binContent.style.maxHeight).toBe('500px');
            expect(binContent.style.overflowY).toBe('auto');
            expect(binContent.style.overflowX).toBe('hidden');
        });
    });
});

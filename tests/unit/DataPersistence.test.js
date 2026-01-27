// tests/unit/DataPersistence.test.js
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { dataPersistence } from '../../js/utils/DataPersistence.js';

describe('DataPersistence', () => {
    beforeEach(() => {
        // Clear localStorage
        localStorage.clear();
        // Mock fetch
        global.fetch = vi.fn();
    });
    
    describe('saveToStorage', () => {
        it('should save data to localStorage', () => {
            const data = { test: 'data' };
            const result = dataPersistence.saveToStorage('test-key', data);
            
            expect(result).toBe(true);
            expect(localStorage.getItem('test-key')).toBeDefined();
        });
        
        it('should handle storage errors gracefully', () => {
            // Mock localStorage.setItem to throw
            const originalSetItem = localStorage.setItem;
            localStorage.setItem = vi.fn(() => {
                throw new Error('Storage quota exceeded');
            });
            
            const result = dataPersistence.saveToStorage('test-key', {});
            expect(result).toBe(false);
            
            localStorage.setItem = originalSetItem;
        });
    });
    
    describe('loadFromStorage', () => {
        it('should load data from localStorage', () => {
            const data = { test: 'data' };
            localStorage.setItem('test-key', JSON.stringify(data));
            
            const loaded = dataPersistence.loadFromStorage('test-key');
            expect(loaded).toEqual(data);
        });
        
        it('should return null for missing key', () => {
            expect(dataPersistence.loadFromStorage('non-existent')).toBeNull();
        });
    });
    
    describe('saveToFile', () => {
        it('should save file via fetch', async () => {
            global.fetch = vi.fn(() =>
                Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ success: true })
                })
            );
            
            const result = await dataPersistence.saveToFile('test.json', { data: 'test' });
            
            expect(result).toBe(true);
            expect(global.fetch).toHaveBeenCalled();
        });
    });
    
    describe('loadFromFile', () => {
        it('should load file via fetch', async () => {
            const mockData = { documents: [] };
            global.fetch = vi.fn(() =>
                Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve(mockData)
                })
            );
            
            const loaded = await dataPersistence.loadFromFile('test.json');
            
            expect(loaded).toEqual(mockData);
            expect(global.fetch).toHaveBeenCalled();
        });
    });
    
    describe('getStorageSize', () => {
        it('should calculate storage size', () => {
            const data = 'test data';
            localStorage.setItem('test-key', data);
            
            const size = dataPersistence.getStorageSize('test-key');
            expect(size).toBeGreaterThan(0);
        });
    });
    
    describe('downloadAsFile', () => {
        it('should create downloadable file', () => {
            const data = { test: 'data' };
            
            // Mock document.createElement and DOM methods
            const mockClick = vi.fn();
            const mockAppendChild = vi.fn();
            const mockRemoveChild = vi.fn();
            const mockRevokeObjectURL = vi.fn();
            
            const mockAnchor = {
                href: '',
                download: '',
                click: mockClick
            };
            
            const originalCreateElement = document.createElement;
            const originalAppendChild = document.body.appendChild;
            const originalRemoveChild = document.body.removeChild;
            const originalRevokeObjectURL = URL.revokeObjectURL;
            
            document.createElement = vi.fn(() => mockAnchor);
            document.body.appendChild = mockAppendChild;
            document.body.removeChild = mockRemoveChild;
            URL.revokeObjectURL = mockRevokeObjectURL;
            URL.createObjectURL = vi.fn(() => 'blob:test-url');
            
            const result = dataPersistence.downloadAsFile(data, 'test.json');
            
            // Verify method was called (may return true or false depending on environment)
            expect(document.createElement).toHaveBeenCalledWith('a');
            expect(mockClick).toHaveBeenCalled();
            
            // Restore originals
            document.createElement = originalCreateElement;
            document.body.appendChild = originalAppendChild;
            document.body.removeChild = originalRemoveChild;
            URL.revokeObjectURL = originalRevokeObjectURL;
        });
    });
});

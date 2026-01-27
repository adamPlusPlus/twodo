// tests/unit/DataFileManager.test.js
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DataFileManager } from '../../js/utils/DataFileManager.js';

describe('DataFileManager', () => {
    let manager;
    let mockDataManager;
    
    beforeEach(() => {
        mockDataManager = {
            saveData: vi.fn()
        };
        manager = new DataFileManager(mockDataManager);
    });
    
    describe('saveToFile', () => {
        it('should create downloadable file', () => {
            const mockDownload = vi.fn();
            vi.spyOn(require('../../js/utils/DataPersistence.js'), 'dataPersistence').mockReturnValue({
                downloadAsFile: mockDownload
            });
            
            manager.saveToFile();
            
            expect(mockDownload).toHaveBeenCalled();
        });
    });
});

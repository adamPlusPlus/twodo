// tests/unit/DataSyncManager.test.js
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DataSyncManager } from '../../js/utils/DataSyncManager.js';

describe('DataSyncManager', () => {
    let manager;
    let mockDataManager;
    
    beforeEach(() => {
        mockDataManager = {
            saveData: vi.fn()
        };
        manager = new DataSyncManager(mockDataManager);
    });
    
    describe('scheduleAutosave', () => {
        it('should schedule autosave with delay', () => {
            vi.useFakeTimers();
            
            manager.scheduleAutosave(100);
            
            expect(manager._autosaveTimer).toBeDefined();
            
            vi.advanceTimersByTime(100);
            
            vi.useRealTimers();
        });
    });
    
    describe('scheduleSync', () => {
        it('should schedule sync with delay', () => {
            vi.useFakeTimers();
            
            manager.scheduleSync(200, false);
            
            expect(manager._syncTimer).toBeDefined();
            
            vi.advanceTimersByTime(200);
            
            vi.useRealTimers();
        });
        
        it('should skip sync if skipSync is true', () => {
            manager.scheduleSync(200, true);
            
            expect(manager._syncTimer).toBeNull();
        });
    });
});

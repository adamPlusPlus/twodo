// tests/unit/DailyResetManager.test.js
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DailyResetManager } from '../../js/utils/DailyResetManager.js';

describe('DailyResetManager', () => {
    let manager;
    let mockDataManager;
    
    beforeEach(() => {
        localStorage.clear();
        mockDataManager = {
            archiveAudioRecording: vi.fn(),
            saveData: vi.fn()
        };
        manager = new DailyResetManager(mockDataManager);
    });
    
    describe('checkDailyReset', () => {
        it('should reset repeating tasks on new day', () => {
            const today = new Date().toDateString();
            localStorage.setItem('twodo-last-reset', 'yesterday');
            
            const testData = {
                documents: [{
                    id: 'doc-1',
                    groups: [{
                        id: 'group-1',
                        items: [
                            { id: 'item-1', text: 'Task', repeats: true, completed: true }
                        ]
                    }]
                }]
            };
            
            // Mock dataPersistence
            vi.spyOn(require('../../js/utils/DataPersistence.js'), 'dataPersistence').mockReturnValue({
                loadFromStorage: () => testData
            });
            
            manager.checkDailyReset('test-key');
            
            expect(localStorage.getItem('twodo-last-reset')).toBe(today);
        });
    });
});

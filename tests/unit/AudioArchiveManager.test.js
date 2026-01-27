// tests/unit/AudioArchiveManager.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import { audioArchiveManager } from '../../js/utils/AudioArchiveManager.js';

describe('AudioArchiveManager', () => {
    beforeEach(() => {
        localStorage.clear();
    });
    
    describe('archiveAudioRecording', () => {
        it('should archive audio recording', () => {
            audioArchiveManager.archiveAudioRecording('page-1', 0, 'audio.mp3', '2025-01-23');
            
            const stored = localStorage.getItem('twodo-audio-archive');
            expect(stored).toBeDefined();
            
            const archive = JSON.parse(stored);
            expect(archive.length).toBe(1);
            expect(archive[0].pageId).toBe('page-1');
        });
    });
    
    describe('getArchivedRecordings', () => {
        it('should get archived recordings for page and element', () => {
            audioArchiveManager.archiveAudioRecording('page-1', 0, 'audio1.mp3', '2025-01-23');
            audioArchiveManager.archiveAudioRecording('page-1', 0, 'audio2.mp3', '2025-01-24');
            audioArchiveManager.archiveAudioRecording('page-2', 0, 'audio3.mp3', '2025-01-23');
            
            const recordings = audioArchiveManager.getArchivedRecordings('page-1', 0);
            
            expect(recordings.length).toBe(2);
            expect(recordings.every(r => r.pageId === 'page-1' && r.elementIndex === 0)).toBe(true);
        });
    });
});

// tests/unit/AudioFileIO.test.js
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AudioFileIO } from '../../js/utils/AudioFileIO.js';

describe('AudioFileIO', () => {
    beforeEach(() => {
        global.fetch = vi.fn();
        global.FormData = class FormData {
            append() {}
        };
    });
    
    describe('getAudioFileUrl', () => {
        it('should return correct URL for filename', () => {
            const url = AudioFileIO.getAudioFileUrl('test.webm');
            expect(url).toBe('/saved_files/recordings/test.webm');
        });
    });
    
    describe('createFormData', () => {
        it('should create FormData with audio blob and filename', () => {
            const blob = new Blob(['test'], { type: 'audio/webm' });
            const formData = AudioFileIO.createFormData(blob, 'test.webm');
            expect(formData).toBeInstanceOf(FormData);
        });
    });
    
    describe('saveAudioFile', () => {
        it('should save audio file successfully', async () => {
            const blob = new Blob(['test'], { type: 'audio/webm' });
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ success: true, filename: 'test.webm' })
            });
            
            const result = await AudioFileIO.saveAudioFile(blob, 'test.webm');
            expect(result.success).toBe(true);
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/save-audio'),
                expect.objectContaining({ method: 'POST' })
            );
        });
        
        it('should throw error on HTTP failure', async () => {
            const blob = new Blob(['test'], { type: 'audio/webm' });
            global.fetch.mockResolvedValueOnce({
                ok: false,
                status: 500
            });
            
            await expect(AudioFileIO.saveAudioFile(blob, 'test.webm')).rejects.toThrow();
        });
        
        it('should throw error on missing blob or filename', async () => {
            await expect(AudioFileIO.saveAudioFile(null, 'test.webm')).rejects.toThrow();
            await expect(AudioFileIO.saveAudioFile(new Blob(), null)).rejects.toThrow();
        });
    });
    
    describe('loadAudioFile', () => {
        it('should load audio file successfully', async () => {
            const blob = new Blob(['test'], { type: 'audio/webm' });
            global.fetch.mockResolvedValueOnce({
                ok: true,
                blob: async () => blob
            });
            
            const result = await AudioFileIO.loadAudioFile('test.webm');
            expect(result).toBeInstanceOf(Blob);
            expect(global.fetch).toHaveBeenCalledWith('/saved_files/recordings/test.webm');
        });
        
        it('should throw error on HTTP failure', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: false,
                status: 404
            });
            
            await expect(AudioFileIO.loadAudioFile('test.webm')).rejects.toThrow();
        });
        
        it('should throw error on missing filename', async () => {
            await expect(AudioFileIO.loadAudioFile(null)).rejects.toThrow();
        });
    });
    
    describe('fileExists', () => {
        it('should return true if file exists', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true
            });
            
            const exists = await AudioFileIO.fileExists('test.webm');
            expect(exists).toBe(true);
        });
        
        it('should return false if file does not exist', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: false
            });
            
            const exists = await AudioFileIO.fileExists('test.webm');
            expect(exists).toBe(false);
        });
        
        it('should return false on error', async () => {
            global.fetch.mockRejectedValueOnce(new Error('Network error'));
            
            const exists = await AudioFileIO.fileExists('test.webm');
            expect(exists).toBe(false);
        });
    });
});

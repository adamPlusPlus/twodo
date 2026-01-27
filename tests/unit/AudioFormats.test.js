// tests/unit/AudioFormats.test.js
import { describe, it, expect } from 'vitest';
import { AudioFormats } from '../../js/utils/AudioFormats.js';

describe('AudioFormats', () => {
    describe('validateAudioFormat', () => {
        it('should validate webm format', () => {
            expect(AudioFormats.validateAudioFormat('test.webm')).toBe(true);
        });
        
        it('should validate mp3 format', () => {
            expect(AudioFormats.validateAudioFormat('test.mp3')).toBe(true);
        });
        
        it('should reject invalid format', () => {
            expect(AudioFormats.validateAudioFormat('test.txt')).toBe(false);
        });
        
        it('should reject null or empty filename', () => {
            expect(AudioFormats.validateAudioFormat(null)).toBe(false);
            expect(AudioFormats.validateAudioFormat('')).toBe(false);
        });
    });
    
    describe('ensureWebMExtension', () => {
        it('should add .webm extension if missing', () => {
            expect(AudioFormats.ensureWebMExtension('recording')).toBe('recording.webm');
        });
        
        it('should keep .webm extension if present', () => {
            expect(AudioFormats.ensureWebMExtension('recording.webm')).toBe('recording.webm');
        });
        
        it('should handle empty string', () => {
            expect(AudioFormats.ensureWebMExtension('')).toBe('');
        });
    });
    
    describe('generateAudioFilename', () => {
        it('should generate filename with default prefix', () => {
            const filename = AudioFormats.generateAudioFilename();
            expect(filename).toMatch(/^recording-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.webm$/);
        });
        
        it('should generate filename with custom prefix', () => {
            const filename = AudioFormats.generateAudioFilename('custom');
            expect(filename).toMatch(/^custom-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.webm$/);
        });
    });
    
    describe('getAudioMimeType', () => {
        it('should return webm MIME type by default', () => {
            expect(AudioFormats.getAudioMimeType()).toBe('audio/webm');
        });
        
        it('should return correct MIME type for webm', () => {
            expect(AudioFormats.getAudioMimeType('webm')).toBe('audio/webm');
        });
        
        it('should return correct MIME type for mp3', () => {
            expect(AudioFormats.getAudioMimeType('mp3')).toBe('audio/mpeg');
        });
        
        it('should return webm for unknown format', () => {
            expect(AudioFormats.getAudioMimeType('unknown')).toBe('audio/webm');
        });
    });
    
    describe('getFileExtension', () => {
        it('should extract extension from filename', () => {
            expect(AudioFormats.getFileExtension('test.webm')).toBe('webm');
        });
        
        it('should handle uppercase extension', () => {
            expect(AudioFormats.getFileExtension('test.WEBM')).toBe('webm');
        });
        
        it('should return empty string for no extension', () => {
            expect(AudioFormats.getFileExtension('test')).toBe('');
        });
        
        it('should handle null or empty', () => {
            expect(AudioFormats.getFileExtension(null)).toBe('');
            expect(AudioFormats.getFileExtension('')).toBe('');
        });
    });
});

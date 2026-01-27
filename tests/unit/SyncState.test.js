// tests/unit/SyncState.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import { SyncState } from '../../js/utils/SyncState.js';

describe('SyncState', () => {
    let state;
    
    beforeEach(() => {
        state = new SyncState();
    });
    
    describe('connection state', () => {
        it('should initialize as disconnected', () => {
            expect(state.getConnectionState()).toBe(false);
        });
        
        it('should set connection state', () => {
            state.setConnectionState(true);
            expect(state.getConnectionState()).toBe(true);
        });
        
        it('should reset reconnect attempts on disconnect', () => {
            state.incrementReconnectAttempts();
            state.setConnectionState(false);
            expect(state.getReconnectAttempts()).toBe(0);
        });
    });
    
    describe('client ID', () => {
        it('should initialize as null', () => {
            expect(state.getClientId()).toBeNull();
        });
        
        it('should set and get client ID', () => {
            state.setClientId('client-123');
            expect(state.getClientId()).toBe('client-123');
        });
    });
    
    describe('current filename', () => {
        it('should initialize as null', () => {
            expect(state.getCurrentFilename()).toBeNull();
        });
        
        it('should set and get current filename', () => {
            state.setCurrentFilename('file.json');
            expect(state.getCurrentFilename()).toBe('file.json');
        });
    });
    
    describe('pending file join', () => {
        it('should initialize as null', () => {
            expect(state.getPendingFileJoin()).toBeNull();
        });
        
        it('should set and get pending file join', () => {
            state.setPendingFileJoin('file.json');
            expect(state.getPendingFileJoin()).toBe('file.json');
        });
    });
    
    describe('synced files', () => {
        it('should mark file as synced', () => {
            state.markFileSynced('file.json');
            expect(state.hasSyncedFile('file.json')).toBe(true);
        });
        
        it('should return false for unsynced file', () => {
            expect(state.hasSyncedFile('file.json')).toBe(false);
        });
        
        it('should clear synced files', () => {
            state.markFileSynced('file1.json');
            state.markFileSynced('file2.json');
            state.clearSyncedFiles();
            expect(state.hasSyncedFile('file1.json')).toBe(false);
        });
        
        it('should get all synced files', () => {
            state.markFileSynced('file1.json');
            state.markFileSynced('file2.json');
            const files = state.getSyncedFiles();
            expect(files.has('file1.json')).toBe(true);
            expect(files.has('file2.json')).toBe(true);
        });
    });
    
    describe('sequence tracking', () => {
        it('should initialize sequence as 0', () => {
            expect(state.getLastSyncedSequence()).toBe(0);
        });
        
        it('should update sequence', () => {
            state.updateLastSyncedSequence(10);
            expect(state.getLastSyncedSequence()).toBe(10);
        });
        
        it('should only update if sequence is higher', () => {
            state.updateLastSyncedSequence(10);
            state.updateLastSyncedSequence(5);
            expect(state.getLastSyncedSequence()).toBe(10);
        });
    });
    
    describe('applying remote operation', () => {
        it('should initialize as false', () => {
            expect(state.isApplyingRemoteOperation()).toBe(false);
        });
        
        it('should set applying remote operation flag', () => {
            state.setApplyingRemoteOperation(true);
            expect(state.isApplyingRemoteOperation()).toBe(true);
        });
    });
    
    describe('reconnect attempts', () => {
        it('should initialize as 0', () => {
            expect(state.getReconnectAttempts()).toBe(0);
        });
        
        it('should increment reconnect attempts', () => {
            state.incrementReconnectAttempts();
            expect(state.getReconnectAttempts()).toBe(1);
        });
        
        it('should reset reconnect attempts', () => {
            state.incrementReconnectAttempts();
            state.resetReconnectAttempts();
            expect(state.getReconnectAttempts()).toBe(0);
        });
        
        it('should check max reconnect attempts', () => {
            for (let i = 0; i < 10; i++) {
                state.incrementReconnectAttempts();
            }
            expect(state.hasReachedMaxReconnectAttempts()).toBe(true);
        });
        
        it('should calculate reconnect delay with exponential backoff', () => {
            state.incrementReconnectAttempts();
            const delay1 = state.getReconnectDelay();
            state.incrementReconnectAttempts();
            const delay2 = state.getReconnectDelay();
            expect(delay2).toBeGreaterThan(delay1);
        });
    });
});

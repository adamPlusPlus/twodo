// tests/unit/SyncConflictResolver.test.js
import { describe, it, expect } from 'vitest';
import { SyncConflictResolver } from '../../js/utils/SyncConflictResolver.js';

describe('SyncConflictResolver', () => {
    describe('areDataEqual', () => {
        it('should return true for identical data', () => {
            const data = { a: 1, b: 2 };
            expect(SyncConflictResolver.areDataEqual(data, data)).toBe(true);
        });
        
        it('should return true for equal objects', () => {
            const data1 = { a: 1, b: 2 };
            const data2 = { a: 1, b: 2 };
            expect(SyncConflictResolver.areDataEqual(data1, data2)).toBe(true);
        });
        
        it('should return false for different objects', () => {
            const data1 = { a: 1, b: 2 };
            const data2 = { a: 1, b: 3 };
            expect(SyncConflictResolver.areDataEqual(data1, data2)).toBe(false);
        });
    });
    
    describe('compareDataTimestamps', () => {
        it('should apply remote if no local timestamp', () => {
            const result = SyncConflictResolver.compareDataTimestamps(0, 1000);
            expect(result.shouldApply).toBe(true);
            expect(result.reason).toBe('no_local_timestamp');
        });
        
        it('should not apply if remote is older', () => {
            const result = SyncConflictResolver.compareDataTimestamps(2000, 1000);
            expect(result.shouldApply).toBe(false);
            expect(result.reason).toBe('remote_older');
        });
        
        it('should apply if remote is newer', () => {
            const result = SyncConflictResolver.compareDataTimestamps(1000, 2000);
            expect(result.shouldApply).toBe(true);
            expect(result.reason).toBe('remote_newer');
        });
        
        it('should be conservative if recently loaded', () => {
            const result = SyncConflictResolver.compareDataTimestamps(1000, 1500, 1000);
            expect(result.shouldApply).toBe(false);
            expect(result.reason).toBe('recently_loaded');
        });
    });
    
    describe('resolveDataConflict', () => {
        it('should skip update if data is identical', () => {
            const local = { a: 1 };
            const remote = { a: 1 };
            const result = SyncConflictResolver.resolveDataConflict(local, remote, 1000, 2000);
            
            expect(result.shouldApply).toBe(true);
            expect(result.skipDataUpdate).toBe(true);
            expect(result.reason).toBe('data_identical');
        });
        
        it('should apply if remote is newer', () => {
            const local = { a: 1 };
            const remote = { a: 2 };
            const result = SyncConflictResolver.resolveDataConflict(local, remote, 1000, 2000);
            
            expect(result.shouldApply).toBe(true);
            expect(result.skipDataUpdate).toBe(false);
        });
        
        it('should not apply if remote is older', () => {
            const local = { a: 1 };
            const remote = { a: 2 };
            const result = SyncConflictResolver.resolveDataConflict(local, remote, 2000, 1000);
            
            expect(result.shouldApply).toBe(false);
        });
    });
    
    describe('shouldApplyRemoteData', () => {
        it('should return true when remote should be applied', () => {
            const result = SyncConflictResolver.shouldApplyRemoteData(
                { a: 1 },
                { a: 2 },
                1000,
                2000
            );
            expect(result).toBe(true);
        });
        
        it('should return false when remote should not be applied', () => {
            const result = SyncConflictResolver.shouldApplyRemoteData(
                { a: 1 },
                { a: 2 },
                2000,
                1000
            );
            expect(result).toBe(false);
        });
    });
    
    describe('extractTimestamp', () => {
        it('should extract timestamp from message', () => {
            const message = { timestamp: 123456 };
            expect(SyncConflictResolver.extractTimestamp(message)).toBe(123456);
        });
        
        it('should extract from data._lastSyncTimestamp', () => {
            const message = { data: { _lastSyncTimestamp: 789012 } };
            expect(SyncConflictResolver.extractTimestamp(message)).toBe(789012);
        });
        
        it('should extract from data.timestamp', () => {
            const message = { data: { timestamp: 345678 } };
            expect(SyncConflictResolver.extractTimestamp(message)).toBe(345678);
        });
        
        it('should return 0 if no timestamp found', () => {
            const message = {};
            expect(SyncConflictResolver.extractTimestamp(message)).toBe(0);
        });
    });
});

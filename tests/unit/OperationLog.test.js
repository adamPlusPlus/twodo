// tests/unit/OperationLog.test.js
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { OperationLog, getOperationLog, clearOperationLog } from '../../js/core/OperationLog.js';

describe('OperationLog', () => {
    const testFilename = 'test-file.json';
    
    beforeEach(() => {
        // Clear localStorage before each test
        localStorage.clear();
        clearOperationLog(testFilename);
    });
    
    afterEach(() => {
        clearOperationLog(testFilename);
    });
    
    describe('constructor and load', () => {
        it('should create new log with empty operations', () => {
            const log = new OperationLog(testFilename);
            expect(log.operations).toEqual([]);
            expect(log.lastSequence).toBe(0);
        });
        
        it('should load operations from localStorage', () => {
            // Pre-populate localStorage
            const storageKey = `twodo-ops-${testFilename}`;
            const storedData = {
                operations: [
                    { sequence: 1, op: 'setText', itemId: 'item-1', params: { text: 'Text' } }
                ],
                lastSequence: 1
            };
            localStorage.setItem(storageKey, JSON.stringify(storedData));
            
            const log = new OperationLog(testFilename);
            expect(log.operations.length).toBe(1);
            expect(log.lastSequence).toBe(1);
        });
    });
    
    describe('append', () => {
        it('should append operation and assign sequence', () => {
            const log = new OperationLog(testFilename);
            const operation = {
                op: 'setText',
                itemId: 'item-1',
                params: { text: 'New text' }
            };
            
            const sequence = log.append(operation);
            
            expect(sequence).toBe(1);
            expect(log.operations.length).toBe(1);
            expect(log.operations[0].sequence).toBe(1);
            expect(log.operations[0].op).toBe('setText');
        });
        
        it('should increment sequence for each append', () => {
            const log = new OperationLog(testFilename);
            
            const seq1 = log.append({ op: 'setText', itemId: 'item-1', params: {} });
            const seq2 = log.append({ op: 'setText', itemId: 'item-2', params: {} });
            const seq3 = log.append({ op: 'setText', itemId: 'item-3', params: {} });
            
            expect(seq1).toBe(1);
            expect(seq2).toBe(2);
            expect(seq3).toBe(3);
            expect(log.operations.length).toBe(3);
        });
        
        it('should save to localStorage after append', () => {
            const log = new OperationLog(testFilename);
            log.append({ op: 'setText', itemId: 'item-1', params: {} });
            
            const storageKey = `twodo-ops-${testFilename}`;
            const stored = JSON.parse(localStorage.getItem(storageKey));
            expect(stored.operations.length).toBe(1);
        });
    });
    
    describe('getOperations', () => {
        it('should return all operations when sinceSequence is 0', () => {
            const log = new OperationLog(testFilename);
            log.append({ op: 'setText', itemId: 'item-1', params: {} });
            log.append({ op: 'setText', itemId: 'item-2', params: {} });
            
            const ops = log.getOperations(0);
            expect(ops.length).toBe(2);
        });
        
        it('should return operations since sequence', () => {
            const log = new OperationLog(testFilename);
            log.append({ op: 'setText', itemId: 'item-1', params: {} });
            log.append({ op: 'setText', itemId: 'item-2', params: {} });
            log.append({ op: 'setText', itemId: 'item-3', params: {} });
            
            const ops = log.getOperations(1);
            expect(ops.length).toBe(2);
            expect(ops[0].sequence).toBe(2);
            expect(ops[1].sequence).toBe(3);
        });
        
        it('should return empty array when no operations since sequence', () => {
            const log = new OperationLog(testFilename);
            log.append({ op: 'setText', itemId: 'item-1', params: {} });
            
            const ops = log.getOperations(1);
            expect(ops.length).toBe(0);
        });
    });
    
    describe('replay', () => {
        it('should replay operations in order', () => {
            const log = new OperationLog(testFilename);
            log.append({ op: 'setText', itemId: 'item-1', params: { text: 'Text 1' } });
            log.append({ op: 'setText', itemId: 'item-2', params: { text: 'Text 2' } });
            
            const results = [];
            log.replay(0, null, (op) => {
                results.push(op);
                return { success: true };
            });
            
            expect(results.length).toBe(2);
            expect(results[0].sequence).toBe(1);
            expect(results[1].sequence).toBe(2);
        });
        
        it('should replay operations in range', () => {
            const log = new OperationLog(testFilename);
            log.append({ op: 'setText', itemId: 'item-1', params: {} });
            log.append({ op: 'setText', itemId: 'item-2', params: {} });
            log.append({ op: 'setText', itemId: 'item-3', params: {} });
            
            const results = [];
            log.replay(1, 2, (op) => {
                results.push(op);
                return { success: true };
            });
            
            expect(results.length).toBe(2);
            expect(results[0].sequence).toBe(1);
            expect(results[1].sequence).toBe(2);
        });
        
        it('should handle errors in applyFn', () => {
            const log = new OperationLog(testFilename);
            log.append({ op: 'setText', itemId: 'item-1', params: {} });
            
            const results = log.replay(0, null, () => {
                throw new Error('Test error');
            });
            
            expect(results.length).toBe(1);
            expect(results[0].error).toBeTruthy();
        });
    });
    
    describe('clear', () => {
        it('should clear all operations', () => {
            const log = new OperationLog(testFilename);
            log.append({ op: 'setText', itemId: 'item-1', params: {} });
            log.append({ op: 'setText', itemId: 'item-2', params: {} });
            
            expect(log.operations.length).toBe(2);
            
            log.clear();
            
            expect(log.operations.length).toBe(0);
            expect(log.lastSequence).toBe(0);
        });
    });
    
    describe('garbage collection', () => {
        it('should keep only maxOperations when limit exceeded', () => {
            const log = new OperationLog(testFilename, 5);
            
            // Add 10 operations
            for (let i = 0; i < 10; i++) {
                log.append({ op: 'setText', itemId: `item-${i}`, params: {} });
            }
            
            // Should keep only last 5
            expect(log.operations.length).toBe(5);
            expect(log.operations[0].sequence).toBeGreaterThan(5);
        });
    });
    
    describe('getOperationLog factory', () => {
        it('should return same instance for same filename', () => {
            const log1 = getOperationLog(testFilename);
            const log2 = getOperationLog(testFilename);
            
            expect(log1).toBe(log2);
        });
        
        it('should return different instances for different filenames', () => {
            const log1 = getOperationLog('file1.json');
            const log2 = getOperationLog('file2.json');
            
            expect(log1).not.toBe(log2);
        });
    });
    
    describe('clearOperationLog', () => {
        it('should clear log and remove from cache', () => {
            const log = getOperationLog(testFilename);
            log.append({ op: 'setText', itemId: 'item-1', params: {} });
            
            clearOperationLog(testFilename);
            
            const newLog = getOperationLog(testFilename);
            expect(newLog.operations.length).toBe(0);
        });
    });
});

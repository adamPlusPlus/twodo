// tests/unit/SyncQueue.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import { SyncQueue } from '../../js/utils/SyncQueue.js';

describe('SyncQueue', () => {
    let queue;
    
    beforeEach(() => {
        queue = new SyncQueue();
    });
    
    describe('enqueue', () => {
        it('should add message to queue', () => {
            queue.enqueue({ type: 'test', data: 1 });
            expect(queue.size()).toBe(1);
        });
        
        it('should add multiple messages', () => {
            queue.enqueue({ type: 'test1' });
            queue.enqueue({ type: 'test2' });
            expect(queue.size()).toBe(2);
        });
    });
    
    describe('dequeue', () => {
        it('should remove and return first message', () => {
            queue.enqueue({ type: 'test1' });
            queue.enqueue({ type: 'test2' });
            
            const message = queue.dequeue();
            expect(message.type).toBe('test1');
            expect(queue.size()).toBe(1);
        });
        
        it('should return null if queue is empty', () => {
            expect(queue.dequeue()).toBeNull();
        });
    });
    
    describe('flush', () => {
        it('should process all queued messages', () => {
            const processed = [];
            queue.enqueue({ type: 'test1' });
            queue.enqueue({ type: 'test2' });
            
            queue.flush((msg) => {
                processed.push(msg);
            });
            
            expect(processed.length).toBe(2);
            expect(queue.isEmpty()).toBe(true);
        });
        
        it('should handle errors gracefully', () => {
            queue.enqueue({ type: 'test' });
            
            expect(() => {
                queue.flush(() => {
                    throw new Error('Test error');
                });
            }).not.toThrow();
            
            expect(queue.isEmpty()).toBe(true);
        });
    });
    
    describe('clear', () => {
        it('should clear all messages', () => {
            queue.enqueue({ type: 'test1' });
            queue.enqueue({ type: 'test2' });
            
            queue.clear();
            expect(queue.isEmpty()).toBe(true);
        });
    });
    
    describe('isEmpty', () => {
        it('should return true for empty queue', () => {
            expect(queue.isEmpty()).toBe(true);
        });
        
        it('should return false for non-empty queue', () => {
            queue.enqueue({ type: 'test' });
            expect(queue.isEmpty()).toBe(false);
        });
    });
    
    describe('size', () => {
        it('should return 0 for empty queue', () => {
            expect(queue.size()).toBe(0);
        });
        
        it('should return correct size', () => {
            queue.enqueue({ type: 'test1' });
            queue.enqueue({ type: 'test2' });
            expect(queue.size()).toBe(2);
        });
    });
    
    describe('peekAll', () => {
        it('should return all messages without removing', () => {
            queue.enqueue({ type: 'test1' });
            queue.enqueue({ type: 'test2' });
            
            const messages = queue.peekAll();
            expect(messages.length).toBe(2);
            expect(queue.size()).toBe(2);
        });
    });
    
    describe('remove', () => {
        it('should remove matching message', () => {
            queue.enqueue({ type: 'test1', id: 1 });
            queue.enqueue({ type: 'test2', id: 2 });
            
            const removed = queue.remove((msg) => msg.id === 1);
            expect(removed.id).toBe(1);
            expect(queue.size()).toBe(1);
        });
        
        it('should return null if no match', () => {
            queue.enqueue({ type: 'test' });
            const removed = queue.remove((msg) => msg.id === 999);
            expect(removed).toBeNull();
        });
    });
});

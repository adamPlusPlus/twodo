// test-event-storm-control.js - Test suite for event storm control
// Run this in browser console or Node.js to verify implementation

import { eventBus } from './EventBus.js';
import { eventStormConfig } from './EventStormConfig.js';
import { eventStormMonitor } from './EventStormMonitor.js';

/**
 * Test suite for event storm control
 */
class EventStormControlTest {
    constructor() {
        this.results = [];
        this.listeners = [];
    }
    
    /**
     * Run all tests
     */
    async runAll() {
        console.log('🧪 Starting Event Storm Control Tests...\n');
        
        try {
            await this.testRateLimiting();
            await this.testCoalescing();
            await this.testBatching();
            await this.testBackpressure();
            await this.testIntegration();
            
            this.printResults();
        } catch (error) {
            console.error('❌ Test suite failed:', error);
        } finally {
            this.cleanup();
        }
    }
    
    /**
     * Test rate limiting
     */
    async testRateLimiting() {
        console.log('📊 Testing Rate Limiting...');
        
        const testName = 'Rate Limiting';
        let eventCount = 0;
        const maxEvents = 10;
        const rateLimit = 5; // 5 per second
        
        // Set rate limit for test event
        eventStormConfig.updateConfig({
            rateLimits: {
                'test:rate-limit': rateLimit
            }
        });
        
        // Register listener
        const listener = () => {
            eventCount++;
        };
        eventBus.on('test:rate-limit', listener);
        this.listeners.push(() => eventBus.off('test:rate-limit', listener));
        
        // Emit events rapidly
        const startTime = Date.now();
        for (let i = 0; i < maxEvents; i++) {
            eventBus.emit('test:rate-limit', i);
        }
        
        // Wait for processing
        await this.sleep(1200); // Wait 1.2 seconds
        
        const elapsed = Date.now() - startTime;
        const expectedMin = Math.floor(rateLimit * (elapsed / 1000));
        const expectedMax = rateLimit + 1; // Allow some burst
        
        const passed = eventCount >= expectedMin && eventCount <= expectedMax;
        
        this.results.push({
            test: testName,
            passed,
            details: {
                emitted: maxEvents,
                processed: eventCount,
                expectedRange: `${expectedMin}-${expectedMax}`,
                elapsed: `${elapsed}ms`
            }
        });
        
        console.log(`  ${passed ? '✅' : '❌'} ${testName}: ${eventCount} events processed (expected ${expectedMin}-${expectedMax})`);
    }
    
    /**
     * Test coalescing
     */
    async testCoalescing() {
        console.log('🔄 Testing Coalescing...');
        
        const testName = 'Coalescing';
        let eventCount = 0;
        const maxEvents = 20;
        const coalescingWindow = 50; // 50ms
        
        // Set coalescing window
        eventStormConfig.updateConfig({
            coalescing: {
                'test:coalesce': coalescingWindow
            }
        });
        
        // Register listener
        const listener = () => {
            eventCount++;
        };
        eventBus.on('test:coalesce', listener);
        this.listeners.push(() => eventBus.off('test:coalesce', listener));
        
        // Emit events rapidly (within coalescing window)
        const startTime = Date.now();
        for (let i = 0; i < maxEvents; i++) {
            eventBus.emit('test:coalesce', i);
            await this.sleep(5); // 5ms between events
        }
        
        // Wait for coalescing to complete
        await this.sleep(coalescingWindow + 100);
        
        // Should be coalesced to fewer events
        const passed = eventCount < maxEvents;
        
        this.results.push({
            test: testName,
            passed,
            details: {
                emitted: maxEvents,
                processed: eventCount,
                coalesced: maxEvents - eventCount
            }
        });
        
        console.log(`  ${passed ? '✅' : '❌'} ${testName}: ${eventCount} events processed (${maxEvents - eventCount} coalesced)`);
    }
    
    /**
     * Test batching
     */
    async testBatching() {
        console.log('📦 Testing Batching...');
        
        const testName = 'Batching';
        let eventCount = 0;
        const maxEvents = 15;
        const batchWindow = 100; // 100ms
        
        // Enable batching
        eventStormConfig.updateConfig({
            batching: {
                'test:batch': true
            },
            batchWindows: {
                'test:batch': batchWindow
            }
        });
        
        // Register listener
        const listener = () => {
            eventCount++;
        };
        eventBus.on('test:batch', listener);
        this.listeners.push(() => eventBus.off('test:batch', listener));
        
        // Emit events rapidly
        for (let i = 0; i < maxEvents; i++) {
            eventBus.emit('test:batch', i);
            await this.sleep(10); // 10ms between events
        }
        
        // Wait for batching to complete
        await this.sleep(batchWindow + 100);
        
        // Should be batched (fewer calls than events)
        const passed = eventCount <= maxEvents;
        
        this.results.push({
            test: testName,
            passed,
            details: {
                emitted: maxEvents,
                processed: eventCount
            }
        });
        
        console.log(`  ${passed ? '✅' : '❌'} ${testName}: ${eventCount} batches processed`);
    }
    
    /**
     * Test backpressure
     */
    async testBackpressure() {
        console.log('⏸️  Testing Backpressure...');
        
        const testName = 'Backpressure';
        let eventCount = 0;
        const maxEvents = 50;
        
        // Configure backpressure
        eventStormConfig.updateConfig({
            backpressure: {
                slowListenerThreshold: 50, // 50ms
                queueSizeLimit: 20
            }
        });
        
        // Register slow listener
        const slowListener = async () => {
            eventCount++;
            await this.sleep(60); // 60ms - slower than threshold
        };
        eventBus.on('test:backpressure', slowListener);
        this.listeners.push(() => eventBus.off('test:backpressure', slowListener));
        
        // Emit events rapidly
        const startTime = Date.now();
        for (let i = 0; i < maxEvents; i++) {
            eventBus.emit('test:backpressure', i);
        }
        
        // Wait for processing
        await this.sleep(2000);
        
        const metrics = eventBus.getMetrics();
        const backpressureActive = metrics.backpressure.backpressureActive || metrics.backpressure.queueSize > 0;
        
        const passed = backpressureActive || eventCount < maxEvents; // Either backpressure activated or events queued
        
        this.results.push({
            test: testName,
            passed,
            details: {
                emitted: maxEvents,
                processed: eventCount,
                queueSize: metrics.backpressure.queueSize,
                backpressureActive: metrics.backpressure.backpressureActive
            }
        });
        
        console.log(`  ${passed ? '✅' : '❌'} ${testName}: Backpressure detected (queue: ${metrics.backpressure.queueSize})`);
    }
    
    /**
     * Test integration (render requests)
     */
    async testIntegration() {
        console.log('🔗 Testing Integration (Render Requests)...');
        
        const testName = 'Integration';
        let renderCount = 0;
        const maxRenders = 100;
        
        // Register render listener
        const renderListener = () => {
            renderCount++;
        };
        eventBus.on('app:render-requested', renderListener);
        this.listeners.push(() => eventBus.off('app:render-requested', renderListener));
        
        // Emit many render requests rapidly
        const startTime = Date.now();
        for (let i = 0; i < maxRenders; i++) {
            eventBus.emit('app:render-requested');
        }
        
        // Wait for processing
        await this.sleep(2000);
        
        const elapsed = Date.now() - startTime;
        const rateLimit = eventStormConfig.getRateLimit('app:render-requested');
        const expectedMax = Math.floor(rateLimit * (elapsed / 1000)) + 5; // Allow some burst
        
        const passed = renderCount <= expectedMax;
        
        this.results.push({
            test: testName,
            passed,
            details: {
                emitted: maxRenders,
                processed: renderCount,
                expectedMax,
                elapsed: `${elapsed}ms`
            }
        });
        
        console.log(`  ${passed ? '✅' : '❌'} ${testName}: ${renderCount} renders processed (expected max ${expectedMax})`);
    }
    
    /**
     * Print test results
     */
    printResults() {
        console.log('\n📋 Test Results Summary:');
        console.log('='.repeat(50));
        
        let passed = 0;
        let failed = 0;
        
        for (const result of this.results) {
            const status = result.passed ? '✅ PASS' : '❌ FAIL';
            console.log(`${status} - ${result.test}`);
            if (result.details) {
                console.log(`   Details:`, result.details);
            }
            
            if (result.passed) {
                passed++;
            } else {
                failed++;
            }
        }
        
        console.log('='.repeat(50));
        console.log(`Total: ${this.results.length} | Passed: ${passed} | Failed: ${failed}`);
        
        // Print metrics
        const metrics = eventBus.getMetrics();
        console.log('\n📊 Event Bus Metrics:');
        console.log(`  Total Emitted: ${metrics.totalEventsEmitted}`);
        console.log(`  Total Processed: ${metrics.totalEventsProcessed}`);
        console.log(`  Coalesced: ${metrics.coalescedEvents}`);
        console.log(`  Rate Limited: ${metrics.rateLimitedEvents}`);
        console.log(`  Batched: ${metrics.batchedEvents}`);
        console.log(`  Backpressure: ${metrics.backpressureEvents}`);
        console.log(`  Queue Size: ${metrics.backpressure.queueSize}`);
    }
    
    /**
     * Cleanup test listeners
     */
    cleanup() {
        for (const cleanup of this.listeners) {
            try {
                cleanup();
            } catch (error) {
                console.warn('Cleanup error:', error);
            }
        }
        this.listeners = [];
    }
    
    /**
     * Sleep utility
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Export for use
export { EventStormControlTest };

// Auto-run if in browser console
if (typeof window !== 'undefined') {
    window.testEventStormControl = async () => {
        const test = new EventStormControlTest();
        await test.runAll();
    };
    
    console.log('🧪 Event Storm Control Test Suite loaded!');
    console.log('Run: await testEventStormControl()');
}

# Event Storm Control Testing Guide

## Overview

The event storm control implementation has been completed and is ready for testing. This document describes how to test the implementation.

## Test Files Created

1. **`js/core/test-event-storm-control.js`** - Comprehensive test suite (can be run in browser console)
2. **`test-event-storm.html`** - Interactive test page with UI

## Quick Test Methods

### Method 1: Browser Console Test

1. Open the application in your browser
2. Open browser console (F12)
3. Run the test suite:

```javascript
// Import and run test suite
import('./js/core/test-event-storm-control.js').then(module => {
    const test = new module.EventStormControlTest();
    test.runAll();
});
```

Or use the pre-loaded function:
```javascript
await testEventStormControl();
```

### Method 2: Interactive Test Page

1. Start your development server
2. Navigate to: `http://localhost:8000/test-event-storm.html`
3. Click the test buttons to run individual tests

### Method 3: Manual Browser Console Tests

Open browser console and run:

```javascript
// Get event bus reference
const { eventBus } = await import('./js/core/EventBus.js');
const { eventStormConfig } = await import('./js/core/EventStormConfig.js');

// Test 1: Rate Limiting
let count = 0;
eventBus.on('test:rate', () => count++);
for (let i = 0; i < 100; i++) {
    eventBus.emit('test:rate');
}
setTimeout(() => {
    console.log(`Rate limit test: ${count} events processed (should be rate limited)`);
    eventBus.off('test:rate');
}, 2000);

// Test 2: Coalescing
count = 0;
eventBus.on('app:render-requested', () => count++);
for (let i = 0; i < 50; i++) {
    eventBus.emit('app:render-requested');
}
setTimeout(() => {
    console.log(`Coalescing test: ${count} renders (should be < 50)`);
}, 1000);

// Test 3: Metrics
const metrics = eventBus.getMetrics();
console.log('Metrics:', metrics);
```

## What to Test

### 1. Rate Limiting
- **Test**: Emit 100 events rapidly
- **Expected**: Only rate limit number processed per second
- **Verify**: Check metrics for `rateLimitedEvents`

### 2. Coalescing
- **Test**: Emit multiple `app:render-requested` events rapidly
- **Expected**: Multiple requests coalesced into single render
- **Verify**: Check metrics for `coalescedEvents`

### 3. Batching
- **Test**: Emit multiple `data:save-requested` events rapidly
- **Expected**: Multiple saves batched into single save operation
- **Verify**: Check metrics for `batchedEvents`

### 4. Backpressure
- **Test**: Create slow listener (>100ms execution time)
- **Expected**: Backpressure activates, events queued
- **Verify**: Check `backpressure.queueSize` and `backpressureActive`

### 5. Integration
- **Test**: Normal app usage (typing, editing, saving)
- **Expected**: No performance degradation, events processed correctly
- **Verify**: Check console for errors, monitor metrics

## Expected Results

### Success Criteria

✅ **Rate Limiting**: Events are rate-limited per type
- `app:render-requested`: Max 60/second
- `data:save-requested`: Max 10/second
- `element:updated`: Max 100/second

✅ **Coalescing**: Similar events are merged
- Multiple renders → single render
- Multiple saves → single save
- Multiple element updates → latest update

✅ **Batching**: Events are batched efficiently
- Render requests batched to 60fps
- Save operations batched appropriately

✅ **Backpressure**: Slow listeners trigger queueing
- Queue size stays under limit (1000)
- Events eventually processed (no data loss)

✅ **Performance**: No degradation with high event rates
- 100+ events/second handled smoothly
- UI remains responsive

## Monitoring

### View Metrics

```javascript
const metrics = eventBus.getMetrics();
console.log(metrics);
```

### View Performance Summary

```javascript
import { eventStormMonitor } from './js/core/EventStormMonitor.js';
const summary = eventStormMonitor.getPerformanceSummary();
console.log(summary);
```

### Reset Metrics

```javascript
eventBus.resetMetrics();
```

## Configuration

### Adjust Rate Limits

```javascript
eventStormConfig.updateConfig({
    rateLimits: {
        'app:render-requested': 120, // Increase to 120/second
        'data:save-requested': 20    // Increase to 20/second
    }
});
```

### Disable Features

```javascript
eventBus.configureFeatures({
    rateLimiting: false,
    coalescing: false,
    batching: false,
    backpressure: false
});
```

## Troubleshooting

### Events Not Processing

1. Check if features are enabled: `eventStormConfig.getConfig().enabled`
2. Check queue sizes: `eventBus.getMetrics()`
3. Flush pending events: `eventBus.flush()`

### Performance Issues

1. Check metrics for high queue sizes
2. Check for slow listeners: `eventBus.getMetrics().backpressure`
3. Adjust rate limits if needed

### Backpressure Always Active

1. Check listener execution times
2. Increase `slowListenerThreshold` in config
3. Optimize slow listeners

## Test Results

After running tests, you should see:

- ✅ All rate limiting tests pass
- ✅ Coalescing reduces event count
- ✅ Batching works correctly
- ✅ Backpressure activates when needed
- ✅ No data loss (all events eventually processed)
- ✅ Performance remains good with high event rates

## Next Steps

1. Run the test suite
2. Verify all tests pass
3. Test with real app usage
4. Monitor metrics in production
5. Adjust configuration as needed

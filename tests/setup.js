// tests/setup.js - Test environment setup
import { beforeEach, afterEach } from 'vitest';
import { serviceLocator } from '../js/core/ServiceLocator.js';

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => {
      store[key] = String(value);
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    }
  };
})();

// Set up localStorage mock
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true
});

// Mock performance API if not available
if (typeof performance === 'undefined') {
  global.performance = {
    now: () => Date.now(),
    mark: () => {},
    measure: () => {},
    getEntriesByType: () => [],
    getEntriesByName: () => []
  };
}

// Mock requestAnimationFrame
if (typeof requestAnimationFrame === 'undefined') {
  global.requestAnimationFrame = (callback) => {
    return setTimeout(callback, 16);
  };
  global.cancelAnimationFrame = (id) => {
    clearTimeout(id);
  };
}

// Clean up after each test
afterEach(() => {
    // Clear localStorage
    localStorage.clear();
    
    // Clear service locator to prevent service registration conflicts
    serviceLocator.clear();
    
    // Clear any timers
    if (typeof clearTimeout !== 'undefined') {
        // Clear any pending timeouts
    }
});

// Global test utilities
global.waitFor = (condition, timeout = 5000) => {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const check = () => {
      if (condition()) {
        resolve();
      } else if (Date.now() - startTime > timeout) {
        reject(new Error('waitFor timeout'));
      } else {
        setTimeout(check, 10);
      }
    };
    check();
  });
};

global.measurePerformance = (fn) => {
  const start = performance.now();
  const result = fn();
  const end = performance.now();
  return {
    result,
    duration: end - start
  };
};

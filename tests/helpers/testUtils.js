// tests/helpers/testUtils.js - Common test utilities

/**
 * Wait for a condition to be true
 * @param {Function} condition - Function that returns boolean
 * @param {number} timeout - Timeout in ms
 * @returns {Promise}
 */
export function waitFor(condition, timeout = 5000) {
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
}

/**
 * Measure performance of a function
 * @param {Function} fn - Function to measure
 * @returns {Object} { result, duration }
 */
export function measurePerformance(fn) {
    const start = performance.now();
    const result = fn();
    const end = performance.now();
    return {
        result,
        duration: end - start
    };
}

/**
 * Measure async performance
 * @param {Function} fn - Async function to measure
 * @returns {Promise<Object>} { result, duration }
 */
export async function measureAsyncPerformance(fn) {
    const start = performance.now();
    const result = await fn();
    const end = performance.now();
    return {
        result,
        duration: end - start
    };
}

/**
 * Create a test DOM element
 * @param {string} tag - HTML tag name
 * @param {Object} attributes - Element attributes
 * @param {string} content - Text content
 * @returns {HTMLElement}
 */
export function createTestDOM(tag = 'div', attributes = {}, content = '') {
    const element = document.createElement(tag);
    
    Object.entries(attributes).forEach(([key, value]) => {
        if (key === 'style' && typeof value === 'object') {
            Object.assign(element.style, value);
        } else if (key.startsWith('data-')) {
            element.setAttribute(key, value);
        } else {
            element[key] = value;
        }
    });
    
    if (content) {
        element.textContent = content;
    }
    
    return element;
}

/**
 * Create a test container
 * @returns {HTMLElement}
 */
export function createTestContainer() {
    const container = document.createElement('div');
    container.id = 'test-container';
    document.body.appendChild(container);
    return container;
}

/**
 * Clean up test container
 * @param {HTMLElement} container - Container to clean up
 */
export function cleanupTestContainer(container) {
    if (container && container.parentNode) {
        container.parentNode.removeChild(container);
    }
}

/**
 * Assert operation was applied
 * @param {Object} appState - AppState instance
 * @param {Object} operation - Operation object
 * @param {Function} assertion - Custom assertion function
 */
export function assertOperationApplied(appState, operation, assertion) {
    if (assertion) {
        assertion(appState, operation);
    } else {
        // Default: check if item exists and has expected state
        if (operation.op === 'setText') {
            const item = findItemById(appState, operation.itemId);
            if (item) {
                expect(item.text).toBe(operation.params.text);
            }
        }
    }
}

/**
 * Find item by ID in AppState
 * @param {Object} appState - AppState instance
 * @param {string} itemId - Item ID
 * @returns {Object|null} Item or null
 */
export function findItemById(appState, itemId) {
    if (!appState || !appState.documents) {
        return null;
    }
    
    for (const document of appState.documents) {
        if (!document.groups) continue;
        
        for (const group of document.groups) {
            if (!group.items) continue;
            
            const findInItems = (items) => {
                for (const item of items) {
                    if (item.id === itemId) {
                        return item;
                    }
                    if (item.children) {
                        const found = findInItems(item.children);
                        if (found) return found;
                    }
                }
                return null;
            };
            
            const found = findInItems(group.items);
            if (found) return found;
        }
    }
    
    return null;
}

/**
 * Create a delay
 * @param {number} ms - Milliseconds to delay
 * @returns {Promise}
 */
export function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Run multiple async operations concurrently
 * @param {Array<Function>} operations - Array of async functions
 * @returns {Promise<Array>} Results array
 */
export async function runConcurrently(operations) {
    return Promise.all(operations.map(op => op()));
}

// ElementFinder.js - Centralized element lookup by data attributes
// Provides consistent element finding patterns across the application

export class ElementFinder {
    /**
     * Find element by data attributes
     * @param {string} pageId - Page ID
     * @param {string} binId - Bin ID
     * @param {number} elementIndex - Element index
     * @param {HTMLElement} context - Optional context element (default: document)
     * @param {number} childIndex - Optional child index for nested elements
     * @returns {HTMLElement|null} Found element or null
     */
    static findElement(pageId, binId, elementIndex, context = document, childIndex = null) {
        let selector = `[data-page-id="${pageId}"][data-bin-id="${binId}"][data-element-index="${elementIndex}"]`;
        
        if (childIndex !== null && childIndex !== undefined) {
            selector += `[data-child-index="${childIndex}"]`;
        }
        
        return context.querySelector(selector);
    }
    
    /**
     * Find bin element by data attributes
     * @param {string} pageId - Page ID
     * @param {string} binId - Bin ID
     * @param {HTMLElement} context - Optional context element (default: document)
     * @returns {HTMLElement|null} Found bin element or null
     */
    static findBin(pageId, binId, context = document) {
        return context.querySelector(`[data-page-id="${pageId}"][data-bin-id="${binId}"].bin`);
    }
    
    /**
     * Find page element by data attributes
     * @param {string} pageId - Page ID
     * @param {HTMLElement} context - Optional context element (default: document)
     * @returns {HTMLElement|null} Found page element or null
     */
    static findPage(pageId, context = document) {
        return context.querySelector(`[data-page-id="${pageId}"].page`);
    }
    
    /**
     * Find all elements in a bin
     * @param {string} pageId - Page ID
     * @param {string} binId - Bin ID
     * @param {HTMLElement} context - Optional context element (default: document)
     * @returns {NodeList} List of element nodes
     */
    static findAllElements(pageId, binId, context = document) {
        return context.querySelectorAll(`[data-page-id="${pageId}"][data-bin-id="${binId}"][data-element-index]`);
    }
    
    /**
     * Find element by ID (searches data-element-id attribute)
     * @param {string} elementId - Element ID
     * @param {HTMLElement} context - Optional context element (default: document)
     * @returns {HTMLElement|null} Found element or null
     */
    static findElementById(elementId, context = document) {
        return context.querySelector(`[data-element-id="${elementId}"]`);
    }
    
    /**
     * Find all elements of a specific type
     * @param {string} elementType - Element type
     * @param {HTMLElement} context - Optional context element (default: document)
     * @returns {NodeList} List of element nodes
     */
    static findAllByType(elementType, context = document) {
        return context.querySelectorAll(`.element.${elementType}`);
    }
    
    /**
     * Find element by text content (fuzzy search)
     * @param {string} text - Text to search for
     * @param {HTMLElement} context - Optional context element (default: document)
     * @param {boolean} exact - Whether to match exactly (default: false)
     * @returns {HTMLElement|null} Found element or null
     */
    static findElementByText(text, context = document, exact = false) {
        const elements = context.querySelectorAll('.element');
        for (const element of elements) {
            const elementText = element.textContent || element.innerText || '';
            if (exact) {
                if (elementText.trim() === text.trim()) {
                    return element;
                }
            } else {
                if (elementText.toLowerCase().includes(text.toLowerCase())) {
                    return element;
                }
            }
        }
        return null;
    }
    
    /**
     * Find closest element with data attributes
     * @param {HTMLElement} element - Starting element
     * @param {Object} dataAttrs - Data attributes to match
     * @returns {HTMLElement|null} Found element or null
     */
    static findClosestWithData(element, dataAttrs) {
        if (!element) return null;
        
        let current = element;
        while (current && current !== document.body) {
            let matches = true;
            for (const [key, value] of Object.entries(dataAttrs)) {
                const dataKey = key.startsWith('data-') ? key.slice(5) : key;
                if (current.dataset[dataKey] !== String(value)) {
                    matches = false;
                    break;
                }
            }
            if (matches) {
                return current;
            }
            current = current.parentElement;
        }
        return null;
    }
    
    /**
     * Get element data attributes as object
     * @param {HTMLElement} element - Element to get data from
     * @returns {Object} Object with data attributes
     */
    static getElementData(element) {
        if (!element) return {};
        
        return {
            pageId: element.dataset.pageId,
            binId: element.dataset.binId,
            elementIndex: element.dataset.elementIndex ? parseInt(element.dataset.elementIndex) : null,
            childIndex: element.dataset.childIndex ? parseInt(element.dataset.childIndex) : null,
            elementId: element.dataset.elementId,
            dragType: element.dataset.dragType
        };
    }
}


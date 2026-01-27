// KanbanLayoutManager.js - Manages Kanban layout calculations
export class KanbanLayoutManager {
    constructor() {
        // No constructor needed
    }
    
    /**
     * Calculate column width
     * @param {Object} options - Layout options
     * @returns {string} CSS width value
     */
    calculateColumnWidth(options = {}) {
        const { columnWidth = 300, minWidth = 250, maxWidth = 400 } = options;
        return `flex: 0 0 ${Math.max(minWidth, Math.min(maxWidth, columnWidth))}px`;
    }
    
    /**
     * Calculate container layout styles
     * @param {Object} options - Layout options
     * @returns {string} CSS styles
     */
    calculateContainerStyles(options = {}) {
        const { gap = 15, padding = 20 } = options;
        return `
            display: flex;
            gap: ${gap}px;
            padding: ${padding}px;
            overflow-x: auto;
            min-height: calc(100vh - 100px);
            background: var(--bg-color, #1a1a1a);
            background-image: var(--background-texture, none);
            background-size: 100px 100px;
            font-family: var(--page-font-family);
            color: var(--page-color);
        `;
    }
    
    /**
     * Calculate column styles
     * @param {Object} options - Layout options
     * @returns {string} CSS styles
     */
    calculateColumnStyles(options = {}) {
        return `
            flex: 0 0 300px;
            background: var(--page-bg, #2a2a2a);
            background-image: var(--page-texture, none);
            background-size: 100px 100px;
            box-shadow: var(--page-shadow, none);
            border-radius: var(--page-border-radius, 8px);
            padding: var(--page-padding, 15px);
            display: flex;
            flex-direction: column;
            gap: 10px;
            max-height: calc(100vh - 150px);
            font-family: var(--page-font-family);
            color: var(--page-color);
        `;
    }
    
    /**
     * Calculate column content styles
     * @param {Object} options - Layout options
     * @returns {string} CSS styles
     */
    calculateColumnContentStyles(options = {}) {
        return `
            flex: 1;
            min-height: 200px;
            padding: 10px 0;
            overflow-y: auto;
            max-height: calc(100vh - 250px);
        `;
    }
}

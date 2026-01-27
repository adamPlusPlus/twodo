// BinStyling.js - Styling and theming utilities for bins
// Extracted from BinRenderer.js for reusability and maintainability

/**
 * BinStyling - Functions for applying styles and themes to bins
 */
export const BinStyling = {
    /**
     * Apply visual styles to bin element
     * @param {HTMLElement} binDiv - Bin div element
     * @param {Object} bin - Bin data object
     * @param {string} pageId - Page ID
     * @param {Object} visualSettingsManager - Visual settings manager
     * @param {string} viewFormat - View format
     */
    applyBinStyles(binDiv, bin, pageId, visualSettingsManager, viewFormat = 'default') {
        if (!binDiv || !visualSettingsManager) return;
        
        // Apply visual settings for this bin (includes tag-based settings)
        visualSettingsManager.applyVisualSettings(binDiv, 'bin', bin.id, pageId, viewFormat);
    },
    
    /**
     * Update bin theme
     * @param {HTMLElement} binDiv - Bin div element
     * @param {string} theme - Theme name
     */
    updateBinTheme(binDiv, theme) {
        if (!binDiv) return;
        
        // Remove existing theme classes
        binDiv.classList.remove('theme-light', 'theme-dark', 'theme-auto');
        
        // Add new theme class
        if (theme) {
            binDiv.classList.add(`theme-${theme}`);
        }
    },
    
    /**
     * Apply CSS classes to bin based on state
     * @param {HTMLElement} binDiv - Bin div element
     * @param {Object} bin - Bin data object
     * @param {Object} state - State object (expanded, active, etc.)
     */
    applyBinClasses(binDiv, bin, state = {}) {
        if (!binDiv) return;
        
        // Apply expanded/collapsed class
        if (state.expanded !== undefined) {
            if (state.expanded) {
                binDiv.classList.add('expanded');
                binDiv.classList.remove('collapsed');
            } else {
                binDiv.classList.add('collapsed');
                binDiv.classList.remove('expanded');
            }
        }
        
        // Apply active class
        if (state.active !== undefined) {
            if (state.active) {
                binDiv.classList.add('active');
            } else {
                binDiv.classList.remove('active');
            }
        }
        
        // Apply dragging class
        if (state.dragging !== undefined) {
            if (state.dragging) {
                binDiv.classList.add('dragging');
            } else {
                binDiv.classList.remove('dragging');
            }
        }
        
        // Apply drag-over class
        if (state.dragOver !== undefined) {
            if (state.dragOver) {
                binDiv.classList.add('drag-over');
            } else {
                binDiv.classList.remove('drag-over');
            }
        }
    },
    
    /**
     * Get bin style configuration
     * @param {Object} bin - Bin data object
     * @param {string} pageId - Page ID
     * @returns {Object} Style configuration
     */
    getBinStyleConfig(bin, pageId) {
        return {
            maxHeight: bin.maxHeight || null,
            overflowY: bin.maxHeight && bin.maxHeight > 0 ? 'auto' : 'visible',
            overflowX: 'hidden'
        };
    },
    
    /**
     * Apply inline styles to bin content
     * @param {HTMLElement} binContent - Bin content element
     * @param {Object} config - Style configuration
     */
    applyBinContentStyles(binContent, config) {
        if (!binContent || !config) return;
        
        if (config.maxHeight) {
            binContent.style.maxHeight = `${config.maxHeight}px`;
        }
        
        if (config.overflowY) {
            binContent.style.overflowY = config.overflowY;
        }
        
        if (config.overflowX) {
            binContent.style.overflowX = config.overflowX;
        }
    }
};

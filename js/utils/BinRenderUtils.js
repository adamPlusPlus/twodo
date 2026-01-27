// BinRenderUtils.js - Rendering utilities for bins
// Extracted from BinRenderer.js for reusability and maintainability

/**
 * BinRenderUtils - Functions for creating and updating bin DOM elements
 */
export const BinRenderUtils = {
    /**
     * Create bin DOM element
     * @param {Object} bin - Bin data object
     * @param {string} pageId - Page ID
     * @returns {HTMLElement} Bin div element
     */
    createBinElement(bin, pageId) {
        const binDiv = document.createElement('div');
        binDiv.className = 'bin';
        binDiv.dataset.binId = bin.id;
        binDiv.dataset.pageId = pageId;
        binDiv.draggable = true;
        binDiv.dataset.dragType = 'bin';
        return binDiv;
    },
    
    /**
     * Create element list container
     * @param {Object} bin - Bin data object
     * @returns {HTMLElement} Elements list div
     */
    createElementList(bin) {
        const elementsList = document.createElement('div');
        elementsList.className = 'elements-list';
        elementsList.id = `elements-list-${bin.id}`;
        return elementsList;
    },
    
    /**
     * Create bin header element
     * @param {Object} bin - Bin data object
     * @param {boolean} isExpanded - Whether bin is expanded
     * @returns {HTMLElement} Header div
     */
    createBinHeader(bin, isExpanded) {
        const header = document.createElement('div');
        header.className = 'bin-header';
        
        const binToggleId = `bin-toggle-${bin.id}`;
        const arrow = isExpanded ? '▼' : '▶';
        header.innerHTML = `
            <span class="bin-toggle-arrow" id="${binToggleId}" style="cursor: pointer; margin-right: 8px; color: #888888; user-select: none;">${arrow}</span>
            <div class="bin-title" data-bin-id="${bin.id}">${bin.title}</div>
        `;
        
        return header;
    },
    
    /**
     * Create bin content container
     * @param {Object} bin - Bin data object
     * @param {boolean} isExpanded - Whether bin is expanded
     * @returns {HTMLElement} Content div
     */
    createBinContent(bin, isExpanded) {
        const binContent = document.createElement('div');
        const binContentId = `bin-content-${bin.id}`;
        binContent.id = binContentId;
        binContent.style.display = isExpanded ? 'block' : 'none';
        
        // Apply max-height if set
        if (bin.maxHeight && bin.maxHeight > 0) {
            binContent.style.maxHeight = `${bin.maxHeight}px`;
            binContent.style.overflowY = 'auto';
            binContent.style.overflowX = 'hidden';
        }
        
        return binContent;
    },
    
    /**
     * Create add element button
     * @param {Function} onClick - Click handler
     * @returns {HTMLElement} Button element
     */
    createAddElementButton(onClick) {
        const addElementBtn = document.createElement('button');
        addElementBtn.className = 'add-element-btn';
        addElementBtn.textContent = '+ Add Element';
        if (onClick) {
            addElementBtn.onclick = onClick;
        }
        return addElementBtn;
    },
    
    /**
     * Apply bin structure to DOM
     * @param {HTMLElement} binDiv - Bin div element
     * @param {HTMLElement} header - Header element
     * @param {HTMLElement} binContent - Content element
     * @param {HTMLElement} elementsList - Elements list element
     * @param {HTMLElement} addButton - Add button element
     */
    applyBinStructure(binDiv, header, binContent, elementsList, addButton) {
        binContent.appendChild(elementsList);
        if (addButton) {
            binContent.appendChild(addButton);
        }
        binDiv.appendChild(header);
        binDiv.appendChild(binContent);
    },
    
    /**
     * Update bin content
     * @param {HTMLElement} binDiv - Bin div element
     * @param {Object} bin - Bin data object
     * @param {string} pageId - Page ID
     */
    updateBinContent(binDiv, bin, pageId) {
        // Update title if changed
        const titleElement = binDiv.querySelector('.bin-title');
        if (titleElement && titleElement.textContent !== bin.title) {
            titleElement.textContent = bin.title;
        }
        
        // Update expanded state
        const binContentId = `bin-content-${bin.id}`;
        const binContent = document.getElementById(binContentId);
        if (binContent) {
            // State is managed externally, just ensure element exists
        }
    },
    
    /**
     * Create loading indicator
     * @returns {HTMLElement} Loading indicator div
     */
    createLoadingIndicator() {
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'loading-indicator';
        loadingDiv.style.cssText = 'padding: 20px; text-align: center; color: #888;';
        loadingDiv.textContent = 'Loading document...';
        return loadingDiv;
    }
};

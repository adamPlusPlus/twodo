// ContextMenuHandler.js - Handles context menu display and interaction
export class ContextMenuHandler {
    constructor(app) {
        this.app = app;
    }

    // Position menu within viewport bounds
    positionMenu(menu, x, y) {
        // Show menu temporarily to get its dimensions
        menu.style.visibility = 'hidden';
        menu.style.display = 'block';

        const menuRect = menu.getBoundingClientRect();
        const menuWidth = menuRect.width;
        const menuHeight = menuRect.height;
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        // Hide menu again while we calculate position
        menu.style.display = 'none';
        menu.style.visibility = 'visible';

        // Adjust X position
        let finalX = x;
        if (x + menuWidth > viewportWidth) {
            finalX = x - menuWidth;
            // If it would go off the left side too, position at right edge
            if (finalX < 0) {
                finalX = viewportWidth - menuWidth;
            }
        }

        // Adjust Y position
        let finalY = y;
        if (y + menuHeight > viewportHeight) {
            finalY = y - menuHeight;
            // If it would go off the top too, position at bottom edge
            if (finalY < 0) {
                finalY = viewportHeight - menuHeight;
            }
        }

        menu.style.left = finalX + 'px';
        menu.style.top = finalY + 'px';
    }
    
    showContextMenu(e, pageId, binId, elementIndex, subtaskIndex = null) {
        const now = Date.now();
        const timeSinceLastClick = now - this.app.lastRightClickTime;
        
        // Check if this is a double right-click
        if (timeSinceLastClick < this.app.doubleClickThreshold && this.app.contextMenuState.visible) {
            // Double right-click - hide custom menu and allow browser menu
            this.hideContextMenu();
            // Don't prevent default - let browser show its context menu
            this.app.lastRightClickTime = 0; // Reset to prevent triple-click issues
            return;
        }
        
        // Single right-click - show custom menu
        e.preventDefault();
        e.stopPropagation();
        
        // If binId not provided, try to find it
        if (!binId) {
            binId = this.app.activeBinId;
            if (!binId) {
                const page = this.app.pages.find(p => p.id === pageId);
                if (page && page.bins && page.bins.length > 0) {
                    binId = page.bins[0].id;
                }
            }
        }
        
        this.app.lastRightClickTime = now;
        
        this.app.contextMenuState = {
            visible: true,
            pageId: pageId,
            binId: binId,
            elementIndex: elementIndex,
            subtaskIndex: subtaskIndex,
            x: e.clientX,
            y: e.clientY
        };
        
        const menu = document.getElementById('context-menu');

        if (!menu) {
            console.error('Context menu element not found!');
            return;
        }

        // Show element-specific menu items, hide page-level items
        const pageLevelItems = ['context-add-page', 'context-add-element-page', 'context-delete-page', 'context-toggle-subtasks', 'context-collapse-all-pages', 'context-reset-day'];
        menu.querySelectorAll('.context-menu-item').forEach(item => {
            if (pageLevelItems.includes(item.id)) {
                item.style.display = 'none';
            } else {
                item.style.display = 'block';
            }
        });
        
        // Show/hide menu items based on whether it's a child/subtask
        const editMenuItem = document.getElementById('context-edit');
        const addElementMenuItem = document.getElementById('context-add-element');
        const addChildElementMenuItem = document.getElementById('context-add-child-element');
        const collapsePageMenuItem = document.getElementById('context-collapse-page');
        
        // Ensure edit menu item shows "Edit" for elements
        if (editMenuItem) {
            editMenuItem.textContent = 'Edit';
        }
        
        // Check if element already has children (one-level limit)
        const page = this.app.pages.find(p => p.id === pageId);
        const bin = page?.bins?.find(b => b.id === binId);
        const element = bin && bin.elements && bin.elements[elementIndex] ? bin.elements[elementIndex] : null;
        const hasChildren = element && element.children && element.children.length > 0;
        
        if (subtaskIndex !== null || (typeof elementIndex === 'string' && elementIndex.includes('-'))) {
            // For children/subtasks, hide some options
            if (editMenuItem) editMenuItem.style.display = 'none';
            if (addElementMenuItem) addElementMenuItem.style.display = 'none';
            if (addChildElementMenuItem) addChildElementMenuItem.style.display = 'none';
            if (collapsePageMenuItem) collapsePageMenuItem.style.display = 'none';
        } else {
            // For main elements, show all element options
            if (editMenuItem) editMenuItem.style.display = 'block';
            if (addElementMenuItem) addElementMenuItem.style.display = 'block';
            // Show "Add Child Element" only if element doesn't already have children
            if (addChildElementMenuItem) {
                addChildElementMenuItem.style.display = hasChildren ? 'none' : 'block';
            }
        }
        
        // Update "Collapse Page" / "Expand Page" text based on current state
        if (collapsePageMenuItem && pageId && subtaskIndex === null) {
            const isExpanded = this.app.pageStates && this.app.pageStates[pageId] !== false; // default to true
            collapsePageMenuItem.textContent = isExpanded ? 'Collapse Page' : 'Expand Page';
        }

        this.positionMenu(menu, e.clientX, e.clientY);
        menu.classList.add('active');
        // Remove the inline display style so CSS can take effect
        menu.style.display = '';
    }
    
    hideContextMenu() {
        const menu = document.getElementById('context-menu');
        menu.classList.remove('active');
        this.app.contextMenuState.visible = false;
        // Hide all menu items, they will be shown/hidden as needed
        menu.querySelectorAll('.context-menu-item').forEach(item => {
            item.style.display = '';
        });
    }
    
    showBinContextMenu(e, pageId, binId) {
        const now = Date.now();
        const timeSinceLastClick = now - this.app.lastRightClickTime;
        
        // Check if this is a double right-click
        if (timeSinceLastClick < this.app.doubleClickThreshold && this.app.contextMenuState.visible) {
            // Double right-click - hide custom menu and allow browser menu
            this.hideContextMenu();
            // Don't prevent default - let browser show its context menu
            this.app.lastRightClickTime = 0; // Reset to prevent triple-click issues
            return;
        }
        
        // Single right-click - show custom menu
        e.preventDefault();
        e.stopPropagation();
        
        this.app.lastRightClickTime = now;
        
        const menu = document.getElementById('context-menu');
        
        // Show bin-level menu items (edit bin, add element, add bin, delete bin, etc.)
        const binLevelItems = ['context-edit', 'context-add-element', 'context-add-bin', 'context-delete-bin'];
        const elementLevelItems = ['context-add-child-element', 'context-delete-element', 'context-view-data'];
        const pageLevelItems = ['context-add-page', 'context-add-element-page', 'context-delete-page', 'context-toggle-subtasks', 'context-collapse-all-pages', 'context-reset-day', 'context-collapse-page'];
        
        menu.querySelectorAll('.context-menu-item').forEach(item => {
            if (binLevelItems.includes(item.id)) {
                item.style.display = 'block';
            } else if (elementLevelItems.includes(item.id) || pageLevelItems.includes(item.id)) {
                item.style.display = 'none';
            }
        });
        
        // Update edit menu item text for bins
        const editMenuItem = document.getElementById('context-edit');
        if (editMenuItem) {
            editMenuItem.textContent = 'Edit Bin';
        }

        this.positionMenu(menu, e.clientX, e.clientY);
        menu.classList.add('active');
        // Remove the inline display style so CSS can take effect
        menu.style.display = '';
        
        // Set context menu state with the correct pageId and binId
        this.app.contextMenuState = {
            visible: true,
            pageId: pageId,
            binId: binId,
            elementIndex: null,
            x: e.clientX,
            y: e.clientY
        };
    }
    
    showPageContextMenu(e, pageId = null) {
        const now = Date.now();
        const timeSinceLastClick = now - this.app.lastRightClickTime;
        
        // Check if this is a double right-click
        if (timeSinceLastClick < this.app.doubleClickThreshold && this.app.contextMenuState.visible) {
            // Double right-click - hide custom menu and allow browser menu
            this.hideContextMenu();
            // Don't prevent default - let browser show its context menu
            this.app.lastRightClickTime = 0; // Reset to prevent triple-click issues
            return;
        }
        
        // Single right-click - show custom menu
        e.preventDefault();
        e.stopPropagation();
        
        this.app.lastRightClickTime = now;
        
        const menu = document.getElementById('context-menu');
        
        // Show only page-level menu items (including edit for pages)
        const pageLevelItems = ['context-add-page', 'context-add-element-page', 'context-delete-page', 'context-toggle-subtasks', 'context-collapse-all-pages', 'context-reset-day', 'context-edit'];
        menu.querySelectorAll('.context-menu-item').forEach(item => {
            if (pageLevelItems.includes(item.id)) {
                item.style.display = 'block';
            } else {
                item.style.display = 'none';
            }
        });
        
        // Update edit menu item text for pages
        const editMenuItem = document.getElementById('context-edit');
        if (editMenuItem) {
            editMenuItem.textContent = 'Edit Page';
        }
        
        // Determine which page to use (parameter, the one being right-clicked on, or active page)
        let pageIdToUse = pageId;
        if (!pageIdToUse) {
            const pageEl = e.target.closest('.page-tab');
            if (pageEl) {
                pageIdToUse = pageEl.dataset.pageId;
            }
        }
        if (!pageIdToUse) {
            const pageEl = e.target.closest('.page');
            if (pageEl) {
                pageIdToUse = pageEl.dataset.pageId;
            }
        }
        if (!pageIdToUse) {
            pageIdToUse = this.app.activePageId;
        }
        
        // Update "Toggle All Subtasks" text based on current state
        const toggleSubtasksItem = document.getElementById('context-toggle-subtasks');
        if (toggleSubtasksItem) {
            toggleSubtasksItem.textContent = this.app.allSubtasksExpanded ? '🔽 Collapse All Subtasks' : '▶️ Expand All Subtasks';
        }

        this.positionMenu(menu, e.clientX, e.clientY);
        menu.classList.add('active');
        // Remove the inline display style so CSS can take effect
        menu.style.display = '';
        
        // Set context menu state with the correct pageId (binId explicitly set to null for page context)
        this.app.contextMenuState = {
            visible: true,
            pageId: pageIdToUse,
            binId: null,
            elementIndex: null,
            x: e.clientX,
            y: e.clientY
        };
    }
}

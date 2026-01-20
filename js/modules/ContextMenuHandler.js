// ContextMenuHandler.js - Handles context menu display and interaction
import { getService, SERVICES, hasService } from '../core/AppServices.js';

export class ContextMenuHandler {
    constructor() {
    }
    
    /**
     * Get services
     */
    _getAppState() {
        return getService(SERVICES.APP_STATE);
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
        const appState = this._getAppState();
        const timeSinceLastClick = now - (appState.lastRightClickTime || 0);
        
        // Check if this is a double right-click
        if (timeSinceLastClick < (appState.doubleClickThreshold || 500) && appState.contextMenuState && appState.contextMenuState.visible) {
            // Double right-click - hide custom menu and allow browser menu
            this.hideContextMenu();
            // Don't prevent default - let browser show its context menu
            appState.lastRightClickTime = 0; // Reset to prevent triple-click issues
            return;
        }
        
        // Single right-click - show custom menu
        e.preventDefault();
        e.stopPropagation();
        
        // If binId not provided, try to find it
        if (!binId) {
            binId = appState.activeGroupId;
            if (!binId) {
                const page = appState.documents.find(p => p.id === pageId);
                if (page && page.groups && page.groups.length > 0) {
                    binId = page.groups[0].id;
                }
            }
        }
        
        appState.lastRightClickTime = now;
        
        if (appState.setContextMenuState) {
            appState.setContextMenuState({
                visible: true,
                documentId: pageId,
                groupId: binId,
                elementIndex: elementIndex,
                subtaskIndex: subtaskIndex,
                x: e.clientX,
                y: e.clientY
            });
        }
        
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
        
        // Show customize visuals for elements
        const customizeVisualsItem = document.getElementById('context-customize-visuals');
        if (customizeVisualsItem) {
            customizeVisualsItem.style.display = 'block';
            customizeVisualsItem.textContent = 'Customize Visuals';
        }
        
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
        // Reuse appState from line 57
        const page = appState.documents.find(p => p.id === pageId);
        const bin = page?.groups?.find(b => b.id === binId);
        const items = bin?.items || [];
        if (bin) {
            bin.items = items;
        }
        const element = bin && items && items[elementIndex] ? items[elementIndex] : null;
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
            // Check bin states for page collapse state (pages are collapsed if all bins are collapsed)
            const page = appState.documents.find(p => p.id === pageId);
            const isExpanded = page && page.groups && page.groups.some(bin => {
                const binState = appState.getGroupState ? appState.getGroupState(bin.id) : appState.groupStates?.[bin.id];
                return binState !== 'collapsed';
            });
            collapsePageMenuItem.textContent = isExpanded ? 'Collapse Page' : 'Expand Page';
        }

        this.positionMenu(menu, e.clientX, e.clientY);
        menu.classList.add('active');
        // Remove the inline display style so CSS can take effect
        menu.style.display = '';
    }
    
    hideContextMenu() {
        const menu = document.getElementById('context-menu');
        if (!menu) {
            return;
        }
        menu.classList.remove('active');
        const appState = this._getAppState();
        if (appState.contextMenuState && appState.setContextMenuState) {
            appState.setContextMenuState({ visible: false });
        }
        // Hide all menu items, they will be shown/hidden as needed
        menu.querySelectorAll('.context-menu-item').forEach(item => {
            item.style.display = '';
        });
    }
    
    showBinContextMenu(e, pageId, binId) {
        const now = Date.now();
        const appState = this._getAppState();
        const timeSinceLastClick = now - (appState.lastRightClickTime || 0);
        
        // Check if this is a double right-click
        if (timeSinceLastClick < (appState.doubleClickThreshold || 500) && appState.contextMenuState && appState.contextMenuState.visible) {
            // Double right-click - hide custom menu and allow browser menu
            this.hideContextMenu();
            // Don't prevent default - let browser show its context menu
            appState.lastRightClickTime = 0; // Reset to prevent triple-click issues
            return;
        }
        
        // Single right-click - show custom menu
        e.preventDefault();
        e.stopPropagation();
        
        appState.lastRightClickTime = now;
        
        const menu = document.getElementById('context-menu');
        
        // Show bin-level menu items (edit bin, add element, add bin, delete bin, etc.)
        const binLevelItems = ['context-edit', 'context-customize-visuals', 'context-add-element', 'context-add-bin', 'context-delete-bin'];
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
        
        // Update customize visuals menu item text for bins
        const customizeVisualsItem = document.getElementById('context-customize-visuals');
        if (customizeVisualsItem) {
            customizeVisualsItem.textContent = 'Customize Visuals';
        }

        this.positionMenu(menu, e.clientX, e.clientY);
        menu.classList.add('active');
        // Remove the inline display style so CSS can take effect
        menu.style.display = '';
        
        // Set context menu state with the correct pageId and binId
        if (appState.setContextMenuState) {
            appState.setContextMenuState({
                visible: true,
                pageId: pageId,
                binId: binId,
                elementIndex: null,
                x: e.clientX,
                y: e.clientY
            });
        }
    }
    
    showPageContextMenu(e, pageId = null) {
        const now = Date.now();
        const appState = this._getAppState();
        const timeSinceLastClick = now - (appState.lastRightClickTime || 0);
        
        // Check if this is a double right-click
        if (timeSinceLastClick < (appState.doubleClickThreshold || 500) && appState.contextMenuState && appState.contextMenuState.visible) {
            // Double right-click - hide custom menu and allow browser menu
            this.hideContextMenu();
            // Don't prevent default - let browser show its context menu
            appState.lastRightClickTime = 0; // Reset to prevent triple-click issues
            return;
        }
        
        // Single right-click - show custom menu
        e.preventDefault();
        e.stopPropagation();
        
        appState.lastRightClickTime = now;
        
        const menu = document.getElementById('context-menu');
        
        // Show only page-level menu items (including edit for pages)
        const pageLevelItems = ['context-add-page', 'context-add-element-page', 'context-delete-page', 'context-toggle-subtasks', 'context-collapse-all-pages', 'context-reset-day', 'context-edit', 'context-customize-visuals', 'context-paste-markdown'];
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
        
        // Update customize visuals menu item text for pages
        const customizeVisualsItem = document.getElementById('context-customize-visuals');
        if (customizeVisualsItem) {
            customizeVisualsItem.textContent = 'Customize Visuals';
        }
        
        // Determine which page to use (parameter, the one being right-clicked on, or active page)
        let pageIdToUse = pageId;
        if (!pageIdToUse) {
            const pageElement = e.target.closest('.page-tab');
            if (pageElement) {
                pageIdToUse = pageElement.dataset.pageId;
            }
        }
        if (!pageIdToUse) {
            const pageElement = e.target.closest('.page');
            if (pageElement) {
                pageIdToUse = pageElement.dataset.pageId;
            }
        }
        if (!pageIdToUse) {
            pageIdToUse = appState.currentDocumentId;
        }
        
        // Update "Toggle All Subtasks" text based on current state
        const toggleSubtasksItem = document.getElementById('context-toggle-subtasks');
        if (toggleSubtasksItem) {
            toggleSubtasksItem.textContent = appState.allSubtasksExpanded ? '🔽 Collapse All Subtasks' : '▶️ Expand All Subtasks';
        }

        this.positionMenu(menu, e.clientX, e.clientY);
        menu.classList.add('active');
        // Remove the inline display style so CSS can take effect
        menu.style.display = '';
        
        // Set context menu state with the correct pageId (binId explicitly set to null for page context)
        // Reuse appState from line 256
        if (appState.setContextMenuState) {
            appState.setContextMenuState({
                visible: true,
                pageId: pageIdToUse,
                binId: null,
                elementIndex: null,
                x: e.clientX,
                y: e.clientY
            });
        }
    }
}

// PageManager.js - Handles page-related operations (pages contain bins)
import { eventBus } from '../core/EventBus.js';

export class PageManager {
    constructor(app) {
        this.app = app;
    }
    
    async addPage() {
        const pageNum = this.app.pages.length + 1;
        const newPage = {
            id: `page-${pageNum}`,
            bins: [{
                id: 'bin-0',
                title: 'Bin 1',
                elements: []
            }],
            plugins: [],
            format: null,
            config: {}
        };
        const pageIndex = this.app.pages.length;
        this.app.pages.push(newPage);
        this.app.currentPageId = `page-${pageNum}`;
        
        // Record undo/redo change
        if (this.app.undoRedoManager) {
            this.app.undoRedoManager.recordPageAdd(pageIndex, newPage);
        }
        
        // Initialize plugins for new page
        if (this.app.pagePluginManager) {
            await this.app.pagePluginManager.initializePagePlugins(newPage.id);
        }
        
        // Emit event
        eventBus.emit('page:created', { pageId: newPage.id });
        
        this.app.dataManager.saveData();
        this.app.render();
    }
    
    async deletePage(pageId) {
        // Don't allow deleting the last page
        if (this.app.pages.length <= 1) {
            return;
        }
        
        const page = this.app.pages.find(p => p.id === pageId);
        if (!page) return;
        
        // Record undo/redo change before deletion
        if (this.app.undoRedoManager) {
            this.app.undoRedoManager.recordPageDelete(pageId, JSON.parse(JSON.stringify(page)));
        }
        
        // Cleanup plugins for page
        if (this.app.pagePluginManager) {
            await this.app.pagePluginManager.cleanupPagePlugins(pageId);
        }
        
        // Emit event before deletion
        eventBus.emit('page:deleted', { pageId });
        
        this.app.pages = this.app.pages.filter(p => p.id !== pageId);
        
        // If current page was deleted, switch to first page
        if (this.app.currentPageId === pageId) {
            this.app.currentPageId = this.app.pages[0]?.id || null;
        }
        
        this.app.dataManager.saveData();
        this.app.render();
    }
    
    movePage(sourcePageId, targetPageId) {
        if (sourcePageId === targetPageId) return;
        
        const sourcePage = this.app.pages.find(p => p.id === sourcePageId);
        const targetPage = this.app.pages.find(p => p.id === targetPageId);
        
        if (!sourcePage || !targetPage) return;
        
        const sourceIndex = this.app.pages.indexOf(sourcePage);
        const targetIndex = this.app.pages.indexOf(targetPage);
        
        // Remove from source position
        this.app.pages.splice(sourceIndex, 1);
        
        // Insert at target position (adjust if source was before target)
        const insertIndex = sourceIndex < targetIndex ? targetIndex - 1 : targetIndex;
        this.app.pages.splice(insertIndex, 0, sourcePage);
        
        this.app.dataManager.saveData();
        requestAnimationFrame(() => {
            this.app.render();
        });
    }
    
    renamePage(pageId, newTitle) {
        const page = this.app.pages.find(p => p.id === pageId);
        if (page) {
            // Pages don't have titles in the new structure, but we can store it for future use
            // For now, pages are just numbered
            this.app.dataManager.saveData();
            this.app.render();
        }
    }
}

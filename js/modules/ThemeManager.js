// ThemeManager.js - Manages themes with view-specific and page-specific overrides
import { eventBus } from '../core/EventBus.js';
import { EVENTS } from '../core/AppEvents.js';

export class ThemeManager {
    constructor() {
        this.storageKey = 'twodo-themes';
        this.themes = this.loadThemes();
        
        // Initialize with default theme structure
        if (!this.themes.global) {
            this.themes.global = this.getDefaultTheme();
        }
        
        // View-specific themes (one per format)
        const viewFormats = ['default', 'grid-layout-format', 'horizontal-layout-format', 'document-view-format', 'page-kanban-format', 'trello-board'];
        viewFormats.forEach(format => {
            if (!this.themes.views[format]) {
                this.themes.views[format] = null; // null means inherit from global
            }
        });
        
        this.saveThemes();
    }
    
    loadThemes() {
        const stored = localStorage.getItem(this.storageKey);
        if (stored) {
            try {
                const themes = JSON.parse(stored);
                // Ensure structure exists
                return {
                    global: themes.global || this.getDefaultTheme(),
                    views: themes.views || {},
                    documents: themes.documents || {}
                };
            } catch (e) {
                console.error('Failed to parse themes:', e);
            }
        }
        return {
            global: this.getDefaultTheme(),
            views: {},
            documents: {}
        };
    }
    
    saveThemes() {
        localStorage.setItem(this.storageKey, JSON.stringify(this.themes));
    }
    
    getDefaultTheme() {
        // Return a copy of default settings structure
        return {
            background: '#1a1a1a',
            page: {
                background: '#2d2d2d',
                margin: '0px',
                padding: '20px',
                borderRadius: '8px',
                fontFamily: '-apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif',
                fontSize: '14px',
                opacity: '1',
                color: '#e0e0e0',
                title: {
                    fontSize: '18px',
                    color: '#ffffff',
                    marginBottom: '15px'
                }
            },
            element: {
                background: 'transparent',
                margin: '0px',
                padding: '10px',
                paddingVertical: '10px',
                paddingHorizontal: '10px',
                gap: '8px',
                fontFamily: '-apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif',
                fontSize: '14px',
                opacity: '1',
                color: '#e0e0e0',
                hoverBackground: '#363636'
            },
            header: {
                fontSize: '16px',
                color: '#b8b8b8',
                margin: '10px 0'
            },
            checkbox: {
                size: '18px'
            }
        };
    }
    
    /**
     * Deep merge two theme objects
     */
    mergeThemes(base, override) {
        const merged = { ...base };
        for (const key in override) {
            if (override[key] && typeof override[key] === 'object' && !Array.isArray(override[key])) {
                merged[key] = this.mergeThemes(merged[key] || {}, override[key]);
            } else {
                merged[key] = override[key];
            }
        }
        return merged;
    }
    
    /**
     * Get effective theme for a page
     * Priority: page-specific > view-specific > global
     */
    getEffectiveTheme(pageId, viewFormat = 'default') {
        let theme = { ...this.themes.global };
        
        // Apply view-specific theme if exists
        if (this.themes.views[viewFormat] && this.themes.views[viewFormat] !== null) {
            theme = this.mergeThemes(theme, this.themes.views[viewFormat]);
        }
        
        // Apply page-specific theme if exists
        if (this.themes.documents[pageId]) {
            theme = this.mergeThemes(theme, this.themes.documents[pageId]);
        }
        
        return theme;
    }
    
    /**
     * Set global theme
     */
    setGlobalTheme(theme) {
        this.themes.global = this.mergeThemes(this.getDefaultTheme(), theme);
        this.saveThemes();
        this.applyTheme(this.themes.global);
        eventBus.emit('theme:updated', { type: 'global', theme: this.themes.global });
    }
    
    /**
     * Set view-specific theme
     */
    setViewTheme(viewFormat, theme) {
        if (theme === null) {
            // Remove view theme (inherit from global)
            delete this.themes.views[viewFormat];
        } else {
            this.themes.views[viewFormat] = this.mergeThemes(this.getDefaultTheme(), theme);
        }
        this.saveThemes();
        eventBus.emit('theme:updated', { type: 'view', viewFormat, theme });
    }
    
    /**
     * Set page-specific theme
     */
    setPageTheme(pageId, theme) {
        if (theme === null) {
            // Remove page theme (inherit from view/global)
            delete this.themes.documents[pageId];
        } else {
            this.themes.documents[pageId] = this.mergeThemes(this.getDefaultTheme(), theme);
        }
        this.saveThemes();
        eventBus.emit('theme:updated', { type: 'page', pageId, theme });
    }
    
    /**
     * Get view-specific theme (or null if inheriting)
     */
    getViewTheme(viewFormat) {
        return this.themes.views[viewFormat] || null;
    }
    
    /**
     * Get page-specific theme (or null if inheriting)
     */
    getPageTheme(pageId) {
        return this.themes.documents[pageId] || null;
    }
    
    /**
     * Apply theme to CSS variables
     */
    applyTheme(theme, scope = 'root') {
        let target;
        if (scope === 'root') {
            target = document.documentElement;
        } else if (scope instanceof HTMLElement) {
            target = scope;
        } else {
            target = document.querySelector(scope);
        }
        if (!target) return;
        
        target.style.setProperty('--bg-color', theme.background);
        target.style.setProperty('--page-bg', theme.page.background);
        target.style.setProperty('--page-margin', theme.page.margin);
        target.style.setProperty('--page-padding', theme.page.padding);
        target.style.setProperty('--page-border-radius', theme.page.borderRadius);
        target.style.setProperty('--page-font-family', theme.page.fontFamily);
        target.style.setProperty('--page-font-size', theme.page.fontSize);
        target.style.setProperty('--page-opacity', theme.page.opacity);
        target.style.setProperty('--page-color', theme.page.color);
        target.style.setProperty('--page-title-font-size', theme.page.title.fontSize);
        target.style.setProperty('--page-title-color', theme.page.title.color);
        target.style.setProperty('--page-title-margin-bottom', theme.page.title.marginBottom);
        target.style.setProperty('--element-bg', theme.element.background);
        target.style.setProperty('--element-margin', theme.element.margin);
        target.style.setProperty('--element-padding', theme.element.padding);
        target.style.setProperty('--element-padding-vertical', theme.element.paddingVertical || theme.element.padding);
        target.style.setProperty('--element-padding-horizontal', theme.element.paddingHorizontal || theme.element.padding);
        target.style.setProperty('--element-gap', theme.element.gap || '8px');
        target.style.setProperty('--element-font-family', theme.element.fontFamily);
        target.style.setProperty('--element-font-size', theme.element.fontSize);
        target.style.setProperty('--element-opacity', theme.element.opacity);
        target.style.setProperty('--element-color', theme.element.color);
        target.style.setProperty('--element-hover-bg', theme.element.hoverBackground);
        target.style.setProperty('--header-font-size', theme.header.fontSize);
        target.style.setProperty('--header-color', theme.header.color);
        target.style.setProperty('--header-margin', theme.header.margin);
        target.style.setProperty('--checkbox-size', (theme.checkbox && theme.checkbox.size) || '18px');
        
        // Apply textures and shadows if present
        if (theme.page.texture) {
            target.style.setProperty('--page-texture', theme.page.texture);
        }
        if (theme.page.shadow) {
            target.style.setProperty('--page-shadow', theme.page.shadow);
        }
        if (theme.element.texture) {
            target.style.setProperty('--element-texture', theme.element.texture);
        }
        if (theme.element.shadow) {
            target.style.setProperty('--element-shadow', theme.element.shadow);
        }
        if (theme.backgroundTexture) {
            target.style.setProperty('--background-texture', theme.backgroundTexture);
        }
    }
    
    /**
     * Apply effective theme for a specific page/view combination
     */
    applyPageTheme(pageId, viewFormat = 'default', containerElement = null) {
        const theme = this.getEffectiveTheme(pageId, viewFormat);
        
        // Always apply to root first so CSS variables are globally available
        this.applyTheme(theme, 'root');
        
        // Also apply to container if provided (for page-specific overrides)
        if (containerElement && containerElement instanceof HTMLElement) {
            this.applyTheme(theme, containerElement);
        }
    }
    
    /**
     * Export theme as JSON
     */
    exportTheme(theme) {
        return JSON.stringify(theme, null, 2);
    }
    
    /**
     * Export all themes (global, views, pages)
     */
    exportAllThemes() {
        return JSON.stringify(this.themes, null, 2);
    }
    
    /**
     * Import theme from JSON
     */
    importTheme(jsonString, themeType = 'global', viewFormat = null, pageId = null) {
        try {
            const imported = JSON.parse(jsonString);
            if (themeType === 'global') {
                this.setGlobalTheme(imported);
            } else if (themeType === 'view' && viewFormat) {
                this.setViewTheme(viewFormat, imported);
            } else if (themeType === 'page' && pageId) {
                this.setPageTheme(pageId, imported);
            }
            return true;
        } catch (e) {
            console.error('Failed to parse theme JSON:', e);
            return false;
        }
    }
    
    /**
     * Import all themes from JSON
     */
    importAllThemes(jsonString) {
        try {
            const imported = JSON.parse(jsonString);
            if (imported.global) {
                this.themes.global = this.mergeThemes(this.getDefaultTheme(), imported.global);
            }
            if (imported.views) {
                this.themes.views = { ...this.themes.views, ...imported.views };
            }
            if (imported.documents) {
                this.themes.documents = { ...this.themes.documents, ...imported.documents };
            }
            this.saveThemes();
            eventBus.emit('theme:imported', { themes: this.themes });
            return true;
        } catch (e) {
            console.error('Failed to import themes:', e);
            return false;
        }
    }
    
    /**
     * Get all available view formats
     */
    getViewFormats() {
        return ['default', 'grid-layout-format', 'horizontal-layout-format', 'document-view-format', 'page-kanban-format', 'trello-board'];
    }
}


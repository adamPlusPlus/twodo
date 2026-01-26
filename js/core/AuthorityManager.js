// AuthorityManager.js - Manages representation authority to prevent drift
// Used for Phase 5: Representation Authority

import { eventBus } from './EventBus.js';
import { EVENTS } from './AppEvents.js';
import { getService, SERVICES } from './AppServices.js';

/**
 * Authority modes
 */
export const AUTHORITY_MODES = {
    CANONICAL: 'CANONICAL',           // Default: Semantic operations + canonical model
    MARKDOWN_SOURCE: 'MARKDOWN_SOURCE', // Markdown text is authoritative
    LATEX_SOURCE: 'LATEX_SOURCE'       // LaTeX text is authoritative
};

/**
 * AuthorityManager - Manages representation authority
 * 
 * Responsibilities:
 * - Track authority mode per page/view combination
 * - Validate operations against current authority
 * - Prevent circular update loops
 * - Reconcile inconsistencies when switching authority modes
 */
export class AuthorityManager {
    constructor() {
        // Map: pageId -> viewId -> authority mode
        this.authorities = new Map();
        
        // Track update sources to prevent circular updates
        // Map: pageId -> viewId -> Set of update sources
        this.updateSources = new Map();
        
        // Track pending reconciliations
        this.pendingReconciliations = new Map();
    }
    
    /**
     * Set authority mode for a page/view combination
     * @param {string} pageId - Page ID
     * @param {string} viewId - View ID (format renderer view projection ID)
     * @param {string} mode - Authority mode (AUTHORITY_MODES)
     * @returns {boolean} True if set successfully
     */
    setAuthority(pageId, viewId, mode) {
        if (!pageId || !viewId) {
            console.error('[AuthorityManager] pageId and viewId are required');
            return false;
        }
        
        if (!Object.values(AUTHORITY_MODES).includes(mode)) {
            console.error('[AuthorityManager] Invalid authority mode:', mode);
            return false;
        }
        
        if (!this.authorities.has(pageId)) {
            this.authorities.set(pageId, new Map());
        }
        
        const oldMode = this.authorities.get(pageId).get(viewId);
        this.authorities.get(pageId).set(viewId, mode);
        
        // Clear update sources when authority changes
        this._clearUpdateSources(pageId, viewId);
        
        // Emit event
        eventBus.emit(EVENTS.AUTHORITY.MODE_CHANGED, {
            pageId,
            viewId,
            oldMode,
            newMode: mode
        });
        
        console.log(`[AuthorityManager] Authority set: ${pageId}/${viewId} = ${mode}`);
        return true;
    }
    
    /**
     * Get authority mode for a page/view combination
     * @param {string} pageId - Page ID
     * @param {string} viewId - View ID
     * @returns {string} Authority mode (defaults to CANONICAL)
     */
    getAuthority(pageId, viewId) {
        if (!pageId) {
            return AUTHORITY_MODES.CANONICAL;
        }
        
        const pageAuthorities = this.authorities.get(pageId);
        if (!pageAuthorities) {
            return AUTHORITY_MODES.CANONICAL;
        }
        
        return pageAuthorities.get(viewId) || AUTHORITY_MODES.CANONICAL;
    }
    
    /**
     * Check if a representation is authoritative
     * @param {string} pageId - Page ID
     * @param {string} viewId - View ID
     * @param {string} representation - Representation type ('MARKDOWN_SOURCE', 'LATEX_SOURCE', 'CANONICAL')
     * @returns {boolean} True if representation is authoritative
     */
    isAuthoritative(pageId, viewId, representation) {
        const currentMode = this.getAuthority(pageId, viewId);
        return currentMode === representation;
    }
    
    /**
     * Validate operation against current authority
     * @param {Object} operation - Operation object
     * @param {string} pageId - Page ID
     * @param {string} viewId - View ID (optional, for view-specific checks)
     * @returns {boolean} True if operation is allowed
     */
    validateOperation(operation, pageId, viewId = null) {
        if (!pageId || !operation) {
            return true; // Allow if we can't determine authority
        }
        
        // Get authority for this page/view
        const authority = viewId 
            ? this.getAuthority(pageId, viewId)
            : this._getPageAuthority(pageId);
        
        // If canonical is authoritative, all operations are allowed
        if (authority === AUTHORITY_MODES.CANONICAL) {
            return true;
        }
        
        // If source-text is authoritative, check if operation is from authoritative source
        // Operations from non-authoritative sources should be rejected
        // But we need to check if this operation is part of an authoritative update
        const isFromAuthoritativeSource = this.isUpdateFromAuthoritativeSource(
            pageId,
            viewId,
            operation
        );
        
        if (isFromAuthoritativeSource) {
            return true; // Allow operations from authoritative source
        }
        
        // Reject operations that would conflict with source-text authority
        // This prevents operations from canonical model edits when source-text is authoritative
        console.warn('[AuthorityManager] Operation rejected due to authority conflict:', {
            operation: operation.op,
            pageId,
            viewId,
            authority
        });
        
        return false;
    }
    
    /**
     * Get page-level authority (most restrictive mode for the page)
     * @private
     * @param {string} pageId - Page ID
     * @returns {string} Authority mode
     */
    _getPageAuthority(pageId) {
        const pageAuthorities = this.authorities.get(pageId);
        if (!pageAuthorities || pageAuthorities.size === 0) {
            return AUTHORITY_MODES.CANONICAL;
        }
        
        // If any view has source-text authority, return that
        for (const mode of pageAuthorities.values()) {
            if (mode !== AUTHORITY_MODES.CANONICAL) {
                return mode;
            }
        }
        
        return AUTHORITY_MODES.CANONICAL;
    }
    
    /**
     * Prevent circular update by tracking update source
     * @param {string} pageId - Page ID
     * @param {string} viewId - View ID
     * @param {string} source - Update source ('markdown', 'latex', 'canonical', etc.)
     */
    preventCircularUpdate(pageId, viewId, source) {
        if (!pageId || !viewId || !source) {
            return;
        }
        
        if (!this.updateSources.has(pageId)) {
            this.updateSources.set(pageId, new Map());
        }
        
        const pageSources = this.updateSources.get(pageId);
        if (!pageSources.has(viewId)) {
            pageSources.set(viewId, new Set());
        }
        
        pageSources.get(viewId).add(source);
        
        // Clear after a short delay to allow operation processing
        setTimeout(() => {
            this._clearUpdateSource(pageId, viewId, source);
        }, 100);
    }
    
    /**
     * Check if update is from authoritative source
     * @param {string} pageId - Page ID
     * @param {string} viewId - View ID
     * @param {Object} operation - Operation object
     * @returns {boolean} True if update is from authoritative source
     */
    isUpdateFromAuthoritativeSource(pageId, viewId, operation) {
        if (!pageId || !viewId) {
            return false;
        }
        
        const authority = this.getAuthority(pageId, viewId);
        if (authority === AUTHORITY_MODES.CANONICAL) {
            return true; // Canonical is always authoritative
        }
        
        // Check if this operation is part of an authoritative update
        const pageSources = this.updateSources.get(pageId);
        if (!pageSources) {
            return false;
        }
        
        const viewSources = pageSources.get(viewId);
        if (!viewSources) {
            return false;
        }
        
        // Check if source matches authority
        if (authority === AUTHORITY_MODES.MARKDOWN_SOURCE && viewSources.has('markdown')) {
            return true;
        }
        
        if (authority === AUTHORITY_MODES.LATEX_SOURCE && viewSources.has('latex')) {
            return true;
        }
        
        return false;
    }
    
    /**
     * Clear update source
     * @private
     * @param {string} pageId - Page ID
     * @param {string} viewId - View ID
     * @param {string} source - Update source
     */
    _clearUpdateSource(pageId, viewId, source) {
        const pageSources = this.updateSources.get(pageId);
        if (!pageSources) {
            return;
        }
        
        const viewSources = pageSources.get(viewId);
        if (!viewSources) {
            return;
        }
        
        viewSources.delete(source);
    }
    
    /**
     * Clear all update sources for a view
     * @private
     * @param {string} pageId - Page ID
     * @param {string} viewId - View ID
     */
    _clearUpdateSources(pageId, viewId) {
        const pageSources = this.updateSources.get(pageId);
        if (!pageSources) {
            return;
        }
        
        pageSources.delete(viewId);
    }
    
    /**
     * Reconcile inconsistencies when switching authority modes
     * @param {string} pageId - Page ID
     * @param {string} viewId - View ID
     * @param {string} sourceText - Source text (markdown or LaTeX)
     * @param {Object} canonicalModel - Canonical model (AppState)
     * @returns {Object} Reconciliation result
     */
    reconcile(pageId, viewId, sourceText, canonicalModel) {
        // This is a placeholder for future reconciliation logic
        // For now, we'll just detect drift and emit an event
        
        const authority = this.getAuthority(pageId, viewId);
        
        // Emit drift detection event
        eventBus.emit(EVENTS.AUTHORITY.DRIFT_DETECTED, {
            pageId,
            viewId,
            authority,
            sourceText,
            canonicalModel
        });
        
        return {
            success: true,
            reconciled: false,
            message: 'Drift detected, manual reconciliation may be needed'
        };
    }
    
    /**
     * Clear authority for a view
     * @param {string} pageId - Page ID
     * @param {string} viewId - View ID
     */
    clearAuthority(pageId, viewId) {
        const pageAuthorities = this.authorities.get(pageId);
        if (pageAuthorities) {
            pageAuthorities.delete(viewId);
            if (pageAuthorities.size === 0) {
                this.authorities.delete(pageId);
            }
        }
        
        this._clearUpdateSources(pageId, viewId);
    }
}

// Create and export singleton instance
export const authorityManager = new AuthorityManager();

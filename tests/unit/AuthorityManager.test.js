// tests/unit/AuthorityManager.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import { AuthorityManager, AUTHORITY_MODES } from '../../js/core/AuthorityManager.js';
import { EVENTS } from '../../js/core/AppEvents.js';
import { setupMockServices } from '../helpers/mockServices.js';
import { registerService, SERVICES } from '../../js/core/AppServices.js';

describe('AuthorityManager', () => {
    let authorityManager;
    let mockServices;
    
    beforeEach(() => {
        mockServices = setupMockServices();
        registerService(SERVICES.EVENT_BUS, mockServices.eventBus);
        authorityManager = new AuthorityManager();
    });
    
    describe('setAuthority', () => {
        it('should set authority mode for page/view', () => {
            const result = authorityManager.setAuthority('page-1', 'view-1', AUTHORITY_MODES.MARKDOWN_SOURCE);
            
            expect(result).toBe(true);
            expect(authorityManager.getAuthority('page-1', 'view-1')).toBe(AUTHORITY_MODES.MARKDOWN_SOURCE);
        });
        
        it('should emit mode changed event', async () => {
            // Import the real eventBus to listen (AuthorityManager uses the singleton)
            const { eventBus } = await import('../../js/core/EventBus.js');
            let eventEmitted = false;
            let eventData = null;
            
            const handler = (data) => {
                eventEmitted = true;
                eventData = data;
            };
            eventBus.on(EVENTS.AUTHORITY.MODE_CHANGED, handler);
            
            authorityManager.setAuthority('page-1', 'view-1', AUTHORITY_MODES.MARKDOWN_SOURCE);
            
            // Wait for async event processing
            await new Promise(resolve => setTimeout(resolve, 200));
            
            expect(eventEmitted).toBe(true);
            expect(eventData.newMode).toBe(AUTHORITY_MODES.MARKDOWN_SOURCE);
            eventBus.off(EVENTS.AUTHORITY.MODE_CHANGED, handler);
        });
        
        it('should return false for invalid mode', () => {
            const result = authorityManager.setAuthority('page-1', 'view-1', 'INVALID');
            expect(result).toBe(false);
        });
    });
    
    describe('getAuthority', () => {
        it('should return CANONICAL by default', () => {
            const mode = authorityManager.getAuthority('page-1', 'view-1');
            expect(mode).toBe(AUTHORITY_MODES.CANONICAL);
        });
        
        it('should return set authority mode', () => {
            authorityManager.setAuthority('page-1', 'view-1', AUTHORITY_MODES.LATEX_SOURCE);
            const mode = authorityManager.getAuthority('page-1', 'view-1');
            expect(mode).toBe(AUTHORITY_MODES.LATEX_SOURCE);
        });
    });
    
    describe('isAuthoritative', () => {
        it('should return true when representation is authoritative', () => {
            authorityManager.setAuthority('page-1', 'view-1', AUTHORITY_MODES.MARKDOWN_SOURCE);
            
            expect(authorityManager.isAuthoritative('page-1', 'view-1', AUTHORITY_MODES.MARKDOWN_SOURCE)).toBe(true);
            expect(authorityManager.isAuthoritative('page-1', 'view-1', AUTHORITY_MODES.CANONICAL)).toBe(false);
        });
    });
    
    describe('validateOperation', () => {
        it('should allow operations when canonical is authoritative', () => {
            const operation = { op: 'setText', itemId: 'item-1', params: {} };
            const isValid = authorityManager.validateOperation(operation, 'page-1', 'view-1');
            
            expect(isValid).toBe(true);
        });
        
        it('should allow operations from authoritative source', () => {
            authorityManager.setAuthority('page-1', 'view-1', AUTHORITY_MODES.MARKDOWN_SOURCE);
            authorityManager.preventCircularUpdate('page-1', 'view-1', 'markdown');
            
            const operation = { op: 'setText', itemId: 'item-1', params: {} };
            // validateOperation checks isUpdateFromAuthoritativeSource internally
            // After preventCircularUpdate, the operation should be allowed
            const isValid = authorityManager.validateOperation(operation, 'page-1', 'view-1');
            
            // Should allow if from authoritative source (preventCircularUpdate was called)
            expect(isValid).toBe(true);
        });
    });
    
    describe('preventCircularUpdate', () => {
        it('should track update source', () => {
            authorityManager.preventCircularUpdate('page-1', 'view-1', 'markdown');
            
            const isFromSource = authorityManager.isUpdateFromAuthoritativeSource(
                'page-1',
                'view-1',
                { op: 'setText' }
            );
            
            // Should be true immediately after preventCircularUpdate
            expect(isFromSource).toBe(true);
        });
    });
    
    describe('isUpdateFromAuthoritativeSource', () => {
        it('should return true for canonical authority', () => {
            const isFromSource = authorityManager.isUpdateFromAuthoritativeSource(
                'page-1',
                'view-1',
                { op: 'setText' }
            );
            
            // Canonical is always authoritative
            expect(isFromSource).toBe(true);
        });
        
        it('should return true when source matches authority', () => {
            authorityManager.setAuthority('page-1', 'view-1', AUTHORITY_MODES.MARKDOWN_SOURCE);
            authorityManager.preventCircularUpdate('page-1', 'view-1', 'markdown');
            
            const isFromSource = authorityManager.isUpdateFromAuthoritativeSource(
                'page-1',
                'view-1',
                { op: 'setText' }
            );
            
            expect(isFromSource).toBe(true);
        });
    });
    
    describe('clearAuthority', () => {
        it('should clear authority for view', () => {
            authorityManager.setAuthority('page-1', 'view-1', AUTHORITY_MODES.MARKDOWN_SOURCE);
            authorityManager.clearAuthority('page-1', 'view-1');
            
            const mode = authorityManager.getAuthority('page-1', 'view-1');
            expect(mode).toBe(AUTHORITY_MODES.CANONICAL);
        });
    });
});

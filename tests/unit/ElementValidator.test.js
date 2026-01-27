// tests/unit/ElementValidator.test.js
import { describe, it, expect } from 'vitest';
import { ElementValidator } from '../../js/utils/ElementValidator.js';

describe('ElementValidator', () => {
    const mockAppState = {
        documents: [
            {
                id: 'page-1',
                groups: [
                    {
                        id: 'group-1',
                        items: [
                            { id: 'item-1', text: 'Item 1' },
                            { id: 'item-2', text: 'Item 2' }
                        ]
                    }
                ]
            }
        ]
    };
    
    describe('validateDocumentExists', () => {
        it('should validate existing document', () => {
            const result = ElementValidator.validateDocumentExists(mockAppState, 'page-1');
            
            expect(result.valid).toBe(true);
            expect(result.document).toBeTruthy();
            expect(result.document.id).toBe('page-1');
            expect(result.error).toBeNull();
        });
        
        it('should reject non-existent document', () => {
            const result = ElementValidator.validateDocumentExists(mockAppState, 'page-999');
            
            expect(result.valid).toBe(false);
            expect(result.document).toBeNull();
            expect(result.error).toContain('not found');
        });
        
        it('should reject invalid appState', () => {
            const result = ElementValidator.validateDocumentExists(null, 'page-1');
            
            expect(result.valid).toBe(false);
            expect(result.error).toContain('AppState not available');
        });
        
        it('should reject missing pageId', () => {
            const result = ElementValidator.validateDocumentExists(mockAppState, null);
            
            expect(result.valid).toBe(false);
            expect(result.error).toContain('Page ID is required');
        });
    });
    
    describe('validateGroupExists', () => {
        const document = mockAppState.documents[0];
        
        it('should validate existing group', () => {
            const result = ElementValidator.validateGroupExists(document, 'group-1');
            
            expect(result.valid).toBe(true);
            expect(result.group).toBeTruthy();
            expect(result.group.id).toBe('group-1');
            expect(result.error).toBeNull();
        });
        
        it('should reject non-existent group', () => {
            const result = ElementValidator.validateGroupExists(document, 'group-999');
            
            expect(result.valid).toBe(false);
            expect(result.group).toBeNull();
            expect(result.error).toContain('not found');
        });
        
        it('should reject invalid document', () => {
            const result = ElementValidator.validateGroupExists(null, 'group-1');
            
            expect(result.valid).toBe(false);
            expect(result.error).toContain('Document is required');
        });
        
        it('should reject document without groups', () => {
            const result = ElementValidator.validateGroupExists({ id: 'page-1' }, 'group-1');
            
            expect(result.valid).toBe(false);
            expect(result.error).toContain('no groups');
        });
    });
    
    describe('validateElementExists', () => {
        const group = mockAppState.documents[0].groups[0];
        
        it('should validate existing element', () => {
            const result = ElementValidator.validateElementExists(group, 0);
            
            expect(result.valid).toBe(true);
            expect(result.element).toBeTruthy();
            expect(result.element.id).toBe('item-1');
            expect(result.error).toBeNull();
        });
        
        it('should reject out of range index', () => {
            const result = ElementValidator.validateElementExists(group, 999);
            
            expect(result.valid).toBe(false);
            expect(result.element).toBeNull();
            expect(result.error).toContain('out of range');
        });
        
        it('should reject invalid group', () => {
            const result = ElementValidator.validateElementExists(null, 0);
            
            expect(result.valid).toBe(false);
            expect(result.error).toContain('Group is required');
        });
        
        it('should reject group without items', () => {
            const result = ElementValidator.validateElementExists({ id: 'group-1' }, 0);
            
            expect(result.valid).toBe(false);
            expect(result.error).toContain('no items');
        });
    });
    
    describe('validateElementType', () => {
        it('should validate valid element type', () => {
            const result = ElementValidator.validateElementType('task');
            
            expect(result.valid).toBe(true);
            expect(result.error).toBeNull();
        });
        
        it('should validate any string type', () => {
            const result = ElementValidator.validateElementType('custom-type');
            
            expect(result.valid).toBe(true);
            expect(result.error).toBeNull();
        });
        
        it('should reject non-string type', () => {
            const result = ElementValidator.validateElementType(null);
            
            expect(result.valid).toBe(false);
            expect(result.error).toContain('must be a non-empty string');
        });
        
        it('should reject empty string', () => {
            const result = ElementValidator.validateElementType('');
            
            expect(result.valid).toBe(false);
            expect(result.error).toContain('must be a non-empty string');
        });
    });
});

// tests/unit/ElementFactory.test.js
import { describe, it, expect } from 'vitest';
import { ElementFactory } from '../../js/utils/ElementFactory.js';

describe('ElementFactory', () => {
    describe('generateElementId', () => {
        it('should generate unique element IDs', () => {
            const id1 = ElementFactory.generateElementId();
            const id2 = ElementFactory.generateElementId();
            
            expect(id1).toBeTruthy();
            expect(id2).toBeTruthy();
            expect(id1).not.toBe(id2);
            expect(id1).toMatch(/^element-\d+-[a-z0-9]+$/);
        });
    });
    
    describe('initializeElement', () => {
        it('should initialize element with default properties', () => {
            const element = {};
            ElementFactory.initializeElement(element);
            
            expect(element.id).toBeTruthy();
            expect(element.parentId).toBe(null);
            expect(Array.isArray(element.childIds)).toBe(true);
        });
        
        it('should preserve existing properties', () => {
            const element = {
                id: 'existing-id',
                parentId: 'parent-1',
                childIds: ['child-1']
            };
            ElementFactory.initializeElement(element);
            
            expect(element.id).toBe('existing-id');
            expect(element.parentId).toBe('parent-1');
            expect(element.childIds).toEqual(['child-1']);
        });
        
        it('should generate ID if missing', () => {
            const element = { text: 'Test' };
            ElementFactory.initializeElement(element);
            
            expect(element.id).toBeTruthy();
            expect(element.id).toMatch(/^element-/);
        });
    });
    
    describe('createTemplate', () => {
        it('should create task template', () => {
            const template = ElementFactory.createTemplate('task');
            
            expect(template.type).toBe('task');
            expect(template.text).toBe('New task');
            expect(template.completed).toBe(false);
            expect(template.repeats).toBe(true);
        });
        
        it('should create note template', () => {
            const template = ElementFactory.createTemplate('note');
            
            expect(template.type).toBe('note');
            expect(template.text).toBe('New Note');
            expect(template.format).toBe('markdown');
            expect(template.persistent).toBe(true);
        });
        
        it('should create timer template', () => {
            const template = ElementFactory.createTemplate('timer');
            
            expect(template.type).toBe('timer');
            expect(template.duration).toBe(3600);
            expect(template.elapsed).toBe(0);
            expect(template.running).toBe(false);
        });
        
        it('should create multi-checkbox template', () => {
            const template = ElementFactory.createTemplate('multi-checkbox');
            
            expect(template.type).toBe('multi-checkbox');
            expect(Array.isArray(template.items)).toBe(true);
            expect(template.items.length).toBe(2);
        });
        
        it('should use ElementTypeManager if provided', () => {
            const mockElementTypeManager = {
                createTemplate: (type) => {
                    if (type === 'custom') {
                        return { type: 'custom', text: 'Custom Element' };
                    }
                    return null;
                }
            };
            
            const template = ElementFactory.createTemplate('custom', mockElementTypeManager);
            
            expect(template.type).toBe('custom');
            expect(template.text).toBe('Custom Element');
        });
        
        it('should fallback to default templates when ElementTypeManager returns null', () => {
            const mockElementTypeManager = {
                createTemplate: () => null
            };
            
            const template = ElementFactory.createTemplate('task', mockElementTypeManager);
            
            expect(template.type).toBe('task');
            expect(template.text).toBe('New task');
        });
        
        it('should return task template for unknown type', () => {
            const template = ElementFactory.createTemplate('unknown-type');
            
            expect(template.type).toBe('task');
        });
    });
});

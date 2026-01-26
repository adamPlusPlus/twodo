// tests/helpers/mockAppState.js - Mock AppState factory functions

/**
 * Create a mock item
 * @param {Object} overrides - Override default values
 * @returns {Object} Mock item
 */
export function createMockItem(overrides = {}) {
    const id = overrides.id || `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    return {
        id,
        type: overrides.type || 'note',
        text: overrides.text || 'Test item',
        completed: overrides.completed || false,
        repeats: overrides.repeats || false,
        persistent: overrides.persistent || false,
        parentId: overrides.parentId || null,
        childIds: overrides.childIds || [],
        config: overrides.config || {},
        ...overrides
    };
}

/**
 * Create a mock group
 * @param {Object} overrides - Override default values
 * @returns {Object} Mock group
 */
export function createMockGroup(overrides = {}) {
    const id = overrides.id || `group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const items = overrides.items || [];
    return {
        id,
        title: overrides.title || 'Test Group',
        name: overrides.name || overrides.title || 'Test Group',
        items: items,
        level: overrides.level || 0,
        parentGroupId: overrides.parentGroupId || null,
        plugins: overrides.plugins || [],
        format: overrides.format || null,
        config: overrides.config || {},
        ...overrides
    };
}

/**
 * Create a mock page/document
 * @param {Object} overrides - Override default values
 * @returns {Object} Mock page
 */
export function createMockPage(overrides = {}) {
    const id = overrides.id || `page-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const groups = overrides.groups || [];
    return {
        id,
        title: overrides.title || 'Test Page',
        name: overrides.name || overrides.title || 'Test Page',
        groups: groups,
        groupMode: overrides.groupMode || 'list',
        plugins: overrides.plugins || [],
        format: overrides.format || null,
        config: overrides.config || {},
        ...overrides
    };
}

/**
 * Create a mock AppState instance
 * @param {Object} options - Options
 * @param {Array} options.documents - Documents array (optional)
 * @param {string} options.currentDocumentId - Current document ID
 * @returns {Object} Mock AppState
 */
export function createMockAppState(options = {}) {
    const documents = options.documents || [createMockPage()];
    const currentDocumentId = options.currentDocumentId || documents[0]?.id || 'document-1';
    
    return {
        _documents: documents,
        _currentDocumentId: currentDocumentId,
        documents: documents,
        currentDocumentId: currentDocumentId,
        
        // Mock methods
        getDocument: (id) => {
            return documents.find(doc => doc.id === id);
        },
        
        getGroup: function(pageId, groupId) {
            const page = documents.find(doc => doc.id === pageId);
            if (!page || !page.groups) return null;
            return page.groups.find(group => group.id === groupId);
        },
        
        getItem: function(pageId, groupId, itemId) {
            const group = this.getGroup(pageId, groupId);
            if (!group || !group.items) return null;
            
            // Search recursively
            const findItem = (items) => {
                for (const item of items) {
                    if (item.id === itemId) return item;
                    if (item.children) {
                        const found = findItem(item.children);
                        if (found) return found;
                    }
                }
                return null;
            };
            
            return findItem(group.items);
        },
        
        // Mock event emission (no-op for tests)
        emit: () => {},
        
        // Allow setting documents
        setDocuments: (docs) => {
            this._documents = docs;
            this.documents = docs;
        }
    };
}

/**
 * Create a simple test workspace with one page, one group, and N items
 * @param {number} itemCount - Number of items to create
 * @returns {Object} Mock AppState
 */
export function createSimpleTestWorkspace(itemCount = 5) {
    const items = [];
    for (let i = 0; i < itemCount; i++) {
        items.push(createMockItem({
            id: `item-${i}`,
            text: `Item ${i + 1}`
        }));
    }
    
    const group = createMockGroup({
        id: 'group-1',
        title: 'Test Group',
        items: items
    });
    
    const page = createMockPage({
        id: 'page-1',
        title: 'Test Page',
        groups: [group]
    });
    
    return createMockAppState({
        documents: [page],
        currentDocumentId: 'page-1'
    });
}

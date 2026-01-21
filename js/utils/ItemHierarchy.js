// ItemHierarchy.js - Helpers for ID-link item nesting

export const ItemHierarchy = {
    buildItemIndex(items) {
        const index = {};
        if (!items || !Array.isArray(items)) {
            return index;
        }
        items.forEach(item => {
            if (!item || typeof item !== 'object' || !item.id) {
                return;
            }
            index[item.id] = item;
        });
        return index;
    },

    getRootItems(items) {
        if (!items || !Array.isArray(items)) {
            return [];
        }
        return items.filter(item => item && !item.parentId);
    },

    getRootItemAtIndex(items, index) {
        if (typeof index !== 'number' || index < 0) {
            return null;
        }
        const rootItems = ItemHierarchy.getRootItems(items);
        return rootItems[index] || null;
    },

    getChildItems(item, itemIndex) {
        if (!itemIndex || typeof itemIndex !== 'object') {
            return [];
        }
        const childIds = Array.isArray(item?.childIds) ? item.childIds : [];
        return childIds.map(id => itemIndex[id]).filter(Boolean);
    }
};

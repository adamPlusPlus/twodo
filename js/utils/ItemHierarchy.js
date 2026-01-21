// ItemHierarchy.js - Helpers for ID-link item nesting

export const ItemHierarchy = {
    buildItemIndex(items) {
        const index = {};
        (items || []).forEach(item => {
            if (!item || !item.id) {
                return;
            }
            index[item.id] = item;
        });
        return index;
    },

    getRootItems(items) {
        return (items || []).filter(item => !item?.parentId);
    },

    getRootItemAtIndex(items, index) {
        const rootItems = ItemHierarchy.getRootItems(items);
        return rootItems[index] || null;
    },

    getChildItems(item, itemIndex) {
        const childIds = Array.isArray(item?.childIds) ? item.childIds : [];
        return childIds.map(id => itemIndex[id]).filter(Boolean);
    }
};

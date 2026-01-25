# Fix Format Renderers Virtualization

## Problem

Two format renderers lack virtualization for large lists, causing performance issues:

1. **TrelloBoardFormat.js** (line 149): Renders all cards directly into DOM using `items.forEach()`
2. **LaTeXEditorFormat.js** (line 910): Converts all items to LaTeX string (may impact preview rendering)

## Solution Approach

Add virtualization to format renderers similar to how `PageKanbanFormat` implements it:

1. **TrelloBoardFormat**: Add `ViewportRenderer` to column content (similar to PageKanbanFormat columns)
2. **LaTeXEditorFormat**: Investigate if outline/preview rendering needs virtualization (line 910 is string generation, not DOM rendering)

## Implementation Details

### 1. TrelloBoardFormat.js

**Current Implementation** (line 149):
```javascript
items.forEach((element, index) => {
    const card = this.renderCard(element, pageId, bin.id, index, app);
    content.appendChild(card);
});
```

**Target Implementation** (similar to PageKanbanFormat):
```javascript
if (items.length > 0) {
    // Use viewport rendering for 50+ items
    const virtualScroller = ViewportRenderer.renderViewport(
        content,
        items,
        (element, elementIndex) => {
            return this.renderCard(element, pageId, bin.id, elementIndex, app);
        },
        {
            threshold: 50
        }
    );
    
    // Store virtual scroller reference
    if (virtualScroller) {
        content._virtualScroller = virtualScroller;
    }
} else {
    // Empty state
}
```

**Changes Required**:
- Import `ViewportRenderer` at top of file
- Replace `items.forEach()` loop with `ViewportRenderer.renderViewport()` call
- Handle empty state when no items
- Store virtual scroller reference on content element
- Handle format preservation (similar to PageKanbanFormat)

### 2. LaTeXEditorFormat.js

**Investigation Needed**:
- Line 910 is in `convertPageToLaTeX()` which generates string, not DOM
- Check if outline panel (`updateOutline()`) needs virtualization for many sections
- Check if preview area rendering needs optimization for large documents

**Potential Issues**:
- Outline panel renders sections from parsed LaTeX structure
- If many items → many sections → performance issue in outline
- Preview area renders LaTeX blocks - may need block-level virtualization

**Decision Points**:
- [A] Only fix TrelloBoardFormat (LaTeXEditorFormat line 910 is not a DOM rendering issue)
- [B] Add virtualization to outline panel if it renders many sections
- [C] Add block-level virtualization to preview area for large documents
- [D] Other / Specify: __________

## Files to Modify

1. **`js/plugins/format/TrelloBoardFormat.js`**
   - Add `import { ViewportRenderer } from '../../core/ViewportRenderer.js';`
   - Update `renderColumn()` method (around line 146-153)
   - Handle format preservation (check for `app._preservingFormat`)
   - Store virtual scroller reference

2. **`js/plugins/format/LaTeXEditorFormat.js`** (if needed)
   - Investigate outline panel rendering
   - Investigate preview area rendering
   - Add virtualization if DOM rendering is the bottleneck

## Implementation Steps

### Step 1: Update TrelloBoardFormat.js

1. **Add import**:
   ```javascript
   import { ViewportRenderer } from '../../core/ViewportRenderer.js';
   ```

2. **Update `renderColumn()` method**:
   - Replace `items.forEach()` with `ViewportRenderer.renderViewport()`
   - Add threshold check (50 items)
   - Handle empty state
   - Store virtual scroller reference

3. **Handle format preservation**:
   - Check for existing column when `app._preservingFormat` is true
   - Clean up existing virtual scroller before re-rendering
   - Update existing column content instead of creating new one

### Step 2: Investigate LaTeXEditorFormat.js

1. **Check outline panel**:
   - Review `updateOutline()` method
   - Test with 100+ items → many sections
   - Measure performance impact

2. **Check preview area**:
   - Review LaTeX block rendering
   - Test with large documents
   - Determine if block-level virtualization needed

3. **Decision**:
   - If performance issue exists → add virtualization
   - If no issue → document that line 910 is string generation, not DOM rendering

### Step 3: Testing

1. **TrelloBoardFormat**:
   - Test with 50+ items (should use virtualization)
   - Test with <50 items (should render all)
   - Test scrolling performance
   - Test drag-drop with virtualized lists
   - Test format preservation during drag operations

2. **LaTeXEditorFormat** (if modified):
   - Test outline with many sections
   - Test preview with large documents
   - Test scrolling performance

## Edge Cases to Handle

1. **Format preservation**: Clean up virtual scroller before re-rendering
2. **Empty state**: Show empty message when no items
3. **Drag-drop**: Ensure drag-drop works with virtualized lists (already handled in previous fixes)
4. **Dynamic updates**: Handle item additions/removals
5. **Column resizing**: Virtual scroller should handle container size changes

## Success Criteria

- TrelloBoardFormat uses virtualization for 50+ items
- Performance improvement with large lists (100+ items)
- Drag-drop works correctly with virtualized lists
- Format preservation works during drag operations
- Empty state displays correctly
- LaTeXEditorFormat investigated and fixed if needed

## Estimated Effort

- **TrelloBoardFormat**: 2-3 hours
  - Implementation: 1-2 hours
  - Testing: 1 hour

- **LaTeXEditorFormat**: 1-2 hours (investigation + fix if needed)
  - Investigation: 30 minutes
  - Implementation (if needed): 1-1.5 hours

- **Total**: 3-5 hours

## Questions for User

**Question 1: LaTeXEditorFormat Scope**
- [A] Only fix TrelloBoardFormat (LaTeXEditorFormat line 910 is string generation, not DOM rendering)
- [B] Investigate and fix LaTeXEditorFormat if performance issues found
- [C] Skip LaTeXEditorFormat entirely
- [D] Other / Specify: __________

**Question 2: Virtualization Threshold**
- [A] Use 50 items threshold (same as PageKanbanFormat)
- [B] Use different threshold (specify: _____)
- [C] Always use virtualization regardless of item count
- [D] Other / Specify: __________

**Question 3: Format Preservation Priority**
- [A] Must work perfectly (no flicker during drag operations)
- [B] Acceptable to have minor flicker
- [C] Not a priority
- [D] Other / Specify: __________

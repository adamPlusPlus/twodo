# Codebase Naming Review

## Overview
This document identifies naming issues, overlapping terminology, and potential conflicts in the codebase.

---

## Canonical Vocabulary & Naming Rules

### Internal nouns (data + code + UI)
- **Vault / Workspace**: root folder containing many packs
- **Pack**: on-disk folder-file unit (do not call this "file" in code)
- **Document / View**: user-facing presentation of content (a view, not necessarily the on-disk unit)
- **Group**: container within a pack (formerly "bin")
- **Item**: atomic content block (formerly "element")
- **Section**: projection-only concept derived from headers/rules, not necessarily stored

### Naming rules
- **DOM vs data**: DOM nodes use `El` suffix (`itemEl`, `groupEl`, `modalEl`), data objects use plain nouns (`item`, `group`, `modalData`).
- **IDs over indices**: indices are view-local and unstable; identity must use `itemId`, `groupId`, `packId`, etc.

### Rename conflicts already resolved in this worktree
- `SyncManager` duplicate resolved: keep websocket one as `SyncManager`, rename the other to `InteropSyncManager`.
- `ModalEventHandlers` renamed to `ModalEventBridge`.

---

## 🔴 CRITICAL ISSUES

### 1. Content Hierarchy Terminology

#### Current Hierarchy Issues
- **Current Structure**: `Item (Element) > Group (Bin) > Document/View (Page)`
- **Storage Container**: Pack (folder-file unit) wraps the document/view for persistence
- **Problems Identified**:
  1. **"Element"** - Too generic, conflicts with DOM terminology
  2. **"Bin"** - Unclear purpose, doesn't reflect organizational role
  3. **"Page"** - Conflicts with UI pagination terminology, doesn't reflect its role as "groups of groups"
  4. **Hierarchy itself** - Questioning if structure is optimal (should headers create organizational units?)

#### Decisions Made
- ✅ **"Element" → "Item"**: Confirmed - more specific, clearer purpose
- ✅ **"Bin" → "Group"**: Confirmed - better reflects organizational role
- ⚠️ **"Page" → ???**: Under discussion - considering alternatives:
  - Document, Set, Board, Space, Workspace, Collection, Context
  - Also questioning if hierarchy needs restructuring (headers as organizational units?)

#### JSON Coherence Architecture (Naming + Semantics)
We are standardizing terminology around a canonical JSON model and semantic operations:
- **Canonical entities** (data terms):
  - **Document**: top-level content container in UI (current code often calls this "page")
  - **Group**: explicit container for ordered content (current code calls this “bin”)
  - **Item**: atomic content block (current code calls this “element”)
  - Optional: **Section** as a projection (header-driven or rule-driven) rather than a required stored entity
  - **Pack**: on-disk container for the canonical store + projections (folder-file unit)
- **Key rule**: views edit **meaning**, not raw strings; they emit **semantic operations** on canonical entities.
- **Key rule**: operations address entities by **stable IDs**, not by array indices (indices are view-local and unstable under concurrency).

#### Container / Projection Terminology (Workspace + Documents)
To support scale, indexing, assets, collaboration, and external tooling safely:
- **Workspace (Vault)**: root folder that contains many packs (avoid monolithic files)
- **Pack Container**: per-pack package containing canonical data + ops + assets + indexes
- **Projection**: a derived representation of canonical data (e.g., `.md`, `.tex`, `.html`, `.pdf`)
- **Working Tree**: an exportable/editable projection set designed for external tooling + git workflows

#### Representation Authority (Prevent Drift)
Multiple representations must not compete:
- **Single-authority rule**: only **one representation is authoritative at a time**.
- **Default**: canonical truth is **semantic ops + canonical model**; projections are derived caches.
- **Exception**: a document may be **source-text authoritative** (e.g., LaTeX-authoritative):
  - canonical model is derived from source text
  - some projections are intentionally lossy (explicit)

#### Pending Discussion
- Should there be a level between Document and Group?
- Should Groups be more flexible (header-based, manual, auto-generated)?
- Should Headers create implicit organizational units?
- What term best describes the current "page" level (groups of groups, data container with multiple views)?

#### External Access Naming (Users + AI Agents)
We assume external access is common, so names should reflect tooling:
- Prefer **`export` / `import` / `sync`** (CLI working tree) over ambiguous terms like “save-as” for structured workflows.
- Use `projection` for derived representations and `container` for canonical packaging to reduce confusion.

#### Hierarchy Resolution (based on semantic ops approach)
With semantic operations, hierarchy is a *model choice*, not a coherence blocker. Supported directions:
- **Document → Group → Item**: explicit grouping as first-class structure (good for drag/drop chunks, collapse/expand, templates)
- **Document → Section → Item**: sections are derived from headers/rules (good for “document feel” without forcing stored groups)
- **Document → Item**: flat/outline list; groups/sections can be virtual or created as-needed

This means we can preserve JSON coherence while evolving structure, as long as all edits compile to semantic ops.

---

## ⚠️ OVERLAPPING TERMINOLOGY

### 2. Modal-Related Classes
Multiple classes with "Modal" in the name:
- `ModalHandler` (`js/modules/ModalHandler.js`) - Main modal controller
- `ModalService` (`js/modules/modal/ModalService.js`) - Business logic (currently placeholder)
- `ModalRenderer` (`js/modules/modal/ModalRenderer.js`) - DOM rendering
- `ModalEventBridge` (`js/core/ModalEventBridge.js`) - Event bridge ✅ **RENAMED** (was `ModalEventHandlers`)
- `ModalBuilder` (`js/utils/ModalBuilder.js`) - Modal construction utility

**Status**: ✅ `ModalEventHandlers` renamed to `ModalEventBridge` for clarity
**Remaining**: Ensure `ModalService` and `ModalRenderer` are clearly separated by responsibility

### 3. Generic Variable Names Used Extensively

#### `data` - Used for multiple purposes
- File data (`FileManager.js`)
- Form data (`ModalHandler.js`)
- Application data (`DataManager.js`)
- **Recommendation**: Use more specific names:
  - `fileData`, `formData`, `appData`, `syncData`

#### `event` / `e` - Event objects
- Browser events (`EventHandler.js`, `ModalHandler.js`)
- Custom app events (`EventBus.js`)
- **Recommendation**: 
  - Keep `e` for browser events (standard convention)
  - Use `appEvent` or `customEvent` for EventBus events

#### `state` / `appState`
- `appState` - AppState instance (good)
- `state` - Generic state variables (unclear)
- **Recommendation**: Use specific names: `binState`, `pageState`, `uiState`, `dragState`

#### `index` / `elementIndex`
- **Issue**: `elementIndex` is frequently used as an identifier in view operations, but indices are unstable under reorder/concurrent edits.
- **Recommendation**:
  - Use **IDs** (`itemId`, `groupId`, `documentId`) for identity
  - Use indices only for *local rendering positions* or immediate UI selection
  - When needed, represent ordering via “before/after ID” or position tokens (future-proof for collaboration)

#### `element` / `page` / `bin` / `modal` / `item` / `group` / `document`
- Used as both DOM elements and data objects
- **Recommendation**: 
  - DOM elements: `itemEl`, `groupEl`, `documentEl`, `modalEl` (use `El` suffix)
  - Data objects: `item`, `group`, `document`, `modalData` (no suffix)
- **Note**: As we rename "element" → "item" and "bin" → "group", ensure DOM vs data distinction is maintained

#### `service` / `manager` / `handler` / `renderer`
- Generic suffixes used throughout
- **Recommendation**: These are acceptable as class suffixes, but avoid as variable names
  - Use: `dataManager`, `pageManager`
  - Avoid: `const manager = ...` (use specific name)

---

## 🔵 UNCLEAR / SHORT VARIABLE NAMES

### 4. Single-Letter Variables (Context-Dependent)

#### `i` - Loop index
- **Usage**: `for (let i = 0; i < count; i++)`
- **Recommendation**: Acceptable for simple loops, but consider descriptive names for nested loops:
  - `elementIndex`, `itemIndex`, `loopIndex`

#### `e` - Event object
- **Usage**: Event handlers
- **Recommendation**: Standard convention, acceptable

#### `p` - Page/Document object
- **Usage**: `pages.find(p => p.id === pageId)`
- **Recommendation**: Use `page` or `document` instead of `p` for clarity
- **Note**: Will update to `document` once "page" terminology is resolved

#### `b` - Bin/Group object
- **Usage**: `bins.find(b => b.id === binId)`
- **Recommendation**: Use `group` instead of `b` for clarity (after "bin" → "group" rename)

#### `opt` - Option object
- **Usage**: `allOptions.map(opt => ...)`
- **Recommendation**: Use `option` instead of `opt`

#### `idx` - Index
- **Usage**: `const idx = parseInt(...)`
- **Recommendation**: Use `index` or more specific: `elementIndex`, `itemIndex`

#### `key` - Multiple meanings
- Keyboard key: `e.key`
- Object key: `Object.keys(...).forEach(key => ...)`
- Data attribute: `option.dataset.key`
- **Recommendation**: Use specific names:
  - `keyboardKey`, `objectKey`, `dataKey`, `shortcutKey`

#### `tag` - Tag string
- **Usage**: Tag management
- **Recommendation**: Acceptable, but consider `tagName` if ambiguous

#### `url` / `a` - URL and anchor element
- **Usage**: `const url = URL.createObjectURL(blob); const a = document.createElement('a');`
- **Recommendation**: 
  - `url` → `objectUrl` or `blobUrl`
  - `a` → `anchorElement` or `downloadLink`

#### `app` - App instance
- **Usage**: `const app = this.app || window.app;`
- **Recommendation**: Acceptable, but ensure it's clear it's the TodoApp instance

#### `tab` - Tab object
- **Usage**: `pane.tabs.find(t => t.id === tabId)`
- **Recommendation**: Use `tab` instead of `t` for clarity

---

## 🟡 BROWSER API CONFLICTS

### 5. Potential Conflicts

#### `data` - DataTransfer, FormData, etc.
- **Usage**: Various data objects
- **Status**: ⚠️ Potential confusion - use specific names when possible

---

## 📋 NAMING PATTERNS ANALYSIS

### 6. Class Naming Patterns

#### ✅ Good Patterns
- `*Manager` - Business logic managers (e.g., `PageManager`, `DataManager`)
- `*Handler` - Event/input handlers (e.g., `EventHandler`, `DragDropHandler`)
- `*Renderer` - UI rendering (e.g., `AppRenderer`, `ElementRenderer`)
- `*Service` - Business services (e.g., `ExportService`, `ImportService`)

#### ⚠️ Inconsistent Patterns
- `SearchIndex` - Not a manager/handler/renderer/service (but acceptable)
- `TimeTracker` - Not a manager (but acceptable)
- `InlineEditor` - Not a manager (but acceptable)

### 7. Variable Naming Patterns

#### ✅ Good Patterns
- `appState` - AppState instance
- `eventBus` - EventBus instance
- `dataManager` - DataManager instance
- `pageId`, `binId`, `elementIndex` - Specific identifiers
- **Note**: Will update to `documentId`, `groupId`, `itemIndex` after renames

#### ⚠️ Problematic Patterns
- Generic `data`, `state`, `event` without context
- Short names (`i`, `e`, `p`, `b`) in complex contexts
- Reusing same variable name for different types (`element` as DOM vs data)

---

## 🎯 RECOMMENDATIONS SUMMARY

### High Priority
1. ✅ **Rename duplicate `SyncManager`**: **COMPLETED**
   - `js/core/SyncManager.js` → `InteropSyncManager` ✅
   - All imports and references updated ✅

2. ✅ **Clarify modal-related classes**: **COMPLETED**
   - `ModalEventHandlers` → `ModalEventBridge` ✅
   - Clear separation of concerns maintained ✅

3. **Content Hierarchy Renaming** (In Progress):
   - ✅ "Element" → "Item" (confirmed, pending implementation)
   - ✅ "Bin" → "Group" (confirmed, pending implementation)
   - ⚠️ "Page" → ??? (under discussion - hierarchy structure being evaluated)
   - ✅ **JSON coherence approach defined**: semantic ops + IDs-over-indices + view adapters (documented in `docs/VISION.md` and `docs/plugin_plan.md`)

### Medium Priority
3. **Improve generic variable names** (Discussed, pending implementation):
   - Replace `data` with specific names (`fileData`, `formData`, `appData`)
   - Replace `p` → `page`/`document`, `b` → `group`, `opt` → `option`, `idx` → `index`
   - Replace `key` with specific names (`keyboardKey`, `objectKey`, `dataKey`)

4. **Distinguish DOM vs Data** (Discussed, pending implementation):
   - DOM elements: `itemEl`, `groupEl`, `documentEl`, `modalEl` (use `El` suffix)
   - Data objects: `item`, `group`, `document`, `modalData` (no suffix)
   - **Standard**: DOM-first naming (e.g., `e` for events), data terms should be unique and not share names with DOM language

### Low Priority
5. **Improve loop variable names**:
   - Simple loops: `i` is acceptable
   - Nested loops: Use descriptive names (`elementIndex`, `itemIndex`)

6. **URL/anchor element naming**:
   - `url` → `objectUrl` or `blobUrl`
   - `a` → `anchorElement` or `downloadLink`

---

## 📝 NOTES

- Most naming follows JavaScript conventions
- Class names are generally clear and descriptive
- Main issues addressed:
  1. ✅ Duplicate class name (`SyncManager` → `InteropSyncManager`) - **FIXED**
  2. ✅ Modal class naming (`ModalEventHandlers` → `ModalEventBridge`) - **FIXED**
  3. ⚠️ Generic variable names in complex contexts - **DISCUSSED, PENDING**
  4. ⚠️ Potential confusion between DOM elements and data objects - **DISCUSSED, PENDING**
  5. ⚠️ Content hierarchy terminology - **IN PROGRESS**

- Browser API usage is correct (no actual conflicts)
- ServiceLocator pattern helps avoid naming conflicts for services
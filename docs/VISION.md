# Vision: The Ultimate Project Tool

## Core Vision Statement

**twodo** is designed to be the ultimate project tool - a universal interface that bridges power users and non-technical users, providing seamless data representation across all devices and interaction methods, with AI and automation at its core.

## Key Principles

### 1. Universal Compatibility
- **All Devices**: Desktop, mobile, tablet, smartwatch, voice assistants
- **All Platforms**: Web, native apps, browser extensions, CLI
- **All Contexts**: Online, offline, low-bandwidth, high-performance
- **Seamless Sync**: Real-time synchronization across all instances

### 2. Extreme Performance
- **Instant Response**: Sub-100ms interactions
- **Efficient Rendering**: Virtual scrolling, lazy loading, smart caching
- **Optimized Data**: Minimal payloads, efficient storage, fast queries
- **Background Processing**: Non-blocking operations, progressive enhancement

#### 2.1. Performance & Resource Discipline (Non-Negotiables)
To avoid “vault slows to a crawl” failure modes seen in other tools:
- **Active-set memory**: only keep open documents + a small working set in memory (never “load the whole workspace”).
- **Viewport rendering**: document and list UIs must be virtualized (render only visible blocks + small buffer).
- **Incremental updates**: apply semantic ops as small deltas; avoid full re-renders and full recomputes.
- **Async indexing**: search/backlinks/dependency indexing must be background, incremental, cancellable, and rate-limited.
- **Event storm control**: filesystem watchers and app events must be coalesced/debounced with backpressure.
- **Plugin containment**: plugins must not run unbounded work on hot paths; provide budgeted APIs, throttled event streams, and worker-based execution where possible.
- **No giant clones**: avoid deep-cloning full documents for undo/redo; prefer op logs + checkpoints/snapshots.
- **Rebuildable caches**: projections and indexes are caches; correctness must not depend on always-up-to-date derived artifacts.

### 3. Novel UI/UX Per Input/Output Method
- **Visual**: Rich, information-dense interfaces for desktop
- **Touch**: Gesture-based, mobile-optimized interactions
- **Voice**: Conversational interface, natural language commands
- **Text**: Command-line interface, keyboard shortcuts, text commands
- **Non-Visual**: Screen reader optimized, audio feedback, haptic responses
- **Adaptive**: UI complexity adapts to user skill level and context
- **Innovative I/O**: Leverage all available input methods in novel ways:
  - **Camera**: Gesture recognition, eye tracking, facial expressions, object detection
  - **Microphone**: Voice commands, audio feedback, sound-based navigation
  - **Gyroscope/Accelerometer**: Motion-based interactions, tilt controls, shake gestures
  - **Game Controllers**: Button combinations, analog sticks, triggers for navigation
  - **Novel Mouse Gestures**: Beyond click/drag - pressure, multi-button, circular gestures
  - **Touch Gestures**: Beyond tap/swipe - multi-touch patterns, pressure sensitivity
  - **Haptic Feedback**: Tactile responses for all interactions
  - **Spatial Input**: 3D gestures, hand tracking, body movement
- **No Convention Assumptions**: Cannot assume users know standard UI patterns
- **Discoverable Interactions**: All features discoverable through exploration
- **Contextual Guidance**: System guides users to available actions

### 4. Built for Automation and AI
- **AI-First Design**: AI integration throughout, not as afterthought
- **Automation Engine**: Rule-based, script-based, visual workflow builder
- **Intelligent Assistance**: Context-aware suggestions, auto-completion, smart defaults
- **Learning System**: Adapts to user patterns, learns preferences

### 5. Extensible Plugin Architecture
- **Core System**: Minimal, fast, stable core
- **Plugin System**: Everything else is a plugin
- **Plugin Marketplace**: Community-driven extensions
- **Easy Development**: Simple APIs, clear documentation, examples

### 6. Seamless Data Representation
- **Single Source of Truth**: Same data, multiple views
- **Format Agnostic**: Data structure independent of presentation
- **View Transformation**: Switch between simple/complex views instantly
- **Consistent Manipulation**: Same operations work across all views
- **Context Preservation**: Maintain context when switching views

### 6.1. JSON Coherence Architecture (Semantic Operations)
- **JSON Coherence**: All user actions are translated into **semantic operations** against the canonical JSON model (never “string diffs” as the source of truth).
- **View Adapters**: Each view (Document, Kanban, Table, etc.) is an adapter that:
  - Projects canonical JSON into its UI model
  - Converts UI edits into semantic operations
  - Applies incoming operations to keep the view live and consistent
- **Operation-Based Sync**: Collaboration and undo/redo are driven by an append-only stream of semantic operations (plus occasional snapshots/checkpoints).
- **Stable Identity First**: All entities are addressed by stable IDs (not array indices) to support safe reordering and concurrent edits.

#### Representation Authority (Prevent Drift)
To prevent circular inconsistencies between multiple “formats” (e.g., JSON ↔ LaTeX ↔ Markdown), we enforce:
- **Single-authority rule**: Only **one representation is authoritative at a time**.
- **Default**: Canonical truth is **semantic ops + canonical model**; projections are derived caches.
- **Exception**: A document can be marked **source-text authoritative** (e.g., LaTeX-authoritative).
  - In that case, the canonical model is **derived** from the source text representation.
  - Some non-source views become **lossy projections** (expected and explicit).

#### Sophistication Levels
- **Level A (Local Multi-View Coherence)**:
  - Real-time consistency across multiple views in a single client
  - Operations emitted at logical boundaries (split/merge/move/toggle/edit session commits)
  - Sync can be eventually-consistent (batch/debounce acceptable)
- **Level B (Collaborative Real-Time Editing)**:
  - Real-time multi-device collaboration with conflict-free merging
  - **Two-layer model**:
    - Structural ops (move/split/merge/reparent/wrap ranges)
    - Text ops within a block (CRDT/OT per block or equivalent)
  - Presence + selection + cursors are first-class collaboration signals

#### Hierarchy Flexibility (Canonical Model vs View Structure)
We keep a canonical JSON model and allow multiple structural “projections” in views:
- **Document → Group → Item**: Explicit containers (groups) holding ordered items
- **Document → Section → Item**: Header-driven or rule-driven sections (a view projection over items)
- **Document → Item**: Flat or lightly structured block list; “groups/sections” are derived or virtual

The choice of hierarchy affects UI affordances, but **not the coherence model**: all edits still compile to semantic ops against canonical entities.

#### Semantic Definitions for Document-Like Editing (examples)
To avoid ambiguity, Document View defines explicit meanings:
- **Enter**: split current block into two blocks at caret (structural)
- **Backspace at start of block**: merge with previous block (structural)
- **Shift+Enter**: insert newline within block text (non-structural)
- **Drag / reorder**: move blocks by ID (structural)
- **Indent / outdent**: reparent or change outline depth (structural)

### 7. Coherent, Consistent, Shockingly Easy
- **Intuitive**: Learnable without documentation
- **Consistent**: Same patterns everywhere
- **Forgiving**: Undo everything, recover from mistakes
- **Progressive Disclosure**: Simple by default, powerful when needed
- **Accessible**: Works for everyone, regardless of technical skill
- **No Assumptions**: Cannot rely on traditional UX conventions or OS conventions
- **Innovative I/O**: Leverage all available input methods in novel ways
- **Discoverable**: Complex features must be discoverable without training
- **Dual-Mode Design**: Extremely simple for basic users, extremely deep for power users

### 8. Bridge Between Power Users and Non-Technical Users
- **Power User Features**: Scripting, automation, advanced queries, APIs
- **Simple User Features**: One-click actions, guided workflows, templates
- **Adaptive Complexity**: UI adapts to user skill level
- **No Compromises**: Power users don't lose features, simple users aren't overwhelmed

### 9. Instant Information Presentation
- **Zero-Load Time**: Instant access to data
- **Smart Caching**: Predictive loading, background sync
- **Progressive Enhancement**: Show what's available, load rest in background
- **Context-Aware**: Show relevant information based on current task

### 10. Seamless Collaboration
- **Real-Time Sync**: Changes appear instantly for all users
- **Conflict Resolution**: Intelligent merging, no data loss
- **Presence Awareness**: See who's working on what
- **Communication**: Built-in chat, comments, mentions
- **Permissions**: Granular access control

#### Collaboration Mechanism (aligns with JSON Coherence)
- **Operations are the unit of collaboration** (not whole-document overwrites).
- **Conflict handling** is expressed as deterministic merge rules over the operation stream:
  - Structural ops resolve via stable IDs + ordering strategy
  - Text ops resolve via CRDT/OT strategy within each block
  - “Snapshots” exist for recovery and fast join, but ops are authoritative

## Architecture Implications

### Data Layer
- **Universal Data Model**: Works across all views and devices
- **Format Conversion**: Seamless conversion between representations
- **Version Control**: Track all changes, enable undo/redo
- **Conflict Resolution**: Intelligent merging strategies

#### Data Layer Addendum: Semantic Ops Contract
- **Canonical entities** (current naming in codebase may differ):
  - Document, Group/Section (optional), Item/Block
- **Canonical operations** (illustrative; exact list evolves):
  - `item.text.insert/delete` (Level B)
  - `item.setText` (Level A / coarse updates)
  - `item.split`, `item.merge`
  - `item.move`, `item.reparent` (outline)
  - `group.create/delete`, `group.wrapRange`, `group.unwrap`
  - `item.setProp` (toggle complete, set due date, etc.)
  - `item.convertType` (schema-transform with validation)

#### Formatting Control Options (Renderer Strategy)
- **Option 1: Source text + renderer**: Store raw text + `markupLanguage` per block/document (markdown/latex/html/custom) and render via pluggable renderer.
- **Option 2: Structured rich-text model**: Store a span/mark tree and export to markdown/latex/html as needed (more complex, more “Word-like”).

#### Portable File Patterns (Markdown compatibility while keeping JSON truth)
If we support editable `.md` while keeping JSON authoritative, choose one of:
- **Pattern A: Lossless Markdown with embedded block IDs** (e.g., HTML comments/markers per block)
- **Pattern B: Frontmatter + fenced data blocks** (metadata + non-markdown elements encoded explicitly)
- **Pattern C: Sidecar mapping file** (`.md` + `.twodo.json` mapping) for cleaner markdown and full fidelity

#### Workspace + Pack Storage Strategy (Power + Safety + External Access)
We want the workspace to behave like a vault/root folder, while keeping each pack safe and fast.
- **Workspace (Vault)**: a root folder containing many packs (no monolithic files).
- **Pack**: folder-file unit containing canonical data + ops + assets + indexes, plus optional projections.
- **External access MVP (Option 1)**: CLI-based working tree projections:
  - users/agents edit projections (for example, `.tex`, `.md`) outside the app
  - the CLI imports changes back as semantic ops (with validation/preview/rollback)
  - supports git-style workflows without making canonical storage fragile
- **Future upgrade path**: keep the semantic-op ingestion pipeline and projections stable so the same layout can later be mounted/projected without rewriting core logic.
- **Details**: see `docs/WORKSPACE_STORAGE_ARCHITECTURE.md` for pack layout and authority modes.

### Rendering Layer
- **View Abstraction**: Separate data from presentation
- **Multiple Renderers**: Different renderers for different contexts
- **Adaptive Rendering**: Adjust complexity based on device/context
- **Performance Optimization**: Virtual DOM, lazy loading, caching

### Input Layer
- **Multi-Modal Input**: Voice, touch, keyboard, gestures
- **Input Normalization**: Convert all inputs to same internal format
- **Context-Aware Processing**: Understand intent, not just commands
- **Accessibility**: Screen readers, keyboard navigation, voice control

### AI Layer
- **AI Integration Points**: Throughout the application
- **Context Awareness**: AI understands current task and context
- **Proactive Assistance**: Suggest actions, auto-complete, predict needs
- **Learning System**: Adapts to user patterns

### Sync Layer
- **Real-Time Sync**: WebSocket-based, instant updates
- **Offline Support**: Work offline, sync when online
- **Conflict Resolution**: Intelligent merging
- **Multi-Device**: All devices stay in sync

### Plugin Layer
- **Core Minimal**: Only essential features in core
- **Plugin System**: Everything else is extensible
- **Plugin APIs**: Clear, simple, well-documented
- **Plugin Marketplace**: Community-driven ecosystem

## Priority Areas

### Phase 1: Foundation (Critical)
1. **Universal Data Model** - Single source of truth
2. **Multi-Device Sync** - Real-time synchronization
3. **Performance Optimization** - Sub-100ms interactions
4. **View Abstraction** - Separate data from presentation
5. **Input Normalization** - Multi-modal input support

### Phase 2: Core Experience (High Priority)
1. **Adaptive UI** - Complexity adapts to user/context
2. **AI Integration** - AI throughout the application
3. **Format Conversion** - Seamless data transformation
4. **Accessibility** - Screen readers, keyboard, voice
5. **Collaboration** - Real-time sync, presence, communication

### Phase 3: Power Features (Medium Priority)
1. **Automation Engine** - Rules, scripts, workflows
2. **Advanced Queries** - Complex filtering, search
3. **Plugin Marketplace** - Community extensions
4. **API Server** - REST/GraphQL for integrations
5. **Developer Tools** - Debugging, profiling, inspection

### Phase 4: Polish (Lower Priority)
1. **UI Themes** - Customization, branding
2. **Advanced Analytics** - Insights, reporting
3. **Export/Import** - External format support
4. **Templates** - Pre-built structures
5. **Documentation** - User guides, tutorials

## Success Metrics

### Performance
- **Interaction Latency**: < 100ms for all operations
- **Load Time**: < 1s for initial render
- **Sync Latency**: < 500ms across devices
- **Offline Support**: 100% functionality offline
 - **Memory Discipline**: active-set bounded memory; large workspaces must not force whole-vault resident state
 - **Indexing Discipline**: no UI-thread full-vault indexing or synchronous scan loops

### Usability
- **Learnability**: 90% of users productive in < 5 minutes
- **Accessibility**: WCAG 2.1 AA compliance
- **Error Recovery**: 100% of actions undoable
- **User Satisfaction**: > 90% positive feedback

### Extensibility
- **Plugin Count**: 50+ community plugins within 6 months
- **API Coverage**: 100% of features accessible via API
- **Documentation**: Complete API docs, examples, tutorials
- **Developer Experience**: < 1 hour to create first plugin

### Collaboration
- **Real-Time Sync**: < 500ms latency
- **Conflict Resolution**: 0% data loss
- **Presence Awareness**: < 1s update latency
- **User Satisfaction**: > 85% positive feedback

## Current State Assessment

### Strengths
- ✅ Plugin architecture in place
- ✅ Format renderers (multiple views)
- ✅ Real-time sync foundation
- ✅ Element type system
- ✅ Undo/redo system

### Gaps
- ❌ Multi-modal input (voice, gestures)
- ❌ Adaptive UI complexity
- ❌ AI integration throughout
- ❌ Accessibility features
- ❌ Performance optimization
- ❌ Non-visual interfaces
- ❌ Cross-device optimization
- ❌ Input normalization layer

### Opportunities
- 🎯 AI-first redesign of interactions
- 🎯 Voice interface for hands-free use
- 🎯 Gesture-based mobile interactions
- 🎯 Screen reader optimization
- 🎯 Performance profiling and optimization
- 🎯 Adaptive complexity system
- 🎯 Multi-device UI optimization

## Implementation Order (Lowest-Risk Sequencing)
1. Add docs into the app worktree (so decisions are anchored).
2. Introduce compatibility layer in code/data model (aliases for old/new terms; ID-first ops).
3. Refactor internal operations to target IDs (stop relying on `elementIndex` for identity).
4. Document view semantic ops (split/merge/indent/outdent) and wire to undo/sync.
5. Storage direction groundwork (vault + pack folder abstraction layer, even if not fully implemented yet).
6. Only then do broad mechanical renames (element→item, bin→group, page→?) with migrations and plugin compatibility.

## Open Decisions
- Whether the op log lives only in the DB or also as `ops.jsonl` alongside.
- Persisted-schema rename timing (`pages`/`bins`/`elements` keys), staged vs immediate.
- External edits: always-on sync vs explicit import/sync modes.

## Next Steps

1. **Assess Current Architecture** - Identify what supports vision, what needs change
2. **Prioritize Gaps** - Focus on highest-impact improvements
3. **Design Multi-Modal Input** - Voice, touch, keyboard, gestures
4. **Implement Adaptive UI** - Complexity adapts to user/context
5. **Integrate AI Throughout** - Not just features, but core interactions
6. **Optimize Performance** - Profile, optimize, measure
7. **Enhance Accessibility** - Screen readers, keyboard, voice
8. **Build Plugin Marketplace** - Enable community extensions


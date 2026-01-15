# Workspace & Storage Architecture (Vault + Packs)

This document defines the on-disk layout for a workspace (vault-like folder) and packs implemented as folders ("folder-files").

## Terms
- Vault / Workspace: root folder containing many packs
- Pack: on-disk unit that users treat as a file, implemented as a folder
- Projection: derived representation of canonical data (for example, `.tex`, `.md`, `.html`, `.pdf`)
- Working tree: deterministic projection tree for external tools + git workflows

## Goals
- External access is expected (humans + AI agents)
- Performance at scale (incremental IO + indexing)
- JSON coherence (semantic ops + canonical model)
- No drift (single-authority rule)

## Per-Pack Folder Layout (Recommended)
Example: `MyPack.twodo/`

- `pack.manifest.json`
  - stable `packId`
  - `authoritativeRepresentation` (canonical vs source-text)
  - `primaryProjection` (what the user sees/edits as the "main file")
  - dependencies (cross-pack references/includes)
- `pack.twodo.db`
  - canonical store (items/relationships/metadata/indexes/revision metadata)
  - preferred location for the semantic op log early on
- `main.tex` / `main.md` / `main.txt`
  - primary projection file for external tools
- `assets/`
  - binary assets addressed by stable IDs and/or content hash
- `derived/` (optional, rebuildable)
  - cached exports (`main.pdf`, `main.html`) and other projections
- `indexes/` (optional, rebuildable)
  - per-pack indexes if needed

## Representation Authority (Prevent Drift)
- Single-authority rule: only one representation is authoritative at a time.
- Default (canonical-authoritative):
  - canonical model in `pack.twodo.db` is authoritative
  - projection files are caches (may be updated lazily)
- Source-text authoritative (for example, LaTeX-authoritative pack):
  - `main.tex` is authoritative
  - canonical model is derived for indexing/links/alternate views
  - non-source views may be intentionally lossy (explicit)

## External Access MVP: CLI Working Tree Sync (Option 1)
- `twodo export` / `twodo import` / `twodo sync --watch`
  - converts external edits into semantic ops
  - validates changes, provides diff/preview, supports rollback/undo
  - never applies ambiguous destructive edits silently

## Performance Non-Negotiables
- active-set memory (only open packs resident)
- viewport virtualization
- async incremental indexing (no UI-thread vault scans)
- event-storm control (watchers coalesced + rate-limited)
- rebuildable caches (derived artifacts optional)

## Future Upgrade Path: Mounted/Projected Filesystem (Option 3)
This layout remains compatible with a future mount/projection solution by keeping:
- semantic ops ingestion pipeline stable
- projections as a surface that can be exported today and mounted later

# Naming Review: Open Issues

## Overview
This document tracks naming-related issues and decisions that still need implementation.
Implemented items and resolved terminology have been removed.

---

## Open Decisions To Implement
- Implement **materialized groups** for document formats (`Document -> Group -> Item`).
- Implement **flat groups with `level` metadata** (nesting derived for rendering).
- Implement canonical **`parentGroupId` + `level`**, with ancestry indexes derived in `indexes/`.
- Implement **per-document mode flag**: header-derived OR manual (no mixed groups).
- Implement **ID-link nesting model** (`parentId`/`childIds`), not nested arrays.
- Implement modal responsibilities split:
  - `ModalService` = state + business rules (open/close, validation, data shaping).
  - `ModalRenderer` = DOM rendering/layout only.
- Enforce scoped names for `data`/`state`/`event` (e.g., `formData`, `uiState`, `appEvent`).
- Enforce ID-first identity (`itemId`/`groupId`/`documentId`), indices are view-local only.
- Enforce DOM vs data naming (`*Element` for DOM nodes, plain nouns for data).
- Avoid browser/global API names for app-local variables unless referencing the API type.
- Standardize class/utility suffixes (`*Manager`, `*Handler`, `*Renderer`, `*Service`, `*Index`, `*Tracker`, `*Editor`).

---

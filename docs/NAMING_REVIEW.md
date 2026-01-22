# Naming Review: Open Issues

## Overview
This document tracks naming-related issues and decisions that still need implementation.
Implemented items and resolved terminology have been removed.

---

## Open Decisions To Implement
- Enforce scoped names for `data`/`state`/`event` (e.g., `formData`, `uiState`, `appEvent`).
- Enforce DOM vs data naming (`*Element` for DOM nodes, plain nouns for data).
  - Rename `elementElement` variables to `elementNode`, `domElement`, or contextually clear names.
- Avoid browser/global API names for app-local variables unless referencing the API type.
- Standardize class/utility suffixes (`*Manager`, `*Handler`, `*Renderer`, `*Service`, `*Index`, `*Tracker`, `*Editor`).

---

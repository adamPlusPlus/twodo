# Module Template

This template shows the recommended pattern for creating new modules in the application.

## Basic Structure

```javascript
// ModuleName.js - Brief description of module purpose
import { eventBus } from '../core/EventBus.js';
import { EVENTS } from '../core/AppEvents.js';
import { getService, SERVICES, hasService } from '../core/AppServices.js';

export class ModuleName {
    constructor() {
        // Get services via ServiceLocator (lazy access for transition)
        // Do NOT store app instance
    }
    
    /**
     * Get services (lazy access pattern for transition period)
     */
    _getServiceName() {
        if (hasService(SERVICES.SERVICE_NAME)) {
            return getService(SERVICES.SERVICE_NAME);
        }
        // Fallback during transition (if needed)
        return null;
    }
    
    /**
     * Example method
     */
    doSomething() {
        const appState = this._getAppState();
        const dataManager = this._getDataManager();
        
        // Use services, not this.app
        // Emit events for UI updates
        eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
    }
}
```

## Key Principles

### 1. No App Instance Dependency
- **Don't**: `constructor(app) { this.app = app; }`
- **Do**: `constructor() { /* use ServiceLocator */ }`

### 2. Use ServiceLocator
- Get services via `getService(SERVICES.SERVICE_NAME)`
- Use lazy access pattern during transition: `_getServiceName()`

### 3. Use EventBus for UI Updates
- **Don't**: `this.app.render()`
- **Do**: `eventBus.emit(EVENTS.APP.RENDER_REQUESTED)`

### 4. Use Events for UI Actions
- **Don't**: `this.app.modalHandler.showEditModal(...)`
- **Do**: `eventBus.emit(EVENTS.UI.SHOW_EDIT_MODAL, {...})`

### 5. Access Data via AppState Service
- **Don't**: `this.app.pages`
- **Do**: `const appState = getService(SERVICES.APP_STATE); appState.pages`

## Service Dependencies

Common services you might need:

```javascript
// AppState - Application state
const appState = getService(SERVICES.APP_STATE);

// DataManager - Data persistence
const dataManager = getService(SERVICES.DATA_MANAGER);

// UndoRedoManager - Undo/redo functionality
const undoRedoManager = getService(SERVICES.UNDO_REDO_MANAGER);

// EventBus - Already imported, use directly
eventBus.emit(EVENTS.EVENT_NAME, payload);
```

## Event Patterns

### Emitting Events
```javascript
// Data changes
eventBus.emit(EVENTS.DATA.SAVE_REQUESTED);

// UI updates
eventBus.emit(EVENTS.APP.RENDER_REQUESTED);

// Element events
eventBus.emit(EVENTS.ELEMENT.CREATED, {
    pageId, binId, elementIndex, element
});

// UI modal events
eventBus.emit(EVENTS.UI.SHOW_EDIT_MODAL, {
    pageId, binId, elementIndex, element
});
```

### Listening to Events
```javascript
constructor() {
    eventBus.on(EVENTS.ELEMENT.CREATED, (data) => {
        // Handle event
    });
}
```

## Testing

Modules should be testable in isolation:

```javascript
// In tests
import { serviceLocator } from '../core/ServiceLocator.js';
import { MockAppState } from './mocks/MockAppState.js';

// Setup
const mockAppState = new MockAppState();
serviceLocator.register(SERVICES.APP_STATE, mockAppState);

// Test
const module = new ModuleName();
module.doSomething();

// Verify
expect(mockAppState.pages).toHaveLength(1);
```

## Migration Pattern

During transition, use lazy access pattern:

```javascript
_getAppState() {
    if (hasService(SERVICES.APP_STATE)) {
        return getService(SERVICES.APP_STATE);
    }
    // Fallback during transition
    return this.app?.appState || this.app;
}
```

This allows modules to work both with and without ServiceLocator during the migration period.

## Naming Conventions

### Class Suffixes

Follow standardized suffixes based on the class's primary responsibility:

- **\*Manager**: Manages lifecycle, state, or collections (e.g., `ThemeManager`, `PageManager`)
- **\*Handler**: Handles events, user interactions, or external inputs (e.g., `EventHandler`, `ModalHandler`)
- **\*Renderer**: Renders UI components or visual representations (e.g., `AppRenderer`, `ElementRenderer`)
- **\*Service**: Provides business logic or cross-cutting concerns (e.g., `ImportService`, `ExportService`)
- **\*Index**: Maintains searchable indexes or lookup structures (e.g., `SearchIndex`)
- **\*Tracker**: Tracks state changes, metrics, or time-based data (e.g., `TimeTracker`)
- **\*Editor**: Provides editing capabilities (e.g., `InlineEditor`)

See [NAMING_SUFFIX_GUIDELINES.md](NAMING_SUFFIX_GUIDELINES.md) for detailed guidelines and examples.

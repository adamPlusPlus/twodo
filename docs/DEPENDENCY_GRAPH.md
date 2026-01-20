# Dependency Graph

Visual representation of module dependencies in the application.

## Core Layer

```
AppState (no dependencies)
  └─> EventBus (emits events)

ServiceLocator (no dependencies)
  └─> Stores all services

EventBus (no dependencies)
  └─> Used by all modules

AppEvents (no dependencies)
  └─> Event constants
```

## Service Layer

```
DataManager
  └─> AppState (via ServiceLocator)
  └─> EventBus

RenderService
  └─> AppRenderer
  └─> EventBus

AppRenderer
  └─> AppState (via ServiceLocator)
  └─> PageManager (via ServiceLocator)
  └─> BinRenderer, ElementRenderer
```

## Module Layer

```
ElementManager
  └─> AppState (via ServiceLocator)
  └─> UndoRedoManager (via ServiceLocator)
  └─> ElementTypeManager (via ServiceLocator)
  └─> DataManager (via ServiceLocator)
  └─> EventBus

PageManager
  └─> AppState (via ServiceLocator)
  └─> UndoRedoManager (via ServiceLocator)
  └─> DataManager (via ServiceLocator)
  └─> PagePluginManager (via ServiceLocator)
  └─> EventBus

BinManager
  └─> AppState (via ServiceLocator)
  └─> UndoRedoManager (via ServiceLocator)
  └─> DataManager (via ServiceLocator)
  └─> BinPluginManager (via ServiceLocator)
  └─> EventBus
```

## Dependency Flow

```
User Action
  └─> EventHandler
      └─> Manager (ElementManager, PageManager, etc.)
          └─> AppState (via ServiceLocator)
          └─> DataManager (via ServiceLocator)
          └─> EventBus (emit events)
              └─> RenderService
                  └─> AppRenderer
                      └─> DOM Update
```

## Key Principles

1. **No Circular Dependencies**: Modules depend on services, not on each other
2. **ServiceLocator Pattern**: All dependencies accessed via ServiceLocator
3. **Event-Driven**: Modules communicate via EventBus, not direct calls
4. **Unidirectional Flow**: Data flows in one direction through the system

## Dependency Rules

- ✅ Modules can depend on Core (EventBus, AppState, ServiceLocator)
- ✅ Modules can depend on Services (via ServiceLocator)
- ✅ Modules can emit events (EventBus)
- ❌ Modules should NOT depend on other modules directly
- ❌ Modules should NOT depend on app instance
- ❌ Modules should NOT call render() directly

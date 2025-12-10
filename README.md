# Daily Todo Tracker (twodo)

A modular, feature-rich daily todo tracker with drag-and-drop organization, multiple element types (tasks, timers, audio, images), calendar views, undo/redo, and plugin architecture. Supports pages, bins, nested elements, and real-time sync.

## Features

### Core Features
- **Daily Reset**: Automatically resets all repeating tasks at the start of each day
- **Multiple Pages**: Organize tasks across different pages
- **Bins**: Group elements within pages
- **Drag-and-Drop**: Reorder elements and nest them with a 3-second hold
- **Nested Elements**: Support for one-level nesting of any element type
- **Persistent Storage**: All data saved in browser localStorage
- **Real-Time Sync**: WebSocket-based synchronization across devices
- **Undo/Redo**: Full undo/redo support with change history

### Element Types
- **Task**: Simple checkbox with task text
- **Header**: Section divider (non-interactive)
- **Header with Checkbox**: Section divider with completion tracking
- **Subtask**: Nested tasks with dropdown checklist
- **Multi-checkbox**: Multiple checkboxes on one line (add/remove items)
- **One-time Tasks**: Deleted automatically when completed (don't repeat)
- **Audio**: Inline audio recording and playback
- **Timer**: Time tracking element
- **Image**: Image display element
- **Calendar**: Calendar view element
- **Counter**: Counter element
- **Rating**: Rating element
- **Time Log**: Time logging element
- **Tracker**: Tracker element

### Plugin System

The app includes a comprehensive plugin architecture with four types of plugins:

#### Element Type Plugins
- Link/Bookmark Element
- Code Snippet Element
- Table Element
- Contact Element
- Expense Tracker Element
- Reading List Element
- Recipe Element
- Workout Element
- Mood Tracker Element
- Note/Journal Element
- Habit Tracker Element
- Time Tracking Element
- Custom Properties
- Element Relationships

#### Page Plugins
- Analytics Dashboard
- Page Templates
- Page Themes
- Search & Filter
- Export/Import
- Custom Scripts
- Custom Views
- Page Goal Setting
- Page Reminder System

#### Bin Plugins
- Kanban Board
- Gantt Chart View
- Workflow Automation
- Batch Operations
- Custom Sorting
- Filter Presets
- Progress Tracker
- Time Estimates
- Color Coding
- Bin Archive
- Bin Statistics
- Bin Notification Rules

#### Format Renderers
- Trello-Style Board
- Grid Layout Format
- Horizontal Layout Format
- Page Kanban Format

## Usage

### Starting the Server

Since the app uses `fetch()` to load files, you need to run it from a local server:

```bash
./serve.sh
```

Or manually:
```bash
python3 -m http.server 8000 --bind 0.0.0.0
```

Then open `http://localhost:8000` in your browser.

**LAN Access**: The server binds to all network interfaces (0.0.0.0), making it accessible from other devices on your local network. The script will display your local IP address when starting - use `http://YOUR_IP:8000` on other devices to access the app.

### Real-Time Sync

To enable real-time synchronization across devices:

1. Install WebSocket dependencies:
```bash
pip install websockets
```

2. Start both servers:
```bash
bash start_servers.sh
```

Or manually:
```bash
# Terminal 1: HTTP server
python3 server.py 8000

# Terminal 2: WebSocket server  
python3 websocket_server.py 8001
```

### Adding Elements

Click "+ Add Element" on any page to add a new element. Choose from:
1. Task
2. Header
3. Header with Checkbox
4. Multi-checkbox
5. One-time Task
6. Audio
7. Timer
8. And more via plugins...

### Managing Tasks

- **Check tasks**: Click checkbox or task text to toggle completion
- **Edit page titles**: Click on the page title to edit
- **Delete pages**: Click "Delete" button on a page
- **Add/remove multi-checkbox items**: Use the + Add button and × buttons on each item
- **View subtasks**: Click the dropdown toggle to expand/collapse subtasks
- **Nest elements**: Drag an element over another and hold for 3 seconds to nest it
- **Add children**: Right-click an element → "Add Child Element"

### Daily Reset

- Tasks automatically reset at the start of each day
- Click "Reset Today" to manually reset all repeating tasks
- One-time tasks are not reset and are deleted when completed
- Audio files are archived on daily reset

### Undo/Redo

- **Undo**: `Ctrl+Z` (or `Cmd+Z` on Mac)
- **Redo**: `Ctrl+Shift+Z` or `Ctrl+Y` (or `Cmd+Shift+Z` / `Cmd+Y` on Mac)
- Undo/redo works across all devices when sync is enabled

### Accessing Plugins

Many plugins are available but need to be loaded. See the plugin files in:
- `js/plugins/element/` - Element type plugins
- `js/plugins/page/` - Page plugins
- `js/plugins/bin/` - Bin plugins
- `js/plugins/format/` - Format renderers

Plugins can be loaded via the browser console or will be automatically loaded when the UI is enhanced.

## File Structure

- `index.html` - Main app structure
- `app.js` - Application logic and state management
- `app.css` - Styling
- `server.py` - HTTP server
- `websocket_server.py` - WebSocket server for real-time sync
- `serve.sh` - Simple server script
- `start_servers.sh` - Start both HTTP and WebSocket servers
- `js/core/` - Core application modules
- `js/modules/` - Feature modules
- `js/plugins/` - Plugin implementations
- `js/utils/` - Utility functions

## Data Storage

All data is stored in browser localStorage with the key `twodo-data`. The last reset date is tracked to enable automatic daily resets. Audio files are stored in the `saved_files/recordings/` directory and archived data is stored in localStorage with the key `twodo-audio-archive`.

## Plugin Development

The app uses a modular plugin architecture. See the plugin examples in `js/plugins/` for how to create new plugins. All plugins extend base classes:
- `BasePlugin` - For page and bin plugins
- `BaseElementType` - For element type plugins
- `BaseFormatRenderer` - For format renderer plugins

## Architecture

### Plugin System
- **Plugin Registry**: Tracks all loaded plugins
- **Plugin Loader**: Dynamically loads plugins
- **Service Locator**: Provides access to app services
- **Event Bus**: App-wide event communication

### Data Management
- **Data Manager**: Handles data persistence
- **Sync Manager**: Manages WebSocket connections and real-time sync
- **Undo/Redo Manager**: Tracks changes and manages undo/redo stacks

### Rendering
- **App Renderer**: Main rendering engine
- **Element Renderer**: Renders individual elements
- **Format Renderer Manager**: Manages format renderers
- **Render Service**: Coordinates rendering

## Browser Compatibility

Works in modern browsers that support:
- ES6+ JavaScript
- LocalStorage API
- WebSocket API (for sync)
- MediaRecorder API (for audio recording)
- Drag and Drop API

## License

See repository for license information.

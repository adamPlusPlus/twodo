(function polyfill() {
  const relList = document.createElement("link").relList;
  if (relList && relList.supports && relList.supports("modulepreload")) {
    return;
  }
  for (const link of document.querySelectorAll('link[rel="modulepreload"]')) {
    processPreload(link);
  }
  new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type !== "childList") {
        continue;
      }
      for (const node of mutation.addedNodes) {
        if (node.tagName === "LINK" && node.rel === "modulepreload")
          processPreload(node);
      }
    }
  }).observe(document, { childList: true, subtree: true });
  function getFetchOpts(link) {
    const fetchOpts = {};
    if (link.integrity) fetchOpts.integrity = link.integrity;
    if (link.referrerPolicy) fetchOpts.referrerPolicy = link.referrerPolicy;
    if (link.crossOrigin === "use-credentials")
      fetchOpts.credentials = "include";
    else if (link.crossOrigin === "anonymous") fetchOpts.credentials = "omit";
    else fetchOpts.credentials = "same-origin";
    return fetchOpts;
  }
  function processPreload(link) {
    if (link.ep)
      return;
    link.ep = true;
    const fetchOpts = getFetchOpts(link);
    fetch(link.href, fetchOpts);
  }
})();
const scriptRel = "modulepreload";
const assetsURL = function(dep) {
  return "/" + dep;
};
const seen = {};
const __vitePreload = function preload(baseModule, deps, importerUrl) {
  let promise = Promise.resolve();
  if (deps && deps.length > 0) {
    document.getElementsByTagName("link");
    const cspNonceMeta = document.querySelector(
      "meta[property=csp-nonce]"
    );
    const cspNonce = cspNonceMeta?.nonce || cspNonceMeta?.getAttribute("nonce");
    promise = Promise.allSettled(
      deps.map((dep) => {
        dep = assetsURL(dep);
        if (dep in seen) return;
        seen[dep] = true;
        const isCss = dep.endsWith(".css");
        const cssSelector = isCss ? '[rel="stylesheet"]' : "";
        if (document.querySelector(`link[href="${dep}"]${cssSelector}`)) {
          return;
        }
        const link = document.createElement("link");
        link.rel = isCss ? "stylesheet" : scriptRel;
        if (!isCss) {
          link.as = "script";
        }
        link.crossOrigin = "";
        link.href = dep;
        if (cspNonce) {
          link.setAttribute("nonce", cspNonce);
        }
        document.head.appendChild(link);
        if (isCss) {
          return new Promise((res, rej) => {
            link.addEventListener("load", res);
            link.addEventListener(
              "error",
              () => rej(new Error(`Unable to preload CSS for ${dep}`))
            );
          });
        }
      })
    );
  }
  function handlePreloadError(err) {
    const e = new Event("vite:preloadError", {
      cancelable: true
    });
    e.payload = err;
    window.dispatchEvent(e);
    if (!e.defaultPrevented) {
      throw err;
    }
  }
  return promise.then((res) => {
    for (const item of res || []) {
      if (item.status !== "rejected") continue;
      handlePreloadError(item.reason);
    }
    return baseModule().catch(handlePreloadError);
  });
};
class EventEmitter {
  constructor() {
    this.events = {};
  }
  /**
   * Subscribe to event
   * @param {string} event - Event name
   * @param {Function} handler - Event handler
   * @returns {Function} - Unsubscribe function
   */
  on(event, handler) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(handler);
    return () => this.off(event, handler);
  }
  /**
   * Subscribe to event once
   * @param {string} event - Event name
   * @param {Function} handler - Event handler
   * @returns {Function} - Unsubscribe function
   */
  once(event, handler) {
    const onceHandler = (...args) => {
      handler(...args);
      this.off(event, onceHandler);
    };
    return this.on(event, onceHandler);
  }
  /**
   * Unsubscribe from event
   * @param {string} event - Event name
   * @param {Function} handler - Event handler
   */
  off(event, handler) {
    if (!this.events[event]) return;
    this.events[event] = this.events[event].filter((h) => h !== handler);
  }
  /**
   * Emit event
   * @param {string} event - Event name
   * @param {...*} args - Event arguments
   */
  emit(event, ...args) {
    if (!this.events[event]) return;
    this.events[event].forEach((handler) => {
      try {
        handler(...args);
      } catch (error) {
        console.error(`Error in event handler for "${event}":`, error);
      }
    });
  }
  /**
   * Remove all listeners for event
   * @param {string} event - Event name
   */
  removeAllListeners(event) {
    if (event) {
      delete this.events[event];
    } else {
      this.events = {};
    }
  }
  /**
   * Get listener count for event
   * @param {string} event - Event name
   * @returns {number}
   */
  listenerCount(event) {
    return this.events[event] ? this.events[event].length : 0;
  }
}
let EventBus$1 = class EventBus extends EventEmitter {
  constructor() {
    super();
    this.eventHistory = [];
    this.maxHistorySize = 100;
  }
  /**
   * Emit event with history tracking
   * @param {string} event - Event name
   * @param {...*} args - Event arguments
   */
  emit(event, ...args) {
    this.eventHistory.push({
      event,
      args,
      timestamp: Date.now()
    });
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }
    super.emit(event, ...args);
  }
  /**
   * Get event history
   * @param {string} eventName - Optional event name to filter
   * @param {number} limit - Limit number of results
   * @returns {Array}
   */
  getHistory(eventName = null, limit = null) {
    let history = this.eventHistory;
    if (eventName) {
      history = history.filter((item) => item.event === eventName);
    }
    if (limit) {
      history = history.slice(-limit);
    }
    return history;
  }
  /**
   * Clear event history
   */
  clearHistory() {
    this.eventHistory = [];
  }
};
new EventBus$1();
class EventBus2 extends EventEmitter {
  constructor() {
    super();
    this.eventHistory = [];
    this.maxHistorySize = 100;
  }
  /**
   * Emit event with history tracking
   * @param {string} event - Event name
   * @param {...*} args - Event arguments
   */
  emit(event, ...args) {
    this.eventHistory.push({
      event,
      args,
      timestamp: Date.now()
    });
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }
    super.emit(event, ...args);
  }
  /**
   * Get event history
   * @param {string} eventName - Optional event name to filter
   * @param {number} limit - Limit number of results
   * @returns {Array}
   */
  getHistory(eventName = null, limit = null) {
    let history = this.eventHistory;
    if (eventName) {
      history = history.filter((item) => item.event === eventName);
    }
    if (limit) {
      history = history.slice(-limit);
    }
    return history;
  }
  /**
   * Clear event history
   */
  clearHistory() {
    this.eventHistory = [];
  }
}
const eventBus = new EventBus2();
const EVENTS = {
  /**
   * Application-level events
   */
  APP: {
    /** Request application render
     * @event app:render-requested
     * @type {void}
     * Emitted when any module needs the UI to be re-rendered
     */
    RENDER_REQUESTED: "app:render-requested",
    /** Application render completed
     * @event app:rendered
     * @type {void}
     * Emitted after render is complete
     */
    RENDERED: "app:rendered",
    /** Application initialized
     * @event app:initialized
     * @type {void}
     * Emitted when app initialization is complete
     */
    INITIALIZED: "app:initialized"
  },
  /**
   * Data management events
   */
  DATA: {
    /** Request data save
     * @event data:save-requested
     * @type {void}
     * Emitted when data should be saved
     */
    SAVE_REQUESTED: "data:save-requested",
    /** Data saved
     * @event data:saved
     * @type {void}
     * Emitted after data is successfully saved
     */
    SAVED: "data:saved",
    /** Data loaded
     * @event data:loaded
     * @type {{data: Object}}
     * Emitted when data is loaded from storage
     */
    LOADED: "data:loaded",
    /** Data changed
     * @event data:changed
     * @type {{change: Object}}
     * Emitted when data structure changes
     */
    CHANGED: "data:changed"
  },
  /**
   * Element events
   */
  ELEMENT: {
    /** Element created
     * @event element:created
     * @type {{pageId: string, binId: string, elementIndex: number, element: Object}}
     */
    CREATED: "element:created",
    /** Element updated
     * @event element:updated
     * @type {{pageId: string, binId: string, elementIndex: number, element: Object}}
     */
    UPDATED: "element:updated",
    /** Element completed
     * @event element:completed
     * @type {{pageId: string, binId: string, elementIndex: number, element: Object}}
     */
    COMPLETED: "element:completed",
    /** Element deleted
     * @event element:deleted
     * @type {{pageId: string, binId: string, elementIndex: number}}
     */
    DELETED: "element:deleted",
    /** Element moved
     * @event element:moved
     * @type {{sourcePageId: string, sourceBinId: string, sourceElementIndex: number, targetPageId: string, targetBinId: string, targetElementIndex: number}}
     */
    MOVED: "element:moved"
  },
  /**
   * Page events
   */
  PAGE: {
    /** Page created
     * @event page:created
     * @type {{pageId: string, page: Object}}
     */
    CREATED: "page:created",
    /** Page deleted
     * @event page:deleted
     * @type {{pageId: string}}
     */
    DELETED: "page:deleted",
    /** Page switched
     * @event page:switched
     * @type {{pageId: string}}
     */
    SWITCHED: "page:switched"
  },
  /**
   * Bin events
   */
  BIN: {
    /** Bin created
     * @event bin:created
     * @type {{pageId: string, binId: string, bin: Object}}
     */
    CREATED: "bin:created",
    /** Bin deleted
     * @event bin:deleted
     * @type {{pageId: string, binId: string}}
     */
    DELETED: "bin:deleted"
  },
  /**
   * Undo/Redo events
   */
  UNDO_REDO: {
    /** Change recorded
     * @event undo-redo:change-recorded
     * @type {{change: Object}}
     */
    CHANGE_RECORDED: "undo-redo:change-recorded",
    /** Undo performed
     * @event undo-redo:undo
     * @type {{change: Object}}
     */
    UNDO: "undo-redo:undo",
    /** Redo performed
     * @event undo-redo:redo
     * @type {{change: Object}}
     */
    REDO: "undo-redo:redo"
  },
  /**
   * Sync events
   */
  SYNC: {
    /** Change received from remote
     * @event sync:change-received
     * @type {{change: Object, clientId: string}}
     */
    CHANGE_RECEIVED: "sync:change-received",
    /** Connected to sync server
     * @event sync:connected
     * @type {{clientId: string}}
     */
    CONNECTED: "sync:connected",
    /** Disconnected from sync server
     * @event sync:disconnected
     * @type {void}
     */
    DISCONNECTED: "sync:disconnected"
  },
  /**
   * Format renderer events
   */
  FORMAT: {
    /** Format registered
     * @event format:registered
     * @type {{pluginId: string, formatName: string}}
     */
    REGISTERED: "format:registered",
    /** Format changed for page/bin
     * @event format:changed
     * @type {{pageId: string, binId?: string, formatName: string}}
     */
    CHANGED: "format:changed"
  },
  /**
   * Plugin events
   */
  PLUGIN: {
    /** Plugin loaded
     * @event plugin:loaded
     * @type {{pluginId: string, plugin: Object}}
     */
    LOADED: "plugin:loaded",
    /** Plugin enabled
     * @event plugin:enabled
     * @type {{pluginId: string}}
     */
    ENABLED: "plugin:enabled",
    /** Plugin disabled
     * @event plugin:disabled
     * @type {{pluginId: string}}
     */
    DISABLED: "plugin:disabled"
  },
  /**
   * UI events
   */
  UI: {
    /** UI state changed
     * @event ui:changed
     * @type {{type: string, value: any}}
     * Emitted when UI state changes (e.g., multiPaneEnabled)
     */
    CHANGED: "ui:changed",
    /** Show edit modal
     * @event ui:show-edit-modal
     * @type {{pageId: string, binId: string, elementIndex: number, element: Object}}
     */
    SHOW_EDIT_MODAL: "ui:show-edit-modal",
    /** Show add element modal
     * @event ui:show-add-element-modal
     * @type {{pageId: string, binId?: string, elementIndex?: number}}
     */
    SHOW_ADD_ELEMENT_MODAL: "ui:show-add-element-modal",
    /** Show add child element modal
     * @event ui:show-add-child-element-modal
     * @type {{pageId: string, binId: string, elementIndex: number}}
     */
    SHOW_ADD_CHILD_ELEMENT_MODAL: "ui:show-add-child-element-modal",
    /** Show add subtasks modal
     * @event ui:show-add-subtasks-modal
     * @type {{pageId: string, binId: string, elementIndex: number, element: Object}}
     */
    SHOW_ADD_SUBTASKS_MODAL: "ui:show-add-subtasks-modal",
    /** Show view data modal
     * @event ui:show-view-data-modal
     * @type {{element: Object, isSubtask?: boolean}}
     */
    SHOW_VIEW_DATA_MODAL: "ui:show-view-data-modal",
    /** Show edit page modal
     * @event ui:show-edit-page-modal
     * @type {{pageId: string}}
     */
    SHOW_EDIT_PAGE_MODAL: "ui:show-edit-page-modal",
    /** Show edit bin modal
     * @event ui:show-edit-bin-modal
     * @type {{pageId: string, binId: string}}
     */
    SHOW_EDIT_BIN_MODAL: "ui:show-edit-bin-modal",
    /** Show visual customization modal
     * @event ui:show-visual-customization-modal
     * @type {{targetType: string, targetId: string, context: Object}}
     */
    SHOW_VISUAL_CUSTOMIZATION_MODAL: "ui:show-visual-customization-modal",
    /** Close modal
     * @event ui:close-modal
     * @type {void}
     */
    CLOSE_MODAL: "ui:close-modal",
    /** Focus input element
     * @event ui:focus-input
     * @type {{inputId: string, select?: boolean}}
     */
    FOCUS_INPUT: "ui:focus-input"
  }
};
class ServiceLocator {
  constructor() {
    if (ServiceLocator.instance) {
      return ServiceLocator.instance;
    }
    this.services = /* @__PURE__ */ new Map();
    this.lazyFactories = /* @__PURE__ */ new Map();
    ServiceLocator.instance = this;
  }
  /**
   * Register a service
   * @param {string} name - Service name
   * @param {*} service - Service instance
   * @throws {Error} If service name is already registered
   */
  register(name, service) {
    if (this.services.has(name)) {
      throw new Error(`Service "${name}" is already registered`);
    }
    this.services.set(name, service);
  }
  /**
   * Register a lazy service factory
   * @param {string} name - Service name
   * @param {Function} factory - Factory function that returns the service
   */
  registerLazy(name, factory) {
    if (this.lazyFactories.has(name)) {
      throw new Error(`Lazy service "${name}" is already registered`);
    }
    this.lazyFactories.set(name, factory);
  }
  /**
   * Get a service by name
   * @param {string} name - Service name
   * @returns {*} Service instance
   * @throws {Error} If service is not registered
   */
  get(name) {
    if (this.services.has(name)) {
      return this.services.get(name);
    }
    if (this.lazyFactories.has(name)) {
      const factory = this.lazyFactories.get(name);
      const service = factory();
      this.services.set(name, service);
      this.lazyFactories.delete(name);
      return service;
    }
    throw new Error(`Service "${name}" is not registered`);
  }
  /**
   * Check if a service is registered
   * @param {string} name - Service name
   * @returns {boolean}
   */
  has(name) {
    return this.services.has(name) || this.lazyFactories.has(name);
  }
  /**
   * Unregister a service (useful for testing)
   * @param {string} name - Service name
   */
  unregister(name) {
    this.services.delete(name);
    this.lazyFactories.delete(name);
  }
  /**
   * Clear all services (useful for testing)
   */
  clear() {
    this.services.clear();
    this.lazyFactories.clear();
  }
  /**
   * Get all registered service names
   * @returns {string[]}
   */
  getRegisteredServices() {
    const services = Array.from(this.services.keys());
    const lazy = Array.from(this.lazyFactories.keys());
    return [...services, ...lazy];
  }
}
const serviceLocator = new ServiceLocator();
const SERVICES = {
  // Core services
  DATA_MANAGER: "dataManager",
  UNDO_REDO_MANAGER: "undoRedoManager",
  SYNC_MANAGER: "syncManager",
  EVENT_BUS: "eventBus",
  RENDERER: "renderer",
  // Manager services
  SETTINGS_MANAGER: "settingsManager",
  THEME_MANAGER: "themeManager",
  VISUAL_SETTINGS_MANAGER: "visualSettingsManager",
  PAGE_MANAGER: "pageManager",
  BIN_MANAGER: "binManager",
  ELEMENT_MANAGER: "elementManager",
  FILE_MANAGER: "fileManager",
  MODAL_HANDLER: "modalHandler",
  DRAG_DROP_HANDLER: "dragDropHandler",
  CONTEXT_MENU_HANDLER: "contextMenuHandler",
  TOUCH_GESTURE_HANDLER: "touchGestureHandler",
  EVENT_HANDLER: "eventHandler",
  AUDIO_HANDLER: "audioHandler",
  // Feature services
  RELATIONSHIP_MANAGER: "relationshipManager",
  TEMPLATE_MANAGER: "templateManager",
  AUTOMATION_MANAGER: "automationManager",
  TAG_MANAGER: "tagManager",
  SEARCH_INDEX: "searchIndex",
  EXPORT_SERVICE: "exportService",
  IMPORT_SERVICE: "importService",
  OAUTH_MANAGER: "oauthManager",
  TIME_TRACKER: "timeTracker",
  DAILY_RESET_MANAGER: "dailyResetManager",
  INLINE_EDITOR: "inlineEditor",
  // Plugin system
  PAGE_PLUGIN_MANAGER: "pagePluginManager",
  BIN_PLUGIN_MANAGER: "binPluginManager",
  ELEMENT_TYPE_MANAGER: "elementTypeManager",
  FORMAT_RENDERER_MANAGER: "formatRendererManager",
  // App state (for accessing pages array, etc.)
  APP_STATE: "appState"
};
function registerService(name, service) {
  serviceLocator.register(name, service);
}
function getService(name) {
  return serviceLocator.get(name);
}
function hasService(name) {
  return serviceLocator.has(name);
}
function registerAllServices(app2) {
  if (!hasService(SERVICES.EVENT_BUS)) {
    registerService(SERVICES.EVENT_BUS, app2.eventBus || eventBus);
  }
  if (!hasService(SERVICES.DATA_MANAGER)) {
    registerService(SERVICES.DATA_MANAGER, app2.dataManager);
  }
  if (!hasService(SERVICES.UNDO_REDO_MANAGER)) {
    registerService(SERVICES.UNDO_REDO_MANAGER, app2.undoRedoManager);
  }
  registerService(SERVICES.SYNC_MANAGER, app2.syncManager);
  if (!hasService(SERVICES.SETTINGS_MANAGER)) {
    registerService(SERVICES.SETTINGS_MANAGER, app2.settingsManager);
  }
  if (!hasService(SERVICES.THEME_MANAGER)) {
    registerService(SERVICES.THEME_MANAGER, app2.themeManager);
  }
  if (!hasService(SERVICES.VISUAL_SETTINGS_MANAGER)) {
    registerService(SERVICES.VISUAL_SETTINGS_MANAGER, app2.visualSettingsManager);
  }
  if (!hasService(SERVICES.PAGE_MANAGER)) {
    registerService(SERVICES.PAGE_MANAGER, app2.pageManager);
  }
  if (!hasService(SERVICES.BIN_MANAGER)) {
    registerService(SERVICES.BIN_MANAGER, app2.binManager);
  }
  if (!hasService(SERVICES.ELEMENT_MANAGER)) {
    registerService(SERVICES.ELEMENT_MANAGER, app2.elementManager);
  }
  registerService(SERVICES.FILE_MANAGER, app2.fileManager);
  registerService(SERVICES.MODAL_HANDLER, app2.modalHandler);
  registerService(SERVICES.DRAG_DROP_HANDLER, app2.dragDropHandler);
  registerService(SERVICES.CONTEXT_MENU_HANDLER, app2.contextMenuHandler);
  registerService(SERVICES.TOUCH_GESTURE_HANDLER, app2.touchGestureHandler);
  registerService(SERVICES.EVENT_HANDLER, app2.eventHandler);
  registerService(SERVICES.AUDIO_HANDLER, app2.audioHandler);
  registerService(SERVICES.RELATIONSHIP_MANAGER, app2.relationshipManager);
  registerService(SERVICES.TEMPLATE_MANAGER, app2.templateManager);
  registerService(SERVICES.AUTOMATION_MANAGER, app2.automationEngine);
  registerService(SERVICES.TAG_MANAGER, app2.tagManager);
  registerService(SERVICES.SEARCH_INDEX, app2.searchIndex);
  registerService(SERVICES.EXPORT_SERVICE, app2.exportService);
  registerService(SERVICES.IMPORT_SERVICE, app2.importService);
  registerService(SERVICES.OAUTH_MANAGER, app2.oauthManager);
  registerService(SERVICES.TIME_TRACKER, app2.timeTracker);
  registerService(SERVICES.DAILY_RESET_MANAGER, app2.dailyResetManager);
  registerService(SERVICES.INLINE_EDITOR, app2.inlineEditor);
  registerService(SERVICES.PAGE_PLUGIN_MANAGER, app2.pagePluginManager);
  registerService(SERVICES.BIN_PLUGIN_MANAGER, app2.binPluginManager);
  registerService(SERVICES.ELEMENT_TYPE_MANAGER, app2.elementTypeManager);
  registerService(SERVICES.FORMAT_RENDERER_MANAGER, app2.formatRendererManager);
  if (!hasService(SERVICES.APP_STATE)) {
    registerService(SERVICES.APP_STATE, app2.appState);
  }
}
const ItemHierarchy = {
  buildItemIndex(items) {
    const index = {};
    if (!items || !Array.isArray(items)) {
      return index;
    }
    items.forEach((item) => {
      if (!item || typeof item !== "object" || !item.id) {
        return;
      }
      index[item.id] = item;
    });
    return index;
  },
  getRootItems(items) {
    if (!items || !Array.isArray(items)) {
      return [];
    }
    return items.filter((item) => item && !item.parentId);
  },
  getRootItemAtIndex(items, index) {
    if (typeof index !== "number" || index < 0) {
      return null;
    }
    const rootItems = ItemHierarchy.getRootItems(items);
    return rootItems[index] || null;
  },
  getChildItems(item, itemIndex) {
    if (!itemIndex || typeof itemIndex !== "object") {
      return [];
    }
    const childIds = Array.isArray(item?.childIds) ? item.childIds : [];
    return childIds.map((id) => itemIndex[id]).filter(Boolean);
  }
};
class DataManager {
  constructor() {
    this.storageKey = "twodo-data";
    this.lastResetKey = "twodo-last-reset";
    this._lastSyncTimestamp = 0;
    this.setupEventListeners();
  }
  /**
   * Get AppState service
   */
  _getAppState() {
    return getService(SERVICES.APP_STATE);
  }
  /**
   * Get SettingsManager service
   */
  _getSettingsManager() {
    return getService(SERVICES.SETTINGS_MANAGER);
  }
  /**
   * Get SyncManager service
   */
  _getSyncManager() {
    return getService(SERVICES.SYNC_MANAGER);
  }
  /**
   * Get FileManager service
   */
  _getFileManager() {
    return getService(SERVICES.FILE_MANAGER);
  }
  /**
   * Setup EventBus listeners for save requests
   */
  setupEventListeners() {
    eventBus.on(EVENTS.DATA.SAVE_REQUESTED, (skipSync = false) => {
      this.saveData(skipSync);
    });
  }
  checkDailyReset() {
    const today = (/* @__PURE__ */ new Date()).toDateString();
    const lastReset = localStorage.getItem(this.lastResetKey);
    if (lastReset !== today) {
      const storedData = this._normalizeDataModel(this.loadFromStorage());
      if (storedData && storedData.documents) {
        storedData.documents.forEach((document2) => {
          if (document2.groups) {
            document2.groups.forEach((group) => {
              if (group.items) {
                const removeIds = new Set(
                  group.items.filter((item) => item?.repeats === false && item?.completed).map((item) => item.id)
                );
                group.items = group.items.filter((item) => !removeIds.has(item.id));
                group.items.forEach((item) => {
                  if (Array.isArray(item.childIds)) {
                    item.childIds = item.childIds.filter((id) => !removeIds.has(id));
                  }
                  if (item.parentId && removeIds.has(item.parentId)) {
                    item.parentId = null;
                  }
                });
              }
            });
          } else if (document2.items) {
            document2.items = document2.items.filter((item) => {
              if (item.repeats === false && item.completed) {
                return false;
              }
              return true;
            });
          }
        });
        const resetItem = (item, documentId, itemIndex, itemIndexMap) => {
          if (item.repeats !== false) {
            item.completed = false;
            if (itemIndexMap) {
              const childItems = ItemHierarchy.getChildItems(item, itemIndexMap);
              childItems.forEach((child) => {
                if (child.repeats !== false) {
                  child.completed = false;
                }
              });
            }
            if (item.type === "audio" && item.repeats !== false) {
              if (item.audioFile && item.date) {
                this.archiveAudioRecording(documentId, itemIndex, item.audioFile, item.date);
              }
              item.audioFile = null;
              item.date = null;
            }
            if (item.items) {
              item.items.forEach((subItem) => {
                if (subItem.repeats !== false) {
                  subItem.completed = false;
                }
              });
            }
          }
        };
        storedData.documents.forEach((document2) => {
          if (document2.groups) {
            document2.groups.forEach((group) => {
              if (group.items) {
                const itemIndexMap = ItemHierarchy.buildItemIndex(group.items);
                group.items.forEach((item, itemIndex) => {
                  resetItem(item, document2.id, itemIndex, itemIndexMap);
                });
              }
            });
          } else if (document2.items) {
            document2.items.forEach((item, itemIndex) => {
              resetItem(item, document2.id, itemIndex);
            });
          }
        });
        const appState2 = this._getAppState();
        appState2.documents = storedData.documents;
        this.saveData();
      }
      localStorage.setItem(this.lastResetKey, today);
    }
  }
  loadFromStorage() {
    const stored = localStorage.getItem(this.storageKey);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.error("Failed to parse stored data:", e);
      }
    }
    return null;
  }
  _normalizeDataModel(rawData) {
    if (!rawData || typeof rawData !== "object") {
      return { documents: [] };
    }
    const normalized = { ...rawData };
    normalized.documents = normalized.documents || [];
    normalized.documentStates = normalized.documentStates || {};
    normalized.groupStates = normalized.groupStates || {};
    normalized.documents = this._migrateDocumentsToIdLinks(normalized.documents);
    return normalized;
  }
  normalizeDataModel(rawData) {
    return this._normalizeDataModel(rawData);
  }
  _generateItemId() {
    return `item-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }
  _ensureDocumentDefaults(document2) {
    const config = document2.config && typeof document2.config === "object" ? document2.config : {};
    const groupMode = document2.groupMode || config.groupMode || "manual";
    return {
      ...document2,
      groups: Array.isArray(document2.groups) ? document2.groups : [],
      config: { ...config, groupMode },
      groupMode
    };
  }
  _ensureGroupDefaults(group) {
    return {
      ...group,
      items: Array.isArray(group.items) ? group.items : [],
      level: typeof group.level === "number" ? group.level : 0,
      parentGroupId: group.parentGroupId ?? null
    };
  }
  _migrateItemsToIdLinks(items) {
    const flatItems = [];
    const seen2 = /* @__PURE__ */ new Set();
    const addItem = (item, parentId = null) => {
      if (!item || typeof item !== "object") {
        return null;
      }
      const itemId = item.id || this._generateItemId();
      item.id = itemId;
      if (parentId !== null) {
        item.parentId = parentId;
      } else if (!item.parentId) {
        item.parentId = null;
      }
      const existingChildIds = Array.isArray(item.childIds) ? [...item.childIds] : [];
      const children = Array.isArray(item.children) ? item.children : [];
      if (Array.isArray(item.subtasks) && item.subtasks.length > 0) {
        item.subtasks.forEach((subtask) => {
          const childItem = {
            id: this._generateItemId(),
            type: "task",
            text: subtask.text || "Subtask",
            completed: subtask.completed || false,
            timeAllocated: subtask.timeAllocated || "",
            repeats: subtask.repeats !== void 0 ? subtask.repeats : true,
            funModifier: subtask.funModifier || "",
            parentId: itemId,
            childIds: [],
            config: {}
          };
          children.push(childItem);
        });
        delete item.subtasks;
      }
      if (!seen2.has(itemId)) {
        flatItems.push(item);
        seen2.add(itemId);
      }
      item.childIds = [];
      children.forEach((child) => {
        const childId = addItem(child, itemId);
        if (childId) {
          item.childIds.push(childId);
        }
      });
      if (item.childIds.length === 0 && existingChildIds.length > 0) {
        item.childIds = existingChildIds;
      }
      delete item.children;
      return itemId;
    };
    (items || []).forEach((item) => addItem(item, null));
    const itemIndex = ItemHierarchy.buildItemIndex(flatItems);
    flatItems.forEach((item) => {
      if (item.parentId && itemIndex[item.parentId]) {
        const parent = itemIndex[item.parentId];
        if (!Array.isArray(parent.childIds)) {
          parent.childIds = [];
        }
        if (!parent.childIds.includes(item.id)) {
          parent.childIds.push(item.id);
        }
      }
    });
    flatItems.forEach((item) => {
      const childIds = Array.isArray(item.childIds) ? item.childIds : [];
      item.childIds = childIds.filter((childId) => itemIndex[childId]);
      if (item.parentId && !itemIndex[item.parentId]) {
        item.parentId = null;
      }
    });
    return flatItems;
  }
  _migrateDocumentsToIdLinks(documents) {
    return documents.map((rawDocument) => {
      const document2 = this._ensureDocumentDefaults(rawDocument);
      let groups = document2.groups;
      if ((!groups || groups.length === 0) && Array.isArray(document2.items)) {
        groups = [{
          id: "group-0",
          title: "Group 1",
          items: document2.items,
          level: 0,
          parentGroupId: null
        }];
        delete document2.items;
      }
      const normalizedGroups = (groups || []).map((group) => {
        const normalizedGroup = this._ensureGroupDefaults(group);
        normalizedGroup.items = this._migrateItemsToIdLinks(normalizedGroup.items);
        return normalizedGroup;
      });
      return {
        ...document2,
        groups: normalizedGroups
      };
    });
  }
  migrateSubtasksToChildren(data) {
    if (!data) {
      return data;
    }
    data.documents = this._migrateDocumentsToIdLinks(data.documents || []);
    return data;
  }
  loadData() {
    const normalized = this._normalizeDataModel(this.loadFromStorage());
    const appState2 = this._getAppState();
    const documents = (normalized.documents || []).map((document2) => {
      const groups = document2.groups || [];
      if (groups.length === 0) {
        return {
          ...document2,
          groups: [{
            id: "group-0",
            title: "Group 1",
            items: [],
            level: 0,
            parentGroupId: null
          }]
        };
      }
      return {
        ...document2,
        groups
      };
    });
    if (documents.length > 0) {
      appState2.documents = documents;
    } else {
      appState2.documents = [{
        id: "document-1",
        groups: [{
          id: "group-0",
          title: "Group 1",
          items: [],
          level: 0,
          parentGroupId: null
        }]
      }];
    }
    const storedCurrentId = normalized.currentDocumentId;
    if (storedCurrentId) {
      appState2.currentDocumentId = storedCurrentId;
    } else if (appState2.documents.length > 0) {
      appState2.currentDocumentId = appState2.documents[0].id;
    }
    if (normalized.documentStates) {
      appState2.documentStates = normalized.documentStates;
    }
    if (normalized.groupStates) {
      appState2.groupStates = normalized.groupStates;
    }
    if (normalized.subtaskStates) {
      if (appState2.setSubtaskState) {
        Object.keys(normalized.subtaskStates).forEach((key) => {
          appState2.setSubtaskState(key, normalized.subtaskStates[key]);
        });
      } else {
        appState2.subtaskStates = normalized.subtaskStates;
      }
    }
    if (normalized.allSubtasksExpanded !== void 0) {
      appState2.allSubtasksExpanded = normalized.allSubtasksExpanded;
    }
    if (normalized.settings) {
      const settingsManager = this._getSettingsManager();
      if (settingsManager) {
        settingsManager.saveSettings(normalized.settings);
      }
    }
    this.saveData();
  }
  saveData(skipSync = false) {
    if (this._autosaveTimer) {
      clearTimeout(this._autosaveTimer);
    }
    this._autosaveTimer = setTimeout(() => {
      this._autosaveToServer();
    }, 500);
    this._hasPendingSave = true;
    if (!skipSync) {
      if (this._syncTimer) {
        clearTimeout(this._syncTimer);
      }
      this._syncTimer = setTimeout(() => {
        const syncManager = this._getSyncManager();
        const fileManager = this._getFileManager();
        if (syncManager && syncManager.isConnected && fileManager && fileManager.currentFilename) {
          this._syncDataToWebSocket();
        }
      }, 200);
    }
    const appState2 = this._getAppState();
    const settingsManager = this._getSettingsManager();
    const documents = appState2.documents;
    const localData = {
      documents,
      currentDocumentId: appState2.currentDocumentId,
      lastModified: (/* @__PURE__ */ new Date()).toISOString(),
      groupStates: appState2.groupStates || {},
      subtaskStates: appState2.subtaskStates || {},
      allSubtasksExpanded: appState2.allSubtasksExpanded,
      settings: settingsManager ? settingsManager.loadSettings() : {}
    };
    localStorage.setItem(this.storageKey, JSON.stringify(localData));
  }
  /**
   * Sync data to WebSocket for real-time updates
   */
  _syncDataToWebSocket() {
    const syncManager = this._getSyncManager();
    const fileManager = this._getFileManager();
    if (!syncManager || !syncManager.isConnected) {
      return;
    }
    if (!fileManager || !fileManager.currentFilename) {
      return;
    }
    this._lastSyncTimestamp = Date.now();
    const appState2 = this._getAppState();
    const settingsManager = this._getSettingsManager();
    const documents = appState2.documents;
    const syncPayload = {
      documents,
      currentDocumentId: appState2.currentDocumentId,
      groupStates: appState2.groupStates || {},
      subtaskStates: appState2.subtaskStates || {},
      allSubtasksExpanded: appState2.allSubtasksExpanded,
      settings: settingsManager ? settingsManager.loadSettings() : {},
      timestamp: this._lastSyncTimestamp
    };
    syncManager.send({
      type: "full_sync",
      filename: fileManager.currentFilename,
      data: syncPayload,
      timestamp: this._lastSyncTimestamp
    });
  }
  /**
   * Autosave to server if a file is currently open
   * This is called automatically after saveData() with debouncing
   */
  async _autosaveToServer() {
    const fileManager = this._getFileManager();
    if (!fileManager || !fileManager.currentFilename) {
      console.log("[DataManager] Autosave skipped - no currentFilename:", {
        hasFileManager: !!fileManager,
        currentFilename: fileManager?.currentFilename
      });
      return;
    }
    const currentFilename = fileManager.currentFilename;
    console.log("[DataManager] Autosaving to:", currentFilename);
    try {
      const appState2 = this._getAppState();
      const autosaveData = {
        documents: appState2.documents
      };
      await fileManager.saveFile(currentFilename, autosaveData, true);
      console.log("[DataManager] Autosave successful:", currentFilename);
      this._hasPendingSave = false;
    } catch (error) {
      console.warn("[DataManager] Autosave failed:", error);
      this._hasPendingSave = false;
    }
  }
  /**
   * Flush any pending autosave before page unload
   * This ensures changes are saved even if user refreshes quickly
   */
  async flushPendingSave() {
    if (this._autosaveTimer) {
      clearTimeout(this._autosaveTimer);
      this._autosaveTimer = null;
      await this._autosaveToServer();
    } else if (this._hasPendingSave) {
      await this._autosaveToServer();
    }
  }
  async loadDefaultFile() {
    try {
      const response = await fetch("default.json?" + Date.now(), {
        cache: "no-store"
      });
      const defaultData = await response.json();
      const normalizedDefault = this._normalizeDataModel(defaultData);
      if (!normalizedDefault.documents || !Array.isArray(normalizedDefault.documents)) {
        alert('Invalid default.json format. Expected a JSON file with a "documents" array.');
        return;
      }
      if (confirm(`Load ${normalizedDefault.documents.length} document(s) from default.json? This will replace your current data.`)) {
        const appState2 = this._getAppState();
        appState2.documents = normalizedDefault.documents;
        if (normalizedDefault.documentStates) {
          appState2.documentStates = normalizedDefault.documentStates;
        }
        if (normalizedDefault.groupStates) {
          appState2.groupStates = normalizedDefault.groupStates;
        }
        if (normalizedDefault.subtaskStates) {
          Object.keys(normalizedDefault.subtaskStates).forEach((key) => {
            if (appState2.setSubtaskState) {
              appState2.setSubtaskState(key, normalizedDefault.subtaskStates[key]);
            }
          });
        }
        if (normalizedDefault.allSubtasksExpanded !== void 0) {
          appState2.allSubtasksExpanded = normalizedDefault.allSubtasksExpanded;
        } else {
          appState2.allSubtasksExpanded = false;
        }
        if (normalizedDefault.settings) {
          const settingsManager = this._getSettingsManager();
          if (settingsManager) {
            settingsManager.saveSettings(normalizedDefault.settings);
          }
        }
        this.saveData();
        eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
        alert("default.json loaded successfully!");
      }
    } catch (error) {
      console.error("Failed to load default.json:", error);
      alert("Failed to load default.json. Make sure it exists in the twodo directory.");
    }
  }
  saveToFile() {
    const appState2 = this._getAppState();
    const settingsManager = this._getSettingsManager();
    const exportData = {
      documents: appState2.documents,
      lastModified: (/* @__PURE__ */ new Date()).toISOString(),
      version: "1.0",
      documentStates: {},
      // Legacy - documentStates now in AppState
      subtaskStates: appState2.subtaskStates || {},
      allSubtasksExpanded: appState2.allSubtasksExpanded,
      settings: settingsManager ? settingsManager.loadSettings() : {}
    };
    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const dateStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    a.download = `twodo-backup-${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
  async saveAsDefault() {
    if (!confirm("This will overwrite the default.json file on the server with your current data. Continue?")) {
      return;
    }
    const appState2 = this._getAppState();
    const settingsManager = this._getSettingsManager();
    const defaultPayload = {
      documents: appState2.documents,
      lastModified: (/* @__PURE__ */ new Date()).toISOString(),
      version: "1.0",
      documentStates: {},
      // Legacy - documentStates now in AppState
      subtaskStates: appState2.subtaskStates || {},
      allSubtasksExpanded: appState2.allSubtasksExpanded,
      settings: settingsManager ? settingsManager.loadSettings() : {}
    };
    try {
      const url = window.location.origin + "/save-default.json";
      console.log("Saving to:", url);
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(defaultPayload)
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      if (result.success) {
        alert("default.json saved successfully!");
      } else {
        alert("Failed to save default.json: " + (result.error || "Unknown error"));
      }
    } catch (error) {
      console.error("Failed to save default.json:", error);
      alert("Failed to save default.json: " + error.message + ". Make sure the server is running and supports POST requests.");
    }
  }
  loadFromFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target.result);
        const normalizedImport = this._normalizeDataModel(importedData);
        if (!normalizedImport.documents || !Array.isArray(normalizedImport.documents)) {
          alert('Invalid file format. Expected a JSON file with a "documents" array.');
          return;
        }
        if (confirm(`Load ${normalizedImport.documents.length} document(s) from file? This will replace your current data.`)) {
          const appState2 = this._getAppState();
          appState2.documents = normalizedImport.documents;
          if (normalizedImport.documentStates) {
            appState2.documentStates = normalizedImport.documentStates;
          }
          if (normalizedImport.groupStates) {
            appState2.groupStates = normalizedImport.groupStates;
          }
          if (normalizedImport.subtaskStates) {
            Object.keys(normalizedImport.subtaskStates).forEach((key) => {
              if (appState2.setSubtaskState) {
                appState2.setSubtaskState(key, normalizedImport.subtaskStates[key]);
              }
            });
          }
          if (normalizedImport.allSubtasksExpanded !== void 0) {
            appState2.allSubtasksExpanded = normalizedImport.allSubtasksExpanded;
          } else {
            appState2.allSubtasksExpanded = false;
          }
          if (normalizedImport.settings) {
            const settingsManager = this._getSettingsManager();
            if (settingsManager) {
              settingsManager.saveSettings(normalizedImport.settings);
            }
          }
          this.saveData();
          eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
          alert("File loaded successfully!");
        }
      } catch (error) {
        console.error("Failed to load file:", error);
        alert("Failed to load file. Make sure it is a valid JSON file.");
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  }
  archiveAudioRecording(pageId, elementIndex, audioFile, date) {
    const archiveKey = "twodo-audio-archive";
    let archive = [];
    const stored = localStorage.getItem(archiveKey);
    if (stored) {
      try {
        archive = JSON.parse(stored);
      } catch (e) {
        console.error("Failed to parse archive:", e);
      }
    }
    archive.push({
      pageId,
      elementIndex,
      filename: audioFile,
      date,
      archivedDate: (/* @__PURE__ */ new Date()).toISOString().split("T")[0]
    });
    localStorage.setItem(archiveKey, JSON.stringify(archive));
  }
  getArchivedRecordings(pageId, elementIndex) {
    const archiveKey = "twodo-audio-archive";
    const stored = localStorage.getItem(archiveKey);
    if (!stored) return [];
    try {
      const archive = JSON.parse(stored);
      return archive.filter((entry) => entry.pageId === pageId && entry.elementIndex === elementIndex);
    } catch (e) {
      console.error("Failed to parse archive:", e);
      return [];
    }
  }
  playArchivedAudio(filename) {
    const audio = document.createElement("audio");
    audio.src = `/saved_files/recordings/${filename}`;
    audio.controls = true;
    audio.style.cssText = "position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 10000; background: #2d2d2d; padding: 20px; border-radius: 8px;";
    document.body.appendChild(audio);
    audio.play();
    audio.onended = () => {
      audio.remove();
    };
  }
}
class ThemePresets {
  constructor() {
    this.presets = this.initializePresets();
  }
  initializePresets() {
    return {
      "default": {
        name: "Default",
        description: "The original dark theme with comfortable spacing and rounded corners",
        theme: {
          background: "#1a1a1a",
          page: {
            background: "#2d2d2d",
            margin: "0px",
            padding: "20px",
            borderRadius: "8px",
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif",
            fontSize: "14px",
            opacity: "1",
            color: "#e0e0e0",
            title: {
              fontSize: "18px",
              color: "#ffffff",
              marginBottom: "15px"
            }
          },
          element: {
            background: "transparent",
            margin: "0px",
            padding: "10px",
            paddingVertical: "10px",
            paddingHorizontal: "10px",
            gap: "8px",
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif",
            fontSize: "14px",
            opacity: "1",
            color: "#e0e0e0",
            hoverBackground: "#363636"
          },
          header: {
            fontSize: "16px",
            color: "#b8b8b8",
            margin: "10px 0"
          },
          checkbox: {
            size: "18px"
          }
        }
      },
      "minimal": {
        name: "Minimal",
        description: "Ultra-clean design with sharp edges, tight spacing, and monochrome palette",
        theme: {
          background: "#0a0a0a",
          page: {
            background: "#121212",
            margin: "0px",
            padding: "8px",
            borderRadius: "0px",
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            fontSize: "12px",
            opacity: "1",
            color: "#c8c8c8",
            title: {
              fontSize: "14px",
              color: "#ffffff",
              marginBottom: "6px"
            }
          },
          element: {
            background: "transparent",
            margin: "0px",
            padding: "4px",
            paddingVertical: "4px",
            paddingHorizontal: "6px",
            gap: "2px",
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            fontSize: "12px",
            opacity: "1",
            color: "#c8c8c8",
            hoverBackground: "#1e1e1e"
          },
          header: {
            fontSize: "13px",
            color: "#909090",
            margin: "4px 0"
          },
          checkbox: {
            size: "14px"
          }
        }
      },
      "spacious": {
        name: "Spacious",
        description: "Generous spacing, large fonts, and soft rounded corners for comfortable reading",
        theme: {
          background: "#1e1e1e",
          page: {
            background: "#2a2a2a",
            margin: "0px",
            padding: "40px",
            borderRadius: "16px",
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif",
            fontSize: "17px",
            opacity: "1",
            color: "#e8e8e8",
            title: {
              fontSize: "26px",
              color: "#ffffff",
              marginBottom: "24px"
            }
          },
          element: {
            background: "transparent",
            margin: "0px",
            padding: "18px",
            paddingVertical: "18px",
            paddingHorizontal: "24px",
            gap: "14px",
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif",
            fontSize: "17px",
            opacity: "1",
            color: "#e8e8e8",
            hoverBackground: "#3a3a3a"
          },
          header: {
            fontSize: "22px",
            color: "#c0c0c0",
            margin: "20px 0"
          },
          checkbox: {
            size: "22px"
          }
        }
      },
      "compact": {
        name: "Compact",
        description: "Ultra-dense layout with sharp edges for maximum information density",
        theme: {
          background: "#0d0d0d",
          page: {
            background: "#181818",
            margin: "0px",
            padding: "4px",
            borderRadius: "0px",
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            fontSize: "11px",
            opacity: "1",
            color: "#d0d0d0",
            title: {
              fontSize: "13px",
              color: "#ffffff",
              marginBottom: "4px"
            }
          },
          element: {
            background: "transparent",
            margin: "0px",
            padding: "2px",
            paddingVertical: "2px",
            paddingHorizontal: "4px",
            gap: "1px",
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            fontSize: "11px",
            opacity: "1",
            color: "#d0d0d0",
            hoverBackground: "#252525"
          },
          header: {
            fontSize: "12px",
            color: "#a0a0a0",
            margin: "2px 0"
          },
          checkbox: {
            size: "12px"
          }
        }
      },
      "warm": {
        name: "Warm",
        description: "Cozy amber and brown tones with generous rounded corners",
        theme: {
          background: "#2a1f18",
          page: {
            background: "#3d2e24",
            margin: "0px",
            padding: "24px",
            borderRadius: "14px",
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif",
            fontSize: "15px",
            opacity: "1",
            color: "#f0e6d8",
            title: {
              fontSize: "20px",
              color: "#ffedd5",
              marginBottom: "18px"
            }
          },
          element: {
            background: "rgba(255, 235, 205, 0.05)",
            margin: "0px",
            padding: "12px",
            paddingVertical: "12px",
            paddingHorizontal: "14px",
            gap: "10px",
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif",
            fontSize: "15px",
            opacity: "1",
            color: "#f0e6d8",
            hoverBackground: "#4a3a2e"
          },
          header: {
            fontSize: "17px",
            color: "#d4b896",
            margin: "12px 0"
          },
          checkbox: {
            size: "19px"
          }
        }
      },
      "cool": {
        name: "Cool",
        description: "Crisp blue-gray palette with sharp, modern edges",
        theme: {
          background: "#0f1419",
          page: {
            background: "#1a2332",
            margin: "0px",
            padding: "18px",
            borderRadius: "6px",
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif",
            fontSize: "14px",
            opacity: "1",
            color: "#c8d4e0",
            title: {
              fontSize: "19px",
              color: "#e0ecf8",
              marginBottom: "14px"
            }
          },
          element: {
            background: "rgba(100, 150, 200, 0.08)",
            margin: "0px",
            padding: "9px",
            paddingVertical: "9px",
            paddingHorizontal: "12px",
            gap: "7px",
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif",
            fontSize: "14px",
            opacity: "1",
            color: "#c8d4e0",
            hoverBackground: "#2a3440"
          },
          header: {
            fontSize: "16px",
            color: "#8fa0b0",
            margin: "9px 0"
          },
          checkbox: {
            size: "17px"
          }
        }
      },
      "high-contrast": {
        name: "High Contrast",
        description: "Maximum contrast with bold borders and sharp edges for accessibility",
        theme: {
          background: "#000000",
          page: {
            background: "#0a0a0a",
            margin: "0px",
            padding: "24px",
            borderRadius: "2px",
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif",
            fontSize: "16px",
            opacity: "1",
            color: "#ffffff",
            title: {
              fontSize: "22px",
              color: "#ffffff",
              marginBottom: "18px"
            }
          },
          element: {
            background: "#000000",
            margin: "0px",
            padding: "14px",
            paddingVertical: "14px",
            paddingHorizontal: "16px",
            gap: "10px",
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif",
            fontSize: "16px",
            opacity: "1",
            color: "#ffffff",
            hoverBackground: "#1a1a1a"
          },
          header: {
            fontSize: "20px",
            color: "#ffffff",
            margin: "14px 0"
          },
          checkbox: {
            size: "22px"
          }
        }
      },
      "paper": {
        name: "Paper",
        description: "Light paper aesthetic with serif fonts, textures, and soft shadows",
        theme: {
          background: "#f5f3f0",
          backgroundTexture: "repeating-linear-gradient(0deg, rgba(0,0,0,0.02) 0px, transparent 1px, transparent 2px, rgba(0,0,0,0.02) 3px), repeating-linear-gradient(90deg, rgba(0,0,0,0.02) 0px, transparent 1px, transparent 2px, rgba(0,0,0,0.02) 3px)",
          page: {
            background: "#ffffff",
            margin: "0px",
            padding: "32px",
            borderRadius: "2px",
            fontFamily: 'Georgia, "Times New Roman", "Palatino", serif',
            fontSize: "16px",
            opacity: "1",
            color: "#1a1a1a",
            texture: "repeating-linear-gradient(45deg, rgba(0,0,0,0.03) 0px, transparent 1px, transparent 2px, rgba(0,0,0,0.03) 3px)",
            shadow: "0 2px 8px rgba(0,0,0,0.1), 0 4px 16px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.9)",
            title: {
              fontSize: "24px",
              color: "#000000",
              marginBottom: "20px"
            }
          },
          element: {
            background: "#fafafa",
            margin: "0px",
            padding: "14px",
            paddingVertical: "14px",
            paddingHorizontal: "18px",
            gap: "10px",
            fontFamily: 'Georgia, "Times New Roman", "Palatino", serif',
            fontSize: "16px",
            opacity: "1",
            color: "#1a1a1a",
            hoverBackground: "#f0f0f0",
            texture: "repeating-linear-gradient(0deg, rgba(0,0,0,0.015) 0px, transparent 1px, transparent 2px, rgba(0,0,0,0.015) 3px)",
            shadow: "0 1px 3px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.5)"
          },
          header: {
            fontSize: "19px",
            color: "#3a3a3a",
            margin: "14px 0"
          },
          checkbox: {
            size: "19px"
          }
        }
      },
      "terminal": {
        name: "Terminal",
        description: "Console aesthetic with monospace font, sharp edges, and code colors",
        theme: {
          background: "#0a0e14",
          page: {
            background: "#0d1117",
            margin: "0px",
            padding: "12px",
            borderRadius: "0px",
            fontFamily: '"Courier New", "Consolas", "Monaco", "Fira Code", monospace',
            fontSize: "13px",
            opacity: "1",
            color: "#a8b5c0",
            title: {
              fontSize: "15px",
              color: "#58a6ff",
              marginBottom: "10px"
            }
          },
          element: {
            background: "transparent",
            margin: "0px",
            padding: "4px",
            paddingVertical: "4px",
            paddingHorizontal: "6px",
            gap: "2px",
            fontFamily: '"Courier New", "Consolas", "Monaco", "Fira Code", monospace',
            fontSize: "13px",
            opacity: "1",
            color: "#a8b5c0",
            hoverBackground: "#161b22"
          },
          header: {
            fontSize: "14px",
            color: "#7c3aed",
            margin: "6px 0"
          },
          checkbox: {
            size: "14px"
          }
        }
      },
      "zen": {
        name: "Zen",
        description: "Calming light theme with soft colors, generous spacing, and rounded corners",
        theme: {
          background: "#f8f6f4",
          page: {
            background: "#ffffff",
            margin: "0px",
            padding: "36px",
            borderRadius: "20px",
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            fontSize: "16px",
            opacity: "1",
            color: "#2d2d2d",
            title: {
              fontSize: "22px",
              color: "#1a1a1a",
              marginBottom: "24px"
            }
          },
          element: {
            background: "rgba(0, 0, 0, 0.02)",
            margin: "0px",
            padding: "16px",
            paddingVertical: "16px",
            paddingHorizontal: "20px",
            gap: "12px",
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            fontSize: "16px",
            opacity: "1",
            color: "#2d2d2d",
            hoverBackground: "rgba(0, 0, 0, 0.04)"
          },
          header: {
            fontSize: "18px",
            color: "#4a4a4a",
            margin: "16px 0"
          },
          checkbox: {
            size: "20px"
          }
        }
      }
    };
  }
  /**
   * Get all preset themes
   */
  getAllPresets() {
    return Object.keys(this.presets).map((key) => ({
      id: key,
      name: this.presets[key].name,
      description: this.presets[key].description
    }));
  }
  /**
   * Get a preset theme by ID
   */
  getPreset(presetId) {
    return this.presets[presetId] ? { ...this.presets[presetId] } : null;
  }
  /**
   * Apply a preset theme globally
   */
  applyPreset(themeManager, presetId) {
    const preset = this.getPreset(presetId);
    if (preset) {
      themeManager.setGlobalTheme(preset.theme);
      return true;
    }
    return false;
  }
}
const StringUtils = {
  /**
   * Escape HTML special characters
   * @param {string} text - Text to escape
   * @returns {string}
   */
  escapeHtml(text) {
    if (typeof text !== "string") return text;
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  },
  /**
   * Unescape HTML entities
   * @param {string} html - HTML to unescape
   * @returns {string}
   */
  unescapeHtml(html) {
    if (typeof html !== "string") return html;
    const div = document.createElement("div");
    div.innerHTML = html;
    return div.textContent || div.innerText || "";
  },
  /**
   * Capitalize first letter
   * @param {string} str - String to capitalize
   * @returns {string}
   */
  capitalize(str) {
    if (!str) return str;
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  },
  /**
   * Convert to camelCase
   * @param {string} str - String to convert
   * @returns {string}
   */
  camelCase(str) {
    return str.replace(/-([a-z])/g, (g) => g[1].toUpperCase()).replace(/^[A-Z]/, (g) => g.toLowerCase());
  },
  /**
   * Convert to kebab-case
   * @param {string} str - String to convert
   * @returns {string}
   */
  kebabCase(str) {
    return str.replace(/([a-z])([A-Z])/g, "$1-$2").replace(/[\s_]+/g, "-").toLowerCase();
  },
  /**
   * Convert to snake_case
   * @param {string} str - String to convert
   * @returns {string}
   */
  snakeCase(str) {
    return str.replace(/([a-z])([A-Z])/g, "$1_$2").replace(/[\s-]+/g, "_").toLowerCase();
  },
  /**
   * Truncate string with ellipsis
   * @param {string} str - String to truncate
   * @param {number} length - Maximum length
   * @param {string} suffix - Suffix (default: '...')
   * @returns {string}
   */
  truncate(str, length, suffix = "...") {
    if (!str || str.length <= length) return str;
    return str.slice(0, length) + suffix;
  },
  /**
   * Strip HTML tags
   * @param {string} html - HTML string
   * @returns {string}
   */
  stripHtml(html) {
    if (typeof html !== "string") return html;
    const div = document.createElement("div");
    div.innerHTML = html;
    return div.textContent || div.innerText || "";
  },
  /**
   * Detect and extract URLs from text
   * @param {string} text - Text to search
   * @returns {Array<Object>} - Array of { url, index, length }
   */
  detectUrls(text) {
    if (typeof text !== "string") return [];
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = [];
    let match;
    while ((match = urlRegex.exec(text)) !== null) {
      urls.push({
        url: match[0],
        index: match.index,
        length: match[0].length
      });
    }
    return urls;
  },
  /**
   * Convert URLs in text to links
   * @param {string} text - Text to convert
   * @returns {string} - HTML with links
   */
  linkify(text) {
    if (typeof text !== "string") return text;
    const urls = this.detectUrls(text);
    if (urls.length === 0) return this.escapeHtml(text);
    let result = "";
    let lastIndex = 0;
    urls.forEach(({ url, index, length }) => {
      result += this.escapeHtml(text.slice(lastIndex, index));
      result += `<a href="${this.escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${this.escapeHtml(url)}</a>`;
      lastIndex = index + length;
    });
    result += this.escapeHtml(text.slice(lastIndex));
    return result;
  },
  /**
   * Parse text and make URLs clickable (returns DocumentFragment)
   * @param {string} text - Text to parse
   * @returns {DocumentFragment} Fragment containing text nodes and link elements
   */
  parseLinks(text) {
    if (!text || typeof text !== "string") return document.createDocumentFragment();
    try {
      let processedText = text;
      const hasMarkdown = /\*\*|\*[^*]|\`|\[.*\]\(.*\)/.test(text);
      if (hasMarkdown && !/<[a-z][a-z0-9]*[^>]*>/i.test(text)) {
        processedText = processedText.replace(/`([^`]+)`/g, "<code>$1</code>");
        processedText = processedText.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
        processedText = processedText.replace(/(?<!\*)\*([^*]+?)\*(?!\*)/g, "<em>$1</em>");
        processedText = processedText.replace(/~~([^~]+)~~/g, "<del>$1</del>");
        processedText = processedText.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
      }
      const hasHtml = /<[a-z][a-z0-9]*[^>]*>/i.test(processedText);
      if (hasHtml) {
        const tempDiv = document.createElement("div");
        const allowedTags = /<\/?(strong|em|code|a|b|i|u|span|div|p|br|del|s)[^>]*>/gi;
        if (allowedTags.test(processedText) || processedText.match(/<[a-z][a-z0-9]*[^>]*>/i)) {
          tempDiv.innerHTML = processedText;
        } else {
          tempDiv.textContent = processedText;
        }
        const fragment = document.createDocumentFragment();
        while (tempDiv.firstChild) {
          fragment.appendChild(tempDiv.firstChild);
        }
        fragment.querySelectorAll("a").forEach((link) => {
          link.target = "_blank";
          link.rel = "noopener noreferrer";
          if (!link.style.color) {
            link.style.color = "#4a9eff";
          }
          if (!link.style.textDecoration) {
            link.style.textDecoration = "underline";
          }
          link.onclick = (e) => e.stopPropagation();
        });
        return fragment;
      } else {
        const urlPattern = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9-]+\.[a-zA-Z]{2,}[^\s]*)/g;
        const parts = processedText.split(urlPattern);
        const fragment = document.createDocumentFragment();
        parts.forEach((part) => {
          if (urlPattern.test(part)) {
            let href = part;
            if (!href.startsWith("http://") && !href.startsWith("https://")) {
              href = "https://" + href;
            }
            const link = document.createElement("a");
            link.href = href;
            link.textContent = part;
            link.target = "_blank";
            link.rel = "noopener noreferrer";
            link.style.color = "#4a9eff";
            link.style.textDecoration = "underline";
            link.onclick = (e) => e.stopPropagation();
            fragment.appendChild(link);
          } else if (part) {
            const textNode = document.createTextNode(part);
            fragment.appendChild(textNode);
          }
        });
        return fragment;
      }
    } catch (error) {
      console.error("Error parsing links:", error);
      const fragment = document.createDocumentFragment();
      fragment.appendChild(document.createTextNode(text));
      return fragment;
    }
  },
  /**
   * Parse markdown-like syntax (basic)
   * @param {string} text - Text to parse
   * @returns {string} - HTML
   */
  parseMarkdown(text) {
    if (typeof text !== "string") return text;
    text = text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    text = text.replace(/__(.+?)__/g, "<strong>$1</strong>");
    text = text.replace(/\*(.+?)\*/g, "<em>$1</em>");
    text = text.replace(/_(.+?)_/g, "<em>$1</em>");
    text = text.replace(/`(.+?)`/g, "<code>$1</code>");
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
    return text;
  },
  /**
   * Generate unique ID
   * @param {string} prefix - ID prefix
   * @returns {string}
   */
  generateId(prefix = "id") {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  },
  /**
   * Slugify string (for URLs, IDs, etc.)
   * @param {string} str - String to slugify
   * @returns {string}
   */
  slugify(str) {
    if (typeof str !== "string") return "";
    return str.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-").replace(/^-+|-+$/g, "");
  },
  /**
   * Pad string to specified length
   * @param {string} str - String to pad
   * @param {number} length - Target length
   * @param {string} padString - Padding string
   * @param {string} side - 'left' or 'right'
   * @returns {string}
   */
  pad(str, length, padString = " ", side = "right") {
    if (typeof str !== "string") str = String(str);
    const pad = padString.repeat(Math.max(0, length - str.length));
    return side === "left" ? pad + str : str + pad;
  },
  /**
   * Remove whitespace from string
   * @param {string} str - String to trim
   * @returns {string}
   */
  trim(str) {
    return typeof str === "string" ? str.trim() : str;
  },
  /**
   * Replace all occurrences
   * @param {string} str - String to replace in
   * @param {string|RegExp} search - Search string or regex
   * @param {string} replace - Replacement string
   * @returns {string}
   */
  replaceAll(str, search, replace) {
    if (typeof str !== "string") return str;
    if (search instanceof RegExp) {
      return str.replace(search, replace);
    }
    return str.split(search).join(replace);
  }
};
class SettingsManager {
  constructor() {
    this.storageKey = "twodo-settings";
    this.themePresets = new ThemePresets();
  }
  /**
   * Get services
   */
  _getFileManager() {
    return getService(SERVICES.FILE_MANAGER);
  }
  _getUndoRedoManager() {
    return getService(SERVICES.UNDO_REDO_MANAGER);
  }
  /**
   * Get ThemeManager service
   */
  _getThemeManager() {
    return getService(SERVICES.THEME_MANAGER);
  }
  /**
   * Get AppState service
   */
  _getAppState() {
    return getService(SERVICES.APP_STATE);
  }
  // Check if themes are available at runtime
  get useThemes() {
    return !!this._getThemeManager();
  }
  loadSettings() {
    const themeManager = this._getThemeManager();
    if (this.useThemes && themeManager) {
      return themeManager.themes.global;
    }
    const stored = localStorage.getItem(this.storageKey);
    if (stored) {
      try {
        const settings = JSON.parse(stored);
        const defaults = this.getDefaultSettings();
        return this.mergeSettings(settings, defaults);
      } catch (e) {
        console.error("Failed to parse settings:", e);
      }
    }
    return this.getDefaultSettings();
  }
  mergeSettings(settings, defaults) {
    const merged = { ...defaults };
    for (const key in settings) {
      if (settings[key] && typeof settings[key] === "object" && !Array.isArray(settings[key])) {
        merged[key] = this.mergeSettings(settings[key], defaults[key] || {});
      } else {
        merged[key] = settings[key];
      }
    }
    return merged;
  }
  getDefaultSettings() {
    return {
      background: "#1a1a1a",
      page: {
        background: "#2d2d2d",
        margin: "0px",
        padding: "20px",
        borderRadius: "8px",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif",
        fontSize: "14px",
        opacity: "1",
        color: "#e0e0e0",
        title: {
          fontSize: "18px",
          color: "#ffffff",
          marginBottom: "15px"
        }
      },
      element: {
        background: "transparent",
        margin: "0px",
        padding: "10px",
        paddingVertical: "10px",
        paddingHorizontal: "10px",
        gap: "8px",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif",
        fontSize: "14px",
        opacity: "1",
        color: "#e0e0e0",
        hoverBackground: "#363636"
      },
      header: {
        fontSize: "16px",
        color: "#b8b8b8",
        margin: "10px 0"
      },
      checkbox: {
        size: "18px"
      }
    };
  }
  getOriginalDefaultSettings() {
    return {
      background: "#1a1a1a",
      page: {
        background: "#2d2d2d",
        margin: "0px",
        padding: "20px",
        borderRadius: "8px",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif",
        fontSize: "14px",
        opacity: "1",
        color: "#e0e0e0",
        title: {
          fontSize: "18px",
          color: "#ffffff",
          marginBottom: "15px"
        }
      },
      element: {
        background: "transparent",
        margin: "0px",
        padding: "10px",
        paddingVertical: "10px",
        paddingHorizontal: "10px",
        gap: "8px",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif",
        fontSize: "14px",
        opacity: "1",
        color: "#e0e0e0",
        hoverBackground: "#363636"
      },
      header: {
        fontSize: "16px",
        color: "#b8b8b8",
        margin: "10px 0"
      },
      checkbox: {
        size: "18px"
      }
    };
  }
  saveSettings(settings, themeType = "global", viewFormat = null, pageId = null) {
    const themeManager = this._getThemeManager();
    if (this.useThemes && themeManager) {
      if (themeType === "global") {
        themeManager.setGlobalTheme(settings);
      } else if (themeType === "view" && viewFormat) {
        themeManager.setViewTheme(viewFormat, settings);
      } else if (themeType === "page" && pageId) {
        themeManager.setPageTheme(pageId, settings);
      }
    } else {
      localStorage.setItem(this.storageKey, JSON.stringify(settings));
      this.applySettings(settings);
      eventBus.emit("theme:updated", { type: themeType, settings });
    }
    const appState2 = this._getAppState();
    if (appState2?.documents && appState2.documents.length > 0) {
      eventBus.emit(EVENTS.DATA.SAVE_REQUESTED);
    }
  }
  applySettings(settings) {
    const root = document.documentElement;
    root.style.setProperty("--bg-color", settings.background);
    root.style.setProperty("--page-bg", settings.page.background);
    root.style.setProperty("--page-margin", settings.page.margin);
    root.style.setProperty("--page-padding", settings.page.padding);
    root.style.setProperty("--page-border-radius", settings.page.borderRadius);
    root.style.setProperty("--page-font-family", settings.page.fontFamily);
    root.style.setProperty("--page-font-size", settings.page.fontSize);
    root.style.setProperty("--page-opacity", settings.page.opacity);
    root.style.setProperty("--page-color", settings.page.color);
    root.style.setProperty("--page-title-font-size", settings.page.title.fontSize);
    root.style.setProperty("--page-title-color", settings.page.title.color);
    root.style.setProperty("--page-title-margin-bottom", settings.page.title.marginBottom);
    root.style.setProperty("--element-bg", settings.element.background);
    root.style.setProperty("--element-margin", settings.element.margin);
    root.style.setProperty("--element-padding", settings.element.padding);
    root.style.setProperty("--element-padding-vertical", settings.element.paddingVertical || settings.element.padding);
    root.style.setProperty("--element-padding-horizontal", settings.element.paddingHorizontal || settings.element.padding);
    root.style.setProperty("--element-gap", settings.element.gap || "8px");
    root.style.setProperty("--element-font-family", settings.element.fontFamily);
    root.style.setProperty("--element-font-size", settings.element.fontSize);
    root.style.setProperty("--element-opacity", settings.element.opacity);
    root.style.setProperty("--element-color", settings.element.color);
    root.style.setProperty("--element-hover-bg", settings.element.hoverBackground);
    root.style.setProperty("--header-font-size", settings.header.fontSize);
    root.style.setProperty("--header-color", settings.header.color);
    root.style.setProperty("--header-margin", settings.header.margin);
    root.style.setProperty("--checkbox-size", settings.checkbox && settings.checkbox.size || "18px");
  }
  showSettingsModal() {
    const modal = document.getElementById("settings-modal");
    const settingsBody = document.getElementById("settings-body");
    const settings = this.loadSettings();
    let qrCodeHtml = "";
    const fileManager = this._getFileManager();
    const currentFilename = fileManager?.currentFilename;
    if (currentFilename) {
      const currentUrl = window.location.origin + window.location.pathname;
      const fileUrl = `${currentUrl}?file=${encodeURIComponent(currentFilename)}`;
      qrCodeHtml = `
                <div style="margin-bottom: 20px; padding: 15px; background: #2d2d2d; border-radius: 8px; text-align: center;">
                    <div style="margin-bottom: 10px; color: #ffffff; font-weight: 600;">Open on Mobile Device</div>
                    <div id="qrcode-container" style="display: inline-block; padding: 10px; background: white; border-radius: 4px; min-height: 200px; min-width: 200px;"></div>
                    <div style="margin-top: 10px; color: #888; font-size: 12px;">Scan to open: ${currentFilename}</div>
                    <div style="margin-top: 5px; color: #666; font-size: 11px; word-break: break-all;">${fileUrl}</div>
                </div>
            `;
    } else {
      qrCodeHtml = `
                <div style="margin-bottom: 20px; padding: 15px; background: #2d2d2d; border-radius: 8px; text-align: center;">
                    <div style="color: #888; font-size: 14px;">No file currently open. Open a file to generate a QR code.</div>
                </div>
            `;
    }
    let html = '<h3 style="margin-bottom: 20px; color: #ffffff;">Settings</h3>';
    html += qrCodeHtml;
    const themeManager = this._getThemeManager();
    if (this.useThemes && themeManager) {
      html += '<div class="settings-section">';
      html += '<div class="settings-section-title" data-collapse-target="settings-content-theme">';
      html += '<span class="settings-toggle-arrow">▶</span>';
      html += "<span>Theme Management</span>";
      html += "</div>";
      html += '<div class="settings-section-content" id="settings-content-theme" style="display: none;">';
      html += '<div class="settings-subsection">';
      html += '<div class="settings-control">';
      html += "<label>Theme Scope:</label>";
      html += '<select id="theme-scope-select" style="width: 100%; padding: 6px; background: #2a2a2a; color: #e0e0e0; border: 1px solid #404040; border-radius: 4px;">';
      html += '<option value="global">Global (All Views)</option>';
      html += '<option value="view">View-Specific</option>';
      html += '<option value="page">Page-Specific</option>';
      html += "</select>";
      html += "</div>";
      html += '<div class="settings-control" id="theme-view-selector" style="display: none;">';
      html += "<label>View Format:</label>";
      html += '<select id="theme-view-format" style="width: 100%; padding: 6px; background: #2a2a2a; color: #e0e0e0; border: 1px solid #404040; border-radius: 4px;">';
      const viewFormats = themeManager.getViewFormats();
      viewFormats.forEach((format) => {
        const formatName = format === "default" ? "Default" : format.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
        html += `<option value="${format}">${formatName}</option>`;
      });
      html += "</select>";
      html += "</div>";
      html += '<div class="settings-control" id="theme-page-selector" style="display: none;">';
      html += "<label>Document:</label>";
      html += '<select id="theme-page-id" style="width: 100%; padding: 6px; background: #2a2a2a; color: #e0e0e0; border: 1px solid #404040; border-radius: 4px;">';
      const appState2 = this._getAppState();
      const documents = appState2?.documents || [];
      documents.forEach((page) => {
        html += `<option value="${page.id}">${page.title || page.id}</option>`;
      });
      html += "</select>";
      html += "</div>";
      html += '<div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #404040; margin-bottom: 20px;">';
      html += '<div style="font-weight: 600; color: #ffffff; margin-bottom: 10px; font-size: 14px;">Theme Presets</div>';
      html += '<div style="color: #888; font-size: 12px; margin-bottom: 15px;">Quick-apply pre-designed themes across all views and elements</div>';
      html += '<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px; margin-bottom: 15px;">';
      const presets = this.themePresets.getAllPresets();
      presets.forEach((preset) => {
        html += `<div style="padding: 12px; background: #1a1a1a; border-radius: 6px; border: 1px solid #404040; cursor: pointer; transition: all 0.2s;" class="theme-preset-item" data-preset-id="${preset.id}">`;
        html += `<div style="font-weight: 600; color: #ffffff; margin-bottom: 4px; font-size: 13px;">${StringUtils.escapeHtml(preset.name)}</div>`;
        html += `<div style="color: #888; font-size: 11px;">${StringUtils.escapeHtml(preset.description)}</div>`;
        html += `</div>`;
      });
      html += "</div>";
      html += '<button id="theme-preset-apply-btn" style="padding: 8px 16px; background: #4a9eff; color: white; border: none; border-radius: 4px; cursor: pointer; margin-bottom: 15px; display: none;">Apply Selected Preset</button>';
      html += "</div>";
      html += '<div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #404040;">';
      html += '<div style="color: #888; font-size: 12px; margin-bottom: 10px;">';
      html += "Theme inheritance: Page-specific > View-specific > Global";
      html += "</div>";
      html += '<div style="display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 10px;">';
      html += '<button id="theme-load-btn" style="padding: 8px 16px; background: #4a9eff; color: white; border: none; border-radius: 4px; cursor: pointer;">Load Theme</button>';
      html += '<button id="theme-export-btn" style="padding: 8px 16px; background: #58a858; color: white; border: none; border-radius: 4px; cursor: pointer;">Export Theme</button>';
      html += '<button id="theme-import-btn" style="padding: 8px 16px; background: #58a858; color: white; border: none; border-radius: 4px; cursor: pointer;">Import Theme</button>';
      html += '<input type="file" id="theme-import-file" accept=".json" style="display: none;">';
      html += '<button id="theme-export-all-btn" style="padding: 8px 16px; background: #9e58a8; color: white; border: none; border-radius: 4px; cursor: pointer;">Export All Themes</button>';
      html += '<button id="theme-import-all-btn" style="padding: 8px 16px; background: #9e58a8; color: white; border: none; border-radius: 4px; cursor: pointer;">Import All Themes</button>';
      html += '<input type="file" id="theme-import-all-file" accept=".json" style="display: none;">';
      html += '<button id="theme-save-custom-btn" style="padding: 8px 16px; background: #d4a574; color: white; border: none; border-radius: 4px; cursor: pointer;">Save Custom Theme</button>';
      html += '<button id="theme-load-custom-btn" style="padding: 8px 16px; background: #d4a574; color: white; border: none; border-radius: 4px; cursor: pointer;">Load Custom Theme</button>';
      html += '<input type="file" id="theme-load-custom-file" accept=".json" style="display: none;">';
      html += "</div>";
      html += '<div style="display: flex; gap: 10px;">';
      html += '<button id="theme-reset-view-btn" style="padding: 8px 16px; background: #888; color: white; border: none; border-radius: 4px; cursor: pointer; display: none;">Reset View Theme</button>';
      html += '<button id="theme-reset-page-btn" style="padding: 8px 16px; background: #888; color: white; border: none; border-radius: 4px; cursor: pointer; display: none;">Reset Page Theme</button>';
      html += "</div>";
      html += "</div>";
      html += "</div>";
      html += "</div>";
      html += "</div>";
    }
    html += '<div class="settings-section">';
    html += '<div class="settings-section-title" data-collapse-target="settings-content-0">';
    html += '<span class="settings-toggle-arrow">▶</span>';
    html += "<span>Background</span>";
    html += "</div>";
    html += '<div class="settings-section-content" id="settings-content-0" style="display: none;">';
    html += '<div class="settings-subsection">';
    html += this.createColorControl("background", "Background Color", settings.background);
    html += "</div>";
    html += "</div>";
    html += "</div>";
    html += '<div class="settings-section">';
    html += '<div class="settings-section-title" data-collapse-target="settings-content-1">';
    html += '<span class="settings-toggle-arrow">▶</span>';
    html += "<span>Page Styles</span>";
    html += "</div>";
    html += '<div class="settings-section-content" id="settings-content-1" style="display: none;">';
    html += '<div class="settings-subsection">';
    html += this.createColorControl("page.background", "Background Color", settings.page.background);
    html += this.createSliderControl("page.margin", "Margin", settings.page.margin, 0, 50, 1, "px");
    html += this.createSliderControl("page.padding", "Padding", settings.page.padding, 0, 50, 1, "px");
    html += this.createSliderControl("page.borderRadius", "Border Radius", settings.page.borderRadius, 0, 30, 1, "px");
    html += this.createTextControl("page.fontFamily", "Font Family", settings.page.fontFamily);
    html += this.createSliderControl("page.fontSize", "Font Size", settings.page.fontSize, 8, 32, 1, "px");
    html += this.createOpacityControl("page.opacity", "Opacity", settings.page.opacity);
    html += this.createColorControl("page.color", "Text Color", settings.page.color);
    html += "</div>";
    html += '<div class="settings-subsection">';
    html += '<div class="settings-subsection-title" data-collapse-target="settings-subcontent-1">';
    html += '<span class="settings-toggle-arrow">▶</span>';
    html += "<span>Page Title</span>";
    html += "</div>";
    html += '<div class="settings-subsection-content" id="settings-subcontent-1" style="display: none;">';
    html += this.createSliderControl("page.title.fontSize", "Font Size", settings.page.title.fontSize, 8, 48, 1, "px");
    html += this.createColorControl("page.title.color", "Color", settings.page.title.color);
    html += this.createSliderControl("page.title.marginBottom", "Margin Bottom", settings.page.title.marginBottom, 0, 50, 1, "px");
    html += "</div>";
    html += "</div>";
    html += "</div>";
    html += "</div>";
    html += '<div class="settings-section">';
    html += '<div class="settings-section-title" data-collapse-target="settings-content-2">';
    html += '<span class="settings-toggle-arrow">▶</span>';
    html += "<span>Element Styles</span>";
    html += "</div>";
    html += '<div class="settings-section-content" id="settings-content-2" style="display: none;">';
    html += '<div class="settings-subsection">';
    html += this.createColorControl("element.background", "Background Color", settings.element.background);
    html += this.createSliderControl("element.margin", "Margin", settings.element.margin, 0, 30, 1, "px");
    html += this.createSliderControl("element.padding", "Padding (All)", settings.element.padding, 0, 30, 1, "px");
    html += this.createSliderControl("element.paddingVertical", "Padding (Vertical)", settings.element.paddingVertical || settings.element.padding, 0, 30, 1, "px");
    html += this.createSliderControl("element.paddingHorizontal", "Padding (Horizontal)", settings.element.paddingHorizontal || settings.element.padding, 0, 30, 1, "px");
    html += this.createSliderControl("element.gap", "Element Gap", settings.element.gap || "8px", 0, 30, 1, "px");
    html += this.createTextControl("element.fontFamily", "Font Family", settings.element.fontFamily);
    html += this.createSliderControl("element.fontSize", "Font Size", settings.element.fontSize, 8, 32, 1, "px");
    html += this.createOpacityControl("element.opacity", "Opacity", settings.element.opacity);
    html += this.createColorControl("element.color", "Text Color", settings.element.color);
    html += this.createColorControl("element.hoverBackground", "Hover Background", settings.element.hoverBackground);
    html += "</div>";
    html += "</div>";
    html += "</div>";
    html += '<div class="settings-section">';
    html += '<div class="settings-section-title" data-collapse-target="settings-content-3">';
    html += '<span class="settings-toggle-arrow">▶</span>';
    html += "<span>Header Element Styles</span>";
    html += "</div>";
    html += '<div class="settings-section-content" id="settings-content-3" style="display: none;">';
    html += '<div class="settings-subsection">';
    html += this.createSliderControl("header.fontSize", "Font Size", settings.header.fontSize, 8, 48, 1, "px");
    html += this.createColorControl("header.color", "Color", settings.header.color);
    html += this.createTextControl("header.margin", "Margin", settings.header.margin);
    html += "</div>";
    html += "</div>";
    html += "</div>";
    html += '<div class="settings-section">';
    html += '<div class="settings-section-title" data-collapse-target="settings-content-4">';
    html += '<span class="settings-toggle-arrow">▶</span>';
    html += "<span>Checkbox Styles</span>";
    html += "</div>";
    html += '<div class="settings-section-content" id="settings-content-4" style="display: none;">';
    html += '<div class="settings-subsection">';
    html += this.createSliderControl("checkbox.size", "Size", settings.checkbox.size, 10, 30, 1, "px");
    html += "</div>";
    html += "</div>";
    html += "</div>";
    html += '<div class="settings-section">';
    html += '<div class="settings-section-title" data-collapse-target="settings-content-5">';
    html += '<span class="settings-toggle-arrow">▶</span>';
    html += "<span>Diagnostics</span>";
    html += "</div>";
    html += '<div class="settings-section-content" id="settings-content-5" style="display: none;">';
    html += '<div class="settings-subsection">';
    const undoRedoManager = this._getUndoRedoManager();
    const bufferFilename = undoRedoManager?.currentBufferFilename || "None";
    const undoStackSize = undoRedoManager?.undoStack?.length || 0;
    const redoStackSize = undoRedoManager?.redoStack?.length || 0;
    const snapshotCount = undoRedoManager?.snapshots?.length || 0;
    const lastSnapshot = undoRedoManager?.snapshots?.length > 0 ? undoRedoManager.snapshots[undoRedoManager.snapshots.length - 1] : null;
    html += `<div style="margin-bottom: 15px; padding: 10px; background: #2a2a2a; border-radius: 4px;">`;
    html += `<div style="color: #ffffff; font-weight: 600; margin-bottom: 10px;">Buffer Status</div>`;
    html += `<div style="color: #e0e0e0; margin-bottom: 5px;">Current File: <span style="color: #4a9eff;">${bufferFilename}</span></div>`;
    html += `<div style="color: #e0e0e0; margin-bottom: 5px;">Undo Stack: <span style="color: #4a9eff;">${undoStackSize}</span> changes</div>`;
    html += `<div style="color: #e0e0e0; margin-bottom: 5px;">Redo Stack: <span style="color: #4a9eff;">${redoStackSize}</span> changes</div>`;
    html += `<div style="color: #e0e0e0; margin-bottom: 5px;">Snapshots: <span style="color: #4a9eff;">${snapshotCount}</span></div>`;
    if (lastSnapshot) {
      html += `<div style="color: #e0e0e0; margin-bottom: 5px;">Last Snapshot: Change index <span style="color: #4a9eff;">${lastSnapshot.changeIndex}</span></div>`;
      html += `<div style="color: #888; font-size: 12px;">${new Date(lastSnapshot.timestamp).toLocaleString()}</div>`;
    }
    html += `</div>`;
    const validation = undoRedoManager?.validateState();
    html += `<div style="margin-bottom: 15px; padding: 10px; background: #2a2a2a; border-radius: 4px;">`;
    html += `<div style="color: #ffffff; font-weight: 600; margin-bottom: 10px;">State Validation</div>`;
    if (validation) {
      html += `<div style="color: ${validation.valid ? "#4a9eff" : "#ff5555"}; margin-bottom: 5px;">Status: <span>${validation.valid ? "Valid" : "Invalid"}</span></div>`;
      if (validation.errors && validation.errors.length > 0) {
        html += `<div style="color: #ff5555; margin-top: 10px; font-weight: 600;">Errors (${validation.errors.length}):</div>`;
        validation.errors.forEach((error) => {
          html += `<div style="color: #ff8888; font-size: 12px; margin-left: 10px; margin-top: 3px;">• ${error}</div>`;
        });
      }
      if (validation.warnings && validation.warnings.length > 0) {
        html += `<div style="color: #ffaa00; margin-top: 10px; font-weight: 600;">Warnings (${validation.warnings.length}):</div>`;
        validation.warnings.forEach((warning) => {
          html += `<div style="color: #ffcc88; font-size: 12px; margin-left: 10px; margin-top: 3px;">• ${warning}</div>`;
        });
      }
    } else {
      html += `<div style="color: #888;">Validation not available</div>`;
    }
    html += `</div>`;
    const undoDiagnostics = undoRedoManager?.diagnoseUndoIssue();
    html += `<div style="margin-bottom: 15px; padding: 10px; background: #2a2a2a; border-radius: 4px;">`;
    html += `<div style="color: #ffffff; font-weight: 600; margin-bottom: 10px;">Undo/Redo Diagnostics</div>`;
    if (undoDiagnostics) {
      html += `<div style="color: ${undoDiagnostics.valid ? "#4a9eff" : "#ff5555"}; margin-bottom: 5px;">Status: <span>${undoDiagnostics.valid ? "Valid" : "Issues Found"}</span></div>`;
      if (undoDiagnostics.issues && undoDiagnostics.issues.length > 0) {
        html += `<div style="color: #ff5555; margin-top: 10px; font-weight: 600;">Issues (${undoDiagnostics.issues.length}):</div>`;
        undoDiagnostics.issues.forEach((issue) => {
          html += `<div style="color: #ff8888; font-size: 12px; margin-left: 10px; margin-top: 3px;">• ${issue.type}: ${issue.description}</div>`;
        });
      }
    } else {
      html += `<div style="color: #888;">Diagnostics not available</div>`;
    }
    html += `</div>`;
    html += `<button id="diagnostic-file-integrity" style="padding: 8px 16px; background: #4a9eff; color: white; border: none; border-radius: 4px; cursor: pointer; margin-top: 10px;">Run File Integrity Check</button>`;
    html += `<div id="diagnostic-file-integrity-result" style="margin-top: 10px; padding: 10px; background: #2a2a2a; border-radius: 4px; display: none;"></div>`;
    html += "</div>";
    html += "</div>";
    html += "</div>";
    html += '<button class="settings-reset-btn" id="settings-reset">Reset to Defaults</button>';
    html += '<button class="settings-reset-btn" id="settings-set-default" style="margin-left: 10px;">Set to Default</button>';
    settingsBody.innerHTML = html;
    if (currentFilename) {
      const qrContainer = document.getElementById("qrcode-container");
      if (qrContainer) {
        const currentUrl = window.location.origin + window.location.pathname;
        const fileUrl = `${currentUrl}?file=${encodeURIComponent(currentFilename)}`;
        qrContainer.innerHTML = "";
        if (typeof QRCode !== "undefined") {
          QRCode.toCanvas(qrContainer, fileUrl, {
            width: 200,
            margin: 2,
            color: {
              dark: "#000000",
              light: "#FFFFFF"
            }
          }, (error) => {
            if (error) {
              console.error("Error generating QR code:", error);
              qrContainer.innerHTML = '<div style="color: #888; padding: 20px;">QR code unavailable</div>';
            }
          });
        } else {
          const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(fileUrl)}`;
          qrContainer.innerHTML = `<img src="${qrApiUrl}" alt="QR Code" style="display: block;">`;
        }
      }
    }
    settingsBody.querySelectorAll("input, select").forEach((input) => {
      input.addEventListener("input", (e) => {
        const path = e.target.dataset.settingPath;
        let value;
        if (e.target.type === "color") {
          value = e.target.value;
        } else if (e.target.type === "range") {
          if (path.includes("opacity")) {
            value = (parseFloat(e.target.value) / 100).toFixed(2);
          } else {
            const numValue = parseFloat(e.target.value);
            if (!isNaN(numValue) && (path.includes("Size") || path.includes("margin") || path.includes("padding") || path.includes("borderRadius") || path.includes("size"))) {
              value = numValue + "px";
            } else {
              value = e.target.value;
            }
          }
        } else if (e.target.type === "number") {
          if (path.includes("opacity")) {
            value = (parseFloat(e.target.value) / 100).toFixed(2);
          } else {
            const numValue = parseFloat(e.target.value);
            if (!isNaN(numValue) && (path.includes("Size") || path.includes("margin") || path.includes("padding") || path.includes("borderRadius") || path.includes("size"))) {
              value = numValue + "px";
            } else {
              value = e.target.value;
            }
          }
        } else {
          value = e.target.value;
        }
        let themeType = "global";
        let viewFormat = null;
        let pageId = null;
        const themeManager2 = this._getThemeManager();
        if (this.useThemes && themeManager2) {
          const themeScopeSelect = document.getElementById("theme-scope-select");
          const themeViewFormat = document.getElementById("theme-view-format");
          const themePageId = document.getElementById("theme-page-id");
          const scope = themeScopeSelect?.value || "global";
          if (scope === "view" && themeViewFormat) {
            themeType = "view";
            viewFormat = themeViewFormat.value;
          } else if (scope === "page" && themePageId) {
            themeType = "page";
            pageId = themePageId.value;
          }
        }
        this.updateSetting(path, value, themeType, viewFormat, pageId);
      });
    });
    const resetBtn = document.getElementById("settings-reset");
    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        const defaultSettings = this.getDefaultSettings();
        const themeManager2 = this._getThemeManager();
        if (this.useThemes && themeManager2) {
          const themeScopeSelect = document.getElementById("theme-scope-select");
          const themeViewFormat = document.getElementById("theme-view-format");
          const themePageId = document.getElementById("theme-page-id");
          const scope = themeScopeSelect?.value || "global";
          if (scope === "global") {
            this.saveSettings(defaultSettings, "global");
          } else if (scope === "view" && themeViewFormat) {
            this.saveSettings(defaultSettings, "view", themeViewFormat.value);
          } else if (scope === "page" && themePageId) {
            this.saveSettings(defaultSettings, "page", null, themePageId.value);
          }
        } else {
          this.saveSettings(defaultSettings);
        }
        this.showSettingsModal();
      });
    }
    document.getElementById("settings-set-default").addEventListener("click", () => {
      const originalSettings = this.getOriginalDefaultSettings();
      this.saveSettings(originalSettings);
      this.showSettingsModal();
    });
    const fileIntegrityBtn = document.getElementById("diagnostic-file-integrity");
    const fileIntegrityResult = document.getElementById("diagnostic-file-integrity-result");
    if (fileIntegrityBtn && fileIntegrityResult) {
      fileIntegrityBtn.addEventListener("click", async () => {
        const currentFilename2 = this.app.fileManager?.currentFilename;
        if (!currentFilename2) {
          fileIntegrityResult.style.display = "block";
          fileIntegrityResult.innerHTML = '<div style="color: #ff5555;">No file currently open</div>';
          return;
        }
        fileIntegrityBtn.disabled = true;
        fileIntegrityBtn.textContent = "Running...";
        fileIntegrityResult.style.display = "block";
        fileIntegrityResult.innerHTML = '<div style="color: #888;">Checking file integrity...</div>';
        try {
          const report = await this.app.fileManager.diagnoseFileIntegrity(currentFilename2);
          let resultHtml = `<div style="color: #ffffff; font-weight: 600; margin-bottom: 10px;">File Integrity Report: ${currentFilename2}</div>`;
          resultHtml += `<div style="color: ${report.isValid ? "#4a9eff" : "#ff5555"}; margin-bottom: 10px;">Status: ${report.isValid ? "Valid" : "Issues Found"}</div>`;
          resultHtml += `<div style="color: #e0e0e0; margin-bottom: 10px;">`;
          resultHtml += `Documents: ${report.elementCounts.documents}, Groups: ${report.elementCounts.groups}, Items: ${report.elementCounts.items}`;
          resultHtml += `</div>`;
          if (report.issues && report.issues.length > 0) {
            resultHtml += `<div style="color: #ff5555; margin-top: 10px; font-weight: 600;">Issues (${report.issues.length}):</div>`;
            report.issues.forEach((issue) => {
              resultHtml += `<div style="color: #ff8888; font-size: 12px; margin-left: 10px; margin-top: 3px;">`;
              resultHtml += `• [${issue.type}] ${issue.location}: ${issue.description}`;
              resultHtml += `</div>`;
            });
          } else {
            resultHtml += `<div style="color: #4a9eff; margin-top: 10px;">No issues found</div>`;
          }
          fileIntegrityResult.innerHTML = resultHtml;
        } catch (error) {
          fileIntegrityResult.innerHTML = `<div style="color: #ff5555;">Error: ${error.message}</div>`;
        } finally {
          fileIntegrityBtn.disabled = false;
          fileIntegrityBtn.textContent = "Run File Integrity Check";
        }
      });
    }
    const themeManagerForListeners = this._getThemeManager();
    if (this.useThemes && themeManagerForListeners) {
      const themeScopeSelect = document.getElementById("theme-scope-select");
      const themeViewSelector = document.getElementById("theme-view-selector");
      const themePageSelector = document.getElementById("theme-page-selector");
      const themeViewFormat = document.getElementById("theme-view-format");
      const themePageId = document.getElementById("theme-page-id");
      const themeLoadBtn = document.getElementById("theme-load-btn");
      const themeResetViewBtn = document.getElementById("theme-reset-view-btn");
      const themeResetPageBtn = document.getElementById("theme-reset-page-btn");
      let selectedPresetId = null;
      const presetItems = settingsBody.querySelectorAll(".theme-preset-item");
      const presetApplyBtn = document.getElementById("theme-preset-apply-btn");
      presetItems.forEach((item) => {
        item.addEventListener("click", () => {
          presetItems.forEach((i) => {
            i.style.border = "1px solid #404040";
            i.style.background = "#1a1a1a";
          });
          item.style.border = "2px solid #4a9eff";
          item.style.background = "#2a3a4a";
          selectedPresetId = item.dataset.presetId;
          if (presetApplyBtn) {
            presetApplyBtn.style.display = "inline-block";
          }
        });
      });
      if (presetApplyBtn) {
        presetApplyBtn.addEventListener("click", () => {
          if (selectedPresetId) {
            const preset = this.themePresets.getPreset(selectedPresetId);
            if (preset) {
              const themeManager2 = this._getThemeManager();
              if (themeManager2) {
                themeManager2.setGlobalTheme(preset.theme);
              }
              this.applySettings(preset.theme);
              alert(`Applied "${preset.name}" theme globally!`);
              this.showSettingsModal();
            }
          }
        });
      }
      const themeSaveCustomBtn = document.getElementById("theme-save-custom-btn");
      if (themeSaveCustomBtn) {
        themeSaveCustomBtn.addEventListener("click", () => {
          const themeName = prompt("Enter a name for this custom theme:");
          if (themeName && themeName.trim()) {
            const themeManager2 = this._getThemeManager();
            const currentTheme = themeManager2?.themes?.global;
            const customTheme = {
              name: themeName.trim(),
              description: "Custom theme",
              theme: currentTheme
            };
            const json = JSON.stringify(customTheme, null, 2);
            const blob = new Blob([json], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `theme-${themeName.trim().toLowerCase().replace(/\s+/g, "-")}.json`;
            a.click();
            URL.revokeObjectURL(url);
          }
        });
      }
      const themeLoadCustomBtn = document.getElementById("theme-load-custom-btn");
      const themeLoadCustomFile = document.getElementById("theme-load-custom-file");
      if (themeLoadCustomBtn && themeLoadCustomFile) {
        themeLoadCustomBtn.addEventListener("click", () => themeLoadCustomFile.click());
        themeLoadCustomFile.addEventListener("change", (e) => {
          const file = e.target.files[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
              try {
                const imported = JSON.parse(event.target.result);
                if (imported.theme) {
                  const themeManager2 = this._getThemeManager();
                  if (themeManager2) {
                    themeManager2.setGlobalTheme(imported.theme);
                  }
                  this.applySettings(imported.theme);
                  alert(`Loaded custom theme: ${imported.name || "Unnamed"}`);
                  this.showSettingsModal();
                } else {
                  const themeManager2 = this._getThemeManager();
                  if (themeManager2) {
                    themeManager2.setGlobalTheme(imported);
                  }
                  this.applySettings(imported);
                  alert("Loaded custom theme!");
                  this.showSettingsModal();
                }
              } catch (error) {
                alert("Failed to load theme. Please check the file format.");
                console.error("Theme load error:", error);
              }
            };
            reader.readAsText(file);
          }
        });
      }
      if (themeScopeSelect) {
        themeScopeSelect.addEventListener("change", () => {
          const scope = themeScopeSelect.value;
          themeViewSelector.style.display = scope === "view" ? "block" : "none";
          themePageSelector.style.display = scope === "page" ? "block" : "none";
          themeResetViewBtn.style.display = scope === "view" ? "inline-block" : "none";
          themeResetPageBtn.style.display = scope === "page" ? "inline-block" : "none";
        });
      }
      if (themeLoadBtn) {
        themeLoadBtn.addEventListener("click", () => {
          const scope = themeScopeSelect?.value || "global";
          let theme = null;
          const themeManager2 = this._getThemeManager();
          if (scope === "global") {
            theme = themeManager2?.themes?.global;
          } else if (scope === "view" && themeViewFormat) {
            const viewFormat = themeViewFormat.value;
            theme = themeManager2?.getViewTheme(viewFormat) || themeManager2?.themes?.global;
          } else if (scope === "page" && themePageId) {
            const pageId = themePageId.value;
            theme = themeManager2?.getPageTheme(pageId) || themeManager2?.getEffectiveTheme(pageId);
          }
          if (theme) {
            this.showSettingsModal();
            settingsBody.querySelectorAll(".settings-section-content").forEach((content) => {
              content.style.display = "block";
            });
            settingsBody.querySelectorAll(".settings-toggle-arrow").forEach((arrow) => {
              arrow.textContent = "▼";
            });
          }
        });
      }
      if (themeResetViewBtn && themeViewFormat) {
        themeResetViewBtn.addEventListener("click", () => {
          const viewFormat = themeViewFormat.value;
          const themeManager2 = this._getThemeManager();
          if (themeManager2) {
            themeManager2.setViewTheme(viewFormat, null);
          }
          alert(`View theme for "${viewFormat}" reset to inherit from global.`);
          this.showSettingsModal();
        });
      }
      if (themeResetPageBtn && themePageId) {
        themeResetPageBtn.addEventListener("click", () => {
          const pageId = themePageId.value;
          if (themeManager) {
            themeManager.setPageTheme(pageId, null);
          }
          alert(`Page theme for "${pageId}" reset to inherit from view/global.`);
          this.showSettingsModal();
        });
      }
      const themeExportBtn = document.getElementById("theme-export-btn");
      if (themeExportBtn) {
        themeExportBtn.addEventListener("click", () => {
          const scope = themeScopeSelect?.value || "global";
          let theme = null;
          let filename = "theme";
          const themeManager2 = this._getThemeManager();
          if (scope === "global") {
            theme = themeManager2?.themes?.global;
            filename = "theme-global";
          } else if (scope === "view" && themeViewFormat) {
            theme = themeManager2?.getViewTheme(themeViewFormat.value) || themeManager2?.themes?.global;
            filename = `theme-view-${themeViewFormat.value}`;
          } else if (scope === "page" && themePageId) {
            theme = themeManager2?.getPageTheme(themePageId.value) || themeManager2?.getEffectiveTheme(themePageId.value);
            filename = `theme-page-${themePageId.value}`;
          }
          if (theme) {
            const json = themeManager2?.exportTheme(theme);
            const blob = new Blob([json], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${filename}.json`;
            a.click();
            URL.revokeObjectURL(url);
          }
        });
      }
      const themeImportBtn = document.getElementById("theme-import-btn");
      const themeImportFile = document.getElementById("theme-import-file");
      if (themeImportBtn && themeImportFile) {
        themeImportBtn.addEventListener("click", () => themeImportFile.click());
        themeImportFile.addEventListener("change", (e) => {
          const file = e.target.files[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
              const scope = themeScopeSelect?.value || "global";
              const viewFormat = themeViewFormat?.value || null;
              const pageId = themePageId?.value || null;
              const success = themeManager?.importTheme(event.target.result, scope, viewFormat, pageId);
              if (success) {
                alert("Theme imported successfully!");
                this.showSettingsModal();
              } else {
                alert("Failed to import theme. Please check the file format.");
              }
            };
            reader.readAsText(file);
          }
        });
      }
      const themeExportAllBtn = document.getElementById("theme-export-all-btn");
      if (themeExportAllBtn) {
        themeExportAllBtn.addEventListener("click", () => {
          const themeManager2 = this._getThemeManager();
          const json = themeManager2?.exportAllThemes();
          const blob = new Blob([json], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = "themes-all.json";
          a.click();
          URL.revokeObjectURL(url);
        });
      }
      const themeImportAllBtn = document.getElementById("theme-import-all-btn");
      const themeImportAllFile = document.getElementById("theme-import-all-file");
      if (themeImportAllBtn && themeImportAllFile) {
        themeImportAllBtn.addEventListener("click", () => themeImportAllFile.click());
        themeImportAllFile.addEventListener("change", (e) => {
          const file = e.target.files[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
              const success = themeManager?.importAllThemes(event.target.result);
              if (success) {
                alert("All themes imported successfully!");
                this.showSettingsModal();
              } else {
                alert("Failed to import themes. Please check the file format.");
              }
            };
            reader.readAsText(file);
          }
        });
      }
    }
    settingsBody.querySelectorAll(".settings-section-title").forEach((title) => {
      title.style.cursor = "pointer";
      title.addEventListener("click", () => {
        const targetId = title.dataset.collapseTarget;
        const content = document.getElementById(targetId);
        const arrow = title.querySelector(".settings-toggle-arrow");
        if (content) {
          const isCollapsed = content.style.display === "none";
          content.style.display = isCollapsed ? "block" : "none";
          arrow.textContent = isCollapsed ? "▼" : "▶";
        }
      });
    });
    settingsBody.querySelectorAll(".settings-subsection-title[data-collapse-target]").forEach((title) => {
      title.style.cursor = "pointer";
      title.addEventListener("click", () => {
        const targetId = title.dataset.collapseTarget;
        const content = document.getElementById(targetId);
        const arrow = title.querySelector(".settings-toggle-arrow");
        if (content) {
          const isCollapsed = content.style.display === "none";
          content.style.display = isCollapsed ? "block" : "none";
          arrow.textContent = isCollapsed ? "▼" : "▶";
        }
      });
    });
    modal.classList.add("active");
  }
  createColorControl(path, label, value) {
    return `
            <div class="settings-control">
                <label>${label}:</label>
                <div class="settings-control-row">
                    <input type="color" data-setting-path="${path}" value="${value && value !== "transparent" && value.startsWith("#") ? value : "#000000"}">
                    <input type="text" data-setting-path="${path}" value="${value || ""}" style="flex: 1;">
                </div>
            </div>
        `;
  }
  createTextControl(path, label, value) {
    return `
            <div class="settings-control">
                <label>${label}:</label>
                <input type="text" data-setting-path="${path}" value="${value}">
            </div>
        `;
  }
  createSliderControl(path, label, value, min = 0, max = 100, step = 1, unit = "px") {
    const numValue = parseFloat(value) || 0;
    return `
            <div class="settings-control">
                <label>${label}:</label>
                <div class="settings-control-row">
                    <input type="range" min="${min}" max="${max}" step="${step}" data-setting-path="${path}" value="${numValue}">
                    <input type="number" min="${min}" max="${max}" step="${step}" data-setting-path="${path}" value="${numValue}" style="width: 80px;">
                    <span style="color: #888; min-width: 30px;">${unit}</span>
                </div>
            </div>
        `;
  }
  createOpacityControl(path, label, value) {
    const numValue = parseFloat(value) * 100;
    return `
            <div class="settings-control">
                <label>${label}:</label>
                <div class="settings-control-row">
                    <input type="range" min="0" max="100" step="1" data-setting-path="${path}" value="${numValue}">
                    <input type="number" min="0" max="100" step="1" data-setting-path="${path}" value="${numValue}" style="width: 80px;">
                </div>
            </div>
        `;
  }
  updateSetting(path, value, themeType = "global", viewFormat = null, pageId = null) {
    let settings;
    const themeManager = this._getThemeManager();
    if (this.useThemes && themeManager) {
      if (themeType === "global") {
        settings = themeManager?.themes?.global;
      } else if (themeType === "view" && viewFormat) {
        let viewTheme = themeManager?.getViewTheme(viewFormat);
        if (!viewTheme && themeManager) {
          viewTheme = { ...themeManager.themes.global };
          themeManager.setViewTheme(viewFormat, viewTheme);
        }
        settings = viewTheme;
      } else if (themeType === "page" && pageId) {
        let pageTheme = themeManager?.getPageTheme(pageId);
        if (!pageTheme && themeManager) {
          pageTheme = { ...themeManager.getEffectiveTheme(pageId) };
          themeManager.setPageTheme(pageId, pageTheme);
        }
        settings = pageTheme;
      } else {
        settings = this.loadSettings();
      }
    } else {
      settings = this.loadSettings();
    }
    const keys = path.split(".");
    let obj = settings;
    for (let i = 0; i < keys.length - 1; i++) {
      obj = obj[keys[i]];
    }
    obj[keys[keys.length - 1]] = value;
    if (path.includes("color") || path.includes("background")) {
      const allInputs = document.querySelectorAll(`[data-setting-path="${path}"]`);
      allInputs.forEach((input) => {
        if (input.type === "color") {
          if (value && value !== "transparent" && value.startsWith("#")) {
            input.value = value;
          } else if (value && value !== "transparent") {
            input.value = "#000000";
          }
        } else if (input.type === "text") {
          input.value = value;
        }
      });
    }
    if (path.includes("opacity")) {
      const numValue = parseFloat(value) * 100;
      const allInputs = document.querySelectorAll(`[data-setting-path="${path}"]`);
      allInputs.forEach((input) => {
        if (input.type === "range" || input.type === "number") {
          input.value = numValue;
        }
      });
    }
    if (path.includes("Size") || path.includes("margin") || path.includes("padding") || path.includes("borderRadius") || path.includes("size") || path.includes("gap")) {
      const numValue = parseFloat(value) || 0;
      const allInputs = document.querySelectorAll(`[data-setting-path="${path}"]`);
      allInputs.forEach((input) => {
        if (input.type === "range" || input.type === "number") {
          input.value = numValue;
        }
      });
    }
    this.saveSettings(settings, themeType, viewFormat, pageId);
  }
  closeSettingsModal() {
    const modal = document.getElementById("settings-modal");
    modal.classList.remove("active");
  }
}
class ThemeManager {
  constructor() {
    this.storageKey = "twodo-themes";
    this.themes = this.loadThemes();
    if (!this.themes.global) {
      this.themes.global = this.getDefaultTheme();
    }
    const viewFormats = ["default", "grid-layout-format", "horizontal-layout-format", "document-view-format", "page-kanban-format", "trello-board"];
    viewFormats.forEach((format) => {
      if (!this.themes.views[format]) {
        this.themes.views[format] = null;
      }
    });
    this.saveThemes();
  }
  loadThemes() {
    const stored = localStorage.getItem(this.storageKey);
    if (stored) {
      try {
        const themes = JSON.parse(stored);
        return {
          global: themes.global || this.getDefaultTheme(),
          views: themes.views || {},
          documents: themes.documents || {}
        };
      } catch (e) {
        console.error("Failed to parse themes:", e);
      }
    }
    return {
      global: this.getDefaultTheme(),
      views: {},
      documents: {}
    };
  }
  saveThemes() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.themes));
  }
  getDefaultTheme() {
    return {
      background: "#1a1a1a",
      page: {
        background: "#2d2d2d",
        margin: "0px",
        padding: "20px",
        borderRadius: "8px",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif",
        fontSize: "14px",
        opacity: "1",
        color: "#e0e0e0",
        title: {
          fontSize: "18px",
          color: "#ffffff",
          marginBottom: "15px"
        }
      },
      element: {
        background: "transparent",
        margin: "0px",
        padding: "10px",
        paddingVertical: "10px",
        paddingHorizontal: "10px",
        gap: "8px",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif",
        fontSize: "14px",
        opacity: "1",
        color: "#e0e0e0",
        hoverBackground: "#363636"
      },
      header: {
        fontSize: "16px",
        color: "#b8b8b8",
        margin: "10px 0"
      },
      checkbox: {
        size: "18px"
      }
    };
  }
  /**
   * Deep merge two theme objects
   */
  mergeThemes(base, override) {
    const merged = { ...base };
    for (const key in override) {
      if (override[key] && typeof override[key] === "object" && !Array.isArray(override[key])) {
        merged[key] = this.mergeThemes(merged[key] || {}, override[key]);
      } else {
        merged[key] = override[key];
      }
    }
    return merged;
  }
  /**
   * Get effective theme for a page
   * Priority: page-specific > view-specific > global
   */
  getEffectiveTheme(pageId, viewFormat = "default") {
    let theme = { ...this.themes.global };
    if (this.themes.views[viewFormat] && this.themes.views[viewFormat] !== null) {
      theme = this.mergeThemes(theme, this.themes.views[viewFormat]);
    }
    if (this.themes.documents[pageId]) {
      theme = this.mergeThemes(theme, this.themes.documents[pageId]);
    }
    return theme;
  }
  /**
   * Set global theme
   */
  setGlobalTheme(theme) {
    this.themes.global = this.mergeThemes(this.getDefaultTheme(), theme);
    this.saveThemes();
    this.applyTheme(this.themes.global);
    eventBus.emit("theme:updated", { type: "global", theme: this.themes.global });
    this._updateAllUIThemes();
  }
  /**
   * Set view-specific theme
   */
  setViewTheme(viewFormat, theme) {
    if (theme === null) {
      delete this.themes.views[viewFormat];
    } else {
      this.themes.views[viewFormat] = this.mergeThemes(this.getDefaultTheme(), theme);
    }
    this.saveThemes();
    eventBus.emit("theme:updated", { type: "view", viewFormat, theme });
    this._updateAllUIThemes();
  }
  /**
   * Set page-specific theme
   */
  setPageTheme(pageId, theme) {
    if (theme === null) {
      delete this.themes.documents[pageId];
    } else {
      this.themes.documents[pageId] = this.mergeThemes(this.getDefaultTheme(), theme);
    }
    this.saveThemes();
    eventBus.emit("theme:updated", { type: "page", pageId, theme });
    this._updateAllUIThemes();
  }
  /**
   * Update all UI components with current themes immediately
   */
  _updateAllUIThemes() {
    this.applyTheme(this.themes.global, "root");
    const appState2 = this._getAppState();
    if (!appState2 || !appState2.documents) return;
    const binsContainer = document.getElementById("bins-container");
    if (binsContainer && appState2.currentDocumentId) {
      const currentPage = appState2.documents.find((p) => p.id === appState2.currentDocumentId);
      if (currentPage) {
        const viewFormat = currentPage.format || "default";
        const effectiveTheme = this.getEffectiveTheme(currentPage.id, viewFormat);
        this.applyTheme(effectiveTheme, binsContainer);
      }
    }
    const formatContainers = document.querySelectorAll(".format-container, .pane-content");
    formatContainers.forEach((container) => {
      const pageId = container.dataset.pageId;
      if (pageId) {
        const page = appState2.documents.find((p) => p.id === pageId);
        if (page) {
          const viewFormat = page.format || container.dataset.format || "default";
          const effectiveTheme = this.getEffectiveTheme(pageId, viewFormat);
          this.applyTheme(effectiveTheme, container);
        }
      }
    });
    const modal = document.getElementById("modal");
    if (modal && modal.classList.contains("active")) {
      this.applyTheme(this.themes.global, modal);
    }
  }
  /**
   * Get AppState service (for accessing documents)
   */
  _getAppState() {
    try {
      return getService(SERVICES.APP_STATE);
    } catch (e) {
      return null;
    }
  }
  /**
   * Get view-specific theme (or null if inheriting)
   */
  getViewTheme(viewFormat) {
    return this.themes.views[viewFormat] || null;
  }
  /**
   * Get page-specific theme (or null if inheriting)
   */
  getPageTheme(pageId) {
    return this.themes.documents[pageId] || null;
  }
  /**
   * Apply theme to CSS variables
   */
  applyTheme(theme, scope = "root") {
    let target;
    if (scope === "root") {
      target = document.documentElement;
    } else if (scope instanceof HTMLElement) {
      target = scope;
    } else {
      target = document.querySelector(scope);
    }
    if (!target) return;
    target.style.setProperty("--bg-color", theme.background);
    target.style.setProperty("--page-bg", theme.page.background);
    target.style.setProperty("--page-margin", theme.page.margin);
    target.style.setProperty("--page-padding", theme.page.padding);
    target.style.setProperty("--page-border-radius", theme.page.borderRadius);
    target.style.setProperty("--page-font-family", theme.page.fontFamily);
    target.style.setProperty("--page-font-size", theme.page.fontSize);
    target.style.setProperty("--page-opacity", theme.page.opacity);
    target.style.setProperty("--page-color", theme.page.color);
    target.style.setProperty("--page-title-font-size", theme.page.title.fontSize);
    target.style.setProperty("--page-title-color", theme.page.title.color);
    target.style.setProperty("--page-title-margin-bottom", theme.page.title.marginBottom);
    target.style.setProperty("--element-bg", theme.element.background);
    target.style.setProperty("--element-margin", theme.element.margin);
    target.style.setProperty("--element-padding", theme.element.padding);
    target.style.setProperty("--element-padding-vertical", theme.element.paddingVertical || theme.element.padding);
    target.style.setProperty("--element-padding-horizontal", theme.element.paddingHorizontal || theme.element.padding);
    target.style.setProperty("--element-gap", theme.element.gap || "8px");
    target.style.setProperty("--element-font-family", theme.element.fontFamily);
    target.style.setProperty("--element-font-size", theme.element.fontSize);
    target.style.setProperty("--element-opacity", theme.element.opacity);
    target.style.setProperty("--element-color", theme.element.color);
    target.style.setProperty("--element-hover-bg", theme.element.hoverBackground);
    target.style.setProperty("--header-font-size", theme.header.fontSize);
    target.style.setProperty("--header-color", theme.header.color);
    target.style.setProperty("--header-margin", theme.header.margin);
    target.style.setProperty("--checkbox-size", theme.checkbox && theme.checkbox.size || "18px");
    if (theme.page.texture) {
      target.style.setProperty("--page-texture", theme.page.texture);
    }
    if (theme.page.shadow) {
      target.style.setProperty("--page-shadow", theme.page.shadow);
    }
    if (theme.element.texture) {
      target.style.setProperty("--element-texture", theme.element.texture);
    }
    if (theme.element.shadow) {
      target.style.setProperty("--element-shadow", theme.element.shadow);
    }
    if (theme.backgroundTexture) {
      target.style.setProperty("--background-texture", theme.backgroundTexture);
    }
  }
  /**
   * Apply effective theme for a specific page/view combination
   */
  applyPageTheme(pageId, viewFormat = "default", containerElement = null) {
    const theme = this.getEffectiveTheme(pageId, viewFormat);
    this.applyTheme(theme, "root");
    if (containerElement && containerElement instanceof HTMLElement) {
      this.applyTheme(theme, containerElement);
    }
  }
  /**
   * Export theme as JSON
   */
  exportTheme(theme) {
    return JSON.stringify(theme, null, 2);
  }
  /**
   * Export all themes (global, views, pages)
   */
  exportAllThemes() {
    return JSON.stringify(this.themes, null, 2);
  }
  /**
   * Import theme from JSON
   */
  importTheme(jsonString, themeType = "global", viewFormat = null, pageId = null) {
    try {
      const imported = JSON.parse(jsonString);
      if (themeType === "global") {
        this.setGlobalTheme(imported);
      } else if (themeType === "view" && viewFormat) {
        this.setViewTheme(viewFormat, imported);
      } else if (themeType === "page" && pageId) {
        this.setPageTheme(pageId, imported);
      }
      return true;
    } catch (e) {
      console.error("Failed to parse theme JSON:", e);
      return false;
    }
  }
  /**
   * Import all themes from JSON
   */
  importAllThemes(jsonString) {
    try {
      const imported = JSON.parse(jsonString);
      if (imported.global) {
        this.themes.global = this.mergeThemes(this.getDefaultTheme(), imported.global);
      }
      if (imported.views) {
        this.themes.views = { ...this.themes.views, ...imported.views };
      }
      if (imported.documents) {
        this.themes.documents = { ...this.themes.documents, ...imported.documents };
      }
      this.saveThemes();
      eventBus.emit("theme:imported", { themes: this.themes });
      this._updateAllUIThemes();
      return true;
    } catch (e) {
      console.error("Failed to import themes:", e);
      return false;
    }
  }
  /**
   * Get all available view formats
   */
  getViewFormats() {
    return ["default", "grid-layout-format", "horizontal-layout-format", "document-view-format", "page-kanban-format", "trello-board"];
  }
}
class VisualSettingsManager {
  constructor() {
    this.storageKey = "twodo-visual-settings";
    this.settings = this.loadSettings();
  }
  /**
   * Get services
   */
  _getThemeManager() {
    return getService(SERVICES.THEME_MANAGER);
  }
  _getAppState() {
    return getService(SERVICES.APP_STATE);
  }
  loadSettings() {
    const stored = localStorage.getItem(this.storageKey);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.error("Failed to parse visual settings:", e);
      }
    }
    return {
      panes: {},
      // paneId -> { custom: {...}, preserveAll: boolean }
      pages: {},
      // pageId -> { custom: {...}, preserveAll: boolean }
      bins: {},
      // binId -> { custom: {...}, preserveAll: boolean }
      elements: {},
      // elementId -> { custom: {...}, preserveAll: boolean }
      tags: {}
      // tag -> { custom: {...}, preserveAll: boolean, viewFormat: string|null }
    };
  }
  saveSettings() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.settings));
  }
  /**
   * Get visual settings for an object
   * @param {string} type - 'pane', 'page', 'bin', or 'element'
   * @param {string} id - Object ID
   * @returns {Object} - { custom: {...}, preserveAll: boolean }
   */
  getObjectSettings(type, id) {
    const typeKey = `${type}s`;
    if (!this.settings[typeKey]) {
      this.settings[typeKey] = {};
    }
    if (!this.settings[typeKey][id]) {
      this.settings[typeKey][id] = { custom: {}, preserveAll: false };
    }
    return this.settings[typeKey][id];
  }
  /**
   * Get tag-based visual settings
   * @param {string} tag - Tag name
   * @param {string} viewFormat - View format (null for all views)
   * @returns {Object} - { custom: {...}, preserveAll: boolean, viewFormat: string|null }
   */
  getTagSettings(tag, viewFormat = null) {
    if (!this.settings.tags) {
      this.settings.tags = {};
    }
    const tagKey = viewFormat ? `${tag}::${viewFormat}` : tag;
    if (!this.settings.tags[tagKey]) {
      this.settings.tags[tagKey] = { custom: {}, preserveAll: false, viewFormat };
    }
    return this.settings.tags[tagKey];
  }
  /**
   * Set tag-based visual settings
   * @param {string} tag - Tag name
   * @param {Object} customSettings - Custom settings
   * @param {boolean} preserveAll - Whether to preserve all values
   * @param {string} viewFormat - View format (null for all views)
   */
  setTagSettings(tag, customSettings, preserveAll = false, viewFormat = null) {
    if (!this.settings.tags) {
      this.settings.tags = {};
    }
    const tagKey = viewFormat ? `${tag}::${viewFormat}` : tag;
    if (preserveAll) {
      this.settings.tags[tagKey] = {
        custom: customSettings,
        preserveAll: true,
        viewFormat
      };
    } else {
      const existing = this.settings.tags[tagKey] || { custom: {} };
      const merged = { ...existing.custom, ...customSettings };
      this.settings.tags[tagKey] = {
        custom: merged,
        preserveAll: false,
        viewFormat
      };
    }
    this.saveSettings();
    eventBus.emit("visual-settings:updated", { type: "tag", tag, viewFormat, settings: this.settings.tags[tagKey] });
  }
  /**
   * Remove tag-based visual settings
   * @param {string} tag - Tag name
   * @param {string} viewFormat - View format (null for all views)
   */
  removeTagSettings(tag, viewFormat = null) {
    if (!this.settings.tags) return;
    const tagKey = viewFormat ? `${tag}::${viewFormat}` : tag;
    if (this.settings.tags[tagKey]) {
      delete this.settings.tags[tagKey];
      this.saveSettings();
      eventBus.emit("visual-settings:removed", { type: "tag", tag, viewFormat });
    }
  }
  /**
   * Get all tags that have visual settings
   * @returns {Array} - Array of { tag: string, viewFormat: string|null }
   */
  getTagsWithSettings() {
    if (!this.settings.tags) return [];
    return Object.keys(this.settings.tags).map((key) => {
      const parts = key.split("::");
      return {
        tag: parts[0],
        viewFormat: parts.length > 1 ? parts[1] : null
      };
    });
  }
  /**
   * Set visual settings for an object
   * @param {string} type - 'pane', 'page', 'bin', or 'element'
   * @param {string} id - Object ID
   * @param {Object} customSettings - Custom settings (only changed values)
   * @param {boolean} preserveAll - Whether to preserve all values
   */
  setObjectSettings(type, id, customSettings, preserveAll = false) {
    const typeKey = `${type}s`;
    if (!this.settings[typeKey]) {
      this.settings[typeKey] = {};
    }
    if (preserveAll) {
      this.settings[typeKey][id] = {
        custom: customSettings,
        preserveAll: true
      };
    } else {
      const existing = this.settings[typeKey][id] || { custom: {} };
      const merged = { ...existing.custom, ...customSettings };
      this.settings[typeKey][id] = {
        custom: merged,
        preserveAll: false
      };
    }
    this.saveSettings();
    eventBus.emit("visual-settings:updated", { type, id, settings: this.settings[typeKey][id] });
  }
  /**
   * Remove visual settings for an object
   */
  removeObjectSettings(type, id) {
    const typeKey = `${type}s`;
    if (this.settings[typeKey] && this.settings[typeKey][id]) {
      delete this.settings[typeKey][id];
      this.saveSettings();
      eventBus.emit("visual-settings:removed", { type, id });
    }
  }
  /**
   * Get effective visual settings for an object (merges with theme hierarchy)
   * @param {string} type - 'pane', 'page', 'bin', or 'element'
   * @param {string} id - Object ID
   * @param {string} pageId - Page ID (for bins/elements)
   * @param {string} viewFormat - View format (for pages)
   * @param {Array} tags - Array of tags for the object
   * @returns {Object} - Effective settings
   */
  getEffectiveSettings(type, id, pageId = null, viewFormat = "default", tags = []) {
    let baseTheme = {};
    const themeManager = this._getThemeManager();
    if (themeManager) {
      baseTheme = themeManager.getEffectiveTheme(pageId || id, viewFormat);
    }
    if (tags && Array.isArray(tags) && tags.length > 0) {
      tags.forEach((tag) => {
        const viewSpecificTagSettings = this.getTagSettings(tag, viewFormat);
        if (viewSpecificTagSettings.custom && Object.keys(viewSpecificTagSettings.custom).length > 0) {
          baseTheme = this.mergeSettings(baseTheme, viewSpecificTagSettings.custom);
        }
      });
      tags.forEach((tag) => {
        const globalTagSettings = this.getTagSettings(tag, null);
        const viewSpecificKey = `${tag}::${viewFormat}`;
        if (!this.settings.tags || !this.settings.tags[viewSpecificKey] || Object.keys(this.settings.tags[viewSpecificKey].custom || {}).length === 0) {
          if (globalTagSettings.custom && Object.keys(globalTagSettings.custom).length > 0) {
            baseTheme = this.mergeSettings(baseTheme, globalTagSettings.custom);
          }
        }
      });
    }
    const objectSettings = this.getObjectSettings(type, id);
    if (objectSettings.preserveAll) {
      return this.mergeSettings(baseTheme, objectSettings.custom);
    } else {
      return this.mergeSettings(baseTheme, objectSettings.custom);
    }
  }
  /**
   * Merge two settings objects (deep merge)
   */
  mergeSettings(base, override) {
    const merged = { ...base };
    for (const key in override) {
      if (override[key] && typeof override[key] === "object" && !Array.isArray(override[key])) {
        merged[key] = this.mergeSettings(merged[key] || {}, override[key]);
      } else {
        merged[key] = override[key];
      }
    }
    return merged;
  }
  /**
   * Get tags for an object
   * @param {string} type - Object type
   * @param {string} id - Object ID
   * @param {string} pageId - Page ID (for bins/elements)
   * @returns {Array} - Array of tags
   */
  getObjectTags(type, id, pageId = null) {
    if (type === "element" && pageId) {
      const parts = id.split("-");
      if (parts.length >= 3) {
        const elementPageId = parts[0];
        const binId = parts[1];
        const elementIndex = parseInt(parts[2]);
        const appState2 = this._getAppState();
        const page = appState2.documents?.find((p) => p.id === elementPageId);
        const bin = page?.groups?.find((b) => b.id === binId);
        const items = bin?.items || [];
        if (bin) {
          bin.items = items;
        }
        const element = items?.[elementIndex];
        return element?.tags || [];
      }
    } else if (type === "bin" && pageId) {
      const appState2 = this._getAppState();
      const page = appState2.documents?.find((p) => p.id === pageId);
      const bin = page?.groups?.find((b) => b.id === id);
      return bin?.tags || [];
    } else if (type === "page") {
      const page = appState.documents?.find((p) => p.id === id);
      return page?.tags || [];
    } else if (type === "pane") {
      return [];
    }
    return [];
  }
  /**
   * Apply visual settings to a DOM element
   * @param {HTMLElement} element - DOM element to style
   * @param {string} type - Object type
   * @param {string} id - Object ID
   * @param {string} pageId - Page ID (for bins/elements)
   * @param {string} viewFormat - View format (for pages)
   */
  applyVisualSettings(element, type, id, pageId = null, viewFormat = "default") {
    if (!element || !(element instanceof HTMLElement)) return;
    const tags = this.getObjectTags(type, id, pageId);
    const effectiveSettings = this.getEffectiveSettings(type, id, pageId, viewFormat, tags);
    if (type === "pane" || type === "page") {
      this.applyPageSettings(element, effectiveSettings);
    } else if (type === "bin") {
      this.applyBinSettings(element, effectiveSettings);
    } else if (type === "element") {
      this.applyElementSettings(element, effectiveSettings);
    }
  }
  applyPageSettings(element, settings) {
    if (settings.background) element.style.setProperty("--page-bg", settings.background);
    if (settings.margin) element.style.setProperty("--page-margin", settings.margin);
    if (settings.padding) element.style.setProperty("--page-padding", settings.padding);
    if (settings.borderRadius) element.style.setProperty("--page-border-radius", settings.borderRadius);
    if (settings.fontFamily) element.style.setProperty("--page-font-family", settings.fontFamily);
    if (settings.fontSize) element.style.setProperty("--page-font-size", settings.fontSize);
    if (settings.opacity) element.style.setProperty("--page-opacity", settings.opacity);
    if (settings.color) element.style.setProperty("--page-color", settings.color);
    if (settings.page) {
      if (settings.page.background) element.style.setProperty("--page-bg", settings.page.background);
      if (settings.page.margin) element.style.setProperty("--page-margin", settings.page.margin);
      if (settings.page.padding) element.style.setProperty("--page-padding", settings.page.padding);
      if (settings.page.borderRadius) element.style.setProperty("--page-border-radius", settings.page.borderRadius);
      if (settings.page.fontFamily) element.style.setProperty("--page-font-family", settings.page.fontFamily);
      if (settings.page.fontSize) element.style.setProperty("--page-font-size", settings.page.fontSize);
      if (settings.page.opacity) element.style.setProperty("--page-opacity", settings.page.opacity);
      if (settings.page.color) element.style.setProperty("--page-color", settings.page.color);
    }
  }
  applyBinSettings(element, settings) {
    this.applyPageSettings(element, settings);
  }
  applyElementSettings(element, settings) {
    if (settings.element) {
      if (settings.element.background) element.style.setProperty("--element-bg", settings.element.background);
      if (settings.element.margin) element.style.setProperty("--element-margin", settings.element.margin);
      if (settings.element.padding) element.style.setProperty("--element-padding", settings.element.padding);
      if (settings.element.paddingVertical) element.style.setProperty("--element-padding-vertical", settings.element.paddingVertical);
      if (settings.element.paddingHorizontal) element.style.setProperty("--element-padding-horizontal", settings.element.paddingHorizontal);
      if (settings.element.gap) element.style.setProperty("--element-gap", settings.element.gap);
      if (settings.element.fontFamily) element.style.setProperty("--element-font-family", settings.element.fontFamily);
      if (settings.element.fontSize) element.style.setProperty("--element-font-size", settings.element.fontSize);
      if (settings.element.opacity) element.style.setProperty("--element-opacity", settings.element.opacity);
      if (settings.element.color) element.style.setProperty("--element-color", settings.element.color);
      if (settings.element.hoverBackground) element.style.setProperty("--element-hover-bg", settings.element.hoverBackground);
    }
  }
  /**
   * Export settings for an object, tag, or all settings
   */
  exportSettings(type = null, id = null, tag = null, viewFormat = null) {
    if (tag !== null) {
      return JSON.stringify(this.getTagSettings(tag, viewFormat), null, 2);
    } else if (type && id) {
      return JSON.stringify(this.getObjectSettings(type, id), null, 2);
    }
    return JSON.stringify(this.settings, null, 2);
  }
  /**
   * Import settings
   */
  importSettings(jsonString) {
    try {
      const imported = JSON.parse(jsonString);
      this.settings = this.mergeSettings(this.settings, imported);
      this.saveSettings();
      eventBus.emit("visual-settings:imported", { settings: this.settings });
      return true;
    } catch (e) {
      console.error("Failed to import visual settings:", e);
      return false;
    }
  }
}
class PageManager {
  constructor() {
  }
  /**
   * Get AppState service
   */
  _getAppState() {
    return getService(SERVICES.APP_STATE);
  }
  /**
   * Get other services
   */
  _getUndoRedoManager() {
    return getService(SERVICES.UNDO_REDO_MANAGER);
  }
  _getDataManager() {
    return getService(SERVICES.DATA_MANAGER);
  }
  _getPagePluginManager() {
    return getService(SERVICES.PAGE_PLUGIN_MANAGER);
  }
  async addPage() {
    const appState2 = this._getAppState();
    const documentNum = appState2.documents.length + 1;
    const documentId = `page-${documentNum}`;
    const seededGroups = [{
      id: "group-0",
      title: "Group 1",
      items: [],
      level: 0,
      parentGroupId: null
    }];
    const newDocument = {
      id: documentId,
      groups: seededGroups,
      groupMode: "manual",
      plugins: [],
      format: null,
      config: {
        groupMode: "manual"
      }
    };
    const pageIndex = appState2.documents.length;
    appState2.documents.push(newDocument);
    appState2.currentDocumentId = documentId;
    const undoRedoManager = this._getUndoRedoManager();
    if (undoRedoManager) {
      undoRedoManager.recordPageAdd(pageIndex, newDocument);
    }
    const pagePluginManager = this._getPagePluginManager();
    if (pagePluginManager) {
      await pagePluginManager.initializePagePlugins(newDocument.id);
    }
    eventBus.emit(EVENTS.PAGE.CREATED, { pageId: newDocument.id, documentId: newDocument.id, page: newDocument });
    const dataManager = this._getDataManager();
    if (dataManager) {
      dataManager.saveData();
    }
    eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
  }
  /**
   * Ensure at least one page exists (business logic extracted from AppRenderer)
   * @returns {Object} The current page
   */
  ensureDefaultPage() {
    const appState2 = this._getAppState();
    const currentPage = appState2.documents.find((p) => p.id === appState2.currentDocumentId);
    if (!currentPage) {
      if (appState2.documents.length > 0) {
        appState2.currentDocumentId = appState2.documents[0].id;
        return appState2.documents[0];
      } else {
        const seededGroups = [{
          id: "group-0",
          title: "Group 1",
          items: [],
          level: 0,
          parentGroupId: null
        }];
        const defaultDocument = {
          id: "page-1",
          groups: seededGroups,
          groupMode: "manual",
          config: {
            groupMode: "manual"
          }
        };
        appState2.documents = [defaultDocument];
        appState2.currentDocumentId = "page-1";
        return defaultDocument;
      }
    }
    return currentPage;
  }
  async deletePage(pageId) {
    const appState2 = this._getAppState();
    if (appState2.documents.length <= 1) {
      return;
    }
    const page = appState2.documents.find((p) => p.id === pageId);
    if (!page) return;
    const undoRedoManager = this._getUndoRedoManager();
    if (undoRedoManager) {
      undoRedoManager.recordPageDelete(pageId, JSON.parse(JSON.stringify(page)));
    }
    const pagePluginManager = this._getPagePluginManager();
    if (pagePluginManager) {
      await pagePluginManager.cleanupPagePlugins(pageId);
    }
    eventBus.emit(EVENTS.PAGE.DELETED, { pageId });
    appState2.documents = appState2.documents.filter((p) => p.id !== pageId);
    if (appState2.currentDocumentId === pageId) {
      appState2.currentDocumentId = appState2.documents[0]?.id || null;
    }
    const dataManager = this._getDataManager();
    if (dataManager) {
      dataManager.saveData();
    }
    eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
  }
  movePage(sourcePageId, targetPageId) {
    if (sourcePageId === targetPageId) return;
    const appState2 = this._getAppState();
    const sourcePage = appState2.documents.find((p) => p.id === sourcePageId);
    const targetPage = appState2.documents.find((p) => p.id === targetPageId);
    if (!sourcePage || !targetPage) return;
    const sourceIndex = appState2.documents.indexOf(sourcePage);
    const targetIndex = appState2.documents.indexOf(targetPage);
    appState2.documents.splice(sourceIndex, 1);
    const insertIndex = sourceIndex < targetIndex ? targetIndex - 1 : targetIndex;
    appState2.documents.splice(insertIndex, 0, sourcePage);
    const dataManager = this._getDataManager();
    if (dataManager) {
      dataManager.saveData();
    }
    requestAnimationFrame(() => {
      eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
    });
  }
  renamePage(pageId, newTitle) {
    const appState2 = this._getAppState();
    const page = appState2.documents.find((p) => p.id === pageId);
    if (page) {
      const dataManager = this._getDataManager();
      if (dataManager) {
        dataManager.saveData();
      }
      eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
    }
  }
}
class BinManager {
  constructor() {
  }
  /**
   * Get services
   */
  _getAppState() {
    return getService(SERVICES.APP_STATE);
  }
  _getUndoRedoManager() {
    return getService(SERVICES.UNDO_REDO_MANAGER);
  }
  _getDataManager() {
    return getService(SERVICES.DATA_MANAGER);
  }
  _getBinPluginManager() {
    return getService(SERVICES.BIN_PLUGIN_MANAGER);
  }
  _isManualGroupMode(document2) {
    const groupMode = document2?.groupMode || document2?.config?.groupMode || "manual";
    if (groupMode !== "manual") {
      console.warn("[BinManager] Group modifications are disabled in header-derived mode.");
      return false;
    }
    return true;
  }
  async addBin(pageId, afterBinId = null) {
    const appState2 = this._getAppState();
    const document2 = appState2.documents.find((p) => p.id === pageId);
    if (!document2) return;
    if (!this._isManualGroupMode(document2)) return;
    if (!document2.groups) {
      document2.groups = [];
    }
    let binId;
    let counter = 0;
    do {
      binId = `group-${counter}`;
      counter++;
    } while (document2.groups.some((b) => b.id === binId));
    const binNum = document2.groups.length + 1;
    const newGroup = {
      id: binId,
      title: `Group ${binNum}`,
      items: [],
      level: 0,
      parentGroupId: null,
      plugins: [],
      format: null,
      config: {}
    };
    let binIndex;
    if (afterBinId) {
      const afterBinIndex = document2.groups.findIndex((b) => b.id === afterBinId);
      if (afterBinIndex !== -1) {
        binIndex = afterBinIndex + 1;
        document2.groups.splice(binIndex, 0, newGroup);
      } else {
        binIndex = document2.groups.length;
        document2.groups.push(newGroup);
      }
    } else {
      binIndex = document2.groups.length;
      document2.groups.push(newGroup);
    }
    const undoRedoManager = this._getUndoRedoManager();
    if (undoRedoManager) {
      undoRedoManager.recordBinAdd(pageId, binIndex, newGroup);
    }
    const binPluginManager = this._getBinPluginManager();
    if (binPluginManager) {
      await binPluginManager.initializeBinPlugins(pageId, binId);
    }
    eventBus.emit(EVENTS.BIN.CREATED, { pageId, documentId: pageId, binId, groupId: binId, bin: newGroup, group: newGroup });
    const dataManager = this._getDataManager();
    if (dataManager) {
      dataManager.saveData();
    }
    eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
  }
  async deleteBin(pageId, binId) {
    const appState2 = this._getAppState();
    const document2 = appState2.documents.find((p) => p.id === pageId);
    if (!document2 || !document2.groups) return;
    if (!this._isManualGroupMode(document2)) return;
    const group = document2.groups.find((b) => b.id === binId);
    if (!group) return;
    const undoRedoManager = this._getUndoRedoManager();
    if (undoRedoManager) {
      undoRedoManager.recordBinDelete(pageId, binId, JSON.parse(JSON.stringify(group)));
    }
    const binPluginManager = this._getBinPluginManager();
    if (binPluginManager) {
      await binPluginManager.cleanupBinPlugins(pageId, binId);
    }
    eventBus.emit(EVENTS.BIN.DELETED, { pageId, documentId: pageId, binId, groupId: binId });
    document2.groups = document2.groups.filter((b) => b.id !== binId);
    if (document2.groups.length === 0) {
      const defaultGroup = {
        id: "group-0",
        title: "Group 1",
        items: [],
        level: 0,
        parentGroupId: null,
        plugins: [],
        format: null,
        config: {}
      };
      document2.groups = [defaultGroup];
      if (undoRedoManager) {
        undoRedoManager.recordBinAdd(pageId, 0, defaultGroup);
      }
    }
    const dataManager = this._getDataManager();
    if (dataManager) {
      dataManager.saveData();
    }
    eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
  }
  moveBin(sourcePageId, sourceBinId, targetPageId, targetBinId) {
    if (sourcePageId === targetPageId && sourceBinId === targetBinId) return;
    const appState2 = this._getAppState();
    const sourcePage = appState2.documents.find((p) => p.id === sourcePageId);
    const targetPage = appState2.documents.find((p) => p.id === targetPageId);
    if (!sourcePage || !targetPage || !sourcePage.groups || !targetPage.groups) return;
    if (!this._isManualGroupMode(sourcePage) || !this._isManualGroupMode(targetPage)) return;
    const sourceBin = sourcePage.groups.find((b) => b.id === sourceBinId);
    const targetBin = targetPage.groups.find((b) => b.id === targetBinId);
    if (!sourceBin || !targetBin) return;
    const sourceIndex = sourcePage.groups.indexOf(sourceBin);
    const targetIndex = targetPage.groups.indexOf(targetBin);
    sourcePage.groups.splice(sourceIndex, 1);
    if (sourcePageId === targetPageId) {
      const insertIndex = sourceIndex < targetIndex ? targetIndex - 1 : targetIndex;
      targetPage.groups.splice(insertIndex, 0, sourceBin);
    } else {
      targetPage.groups.splice(targetIndex, 0, sourceBin);
    }
    const dataManager = this._getDataManager();
    if (dataManager) {
      dataManager.saveData();
    }
    requestAnimationFrame(() => {
      eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
    });
  }
}
class ElementManager {
  constructor() {
    this.appState = getService(SERVICES.APP_STATE);
    this.undoRedoManager = getService(SERVICES.UNDO_REDO_MANAGER);
    this.dataManager = getService(SERVICES.DATA_MANAGER);
    this._elementTypeManager = null;
  }
  /**
   * Get ElementTypeManager (lazy access since it's created after ElementManager)
   */
  get elementTypeManager() {
    if (!this._elementTypeManager) {
      try {
        this._elementTypeManager = getService(SERVICES.ELEMENT_TYPE_MANAGER);
      } catch (e) {
        return null;
      }
    }
    return this._elementTypeManager;
  }
  addElement(pageId, binId, elementType) {
    const document2 = this.appState.documents.find((p) => p.id === pageId);
    if (!document2) return;
    const group = document2.groups?.find((b) => b.id === binId);
    if (!group) return;
    const newElement = this.createElementTemplate(elementType);
    newElement.parentId = null;
    newElement.childIds = Array.isArray(newElement.childIds) ? newElement.childIds : [];
    if (!newElement.id) {
      newElement.id = `element-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    if (!group.items) group.items = [];
    const newElementIndex = group.items.length;
    group.items.push(newElement);
    if (this.undoRedoManager) {
      this.undoRedoManager.recordElementAdd(pageId, binId, newElementIndex, newElement);
    }
    eventBus.emit(EVENTS.DATA.SAVE_REQUESTED);
    eventBus.emit(EVENTS.ELEMENT.CREATED, {
      pageId,
      binId,
      documentId: pageId,
      groupId: binId,
      elementIndex: newElementIndex,
      element: newElement
    });
    eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
    setTimeout(() => {
      eventBus.emit(EVENTS.UI.SHOW_EDIT_MODAL, {
        pageId,
        binId,
        documentId: pageId,
        groupId: binId,
        elementIndex: newElementIndex,
        element: newElement
      });
      setTimeout(() => {
        eventBus.emit(EVENTS.UI.FOCUS_INPUT, {
          inputId: "edit-text",
          select: true
        });
      }, 50);
    }, 50);
  }
  createElementTemplate(type) {
    if (this.elementTypeManager) {
      const template = this.elementTypeManager.createTemplate(type);
      if (template) {
        return template;
      }
    }
    const templates = {
      "task": {
        type: "task",
        text: "New task",
        completed: false,
        repeats: true,
        timeAllocated: "",
        funModifier: "",
        parentId: null,
        childIds: []
      },
      "header-checkbox": {
        type: "header-checkbox",
        text: "New Header",
        completed: false,
        repeats: true,
        timeAllocated: "",
        funModifier: "",
        parentId: null,
        childIds: []
      },
      "multi-checkbox": {
        type: "multi-checkbox",
        items: [
          { text: "Item 1", completed: false, funModifier: "" },
          { text: "Item 2", completed: false, funModifier: "" }
        ],
        completed: false,
        repeats: true,
        timeAllocated: "",
        funModifier: "",
        parentId: null,
        childIds: []
      },
      "one-time": {
        type: "task",
        text: "One-time task",
        completed: false,
        repeats: false,
        timeAllocated: "",
        funModifier: "",
        parentId: null,
        childIds: []
      },
      "audio": {
        type: "audio",
        text: "Audio Recording",
        audioFile: null,
        date: null,
        completed: false,
        repeats: true,
        parentId: null,
        childIds: []
      },
      "timer": {
        type: "timer",
        text: "Timer",
        duration: 3600,
        // Total duration in seconds (default 1 hour)
        elapsed: 0,
        // Elapsed time in seconds
        running: false,
        // Whether timer is currently running
        alarmSound: "/sounds/alarm.mp3",
        // Default alarm sound file path
        startTime: null,
        // Timestamp when timer was started
        pausedAt: 0,
        // Elapsed time when paused
        completed: false,
        alarmPlaying: false,
        // Whether alarm is currently playing
        alarmAudio: null,
        // Reference to alarm audio element
        repeats: true,
        parentId: null,
        childIds: []
      },
      "counter": {
        type: "counter",
        text: "Counter",
        value: 0,
        increment1: 1,
        increment5: 5,
        customIncrement: 10,
        completed: false,
        repeats: true,
        parentId: null,
        childIds: []
      },
      "tracker": {
        type: "tracker",
        text: "Tracker",
        mode: "daily",
        // 'daily' or 'page'
        dailyCompletions: {},
        // { date: count } for daily mode
        pageCompletions: {},
        // { elementId: count } for page mode
        completed: false,
        repeats: true,
        parentId: null,
        childIds: []
      },
      "rating": {
        type: "rating",
        text: "Rating",
        rating: 0,
        // 0-5 stars
        review: "",
        completed: false,
        repeats: true,
        parentId: null,
        childIds: []
      },
      "image": {
        type: "image",
        text: "Image",
        imageUrl: null,
        imageAlignment: "left",
        imageWidth: 300,
        completed: false,
        repeats: true,
        parentId: null,
        childIds: []
      },
      "time-log": {
        type: "time-log",
        text: "Time Log",
        totalTime: 0,
        // Total time in seconds
        isRunning: false,
        startTime: null,
        sessions: [],
        // Array of { start, end, duration }
        completed: false,
        repeats: true,
        parentId: null,
        childIds: []
      },
      "calendar": {
        type: "calendar",
        text: "Calendar",
        displayMode: "current-date",
        // 'current-date', 'one-day', 'week', 'month'
        currentDate: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
        // For one-day scrollable mode
        targetingMode: "default",
        // 'default', 'specific', 'tags'
        targetPages: [],
        // Array of page IDs for specific mode
        targetBins: [],
        // Array of {pageId, binId} for specific mode
        targetElements: [],
        // Array of {pageId, binId, elementIndex} for specific mode
        targetTags: [],
        // Array of tag strings for tags mode
        completed: false,
        persistent: true,
        // Calendars are persistent
        parentId: null,
        childIds: []
      },
      "note": {
        type: "note",
        text: "New Note",
        content: "",
        format: "markdown",
        completed: false,
        persistent: true,
        parentId: null,
        childIds: []
      },
      "text": {
        type: "text",
        text: "New Text",
        completed: false,
        repeats: true,
        parentId: null,
        childIds: []
      }
    };
    return templates[type] || templates["task"];
  }
  toggleElement(pageId, binId, elementIndex, subtaskIndex = null, itemIndex = null) {
    let actualPageId = pageId;
    let actualBinId = binId;
    let actualElementIndex = elementIndex;
    let childIndex = null;
    if (typeof elementIndex === "string" && elementIndex.includes("-")) {
      const parts = elementIndex.split("-");
      actualElementIndex = parseInt(parts[0]);
      childIndex = parseInt(parts[1]);
    }
    const document2 = this.appState.documents.find((p) => p.id === actualPageId);
    if (!document2) return;
    const group = document2.groups?.find((b) => b.id === actualBinId);
    if (!group) return;
    const items = group.items || [];
    group.items = items;
    const element = items[actualElementIndex];
    if (!element) return;
    const itemIndexMap = ItemHierarchy.buildItemIndex(items);
    if (childIndex !== null) {
      const childItems = ItemHierarchy.getChildItems(element, itemIndexMap);
      const child = childItems[childIndex];
      if (!child) {
        return;
      }
      const oldValue = child.completed;
      child.completed = !child.completed;
      element.completed = childItems.every((ch) => ch.completed);
      if (this.undoRedoManager) {
        this.undoRedoManager.recordElementPropertyChange(pageId, binId, actualElementIndex, "completed", child.completed, oldValue, childIndex);
        this.undoRedoManager.recordElementPropertyChange(pageId, binId, actualElementIndex, "completed", element.completed, !element.completed);
      }
    } else if (itemIndex !== null && element.items) {
      const oldItemValue = element.items[itemIndex].completed;
      element.items[itemIndex].completed = !element.items[itemIndex].completed;
      const oldElementValue = element.completed;
      element.completed = element.items.every((item) => item.completed);
      if (this.undoRedoManager) {
        this.undoRedoManager.recordElementPropertyChange(pageId, binId, actualElementIndex, "completed", element.items[itemIndex].completed, oldItemValue, null, itemIndex);
        this.undoRedoManager.recordElementPropertyChange(pageId, binId, actualElementIndex, "completed", element.completed, oldElementValue);
      }
    } else if (subtaskIndex !== null) {
      if (element.subtasks && element.subtasks[subtaskIndex]) {
        const oldValue = element.subtasks[subtaskIndex].completed;
        element.subtasks[subtaskIndex].completed = !element.subtasks[subtaskIndex].completed;
        element.completed = element.subtasks.every((st) => st.completed);
        if (this.undoRedoManager) {
          this.undoRedoManager.recordElementPropertyChange(pageId, binId, actualElementIndex, "completed", element.subtasks[subtaskIndex].completed, oldValue, subtaskIndex);
          this.undoRedoManager.recordElementPropertyChange(pageId, binId, actualElementIndex, "completed", element.completed, !element.completed);
        }
      } else {
        const childItems = ItemHierarchy.getChildItems(element, itemIndexMap);
        if (!childItems[subtaskIndex]) {
          return;
        }
        const oldValue = childItems[subtaskIndex].completed;
        childItems[subtaskIndex].completed = !childItems[subtaskIndex].completed;
        element.completed = childItems.every((ch) => ch.completed);
        if (this.undoRedoManager) {
          this.undoRedoManager.recordElementPropertyChange(pageId, binId, actualElementIndex, "completed", childItems[subtaskIndex].completed, oldValue, subtaskIndex);
          this.undoRedoManager.recordElementPropertyChange(pageId, binId, actualElementIndex, "completed", element.completed, !element.completed);
        }
      }
    } else {
      const wasChecked = element.completed;
      const oldValue = element.completed;
      element.completed = !element.completed;
      if (this.undoRedoManager) {
        this.undoRedoManager.recordElementPropertyChange(pageId, binId, actualElementIndex, "completed", element.completed, oldValue);
      }
      const childItems = ItemHierarchy.getChildItems(element, itemIndexMap);
      childItems.forEach((child, idx) => {
        if (child.repeats !== false) {
          const oldChildValue = child.completed;
          child.completed = element.completed;
          if (this.undoRedoManager && oldChildValue !== child.completed) {
            this.undoRedoManager.recordElementPropertyChange(pageId, binId, actualElementIndex, "completed", child.completed, oldChildValue, idx);
          }
        }
      });
      if (element.subtasks) {
        element.subtasks.forEach((st, idx) => {
          if (st.repeats !== false) {
            const oldSubtaskValue = st.completed;
            st.completed = element.completed;
            if (this.undoRedoManager && oldSubtaskValue !== st.completed) {
              this.undoRedoManager.recordElementPropertyChange(pageId, binId, actualElementIndex, "completed", st.completed, oldSubtaskValue, idx);
            }
          }
        });
      }
      if (element.completed && !wasChecked) {
        eventBus.emit(EVENTS.ELEMENT.COMPLETED, {
          pageId: actualPageId,
          binId: actualBinId,
          documentId: actualPageId,
          groupId: actualBinId,
          elementIndex: actualElementIndex,
          element
        });
      }
      eventBus.emit(EVENTS.ELEMENT.UPDATED, {
        pageId: actualPageId,
        binId: actualBinId,
        documentId: actualPageId,
        groupId: actualBinId,
        elementIndex: actualElementIndex,
        element
      });
      if (element.completed && !wasChecked) {
        this.updateTrackers(actualPageId, actualBinId, actualElementIndex, true);
      } else {
        this.updateTrackers(actualPageId, actualBinId);
      }
    }
    eventBus.emit(EVENTS.DATA.SAVE_REQUESTED);
    eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
  }
  updateTrackers(pageId, binId, toggledElementIndex = null, wasChecked = false) {
    const document2 = this.appState.documents.find((p) => p.id === pageId);
    if (!document2) return;
    const group = document2.groups?.find((b) => b.id === binId);
    if (!group) return;
    const items = group.items || [];
    group.items = items;
    const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    items.forEach((trackerElement, trackerIdx) => {
      if (trackerElement.type === "tracker") {
        if (trackerElement.mode === "daily") {
          if (!trackerElement.dailyCompletions) trackerElement.dailyCompletions = {};
          if (!trackerElement.dailyCompletions[today]) {
            trackerElement.dailyCompletions[today] = {};
          }
          if (toggledElementIndex !== null && wasChecked) {
            const elementKey = `${pageId}-${binId}-${toggledElementIndex}`;
            if (!trackerElement.dailyCompletions[today][elementKey]) {
              trackerElement.dailyCompletions[today][elementKey] = true;
            }
          }
          const todayCount = Object.keys(trackerElement.dailyCompletions[today] || {}).length;
          trackerElement.dailyCompletions[today]._count = todayCount;
        } else if (trackerElement.mode === "page") {
          let uniqueCount = 0;
          items.forEach((el, elIdx) => {
            if (el.completed && el.type !== "tracker") {
              uniqueCount++;
            }
          });
          if (!trackerElement.pageCompletions) trackerElement.pageCompletions = {};
          trackerElement.pageCompletions.count = uniqueCount;
        }
      }
    });
  }
  addMultiCheckboxItem(pageId, binId, elementIndex) {
    const document2 = this.appState.documents.find((p) => p.id === pageId);
    if (!document2) return;
    const group = document2.groups?.find((b) => b.id === binId);
    if (!group) return;
    const items = group.items || [];
    group.items = items;
    const element = items[elementIndex];
    if (element && element.items) {
      const newItem = {
        text: "New item",
        completed: false,
        funModifier: ""
      };
      element.items.length;
      element.items.push(newItem);
      if (this.undoRedoManager) {
        const path = this.undoRedoManager.getElementPath(pageId, binId, elementIndex);
        if (path) {
          path.push("items");
          const change = this.undoRedoManager.createChange("add", path, newItem, null);
          change.changeId = `${Date.now()}-${Math.random()}`;
          this.undoRedoManager.recordChange(change);
        }
      }
      this.dataManager.saveData();
      eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
    }
  }
  removeMultiCheckboxItem(pageId, binId, elementIndex, itemIndex) {
    const document2 = this.appState.documents.find((p) => p.id === pageId);
    if (!document2) return;
    const group = document2.groups?.find((b) => b.id === binId);
    if (!group) return;
    const items = group.items || [];
    group.items = items;
    const element = items[elementIndex];
    if (element && element.items && element.items.length > 1) {
      const removedItem = element.items[itemIndex];
      const oldCompleted = element.completed;
      element.items.splice(itemIndex, 1);
      element.completed = element.items.length > 0 && element.items.every((item) => item.completed);
      if (this.undoRedoManager) {
        const path = this.undoRedoManager.getElementPath(pageId, binId, elementIndex);
        if (path) {
          path.push("items");
          path.push(itemIndex);
          const change = this.undoRedoManager.createChange("delete", path, null, removedItem);
          change.changeId = `${Date.now()}-${Math.random()}`;
          this.undoRedoManager.recordChange(change);
          if (oldCompleted !== element.completed) {
            this.undoRedoManager.recordElementPropertyChange(pageId, binId, elementIndex, "completed", element.completed, oldCompleted);
          }
        }
      }
      this.dataManager.saveData();
      eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
    }
  }
  addElementAfter(pageId, binId, elementIndex, elementType) {
    const document2 = this.appState.documents.find((p) => p.id === pageId);
    if (!document2) return;
    const group = document2.groups?.find((b) => b.id === binId);
    if (!group) return;
    const items = group.items || [];
    group.items = items;
    const newElement = this.createElementTemplate(elementType);
    newElement.parentId = null;
    newElement.childIds = Array.isArray(newElement.childIds) ? newElement.childIds : [];
    if (!newElement.id) {
      newElement.id = `element-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    if (!group.items) group.items = items;
    const insertIndex = elementIndex + 1;
    group.items.splice(insertIndex, 0, newElement);
    if (this.undoRedoManager) {
      this.undoRedoManager.recordElementAdd(pageId, binId, insertIndex, newElement);
    }
    eventBus.emit(EVENTS.DATA.SAVE_REQUESTED);
    eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
  }
}
class DragDropHandler {
  constructor() {
  }
  /**
   * Get services
   */
  _getAppState() {
    return getService(SERVICES.APP_STATE);
  }
  _getDocument(pageId) {
    const appState2 = this._getAppState();
    return appState2.documents?.find((page) => page.id === pageId) || null;
  }
  _getGroup(pageId, binId) {
    const document2 = this._getDocument(pageId);
    const group = document2?.groups?.find((bin) => bin.id === binId) || null;
    if (!group) return null;
    const items = group.items || [];
    group.items = items;
    return group;
  }
  _getUndoRedoManager() {
    return getService(SERVICES.UNDO_REDO_MANAGER);
  }
  _getDataManager() {
    return getService(SERVICES.DATA_MANAGER);
  }
  _getFormatRendererManager() {
    return getService(SERVICES.FORMAT_RENDERER_MANAGER);
  }
  _getRenderer() {
    return getService(SERVICES.RENDERER);
  }
  _getRootItems(items) {
    return ItemHierarchy.getRootItems(items);
  }
  _getRootItemAtIndex(items, elementIndex) {
    return ItemHierarchy.getRootItemAtIndex(items, elementIndex);
  }
  _getFlatInsertIndex(items, rootIndex) {
    if (rootIndex <= 0) return 0;
    let seenRoots = 0;
    for (let i = 0; i < items.length; i++) {
      if (!items[i]?.parentId) {
        if (seenRoots === rootIndex) {
          return i;
        }
        seenRoots += 1;
      }
    }
    return items.length;
  }
  _getChildItemsForGroup(group, parentElement) {
    const itemIndex = ItemHierarchy.buildItemIndex(group?.items || []);
    return ItemHierarchy.getChildItems(parentElement, itemIndex);
  }
  _getChildItemForGroup(group, parentElement, childIndex) {
    const children = this._getChildItemsForGroup(group, parentElement);
    return children[childIndex] || null;
  }
  _getDescendantIds(item, itemIndex) {
    const descendants = [];
    const walk = (node) => {
      const children = ItemHierarchy.getChildItems(node, itemIndex);
      children.forEach((child) => {
        descendants.push(child.id);
        walk(child);
      });
    };
    walk(item);
    return descendants;
  }
  _removeItemsByIds(items, ids) {
    const idSet = ids instanceof Set ? ids : new Set(ids);
    return (items || []).filter((item) => !idSet.has(item.id));
  }
  _getItemsByIds(items, ids) {
    const idSet = ids instanceof Set ? ids : new Set(ids);
    return (items || []).filter((item) => idSet.has(item.id));
  }
  moveElement(sourcePageId, sourceBinId, sourceElementIndex, targetPageId, targetBinId, targetElementIndex, isChild = false, parentElementIndex = null, childIndex = null) {
    const appState2 = this._getAppState();
    const sourcePage = appState2.documents.find((p) => p.id === sourcePageId);
    if (!sourcePage) {
      console.error("Source page not found:", sourcePageId);
      return;
    }
    const sourceBin = sourcePage.groups?.find((b) => b.id === sourceBinId);
    if (!sourceBin) {
      console.error("Source bin not found:", sourceBinId);
      return;
    }
    let sourceItems = sourceBin.items || [];
    sourceBin.items = sourceItems;
    const sourceRootItems = this._getRootItems(sourceItems);
    const sourceItemIndex = ItemHierarchy.buildItemIndex(sourceItems);
    let element;
    if (isChild && parentElementIndex !== null && childIndex !== null) {
      const parentElement = this._getRootItemAtIndex(sourceItems, parentElementIndex);
      const childItems = parentElement ? ItemHierarchy.getChildItems(parentElement, sourceItemIndex) : [];
      if (!parentElement || !childItems[childIndex]) {
        console.error("Source child element not found:", childIndex, "in parent", parentElementIndex);
        return;
      }
      element = childItems[childIndex];
      if (!Array.isArray(parentElement.childIds)) {
        parentElement.childIds = [];
      }
      parentElement.childIds.splice(childIndex, 1);
      element.parentId = null;
    } else {
      if (!sourceRootItems[sourceElementIndex]) {
        console.error("Source element not found:", sourceElementIndex, "in bin", sourceBinId);
        return;
      }
      element = sourceRootItems[sourceElementIndex];
    }
    const descendantIds = this._getDescendantIds(element, sourceItemIndex);
    const movingIds = /* @__PURE__ */ new Set([element.id, ...descendantIds]);
    const movingItems = this._getItemsByIds(sourceItems, movingIds);
    sourceItems = this._removeItemsByIds(sourceItems, movingIds);
    sourceBin.items = sourceItems;
    const targetPage = appState2.documents.find((p) => p.id === targetPageId);
    if (!targetPage) {
      console.error("Target page not found:", targetPageId);
      if (isChild && parentElementIndex !== null) {
        const parentElement = this._getRootItemAtIndex(sourceItems, parentElementIndex);
        if (parentElement) {
          if (!Array.isArray(parentElement.childIds)) parentElement.childIds = [];
          parentElement.childIds.splice(childIndex, 0, element.id);
          element.parentId = parentElement.id;
        }
        const insertIndex = this._getFlatInsertIndex(sourceItems, sourceElementIndex);
        sourceItems.splice(insertIndex, 0, ...movingItems);
      } else {
        const insertIndex = this._getFlatInsertIndex(sourceItems, sourceElementIndex);
        sourceItems.splice(insertIndex, 0, ...movingItems);
      }
      sourceBin.items = sourceItems;
      return;
    }
    const targetBin = targetPage.groups?.find((b) => b.id === targetBinId);
    if (!targetBin) {
      console.error("Target bin not found:", targetBinId);
      if (isChild && parentElementIndex !== null) {
        const parentElement = this._getRootItemAtIndex(sourceItems, parentElementIndex);
        if (parentElement) {
          if (!Array.isArray(parentElement.childIds)) parentElement.childIds = [];
          parentElement.childIds.splice(childIndex, 0, element.id);
          element.parentId = parentElement.id;
        }
        const insertIndex = this._getFlatInsertIndex(sourceItems, sourceElementIndex);
        sourceItems.splice(insertIndex, 0, ...movingItems);
      } else {
        const insertIndex = this._getFlatInsertIndex(sourceItems, sourceElementIndex);
        sourceItems.splice(insertIndex, 0, ...movingItems);
      }
      sourceBin.items = sourceItems;
      return;
    }
    const targetItems = targetBin.items || [];
    targetBin.items = targetItems;
    let adjustedTargetIndex = targetElementIndex;
    if (isChild && parentElementIndex !== null) ;
    else if (!isChild && sourcePageId === targetPageId && sourceBinId === targetBinId) {
      if (sourceElementIndex < targetElementIndex) {
        adjustedTargetIndex = targetElementIndex;
      } else {
        adjustedTargetIndex = targetElementIndex;
      }
    }
    const maxValidIndex = targetItems.length;
    adjustedTargetIndex = Math.max(0, Math.min(adjustedTargetIndex, maxValidIndex));
    if (isChild && parentElementIndex !== null && targetElementIndex === parentElementIndex + 1) {
      if (adjustedTargetIndex !== targetElementIndex && adjustedTargetIndex === parentElementIndex) {
        adjustedTargetIndex = targetItems.length;
      }
    }
    let oldPosition = null;
    if (isChild && parentElementIndex !== null) {
      const parentElement = document.querySelector(`[data-page-id="${sourcePageId}"][data-bin-id="${sourceBinId}"][data-element-index="${parentElementIndex}"]`);
      if (parentElement) {
        const childElement = parentElement.querySelector(`[data-child-index="${childIndex}"]`);
        if (childElement) {
          const rect = childElement.getBoundingClientRect();
          oldPosition = { top: rect.top, left: rect.left };
        }
      }
    } else {
      const sourceElement = document.querySelector(`[data-page-id="${sourcePageId}"][data-bin-id="${sourceBinId}"][data-element-index="${sourceElementIndex}"]:not([data-is-child="true"])`);
      if (sourceElement) {
        const rect = sourceElement.getBoundingClientRect();
        oldPosition = { top: rect.top, left: rect.left };
      }
    }
    const insertFlatIndex = this._getFlatInsertIndex(targetItems, adjustedTargetIndex);
    targetItems.splice(insertFlatIndex, 0, ...movingItems);
    targetBin.items = targetItems;
    const undoRedoManager = this._getUndoRedoManager();
    if (undoRedoManager) {
      if (isChild && parentElementIndex !== null) {
        undoRedoManager.recordElementMove(
          sourcePageId,
          sourceBinId,
          parentElementIndex,
          // Source (parent position)
          targetPageId,
          targetBinId,
          adjustedTargetIndex,
          // Target
          JSON.parse(JSON.stringify(element))
        );
      } else {
        undoRedoManager.recordElementMove(
          sourcePageId,
          sourceBinId,
          sourceElementIndex,
          targetPageId,
          targetBinId,
          adjustedTargetIndex,
          JSON.parse(JSON.stringify(element))
        );
      }
    }
    const elementText = element.text ? element.text.substring(0, 50) : "";
    const elementType = element.type || "unknown";
    const elementId = `${targetPageId}-${targetBinId}-${adjustedTargetIndex}-${elementType}-${elementText}`;
    appState2.lastMovedElement = {
      pageId: targetPageId,
      binId: targetBinId,
      elementIndex: adjustedTargetIndex,
      element,
      uniqueId: elementId,
      oldPageId: sourcePageId,
      oldBinId: sourceBinId,
      oldElementIndex: sourceElementIndex,
      oldPosition
      // Store the captured old position
    };
    const resultBin = this._getGroup(targetPageId, targetBinId);
    const resultElement = resultBin ? this._getRootItemAtIndex(resultBin.items, adjustedTargetIndex) : null;
    resultElement?.text || "N/A";
    if (isChild && parentElementIndex !== null) {
      const sourceBin2 = this._getGroup(sourcePageId, sourceBinId);
      const parentElement = sourceBin2 ? this._getRootItemAtIndex(sourceBin2.items, parentElementIndex) : null;
      if (parentElement) {
        const childrenCount = parentElement.childIds?.length || 0;
        `${childrenCount} child${childrenCount !== 1 ? "ren" : ""} (${parentElement.childIds ? "ids exist" : "no ids"})`;
      }
    }
    const dataManager = this._getDataManager();
    if (dataManager) {
      dataManager.saveData();
    }
    const formatRendererManager = this._getFormatRendererManager();
    const pageFormat = formatRendererManager?.getPageFormat(targetPageId);
    if (pageFormat) {
      const renderer = this._getRenderer();
      if (renderer && renderer.getRenderer) {
        renderer.getRenderer()._preservingFormat = true;
      }
    }
    requestAnimationFrame(() => {
      eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
    });
  }
  reorderChildElement(pageId, binId, parentElementIndex, sourceChildIndex, targetChildIndex) {
    const document2 = this._getDocument(pageId);
    if (!document2) {
      console.error("Page not found:", pageId);
      return;
    }
    const bin = this._getGroup(pageId, binId);
    if (!bin) {
      console.error("Bin not found:", binId);
      return;
    }
    const parentElement = this._getRootItemAtIndex(bin.items, parentElementIndex);
    if (!parentElement || !Array.isArray(parentElement.childIds) || !parentElement.childIds[sourceChildIndex]) {
      console.error("Parent element or child not found:", parentElementIndex, sourceChildIndex);
      return;
    }
    const childId = parentElement.childIds.splice(sourceChildIndex, 1)[0];
    let adjustedTargetIndex = targetChildIndex;
    if (sourceChildIndex < targetChildIndex) {
      adjustedTargetIndex -= 1;
    }
    adjustedTargetIndex = Math.max(0, Math.min(adjustedTargetIndex, parentElement.childIds.length));
    parentElement.childIds.splice(adjustedTargetIndex, 0, childId);
    const undoRedoManager = this._getUndoRedoManager();
    if (undoRedoManager) {
      const itemIndex = ItemHierarchy.buildItemIndex(bin.items);
      const childElement = itemIndex[childId];
      undoRedoManager.recordChildReorder(
        pageId,
        binId,
        parentElementIndex,
        sourceChildIndex,
        adjustedTargetIndex,
        JSON.parse(JSON.stringify(childElement))
      );
    }
    parentElement?.text || "N/A";
    const dataManager = this._getDataManager();
    if (dataManager) {
      dataManager.saveData();
    }
    const formatRendererManager = this._getFormatRendererManager();
    const pageFormat = formatRendererManager?.getPageFormat(pageId);
    if (pageFormat) {
      const renderer = this._getRenderer();
      if (renderer && renderer.getRenderer) {
        renderer.getRenderer()._preservingFormat = true;
      }
    }
    requestAnimationFrame(() => {
      eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
    });
  }
  nestElement(sourcePageId, sourceBinId, sourceElementIndex, targetPageId, targetBinId, targetElementIndex, isChild = false, parentElementIndex = null, childIndex = null, elementToNest = null) {
    const sourcePage = this._getDocument(sourcePageId);
    if (!sourcePage) {
      console.error("Source page not found:", sourcePageId);
      return;
    }
    const sourceBin = this._getGroup(sourcePageId, sourceBinId);
    if (!sourceBin) {
      console.error("Source bin not found:", sourceBinId);
      return;
    }
    const sourceItems = sourceBin.items || [];
    sourceBin.items = sourceItems;
    const targetPage = this._getDocument(targetPageId);
    if (!targetPage) {
      console.error("Target page not found:", targetPageId);
      return;
    }
    const targetBin = this._getGroup(targetPageId, targetBinId);
    if (!targetBin) {
      console.error("Target bin not found:", targetBinId);
      return;
    }
    const targetItems = targetBin.items || [];
    targetBin.items = targetItems;
    const sourceRootItems = this._getRootItems(sourceItems);
    const targetRootItems = this._getRootItems(targetItems);
    const sourceItemIndex = ItemHierarchy.buildItemIndex(sourceItems);
    const targetItemIndex = ItemHierarchy.buildItemIndex(targetItems);
    const isSameGroup = sourcePageId === targetPageId && sourceBinId === targetBinId;
    if (!targetRootItems[targetElementIndex]) {
      console.error("Target item not found:", targetElementIndex, "in bin", targetBinId);
      return;
    }
    let element;
    let sourceParentText = "N/A";
    if (elementToNest) {
      element = elementToNest;
      element.text || "N/A";
    } else if (isChild && parentElementIndex !== null && childIndex !== null) {
      const parentElement = this._getRootItemAtIndex(sourceItems, parentElementIndex);
      if (!parentElement) {
        console.error("Source parent element not found at index:", parentElementIndex, "in bin", sourceBinId);
        console.error("Available items:", sourceItems.map((e, i) => `${i}: "${e.text || "N/A"}"`).join(", "));
        return;
      }
      sourceParentText = parentElement.text || "N/A";
      const childElement = this._getChildItemForGroup(sourceBin, parentElement, childIndex);
      if (!childElement) {
        console.error("Source child element not found:", {
          childIndex,
          parentIndex: parentElementIndex,
          parentText: sourceParentText,
          childrenCount: parentElement.childIds?.length || 0,
          availableChildren: parentElement.childIds?.map((id, i) => `${i}: "${sourceItemIndex[id]?.text || "N/A"}"`).join(", ") || "none"
        });
        return;
      }
      element = childElement;
      element.text || "N/A";
      if (!Array.isArray(parentElement.childIds)) {
        parentElement.childIds = [];
      }
      parentElement.childIds.splice(childIndex, 1);
      element.parentId = null;
    } else {
      if (!sourceRootItems[sourceElementIndex]) {
        console.error("Source element not found:", sourceElementIndex, "in bin", sourceBinId);
        console.error("Available items:", sourceItems.map((e, i) => `${i}: "${e.text || "N/A"}"`).join(", "));
        return;
      }
      element = sourceRootItems[sourceElementIndex];
      element.text || "N/A";
    }
    const descendantIds = this._getDescendantIds(element, sourceItemIndex);
    const movingIds = /* @__PURE__ */ new Set([element.id, ...descendantIds]);
    let movingItems = this._getItemsByIds(sourceItems, movingIds);
    if (movingItems.length === 0) {
      movingItems = [element];
    }
    if (!isSameGroup) {
      sourceItems = this._removeItemsByIds(sourceItems, movingIds);
      sourceBin.items = sourceItems;
    }
    const restoreToSource = () => {
      if (!isSameGroup) {
        const insertIndex = this._getFlatInsertIndex(sourceItems, sourceElementIndex);
        sourceItems.splice(insertIndex, 0, ...movingItems);
        sourceBin.items = sourceItems;
      }
    };
    let adjustedTargetElementIndex = targetElementIndex;
    if (!isChild && sourcePageId === targetPageId && sourceBinId === targetBinId && sourceElementIndex < targetElementIndex) {
      adjustedTargetElementIndex = targetElementIndex - 1;
    }
    const targetElement = targetRootItems[adjustedTargetElementIndex];
    if (!targetElement) {
      console.error("Target element not found at index:", targetElementIndex, "in bin", targetBinId);
      console.error("Available items:", targetItems.map((e, i) => `${i}: "${e.text || "N/A"}"`).join(", "));
      if (isChild && parentElementIndex !== null) {
        const parentElement = this._getRootItemAtIndex(sourceItems, parentElementIndex);
        if (parentElement) {
          if (!Array.isArray(parentElement.childIds)) parentElement.childIds = [];
          parentElement.childIds.splice(childIndex, 0, element.id);
          element.parentId = parentElement.id;
        }
      }
      restoreToSource();
      return;
    }
    if (!elementToNest && !isChild && sourcePageId === targetPageId && sourceBinId === targetBinId) {
      const targetElementForCheck = targetRootItems[adjustedTargetElementIndex];
      if (element && targetElementForCheck && element === targetElementForCheck) {
        console.error("Cannot nest: cannot nest element into itself");
        if (!sourceItems[sourceElementIndex]) {
          sourceItems.splice(sourceElementIndex, 0, element);
        }
        return;
      }
    }
    if (isChild && sourcePageId === targetPageId && sourceBinId === targetBinId) {
      const actualParentIndex = parentElementIndex !== null ? parentElementIndex : sourceElementIndex;
      if (actualParentIndex === adjustedTargetElementIndex) {
        console.error("Cannot nest: cannot nest a child into its own parent");
        const parentElement = this._getRootItemAtIndex(sourceItems, actualParentIndex);
        if (parentElement) {
          if (!Array.isArray(parentElement.childIds)) parentElement.childIds = [];
          parentElement.childIds.splice(childIndex, 0, element.id);
          element.parentId = parentElement.id;
        }
        restoreToSource();
        return;
      }
    }
    const isDescendant = (parent, child, itemIndex) => {
      const children = ItemHierarchy.getChildItems(parent, itemIndex);
      for (const c of children) {
        if (c === child) {
          return true;
        }
        if (isDescendant(c, child, itemIndex)) {
          return true;
        }
      }
      return false;
    };
    if (isDescendant(element, targetElement, targetItemIndex)) {
      console.error("Cannot nest: target is a descendant of source (circular nesting prevented)");
      if (isChild && parentElementIndex !== null) {
        const parentElement = this._getRootItemAtIndex(sourceItems, parentElementIndex);
        if (parentElement) {
          if (!Array.isArray(parentElement.childIds)) parentElement.childIds = [];
          parentElement.childIds.splice(childIndex, 0, element.id);
          element.parentId = parentElement.id;
        }
      }
      restoreToSource();
      return;
    }
    if (Array.isArray(targetElement.childIds) && targetElement.childIds.length > 0) {
      const targetChildren = ItemHierarchy.getChildItems(targetElement, targetItemIndex);
      const hasNestedChildren = targetChildren.some((child) => (child.childIds || []).length > 0);
      if (hasNestedChildren) {
        console.error("Cannot nest: target has children with their own children (one-level limit enforced)");
        if (isChild && parentElementIndex !== null) {
          const parentElement = this._getRootItemAtIndex(sourceItems, parentElementIndex);
          if (parentElement) {
            if (!Array.isArray(parentElement.childIds)) parentElement.childIds = [];
            parentElement.childIds.splice(childIndex, 0, element.id);
            element.parentId = parentElement.id;
          }
        }
        restoreToSource();
        return;
      }
    }
    if (!Array.isArray(targetElement.childIds)) {
      targetElement.childIds = [];
    }
    targetElement.childIds.push(element.id);
    element.parentId = targetElement.id;
    if (!isSameGroup) {
      const targetFlatIndex = targetItems.findIndex((item) => item.id === targetElement.id);
      const insertAt = targetFlatIndex === -1 ? targetItems.length : targetFlatIndex + 1;
      targetItems.splice(insertAt, 0, ...movingItems);
      targetBin.items = targetItems;
    }
    const resultElement = targetRootItems[adjustedTargetElementIndex];
    resultElement?.text || "N/A";
    const dataManager = this._getDataManager();
    if (dataManager) {
      dataManager.saveData();
    }
    const formatRendererManager = this._getFormatRendererManager();
    const pageFormat = formatRendererManager?.getPageFormat(targetPageId);
    if (pageFormat) {
      const renderer = this._getRenderer();
      if (renderer && renderer.getRenderer) {
        renderer.getRenderer()._preservingFormat = true;
      }
    }
    requestAnimationFrame(() => {
      eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
    });
  }
  /**
   * Set up trash icon drag and drop handlers
   */
  setupTrashIcon() {
    const trashIcon = document.getElementById("trash-icon");
    if (!trashIcon) return;
    trashIcon.style.display = "none";
    if (trashIcon._handlersSetup) return;
    trashIcon._handlersSetup = true;
    trashIcon.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = "move";
      trashIcon.classList.add("drag-over-trash");
      trashIcon.style.background = "rgba(220, 53, 69, 1)";
      trashIcon.style.transform = "scale(1.2)";
    });
    trashIcon.addEventListener("dragleave", (e) => {
      e.preventDefault();
      e.stopPropagation();
      trashIcon.classList.remove("drag-over-trash");
      trashIcon.style.background = "rgba(220, 53, 69, 0.9)";
      trashIcon.style.transform = "scale(1)";
    });
    trashIcon.addEventListener("drop", (e) => {
      e.preventDefault();
      e.stopPropagation();
      trashIcon.classList.remove("drag-over-trash");
      trashIcon.style.background = "rgba(220, 53, 69, 0.9)";
      trashIcon.style.transform = "scale(1)";
      trashIcon.style.display = "none";
      const appState2 = this._getAppState();
      const dragData = appState2.dragData;
      if (!dragData) return;
      if (dragData.type === "element") {
        const bin = this._getGroup(dragData.pageId, dragData.binId);
        if (bin) {
          const items = bin.items || [];
          bin.items = items;
          const rootItems = this._getRootItems(items);
          if (dragData.isChild && dragData.parentElementIndex !== null && dragData.childIndex !== null) {
            const parentElement = this._getRootItemAtIndex(items, dragData.parentElementIndex);
            if (parentElement && Array.isArray(parentElement.childIds)) {
              const childId = parentElement.childIds[dragData.childIndex];
              const itemIndex = ItemHierarchy.buildItemIndex(items);
              const deletedChild = childId ? itemIndex[childId] : null;
              const undoRedoManager = this._getUndoRedoManager();
              if (undoRedoManager && deletedChild) {
                const path = undoRedoManager.getElementPath(dragData.pageId, dragData.binId, dragData.parentElementIndex, dragData.childIndex);
                if (path) {
                  const change = undoRedoManager.createChange("delete", path, null, deletedChild);
                  change.changeId = `${Date.now()}-${Math.random()}`;
                  undoRedoManager.recordChange(change);
                }
              }
              parentElement.childIds.splice(dragData.childIndex, 1);
              if (deletedChild) {
                const descendantIds = this._getDescendantIds(deletedChild, itemIndex);
                const removeIds = /* @__PURE__ */ new Set([deletedChild.id, ...descendantIds]);
                items = this._removeItemsByIds(items, removeIds);
                bin.items = items;
              }
            }
          } else {
            const deletedElement = rootItems[dragData.elementIndex];
            const undoRedoManager = this._getUndoRedoManager();
            if (undoRedoManager && deletedElement) {
              undoRedoManager.recordElementDelete(dragData.pageId, dragData.binId, dragData.elementIndex, deletedElement);
            }
            if (deletedElement) {
              const itemIndex = ItemHierarchy.buildItemIndex(items);
              const descendantIds = this._getDescendantIds(deletedElement, itemIndex);
              const removeIds = /* @__PURE__ */ new Set([deletedElement.id, ...descendantIds]);
              items = this._removeItemsByIds(items, removeIds);
            }
            bin.items = items;
          }
          const dataManager = this._getDataManager();
          if (dataManager) {
            dataManager.saveData();
          }
          eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
        }
      } else if (dragData.type === "bin") {
        const binManager = getService(SERVICES.BIN_MANAGER);
        if (binManager) {
          binManager.deleteBin(dragData.pageId, dragData.binId);
        }
      } else if (dragData.type === "page") {
        if (appState2.documents.length > 1) {
          const pageManager = getService(SERVICES.PAGE_MANAGER);
          if (pageManager) {
            pageManager.deletePage(dragData.pageId);
          }
        }
      }
      appState2.dragData = null;
    });
  }
}
let ElementFinder$1 = class ElementFinder2 {
  /**
   * Find element by data attributes
   * @param {string} pageId - Page ID
   * @param {string} binId - Bin ID
   * @param {number} elementIndex - Element index
   * @param {HTMLElement} context - Optional context element (default: document)
   * @param {number} childIndex - Optional child index for nested elements
   * @returns {HTMLElement|null} Found element or null
   */
  static findElement(pageId, binId, elementIndex, context = document, childIndex = null) {
    let selector = `[data-page-id="${pageId}"][data-bin-id="${binId}"][data-element-index="${elementIndex}"]`;
    if (childIndex !== null && childIndex !== void 0) {
      selector += `[data-child-index="${childIndex}"]`;
    }
    return context.querySelector(selector);
  }
  /**
   * Find bin element by data attributes
   * @param {string} pageId - Page ID
   * @param {string} binId - Bin ID
   * @param {HTMLElement} context - Optional context element (default: document)
   * @returns {HTMLElement|null} Found bin element or null
   */
  static findBin(pageId, binId, context = document) {
    return context.querySelector(`[data-page-id="${pageId}"][data-bin-id="${binId}"].bin`);
  }
  /**
   * Find page element by data attributes
   * @param {string} pageId - Page ID
   * @param {HTMLElement} context - Optional context element (default: document)
   * @returns {HTMLElement|null} Found page element or null
   */
  static findPage(pageId, context = document) {
    return context.querySelector(`[data-page-id="${pageId}"].page`);
  }
  /**
   * Find all elements in a bin
   * @param {string} pageId - Page ID
   * @param {string} binId - Bin ID
   * @param {HTMLElement} context - Optional context element (default: document)
   * @returns {NodeList} List of element nodes
   */
  static findAllElements(pageId, binId, context = document) {
    return context.querySelectorAll(`[data-page-id="${pageId}"][data-bin-id="${binId}"][data-element-index]`);
  }
  /**
   * Find element by ID (searches data-element-id attribute)
   * @param {string} elementId - Element ID
   * @param {HTMLElement} context - Optional context element (default: document)
   * @returns {HTMLElement|null} Found element or null
   */
  static findElementById(elementId, context = document) {
    return context.querySelector(`[data-element-id="${elementId}"]`);
  }
  /**
   * Find all elements of a specific type
   * @param {string} elementType - Element type
   * @param {HTMLElement} context - Optional context element (default: document)
   * @returns {NodeList} List of element nodes
   */
  static findAllByType(elementType, context = document) {
    return context.querySelectorAll(`.element.${elementType}`);
  }
  /**
   * Find element by text content (fuzzy search)
   * @param {string} text - Text to search for
   * @param {HTMLElement} context - Optional context element (default: document)
   * @param {boolean} exact - Whether to match exactly (default: false)
   * @returns {HTMLElement|null} Found element or null
   */
  static findElementByText(text, context = document, exact = false) {
    const elements = context.querySelectorAll(".element");
    for (const element of elements) {
      const elementText = element.textContent || element.innerText || "";
      if (exact) {
        if (elementText.trim() === text.trim()) {
          return element;
        }
      } else {
        if (elementText.toLowerCase().includes(text.toLowerCase())) {
          return element;
        }
      }
    }
    return null;
  }
  /**
   * Find closest element with data attributes
   * @param {HTMLElement} element - Starting element
   * @param {Object} dataAttrs - Data attributes to match
   * @returns {HTMLElement|null} Found element or null
   */
  static findClosestWithData(element, dataAttrs) {
    if (!element) return null;
    let current = element;
    while (current && current !== document.body) {
      let matches = true;
      for (const [key, value] of Object.entries(dataAttrs)) {
        const dataKey = key.startsWith("data-") ? key.slice(5) : key;
        if (current.dataset[dataKey] !== String(value)) {
          matches = false;
          break;
        }
      }
      if (matches) {
        return current;
      }
      current = current.parentElement;
    }
    return null;
  }
  /**
   * Get element data attributes as object
   * @param {HTMLElement} element - Element to get data from
   * @returns {Object} Object with data attributes
   */
  static getElementData(element) {
    if (!element) return {};
    return {
      pageId: element.dataset.pageId,
      binId: element.dataset.binId,
      elementIndex: element.dataset.elementIndex ? parseInt(element.dataset.elementIndex) : null,
      childIndex: element.dataset.childIndex ? parseInt(element.dataset.childIndex) : null,
      elementId: element.dataset.elementId,
      dragType: element.dataset.dragType
    };
  }
};
class AudioHandler {
  constructor() {
  }
  /**
   * Get services
   */
  _getDataManager() {
    return getService(SERVICES.DATA_MANAGER);
  }
  _getFileManager() {
    return getService(SERVICES.FILE_MANAGER);
  }
  _getAppState() {
    return getService(SERVICES.APP_STATE);
  }
  _getGroup(pageId, binId) {
    const appState2 = this._getAppState();
    const page = appState2.documents?.find((p) => p.id === pageId);
    const bin = page?.groups?.find((b) => b.id === binId);
    if (!bin) return null;
    const items = bin.items || [];
    bin.items = items;
    return bin;
  }
  showAudioRecordingModal() {
    const modal = document.getElementById("audio-recording-modal");
    const startBtn = document.getElementById("audio-start-btn");
    const stopBtn = document.getElementById("audio-stop-btn");
    const statusDiv = document.getElementById("audio-recording-status");
    const timeDiv = document.getElementById("audio-recording-time");
    const previewAudio = document.getElementById("audio-preview");
    const saveControls = document.getElementById("audio-save-controls");
    const filenameInput = document.getElementById("audio-filename");
    statusDiv.textContent = "Ready to record";
    statusDiv.style.color = "#e0e0e0";
    startBtn.style.display = "block";
    stopBtn.style.display = "none";
    timeDiv.style.display = "none";
    previewAudio.style.display = "none";
    saveControls.style.display = "none";
    filenameInput.value = "";
    const appState2 = this._getAppState();
    appState2.audioChunks = [];
    const closeBtn = document.getElementById("audio-recording-close");
    closeBtn.onclick = () => {
      this.stopAudioRecording();
      this.closeAudioRecordingModal();
    };
    const existingHandler = modal._clickHandler;
    if (existingHandler) {
      modal.removeEventListener("click", existingHandler);
    }
    modal._clickHandler = (e) => {
      if (e.target.id === "audio-recording-modal") {
        this.stopAudioRecording();
        this.closeAudioRecordingModal();
      }
    };
    modal.addEventListener("click", modal._clickHandler);
    startBtn.onclick = () => {
      this.startAudioRecording();
    };
    stopBtn.onclick = () => {
      this.stopAudioRecording();
    };
    document.getElementById("audio-save-btn").onclick = () => {
      this.saveAudioRecording();
    };
    modal.classList.add("active");
  }
  async startAudioRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const appState2 = this._getAppState();
      appState2.mediaRecorder = new MediaRecorder(stream);
      appState2.audioChunks = [];
      appState2.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          appState2.audioChunks.push(event.data);
        }
      };
      appState2.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(appState2.audioChunks, { type: "audio/webm" });
        const audioUrl = URL.createObjectURL(audioBlob);
        const previewAudio = document.getElementById("audio-preview");
        previewAudio.src = audioUrl;
        previewAudio.style.display = "block";
        stream.getTracks().forEach((track) => track.stop());
      };
      appState2.mediaRecorder.start();
      appState2.recordingStartTime = Date.now();
      const startBtn = document.getElementById("audio-start-btn");
      const stopBtn = document.getElementById("audio-stop-btn");
      const statusDiv = document.getElementById("audio-recording-status");
      const timeDiv = document.getElementById("audio-recording-time");
      startBtn.style.display = "none";
      stopBtn.style.display = "block";
      statusDiv.textContent = "Recording...";
      statusDiv.style.color = "#ff5555";
      timeDiv.style.display = "block";
      appState2.recordingTimer = setInterval(() => {
        const elapsed = Math.floor((Date.now() - appState2.recordingStartTime) / 1e3);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        timeDiv.textContent = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
      }, 100);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      alert("Failed to access microphone. Please ensure microphone permissions are granted.");
    }
  }
  stopAudioRecording() {
    const appState2 = this._getAppState();
    if (appState2.mediaRecorder && appState2.mediaRecorder.state !== "inactive") {
      appState2.mediaRecorder.stop();
    }
    if (appState2.recordingTimer) {
      clearInterval(appState2.recordingTimer);
      appState2.recordingTimer = null;
    }
    const startBtn = document.getElementById("audio-start-btn");
    const stopBtn = document.getElementById("audio-stop-btn");
    const statusDiv = document.getElementById("audio-recording-status");
    const saveControls = document.getElementById("audio-save-controls");
    startBtn.style.display = "block";
    stopBtn.style.display = "none";
    statusDiv.textContent = "Recording stopped. Preview and save below.";
    statusDiv.style.color = "#4a9eff";
    saveControls.style.display = "block";
  }
  async saveAudioRecording() {
    const appState2 = this._getAppState();
    if (appState2.audioChunks.length === 0) {
      alert("No recording to save.");
      return;
    }
    const audioBlob = new Blob(appState2.audioChunks, { type: "audio/webm" });
    const filenameInput = document.getElementById("audio-filename");
    let filename = filenameInput.value.trim();
    if (!filename) {
      const timestamp = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-").slice(0, -5);
      filename = `recording-${timestamp}.webm`;
    } else {
      if (!filename.endsWith(".webm")) {
        filename += ".webm";
      }
    }
    const statusDiv = document.getElementById("audio-recording-status");
    statusDiv.textContent = "Saving...";
    try {
      const formData = new FormData();
      formData.append("audio", audioBlob, filename);
      const url = window.location.origin + "/save-audio";
      const response = await fetch(url, {
        method: "POST",
        body: formData
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      if (result.success) {
        statusDiv.textContent = `Saved as: ${filename}`;
        statusDiv.style.color = "#4a9eff";
        alert(`Audio saved successfully as: ${filename}`);
        setTimeout(() => {
          this.closeAudioRecordingModal();
        }, 2e3);
      } else {
        throw new Error(result.error || "Unknown error");
      }
    } catch (error) {
      statusDiv.textContent = "Failed to save audio: " + error.message;
      statusDiv.style.color = "#ff5555";
      alert("Failed to save audio: " + error.message);
    }
  }
  closeAudioRecordingModal() {
    this.stopAudioRecording();
    const modal = document.getElementById("audio-recording-modal");
    modal.classList.remove("active");
  }
  // Inline audio recording methods with binId support
  async startInlineRecording(pageId, binId, elementIndex, originalElementIndex = null, shouldOverwrite = false) {
    const audioKey = `${pageId}-${binId}-${elementIndex}`;
    const domElementIndex = originalElementIndex !== null ? originalElementIndex : elementIndex;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
      };
      recorder.onerror = (event) => {
      };
      recorder.start();
      const startTime = Date.now();
      const appState2 = this._getAppState();
      if (!appState2.inlineAudioRecorders) {
        appState2.inlineAudioRecorders = {};
      }
      appState2.inlineAudioRecorders[audioKey] = {
        recorder,
        chunks,
        startTime,
        timer: null,
        stream,
        domElementIndex,
        // Store original for DOM updates
        shouldOverwrite
        // Flag for overwrite mode
      };
      this.updateAudioStatus(pageId, binId, domElementIndex, "Recording...", "#ff5555");
    } catch (error) {
      alert("Failed to access microphone. Please ensure microphone permissions are granted.");
    }
  }
  async stopInlineRecording(pageId, binId, elementIndex, originalElementIndex = null) {
    const audioKey = `${pageId}-${binId}-${elementIndex}`;
    const domElementIndex = originalElementIndex !== null ? originalElementIndex : elementIndex;
    const appState2 = this._getAppState();
    const recorderData = appState2.inlineAudioRecorders?.[audioKey];
    if (recorderData && recorderData.recorder && recorderData.recorder.state !== "inactive") {
      recorderData.recorder.stop();
      if (recorderData.timer) {
        clearInterval(recorderData.timer);
      }
      await new Promise((resolve) => {
        recorderData.recorder.onstop = () => {
          resolve();
        };
      });
      const saveDomIndex = recorderData.domElementIndex || domElementIndex;
      await this.saveInlineRecording(pageId, binId, elementIndex, recorderData.chunks, saveDomIndex);
      delete appState2.inlineAudioRecorders[audioKey];
    }
  }
  async saveInlineRecording(pageId, binId, elementIndex, chunks, domElementIndex = null) {
    if (!chunks || chunks.length === 0) {
      alert("No recording to save.");
      return;
    }
    const appState2 = this._getAppState();
    const page = appState2.documents.find((p) => p.id === pageId);
    if (!page) {
      return;
    }
    const bin = page.groups?.find((b) => b.id === binId);
    if (!bin) {
      return;
    }
    const items = bin.items || [];
    bin.items = items;
    let element = items[elementIndex];
    if (!element) {
      element = items.find((el) => el.type === "audio");
      if (!element) {
        return;
      }
      elementIndex = items.indexOf(element);
    }
    const audioKey = `${pageId}-${binId}-${elementIndex}`;
    const recorderData = appState2.inlineAudioRecorders?.[audioKey];
    let audioBlob = new Blob(chunks, { type: "audio/webm" });
    let filename = element.audioFile;
    const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    if (recorderData && recorderData.shouldOverwrite && filename) ;
    else if (recorderData && recorderData.isAppend && recorderData.existingBlob) {
      const combinedChunks = [recorderData.existingBlob, audioBlob];
      audioBlob = new Blob(combinedChunks, { type: "audio/webm" });
    } else {
      const timestamp = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-").slice(0, -5);
      filename = `recording-${timestamp}.webm`;
    }
    try {
      const formData = new FormData();
      formData.append("audio", audioBlob, filename);
      const url = window.location.origin + "/save-audio";
      const response = await fetch(url, {
        method: "POST",
        body: formData
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      if (result.success) {
        element.audioFile = filename;
        element.date = today;
        const dataManager = this._getDataManager();
        if (dataManager) {
          dataManager.saveData();
        }
        const statusIndex = domElementIndex !== null ? domElementIndex : elementIndex;
        this.updateAudioStatus(pageId, binId, statusIndex, `File: ${filename} (${today})`, "#4a9eff");
        eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
      } else {
        throw new Error(result.error || "Unknown error");
      }
    } catch (error) {
      alert("Failed to save audio: " + error.message);
      const statusIndex = domElementIndex !== null ? domElementIndex : elementIndex;
      this.updateAudioStatus(pageId, binId, statusIndex, "Failed to save", "#ff5555");
    }
  }
  async appendInlineRecording(pageId, binId, elementIndex, originalElementIndex = null) {
    const domElementIndex = originalElementIndex !== null ? originalElementIndex : elementIndex;
    const audioKey = `${pageId}-${binId}-${elementIndex}`;
    const appState2 = this._getAppState();
    const page = appState2.documents.find((p) => p.id === pageId);
    if (!page) {
      return;
    }
    const bin = page.groups?.find((b) => b.id === binId);
    if (!bin) {
      return;
    }
    const items = bin.items || [];
    bin.items = items;
    const element = items[elementIndex];
    if (!element || !element.audioFile) {
      alert("No existing recording to append to.");
      return;
    }
    const existingFile = element.audioFile;
    try {
      const response = await fetch(`/saved_files/recordings/${existingFile}`);
      if (!response.ok) {
        throw new Error("Failed to load existing recording");
      }
      const existingBlob = await response.blob();
      await this.startInlineRecording(pageId, binId, elementIndex, domElementIndex, false);
      const appState3 = this._getAppState();
      if (appState3.inlineAudioRecorders?.[audioKey]) {
        appState3.inlineAudioRecorders[audioKey].isAppend = true;
        appState3.inlineAudioRecorders[audioKey].existingBlob = existingBlob;
      }
    } catch (error) {
      alert("Failed to load existing recording for appending.");
    }
  }
  async playInlineAudio(pageId, binId, elementIndex) {
    const audioKey = `${pageId}-${binId}-${elementIndex}`;
    const appState2 = this._getAppState();
    const page = appState2.documents.find((p) => p.id === pageId);
    if (!page) {
      return;
    }
    const bin = page.groups?.find((b) => b.id === binId);
    const items = bin?.items || [];
    if (bin) {
      bin.items = items;
    }
    if (!bin || !items[elementIndex] || !items[elementIndex].audioFile) {
      alert("No recording to play.");
      return;
    }
    const element = items[elementIndex];
    const filename = element.audioFile;
    try {
      const appState3 = this._getAppState();
      if (!appState3.inlineAudioPlayers) {
        appState3.inlineAudioPlayers = {};
      }
      if (!appState3.inlineAudioPlayers[audioKey]) {
        const response = await fetch(`/saved_files/recordings/${filename}`);
        if (!response.ok) {
          throw new Error(`Failed to load audio file: ${response.status}`);
        }
        const blob = await response.blob();
        const audioUrl = URL.createObjectURL(blob);
        const audio = new Audio(audioUrl);
        appState3.inlineAudioPlayers[audioKey] = {
          audio,
          isPlaying: false,
          url: audioUrl
        };
      }
      const player = appState3.inlineAudioPlayers?.[audioKey];
      if (player.isPlaying) {
        player.audio.pause();
        player.isPlaying = false;
        this.updateAudioStatus(pageId, binId, elementIndex, `File: ${filename}`, "#888");
        this.hideAudioProgressBar(pageId, binId, elementIndex);
      } else {
        await player.audio.play();
        player.isPlaying = true;
        this.updateAudioStatus(pageId, binId, elementIndex, "Playing...", "#4a9eff");
        this.showAudioProgressBar(pageId, binId, elementIndex);
        const audioKeyForProgress = `${pageId}-${binId}-${elementIndex}`;
        const audioProgressBar = document.querySelector(`#audio-progress-${audioKeyForProgress} input[type="range"]`);
        if (audioProgressBar) {
          const updateProgress = () => {
            if (player.audio && !player.audio.paused) {
              const percent = player.audio.currentTime / player.audio.duration * 100;
              audioProgressBar.value = percent || 0;
            }
          };
          if (player.progressUpdateHandler) {
            player.audio.removeEventListener("timeupdate", player.progressUpdateHandler);
          }
          player.progressUpdateHandler = updateProgress;
          player.audio.addEventListener("timeupdate", updateProgress);
          audioProgressBar.oninput = (e) => {
            if (player.audio) {
              const seekTime = e.target.value / 100 * player.audio.duration;
              player.audio.currentTime = seekTime;
            }
          };
        }
        player.audio.onended = () => {
          player.isPlaying = false;
          this.updateAudioStatus(pageId, binId, elementIndex, `File: ${filename}`, "#888");
          this.hideAudioProgressBar(pageId, binId, elementIndex);
        };
        player.audio.onerror = (error) => {
          alert("Error playing audio file.");
          this.hideAudioProgressBar(pageId, binId, elementIndex);
        };
      }
    } catch (error) {
      alert("Failed to play audio: " + error.message);
    }
  }
  stopInlineAudio(pageId, binId, elementIndex) {
    const audioKey = `${pageId}-${binId}-${elementIndex}`;
    const appState2 = this._getAppState();
    const player = appState2.inlineAudioPlayers?.[audioKey];
    const page = appState2.documents.find((p) => p.id === pageId);
    if (!page) {
      console.error("Page not found:", pageId);
      return;
    }
    const bin = page.groups?.find((b) => b.id === binId);
    const items = bin?.items || [];
    if (bin) {
      bin.items = items;
    }
    if (!bin || !items[elementIndex]) {
      console.error("Element not found:", elementIndex);
      return;
    }
    const element = items[elementIndex];
    if (player && player.audio) {
      player.audio.pause();
      player.audio.currentTime = 0;
      player.isPlaying = false;
      this.updateAudioStatus(pageId, binId, elementIndex, `File: ${element.audioFile}`, "#888");
      this.hideAudioProgressBar(pageId, binId, elementIndex);
    }
  }
  showAudioProgressBar(pageId, binId, elementIndex) {
    const audioKey = `${pageId}-${binId}-${elementIndex}`;
    const progressContainer = document.getElementById(`audio-progress-${audioKey}`);
    if (progressContainer) {
      progressContainer.style.display = "block";
    }
  }
  hideAudioProgressBar(pageId, binId, elementIndex) {
    const audioKey = `${pageId}-${binId}-${elementIndex}`;
    const progressContainer = document.getElementById(`audio-progress-${audioKey}`);
    if (progressContainer) {
      progressContainer.style.display = "none";
      const audioProgressBarInput = progressContainer.querySelector('input[type="range"]');
      if (audioProgressBarInput) {
        audioProgressBarInput.value = "0";
      }
    }
  }
  updateAudioStatus(pageId, binId, elementIndex, text, color) {
    let element = null;
    if (typeof elementIndex === "string" && elementIndex.includes("-")) {
      const parts = elementIndex.split("-");
      element = ElementFinder$1.findElement(pageId, binId, parseInt(parts[0]), document, parseInt(parts[1]));
    } else {
      element = ElementFinder$1.findElement(pageId, binId, elementIndex);
    }
    if (element) {
      const statusDiv = element.querySelector(".audio-status");
      if (statusDiv) {
        statusDiv.textContent = text;
        statusDiv.style.color = color;
      }
    }
  }
  toggleArchiveView(pageId, binId, elementIndex) {
    const audioKey = `${pageId}-${binId}-${elementIndex}`;
    const archiveView = document.getElementById(`archive-view-${audioKey}`);
    if (!archiveView) return;
    if (archiveView.style.display === "none") {
      const dataManager = this._getDataManager();
      const archived = dataManager ? dataManager.getArchivedRecordings(pageId, elementIndex) : [];
      if (archived.length === 0) {
        archiveView.innerHTML = '<div style="padding: 10px; color: #888;">No archived recordings</div>';
      } else {
        let html = '<div style="padding: 10px; border-top: 1px solid #404040; margin-top: 10px;"><strong>Archived Recordings:</strong><ul style="margin-top: 10px; padding-left: 20px;">';
        archived.forEach((entry) => {
          html += `<li style="margin: 5px 0;"><button onclick="app.dataManager.playArchivedAudio('${entry.filename}')" style="background: #4a9eff; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; margin-right: 8px;">Play</button>${entry.date} - ${entry.filename}</li>`;
        });
        html += "</ul></div>";
        archiveView.innerHTML = html;
      }
      archiveView.style.display = "block";
    } else {
      archiveView.style.display = "none";
    }
  }
}
class EventHelper {
  /**
   * Setup double-click detection on an element
   * @param {HTMLElement} element - Target element
   * @param {Function} handler - Handler function to call on double-click
   * @param {number} delay - Maximum time between clicks in ms (default: 300)
   * @param {Object} options - Additional options
   * @param {Function} options.filter - Optional filter function to determine if click should be processed
   * @param {Function} options.singleClickHandler - Optional handler for single clicks
   * @returns {Function} Cleanup function to remove event listener
   */
  static setupDoubleClick(element, handler, delay = 300, options = {}) {
    let lastClickTime = 0;
    const { filter, singleClickHandler } = options;
    const clickHandler = (e) => {
      if (filter && !filter(e)) {
        return;
      }
      if (e.target.closest("input") || e.target.closest("button") || e.target.closest("textarea")) {
        return;
      }
      const now = Date.now();
      const timeSinceLastClick = now - lastClickTime;
      if (timeSinceLastClick < delay && timeSinceLastClick > 0) {
        e.preventDefault();
        e.stopPropagation();
        lastClickTime = 0;
        handler(e);
      } else {
        lastClickTime = now;
        if (singleClickHandler) {
          setTimeout(() => {
            if (lastClickTime === now) {
              singleClickHandler(e);
            }
          }, delay);
        }
      }
    };
    element.addEventListener("click", clickHandler);
    return () => {
      element.removeEventListener("click", clickHandler);
    };
  }
  /**
   * Setup click-outside detection
   * @param {HTMLElement} element - Target element
   * @param {Function} handler - Handler function to call when clicking outside
   * @param {HTMLElement} container - Optional container to limit scope (default: document)
   * @returns {Function} Cleanup function to remove event listener
   */
  static setupClickOutside(element, handler, container = document) {
    const clickHandler = (e) => {
      if (!element.contains(e.target)) {
        handler(e);
      }
    };
    container.addEventListener("click", clickHandler, true);
    return () => {
      container.removeEventListener("click", clickHandler, true);
    };
  }
  /**
   * Setup keyboard shortcuts
   * @param {HTMLElement} element - Target element (usually document or a container)
   * @param {Object} shortcuts - Object mapping key combinations to handlers
   *   Format: { 'ctrl+s': handler, 'escape': handler, etc. }
   * @param {Object} options - Additional options
   * @param {boolean} options.preventDefault - Whether to prevent default behavior (default: true)
   * @returns {Function} Cleanup function to remove event listener
   */
  static setupKeyboardShortcuts(element, shortcuts, options = {}) {
    const { preventDefault = true } = options;
    const keyHandler = (e) => {
      const key = e.key.toLowerCase();
      const ctrl = e.ctrlKey || e.metaKey;
      const shift = e.shiftKey;
      const alt = e.altKey;
      let keyString = "";
      if (ctrl) keyString += "ctrl+";
      if (shift) keyString += "shift+";
      if (alt) keyString += "alt+";
      keyString += key;
      if (shortcuts[keyString]) {
        if (preventDefault) {
          e.preventDefault();
          e.stopPropagation();
        }
        shortcuts[keyString](e);
        return;
      }
      if (!ctrl && !shift && !alt && shortcuts[key]) {
        if (preventDefault) {
          e.preventDefault();
          e.stopPropagation();
        }
        shortcuts[key](e);
      }
    };
    element.addEventListener("keydown", keyHandler);
    return () => {
      element.removeEventListener("keydown", keyHandler);
    };
  }
  /**
   * Debounce a function
   * @param {Function} func - Function to debounce
   * @param {number} delay - Delay in milliseconds
   * @param {boolean} immediate - Whether to call immediately on first invocation
   * @returns {Function} Debounced function
   */
  static debounce(func, delay, immediate = false) {
    let timeout;
    return function(...args) {
      const context = this;
      const callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        timeout = null;
        if (!immediate) {
          func.apply(context, args);
        }
      }, delay);
      if (callNow) {
        func.apply(context, args);
      }
    };
  }
  /**
   * Throttle a function
   * @param {Function} func - Function to throttle
   * @param {number} limit - Time limit in milliseconds
   * @returns {Function} Throttled function
   */
  static throttle(func, limit) {
    let inThrottle;
    return function(...args) {
      const context = this;
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(() => {
          inThrottle = false;
        }, limit);
      }
    };
  }
  /**
   * Setup drag and drop handlers
   * @param {HTMLElement} element - Draggable element
   * @param {Object} config - Configuration object
   * @param {Function} config.onDragStart - Handler for dragstart event
   * @param {Function} config.onDragEnd - Handler for dragend event
   * @param {Function} config.onDragOver - Handler for dragover event
   * @param {Function} config.onDrop - Handler for drop event
   * @param {Function} config.onDragLeave - Handler for dragleave event
   * @param {boolean} config.draggable - Whether element is draggable (default: true)
   * @returns {Function} Cleanup function to remove all event listeners
   */
  static setupDragAndDrop(element, config) {
    const {
      onDragStart,
      onDragEnd,
      onDragOver,
      onDrop,
      onDragLeave,
      draggable = true
    } = config;
    element.draggable = draggable;
    const handlers = [];
    if (onDragStart) {
      const handler = (e) => onDragStart(e);
      element.addEventListener("dragstart", handler);
      handlers.push({ event: "dragstart", handler });
    }
    if (onDragEnd) {
      const handler = (e) => onDragEnd(e);
      element.addEventListener("dragend", handler);
      handlers.push({ event: "dragend", handler });
    }
    if (onDragOver) {
      const handler = (e) => {
        e.preventDefault();
        e.stopPropagation();
        onDragOver(e);
      };
      element.addEventListener("dragover", handler);
      handlers.push({ event: "dragover", handler });
    }
    if (onDrop) {
      const handler = (e) => {
        e.preventDefault();
        e.stopPropagation();
        onDrop(e);
      };
      element.addEventListener("drop", handler);
      handlers.push({ event: "drop", handler });
    }
    if (onDragLeave) {
      const handler = (e) => onDragLeave(e);
      element.addEventListener("dragleave", handler);
      handlers.push({ event: "dragleave", handler });
    }
    return () => {
      handlers.forEach(({ event, handler }) => {
        element.removeEventListener(event, handler);
      });
      element.draggable = false;
    };
  }
}
class EventHandler {
  constructor(app2 = null) {
    this.app = app2;
  }
  /**
   * Get services
   */
  _getDataManager() {
    return getService(SERVICES.DATA_MANAGER);
  }
  _getFileManager() {
    return getService(SERVICES.FILE_MANAGER);
  }
  _getElementManager() {
    return getService(SERVICES.ELEMENT_MANAGER);
  }
  _getModalHandler() {
    return getService(SERVICES.MODAL_HANDLER);
  }
  _getBinManager() {
    return getService(SERVICES.BIN_MANAGER);
  }
  _getAppState() {
    return getService(SERVICES.APP_STATE);
  }
  _getContextMenuHandler() {
    return getService(SERVICES.CONTEXT_MENU_HANDLER);
  }
  setupEventListeners() {
    window.addEventListener("beforeunload", async (e) => {
      const dataManager = this._getDataManager();
      if (dataManager && typeof dataManager.flushPendingSave === "function") {
        dataManager.flushPendingSave().catch((err) => {
          console.warn("[EventHandler] Failed to flush pending save on unload:", err);
        });
      }
    });
    document.addEventListener("visibilitychange", async () => {
      if (document.hidden) {
        const dataManager = this._getDataManager();
        if (dataManager && typeof dataManager.flushPendingSave === "function") {
          dataManager.flushPendingSave().catch((err) => {
            console.warn("[EventHandler] Failed to flush pending save on visibility change:", err);
          });
        }
      }
    });
    const loadDefaultBtn = document.getElementById("load-default");
    if (loadDefaultBtn) {
      loadDefaultBtn.addEventListener("click", () => {
        const dataManager = this._getDataManager();
        if (dataManager) {
          dataManager.loadDefaultFile();
        }
      });
    }
    const fileManagerBtn = document.getElementById("file-manager");
    if (fileManagerBtn) {
      fileManagerBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const fileManager = this._getFileManager();
        if (fileManager) {
          fileManager.showFileManager();
        }
      }, true);
    }
    const saveDefaultBtn = document.getElementById("save-default");
    if (saveDefaultBtn) {
      saveDefaultBtn.addEventListener("click", () => {
        const dataManager = this._getDataManager();
        if (dataManager) {
          dataManager.saveAsDefault();
        }
      });
    }
    const fileInput = document.getElementById("file-input");
    if (fileInput) {
      fileInput.addEventListener("change", (e) => {
        const dataManager = this._getDataManager();
        if (dataManager) {
          dataManager.loadFromFile(e);
        }
      });
    }
    const fileInputImagesJson = document.getElementById("file-input-images-json");
    const openFilesBtn = document.getElementById("open-files");
    if (openFilesBtn && fileInputImagesJson) {
      openFilesBtn.addEventListener("click", () => {
        fileInputImagesJson.click();
      });
    }
    if (fileInputImagesJson) {
      fileInputImagesJson.addEventListener("change", (e) => {
        this.handleFileInput(e);
      });
    }
    const recordAudioBtn = document.getElementById("record-audio");
    if (recordAudioBtn) {
      recordAudioBtn.addEventListener("click", () => {
        const audioHandler = this._getAudioHandler();
        if (audioHandler) {
          audioHandler.showAudioRecordingModal();
        }
      });
    }
    const undoBtn = document.getElementById("undo-btn");
    if (undoBtn) {
      undoBtn.addEventListener("click", () => {
        const undoRedoManager = this._getUndoRedoManager();
        if (undoRedoManager) {
          const success = undoRedoManager.undo();
          if (!success) {
            console.log("Nothing to undo");
          }
        }
      });
    }
    const redoBtn = document.getElementById("redo-btn");
    if (redoBtn) {
      redoBtn.addEventListener("click", () => {
        const undoRedoManager = this._getUndoRedoManager();
        if (undoRedoManager) {
          const success = undoRedoManager.redo();
          if (!success) {
            console.log("Nothing to redo");
          }
        }
      });
    }
    const headerPinBtn = document.getElementById("header-pin-btn");
    if (headerPinBtn) {
      const isFixed = localStorage.getItem("headerFixed") === "true";
      if (isFixed) {
        document.querySelector("header").classList.add("header-fixed");
        document.body.classList.add("header-fixed-active");
        headerPinBtn.textContent = "📍";
        headerPinBtn.title = "Unpin header (scrolls with page)";
      }
      headerPinBtn.addEventListener("click", () => {
        const header = document.querySelector("header");
        const isCurrentlyFixed = header.classList.contains("header-fixed");
        if (isCurrentlyFixed) {
          header.classList.remove("header-fixed");
          document.body.classList.remove("header-fixed-active");
          headerPinBtn.textContent = "📌";
          headerPinBtn.title = "Pin header to top of window";
          localStorage.setItem("headerFixed", "false");
        } else {
          header.classList.add("header-fixed");
          document.body.classList.add("header-fixed-active");
          headerPinBtn.textContent = "📍";
          headerPinBtn.title = "Unpin header (scrolls with page)";
          localStorage.setItem("headerFixed", "true");
        }
      });
    }
    const settingsBtn = document.getElementById("settings-btn");
    if (settingsBtn) {
      settingsBtn.addEventListener("click", () => {
        const settingsManager = getService(SERVICES.SETTINGS_MANAGER);
        if (settingsManager) {
          settingsManager.showSettingsModal();
        }
      });
    }
    const settingsCloseBtn = document.getElementById("settings-close");
    if (settingsCloseBtn) {
      settingsCloseBtn.addEventListener("click", () => {
        const settingsManager = getService(SERVICES.SETTINGS_MANAGER);
        if (settingsManager) {
          settingsManager.closeSettingsModal();
        }
      });
    }
    const settingsModal = document.getElementById("settings-modal");
    if (settingsModal) {
      settingsModal.addEventListener("click", (e) => {
        if (e.target.id === "settings-modal") {
          const settingsManager = getService(SERVICES.SETTINGS_MANAGER);
          if (settingsManager) {
            settingsManager.closeSettingsModal();
          }
        }
      });
    }
    const dropdownToggle = document.querySelector(".dropdown-toggle");
    const dropdownMenu = document.querySelector(".dropdown-menu");
    if (dropdownToggle && dropdownMenu) {
      const toggleMenu = () => {
        const isActive = dropdownMenu.classList.toggle("active");
        dropdownToggle.classList.toggle("active", isActive);
      };
      dropdownToggle.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleMenu();
      });
      document.addEventListener("click", (e) => {
        if (!e.target.closest(".dropdown")) {
          dropdownMenu.classList.remove("active");
          dropdownToggle.classList.remove("active");
        }
      });
      dropdownMenu.querySelectorAll("button").forEach((button) => {
        button.addEventListener("click", (e) => {
          if (button.id !== "file-manager") {
            dropdownMenu.classList.remove("active");
            dropdownToggle.classList.remove("active");
          } else {
            setTimeout(() => {
              dropdownMenu.classList.remove("active");
              dropdownToggle.classList.remove("active");
            }, 100);
          }
        }, true);
      });
    }
    document.getElementById("context-edit").addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log("[EventHandler] context-edit clicked");
      const app2 = this.app || window.app;
      if (app2 && app2.handleContextEdit) {
        app2.handleContextEdit();
      } else {
        console.error("[EventHandler] app.handleContextEdit not available", { hasThisApp: !!this.app, hasWindowApp: !!window.app });
      }
    });
    const customizeVisualsBtn = document.getElementById("context-customize-visuals");
    if (customizeVisualsBtn) {
      customizeVisualsBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const app2 = this.app || window.app;
        if (app2 && app2.handleContextCustomizeVisuals) {
          app2.handleContextCustomizeVisuals();
        }
      });
    }
    document.getElementById("context-view-data").addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const app2 = this.app || window.app;
      if (app2 && app2.handleContextViewData) {
        app2.handleContextViewData();
      }
    });
    document.getElementById("context-add-element").addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const app2 = this.app || window.app;
      if (app2 && app2.handleContextAddElement) {
        app2.handleContextAddElement();
      }
    });
    document.getElementById("context-add-child-element").addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const app2 = this.app || window.app;
      if (app2 && app2.handleContextAddChildElement) {
        app2.handleContextAddChildElement();
      }
    });
    document.getElementById("context-add-element-page").addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const app2 = this.app || window.app;
      if (app2 && app2.handleContextAddElementPage) {
        app2.handleContextAddElementPage();
      }
    });
    document.getElementById("context-delete-element").addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const app2 = this.app || window.app;
      if (app2 && app2.handleContextDeleteElement) {
        app2.handleContextDeleteElement();
      }
    });
    document.getElementById("context-collapse-page").addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const app2 = this.app || window.app;
      if (app2 && app2.handleContextCollapsePage) {
        app2.handleContextCollapsePage();
      }
    });
    document.getElementById("context-add-page").addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const app2 = this.app || window.app;
      if (app2 && app2.handleContextAddPage) {
        app2.handleContextAddPage();
      }
    });
    document.getElementById("context-add-bin").addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const app2 = this.app || window.app;
      if (app2 && app2.handleContextAddBin) {
        app2.handleContextAddBin();
      }
    });
    document.getElementById("context-delete-bin").addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const app2 = this.app || window.app;
      if (app2 && app2.handleContextDeleteBin) {
        app2.handleContextDeleteBin();
      }
    });
    document.getElementById("context-delete-page").addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const app2 = this.app || window.app;
      if (app2 && app2.handleContextDeletePage) {
        app2.handleContextDeletePage();
      }
    });
    document.getElementById("context-toggle-subtasks").addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const app2 = this.app || window.app;
      if (app2 && app2.handleContextToggleSubtasks) {
        app2.handleContextToggleSubtasks();
      }
    });
    document.getElementById("context-reset-day").addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const app2 = this.app || window.app;
      if (app2 && app2.handleContextResetDay) {
        app2.handleContextResetDay();
      }
    });
    document.getElementById("context-collapse-all-pages").addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const app2 = this.app || window.app;
      if (app2 && app2.handleContextCollapseAllPages) {
        app2.handleContextCollapseAllPages();
      }
    });
    document.addEventListener("click", (e) => {
      const contextMenuHandler = this._getContextMenuHandler();
      if (!contextMenuHandler) return;
      const appState3 = this._getAppState();
      const menu = document.getElementById("context-menu");
      if (!menu || !menu.classList.contains("active")) {
        const pageElement2 = e.target.closest(".page");
        if (pageElement2) {
          appState3.currentDocumentId = pageElement2.dataset.pageId;
        }
        return;
      }
      if (e.target.closest(".context-menu")) {
        return;
      }
      contextMenuHandler.hideContextMenu();
      const pageElement = e.target.closest(".page");
      if (pageElement) {
        appState3.currentDocumentId = pageElement.dataset.pageId;
      }
    }, true);
    document.addEventListener("keydown", (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.closest(".modal")) {
        return;
      }
      if (e.target.classList.contains("page-title") && e.target.contentEditable === "true") {
        return;
      }
      if (e.ctrlKey && e.shiftKey) {
        const types = {
          "1": "task",
          "2": "header-checkbox",
          "3": "header-checkbox",
          "4": "multi-checkbox",
          "5": "one-time"
        };
        if (types[e.key]) {
          e.preventDefault();
          const appState3 = this._getAppState();
          const targetPageId = appState3.currentDocumentId || (appState3.documents.length > 0 ? appState3.documents[0].id : null);
          const targetBinId = appState3.activeGroupId || (appState3.documents.find((p) => p.id === targetPageId)?.groups?.[0]?.id || null);
          if (targetPageId && targetBinId) {
            const elementManager = this._getElementManager();
            if (elementManager) {
              elementManager.addElement(targetPageId, targetBinId, types[e.key]);
            }
          }
        }
      }
      if (e.ctrlKey && e.key === "n") {
        e.preventDefault();
        const appState3 = this._getAppState();
        const targetPageId = this.app?.activePageId || (appState3.documents.length > 0 ? appState3.documents[0].id : null);
        const targetBinId = this.app?.activeGroupId || (appState3.documents.find((p) => p.id === targetPageId)?.groups?.[0]?.id || null);
        if (targetPageId && targetBinId) {
          const modalHandler = this._getModalHandler();
          if (modalHandler) {
            modalHandler.showAddElementModal(targetPageId, targetBinId);
          }
        }
      }
      if (e.ctrlKey && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        if (this.app.undoRedoManager) {
          this.app.undoRedoManager.undo();
        }
      }
      if (e.ctrlKey && e.shiftKey && e.key === "z" || e.ctrlKey && e.key === "y") {
        e.preventDefault();
        if (this.app.undoRedoManager) {
          this.app.undoRedoManager.redo();
        }
      }
    });
    const binsContainer = document.getElementById("bins-container");
    if (!binsContainer) {
      console.warn("bins-container not found, skipping container event listeners");
      return;
    }
    const handleBinsContainerMenu = (e) => {
      if (!e.target.closest(".bin") && !e.target.closest(".element")) {
        e.preventDefault();
        e.stopPropagation();
        const contextMenuHandler = this._getContextMenuHandler();
        if (contextMenuHandler) {
          contextMenuHandler.showPageContextMenu(e);
        }
      }
    };
    binsContainer.addEventListener("contextmenu", handleBinsContainerMenu);
    const appState2 = this._getAppState();
    EventHelper.setupDoubleClick(
      binsContainer,
      (e) => {
        if (!e.target.closest(".page") && !e.target.closest(".element") && !e.target.closest("input") && !e.target.closest("button")) {
          handlePageContainerMenu(e);
        }
      },
      appState2.doubleClickDelay,
      {
        filter: (e) => {
          return !e.target.closest(".page") && !e.target.closest(".element") && !e.target.closest("input") && !e.target.closest("button");
        }
      }
    );
    binsContainer.addEventListener("dragover", (e) => {
      if (e.dataTransfer.types.includes("Files")) {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = "copy";
        binsContainer.classList.add("drag-over");
        return;
      }
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      const appState3 = this._getAppState();
      const dragData = appState3.dragData || (() => {
        try {
          return JSON.parse(e.dataTransfer.getData("text/plain") || "{}");
        } catch {
          return {};
        }
      })();
      if (dragData.type === "bin") {
        const binElement = e.target.closest(".bin");
        if (binElement) {
          binElement.classList.add("drag-over");
        } else if (!e.target.closest(".bin")) {
          binsContainer.classList.add("drag-over");
        }
      }
    });
    binsContainer.addEventListener("dragleave", (e) => {
      if (!binsContainer.contains(e.relatedTarget)) {
        binsContainer.classList.remove("drag-over");
        document.querySelectorAll(".bin.drag-over").forEach((el) => {
          el.classList.remove("drag-over");
        });
      }
    });
    binsContainer.addEventListener("drop", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        Array.from(e.dataTransfer.files).forEach((file) => {
          this.processDroppedFile(file);
        });
        return;
      }
      const appState3 = this._getAppState();
      let dragData = appState3.dragData;
      if (!dragData) {
        try {
          const dataStr = e.dataTransfer.getData("text/plain");
          if (dataStr) {
            dragData = JSON.parse(dataStr);
          } else {
            console.error("No drag data available");
            return;
          }
        } catch (err) {
          console.error("Failed to parse drag data:", err);
          return;
        }
      }
      if (dragData && dragData.type === "bin") {
        const binElement = e.target.closest(".bin");
        if (binElement) {
          const targetPageId = binElement.dataset.pageId;
          const targetBinId = binElement.dataset.binId;
          const binManager = this._getBinManager();
          if (binManager) {
            binManager.moveBin(dragData.pageId, dragData.binId, targetPageId, targetBinId);
          }
        } else {
          const page = appState3.documents.find((p) => p.id === dragData.pageId);
          if (page) {
            const bin = page.groups?.find((b) => b.id === dragData.binId);
            if (bin) {
              const sourceIndex = page.groups.indexOf(bin);
              page.groups.splice(sourceIndex, 1);
              page.groups.push(bin);
              const dataManager = this._getDataManager();
              if (dataManager) {
                dataManager.saveData();
              }
              eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
            }
          }
        }
        binsContainer.classList.remove("drag-over");
        document.querySelectorAll(".drag-over").forEach((el) => {
          el.classList.remove("drag-over");
        });
      }
      appState3.dragData = null;
    });
    document.addEventListener("click", (e) => {
      const contextMenuHandler = this._getContextMenuHandler();
      if (contextMenuHandler) {
        contextMenuHandler.hideContextMenu();
      }
    });
    document.addEventListener("contextmenu", (e) => {
      const target = e.target;
      const binsContainer2 = document.getElementById("bins-container");
      const targetElement = target.closest(".element");
      const binElement = target.closest(".bin");
      const pageTabElement = target.closest(".page-tab");
      if (targetElement) {
        const appState3 = this._getAppState();
        const pageId = targetElement.dataset.pageId || appState3.currentDocumentId;
        const binId = targetElement.dataset.binId;
        const elementIndexStr = targetElement.dataset.elementIndex;
        const elementIndex = elementIndexStr !== void 0 && elementIndexStr !== "" ? parseInt(elementIndexStr, 10) : null;
        const contextMenuHandler2 = this._getContextMenuHandler();
        if (contextMenuHandler2) {
          contextMenuHandler2.showContextMenu(e, pageId, binId, elementIndex);
        }
        return;
      }
      if (binElement && !targetElement) {
        const pageId = binElement.dataset.pageId || appState2.currentDocumentId;
        const binId = binElement.dataset.binId;
        const contextMenuHandler2 = this._getContextMenuHandler();
        if (contextMenuHandler2) {
          contextMenuHandler2.showBinContextMenu(e, pageId, binId);
        }
        return;
      }
      if (pageTabElement) {
        const pageId = pageTabElement.dataset.pageId;
        const contextMenuHandler2 = this._getContextMenuHandler();
        if (contextMenuHandler2) {
          contextMenuHandler2.showPageContextMenu(e, pageId);
        }
        return;
      }
      if (binsContainer2) {
        const contextMenuHandler2 = this._getContextMenuHandler();
        if (contextMenuHandler2) {
          contextMenuHandler2.showPageContextMenu(e);
        }
        return;
      }
      const contextMenuHandler = getService(SERVICES.CONTEXT_MENU_HANDLER);
      if (contextMenuHandler) {
        contextMenuHandler.hideContextMenu();
      }
    }, true);
    const touchGestureHandler = getService(SERVICES.TOUCH_GESTURE_HANDLER);
    if (touchGestureHandler) {
      touchGestureHandler.setupTouchGestures();
      touchGestureHandler.setupSwipeGestures();
    }
    document.querySelector(".modal-close").addEventListener("click", () => {
      const appState3 = this._getAppState();
      const currentEdit = appState3.currentEditModal;
      if (currentEdit && currentEdit.pageId && currentEdit.elementIndex !== void 0) {
        const modalHandler = this._getModalHandler();
        if (modalHandler && currentEdit) {
          modalHandler.saveEdit(currentEdit.pageId, currentEdit.elementIndex);
        }
      } else {
        const modalHandler = this._getModalHandler();
        if (modalHandler) {
          modalHandler.closeModal();
        }
      }
    });
    let modalMouseDownTarget = null;
    const modalElement = document.getElementById("modal");
    modalElement.addEventListener("mousedown", (e) => {
      modalMouseDownTarget = e.target;
    });
    modalElement.addEventListener("click", (e) => {
      if (e.target.id === "modal" && modalMouseDownTarget && modalMouseDownTarget.id === "modal") {
        const modalHandler = this._getModalHandler();
        if (modalHandler) {
          modalHandler.closeModal();
        }
      }
      modalMouseDownTarget = null;
    });
    document.addEventListener("dragover", (e) => {
      const appState3 = this._getAppState();
      if (!appState3.isDragging) return;
      const edgeThreshold = 50;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const mouseX = e.clientX;
      const mouseY = e.clientY;
      let scrollX = 0;
      let scrollY = 0;
      if (mouseX < edgeThreshold) {
        scrollX = -appState3.edgeScrollSpeed;
      } else if (mouseX > viewportWidth - edgeThreshold) {
        scrollX = appState3.edgeScrollSpeed;
      }
      if (mouseY < edgeThreshold) {
        scrollY = -appState3.edgeScrollSpeed;
      } else if (mouseY > viewportHeight - edgeThreshold) {
        scrollY = appState3.edgeScrollSpeed;
      }
      if (scrollX !== 0 || scrollY !== 0) {
        if (appState3.autoScrollInterval) {
          clearInterval(appState3.autoScrollInterval);
        }
        appState3.autoScrollInterval = setInterval(() => {
          if (!appState3.isDragging) {
            clearInterval(appState3.autoScrollInterval);
            appState3.autoScrollInterval = null;
            return;
          }
          const container = document.getElementById("bins-container");
          if (container) {
            if (scrollX !== 0) {
              container.scrollLeft += scrollX;
            }
            if (scrollY !== 0) {
              container.scrollTop += scrollY;
            }
          } else {
            if (scrollX !== 0) {
              window.scrollBy(scrollX, 0);
            }
            if (scrollY !== 0) {
              window.scrollBy(0, scrollY);
            }
          }
        }, 16);
      } else {
        if (appState3.autoScrollInterval) {
          clearInterval(appState3.autoScrollInterval);
          appState3.autoScrollInterval = null;
        }
      }
    });
    document.addEventListener("wheel", (e) => {
      const appState3 = this._getAppState();
      if (!appState3.isDragging) return;
      if (appState3.middleMouseDown) {
        e.preventDefault();
        const container = document.getElementById("pages-container");
        if (container) {
          if (e.shiftKey) {
            container.scrollLeft += e.deltaY;
          } else {
            container.scrollTop += e.deltaY;
          }
        } else {
          if (e.shiftKey) {
            window.scrollBy(e.deltaY, 0);
          } else {
            window.scrollBy(0, e.deltaY);
          }
        }
      }
    }, { passive: false });
    const appStateForMouse = this._getAppState();
    appStateForMouse.middleMouseDown = false;
    document.addEventListener("mousedown", (e) => {
      if (e.button === 1) {
        appStateForMouse.middleMouseDown = true;
      }
    });
    document.addEventListener("mouseup", (e) => {
      if (e.button === 1) {
        appStateForMouse.middleMouseDown = false;
      }
    });
    document.addEventListener("contextmenu", (e) => {
      if (e.button === 1) {
        e.preventDefault();
      }
    });
  }
}
class ContextMenuHandler {
  constructor() {
  }
  /**
   * Get services
   */
  _getAppState() {
    return getService(SERVICES.APP_STATE);
  }
  // Position menu within viewport bounds
  positionMenu(menu, x, y) {
    menu.style.visibility = "hidden";
    menu.style.display = "block";
    const menuRect = menu.getBoundingClientRect();
    const menuWidth = menuRect.width;
    const menuHeight = menuRect.height;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    menu.style.display = "none";
    menu.style.visibility = "visible";
    let finalX = x;
    if (x + menuWidth > viewportWidth) {
      finalX = x - menuWidth;
      if (finalX < 0) {
        finalX = viewportWidth - menuWidth;
      }
    }
    let finalY = y;
    if (y + menuHeight > viewportHeight) {
      finalY = y - menuHeight;
      if (finalY < 0) {
        finalY = viewportHeight - menuHeight;
      }
    }
    menu.style.left = finalX + "px";
    menu.style.top = finalY + "px";
  }
  showContextMenu(e, pageId, binId, elementIndex, subtaskIndex = null) {
    const now = Date.now();
    const appState2 = this._getAppState();
    const timeSinceLastClick = now - (appState2.lastRightClickTime || 0);
    if (timeSinceLastClick < (appState2.doubleClickThreshold || 500) && appState2.contextMenuState && appState2.contextMenuState.visible) {
      this.hideContextMenu();
      appState2.lastRightClickTime = 0;
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    if (!binId) {
      binId = appState2.activeGroupId;
      if (!binId) {
        const page2 = appState2.documents.find((p) => p.id === pageId);
        if (page2 && page2.groups && page2.groups.length > 0) {
          binId = page2.groups[0].id;
        }
      }
    }
    appState2.lastRightClickTime = now;
    if (appState2.setContextMenuState) {
      appState2.setContextMenuState({
        visible: true,
        documentId: pageId,
        groupId: binId,
        elementIndex,
        subtaskIndex,
        x: e.clientX,
        y: e.clientY
      });
    }
    const menu = document.getElementById("context-menu");
    if (!menu) {
      console.error("Context menu element not found!");
      return;
    }
    const pageLevelItems = ["context-add-page", "context-add-element-page", "context-delete-page", "context-toggle-subtasks", "context-collapse-all-pages", "context-reset-day"];
    menu.querySelectorAll(".context-menu-item").forEach((item) => {
      if (pageLevelItems.includes(item.id)) {
        item.style.display = "none";
      } else {
        item.style.display = "block";
      }
    });
    const customizeVisualsItem = document.getElementById("context-customize-visuals");
    if (customizeVisualsItem) {
      customizeVisualsItem.style.display = "block";
      customizeVisualsItem.textContent = "Customize Visuals";
    }
    const editMenuItem = document.getElementById("context-edit");
    const addElementMenuItem = document.getElementById("context-add-element");
    const addChildElementMenuItem = document.getElementById("context-add-child-element");
    const collapsePageMenuItem = document.getElementById("context-collapse-page");
    if (editMenuItem) {
      editMenuItem.textContent = "Edit";
    }
    const page = appState2.documents.find((p) => p.id === pageId);
    const bin = page?.groups?.find((b) => b.id === binId);
    const items = bin?.items || [];
    if (bin) {
      bin.items = items;
    }
    const element = bin && items && items[elementIndex] ? items[elementIndex] : null;
    const hasChildren = Array.isArray(element?.childIds) && element.childIds.length > 0;
    if (subtaskIndex !== null || typeof elementIndex === "string" && elementIndex.includes("-")) {
      if (editMenuItem) editMenuItem.style.display = "none";
      if (addElementMenuItem) addElementMenuItem.style.display = "none";
      if (addChildElementMenuItem) addChildElementMenuItem.style.display = "none";
      if (collapsePageMenuItem) collapsePageMenuItem.style.display = "none";
    } else {
      if (editMenuItem) editMenuItem.style.display = "block";
      if (addElementMenuItem) addElementMenuItem.style.display = "block";
      if (addChildElementMenuItem) {
        addChildElementMenuItem.style.display = hasChildren ? "none" : "block";
      }
    }
    if (collapsePageMenuItem && pageId && subtaskIndex === null) {
      const page2 = appState2.documents.find((p) => p.id === pageId);
      const isExpanded = page2 && page2.groups && page2.groups.some((bin2) => {
        const binState = appState2.getGroupState ? appState2.getGroupState(bin2.id) : appState2.groupStates?.[bin2.id];
        return binState !== "collapsed";
      });
      collapsePageMenuItem.textContent = isExpanded ? "Collapse Page" : "Expand Page";
    }
    this.positionMenu(menu, e.clientX, e.clientY);
    menu.classList.add("active");
    menu.style.display = "";
  }
  hideContextMenu() {
    const menu = document.getElementById("context-menu");
    if (!menu) {
      return;
    }
    menu.classList.remove("active");
    const appState2 = this._getAppState();
    if (appState2.contextMenuState && appState2.setContextMenuState) {
      appState2.setContextMenuState({ visible: false });
    }
    menu.querySelectorAll(".context-menu-item").forEach((item) => {
      item.style.display = "";
    });
  }
  showBinContextMenu(e, pageId, binId) {
    const now = Date.now();
    const appState2 = this._getAppState();
    const timeSinceLastClick = now - (appState2.lastRightClickTime || 0);
    if (timeSinceLastClick < (appState2.doubleClickThreshold || 500) && appState2.contextMenuState && appState2.contextMenuState.visible) {
      this.hideContextMenu();
      appState2.lastRightClickTime = 0;
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    appState2.lastRightClickTime = now;
    const menu = document.getElementById("context-menu");
    const binLevelItems = ["context-edit", "context-customize-visuals", "context-add-element", "context-add-bin", "context-delete-bin"];
    const elementLevelItems = ["context-add-child-element", "context-delete-element", "context-view-data"];
    const pageLevelItems = ["context-add-page", "context-add-element-page", "context-delete-page", "context-toggle-subtasks", "context-collapse-all-pages", "context-reset-day", "context-collapse-page"];
    menu.querySelectorAll(".context-menu-item").forEach((item) => {
      if (binLevelItems.includes(item.id)) {
        item.style.display = "block";
      } else if (elementLevelItems.includes(item.id) || pageLevelItems.includes(item.id)) {
        item.style.display = "none";
      }
    });
    const editMenuItem = document.getElementById("context-edit");
    if (editMenuItem) {
      editMenuItem.textContent = "Edit Bin";
    }
    const customizeVisualsItem = document.getElementById("context-customize-visuals");
    if (customizeVisualsItem) {
      customizeVisualsItem.textContent = "Customize Visuals";
    }
    this.positionMenu(menu, e.clientX, e.clientY);
    menu.classList.add("active");
    menu.style.display = "";
    if (appState2.setContextMenuState) {
      appState2.setContextMenuState({
        visible: true,
        pageId,
        binId,
        elementIndex: null,
        x: e.clientX,
        y: e.clientY
      });
    }
  }
  showPageContextMenu(e, pageId = null) {
    const now = Date.now();
    const appState2 = this._getAppState();
    const timeSinceLastClick = now - (appState2.lastRightClickTime || 0);
    if (timeSinceLastClick < (appState2.doubleClickThreshold || 500) && appState2.contextMenuState && appState2.contextMenuState.visible) {
      this.hideContextMenu();
      appState2.lastRightClickTime = 0;
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    appState2.lastRightClickTime = now;
    const menu = document.getElementById("context-menu");
    const pageLevelItems = ["context-add-page", "context-add-element-page", "context-delete-page", "context-toggle-subtasks", "context-collapse-all-pages", "context-reset-day", "context-edit", "context-customize-visuals", "context-paste-markdown"];
    menu.querySelectorAll(".context-menu-item").forEach((item) => {
      if (pageLevelItems.includes(item.id)) {
        item.style.display = "block";
      } else {
        item.style.display = "none";
      }
    });
    const editMenuItem = document.getElementById("context-edit");
    if (editMenuItem) {
      editMenuItem.textContent = "Edit Page";
    }
    const customizeVisualsItem = document.getElementById("context-customize-visuals");
    if (customizeVisualsItem) {
      customizeVisualsItem.textContent = "Customize Visuals";
    }
    let pageIdToUse = pageId;
    if (!pageIdToUse) {
      const pageElement = e.target.closest(".page-tab");
      if (pageElement) {
        pageIdToUse = pageElement.dataset.pageId;
      }
    }
    if (!pageIdToUse) {
      const pageElement = e.target.closest(".page");
      if (pageElement) {
        pageIdToUse = pageElement.dataset.pageId;
      }
    }
    if (!pageIdToUse) {
      pageIdToUse = appState2.currentDocumentId;
    }
    const toggleSubtasksItem = document.getElementById("context-toggle-subtasks");
    if (toggleSubtasksItem) {
      toggleSubtasksItem.textContent = appState2.allSubtasksExpanded ? "🔽 Collapse All Subtasks" : "▶️ Expand All Subtasks";
    }
    this.positionMenu(menu, e.clientX, e.clientY);
    menu.classList.add("active");
    menu.style.display = "";
    if (appState2.setContextMenuState) {
      appState2.setContextMenuState({
        visible: true,
        pageId: pageIdToUse,
        binId: null,
        elementIndex: null,
        x: e.clientX,
        y: e.clientY
      });
    }
  }
}
class TouchGestureHandler {
  constructor() {
  }
  /**
   * Get services
   */
  _getAppState() {
    return getService(SERVICES.APP_STATE);
  }
  _getDataManager() {
    return getService(SERVICES.DATA_MANAGER);
  }
  setupTouchGestures() {
    document.addEventListener("touchstart", (e) => {
      const touches = Array.from(e.touches);
      const appState2 = this._getAppState();
      touches.forEach((touch) => {
        if (!appState2.touchPoints[touch.identifier]) {
          appState2.touchPoints[touch.identifier] = {
            x: touch.clientX,
            y: touch.clientY,
            target: document.elementFromPoint(touch.clientX, touch.clientY),
            time: Date.now()
          };
        }
      });
      if (touches.length === 2) {
        const touchIds = Object.keys(appState2.touchPoints).map((id) => parseInt(id));
        const firstTouchId = touchIds.sort(
          (a, b) => appState2.touchPoints[a].time - appState2.touchPoints[b].time
        )[0];
        const firstTouch = appState2.touchPoints[firstTouchId];
        const timeHeld = Date.now() - firstTouch.time;
        if (timeHeld >= 100 && firstTouch.target) {
          e.preventDefault();
          e.stopPropagation();
          const targetAtPosition = document.elementFromPoint(firstTouch.x, firstTouch.y);
          const syntheticEvent = {
            clientX: firstTouch.x,
            clientY: firstTouch.y,
            target: targetAtPosition || firstTouch.target,
            preventDefault: () => {
            },
            stopPropagation: () => {
            }
          };
          this.triggerContextMenuFromTouch(syntheticEvent, syntheticEvent.target);
        }
      }
    }, { passive: false });
    document.addEventListener("touchmove", (e) => {
      Array.from(e.touches).forEach((touch) => {
        const appState2 = this._getAppState();
        if (appState2.touchPoints[touch.identifier]) {
          appState2.touchPoints[touch.identifier].x = touch.clientX;
          appState2.touchPoints[touch.identifier].y = touch.clientY;
        }
      });
    });
    document.addEventListener("touchend", (e) => {
      Array.from(e.changedTouches).forEach((touch) => {
        const appState2 = this._getAppState();
        delete appState2.touchPoints[touch.identifier];
      });
      if (e.touches.length === 0) {
        this.app.firstTouchData = null;
        const appState2 = this._getAppState();
        appState2.touchPoints = {};
      }
    });
  }
  triggerContextMenuFromTouch(e, target) {
    const contextMenuEvent = new MouseEvent("contextmenu", {
      bubbles: true,
      cancelable: true,
      clientX: e.clientX,
      clientY: e.clientY,
      button: 2,
      // Right mouse button
      buttons: 2,
      view: window
    });
    target.dispatchEvent(contextMenuEvent);
    if (!contextMenuEvent.defaultPrevented && (!this.app.contextMenuState || !this.app.contextMenuState.visible)) {
      this.fallbackContextMenuFromTouch(e, target);
    }
  }
  fallbackContextMenuFromTouch(e, target) {
    const element = target.closest(".element");
    const bin = target.closest(".bin");
    const binContent = target.closest(".bin-content");
    const elementsList = target.closest(".elements-list");
    const pageTab = target.closest(".page-tab");
    const tabsContainer = target.closest(".page-tabs");
    const binsContainer = target.closest("#bins-container");
    const page = target.closest(".page");
    const subtask = target.closest(".subtask");
    if (element) {
      const pageId = element.dataset.pageId;
      const binId = element.dataset.binId;
      let elementIndex = element.dataset.elementIndex;
      const isChild = element.dataset.isChild === "true";
      const childIndex = element.dataset.childIndex;
      if (isChild && childIndex !== void 0) {
        elementIndex = `${elementIndex}-${childIndex}`;
      } else {
        elementIndex = parseInt(elementIndex);
      }
      if (subtask) {
        const subtaskContainer = element.querySelector(".subtask-container, .children-container");
        if (subtaskContainer) {
          const subtasks = subtaskContainer.querySelectorAll(".subtask, .child-element");
          const subtaskIndex = Array.from(subtasks).indexOf(subtask);
          if (subtaskIndex !== -1) {
            this.app.contextMenuHandler.showContextMenu(e, pageId, binId, elementIndex, subtaskIndex);
            return;
          }
        }
      }
      if (pageId && binId && (typeof elementIndex === "string" || !isNaN(elementIndex))) {
        this.app.contextMenuHandler.showContextMenu(e, pageId, binId, elementIndex);
        return;
      }
    }
    if (bin && binContent && !target.closest(".element") && !target.closest("button")) {
      const pageId = bin.dataset.pageId;
      const binId = bin.dataset.binId;
      if (pageId && binId) {
        this.app.contextMenuHandler.showBinContextMenu(e, pageId, binId);
        return;
      }
    }
    if (elementsList && !target.closest(".element")) {
      const bin2 = elementsList.closest(".bin");
      if (bin2) {
        const pageId = bin2.dataset.pageId;
        const binId = bin2.dataset.binId;
        if (pageId && binId) {
          this.app.contextMenuHandler.showBinContextMenu(e, pageId, binId);
          return;
        }
      }
    }
    if (pageTab) {
      const pageId = pageTab.dataset.pageId;
      if (pageId) {
        this.app.contextMenuHandler.showPageContextMenu(e, pageId);
        return;
      }
    }
    if (tabsContainer && !target.closest(".page-tab")) {
      this.app.contextMenuHandler.showPageContextMenu(e);
      return;
    }
    if (binsContainer && !target.closest(".bin") && !target.closest(".element")) {
      this.app.contextMenuHandler.showPageContextMenu(e);
      return;
    }
    if (page) {
      const pageId = page.dataset.pageId;
      if (pageId) {
        const isInPageContent = target.closest('[id^="page-content-"]');
        const isElement = target.closest(".element");
        const isPageControl = target.closest(".page-controls");
        const isToggleArrow = target.closest(".page-toggle-arrow");
        const isAddElementBtn = target.closest(".add-element-btn");
        if (!isInPageContent && !isElement && !isPageControl && !isToggleArrow && !isAddElementBtn) {
          this.app.contextMenuHandler.showPageContextMenu(e, pageId);
          return;
        }
      }
    }
  }
  setupSwipeGestures() {
    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartTime = 0;
    const swipeThreshold = 50;
    const maxSwipeTime = 500;
    let swipeElement = null;
    document.addEventListener("touchstart", (e) => {
      if (e.touches.length === 1) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        touchStartTime = Date.now();
        swipeElement = e.target.closest(".element");
        if (swipeElement) {
          swipeElement.style.transition = "transform 0.2s ease-out";
        }
      }
    }, { passive: true });
    document.addEventListener("touchmove", (e) => {
      if (swipeElement && e.touches.length === 1) {
        const currentX = e.touches[0].clientX;
        const currentY = e.touches[0].clientY;
        const diffX = currentX - touchStartX;
        const diffY = currentY - touchStartY;
        if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 10) {
          e.preventDefault();
          swipeElement.style.transform = `translateX(${diffX}px)`;
          swipeElement.style.opacity = Math.max(0.5, 1 - Math.abs(diffX) / 200);
        }
      }
    }, { passive: false });
    document.addEventListener("touchend", (e) => {
      if (!swipeElement || !touchStartX || !touchStartY) {
        touchStartX = 0;
        touchStartY = 0;
        swipeElement = null;
        return;
      }
      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;
      const diffX = touchEndX - touchStartX;
      const diffY = touchEndY - touchStartY;
      const swipeTime = Date.now() - touchStartTime;
      if (swipeElement) {
        swipeElement.style.transform = "";
        swipeElement.style.opacity = "";
      }
      if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > swipeThreshold && swipeTime < maxSwipeTime) {
        const pageId = swipeElement.dataset.pageId;
        const binId = swipeElement.dataset.binId;
        let elementIndex = swipeElement.dataset.elementIndex;
        if (typeof elementIndex === "string" && elementIndex.includes("-")) {
          touchStartX = 0;
          touchStartY = 0;
          swipeElement = null;
          return;
        } else {
          elementIndex = parseInt(elementIndex);
        }
        if (pageId && binId && !isNaN(elementIndex)) {
          if (diffX > 0) {
            this.app.toggleElement(pageId, binId, elementIndex);
          } else {
            if (confirm("Delete this element?")) {
              const appState2 = this._getAppState();
              const page = appState2.documents.find((p) => p.id === pageId);
              if (page) {
                const bin = page.groups?.find((b) => b.id === binId);
                const items = bin?.items || [];
                if (bin) {
                  bin.items = items;
                }
                if (items[elementIndex]) {
                  items.splice(elementIndex, 1);
                  bin.items = items;
                  const dataManager = this._getDataManager();
                  if (dataManager) {
                    dataManager.saveData();
                  }
                  eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
                }
              }
            }
          }
        }
      }
      touchStartX = 0;
      touchStartY = 0;
      swipeElement = null;
    }, { passive: true });
  }
}
const DOMUtils = {
  /**
   * Create an element with attributes and optional children
   * @param {string} tag - HTML tag name
   * @param {Object} attrs - Attributes object (class, id, style, etc.)
   * @param {Array|string} children - Child elements or text content
   * @returns {HTMLElement}
   */
  createElement(tag, attrs = {}, children = []) {
    const el = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) {
      if (key === "textContent" || key === "innerHTML") {
        el[key] = value;
      } else if (key === "style" && typeof value === "object") {
        Object.assign(el.style, value);
      } else if (key === "dataset") {
        Object.assign(el.dataset, value);
      } else {
        el.setAttribute(key, value);
      }
    }
    if (typeof children === "string") {
      el.textContent = children;
    } else if (Array.isArray(children)) {
      children.forEach((child) => {
        if (typeof child === "string") {
          el.appendChild(document.createTextNode(child));
        } else if (child instanceof Node) {
          el.appendChild(child);
        }
      });
    }
    return el;
  },
  /**
   * Query selector with optional context
   * @param {string} selector - CSS selector
   * @param {HTMLElement} context - Context element (default: document)
   * @returns {HTMLElement|null}
   */
  query(selector, context = document) {
    return context.querySelector(selector);
  },
  /**
   * Query all elements matching selector
   * @param {string} selector - CSS selector
   * @param {HTMLElement} context - Context element (default: document)
   * @returns {NodeList}
   */
  queryAll(selector, context = document) {
    return context.querySelectorAll(selector);
  },
  /**
   * Add event listener with delegation support
   * @param {HTMLElement} element - Target element
   * @param {string} event - Event type
   * @param {Function} handler - Event handler
   * @param {Object} options - Event options (delegate selector, etc.)
   */
  on(element, event, handler, options = {}) {
    if (options.delegate) {
      element.addEventListener(event, (e) => {
        const target = e.target.closest(options.delegate);
        if (target && element.contains(target)) {
          handler.call(target, e);
        }
      });
    } else {
      element.addEventListener(event, handler);
    }
  },
  /**
   * Remove event listener
   * @param {HTMLElement} element - Target element
   * @param {string} event - Event type
   * @param {Function} handler - Event handler
   */
  off(element, event, handler) {
    element.removeEventListener(event, handler);
  },
  /**
   * Toggle class on element
   * @param {HTMLElement} element - Target element
   * @param {string} className - Class name
   * @param {boolean} force - Force add/remove
   */
  toggleClass(element, className, force) {
    element.classList.toggle(className, force);
  },
  /**
   * Add class to element
   * @param {HTMLElement} element - Target element
   * @param {string} className - Class name
   */
  addClass(element, className) {
    element.classList.add(className);
  },
  /**
   * Remove class from element
   * @param {HTMLElement} element - Target element
   * @param {string} className - Class name
   */
  removeClass(element, className) {
    element.classList.remove(className);
  },
  /**
   * Check if element has class
   * @param {HTMLElement} element - Target element
   * @param {string} className - Class name
   * @returns {boolean}
   */
  hasClass(element, className) {
    return element.classList.contains(className);
  },
  /**
   * Smooth scroll to element
   * @param {HTMLElement} element - Target element
   * @param {Object} options - Scroll options
   */
  scrollTo(element, options = {}) {
    element.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      ...options
    });
  },
  /**
   * Fade in animation
   * @param {HTMLElement} element - Target element
   * @param {number} duration - Animation duration in ms
   */
  fadeIn(element, duration = 300) {
    element.style.opacity = "0";
    element.style.display = "";
    element.style.transition = `opacity ${duration}ms`;
    requestAnimationFrame(() => {
      element.style.opacity = "1";
    });
  },
  /**
   * Fade out animation
   * @param {HTMLElement} element - Target element
   * @param {number} duration - Animation duration in ms
   * @returns {Promise}
   */
  fadeOut(element, duration = 300) {
    return new Promise((resolve) => {
      element.style.transition = `opacity ${duration}ms`;
      element.style.opacity = "0";
      setTimeout(() => {
        element.style.display = "none";
        resolve();
      }, duration);
    });
  },
  /**
   * Remove element from DOM
   * @param {HTMLElement} element - Element to remove
   */
  remove(element) {
    if (element && element.parentNode) {
      element.parentNode.removeChild(element);
    }
  },
  /**
   * Clear element content
   * @param {HTMLElement} element - Element to clear
   */
  clear(element) {
    element.innerHTML = "";
  }
};
class DOMBuilder {
  constructor(tag) {
    this.element = document.createElement(tag);
  }
  /**
   * Set an attribute
   * @param {string} key - Attribute name
   * @param {string} value - Attribute value
   * @returns {DOMBuilder} This builder for chaining
   */
  attr(key, value) {
    if (key === "class" || key === "className") {
      this.element.className = value;
    } else if (key === "style" && typeof value === "object") {
      Object.assign(this.element.style, value);
    } else if (key === "dataset") {
      Object.assign(this.element.dataset, value);
    } else if (key === "textContent") {
      this.element.textContent = value;
    } else if (key === "innerHTML") {
      this.element.innerHTML = value;
    } else {
      this.element.setAttribute(key, value);
    }
    return this;
  }
  /**
   * Set multiple attributes at once
   * @param {Object} attrs - Object of attribute key-value pairs
   * @returns {DOMBuilder} This builder for chaining
   */
  attrs(attrs) {
    for (const [key, value] of Object.entries(attrs)) {
      this.attr(key, value);
    }
    return this;
  }
  /**
   * Set style (object or string)
   * @param {Object|string} styles - Style object or CSS string
   * @returns {DOMBuilder} This builder for chaining
   */
  style(styles) {
    if (typeof styles === "string") {
      this.element.style.cssText = styles;
    } else if (typeof styles === "object") {
      Object.assign(this.element.style, styles);
    }
    return this;
  }
  /**
   * Add class(es)
   * @param {string|Array<string>} className - Class name(s) to add
   * @returns {DOMBuilder} This builder for chaining
   */
  class(className) {
    if (!className) {
      return this;
    }
    if (className === "" || typeof className === "string" && className.trim() === "") {
      return this;
    }
    if (typeof className === "string") {
      if (className === "") {
        return this;
      }
      const trimmed = className.trim();
      if (!trimmed || trimmed.length === 0) {
        return this;
      }
      const classes = trimmed.split(/\s+/).filter((c) => {
        if (!c || typeof c !== "string") return false;
        const trimmedC = c.trim();
        return trimmedC.length > 0;
      }).map((c) => c.trim());
      const validClasses = classes.filter((c) => {
        return c && typeof c === "string" && c !== "" && c.trim().length > 0;
      }).map((c) => c.trim()).filter((c) => c.length > 0);
      if (validClasses.length > 0) {
        const safeClasses = validClasses.filter((c) => {
          if (!c || typeof c !== "string" || c === "" || c.trim() === "") {
            return false;
          }
          return true;
        });
        if (safeClasses.length > 0) {
          const finalSafeClasses = safeClasses.filter((c) => {
            const isValid = c && typeof c === "string" && c !== "" && c.trim() !== "" && c.trim().length > 0;
            return isValid;
          }).map((c) => c.trim());
          if (finalSafeClasses.length > 0) {
            finalSafeClasses.forEach((c) => {
              const trimmed2 = String(c).trim();
              if (trimmed2 && typeof trimmed2 === "string" && trimmed2 !== "" && trimmed2.length > 0 && trimmed2.trim().length > 0) {
                try {
                  const finalCheck = trimmed2.trim();
                  if (finalCheck && finalCheck.length > 0) {
                    this.element.classList.add(finalCheck);
                  } else {
                  }
                } catch (err) {
                }
              }
            });
          }
        }
      }
      return this;
    }
    if (Array.isArray(className)) {
      const validClasses = className.filter((c) => c != null && typeof c === "string" && c.trim().length > 0).map((c) => c.trim()).filter((c) => c.length > 0);
      if (validClasses.length > 0) {
        validClasses.forEach((c) => {
          const trimmed = String(c).trim();
          if (trimmed && typeof trimmed === "string" && trimmed !== "" && trimmed.length > 0 && trimmed.trim().length > 0) {
            try {
              const finalCheck = trimmed.trim();
              if (finalCheck && finalCheck.length > 0) {
                this.element.classList.add(finalCheck);
              } else {
              }
            } catch (err) {
            }
          }
        });
      }
      return this;
    }
    return this;
  }
  /**
   * Remove class(es)
   * @param {string|Array<string>} className - Class name(s) to remove
   * @returns {DOMBuilder} This builder for chaining
   */
  removeClass(className) {
    if (Array.isArray(className)) {
      this.element.classList.remove(...className);
    } else {
      this.element.classList.remove(className);
    }
    return this;
  }
  /**
   * Set text content
   * @param {string} text - Text content
   * @returns {DOMBuilder} This builder for chaining
   */
  text(text) {
    this.element.textContent = text;
    return this;
  }
  /**
   * Set HTML content
   * @param {string} html - HTML content
   * @returns {DOMBuilder} This builder for chaining
   */
  html(html) {
    this.element.innerHTML = html;
    return this;
  }
  /**
   * Append a child element
   * @param {HTMLElement|DOMBuilder|string} child - Child element, builder, or text
   * @returns {DOMBuilder} This builder for chaining
   */
  child(child) {
    if (child instanceof DOMBuilder) {
      this.element.appendChild(child.build());
    } else if (child instanceof HTMLElement || child instanceof Text) {
      this.element.appendChild(child);
    } else if (typeof child === "string") {
      this.element.appendChild(document.createTextNode(child));
    }
    return this;
  }
  /**
   * Append multiple children
   * @param {Array<HTMLElement|DOMBuilder|string>} children - Array of children
   * @returns {DOMBuilder} This builder for chaining
   */
  children(children) {
    children.forEach((child) => this.child(child));
    return this;
  }
  /**
   * Add event listener
   * @param {string} event - Event type
   * @param {Function} handler - Event handler
   * @param {Object} options - Event options
   * @returns {DOMBuilder} This builder for chaining
   */
  on(event, handler, options = {}) {
    this.element.addEventListener(event, handler, options);
    return this;
  }
  /**
   * Set data attribute
   * @param {string} key - Data attribute key (without 'data-' prefix)
   * @param {string} value - Data attribute value
   * @returns {DOMBuilder} This builder for chaining
   */
  data(key, value) {
    this.element.dataset[key] = value;
    return this;
  }
  /**
   * Set multiple data attributes
   * @param {Object} data - Object of data attribute key-value pairs
   * @returns {DOMBuilder} This builder for chaining
   */
  dataset(data) {
    Object.assign(this.element.dataset, data);
    return this;
  }
  /**
   * Set property
   * @param {string} key - Property name
   * @param {*} value - Property value
   * @returns {DOMBuilder} This builder for chaining
   */
  prop(key, value) {
    this.element[key] = value;
    return this;
  }
  /**
   * Build and return the element
   * @returns {HTMLElement} The constructed element
   */
  build() {
    return this.element;
  }
  /**
   * Static helper to create a builder
   * @param {string} tag - HTML tag name
   * @returns {DOMBuilder} New builder instance
   */
  static create(tag) {
    return new DOMBuilder(tag);
  }
}
class ModalBuilder {
  constructor(app2) {
    this.app = app2;
    this.modal = null;
    this.modalContent = null;
    this.modalBody = null;
    this.title = "";
    this.content = "";
    this.buttons = [];
    this.inputs = [];
    this.size = { width: "auto", height: "auto" };
    this.onCloseHandler = null;
    this.closable = true;
    this.id = StringUtils.generateId("modal");
  }
  /**
   * Set modal title
   * @param {string} title - Modal title
   * @returns {ModalBuilder} This builder for chaining
   */
  setTitle(title) {
    this.title = title;
    return this;
  }
  /**
   * Set modal body content
   * @param {string|HTMLElement} content - Content (HTML string or element)
   * @returns {ModalBuilder} This builder for chaining
   */
  setContent(content) {
    this.content = content;
    return this;
  }
  /**
   * Add a button to the modal
   * @param {string} text - Button text
   * @param {Function} handler - Click handler
   * @param {Object} options - Button options
   * @param {string} options.class - Button CSS class
   * @param {boolean} options.primary - Whether button is primary (default: false)
   * @param {boolean} options.closeOnClick - Whether to close modal on click (default: true)
   * @returns {ModalBuilder} This builder for chaining
   */
  addButton(text, handler, options = {}) {
    const {
      class: className = "",
      primary = false,
      closeOnClick = true
    } = options;
    console.log("[ModalBuilder.addButton] Entry - text:", text, "className:", className, "type:", typeof className, "primary:", primary, "options:", options);
    let finalClassName = null;
    if (primary) {
      if (className && typeof className === "string" && className.trim()) {
        const combined = `primary ${className.trim()}`.trim();
        finalClassName = combined || "primary";
      } else {
        finalClassName = "primary";
      }
    } else if (className && typeof className === "string") {
      const trimmed = className.trim();
      if (trimmed && trimmed.length > 0) {
        finalClassName = trimmed;
      }
    }
    console.log("[ModalBuilder.addButton] finalClassName:", finalClassName, "type:", typeof finalClassName, "isNull:", finalClassName === null, "isEmptyString:", finalClassName === "", "willStore:", finalClassName);
    if (finalClassName === "") {
      console.error("[ModalBuilder.addButton] CRITICAL: finalClassName is empty string! Setting to null.");
      finalClassName = null;
    }
    this.buttons.push({
      text,
      handler,
      className: finalClassName,
      // Store null if no valid class, NEVER empty string
      closeOnClick
    });
    return this;
  }
  /**
   * Add an input field to the modal
   * @param {string} id - Input ID
   * @param {string} label - Input label
   * @param {string} type - Input type (default: 'text')
   * @param {*} value - Initial value
   * @param {Object} options - Input options
   * @param {string} options.placeholder - Placeholder text
   * @param {boolean} options.required - Whether input is required
   * @returns {ModalBuilder} This builder for chaining
   */
  addInput(id, label, type = "text", value = "", options = {}) {
    const {
      placeholder = "",
      required = false
    } = options;
    this.inputs.push({
      id,
      label,
      type,
      value,
      placeholder,
      required
    });
    return this;
  }
  /**
   * Set modal size
   * @param {string|number} width - Modal width
   * @param {string|number} height - Modal height
   * @returns {ModalBuilder} This builder for chaining
   */
  setSize(width, height) {
    this.size = { width, height };
    return this;
  }
  /**
   * Set close handler
   * @param {Function} handler - Handler function called when modal closes
   * @returns {ModalBuilder} This builder for chaining
   */
  onClose(handler) {
    this.onCloseHandler = handler;
    return this;
  }
  /**
   * Set whether modal is closable
   * @param {boolean} closable - Whether modal can be closed (default: true)
   * @returns {ModalBuilder} This builder for chaining
   */
  setClosable(closable) {
    this.closable = closable;
    return this;
  }
  /**
   * Set modal ID
   * @param {string} id - Modal ID
   * @returns {ModalBuilder} This builder for chaining
   */
  setId(id) {
    this.id = id;
    return this;
  }
  /**
   * Build and show the modal
   * @returns {HTMLElement} The modal element
   */
  show() {
    let modal = document.getElementById("modal");
    if (!modal) {
      modal = DOMBuilder.create("div").attr("id", "modal").class("modal").build();
      document.body.appendChild(modal);
    }
    const modalContent = DOMBuilder.create("div").class("modal-content").build();
    if (this.size.width !== "auto") {
      modalContent.style.width = typeof this.size.width === "number" ? `${this.size.width}px` : this.size.width;
    }
    if (this.size.height !== "auto") {
      modalContent.style.height = typeof this.size.height === "number" ? `${this.size.height}px` : this.size.height;
    }
    if (this.closable) {
      const closeBtn = DOMBuilder.create("span").class("modal-close").text("×").on("click", () => this.close()).build();
      modalContent.appendChild(closeBtn);
    }
    if (this.title) {
      const titleElement = DOMBuilder.create("h3").text(this.title).build();
      modalContent.appendChild(titleElement);
    }
    const modalBody = DOMBuilder.create("div").attr("id", "modal-body").build();
    this.inputs.forEach((input) => {
      const inputContainer = DOMBuilder.create("div").class("modal-input-group").build();
      if (input.label) {
        const label = DOMBuilder.create("label").attr("for", input.id).text(input.label).build();
        inputContainer.appendChild(label);
      }
      const inputElement = DOMBuilder.create("input").attr("id", input.id).attr("type", input.type).attr("value", input.value).attr("placeholder", input.placeholder).attr("required", input.required).build();
      inputContainer.appendChild(inputElement);
      modalBody.appendChild(inputContainer);
    });
    if (this.content) {
      if (typeof this.content === "string") {
        const contentDiv = DOMBuilder.create("div").html(this.content).build();
        modalBody.appendChild(contentDiv);
      } else if (this.content instanceof HTMLElement) {
        modalBody.appendChild(this.content);
      }
    }
    if (this.buttons.length > 0) {
      const buttonContainer = DOMBuilder.create("div").class("modal-buttons").build();
      this.buttons.forEach((button, index) => {
        console.log("[ModalBuilder.show] Processing button", index, "- text:", button.text, "className:", button.className, "type:", typeof button.className, "isNull:", button.className === null, "isEmptyString:", button.className === "");
        const btn = DOMBuilder.create("button");
        const className = button.className;
        if (className === "") {
          console.error("[ModalBuilder.show] CRITICAL: button.className is empty string! Skipping class addition.");
        } else if (className && typeof className === "string" && className !== "" && className.trim().length > 0) {
          const trimmed = className.trim();
          if (trimmed && trimmed.length > 0) {
            console.log("[ModalBuilder.show] Calling btn.class() with:", trimmed);
            btn.class(trimmed);
          } else {
            console.warn("[ModalBuilder.show] Skipping btn.class() - trimmed is empty");
          }
        } else {
          console.log("[ModalBuilder.show] Skipping btn.class() - className is null/undefined/empty");
        }
        const btnElement = btn.text(button.text).on("click", (e) => {
          if (button.handler) {
            button.handler(e);
          }
          if (button.closeOnClick) {
            this.close();
          }
        }).build();
        buttonContainer.appendChild(btnElement);
      });
      modalBody.appendChild(buttonContainer);
    }
    modalContent.appendChild(modalBody);
    modal.innerHTML = "";
    modal.appendChild(modalContent);
    this.modal = modal;
    this.modalContent = modalContent;
    this.modalBody = modalBody;
    modal.classList.add("active");
    if (this.inputs.length > 0) {
      setTimeout(() => {
        const firstInput = modalBody.querySelector("input");
        if (firstInput) {
          firstInput.focus();
          firstInput.select();
        }
      }, 50);
    }
    if (this.closable) {
      const clickOutsideHandler = (e) => {
        if (e.target === modal) {
          this.close();
        }
      };
      modal.addEventListener("click", clickOutsideHandler);
      this._clickOutsideHandler = clickOutsideHandler;
    }
    return modal;
  }
  /**
   * Close the modal
   */
  close() {
    if (this.modal) {
      this.modal.classList.remove("active");
      if (this._clickOutsideHandler) {
        this.modal.removeEventListener("click", this._clickOutsideHandler);
        this._clickOutsideHandler = null;
      }
      if (this.onCloseHandler) {
        this.onCloseHandler();
      }
    }
  }
  /**
   * Get the modal element
   * @returns {HTMLElement|null} Modal element
   */
  getModal() {
    return this.modal;
  }
  /**
   * Get the modal body element
   * @returns {HTMLElement|null} Modal body element
   */
  getBody() {
    return this.modalBody;
  }
}
class ModalService {
  constructor() {
  }
  /**
   * Process element data from form
   * @param {Object} formData - Raw form data
   * @returns {Object} Processed element data
   */
  processElementData(formData) {
    return formData;
  }
  applyTextUpdate({ element, newText, undoRedoManager, pageId, binId, elementIndex }) {
    if (!element) {
      return;
    }
    const oldText = element.text || "";
    const nextText = (newText ?? "").trim();
    if (oldText !== nextText && undoRedoManager) {
      undoRedoManager.recordElementPropertyChange(pageId, binId, elementIndex, "text", nextText, oldText);
    }
    element.text = nextText;
  }
  applyElementEditUpdates({ element, updates, undoRedoManager, pageId, binId, elementIndex }) {
    if (!element || !updates) {
      return;
    }
    if (updates.text !== void 0) {
      this.applyTextUpdate({
        element,
        newText: updates.text,
        undoRedoManager,
        pageId,
        binId,
        elementIndex
      });
    }
    if (updates.progressEnabled !== void 0) {
      if (updates.progressEnabled) {
        element.progress = parseInt(updates.progressValue, 10) || 0;
      } else {
        delete element.progress;
      }
    }
    if (updates.recurringEnabled !== void 0) {
      if (updates.recurringEnabled) {
        element.recurringSchedule = updates.recurringSchedule;
        if (updates.recurringSchedule === "custom") {
          element.recurringCustomPattern = (updates.recurringCustomPattern || "").trim();
        } else {
          delete element.recurringCustomPattern;
        }
      } else {
        delete element.recurringSchedule;
        delete element.recurringCustomPattern;
      }
    }
    if (updates.deadlineEnabled !== void 0) {
      if (updates.deadlineEnabled && updates.deadlineDate) {
        const timeValue = updates.deadlineTime || "00:00";
        element.deadline = `${updates.deadlineDate}T${timeValue}:00`;
      } else {
        delete element.deadline;
      }
    }
    if (updates.persistentEnabled !== void 0) {
      if (updates.persistentEnabled) {
        element.persistent = true;
      } else if (element.type !== "image") {
        delete element.persistent;
      }
    }
    if (updates.timeEnabled !== void 0) {
      if (updates.timeEnabled) {
        element.timeAllocated = (updates.timeValue || "").trim();
      } else {
        element.timeAllocated = "";
      }
    } else if (updates.timeValue !== void 0) {
      element.timeAllocated = (updates.timeValue || "").trim();
    }
    if (updates.funEnabled !== void 0) {
      if (updates.funEnabled) {
        element.funModifier = (updates.funValue || "").trim();
      } else {
        element.funModifier = "";
      }
    } else if (updates.funValue !== void 0) {
      element.funModifier = (updates.funValue || "").trim();
    }
    if (updates.repeatsEnabled !== void 0) {
      element.repeats = updates.repeatsEnabled;
    }
  }
  /**
   * Process page data from form
   * @param {Object} formData - Raw form data
   * @returns {Object} Processed page data
   */
  processPageData(formData) {
    return formData;
  }
  /**
   * Process bin data from form
   * @param {Object} formData - Raw form data
   * @returns {Object} Processed bin data
   */
  processBinData(formData) {
    return formData;
  }
}
class ModalRenderer {
  constructor() {
    this.modal = document.getElementById("modal");
    this.modalContent = this.modal?.querySelector(".modal-content");
  }
  /**
   * Show modal
   */
  show() {
    if (this.modal) {
      this.modal.classList.add("active");
    }
  }
  /**
   * Hide modal
   */
  hide() {
    if (this.modal) {
      this.modal.classList.remove("active");
      this.modal.style.display = "none";
    }
  }
  /**
   * Set modal content HTML
   * @param {string} html - HTML content
   */
  setContent(html) {
    if (this.modalContent) {
      this.modalContent.innerHTML = html;
    }
  }
  /**
   * Get modal body element
   * @returns {HTMLElement|null}
   */
  getModalBody() {
    return document.getElementById("modal-body");
  }
  /**
   * Escape HTML for safe rendering
   * @param {string} text - Text to escape
   * @returns {string}
   */
  escapeHtml(text) {
    return StringUtils.escapeHtml(text);
  }
  /**
   * Render element type options HTML
   * @param {Array} options - Array of {key, type, label}
   * @returns {string} HTML string
   */
  renderElementTypeOptions(options) {
    return options.map((opt) => {
      const keyDisplay = opt.key.toUpperCase();
      return `<div class="element-type-option" data-type="${opt.type}" data-key="${opt.key}" style="padding: 5px; cursor: pointer; user-select: none;"><strong>${keyDisplay}</strong> - ${this.escapeHtml(opt.label)}</div>`;
    }).join("");
  }
  /**
   * Setup close button handler
   * @param {Function} onClose - Close handler function
   */
  setupCloseButton(onClose) {
    const closeBtn = this.modalContent?.querySelector(".modal-close");
    if (closeBtn) {
      closeBtn.onclick = onClose;
    }
  }
}
class ModalHandler {
  constructor() {
    this.modalService = new ModalService();
    this.modalRenderer = new ModalRenderer();
  }
  /**
   * Get services
   */
  _getAppState() {
    return getService(SERVICES.APP_STATE);
  }
  _getDocument(pageId) {
    const appState2 = this._getAppState();
    return appState2.documents?.find((page) => page.id === pageId) || null;
  }
  _getGroup(pageId, binId) {
    const document2 = this._getDocument(pageId);
    const group = document2?.groups?.find((bin) => bin.id === binId) || null;
    if (!group) return null;
    const items = group.items || [];
    group.items = items;
    return group;
  }
  _getElementTypeManager() {
    return getService(SERVICES.ELEMENT_TYPE_MANAGER);
  }
  _getElementManager() {
    return getService(SERVICES.ELEMENT_MANAGER);
  }
  _getDataManager() {
    return getService(SERVICES.DATA_MANAGER);
  }
  _getUndoRedoManager() {
    return getService(SERVICES.UNDO_REDO_MANAGER);
  }
  _getTagManager() {
    return getService(SERVICES.TAG_MANAGER);
  }
  _getFileManager() {
    return getService(SERVICES.FILE_MANAGER);
  }
  _getFormatRendererManager() {
    return getService(SERVICES.FORMAT_RENDERER_MANAGER);
  }
  _getPagePluginManager() {
    return getService(SERVICES.PAGE_PLUGIN_MANAGER);
  }
  _getBinPluginManager() {
    return getService(SERVICES.BIN_PLUGIN_MANAGER);
  }
  _getVisualSettingsManager() {
    return getService(SERVICES.VISUAL_SETTINGS_MANAGER);
  }
  _getThemeManager() {
    return getService(SERVICES.THEME_MANAGER);
  }
  _getSettingsManager() {
    return getService(SERVICES.SETTINGS_MANAGER);
  }
  _getApp() {
    return window.app || null;
  }
  escapeHtml(text) {
    return StringUtils.escapeHtml(text);
  }
  showAddElementModal(pageId, binId, elementIndex = null) {
    const baseTypes = {
      "1": "task",
      "2": "header",
      "3": "header-checkbox",
      "4": "multi-checkbox",
      "5": "audio",
      "6": "one-time",
      "7": "timer",
      "8": "counter",
      "9": "tracker",
      "0": "rating",
      "q": "time-log",
      "i": "image",
      "c": "calendar"
    };
    const allElementTypes = new Map(Object.entries(baseTypes));
    const elementTypeManager = this._getElementTypeManager();
    if (elementTypeManager) {
      const registeredTypes = elementTypeManager.getAllElementTypes();
      registeredTypes.forEach((plugin) => {
        if (plugin.keyboardShortcut && plugin.elementType) {
          allElementTypes.set(plugin.keyboardShortcut.toLowerCase(), plugin.elementType);
        }
      });
    }
    const baseOptions = [
      { key: "1", type: "task", label: "Task" },
      { key: "2", type: "header-checkbox", label: "Header" },
      { key: "3", type: "header-checkbox", label: "Header with Checkbox" },
      { key: "4", type: "multi-checkbox", label: "Multi-checkbox" },
      { key: "5", type: "audio", label: "Audio" },
      { key: "6", type: "one-time", label: "One-time Task" },
      { key: "7", type: "timer", label: "Timer" },
      { key: "8", type: "counter", label: "Counter" },
      { key: "9", type: "tracker", label: "Tracker" },
      { key: "0", type: "rating", label: "Rating" },
      { key: "q", type: "time-log", label: "Time Log" },
      { key: "i", type: "image", label: "Image" },
      { key: "c", type: "calendar", label: "Calendar" }
    ];
    const registeredOptions = [];
    if (elementTypeManager) {
      const registeredTypes = elementTypeManager.getAllElementTypes();
      registeredTypes.forEach((plugin) => {
        if (plugin.keyboardShortcut && plugin.elementType && plugin.name) {
          if (!baseTypes[plugin.keyboardShortcut.toLowerCase()]) {
            registeredOptions.push({
              key: plugin.keyboardShortcut.toLowerCase(),
              type: plugin.elementType,
              label: plugin.name
            });
          }
        }
      });
    }
    registeredOptions.sort((a, b) => a.key.localeCompare(b.key));
    const allOptions = [...baseOptions, ...registeredOptions];
    const optionsHTML = allOptions.map((opt) => {
      const keyDisplay = opt.key.toUpperCase();
      return `<div class="element-type-option" data-type="${opt.type}" data-key="${opt.key}" style="padding: 5px; cursor: pointer; user-select: none;"><strong>${keyDisplay}</strong> - ${this.escapeHtml(opt.label)}</div>`;
    }).join("");
    const modal = document.getElementById("modal");
    const modalContent = modal.querySelector(".modal-content");
    modalContent.innerHTML = `
            <div id="element-count-display" style="position: absolute; top: 10px; left: 50%; transform: translateX(-50%); font-size: 36px; font-weight: bold; color: rgb(74, 158, 255); pointer-events: none; user-select: none; display: none; z-index: 2001; text-shadow: rgba(0, 0, 0, 0.8) 0px 2px 8px; background: rgba(45, 45, 45, 0.95); padding: 8px 16px; border-radius: 8px; border: 2px solid rgb(74, 158, 255); min-width: 60px; text-align: center;">1</div>
            <span class="modal-close">×</span>
            <div id="modal-body" style="max-height: 70vh; overflow-y: auto; padding-right: 10px;">
                <h3>Add Element</h3>
                <p style="margin-bottom: 15px;">Press a key, click, or drag to set count:</p>
                <div style="margin: 10px 0;" id="element-type-options">
                    ${optionsHTML}
                </div>
                <div style="margin-top: 20px;">
                    <button class="cancel" onclick="app.modalHandler.closeModal()">Cancel</button>
                </div>
            </div>
        `;
    modal.classList.add("active");
    const modalBody = document.getElementById("modal-body");
    const originalCloseModal = this.closeModal.bind(this);
    const app2 = this._getApp();
    let elementCount = 1;
    const countDisplay = document.getElementById("element-count-display");
    const closeBtn = modalContent.querySelector(".modal-close");
    if (closeBtn) {
      closeBtn.onclick = () => {
        document.removeEventListener("keydown", keyHandler);
        app2.modalHandler.closeModal = originalCloseModal;
        app2.modalHandler.closeModal();
      };
    }
    const capturedElementIndex = elementIndex;
    const handleOptionClick = (type, count = 1) => {
      document.removeEventListener("keydown", keyHandler);
      if (!app2) {
        console.error("[ModalHandler] app is undefined in handleOptionClick");
        this.closeModal();
        return;
      }
      app2.modalHandler.closeModal = originalCloseModal;
      app2.modalHandler.closeModal();
      let firstElementIndex = null;
      let firstElement = null;
      let currentInsertIndex = capturedElementIndex;
      const page = (app2.appState?.documents || app2.documents || []).find((p) => p.id === pageId);
      if (!page) return;
      const bin = page.groups?.find((b) => b.id === binId);
      if (!bin) return;
      const items = bin.items || [];
      bin.items = items;
      if (capturedElementIndex !== null) {
        for (let i = 0; i < count; i++) {
          const newElement = app2.elementManager.createElementTemplate(type);
          const insertIndex = currentInsertIndex + 1;
          items.splice(insertIndex, 0, newElement);
          if (i === 0) {
            firstElementIndex = insertIndex;
            firstElement = newElement;
          }
          currentInsertIndex++;
        }
      } else {
        const startIndex = items.length;
        for (let i = 0; i < count; i++) {
          const newElement = app2.elementManager.createElementTemplate(type);
          items.push(newElement);
          if (i === 0) {
            firstElementIndex = startIndex;
            firstElement = newElement;
          }
        }
      }
      app2.dataManager.saveData();
      eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
      if (firstElementIndex !== null && firstElement) {
        if (count > 1) {
          app2.multiEditState = {
            pageId,
            binId,
            startIndex: firstElementIndex,
            endIndex: firstElementIndex + count - 1,
            currentIndex: firstElementIndex
          };
        } else {
          app2.multiEditState = null;
        }
        setTimeout(() => {
          app2.modalHandler.showEditModal(pageId, binId, firstElementIndex, firstElement);
          setTimeout(() => {
            const textInput = document.getElementById("edit-text");
            if (textInput) {
              textInput.focus();
              textInput.select();
            }
          }, 50);
        }, 50);
      }
    };
    let dragState = {
      active: false,
      startX: 0,
      startCount: 1,
      currentType: null,
      pixelsPerElement: 20
    };
    let handledByMouseUp = false;
    const getClientX = (e) => {
      if (e.touches && e.touches.length > 0) {
        return e.touches[0].clientX;
      }
      if (e.changedTouches && e.changedTouches.length > 0) {
        return e.changedTouches[0].clientX;
      }
      return e.clientX;
    };
    const globalMove = (e) => {
      if (!dragState.active) return;
      const currentX = getClientX(e);
      const deltaX = currentX - dragState.startX;
      const countChange = Math.round(deltaX / dragState.pixelsPerElement);
      const newCount = Math.max(1, Math.min(10, dragState.startCount + countChange));
      if (newCount !== elementCount) {
        elementCount = newCount;
        countDisplay.textContent = elementCount;
      }
    };
    const globalUp = (e) => {
      if (!dragState.active) return;
      handledByMouseUp = true;
      const currentX = getClientX(e);
      const wasDragging = Math.abs(currentX - dragState.startX) > 5;
      const type = dragState.currentType;
      const finalCount = elementCount;
      dragState.active = false;
      dragState.startX = 0;
      dragState.currentType = null;
      countDisplay.style.display = "none";
      elementCount = 1;
      document.removeEventListener("mousemove", globalMove);
      document.removeEventListener("mouseup", globalUp);
      document.removeEventListener("touchmove", globalMove);
      document.removeEventListener("touchend", globalUp);
      let typeKey = null;
      for (const [key, value] of allElementTypes.entries()) {
        if (value === type) {
          typeKey = key;
          break;
        }
      }
      if (type && typeKey && allElementTypes.has(typeKey)) {
        if (wasDragging) {
          handleOptionClick(type, finalCount);
        } else {
          handleOptionClick(type, 1);
        }
      }
      setTimeout(() => {
        handledByMouseUp = false;
      }, 100);
    };
    const startDrag = (e, type, key) => {
      if (!type || !allElementTypes.has(key)) {
        return;
      }
      handledByMouseUp = false;
      const startX = getClientX(e);
      dragState.active = true;
      dragState.startX = startX;
      dragState.startCount = 1;
      dragState.currentType = type;
      elementCount = 1;
      countDisplay.style.display = "block";
      countDisplay.textContent = "1";
      document.addEventListener("mousemove", globalMove);
      document.addEventListener("mouseup", globalUp);
      document.addEventListener("touchmove", globalMove, { passive: false });
      document.addEventListener("touchend", globalUp);
      e.preventDefault();
      e.stopPropagation();
    };
    modalBody.querySelectorAll(".element-type-option").forEach((option) => {
      const type = option.dataset.type;
      const key = option.dataset.key;
      option.addEventListener("mousedown", (e) => {
        startDrag(e, type, key);
      });
      option.addEventListener("touchstart", (e) => {
        startDrag(e, type, key);
      }, { passive: false });
      option.addEventListener("click", (e) => {
        if (handledByMouseUp) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        if (!dragState.active) {
          if (type && key && allElementTypes.has(key)) {
            handleOptionClick(type, 1);
          }
        }
      });
    });
    const keyHandler = (e) => {
      const key = e.key.toLowerCase();
      if (allElementTypes.has(key)) {
        e.preventDefault();
        e.stopPropagation();
        document.removeEventListener("keydown", keyHandler);
        handleOptionClick(allElementTypes.get(key), 1);
      } else if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        document.removeEventListener("keydown", keyHandler);
        app2.modalHandler.closeModal = originalCloseModal;
        app2.modalHandler.closeModal();
      }
    };
    document.addEventListener("keydown", keyHandler);
    this.closeModal = () => {
      document.removeEventListener("keydown", keyHandler);
      app2.modalHandler.closeModal = originalCloseModal;
      originalCloseModal();
    };
  }
  showAddChildElementModal(pageId, binId, elementIndex) {
    const types = {
      "1": "task",
      "2": "header",
      "3": "header-checkbox",
      "4": "multi-checkbox",
      "5": "audio",
      "6": "one-time",
      "7": "timer",
      "8": "counter",
      "9": "tracker",
      "0": "rating",
      "q": "time-log"
    };
    const modal = document.getElementById("modal");
    const modalContent = modal.querySelector(".modal-content");
    const modalBody = document.getElementById("modal-body");
    modalContent.innerHTML = `
            <div id="element-count-display" style="position: absolute; top: 10px; left: 50%; transform: translateX(-50%); font-size: 36px; font-weight: bold; color: rgb(74, 158, 255); pointer-events: none; user-select: none; display: none; z-index: 2001; text-shadow: rgba(0, 0, 0, 0.8) 0px 2px 8px; background: rgba(45, 45, 45, 0.95); padding: 8px 16px; border-radius: 8px; border: 2px solid rgb(74, 158, 255); min-width: 60px; text-align: center;">1</div>
            <span class="modal-close">×</span>
            <div id="modal-body">
                <h3>Add Child Element</h3>
                <p style="margin-bottom: 15px;">Press a number key, click, or drag to set count:</p>
                <div style="margin: 10px 0;">
                    <div class="element-type-option" data-type="task" style="padding: 5px; cursor: pointer; user-select: none;"><strong>1</strong> - Task</div>
                    <div class="element-type-option" data-type="header-checkbox" style="padding: 5px; cursor: pointer; user-select: none;"><strong>2</strong> - Header</div>
                    <div class="element-type-option" data-type="header-checkbox" style="padding: 5px; cursor: pointer; user-select: none;"><strong>3</strong> - Header with Checkbox</div>
                    <div class="element-type-option" data-type="multi-checkbox" style="padding: 5px; cursor: pointer; user-select: none;"><strong>4</strong> - Multi-checkbox</div>
                    <div class="element-type-option" data-type="audio" style="padding: 5px; cursor: pointer; user-select: none;"><strong>5</strong> - Audio</div>
                    <div class="element-type-option" data-type="one-time" style="padding: 5px; cursor: pointer; user-select: none;"><strong>6</strong> - One-time Task</div>
                    <div class="element-type-option" data-type="timer" style="padding: 5px; cursor: pointer; user-select: none;"><strong>7</strong> - Timer</div>
                    <div class="element-type-option" data-type="counter" style="padding: 5px; cursor: pointer; user-select: none;"><strong>8</strong> - Counter</div>
                    <div class="element-type-option" data-type="tracker" style="padding: 5px; cursor: pointer; user-select: none;"><strong>9</strong> - Tracker</div>
                    <div class="element-type-option" data-type="rating" style="padding: 5px; cursor: pointer; user-select: none;"><strong>0</strong> - Rating</div>
                    <div class="element-type-option" data-type="time-log" style="padding: 5px; cursor: pointer; user-select: none;"><strong>Q</strong> - Time Log</div>
                    <div class="element-type-option" data-type="image" style="padding: 5px; cursor: pointer; user-select: none;"><strong>I</strong> - Image</div>
                </div>
                <div style="margin-top: 20px;">
                    <button class="cancel" onclick="app.modalHandler.closeModal()">Cancel</button>
                </div>
            </div>
        `;
    modal.classList.add("active");
    const originalCloseModal = this.closeModal.bind(this);
    const app2 = this._getApp();
    let elementCount = 1;
    const countDisplay = document.getElementById("element-count-display");
    const closeBtn = modalContent.querySelector(".modal-close");
    if (closeBtn) {
      closeBtn.onclick = () => {
        document.removeEventListener("keydown", keyHandler);
        app2.modalHandler.closeModal = originalCloseModal;
        app2.modalHandler.closeModal();
      };
    }
    const handleOptionClick = (type, count = 1) => {
      document.removeEventListener("keydown", keyHandler);
      if (!app2) {
        console.error("[ModalHandler] app is undefined in handleOptionClick");
        this.closeModal();
        return;
      }
      app2.modalHandler.closeModal = originalCloseModal;
      app2.modalHandler.closeModal();
      const page = (app2.appState?.documents || app2.documents || []).find((p) => p.id === pageId);
      if (!page) return;
      const bin = page.groups?.find((b) => b.id === binId);
      if (!bin) return;
      const items = bin.items || [];
      bin.items = items;
      const element = ItemHierarchy.getRootItemAtIndex(items, elementIndex);
      if (!element) return;
      if (!Array.isArray(element.childIds)) {
        element.childIds = [];
      }
      for (let i = 0; i < count; i++) {
        const newChild = app2.elementManager.createElementTemplate(type);
        if (!newChild.id) {
          newChild.id = `item-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        }
        newChild.parentId = element.id;
        newChild.childIds = Array.isArray(newChild.childIds) ? newChild.childIds : [];
        element.childIds.push(newChild.id);
        items.push(newChild);
      }
      app2.dataManager.saveData();
      eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
    };
    let dragState = {
      active: false,
      startX: 0,
      startCount: 1,
      currentType: null,
      pixelsPerElement: 20
    };
    let handledByMouseUp = false;
    const getClientX = (e) => {
      if (e.touches && e.touches.length > 0) {
        return e.touches[0].clientX;
      }
      if (e.changedTouches && e.changedTouches.length > 0) {
        return e.changedTouches[0].clientX;
      }
      return e.clientX;
    };
    const globalMove = (e) => {
      if (!dragState.active) return;
      const currentX = getClientX(e);
      const deltaX = currentX - dragState.startX;
      const countChange = Math.round(deltaX / dragState.pixelsPerElement);
      const newCount = Math.max(1, Math.min(10, dragState.startCount + countChange));
      if (newCount !== elementCount) {
        elementCount = newCount;
        countDisplay.textContent = elementCount;
        countDisplay.style.display = "block";
      }
    };
    const globalUp = (e) => {
      if (!dragState.active) return;
      handledByMouseUp = true;
      const currentX = getClientX(e);
      const wasDragging = Math.abs(currentX - dragState.startX) > 5;
      const type = dragState.currentType;
      const finalCount = elementCount;
      dragState.active = false;
      dragState.startX = 0;
      dragState.currentType = null;
      countDisplay.style.display = "none";
      elementCount = 1;
      document.removeEventListener("mousemove", globalMove);
      document.removeEventListener("mouseup", globalUp);
      document.removeEventListener("touchmove", globalMove);
      document.removeEventListener("touchend", globalUp);
      if (type && types[Object.keys(types).find((k) => types[k] === type)]) {
        if (wasDragging) {
          handleOptionClick(type, finalCount);
        } else {
          handleOptionClick(type, 1);
        }
      }
      setTimeout(() => {
        handledByMouseUp = false;
      }, 100);
    };
    const keyHandler = (e) => {
      if (types[e.key]) {
        e.preventDefault();
        handleOptionClick(types[e.key], 1);
      } else if (e.key === "Escape") {
        document.removeEventListener("keydown", keyHandler);
        app2.modalHandler.closeModal = originalCloseModal;
        app2.modalHandler.closeModal();
      }
    };
    document.addEventListener("keydown", keyHandler);
    const startDragChild = (e, type) => {
      if (!type) {
        return;
      }
      handledByMouseUp = false;
      const startX = getClientX(e);
      dragState.active = true;
      dragState.startX = startX;
      dragState.startCount = elementCount;
      dragState.currentType = type;
      elementCount = 1;
      countDisplay.textContent = "1";
      countDisplay.style.display = "block";
      document.addEventListener("mousemove", globalMove);
      document.addEventListener("mouseup", globalUp);
      document.addEventListener("touchmove", globalMove, { passive: false });
      document.addEventListener("touchend", globalUp);
      e.preventDefault();
      e.stopPropagation();
    };
    modalBody.querySelectorAll(".element-type-option").forEach((option) => {
      const type = option.dataset.type;
      option.addEventListener("mousedown", (e) => {
        startDragChild(e, type);
      });
      option.addEventListener("touchstart", (e) => {
        startDragChild(e, type);
      }, { passive: false });
      option.addEventListener("click", (e) => {
        if (handledByMouseUp) {
          return;
        }
        const type2 = option.dataset.type;
        handleOptionClick(type2, 1);
        document.removeEventListener("keydown", keyHandler);
      });
    });
  }
  /**
   * Show an alert dialog (replaces browser alert)
   * @param {string} message - Message to display
   * @returns {Promise<void>}
   */
  async showAlert(message) {
    return new Promise((resolve) => {
      const modalBodyHtml = `
                <div style="padding: 20px; text-align: center;">
                    <p style="margin-bottom: 20px; color: #e0e0e0;">${this.escapeHtml(message)}</p>
                    <button onclick="app.modalHandler.closeModal(); app.modalHandler._alertResolve();" 
                            style="padding: 10px 20px; background: #4a9eff; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        OK
                    </button>
                </div>
            `;
      this.modalRenderer?.setContent(modalBodyHtml);
      this.modalRenderer?.show();
      this._alertResolve = resolve;
    });
  }
  /**
   * Show a confirmation dialog (replaces browser confirm)
   * @param {string} message - Message to display
   * @returns {Promise<boolean>}
   */
  async showConfirm(message) {
    return new Promise((resolve) => {
      this._confirmResolve = resolve;
      const builder = new ModalBuilder(this.app).setTitle("Confirm").setContent(`<p style="margin-bottom: 20px; color: #e0e0e0; text-align: center;">${this.escapeHtml(message)}</p>`).addButton("OK", () => {
        this._confirmResolve(true);
      }, { primary: true }).addButton("Cancel", () => {
        this._confirmResolve(false);
      });
      builder.show();
    });
  }
  /**
   * Show a prompt dialog (replaces browser prompt)
   * @param {string} message - Message to display
   * @param {string} defaultValue - Default input value
   * @returns {Promise<string|null>}
   */
  async showPrompt(message, defaultValue = "") {
    return new Promise((resolve) => {
      const inputId = "prompt-input-" + Date.now();
      const modalBodyHtml = `
                <div style="padding: 20px;">
                    <p style="margin-bottom: 15px; color: #e0e0e0;">${this.escapeHtml(message)}</p>
                    <input type="text" id="${inputId}" value="${this.escapeHtml(defaultValue)}" 
                           style="width: 100%; padding: 8px; margin-bottom: 20px; background: #1a1a1a; color: #e0e0e0; border: 1px solid #555; border-radius: 4px; box-sizing: border-box;" 
                           autofocus />
                    <div style="display: flex; gap: 10px; justify-content: flex-end;">
                        <button onclick="app.modalHandler.closeModal(); app.modalHandler._promptResolve(null);" 
                                style="padding: 10px 20px; background: #555; color: white; border: none; border-radius: 4px; cursor: pointer;">
                            Cancel
                        </button>
                        <button onclick="app.modalHandler._handlePromptSubmit('${inputId}');" 
                                style="padding: 10px 20px; background: #4a9eff; color: white; border: none; border-radius: 4px; cursor: pointer;">
                            OK
                        </button>
                    </div>
                </div>
            `;
      this.modalRenderer?.setContent(modalBodyHtml);
      this.modalRenderer?.show();
      this._promptResolve = resolve;
      setTimeout(() => {
        const input = document.getElementById(inputId);
        if (input) {
          input.focus();
          input.select();
          input.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
              this._handlePromptSubmit(inputId);
            }
          });
        }
      }, 100);
    });
  }
  _handlePromptSubmit(inputId) {
    const input = document.getElementById(inputId);
    const value = input ? input.value.trim() : null;
    this.closeModal();
    if (this._promptResolve) {
      this._promptResolve(value || null);
      this._promptResolve = null;
    }
  }
  closeModal() {
    const modal = document.getElementById("modal");
    if (modal) {
      modal.classList.remove("active");
    }
    const appState2 = this._getAppState();
    if (appState2) {
      if (appState2.currentEdit !== void 0) {
        appState2.currentEdit = null;
      }
      if (appState2.currentEditModal !== void 0) {
        appState2.currentEditModal = null;
      }
    }
    if (this._formatRegisteredHandlers && this._formatRegisteredHandlers.size > 0) {
      this._formatRegisteredHandlers.forEach((handler, pageId) => {
        eventBus.off("format:registered", handler);
      });
      this._formatRegisteredHandlers.clear();
    }
    if (this._currentEnterKeyHandler) {
      document.removeEventListener("keydown", this._currentEnterKeyHandler, true);
      this._currentEnterKeyHandler = null;
    }
  }
  showTooltip(text) {
    const tooltip = document.getElementById("global-tooltip");
    if (tooltip) {
      tooltip.textContent = text;
      tooltip.classList.add("visible");
    }
  }
  hideTooltip() {
    const tooltip = document.getElementById("global-tooltip");
    if (tooltip) {
      tooltip.classList.remove("visible");
    }
  }
  showViewDataModal(element, isSubtask = false) {
    const modal = document.getElementById("modal");
    const modalBody = document.getElementById("modal-body");
    let html = `<h3>Element Data</h3>`;
    html += `<div class="data-display">`;
    html += `<pre>${this.escapeHtml(JSON.stringify(element, null, 2))}</pre>`;
    html += `</div>`;
    html += `
            <div style="margin-top: 20px;">
                <button class="cancel" onclick="app.modalHandler.closeModal()">Close</button>
            </div>
        `;
    modalBody.innerHTML = html;
    modal.classList.add("active");
    const handleEnterKey = (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        this.closeModal();
        document.removeEventListener("keydown", handleEnterKey);
        const appState3 = this._getAppState();
        if (appState3) {
          appState3.currentEnterKeyHandler = null;
        }
      }
    };
    document.addEventListener("keydown", handleEnterKey);
    const appState2 = this._getAppState();
    if (appState2) {
      appState2.currentEnterKeyHandler = handleEnterKey;
    }
  }
  showEditModal(pageId, binId, elementIndex, element) {
    const modal = document.getElementById("modal");
    const modalBody = document.getElementById("modal-body");
    const appState2 = this._getAppState();
    const page = appState2.documents.find((p) => p.id === pageId);
    if (!page) return;
    const bin = page.groups?.find((b) => b.id === binId);
    if (!bin) return;
    let html = ``;
    if (element.type === "task" || element.type === "header-checkbox" || element.type === "audio" || element.type === "timer" || element.type === "counter" || element.type === "tracker" || element.type === "rating" || element.type === "time-log") {
      let editText = element.text || "";
      if (/<[a-z][a-z0-9]*[^>]*>/i.test(editText)) {
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = editText;
        editText = tempDiv.textContent || tempDiv.innerText || editText;
      }
      html += `
                <label>Text:</label>
                <textarea id="edit-text" style="width: 100%; min-height: 60px; padding: 8px; background: #1a1a1a; color: #e0e0e0; border: 1px solid #555; border-radius: 4px; font-family: inherit; resize: vertical;">${this.escapeHtml(editText)}</textarea>
            `;
    }
    if (element.type === "audio") {
      html += `
                <div style="margin-top: 15px; padding: 10px; background: #1a1a1a; border-radius: 4px;">
                    <label style="font-weight: 600;">Current Recording:</label>
                    <div style="margin-top: 5px; color: #888; font-size: 12px;">
                        ${element.audioFile ? `File: ${element.audioFile}${element.date ? ` (${element.date})` : ""}` : "No recording"}
                    </div>
                    <div style="margin-top: 10px; display: flex; gap: 8px;">
                        ${element.audioFile ? `
                            <button onclick="window.app && window.app.modalHandler && window.app.modalHandler.overwriteAudioRecording('${pageId}', '${binId}', ${elementIndex})" style="padding: 6px 12px; background: #ff5555; color: white; border: none; border-radius: 4px; cursor: pointer;">Overwrite Recording</button>
                        ` : ""}
                        <button onclick="window.app && window.app.modalHandler && window.app.modalHandler.toggleArchiveViewInEdit('${pageId}', '${binId}', ${elementIndex})" style="padding: 6px 12px; background: #4a9eff; color: white; border: none; border-radius: 4px; cursor: pointer;">View Archive</button>
                    </div>
                    <div id="archive-view-edit-${pageId}-${elementIndex}" style="display: none; margin-top: 10px;"></div>
                </div>
            `;
    }
    if (element.type === "counter") {
      html += `
                <div style="margin-top: 15px; padding: 10px; background: #1a1a1a; border-radius: 4px;">
                    <label style="font-weight: 600;">Counter Settings:</label>
                    <div style="margin-top: 10px;">
                        <label>Current Value:</label>
                        <input type="number" id="edit-counter-value" value="${element.value || 0}" style="width: 100px;" />
                    </div>
                    <div style="margin-top: 10px;">
                        <label>Increment +5:</label>
                        <input type="number" id="edit-counter-increment5" value="${element.increment5 || 5}" style="width: 100px;" />
                    </div>
                    <div style="margin-top: 10px;">
                        <label>Custom Increment:</label>
                        <input type="number" id="edit-counter-custom" value="${element.customIncrement || 10}" style="width: 100px;" />
                    </div>
                </div>
            `;
    }
    if (element.type === "tracker") {
      html += `
                <div style="margin-top: 15px; padding: 10px; background: #1a1a1a; border-radius: 4px;">
                    <label style="font-weight: 600;">Tracker Settings:</label>
                    <div style="margin-top: 10px;">
                        <label style="display: flex; align-items: center; gap: 8px;">
                            <input type="radio" name="tracker-mode-${pageId}-${elementIndex}" value="daily" ${element.mode === "daily" || !element.mode ? "checked" : ""} />
                            <span>Daily (tracks completions per day, resets daily)</span>
                        </label>
                        <label style="display: flex; align-items: center; gap: 8px; margin-top: 5px;">
                            <input type="radio" name="tracker-mode-${pageId}-${elementIndex}" value="page" ${element.mode === "page" ? "checked" : ""} />
                            <span>Page (counts checked elements in page, each check counts once)</span>
                        </label>
                    </div>
                </div>
            `;
    }
    if (element.type === "rating") {
      html += `
                <div style="margin-top: 15px; padding: 10px; background: #1a1a1a; border-radius: 4px;">
                    <label style="font-weight: 600;">Rating:</label>
                    <div style="margin-top: 10px;">
                        <label>Stars (0-5):</label>
                        <input type="number" id="edit-rating-stars" min="0" max="5" value="${element.rating || 0}" style="width: 100px;" />
                    </div>
                    <div style="margin-top: 10px;">
                        <label>Review:</label>
                        <textarea id="edit-rating-review" placeholder="Optional review..." style="width: 100%; min-height: 60px;">${this.escapeHtml(element.review || "")}</textarea>
                    </div>
                </div>
            `;
    }
    if (element.type === "timer") {
      html += `
                <div style="margin-top: 15px; padding: 10px; background: #1a1a1a; border-radius: 4px;">
                    <label style="font-weight: 600;">Timer Settings:</label>
                    <div style="margin-top: 10px;">
                        <label>Duration (seconds):</label>
                        <input type="number" id="edit-timer-duration" value="${element.duration || 3600}" min="1" style="width: 100px;" />
                    </div>
                    <div style="margin-top: 10px;">
                        <label>Alarm Sound:</label>
                        <select id="edit-timer-alarm" style="width: 200px;">
                            <option value="" ${!element.alarmSound ? "selected" : ""}>No Alarm</option>
                            <option value="/sounds/alarm.mp3" ${element.alarmSound === "/sounds/alarm.mp3" ? "selected" : ""}>Default Alarm</option>
                        </select>
                    </div>
                </div>
            `;
    }
    if (element.type === "calendar") {
      const defaultTags2 = ["work", "personal", "urgent", "important", "meeting", "deadline", "chore", "hobby"];
      const allTags2 = [.../* @__PURE__ */ new Set([...defaultTags2, ...element.targetTags || []])];
      html += `
                <div style="margin-top: 15px; padding: 10px; background: #1a1a1a; border-radius: 4px;">
                    <label style="font-weight: 600;">Calendar Settings:</label>
                    
                    <div style="margin-top: 10px;">
                        <label>Display Mode:</label>
                        <select id="edit-calendar-display-mode" style="width: 200px; margin-left: 10px;">
                            <option value="current-date" ${element.displayMode === "current-date" ? "selected" : ""}>Current Date & Summary</option>
                            <option value="one-day" ${element.displayMode === "one-day" ? "selected" : ""}>One Day (Scrollable)</option>
                            <option value="week" ${element.displayMode === "week" ? "selected" : ""}>Week View</option>
                            <option value="month" ${element.displayMode === "month" ? "selected" : ""}>Month View</option>
                        </select>
                    </div>
                    
                    <div style="margin-top: 15px;">
                        <label style="font-weight: 600;">Targeting Mode:</label>
                        <div style="margin-top: 5px;">
                            <label style="display: flex; align-items: center; gap: 8px;">
                                <input type="radio" name="calendar-targeting-${pageId}-${elementIndex}" value="default" ${element.targetingMode === "default" || !element.targetingMode ? "checked" : ""} />
                                <span>Default (all pages/bins)</span>
                            </label>
                            <label style="display: flex; align-items: center; gap: 8px; margin-top: 5px;">
                                <input type="radio" name="calendar-targeting-${pageId}-${elementIndex}" value="specific" ${element.targetingMode === "specific" ? "checked" : ""} />
                                <span>Specific (pages/bins/elements)</span>
                            </label>
                            <label style="display: flex; align-items: center; gap: 8px; margin-top: 5px;">
                                <input type="radio" name="calendar-targeting-${pageId}-${elementIndex}" value="tags" ${element.targetingMode === "tags" ? "checked" : ""} />
                                <span>Tags (automated selection)</span>
                            </label>
                        </div>
                    </div>
                    
                    <div id="edit-calendar-specific-options" style="margin-top: 10px; ${element.targetingMode === "specific" ? "" : "display: none;"}">
                        <div style="margin-top: 10px;">
                            <label>Target Pages:</label>
                            <div id="edit-calendar-target-pages" style="margin-top: 5px;">
                                ${(element.targetPages || []).map((pageId2) => `
                                    <div style="display: flex; gap: 5px; margin-bottom: 5px;">
                                        <select class="calendar-target-page" style="flex: 1;">
                                            ${(app.appState?.documents || app.documents || []).map((p) => `<option value="${p.id}" ${p.id === pageId2 ? "selected" : ""}>${p.title || p.id}</option>`).join("")}
                                        </select>
                                        <button type="button" class="remove-target-page" style="padding: 2px 8px; background: #ff5555; color: white; border: none; border-radius: 4px; cursor: pointer;">×</button>
                                    </div>
                                `).join("")}
                                <button type="button" id="add-target-page-btn" style="padding: 5px 10px; background: #4a9eff; color: white; border: none; border-radius: 4px; cursor: pointer; margin-top: 5px;">+ Add Page</button>
                            </div>
                        </div>
                    </div>
                    
                    <div id="edit-calendar-tags-options" style="margin-top: 10px; ${element.targetingMode === "tags" ? "" : "display: none;"}">
                        <div style="margin-top: 10px;">
                            <label>Target Tags:</label>
                            <div id="edit-calendar-target-tags" style="margin-top: 5px; display: flex; flex-wrap: wrap; gap: 5px;">
                                ${(element.targetTags || []).map((tag) => `
                                    <span style="display: inline-flex; align-items: center; gap: 5px; padding: 3px 8px; background: #4a9eff; color: white; border-radius: 12px; font-size: 12px;">
                                        ${this.escapeHtml(tag)}
                                        <button type="button" class="remove-tag" data-tag="${this.escapeHtml(tag)}" style="background: transparent; border: none; color: white; cursor: pointer; padding: 0; margin: 0; font-size: 14px; line-height: 1;">×</button>
                                    </span>
                                `).join("")}
                            </div>
                            <div style="margin-top: 10px;">
                                <label>Available Tags:</label>
                                <div style="display: flex; flex-wrap: wrap; gap: 5px; margin-top: 5px;">
                                    ${allTags2.map((tag) => `
                                        <button type="button" class="add-tag-btn" data-tag="${this.escapeHtml(tag)}" 
                                                style="padding: 3px 8px; background: ${(element.targetTags || []).includes(tag) ? "#555" : "#2a2a2a"}; color: #e0e0e0; border: 1px solid #555; border-radius: 12px; cursor: pointer; font-size: 12px;"
                                                ${(element.targetTags || []).includes(tag) ? "disabled" : ""}>
                                            ${this.escapeHtml(tag)}
                                        </button>
                                    `).join("")}
                                </div>
                                <div style="margin-top: 10px;">
                                    <input type="text" id="new-tag-input" placeholder="Add custom tag" style="width: 150px; padding: 5px; background: #1a1a1a; color: #e0e0e0; border: 1px solid #555; border-radius: 4px;" />
                                    <button type="button" id="add-custom-tag-btn" style="padding: 5px 10px; background: #4a9eff; color: white; border: none; border-radius: 4px; cursor: pointer; margin-left: 5px;">Add</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
    }
    const tagManager = this._getTagManager();
    const defaultTags = tagManager ? tagManager.getDefaultTags() : ["work", "personal", "urgent", "important", "meeting", "deadline", "chore", "hobby"];
    const allTags = tagManager ? tagManager.getAvailableTags() : [.../* @__PURE__ */ new Set([...defaultTags, ...element.tags || []])];
    html += `
            <div style="margin-top: 20px; padding: 15px; background: #2a2a2a; border-radius: 4px; border: 1px solid #444;">
                <label style="font-weight: 600; margin-bottom: 10px; display: block;">Tags:</label>
                <div id="edit-element-tags" style="margin-top: 5px; display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 10px;">
                    ${(element.tags || []).map((tag) => `
                        <span style="display: inline-flex; align-items: center; gap: 5px; padding: 3px 8px; background: #4a9eff; color: white; border-radius: 12px; font-size: 12px;">
                            ${this.escapeHtml(tag)}
                            <button type="button" class="remove-element-tag" data-tag="${this.escapeHtml(tag)}" style="background: transparent; border: none; color: white; cursor: pointer; padding: 0; margin: 0; font-size: 14px; line-height: 1;">×</button>
                        </span>
                    `).join("")}
                </div>
                <div style="margin-top: 10px;">
                    <label>Available Tags:</label>
                    <div style="display: flex; flex-wrap: wrap; gap: 5px; margin-top: 5px;">
                        ${allTags.map((tag) => `
                            <button type="button" class="add-element-tag-btn" data-tag="${this.escapeHtml(tag)}" 
                                    style="padding: 3px 8px; background: ${(element.tags || []).includes(tag) ? "#555" : "#2a2a2a"}; color: #e0e0e0; border: 1px solid #555; border-radius: 12px; cursor: pointer; font-size: 12px;"
                                    ${(element.tags || []).includes(tag) ? "disabled" : ""}>
                                ${this.escapeHtml(tag)}
                            </button>
                        `).join("")}
                    </div>
                    <div style="margin-top: 10px;">
                        <input type="text" id="new-element-tag-input" placeholder="Add custom tag" style="width: 150px; padding: 5px; background: #1a1a1a; color: #e0e0e0; border: 1px solid #555; border-radius: 4px;" />
                        <button type="button" id="add-custom-element-tag-btn" style="padding: 5px 10px; background: #4a9eff; color: white; border: none; border-radius: 4px; cursor: pointer; margin-left: 5px;">Add</button>
                    </div>
                </div>
            </div>
        `;
    const elementTypeManager = this._getElementTypeManager();
    if (element.customProperties || elementTypeManager) {
      html += `
                <div style="margin-top: 20px; padding: 15px; background: #2a2a2a; border-radius: 4px; border: 1px solid #444;">
                    <label style="font-weight: 600; margin-bottom: 10px; display: block;">Custom Properties:</label>
                    <div id="custom-properties-list" style="margin-bottom: 10px;">
            `;
      if (element.customProperties && Object.keys(element.customProperties).length > 0) {
        Object.keys(element.customProperties).forEach((key) => {
          html += `
                        <div class="custom-property-item" style="display: flex; gap: 10px; margin-bottom: 10px; padding: 8px; background: #1a1a1a; border-radius: 4px; align-items: center;">
                            <input type="text" class="custom-property-key" value="${this.escapeHtml(key)}" placeholder="Property name" style="flex: 1; padding: 6px; background: #2a2a2a; color: #e0e0e0; border: 1px solid #555; border-radius: 4px;" />
                            <input type="text" class="custom-property-value" value="${this.escapeHtml(element.customProperties[key])}" placeholder="Property value" style="flex: 1; padding: 6px; background: #2a2a2a; color: #e0e0e0; border: 1px solid #555; border-radius: 4px;" />
                            <button type="button" class="remove-custom-property-btn" style="padding: 6px 12px; background: #e74c3c; color: white; border: none; border-radius: 4px; cursor: pointer;">Remove</button>
                        </div>
                    `;
        });
      } else {
        html += '<p style="color: #888; font-size: 12px;">No custom properties</p>';
      }
      html += `
                    </div>
                    <button type="button" id="add-custom-property-btn" style="padding: 6px 12px; background: #4a9eff; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        + Add Property
                    </button>
                </div>
            `;
    }
    const hasTimeAllocated = element.timeAllocated && element.timeAllocated.trim() !== "";
    const hasFunModifier = element.funModifier && element.funModifier.trim() !== "";
    const hasRepeats = element.repeats !== false;
    html += `
            <div style="margin-top: 20px; padding: 15px; background: #2a2a2a; border-radius: 4px; border: 1px solid #444;">
                <label style="font-weight: 600; margin-bottom: 10px; display: block;">Plugins:</label>
                <div style="display: flex; align-items: center; gap: 20px; flex-wrap: wrap;">
                    <label style="display: flex; align-items: center; gap: 10px; margin: 0;">
                        <input type="checkbox" id="edit-plugin-progress" ${element.progress !== void 0 ? "checked" : ""} style="width: 18px; height: 18px; margin: 0;" />
                        <span>Progress Bar</span>
                    </label>
                    <label style="display: flex; align-items: center; gap: 10px; margin: 0;">
                        <input type="checkbox" id="edit-plugin-recurring" ${element.recurringSchedule ? "checked" : ""} style="width: 18px; height: 18px; margin: 0;" />
                        <span>Recurring Schedule</span>
                    </label>
                    <label style="display: flex; align-items: center; gap: 10px; margin: 0;">
                        <input type="checkbox" id="edit-plugin-deadline" ${element.deadline ? "checked" : ""} style="width: 18px; height: 18px; margin: 0;" />
                        <span>Deadline</span>
                    </label>
                    <label style="display: flex; align-items: center; gap: 10px; margin: 0;">
                        <input type="checkbox" id="edit-plugin-persistent" ${element.persistent || element.type === "image" ? "checked" : ""} ${element.type === "image" ? "disabled" : ""} style="width: 18px; height: 18px; margin: 0;" />
                        <span>Persistent${element.type === "image" ? " (always on for images)" : ""}</span>
                    </label>
                    <label style="display: flex; align-items: center; gap: 10px; margin: 0;">
                        <input type="checkbox" id="edit-plugin-time" ${hasTimeAllocated ? "checked" : ""} style="width: 18px; height: 18px; margin: 0;" />
                        <span>Time Allocated</span>
                    </label>
                    ${element.type !== "header-checkbox" ? `
                    <label style="display: flex; align-items: center; gap: 10px; margin: 0;">
                        <input type="checkbox" id="edit-plugin-fun" ${hasFunModifier ? "checked" : ""} style="width: 18px; height: 18px; margin: 0;" />
                        <span>Fun Modifier</span>
                    </label>
                    <label style="display: flex; align-items: center; gap: 10px; margin: 0;">
                        <input type="checkbox" id="edit-plugin-repeats" ${hasRepeats ? "checked" : ""} style="width: 18px; height: 18px; margin: 0;" />
                        <span>Reset Daily</span>
                    </label>
                    ` : ""}
                </div>
                
                <!-- Progress Bar options -->
                <div id="edit-plugin-progress-options" style="margin-top: 10px; ${element.progress === void 0 ? "display: none;" : ""}">
                    <label>Progress (0-100%):</label>
                    <input type="number" id="edit-progress-value" min="0" max="100" value="${element.progress || 0}" style="width: 100px;" />
                </div>
                
                <!-- Recurring Schedule options -->
                <div id="edit-plugin-recurring-options" style="margin-top: 10px; ${!element.recurringSchedule ? "display: none;" : ""}">
                    <label>Schedule:</label>
                    <select id="edit-recurring-schedule" style="width: 150px;">
                        <option value="daily" ${element.recurringSchedule === "daily" ? "selected" : ""}>Daily</option>
                        <option value="weekly" ${element.recurringSchedule === "weekly" ? "selected" : ""}>Weekly</option>
                        <option value="monthly" ${element.recurringSchedule === "monthly" ? "selected" : ""}>Monthly</option>
                        <option value="custom" ${element.recurringSchedule === "custom" ? "selected" : ""}>Custom</option>
                    </select>
                    <div id="edit-recurring-custom" style="margin-top: 5px; ${element.recurringSchedule === "custom" ? "" : "display: none;"}">
                        <label>Custom Pattern (e.g., "every 3 days"):</label>
                        <input type="text" id="edit-recurring-custom-pattern" value="${element.recurringCustomPattern || ""}" placeholder="every 3 days" />
                    </div>
                </div>
                
                <!-- Deadline options -->
                <div id="edit-plugin-deadline-options" style="margin-top: 10px; ${!element.deadline ? "display: none;" : ""}">
                    <label>Date:</label>
                    <input type="date" id="edit-deadline-date" value="${element.deadline ? element.deadline.split("T")[0] : ""}" style="width: 150px;" />
                    <label style="margin-left: 10px;">Time:</label>
                    <input type="time" id="edit-deadline-time" value="${element.deadline ? element.deadline.split("T")[1]?.substring(0, 5) || "" : ""}" style="width: 100px;" />
                </div>
                
                <!-- Time Allocated options -->
                <div id="edit-plugin-time-options" style="margin-top: 10px; ${!hasTimeAllocated ? "display: none;" : ""}">
                    <label>Time Allocated:</label>
                    <input type="text" id="edit-time" value="${this.escapeHtml(element.timeAllocated || "")}" 
                           placeholder="e.g., 30 min+ or 20 min" />
                </div>
                
                <!-- Fun Modifier options -->
                ${element.type !== "header-checkbox" ? `
                <div id="edit-plugin-fun-options" style="margin-top: 10px; ${!hasFunModifier ? "display: none;" : ""}">
                    <label>Fun Modifier:</label>
                    <textarea id="edit-fun" placeholder="How to make this task fun">${this.escapeHtml(element.funModifier || "")}</textarea>
                </div>
                ` : ""}
            </div>
        `;
    if (element.type === "multi-checkbox" && element.items) {
      html += `<label style="margin-top: 15px;">Items:</label>`;
      html += `<div id="edit-items">`;
      element.items.forEach((item, idx) => {
        html += `
                    <div class="subtask-item">
                        <input type="text" class="edit-item-text" data-index="${idx}" 
                               value="${this.escapeHtml(item.text)}" />
                        <input type="text" class="edit-item-fun" data-index="${idx}" 
                               value="${this.escapeHtml(item.funModifier || "")}" placeholder="Fun modifier" />
                        <button data-remove-item="${idx}">×</button>
                    </div>
                `;
      });
      html += `</div>`;
      html += `<button onclick="app.modalHandler.addEditItem()" style="margin-top: 10px;">+ Add Item</button>`;
    }
    html += `
            <div style="margin-top: 20px;">
                <button id="edit-save-btn">Save</button>
                <button class="cancel" id="edit-cancel-btn">Cancel</button>
            </div>
        `;
    modalBody.innerHTML = html;
    modal.classList.add("active");
    const saveBtn = document.getElementById("edit-save-btn");
    const cancelBtn = document.getElementById("edit-cancel-btn");
    const addItemBtn = document.getElementById("add-edit-item-btn");
    if (saveBtn) {
      saveBtn.addEventListener("click", () => {
        this.saveEdit(pageId, binId, elementIndex);
      });
    }
    if (cancelBtn) {
      cancelBtn.addEventListener("click", () => {
        this.closeModal();
      });
    }
    if (addItemBtn) {
      addItemBtn.addEventListener("click", () => {
        this.addEditItem();
      });
    }
    const itemsContainer = document.getElementById("edit-items");
    if (itemsContainer) {
      itemsContainer.addEventListener("click", (e) => {
        if (e.target.hasAttribute("data-remove-item")) {
          const idx = parseInt(e.target.getAttribute("data-remove-item"));
          this.removeEditItem(idx);
        }
      });
    }
    const progressCheckbox = document.getElementById("edit-plugin-progress");
    if (progressCheckbox) {
      progressCheckbox.addEventListener("change", (e) => {
        const optionsDiv = document.getElementById("edit-plugin-progress-options");
        if (optionsDiv) {
          optionsDiv.style.display = e.target.checked ? "block" : "none";
        }
      });
    }
    const recurringCheckbox = document.getElementById("edit-plugin-recurring");
    if (recurringCheckbox) {
      recurringCheckbox.addEventListener("change", (e) => {
        const optionsDiv = document.getElementById("edit-plugin-recurring-options");
        if (optionsDiv) {
          optionsDiv.style.display = e.target.checked ? "block" : "none";
        }
      });
    }
    const deadlineCheckbox = document.getElementById("edit-plugin-deadline");
    if (deadlineCheckbox) {
      deadlineCheckbox.addEventListener("change", (e) => {
        const optionsDiv = document.getElementById("edit-plugin-deadline-options");
        if (optionsDiv) {
          optionsDiv.style.display = e.target.checked ? "block" : "none";
        }
      });
    }
    const timeCheckbox = document.getElementById("edit-plugin-time");
    if (timeCheckbox) {
      timeCheckbox.addEventListener("change", (e) => {
        const optionsDiv = document.getElementById("edit-plugin-time-options");
        if (optionsDiv) {
          optionsDiv.style.display = e.target.checked ? "block" : "none";
        }
      });
    }
    const funCheckbox = document.getElementById("edit-plugin-fun");
    if (funCheckbox) {
      funCheckbox.addEventListener("change", (e) => {
        const optionsDiv = document.getElementById("edit-plugin-fun-options");
        if (optionsDiv) {
          optionsDiv.style.display = e.target.checked ? "block" : "none";
        }
      });
    }
    const recurringScheduleSelect = document.getElementById("edit-recurring-schedule");
    if (recurringScheduleSelect) {
      recurringScheduleSelect.addEventListener("change", (e) => {
        const customDiv = document.getElementById("edit-recurring-custom");
        if (customDiv) {
          customDiv.style.display = e.target.value === "custom" ? "block" : "none";
        }
      });
    }
    if (element.type === "calendar") {
      const targetingRadios = document.querySelectorAll(`input[name="calendar-targeting-${pageId}-${elementIndex}"]`);
      targetingRadios.forEach((radio) => {
        radio.addEventListener("change", (e) => {
          const specificDiv = document.getElementById("edit-calendar-specific-options");
          const tagsDiv = document.getElementById("edit-calendar-tags-options");
          if (specificDiv) specificDiv.style.display = e.target.value === "specific" ? "block" : "none";
          if (tagsDiv) tagsDiv.style.display = e.target.value === "tags" ? "block" : "none";
        });
      });
      const addPageBtn = document.getElementById("add-target-page-btn");
      if (addPageBtn) {
        addPageBtn.addEventListener("click", () => {
          const container = document.getElementById("edit-calendar-target-pages");
          const newDiv = document.createElement("div");
          newDiv.style.display = "flex";
          newDiv.style.gap = "5px";
          newDiv.style.marginBottom = "5px";
          const select = document.createElement("select");
          select.className = "calendar-target-page";
          select.style.flex = "1";
          const appState3 = this._getAppState();
          appState3.documents.forEach((p) => {
            const option = document.createElement("option");
            option.value = p.id;
            option.textContent = p.title || p.id;
            select.appendChild(option);
          });
          const removeBtn = document.createElement("button");
          removeBtn.textContent = "×";
          removeBtn.type = "button";
          removeBtn.className = "remove-target-page";
          removeBtn.style.padding = "2px 8px";
          removeBtn.style.background = "#ff5555";
          removeBtn.style.color = "white";
          removeBtn.style.border = "none";
          removeBtn.style.borderRadius = "4px";
          removeBtn.style.cursor = "pointer";
          removeBtn.addEventListener("click", () => newDiv.remove());
          newDiv.appendChild(select);
          newDiv.appendChild(removeBtn);
          container.insertBefore(newDiv, addPageBtn);
        });
      }
      document.querySelectorAll(".remove-target-page").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.target.closest("div").remove();
        });
      });
      document.querySelectorAll(".add-tag-btn").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          const tag = e.target.dataset.tag;
          if (!element.targetTags) element.targetTags = [];
          if (!element.targetTags.includes(tag)) {
            element.targetTags.push(tag);
            const dataManager = this._getDataManager();
            if (dataManager) {
              dataManager.saveData();
            }
            this.showEditModal(pageId, binId, elementIndex, element);
          }
        });
      });
      document.querySelectorAll(".remove-tag").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          const tag = e.target.dataset.tag;
          if (element.targetTags) {
            element.targetTags = element.targetTags.filter((t) => t !== tag);
            const dataManager = this._getDataManager();
            if (dataManager) {
              dataManager.saveData();
            }
            this.showEditModal(pageId, binId, elementIndex, element);
          }
        });
      });
      const addCustomTagBtn = document.getElementById("add-custom-tag-btn");
      const newTagInput = document.getElementById("new-tag-input");
      if (addCustomTagBtn && newTagInput) {
        addCustomTagBtn.addEventListener("click", () => {
          const tag = newTagInput.value.trim().toLowerCase();
          if (tag && !element.targetTags?.includes(tag)) {
            if (!element.targetTags) element.targetTags = [];
            element.targetTags.push(tag);
            const dataManager = this._getDataManager();
            if (dataManager) {
              dataManager.saveData();
            }
            this.showEditModal(pageId, binId, elementIndex, element);
          }
        });
        newTagInput.addEventListener("keypress", (e) => {
          if (e.key === "Enter") {
            addCustomTagBtn.click();
          }
        });
      }
    }
    document.querySelectorAll(".add-element-tag-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const tag = e.target.dataset.tag;
        if (!element.tags) element.tags = [];
        if (!element.tags.includes(tag)) {
          element.tags.push(tag);
          const tagManager2 = this._getTagManager();
          if (tagManager2) {
            tagManager2.addTag(tag);
          }
          const dataManager = this._getDataManager();
          if (dataManager) {
            dataManager.saveData();
          }
          this.showEditModal(pageId, binId, elementIndex, element);
        }
      });
    });
    document.querySelectorAll(".remove-element-tag").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const tag = e.target.dataset.tag;
        if (element.tags) {
          element.tags = element.tags.filter((t) => t !== tag);
          const dataManager = this._getDataManager();
          if (dataManager) {
            dataManager.saveData();
          }
          this.showEditModal(pageId, binId, elementIndex, element);
        }
      });
    });
    const addCustomElementTagBtn = document.getElementById("add-custom-element-tag-btn");
    const newElementTagInput = document.getElementById("new-element-tag-input");
    if (addCustomElementTagBtn && newElementTagInput) {
      addCustomElementTagBtn.addEventListener("click", () => {
        const tag = newElementTagInput.value.trim().toLowerCase();
        if (tag && !element.tags?.includes(tag)) {
          if (!element.tags) element.tags = [];
          element.tags.push(tag);
          const tagManager2 = this._getTagManager();
          if (tagManager2) {
            tagManager2.addTag(tag);
          }
          const dataManager = this._getDataManager();
          if (dataManager) {
            dataManager.saveData();
          }
          this.showEditModal(pageId, binId, elementIndex, element);
        }
      });
      newElementTagInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          addCustomElementTagBtn.click();
        }
      });
    }
    const addPropertyBtn = document.getElementById("add-custom-property-btn");
    if (addPropertyBtn) {
      addPropertyBtn.addEventListener("click", () => {
        const propertiesList = document.getElementById("custom-properties-list");
        if (propertiesList) {
          const newItem = document.createElement("div");
          newItem.className = "custom-property-item";
          newItem.style.cssText = "display: flex; gap: 10px; margin-bottom: 10px; padding: 8px; background: #1a1a1a; border-radius: 4px; align-items: center;";
          newItem.innerHTML = `
                        <input type="text" class="custom-property-key" placeholder="Property name" style="flex: 1; padding: 6px; background: #2a2a2a; color: #e0e0e0; border: 1px solid #555; border-radius: 4px;" />
                        <input type="text" class="custom-property-value" placeholder="Property value" style="flex: 1; padding: 6px; background: #2a2a2a; color: #e0e0e0; border: 1px solid #555; border-radius: 4px;" />
                        <button type="button" class="remove-custom-property-btn" style="padding: 6px 12px; background: #e74c3c; color: white; border: none; border-radius: 4px; cursor: pointer;">Remove</button>
                    `;
          newItem.querySelector(".remove-custom-property-btn").addEventListener("click", () => {
            newItem.remove();
          });
          propertiesList.appendChild(newItem);
        }
      });
    }
    document.querySelectorAll(".remove-custom-property-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.target.closest(".custom-property-item").remove();
      });
    });
    if (appState2) {
      appState2.currentEditModal = {
        pageId,
        binId,
        elementIndex,
        itemCount: element.items ? element.items.length : 0,
        elementType: element.type
      };
    }
    const modalClose = document.querySelector(".modal-close");
    const modalContent = modal.querySelector(".modal-content");
    modalClose.style.cssText = "position: absolute; top: 10px; right: 15px; font-size: 24px; font-weight: bold; cursor: pointer; color: #888888; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; border: none; background: transparent; padding: 0; margin: 0; z-index: 2002;";
    modalClose.style.transition = "color 0.2s";
    let prevElementBtn = document.getElementById("modal-prev-element-btn");
    let nextElementBtn = document.getElementById("modal-next-element-btn");
    if (!prevElementBtn) {
      prevElementBtn = document.createElement("button");
      prevElementBtn.id = "modal-prev-element-btn";
      prevElementBtn.className = "modal-prev-element-btn";
      prevElementBtn.innerHTML = "←";
      prevElementBtn.title = "Save and edit previous element (hold to create new)";
      prevElementBtn.style.cssText = "position: absolute; top: 10px; right: 110px; font-size: 24px; font-weight: bold; cursor: pointer; color: #888888; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; border: none; background: transparent; padding: 0; margin: 0; z-index: 2002; transition: color 0.2s;";
      modalContent.insertBefore(prevElementBtn, modalClose);
    }
    if (!nextElementBtn) {
      nextElementBtn = document.createElement("button");
      nextElementBtn.id = "modal-next-element-btn";
      nextElementBtn.className = "modal-next-element-btn";
      nextElementBtn.innerHTML = "→";
      nextElementBtn.title = "Save and edit next element (hold to create new)";
      nextElementBtn.style.cssText = "position: absolute; top: 10px; right: 60px; font-size: 24px; font-weight: bold; cursor: pointer; color: #888888; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; border: none; background: transparent; padding: 0; margin: 0; z-index: 2002; transition: color 0.2s;";
      modalContent.insertBefore(nextElementBtn, modalClose);
    }
    const setupButtonHover = (btn) => {
      btn.addEventListener("mouseenter", () => {
        btn.style.color = "#ffffff";
      });
      btn.addEventListener("mouseleave", () => {
        btn.style.color = "#888888";
      });
    };
    setupButtonHover(modalClose);
    setupButtonHover(prevElementBtn);
    setupButtonHover(nextElementBtn);
    modalClose.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.saveEdit(pageId, binId, elementIndex);
      this.closeModal();
    };
    let nextElementIsHolding = false;
    const setupNextElementButton = () => {
      nextElementBtn.onmousedown = (e) => {
        e.preventDefault();
        e.stopPropagation();
        nextElementIsHolding = false;
        const holdTimer = setTimeout(() => {
          nextElementIsHolding = true;
        }, 200);
        const handleMouseUp = () => {
          clearTimeout(holdTimer);
          const wasHolding = nextElementIsHolding;
          const appState3 = this._getAppState();
          const page2 = appState3?.documents?.find((p) => p.id === pageId);
          if (!page2) return;
          const bin2 = page2.groups?.find((b) => b.id === binId);
          if (!bin2) return;
          const items = bin2.items || [];
          bin2.items = items;
          if (wasHolding) {
            const currentElement = items[elementIndex];
            if (currentElement) {
              const elementManager = this._getElementManager();
              const newElement = elementManager ? elementManager.createElementTemplate(currentElement.type) : null;
              const insertIndex = elementIndex + 1;
              items.splice(insertIndex, 0, newElement);
              this.saveEdit(pageId, binId, elementIndex, true);
              const dataManager = this._getDataManager();
              if (dataManager) {
                dataManager.saveData();
              }
              eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
              setTimeout(() => {
                this.showEditModal(pageId, binId, insertIndex, newElement);
              }, 10);
            }
          } else {
            const nextIndex = elementIndex + 1;
            if (nextIndex < items.length) {
              this.saveEdit(pageId, binId, elementIndex, true);
              const dataManager = this._getDataManager();
              if (dataManager) {
                dataManager.saveData();
              }
              eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
              setTimeout(() => {
                const nextElement = items[nextIndex];
                this.showEditModal(pageId, binId, nextIndex, nextElement);
              }, 10);
            } else {
              const currentElement = items[elementIndex];
              if (currentElement) {
                const elementManager = this._getElementManager();
                const newElement = elementManager ? elementManager.createElementTemplate(currentElement.type) : null;
                items.push(newElement);
                this.saveEdit(pageId, binId, elementIndex, true);
                const dataManager = this._getDataManager();
                if (dataManager) {
                  dataManager.saveData();
                }
                eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
                setTimeout(() => {
                  this.showEditModal(pageId, binId, items.length - 1, newElement);
                }, 10);
              }
            }
          }
          nextElementIsHolding = false;
          document.removeEventListener("mouseup", handleMouseUp);
        };
        document.addEventListener("mouseup", handleMouseUp);
      };
    };
    setupNextElementButton();
    let prevElementIsHolding = false;
    const setupPrevElementButton = () => {
      prevElementBtn.onmousedown = (e) => {
        e.preventDefault();
        e.stopPropagation();
        prevElementIsHolding = false;
        const holdTimer = setTimeout(() => {
          prevElementIsHolding = true;
        }, 200);
        const handleMouseUp = () => {
          clearTimeout(holdTimer);
          const wasHolding = prevElementIsHolding;
          const appState3 = this._getAppState();
          const page2 = appState3?.documents?.find((p) => p.id === pageId);
          if (!page2) return;
          const bin2 = page2.groups?.find((b) => b.id === binId);
          if (!bin2) return;
          const items = bin2.items || [];
          bin2.items = items;
          if (wasHolding) {
            const currentElement = items[elementIndex];
            if (currentElement) {
              const elementManager = this._getElementManager();
              const newElement = elementManager ? elementManager.createElementTemplate(currentElement.type) : null;
              items.splice(elementIndex, 0, newElement);
              this.saveEdit(pageId, binId, elementIndex + 1, true);
              const dataManager = this._getDataManager();
              if (dataManager) {
                dataManager.saveData();
              }
              eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
              setTimeout(() => {
                this.showEditModal(pageId, binId, elementIndex, newElement);
              }, 10);
            }
          } else {
            const prevIndex = elementIndex - 1;
            if (prevIndex >= 0) {
              this.saveEdit(pageId, binId, elementIndex, true);
              const dataManager = this._getDataManager();
              if (dataManager) {
                dataManager.saveData();
              }
              eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
              setTimeout(() => {
                const prevElement = items[prevIndex];
                this.showEditModal(pageId, binId, prevIndex, prevElement);
              }, 10);
            } else {
              const currentElement = items[elementIndex];
              if (currentElement) {
                const elementManager = this._getElementManager();
                const newElement = elementManager ? elementManager.createElementTemplate(currentElement.type) : null;
                items.unshift(newElement);
                this.saveEdit(pageId, binId, elementIndex + 1, true);
                const dataManager = this._getDataManager();
                if (dataManager) {
                  dataManager.saveData();
                }
                eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
                setTimeout(() => {
                  this.showEditModal(pageId, binId, 0, newElement);
                }, 10);
              }
            }
          }
          prevElementIsHolding = false;
          document.removeEventListener("mouseup", handleMouseUp);
        };
        document.addEventListener("mouseup", handleMouseUp);
      };
    };
    setupPrevElementButton();
    modalClose.title = "Save and close";
    const handleEnterKey = (e) => {
      if (e.key !== "Enter") return;
      const target = e.target || e.srcElement;
      if (target.tagName === "TEXTAREA") {
        if (!e.shiftKey) {
          e.preventDefault();
          e.stopPropagation();
          this.handleEnterKeyAction(pageId, binId, elementIndex, handleEnterKey);
        }
        return;
      }
      if (target.tagName !== "BUTTON") {
        e.preventDefault();
        e.stopPropagation();
        this.handleEnterKeyAction(pageId, binId, elementIndex, handleEnterKey);
      }
    };
    document.addEventListener("keydown", handleEnterKey, true);
    if (appState2) {
      appState2.currentEnterKeyHandler = handleEnterKey;
    }
  }
  handleEnterKeyAction(pageId, binId, elementIndex, handleEnterKey) {
    const appState2 = this._getAppState();
    const multiEdit = appState2?.multiEditState;
    if (multiEdit && multiEdit.pageId === pageId && multiEdit.binId === binId) {
      const nextIndex = elementIndex + 1;
      if (nextIndex <= multiEdit.endIndex) {
        this.saveEdit(pageId, binId, elementIndex, true);
        const dataManager = this._getDataManager();
        if (dataManager) {
          dataManager.saveData();
        }
        eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
        multiEdit.currentIndex = nextIndex;
        setTimeout(() => {
          const nextAppState = this._getAppState();
          const page = nextAppState?.documents?.find((p) => p.id === pageId);
          const bin = page?.groups?.find((b) => b.id === binId);
          const items = bin?.items || [];
          if (bin) {
            bin.items = items;
          }
          if (items[nextIndex]) {
            this.showEditModal(pageId, binId, nextIndex, items[nextIndex]);
            setTimeout(() => {
              const textInput = document.getElementById("edit-text");
              if (textInput) {
                textInput.focus();
                textInput.select();
              }
            }, 50);
          }
        }, 10);
        document.removeEventListener("keydown", handleEnterKey, true);
        if (appState2 && appState2.currentEnterKeyHandler === handleEnterKey) {
          appState2.currentEnterKeyHandler = null;
        }
        return;
      } else {
        if (appState2) {
          appState2.multiEditState = null;
        }
      }
    }
    this.saveEdit(pageId, binId, elementIndex);
    document.removeEventListener("keydown", handleEnterKey, true);
    const finalAppState = this._getAppState();
    if (finalAppState && finalAppState.currentEnterKeyHandler === handleEnterKey) {
      finalAppState.currentEnterKeyHandler = null;
    }
  }
  addEditItem() {
    const container = document.getElementById("edit-items");
    const idx = container.children.length;
    const newItem = document.createElement("div");
    newItem.className = "subtask-item";
    newItem.innerHTML = `
            <input type="text" class="edit-item-text" data-index="${idx}" value="New item" />
            <input type="text" class="edit-item-fun" data-index="${idx}" value="" placeholder="Fun modifier" />
            <button data-remove-item="${idx}">×</button>
        `;
    container.appendChild(newItem);
  }
  removeEditItem(idx) {
    const container = document.getElementById("edit-items");
    const item = container.querySelector(`.subtask-item .edit-item-text[data-index="${idx}"]`)?.closest(".subtask-item");
    if (item && container.children.length > 1) {
      item.remove();
    }
  }
  saveEdit(pageId, binId, elementIndex, skipClose = false) {
    const appState2 = this._getAppState();
    const page = appState2.documents.find((p) => p.id === pageId);
    if (!page) return;
    const bin = page.groups?.find((b) => b.id === binId);
    if (!bin) return;
    const items = bin.items || [];
    bin.items = items;
    const element = items[elementIndex];
    if (!element) return;
    const textField = document.getElementById("edit-text");
    const progressCheckbox = document.getElementById("edit-plugin-progress");
    const progressValue = document.getElementById("edit-progress-value");
    const recurringCheckbox = document.getElementById("edit-plugin-recurring");
    const scheduleSelect = document.getElementById("edit-recurring-schedule");
    const customPattern = document.getElementById("edit-recurring-custom-pattern");
    const deadlineCheckbox = document.getElementById("edit-plugin-deadline");
    const dateField = document.getElementById("edit-deadline-date");
    const timeField = document.getElementById("edit-deadline-time");
    const persistentCheckbox = document.getElementById("edit-plugin-persistent");
    const timeCheckbox = document.getElementById("edit-plugin-time");
    const timeValueField = document.getElementById("edit-time");
    const funCheckbox = document.getElementById("edit-plugin-fun");
    const funField = document.getElementById("edit-fun");
    const repeatsCheckbox = document.getElementById("edit-plugin-repeats");
    const undoRedoManager = this._getUndoRedoManager();
    this.modalService?.applyElementEditUpdates({
      element,
      updates: {
        text: textField ? textField.value : void 0,
        progressEnabled: progressCheckbox ? progressCheckbox.checked : void 0,
        progressValue: progressValue ? progressValue.value : void 0,
        recurringEnabled: recurringCheckbox ? recurringCheckbox.checked : void 0,
        recurringSchedule: scheduleSelect ? scheduleSelect.value : void 0,
        recurringCustomPattern: customPattern ? customPattern.value : void 0,
        deadlineEnabled: deadlineCheckbox ? deadlineCheckbox.checked : void 0,
        deadlineDate: dateField ? dateField.value : void 0,
        deadlineTime: timeField ? timeField.value : void 0,
        persistentEnabled: persistentCheckbox ? persistentCheckbox.checked : void 0,
        timeEnabled: timeCheckbox ? timeCheckbox.checked : void 0,
        timeValue: timeValueField ? timeValueField.value : void 0,
        funEnabled: funCheckbox ? funCheckbox.checked : void 0,
        funValue: funField ? funField.value : void 0,
        repeatsEnabled: repeatsCheckbox ? repeatsCheckbox.checked : true
      },
      undoRedoManager,
      pageId,
      binId,
      elementIndex
    });
    if (element.type === "multi-checkbox") {
      const itemInputs = document.querySelectorAll(".edit-item-text");
      const itemFunInputs = document.querySelectorAll(".edit-item-fun");
      const oldItems = [...element.items || []];
      element.items = [];
      itemInputs.forEach((input) => {
        const idx = parseInt(input.dataset.index);
        const oldItem = oldItems[idx];
        const funInput = Array.from(itemFunInputs).find((f) => f.dataset.index === input.dataset.index);
        element.items.push({
          text: input.value.trim() || "Item",
          completed: oldItem ? oldItem.completed : false,
          funModifier: funInput ? funInput.value.trim() : ""
        });
      });
    }
    if (element.type === "counter") {
      const valueField = document.getElementById("edit-counter-value");
      const increment5Field = document.getElementById("edit-counter-increment5");
      const customField = document.getElementById("edit-counter-custom");
      if (valueField) element.value = parseInt(valueField.value) || 0;
      if (increment5Field) element.increment5 = parseInt(increment5Field.value) || 5;
      if (customField) element.customIncrement = parseInt(customField.value) || 10;
    }
    if (element.type === "tracker") {
      const modeRadios = document.querySelectorAll(`input[name="tracker-mode-${pageId}-${elementIndex}"]`);
      modeRadios.forEach((radio) => {
        if (radio.checked) {
          element.mode = radio.value;
        }
      });
    }
    if (element.type === "rating") {
      const starsField = document.getElementById("edit-rating-stars");
      const reviewField = document.getElementById("edit-rating-review");
      if (starsField) element.rating = parseInt(starsField.value) || 0;
      if (reviewField) element.review = reviewField.value.trim();
    }
    if (element.type === "timer") {
      const durationField = document.getElementById("edit-timer-duration");
      const alarmField = document.getElementById("edit-timer-alarm");
      if (durationField) element.duration = parseInt(durationField.value) || 3600;
      if (alarmField) element.alarmSound = alarmField.value || null;
    }
    if (element.type === "calendar") {
      const displayModeSelect = document.getElementById("edit-calendar-display-mode");
      if (displayModeSelect) {
        element.displayMode = displayModeSelect.value;
      }
      const targetingRadios = document.querySelectorAll(`input[name="calendar-targeting-${pageId}-${elementIndex}"]`);
      targetingRadios.forEach((radio) => {
        if (radio.checked) {
          element.targetingMode = radio.value;
        }
      });
      if (element.targetingMode === "specific") {
        const pageSelects = document.querySelectorAll(".calendar-target-page");
        element.targetPages = Array.from(pageSelects).map((select) => select.value);
      } else {
        element.targetPages = [];
      }
    }
    if (element.tags && Array.isArray(element.tags)) {
      element.tags = element.tags.map((tag) => tag.trim().toLowerCase()).filter((tag) => tag);
      const tagManager = this._getTagManager();
      if (tagManager) {
        element.tags.forEach((tag) => tagManager.addTag(tag));
      }
    }
    const propertyItems = document.querySelectorAll(".custom-property-item");
    if (propertyItems.length > 0) {
      if (!element.customProperties) element.customProperties = {};
      const newProperties = {};
      propertyItems.forEach((item) => {
        const keyInput = item.querySelector(".custom-property-key");
        const valueInput = item.querySelector(".custom-property-value");
        if (keyInput && valueInput) {
          const key = keyInput.value.trim();
          const value = valueInput.value.trim();
          if (key) {
            newProperties[key] = value;
          }
        }
      });
      element.customProperties = newProperties;
    }
    const dataManager = this._getDataManager();
    if (dataManager) {
      dataManager.saveData();
    }
    if (!skipClose) {
      this.closeModal();
    }
    eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
  }
  addEditChildModal() {
    const container = document.getElementById("edit-children-in-modal");
    if (!container) return;
    const idx = container.children.length;
    const newChild = document.createElement("div");
    newChild.className = "subtask-item";
    newChild.innerHTML = `
            <input type="text" class="edit-child-text-modal" data-index="${idx}" value="New child" placeholder="Child text" />
            <input type="text" class="edit-child-time-modal" data-index="${idx}" value="" placeholder="Time" />
            <label class="edit-subtask-repeat-label">
                <input type="checkbox" class="edit-child-repeats-modal" data-index="${idx}" checked />
                Repeats
            </label>
            <button onclick="app.modalHandler.removeEditChildModal(${idx})" class="remove-subtask-btn">×</button>
        `;
    container.appendChild(newChild);
    container.scrollTop = container.scrollHeight;
  }
  removeEditChildModal(idx) {
    const container = document.getElementById("edit-children-in-modal");
    if (!container) return;
    const item = container.querySelector(`.edit-child-text-modal[data-index="${idx}"]`)?.closest(".subtask-item");
    if (item) {
      item.remove();
      Array.from(container.children).forEach((child, index) => {
        const textInput = child.querySelector(".edit-child-text-modal");
        const timeInput = child.querySelector(".edit-child-time-modal");
        const repeatInput = child.querySelector(".edit-child-repeats-modal");
        if (textInput) textInput.dataset.index = index;
        if (timeInput) timeInput.dataset.index = index;
        if (repeatInput) repeatInput.dataset.index = index;
        const removeBtn = child.querySelector("button");
        if (removeBtn) {
          removeBtn.onclick = () => app.modalHandler.removeEditChildModal(index);
        }
      });
    }
  }
  removeAllChildrenModal() {
    if (confirm("Remove all children?")) {
      const container = document.getElementById("edit-children-in-modal");
      if (container) {
        container.innerHTML = "";
      }
    }
  }
  toggleArchiveViewInEdit(pageId, binId, elementIndex) {
    const archiveView = document.getElementById(`archive-view-edit-${pageId}-${elementIndex}`);
    if (!archiveView) return;
    if (archiveView.style.display === "none") {
      const dataManager = this._getDataManager();
      const archived = dataManager ? dataManager.getArchivedRecordings(pageId, elementIndex) : [];
      if (archived.length === 0) {
        archiveView.innerHTML = '<div style="padding: 10px; color: #888;">No archived recordings</div>';
      } else {
        let html = '<div style="padding: 10px;"><strong>Archived Recordings:</strong><ul style="margin-top: 10px; padding-left: 20px;">';
        archived.forEach((entry) => {
          html += `<li style="margin: 5px 0;"><button onclick="window.app && window.app.dataManager && window.app.dataManager.playArchivedAudio('${entry.filename}')" style="background: #4a9eff; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; margin-right: 8px;">Play</button>${entry.date} - ${entry.filename}</li>`;
        });
        html += "</ul></div>";
        archiveView.innerHTML = html;
      }
      archiveView.style.display = "block";
    } else {
      archiveView.style.display = "none";
    }
  }
  async overwriteAudioRecording(pageId, binId, elementIndex) {
    this.closeModal();
    const appState2 = this._getAppState();
    const page = appState2.documents.find((p) => p.id === pageId);
    if (!page) return;
    const bin = page.groups?.find((b) => b.id === binId);
    if (!bin) return;
    const items = bin.items || [];
    bin.items = items;
    const element = items[elementIndex];
    if (!element || !element.audioFile) {
      alert("No existing recording to overwrite.");
      return;
    }
    let audioElementIndex = elementIndex;
    if (typeof elementIndex === "string" && elementIndex.includes("-")) {
      const parts = elementIndex.split("-");
      audioElementIndex = parseInt(parts[0]);
    } else {
      audioElementIndex = parseInt(elementIndex);
    }
    const app2 = this._getApp();
    if (app2 && app2.startInlineRecording) {
      await app2.startInlineRecording(pageId, binId, audioElementIndex, elementIndex, true);
    }
    eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
  }
  showEditBinModal(pageId, binId) {
    const modal = document.getElementById("modal");
    const modalBody = document.getElementById("modal-body");
    const appState2 = this._getAppState();
    const page = appState2.documents.find((p) => p.id === pageId);
    if (!page) return;
    const bin = page.groups?.find((b) => b.id === binId);
    if (!bin) return;
    let html = `
            <h3>Edit Bin</h3>
            <div style="margin-bottom: 15px;">
                <label>Bin Title:</label>
                <input type="text" id="edit-bin-title" value="${this.escapeHtml(bin.title || "")}" style="width: 100%; padding: 8px; margin-top: 5px;" />
            </div>
            <div style="margin-bottom: 15px;">
                <label>Max Height (px):</label>
                <input type="number" id="edit-bin-max-height" value="${bin.maxHeight || ""}" placeholder="Leave empty for no limit" min="0" style="width: 100%; padding: 8px; margin-top: 5px;" />
                <small style="color: #888; display: block; margin-top: 5px;">If set, the bin will be scrollable when content exceeds this height.</small>
            </div>
        `;
    const binPluginManager = this._getBinPluginManager();
    if (binPluginManager) {
      const allPlugins = binPluginManager.getAvailablePlugins();
      const enabledPlugins = binPluginManager.getBinPlugins(pageId, binId);
      const enabledPluginIds = new Set(enabledPlugins.map((p) => p.id));
      if (allPlugins.length > 0) {
        html += `
                    <div style="margin-top: 20px; padding: 15px; background: #2a2a2a; border-radius: 4px; border: 1px solid #444;">
                        <label style="font-weight: 600; margin-bottom: 10px; display: block;">Bin Plugins:</label>
                        <div style="display: flex; align-items: center; gap: 20px; flex-wrap: wrap;">
                `;
        allPlugins.forEach((plugin) => {
          const isEnabled = enabledPluginIds.has(plugin.id);
          html += `
                        <label style="display: flex; align-items: center; gap: 10px; margin: 0;">
                            <input type="checkbox" class="bin-plugin-checkbox" data-plugin-id="${plugin.id}" ${isEnabled ? "checked" : ""} style="width: 18px; height: 18px; margin: 0;" />
                            <span>${this.escapeHtml(plugin.name || plugin.id)}</span>
                        </label>
                    `;
        });
        html += `
                        </div>
                    </div>
                `;
      }
    }
    html += `
            <div style="margin-top: 20px;">
                <button onclick="app.saveBinEdit('${pageId}', '${binId}')">Save</button>
                <button class="cancel" onclick="app.closeModal()">Cancel</button>
            </div>
        `;
    modalBody.innerHTML = html;
    modal.classList.add("active");
    modalBody.querySelectorAll(".bin-plugin-checkbox").forEach((checkbox) => {
      checkbox.addEventListener("change", async (e) => {
        const pluginId = e.target.dataset.pluginId;
        if (e.target.checked) {
          await binPluginManager.enablePlugin(pageId, binId, pluginId);
        } else {
          await binPluginManager.disablePlugin(pageId, binId, pluginId);
        }
        eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
      });
    });
  }
  showEditPageModal(pageId) {
    const modal = document.getElementById("modal");
    const modalBody = document.getElementById("modal-body");
    const appState2 = this._getAppState();
    const pages = appState2.documents || [];
    const page = pages.find((p) => p.id === pageId);
    if (!page) {
      console.error("[ModalHandler] Page not found:", pageId, "Available pages:", pages.map((p) => p.id));
      return;
    }
    let html = `
            <h3>Edit Page</h3>
            <div style="margin-bottom: 15px;">
                <label>Page Title:</label>
                <input type="text" id="edit-page-title" value="${this.escapeHtml(page.title || "")}" style="width: 100%; padding: 8px; margin-top: 5px;" />
            </div>
        `;
    const formatRendererManager = this._getFormatRendererManager();
    if (!formatRendererManager) {
      console.warn("[ModalHandler] formatRendererManager not available in showEditPageModal");
    }
    if (formatRendererManager) {
      const allFormats = formatRendererManager.getAllFormats();
      let currentFormat = null;
      let editingTabInfo = null;
      const appState3 = this._getAppState();
      const app2 = this._getApp();
      if (appState3 && appState3._editingTabInfo) {
        editingTabInfo = appState3._editingTabInfo;
        if (app2 && app2.renderService && app2.renderService.getRenderer) {
          const appRenderer = app2.renderService.getRenderer();
          if (appRenderer && appRenderer.paneManager) {
            const pane = appRenderer.paneManager.getPane(editingTabInfo.paneId);
            if (pane) {
              const tab = pane.tabs.find((t) => t.id === editingTabInfo.tabId);
              if (tab) {
                currentFormat = tab.format || null;
              }
            }
          }
        }
      }
      if (currentFormat === null) {
        currentFormat = formatRendererManager.getPageFormat(pageId);
      }
      console.log("[ModalHandler] All formats:", allFormats.map((f) => ({ id: f.id, formatName: f.formatName, name: f.name })));
      const filteredFormats = allFormats.filter((format) => {
        return format.supportsPages !== false;
      }).sort((a, b) => {
        const aName = a.formatName || a.id;
        const bName = b.formatName || b.id;
        if (aName === "default" || aName === "") return -1;
        if (bName === "default" || bName === "") return 1;
        const preferredOrder = [
          "grid-layout-format",
          "horizontal-layout-format",
          "document-view-format",
          "latex-editor",
          "mindmap",
          "logic-graph",
          "flowchart",
          "page-kanban-format",
          "trello-board"
        ];
        const aIndex = preferredOrder.indexOf(aName);
        const bIndex = preferredOrder.indexOf(bName);
        if (aIndex !== -1 && bIndex !== -1) {
          return aIndex - bIndex;
        }
        if (aIndex !== -1) return -1;
        if (bIndex !== -1) return 1;
        const aDisplay = a.name || aName;
        const bDisplay = b.name || bName;
        return aDisplay.localeCompare(bDisplay);
      });
      console.log("[ModalHandler] Filtered formats:", filteredFormats.map((f) => ({ id: f.id, formatName: f.formatName, name: f.name })));
      const formatLabel = editingTabInfo ? "Tab Display Format:" : "Page Format:";
      html += `
                <div style="margin-top: 20px; padding: 15px; background: #1a1a1a; border-radius: 4px;">
                    <label style="font-weight: 600; display: block; margin-bottom: 10px;">${formatLabel}</label>
                    <select id="page-format-select" style="width: 100%; padding: 8px; margin-top: 5px;">
                        <option value="">Default Format (Vertical)</option>
            `;
      filteredFormats.forEach((format) => {
        const formatName = format.formatName || format.id;
        const selected = currentFormat === formatName ? "selected" : "";
        html += `<option value="${formatName}" ${selected}>${this.escapeHtml(format.name || formatName)}</option>`;
      });
      html += `
                    </select>
                </div>
            `;
      const gridConfig = page.formatConfig?.grid || {};
      const showGridConfig = currentFormat === "grid-layout-format";
      html += `
                <div id="grid-layout-config" style="margin-top: 15px; padding: 15px; background: #2a2a2a; border-radius: 4px; border: 1px solid #444; display: ${showGridConfig ? "block" : "none"};">
                    <label style="font-weight: 600; display: block; margin-bottom: 10px;">Grid Layout Settings:</label>
                    <div style="display: flex; flex-direction: column; gap: 10px;">
                        <div>
                            <label style="display: block; margin-bottom: 5px; font-size: 14px;">Min Column Width (px):</label>
                            <input type="number" id="grid-min-column-width" value="${gridConfig.minColumnWidth || 350}" min="100" step="10" style="width: 100%; padding: 8px; background: #1a1a1a; color: #e0e0e0; border: 1px solid #555; border-radius: 4px;" />
                            <small style="color: #888; font-size: 12px;">Minimum width for each grid column</small>
                        </div>
                        <div>
                            <label style="display: block; margin-bottom: 5px; font-size: 14px;">Gap (px):</label>
                            <input type="number" id="grid-gap" value="${gridConfig.gap || 20}" min="0" step="5" style="width: 100%; padding: 8px; background: #1a1a1a; color: #e0e0e0; border: 1px solid #555; border-radius: 4px;" />
                            <small style="color: #888; font-size: 12px;">Space between grid items</small>
                        </div>
                        <div>
                            <label style="display: block; margin-bottom: 5px; font-size: 14px;">Padding (px):</label>
                            <input type="number" id="grid-padding" value="${gridConfig.padding || 20}" min="0" step="5" style="width: 100%; padding: 8px; background: #1a1a1a; color: #e0e0e0; border: 1px solid #555; border-radius: 4px;" />
                            <small style="color: #888; font-size: 12px;">Padding around the grid container</small>
                        </div>
                        <div>
                            <label style="display: block; margin-bottom: 5px; font-size: 14px;">Max Height (px):</label>
                            <input type="number" id="grid-max-height" value="${gridConfig.maxHeight || ""}" min="0" step="50" placeholder="Leave empty for no limit" style="width: 100%; padding: 8px; background: #1a1a1a; color: #e0e0e0; border: 1px solid #555; border-radius: 4px;" />
                            <small style="color: #888; font-size: 12px;">Maximum height of grid container (becomes scrollable if exceeded)</small>
                        </div>
                    </div>
                </div>
            `;
    }
    const pagePluginManager = this._getPagePluginManager();
    if (!pagePluginManager) {
      console.warn("[ModalHandler] pagePluginManager not available in showEditPageModal");
    }
    if (pagePluginManager) {
      const allPlugins = pagePluginManager.getAvailablePlugins();
      const enabledPlugins = pagePluginManager.getPagePlugins(pageId);
      const enabledPluginIds = new Set(enabledPlugins.map((p) => p.id));
      console.log("[ModalHandler] Page plugins check:", {
        hasPagePluginManager: !!pagePluginManager,
        allPluginsCount: allPlugins.length,
        allPlugins: allPlugins.map((p) => ({ id: p.id, name: p.name, type: p.type })),
        enabledPluginsCount: enabledPlugins.length
      });
      if (allPlugins.length > 0) {
        html += `
                    <div style="margin-top: 20px; padding: 15px; background: #2a2a2a; border-radius: 4px; border: 1px solid #444;">
                        <label style="font-weight: 600; margin-bottom: 10px; display: block;">Page Plugins:</label>
                        <div style="display: flex; align-items: center; gap: 20px; flex-wrap: wrap;">
                `;
        allPlugins.forEach((plugin) => {
          const isEnabled = enabledPluginIds.has(plugin.id);
          html += `
                        <label style="display: flex; align-items: center; gap: 10px; margin: 0;">
                            <input type="checkbox" class="page-plugin-checkbox" data-plugin-id="${plugin.id}" ${isEnabled ? "checked" : ""} style="width: 18px; height: 18px; margin: 0;" />
                            <span>${this.escapeHtml(plugin.name || plugin.id)}</span>
                        </label>
                    `;
        });
        html += `
                        </div>
                    </div>
                `;
      } else {
        html += `
                    <div style="margin-top: 20px; padding: 15px; background: #2a2a2a; border-radius: 4px; border: 1px solid #444;">
                        <label style="font-weight: 600; margin-bottom: 10px; display: block;">Page Plugins:</label>
                        <div style="color: #888; font-size: 14px;">No page plugins available. Plugins may still be loading...</div>
                    </div>
                `;
      }
    } else {
      console.warn("[ModalHandler] pagePluginManager not found on app instance");
    }
    html += `
            <div style="margin-top: 20px;">
                <button onclick="app.savePageEdit('${pageId}')">Save</button>
                <button class="cancel" onclick="app.closeModal()">Cancel</button>
            </div>
        `;
    modalBody.innerHTML = html;
    modal.classList.add("active");
    const updateFormatsDropdown = () => {
      if (!formatRendererManager) return;
      const formatSelect2 = modalBody.querySelector("#page-format-select");
      if (!formatSelect2) return;
      const allFormats = formatRendererManager.getAllFormats();
      let currentFormat = null;
      const appState3 = this._getAppState();
      const app2 = this._getApp();
      const editingTabInfo = appState3?._editingTabInfo;
      if (editingTabInfo && app2 && app2.renderService && app2.renderService.getRenderer) {
        const appRenderer = app2.renderService.getRenderer();
        if (appRenderer && appRenderer.paneManager) {
          const pane = appRenderer.paneManager.getPane(editingTabInfo.paneId);
          if (pane) {
            const tab = pane.tabs.find((t) => t.id === editingTabInfo.tabId);
            if (tab) {
              currentFormat = tab.format || null;
            }
          }
        }
      }
      if (currentFormat === null) {
        currentFormat = formatRendererManager.getPageFormat(pageId);
      }
      const filteredFormats = allFormats.filter((format) => {
        return format.supportsPages !== false;
      }).sort((a, b) => {
        const aName = a.formatName || a.id;
        const bName = b.formatName || b.id;
        if (aName === "default" || aName === "") return -1;
        if (bName === "default" || bName === "") return 1;
        const preferredOrder = [
          "grid-layout-format",
          "horizontal-layout-format",
          "document-view-format",
          "latex-editor",
          "mindmap",
          "logic-graph",
          "flowchart",
          "page-kanban-format",
          "trello-board"
        ];
        const aIndex = preferredOrder.indexOf(aName);
        const bIndex = preferredOrder.indexOf(bName);
        if (aIndex !== -1 && bIndex !== -1) {
          return aIndex - bIndex;
        }
        if (aIndex !== -1) return -1;
        if (bIndex !== -1) return 1;
        const aDisplay = a.name || aName;
        const bDisplay = b.name || bName;
        return aDisplay.localeCompare(bDisplay);
      });
      formatSelect2.innerHTML = '<option value="">Default Format (Vertical)</option>';
      filteredFormats.forEach((format) => {
        const formatName = format.formatName || format.id;
        const selected = currentFormat === formatName ? "selected" : "";
        const option = document.createElement("option");
        option.value = formatName;
        option.textContent = format.name || formatName;
        if (selected) option.selected = true;
        formatSelect2.appendChild(option);
      });
      console.log("[ModalHandler] Updated formats dropdown with", filteredFormats.length, "formats");
    };
    const eventBus2 = getService(SERVICES.EVENT_BUS);
    if (eventBus2) {
      const formatRegisteredHandler = () => {
        updateFormatsDropdown();
      };
      eventBus2.on("format:registered", formatRegisteredHandler);
      if (!this._formatRegisteredHandlers) {
        this._formatRegisteredHandlers = /* @__PURE__ */ new Map();
      }
      this._formatRegisteredHandlers.set(pageId, formatRegisteredHandler);
    }
    setTimeout(updateFormatsDropdown, 100);
    const formatSelect = modalBody.querySelector("#page-format-select");
    if (formatSelect) {
      const updateGridConfigVisibility = () => {
        const gridConfigDiv = modalBody.querySelector("#grid-layout-config");
        if (gridConfigDiv) {
          gridConfigDiv.style.display = formatSelect.value === "grid-layout-format" ? "block" : "none";
        }
      };
      updateGridConfigVisibility();
      formatSelect.addEventListener("change", async (e) => {
        const formatName = e.target.value || null;
        const appState3 = this._getAppState();
        const app2 = this._getApp();
        const editingTabInfo = appState3?._editingTabInfo;
        if (editingTabInfo && app2 && app2.renderService && app2.renderService.getRenderer) {
          const appRenderer = app2.renderService.getRenderer();
          if (appRenderer && appRenderer.paneManager) {
            const pane = appRenderer.paneManager.getPane(editingTabInfo.paneId);
            if (pane) {
              const tab = pane.tabs.find((t) => t.id === editingTabInfo.tabId);
              if (tab) {
                tab.format = formatName;
                appRenderer.paneManager.renderPane(pane);
                if (appState3) {
                  delete appState3._editingTabInfo;
                }
                updateGridConfigVisibility();
                this.closeModal();
                return;
              }
            }
          }
        }
        const formatRendererManager2 = this._getFormatRendererManager();
        if (formatRendererManager2) {
          if (formatName) {
            await formatRendererManager2.setPageFormat(pageId, formatName);
          } else {
            formatRendererManager2.clearPageFormat(pageId);
          }
        }
        updateGridConfigVisibility();
        this.closeModal();
      });
    }
    modalBody.querySelectorAll(".page-plugin-checkbox").forEach((checkbox) => {
      checkbox.addEventListener("change", async (e) => {
        const pluginId = e.target.dataset.pluginId;
        if (e.target.checked) {
          await pagePluginManager.enablePlugin(pageId, pluginId);
        } else {
          await pagePluginManager.disablePlugin(pageId, pluginId);
        }
        eventBus2.emit(EVENTS.APP.RENDER_REQUESTED);
      });
    });
  }
  /**
   * Show visual customization modal for an object
   * @param {string} type - 'pane', 'page', 'bin', or 'element'
   * @param {string} id - Object ID
   * @param {Object} options - Additional options (pageId, viewFormat, etc.)
   */
  showVisualCustomizationModal(type, id, options = {}) {
    const modal = document.getElementById("modal");
    const modalBody = document.getElementById("modal-body");
    const visualSettingsManager = this._getVisualSettingsManager();
    let currentSettings = {};
    if (visualSettingsManager) {
      const pageId = options.pageId || null;
      const viewFormat = options.viewFormat || "default";
      currentSettings = visualSettingsManager.getEffectiveSettings(type, id, pageId, viewFormat);
    }
    let objectSettings = { preserveAll: false };
    if (visualSettingsManager) {
      objectSettings = visualSettingsManager.getObjectSettings(type, id);
    }
    const appState2 = this._getAppState();
    let objectName = type;
    if (type === "pane") {
      objectName = "Pane";
    } else if (type === "page") {
      const page = appState2?.documents?.find((p) => p.id === id);
      objectName = page ? `Document: ${page.title || id}` : "Document";
    } else if (type === "bin") {
      const page = appState2?.documents?.find((p) => p.id === options.pageId);
      const bin = page?.groups?.find((b) => b.id === id);
      objectName = bin ? `Group: ${bin.title || id}` : "Group";
    } else if (type === "element") {
      objectName = "Item";
    }
    let html = `<h3 style="margin-bottom: 20px; color: #ffffff;">Visual Customization: ${objectName}</h3>`;
    html += '<div class="settings-control" style="margin-bottom: 20px; padding: 15px; background: #2a2a2a; border-radius: 8px;">';
    html += '<label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">';
    html += `<input type="checkbox" id="visual-instance-specific" style="width: 18px; height: 18px; cursor: pointer;">`;
    html += '<span style="font-weight: 600; color: #ffffff;">Apply settings to this specific instance only</span>';
    html += "</label>";
    html += '<div style="margin-top: 10px; color: #888; font-size: 12px;">By default, settings apply to all objects of this type. Enable this to apply only to this specific instance.</div>';
    html += "</div>";
    html += '<div class="settings-control" id="visual-preserve-all-container" style="margin-bottom: 20px; padding: 15px; background: #2a2a2a; border-radius: 8px; display: none;">';
    html += '<label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">';
    html += `<input type="checkbox" id="visual-preserve-all" ${objectSettings.preserveAll ? "checked" : ""} style="width: 18px; height: 18px; cursor: pointer;">`;
    html += '<span style="font-weight: 600; color: #ffffff;">Preserve all current values</span>';
    html += "</label>";
    html += '<div style="margin-top: 10px; color: #888; font-size: 12px;">When enabled, all current visual values will be preserved, not just the ones you customize.</div>';
    html += "</div>";
    html += '<div class="settings-control" style="margin-bottom: 20px; padding: 15px; background: #2a2a2a; border-radius: 8px; border: 2px solid #4a9eff;">';
    html += '<div style="font-weight: 600; color: #4a9eff; margin-bottom: 15px; font-size: 16px;">Tag-Based Customization</div>';
    html += '<div style="color: #888; font-size: 12px; margin-bottom: 15px;">Apply visual settings to all objects with a specific tag. These settings will override theme settings but can be overridden by instance-specific settings.</div>';
    html += '<div class="settings-control" style="margin-bottom: 10px;">';
    html += "<label>Tag:</label>";
    html += '<select id="visual-tag-select" style="width: 100%; padding: 6px; background: #1a1a1a; color: #e0e0e0; border: 1px solid #404040; border-radius: 4px; margin-bottom: 10px;">';
    html += '<option value="">-- Select or Create Tag --</option>';
    const tagManager = this._getTagManager();
    const allTags = tagManager?.getAvailableTags() || [];
    allTags.forEach((tag) => {
      html += `<option value="${this.escapeHtml(tag)}">${this.escapeHtml(tag)}</option>`;
    });
    html += "</select>";
    html += '<input type="text" id="visual-new-tag" placeholder="Or enter new tag name" style="width: 100%; padding: 6px; background: #1a1a1a; color: #e0e0e0; border: 1px solid #404040; border-radius: 4px; margin-bottom: 10px;">';
    html += "</div>";
    html += '<div class="settings-control" style="margin-bottom: 10px;">';
    html += "<label>Apply to View:</label>";
    html += '<select id="visual-tag-view-format" style="width: 100%; padding: 6px; background: #1a1a1a; color: #e0e0e0; border: 1px solid #404040; border-radius: 4px;">';
    html += '<option value="">All Views</option>';
    const themeManager = this._getThemeManager();
    const viewFormats = themeManager?.getViewFormats() || [];
    viewFormats.forEach((format) => {
      const formatName = format === "default" ? "Default" : format.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
      html += `<option value="${format}">${formatName}</option>`;
    });
    html += "</select>";
    html += "</div>";
    html += '<button id="visual-tag-load-btn" style="padding: 8px 16px; background: #4a9eff; color: white; border: none; border-radius: 4px; cursor: pointer; margin-right: 10px; margin-bottom: 10px;">Load Tag Settings</button>';
    html += '<button id="visual-tag-reset-btn" style="padding: 8px 16px; background: #888; color: white; border: none; border-radius: 4px; cursor: pointer; margin-bottom: 10px;">Reset Tag Settings</button>';
    html += "</div>";
    if (type === "pane" || type === "page") {
      html += this.createPageVisualControls(currentSettings);
    } else if (type === "bin") {
      html += this.createBinVisualControls(currentSettings);
    } else if (type === "element") {
      html += this.createElementVisualControls(currentSettings);
    }
    html += '<div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #404040; display: flex; gap: 10px;">';
    html += '<button id="visual-export-btn" style="padding: 8px 16px; background: #4a9eff; color: white; border: none; border-radius: 4px; cursor: pointer;">Export Settings</button>';
    html += '<button id="visual-import-btn" style="padding: 8px 16px; background: #58a858; color: white; border: none; border-radius: 4px; cursor: pointer;">Import Settings</button>';
    html += '<input type="file" id="visual-import-file" accept=".json" style="display: none;">';
    html += '<button id="visual-reset-btn" style="padding: 8px 16px; background: #888; color: white; border: none; border-radius: 4px; cursor: pointer; margin-left: auto;">Reset</button>';
    html += "</div>";
    modalBody.innerHTML = html;
    modal.classList.add("active");
    const instanceSpecificCheckbox = document.getElementById("visual-instance-specific");
    const preserveAllContainer = document.getElementById("visual-preserve-all-container");
    if (instanceSpecificCheckbox && preserveAllContainer) {
      const togglePreserveAll = () => {
        preserveAllContainer.style.display = instanceSpecificCheckbox.checked ? "block" : "none";
      };
      instanceSpecificCheckbox.addEventListener("change", togglePreserveAll);
      togglePreserveAll();
    }
    const applyRealTimeUpdate = (path, value) => {
      const instanceSpecific = instanceSpecificCheckbox?.checked || false;
      const preserveAll = document.getElementById("visual-preserve-all")?.checked || false;
      if (!instanceSpecific) {
        if (this.app.themeManager) {
          const globalTheme = this.app.themeManager.themes.global || {};
          const pathParts = path.split(".");
          let target = globalTheme;
          for (let i = 0; i < pathParts.length - 1; i++) {
            if (!target[pathParts[i]]) target[pathParts[i]] = {};
            target = target[pathParts[i]];
          }
          target[pathParts[pathParts.length - 1]] = value;
          this.app.themeManager.setGlobalTheme(globalTheme);
          if (this.app.settingsManager) {
            this.app.settingsManager.updateSetting(path, value);
          }
        }
      } else {
        if (visualSettingsManager) {
          const customSettings = {};
          const pathParts = path.split(".");
          let target = customSettings;
          for (let i = 0; i < pathParts.length - 1; i++) {
            if (!target[pathParts[i]]) target[pathParts[i]] = {};
            target = target[pathParts[i]];
          }
          target[pathParts[pathParts.length - 1]] = value;
          visualSettingsManager.setObjectSettings(type, id, customSettings, preserveAll);
        }
      }
      applyVisualChangesOnly(path, value);
    };
    const applyVisualChangesOnly = (path, value) => {
      const isInstanceSpecific = instanceSpecificCheckbox?.checked || false;
      const root = document.documentElement;
      const cssVarName = pathToCssVar(path);
      if (cssVarName) {
        root.style.setProperty(cssVarName, value);
      }
      if (this.app.themeManager && !isInstanceSpecific) {
        const scope = document.documentElement;
        this.app.themeManager.applyTheme(this.app.themeManager.themes.global, scope);
      }
      if (isInstanceSpecific && visualSettingsManager) {
        const elements = document.querySelectorAll(`[data-${type}-id="${id}"]`);
        elements.forEach((el) => {
          visualSettingsManager.applyVisualSettings(el, type, id);
        });
      }
    };
    const pathToCssVar = (path) => {
      const mapping = {
        "page.background": "--page-bg",
        "page.margin": "--page-margin",
        "page.padding": "--page-padding",
        "page.borderRadius": "--page-border-radius",
        "page.fontFamily": "--page-font-family",
        "page.fontSize": "--page-font-size",
        "page.opacity": "--page-opacity",
        "page.color": "--page-color",
        "element.background": "--element-bg",
        "element.margin": "--element-margin",
        "element.padding": "--element-padding",
        "element.paddingVertical": "--element-padding-vertical",
        "element.paddingHorizontal": "--element-padding-horizontal",
        "element.gap": "--element-gap",
        "element.fontFamily": "--element-font-family",
        "element.fontSize": "--element-font-size",
        "element.opacity": "--element-opacity",
        "element.color": "--element-color",
        "element.hoverBackground": "--element-hover-bg",
        "background": "--bg-color"
      };
      return mapping[path] || null;
    };
    const allInputs = modalBody.querySelectorAll("[data-setting-path]");
    allInputs.forEach((input) => {
      const path = input.dataset.settingPath;
      if (input.type === "range") {
        const numberInput = modalBody.querySelector(`input[type="number"][data-setting-path="${path}"]`);
        input.addEventListener("input", (e) => {
          const value = e.target.value;
          if (numberInput) {
            numberInput.value = value;
          }
          let finalValue = value;
          if (path.includes("opacity")) {
            finalValue = (parseFloat(value) / 100).toFixed(2);
          } else if (path.includes("Size") || path.includes("margin") || path.includes("padding") || path.includes("borderRadius") || path.includes("size") || path.includes("gap")) {
            finalValue = value + "px";
          }
          applyRealTimeUpdate(path, finalValue);
        });
      } else if (input.type === "number") {
        const rangeInput = modalBody.querySelector(`input[type="range"][data-setting-path="${path}"]`);
        input.addEventListener("input", (e) => {
          const value = e.target.value;
          if (rangeInput) {
            rangeInput.value = value;
          }
          let finalValue = value;
          if (path.includes("opacity")) {
            finalValue = (parseFloat(value) / 100).toFixed(2);
          } else if (path.includes("Size") || path.includes("margin") || path.includes("padding") || path.includes("borderRadius") || path.includes("size") || path.includes("gap")) {
            finalValue = value + "px";
          }
          applyRealTimeUpdate(path, finalValue);
        });
      } else if (input.type === "color" || input.type === "text") {
        input.addEventListener("input", (e) => {
          applyRealTimeUpdate(path, e.target.value);
        });
      }
    });
    const saveVisualSettings = () => {
      if (!visualSettingsManager) return;
      const instanceSpecific = instanceSpecificCheckbox?.checked || false;
      const preserveAll = document.getElementById("visual-preserve-all")?.checked || false;
      if (!instanceSpecific) {
        if (this.app.themeManager) {
          this.app.themeManager.saveThemes();
        }
        if (this.app.settingsManager) {
          this.app.settingsManager.saveSettings();
        }
        this.closeModal();
        eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
        return;
      }
      const customSettings = {};
      const pageSettings = currentSettings.page || {};
      const elementSettings = currentSettings.element || {};
      const getInputValue = (path) => {
        const input = modalBody.querySelector(`[data-setting-path="${path}"]`) || document.querySelector(`[data-setting-path="${path}"]`);
        if (!input) return null;
        if (input.type === "color") return input.value;
        if (input.type === "range" || input.type === "number") {
          const numValue = parseFloat(input.value);
          if (path.includes("opacity")) {
            return (numValue / 100).toFixed(2);
          } else if (path.includes("Size") || path.includes("margin") || path.includes("padding") || path.includes("borderRadius") || path.includes("size") || path.includes("gap")) {
            return numValue + "px";
          }
          return input.value;
        }
        return input.value;
      };
      if (type === "pane" || type === "page" || type === "bin") {
        const pageBg = getInputValue("page.background");
        const pageMargin = getInputValue("page.margin");
        const pagePadding = getInputValue("page.padding");
        const pageBorderRadius = getInputValue("page.borderRadius");
        const pageFontFamily = getInputValue("page.fontFamily");
        const pageFontSize = getInputValue("page.fontSize");
        const pageOpacity = getInputValue("page.opacity");
        const pageColor = getInputValue("page.color");
        if (!preserveAll) {
          if (!customSettings.page) customSettings.page = {};
          if (pageBg && pageBg !== pageSettings.background) customSettings.page.background = pageBg;
          if (pageMargin && pageMargin !== pageSettings.margin) customSettings.page.margin = pageMargin;
          if (pagePadding && pagePadding !== pageSettings.padding) customSettings.page.padding = pagePadding;
          if (pageBorderRadius && pageBorderRadius !== pageSettings.borderRadius) customSettings.page.borderRadius = pageBorderRadius;
          if (pageFontFamily && pageFontFamily !== pageSettings.fontFamily) customSettings.page.fontFamily = pageFontFamily;
          if (pageFontSize && pageFontSize !== pageSettings.fontSize) customSettings.page.fontSize = pageFontSize;
          if (pageOpacity && pageOpacity !== pageSettings.opacity) customSettings.page.opacity = pageOpacity;
          if (pageColor && pageColor !== pageSettings.color) customSettings.page.color = pageColor;
        } else {
          customSettings.page = {
            background: pageBg || pageSettings.background,
            margin: pageMargin || pageSettings.margin,
            padding: pagePadding || pageSettings.padding,
            borderRadius: pageBorderRadius || pageSettings.borderRadius,
            fontFamily: pageFontFamily || pageSettings.fontFamily,
            fontSize: pageFontSize || pageSettings.fontSize,
            opacity: pageOpacity || pageSettings.opacity,
            color: pageColor || pageSettings.color
          };
        }
      }
      if (type === "element" || type === "bin") {
        const elementBg = getInputValue("element.background");
        const elementMargin = getInputValue("element.margin");
        const elementPadding = getInputValue("element.padding");
        const elementPaddingVertical = getInputValue("element.paddingVertical");
        const elementPaddingHorizontal = getInputValue("element.paddingHorizontal");
        const elementGap = getInputValue("element.gap");
        const elementFontFamily = getInputValue("element.fontFamily");
        const elementFontSize = getInputValue("element.fontSize");
        const elementOpacity = getInputValue("element.opacity");
        const elementColor = getInputValue("element.color");
        const elementHoverBg = getInputValue("element.hoverBackground");
        if (!preserveAll) {
          if (!customSettings.element) customSettings.element = {};
          if (elementBg && elementBg !== elementSettings.background) customSettings.element.background = elementBg;
          if (elementMargin && elementMargin !== elementSettings.margin) customSettings.element.margin = elementMargin;
          if (elementPadding && elementPadding !== elementSettings.padding) customSettings.element.padding = elementPadding;
          if (elementPaddingVertical && elementPaddingVertical !== (elementSettings.paddingVertical || elementSettings.padding)) customSettings.element.paddingVertical = elementPaddingVertical;
          if (elementPaddingHorizontal && elementPaddingHorizontal !== (elementSettings.paddingHorizontal || elementSettings.padding)) customSettings.element.paddingHorizontal = elementPaddingHorizontal;
          if (elementGap && elementGap !== elementSettings.gap) customSettings.element.gap = elementGap;
          if (elementFontFamily && elementFontFamily !== elementSettings.fontFamily) customSettings.element.fontFamily = elementFontFamily;
          if (elementFontSize && elementFontSize !== elementSettings.fontSize) customSettings.element.fontSize = elementFontSize;
          if (elementOpacity && elementOpacity !== elementSettings.opacity) customSettings.element.opacity = elementOpacity;
          if (elementColor && elementColor !== elementSettings.color) customSettings.element.color = elementColor;
          if (elementHoverBg && elementHoverBg !== elementSettings.hoverBackground) customSettings.element.hoverBackground = elementHoverBg;
        } else {
          customSettings.element = {
            background: elementBg || elementSettings.background,
            margin: elementMargin || elementSettings.margin,
            padding: elementPadding || elementSettings.padding,
            paddingVertical: elementPaddingVertical || elementSettings.paddingVertical || elementSettings.padding,
            paddingHorizontal: elementPaddingHorizontal || elementSettings.paddingHorizontal || elementSettings.padding,
            gap: elementGap || elementSettings.gap,
            fontFamily: elementFontFamily || elementSettings.fontFamily,
            fontSize: elementFontSize || elementSettings.fontSize,
            opacity: elementOpacity || elementSettings.opacity,
            color: elementColor || elementSettings.color,
            hoverBackground: elementHoverBg || elementSettings.hoverBackground
          };
        }
      }
      if (visualSettingsManager) {
        visualSettingsManager.setObjectSettings(type, id, customSettings, preserveAll);
      }
      this.closeModal();
      eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
    };
    const saveBtn = document.createElement("button");
    saveBtn.textContent = "Save";
    saveBtn.style.cssText = "padding: 10px 20px; background: #4a9eff; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; font-weight: 600; margin-top: 20px; width: 100%;";
    saveBtn.addEventListener("click", () => {
      const tagSelect = document.getElementById("visual-tag-select");
      const newTagInput = document.getElementById("visual-new-tag");
      const tagViewFormat = document.getElementById("visual-tag-view-format");
      const selectedTag = tagSelect?.value || newTagInput?.value?.trim().toLowerCase();
      const instanceSpecific = instanceSpecificCheckbox?.checked || false;
      if (selectedTag) {
        const viewFormat = tagViewFormat?.value || null;
        const preserveAll = document.getElementById("visual-preserve-all")?.checked || false;
        const customSettings = {};
        const pageSettings = currentSettings.page || {};
        const elementSettings = currentSettings.element || {};
        const getInputValue = (path) => {
          const input = modalBody.querySelector(`[data-setting-path="${path}"]`) || document.querySelector(`[data-setting-path="${path}"]`);
          if (!input) return null;
          if (input.type === "color") return input.value;
          if (input.type === "range" || input.type === "number") {
            const numValue = parseFloat(input.value);
            if (path.includes("opacity")) {
              return (numValue / 100).toFixed(2);
            } else if (path.includes("Size") || path.includes("margin") || path.includes("padding") || path.includes("borderRadius") || path.includes("size") || path.includes("gap")) {
              return numValue + "px";
            }
            return input.value;
          }
          return input.value;
        };
        if (type === "pane" || type === "page" || type === "bin") {
          const pageBg = getInputValue("page.background");
          const pageMargin = getInputValue("page.margin");
          const pagePadding = getInputValue("page.padding");
          const pageBorderRadius = getInputValue("page.borderRadius");
          const pageFontFamily = getInputValue("page.fontFamily");
          const pageFontSize = getInputValue("page.fontSize");
          const pageOpacity = getInputValue("page.opacity");
          const pageColor = getInputValue("page.color");
          if (!preserveAll) {
            if (!customSettings.page) customSettings.page = {};
            if (pageBg && pageBg !== pageSettings.background) customSettings.page.background = pageBg;
            if (pageMargin && pageMargin !== pageSettings.margin) customSettings.page.margin = pageMargin;
            if (pagePadding && pagePadding !== pageSettings.padding) customSettings.page.padding = pagePadding;
            if (pageBorderRadius && pageBorderRadius !== pageSettings.borderRadius) customSettings.page.borderRadius = pageBorderRadius;
            if (pageFontFamily && pageFontFamily !== pageSettings.fontFamily) customSettings.page.fontFamily = pageFontFamily;
            if (pageFontSize && pageFontSize !== pageSettings.fontSize) customSettings.page.fontSize = pageFontSize;
            if (pageOpacity && pageOpacity !== pageSettings.opacity) customSettings.page.opacity = pageOpacity;
            if (pageColor && pageColor !== pageSettings.color) customSettings.page.color = pageColor;
          } else {
            customSettings.page = {
              background: pageBg || pageSettings.background,
              margin: pageMargin || pageSettings.margin,
              padding: pagePadding || pageSettings.padding,
              borderRadius: pageBorderRadius || pageSettings.borderRadius,
              fontFamily: pageFontFamily || pageSettings.fontFamily,
              fontSize: pageFontSize || pageSettings.fontSize,
              opacity: pageOpacity || pageSettings.opacity,
              color: pageColor || pageSettings.color
            };
          }
        }
        if (type === "element" || type === "bin") {
          const elementBg = getInputValue("element.background");
          const elementMargin = getInputValue("element.margin");
          const elementPadding = getInputValue("element.padding");
          const elementPaddingVertical = getInputValue("element.paddingVertical");
          const elementPaddingHorizontal = getInputValue("element.paddingHorizontal");
          const elementGap = getInputValue("element.gap");
          const elementFontFamily = getInputValue("element.fontFamily");
          const elementFontSize = getInputValue("element.fontSize");
          const elementOpacity = getInputValue("element.opacity");
          const elementColor = getInputValue("element.color");
          const elementHoverBg = getInputValue("element.hoverBackground");
          if (!preserveAll) {
            if (!customSettings.element) customSettings.element = {};
            if (elementBg && elementBg !== elementSettings.background) customSettings.element.background = elementBg;
            if (elementMargin && elementMargin !== elementSettings.margin) customSettings.element.margin = elementMargin;
            if (elementPadding && elementPadding !== elementSettings.padding) customSettings.element.padding = elementPadding;
            if (elementPaddingVertical && elementPaddingVertical !== (elementSettings.paddingVertical || elementSettings.padding)) customSettings.element.paddingVertical = elementPaddingVertical;
            if (elementPaddingHorizontal && elementPaddingHorizontal !== (elementSettings.paddingHorizontal || elementSettings.padding)) customSettings.element.paddingHorizontal = elementPaddingHorizontal;
            if (elementGap && elementGap !== elementSettings.gap) customSettings.element.gap = elementGap;
            if (elementFontFamily && elementFontFamily !== elementSettings.fontFamily) customSettings.element.fontFamily = elementFontFamily;
            if (elementFontSize && elementFontSize !== elementSettings.fontSize) customSettings.element.fontSize = elementFontSize;
            if (elementOpacity && elementOpacity !== elementSettings.opacity) customSettings.element.opacity = elementOpacity;
            if (elementColor && elementColor !== elementSettings.color) customSettings.element.color = elementColor;
            if (elementHoverBg && elementHoverBg !== elementSettings.hoverBackground) customSettings.element.hoverBackground = elementHoverBg;
          } else {
            customSettings.element = {
              background: elementBg || elementSettings.background,
              margin: elementMargin || elementSettings.margin,
              padding: elementPadding || elementSettings.padding,
              paddingVertical: elementPaddingVertical || elementSettings.paddingVertical || elementSettings.padding,
              paddingHorizontal: elementPaddingHorizontal || elementSettings.paddingHorizontal || elementSettings.padding,
              gap: elementGap || elementSettings.gap,
              fontFamily: elementFontFamily || elementSettings.fontFamily,
              fontSize: elementFontSize || elementSettings.fontSize,
              opacity: elementOpacity || elementSettings.opacity,
              color: elementColor || elementSettings.color,
              hoverBackground: elementHoverBg || elementSettings.hoverBackground
            };
          }
        }
        visualSettingsManager.setTagSettings(selectedTag, customSettings, preserveAll, viewFormat);
        if (newTagInput?.value?.trim() && !allTags.includes(selectedTag)) {
          const tagManager2 = this._getTagManager();
          tagManager2?.addTag(selectedTag);
        }
        this.closeModal();
        eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
      } else if (instanceSpecific) {
        saveVisualSettings();
      } else {
        this.closeModal();
      }
    });
    modalBody.appendChild(saveBtn);
    const exportBtn = document.getElementById("visual-export-btn");
    if (exportBtn) {
      exportBtn.addEventListener("click", () => {
        if (!visualSettingsManager) return;
        const settings = visualSettingsManager.exportSettings(type, id);
        const blob = new Blob([settings], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `visual-settings-${type}-${id}.json`;
        a.click();
        URL.revokeObjectURL(url);
      });
    }
    const importBtn = document.getElementById("visual-import-btn");
    const importFile = document.getElementById("visual-import-file");
    if (importBtn && importFile) {
      importBtn.addEventListener("click", () => importFile.click());
      importFile.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const imported = JSON.parse(event.target.result);
            if (imported.custom && visualSettingsManager) {
              const preserveAll = imported.preserveAll || false;
              visualSettingsManager.setObjectSettings(type, id, imported.custom, preserveAll);
              this.closeModal();
              eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
            }
          };
          reader.readAsText(file);
        }
      });
    }
    const resetBtn = document.getElementById("visual-reset-btn");
    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        if (confirm("Remove all custom visual settings for this object?") && visualSettingsManager) {
          visualSettingsManager.removeObjectSettings(type, id);
          this.closeModal();
          eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
        }
      });
    }
  }
  createPageVisualControls(settings) {
    const pageSettings = settings.page || {};
    const settingsManager = this.app.settingsManager;
    let html = '<div class="settings-section">';
    html += '<div class="settings-section-title" style="cursor: pointer; padding: 10px; background: #2a2a2a; border-radius: 4px; margin-bottom: 10px;">';
    html += '<span style="font-weight: 600;">Page Styles</span>';
    html += "</div>";
    html += '<div class="settings-section-content">';
    html += settingsManager.createColorControl("page.background", "Background Color", pageSettings.background || "#2d2d2d");
    html += settingsManager.createSliderControl("page.margin", "Margin", pageSettings.margin || "0px", 0, 50, 1, "px");
    html += settingsManager.createSliderControl("page.padding", "Padding", pageSettings.padding || "20px", 0, 50, 1, "px");
    html += settingsManager.createSliderControl("page.borderRadius", "Border Radius", pageSettings.borderRadius || "8px", 0, 30, 1, "px");
    html += settingsManager.createTextControl("page.fontFamily", "Font Family", pageSettings.fontFamily || "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif");
    html += settingsManager.createSliderControl("page.fontSize", "Font Size", pageSettings.fontSize || "14px", 8, 32, 1, "px");
    html += settingsManager.createOpacityControl("page.opacity", "Opacity", pageSettings.opacity || "1");
    html += settingsManager.createColorControl("page.color", "Text Color", pageSettings.color || "#e0e0e0");
    html += "</div>";
    html += "</div>";
    return html;
  }
  createBinVisualControls(settings) {
    let html = this.createPageVisualControls(settings);
    html += this.createElementVisualControls(settings);
    return html;
  }
  createElementVisualControls(settings) {
    const elementSettings = settings.element || {};
    const settingsManager = this.app.settingsManager;
    let html = '<div class="settings-section">';
    html += '<div class="settings-section-title" style="cursor: pointer; padding: 10px; background: #2a2a2a; border-radius: 4px; margin-bottom: 10px; margin-top: 20px;">';
    html += '<span style="font-weight: 600;">Element Styles</span>';
    html += "</div>";
    html += '<div class="settings-section-content">';
    html += settingsManager.createColorControl("element.background", "Background Color", elementSettings.background || "transparent");
    html += settingsManager.createSliderControl("element.margin", "Margin", elementSettings.margin || "0px", 0, 30, 1, "px");
    html += settingsManager.createSliderControl("element.padding", "Padding (All)", elementSettings.padding || "10px", 0, 30, 1, "px");
    html += settingsManager.createSliderControl("element.paddingVertical", "Padding (Vertical)", elementSettings.paddingVertical || elementSettings.padding || "10px", 0, 30, 1, "px");
    html += settingsManager.createSliderControl("element.paddingHorizontal", "Padding (Horizontal)", elementSettings.paddingHorizontal || elementSettings.padding || "10px", 0, 30, 1, "px");
    html += settingsManager.createSliderControl("element.gap", "Element Gap", elementSettings.gap || "8px", 0, 30, 1, "px");
    html += settingsManager.createTextControl("element.fontFamily", "Font Family", elementSettings.fontFamily || "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif");
    html += settingsManager.createSliderControl("element.fontSize", "Font Size", elementSettings.fontSize || "14px", 8, 32, 1, "px");
    html += settingsManager.createOpacityControl("element.opacity", "Opacity", elementSettings.opacity || "1");
    html += settingsManager.createColorControl("element.color", "Text Color", elementSettings.color || "#e0e0e0");
    html += settingsManager.createColorControl("element.hoverBackground", "Hover Background", elementSettings.hoverBackground || "#363636");
    html += "</div>";
    html += "</div>";
    return html;
  }
}
class FileManager {
  constructor() {
    this.currentFilename = null;
    this.lastOpenedFileKey = "twodo-last-opened-file";
    this.originalFilename = null;
    this.tempFilename = null;
    this.isBackupLoaded = false;
    this.backupDiffers = false;
  }
  /**
   * Get services
   */
  _getModalHandler() {
    return getService(SERVICES.MODAL_HANDLER);
  }
  _getUndoRedoManager() {
    return getService(SERVICES.UNDO_REDO_MANAGER);
  }
  _getAppState() {
    return getService(SERVICES.APP_STATE);
  }
  _getDataManager() {
    return getService(SERVICES.DATA_MANAGER);
  }
  _normalizeFileData(rawData) {
    if (!rawData || typeof rawData !== "object") {
      return { documents: [] };
    }
    const normalized = { ...rawData };
    normalized.documents = normalized.documents || [];
    const dataManager = this._getDataManager();
    return dataManager ? dataManager.normalizeDataModel(normalized) : normalized;
  }
  async listFiles() {
    try {
      const response = await fetch("/files");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      if (result.success) {
        return result.files || [];
      } else {
        throw new Error(result.error || "Failed to list files");
      }
    } catch (error) {
      console.error("Error listing files:", error);
      const modalHandler = this._getModalHandler();
      if (modalHandler) {
        modalHandler.showAlert("Failed to list files: " + error.message);
      } else {
        alert("Failed to list files: " + error.message);
      }
      return [];
    }
  }
  async saveFile(filename, data, silent = false, saveIndexes = true) {
    try {
      let actualFilename = filename;
      if (this.isBackupLoaded && this.backupDiffers && this.tempFilename) {
        actualFilename = this.tempFilename;
      }
      const response = await fetch("/files/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          filename: actualFilename,
          data,
          createBackup: !silent
          // Create backup only for manual saves (not autosave)
        })
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      if (result.success) {
        if (this.isBackupLoaded && this.backupDiffers && silent && this.tempFilename) {
          this.currentFilename = this.tempFilename;
        } else if (!this.isBackupLoaded || !this.backupDiffers || !silent) {
          this.currentFilename = result.filename;
        } else {
          this.currentFilename = this.tempFilename;
        }
        const undoRedoManager = this._getUndoRedoManager();
        if (undoRedoManager) {
          undoRedoManager._debouncedSaveBuffer();
        }
        if (saveIndexes) {
          await this._saveDerivedIndexes(actualFilename, data, true);
        }
        return result;
      } else {
        throw new Error(result.error || "Failed to save file");
      }
    } catch (error) {
      console.error("Error saving file:", error);
      if (!silent) {
        const modalHandler = this._getModalHandler();
        if (modalHandler) {
          await modalHandler.showAlert("Failed to save file: " + error.message);
        } else {
          alert("Failed to save file: " + error.message);
        }
      }
      throw error;
    }
  }
  async saveAsFile(filename, data, saveIndexes = true) {
    try {
      const response = await fetch("/files/save-as", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          filename,
          data,
          createBackup: true
          // Always create backup for Save As (manual save)
        })
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      if (result.success) {
        this.currentFilename = result.filename;
        if (saveIndexes) {
          await this._saveDerivedIndexes(result.filename, data, true);
        }
        return result;
      } else {
        throw new Error(result.error || "Failed to save file");
      }
    } catch (error) {
      console.error("Error saving file:", error);
      const modalHandler = this._getModalHandler();
      if (modalHandler) {
        await modalHandler.showAlert("Failed to save file: " + error.message);
      } else {
        alert("Failed to save file: " + error.message);
      }
      throw error;
    }
  }
  _buildGroupIndexPayload(documents) {
    const payload = {
      generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      documents: {}
    };
    (documents || []).forEach((doc) => {
      const groupIndex = {};
      const groups = doc.groups || [];
      groups.forEach((group) => {
        groupIndex[group.id] = {
          id: group.id,
          parentGroupId: group.parentGroupId ?? null,
          level: typeof group.level === "number" ? group.level : 0,
          childIds: [],
          ancestorIds: []
        };
      });
      groups.forEach((group) => {
        const entry = groupIndex[group.id];
        if (!entry) return;
        const parentId = entry.parentGroupId;
        if (parentId && groupIndex[parentId]) {
          groupIndex[parentId].childIds.push(group.id);
        }
      });
      Object.values(groupIndex).forEach((entry) => {
        const ancestors = [];
        let currentParent = entry.parentGroupId;
        while (currentParent && groupIndex[currentParent]) {
          ancestors.push(currentParent);
          currentParent = groupIndex[currentParent].parentGroupId;
        }
        entry.ancestorIds = ancestors;
      });
      payload.documents[doc.id] = {
        groupMode: doc.groupMode || doc.config?.groupMode || "manual",
        groups: groupIndex
      };
    });
    return payload;
  }
  async _saveDerivedIndexes(filename, data, silent = true) {
    if (!data || !Array.isArray(data.documents)) {
      return;
    }
    const indexPayload = this._buildGroupIndexPayload(data.documents);
    const indexFilename = `indexes/${filename}.groups.json`;
    await this.saveFile(indexFilename, indexPayload, silent, false);
  }
  async loadFile(filename, loadBuffer = true) {
    const perfStart = performance.now();
    try {
      const encodedFilename = encodeURIComponent(filename);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5e3);
      try {
        const fetchStart = performance.now();
        const fetchUrl = `/files/${encodedFilename}?t=${Date.now()}`;
        const requestsBefore = performance.getEntriesByType("resource").length;
        const response = await fetch(fetchUrl, {
          signal: controller.signal,
          cache: "no-store"
          // Use no-store instead of no-cache for stronger cache bypass
        });
        const fetchTime = performance.now() - fetchStart;
        clearTimeout(timeoutId);
        setTimeout(() => {
          const resourceTimings = performance.getEntriesByType("resource");
          const resourceTiming = resourceTimings.find((entry) => entry.name.includes(encodedFilename));
          if (resourceTiming) {
          } else {
          }
        }, 100);
        if (!response.ok) {
          if (response.status === 404) {
            const error = new Error(`File not found: ${filename}`);
            error.status = 404;
            throw error;
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const parseStart = performance.now();
        const result = await response.json();
        const parseTime = performance.now() - parseStart;
        if (result.success) {
          this.currentFilename = result.filename;
          const dataManager = this._getDataManager();
          if (dataManager) {
            dataManager._lastSyncTimestamp = Date.now();
          }
          if (loadBuffer) {
            const undoRedoManager = this._getUndoRedoManager();
            if (undoRedoManager) {
              const bufferStart = performance.now();
              await undoRedoManager.loadBuffer(result.filename);
              const bufferTime = performance.now() - bufferStart;
              console.log(`[PERF] Buffer load: ${bufferTime.toFixed(1)}ms`);
            }
          }
          const totalTime = performance.now() - perfStart;
          console.log(`[PERF] File load ${filename}: fetch=${fetchTime.toFixed(1)}ms, parse=${parseTime.toFixed(1)}ms, total=${totalTime.toFixed(1)}ms`);
          return result.data;
        } else {
          throw new Error(result.error || "Failed to load file");
        }
      } catch (fetchError) {
        clearTimeout(timeoutId);
        if (fetchError.name === "AbortError") {
          throw new Error("File load timeout");
        }
        throw fetchError;
      }
    } catch (error) {
      if (error.status !== 404 && !error.message.includes("timeout")) {
        console.error("Error loading file:", error);
        const modalHandler = this._getModalHandler();
        if (modalHandler) {
          await modalHandler.showAlert("Failed to load file: " + error.message);
        } else {
          alert("Failed to load file: " + error.message);
        }
      }
      throw error;
    }
  }
  async renameFile(oldFilename, newFilename) {
    try {
      const encodedFilename = encodeURIComponent(oldFilename);
      const response = await fetch(`/files/${encodedFilename}/rename`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          filename: newFilename
        })
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      if (result.success) {
        if (this.currentFilename === oldFilename) {
          this.currentFilename = result.filename;
        }
        return result;
      } else {
        throw new Error(result.error || "Failed to rename file");
      }
    } catch (error) {
      console.error("Error renaming file:", error);
      const modalHandler = this._getModalHandler();
      if (modalHandler) {
        await modalHandler.showAlert("Failed to rename file: " + error.message);
      } else {
        alert("Failed to rename file: " + error.message);
      }
      throw error;
    }
  }
  async deleteFile(filename) {
    try {
      const encodedFilename = encodeURIComponent(filename);
      const response = await fetch(`/files/${encodedFilename}`, {
        method: "DELETE"
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      if (result.success) {
        if (this.currentFilename === filename) {
          this.currentFilename = null;
        }
        return result;
      } else {
        throw new Error(result.error || "Failed to delete file");
      }
    } catch (error) {
      console.error("Error deleting file:", error);
      const modalHandler = this._getModalHandler();
      if (modalHandler) {
        await modalHandler.showAlert("Failed to delete file: " + error.message);
      } else {
        alert("Failed to delete file: " + error.message);
      }
      throw error;
    }
  }
  showFileManager() {
    const modal = document.getElementById("modal");
    const modalBody = document.getElementById("modal-body");
    if (!modal || !modalBody) {
      console.error("[FileManager] Modal elements not found!");
      return;
    }
    modalBody.innerHTML = `
            <h3>File Manager</h3>
            <div style="margin-top: 20px;">
                <div style="display: flex; gap: 10px; margin-bottom: 20px;">
                    <button id="file-manager-new" style="padding: 8px 16px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 18px; line-height: 1;">+</button>
                    <button id="file-manager-save" style="padding: 8px 16px; background: #4a9eff; color: white; border: none; border-radius: 4px; cursor: pointer;">💾 Save</button>
                    <button id="file-manager-save-as" style="padding: 8px 16px; background: #4a9eff; color: white; border: none; border-radius: 4px; cursor: pointer;">💾 Save As</button>
                    <button id="file-manager-refresh" style="padding: 8px 16px; background: #555; color: white; border: none; border-radius: 4px; cursor: pointer;">🔄 Refresh</button>
                </div>
                <div id="file-manager-list" style="max-height: 400px; overflow-y: auto; border: 1px solid #444; border-radius: 4px; padding: 10px; background: #1a1a1a;">
                    <div style="text-align: center; color: #888; padding: 20px;">Loading files...</div>
                </div>
            </div>
        `;
    modal.classList.add("active");
    const newBtn = document.getElementById("file-manager-new");
    const saveBtn = document.getElementById("file-manager-save");
    const saveAsBtn = document.getElementById("file-manager-save-as");
    const refreshBtn = document.getElementById("file-manager-refresh");
    if (newBtn) {
      newBtn.onclick = () => this.handleNew();
    }
    if (saveBtn) {
      saveBtn.onclick = () => this.handleSave();
    }
    if (saveAsBtn) {
      saveAsBtn.onclick = () => this.handleSaveAs();
    }
    if (refreshBtn) {
      refreshBtn.onclick = () => this.refreshFileList();
    }
    this.refreshFileList();
  }
  async refreshFileList() {
    const listDiv = document.getElementById("file-manager-list");
    if (!listDiv) return;
    listDiv.innerHTML = '<div style="text-align: center; color: #888; padding: 20px;">Loading files...</div>';
    const files = await this.listFiles();
    if (files.length === 0) {
      listDiv.innerHTML = '<div style="text-align: center; color: #888; padding: 20px;">No saved files</div>';
      return;
    }
    let html = '<div style="display: flex; flex-direction: column; gap: 8px;">';
    files.forEach((file) => {
      const isCurrent = file.filename === this.currentFilename;
      const modifiedDate = new Date(file.modified * 1e3).toLocaleString();
      const sizeKB = (file.size / 1024).toFixed(1);
      html += `
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px; background: ${isCurrent ? "#2a4a6a" : "#2a2a2a"}; border-radius: 4px; border: 1px solid #444;">
                    <div style="flex: 1;">
                        <div style="font-weight: ${isCurrent ? "bold" : "normal"}; color: ${isCurrent ? "#4a9eff" : "#e0e0e0"};">
                            ${file.filename} ${isCurrent ? "(current)" : ""}
                        </div>
                        <div style="font-size: 12px; color: #888; margin-top: 4px;">
                            ${sizeKB} KB • ${modifiedDate}
                        </div>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button onclick="window.app.fileManager.handleLoad('${file.filename}')" 
                                style="padding: 6px 12px; background: #4a9eff; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">📂 Load</button>
                        <button onclick="window.app.fileManager.handleLoadBackup('${file.filename}')" 
                                style="padding: 6px 12px; background: #6a8eff; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">💾 Load .bak</button>
                        <button onclick="window.app.fileManager.handleRename('${file.filename}')" 
                                style="padding: 6px 12px; background: #888; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">✏️ Rename</button>
                        <button onclick="window.app.fileManager.handleDelete('${file.filename}')" 
                                style="padding: 6px 12px; background: #ff5555; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">🗑️ Delete</button>
                    </div>
                </div>
            `;
    });
    html += "</div>";
    listDiv.innerHTML = html;
  }
  async handleSave() {
    if (this.isBackupLoaded && this.backupDiffers && this.originalFilename) {
      let choice;
      if (this.app && this.app.modalHandler) {
        choice = await this.app.modalHandler.showConfirm(
          `You loaded a backup file that differs from ${this.originalFilename}.

Do you want to overwrite ${this.originalFilename} with your current changes?

Click OK to overwrite, or Cancel to save as a new file.`
        );
      } else {
        choice = confirm(
          `You loaded a backup file that differs from ${this.originalFilename}.

Do you want to overwrite ${this.originalFilename} with your current changes?

Click OK to overwrite, or Cancel to save as a new file.`
        );
      }
      if (choice) {
        try {
          const fileData = {
            documents: this._getAppState().documents
          };
          const tempFileToDelete = this.tempFilename;
          const originalFile = this.originalFilename;
          this.originalFilename = null;
          this.tempFilename = null;
          this.isBackupLoaded = false;
          this.backupDiffers = false;
          await this.saveFile(originalFile, fileData);
          if (tempFileToDelete) {
            await this.deleteFile(tempFileToDelete).catch((err) => {
              console.warn("Failed to delete temp file:", err);
            });
          }
          if (this.app && this.app.modalHandler) {
            await this.app.modalHandler.showAlert(`File saved: ${originalFile}`);
          } else {
            alert(`File saved: ${originalFile}`);
          }
          this.refreshFileList();
        } catch (error) {
        }
      } else {
        this.handleSaveAs();
      }
      return;
    }
    if (!this.currentFilename) {
      this.handleSaveAs();
      return;
    }
    try {
      const fileData = {
        documents: this._getAppState().documents
      };
      console.log("[FileManager] Manual save - currentFilename:", this.currentFilename);
      await this.saveFile(this.currentFilename, fileData);
      console.log("[FileManager] Manual save successful");
      if (this.isBackupLoaded && this.tempFilename && this.currentFilename === this.tempFilename) {
        this.isBackupLoaded = false;
        this.backupDiffers = false;
        this.tempFilename = null;
        this.originalFilename = null;
        this.tempFileCounter = 0;
      }
      if (this.app && this.app.modalHandler) {
        await this.app.modalHandler.showAlert(`File saved: ${this.currentFilename}`);
      } else {
        alert(`File saved: ${this.currentFilename}`);
      }
      this.refreshFileList();
    } catch (error) {
    }
  }
  async handleSaveAs() {
    const defaultName = this.currentFilename ? this.currentFilename.replace(".json", "").replace(/-\d+$/, "") : "";
    let filename;
    if (this.app && this.app.modalHandler) {
      filename = await this.app.modalHandler.showPrompt("Enter filename (without .json extension):", defaultName);
    } else {
      filename = prompt("Enter filename (without .json extension):", defaultName);
    }
    if (!filename) return;
    try {
      const fileData = {
        documents: this._getAppState().documents
      };
      const tempFileToDelete = this.tempFilename;
      this.originalFilename = null;
      this.tempFilename = null;
      this.isBackupLoaded = false;
      this.backupDiffers = false;
      await this.saveAsFile(filename, fileData);
      if (tempFileToDelete) {
        await this.deleteFile(tempFileToDelete).catch((err) => {
          console.warn("Failed to delete temp file:", err);
        });
      }
      if (this.app && this.app.modalHandler) {
        await this.app.modalHandler.showAlert(`File saved as: ${this.currentFilename}`);
      } else {
        alert(`File saved as: ${this.currentFilename}`);
      }
      this.refreshFileList();
    } catch (error) {
    }
  }
  async handleLoad(filename) {
    let confirmed;
    if (this.app && this.app.modalHandler) {
      confirmed = await this.app.modalHandler.showConfirm(`Load ${filename}? This will replace your current data.`);
    } else {
      confirmed = confirm(`Load ${filename}? This will replace your current data.`);
    }
    if (!confirmed) {
      return;
    }
    try {
      const fileData = await this.loadFile(filename);
      const normalizedFile = this._normalizeFileData(fileData);
      if (!normalizedFile.documents || !Array.isArray(normalizedFile.documents)) {
        if (this.app && this.app.modalHandler) {
          await this.app.modalHandler.showAlert('Invalid file format. Expected a JSON file with a "documents" array.');
        } else {
          alert('Invalid file format. Expected a JSON file with a "documents" array.');
        }
        return;
      }
      const appState2 = this._getAppState();
      appState2.documents = normalizedFile.documents;
      if (normalizedFile.documents.length > 0 && !normalizedFile.documents.find((doc) => doc.id === appState2.currentDocumentId)) {
        appState2.currentDocumentId = normalizedFile.documents[0].id;
      }
      localStorage.setItem(this.lastOpenedFileKey, filename);
      eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
      const modalHandler = this._getModalHandler();
      if (modalHandler) {
        modalHandler.closeModal();
        await modalHandler.showAlert(`File loaded: ${filename}`);
      } else {
        alert(`File loaded: ${filename}`);
      }
      this.refreshFileList();
      if (this.app.syncManager) {
        if (!this.app.syncManager.isConnected) {
          await this.app.syncManager.connect();
        }
        this.app.syncManager.joinFile(filename);
      }
      if (this.app.undoRedoManager) {
        await this.app.undoRedoManager.setCurrentFile(filename);
      }
    } catch (error) {
    }
  }
  async handleLoadBackup(filename) {
    const backupFilename = filename + ".bak";
    let confirmed;
    if (this.app && this.app.modalHandler) {
      confirmed = await this.app.modalHandler.showConfirm(`Load backup file ${backupFilename}? This will replace your current data.`);
    } else {
      confirmed = confirm(`Load backup file ${backupFilename}? This will replace your current data.`);
    }
    if (!confirmed) {
      return;
    }
    try {
      const backupData = await this.loadFile(backupFilename);
      const normalizedBackup = this._normalizeFileData(backupData);
      if (!normalizedBackup.documents || !Array.isArray(normalizedBackup.documents)) {
        if (this.app && this.app.modalHandler) {
          await this.app.modalHandler.showAlert('Invalid file format. Expected a JSON file with a "documents" array.');
        } else {
          alert('Invalid file format. Expected a JSON file with a "documents" array.');
        }
        return;
      }
      let currentData = null;
      let differs = true;
      try {
        currentData = await this.loadFile(filename);
        const backupDocsStr = JSON.stringify(normalizedBackup.documents);
        const currentDocsStr = JSON.stringify(currentData.documents || []);
        differs = backupDocsStr !== currentDocsStr;
      } catch (error) {
        differs = true;
      }
      this.originalFilename = filename;
      this.isBackupLoaded = true;
      this.backupDiffers = differs;
      if (differs) {
        const baseName = filename.replace(".json", "");
        this.tempFilename = `${baseName}-1.json`;
        this.currentFilename = this.tempFilename;
      } else {
        this.tempFilename = null;
        this.currentFilename = filename;
      }
      const appState2 = this._getAppState();
      appState2.documents = normalizedBackup.documents;
      if (normalizedBackup.documents.length > 0 && !normalizedBackup.documents.find((doc) => doc.id === appState2.currentDocumentId)) {
        appState2.currentDocumentId = normalizedBackup.documents[0].id;
      }
      localStorage.setItem(this.lastOpenedFileKey, filename);
      eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
      const modalHandler = this._getModalHandler();
      if (modalHandler) {
        modalHandler.closeModal();
        if (differs) {
          await modalHandler.showAlert(`Backup file loaded: ${backupFilename}

This backup differs from the current file. Saves will go to temporary file: ${this.tempFilename}

When you manually save, you'll be asked to overwrite the original or save as a new file.`);
        } else {
          await modalHandler.showAlert(`Backup file loaded: ${backupFilename}

This backup is identical to the current file.`);
        }
      } else {
        if (differs) {
          alert(`Backup file loaded: ${backupFilename}

This backup differs from the current file. Saves will go to temporary file: ${this.tempFilename}

When you manually save, you'll be asked to overwrite the original or save as a new file.`);
        } else {
          alert(`Backup file loaded: ${backupFilename}

This backup is identical to the current file.`);
        }
      }
      this.refreshFileList();
      if (this.app.syncManager) {
        if (!this.app.syncManager.isConnected) {
          await this.app.syncManager.connect();
        }
        this.app.syncManager.joinFile(filename);
      }
      if (this.app.undoRedoManager) {
        await this.app.undoRedoManager.setCurrentFile(filename);
      }
    } catch (error) {
      if (this.app && this.app.modalHandler) {
        await this.app.modalHandler.showAlert(`Failed to load backup file: ${error.message}`);
      } else {
        alert(`Failed to load backup file: ${error.message}`);
      }
    }
  }
  async handleRename(filename) {
    const defaultName = filename.replace(".json", "");
    let newFilename;
    if (this.app && this.app.modalHandler) {
      newFilename = await this.app.modalHandler.showPrompt("Enter new filename (without .json extension):", defaultName);
    } else {
      newFilename = prompt("Enter new filename (without .json extension):", defaultName);
    }
    if (!newFilename || newFilename === defaultName) return;
    try {
      await this.renameFile(filename, newFilename);
      if (this.app && this.app.modalHandler) {
        await this.app.modalHandler.showAlert(`File renamed to: ${newFilename}.json`);
      } else {
        alert(`File renamed to: ${newFilename}.json`);
      }
      this.refreshFileList();
    } catch (error) {
    }
  }
  async handleDelete(filename) {
    let confirmed;
    if (this.app && this.app.modalHandler) {
      confirmed = await this.app.modalHandler.showConfirm(`Delete ${filename}? This cannot be undone.`);
    } else {
      confirmed = confirm(`Delete ${filename}? This cannot be undone.`);
    }
    if (!confirmed) {
      return;
    }
    try {
      await this.deleteFile(filename);
      if (this.app && this.app.modalHandler) {
        await this.app.modalHandler.showAlert(`File deleted: ${filename}`);
      } else {
        alert(`File deleted: ${filename}`);
      }
      this.refreshFileList();
    } catch (error) {
    }
  }
  async handleNew() {
    let filename;
    if (this.app && this.app.modalHandler) {
      filename = await this.app.modalHandler.showPrompt("Enter filename for new todo file (without .json extension):", "new-todo");
    } else {
      filename = prompt("Enter filename for new todo file (without .json extension):", "new-todo");
    }
    if (!filename) return;
    try {
      const appState2 = this._getAppState();
      if (this.currentFilename && appState2 && appState2.documents) {
        try {
          const currentData = {
            documents: this._getAppState().documents
          };
          await this.saveFile(this.currentFilename, currentData);
        } catch (saveError) {
          console.warn("Failed to auto-save current file:", saveError);
        }
      }
      const newFileData = {
        documents: []
      };
      await this.saveAsFile(filename, newFileData);
      if (!this.currentFilename) {
        console.error("[FileManager] currentFilename not set after saveAsFile!");
        if (this.app && this.app.modalHandler) {
          await this.app.modalHandler.showAlert("Error: File was created but currentFilename was not set. Please reload the page.");
        }
        return;
      }
      console.log("[FileManager] New file created, currentFilename:", this.currentFilename);
      const loadedData = await this.loadFile(this.currentFilename);
      const normalizedLoaded = this._normalizeFileData(loadedData);
      if (!normalizedLoaded.documents || !Array.isArray(normalizedLoaded.documents)) {
        if (this.app && this.app.modalHandler) {
          await this.app.modalHandler.showAlert('Invalid file format. Expected a JSON file with a "documents" array.');
        } else {
          alert('Invalid file format. Expected a JSON file with a "documents" array.');
        }
        return;
      }
      appState2.documents = normalizedLoaded.documents;
      if (normalizedLoaded.documents.length > 0 && !normalizedLoaded.documents.find((doc) => doc.id === appState2.currentDocumentId)) {
        appState2.currentDocumentId = normalizedLoaded.documents[0].id;
      }
      localStorage.setItem(this.lastOpenedFileKey, this.currentFilename);
      eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
      const modalHandler = this._getModalHandler();
      if (modalHandler) {
        modalHandler.closeModal();
      }
      this.refreshFileList();
      if (this.app.syncManager) {
        if (!this.app.syncManager.isConnected) {
          await this.app.syncManager.connect();
        }
        this.app.syncManager.joinFile(this.currentFilename);
      }
      if (this.app.undoRedoManager) {
        await this.app.undoRedoManager.setCurrentFile(this.currentFilename);
        this.app.undoRedoManager.clear();
      }
    } catch (error) {
    }
  }
  /**
   * Diagnose file integrity - checks for structural issues
   */
  async diagnoseFileIntegrity(filename) {
    const issues = [];
    let elementCounts = { documents: 0, groups: 0, items: 0 };
    const structure = { documents: [], groups: [], items: [] };
    try {
      const fileData = await this.loadFile(filename);
      const normalizedFile = this._normalizeFileData(fileData);
      if (!normalizedFile || !normalizedFile.documents) {
        issues.push({
          type: "missing_documents",
          location: "root",
          description: "File does not contain a documents array"
        });
        return {
          isValid: false,
          issues,
          elementCounts,
          structure
        };
      }
      if (!Array.isArray(normalizedFile.documents)) {
        issues.push({
          type: "invalid_documents",
          location: "root",
          description: "Documents is not an array"
        });
        return {
          isValid: false,
          issues,
          elementCounts,
          structure
        };
      }
      elementCounts.documents = normalizedFile.documents.length;
      normalizedFile.documents.forEach((document2, documentIndex) => {
        const documentId = document2.id || `document-${documentIndex}`;
        structure.documents.push({ id: documentId, index: documentIndex });
        if (!document2.groups) {
          issues.push({
            type: "missing_groups",
            location: `documents[${documentIndex}]`,
            description: `Document ${documentId} does not have a groups array`
          });
          return;
        }
        if (!Array.isArray(document2.groups)) {
          issues.push({
            type: "invalid_groups",
            location: `documents[${documentIndex}]`,
            description: `Document ${documentId} groups is not an array`
          });
          return;
        }
        elementCounts.groups += document2.groups.length;
        document2.groups.forEach((group, groupIndex) => {
          const groupId = group.id || `group-${groupIndex}`;
          structure.groups.push({
            documentId,
            groupId,
            documentIndex,
            groupIndex
          });
          if (!group.items) {
            issues.push({
              type: "missing_items",
              location: `documents[${documentIndex}].groups[${groupIndex}]`,
              description: `Group ${groupId} does not have an items array`
            });
            return;
          }
          if (!Array.isArray(group.items)) {
            issues.push({
              type: "invalid_items",
              location: `documents[${documentIndex}].groups[${groupIndex}]`,
              description: `Group ${groupId} items is not an array`
            });
            return;
          }
          elementCounts.items += group.items.length;
          const itemIndexMap = {};
          group.items.forEach((item) => {
            if (item && item.id) {
              itemIndexMap[item.id] = item;
            }
          });
          group.items.forEach((item, itemIndex) => {
            structure.items.push({
              documentId,
              groupId,
              documentIndex,
              groupIndex,
              itemIndex
            });
            if (item === null || item === void 0) {
              issues.push({
                type: "null_item",
                location: `documents[${documentIndex}].groups[${groupIndex}].items[${itemIndex}]`,
                description: `Item at index ${itemIndex} is null or undefined`
              });
              return;
            }
            if (item.type === void 0 || item.type === null) {
              issues.push({
                type: "missing_type",
                location: `documents[${documentIndex}].groups[${groupIndex}].items[${itemIndex}]`,
                description: `Item at index ${itemIndex} is missing type property`
              });
            }
            if (Array.isArray(item.childIds)) {
              item.childIds.forEach((childId, childIndex) => {
                if (!itemIndexMap[childId]) {
                  issues.push({
                    type: "missing_child",
                    location: `documents[${documentIndex}].groups[${groupIndex}].items[${itemIndex}].childIds[${childIndex}]`,
                    description: `Child id ${childId} at index ${childIndex} is missing from items`
                  });
                }
              });
            }
          });
        });
      });
      return {
        isValid: issues.length === 0,
        issues,
        elementCounts,
        structure
      };
    } catch (error) {
      issues.push({
        type: "load_error",
        location: "file",
        description: `Failed to load file: ${error.message}`
      });
      return {
        isValid: false,
        issues,
        elementCounts,
        structure
      };
    }
  }
}
const DataUtils = {
  /**
   * Deep clone an object
   * @param {*} obj - Object to clone
   * @returns {*}
   */
  deepClone(obj) {
    if (obj === null || typeof obj !== "object") {
      return obj;
    }
    if (obj instanceof Date) {
      return new Date(obj.getTime());
    }
    if (obj instanceof Array) {
      return obj.map((item) => this.deepClone(item));
    }
    if (typeof obj === "object") {
      const cloned = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          cloned[key] = this.deepClone(obj[key]);
        }
      }
      return cloned;
    }
    return obj;
  },
  /**
   * Deep merge objects
   * @param {Object} target - Target object
   * @param {...Object} sources - Source objects
   * @returns {Object}
   */
  deepMerge(target, ...sources) {
    if (!sources.length) return target;
    const source = sources.shift();
    if (this.isObject(target) && this.isObject(source)) {
      for (const key in source) {
        if (this.isObject(source[key])) {
          if (!target[key]) Object.assign(target, { [key]: {} });
          this.deepMerge(target[key], source[key]);
        } else {
          Object.assign(target, { [key]: source[key] });
        }
      }
    }
    return this.deepMerge(target, ...sources);
  },
  /**
   * Check if value is a plain object
   * @param {*} value - Value to check
   * @returns {boolean}
   */
  isObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  },
  /**
   * Filter array by predicate
   * @param {Array} array - Array to filter
   * @param {Function|Object|string} predicate - Filter function, object (key-value pairs), or key path
   * @returns {Array}
   */
  filter(array, predicate) {
    if (typeof predicate === "function") {
      return array.filter(predicate);
    }
    if (typeof predicate === "object") {
      return array.filter((item) => {
        return Object.keys(predicate).every((key) => item[key] === predicate[key]);
      });
    }
    if (typeof predicate === "string") {
      return array.filter((item) => {
        const value = this.getNestedValue(item, predicate);
        return value !== void 0 && value !== null && value !== "";
      });
    }
    return array;
  },
  /**
   * Sort array by key or function
   * @param {Array} array - Array to sort
   * @param {string|Function} keyOrFn - Sort key or function
   * @param {boolean} descending - Sort descending
   * @returns {Array}
   */
  sort(array, keyOrFn, descending = false) {
    const sorted = [...array];
    const compareFn = typeof keyOrFn === "function" ? keyOrFn : (a, b) => {
      const aVal = this.getNestedValue(a, keyOrFn);
      const bVal = this.getNestedValue(b, keyOrFn);
      if (aVal < bVal) return descending ? 1 : -1;
      if (aVal > bVal) return descending ? -1 : 1;
      return 0;
    };
    sorted.sort(compareFn);
    return sorted;
  },
  /**
   * Get nested value from object by path
   * @param {Object} obj - Object
   * @param {string} path - Dot-separated path (e.g., 'user.profile.name')
   * @returns {*}
   */
  getNestedValue(obj, path) {
    return path.split(".").reduce((current, key) => current?.[key], obj);
  },
  /**
   * Set nested value in object by path
   * @param {Object} obj - Object
   * @param {string} path - Dot-separated path
   * @param {*} value - Value to set
   */
  setNestedValue(obj, path, value) {
    const keys = path.split(".");
    const lastKey = keys.pop();
    const target = keys.reduce((current, key) => {
      if (!current[key] || !this.isObject(current[key])) {
        current[key] = {};
      }
      return current[key];
    }, obj);
    target[lastKey] = value;
  },
  /**
   * Group array by key
   * @param {Array} array - Array to group
   * @param {string|Function} keyOrFn - Group key or function
   * @returns {Object}
   */
  groupBy(array, keyOrFn) {
    return array.reduce((groups, item) => {
      const key = typeof keyOrFn === "function" ? keyOrFn(item) : this.getNestedValue(item, keyOrFn);
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(item);
      return groups;
    }, {});
  },
  /**
   * Remove duplicates from array
   * @param {Array} array - Array to deduplicate
   * @param {string|Function} keyOrFn - Key or function to compare
   * @returns {Array}
   */
  unique(array, keyOrFn) {
    if (!keyOrFn) {
      return [...new Set(array)];
    }
    const seen2 = /* @__PURE__ */ new Set();
    return array.filter((item) => {
      const key = typeof keyOrFn === "function" ? keyOrFn(item) : this.getNestedValue(item, keyOrFn);
      if (seen2.has(key)) {
        return false;
      }
      seen2.add(key);
      return true;
    });
  },
  /**
   * Flatten nested array
   * @param {Array} array - Array to flatten
   * @param {number} depth - Flatten depth
   * @returns {Array}
   */
  flatten(array, depth = Infinity) {
    return array.flat(depth);
  },
  /**
   * Pick properties from object
   * @param {Object} obj - Source object
   * @param {Array<string>} keys - Keys to pick
   * @returns {Object}
   */
  pick(obj, keys) {
    return keys.reduce((result, key) => {
      if (key in obj) {
        result[key] = obj[key];
      }
      return result;
    }, {});
  },
  /**
   * Omit properties from object
   * @param {Object} obj - Source object
   * @param {Array<string>} keys - Keys to omit
   * @returns {Object}
   */
  omit(obj, keys) {
    const result = { ...obj };
    keys.forEach((key) => delete result[key]);
    return result;
  }
};
class PluginManager {
  constructor() {
    this.plugins = /* @__PURE__ */ new Map();
    this.pluginsByType = /* @__PURE__ */ new Map();
    this.dependencies = /* @__PURE__ */ new Map();
    this.initialized = /* @__PURE__ */ new Set();
    this.enabled = /* @__PURE__ */ new Set();
  }
  /**
   * Register a plugin
   * @param {Object} plugin - Plugin instance
   * @param {string} plugin.id - Plugin ID
   * @param {string} plugin.type - Plugin type (page, bin, element, format)
   * @param {Array<string>} plugin.dependencies - Plugin dependencies
   * @returns {boolean} - Success status
   */
  register(plugin) {
    if (!plugin || !plugin.id || !plugin.type) {
      console.error("Plugin must have id and type");
      return false;
    }
    if (this.plugins.has(plugin.id)) {
      console.warn(`Plugin "${plugin.id}" is already registered`);
      return false;
    }
    this.plugins.set(plugin.id, plugin);
    if (!this.pluginsByType.has(plugin.type)) {
      this.pluginsByType.set(plugin.type, /* @__PURE__ */ new Set());
    }
    this.pluginsByType.get(plugin.type).add(plugin.id);
    if (plugin.dependencies && Array.isArray(plugin.dependencies)) {
      this.dependencies.set(plugin.id, new Set(plugin.dependencies));
    } else {
      this.dependencies.set(plugin.id, /* @__PURE__ */ new Set());
    }
    return true;
  }
  /**
   * Unregister a plugin
   * @param {string} pluginId - Plugin ID
   * @returns {boolean} - Success status
   */
  unregister(pluginId) {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return false;
    if (this.enabled.has(pluginId)) {
      this.disable(pluginId);
    }
    const typeSet = this.pluginsByType.get(plugin.type);
    if (typeSet) {
      typeSet.delete(pluginId);
    }
    this.plugins.delete(pluginId);
    this.dependencies.delete(pluginId);
    this.initialized.delete(pluginId);
    this.enabled.delete(pluginId);
    return true;
  }
  /**
   * Get plugin by ID
   * @param {string} pluginId - Plugin ID
   * @returns {Object|null} - Plugin instance
   */
  get(pluginId) {
    return this.plugins.get(pluginId) || null;
  }
  /**
   * Get all plugins of a type
   * @param {string} type - Plugin type
   * @returns {Array<Object>} - Array of plugin instances
   */
  getByType(type) {
    const pluginIds = this.pluginsByType.get(type) || /* @__PURE__ */ new Set();
    return Array.from(pluginIds).map((id) => this.plugins.get(id)).filter((plugin) => plugin !== void 0);
  }
  /**
   * Get all registered plugins
   * @returns {Array<Object>} - Array of plugin instances
   */
  getAll() {
    return Array.from(this.plugins.values());
  }
  /**
   * Check if plugin is registered
   * @param {string} pluginId - Plugin ID
   * @returns {boolean}
   */
  has(pluginId) {
    return this.plugins.has(pluginId);
  }
  /**
   * Initialize a plugin
   * @param {string} pluginId - Plugin ID
   * @param {Object} context - App context
   * @returns {Promise<boolean>} - Success status
   */
  async initialize(pluginId, context) {
    if (this.initialized.has(pluginId)) {
      return true;
    }
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      console.error(`Plugin "${pluginId}" not found`);
      return false;
    }
    const deps = this.dependencies.get(pluginId) || /* @__PURE__ */ new Set();
    for (const depId of deps) {
      if (!this.initialized.has(depId)) {
        const depSuccess = await this.initialize(depId, context);
        if (!depSuccess) {
          console.error(`Failed to initialize dependency "${depId}" for plugin "${pluginId}"`);
          return false;
        }
      }
    }
    try {
      if (plugin.init && typeof plugin.init === "function") {
        await plugin.init(context);
      }
      this.initialized.add(pluginId);
      return true;
    } catch (error) {
      console.error(`Error initializing plugin "${pluginId}":`, error);
      return false;
    }
  }
  /**
   * Enable a plugin
   * @param {string} pluginId - Plugin ID
   * @returns {Promise<boolean>} - Success status
   */
  async enable(pluginId) {
    if (this.enabled.has(pluginId)) {
      return true;
    }
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      console.error(`Plugin "${pluginId}" not found`);
      return false;
    }
    if (!this.initialized.has(pluginId)) {
      const initSuccess = await this.initialize(pluginId, {});
      if (!initSuccess) {
        return false;
      }
    }
    try {
      if (plugin.enable && typeof plugin.enable === "function") {
        await plugin.enable();
      }
      this.enabled.add(pluginId);
      return true;
    } catch (error) {
      console.error(`Error enabling plugin "${pluginId}":`, error);
      return false;
    }
  }
  /**
   * Disable a plugin
   * @param {string} pluginId - Plugin ID
   * @returns {Promise<boolean>} - Success status
   */
  async disable(pluginId) {
    if (!this.enabled.has(pluginId)) {
      return true;
    }
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      return false;
    }
    try {
      if (plugin.disable && typeof plugin.disable === "function") {
        await plugin.disable();
      }
      this.enabled.delete(pluginId);
      return true;
    } catch (error) {
      console.error(`Error disabling plugin "${pluginId}":`, error);
      return false;
    }
  }
  /**
   * Check if plugin is enabled
   * @param {string} pluginId - Plugin ID
   * @returns {boolean}
   */
  isEnabled(pluginId) {
    return this.enabled.has(pluginId);
  }
  /**
   * Check if plugin is initialized
   * @param {string} pluginId - Plugin ID
   * @returns {boolean}
   */
  isInitialized(pluginId) {
    return this.initialized.has(pluginId);
  }
  /**
   * Get plugin dependencies
   * @param {string} pluginId - Plugin ID
   * @returns {Set<string>} - Set of dependency plugin IDs
   */
  getDependencies(pluginId) {
    return this.dependencies.get(pluginId) || /* @__PURE__ */ new Set();
  }
  /**
   * Get initialization order for all plugins
   * @returns {Array<string>} - Array of plugin IDs in initialization order
   */
  getInitializationOrder() {
    const ordered = [];
    const visited = /* @__PURE__ */ new Set();
    const visiting = /* @__PURE__ */ new Set();
    const visit = (pluginId) => {
      if (visiting.has(pluginId)) {
        console.warn(`Circular dependency detected involving plugin "${pluginId}"`);
        return;
      }
      if (visited.has(pluginId)) {
        return;
      }
      visiting.add(pluginId);
      const deps = this.dependencies.get(pluginId) || /* @__PURE__ */ new Set();
      deps.forEach((depId) => {
        if (this.plugins.has(depId)) {
          visit(depId);
        }
      });
      visiting.delete(pluginId);
      visited.add(pluginId);
      ordered.push(pluginId);
    };
    this.plugins.forEach((plugin, pluginId) => {
      if (!visited.has(pluginId)) {
        visit(pluginId);
      }
    });
    return ordered;
  }
  /**
   * Clear all plugins
   */
  clear() {
    this.enabled.forEach((pluginId) => {
      this.disable(pluginId);
    });
    this.plugins.clear();
    this.pluginsByType.clear();
    this.dependencies.clear();
    this.initialized.clear();
    this.enabled.clear();
  }
}
const pluginRegistry = new PluginManager();
class PagePluginManager {
  constructor() {
    this.pagePlugins = /* @__PURE__ */ new Map();
    this.setupEventListeners();
  }
  /**
   * Get AppState service
   */
  _getAppState() {
    return getService(SERVICES.APP_STATE);
  }
  /**
   * Setup event listeners
   */
  setupEventListeners() {
    eventBus.on("page:created", (data) => {
      this.initializePagePlugins(data.pageId);
    });
    eventBus.on("page:deleted", (data) => {
      this.cleanupPagePlugins(data.pageId);
    });
  }
  /**
   * Initialize plugins for a page
   * @param {string} pageId - Page ID
   */
  async initializePagePlugins(pageId) {
    const appState2 = this._getAppState();
    const page = appState2.documents.find((p) => p.id === pageId);
    if (!page) return;
    const enabledPlugins = page.plugins || [];
    const pluginSet = /* @__PURE__ */ new Set();
    for (const pluginId of enabledPlugins) {
      const plugin = pluginRegistry.get(pluginId);
      if (plugin && plugin.type === "page") {
        await pluginRegistry.enable(pluginId);
        pluginSet.add(pluginId);
      }
    }
    this.pagePlugins.set(pageId, pluginSet);
  }
  /**
   * Cleanup plugins for a page
   * @param {string} pageId - Page ID
   */
  async cleanupPagePlugins(pageId) {
    const pluginSet = this.pagePlugins.get(pageId);
    if (pluginSet) {
      for (const pluginId of pluginSet) {
        await pluginRegistry.disable(pluginId);
      }
      this.pagePlugins.delete(pageId);
    }
  }
  /**
   * Enable plugin for a page
   * @param {string} pageId - Page ID
   * @param {string} pluginId - Plugin ID
   * @returns {Promise<boolean>} - Success status
   */
  async enablePlugin(pageId, pluginId) {
    const appState2 = this._getAppState();
    const page = appState2.documents.find((p) => p.id === pageId);
    if (!page) return false;
    const plugin = pluginRegistry.get(pluginId);
    if (!plugin || plugin.type !== "page") {
      console.error(`Plugin "${pluginId}" not found or not a page plugin`);
      return false;
    }
    if (!pluginRegistry.isInitialized(pluginId)) {
      await pluginRegistry.initialize(pluginId, null);
    }
    const success = await pluginRegistry.enable(pluginId);
    if (success) {
      if (!page.plugins) {
        page.plugins = [];
      }
      if (!page.plugins.includes(pluginId)) {
        page.plugins.push(pluginId);
      }
      let pluginSet = this.pagePlugins.get(pageId);
      if (!pluginSet) {
        pluginSet = /* @__PURE__ */ new Set();
        this.pagePlugins.set(pageId, pluginSet);
      }
      pluginSet.add(pluginId);
      const dataManager = this._getDataManager();
      if (dataManager) {
        dataManager.saveData();
      }
      eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
      eventBus.emit("page:plugin:enabled", { pageId, pluginId });
    }
    return success;
  }
  /**
   * Disable plugin for a page
   * @param {string} pageId - Page ID
   * @param {string} pluginId - Plugin ID
   * @returns {Promise<boolean>} - Success status
   */
  async disablePlugin(pageId, pluginId) {
    const appState2 = this._getAppState();
    const page = appState2.documents.find((p) => p.id === pageId);
    if (!page) return false;
    const success = await pluginRegistry.disable(pluginId);
    if (success) {
      if (page.plugins) {
        page.plugins = page.plugins.filter((id) => id !== pluginId);
      }
      const pluginSet = this.pagePlugins.get(pageId);
      if (pluginSet) {
        pluginSet.delete(pluginId);
      }
      const dataManager = this._getDataManager();
      if (dataManager) {
        dataManager.saveData();
      }
      eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
      eventBus.emit("page:plugin:disabled", { pageId, pluginId });
    }
    return success;
  }
  /**
   * Get enabled plugins for a page
   * @param {string} pageId - Page ID
   * @returns {Array<Object>} - Array of plugin instances
   */
  getPagePlugins(pageId) {
    const pluginSet = this.pagePlugins.get(pageId) || /* @__PURE__ */ new Set();
    return Array.from(pluginSet).map((id) => pluginRegistry.get(id)).filter((plugin) => plugin !== null);
  }
  /**
   * Get all available page plugins
   * @returns {Array<Object>} - Array of plugin instances
   */
  getAvailablePlugins() {
    return pluginRegistry.getByType("page");
  }
  /**
   * Render plugin UI sections for page edit modal
   * @param {HTMLElement} container - Container element
   * @param {string} pageId - Page ID
   */
  renderPluginUI(container, pageId) {
    const appState2 = this._getAppState();
    const page = appState2.documents.find((p) => p.id === pageId);
    if (!page) return;
    const availablePlugins = this.getAvailablePlugins();
    if (availablePlugins.length === 0) {
      const noPlugins = DOMUtils.createElement("div", {
        class: "plugin-section"
      }, "No page plugins available");
      container.appendChild(noPlugins);
      return;
    }
    const section = DOMUtils.createElement("div", {
      class: "plugin-section"
    });
    const title = DOMUtils.createElement("h4", {}, "Page Plugins");
    section.appendChild(title);
    availablePlugins.forEach((plugin) => {
      const enabled = page.plugins && page.plugins.includes(plugin.id);
      const pluginItem = DOMUtils.createElement("div", {
        class: "plugin-item"
      });
      const checkbox = DOMUtils.createElement("input", {
        type: "checkbox",
        id: `plugin-${plugin.id}`,
        checked: enabled
      });
      checkbox.addEventListener("change", async (e) => {
        if (e.target.checked) {
          await this.enablePlugin(pageId, plugin.id);
        } else {
          await this.disablePlugin(pageId, plugin.id);
        }
      });
      const label = DOMUtils.createElement("label", {
        for: `plugin-${plugin.id}`
      }, plugin.name || plugin.id);
      if (plugin.description) {
        const desc = DOMUtils.createElement("div", {
          class: "plugin-description"
        }, plugin.description);
        label.appendChild(desc);
      }
      pluginItem.appendChild(checkbox);
      pluginItem.appendChild(label);
      section.appendChild(pluginItem);
    });
    container.appendChild(section);
  }
  /**
   * Render plugin content for a page
   * @param {HTMLElement} container - Container element
   * @param {string} pageId - Page ID
   */
  renderPluginContent(container, pageId) {
    const plugins = this.getPagePlugins(pageId);
    plugins.forEach((plugin) => {
      if (plugin.render && typeof plugin.render === "function") {
        const pluginContainer = DOMUtils.createElement("div", {
          class: `plugin-content plugin-${plugin.id}`
        });
        const appState2 = this._getAppState();
        const page = appState2.documents.find((p) => p.id === pageId);
        plugin.render(pluginContainer, page);
        container.appendChild(pluginContainer);
      }
    });
  }
}
class BinPluginManager {
  constructor() {
    this.binPlugins = /* @__PURE__ */ new Map();
    this.setupEventListeners();
  }
  /**
   * Get AppState service
   */
  _getAppState() {
    return getService(SERVICES.APP_STATE);
  }
  /**
   * Setup event listeners
   */
  setupEventListeners() {
    eventBus.on("bin:created", (data) => {
      this.initializeBinPlugins(data.pageId, data.binId);
    });
    eventBus.on("bin:deleted", (data) => {
      this.cleanupBinPlugins(data.pageId, data.binId);
    });
  }
  /**
   * Initialize plugins for a bin
   * @param {string} pageId - Page ID
   * @param {string} binId - Bin ID
   */
  async initializeBinPlugins(pageId, binId) {
    const appState2 = this._getAppState();
    const page = appState2.documents.find((p) => p.id === pageId);
    if (!page) return;
    const bin = page.groups?.find((b) => b.id === binId);
    if (!bin) return;
    const enabledPlugins = bin.plugins || [];
    const pluginSet = /* @__PURE__ */ new Set();
    for (const pluginId of enabledPlugins) {
      const plugin = pluginRegistry.get(pluginId);
      if (plugin && plugin.type === "bin") {
        await pluginRegistry.enable(pluginId);
        pluginSet.add(pluginId);
      }
    }
    const key = `${pageId}:${binId}`;
    this.binPlugins.set(key, pluginSet);
  }
  /**
   * Cleanup plugins for a bin
   * @param {string} pageId - Page ID
   * @param {string} binId - Bin ID
   */
  async cleanupBinPlugins(pageId, binId) {
    const key = `${pageId}:${binId}`;
    const pluginSet = this.binPlugins.get(key);
    if (pluginSet) {
      for (const pluginId of pluginSet) {
        await pluginRegistry.disable(pluginId);
      }
      this.binPlugins.delete(key);
    }
  }
  /**
   * Enable plugin for a bin
   * @param {string} pageId - Page ID
   * @param {string} binId - Bin ID
   * @param {string} pluginId - Plugin ID
   * @returns {Promise<boolean>} - Success status
   */
  async enablePlugin(pageId, binId, pluginId) {
    const appState2 = this._getAppState();
    const page = appState2.documents.find((p) => p.id === pageId);
    if (!page) return false;
    const bin = page.groups?.find((b) => b.id === binId);
    if (!bin) return false;
    const plugin = pluginRegistry.get(pluginId);
    if (!plugin || plugin.type !== "bin") {
      console.error(`Plugin "${pluginId}" not found or not a bin plugin`);
      return false;
    }
    if (!pluginRegistry.isInitialized(pluginId)) {
      await pluginRegistry.initialize(pluginId, null);
    }
    const success = await pluginRegistry.enable(pluginId);
    if (success) {
      if (!bin.plugins) {
        bin.plugins = [];
      }
      if (!bin.plugins.includes(pluginId)) {
        bin.plugins.push(pluginId);
      }
      const key = `${pageId}:${binId}`;
      let pluginSet = this.binPlugins.get(key);
      if (!pluginSet) {
        pluginSet = /* @__PURE__ */ new Set();
        this.binPlugins.set(key, pluginSet);
      }
      pluginSet.add(pluginId);
      const dataManager = this._getDataManager();
      if (dataManager) {
        dataManager.saveData();
      }
      eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
      eventBus.emit("bin:plugin:enabled", { pageId, binId, pluginId });
    }
    return success;
  }
  /**
   * Disable plugin for a bin
   * @param {string} pageId - Page ID
   * @param {string} binId - Bin ID
   * @param {string} pluginId - Plugin ID
   * @returns {Promise<boolean>} - Success status
   */
  async disablePlugin(pageId, binId, pluginId) {
    const appState2 = this._getAppState();
    const page = appState2.documents.find((p) => p.id === pageId);
    if (!page) return false;
    const bin = page.groups?.find((b) => b.id === binId);
    if (!bin) return false;
    const success = await pluginRegistry.disable(pluginId);
    if (success) {
      if (bin.plugins) {
        bin.plugins = bin.plugins.filter((id) => id !== pluginId);
      }
      const key = `${pageId}:${binId}`;
      const pluginSet = this.binPlugins.get(key);
      if (pluginSet) {
        pluginSet.delete(pluginId);
      }
      const dataManager = this._getDataManager();
      if (dataManager) {
        dataManager.saveData();
      }
      eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
      eventBus.emit("bin:plugin:disabled", { pageId, binId, pluginId });
    }
    return success;
  }
  /**
   * Get enabled plugins for a bin
   * @param {string} pageId - Page ID
   * @param {string} binId - Bin ID
   * @returns {Array<Object>} - Array of plugin instances
   */
  getBinPlugins(pageId, binId) {
    const key = `${pageId}:${binId}`;
    const pluginSet = this.binPlugins.get(key) || /* @__PURE__ */ new Set();
    return Array.from(pluginSet).map((id) => pluginRegistry.get(id)).filter((plugin) => plugin !== null);
  }
  /**
   * Get all available bin plugins
   * @returns {Array<Object>} - Array of plugin instances
   */
  getAvailablePlugins() {
    return pluginRegistry.getByType("bin");
  }
  /**
   * Render plugin UI sections for bin edit modal
   * @param {HTMLElement} container - Container element
   * @param {string} pageId - Page ID
   * @param {string} binId - Bin ID
   */
  renderPluginUI(container, pageId, binId) {
    const appState2 = this._getAppState();
    const page = appState2.documents.find((p) => p.id === pageId);
    if (!page) return;
    const bin = page.groups?.find((b) => b.id === binId);
    if (!bin) return;
    const availablePlugins = this.getAvailablePlugins();
    if (availablePlugins.length === 0) {
      const noPlugins = DOMUtils.createElement("div", {
        class: "plugin-section"
      }, "No bin plugins available");
      container.appendChild(noPlugins);
      return;
    }
    const section = DOMUtils.createElement("div", {
      class: "plugin-section"
    });
    const title = DOMUtils.createElement("h4", {}, "Bin Plugins");
    section.appendChild(title);
    availablePlugins.forEach((plugin) => {
      const enabled = bin.plugins && bin.plugins.includes(plugin.id);
      const pluginItem = DOMUtils.createElement("div", {
        class: "plugin-item"
      });
      const checkbox = DOMUtils.createElement("input", {
        type: "checkbox",
        id: `bin-plugin-${plugin.id}`,
        checked: enabled
      });
      checkbox.addEventListener("change", async (e) => {
        if (e.target.checked) {
          await this.enablePlugin(pageId, binId, plugin.id);
        } else {
          await this.disablePlugin(pageId, binId, plugin.id);
        }
      });
      const label = DOMUtils.createElement("label", {
        for: `bin-plugin-${plugin.id}`
      }, plugin.name || plugin.id);
      if (plugin.description) {
        const desc = DOMUtils.createElement("div", {
          class: "plugin-description"
        }, plugin.description);
        label.appendChild(desc);
      }
      pluginItem.appendChild(checkbox);
      pluginItem.appendChild(label);
      section.appendChild(pluginItem);
    });
    container.appendChild(section);
  }
  /**
   * Render plugin content for a bin
   * @param {HTMLElement} container - Container element
   * @param {string} pageId - Page ID
   * @param {string} binId - Bin ID
   */
  renderPluginContent(container, pageId, binId) {
    const plugins = this.getBinPlugins(pageId, binId);
    plugins.forEach((plugin) => {
      if (plugin.render && typeof plugin.render === "function") {
        const pluginContainer = DOMUtils.createElement("div", {
          class: `plugin-content plugin-${plugin.id}`
        });
        const appState2 = this._getAppState();
        const page = appState2.documents.find((p) => p.id === pageId);
        const bin = page.groups?.find((b) => b.id === binId);
        plugin.render(pluginContainer, bin, { page });
        container.appendChild(pluginContainer);
      }
    });
  }
}
class ElementTypeManager {
  constructor() {
    this.elementTypes = /* @__PURE__ */ new Map();
    this.setupEventListeners();
  }
  /**
   * Setup event listeners
   */
  setupEventListeners() {
    eventBus.on("element:type:registered", (data) => {
      this.registerElementType(data.pluginId);
    });
  }
  /**
   * Register an element type plugin
   * @param {string} pluginId - Plugin ID
   */
  registerElementType(pluginId) {
    const plugin = pluginRegistry.get(pluginId);
    if (plugin && plugin.type === "element") {
      this.elementTypes.set(plugin.elementType, plugin);
    }
  }
  /**
   * Get element type plugin
   * @param {string} elementType - Element type
   * @returns {Object|null} - Plugin instance
   */
  getElementType(elementType) {
    return this.elementTypes.get(elementType) || null;
  }
  /**
   * Get all registered element types
   * @returns {Array<Object>} - Array of plugin instances
   */
  getAllElementTypes() {
    return Array.from(this.elementTypes.values());
  }
  /**
   * Create element template
   * @param {string} elementType - Element type
   * @returns {Object|null} - Element template
   */
  createTemplate(elementType) {
    const plugin = this.getElementType(elementType);
    if (plugin && plugin.createTemplate) {
      return plugin.createTemplate();
    }
    return null;
  }
  /**
   * Render element
   * @param {HTMLElement} container - Container element
   * @param {Object} element - Element data
   * @param {Object} context - Context (pageId, binId, elementIndex)
   * @returns {HTMLElement}
   */
  render(container, element, context) {
    const plugin = this.getElementType(element.type);
    if (plugin && plugin.render) {
      return plugin.render(container, element, context);
    }
    return this.renderDefault(container, element, context);
  }
  /**
   * Default element rendering
   * @param {HTMLElement} container - Container element
   * @param {Object} element - Element data
   * @param {Object} context - Context
   * @returns {HTMLElement}
   */
  renderDefault(container, element, context) {
    const div = DOMUtils.createElement("div", {
      class: "element"
    }, element.text || "");
    container.appendChild(div);
    return div;
  }
  /**
   * Render element edit UI
   * @param {HTMLElement} container - Container element
   * @param {Object} element - Element data
   * @param {Object} context - Context
   * @returns {HTMLElement}
   */
  renderEditUI(container, element, context) {
    const plugin = this.getElementType(element.type);
    if (plugin && plugin.renderEditUI) {
      return plugin.renderEditUI(container, element, context);
    }
    return this.renderDefaultEditUI(container, element, context);
  }
  /**
   * Default element edit UI
   * @param {HTMLElement} container - Container element
   * @param {Object} element - Element data
   * @param {Object} context - Context
   * @returns {HTMLElement}
   */
  renderDefaultEditUI(container, element, context) {
    const input = DOMUtils.createElement("input", {
      type: "text",
      value: element.text || "",
      placeholder: "Element text"
    });
    container.appendChild(input);
    return input;
  }
  /**
   * Validate element
   * @param {Object} element - Element data
   * @returns {Object} - { valid: boolean, errors: Array<string> }
   */
  validate(element) {
    const plugin = this.getElementType(element.type);
    if (plugin && plugin.validate) {
      return plugin.validate(element);
    }
    return {
      valid: true,
      errors: []
    };
  }
  /**
   * Handle element update
   * @param {Object} element - Element data
   * @param {Object} updates - Updates to apply
   * @returns {Object} - Updated element
   */
  update(element, updates) {
    const plugin = this.getElementType(element.type);
    if (plugin && plugin.update) {
      return plugin.update(element, updates);
    }
    return { ...element, ...updates };
  }
  /**
   * Handle element deletion
   * @param {Object} element - Element data
   * @param {Object} context - Context
   * @returns {Promise<boolean>} - Allow deletion
   */
  async onDelete(element, context) {
    const plugin = this.getElementType(element.type);
    if (plugin && plugin.onDelete) {
      return await plugin.onDelete(element, context);
    }
    return true;
  }
  /**
   * Handle element completion toggle
   * @param {Object} element - Element data
   * @param {boolean} completed - New completion state
   * @returns {Object} - Updated element
   */
  onToggleComplete(element, completed) {
    const plugin = this.getElementType(element.type);
    if (plugin && plugin.onToggleComplete) {
      return plugin.onToggleComplete(element, completed);
    }
    return { ...element, completed };
  }
  /**
   * Get element type metadata
   * @param {string} elementType - Element type
   * @returns {Object|null}
   */
  getElementTypeMetadata(elementType) {
    const plugin = this.getElementType(elementType);
    if (plugin && plugin.getMetadata) {
      return plugin.getMetadata();
    }
    return null;
  }
  /**
   * Get all element types for add modal
   * @returns {Array<Object>} - Array of { type, name, shortcut, icon }
   */
  getElementTypesForModal() {
    return this.getAllElementTypes().map((plugin) => ({
      type: plugin.elementType,
      name: plugin.name || plugin.elementType,
      shortcut: plugin.keyboardShortcut,
      icon: plugin.icon
    }));
  }
}
class FormatRendererManager {
  constructor() {
    this.formatRenderers = /* @__PURE__ */ new Map();
    this.activeFormats = /* @__PURE__ */ new Map();
    this.setupEventListeners();
    this.scanForFormats();
    this.initializeFromSavedData();
  }
  /**
   * Get services
   */
  _getAppState() {
    return getService(SERVICES.APP_STATE);
  }
  /**
   * Initialize activeFormats from saved page data
   */
  initializeFromSavedData() {
    const appState2 = this._getAppState();
    if (appState2 && appState2.documents) {
      appState2.documents.forEach((page) => {
        if (page.format) {
          this.activeFormats.set(page.id, page.format);
        }
      });
    }
  }
  /**
   * Setup event listeners
   */
  setupEventListeners() {
    eventBus.on("format:registered", (data) => {
      this.registerFormat(data.pluginId);
    });
    eventBus.on("plugin:loaded", (data) => {
      const plugin = pluginRegistry.get(data.pluginId);
      if (plugin && plugin.type === "format") {
        this.registerFormat(data.pluginId);
      }
    });
  }
  /**
   * Scan plugin registry for format plugins and register them
   */
  scanForFormats() {
    const formatPlugins = pluginRegistry.getByType("format");
    formatPlugins.forEach((plugin) => {
      const formatName = plugin.formatName || plugin.id;
      if (formatName && !this.formatRenderers.has(formatName)) {
        this.formatRenderers.set(formatName, plugin);
      }
    });
  }
  /**
   * Register a format renderer plugin
   * @param {string} pluginId - Plugin ID
   */
  registerFormat(pluginId) {
    const plugin = pluginRegistry.get(pluginId);
    if (plugin && plugin.type === "format") {
      const formatName = plugin.formatName || plugin.id;
      this.formatRenderers.set(formatName, plugin);
    }
  }
  /**
   * Get format renderer
   * @param {string} formatName - Format name
   * @returns {Object|null} - Plugin instance
   */
  getFormat(formatName) {
    return this.formatRenderers.get(formatName) || null;
  }
  /**
   * Get all registered formats
   * @returns {Array<Object>} - Array of plugin instances
   */
  getAllFormats() {
    this.scanForFormats();
    const formats = Array.from(this.formatRenderers.values());
    return formats;
  }
  /**
   * Set active format for a page
   * @param {string} pageId - Page ID
   * @param {string} formatName - Format name
   * @returns {Promise<boolean>} - Success status
   */
  async setPageFormat(pageId, formatName) {
    const format = this.getFormat(formatName);
    if (!format || !format.supportsPages) {
      console.error(`Format "${formatName}" not found or doesn't support pages`);
      return false;
    }
    const appState2 = this._getAppState();
    const page = appState2.documents.find((p) => p.id === pageId);
    if (!page) return false;
    if (!pluginRegistry.isInitialized(format.id)) {
      await pluginRegistry.initialize(format.id, null);
    }
    await pluginRegistry.enable(format.id);
    page.format = formatName;
    this.activeFormats.set(pageId, formatName);
    eventBus.emit(EVENTS.DATA.SAVE_REQUESTED);
    eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
    eventBus.emit("format:changed", { pageId, formatName, type: "page" });
    return true;
  }
  /**
   * Clear active format for a page (return to default)
   * @param {string} pageId - Page ID
   * @returns {boolean} - Success status
   */
  clearPageFormat(pageId) {
    const appState2 = this._getAppState();
    const page = appState2.documents.find((p) => p.id === pageId);
    if (!page) return false;
    this.activeFormats.delete(pageId);
    delete page.format;
    eventBus.emit(EVENTS.DATA.SAVE_REQUESTED);
    eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
    eventBus.emit("format:changed", { pageId, formatName: null, type: "page" });
    return true;
  }
  /**
   * Set active format for a bin
   * @param {string} pageId - Page ID
   * @param {string} binId - Bin ID
   * @param {string} formatName - Format name
   * @returns {Promise<boolean>} - Success status
   */
  async setBinFormat(pageId, binId, formatName) {
    const format = this.getFormat(formatName);
    if (!format || !format.supportsBins) {
      console.error(`Format "${formatName}" not found or doesn't support bins`);
      return false;
    }
    const appState2 = this._getAppState();
    const page = appState2.documents.find((p) => p.id === pageId);
    if (!page) return false;
    const bin = page.groups?.find((b) => b.id === binId);
    if (!bin) return false;
    if (!pluginRegistry.isInitialized(format.id)) {
      await pluginRegistry.initialize(format.id, null);
    }
    await pluginRegistry.enable(format.id);
    bin.format = formatName;
    const key = `${pageId}:${binId}`;
    this.activeFormats.set(key, formatName);
    eventBus.emit(EVENTS.DATA.SAVE_REQUESTED);
    eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
    eventBus.emit("format:changed", { pageId, binId, formatName, type: "bin" });
    return true;
  }
  /**
   * Get active format for a page
   * @param {string} pageId - Page ID
   * @returns {string|null} - Format name
   */
  getPageFormat(pageId) {
    if (this.activeFormats.has(pageId)) {
      return this.activeFormats.get(pageId);
    }
    const appState2 = this._getAppState();
    if (appState2 && appState2.documents) {
      const page = appState2.documents.find((p) => p.id === pageId);
      if (page && page.format) {
        this.activeFormats.set(pageId, page.format);
        return page.format;
      }
    }
    return null;
  }
  /**
   * Get active format for a bin
   * @param {string} pageId - Page ID
   * @param {string} binId - Bin ID
   * @returns {string|null} - Format name
   */
  getBinFormat(pageId, binId) {
    const key = `${pageId}:${binId}`;
    return this.activeFormats.get(key) || null;
  }
  /**
   * Render page in format
   * @param {HTMLElement} container - Container element
   * @param {string} pageId - Page ID
   */
  renderPage(container, pageId) {
    const formatName = this.getPageFormat(pageId);
    if (!formatName) {
      return;
    }
    const format = this.getFormat(formatName);
    if (format && format.renderPage) {
      const appState2 = this._getAppState();
      const page = appState2.documents.find((p) => p.id === pageId);
      format.renderPage(container, page, {});
    }
  }
  /**
   * Render bin in format
   * @param {HTMLElement} container - Container element
   * @param {string} pageId - Page ID
   * @param {string} binId - Bin ID
   */
  renderBin(container, pageId, binId) {
    const formatName = this.getBinFormat(pageId, binId);
    if (!formatName) {
      return;
    }
    const format = this.getFormat(formatName);
    if (format && format.renderBin) {
      const appState2 = this._getAppState();
      const page = appState2.documents.find((p) => p.id === pageId);
      const bin = page.groups?.find((b) => b.id === binId);
      format.renderBin(container, bin, { page });
    }
  }
  /**
   * Render format settings UI
   * @param {HTMLElement} container - Container element
   * @param {string} formatName - Format name
   * @param {Object} currentSettings - Current settings
   */
  renderSettingsUI(container, formatName, currentSettings) {
    const format = this.getFormat(formatName);
    if (format && format.renderSettingsUI) {
      format.renderSettingsUI(container, currentSettings);
    }
  }
  /**
   * Export data in format
   * @param {Object} data - Data to export
   * @param {string} formatName - Format name
   * @returns {string|Blob} - Exported data
   */
  export(data, formatName) {
    const format = this.getFormat(formatName);
    if (format && format.export) {
      return format.export(data);
    }
    return JSON.stringify(data, null, 2);
  }
  /**
   * Import data from format
   * @param {string|Blob} importData - Data to import
   * @param {string} formatName - Format name
   * @returns {Object} - Parsed data
   */
  import(importData, formatName) {
    const format = this.getFormat(formatName);
    if (format && format.import) {
      return format.import(importData);
    }
    if (typeof importData === "string") {
      try {
        return JSON.parse(importData);
      } catch (error) {
        throw new Error("Invalid data format");
      }
    }
    throw new Error("Unsupported data type");
  }
}
const pluginLoader = new PluginLoaderService();
class RelationshipManager {
  constructor() {
    this.relationships = /* @__PURE__ */ new Map();
  }
  /**
   * Get AppState service
   */
  _getAppState() {
    return getService(SERVICES.APP_STATE);
  }
  /**
   * Get DataManager service
   */
  _getDataManager() {
    return getService(SERVICES.DATA_MANAGER);
  }
  /**
   * Add a relationship between two elements
   * @param {string} fromElementId - Source element ID (pageId:binId:elementIndex)
   * @param {string} toElementId - Target element ID
   * @param {string} type - Relationship type ('blocks', 'dependsOn', 'relatedTo')
   * @returns {boolean} - Success status
   */
  addRelationship(fromElementId, toElementId, type) {
    if (!this.isValidRelationshipType(type)) {
      console.error(`Invalid relationship type: ${type}`);
      return false;
    }
    if (fromElementId === toElementId) {
      console.error("Cannot create relationship to self");
      return false;
    }
    if (!this.allowsCycles(type)) {
      if (this.wouldCreateCycle(fromElementId, toElementId, type)) {
        console.error("Would create circular dependency");
        return false;
      }
    }
    if (!this.relationships.has(fromElementId)) {
      this.relationships.set(fromElementId, /* @__PURE__ */ new Set());
    }
    const relationship = {
      to: toElementId,
      type,
      createdAt: Date.now()
    };
    this.relationships.get(fromElementId).add(relationship);
    this.updateElementRelationships(fromElementId);
    eventBus.emit("relationship:added", {
      from: fromElementId,
      to: toElementId,
      type
    });
    return true;
  }
  /**
   * Remove a relationship
   * @param {string} fromElementId - Source element ID
   * @param {string} toElementId - Target element ID
   * @param {string} type - Relationship type
   * @returns {boolean} - Success status
   */
  removeRelationship(fromElementId, toElementId, type) {
    const relSet = this.relationships.get(fromElementId);
    if (!relSet) return false;
    for (const rel of relSet) {
      if (rel.to === toElementId && rel.type === type) {
        relSet.delete(rel);
        this.updateElementRelationships(fromElementId);
        eventBus.emit("relationship:removed", {
          from: fromElementId,
          to: toElementId,
          type
        });
        return true;
      }
    }
    return false;
  }
  /**
   * Get all relationships for an element
   * @param {string} elementId - Element ID
   * @returns {Array<Object>} - Array of relationships
   */
  getRelationships(elementId) {
    const relSet = this.relationships.get(elementId);
    return relSet ? Array.from(relSet) : [];
  }
  /**
   * Get relationships by type
   * @param {string} elementId - Element ID
   * @param {string} type - Relationship type
   * @returns {Array<Object>} - Array of relationships
   */
  getRelationshipsByType(elementId, type) {
    return this.getRelationships(elementId).filter((rel) => rel.type === type);
  }
  /**
   * Get all elements that relate to this element (inverse relationships)
   * @param {string} elementId - Element ID
   * @returns {Array<Object>} - Array of {from, type}
   */
  getInverseRelationships(elementId) {
    const inverse = [];
    for (const [fromId, relSet] of this.relationships.entries()) {
      for (const rel of relSet) {
        if (rel.to === elementId) {
          inverse.push({
            from: fromId,
            type: rel.type
          });
        }
      }
    }
    return inverse;
  }
  /**
   * Get all available relationship types
   * @returns {Array<Object>} - Array of {type, label, description, directional, cyclic}
   */
  getRelationshipTypes() {
    return [
      // Dependency relationships (directional, non-cyclic)
      { type: "dependsOn", label: "Depends On", description: "This element depends on the target", directional: true, cyclic: false },
      { type: "blocks", label: "Blocks", description: "This element blocks the target", directional: true, cyclic: false },
      { type: "requiredBy", label: "Required By", description: "This element is required by the target", directional: true, cyclic: false },
      { type: "enables", label: "Enables", description: "This element enables the target", directional: true, cyclic: false },
      { type: "prevents", label: "Prevents", description: "This element prevents the target", directional: true, cyclic: false },
      // Temporal relationships (directional, can be cyclic)
      { type: "precedes", label: "Precedes", description: "This element comes before the target", directional: true, cyclic: true },
      { type: "follows", label: "Follows", description: "This element comes after the target", directional: true, cyclic: true },
      { type: "causes", label: "Causes", description: "This element causes the target", directional: true, cyclic: false },
      { type: "triggers", label: "Triggers", description: "This element triggers the target", directional: true, cyclic: false },
      // Hierarchical relationships (directional, can be cyclic)
      { type: "contains", label: "Contains", description: "This element contains the target", directional: true, cyclic: false },
      { type: "partOf", label: "Part Of", description: "This element is part of the target", directional: true, cyclic: false },
      { type: "parentOf", label: "Parent Of", description: "This element is parent of the target", directional: true, cyclic: false },
      { type: "childOf", label: "Child Of", description: "This element is child of the target", directional: true, cyclic: false },
      // Reference relationships (directional, can be cyclic)
      { type: "references", label: "References", description: "This element references the target", directional: true, cyclic: true },
      { type: "referencedBy", label: "Referenced By", description: "This element is referenced by the target", directional: true, cyclic: true },
      { type: "linksTo", label: "Links To", description: "This element links to the target", directional: true, cyclic: true },
      { type: "linkedFrom", label: "Linked From", description: "This element is linked from the target", directional: true, cyclic: true },
      // Similarity relationships (bidirectional, can be cyclic)
      { type: "relatedTo", label: "Related To", description: "This element is related to the target", directional: false, cyclic: true },
      { type: "similarTo", label: "Similar To", description: "This element is similar to the target", directional: false, cyclic: true },
      { type: "oppositeTo", label: "Opposite To", description: "This element is opposite to the target", directional: false, cyclic: true },
      { type: "conflictsWith", label: "Conflicts With", description: "This element conflicts with the target", directional: false, cyclic: true },
      { type: "complements", label: "Complements", description: "This element complements the target", directional: false, cyclic: true },
      // Flow relationships (directional, can be cyclic)
      { type: "leadsTo", label: "Leads To", description: "This element leads to the target", directional: true, cyclic: true },
      { type: "flowsInto", label: "Flows Into", description: "This element flows into the target", directional: true, cyclic: true },
      { type: "branchesTo", label: "Branches To", description: "This element branches to the target", directional: true, cyclic: true },
      { type: "mergesWith", label: "Merges With", description: "This element merges with the target", directional: true, cyclic: true },
      // Logical relationships (directional, can be cyclic)
      { type: "implies", label: "Implies", description: "This element implies the target", directional: true, cyclic: false },
      { type: "contradicts", label: "Contradicts", description: "This element contradicts the target", directional: false, cyclic: true },
      { type: "supports", label: "Supports", description: "This element supports the target", directional: true, cyclic: false },
      { type: "opposes", label: "Opposes", description: "This element opposes the target", directional: false, cyclic: true }
    ];
  }
  /**
   * Get relationship type metadata
   * @param {string} type - Relationship type
   * @returns {Object|null} - Relationship type metadata
   */
  getRelationshipTypeMetadata(type) {
    const types = this.getRelationshipTypes();
    return types.find((t) => t.type === type) || null;
  }
  /**
   * Check if relationship type is valid
   * @param {string} type - Relationship type
   * @returns {boolean}
   */
  isValidRelationshipType(type) {
    return this.getRelationshipTypes().some((t) => t.type === type);
  }
  /**
   * Check if relationship type allows cycles
   * @param {string} type - Relationship type
   * @returns {boolean}
   */
  allowsCycles(type) {
    const metadata = this.getRelationshipTypeMetadata(type);
    return metadata ? metadata.cyclic : false;
  }
  /**
   * Check if relationship type is directional
   * @param {string} type - Relationship type
   * @returns {boolean}
   */
  isDirectional(type) {
    const metadata = this.getRelationshipTypeMetadata(type);
    return metadata ? metadata.directional : true;
  }
  /**
   * Check if adding relationship would create a cycle
   * @param {string} fromElementId - Source element ID
   * @param {string} toElementId - Target element ID
   * @param {string} type - Relationship type
   * @returns {boolean}
   */
  wouldCreateCycle(fromElementId, toElementId, type) {
    if (type === "dependsOn") {
      return this.hasPath(toElementId, fromElementId, "dependsOn");
    } else if (type === "blocks") {
      return this.hasPath(toElementId, fromElementId, "blocks");
    }
    return false;
  }
  /**
   * Check if there's a path from source to target
   * @param {string} fromId - Source element ID
   * @param {string} toId - Target element ID
   * @param {string} type - Relationship type to follow
   * @returns {boolean}
   */
  hasPath(fromId, toId, type) {
    if (fromId === toId) return true;
    const visited = /* @__PURE__ */ new Set();
    const queue = [fromId];
    visited.add(fromId);
    while (queue.length > 0) {
      const current = queue.shift();
      const relationships = this.getRelationshipsByType(current, type);
      for (const rel of relationships) {
        if (rel.to === toId) {
          return true;
        }
        if (!visited.has(rel.to)) {
          visited.add(rel.to);
          queue.push(rel.to);
        }
      }
    }
    return false;
  }
  /**
   * Update element data with relationships
   * @param {string} elementId - Element ID
   */
  updateElementRelationships(elementId) {
    const [pageId, binId, elementIndex] = elementId.split(":");
    const appState2 = this._getAppState();
    const page = appState2.documents.find((p) => p.id === pageId);
    if (!page) return;
    const bin = page.groups?.find((b) => b.id === binId);
    if (!bin) return;
    const items = bin.items || [];
    bin.items = items;
    if (!items) return;
    const element = items[parseInt(elementIndex)];
    if (!element) return;
    if (!element.relationships) {
      element.relationships = {};
      this.getRelationshipTypes().forEach((relType) => {
        element.relationships[relType.type] = [];
      });
    }
    const relationships = this.getRelationships(elementId);
    const allTypes = this.getRelationshipTypes().map((t) => t.type);
    allTypes.forEach((relType) => {
      if (!element.relationships[relType]) {
        element.relationships[relType] = [];
      }
      element.relationships[relType] = relationships.filter((rel) => rel.type === relType).map((rel) => rel.to);
    });
    if (!element.relationships.blocks) element.relationships.blocks = [];
    if (!element.relationships.dependsOn) element.relationships.dependsOn = [];
    if (!element.relationships.relatedTo) element.relationships.relatedTo = [];
    const dataManager = this._getDataManager();
    if (dataManager) {
      dataManager.saveData();
    }
  }
  /**
   * Load relationships from element data
   * @param {string} elementId - Element ID
   * @param {Object} element - Element data
   */
  loadRelationships(elementId, element) {
    if (!element.relationships) return;
    const relSet = /* @__PURE__ */ new Set();
    if (element.relationships && typeof element.relationships === "object") {
      Object.keys(element.relationships).forEach((relType) => {
        if (this.isValidRelationshipType(relType) && Array.isArray(element.relationships[relType])) {
          element.relationships[relType].forEach((toId) => {
            relSet.add({
              to: toId,
              type: relType,
              createdAt: Date.now()
            });
          });
        }
      });
    }
    if (relSet.size > 0) {
      this.relationships.set(elementId, relSet);
    }
  }
  /**
   * Get element ID from page, bin, and index
   * @param {string} pageId - Page ID
   * @param {string} binId - Bin ID
   * @param {number} elementIndex - Element index
   * @returns {string}
   */
  getElementId(pageId, binId, elementIndex) {
    return `${pageId}:${binId}:${elementIndex}`;
  }
  /**
   * Parse element ID into components
   * @param {string} elementId - Element ID
   * @returns {Object} - {pageId, binId, elementIndex}
   */
  parseElementId(elementId) {
    const parts = elementId.split(":");
    return {
      pageId: parts[0],
      binId: parts[1],
      elementIndex: parseInt(parts[2])
    };
  }
  /**
   * Get element by ID
   * @param {string} elementId - Element ID
   * @returns {Object|null} - Element data and context
   */
  getElement(elementId) {
    const { pageId, binId, elementIndex } = this.parseElementId(elementId);
    const appState2 = this._getAppState();
    const page = appState2.documents.find((p) => p.id === pageId);
    if (!page) return null;
    const bin = page.groups?.find((b) => b.id === binId);
    if (!bin) return null;
    const items = bin.items || [];
    bin.items = items;
    if (!items) return null;
    const element = items[elementIndex];
    if (!element) return null;
    return {
      element,
      pageId,
      binId,
      elementIndex,
      page,
      bin
    };
  }
  /**
   * Initialize relationships from all elements
   */
  initializeFromData() {
    this.relationships.clear();
    const appState2 = this._getAppState();
    appState2.documents.forEach((page) => {
      if (page.groups) {
        page.groups.forEach((bin) => {
          const items = bin.items || [];
          bin.items = items;
          items.forEach((element, index) => {
            const elementId = this.getElementId(page.id, bin.id, index);
            this.loadRelationships(elementId, element);
          });
        });
      }
    });
  }
}
const StorageUtils = {
  /**
   * Get item from localStorage
   * @param {string} key - Storage key
   * @param {*} defaultValue - Default value if not found
   * @returns {*}
   */
  get(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(key);
      if (item === null) return defaultValue;
      return JSON.parse(item);
    } catch (error) {
      console.error(`Error reading from localStorage key "${key}":`, error);
      return defaultValue;
    }
  },
  /**
   * Set item in localStorage
   * @param {string} key - Storage key
   * @param {*} value - Value to store
   * @returns {boolean} - Success status
   */
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`Error writing to localStorage key "${key}":`, error);
      if (error.name === "QuotaExceededError") {
        console.warn("Storage quota exceeded. Attempting to clear old data...");
        this.clearOldData();
        try {
          localStorage.setItem(key, JSON.stringify(value));
          return true;
        } catch (retryError) {
          console.error("Failed to save after cleanup:", retryError);
          return false;
        }
      }
      return false;
    }
  },
  /**
   * Remove item from localStorage
   * @param {string} key - Storage key
   */
  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing localStorage key "${key}":`, error);
    }
  },
  /**
   * Clear all localStorage
   */
  clear() {
    try {
      localStorage.clear();
    } catch (error) {
      console.error("Error clearing localStorage:", error);
    }
  },
  /**
   * Check if key exists in localStorage
   * @param {string} key - Storage key
   * @returns {boolean}
   */
  has(key) {
    return localStorage.getItem(key) !== null;
  },
  /**
   * Get all keys from localStorage
   * @returns {Array<string>}
   */
  keys() {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      keys.push(localStorage.key(i));
    }
    return keys;
  },
  /**
   * Get storage size in bytes (approximate)
   * @returns {number}
   */
  getSize() {
    let total = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        total += localStorage[key].length + key.length;
      }
    }
    return total;
  },
  /**
   * Get storage quota information
   * @returns {Promise<Object>} - { quota, usage, available }
   */
  async getQuota() {
    if ("storage" in navigator && "estimate" in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        return {
          quota: estimate.quota,
          usage: estimate.usage,
          available: estimate.quota - estimate.usage
        };
      } catch (error) {
        console.error("Error getting storage quota:", error);
      }
    }
    return null;
  },
  /**
   * Clear old data based on timestamp or other criteria
   * This is a placeholder - implement based on your app's needs
   */
  clearOldData() {
    const keys = this.keys();
    const now = Date.now();
    const maxAge = 30 * 24 * 60 * 60 * 1e3;
    keys.forEach((key) => {
      if (key.startsWith("temp_") || key.startsWith("cache_")) {
        try {
          const item = this.get(key);
          if (item && item.timestamp && now - item.timestamp > maxAge) {
            this.remove(key);
          }
        } catch (error) {
          this.remove(key);
        }
      }
    });
  },
  /**
   * Migrate data from old key to new key
   * @param {string} oldKey - Old storage key
   * @param {string} newKey - New storage key
   * @param {Function} transform - Optional transformation function
   * @returns {boolean} - Success status
   */
  migrate(oldKey, newKey, transform = null) {
    if (!this.has(oldKey)) return false;
    try {
      let storedValue = this.get(oldKey);
      if (transform && typeof transform === "function") {
        storedValue = transform(storedValue);
      }
      this.set(newKey, storedValue);
      this.remove(oldKey);
      return true;
    } catch (error) {
      console.error(`Error migrating from "${oldKey}" to "${newKey}":`, error);
      return false;
    }
  },
  /**
   * Get item with expiration check
   * @param {string} key - Storage key
   * @param {*} defaultValue - Default value
   * @returns {*}
   */
  getWithExpiry(key, defaultValue = null) {
    try {
      const item = this.get(key);
      if (!item || !item.expiry) return defaultValue;
      if (Date.now() > item.expiry) {
        this.remove(key);
        return defaultValue;
      }
      return item.value;
    } catch (error) {
      console.error(`Error reading expired item from localStorage key "${key}":`, error);
      return defaultValue;
    }
  },
  /**
   * Set item with expiration
   * @param {string} key - Storage key
   * @param {*} value - Value to store
   * @param {number} ttl - Time to live in milliseconds
   * @returns {boolean} - Success status
   */
  setWithExpiry(key, value, ttl) {
    const item = {
      value,
      expiry: Date.now() + ttl
    };
    return this.set(key, item);
  }
};
class TemplateManager {
  constructor() {
    this.templatesKey = "twodo-templates";
    this.templates = this.loadTemplates();
  }
  /**
   * Get AppState service
   */
  _getAppState() {
    return getService(SERVICES.APP_STATE);
  }
  /**
   * Load templates from storage
   * @returns {Object} - Templates object
   */
  loadTemplates() {
    const stored = StorageUtils.get(this.templatesKey) || {};
    return {
      documents: stored.documents || [],
      groups: stored.groups || []
    };
  }
  /**
   * Save templates to storage
   */
  saveTemplates() {
    StorageUtils.set(this.templatesKey, this.templates);
  }
  /**
   * Save a page as a template
   * @param {string} pageId - Page ID to save
   * @param {string} templateName - Name for the template
   * @returns {boolean} - Success status
   */
  savePageAsTemplate(pageId, templateName) {
    const appState2 = this._getAppState();
    const page = appState2.documents.find((p) => p.id === pageId);
    if (!page) return false;
    const template = {
      id: `template-${Date.now()}`,
      name: templateName,
      type: "page",
      createdAt: Date.now(),
      data: DataUtils.deepClone(page)
    };
    delete template.data.id;
    this.templates.documents.push(template);
    this.saveTemplates();
    return true;
  }
  /**
   * Save a bin as a template
   * @param {string} pageId - Page ID containing the bin
   * @param {string} binId - Bin ID to save
   * @param {string} templateName - Name for the template
   * @returns {boolean} - Success status
   */
  saveBinAsTemplate(pageId, binId, templateName) {
    const appState2 = this._getAppState();
    const page = appState2.documents.find((p) => p.id === pageId);
    if (!page) return false;
    const bin = page.groups?.find((b) => b.id === binId);
    if (!bin) return false;
    const items = bin.items || [];
    bin.items = items;
    const template = {
      id: `template-${Date.now()}`,
      name: templateName,
      type: "bin",
      createdAt: Date.now(),
      data: DataUtils.deepClone(bin)
    };
    delete template.data.id;
    this.templates.groups.push(template);
    this.saveTemplates();
    return true;
  }
  /**
   * Get all page templates
   * @returns {Array} - Array of page templates
   */
  getPageTemplates() {
    return this.templates.documents || [];
  }
  /**
   * Get all bin templates
   * @returns {Array} - Array of bin templates
   */
  getBinTemplates() {
    return this.templates.groups || [];
  }
  /**
   * Get a template by ID
   * @param {string} templateId - Template ID
   * @returns {Object|null} - Template object or null
   */
  getTemplate(templateId) {
    const pageTemplate = this.templates.documents.find((t) => t.id === templateId);
    if (pageTemplate) return pageTemplate;
    const binTemplate = this.templates.groups.find((t) => t.id === templateId);
    if (binTemplate) return binTemplate;
    return null;
  }
  /**
   * Create a page from a template
   * @param {string} templateId - Template ID
   * @returns {Object|null} - New page object or null
   */
  createPageFromTemplate(templateId) {
    const template = this.getTemplate(templateId);
    if (!template || template.type !== "page") return null;
    const newPage = DataUtils.deepClone(template.data);
    newPage.id = `page-${Date.now()}`;
    const groups = newPage.groups || [];
    groups.forEach((bin) => {
      bin.id = `bin-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const items = bin.items || [];
      bin.items = items;
      if (items.length > 0) {
        items.forEach(() => {
        });
      }
    });
    newPage.groups = groups;
    return newPage;
  }
  /**
   * Create a bin from a template
   * @param {string} templateId - Template ID
   * @returns {Object|null} - New bin object or null
   */
  createBinFromTemplate(templateId) {
    const template = this.getTemplate(templateId);
    if (!template || template.type !== "bin") return null;
    const newBin = DataUtils.deepClone(template.data);
    newBin.id = `bin-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const items = newBin.items || [];
    newBin.items = items;
    if (items.length > 0) {
      items.forEach(() => {
      });
    }
    return newBin;
  }
  /**
   * Delete a template
   * @param {string} templateId - Template ID
   * @returns {boolean} - Success status
   */
  deleteTemplate(templateId) {
    const pageIndex = this.templates.documents.findIndex((t) => t.id === templateId);
    if (pageIndex !== -1) {
      this.templates.documents.splice(pageIndex, 1);
      this.saveTemplates();
      return true;
    }
    const binIndex = this.templates.groups.findIndex((t) => t.id === templateId);
    if (binIndex !== -1) {
      this.templates.groups.splice(binIndex, 1);
      this.saveTemplates();
      return true;
    }
    return false;
  }
  /**
   * Export template as JSON
   * @param {string} templateId - Template ID
   * @returns {string|null} - JSON string or null
   */
  exportTemplate(templateId) {
    const template = this.getTemplate(templateId);
    if (!template) return null;
    return JSON.stringify(template, null, 2);
  }
  /**
   * Import template from JSON
   * @param {string} jsonString - JSON string
   * @returns {boolean} - Success status
   */
  importTemplate(jsonString) {
    try {
      const template = JSON.parse(jsonString);
      if (!template.type || !template.data) {
        return false;
      }
      template.id = `template-${Date.now()}`;
      template.createdAt = Date.now();
      if (template.type === "page") {
        this.templates.documents.push(template);
      } else if (template.type === "bin") {
        this.templates.groups.push(template);
      } else {
        return false;
      }
      this.saveTemplates();
      return true;
    } catch (err) {
      console.error("Error importing template:", err);
      return false;
    }
  }
}
class AutomationManager {
  constructor(app2) {
    this.app = app2;
    this.rules = /* @__PURE__ */ new Map();
    this.logs = [];
    this.maxLogSize = 1e3;
  }
  _getDocument(pageId) {
    const documents = this.app.appState?.documents || this.app.documents || [];
    return documents.find((page) => page.id === pageId) || null;
  }
  _getGroup(pageId, binId) {
    const document2 = this._getDocument(pageId);
    const group = document2?.groups?.find((bin) => bin.id === binId) || null;
    if (!group) return null;
    const items = group.items || [];
    group.items = items;
    return group;
  }
  /**
   * Add automation rule to a bin
   * @param {string} pageId - Page ID
   * @param {string} binId - Bin ID
   * @param {Object} rule - Rule object
   * @returns {string} - Rule ID
   */
  addRule(pageId, binId, rule) {
    const ruleId = `rule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const fullRule = {
      id: ruleId,
      pageId,
      binId,
      name: rule.name || "Unnamed Rule",
      enabled: rule.enabled !== false,
      trigger: rule.trigger || {},
      // { type: 'elementCompleted', ... }
      conditions: rule.conditions || [],
      // Array of condition objects
      actions: rule.actions || [],
      // Array of action objects
      createdAt: Date.now()
    };
    const key = `${pageId}:${binId}`;
    if (!this.rules.has(key)) {
      this.rules.set(key, []);
    }
    this.rules.get(key).push(fullRule);
    this.subscribeToEvents(fullRule);
    return ruleId;
  }
  /**
   * Remove automation rule
   * @param {string} pageId - Page ID
   * @param {string} binId - Bin ID
   * @param {string} ruleId - Rule ID
   * @returns {boolean} - Success status
   */
  removeRule(pageId, binId, ruleId) {
    const key = `${pageId}:${binId}`;
    const rules = this.rules.get(key);
    if (!rules) return false;
    const index = rules.findIndex((r) => r.id === ruleId);
    if (index === -1) return false;
    const rule = rules[index];
    this.unsubscribeFromEvents(rule);
    rules.splice(index, 1);
    return true;
  }
  /**
   * Get rules for a bin
   * @param {string} pageId - Page ID
   * @param {string} binId - Bin ID
   * @returns {Array} - Array of rules
   */
  getRules(pageId, binId) {
    const key = `${pageId}:${binId}`;
    return this.rules.get(key) || [];
  }
  /**
   * Subscribe to events for a rule
   * @param {Object} rule - Rule object
   */
  subscribeToEvents(rule) {
    if (!rule.enabled) return;
    const triggerType = rule.trigger?.type;
    if (!triggerType) return;
    const handler = (data) => {
      this.handleTrigger(rule, data);
    };
    rule._eventHandler = handler;
    switch (triggerType) {
      case "elementCompleted":
        eventBus.on("element:completed", handler);
        break;
      case "elementCreated":
        eventBus.on("element:created", handler);
        break;
      case "elementUpdated":
        eventBus.on("element:updated", handler);
        break;
      case "timeBased":
        this.setupTimeBasedTrigger(rule);
        break;
    }
  }
  /**
   * Unsubscribe from events for a rule
   * @param {Object} rule - Rule object
   */
  unsubscribeFromEvents(rule) {
    const handler = rule._eventHandler;
    if (!handler) return;
    const triggerType = rule.trigger?.type;
    switch (triggerType) {
      case "elementCompleted":
        eventBus.off("element:completed", handler);
        break;
      case "elementCreated":
        eventBus.off("element:created", handler);
        break;
      case "elementUpdated":
        eventBus.off("element:updated", handler);
        break;
      case "timeBased":
        if (rule._intervalId) {
          clearInterval(rule._intervalId);
          delete rule._intervalId;
        }
        break;
    }
    delete rule._eventHandler;
  }
  /**
   * Handle trigger event
   * @param {Object} rule - Rule object
   * @param {Object} data - Event data
   */
  handleTrigger(rule, data) {
    if (!rule.enabled) return;
    if (!this.matchesTrigger(rule.trigger, data)) {
      return;
    }
    if (!this.checkConditions(rule.conditions, data)) {
      return;
    }
    this.executeActions(rule.actions, data);
    this.log({
      ruleId: rule.id,
      ruleName: rule.name,
      trigger: rule.trigger.type,
      timestamp: Date.now(),
      data
    });
  }
  /**
   * Check if trigger matches
   * @param {Object} trigger - Trigger object
   * @param {Object} data - Event data
   * @returns {boolean}
   */
  matchesTrigger(trigger, data) {
    if (!trigger || !data) return false;
    switch (trigger.type) {
      case "elementCompleted":
        return data.pageId === trigger.pageId && data.binId === trigger.binId && (trigger.elementIndex === void 0 || data.elementIndex === trigger.elementIndex);
      case "elementCreated":
        return data.pageId === trigger.pageId && data.binId === trigger.binId;
      case "elementUpdated":
        return data.pageId === trigger.pageId && data.binId === trigger.binId;
      default:
        return false;
    }
  }
  /**
   * Check conditions
   * @param {Array} conditions - Array of condition objects
   * @param {Object} data - Event data
   * @returns {boolean}
   */
  checkConditions(conditions, data) {
    if (!conditions || conditions.length === 0) return true;
    let element = null;
    if (data.elementIndex !== void 0) {
      const group = this._getGroup(data.pageId, data.binId);
      element = group?.items?.[data.elementIndex];
    }
    return conditions.every((condition) => {
      switch (condition.type) {
        case "hasTag":
          return element && element.tags && element.tags.includes(condition.value);
        case "hasProperty":
          return element && element[condition.property] === condition.value;
        case "isCompleted":
          return element && element.completed === condition.value;
        case "timeOfDay":
          const now = /* @__PURE__ */ new Date();
          const hour = now.getHours();
          return hour >= condition.startHour && hour < condition.endHour;
        default:
          return true;
      }
    });
  }
  /**
   * Execute actions
   * @param {Array} actions - Array of action objects
   * @param {Object} data - Event data
   */
  executeActions(actions, data) {
    if (!actions || actions.length === 0) return;
    actions.forEach((action) => {
      switch (action.type) {
        case "moveElement":
          this.moveElement(data.pageId, data.binId, data.elementIndex, action.targetPageId, action.targetBinId);
          break;
        case "setProperty":
          this.setElementProperty(data.pageId, data.binId, data.elementIndex, action.property, action.value);
          break;
        case "addTag":
          this.addElementTag(data.pageId, data.binId, data.elementIndex, action.tag);
          break;
        case "removeTag":
          this.removeElementTag(data.pageId, data.binId, data.elementIndex, action.tag);
          break;
        case "createElement":
          this.createElement(action.targetPageId, action.targetBinId, action.elementData);
          break;
        case "deleteElement":
          this.deleteElement(data.pageId, data.binId, data.elementIndex);
          break;
      }
    });
  }
  /**
   * Move element to different bin
   */
  moveElement(pageId, binId, elementIndex, targetPageId, targetBinId) {
    const bin = this._getGroup(pageId, binId);
    if (!bin || !bin.items) return;
    const element = bin.items[elementIndex];
    if (!element) return;
    bin.items.splice(elementIndex, 1);
    const targetBin = this._getGroup(targetPageId, targetBinId);
    if (targetBin) {
      if (!targetBin.items) targetBin.items = [];
      targetBin.items.push(element);
    }
    this.app.dataManager.saveData();
    this.app.render();
  }
  /**
   * Set element property
   */
  setElementProperty(pageId, binId, elementIndex, property, value) {
    const bin = this._getGroup(pageId, binId);
    if (!bin || !bin.items) return;
    const element = bin.items[elementIndex];
    if (!element) return;
    element[property] = value;
    this.app.dataManager.saveData();
    this.app.render();
  }
  /**
   * Add tag to element
   */
  addElementTag(pageId, binId, elementIndex, tag) {
    const bin = this._getGroup(pageId, binId);
    if (!bin || !bin.items) return;
    const element = bin.items[elementIndex];
    if (!element) return;
    if (!element.tags) element.tags = [];
    if (!element.tags.includes(tag)) {
      element.tags.push(tag);
      this.app.dataManager.saveData();
      this.app.render();
    }
  }
  /**
   * Remove tag from element
   */
  removeElementTag(pageId, binId, elementIndex, tag) {
    const bin = this._getGroup(pageId, binId);
    if (!bin || !bin.items) return;
    const element = bin.items[elementIndex];
    if (!element || !element.tags) return;
    const index = element.tags.indexOf(tag);
    if (index !== -1) {
      element.tags.splice(index, 1);
      this.app.dataManager.saveData();
      this.app.render();
    }
  }
  /**
   * Create new element
   */
  createElement(pageId, binId, elementData) {
    const bin = this._getGroup(pageId, binId);
    if (!bin) return;
    if (!bin.items) bin.items = [];
    bin.items.push(elementData);
    this.app.dataManager.saveData();
    this.app.render();
  }
  /**
   * Delete element
   */
  deleteElement(pageId, binId, elementIndex) {
    const bin = this._getGroup(pageId, binId);
    if (!bin || !bin.items) return;
    const deletedElement = bin.items[elementIndex];
    if (!deletedElement) return;
    if (this.app.undoRedoManager) {
      this.app.undoRedoManager.recordElementDelete(pageId, binId, elementIndex, deletedElement);
    }
    bin.items.splice(elementIndex, 1);
    this.app.dataManager.saveData();
    this.app.render();
  }
  /**
   * Setup time-based trigger
   * @param {Object} rule - Rule object
   */
  setupTimeBasedTrigger(rule) {
    const schedule = rule.trigger.schedule;
    if (!schedule) return;
    const checkTime = () => {
      const now = /* @__PURE__ */ new Date();
      const day = now.getDay();
      const hour = now.getHours();
      const minute = now.getMinutes();
      if (schedule.days && !schedule.days.includes(day)) {
        return;
      }
      if (hour === schedule.hour && minute === schedule.minute) {
        this.handleTrigger(rule, {
          pageId: rule.pageId,
          binId: rule.binId,
          type: "timeBased",
          timestamp: Date.now()
        });
      }
    };
    rule._intervalId = setInterval(checkTime, 6e4);
    checkTime();
  }
  /**
   * Log automation execution
   * @param {Object} logEntry - Log entry object
   */
  log(logEntry) {
    this.logs.push(logEntry);
    if (this.logs.length > this.maxLogSize) {
      this.logs.shift();
    }
    eventBus.emit("automation:executed", logEntry);
  }
  /**
   * Get automation logs
   * @param {string} ruleId - Optional rule ID to filter
   * @param {number} limit - Limit number of results
   * @returns {Array} - Array of log entries
   */
  getLogs(ruleId = null, limit = null) {
    let logs = this.logs;
    if (ruleId) {
      logs = logs.filter((log) => log.ruleId === ruleId);
    }
    if (limit) {
      logs = logs.slice(-limit);
    }
    return logs;
  }
  /**
   * Initialize rules from bin data
   * @param {string} pageId - Page ID
   * @param {string} binId - Bin ID
   * @param {Array} rules - Array of rule objects
   */
  initializeRules(pageId, binId, rules) {
    if (!rules || !Array.isArray(rules)) return;
    rules.forEach((rule) => {
      this.addRule(pageId, binId, rule);
    });
  }
  /**
   * Get rules as array for saving
   * @param {string} pageId - Page ID
   * @param {string} binId - Bin ID
   * @returns {Array} - Array of rule objects (without event handlers)
   */
  getRulesForSaving(pageId, binId) {
    const rules = this.getRules(pageId, binId);
    return rules.map((rule) => {
      const { _eventHandler, _intervalId, ...ruleData } = rule;
      return ruleData;
    });
  }
}
class TagManager {
  constructor() {
    this.tagsKey = "twodo-tags";
    this.allTags = this.loadTags();
  }
  /**
   * Get AppState service
   */
  _getAppState() {
    return getService(SERVICES.APP_STATE);
  }
  /**
   * Load all tags from storage
   * @returns {Set} - Set of all tags
   */
  loadTags() {
    const stored = StorageUtils.get(this.tagsKey);
    return stored ? new Set(stored) : /* @__PURE__ */ new Set();
  }
  /**
   * Save all tags to storage
   */
  saveTags() {
    StorageUtils.set(this.tagsKey, Array.from(this.allTags));
  }
  /**
   * Get all tags
   * @returns {Array} - Array of all tags
   */
  getAllTags() {
    return Array.from(this.allTags).sort();
  }
  /**
   * Get default tags
   * @returns {Array} - Array of default tags
   */
  getDefaultTags() {
    return ["work", "personal", "urgent", "important", "meeting", "deadline", "chore", "hobby", "project", "home", "shopping"];
  }
  /**
   * Get all available tags (default + stored)
   * @returns {Array} - Array of all available tags
   */
  getAvailableTags() {
    const defaultTags = this.getDefaultTags();
    const allTags = /* @__PURE__ */ new Set([...defaultTags, ...this.allTags]);
    return Array.from(allTags).sort();
  }
  /**
   * Add a tag to the collection
   * @param {string} tag - Tag to add
   */
  addTag(tag) {
    if (tag && tag.trim()) {
      const normalizedTag = tag.trim().toLowerCase();
      this.allTags.add(normalizedTag);
      this.saveTags();
    }
  }
  /**
   * Remove a tag from the collection
   * @param {string} tag - Tag to remove
   */
  removeTag(tag) {
    if (tag) {
      const normalizedTag = tag.trim().toLowerCase();
      this.allTags.delete(normalizedTag);
      this.saveTags();
    }
  }
  /**
   * Get tags for an element
   * @param {Object} element - Element object
   * @returns {Array} - Array of tags
   */
  getElementTags(element) {
    return element.tags || [];
  }
  /**
   * Set tags for an element
   * @param {Object} element - Element object
   * @param {Array} tags - Array of tags
   */
  setElementTags(element, tags) {
    if (!Array.isArray(tags)) {
      tags = [];
    }
    element.tags = tags.map((tag) => tag.trim().toLowerCase()).filter((tag) => tag);
    tags.forEach((tag) => this.addTag(tag));
  }
  /**
   * Add tag to element
   * @param {Object} element - Element object
   * @param {string} tag - Tag to add
   */
  addElementTag(element, tag) {
    if (!element.tags) {
      element.tags = [];
    }
    const normalizedTag = tag.trim().toLowerCase();
    if (!element.tags.includes(normalizedTag)) {
      element.tags.push(normalizedTag);
      this.addTag(normalizedTag);
    }
  }
  /**
   * Remove tag from element
   * @param {Object} element - Element object
   * @param {string} tag - Tag to remove
   */
  removeElementTag(element, tag) {
    if (element.tags) {
      const normalizedTag = tag.trim().toLowerCase();
      element.tags = element.tags.filter((t) => t !== normalizedTag);
    }
  }
  /**
   * Get elements with a specific tag
   * @param {string} tag - Tag to search for
   * @returns {Array} - Array of {page, bin, element, elementIndex}
   */
  getElementsByTag(tag) {
    const results = [];
    const normalizedTag = tag.trim().toLowerCase();
    const appState2 = this._getAppState();
    appState2.documents.forEach((page) => {
      if (page.groups) {
        page.groups.forEach((bin) => {
          const items = bin.items || [];
          bin.items = items;
          items.forEach((element, elementIndex) => {
            if (element.tags && element.tags.includes(normalizedTag)) {
              results.push({
                page,
                bin,
                element,
                elementIndex,
                pageId: page.id,
                binId: bin.id
              });
            }
          });
        });
      }
    });
    return results;
  }
  /**
   * Get tag statistics
   * @returns {Object} - Object mapping tags to counts
   */
  getTagStatistics() {
    const stats = {};
    const appState2 = this._getAppState();
    appState2.documents.forEach((page) => {
      if (page.groups) {
        page.groups.forEach((bin) => {
          const items = bin.items || [];
          bin.items = items;
          items.forEach((element) => {
            if (element.tags) {
              element.tags.forEach((tag) => {
                stats[tag] = (stats[tag] || 0) + 1;
              });
            }
          });
        });
      }
    });
    return stats;
  }
  /**
   * Search tags (autocomplete)
   * @param {string} query - Search query
   * @returns {Array} - Array of matching tags
   */
  searchTags(query) {
    if (!query || !query.trim()) {
      return this.getAvailableTags();
    }
    const normalizedQuery = query.trim().toLowerCase();
    const availableTags = this.getAvailableTags();
    return availableTags.filter(
      (tag) => tag.toLowerCase().includes(normalizedQuery)
    );
  }
}
class SearchIndex {
  constructor() {
    this.index = /* @__PURE__ */ new Map();
    this.rebuildIndex();
  }
  /**
   * Get AppState service
   */
  _getAppState() {
    return getService(SERVICES.APP_STATE);
  }
  /**
   * Rebuild the entire search index
   */
  rebuildIndex() {
    this.index.clear();
    const appState2 = this._getAppState();
    if (!appState2 || !appState2.documents || !Array.isArray(appState2.documents)) {
      return;
    }
    appState2.documents.forEach((page) => {
      if (page && page.groups) {
        page.groups.forEach((bin) => {
          const items = bin.items || [];
          bin.items = items;
          if (items.length > 0) {
            const itemIndex = ItemHierarchy.buildItemIndex(items);
            items.forEach((element, elementIndex) => {
              const elementId = this.getElementId(page.id, bin.id, elementIndex);
              this.index.set(elementId, this.extractSearchableData(page, bin, element, elementIndex, itemIndex));
            });
          }
        });
      }
    });
  }
  /**
   * Get unique element ID
   */
  getElementId(pageId, binId, elementIndex) {
    return `${pageId}-${binId}-${elementIndex}`;
  }
  /**
   * Extract searchable data from an element
   */
  extractSearchableData(page, bin, element, elementIndex, itemIndex) {
    const childItems = itemIndex ? ItemHierarchy.getChildItems(element, itemIndex) : [];
    const searchableData = {
      pageId: page.id,
      pageTitle: page.title || "",
      binId: bin.id,
      binTitle: bin.title || "",
      elementIndex,
      text: element.text || "",
      type: element.type || "task",
      tags: element.tags || [],
      completed: element.completed || false,
      deadline: element.deadline || null,
      timeAllocated: element.timeAllocated || "",
      funModifier: element.funModifier || "",
      customProperties: element.customProperties || {},
      // Include children text
      childrenText: childItems.map((child) => child.text || "").join(" "),
      // Include items text for multi-checkbox
      itemsText: (element.items || []).map((item) => item.text || "").join(" ")
    };
    return searchableData;
  }
  /**
   * Search the index
   * @param {string} query - Search query
   * @param {Object} filters - Filter options
   * @returns {Array} - Array of matching element data
   */
  search(query, filters = {}) {
    const normalizedQuery = query ? query.toLowerCase().trim() : "";
    const results = [];
    for (const [elementId, elementData] of this.index.entries()) {
      let matches = true;
      if (normalizedQuery) {
        const searchableText = [
          elementData.text,
          elementData.pageTitle,
          elementData.binTitle,
          elementData.timeAllocated,
          elementData.funModifier,
          elementData.childrenText,
          elementData.itemsText,
          ...elementData.tags,
          ...Object.values(elementData.customProperties)
        ].join(" ").toLowerCase();
        if (!searchableText.includes(normalizedQuery)) {
          matches = false;
        }
      }
      if (filters.tags && filters.tags.length > 0) {
        const hasMatchingTag = filters.tags.some(
          (tag) => elementData.tags.includes(tag.toLowerCase())
        );
        if (!hasMatchingTag) matches = false;
      }
      if (filters.completed !== void 0) {
        if (elementData.completed !== filters.completed) matches = false;
      }
      if (filters.type && filters.type.length > 0) {
        if (!filters.type.includes(elementData.type)) matches = false;
      }
      if (filters.pageId && filters.pageId.length > 0) {
        if (!filters.pageId.includes(elementData.pageId)) matches = false;
      }
      if (filters.binId && filters.binId.length > 0) {
        if (!filters.binId.includes(elementData.binId)) matches = false;
      }
      if (filters.hasDeadline !== void 0) {
        if (elementData.deadline !== null !== filters.hasDeadline) matches = false;
      }
      if (filters.deadlineBefore) {
        if (!elementData.deadline || new Date(elementData.deadline) > new Date(filters.deadlineBefore)) {
          matches = false;
        }
      }
      if (filters.deadlineAfter) {
        if (!elementData.deadline || new Date(elementData.deadline) < new Date(filters.deadlineAfter)) {
          matches = false;
        }
      }
      if (matches) {
        results.push({
          ...elementData,
          elementId
        });
      }
    }
    return results;
  }
  /**
   * Update index for a single element
   */
  updateElement(pageId, binId, elementIndex) {
    const appState2 = this._getAppState();
    const page = appState2.documents.find((p) => p.id === pageId);
    if (!page) return;
    const bin = page.groups?.find((b) => b.id === binId);
    if (!bin) return;
    const items = bin.items || [];
    bin.items = items;
    const element = items?.[elementIndex];
    if (!element) return;
    const elementId = this.getElementId(pageId, binId, elementIndex);
    this.index.set(elementId, this.extractSearchableData(page, bin, element, elementIndex));
  }
  /**
   * Remove element from index
   */
  removeElement(pageId, binId, elementIndex) {
    const elementId = this.getElementId(pageId, binId, elementIndex);
    this.index.delete(elementId);
  }
  /**
   * Get all unique tags from index
   */
  getAllTags() {
    const tags = /* @__PURE__ */ new Set();
    for (const entry of this.index.values()) {
      entry.tags.forEach((tag) => tags.add(tag));
    }
    return Array.from(tags).sort();
  }
  /**
   * Get all element types from index
   */
  getAllTypes() {
    const types = /* @__PURE__ */ new Set();
    for (const entry of this.index.values()) {
      types.add(entry.type);
    }
    return Array.from(types).sort();
  }
}
class ExportService {
  constructor() {
  }
  /**
   * Get services
   */
  _getAppState() {
    return getService(SERVICES.APP_STATE);
  }
  /**
   * Export page to JSON
   */
  exportToJSON(pageId) {
    const appState2 = this._getAppState();
    const page = appState2.documents.find((p) => p.id === pageId);
    if (!page) return null;
    const exportData = DataUtils.deepClone(page);
    return JSON.stringify(exportData, null, 2);
  }
  /**
   * Export page to CSV
   */
  exportToCSV(pageId) {
    const appState2 = this._getAppState();
    const page = appState2.documents.find((p) => p.id === pageId);
    if (!page) return null;
    const rows = [];
    rows.push(["Page", "Bin", "Type", "Text", "Completed", "Tags", "Deadline", "Time Allocated"].join(","));
    page.groups?.forEach((bin) => {
      const items = bin.items || [];
      bin.items = items;
      items.forEach((element) => {
        const row = [
          `"${(page.title || page.id).replace(/"/g, '""')}"`,
          `"${(bin.title || bin.id).replace(/"/g, '""')}"`,
          `"${(element.type || "task").replace(/"/g, '""')}"`,
          `"${(element.text || "").replace(/"/g, '""')}"`,
          element.completed ? "Yes" : "No",
          `"${(element.tags || []).join("; ").replace(/"/g, '""')}"`,
          element.deadline || "",
          element.timeAllocated || ""
        ];
        rows.push(row.join(","));
      });
    });
    return rows.join("\n");
  }
  /**
   * Export page to Markdown
   */
  exportToMarkdown(pageId) {
    const appState2 = this._getAppState();
    const page = appState2.documents.find((p) => p.id === pageId);
    if (!page) return null;
    let md = `# ${page.title || page.id}

`;
    page.groups?.forEach((bin) => {
      md += `## ${bin.title || bin.id}

`;
      const items = bin.items || [];
      bin.items = items;
      const itemIndex = ItemHierarchy.buildItemIndex(items);
      const rootItems = ItemHierarchy.getRootItems(items);
      rootItems.forEach((element) => {
        const checkbox = element.completed ? "[x]" : "[ ]";
        const tags = element.tags && element.tags.length > 0 ? ` ${element.tags.map((t) => `#${t}`).join(" ")}` : "";
        const deadline = element.deadline ? ` (Deadline: ${new Date(element.deadline).toLocaleDateString()})` : "";
        md += `- ${checkbox} ${element.text || "Untitled"}${tags}${deadline}
`;
        const childItems = ItemHierarchy.getChildItems(element, itemIndex);
        if (childItems.length > 0) {
          childItems.forEach((child) => {
            const childCheckbox = child.completed ? "[x]" : "[ ]";
            md += `  - ${childCheckbox} ${child.text || ""}
`;
          });
        }
      });
      md += "\n";
    });
    return md;
  }
  /**
   * Export page to PDF (requires jsPDF library)
   */
  async exportToPDF(pageId) {
    const appState2 = this._getAppState();
    const page = appState2.documents.find((p) => p.id === pageId);
    if (!page) return null;
    if (typeof window.jsPDF === "undefined") {
      const markdown = this.exportToMarkdown(pageId);
      this.downloadFile(`${pageId}.txt`, markdown, "text/plain");
      return;
    }
    const { jsPDF } = window.jsPDF;
    const doc = new jsPDF();
    let y = 20;
    doc.setFontSize(18);
    doc.text(page.title || page.id, 10, y);
    y += 10;
    page.groups?.forEach((bin) => {
      if (y > 280) {
        doc.addPage();
        y = 20;
      }
      doc.setFontSize(14);
      doc.text(bin.title || bin.id, 10, y);
      y += 8;
      const items = bin.items || [];
      bin.items = items;
      items.forEach((element) => {
        if (y > 280) {
          doc.addPage();
          y = 20;
        }
        doc.setFontSize(10);
        const checkbox = element.completed ? "☑" : "☐";
        const text = `${checkbox} ${element.text || "Untitled"}`;
        doc.text(text, 15, y);
        y += 6;
      });
      y += 5;
    });
    doc.save(`${pageId}.pdf`);
  }
  /**
   * Download file
   */
  downloadFile(filename, content, mimeType = "text/plain") {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
  /**
   * Export page with format selection
   */
  async exportPage(pageId, format = "json") {
    let content = null;
    let filename = `${pageId}.${format}`;
    let mimeType = "text/plain";
    switch (format) {
      case "json":
        content = this.exportToJSON(pageId);
        mimeType = "application/json";
        break;
      case "csv":
        content = this.exportToCSV(pageId);
        mimeType = "text/csv";
        break;
      case "md":
      case "markdown":
        content = this.exportToMarkdown(pageId);
        mimeType = "text/markdown";
        filename = `${pageId}.md`;
        break;
      case "pdf":
        await this.exportToPDF(pageId);
        return;
      default:
        console.error("Unknown export format:", format);
        return;
    }
    if (content) {
      this.downloadFile(filename, content, mimeType);
    }
  }
}
class ImportService {
  constructor() {
  }
  /**
   * Import from JSON
   */
  importFromJSON(jsonString, options = {}) {
    try {
      const importedPage = JSON.parse(jsonString);
      if (!importedPage.id || !importedPage.groups) {
        throw new Error("Invalid document structure");
      }
      if (options.newPageId) {
        importedPage.id = options.newPageId;
      } else {
        importedPage.id = `page-${Date.now()}`;
      }
      const groups = importedPage.groups || [];
      groups.forEach((bin, binIndex) => {
        bin.id = bin.id || `bin-${binIndex}`;
        const items = bin.items || [];
        bin.items = items;
        items.forEach((element, elIndex) => {
          element.id = element.id || `element-${importedPage.id}-${bin.id}-${elIndex}`;
        });
      });
      importedPage.groups = groups;
      return importedPage;
    } catch (error) {
      throw new Error(`Failed to parse JSON: ${error.message}`);
    }
  }
  /**
   * Import from CSV (Todoist format)
   */
  importFromCSV(csvString, options = {}) {
    const lines = csvString.split("\n").filter((line) => line.trim());
    if (lines.length < 2) {
      throw new Error("CSV must have at least a header row and one data row");
    }
    const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
    const pageId = options.newPageId || `page-${Date.now()}`;
    const binId = options.binId || "bin-0";
    const page = {
      id: pageId,
      title: options.pageTitle || "Imported Page",
      groups: [{
        id: binId,
        title: options.binTitle || "Imported Bin",
        items: []
      }]
    };
    const textIndex = headers.findIndex(
      (h) => h.toLowerCase().includes("task") || h.toLowerCase().includes("content") || h.toLowerCase().includes("text")
    );
    const completedIndex = headers.findIndex(
      (h) => h.toLowerCase().includes("completed") || h.toLowerCase().includes("done")
    );
    const priorityIndex = headers.findIndex(
      (h) => h.toLowerCase().includes("priority")
    );
    const dueDateIndex = headers.findIndex(
      (h) => h.toLowerCase().includes("due") || h.toLowerCase().includes("deadline")
    );
    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      if (values.length === 0) continue;
      const element = {
        id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        type: "task",
        text: values[textIndex] || "Imported Task",
        completed: completedIndex >= 0 && (values[completedIndex]?.toLowerCase() === "yes" || values[completedIndex]?.toLowerCase() === "true" || values[completedIndex] === "1") || false,
        parentId: null,
        childIds: []
      };
      if (dueDateIndex >= 0 && values[dueDateIndex]) {
        element.deadline = this.parseDate(values[dueDateIndex]);
      }
      if (priorityIndex >= 0 && values[priorityIndex]) {
        const priority = values[priorityIndex].toLowerCase();
        if (priority === "high" || priority === "p1") {
          if (!element.tags) element.tags = [];
          element.tags.push("urgent");
        }
      }
      page.groups[0].items.push(element);
    }
    return page;
  }
  /**
   * Parse CSV line handling quoted values
   */
  parseCSVLine(line) {
    const values = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        values.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    return values;
  }
  /**
   * Import from Markdown (Notion format)
   */
  importFromMarkdown(markdownString, options = {}) {
    const lines = markdownString.split("\n");
    const pageId = options.newPageId || `page-${Date.now()}`;
    const binId = options.binId || "bin-0";
    const page = {
      id: pageId,
      title: options.pageTitle || this.extractTitleFromMarkdown(markdownString) || "Imported Page",
      groups: [{
        id: binId,
        title: options.binTitle || "Imported Bin",
        items: []
      }]
    };
    let currentElement = null;
    let currentBin = page.groups[0];
    lines.forEach((line) => {
      if (line.startsWith("## ")) {
        const binTitle = line.substring(3).trim();
        const newBinId = `bin-${page.groups.length}`;
        currentBin = {
          id: newBinId,
          title: binTitle,
          items: []
        };
        page.groups.push(currentBin);
        return;
      }
      const taskMatch = line.match(/^[\s-]*\[([ x])\]\s*(.+)$/);
      if (taskMatch) {
        if (currentElement) {
          currentBin.items.push(currentElement);
        }
        currentElement = {
          id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          type: "task",
          text: taskMatch[2].trim(),
          completed: taskMatch[1] === "x",
          parentId: null,
          childIds: []
        };
        const tagMatches = currentElement.text.match(/#(\w+)/g);
        if (tagMatches) {
          currentElement.tags = tagMatches.map((t) => t.substring(1));
          currentElement.text = currentElement.text.replace(/#\w+/g, "").trim();
        }
        const deadlineMatch = currentElement.text.match(/\(Deadline:\s*([^)]+)\)/);
        if (deadlineMatch) {
          currentElement.deadline = this.parseDate(deadlineMatch[1]);
          currentElement.text = currentElement.text.replace(/\(Deadline:[^)]+\)/g, "").trim();
        }
        return;
      }
      if (currentElement && line.match(/^\s{2,}-/)) {
        const childMatch = line.match(/\[([ x])\]\s*(.+)$/);
        if (childMatch) {
          const childItem = {
            id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            type: "task",
            text: childMatch[2].trim(),
            completed: childMatch[1] === "x",
            parentId: currentElement.id,
            childIds: []
          };
          currentElement.childIds.push(childItem.id);
          currentBin.items.push(childItem);
        }
      }
    });
    if (currentElement) {
      currentBin.items.push(currentElement);
    }
    return page;
  }
  /**
   * Extract title from markdown (first # heading)
   */
  extractTitleFromMarkdown(markdown) {
    const match = markdown.match(/^#\s+(.+)$/m);
    return match ? match[1].trim() : null;
  }
  /**
   * Parse date string to ISO format
   */
  parseDate(dateString) {
    if (!dateString) return null;
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }
    return null;
  }
  /**
   * Import from Trello JSON export
   */
  importFromTrelloJSON(jsonString, options = {}) {
    try {
      const trelloData = JSON.parse(jsonString);
      const pageId = options.newPageId || `page-${Date.now()}`;
      const page = {
        id: pageId,
        title: trelloData.name || "Imported from Trello",
        groups: []
      };
      if (trelloData.lists && Array.isArray(trelloData.lists)) {
        trelloData.lists.forEach((list, listIndex) => {
          const bin = {
            id: `bin-${listIndex}`,
            title: list.name || `List ${listIndex + 1}`,
            items: []
          };
          if (trelloData.cards && Array.isArray(trelloData.cards)) {
            trelloData.cards.filter((card) => card.idList === list.id).forEach((card, cardIndex) => {
              const element = {
                id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
                type: "task",
                text: card.name || "Untitled Card",
                completed: card.closed || false,
                parentId: null,
                childIds: []
              };
              if (card.due) {
                element.deadline = new Date(card.due).toISOString();
              }
              if (card.labels && card.labels.length > 0) {
                element.tags = card.labels.map((l) => l.name || l.color);
              }
              if (card.desc) {
                element.customProperties = element.customProperties || {};
                element.customProperties.description = card.desc;
              }
              if (trelloData.checklists && Array.isArray(trelloData.checklists)) {
                trelloData.checklists.filter((checklist) => checklist.idCard === card.id).forEach((checklist) => {
                  if (checklist.checkItems) {
                    checklist.checkItems.forEach((item) => {
                      const childItem = {
                        id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
                        type: "task",
                        text: item.name,
                        completed: item.state === "complete",
                        parentId: element.id,
                        childIds: []
                      };
                      element.childIds.push(childItem.id);
                      bin.items.push(childItem);
                    });
                  }
                });
              }
              bin.items.push(element);
            });
          }
          page.groups.push(bin);
        });
      }
      return page;
    } catch (error) {
      throw new Error(`Failed to parse Trello JSON: ${error.message}`);
    }
  }
  /**
   * Import page with format detection
   */
  async importPage(file, format = "auto") {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target.result;
          let page = null;
          if (format === "auto") {
            if (file.name.endsWith(".json")) {
              format = "json";
            } else if (file.name.endsWith(".csv")) {
              format = "csv";
            } else if (file.name.endsWith(".md") || file.name.endsWith(".markdown")) {
              format = "markdown";
            } else {
              if (content.trim().startsWith("{")) {
                format = "json";
              } else if (content.includes(",")) {
                format = "csv";
              } else {
                format = "markdown";
              }
            }
          }
          switch (format) {
            case "json":
              try {
                const parsedContent = JSON.parse(content);
                if (parsedContent.lists && parsedContent.cards) {
                  page = this.importFromTrelloJSON(content);
                } else {
                  page = this.importFromJSON(content);
                }
              } catch (err) {
                page = this.importFromJSON(content);
              }
              break;
            case "csv":
              page = this.importFromCSV(content);
              break;
            case "markdown":
            case "md":
              page = this.importFromMarkdown(content);
              break;
            default:
              throw new Error(`Unsupported format: ${format}`);
          }
          resolve(page);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsText(file);
    });
  }
}
class OAuthManager {
  constructor(app2) {
    this.app = app2;
    this.storageKey = "twodo-oauth-tokens";
    this.tokens = this.loadTokens();
    this.callbacks = /* @__PURE__ */ new Map();
  }
  loadTokens() {
    return StorageUtils.get(this.storageKey) || {};
  }
  saveTokens() {
    StorageUtils.set(this.storageKey, this.tokens);
  }
  /**
   * Initiate OAuth flow for a service
   */
  async initiateOAuth(serviceName, config) {
    const {
      clientId,
      redirectUri,
      scope,
      authURL,
      tokenURL
    } = config;
    const oauthState = this.generateState();
    this.callbacks.set(oauthState, { serviceName, config });
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: scope.join(" "),
      state: oauthState
    });
    const authUrl = `${authURL}?${params.toString()}`;
    const width = 600;
    const height = 700;
    const left = (screen.width - width) / 2;
    const top = (screen.height - height) / 2;
    const popup = window.open(
      authUrl,
      "OAuth",
      `width=${width},height=${height},left=${left},top=${top}`
    );
    return new Promise((resolve, reject) => {
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          reject(new Error("OAuth window closed"));
        }
      }, 1e3);
      const messageHandler = (event) => {
        if (event.origin !== window.location.origin) return;
        if (event.data.type === "oauth-callback") {
          clearInterval(checkClosed);
          window.removeEventListener("message", messageHandler);
          this.handleOAuthCallback(event.data, resolve, reject);
        }
      };
      window.addEventListener("message", messageHandler);
    });
  }
  async handleOAuthCallback(data, resolve, reject) {
    const { code, state, error } = data;
    if (error) {
      reject(new Error(error));
      return;
    }
    const callback = this.callbacks.get(state);
    if (!callback) {
      reject(new Error("Invalid OAuth state"));
      return;
    }
    try {
      const tokens = await this.exchangeCodeForTokens(code, callback.config);
      this.tokens[callback.serviceName] = tokens;
      this.saveTokens();
      resolve(tokens);
    } catch (error2) {
      reject(error2);
    }
  }
  async exchangeCodeForTokens(code, config) {
    const response = await fetch(config.tokenURL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: config.redirectUri
      })
    });
    if (!response.ok) {
      throw new Error("Failed to exchange code for tokens");
    }
    return response.json();
  }
  generateState() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }
  getTokens(serviceName) {
    return this.tokens[serviceName] || null;
  }
  revokeTokens(serviceName) {
    delete this.tokens[serviceName];
    this.saveTokens();
  }
}
class SyncManager {
  constructor() {
    this.ws = null;
    this.clientId = null;
    this.currentFilename = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectDelay = 1e3;
    this.isConnected = false;
    this.pendingChanges = [];
    this.pendingFileJoin = null;
  }
  /**
   * Get services
   */
  _getAppState() {
    return getService(SERVICES.APP_STATE);
  }
  _getFileManager() {
    return getService(SERVICES.FILE_MANAGER);
  }
  _getDataManager() {
    return getService(SERVICES.DATA_MANAGER);
  }
  async connect() {
    if (this.isConnected && this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log("WebSocket already connected");
      return;
    }
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.hostname;
    const wsPort = "8001";
    const wsUrl = `${protocol}//${host}:${wsPort}`;
    console.log(`Connecting to WebSocket at ${wsUrl}`);
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(wsUrl);
        this._connectResolve = resolve;
        this._connectReject = reject;
        const timeout = setTimeout(() => {
          if (this.ws && this.ws.readyState !== WebSocket.OPEN) {
            this.ws.close();
            if (this._connectReject) {
              this._connectReject(new Error("WebSocket connection timeout"));
              this._connectReject = null;
            }
          }
        }, 3e3);
        this.ws.onopen = () => {
          console.log("WebSocket connected");
          this.isConnected = true;
          this.reconnectAttempts = 0;
        };
        this.ws.onmessage = (event) => {
          this.handleMessage(JSON.parse(event.data));
        };
        this.ws.onerror = (error) => {
          clearTimeout(timeout);
          console.error("WebSocket error:", error);
          if (this._connectReject) {
            this._connectReject(error);
            this._connectReject = null;
          }
        };
        this.ws.onclose = () => {
          clearTimeout(timeout);
          console.log("WebSocket disconnected");
          this.isConnected = false;
          this._connectResolve = null;
          this._connectReject = null;
          if (!this.ws || this.ws.readyState === WebSocket.CLOSED) {
            this.attemptReconnect();
          }
        };
      } catch (error) {
        console.error("Failed to create WebSocket:", error);
        reject(error);
        this.attemptReconnect();
      }
    });
  }
  attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})...`);
      setTimeout(() => this.connect(), delay);
    } else {
      console.error("Max reconnection attempts reached");
    }
  }
  handleMessage(message) {
    const { type } = message;
    switch (type) {
      case "connected":
        this.clientId = message.clientId;
        console.log(`Received client ID: ${this.clientId}`);
        this.flushPendingChanges();
        const fileToJoin = this.currentFilename || this.pendingFileJoin;
        if (fileToJoin) {
          this.currentFilename = fileToJoin;
          this.pendingFileJoin = null;
          this.joinFile(fileToJoin);
        }
        if (this._connectResolve) {
          this._connectResolve();
          this._connectResolve = null;
          this._connectReject = null;
        }
        break;
      case "file_joined":
        this.handleFileJoined(message);
        break;
      case "full_sync":
        this.handleFullSync(message);
        break;
      case "change":
        this.handleRemoteChange(message);
        break;
      case "undo":
        this.handleRemoteUndo(message);
        break;
      case "redo":
        this.handleRemoteRedo(message);
        break;
      case "client_joined":
        console.log(`Client ${message.clientId} joined ${message.filename}`);
        break;
      case "client_left":
        console.log(`Client ${message.clientId} left ${message.filename}`);
        break;
    }
  }
  handleFileJoined(message) {
    const fileManager = this._getFileManager();
    if (message.data && fileManager) {
      if (this.currentFilename === message.filename) {
        const appState2 = this._getAppState();
        const dataManager = this._getDataManager();
        const currentData = JSON.stringify(appState2.documents);
        const newData = JSON.stringify(message.data.documents || []);
        if (currentData === newData) {
          console.log("[SyncManager] File join data matches local data exactly, skipping update");
          const remoteTimestamp2 = message.timestamp || message.data?._lastSyncTimestamp || message.data?.timestamp || 0;
          if (remoteTimestamp2 > 0 && dataManager) {
            dataManager._lastSyncTimestamp = remoteTimestamp2;
          }
          return;
        }
        const remoteTimestamp = message.timestamp || message.data?._lastSyncTimestamp || message.data?.timestamp || 0;
        const localTimestamp = dataManager?._lastSyncTimestamp || 0;
        if (localTimestamp > 0) {
          const timeSinceLoad = Date.now() - localTimestamp;
          if (timeSinceLoad < 3e3) {
            const timeDiff = remoteTimestamp - localTimestamp;
            if (timeDiff < 2e3) {
              console.log(`[SyncManager] Ignoring file join - just loaded file ${timeSinceLoad}ms ago, remote not significantly newer (diff: ${timeDiff}ms)`);
              return;
            }
          }
        }
        if (remoteTimestamp < localTimestamp && localTimestamp > 0) {
          console.log(`[SyncManager] Ignoring older file join (remote: ${remoteTimestamp}, local: ${localTimestamp})`);
          return;
        }
        if (remoteTimestamp > 0) {
          if (dataManager) {
            dataManager._lastSyncTimestamp = remoteTimestamp;
          }
        }
        console.log("[SyncManager] Applying file join data (remote is newer or equal)");
        appState2.documents = message.data.documents || [];
        appState2.currentDocumentId = message.data.currentDocumentId || (appState2.documents.length > 0 ? appState2.documents[0].id : "document-1");
        appState2.groupStates = message.data.groupStates || {};
        appState2.subtaskStates = message.data.subtaskStates || {};
        appState2.allSubtasksExpanded = message.data.allSubtasksExpanded !== void 0 ? message.data.allSubtasksExpanded : true;
        if (message.data.settings) {
          const settingsManager = getService(SERVICES.SETTINGS_MANAGER);
          if (settingsManager) {
            settingsManager.saveSettings(message.data.settings);
          }
        }
        eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
      }
    }
  }
  handleFullSync(message) {
    if (message.clientId && message.clientId === this.clientId) {
      return;
    }
    if (message.filename === this.currentFilename) {
      const appState2 = this._getAppState();
      const dataManager = this._getDataManager();
      const remoteTimestamp = message.timestamp || message.data?.timestamp || 0;
      const localTimestamp = dataManager?._lastSyncTimestamp || 0;
      if (remoteTimestamp < localTimestamp && localTimestamp > 0) {
        console.log(`Ignoring older sync (remote: ${remoteTimestamp}, local: ${localTimestamp})`);
        return;
      }
      const currentData = JSON.stringify(appState2.documents);
      const newData = JSON.stringify(message.data.documents || []);
      if (currentData !== newData) {
        if (dataManager) {
          dataManager._lastSyncTimestamp = remoteTimestamp;
        }
        const wasConnected = this.isConnected;
        this.isConnected = false;
        appState2.documents = message.data.documents || [];
        appState2.currentDocumentId = message.data.currentDocumentId || (appState2.documents.length > 0 ? appState2.documents[0].id : "document-1");
        appState2.groupStates = message.data.groupStates || {};
        appState2.subtaskStates = message.data.subtaskStates || {};
        appState2.allSubtasksExpanded = message.data.allSubtasksExpanded !== void 0 ? message.data.allSubtasksExpanded : true;
        if (message.data.settings) {
          const settingsManager = getService(SERVICES.SETTINGS_MANAGER);
          if (settingsManager) {
            settingsManager.saveSettings(message.data.settings);
          }
        }
        eventBus.emit(EVENTS.DATA.SAVE_REQUESTED, true);
        eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
        setTimeout(() => {
          this.isConnected = wasConnected;
        }, 100);
      }
    }
  }
  handleRemoteChange(message) {
    if (message.filename === this.currentFilename && this.app && this.app.undoRedoManager) {
      this.app.undoRedoManager.applyRemoteChange(message.change);
    }
  }
  handleRemoteUndo(message) {
    if (message.filename === this.currentFilename && this.app && this.app.undoRedoManager) {
      this.app.undoRedoManager.handleRemoteUndo(message.changeId);
    }
  }
  handleRemoteRedo(message) {
    if (message.filename === this.currentFilename && this.app && this.app.undoRedoManager) {
      this.app.undoRedoManager.handleRemoteRedo(message.changeId);
    }
  }
  joinFile(filename) {
    if (!this.isConnected || !this.clientId) {
      console.warn("WebSocket not connected, cannot join file");
      return;
    }
    this.currentFilename = filename;
    this.send({
      type: "join_file",
      filename
    });
  }
  leaveFile(filename) {
    if (!this.isConnected || !this.clientId) {
      return;
    }
    this.send({
      type: "leave_file",
      filename
    });
    if (this.currentFilename === filename) {
      this.currentFilename = null;
    }
  }
  sendChange(change) {
    if (!this.isConnected || !this.clientId || !this.currentFilename) {
      this.pendingChanges.push(change);
      return;
    }
    this.send({
      type: "change",
      filename: this.currentFilename,
      change
    });
  }
  sendUndo(changeId) {
    if (!this.isConnected || !this.currentFilename) {
      return;
    }
    this.send({
      type: "undo",
      filename: this.currentFilename,
      changeId
    });
  }
  sendRedo(changeId) {
    if (!this.isConnected || !this.currentFilename) {
      return;
    }
    this.send({
      type: "redo",
      filename: this.currentFilename,
      changeId
    });
  }
  send(message) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn("WebSocket not ready, queuing message");
      this.pendingChanges.push(message);
    }
  }
  flushPendingChanges() {
    while (this.pendingChanges.length > 0) {
      const change = this.pendingChanges.shift();
      if (change.type === "change") {
        this.sendChange(change.change);
      } else {
        this.send(change);
      }
    }
  }
  disconnect() {
    if (this.currentFilename) {
      this.leaveFile(this.currentFilename);
    }
    if (this.ws) {
      this.ws.close();
    }
  }
}
class UndoRedoManager {
  constructor() {
    this.undoStack = [];
    this.redoStack = [];
    this.maxStackSize = 100;
    this.isApplyingChange = false;
    this.remoteChanges = /* @__PURE__ */ new Map();
    this.currentBufferFilename = null;
    this.snapshotInterval = 10;
    this.maxSnapshots = 5;
    this.bufferSaveTimer = null;
    this.changeCounter = 0;
    this.snapshots = [];
  }
  /**
   * Get AppState service
   */
  _getAppState() {
    return getService(SERVICES.APP_STATE);
  }
  /**
   * Get documents array from AppState
   */
  _getDocuments() {
    const appState2 = this._getAppState();
    return appState2.documents || [];
  }
  /**
   * Get DataManager service 
   */
  _getDataManager() {
    return getService(SERVICES.DATA_MANAGER);
  }
  /**
   * Record a change for undo/redo
   */
  recordChange(change) {
    if (this.isApplyingChange) {
      return;
    }
    this.redoStack = [];
    this.changeCounter++;
    if (this.changeCounter % this.snapshotInterval === 0) {
      this.createSnapshot();
    }
    this.undoStack.push(change);
    if (this.undoStack.length > this.maxStackSize) {
      this.undoStack.shift();
    }
    console.log("Change recorded:", change.type, "at path:", change.path, "undoStack length:", this.undoStack.length, "changeCounter:", this.changeCounter);
    this._debouncedSaveBuffer();
    const syncManager = getService(SERVICES.SYNC_MANAGER);
    if (syncManager) {
      syncManager.sendChange(change);
    }
  }
  /**
   * Create a change object for a data modification
   */
  createChange(type, path, value, oldValue = null) {
    return {
      type,
      // 'set', 'delete', 'add', 'insert'
      path,
      // Array of keys/indices to navigate to the target
      value,
      oldValue,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
  /**
   * Get element counts for logging
   */
  _getElementCounts() {
    const documents = this._getDocuments();
    if (!documents || documents.length === 0) {
      return { documents: 0, groups: 0, items: 0 };
    }
    let documentCount = documents.length;
    let groupCount = 0;
    let itemCount = 0;
    documents.forEach((document2) => {
      const groups = document2.groups || [];
      groupCount += groups.length;
      groups.forEach((group) => {
        const items = group.items || [];
        itemCount += items.length;
      });
    });
    return { documents: documentCount, groups: groupCount, items: itemCount };
  }
  /**
   * Apply a change to the data
   */
  applyChange(change) {
    this.isApplyingChange = true;
    try {
      const { type, path, value } = change;
      if (!path || path.length === 0) {
        console.error("Invalid change path:", change);
        this.isApplyingChange = false;
        return false;
      }
      const beforeCounts = this._getElementCounts();
      console.log(`[UNDO/REDO] Applying change: ${type} at path:`, path);
      console.log(`[UNDO/REDO] Before counts - Documents: ${beforeCounts.documents}, Groups: ${beforeCounts.groups}, Items: ${beforeCounts.items}`);
      console.log(`[UNDO/REDO] Change value:`, value);
      if (path.length > 0) {
        try {
          const documents = this._getDocuments();
          let target2 = documents;
          let pathStartIndex2 = path[0] === "documents" ? 1 : 0;
          const navigationEnd2 = type === "insert" || type === "add" ? path.length : path.length - 1;
          for (let i = pathStartIndex2; i < navigationEnd2 && i < path.length; i++) {
            const key = path[i];
            if (Array.isArray(target2)) {
              const index = parseInt(key);
              if (!isNaN(index) && index >= 0 && index < target2.length) {
                target2 = target2[index];
                if (Array.isArray(target2)) {
                  console.log(`[UNDO/REDO] Array at path[${i}]: length=${target2.length}, indices=[0..${target2.length - 1}]`);
                }
              }
            } else if (typeof target2 === "object" && target2 !== null) {
              target2 = target2[key];
              if (Array.isArray(target2)) {
                console.log(`[UNDO/REDO] Array at path[${i}]: length=${target2.length}, indices=[0..${target2.length - 1}]`);
              }
            }
          }
        } catch (e) {
        }
      }
      let pages;
      try {
        const appState2 = this.serviceLocator.get(SERVICES.APP_STATE);
        pages = appState2.documents;
      } catch (e) {
        const documents = this._getDocuments();
        if (documents && documents.length > 0) {
        } else {
          console.error("[UNDO] Cannot access documents");
          return false;
        }
      }
      let target = pages;
      let pathStartIndex = 0;
      if (path[0] === "documents") {
        pathStartIndex = 1;
      }
      const isArrayOperation = type === "insert" || type === "add";
      const navigationEnd = isArrayOperation ? path.length - 1 : path.length - 1;
      for (let i = pathStartIndex; i < navigationEnd; i++) {
        const key = path[i];
        if (target === null || target === void 0) {
          console.error("Cannot navigate path - target is null/undefined at key:", key, "path so far:", path.slice(0, i + 1));
          this.isApplyingChange = false;
          return false;
        }
        if (Array.isArray(target)) {
          const index = parseInt(key);
          if (isNaN(index) || index < 0 || index >= target.length) {
            console.error("Invalid array index:", index, "for array length:", target.length, "at path:", path.slice(0, i + 1));
            this.isApplyingChange = false;
            return false;
          }
          target = target[index];
        } else if (typeof target === "object" && target !== null) {
          if (target[key] === void 0) {
            const nextKey = path[i + 1];
            if (typeof nextKey === "number" || !isNaN(parseInt(nextKey)) && i + 2 < path.length) {
              target[key] = [];
            } else {
              target[key] = {};
            }
          }
          target = target[key];
        } else {
          console.error("Cannot navigate path - target is not object/array at key:", key, "target type:", typeof target);
          this.isApplyingChange = false;
          return false;
        }
      }
      let lastKey;
      let arrayTarget = null;
      if (isArrayOperation) {
        lastKey = path[path.length - 1];
        if (typeof target === "object" && target !== null) {
          if (!target[lastKey]) {
            target[lastKey] = [];
          }
          arrayTarget = target[lastKey];
          if (!Array.isArray(arrayTarget)) {
            console.error("Target for insert/add is not an array:", typeof arrayTarget, arrayTarget);
            this.isApplyingChange = false;
            return false;
          }
        } else {
          console.error("Cannot find array at key:", lastKey, "in target:", target);
          this.isApplyingChange = false;
          return false;
        }
      } else {
        lastKey = path[path.length - 1];
        if (target === null || target === void 0) {
          console.error("Cannot apply change - target is null/undefined at final key:", lastKey);
          this.isApplyingChange = false;
          return false;
        }
      }
      if (change.oldValue === null || change.oldValue === void 0) {
        if (isArrayOperation) {
        } else if (Array.isArray(target)) {
          const index = parseInt(lastKey);
          if (!isNaN(index) && index >= 0 && index < target.length) {
            change.oldValue = target[index];
          }
        } else if (typeof target === "object" && target !== null) {
          change.oldValue = target[lastKey];
        }
      }
      switch (type) {
        case "set":
          if (Array.isArray(target)) {
            const index = parseInt(lastKey);
            if (!isNaN(index)) {
              if (index >= 0 && index < target.length) {
                target[index] = value;
              } else {
                console.warn("Set index out of bounds:", index, "array length:", target.length, "- element may have been deleted");
              }
            } else {
              console.error("Invalid array index for set:", lastKey);
            }
          } else if (typeof target === "object" && target !== null) {
            target[lastKey] = value;
          }
          break;
        case "delete":
          if (Array.isArray(target)) {
            const index = parseInt(lastKey);
            if (!isNaN(index)) {
              if (index >= 0 && index < target.length) {
                target.splice(index, 1);
              } else {
                console.warn("Delete index out of bounds:", index, "array length:", target.length, "- element may have already been deleted");
              }
            } else {
              console.error("Invalid array index for delete:", lastKey);
            }
          } else if (typeof target === "object" && target !== null) {
            delete target[lastKey];
          }
          break;
        case "add":
          if (arrayTarget && Array.isArray(arrayTarget)) {
            arrayTarget.push(value);
            console.log("Added element, array length now:", arrayTarget.length);
          } else if (typeof target === "object" && target !== null) {
            target[lastKey] = value;
          }
          break;
        case "insert":
          if (arrayTarget && Array.isArray(arrayTarget)) {
            if (!value) {
              console.error("Cannot insert - no value provided");
              this.isApplyingChange = false;
              return false;
            }
            let insertIndex;
            if (change.insertIndex !== void 0 && change.insertIndex !== null) {
              insertIndex = change.insertIndex;
              console.log(`[UNDO/REDO] Using stored insertIndex: ${insertIndex}, array length: ${arrayTarget.length}`);
            } else {
              const parsed = parseInt(lastKey);
              insertIndex = isNaN(parsed) ? arrayTarget.length : parsed;
              console.log(`[UNDO/REDO] No insertIndex in change, using fallback: ${insertIndex} (parsed=${parsed}, lastKey=${lastKey}), array length: ${arrayTarget.length}`);
            }
            const validIndex = Math.max(0, Math.min(insertIndex, arrayTarget.length));
            console.log(`[UNDO/REDO] Inserting at validIndex: ${validIndex}, array length before: ${arrayTarget.length}, path:`, path);
            const valueToInsert = JSON.parse(JSON.stringify(value));
            if (validIndex < arrayTarget.length && arrayTarget[validIndex] && valueToInsert && valueToInsert.text && arrayTarget[validIndex].text === valueToInsert.text && valueToInsert.type && arrayTarget[validIndex].type === valueToInsert.type) {
              console.warn(`[UNDO/REDO] Element already exists at index ${validIndex}, skipping insert`);
            } else {
              arrayTarget.splice(validIndex, 0, valueToInsert);
              console.log(`[UNDO/REDO] Inserted element at index: ${validIndex}, array length now: ${arrayTarget.length}, element text: ${valueToInsert?.text || "N/A"}`);
            }
          } else {
            console.error("Cannot insert - target is not an array:", typeof arrayTarget, arrayTarget);
            this.isApplyingChange = false;
            return false;
          }
          break;
        case "move":
          if (!change.sourcePath || !change.targetPath) {
            console.error("Move operation missing source or target path");
            this.isApplyingChange = false;
            return false;
          }
          let pages2 = this._getDocuments();
          let sourceTarget = pages2;
          const sourcePath = change.sourcePath;
          let sourcePathStart = sourcePath[0] === "documents" ? 1 : 0;
          for (let i = sourcePathStart; i < sourcePath.length - 1; i++) {
            const key = sourcePath[i];
            if (Array.isArray(sourceTarget)) {
              sourceTarget = sourceTarget[parseInt(key)];
            } else if (typeof sourceTarget === "object" && sourceTarget !== null) {
              sourceTarget = sourceTarget[key];
            }
            if (sourceTarget === null || sourceTarget === void 0) {
              console.error("Cannot navigate to source for move");
              this.isApplyingChange = false;
              return false;
            }
          }
          const sourceLastKey = sourcePath[sourcePath.length - 1];
          let sourceArray = null;
          let sourceIndex = -1;
          if (Array.isArray(sourceTarget)) {
            sourceIndex = parseInt(sourceLastKey);
            if (isNaN(sourceIndex) || sourceIndex < 0 || sourceIndex >= sourceTarget.length) {
              console.error("Invalid source index for move:", sourceIndex);
              this.isApplyingChange = false;
              return false;
            }
            sourceArray = sourceTarget;
          } else if (typeof sourceTarget === "object" && sourceTarget !== null) {
            sourceArray = sourceTarget[sourceLastKey];
            if (!Array.isArray(sourceArray)) {
              console.error("Source is not an array for move");
              this.isApplyingChange = false;
              return false;
            }
            if (value) {
              sourceIndex = sourceArray.findIndex(
                (el) => el && value && el.text === value.text && el.type === value.type
              );
              if (sourceIndex === -1 && change.sourceIndex !== void 0) {
                sourceIndex = change.sourceIndex;
              }
            } else if (change.sourceIndex !== void 0) {
              sourceIndex = change.sourceIndex;
            }
            if (sourceIndex === -1 || sourceIndex < 0 || sourceIndex >= sourceArray.length) {
              console.error("Cannot find element in source array for move");
              this.isApplyingChange = false;
              return false;
            }
          }
          const movedElement = sourceArray.splice(sourceIndex, 1)[0];
          if (!movedElement) {
            console.error("No element found at source index for move");
            this.isApplyingChange = false;
            return false;
          }
          pages2 = this._getDocuments();
          if (!pages2 || pages2.length === 0) {
            console.error("[UNDO] Cannot access documents");
            this.isApplyingChange = false;
            return false;
          }
          let targetArray = pages2;
          const targetArrayPath = change.targetPath;
          let targetPathStart = targetArrayPath[0] === "documents" ? 1 : 0;
          for (let i = targetPathStart; i < targetArrayPath.length; i++) {
            const key = targetArrayPath[i];
            if (Array.isArray(targetArray)) {
              targetArray = targetArray[parseInt(key)];
            } else if (typeof targetArray === "object" && targetArray !== null) {
              if (!targetArray[key]) {
                targetArray[key] = [];
              }
              targetArray = targetArray[key];
            }
            if (targetArray === null || targetArray === void 0) {
              console.error("Cannot navigate to target for move");
              this.isApplyingChange = false;
              sourceArray.splice(sourceIndex, 0, movedElement);
              return false;
            }
          }
          if (!Array.isArray(targetArray)) {
            console.error("Target is not an array for move");
            this.isApplyingChange = false;
            sourceArray.splice(sourceIndex, 0, movedElement);
            return false;
          }
          const targetIndex = change.targetIndex !== void 0 ? change.targetIndex : targetArray.length;
          const validTargetIndex = Math.max(0, Math.min(targetIndex, targetArray.length));
          targetArray.splice(validTargetIndex, 0, movedElement);
          console.log("Moved item from index", sourceIndex, "to index", validTargetIndex);
          break;
      }
      const afterCounts = this._getElementCounts();
      console.log(`[UNDO/REDO] After counts - Documents: ${afterCounts.documents}, Groups: ${afterCounts.groups}, Items: ${afterCounts.items}`);
      if (type === "delete" && afterCounts.items > beforeCounts.items) {
        console.warn(`[UNDO/REDO] WARNING: Delete operation increased item count. Before: ${beforeCounts.items}, After: ${afterCounts.items}`);
      } else if (type === "insert" && afterCounts.items < beforeCounts.items) {
        console.warn(`[UNDO/REDO] WARNING: Insert operation decreased item count. Before: ${beforeCounts.items}, After: ${afterCounts.items}`);
      }
      const validation = this.validateState();
      if (!validation.valid) {
        console.error("[UNDO/REDO] State validation failed after applying change:", validation.errors);
        if (validation.warnings.length > 0) {
          console.warn("[UNDO/REDO] State validation warnings:", validation.warnings);
        }
      } else if (validation.warnings.length > 0) {
        console.warn("[UNDO/REDO] State validation warnings:", validation.warnings);
      }
      console.log("[UNDO/REDO] Change applied successfully");
      this.isApplyingChange = false;
      return true;
    } catch (error) {
      console.error("Error applying change:", error, "change:", change);
      this.isApplyingChange = false;
      return false;
    }
  }
  /**
   * Apply a remote change (from another device)
   */
  applyRemoteChange(change) {
    this.remoteChanges.set(change.changeId, change);
    this.applyChange(change);
    change.isRemote = true;
    this.undoStack.push(change);
    if (this.undoStack.length > this.maxStackSize) {
      this.undoStack.shift();
    }
  }
  /**
   * Undo the last change
   */
  undo() {
    if (this.undoStack.length === 0) {
      console.log("[UNDO] Undo stack is empty");
      return false;
    }
    const beforeCounts = this._getElementCounts();
    console.log(`[UNDO] Starting undo operation. Stack size: ${this.undoStack.length}`);
    console.log(`[UNDO] Before counts - Documents: ${beforeCounts.documents}, Groups: ${beforeCounts.groups}, Items: ${beforeCounts.items}`);
    const change = this.undoStack.pop();
    console.log(`[UNDO] Popped change: ${change.type} at path:`, change.path);
    if (change.isPartOfMove && change.moveChangeId) {
      console.log(`[UNDO] Change is part of move operation: ${change.moveChangeId}`);
      const pairedChangeType = change.type === "insert" ? "delete" : "insert";
      let pairedChangeIndex = -1;
      for (let i = this.undoStack.length - 1; i >= 0; i--) {
        const candidate = this.undoStack[i];
        if (candidate.isPartOfMove && candidate.moveChangeId === change.moveChangeId && candidate.type === pairedChangeType) {
          pairedChangeIndex = i;
          break;
        }
      }
      if (pairedChangeIndex !== -1) {
        const pairedChange = this.undoStack.splice(pairedChangeIndex, 1)[0];
        console.log(`[UNDO] Found paired ${pairedChangeType} change, undoing move as atomic operation`);
        const insertChange = change.type === "insert" ? change : pairedChange;
        const deleteChange = change.type === "delete" ? change : pairedChange;
        const elementToFind = insertChange.value;
        if (!elementToFind) {
          console.error("[UNDO] Cannot undo move - insert change has no element value");
          this.undoStack.push(pairedChange);
          this.undoStack.push(change);
          return false;
        }
        if (!elementToFind.id) {
          console.error("[UNDO] Cannot undo move - item has no ID. All items should have IDs.");
          this.undoStack.push(pairedChange);
          this.undoStack.push(change);
          return false;
        }
        const found = this.findElementById(elementToFind.id);
        if (!found) {
          console.error(`[UNDO] Element with ID ${elementToFind.id} not found - may have been deleted`);
          this.undoStack.push(pairedChange);
          this.undoStack.push(change);
          return false;
        }
        const pages = this._getDocuments();
        const pageIndex = pages.findIndex((p) => p.id === found.pageId);
        if (pageIndex === -1) {
          console.error(`[UNDO] Page ${found.pageId} not found`);
          this.undoStack.push(pairedChange);
          this.undoStack.push(change);
          return false;
        }
        const page = pages[pageIndex];
        const binIndex = page.groups.findIndex((b) => b.id === found.binId);
        if (binIndex === -1) {
          console.error(`[UNDO] Bin ${found.binId} not found`);
          this.undoStack.push(pairedChange);
          this.undoStack.push(change);
          return false;
        }
        let deletePath;
        if (found.isChild) {
          deletePath = ["documents", pageIndex, "groups", binIndex, "items", found.elementIndex, "children", found.childIndex];
        } else {
          deletePath = ["documents", pageIndex, "groups", binIndex, "items", found.elementIndex];
        }
        console.log(`[UNDO] Found element by ID, deleting from path:`, deletePath);
        const deleteResult = this.applyChange({
          type: "delete",
          path: deletePath,
          value: null,
          oldValue: elementToFind
        });
        if (!deleteResult) {
          console.error("[UNDO] Failed to delete element found by ID");
          this.undoStack.push(pairedChange);
          this.undoStack.push(change);
          return false;
        }
        let deleteInversePath = [...deleteChange.path];
        let deleteInsertIndex = null;
        if (deleteInversePath.length > 0 && typeof deleteInversePath[deleteInversePath.length - 1] === "number") {
          deleteInsertIndex = deleteInversePath.pop();
        } else {
          deleteInsertIndex = deleteChange.deleteIndex !== void 0 ? deleteChange.deleteIndex : 0;
        }
        const insertBackResult = this.applyChange({
          type: "insert",
          path: deleteInversePath,
          value: deleteChange.oldValue,
          oldValue: null,
          insertIndex: deleteInsertIndex
        });
        if (!insertBackResult) {
          console.error("[UNDO] Failed to insert element back at original position in move undo");
          this.applyChange({
            type: "insert",
            path: insertInversePath.slice(0, -1),
            value: insertChange.value,
            oldValue: null,
            insertIndex: insertElementIndex
          });
          this.undoStack.push(pairedChange);
          this.undoStack.push(change);
          return false;
        }
        this.redoStack.push(deleteChange);
        this.redoStack.push(insertChange);
        if (this.redoStack.length > this.maxStackSize * 2) {
          this.redoStack.shift();
          this.redoStack.shift();
        }
        const dataManager2 = this._getDataManager();
        if (dataManager2) {
          dataManager2.saveData();
        }
        eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
        const afterCounts2 = this._getElementCounts();
        console.log(`[UNDO] After counts - Documents: ${afterCounts2.documents}, Groups: ${afterCounts2.groups}, Items: ${afterCounts2.items}`);
        console.log(`[UNDO] Move operation undone successfully as atomic operation`);
        return true;
      } else {
        console.warn(`[UNDO] Move operation detected but paired change not found, undoing single change`);
      }
    }
    let inverseType;
    let inversePath = [...change.path];
    let inverseInsertIndex = null;
    if (change.type === "delete") {
      inverseType = "insert";
      if (inversePath.length > 0 && typeof inversePath[inversePath.length - 1] === "number") {
        inverseInsertIndex = inversePath.pop();
        console.log(`[UNDO] Extracted insertIndex ${inverseInsertIndex} from delete path`);
      } else {
        inverseInsertIndex = change.insertIndex !== void 0 ? change.insertIndex : change.deleteIndex !== void 0 ? change.deleteIndex : 0;
        console.log(`[UNDO] Using stored index: insertIndex=${change.insertIndex}, deleteIndex=${change.deleteIndex}, final=${inverseInsertIndex}`);
      }
    } else if (change.type === "insert") {
      inverseType = "delete";
      const arrayPath = [...inversePath];
      const pages = this._getDocuments();
      let arrayTarget = pages;
      if (arrayPath[0] === "documents") {
        for (let i = 1; i < arrayPath.length; i++) {
          const key = arrayPath[i];
          if (Array.isArray(arrayTarget)) {
            arrayTarget = arrayTarget[parseInt(key)];
          } else if (typeof arrayTarget === "object" && arrayTarget !== null) {
            arrayTarget = arrayTarget[key];
          }
          if (arrayTarget === null || arrayTarget === void 0) {
            console.error("Cannot navigate to array for undo insert");
            return false;
          }
        }
        if (Array.isArray(arrayTarget)) {
          let elementIndex = -1;
          const elementToFind = change.value;
          if (!elementToFind) {
            console.error("Cannot undo insert - no element value stored in change");
            return false;
          }
          if (change.insertIndex !== void 0 && change.insertIndex !== null) {
            const storedIndex = change.insertIndex;
            if (storedIndex >= 0 && storedIndex < arrayTarget.length) {
              const elementAtIndex = arrayTarget[storedIndex];
              if (elementAtIndex && elementToFind && elementAtIndex.text === elementToFind.text && elementAtIndex.type === elementToFind.type) {
                elementIndex = storedIndex;
                console.log("Found element at stored insertIndex:", storedIndex);
              } else {
                console.log("Element at stored index does not match:", {
                  storedIndex,
                  atIndex: elementAtIndex ? { text: elementAtIndex.text, type: elementAtIndex.type } : null,
                  lookingFor: { text: elementToFind.text, type: elementToFind.type }
                });
              }
            } else {
              console.log("Stored insertIndex out of bounds:", storedIndex, "array length:", arrayTarget.length);
            }
          }
          if (elementIndex === -1) {
            const elementToFind2 = change.value;
            console.log("[UNDO] Searching for element:", {
              text: elementToFind2?.text,
              type: elementToFind2?.type,
              completed: elementToFind2?.completed,
              repeats: elementToFind2?.repeats
            });
            const searchText = elementToFind2?.text ? elementToFind2.text.trim() : "";
            const searchType = elementToFind2?.type || "";
            elementIndex = arrayTarget.findIndex((el) => {
              if (!el || !elementToFind2) return false;
              const elText = el.text ? el.text.trim() : "";
              if (elText === searchText && el.type === searchType) {
                return true;
              }
              return false;
            });
            if (elementIndex !== -1) {
              const matches = arrayTarget.map((el, idx) => ({ el, idx })).filter(({ el }) => {
                if (!el || !elementToFind2) return false;
                const elText = el.text ? el.text.trim() : "";
                return elText === searchText && el.type === searchType;
              });
              console.log(`[UNDO] Found ${matches.length} matching element(s)`);
              if (matches.length > 1) {
                const bestMatch = matches.reduce((best, current) => {
                  let bestScore = 0;
                  let currentScore = 0;
                  if (best.el.completed === elementToFind2.completed) bestScore++;
                  if (best.el.repeats === elementToFind2.repeats) bestScore++;
                  if (best.el.timeAllocated === elementToFind2.timeAllocated) bestScore++;
                  if (best.el.id === elementToFind2.id) bestScore += 10;
                  if (current.el.completed === elementToFind2.completed) currentScore++;
                  if (current.el.repeats === elementToFind2.repeats) currentScore++;
                  if (current.el.timeAllocated === elementToFind2.timeAllocated) currentScore++;
                  if (current.el.id === elementToFind2.id) currentScore += 10;
                  return currentScore > bestScore ? current : best;
                });
                elementIndex = bestMatch.idx;
                console.log(`[UNDO] Selected best match at index ${elementIndex} with score`);
              }
            } else {
              console.warn("[UNDO] No exact text/type match found. Available items:");
              arrayTarget.forEach((el, idx) => {
                const elText = el?.text ? el.text.trim() : "";
                const matchesText = elText === searchText;
                const matchesType = el?.type === searchType;
                if (matchesText || matchesType) {
                  console.warn(`  Index ${idx}: text="${elText}" (match: ${matchesText}), type="${el?.type}" (match: ${matchesType})`);
                }
              });
            }
          }
          if (elementIndex !== -1) {
            inversePath.push(elementIndex);
            console.log(`[UNDO] Found element to delete at index ${elementIndex}`);
          } else {
            console.error("[UNDO] Cannot find item to delete in array.");
            console.error("[UNDO] Item being searched:", change.value);
            console.error("[UNDO] Array length:", arrayTarget.length);
            console.error("[UNDO] Available items:", arrayTarget.map((el, idx) => ({
              index: idx,
              text: el?.text,
              type: el?.type,
              completed: el?.completed
            })));
            console.log("[UNDO] Attempting recovery from snapshot...");
            const recoveryResult = this.recoverFromSnapshot(this.changeCounter - 1);
            if (recoveryResult && recoveryResult.success) {
              console.log(`[UNDO] Recovery successful from change index ${recoveryResult.recoveredFrom}`);
              let pages2;
              try {
                const appState2 = this.serviceLocator.get(SERVICES.APP_STATE);
                pages2 = appState2.documents;
              } catch (e) {
                pages2 = this._getDocuments();
                if (!pages2 || pages2.length === 0) {
                  console.error("[UNDO] Cannot access documents");
                  this.undoStack.push(change);
                  return false;
                }
              }
              let recoveredArrayTarget = pages2;
              for (let i = 1; i < arrayPath.length; i++) {
                const key = arrayPath[i];
                if (Array.isArray(recoveredArrayTarget)) {
                  recoveredArrayTarget = recoveredArrayTarget[parseInt(key)];
                } else if (typeof recoveredArrayTarget === "object" && recoveredArrayTarget !== null) {
                  recoveredArrayTarget = recoveredArrayTarget[key];
                }
              }
              if (Array.isArray(recoveredArrayTarget)) {
                const elementToFind2 = change.value;
                elementIndex = recoveredArrayTarget.findIndex((el) => {
                  if (!el || !elementToFind2) return false;
                  return el.text === elementToFind2.text && el.type === elementToFind2.type;
                });
                if (elementIndex !== -1) {
                  inversePath.push(elementIndex);
                  console.log(`[UNDO] Found element after recovery at index ${elementIndex}`);
                } else {
                  console.error("[UNDO] Still cannot find element after recovery. ABORTING UNDO.");
                  this.undoStack.push(change);
                  return false;
                }
              } else {
                console.error("[UNDO] Array not found after recovery. ABORTING UNDO.");
                this.undoStack.push(change);
                return false;
              }
            } else {
              console.error("[UNDO] Recovery failed or no snapshot available. ABORTING UNDO to prevent accidental element deletion");
              this.undoStack.push(change);
              return false;
            }
          }
        } else {
          console.error("Target is not an array for undo insert:", typeof arrayTarget);
          return false;
        }
      } else {
        console.error("Invalid path for undo insert:", arrayPath);
        return false;
      }
    } else if (change.type === "move") {
      inverseType = "move";
      inversePath = change.sourcePath ? [...change.sourcePath] : [...change.path];
    } else if (change.type === "set") {
      inverseType = "set";
    } else if (change.type === "add") {
      inverseType = "delete";
      const arrayPath = [...inversePath];
      const pages = this._getDocuments();
      let arrayTarget = pages;
      if (arrayPath[0] === "documents") {
        for (let i = 1; i < arrayPath.length; i++) {
          const key = arrayPath[i];
          if (Array.isArray(arrayTarget)) {
            arrayTarget = arrayTarget[parseInt(key)];
          } else if (typeof arrayTarget === "object" && arrayTarget !== null) {
            arrayTarget = arrayTarget[key];
          }
        }
        if (Array.isArray(arrayTarget)) {
          const elementIndex = arrayTarget.findIndex((el) => el === change.value || el && change.value && el.text === change.value.text && el.type === change.value.type);
          if (elementIndex !== -1) {
            inversePath.push(elementIndex);
          }
        }
      }
    } else {
      inverseType = change.type;
    }
    let inverseValue;
    if (inverseType === "insert") {
      inverseValue = change.oldValue;
    } else if (inverseType === "delete") {
      inverseValue = null;
    } else if (inverseType === "set") {
      inverseValue = change.oldValue;
    } else {
      inverseValue = change.oldValue;
    }
    const inverseChange = {
      type: inverseType,
      path: inversePath,
      value: inverseValue,
      oldValue: change.value,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      changeId: change.changeId ? `${change.changeId}-undo` : `${Date.now()}-${Math.random()}`
    };
    if (inverseType === "insert" && inverseInsertIndex !== null) {
      inverseChange.insertIndex = inverseInsertIndex;
      console.log(`[UNDO] Set insertIndex on inverse change: ${inverseInsertIndex}`);
    } else if (inverseType === "insert") {
      console.warn(`[UNDO] WARNING: inverseType is insert but inverseInsertIndex is null!`);
    }
    if (inverseType === "delete" && inversePath.length > 0) {
      try {
        const pages = this._getDocuments();
        let target = pages;
        let pathStartIndex = inversePath[0] === "documents" ? 1 : 0;
        for (let i = pathStartIndex; i < inversePath.length - 1; i++) {
          const key = inversePath[i];
          if (Array.isArray(target)) {
            const index = parseInt(key);
            if (isNaN(index) || index < 0 || index >= target.length) {
              console.error(`[UNDO] Invalid array index during validation: ${index} at path step ${i}`);
              const recoveryResult = this.recoverFromSnapshot(this.changeCounter - 1);
              if (recoveryResult && recoveryResult.success) {
                console.log(`[UNDO] Recovered from snapshot, retrying...`);
                target = pages;
                for (let j = pathStartIndex; j < inversePath.length - 1; j++) {
                  const retryKey = inversePath[j];
                  if (Array.isArray(target)) {
                    target = target[parseInt(retryKey)];
                  } else if (typeof target === "object" && target !== null) {
                    target = target[retryKey];
                  }
                }
              } else {
                this.undoStack.push(change);
                return false;
              }
            } else {
              target = target[index];
            }
          } else if (typeof target === "object" && target !== null) {
            target = target[key];
          }
        }
        const lastKey = inversePath[inversePath.length - 1];
        if (Array.isArray(target)) {
          const index = parseInt(lastKey);
          if (isNaN(index) || index < 0 || index >= target.length) {
            console.warn(`[UNDO] Element index ${index} out of bounds (array length: ${target.length})`);
            const recoveryResult = this.recoverFromSnapshot(this.changeCounter - 1);
            if (!recoveryResult || !recoveryResult.success) {
              console.error("[UNDO] Cannot validate element existence and recovery failed");
              this.undoStack.push(change);
              return false;
            }
          }
        }
      } catch (error) {
        console.error("[UNDO] Error validating element existence:", error);
        const recoveryResult = this.recoverFromSnapshot(this.changeCounter - 1);
        if (!recoveryResult || !recoveryResult.success) {
          this.undoStack.push(change);
          return false;
        }
      }
    }
    console.log(`[UNDO] Applying inverse change: ${inverseType} at path:`, inversePath);
    const applied = this.applyChange(inverseChange);
    if (!applied) {
      console.error("[UNDO] Failed to apply undo change:", inverseChange);
      if (inverseType === "delete") {
        console.log("[UNDO] Attempting recovery after failed delete...");
        const recoveryResult = this.recoverFromSnapshot(this.changeCounter - 1);
        if (recoveryResult && recoveryResult.success) {
          console.log("[UNDO] Recovery successful, retrying undo...");
          return this.undo();
        }
      }
      this.undoStack.push(change);
      return false;
    }
    const afterCounts = this._getElementCounts();
    console.log(`[UNDO] After counts - Documents: ${afterCounts.documents}, Groups: ${afterCounts.groups}, Items: ${afterCounts.items}`);
    this.redoStack.push(change);
    if (this.redoStack.length > this.maxStackSize) {
      this.redoStack.shift();
    }
    const syncManager = getService(SERVICES.SYNC_MANAGER);
    if (!change.isRemote && syncManager) {
      syncManager.sendUndo(change.changeId);
    }
    const dataManager = this._getDataManager();
    if (dataManager) {
      dataManager.saveData();
    }
    eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
    console.log(`[UNDO] Undo applied successfully: ${change.type} at path:`, change.path);
    return true;
  }
  /**
   * Redo the last undone change
   */
  redo() {
    if (this.redoStack.length === 0) {
      console.log("Redo stack is empty");
      return false;
    }
    const change = this.redoStack.pop();
    console.log(`[REDO] Popped change: ${change.type} at path:`, change.path);
    if (change.isPartOfMove && change.moveChangeId) {
      console.log(`[REDO] Change is part of move operation: ${change.moveChangeId}`);
      const pairedChangeType = change.type === "insert" ? "delete" : "insert";
      let pairedChangeIndex = -1;
      for (let i = this.redoStack.length - 1; i >= 0; i--) {
        const candidate = this.redoStack[i];
        if (candidate.isPartOfMove && candidate.moveChangeId === change.moveChangeId && candidate.type === pairedChangeType) {
          pairedChangeIndex = i;
          break;
        }
      }
      if (pairedChangeIndex !== -1) {
        const pairedChange = this.redoStack.splice(pairedChangeIndex, 1)[0];
        console.log(`[REDO] Found paired ${pairedChangeType} change, redoing move as atomic operation`);
        const deleteChange = change.type === "delete" ? change : pairedChange;
        const insertChange = change.type === "insert" ? change : pairedChange;
        const deleteResult = this.applyChange(deleteChange);
        if (!deleteResult) {
          console.error("[REDO] Failed to delete element from original position in move redo");
          this.redoStack.push(pairedChange);
          this.redoStack.push(change);
          return false;
        }
        const insertResult = this.applyChange(insertChange);
        if (!insertResult) {
          console.error("[REDO] Failed to insert element at new position in move redo");
          const deleteInversePath = [...deleteChange.path];
          const deleteInsertIndex = deleteChange.deleteIndex !== void 0 ? deleteChange.deleteIndex : deleteInversePath.length > 0 && typeof deleteInversePath[deleteInversePath.length - 1] === "number" ? deleteInversePath.pop() : 0;
          this.applyChange({
            type: "insert",
            path: deleteInversePath,
            value: deleteChange.oldValue,
            oldValue: null,
            insertIndex: deleteInsertIndex
          });
          this.redoStack.push(pairedChange);
          this.redoStack.push(change);
          return false;
        }
        this.undoStack.push(deleteChange);
        this.undoStack.push(insertChange);
        if (this.undoStack.length > this.maxStackSize * 2) {
          this.undoStack.shift();
          this.undoStack.shift();
        }
        eventBus.emit(EVENTS.DATA.SAVE_REQUESTED);
        eventBus.emit("app:render-requested");
        console.log(`[REDO] Move operation redone successfully as atomic operation`);
        return true;
      } else {
        console.warn(`[REDO] Move operation detected but paired change not found, redoing single change`);
      }
    }
    this.applyChange(change);
    this.undoStack.push(change);
    if (this.undoStack.length > this.maxStackSize) {
      this.undoStack.shift();
    }
    const syncManager = getService(SERVICES.SYNC_MANAGER);
    if (!change.isRemote && syncManager) {
      syncManager.sendRedo(change.changeId);
    }
    const dataManager = this._getDataManager();
    if (dataManager) {
      dataManager.saveData();
    }
    eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
    console.log("Redo applied:", change.type, "at path:", change.path);
    return true;
  }
  /**
   * Handle remote undo
   */
  handleRemoteUndo(changeId) {
    for (let i = this.undoStack.length - 1; i >= 0; i--) {
      const change = this.undoStack[i];
      if (change.changeId === changeId && !change.undone) {
        change.undone = true;
        this.undo();
        break;
      }
    }
  }
  /**
   * Handle remote redo
   */
  handleRemoteRedo(changeId) {
    for (let i = this.redoStack.length - 1; i >= 0; i--) {
      const change = this.redoStack[i];
      if (change.changeId === changeId && change.undone) {
        change.undone = false;
        this.redo();
        break;
      }
    }
  }
  /**
   * Clear undo/redo stacks
   */
  clear() {
    this.undoStack = [];
    this.redoStack = [];
    this.remoteChanges.clear();
    this.changeCounter = 0;
    this.snapshots = [];
    if (this.currentBufferFilename) {
      this._debouncedSaveBuffer();
    }
  }
  /**
   * Diagnose undo/redo issues
   */
  diagnoseUndoIssue() {
    const issues = [];
    const stackInfo = {
      undoSize: this.undoStack.length,
      redoSize: this.redoStack.length
    };
    this.undoStack.forEach((change, index) => {
      if (!change.type) {
        issues.push({
          type: "missing_type",
          location: `undoStack[${index}]`,
          description: "Change object missing type property"
        });
      }
      if (!change.path || !Array.isArray(change.path)) {
        issues.push({
          type: "invalid_path",
          location: `undoStack[${index}]`,
          description: "Change object missing or invalid path property"
        });
      }
      if (change.path && Array.isArray(change.path) && change.path.length > 0) {
        try {
          const pages = this._getDocuments();
          let target = pages;
          let pathStartIndex = change.path[0] === "documents" ? 1 : 0;
          const navigationEnd = change.type === "insert" || change.type === "add" ? change.path.length : change.path.length - 1;
          for (let i = pathStartIndex; i < navigationEnd; i++) {
            const key = change.path[i];
            if (target === null || target === void 0) {
              issues.push({
                type: "path_not_found",
                location: `undoStack[${index}]`,
                description: `Path navigation failed at index ${i} (key: ${key}). Path: ${change.path.join(" -> ")}`
              });
              break;
            }
            if (Array.isArray(target)) {
              const index2 = parseInt(key);
              if (isNaN(index2) || index2 < 0 || index2 >= target.length) {
                issues.push({
                  type: "invalid_array_index",
                  location: `undoStack[${index2}]`,
                  description: `Array index ${index2} out of bounds (array length: ${target.length}) at path step ${i}`
                });
                break;
              }
              target = target[index2];
            } else if (typeof target === "object" && target !== null) {
              if (target[key] === void 0) {
                issues.push({
                  type: "missing_property",
                  location: `undoStack[${index}]`,
                  description: `Property '${key}' not found in object at path step ${i}`
                });
                break;
              }
              target = target[key];
            } else {
              issues.push({
                type: "invalid_target_type",
                location: `undoStack[${index}]`,
                description: `Target is not object/array at path step ${i} (type: ${typeof target})`
              });
              break;
            }
          }
          if (change.type === "delete" && change.path.length > 0) {
            const lastKey = change.path[change.path.length - 1];
            if (Array.isArray(target)) {
              const index2 = parseInt(lastKey);
              if (!isNaN(index2) && (index2 < 0 || index2 >= target.length)) {
                issues.push({
                  type: "element_not_found",
                  location: `undoStack[${index2}]`,
                  description: `Element at index ${index2} does not exist (array length: ${target.length})`
                });
              }
            }
          }
        } catch (error) {
          issues.push({
            type: "path_validation_error",
            location: `undoStack[${index}]`,
            description: `Error validating path: ${error.message}`
          });
        }
      }
    });
    this.redoStack.forEach((change, index) => {
      if (!change.type) {
        issues.push({
          type: "missing_type",
          location: `redoStack[${index}]`,
          description: "Change object missing type property"
        });
      }
      if (!change.path || !Array.isArray(change.path)) {
        issues.push({
          type: "invalid_path",
          location: `redoStack[${index}]`,
          description: "Change object missing or invalid path property"
        });
      }
    });
    return {
      valid: issues.length === 0,
      issues,
      stackInfo
    };
  }
  /**
   * Find an item by its ID across all documents, groups, and children
   * This is the professional way to locate items for undo/redo
   */
  findElementById(elementId) {
    const pages = this._getDocuments();
    if (!elementId || !pages || pages.length === 0) return null;
    for (const page of pages) {
      if (!page || !page.groups) continue;
      for (const bin of page.groups) {
        if (!bin || !bin.items) continue;
        const itemIndex = ItemHierarchy.buildItemIndex(bin.items);
        for (let i = 0; i < bin.items.length; i++) {
          const element = bin.items[i];
          if (element && element.id === elementId) {
            return {
              element,
              pageId: page.id,
              binId: bin.id,
              elementIndex: i,
              isChild: false,
              childIndex: null
            };
          }
          if (element) {
            const childItems = ItemHierarchy.getChildItems(element, itemIndex);
            for (let j = 0; j < childItems.length; j++) {
              const child = childItems[j];
              if (child && child.id === elementId) {
                return {
                  element: child,
                  pageId: page.id,
                  binId: bin.id,
                  elementIndex: i,
                  isChild: true,
                  childIndex: j
                };
              }
            }
          }
        }
      }
    }
    return null;
  }
  /**
   * Validate current state integrity
   */
  validateState() {
    const errors = [];
    const warnings = [];
    const pages = this._getDocuments();
    if (!pages || pages.length === 0) {
      errors.push("documents are not available");
      return {
        valid: false,
        errors,
        warnings
      };
    }
    if (!Array.isArray(pages)) {
      errors.push("documents is not an array");
      return {
        valid: false,
        errors,
        warnings
      };
    }
    pages.forEach((page, pageIndex) => {
      if (!page) {
        errors.push(`Page at index ${pageIndex} is null or undefined`);
        return;
      }
      if (!page.groups) {
        warnings.push(`Document ${page.id || pageIndex} does not have a groups array`);
        return;
      }
      if (!Array.isArray(page.groups)) {
        errors.push(`Document ${page.id || pageIndex} groups is not an array`);
        return;
      }
      page.groups.forEach((bin, binIndex) => {
        if (!bin) {
          errors.push(`Group at documents[${pageIndex}].groups[${binIndex}] is null or undefined`);
          return;
        }
        if (!bin.items) {
          warnings.push(`Group ${bin.id || binIndex} in document ${page.id || pageIndex} does not have an items array`);
          return;
        }
        if (!Array.isArray(bin.items)) {
          errors.push(`Group ${bin.id || binIndex} in document ${page.id || pageIndex} items is not an array`);
          return;
        }
        bin.items.forEach((element, elementIndex) => {
          if (element === null || element === void 0) {
            errors.push(`Item at documents[${pageIndex}].groups[${binIndex}].items[${elementIndex}] is null or undefined`);
          } else {
            if (element.type === void 0 || element.type === null) {
              warnings.push(`Element at documents[${pageIndex}].groups[${binIndex}].items[${elementIndex}] is missing type property`);
            }
          }
        });
      });
    });
    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
  /**
   * Get path to an element in the data structure
   */
  getElementPath(pageId, binId, elementIndex, childIndex = null) {
    const path = ["documents"];
    const appState2 = this._getAppState();
    const pages = appState2.documents || [];
    const pageIndex = pages.findIndex((p) => p.id === pageId);
    if (pageIndex === -1) return null;
    path.push(pageIndex);
    path.push("groups");
    const page = pages[pageIndex];
    const binIndex = page.groups ? page.groups.findIndex((b) => b.id === binId) : -1;
    if (binIndex === -1) return null;
    path.push(binIndex);
    path.push("items");
    if (childIndex !== null) {
      path.push(elementIndex);
      path.push("children");
      path.push(childIndex);
    } else {
      path.push(elementIndex);
    }
    return path;
  }
  /**
   * Helper: Record element property change
   */
  recordElementPropertyChange(pageId, binId, elementIndex, property, newValue, oldValue, childIndex = null, itemIndex = null) {
    const path = this.getElementPath(pageId, binId, elementIndex, childIndex);
    if (!path) {
      console.error("Failed to get element path for:", { pageId, binId, elementIndex, childIndex });
      return;
    }
    if (itemIndex !== null) {
      path.push("items");
      path.push(itemIndex);
      path.push(property);
    } else if (childIndex !== null) {
      path.push(property);
    } else {
      path.push(property);
    }
    const change = this.createChange("set", path, newValue, oldValue);
    change.changeId = `${Date.now()}-${Math.random()}`;
    console.log("Recording property change:", property, "from", oldValue, "to", newValue, "path:", path);
    this.recordChange(change);
  }
  /**
   * Helper: Record element addition
   */
  recordElementAdd(pageId, binId, elementIndex, element) {
    const path = this.getElementPath(pageId, binId, elementIndex);
    if (!path) return;
    path.pop();
    const change = this.createChange("insert", path, element, null);
    change.changeId = `${Date.now()}-${Math.random()}`;
    change.insertIndex = elementIndex;
    this.recordChange(change);
  }
  /**
   * Helper: Record element deletion
   */
  recordElementDelete(pageId, binId, elementIndex, element) {
    const path = this.getElementPath(pageId, binId, elementIndex);
    if (!path) return;
    const elementCopy = JSON.parse(JSON.stringify(element));
    const change = this.createChange("delete", path, null, elementCopy);
    change.changeId = `${Date.now()}-${Math.random()}`;
    change.deleteIndex = elementIndex;
    this.recordChange(change);
  }
  /**
   * Helper: Record element move
   */
  recordElementMove(sourcePageId, sourceBinId, sourceElementIndex, targetPageId, targetBinId, targetElementIndex, element) {
    const sourcePath = this.getElementPath(sourcePageId, sourceBinId, sourceElementIndex);
    const targetPath = this.getElementPath(targetPageId, targetBinId, targetElementIndex);
    if (!sourcePath || !targetPath) return;
    targetPath.pop();
    const changeId = `${Date.now()}-${Math.random()}`;
    const elementCopyForDelete = JSON.parse(JSON.stringify(element));
    const elementCopyForInsert = JSON.parse(JSON.stringify(element));
    const deleteChange = this.createChange("delete", sourcePath, null, elementCopyForDelete);
    deleteChange.changeId = `${changeId}-delete`;
    deleteChange.isPartOfMove = true;
    deleteChange.moveChangeId = changeId;
    deleteChange.deleteIndex = sourceElementIndex;
    this.recordChange(deleteChange);
    const insertChange = this.createChange("insert", targetPath, elementCopyForInsert, null);
    insertChange.changeId = `${changeId}-insert`;
    insertChange.insertIndex = targetElementIndex;
    insertChange.isPartOfMove = true;
    insertChange.moveChangeId = changeId;
    this.recordChange(insertChange);
  }
  /**
   * Helper: Record child element reorder within same parent
   */
  recordChildReorder(pageId, binId, parentElementIndex, sourceChildIndex, targetChildIndex, childElement) {
    const path = this.getElementPath(pageId, binId, parentElementIndex);
    if (!path) return;
    path.push("children");
    const changeId = `${Date.now()}-${Math.random()}`;
    const sourcePath = [...path, sourceChildIndex];
    const deleteChange = this.createChange("delete", sourcePath, null, childElement);
    deleteChange.changeId = `${changeId}-delete`;
    this.recordChange(deleteChange);
    const insertChange = this.createChange("insert", path, childElement, null);
    insertChange.changeId = `${changeId}-insert`;
    insertChange.insertIndex = targetChildIndex;
    this.recordChange(insertChange);
  }
  /**
   * Helper: Record bin addition
   */
  recordBinAdd(pageId, binIndex, bin) {
    const pages = this._getDocuments();
    const pageIndex = pages.findIndex((p) => p.id === pageId);
    if (pageIndex === -1) return;
    const path = ["documents", pageIndex, "groups"];
    const change = this.createChange("insert", path, bin, null);
    change.changeId = `${Date.now()}-${Math.random()}`;
    change.insertIndex = binIndex;
    this.recordChange(change);
  }
  /**
   * Helper: Record bin deletion
   */
  recordBinDelete(pageId, binId, bin) {
    const pages = this._getDocuments();
    const pageIndex = pages.findIndex((p) => p.id === pageId);
    if (pageIndex === -1) return;
    const page = pages[pageIndex];
    const binIndex = page.groups ? page.groups.findIndex((b) => b.id === binId) : -1;
    if (binIndex === -1) return;
    const path = ["documents", pageIndex, "groups", binIndex];
    const change = this.createChange("delete", path, null, bin);
    change.changeId = `${Date.now()}-${Math.random()}`;
    this.recordChange(change);
  }
  /**
   * Helper: Record page addition
   */
  recordPageAdd(pageIndex, page) {
    const path = ["documents"];
    const change = this.createChange("insert", path, page, null);
    change.changeId = `${Date.now()}-${Math.random()}`;
    change.insertIndex = pageIndex;
    this.recordChange(change);
  }
  /**
   * Helper: Record page deletion
   */
  recordPageDelete(pageId, page) {
    const pages = this._getDocuments();
    const pageIndex = pages.findIndex((p) => p.id === pageId);
    if (pageIndex === -1) return;
    const path = ["documents", pageIndex];
    const change = this.createChange("delete", path, null, page);
    change.changeId = `${Date.now()}-${Math.random()}`;
    this.recordChange(change);
  }
  /**
   * Get buffer filename for a given file
   */
  getBufferFilename(filename) {
    if (!filename) return null;
    const baseName = filename.replace(/\.json$/, "");
    return `${baseName}-buffer.json`;
  }
  /**
   * Create a snapshot of current state
   */
  createSnapshot() {
    const pages = this._getDocuments();
    if (!pages || pages.length === 0) {
      console.warn("[BUFFER] Cannot create snapshot - documents not available");
      return null;
    }
    const snapshot = {
      changeIndex: this.changeCounter,
      data: JSON.parse(JSON.stringify(pages)),
      // Deep copy
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
    this.snapshots.push(snapshot);
    console.log(`[BUFFER] Created snapshot at change index ${this.changeCounter}, total snapshots: ${this.snapshots.length}`);
    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots = this.snapshots.slice(-this.maxSnapshots);
      console.log(`[BUFFER] Pruned snapshots, keeping last ${this.maxSnapshots}`);
    }
    return snapshot;
  }
  /**
   * Save buffer to server (debounced)
   */
  _debouncedSaveBuffer() {
    if (this.bufferSaveTimer) {
      clearTimeout(this.bufferSaveTimer);
    }
    this.bufferSaveTimer = setTimeout(() => {
      this.saveBuffer().catch((error) => {
        console.error("[BUFFER] Failed to save buffer:", error);
      });
    }, 500);
  }
  /**
   * Save buffer to server
   */
  async saveBuffer() {
    if (!this.currentBufferFilename) {
      console.log("[BUFFER] No current buffer filename, skipping save");
      return;
    }
    const bufferFilename = this.getBufferFilename(this.currentBufferFilename);
    if (!bufferFilename) {
      console.warn("[BUFFER] Cannot generate buffer filename");
      return;
    }
    const buffer = {
      undoStack: this.undoStack,
      redoStack: this.redoStack,
      snapshots: this.snapshots,
      lastChangeIndex: this.changeCounter,
      lastModified: (/* @__PURE__ */ new Date()).toISOString()
    };
    try {
      const response = await fetch("/files/buffer/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          filename: bufferFilename,
          buffer
        })
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      if (result.success) {
        console.log(`[BUFFER] Buffer saved: ${bufferFilename}`);
      } else {
        throw new Error(result.error || "Failed to save buffer");
      }
    } catch (error) {
      console.error("[BUFFER] Error saving buffer:", error);
      throw error;
    }
  }
  /**
   * Load buffer from server
   */
  async loadBuffer(filename) {
    if (!filename) {
      console.log("[BUFFER] No filename provided, skipping buffer load");
      return;
    }
    const bufferFilename = this.getBufferFilename(filename);
    if (!bufferFilename) {
      console.warn("[BUFFER] Cannot generate buffer filename");
      return;
    }
    try {
      const encodedFilename = encodeURIComponent(bufferFilename);
      const response = await fetch(`/files/buffer/${encodedFilename}`);
      if (!response.ok) {
        if (response.status === 404) {
          console.log(`[BUFFER] Buffer file not found: ${bufferFilename} (first time opening?)`);
          this.currentBufferFilename = filename;
          this.undoStack = [];
          this.redoStack = [];
          this.snapshots = [];
          this.changeCounter = 0;
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      if (result.success) {
        const buffer = result.buffer || {};
        this.undoStack = buffer.undoStack || [];
        this.redoStack = buffer.redoStack || [];
        this.snapshots = buffer.snapshots || [];
        this.changeCounter = buffer.lastChangeIndex || 0;
        this.currentBufferFilename = filename;
        console.log(`[BUFFER] Buffer loaded: ${bufferFilename} (undo: ${this.undoStack.length}, redo: ${this.redoStack.length}, snapshots: ${this.snapshots.length})`);
      } else {
        console.log(`[BUFFER] Buffer file not found or invalid: ${bufferFilename}`);
        this.currentBufferFilename = filename;
        this.undoStack = [];
        this.redoStack = [];
        this.snapshots = [];
        this.changeCounter = 0;
      }
    } catch (error) {
      console.error("[BUFFER] Error loading buffer:", error);
      this.currentBufferFilename = filename;
      this.undoStack = [];
      this.redoStack = [];
      this.snapshots = [];
      this.changeCounter = 0;
    }
  }
  /**
   * Recover from snapshot
   */
  recoverFromSnapshot(targetChangeIndex) {
    if (!this.snapshots || this.snapshots.length === 0) {
      console.warn("[RECOVERY] No snapshots available for recovery");
      return { success: false, recoveredFrom: null, replayedChanges: 0 };
    }
    let bestSnapshot = null;
    for (let i = this.snapshots.length - 1; i >= 0; i--) {
      const snapshot = this.snapshots[i];
      if (snapshot.changeIndex <= targetChangeIndex) {
        bestSnapshot = snapshot;
        break;
      }
    }
    if (!bestSnapshot) {
      console.warn(`[RECOVERY] No snapshot found before change index ${targetChangeIndex}`);
      return { success: false, recoveredFrom: null, replayedChanges: 0 };
    }
    console.log(`[RECOVERY] Found snapshot at change index ${bestSnapshot.changeIndex}, restoring state...`);
    const appState2 = this._getAppState();
    appState2.documents = JSON.parse(JSON.stringify(bestSnapshot.data));
    let replayedCount = 0;
    for (let i = 0; i < this.undoStack.length; i++) {
      this.undoStack[i];
    }
    console.log(`[RECOVERY] Restored state from snapshot at change index ${bestSnapshot.changeIndex}`);
    console.log(`[RECOVERY] Replayed ${replayedCount} changes`);
    return {
      success: true,
      recoveredFrom: bestSnapshot.changeIndex,
      replayedChanges: replayedCount
    };
  }
  /**
   * Set current file and load its buffer
   */
  async setCurrentFile(filename) {
    if (this.currentBufferFilename && this.currentBufferFilename !== filename) {
      await this.saveBuffer().catch((error) => {
        console.warn("[BUFFER] Failed to save buffer for previous file:", error);
      });
    }
    await this.loadBuffer(filename);
  }
}
class TimeTracker {
  constructor() {
    this.activeTimers = /* @__PURE__ */ new Map();
    this.timeLogs = this.loadTimeLogs();
    this.storageKey = "twodo-time-logs";
  }
  /**
   * Get AppState service
   */
  _getAppState() {
    return getService(SERVICES.APP_STATE);
  }
  /**
   * Get DataManager service
   */
  _getDataManager() {
    return getService(SERVICES.DATA_MANAGER);
  }
  loadTimeLogs() {
    return StorageUtils.get(this.storageKey) || {};
  }
  saveTimeLogs() {
    StorageUtils.set(this.storageKey, this.timeLogs);
  }
  /**
   * Start timer for an element
   */
  startTimer(pageId, binId, elementIndex) {
    const elementId = this.getElementId(pageId, binId, elementIndex);
    if (this.activeTimers.has(elementId)) {
      this.stopTimer(pageId, binId, elementIndex);
    }
    const timerData = {
      startTime: Date.now(),
      pageId,
      binId,
      elementIndex
    };
    this.activeTimers.set(elementId, timerData);
    eventBus.emit("timer:started", { pageId, binId, elementIndex });
  }
  /**
   * Stop timer for an element
   */
  stopTimer(pageId, binId, elementIndex) {
    const elementId = this.getElementId(pageId, binId, elementIndex);
    const timerData = this.activeTimers.get(elementId);
    if (!timerData) return 0;
    const duration = Date.now() - timerData.startTime;
    const seconds = Math.floor(duration / 1e3);
    this.logTime(pageId, binId, elementIndex, seconds);
    this.activeTimers.delete(elementId);
    eventBus.emit("timer:stopped", { pageId, binId, elementIndex, duration: seconds });
    return seconds;
  }
  /**
   * Log time for an element
   */
  logTime(pageId, binId, elementIndex, seconds) {
    const elementId = this.getElementId(pageId, binId, elementIndex);
    const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    if (!this.timeLogs[elementId]) {
      this.timeLogs[elementId] = [];
    }
    this.timeLogs[elementId].push({
      date: today,
      seconds,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
    const appState2 = this._getAppState();
    const page = appState2.documents.find((p) => p.id === pageId);
    const bin = page?.groups?.find((b) => b.id === binId);
    const items = bin?.items || [];
    if (bin) {
      bin.items = items;
    }
    const element = items?.[elementIndex];
    if (element) {
      if (!element.timeTracked) element.timeTracked = 0;
      element.timeTracked += seconds;
    }
    this.saveTimeLogs();
    const dataManager = this._getDataManager();
    if (dataManager) {
      dataManager.saveData();
    }
  }
  /**
   * Get total time for an element
   */
  getTotalTime(pageId, binId, elementIndex) {
    const elementId = this.getElementId(pageId, binId, elementIndex);
    const logs = this.timeLogs[elementId] || [];
    return logs.reduce((total, log) => total + log.seconds, 0);
  }
  /**
   * Get time for a date range
   */
  getTimeForRange(pageId, binId, elementIndex, startDate, endDate) {
    const elementId = this.getElementId(pageId, binId, elementIndex);
    const logs = this.timeLogs[elementId] || [];
    return logs.filter((log) => {
      const logDate = new Date(log.date);
      return logDate >= startDate && logDate <= endDate;
    }).reduce((total, log) => total + log.seconds, 0);
  }
  /**
   * Get active timer duration
   */
  getActiveTimerDuration(pageId, binId, elementIndex) {
    const elementId = this.getElementId(pageId, binId, elementIndex);
    const timerData = this.activeTimers.get(elementId);
    if (!timerData) return 0;
    return Math.floor((Date.now() - timerData.startTime) / 1e3);
  }
  /**
   * Check if timer is active
   */
  isTimerActive(pageId, binId, elementIndex) {
    const elementId = this.getElementId(pageId, binId, elementIndex);
    return this.activeTimers.has(elementId);
  }
  /**
   * Format seconds to readable string
   */
  formatTime(seconds) {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor(seconds % 3600 / 60);
    return `${hours}h ${minutes}m`;
  }
  /**
   * Get unique element ID
   */
  getElementId(pageId, binId, elementIndex) {
    return `${pageId}-${binId}-${elementIndex}`;
  }
  /**
   * Get time report for a page
   */
  getPageTimeReport(pageId, startDate, endDate) {
    const appState2 = this._getAppState();
    const page = appState2.documents.find((p) => p.id === pageId);
    if (!page) return null;
    const report = {
      totalTime: 0,
      byBin: {},
      byElement: {},
      byDate: {}
    };
    page.groups?.forEach((bin) => {
      const items = bin.items || [];
      bin.items = items;
      items.forEach((element, elementIndex) => {
        const time = this.getTimeForRange(pageId, bin.id, elementIndex, startDate, endDate);
        if (time > 0) {
          report.totalTime += time;
          report.byBin[bin.id] = (report.byBin[bin.id] || 0) + time;
          report.byElement[`${pageId}-${bin.id}-${elementIndex}`] = time;
          const elementId = this.getElementId(pageId, bin.id, elementIndex);
          const logs = this.timeLogs[elementId] || [];
          logs.forEach((log) => {
            if (new Date(log.date) >= startDate && new Date(log.date) <= endDate) {
              report.byDate[log.date] = (report.byDate[log.date] || 0) + log.seconds;
            }
          });
        }
      });
    });
    return report;
  }
}
class BinRenderer {
  constructor(app2) {
    this.app = app2;
  }
  /**
   * Render a bin element
   * @param {string} pageId - Page ID
   * @param {Object} bin - Bin data object
   * @returns {HTMLElement} The rendered bin element
   */
  renderBin(pageId, bin) {
    const binDiv = document.createElement("div");
    binDiv.className = "bin";
    binDiv.dataset.binId = bin.id;
    binDiv.dataset.pageId = pageId;
    binDiv.draggable = true;
    binDiv.dataset.dragType = "bin";
    if (this.app.visualSettingsManager) {
      const page = this.app.appState?.documents?.find((page2) => page2.id === pageId);
      const viewFormat = page?.format || "default";
      this.app.visualSettingsManager.applyVisualSettings(binDiv, "bin", bin.id, pageId, viewFormat);
    }
    if (!(bin.id in this.app.appState.groupStates)) {
      this.app.appState.groupStates[bin.id] = true;
    }
    const isExpanded = this.app.appState.groupStates[bin.id];
    const header = document.createElement("div");
    header.className = "bin-header";
    const binToggleId = `bin-toggle-${bin.id}`;
    const binContentId = `bin-content-${bin.id}`;
    const arrow = isExpanded ? "▼" : "▶";
    header.innerHTML = `
            <span class="bin-toggle-arrow" id="${binToggleId}" style="cursor: pointer; margin-right: 8px; color: #888888; user-select: none;">${arrow}</span>
            <div class="bin-title" data-bin-id="${bin.id}">${bin.title}</div>
        `;
    const binContent = document.createElement("div");
    binContent.id = binContentId;
    binContent.style.display = isExpanded ? "block" : "none";
    if (bin.maxHeight && bin.maxHeight > 0) {
      binContent.style.maxHeight = `${bin.maxHeight}px`;
      binContent.style.overflowY = "auto";
      binContent.style.overflowX = "hidden";
    }
    const elementsList = document.createElement("div");
    elementsList.className = "elements-list";
    elementsList.id = `elements-list-${bin.id}`;
    const items = bin.items || [];
    if (!Array.isArray(items)) {
      console.warn("bin.items is not an array:", items, "for bin:", bin.id);
    }
    bin.items = items;
    const rootItems = ItemHierarchy.getRootItems(items);
    rootItems.forEach((element, elIndex) => {
      const elementNode = this.app.renderService.getRenderer().renderElement(pageId, bin.id, element, elIndex);
      elementsList.appendChild(elementNode);
    });
    const addElementBtn = document.createElement("button");
    addElementBtn.className = "add-element-btn";
    addElementBtn.textContent = "+ Add Element";
    addElementBtn.onclick = () => {
      this.app.modalHandler.showAddElementModal(pageId, bin.id);
    };
    binDiv.addEventListener("click", () => {
      this.app.appState.activeGroupId = bin.id;
    });
    const titleElement = binDiv.querySelector(".bin-title");
    if (titleElement) {
      EventHelper.setupDoubleClick(
        titleElement,
        (e) => {
          titleElement.contentEditable = "true";
          titleElement.focus();
          const range = document.createRange();
          range.selectNodeContents(titleElement);
          const selection = window.getSelection();
          selection.removeAllRanges();
          selection.addRange(range);
        },
        this.app.appState.doubleClickDelay
      );
    }
    EventHelper.setupDoubleClick(
      binDiv,
      (e) => {
        if (e.target.closest(".bin-title")) {
          return;
        }
        handleBinMenu(e);
      },
      this.app.appState.doubleClickDelay
    );
    binContent.appendChild(elementsList);
    binContent.appendChild(addElementBtn);
    binDiv.appendChild(header);
    binDiv.appendChild(binContent);
    setTimeout(() => {
      if (this.app.eventBus) {
        this.app.eventBus.emit("bin:render", {
          binElement: binDiv,
          pageId,
          binData: bin
        });
      }
    }, 0);
    const toggleArrow = header.querySelector(`#${binToggleId}`);
    if (toggleArrow) {
      toggleArrow.addEventListener("click", (e) => {
        e.stopPropagation();
        const isCurrentlyExpanded = this.app.appState.groupStates[bin.id] !== false;
        this.app.appState.groupStates[bin.id] = !isCurrentlyExpanded;
        const content = document.getElementById(binContentId);
        if (content) {
          content.style.display = this.app.appState.groupStates[bin.id] ? "block" : "none";
        }
        toggleArrow.textContent = this.app.appState.groupStates[bin.id] ? "▼" : "▶";
        this.app.dataManager.saveData();
      });
    }
    if (titleElement) {
      titleElement.addEventListener("blur", (e) => {
        if (e.target.contentEditable === "true") {
          bin.title = e.target.textContent.trim() || "Untitled Bin";
          e.target.contentEditable = "false";
          this.app.dataManager.saveData();
        }
      });
      titleElement.addEventListener("keydown", (e) => {
        if (e.target.contentEditable === "true" && e.key === "Enter") {
          e.preventDefault();
          e.target.blur();
        }
      });
    }
    binDiv.addEventListener("dragstart", (e) => {
      if (e.target.closest("button") || e.target.closest("input")) {
        e.preventDefault();
        return;
      }
      const titleElement2 = e.target.closest(".bin-title");
      if (titleElement2 && titleElement2.contentEditable === "true") {
        e.preventDefault();
        return;
      }
      if (e.target.closest(".element")) {
        e.preventDefault();
        return;
      }
      e.dataTransfer.effectAllowed = "move";
      const dragPayload = {
        type: "bin",
        pageId,
        binId: bin.id
      };
      e.dataTransfer.setData("text/plain", JSON.stringify(dragPayload));
      this.app.appState.dragData = dragPayload;
      binDiv.classList.add("dragging");
      this.app.appState.isDragging = true;
      const trashIcon = document.getElementById("trash-icon");
      if (trashIcon) {
        trashIcon.style.display = "flex";
      }
    });
    binDiv.addEventListener("dragend", (e) => {
      binDiv.classList.remove("dragging");
      this.app.appState.isDragging = false;
      const trashIcon = document.getElementById("trash-icon");
      if (trashIcon) {
        trashIcon.style.display = "none";
        trashIcon.classList.remove("drag-over-trash");
        trashIcon.style.background = "rgba(220, 53, 69, 0.9)";
        trashIcon.style.transform = "scale(1)";
      }
      if (this.app.appState.autoScrollInterval) {
        clearInterval(this.app.appState.autoScrollInterval);
        this.app.appState.autoScrollInterval = null;
      }
      if (!e.dataTransfer.dropEffect || e.dataTransfer.dropEffect === "none") {
        setTimeout(() => {
          this.app.appState.dragData = null;
        }, 50);
      }
      document.querySelectorAll(".drag-over").forEach((el) => {
        el.classList.remove("drag-over");
      });
    });
    binDiv.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      const dragData = this.app.appState.dragData || (() => {
        try {
          return JSON.parse(e.dataTransfer.getData("text/plain") || "{}");
        } catch {
          return {};
        }
      })();
      if (dragData.type === "bin" && dragData.binId !== bin.id) {
        binDiv.classList.add("drag-over");
      } else if (dragData.type === "element") {
        binDiv.classList.add("drag-over");
      }
    });
    binDiv.addEventListener("dragleave", (e) => {
      if (!binDiv.contains(e.relatedTarget)) {
        binDiv.classList.remove("drag-over");
      }
    });
    binDiv.addEventListener("drop", (e) => {
      e.preventDefault();
      e.stopPropagation();
      binDiv.classList.remove("drag-over");
      let dragData = this.app.appState.dragData;
      if (!dragData) {
        try {
          const dataStr = e.dataTransfer.getData("text/plain");
          if (dataStr) {
            dragData = JSON.parse(dataStr);
          } else {
            console.error("No drag data available in bin drop");
            return;
          }
        } catch (err) {
          console.error("Failed to parse drag data:", err);
          return;
        }
      }
      if (dragData && dragData.type === "bin") {
        this.app.binManager.moveBin(dragData.pageId, dragData.binId, pageId, bin.id);
      } else if (dragData && dragData.type === "element") {
        if (dragData.isChild && dragData.parentElementIndex !== null) {
          const sourcePage = this.app.appState.documents.find((page) => page.id === dragData.pageId);
          const sourceBin = sourcePage?.groups?.find((bin2) => bin2.id === dragData.binId);
          if (sourceBin && sourceBin.items[dragData.parentElementIndex]) {
            if (bin.id === dragData.binId && pageId === dragData.pageId) {
              const targetIndex = dragData.parentElementIndex + 1;
              this.app.moveElement(
                dragData.pageId,
                dragData.binId,
                dragData.elementIndex,
                pageId,
                bin.id,
                targetIndex,
                dragData.isChild || false,
                dragData.parentElementIndex || null,
                dragData.childIndex || null
              );
            } else {
              this.app.moveElement(
                dragData.pageId,
                dragData.binId,
                dragData.elementIndex,
                pageId,
                bin.id,
                bin.items.length,
                dragData.isChild || false,
                dragData.parentElementIndex || null,
                dragData.childIndex || null
              );
            }
          } else {
            this.app.moveElement(
              dragData.pageId,
              dragData.binId,
              dragData.elementIndex,
              pageId,
              bin.id,
              bin.items.length,
              dragData.isChild || false,
              dragData.parentElementIndex || null,
              dragData.childIndex || null
            );
          }
        } else {
          this.app.moveElement(
            dragData.pageId,
            dragData.binId,
            dragData.elementIndex,
            pageId,
            bin.id,
            bin.items.length,
            dragData.isChild || false,
            dragData.parentElementIndex || null,
            dragData.childIndex || null
          );
        }
      }
      this.app.appState.dragData = null;
    });
    let dropIndicator = null;
    let dropTargetIndex = null;
    elementsList._dropIndicator = null;
    elementsList._dropTargetIndex = null;
    const clearAllDropIndicators = () => {
      document.querySelectorAll(".elements-list").forEach((list) => {
        if (list._dropIndicator) {
          list._dropIndicator.remove();
          list._dropIndicator = null;
          list._dropTargetIndex = null;
        }
      });
      document.querySelectorAll(".dropdown-content").forEach((content) => {
        if (content._dropIndicator) {
          content._dropIndicator.remove();
          content._dropIndicator = null;
          content._dropTargetIndex = null;
        }
      });
      document.querySelectorAll(".drop-indicator").forEach((indicator) => {
        indicator.remove();
      });
    };
    const updateDropIndicator = (e, elementsList2, bin2) => {
      const dragData = this.app.appState.dragData || (() => {
        try {
          return JSON.parse(e.dataTransfer.getData("text/plain") || "{}");
        } catch {
          return {};
        }
      })();
      if (dragData.type !== "element") {
        if (dropIndicator) {
          dropIndicator.remove();
          dropIndicator = null;
          dropTargetIndex = null;
          elementsList2._dropIndicator = null;
          elementsList2._dropTargetIndex = null;
        }
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = "move";
      const elements = Array.from(elementsList2.querySelectorAll(".element:not(.child-element)"));
      const mouseY = e.clientY;
      const elementsListRect = elementsList2.getBoundingClientRect();
      const relativeY = mouseY - elementsListRect.top;
      let insertIndex = bin2.items.length;
      let targetElement = null;
      for (let i = 0; i < elements.length; i++) {
        const elementRect = elements[i].getBoundingClientRect();
        const elementTop = elementRect.top - elementsListRect.top;
        const elementBottom = elementRect.bottom - elementsListRect.top;
        const elementMiddle = (elementTop + elementBottom) / 2;
        if (relativeY < elementMiddle) {
          const elementIndexStr = elements[i].dataset.elementIndex;
          if (elementIndexStr) {
            if (typeof elementIndexStr === "string" && elementIndexStr.includes("-")) {
              const parentIndex = parseInt(elementIndexStr.split("-")[0]);
              if (!isNaN(parentIndex)) {
                insertIndex = parentIndex;
                targetElement = elements[i];
              }
            } else {
              const elementIndex = parseInt(elementIndexStr);
              if (!isNaN(elementIndex)) {
                insertIndex = elementIndex;
                targetElement = elements[i];
              }
            }
          }
          break;
        }
      }
      if (targetElement === null && insertIndex >= bin2.items.length) {
        const addButton = elementsList2.querySelector(".add-element-btn");
        if (addButton) {
          targetElement = addButton;
        }
      }
      if (dropTargetIndex !== insertIndex || dropIndicator === null) {
        dropTargetIndex = insertIndex;
        clearAllDropIndicators();
        dropIndicator = null;
        dropIndicator = document.createElement("div");
        dropIndicator.className = "drop-indicator";
        dropIndicator.style.cssText = `
                    height: 2px;
                    background: #4a9eff;
                    margin: 4px 0;
                    border-radius: 1px;
                    pointer-events: none;
                    position: relative;
                    z-index: 1000;
                `;
        elementsList2._dropIndicator = dropIndicator;
        elementsList2._dropTargetIndex = insertIndex;
        if (targetElement && elementsList2.contains(targetElement) && targetElement.parentElement === elementsList2) {
          elementsList2.insertBefore(dropIndicator, targetElement);
        } else {
          elementsList2.appendChild(dropIndicator);
        }
      }
    };
    elementsList.addEventListener("dragover", (e) => {
      updateDropIndicator(e, elementsList, bin);
    });
    elementsList.addEventListener("dragleave", (e) => {
      if (!elementsList.contains(e.relatedTarget)) {
        if (dropIndicator) {
          dropIndicator.remove();
          dropIndicator = null;
          dropTargetIndex = null;
        }
      }
    });
    elementsList.addEventListener("drop", (e) => {
      e.preventDefault();
      e.stopPropagation();
      let dragData = this.app.appState.dragData;
      if (!dragData) {
        try {
          const dataStr = e.dataTransfer.getData("text/plain");
          if (dataStr) {
            dragData = JSON.parse(dataStr);
          } else {
            console.error("No drag data available in elements list drop");
            return;
          }
        } catch (err) {
          console.error("Failed to parse drag data:", err);
          return;
        }
      }
      if (dragData && dragData.type === "element") {
        if (elementsList._dropIndicator) {
          elementsList._dropIndicator.remove();
          elementsList._dropIndicator = null;
        }
        let targetIndex = bin.items.length;
        let targetElement = null;
        if (elementsList._dropTargetIndex !== null && elementsList._dropTargetIndex !== void 0) {
          targetIndex = elementsList._dropTargetIndex;
          elementsList._dropTargetIndex = null;
        } else {
          targetElement = e.target.closest(".element");
          if (targetElement) {
            const targetElementIndexStr = targetElement.dataset.elementIndex;
            if (targetElementIndexStr) {
              if (typeof targetElementIndexStr === "string" && targetElementIndexStr.includes("-")) {
                const targetParentIndex = parseInt(targetElementIndexStr.split("-")[0]);
                if (!isNaN(targetParentIndex)) {
                  targetIndex = targetParentIndex + 1;
                }
              } else {
                const targetElementIndex = parseInt(targetElementIndexStr);
                if (!isNaN(targetElementIndex)) {
                  targetIndex = targetElementIndex;
                }
              }
            }
          }
        }
        if (dragData.isChild && dragData.parentElementIndex !== null && !targetElement) {
          const sourcePage = this.app.appState.documents.find((page) => page.id === dragData.pageId);
          const sourceBin = sourcePage?.groups?.find((bin2) => bin2.id === dragData.binId);
          if (sourceBin && bin.id === dragData.binId && pageId === dragData.pageId && sourceBin.items[dragData.parentElementIndex]) {
            targetIndex = dragData.parentElementIndex + 1;
          }
        }
        this.app.moveElement(
          dragData.pageId,
          dragData.binId,
          dragData.elementIndex,
          pageId,
          bin.id,
          targetIndex,
          dragData.isChild || false,
          dragData.parentElementIndex || null,
          dragData.childIndex || null
        );
        document.querySelectorAll(".drag-over").forEach((el) => {
          el.classList.remove("drag-over");
        });
      }
      this.app.appState.dragData = null;
    });
    return binDiv;
  }
}
class TaskRenderer {
  constructor(app2) {
    this.app = app2;
  }
  /**
   * Render a task element
   * @param {HTMLElement} div - The element container div (already created with classes and drag handlers)
   * @param {string} pageId - Page ID
   * @param {string} binId - Bin ID
   * @param {Object} element - Element data
   * @param {number|string} elementIndex - Element index
   * @param {number} depth - Current nesting depth
   * @param {Function} renderChildren - Function to render children elements
   * @returns {void}
   */
  render(div, pageId, binId, element, elementIndex, depth, renderChildren) {
    const taskHeader = document.createElement("div");
    taskHeader.className = "task-header";
    const hasChildren = Array.isArray(element.childIds) && element.childIds.length > 0;
    const childrenToggleId = `children-toggle-${pageId}-${elementIndex}`;
    const childrenContentId = `children-content-${pageId}-${elementIndex}`;
    const taskTextSpan = document.createElement("span");
    taskTextSpan.className = "task-text";
    if (hasChildren) {
      const childrenStateKey = `${binId}-${elementIndex}`;
      if (!(childrenStateKey in this.app.appState.subtaskStates)) {
        this.app.appState.subtaskStates[childrenStateKey] = this.app.appState.allSubtasksExpanded;
      }
      const isExpanded = this.app.appState.subtaskStates[childrenStateKey];
      const initialArrow = isExpanded ? "▼" : "▶";
      const textFragment = this.app.parseLinks(element.text);
      const arrowSpan = document.createElement("span");
      arrowSpan.className = "subtask-arrow";
      arrowSpan.id = childrenToggleId;
      arrowSpan.textContent = initialArrow;
      taskTextSpan.appendChild(arrowSpan);
      taskTextSpan.appendChild(document.createTextNode(" "));
      taskTextSpan.appendChild(textFragment);
      taskTextSpan.onclick = (e) => {
        e.stopPropagation();
        const arrow = document.getElementById(childrenToggleId);
        const content = document.getElementById(childrenContentId);
        if (arrow && content) {
          this.app.appState.subtaskStates[childrenStateKey] = !this.app.appState.subtaskStates[childrenStateKey];
          const newState = this.app.appState.subtaskStates[childrenStateKey];
          content.style.display = newState ? "block" : "none";
          arrow.textContent = newState ? "▼" : "▶";
        }
      };
    } else {
      const textFragment = this.app.parseLinks(element.text);
      taskTextSpan.appendChild(textFragment);
      taskTextSpan.style.cursor = "text";
      taskTextSpan.addEventListener("click", (e) => {
        if (e.target.tagName === "A") {
          return;
        }
        e.stopPropagation();
        this.app.enableInlineEditing(taskTextSpan, pageId, binId, elementIndex, element);
      });
    }
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = element.completed;
    checkbox.onchange = (e) => {
      e.stopPropagation();
      this.app.toggleElement(pageId, binId, elementIndex);
    };
    checkbox.addEventListener("click", (e) => {
      e.stopPropagation();
    });
    checkbox.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
    checkbox.addEventListener("drop", (e) => {
      e.preventDefault();
      e.stopPropagation();
      let dragData = this.app.appState.dragData;
      if (!dragData) {
        try {
          const dataStr = e.dataTransfer.getData("text/plain");
          if (dataStr) {
            dragData = JSON.parse(dataStr);
          } else {
            console.error("No drag data available in checkbox drop");
            return;
          }
        } catch (err) {
          console.error("Failed to parse drag data:", err);
          return;
        }
      }
      if (dragData && dragData.type === "element") {
        const checkboxElement = checkbox.closest(".element");
        if (checkboxElement) {
          const checkboxPageId = checkboxElement.dataset.pageId;
          const actualBinId = checkboxElement.dataset.binId;
          const checkboxElementIndexStr = checkboxElement.dataset.elementIndex;
          let checkboxElementIndex = elementIndex;
          if (checkboxElementIndexStr) {
            if (typeof checkboxElementIndexStr === "string" && checkboxElementIndexStr.includes("-")) {
              checkboxElementIndex = parseInt(checkboxElementIndexStr.split("-")[0]);
            } else {
              checkboxElementIndex = parseInt(checkboxElementIndexStr);
            }
          }
          if (dragData.isChild && dragData.parentElementIndex !== null && dragData.childIndex !== null) {
            const sourcePage = this.app.appState.documents?.find((p) => p.id === dragData.pageId);
            const sourceBin = sourcePage?.groups?.find((b) => b.id === dragData.binId);
            const items = sourceBin?.items || [];
            if (sourceBin) {
              sourceBin.items = items;
            }
            const itemIndex = ItemHierarchy.buildItemIndex(items);
            const parentElement = ItemHierarchy.getRootItemAtIndex(items, dragData.parentElementIndex);
            const childItems = parentElement ? ItemHierarchy.getChildItems(parentElement, itemIndex) : [];
            const childElement = childItems[dragData.childIndex];
            if (parentElement && childElement) {
              if (!Array.isArray(parentElement.childIds)) parentElement.childIds = [];
              parentElement.childIds.splice(dragData.childIndex, 1);
              childElement.parentId = null;
              this.app.nestElement(
                dragData.pageId,
                dragData.binId,
                dragData.parentElementIndex,
                checkboxPageId,
                actualBinId,
                checkboxElementIndex,
                false,
                null,
                null,
                childElement
              );
            } else {
              this.app.nestElement(
                dragData.pageId,
                dragData.binId,
                dragData.elementIndex,
                checkboxPageId,
                actualBinId,
                checkboxElementIndex,
                dragData.isChild || false,
                dragData.parentElementIndex || null,
                dragData.childIndex || null
              );
            }
          } else {
            this.app.nestElement(
              dragData.pageId,
              dragData.binId,
              dragData.elementIndex,
              checkboxPageId,
              actualBinId,
              checkboxElementIndex,
              false,
              null,
              null
            );
          }
        }
      }
      this.app.appState.dragData = null;
    });
    taskHeader.appendChild(checkbox);
    taskHeader.appendChild(taskTextSpan);
    div.appendChild(taskHeader);
    let tooltipText = "";
    if (element.timeAllocated) {
      tooltipText += `Time: ${element.timeAllocated}`;
    }
    if (element.funModifier) {
      tooltipText += tooltipText ? ` | Fun: ${element.funModifier}` : `Fun: ${element.funModifier}`;
    }
    if (tooltipText) {
      div.addEventListener("mouseenter", () => {
        this.app.showTooltip(tooltipText);
      });
      div.addEventListener("mouseleave", () => {
        this.app.hideTooltip();
      });
    }
    if (hasChildren) {
      const childrenContainer = renderChildren(pageId, binId, element, elementIndex, depth);
      if (childrenContainer) {
        const contentDiv = childrenContainer.querySelector(".dropdown-content");
        if (contentDiv) {
          contentDiv.id = childrenContentId;
        }
        div.appendChild(childrenContainer);
      }
    }
  }
}
class HeaderRenderer {
  constructor(app2) {
    this.app = app2;
  }
  /**
   * Render a header element
   * @param {HTMLElement} div - The element container div (already created with classes and drag handlers)
   * @param {string} pageId - Page ID
   * @param {string} binId - Bin ID
   * @param {Object} element - Element data
   * @param {number|string} elementIndex - Element index
   * @param {number} depth - Current nesting depth
   * @param {Function} renderChildren - Function to render children elements
   * @returns {void}
   */
  render(div, pageId, binId, element, elementIndex, depth, renderChildren) {
    const headerText = document.createElement("div");
    headerText.className = "header-text";
    const headerTextFragment = this.app.parseLinks(element.text || "");
    headerText.appendChild(headerTextFragment);
    headerText.style.cursor = "text";
    headerText.addEventListener("click", (e) => {
      if (e.target.tagName === "A") {
        return;
      }
      e.stopPropagation();
      this.app.enableInlineEditing(headerText, pageId, binId, elementIndex, element);
    });
    div.appendChild(headerText);
    let tooltipText = "";
    if (element.timeAllocated) {
      tooltipText += `Time: ${element.timeAllocated}`;
    }
    if (element.funModifier) {
      tooltipText += tooltipText ? ` | Fun: ${element.funModifier}` : `Fun: ${element.funModifier}`;
    }
    if (tooltipText) {
      div.addEventListener("mouseenter", () => {
        this.app.showTooltip(tooltipText);
      });
      div.addEventListener("mouseleave", () => {
        this.app.hideTooltip();
      });
    }
    if (Array.isArray(element.childIds) && element.childIds.length > 0) {
      const childrenContainer = renderChildren(pageId, binId, element, elementIndex, depth);
      if (childrenContainer) {
        div.appendChild(childrenContainer);
      }
    }
  }
}
class HeaderCheckboxRenderer {
  constructor(app2) {
    this.app = app2;
  }
  /**
   * Render a header-checkbox element
   * @param {HTMLElement} div - The element container div (already created with classes and drag handlers)
   * @param {string} pageId - Page ID
   * @param {string} binId - Bin ID
   * @param {Object} element - Element data
   * @param {number|string} elementIndex - Element index
   * @param {number} depth - Current nesting depth
   * @param {Function} renderChildren - Function to render children elements
   * @returns {void}
   */
  render(div, pageId, binId, element, elementIndex, depth, renderChildren) {
    const headerCheckbox = document.createElement("input");
    headerCheckbox.type = "checkbox";
    headerCheckbox.checked = element.completed;
    headerCheckbox.onchange = (e) => {
      e.stopPropagation();
      this.app.toggleElement(pageId, binId, elementIndex);
    };
    headerCheckbox.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
    headerCheckbox.addEventListener("drop", (e) => {
      e.preventDefault();
      e.stopPropagation();
      let dragData = this.app.appState.dragData;
      if (!dragData) {
        try {
          const dataStr = e.dataTransfer.getData("text/plain");
          if (dataStr) {
            dragData = JSON.parse(dataStr);
          } else {
            console.error("No drag data available in checkbox drop");
            return;
          }
        } catch (err) {
          console.error("Failed to parse drag data:", err);
          return;
        }
      }
      if (dragData && dragData.type === "element") {
        const checkboxElement = headerCheckbox.closest(".element");
        if (checkboxElement) {
          const checkboxPageId = checkboxElement.dataset.pageId;
          const actualBinId = checkboxElement.dataset.binId;
          const checkboxElementIndexStr = checkboxElement.dataset.elementIndex;
          let checkboxElementIndex = elementIndex;
          if (checkboxElementIndexStr) {
            if (typeof checkboxElementIndexStr === "string" && checkboxElementIndexStr.includes("-")) {
              checkboxElementIndex = parseInt(checkboxElementIndexStr.split("-")[0]);
            } else {
              checkboxElementIndex = parseInt(checkboxElementIndexStr);
            }
          }
          if (dragData.isChild && dragData.parentElementIndex !== null && dragData.childIndex !== null) {
            const sourcePage = this.app.appState.documents?.find((p) => p.id === dragData.pageId);
            const sourceBin = sourcePage?.groups?.find((b) => b.id === dragData.binId);
            const items = sourceBin?.items || [];
            if (sourceBin) {
              sourceBin.items = items;
            }
            const itemIndex = ItemHierarchy.buildItemIndex(items);
            const parentElement = ItemHierarchy.getRootItemAtIndex(items, dragData.parentElementIndex);
            const childItems = parentElement ? ItemHierarchy.getChildItems(parentElement, itemIndex) : [];
            const childElement = childItems[dragData.childIndex];
            if (parentElement && childElement) {
              if (!Array.isArray(parentElement.childIds)) parentElement.childIds = [];
              parentElement.childIds.splice(dragData.childIndex, 1);
              childElement.parentId = null;
              this.app.nestElement(
                dragData.pageId,
                dragData.binId,
                dragData.parentElementIndex,
                checkboxPageId,
                actualBinId,
                checkboxElementIndex,
                false,
                null,
                null,
                childElement
              );
            } else {
              this.app.nestElement(
                dragData.pageId,
                dragData.binId,
                dragData.elementIndex,
                checkboxPageId,
                actualBinId,
                checkboxElementIndex,
                dragData.isChild || false,
                dragData.parentElementIndex || null,
                dragData.childIndex || null
              );
            }
          } else {
            this.app.nestElement(
              dragData.pageId,
              dragData.binId,
              dragData.elementIndex,
              checkboxPageId,
              actualBinId,
              checkboxElementIndex,
              false,
              null,
              null
            );
          }
        }
      }
      this.app.appState.dragData = null;
    });
    const headerText = document.createElement("span");
    headerText.className = "header-text";
    const headerTextFragment = this.app.parseLinks(element.text);
    headerText.appendChild(headerTextFragment);
    headerText.style.cursor = "text";
    headerText.addEventListener("click", (e) => {
      if (e.target.tagName === "A") {
        return;
      }
      e.stopPropagation();
      this.app.enableInlineEditing(headerText, pageId, binId, elementIndex, element);
    });
    div.appendChild(headerCheckbox);
    div.appendChild(headerText);
    headerCheckbox.addEventListener("click", (e) => {
      e.stopPropagation();
    });
    let tooltipText = "";
    if (element.timeAllocated) {
      tooltipText += `Time: ${element.timeAllocated}`;
    }
    if (element.funModifier) {
      tooltipText += tooltipText ? ` | Fun: ${element.funModifier}` : `Fun: ${element.funModifier}`;
    }
    if (tooltipText) {
      div.addEventListener("mouseenter", () => {
        this.app.showTooltip(tooltipText);
      });
      div.addEventListener("mouseleave", () => {
        this.app.hideTooltip();
      });
    }
    if (Array.isArray(element.childIds) && element.childIds.length > 0) {
      const childrenContainer = renderChildren(pageId, binId, element, elementIndex, depth);
      if (childrenContainer) {
        div.appendChild(childrenContainer);
      }
    }
  }
}
class MultiCheckboxRenderer {
  constructor(app2) {
    this.app = app2;
  }
  /**
   * Render a multi-checkbox element
   * @param {HTMLElement} div - The element container div (already created with classes and drag handlers)
   * @param {string} pageId - Page ID
   * @param {string} binId - Bin ID
   * @param {Object} element - Element data
   * @param {number|string} elementIndex - Element index
   * @param {number} depth - Current nesting depth
   * @param {Function} renderChildren - Function to render children elements
   * @returns {void}
   */
  render(div, pageId, binId, element, elementIndex, depth, renderChildren) {
    const itemsHtml = element.items.map((item, itemIndex) => {
      return `
        <div class="multi-checkbox-row" data-item-index="${itemIndex}">
        <input type="checkbox" ${item.completed ? "checked" : ""} 
        onchange="this.app.toggleElement('${pageId}', '${binId}', ${elementIndex}, null, ${itemIndex})">
        <span class="checkbox-label">${this.app.escapeHtml(item.text)}</span>
        ${element.items.length > 1 ? `<button onclick="app.removeMultiCheckboxItem('${pageId}', '${binId}', ${elementIndex}, ${itemIndex})" style="padding: 2px 6px; font-size: 11px; background: #e74c3c;">×</button>` : ""}
        </div>
        `;
    }).join("");
    div.innerHTML = `
        ${itemsHtml}
        <div class="multi-checkbox-controls">
        <button onclick="app.addMultiCheckboxItem('${pageId}', '${binId}', ${elementIndex})">+ Add</button>
        </div>
        `;
    element.items.forEach((item, itemIndex) => {
      const row = div.querySelector(`.multi-checkbox-row[data-item-index="${itemIndex}"]`);
      if (row) {
        const checkbox = row.querySelector('input[type="checkbox"]');
        if (checkbox) {
          checkbox.onchange = (e) => {
            e.stopPropagation();
            const pageId2 = checkbox.dataset.pageId;
            const elementIndex2 = parseInt(checkbox.dataset.elementIndex);
            const itemIndex2 = parseInt(checkbox.dataset.itemIndex);
            this.app.toggleElement(pageId2, binId, elementIndex2, null, itemIndex2);
          };
        }
        if (item.funModifier) {
          row.addEventListener("mouseenter", () => {
            this.app.showTooltip(`Fun: ${item.funModifier}`);
          });
          row.addEventListener("mouseleave", () => {
            this.app.hideTooltip();
          });
        }
      }
    });
    let tooltipText = "";
    if (element.timeAllocated) {
      tooltipText += `Time: ${element.timeAllocated}`;
    }
    if (element.funModifier) {
      tooltipText += tooltipText ? ` | Fun: ${element.funModifier}` : `Fun: ${element.funModifier}`;
    }
    if (tooltipText) {
      div.addEventListener("mouseenter", () => {
        this.app.showTooltip(tooltipText);
      });
      div.addEventListener("mouseleave", () => {
        this.app.hideTooltip();
      });
    }
    if (Array.isArray(element.childIds) && element.childIds.length > 0) {
      const childrenContainer = renderChildren(pageId, binId, element, elementIndex, depth);
      if (childrenContainer) {
        div.appendChild(childrenContainer);
      }
    }
  }
}
class AudioRenderer {
  constructor(app2) {
    this.app = app2;
  }
  /**
   * Render a audio element
   * @param {HTMLElement} div - The element container div (already created with classes and drag handlers)
   * @param {string} pageId - Page ID
   * @param {string} binId - Bin ID
   * @param {Object} element - Element data
   * @param {number|string} elementIndex - Element index
   * @param {number} depth - Current nesting depth
   * @param {Function} renderChildren - Function to render children elements
   * @returns {void}
   */
  render(div, pageId, binId, element, elementIndex, depth, renderChildren) {
    let audioPageId = pageId;
    let audioElementIndex = elementIndex;
    if (typeof elementIndex === "string" && elementIndex.includes("-")) {
      const parts = elementIndex.split("-");
      audioElementIndex = parseInt(parts[0]);
    } else {
      audioElementIndex = parseInt(elementIndex);
    }
    const audioKey = `${audioPageId}-${binId}-${audioElementIndex}`;
    const hasFile = element.audioFile && element.audioFile !== null;
    const audioHeader = document.createElement("div");
    audioHeader.className = "task-header";
    const audioCheckbox = document.createElement("input");
    audioCheckbox.type = "checkbox";
    audioCheckbox.checked = element.completed || false;
    audioCheckbox.onchange = (e) => {
      e.stopPropagation();
      this.app.toggleElement(pageId, binId, elementIndex);
    };
    audioCheckbox.addEventListener("click", (e) => {
      e.stopPropagation();
    });
    audioHeader.appendChild(audioCheckbox);
    const recorder = this.app.appState.inlineAudioRecorders[audioKey];
    const isRecording = recorder && recorder.recorder && recorder.recorder.state === "recording";
    const audioStatus = document.createElement("span");
    audioStatus.className = "audio-status";
    audioStatus.style.fontSize = "12px";
    audioStatus.style.marginLeft = "10px";
    audioStatus.style.whiteSpace = "nowrap";
    if (isRecording) {
      audioStatus.textContent = "🔴 Recording...";
      audioStatus.style.color = "#ff5555";
    } else if (hasFile) {
      const fileInfo = element.audioFile + (element.date ? ` (${element.date})` : "");
      audioStatus.textContent = `📁 ${fileInfo}`;
      audioStatus.style.color = "#888";
    } else {
      audioStatus.textContent = "🎤 Ready to record";
      audioStatus.style.color = "#888";
    }
    audioHeader.appendChild(audioStatus);
    const originalElementIndex = elementIndex;
    const recordBtn = this.app.styleButton(isRecording ? "⏹" : "🔴", async () => {
      if (isRecording) {
        await this.app.stopInlineRecording(audioPageId, binId, audioElementIndex, originalElementIndex);
      } else {
        if (hasFile) {
          await this.app.appendInlineRecording(audioPageId, binId, audioElementIndex, originalElementIndex);
        } else {
          await this.app.startInlineRecording(audioPageId, binId, audioElementIndex, originalElementIndex);
        }
      }
      eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
    });
    recordBtn.style.marginLeft = "8px";
    recordBtn.style.color = "#ff5555";
    if (isRecording) {
      recordBtn.title = "Stop recording";
    } else {
      recordBtn.title = hasFile ? "Append to existing recording" : "Start recording";
    }
    audioHeader.appendChild(recordBtn);
    const player = this.app.appState.inlineAudioPlayers[audioKey];
    const isPlaying = player && player.audio && !player.audio.paused;
    const playStopBtn = this.app.styleButton(isPlaying ? "⏸" : "▶", () => {
      if (isPlaying) {
        this.app.stopInlineAudio(audioPageId, binId, audioElementIndex);
      } else {
        this.app.playInlineAudio(audioPageId, binId, audioElementIndex);
      }
      eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
    });
    playStopBtn.style.marginLeft = "4px";
    if (!hasFile) {
      playStopBtn.disabled = true;
      playStopBtn.style.opacity = "0.5";
    }
    audioHeader.appendChild(playStopBtn);
    div.appendChild(audioHeader);
    const progressBarContainer = document.createElement("div");
    progressBarContainer.className = "audio-progress-container";
    progressBarContainer.id = `audio-progress-${audioKey}`;
    progressBarContainer.style.display = isPlaying ? "block" : "none";
    progressBarContainer.style.marginTop = "8px";
    progressBarContainer.style.marginLeft = "10px";
    progressBarContainer.style.marginRight = "10px";
    const audioProgressBarInput = document.createElement("input");
    audioProgressBarInput.type = "range";
    audioProgressBarInput.min = "0";
    audioProgressBarInput.max = "100";
    audioProgressBarInput.value = "0";
    audioProgressBarInput.step = "0.1";
    audioProgressBarInput.className = "audio-progress-bar";
    audioProgressBarInput.style.width = "100%";
    audioProgressBarInput.style.height = "4px";
    audioProgressBarInput.style.background = "#404040";
    audioProgressBarInput.style.borderRadius = "2px";
    audioProgressBarInput.style.outline = "none";
    audioProgressBarInput.style.cursor = "pointer";
    audioProgressBarInput.style.setProperty("-webkit-appearance", "none");
    audioProgressBarInput.style.setProperty("appearance", "none");
    const style = document.createElement("style");
    style.textContent = `
        .audio-progress-bar::-webkit-slider-thumb {
        appearance: none;
        width: 12px;
        height: 12px;
        background: #4a9eff;
        border-radius: 50%;
        cursor: pointer;
        }
        .audio-progress-bar::-moz-range-thumb {
        width: 12px;
        height: 12px;
        background: #4a9eff;
        border-radius: 50%;
        cursor: pointer;
        border: none;
        }
        `;
    if (!document.getElementById("audio-progress-bar-styles")) {
      style.id = "audio-progress-bar-styles";
      document.head.appendChild(style);
    }
    progressBarContainer.appendChild(audioProgressBarInput);
    div.appendChild(progressBarContainer);
    if (Array.isArray(element.childIds) && element.childIds.length > 0) {
      const childrenContainer = renderChildren(pageId, binId, element, elementIndex, depth);
      if (childrenContainer) {
        div.appendChild(childrenContainer);
      }
    }
  }
}
class TimerRenderer {
  constructor(app2) {
    this.app = app2;
  }
  /**
   * Render a timer element
   * @param {HTMLElement} div - The element container div (already created with classes and drag handlers)
   * @param {string} pageId - Page ID
   * @param {string} binId - Bin ID
   * @param {Object} element - Element data
   * @param {number|string} elementIndex - Element index
   * @param {number} depth - Current nesting depth
   * @param {Function} renderChildren - Function to render children elements
   * @returns {void}
   */
  render(div, pageId, binId, element, elementIndex, depth, renderChildren) {
    const getTimerElement = () => {
      const document2 = this.app.appState.documents?.find((page) => page.id === pageId);
      const group = document2?.groups?.find((bin) => bin.id === binId);
      if (!group) return null;
      const items = group.items || [];
      group.items = items;
      return items[elementIndex];
    };
    if (element.duration === void 0) element.duration = 3600;
    if (element.elapsed === void 0) element.elapsed = 0;
    if (element.running === void 0) element.running = false;
    if (element.pausedAt === void 0) element.pausedAt = 0;
    if (element.alarmSound === void 0 || element.alarmSound === null) element.alarmSound = "/sounds/alarm.mp3";
    if (element.alarmPlaying === void 0) element.alarmPlaying = false;
    if (element.completed === void 0) element.completed = false;
    if (element.running && !element.intervalId) {
      element.startTime = Date.now() - element.elapsed * 1e3;
      element.intervalId = setInterval(() => {
        const timerElement = getTimerElement();
        if (!timerElement || !timerElement.running) return;
        timerElement.elapsed = Math.floor((Date.now() - timerElement.startTime) / 1e3) + timerElement.pausedAt;
        updateTimerDisplay();
        const currentTime = Date.now();
        if (!timerElement.lastSaveTime || currentTime - timerElement.lastSaveTime >= 5e3) {
          timerElement.lastSaveTime = currentTime;
          this.app.dataManager.saveData();
        }
        if (timerElement.elapsed >= timerElement.duration) {
          timerElement.elapsed = timerElement.duration;
          timerElement.running = false;
          if (timerElement.intervalId) {
            clearInterval(timerElement.intervalId);
            timerElement.intervalId = null;
          }
          updateTimerDisplay();
          if (timerElement.alarmSound && !timerElement.alarmPlaying && !timerElement.completed) {
            const audio = new Audio(timerElement.alarmSound);
            audio.loop = true;
            audio.play().then(() => {
              timerElement.alarmPlaying = true;
              timerElement.alarmAudio = audio;
            }).catch((err) => console.log("Alarm play failed:", err));
          }
        }
      }, 100);
    }
    const timerHeader = document.createElement("div");
    timerHeader.className = "task-header";
    timerHeader.style.position = "relative";
    const progressBar = document.createElement("div");
    progressBar.className = "timer-progress-bar";
    progressBar.style.position = "absolute";
    progressBar.style.top = "0";
    progressBar.style.left = "0";
    progressBar.style.width = "0%";
    progressBar.style.height = "100%";
    progressBar.style.backgroundColor = "rgba(74, 158, 255, 0.3)";
    progressBar.style.transition = "width 0.1s linear";
    progressBar.style.pointerEvents = "none";
    progressBar.style.zIndex = "0";
    timerHeader.appendChild(progressBar);
    const timerCheckbox = document.createElement("input");
    timerCheckbox.type = "checkbox";
    timerCheckbox.checked = element.completed || false;
    timerCheckbox.addEventListener("click", (e) => {
      e.stopPropagation();
    });
    timerHeader.appendChild(timerCheckbox);
    const timerDisplay = document.createElement("span");
    timerDisplay.className = "timer-display";
    timerDisplay.style.fontSize = "14px";
    timerDisplay.style.fontWeight = "bold";
    timerDisplay.style.marginLeft = "10px";
    timerDisplay.style.whiteSpace = "nowrap";
    const updateTimerDisplay = () => {
      const remaining = Math.max(0, element.duration - element.elapsed);
      const hours = Math.floor(remaining / 3600);
      const minutes = Math.floor(remaining % 3600 / 60);
      const seconds = remaining % 60;
      timerDisplay.textContent = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
      const progress = element.duration > 0 ? element.elapsed / element.duration * 100 : 0;
      progressBar.style.width = `${Math.min(100, progress)}%`;
    };
    updateTimerDisplay();
    timerHeader.appendChild(timerDisplay);
    const timerStartStopBtn = this.app.styleButton(element.running ? "⏸" : "▶", (e) => {
      e.stopPropagation();
      const timerElement = getTimerElement();
      if (!timerElement) return;
      if (timerElement.running) {
        timerElement.running = false;
        timerElement.pausedAt = timerElement.elapsed;
        if (timerElement.intervalId) {
          clearInterval(timerElement.intervalId);
          timerElement.intervalId = null;
        }
        timerStartStopBtn.textContent = "▶";
      } else {
        timerElement.running = true;
        timerElement.startTime = Date.now() - timerElement.elapsed * 1e3;
        timerElement.intervalId = setInterval(() => {
          const timerElement2 = getTimerElement();
          if (!timerElement2 || !timerElement2.running) return;
          timerElement2.elapsed = Math.floor((Date.now() - timerElement2.startTime) / 1e3) + timerElement2.pausedAt;
          updateTimerDisplay();
          const currentTime = Date.now();
          if (!timerElement2.lastSaveTime || currentTime - timerElement2.lastSaveTime >= 5e3) {
            timerElement2.lastSaveTime = currentTime;
            this.app.dataManager.saveData();
          }
          if (timerElement2.elapsed >= timerElement2.duration) {
            timerElement2.elapsed = timerElement2.duration;
            timerElement2.running = false;
            if (timerElement2.intervalId) {
              clearInterval(timerElement2.intervalId);
              timerElement2.intervalId = null;
            }
            updateTimerDisplay();
            timerStartStopBtn.textContent = "▶";
            if (timerElement2.alarmSound && !timerElement2.alarmPlaying && !timerElement2.completed) {
              const audio = new Audio(timerElement2.alarmSound);
              audio.loop = true;
              audio.play().then(() => {
                timerElement2.alarmPlaying = true;
                timerElement2.alarmAudio = audio;
              }).catch((err) => console.log("Alarm play failed:", err));
            }
          }
        }, 100);
        timerStartStopBtn.textContent = "⏸";
      }
      this.app.dataManager.saveData();
    });
    timerStartStopBtn.style.marginLeft = "8px";
    timerHeader.appendChild(timerStartStopBtn);
    timerCheckbox.onchange = (e) => {
      e.stopPropagation();
      const timerElement = getTimerElement();
      if (!timerElement) return;
      timerElement.completed = timerCheckbox.checked;
      if (timerElement.completed) {
        if (timerElement.alarmPlaying && timerElement.alarmAudio) {
          timerElement.alarmAudio.pause();
          timerElement.alarmAudio.currentTime = 0;
          timerElement.alarmPlaying = false;
          timerElement.alarmAudio = null;
        }
      } else {
        timerElement.running = false;
        timerElement.elapsed = 0;
        timerElement.pausedAt = 0;
        timerElement.completed = false;
        if (timerElement.intervalId) {
          clearInterval(timerElement.intervalId);
          timerElement.intervalId = null;
        }
        if (timerElement.alarmPlaying && timerElement.alarmAudio) {
          timerElement.alarmAudio.pause();
          timerElement.alarmAudio.currentTime = 0;
          timerElement.alarmPlaying = false;
          timerElement.alarmAudio = null;
        }
        updateTimerDisplay();
        timerStartStopBtn.textContent = "▶";
      }
      this.app.dataManager.saveData();
    };
    const timerResetBtn = this.app.styleButton("↻", (e) => {
      e.stopPropagation();
      const page = this.app.appState.documents.find((p) => p.id === pageId);
      const bin = page?.groups?.find((b) => b.id === binId);
      const timerElement = bin?.items?.[elementIndex];
      if (!timerElement) return;
      timerElement.running = false;
      timerElement.elapsed = 0;
      timerElement.pausedAt = 0;
      timerElement.completed = false;
      if (timerElement.intervalId) {
        clearInterval(timerElement.intervalId);
        timerElement.intervalId = null;
      }
      if (timerElement.alarmPlaying && timerElement.alarmAudio) {
        timerElement.alarmAudio.pause();
        timerElement.alarmAudio.currentTime = 0;
        timerElement.alarmPlaying = false;
        timerElement.alarmAudio = null;
      }
      updateTimerDisplay();
      timerStartStopBtn.textContent = "▶";
      this.app.dataManager.saveData();
    });
    timerResetBtn.style.marginLeft = "4px";
    timerResetBtn.title = "Reset timer";
    timerHeader.appendChild(timerResetBtn);
    div.appendChild(timerHeader);
  }
}
class CounterRenderer {
  constructor(app2) {
    this.app = app2;
  }
  /**
   * Render a counter element
   * @param {HTMLElement} div - The element container div (already created with classes and drag handlers)
   * @param {string} pageId - Page ID
   * @param {string} binId - Bin ID
   * @param {Object} element - Element data
   * @param {number|string} elementIndex - Element index
   * @param {number} depth - Current nesting depth
   * @param {Function} renderChildren - Function to render children elements
   * @returns {void}
   */
  render(div, pageId, binId, element, elementIndex, depth, renderChildren) {
    const getCounterElement = () => {
      const document2 = this.app.appState.documents?.find((page) => page.id === pageId);
      const group = document2?.groups?.find((bin) => bin.id === binId);
      if (!group) return null;
      const items = group.items || [];
      group.items = items;
      return items[elementIndex];
    };
    const counterHeader = document.createElement("div");
    counterHeader.className = "task-header";
    const counterCheckbox = document.createElement("input");
    counterCheckbox.type = "checkbox";
    counterCheckbox.checked = element.completed || false;
    counterCheckbox.onchange = (e) => {
      e.stopPropagation();
      this.app.toggleElement(pageId, binId, elementIndex);
    };
    counterHeader.appendChild(counterCheckbox);
    const counterHasCustomTitle = element.text && element.text.trim() && element.text.trim() !== "Counter";
    if (counterHasCustomTitle) {
      const counterTextSpan = document.createElement("span");
      counterTextSpan.className = "task-text";
      const counterTextFragment = this.app.parseLinks(element.text);
      counterTextSpan.appendChild(counterTextFragment);
      counterTextSpan.style.cursor = "text";
      counterTextSpan.addEventListener("click", (e) => {
        if (e.target.tagName === "A") {
          return;
        }
        e.stopPropagation();
        this.app.enableInlineEditing(counterTextSpan, pageId, binId, elementIndex, element);
      });
      counterHeader.appendChild(counterTextSpan);
    }
    counterCheckbox.addEventListener("click", (e) => {
      e.stopPropagation();
    });
    div.appendChild(counterHeader);
    const counterControls = document.createElement("div");
    counterControls.className = "counter-controls";
    counterControls.style.display = "flex";
    counterControls.style.alignItems = "center";
    counterControls.style.gap = "10px";
    counterControls.style.marginTop = "10px";
    const decBtn = document.createElement("button");
    decBtn.textContent = "−";
    decBtn.style.fontSize = "20px";
    decBtn.onclick = (e) => {
      e.stopPropagation();
      const counterElement = getCounterElement();
      if (counterElement) {
        counterElement.value = Math.max(0, counterElement.value - counterElement.increment1);
        valueDisplay.textContent = counterElement.value;
        this.app.dataManager.saveData();
      }
    };
    counterControls.appendChild(decBtn);
    const valueDisplay = document.createElement("span");
    valueDisplay.className = "counter-value";
    valueDisplay.textContent = element.value || 0;
    valueDisplay.style.fontSize = "24px";
    valueDisplay.style.fontWeight = "bold";
    valueDisplay.style.minWidth = "60px";
    valueDisplay.style.textAlign = "center";
    counterControls.appendChild(valueDisplay);
    const incBtn = document.createElement("button");
    incBtn.textContent = "+";
    incBtn.style.fontSize = "20px";
    incBtn.onclick = (e) => {
      e.stopPropagation();
      const counterElement = getCounterElement();
      if (counterElement) {
        counterElement.value = (counterElement.value || 0) + counterElement.increment1;
        valueDisplay.textContent = counterElement.value;
        this.app.dataManager.saveData();
      }
    };
    counterControls.appendChild(incBtn);
    const customInc5 = document.createElement("button");
    customInc5.textContent = `+${element.increment5 || 5}`;
    customInc5.onclick = (e) => {
      e.stopPropagation();
      const counterElement = getCounterElement();
      if (counterElement) {
        counterElement.value = (counterElement.value || 0) + (counterElement.increment5 || 5);
        valueDisplay.textContent = counterElement.value;
        this.app.dataManager.saveData();
      }
    };
    counterControls.appendChild(customInc5);
    const customInc = document.createElement("button");
    customInc.textContent = `+${element.customIncrement || 10}`;
    customInc.onclick = (e) => {
      e.stopPropagation();
      const counterElement = getCounterElement();
      if (counterElement) {
        counterElement.value = (counterElement.value || 0) + (counterElement.customIncrement || 10);
        valueDisplay.textContent = counterElement.value;
        this.app.dataManager.saveData();
      }
    };
    counterControls.appendChild(customInc);
    div.appendChild(counterControls);
    if (Array.isArray(element.childIds) && element.childIds.length > 0) {
      const childrenContainer = renderChildren(pageId, binId, element, elementIndex, depth);
      if (childrenContainer) {
        div.appendChild(childrenContainer);
      }
    }
  }
}
class TrackerRenderer {
  constructor(app2) {
    this.app = app2;
  }
  /**
   * Render a tracker element
   * @param {HTMLElement} div - The element container div (already created with classes and drag handlers)
   * @param {string} pageId - Page ID
   * @param {string} binId - Bin ID
   * @param {Object} element - Element data
   * @param {number|string} elementIndex - Element index
   * @param {number} depth - Current nesting depth
   * @param {Function} renderChildren - Function to render children elements
   * @returns {void}
   */
  render(div, pageId, binId, element, elementIndex, depth, renderChildren) {
    if (element.mode === void 0) element.mode = "daily";
    if (element.dailyCompletions === void 0) element.dailyCompletions = {};
    if (element.pageCompletions === void 0) element.pageCompletions = {};
    const trackerHeader = document.createElement("div");
    trackerHeader.className = "task-header";
    const trackerCheckbox = document.createElement("input");
    trackerCheckbox.type = "checkbox";
    trackerCheckbox.checked = element.completed || false;
    trackerCheckbox.onchange = (e) => {
      e.stopPropagation();
      this.app.toggleElement(pageId, binId, elementIndex);
    };
    trackerHeader.appendChild(trackerCheckbox);
    const trackerHasCustomTitle = element.text && element.text.trim() && element.text.trim() !== "Tracker";
    if (trackerHasCustomTitle) {
      const trackerTextSpan = document.createElement("span");
      trackerTextSpan.className = "task-text";
      const trackerTextFragment = this.app.parseLinks(element.text);
      trackerTextSpan.appendChild(trackerTextFragment);
      trackerTextSpan.style.cursor = "text";
      trackerTextSpan.addEventListener("click", (e) => {
        if (e.target.tagName === "A") {
          return;
        }
        e.stopPropagation();
        this.app.enableInlineEditing(trackerTextSpan, pageId, binId, elementIndex, element);
      });
      trackerHeader.appendChild(trackerTextSpan);
    }
    trackerCheckbox.addEventListener("click", (e) => {
      e.stopPropagation();
    });
    const trackerDisplay = document.createElement("span");
    trackerDisplay.className = "tracker-display";
    trackerDisplay.style.fontSize = "12px";
    trackerDisplay.style.marginLeft = "10px";
    trackerDisplay.style.whiteSpace = "nowrap";
    const updateTrackerDisplay = () => {
      if (element.mode === "daily") {
        const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
        const todayData = element.dailyCompletions[today];
        const count = todayData?._count || (todayData ? Object.keys(todayData).filter((k) => k !== "_count").length : 0);
        trackerDisplay.textContent = `${count} today`;
      } else {
        const count = element.pageCompletions?.count || 0;
        trackerDisplay.textContent = `${count} page`;
      }
    };
    updateTrackerDisplay();
    trackerHeader.appendChild(trackerDisplay);
    div.appendChild(trackerHeader);
  }
}
class RatingRenderer {
  constructor(app2) {
    this.app = app2;
  }
  /**
   * Render a rating element
   * @param {HTMLElement} div - The element container div (already created with classes and drag handlers)
   * @param {string} pageId - Page ID
   * @param {string} binId - Bin ID
   * @param {Object} element - Element data
   * @param {number|string} elementIndex - Element index
   * @param {number} depth - Current nesting depth
   * @param {Function} renderChildren - Function to render children elements
   * @returns {void}
   */
  render(div, pageId, binId, element, elementIndex, depth, renderChildren) {
    const getRatingElement = () => {
      const document2 = this.app.appState.documents?.find((page) => page.id === pageId);
      const group = document2?.groups?.find((bin) => bin.id === binId);
      if (!group) return null;
      const items = group.items || [];
      group.items = items;
      return items[elementIndex];
    };
    if (element.rating === void 0) element.rating = 0;
    if (element.review === void 0) element.review = "";
    const ratingHeader = document.createElement("div");
    ratingHeader.className = "task-header";
    const ratingCheckbox = document.createElement("input");
    ratingCheckbox.type = "checkbox";
    ratingCheckbox.checked = element.completed || false;
    ratingCheckbox.onchange = (e) => {
      e.stopPropagation();
      this.app.toggleElement(pageId, binId, elementIndex);
    };
    ratingCheckbox.addEventListener("click", (e) => {
      e.stopPropagation();
    });
    ratingHeader.appendChild(ratingCheckbox);
    const starsContainer = document.createElement("span");
    starsContainer.style.display = "inline-flex";
    starsContainer.style.gap = "2px";
    starsContainer.style.marginLeft = "10px";
    starsContainer.style.alignItems = "center";
    for (let i = 1; i <= 5; i++) {
      const star = document.createElement("span");
      star.textContent = i <= (element.rating || 0) ? "★" : "☆";
      star.style.fontSize = "16px";
      star.style.cursor = "pointer";
      star.style.color = i <= (element.rating || 0) ? "#ffd700" : "#888";
      star.onclick = (e) => {
        e.stopPropagation();
        const ratingElement = getRatingElement();
        if (ratingElement) {
          ratingElement.rating = i;
          starsContainer.querySelectorAll("span").forEach((s, idx) => {
            s.textContent = idx + 1 <= i ? "★" : "☆";
            s.style.color = idx + 1 <= i ? "#ffd700" : "#888";
          });
          this.app.dataManager.saveData();
        }
      };
      starsContainer.appendChild(star);
    }
    ratingHeader.appendChild(starsContainer);
    div.appendChild(ratingHeader);
  }
}
class TimeLogRenderer {
  constructor(app2) {
    this.app = app2;
  }
  /**
   * Render a time-log element
   * @param {HTMLElement} div - The element container div (already created with classes and drag handlers)
   * @param {string} pageId - Page ID
   * @param {string} binId - Bin ID
   * @param {Object} element - Element data
   * @param {number|string} elementIndex - Element index
   * @param {number} depth - Current nesting depth
   * @param {Function} renderChildren - Function to render children elements
   * @returns {void}
   */
  render(div, pageId, binId, element, elementIndex, depth, renderChildren) {
    const getTimeLogElement = () => {
      const document2 = this.app.appState.documents?.find((page) => page.id === pageId);
      const group = document2?.groups?.find((bin) => bin.id === binId);
      if (!group) return null;
      const items = group.items || [];
      group.items = items;
      return items[elementIndex];
    };
    if (element.totalTime === void 0) element.totalTime = 0;
    if (element.isRunning === void 0) element.isRunning = false;
    if (element.startTime === void 0) element.startTime = null;
    if (element.sessions === void 0) element.sessions = [];
    const timeLogHeader = document.createElement("div");
    timeLogHeader.className = "task-header";
    const timeLogCheckbox = document.createElement("input");
    timeLogCheckbox.type = "checkbox";
    timeLogCheckbox.checked = element.completed || false;
    timeLogCheckbox.onchange = (e) => {
      e.stopPropagation();
      this.app.toggleElement(pageId, binId, elementIndex);
    };
    timeLogCheckbox.addEventListener("click", (e) => {
      e.stopPropagation();
    });
    timeLogHeader.appendChild(timeLogCheckbox);
    const timeDisplay = document.createElement("span");
    timeDisplay.className = "time-log-display";
    timeDisplay.style.fontSize = "14px";
    timeDisplay.style.fontWeight = "bold";
    timeDisplay.style.marginLeft = "10px";
    timeDisplay.style.whiteSpace = "nowrap";
    const updateTimeDisplay = () => {
      const totalSeconds = element.totalTime || 0;
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor(totalSeconds % 3600 / 60);
      const seconds = totalSeconds % 60;
      timeDisplay.textContent = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    };
    updateTimeDisplay();
    timeLogHeader.appendChild(timeDisplay);
    const timeLogStartStopBtn = this.app.styleButton(element.isRunning ? "⏸" : "▶", (e) => {
      e.stopPropagation();
      const timeLogElement = getTimeLogElement();
      if (!timeLogElement) return;
      if (timeLogElement.isRunning) {
        timeLogElement.isRunning = false;
        if (timeLogElement.intervalId) {
          clearInterval(timeLogElement.intervalId);
          timeLogElement.intervalId = null;
        }
        timeLogStartStopBtn.textContent = "▶";
      } else {
        timeLogElement.isRunning = true;
        timeLogElement.startTime = Date.now();
        timeLogStartStopBtn.textContent = "⏸";
        timeLogElement.intervalId = setInterval(() => {
          const timeLogElement2 = getTimeLogElement();
          if (!timeLogElement2 || !timeLogElement2.isRunning) return;
          timeLogElement2.totalTime = Math.floor((Date.now() - timeLogElement2.startTime) / 1e3) + (timeLogElement2.pausedTotalTime || 0);
          updateTimeDisplay();
        }, 1e3);
      }
      this.app.dataManager.saveData();
    });
    div.appendChild(timeLogHeader);
  }
}
class ImageRenderer {
  constructor(app2) {
    this.app = app2;
  }
  /**
   * Render a image element
   * @param {HTMLElement} div - The element container div (already created with classes and drag handlers)
   * @param {string} pageId - Page ID
   * @param {string} binId - Bin ID
   * @param {Object} element - Element data
   * @param {number|string} elementIndex - Element index
   * @param {number} depth - Current nesting depth
   * @param {Function} renderChildren - Function to render children elements
   * @returns {void}
   */
  render(div, pageId, binId, element, elementIndex, depth, renderChildren) {
    if (element.imageUrl === void 0) element.imageUrl = null;
    if (element.imageAlignment === void 0) element.imageAlignment = "left";
    if (element.imageWidth === void 0) element.imageWidth = 300;
    const imageHeader = document.createElement("div");
    imageHeader.className = "task-header";
    imageHeader.style.display = "flex";
    imageHeader.style.alignItems = "center";
    imageHeader.style.gap = "8px";
    imageHeader.style.flexWrap = "nowrap";
    const imageCheckbox = document.createElement("input");
    imageCheckbox.type = "checkbox";
    imageCheckbox.checked = element.completed || false;
    imageCheckbox.onchange = (e) => {
      e.stopPropagation();
      this.app.toggleElement(pageId, binId, elementIndex);
    };
    imageCheckbox.addEventListener("click", (e) => {
      e.stopPropagation();
    });
    imageHeader.appendChild(imageCheckbox);
    const imageText = element.text || "";
    const shouldShowImageTitle = imageText.trim() && imageText.trim() !== "Image";
    if (shouldShowImageTitle) {
      const imageTextSpan = document.createElement("span");
      imageTextSpan.className = "task-text";
      imageTextSpan.style.flex = "0 0 auto";
      const imageTextFragment = this.app.parseLinks(imageText);
      imageTextSpan.appendChild(imageTextFragment);
      imageTextSpan.style.cursor = "text";
      imageTextSpan.addEventListener("click", (e) => {
        if (e.target.tagName === "A") {
          return;
        }
        e.stopPropagation();
        this.app.enableInlineEditing(imageTextSpan, pageId, binId, elementIndex, element);
      });
      imageHeader.appendChild(imageTextSpan);
    }
    const imageControls = document.createElement("div");
    imageControls.style.display = "flex";
    imageControls.style.gap = "5px";
    imageControls.style.marginLeft = shouldShowImageTitle ? "10px" : "0";
    imageControls.style.flexShrink = "0";
    const alignLeftBtn = this.app.styleButton("⬅️", () => {
      element.imageAlignment = "left";
      this.app.dataManager.saveData();
      eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
    });
    const alignCenterBtn = this.app.styleButton("⬌", () => {
      element.imageAlignment = "center";
      this.app.dataManager.saveData();
      eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
    });
    const alignRightBtn = this.app.styleButton("➡️", () => {
      element.imageAlignment = "right";
      this.app.dataManager.saveData();
      eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
    });
    imageControls.appendChild(alignLeftBtn);
    imageControls.appendChild(alignCenterBtn);
    imageControls.appendChild(alignRightBtn);
    const sizeInput = document.createElement("input");
    sizeInput.type = "number";
    sizeInput.value = element.imageWidth;
    sizeInput.min = "50";
    sizeInput.max = "1000";
    sizeInput.style.width = "60px";
    sizeInput.style.padding = "4px";
    sizeInput.style.border = "1px solid #555";
    sizeInput.style.background = "transparent";
    sizeInput.style.color = "#e0e0e0";
    sizeInput.style.borderRadius = "4px";
    sizeInput.onchange = (e) => {
      element.imageWidth = parseInt(e.target.value) || 300;
      this.app.dataManager.saveData();
      eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
    };
    imageControls.appendChild(sizeInput);
    if (element.imageUrl) {
      const removeImageBtn = this.app.styleButton("Remove Image", () => {
        element.imageUrl = null;
        element.text = "Image";
        this.app.dataManager.saveData();
        eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
      });
      imageControls.appendChild(removeImageBtn);
    }
    imageHeader.appendChild(imageControls);
    div.appendChild(imageHeader);
    if (element.imageUrl) {
      const imgContainer = document.createElement("div");
      imgContainer.style.display = "flex";
      imgContainer.style.justifyContent = element.imageAlignment === "left" ? "flex-start" : element.imageAlignment === "center" ? "center" : "flex-end";
      imgContainer.style.marginTop = "10px";
      const img = document.createElement("img");
      img.src = element.imageUrl;
      img.style.maxWidth = "100%";
      img.style.height = "auto";
      img.style.width = `${element.imageWidth}px`;
      img.style.borderRadius = "4px";
      img.style.boxShadow = "0 2px 8px rgba(0,0,0,0.3)";
      img.style.cursor = "pointer";
      img.onclick = () => window.open(element.imageUrl, "_blank");
      imgContainer.appendChild(img);
      div.appendChild(imgContainer);
    } else {
      const uploadArea = document.createElement("div");
      uploadArea.style.border = "2px dashed #555";
      uploadArea.style.borderRadius = "8px";
      uploadArea.style.padding = "20px";
      uploadArea.style.textAlign = "center";
      uploadArea.style.color = "#888";
      uploadArea.style.cursor = "pointer";
      uploadArea.style.marginTop = "10px";
      uploadArea.textContent = "Drag & drop an image here, or click to upload";
      uploadArea.onclick = () => {
        const fileInput2 = document.getElementById("file-input-images-json");
        fileInput2.click();
      };
      const fileInput = document.getElementById("file-input-images-json");
      fileInput.onchange = (e) => {
        const file = e.target.files[0];
        if (file && file.type.startsWith("image/")) {
          const reader = new FileReader();
          reader.onload = (event) => {
            element.imageUrl = event.target.result;
            element.text = file.name.split(".").slice(0, -1).join(".");
            this.app.dataManager.saveData();
            eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
          };
          reader.readAsDataURL(file);
        }
      };
      uploadArea.addEventListener("dragover", (e) => {
        e.preventDefault();
        e.stopPropagation();
        uploadArea.style.borderColor = "#4a9eff";
      });
      uploadArea.addEventListener("dragleave", (e) => {
        e.stopPropagation();
        uploadArea.style.borderColor = "#555";
      });
      uploadArea.addEventListener("drop", (e) => {
        e.preventDefault();
        e.stopPropagation();
        uploadArea.style.borderColor = "#555";
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith("image/")) {
          const reader = new FileReader();
          reader.onload = (event) => {
            element.imageUrl = event.target.result;
            element.text = file.name.split(".").slice(0, -1).join(".");
            this.app.dataManager.saveData();
            eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
          };
          reader.readAsDataURL(file);
        } else {
          alert("Please drop an image file.");
        }
      });
      div.appendChild(uploadArea);
    }
    if (Array.isArray(element.childIds) && element.childIds.length > 0) {
      const childrenContainer = renderChildren(pageId, binId, element, elementIndex, depth);
      if (childrenContainer) {
        div.appendChild(childrenContainer);
      }
    }
  }
}
class ElementTypeRegistry {
  constructor(app2) {
    this.app = app2;
    this.renderers = /* @__PURE__ */ new Map();
    this.initializeRenderers();
  }
  /**
   * Initialize all element type renderers
   */
  initializeRenderers() {
    this.renderers.set("task", new TaskRenderer(this.app));
    this.renderers.set("header", new HeaderRenderer(this.app));
    this.renderers.set("header-checkbox", new HeaderCheckboxRenderer(this.app));
    this.renderers.set("multi-checkbox", new MultiCheckboxRenderer(this.app));
    this.renderers.set("audio", new AudioRenderer(this.app));
    this.renderers.set("timer", new TimerRenderer(this.app));
    this.renderers.set("counter", new CounterRenderer(this.app));
    this.renderers.set("tracker", new TrackerRenderer(this.app));
    this.renderers.set("rating", new RatingRenderer(this.app));
    this.renderers.set("time-log", new TimeLogRenderer(this.app));
    this.renderers.set("image", new ImageRenderer(this.app));
  }
  /**
   * Get renderer for an element type
   * @param {string} elementType - The element type
   * @returns {Object|null} The renderer instance or null if not found
   */
  getRenderer(elementType) {
    return this.renderers.get(elementType) || null;
  }
  /**
   * Render an element using the appropriate renderer
   * @param {HTMLElement} div - The element container div
   * @param {string} pageId - Page ID
   * @param {string} binId - Bin ID
   * @param {Object} element - Element data
   * @param {number|string} elementIndex - Element index
   * @param {number} depth - Current nesting depth
   * @param {Function} renderChildren - Function to render children elements
   * @returns {void}
   */
  renderElement(div, pageId, binId, element, elementIndex, depth, renderChildren) {
    const renderer = this.getRenderer(element.type);
    if (renderer) {
      renderer.render(div, pageId, binId, element, elementIndex, depth, renderChildren);
    } else {
      console.warn(`No renderer found for element type: ${element.type}`);
    }
  }
}
class SharedDragDrop {
  constructor(app2) {
    this.app = app2;
    this.dragOverTimeout = null;
    this.nestIndicator = null;
  }
  /**
   * Setup drag and drop for an element in vertical/horizontal layouts
   * Allows nesting when dragging over elements with title/text
   * @param {HTMLElement} elementNode - The element DOM node
   * @param {string} pageId - Page ID
   * @param {string} binId - Bin ID
   * @param {number} elementIndex - Element index
   * @param {Object} element - Element data
   */
  setupElementDragDrop(elementNode, pageId, binId, elementIndex, element) {
    const draggableTypes = ["task", "note", "header-checkbox", "text"];
    if (!draggableTypes.includes(element.type)) {
      return;
    }
    const elementId = `${pageId}-${binId}-${elementIndex}`;
    elementNode.draggable = true;
    elementNode.dataset.dragType = "element";
    elementNode.dataset.pageId = pageId;
    elementNode.dataset.binId = binId;
    elementNode.dataset.elementIndex = elementIndex;
    elementNode.dataset.elementId = elementId;
    elementNode.setAttribute("data-element-id", elementId);
    elementNode.addEventListener("dragstart", (e) => {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", JSON.stringify({
        type: "element",
        pageId,
        binId,
        elementIndex
      }));
      elementNode.style.opacity = "0.5";
    });
    elementNode.addEventListener("dragend", (e) => {
      elementNode.style.opacity = "1";
      this.clearNestIndicator();
      if (this.dragOverTimeout) {
        clearTimeout(this.dragOverTimeout);
        this.dragOverTimeout = null;
      }
    });
    elementNode.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const dragData = e.dataTransfer.getData("text/plain");
      if (!dragData) return;
      let dragPayload;
      try {
        dragPayload = JSON.parse(dragData);
      } catch (err) {
        return;
      }
      if (dragPayload.type !== "element") return;
      const hasTitleOrText = element.title || element.text || element.content;
      if (!hasTitleOrText) return;
      const sourcePage = this.app.appState?.documents?.find((p) => p.id === dragPayload.pageId) || this.app.documents?.find((p) => p.id === dragPayload.pageId);
      if (!sourcePage) return;
      const sourceBin = sourcePage.groups?.find((b) => b.id === dragPayload.binId);
      const items = sourceBin?.items || [];
      if (sourceBin) {
        sourceBin.items = items;
      }
      if (!sourceBin) return;
      const sourceElement = items[dragPayload.elementIndex];
      if (!sourceElement) return;
      const sourceTypes = ["task", "note", "header-checkbox", "text"];
      if (!sourceTypes.includes(sourceElement.type)) return;
      if (dragPayload.pageId === pageId && dragPayload.binId === binId && dragPayload.elementIndex === elementIndex) {
        return;
      }
      this.showNestIndicator(elementNode);
      e.dataTransfer.dropEffect = "move";
    });
    elementNode.addEventListener("dragleave", (e) => {
      if (!elementNode.contains(e.relatedTarget)) {
        this.clearNestIndicator();
      }
    });
    elementNode.addEventListener("drop", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const dragData = e.dataTransfer.getData("text/plain");
      if (!dragData) return;
      let dragPayload;
      try {
        dragPayload = JSON.parse(dragData);
      } catch (err) {
        return;
      }
      if (dragPayload.type !== "element") return;
      const hasTitleOrText = element.title || element.text || element.content;
      if (!hasTitleOrText) return;
      if (dragPayload.pageId === pageId && dragPayload.binId === binId && dragPayload.elementIndex === elementIndex) {
        return;
      }
      if (this.app.dragDropHandler) {
        this.app.dragDropHandler.nestElement(
          dragPayload.pageId,
          dragPayload.binId,
          dragPayload.elementIndex,
          pageId,
          binId,
          elementIndex
        );
      }
      this.clearNestIndicator();
    });
  }
  /**
   * Show visual indicator that element can be nested
   * @param {HTMLElement} targetElement - The target element
   */
  showNestIndicator(targetElement) {
    this.clearNestIndicator();
    const indicator = document.createElement("div");
    indicator.className = "nest-indicator";
    indicator.style.cssText = `
            position: absolute;
            left: 0;
            right: 0;
            top: 0;
            bottom: 0;
            border: 2px dashed #4a9eff;
            background: rgba(74, 158, 255, 0.1);
            pointer-events: none;
            z-index: 1000;
            border-radius: 4px;
        `;
    const computedStyle = window.getComputedStyle(targetElement);
    if (computedStyle.position === "static") {
      targetElement.style.position = "relative";
    }
    targetElement.appendChild(indicator);
    this.nestIndicator = indicator;
  }
  /**
   * Clear the nest indicator
   */
  clearNestIndicator() {
    if (this.nestIndicator) {
      this.nestIndicator.remove();
      this.nestIndicator = null;
    }
  }
}
class ElementRenderer {
  constructor(app2) {
    this.app = app2;
    this.typeRegistry = new ElementTypeRegistry(app2);
    this.sharedDragDrop = null;
  }
  _getDocument(pageId) {
    return this.app.appState.documents?.find((page) => page.id === pageId) || null;
  }
  _getGroup(document2, binId) {
    if (!document2) return null;
    const group = document2.groups?.find((bin) => bin.id === binId) || null;
    if (!group) return null;
    const items = group.items || [];
    group.items = items;
    return group;
  }
  _getGroupByIds(pageId, binId) {
    const document2 = this._getDocument(pageId);
    const group = this._getGroup(document2, binId);
    return { document: document2, group, items: group ? group.items : [] };
  }
  _getItemIndexForGroup(group) {
    return ItemHierarchy.buildItemIndex(group?.items || []);
  }
  _getRootItemByIndex(group, elementIndex) {
    return ItemHierarchy.getRootItemAtIndex(group?.items || [], elementIndex);
  }
  _getChildItemByIndex(group, parentElement, childIndex) {
    const itemIndex = this._getItemIndexForGroup(group);
    const childItems = ItemHierarchy.getChildItems(parentElement, itemIndex);
    return childItems[childIndex] || null;
  }
  /**
   * Render children elements
   * @param {string} pageId - Page ID
   * @param {string} binId - Bin ID
   * @param {Object} parentElement - Parent element data
   * @param {number} parentElementIndex - Parent element index
   * @param {number} depth - Current nesting depth
   * @returns {HTMLElement|null} The rendered children container or null
   */
  renderChildren(pageId, binId, parentElement, parentElementIndex, depth = 0) {
    if (depth > 1) {
      return null;
    }
    const { group } = this._getGroupByIds(pageId, binId);
    const itemIndex = ItemHierarchy.buildItemIndex(group?.items || []);
    const childItems = ItemHierarchy.getChildItems(parentElement, itemIndex);
    if (!childItems.length) {
      return null;
    }
    const container = document.createElement("div");
    container.className = "children-container";
    const childrenStateKey = `${binId}-${parentElementIndex}`;
    if (!(childrenStateKey in this.app.appState.subtaskStates)) {
      this.app.appState.subtaskStates[childrenStateKey] = this.app.appState.allSubtasksExpanded;
    }
    const isExpanded = this.app.appState.subtaskStates[childrenStateKey];
    const content = document.createElement("div");
    content.className = "dropdown-content";
    content.style.display = isExpanded ? "block" : "none";
    content.dataset.pageId = pageId;
    content.dataset.binId = binId;
    content.dataset.parentElementIndex = parentElementIndex;
    content._dropIndicator = null;
    content._dropTargetIndex = null;
    content.addEventListener("dragover", (e) => {
      const dragData = this.app.appState.dragData || (() => {
        try {
          return JSON.parse(e.dataTransfer.getData("text/plain") || "{}");
        } catch {
          return {};
        }
      })();
      if (dragData.type !== "element" || !dragData.isChild) {
        if (content._dropIndicator) {
          content._dropIndicator.remove();
          content._dropIndicator = null;
          content._dropTargetIndex = null;
        }
        return;
      }
      if (dragData.parentElementIndex !== parentElementIndex) {
        if (content._dropIndicator) {
          content._dropIndicator.remove();
          content._dropIndicator = null;
          content._dropTargetIndex = null;
        }
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = "move";
      const mouseY = e.clientY;
      const contentRect = content.getBoundingClientRect();
      const relativeY = mouseY - contentRect.top;
      const childElements = Array.from(content.querySelectorAll(".element.child-element"));
      let insertIndex = childItems.length;
      let targetElement = null;
      for (let i = 0; i < childElements.length; i++) {
        const elementRect = childElements[i].getBoundingClientRect();
        const elementTop = elementRect.top - contentRect.top;
        const elementBottom = elementRect.bottom - contentRect.top;
        const elementMiddle = (elementTop + elementBottom) / 2;
        if (relativeY < elementMiddle) {
          const childIndexStr = childElements[i].dataset.childIndex;
          if (childIndexStr) {
            const childIndex = parseInt(childIndexStr);
            if (!isNaN(childIndex)) {
              insertIndex = childIndex;
              targetElement = childElements[i];
            }
          }
          break;
        }
      }
      let childDropIndicator = content._dropIndicator;
      const currentTargetIndex = content._dropTargetIndex;
      if (currentTargetIndex !== insertIndex || childDropIndicator === null) {
        document.querySelectorAll(".elements-list").forEach((list) => {
          if (list._dropIndicator) {
            list._dropIndicator.remove();
            list._dropIndicator = null;
            list._dropTargetIndex = null;
          }
        });
        document.querySelectorAll(".dropdown-content").forEach((c) => {
          if (c._dropIndicator) {
            c._dropIndicator.remove();
            c._dropIndicator = null;
            c._dropTargetIndex = null;
          }
        });
        document.querySelectorAll(".drop-indicator").forEach((indicator) => {
          indicator.remove();
        });
        childDropIndicator = null;
        childDropIndicator = document.createElement("div");
        childDropIndicator.className = "drop-indicator";
        childDropIndicator.style.cssText = `
                    height: 2px;
                    background: #4a9eff;
                    margin: 4px 0;
                    border-radius: 1px;
                    pointer-events: none;
                    position: relative;
                    z-index: 1000;
                `;
        content._dropIndicator = childDropIndicator;
        content._dropTargetIndex = insertIndex;
        if (targetElement && content.contains(targetElement) && targetElement.parentElement === content) {
          content.insertBefore(childDropIndicator, targetElement);
        } else {
          content.appendChild(childDropIndicator);
        }
      }
    });
    content.addEventListener("dragleave", (e) => {
      if (!content.contains(e.relatedTarget)) {
        if (content._dropIndicator) {
          content._dropIndicator.remove();
          content._dropIndicator = null;
          content._dropTargetIndex = null;
        }
      }
    });
    content.addEventListener("drop", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (content._dropIndicator) {
        content._dropIndicator.remove();
        content._dropIndicator = null;
      }
      const dragData = this.app.appState.dragData || (() => {
        try {
          return JSON.parse(e.dataTransfer.getData("text/plain") || "{}");
        } catch {
          return {};
        }
      })();
      if (dragData.type === "element" && dragData.isChild && dragData.parentElementIndex === parentElementIndex) {
        if (content._dropTargetIndex !== null && content._dropTargetIndex !== void 0) {
          const pageFormat = this.app.formatRendererManager?.getPageFormat(pageId);
          if (pageFormat) {
            this.app.renderService.getRenderer()._preservingFormat = true;
          }
          this.app.reorderChildElement(pageId, binId, parentElementIndex, dragData.childIndex, content._dropTargetIndex);
        }
      }
      content._dropTargetIndex = null;
    });
    childItems.forEach((child, childIndex) => {
      const childElement = this.renderElement(pageId, binId, child, `${parentElementIndex}-${childIndex}`, childIndex, depth + 1);
      if (childElement) {
        childElement.classList.add("child-element");
        content.appendChild(childElement);
      }
    });
    container.appendChild(content);
    return container;
  }
  /**
   * Render an element
   * @param {string} pageId - Page ID
   * @param {string} binId - Bin ID
   * @param {Object} element - Element data
   * @param {number|string} elementIndex - Element index (may be string like "0-1" for nested children)
   * @param {number|null} childIndex - Child index if nested
   * @param {number} depth - Current nesting depth
   * @returns {HTMLElement} The rendered element
   */
  renderElement(pageId, binId, element, elementIndex, childIndex = null, depth = 0) {
    const div = document.createElement("div");
    const classes = ["element", element.type];
    if (element.completed) classes.push("completed");
    if (!(element.persistent || element.type === "image" || element.type === "calendar")) {
      if (element.repeats === false) {
        classes.push("one-time");
      } else if (element.recurringSchedule && element.recurringSchedule !== "daily") {
        classes.push("recurring-schedule");
      } else if (element.repeats === true || element.repeats !== false && !element.recurringSchedule) {
        classes.push("repeating-daily");
      }
      if (element.deadline) {
        classes.push("has-deadline");
      }
    }
    div.className = classes.join(" ");
    const elementId = `${pageId}-${binId}-${elementIndex}`;
    div.dataset.pageId = pageId;
    div.dataset.binId = binId;
    div.setAttribute("data-element-id", elementId);
    if (this.app.visualSettingsManager) {
      const page = this.app.appState?.documents?.find((p) => p.id === pageId);
      const viewFormat = page?.format || "default";
      this.app.visualSettingsManager.applyVisualSettings(div, "element", elementId, pageId, viewFormat);
    }
    const pageFormat = this.app.formatRendererManager?.getPageFormat?.(pageId);
    const supportsSharedDragDrop = !pageFormat || pageFormat === "grid-layout-format" || pageFormat === "horizontal-layout-format";
    if (supportsSharedDragDrop && (element.type === "task" || element.type === "note" || element.type === "header-checkbox" || element.type === "text")) {
      if (!this.sharedDragDrop) {
        this.sharedDragDrop = new SharedDragDrop(this.app);
      }
      this.sharedDragDrop.setupElementDragDrop(div, pageId, binId, elementIndex, element);
    } else {
      div.draggable = true;
      div.dataset.dragType = "element";
      div.dataset.pageId = pageId;
      div.dataset.binId = binId;
      div.dataset.elementIndex = elementIndex;
    }
    if (element.progress !== void 0) {
      const progressBarPlugin = document.createElement("div");
      progressBarPlugin.className = "element-progress-bar";
      progressBarPlugin.style.position = "absolute";
      progressBarPlugin.style.top = "0";
      progressBarPlugin.style.left = "0";
      progressBarPlugin.style.width = `${Math.min(100, Math.max(0, element.progress))}%`;
      progressBarPlugin.style.height = "100%";
      progressBarPlugin.style.backgroundColor = "rgba(74, 158, 255, 0.2)";
      progressBarPlugin.style.transition = "width 0.3s ease";
      progressBarPlugin.style.pointerEvents = "none";
      progressBarPlugin.style.zIndex = "0";
      div.appendChild(progressBarPlugin);
    }
    if (element.deadline) {
      const deadlineDiv = document.createElement("div");
      deadlineDiv.className = "element-deadline";
      deadlineDiv.style.position = "absolute";
      deadlineDiv.style.top = "5px";
      deadlineDiv.style.right = "5px";
      deadlineDiv.style.fontSize = "11px";
      deadlineDiv.style.color = "#ff6b6b";
      deadlineDiv.style.zIndex = "10";
      deadlineDiv.style.pointerEvents = "none";
      const updateDeadline = () => {
        const now = /* @__PURE__ */ new Date();
        const deadline = new Date(element.deadline);
        const diff = deadline - now;
        if (diff < 0) {
          deadlineDiv.textContent = "Overdue";
          deadlineDiv.style.color = "#ff0000";
        } else {
          const days = Math.floor(diff / (1e3 * 60 * 60 * 24));
          const hours = Math.floor(diff % (1e3 * 60 * 60 * 24) / (1e3 * 60 * 60));
          const minutes = Math.floor(diff % (1e3 * 60 * 60) / (1e3 * 60));
          if (days > 0) {
            deadlineDiv.textContent = `${days}d left`;
          } else {
            deadlineDiv.textContent = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
          }
          deadlineDiv.style.color = days === 0 ? "#ff6b6b" : "#ffa500";
        }
      };
      updateDeadline();
      const deadlineInterval = setInterval(updateDeadline, 6e4);
      div._deadlineInterval = deadlineInterval;
      div.appendChild(deadlineDiv);
    }
    if (typeof elementIndex === "string" && elementIndex.includes("-")) {
      const parts = elementIndex.split("-");
      div.dataset.elementIndex = parts[0];
      div.dataset.childIndex = parts[1];
      div.dataset.isChild = "true";
    } else {
      div.dataset.elementIndex = elementIndex;
      div.dataset.isChild = "false";
    }
    div.dataset.elementId = elementId;
    let isDragging = false;
    let mouseDownTime = 0;
    let mouseDownPos = null;
    let dragStarted = false;
    const handleMouseDown = (e) => {
      if (e.target.closest("input") || e.target.closest("button") || e.target.closest("textarea")) {
        return;
      }
      mouseDownTime = Date.now();
      mouseDownPos = { x: e.clientX, y: e.clientY };
      isDragging = false;
      dragStarted = false;
    };
    const handleMouseMove = (e) => {
      if (mouseDownPos && mouseDownTime > 0 && !dragStarted) {
        const dx = Math.abs(e.clientX - mouseDownPos.x);
        const dy = Math.abs(e.clientY - mouseDownPos.y);
        if (dx > 5 || dy > 5) {
          isDragging = true;
        }
      }
    };
    const handleMouseUp = () => {
      if (!dragStarted) {
        mouseDownTime = 0;
        mouseDownPos = null;
        isDragging = false;
      }
    };
    div.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    div._cleanupDragListeners = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
    EventHelper.setupDoubleClick(
      div,
      (e) => {
        this.app.showContextMenu(e, pageId, binId, elementIndex);
      },
      this.app.appState.doubleClickDelay,
      {
        filter: (e) => {
          if (isDragging || dragStarted) {
            isDragging = false;
            dragStarted = false;
            mouseDownTime = 0;
            mouseDownPos = null;
            return false;
          }
          this.app.appState.currentDocumentId = pageId;
          mouseDownTime = 0;
          mouseDownPos = null;
          return true;
        }
      }
    );
    div.addEventListener("dragstart", (e) => {
      if (e.target.closest("input") || e.target.closest("button") || e.target.closest("textarea")) {
        e.preventDefault();
        return;
      }
      e.stopPropagation();
      document.querySelectorAll(".element.drag-over, .element.nest-target").forEach((el) => {
        el.classList.remove("drag-over");
        el.classList.remove("nest-target");
      });
      this.app.appState.currentDragOverElement = null;
      dragStarted = true;
      isDragging = true;
      this.app.appState.isDragging = true;
      e.dataTransfer.effectAllowed = "move";
      let actualPageId = pageId;
      let actualElementIndex = elementIndex;
      let isChild = false;
      let parentElementIndex = null;
      let childIndex2 = null;
      if (typeof elementIndex === "string" && elementIndex.includes("-")) {
        const parts = elementIndex.split("-");
        actualElementIndex = parseInt(parts[0]);
        childIndex2 = parseInt(parts[1]);
        isChild = true;
        parentElementIndex = actualElementIndex;
      } else {
        actualElementIndex = parseInt(elementIndex);
      }
      const dragPayload = {
        type: "element",
        pageId: actualPageId,
        binId,
        elementIndex: actualElementIndex,
        isChild,
        parentElementIndex,
        childIndex: childIndex2
      };
      const { document: sourceDoc, group: sourceGroup } = this._getGroupByIds(actualPageId, binId);
      const parentElement = parentElementIndex !== null ? this._getRootItemByIndex(sourceGroup, parentElementIndex) : null;
      const sourceElement = isChild && parentElement && childIndex2 !== null ? this._getChildItemByIndex(sourceGroup, parentElement, childIndex2) : this._getRootItemByIndex(sourceGroup, actualElementIndex);
      const elementText = sourceElement?.text || "N/A";
      console.log("📌 ELEMENT SELECTED:", {
        page: actualPageId,
        index: actualElementIndex,
        isChild,
        parentIndex: parentElementIndex,
        childIndex: childIndex2,
        text: elementText,
        location: `${actualPageId}-${actualElementIndex}${isChild ? ` (child of ${parentElementIndex})` : ""}`
      });
      e.dataTransfer.setData("text/plain", JSON.stringify(dragPayload));
      this.app.appState.dragData = dragPayload;
      div.classList.add("dragging");
      const trashIcon = document.getElementById("trash-icon");
      if (trashIcon) {
        trashIcon.style.display = "flex";
      }
    });
    const dragLeaveTimeoutRef = { value: null };
    const isDraggingOverRef = { value: false };
    const isMouseInBounds = (x, y) => {
      const rect = div.getBoundingClientRect();
      return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
    };
    div.addEventListener("dragend", (e) => {
      div.classList.remove("dragging");
      isDragging = false;
      dragStarted = false;
      mouseDownTime = 0;
      mouseDownPos = null;
      this.app.appState.isDragging = false;
      const trashIcon = document.getElementById("trash-icon");
      if (trashIcon) {
        trashIcon.style.display = "none";
        trashIcon.classList.remove("drag-over-trash");
        trashIcon.style.background = "rgba(220, 53, 69, 0.9)";
        trashIcon.style.transform = "scale(1)";
      }
      if (this.app.appState.autoScrollInterval) {
        clearInterval(this.app.appState.autoScrollInterval);
        this.app.appState.autoScrollInterval = null;
      }
      this.app.appState.nestTargetElement = null;
      document.querySelectorAll(".nest-target").forEach((el) => {
        el.classList.remove("nest-target");
      });
      if (!e.dataTransfer.dropEffect || e.dataTransfer.dropEffect === "none") {
        setTimeout(() => {
          this.app.appState.dragData = null;
        }, 50);
      }
      document.querySelectorAll(".drag-over").forEach((el) => {
        el.classList.remove("drag-over");
      });
      isDraggingOverRef.value = false;
    });
    div.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const dragData = this.app.appState.dragData || (() => {
        try {
          return JSON.parse(e.dataTransfer.getData("text/plain") || "{}");
        } catch {
          return {};
        }
      })();
      if (dragLeaveTimeoutRef.value) {
        clearTimeout(dragLeaveTimeoutRef.value);
        dragLeaveTimeoutRef.value = null;
      }
      const isOverElement = div.contains(e.target) || e.target === div;
      const isOverChildElement = isOverElement && e.target !== div;
      const elementUnderMouse = document.elementFromPoint(e.clientX, e.clientY);
      const isOverElementByPosition = elementUnderMouse && (div.contains(elementUnderMouse) || elementUnderMouse === div);
      const target = e.target;
      let checkbox = null;
      if (target && target.type === "checkbox") {
        checkbox = target;
      } else if (target) {
        checkbox = target.closest('input[type="checkbox"]');
      }
      const isOverCheckbox = checkbox !== null && checkbox.closest(".element") === div;
      const targetIsChild = div.dataset.isChild === "true";
      const childrenContent = div.closest(".dropdown-content");
      if (dragData.type === "element" && dragData.isChild && targetIsChild) {
        const targetParentIndex = div.dataset.elementIndex ? parseInt(div.dataset.elementIndex.split("-")[0]) : null;
        if (childrenContent && dragData.parentElementIndex === targetParentIndex) {
          const mouseY = e.clientY;
          const contentRect = childrenContent.getBoundingClientRect();
          const relativeY = mouseY - contentRect.top;
          const childElements = Array.from(childrenContent.querySelectorAll(".element.child-element"));
          let insertIndex = childrenContent.dataset.parentElementIndex !== void 0 ? (() => {
            const parentIndex = parseInt(childrenContent.dataset.parentElementIndex);
            if (Number.isNaN(parentIndex)) return 0;
            const { group } = this._getGroupByIds(pageId, binId);
            const parentElement = this._getRootItemByIndex(group, parentIndex);
            return parentElement?.childIds?.length || 0;
          })() : 0;
          let targetElement = null;
          for (let i = 0; i < childElements.length; i++) {
            const elementRect = childElements[i].getBoundingClientRect();
            const elementTop = elementRect.top - contentRect.top;
            const elementBottom = elementRect.bottom - contentRect.top;
            const elementMiddle = (elementTop + elementBottom) / 2;
            if (relativeY < elementMiddle) {
              const childIndexStr = childElements[i].dataset.childIndex;
              if (childIndexStr) {
                const childIndex2 = parseInt(childIndexStr);
                if (!isNaN(childIndex2)) {
                  insertIndex = childIndex2;
                  targetElement = childElements[i];
                }
              }
              break;
            }
          }
          let childDropIndicator = childrenContent._dropIndicator;
          const currentTargetIndex = childrenContent._dropTargetIndex;
          if (currentTargetIndex !== insertIndex || childDropIndicator === null) {
            document.querySelectorAll(".elements-list").forEach((list) => {
              if (list._dropIndicator) {
                list._dropIndicator.remove();
                list._dropIndicator = null;
                list._dropTargetIndex = null;
              }
            });
            document.querySelectorAll(".dropdown-content").forEach((c) => {
              if (c._dropIndicator) {
                c._dropIndicator.remove();
                c._dropIndicator = null;
                c._dropTargetIndex = null;
              }
            });
            document.querySelectorAll(".drop-indicator").forEach((indicator) => {
              indicator.remove();
            });
            childDropIndicator = null;
            childDropIndicator = document.createElement("div");
            childDropIndicator.className = "drop-indicator";
            childDropIndicator.style.cssText = `
                            height: 2px;
                            background: #4a9eff;
                            margin: 4px 0;
                            border-radius: 1px;
                            pointer-events: none;
                            position: relative;
                            z-index: 1000;
                        `;
            childrenContent._dropIndicator = childDropIndicator;
            childrenContent._dropTargetIndex = insertIndex;
            if (targetElement && childrenContent.contains(targetElement) && targetElement.parentElement === childrenContent) {
              childrenContent.insertBefore(childDropIndicator, targetElement);
            } else {
              childrenContent.appendChild(childDropIndicator);
            }
          }
        }
      } else {
        const elementsList = div.closest(".elements-list");
        if (elementsList && dragData.type === "element") {
          const mouseY = e.clientY;
          const elementsListRect = elementsList.getBoundingClientRect();
          const relativeY = mouseY - elementsListRect.top;
          const allElements = Array.from(elementsList.querySelectorAll(".element:not(.child-element)"));
          let insertIndex = allElements.length;
          let targetElement = null;
          for (let i = 0; i < allElements.length; i++) {
            const elementRect = allElements[i].getBoundingClientRect();
            const elementTop = elementRect.top - elementsListRect.top;
            const elementBottom = elementRect.bottom - elementsListRect.top;
            const elementMiddle = (elementTop + elementBottom) / 2;
            if (relativeY < elementMiddle) {
              const elementIndexStr = allElements[i].dataset.elementIndex;
              if (elementIndexStr) {
                if (typeof elementIndexStr === "string" && elementIndexStr.includes("-")) {
                  const parentIndex = parseInt(elementIndexStr.split("-")[0]);
                  if (!isNaN(parentIndex)) {
                    insertIndex = parentIndex;
                    targetElement = allElements[i];
                  }
                } else {
                  const elementIndex2 = parseInt(elementIndexStr);
                  if (!isNaN(elementIndex2)) {
                    insertIndex = elementIndex2;
                    targetElement = allElements[i];
                  }
                }
              }
              break;
            }
          }
          if (targetElement === null) {
            const { group } = this._getGroupByIds(pageId, binId);
            if (group && insertIndex >= (group.items?.length || 0)) {
              const addButton = elementsList.querySelector(".add-element-btn");
              if (addButton) {
                targetElement = addButton;
              }
            }
          }
          let dropIndicator = elementsList._dropIndicator;
          const currentTargetIndex = elementsList._dropTargetIndex;
          if (currentTargetIndex !== insertIndex || dropIndicator === null) {
            document.querySelectorAll(".elements-list").forEach((list) => {
              if (list._dropIndicator) {
                list._dropIndicator.remove();
                list._dropIndicator = null;
                list._dropTargetIndex = null;
              }
            });
            document.querySelectorAll(".dropdown-content").forEach((c) => {
              if (c._dropIndicator) {
                c._dropIndicator.remove();
                c._dropIndicator = null;
                c._dropTargetIndex = null;
              }
            });
            document.querySelectorAll(".drop-indicator").forEach((indicator) => {
              indicator.remove();
            });
            dropIndicator = null;
            dropIndicator = document.createElement("div");
            dropIndicator.className = "drop-indicator";
            dropIndicator.style.cssText = `
                            height: 2px;
                            background: #4a9eff;
                            margin: 4px 0;
                            border-radius: 1px;
                            pointer-events: none;
                            position: relative;
                            z-index: 1000;
                        `;
            elementsList._dropIndicator = dropIndicator;
            elementsList._dropTargetIndex = insertIndex;
            if (targetElement && elementsList.contains(targetElement) && targetElement.parentElement === elementsList) {
              elementsList.insertBefore(dropIndicator, targetElement);
            } else {
              elementsList.appendChild(dropIndicator);
            }
          }
        }
      }
      if ((isOverElement || isOverElementByPosition) && dragData.type === "element") {
        if (this.app.appState.currentDragOverElement && this.app.appState.currentDragOverElement !== div) {
          this.app.appState.currentDragOverElement.classList.remove("drag-over");
          this.app.appState.currentDragOverElement.classList.remove("nest-target");
        }
        if (!isOverCheckbox) {
          e.dataTransfer.dropEffect = "move";
        }
        div.classList.add("drag-over");
        this.app.appState.currentDragOverElement = div;
        isDraggingOverRef.value = true;
        if (dragLeaveTimeoutRef.value) {
          clearTimeout(dragLeaveTimeoutRef.value);
          dragLeaveTimeoutRef.value = null;
        }
      } else {
        isDraggingOverRef.value = false;
        div.classList.remove("drag-over");
        div.classList.remove("nest-target");
        if (this.app.appState.currentDragOverElement === div) {
          this.app.appState.currentDragOverElement = null;
        }
      }
      const sourceIsChild = dragData.isChild || false;
      const sourceElementIndex = sourceIsChild ? dragData.parentElementIndex : dragData.elementIndex;
      let targetElementIndex = elementIndex;
      if (typeof elementIndex === "string" && elementIndex.includes("-")) {
        targetElementIndex = parseInt(elementIndex.split("-")[0]);
      } else {
        targetElementIndex = parseInt(elementIndex);
      }
      const isOverAnyPart = isOverElement || isOverElementByPosition;
      const canDrop = isOverAnyPart && dragData.type === "element" ? true : dragData.type === "element" && (dragData.pageId !== pageId || sourceElementIndex !== targetElementIndex || sourceIsChild && dragData.parentElementIndex !== targetElementIndex);
      if (isOverCheckbox && checkbox && dragData.type === "element") {
        const checkboxContainer = checkbox.closest(".element");
        let actualElementIndex = targetElementIndex;
        if (checkboxContainer) {
          const containerPageId = checkboxContainer.dataset.pageId;
          const containerBinId = checkboxContainer.dataset.binId;
          const containerElementIndexStr = checkboxContainer.dataset.elementIndex;
          if (containerPageId === pageId && containerBinId === binId && containerElementIndexStr) {
            if (typeof containerElementIndexStr === "string" && containerElementIndexStr.includes("-")) {
              actualElementIndex = parseInt(containerElementIndexStr.split("-")[0]);
            } else {
              actualElementIndex = parseInt(containerElementIndexStr);
            }
          }
        }
        const { group: targetGroup } = this._getGroupByIds(pageId, binId);
        const targetElement = targetGroup ? this._getRootItemByIndex(targetGroup, actualElementIndex) : null;
        const itemIndex = this._getItemIndexForGroup(targetGroup);
        const childItems = targetElement ? ItemHierarchy.getChildItems(targetElement, itemIndex) : [];
        const hasNestedChildren = childItems.some((child) => (child.childIds || []).length > 0);
        const canNest = targetElement && !hasNestedChildren;
        if (canNest) {
          e.dataTransfer.dropEffect = "copy";
          div.classList.contains("nest-target");
          div.classList.add("nest-target");
          this.app.appState.nestTargetElement = { pageId, binId, elementIndex: actualElementIndex };
        } else {
          e.dataTransfer.dropEffect = "move";
          div.classList.contains("nest-target");
          div.classList.remove("nest-target");
          this.app.appState.nestTargetElement = null;
        }
      } else if (canDrop) {
        if (targetIsChild && !dragData.isChild) {
          const targetParentIndex = div.dataset.elementIndex ? parseInt(div.dataset.elementIndex.split("-")[0]) : null;
          e.dataTransfer.dropEffect = "copy";
          div.classList.contains("nest-target");
          div.classList.add("nest-target");
          if (targetParentIndex !== null) {
            this.app.appState.nestTargetElement = { pageId, binId, elementIndex: targetParentIndex };
          }
        } else {
          const targetParentIndex = div.dataset.elementIndex ? parseInt(div.dataset.elementIndex.split("-")[0]) : null;
          if (dragData.isChild && targetIsChild && dragData.parentElementIndex === targetParentIndex) {
            e.dataTransfer.dropEffect = "move";
            div.classList.contains("drag-over");
            div.classList.add("drag-over");
            div.classList.contains("nest-target");
            div.classList.remove("nest-target");
            this.app.appState.nestTargetElement = null;
          } else {
            e.dataTransfer.dropEffect = "move";
            div.classList.contains("drag-over");
            div.classList.add("drag-over");
            div.classList.contains("nest-target");
            div.classList.remove("nest-target");
            this.app.appState.nestTargetElement = null;
          }
        }
      } else {
        if (isOverAnyPart && dragData.type === "element") {
          e.dataTransfer.dropEffect = "move";
          div.classList.add("drag-over");
        } else {
          e.dataTransfer.dropEffect = "none";
          div.classList.contains("drag-over");
          div.classList.contains("nest-target");
          div.classList.remove("drag-over");
          div.classList.remove("nest-target");
          this.app.appState.nestTargetElement = null;
        }
      }
      if ((isOverChildElement || isOverElementByPosition) && dragData.type === "element" && !div.classList.contains("drag-over")) {
        div.classList.add("drag-over");
        e.dataTransfer.dropEffect = "move";
      }
    });
    div.addEventListener("dragleave", (e) => {
      const relatedTarget = e.relatedTarget;
      const elementUnderMouse = document.elementFromPoint(e.clientX, e.clientY);
      const stillOverElementByPosition = elementUnderMouse && (div.contains(elementUnderMouse) || elementUnderMouse === div);
      const stillOverElementByBounds = isMouseInBounds(e.clientX, e.clientY);
      if (stillOverElementByPosition || stillOverElementByBounds) {
        if (dragLeaveTimeoutRef.value) {
          clearTimeout(dragLeaveTimeoutRef.value);
          dragLeaveTimeoutRef.value = null;
        }
        return;
      }
      let isRelatedTargetStillInDiv = false;
      if (relatedTarget) {
        let nodeToCheck = relatedTarget;
        if (relatedTarget.nodeType === Node.TEXT_NODE) {
          nodeToCheck = relatedTarget.parentElement;
        }
        while (nodeToCheck && nodeToCheck !== div) {
          if (div.contains(nodeToCheck)) {
            isRelatedTargetStillInDiv = true;
            break;
          }
          nodeToCheck = nodeToCheck.parentElement;
        }
        if (nodeToCheck === div) {
          isRelatedTargetStillInDiv = true;
        }
      }
      if (isRelatedTargetStillInDiv) {
        if (dragLeaveTimeoutRef.value) {
          clearTimeout(dragLeaveTimeoutRef.value);
          dragLeaveTimeoutRef.value = null;
        }
        return;
      }
      if (dragLeaveTimeoutRef.value) {
        clearTimeout(dragLeaveTimeoutRef.value);
        dragLeaveTimeoutRef.value = null;
      }
      isDraggingOverRef.value = false;
      dragLeaveTimeoutRef.value = setTimeout(() => {
        if (isDraggingOverRef.value) {
          dragLeaveTimeoutRef.value = null;
          return;
        }
        const elementUnderMouseDelayed = document.elementFromPoint(e.clientX, e.clientY);
        const stillOverElementByTarget = elementUnderMouseDelayed && (div.contains(elementUnderMouseDelayed) || elementUnderMouseDelayed === div);
        const stillOverElementByBoundsDelayed = isMouseInBounds(e.clientX, e.clientY);
        const stillOverElement = stillOverElementByTarget || stillOverElementByBoundsDelayed;
        if (!stillOverElement) {
          div.classList.remove("drag-over");
          div.classList.remove("nest-target");
          if (this.app.appState.currentDragOverElement === div) {
            this.app.appState.currentDragOverElement = null;
          }
          if (this.app.appState.nestTargetElement && this.app.appState.nestTargetElement.pageId === pageId && this.app.appState.nestTargetElement.elementIndex === elementIndex) {
            this.app.appState.nestTargetElement = null;
          }
        }
        dragLeaveTimeoutRef.value = null;
      }, 30);
    });
    div.addEventListener("drop", (e) => {
      e.preventDefault();
      e.stopPropagation();
      isDraggingOverRef.value = false;
      document.querySelectorAll(".element.drag-over, .element.nest-target").forEach((el) => {
        el.classList.remove("drag-over");
        el.classList.remove("nest-target");
      });
      this.app.appState.currentDragOverElement = null;
      let actualElementDiv = div;
      if (e.target && e.target.type === "checkbox") {
        actualElementDiv = e.target.closest(".element") || div;
      } else if (e.target && e.target.closest('input[type="checkbox"]')) {
        actualElementDiv = e.target.closest(".element") || div;
      }
      const actualPageId = actualElementDiv.dataset.pageId || pageId;
      const actualBinId = actualElementDiv.dataset.binId || binId;
      const actualElementIndexStr = actualElementDiv.dataset.elementIndex;
      let actualElementIndex = elementIndex;
      if (actualElementIndexStr) {
        if (typeof actualElementIndexStr === "string" && actualElementIndexStr.includes("-")) {
          actualElementIndex = actualElementIndexStr;
        } else {
          actualElementIndex = parseInt(actualElementIndexStr);
        }
      }
      div.classList.remove("drag-over");
      div.classList.remove("nest-target");
      let dragData = this.app.appState.dragData;
      if (!dragData) {
        try {
          const dataStr = e.dataTransfer.getData("text/plain");
          if (dataStr) {
            dragData = JSON.parse(dataStr);
          } else {
            console.error("No drag data available in element drop");
            return;
          }
        } catch (err) {
          console.error("Failed to parse drag data:", err);
          return;
        }
      }
      const childrenContent = div.closest(".dropdown-content");
      let indicatorTargetIndex = null;
      let indicatorIsChild = false;
      if (dragData.isChild && childrenContent && childrenContent._dropTargetIndex !== null && childrenContent._dropTargetIndex !== void 0) {
        indicatorTargetIndex = childrenContent._dropTargetIndex;
        indicatorIsChild = true;
        if (childrenContent._dropIndicator) {
          childrenContent._dropIndicator.remove();
          childrenContent._dropIndicator = null;
        }
        childrenContent._dropTargetIndex = null;
      } else {
        const elementsList = div.closest(".elements-list");
        if (elementsList && elementsList._dropTargetIndex !== null && elementsList._dropTargetIndex !== void 0) {
          indicatorTargetIndex = elementsList._dropTargetIndex;
          indicatorIsChild = false;
          if (elementsList._dropIndicator) {
            elementsList._dropIndicator.remove();
            elementsList._dropIndicator = null;
          }
          elementsList._dropTargetIndex = null;
        }
      }
      const targetIsChild = actualElementDiv.dataset.isChild === "true";
      const targetParentIndex = actualElementDiv.dataset.elementIndex ? parseInt(actualElementDiv.dataset.elementIndex.split("-")[0]) : null;
      let targetElementIndex = actualElementIndex;
      if (typeof actualElementIndex === "string" && actualElementIndex.includes("-")) {
        targetElementIndex = parseInt(actualElementIndex.split("-")[0]);
      } else {
        targetElementIndex = parseInt(actualElementIndex);
      }
      if (indicatorTargetIndex !== null) {
        if (indicatorIsChild) {
          targetElementIndex = targetParentIndex !== null ? targetParentIndex : targetElementIndex;
        } else {
          targetElementIndex = indicatorTargetIndex;
        }
      }
      const target = e.target;
      let checkbox = null;
      if (target && target.type === "checkbox") {
        checkbox = target;
      } else if (target) {
        checkbox = target.closest('input[type="checkbox"]');
      }
      const isOverCheckbox = checkbox !== null;
      let checkboxElement = null;
      let checkboxElementIndex = targetElementIndex;
      if (isOverCheckbox && checkbox) {
        checkboxElement = checkbox.closest(".element");
        if (checkboxElement) {
          const checkboxPageId = checkboxElement.dataset.pageId;
          const checkboxBinId = checkboxElement.dataset.binId;
          const checkboxElementIndexStr = checkboxElement.dataset.elementIndex;
          if (checkboxPageId === actualPageId && checkboxBinId === actualBinId && checkboxElementIndexStr) {
            if (typeof checkboxElementIndexStr === "string" && checkboxElementIndexStr.includes("-")) {
              checkboxElementIndex = parseInt(checkboxElementIndexStr.split("-")[0]);
            } else {
              checkboxElementIndex = parseInt(checkboxElementIndexStr);
            }
          }
        }
      }
      const savedNestTarget = this.app.appState.nestTargetElement;
      let shouldNest = isOverCheckbox && savedNestTarget && savedNestTarget.pageId === actualPageId && savedNestTarget.binId === actualBinId && savedNestTarget.elementIndex === checkboxElementIndex || targetIsChild && !dragData.isChild && savedNestTarget && savedNestTarget.pageId === actualPageId && savedNestTarget.binId === actualBinId && savedNestTarget.elementIndex === targetParentIndex;
      this.app.appState.nestTargetElement = null;
      if (dragData && dragData.type === "element") {
        const { group: targetGroup } = this._getGroupByIds(actualPageId, actualBinId);
        let targetElement = null;
        if (targetIsChild && targetParentIndex !== null) {
          const parentElement = targetGroup ? this._getRootItemByIndex(targetGroup, targetParentIndex) : null;
          const childIdx = typeof actualElementIndex === "string" ? parseInt(actualElementIndex.split("-")[1]) : 0;
          targetElement = parentElement ? this._getChildItemByIndex(targetGroup, parentElement, childIdx) : null;
          targetElement?.text || "N/A";
        } else {
          targetElement = targetGroup ? this._getRootItemByIndex(targetGroup, targetElementIndex) : null;
          targetElement?.text || "N/A";
        }
        const isDroppingChildOnOwnParent = dragData.isChild && !targetIsChild && dragData.parentElementIndex !== null && targetElementIndex === dragData.parentElementIndex;
        if (isDroppingChildOnOwnParent && !isOverCheckbox) {
          shouldNest = false;
        }
        if (shouldNest) {
          const nestTargetIndex = isOverCheckbox ? checkboxElementIndex : targetIsChild ? targetParentIndex : targetElementIndex;
          if (isOverCheckbox) {
            if (dragData.isChild && dragData.parentElementIndex !== null && dragData.childIndex !== null) {
              const { group: sourceGroup } = this._getGroupByIds(dragData.pageId, dragData.binId);
              const parentElement = sourceGroup ? this._getRootItemByIndex(sourceGroup, dragData.parentElementIndex) : null;
              const childElement = parentElement ? this._getChildItemByIndex(sourceGroup, parentElement, dragData.childIndex) : null;
              if (parentElement && childElement) {
                if (!Array.isArray(parentElement.childIds)) {
                  parentElement.childIds = [];
                }
                parentElement.childIds.splice(dragData.childIndex, 1);
                childElement.parentId = null;
                this.this.app.nestElement(
                  dragData.pageId,
                  dragData.binId,
                  dragData.parentElementIndex,
                  actualPageId,
                  actualBinId,
                  nestTargetIndex,
                  false,
                  null,
                  null,
                  childElement
                );
              } else {
                const pageFormat2 = this.app.formatRendererManager?.getPageFormat(actualPageId);
                if (pageFormat2) {
                  this.app.renderService.getRenderer()._preservingFormat = true;
                }
                this.this.app.nestElement(
                  dragData.pageId,
                  dragData.binId,
                  dragData.elementIndex,
                  actualPageId,
                  actualBinId,
                  nestTargetIndex,
                  dragData.isChild || false,
                  dragData.parentElementIndex || null,
                  dragData.childIndex || null
                );
              }
            } else {
              const pageFormat2 = this.app.formatRendererManager?.getPageFormat(actualPageId);
              if (pageFormat2) {
                this.app.renderService.getRenderer()._preservingFormat = true;
              }
              this.this.app.nestElement(
                dragData.pageId,
                dragData.binId,
                dragData.elementIndex,
                actualPageId,
                actualBinId,
                nestTargetIndex,
                false,
                null,
                null
              );
            }
          } else {
            if (isDroppingChildOnOwnParent) ;
            else {
              const pageFormat2 = this.app.formatRendererManager?.getPageFormat(actualPageId);
              if (pageFormat2) {
                this.app.renderService.getRenderer()._preservingFormat = true;
              }
              this.this.app.nestElement(
                dragData.pageId,
                dragData.binId,
                dragData.elementIndex,
                actualPageId,
                actualBinId,
                nestTargetIndex,
                dragData.isChild || false,
                dragData.parentElementIndex || null,
                dragData.childIndex || null
              );
            }
          }
        } else if (targetIsChild && !dragData.isChild) {
          const pageFormat2 = this.app.formatRendererManager?.getPageFormat(actualPageId);
          if (pageFormat2) {
            this.app.renderService.getRenderer()._preservingFormat = true;
          }
          this.this.app.nestElement(
            dragData.pageId,
            dragData.binId,
            dragData.elementIndex,
            actualPageId,
            actualBinId,
            targetParentIndex,
            false,
            null,
            null
          );
        } else if (dragData.isChild && targetIsChild && dragData.parentElementIndex === targetParentIndex) {
          let targetChildIndex = null;
          if (indicatorIsChild && indicatorTargetIndex !== null) {
            targetChildIndex = indicatorTargetIndex;
          } else {
            targetChildIndex = typeof actualElementIndex === "string" ? parseInt(actualElementIndex.split("-")[1]) : 0;
          }
          const pageFormat2 = this.app.formatRendererManager?.getPageFormat(actualPageId);
          if (pageFormat2) {
            this.app.renderService.getRenderer()._preservingFormat = true;
          }
          this.app.reorderChildElement(actualPageId, actualBinId, dragData.parentElementIndex, dragData.childIndex, targetChildIndex);
        } else if (dragData.isChild && targetIsChild) {
          const pageFormat2 = this.app.formatRendererManager?.getPageFormat(actualPageId);
          if (pageFormat2) {
            this.app.renderService.getRenderer()._preservingFormat = true;
          }
          this.this.app.nestElement(
            dragData.pageId,
            dragData.binId,
            dragData.elementIndex,
            actualPageId,
            actualBinId,
            targetParentIndex,
            dragData.isChild || false,
            dragData.parentElementIndex || null,
            dragData.childIndex || null
          );
        } else if (dragData.isChild) {
          const isDroppingOnOwnParent = !targetIsChild && dragData.parentElementIndex !== null && targetElementIndex === dragData.parentElementIndex;
          let unnestTargetIndex = indicatorTargetIndex !== null && !indicatorIsChild ? indicatorTargetIndex : targetElementIndex;
          const isDroppingOnParent = isDroppingOnOwnParent;
          const isDroppingOnSibling = !targetIsChild && dragData.parentElementIndex !== null && targetElementIndex !== dragData.parentElementIndex;
          if (targetIsChild && targetParentIndex !== null) {
            unnestTargetIndex = targetParentIndex;
          } else if (!targetIsChild && dragData.parentElementIndex !== null) {
            const { group: sourceGroup } = this._getGroupByIds(dragData.pageId, dragData.binId);
            if (sourceGroup && actualPageId === dragData.pageId && sourceGroup.items?.[dragData.parentElementIndex]) {
              const isDroppingOnParent2 = targetElementIndex === dragData.parentElementIndex;
              if (isDroppingOnParent2) {
                unnestTargetIndex = dragData.parentElementIndex;
              } else if (targetElementIndex < dragData.parentElementIndex) {
                unnestTargetIndex = targetElementIndex;
              } else {
                unnestTargetIndex = targetElementIndex;
              }
            }
          }
          console.log("🔄 UNNESTING CHILD:", {
            sourcePage: dragData.pageId,
            parentIndex: dragData.parentElementIndex,
            childIndex: dragData.childIndex,
            targetPage: actualPageId,
            targetElementIndex,
            targetIsChild,
            isDroppingOnParent,
            isDroppingOnSibling,
            calculatedTargetIndex: unnestTargetIndex,
            sourceBinElementsLength: this._getGroupByIds(dragData.pageId, dragData.binId).group?.items?.length || 0,
            parentElementBefore: (() => {
              const { group } = this._getGroupByIds(dragData.pageId, dragData.binId);
              const parentElement = this._getRootItemByIndex(group, dragData.parentElementIndex);
              return parentElement?.childIds?.length || 0;
            })(),
            willUnnest: true
          });
          const unnestIsChild = dragData.isChild === true;
          const unnestParentIndex = dragData.parentElementIndex;
          const unnestChildIndex = dragData.childIndex;
          console.log("🔧 CALLING moveElement FOR UNNEST:", {
            sourcePageId: dragData.pageId,
            sourceElementIndex: dragData.elementIndex,
            targetPageId: actualPageId,
            targetElementIndex: unnestTargetIndex,
            isChild: dragData.isChild,
            isChildType: typeof dragData.isChild,
            isChildValue: unnestIsChild,
            parentElementIndex: unnestParentIndex,
            childIndex: unnestChildIndex,
            dragDataKeys: Object.keys(dragData)
          });
          if (!unnestIsChild || unnestParentIndex === null || unnestParentIndex === void 0 || unnestChildIndex === null || unnestChildIndex === void 0) {
            console.error("❌ INVALID UNNEST PARAMETERS:", {
              isChild: unnestIsChild,
              parentElementIndex: unnestParentIndex,
              childIndex: unnestChildIndex,
              dragData
            });
            return;
          }
          const pageFormat2 = this.app.formatRendererManager?.getPageFormat(actualPageId);
          if (pageFormat2) {
            this.app.renderService.getRenderer()._preservingFormat = true;
          }
          this.app.moveElement(
            dragData.pageId,
            dragData.binId,
            dragData.elementIndex,
            actualPageId,
            actualBinId,
            unnestTargetIndex,
            unnestIsChild,
            unnestParentIndex,
            unnestChildIndex
          );
        } else if (dragData.pageId !== actualPageId) {
          const pageFormat2 = this.app.formatRendererManager?.getPageFormat(actualPageId);
          if (pageFormat2) {
            this.app.renderService.getRenderer()._preservingFormat = true;
          }
          this.app.moveElement(
            dragData.pageId,
            dragData.binId,
            dragData.elementIndex,
            actualPageId,
            actualBinId,
            targetElementIndex,
            dragData.isChild || false,
            dragData.parentElementIndex || null,
            dragData.childIndex || null
          );
        } else {
          const pageFormat2 = this.app.formatRendererManager?.getPageFormat(actualPageId);
          if (pageFormat2) {
            this.app.renderService.getRenderer()._preservingFormat = true;
          }
          this.app.moveElement(
            dragData.pageId,
            dragData.binId,
            dragData.elementIndex,
            actualPageId,
            actualBinId,
            targetElementIndex,
            dragData.isChild || false,
            dragData.parentElementIndex || null,
            dragData.childIndex || null
          );
        }
      }
      this.app.appState.dragData = null;
    });
    let tooltipText = "";
    if (element.timeAllocated) {
      tooltipText += `Time: ${element.timeAllocated}`;
    }
    if (element.funModifier) {
      tooltipText += tooltipText ? ` | Fun: ${element.funModifier}` : `Fun: ${element.funModifier}`;
    }
    this.typeRegistry.renderElement(div, pageId, binId, element, elementIndex, depth, (pageId2, binId2, parentElement, parentElementIndex, depth2) => {
      return this.renderChildren(pageId2, binId2, parentElement, parentElementIndex, depth2);
    });
    if (element.relationships) {
      const hasRelationships = element.relationships.blocks?.length > 0 || element.relationships.dependsOn?.length > 0 || element.relationships.relatedTo?.length > 0;
      if (hasRelationships) {
        const relationshipIndicator = document.createElement("span");
        relationshipIndicator.className = "relationship-indicator";
        relationshipIndicator.textContent = "🔗";
        relationshipIndicator.title = "Has relationships - click to manage";
        relationshipIndicator.style.cssText = "margin-left: 8px; cursor: pointer; font-size: 14px; opacity: 0.7;";
        relationshipIndicator.addEventListener("click", (e) => {
          e.stopPropagation();
          const elementId2 = this.app.relationshipManager.getElementId(pageId, binId, elementIndex);
          const relationships = this.app.relationshipManager.getRelationships(elementId2);
          const inverseRelationships = this.app.relationshipManager.getInverseRelationships(elementId2);
          const modal = document.getElementById("modal");
          const modalBody = document.getElementById("modal-body");
          let html = `
                        <h3>Element Relationships</h3>
                        <div class="relationships-section">
                            <h4>Outgoing Relationships</h4>
                            <div id="outgoing-relationships">
                    `;
          if (relationships.length === 0) {
            html += "<p>No outgoing relationships</p>";
          } else {
            relationships.forEach((rel) => {
              const target = this.app.relationshipManager.getElement(rel.to);
              if (target) {
                html += `
                                    <div class="relationship-item">
                                        <span class="relationship-type">${rel.type}</span>
                                        <span class="relationship-target">${this.app.escapeHtml(target.element.text || "Untitled")}</span>
                                        <button class="remove-relationship" data-to="${rel.to}" data-type="${rel.type}">Remove</button>
                                    </div>
                                `;
              }
            });
          }
          html += `
                            </div>
                            <h4>Incoming Relationships</h4>
                            <div id="incoming-relationships">
                    `;
          if (inverseRelationships.length === 0) {
            html += "<p>No incoming relationships</p>";
          } else {
            inverseRelationships.forEach((rel) => {
              const source = this.app.relationshipManager.getElement(rel.from);
              if (source) {
                html += `
                                    <div class="relationship-item">
                                        <span class="relationship-source">${this.app.escapeHtml(source.element.text || "Untitled")}</span>
                                        <span class="relationship-type">${rel.type}</span>
                                        <span>this element</span>
                                    </div>
                                `;
              }
            });
          }
          html += `
                            </div>
                            <div class="add-relationship-section">
                                <h4>Add Relationship</h4>
                                <select id="relationship-type">
                                    ${this.app.relationshipManager.getRelationshipTypes().map(
            (relType) => `<option value="${relType.type}">${relType.label}${relType.description ? ` - ${relType.description}` : ""}</option>`
          ).join("")}
                                </select>
                                <select id="relationship-target">
                                    <option value="">Select item...</option>
                    `;
          this.app.appState.documents.forEach((doc) => {
            if (doc.groups) {
              doc.groups.forEach((group) => {
                const items = group.items || [];
                group.items = items;
                items.forEach((el, idx) => {
                  const targetId = this.app.relationshipManager.getElementId(doc.id, group.id, idx);
                  if (targetId !== elementId2) {
                    html += `<option value="${targetId}">${this.app.escapeHtml(el.text || "Untitled")}</option>`;
                  }
                });
              });
            }
          });
          html += `
                                </select>
                                <button id="add-relationship-btn">Add Relationship</button>
                            </div>
                            <div style="margin-top: 20px;">
                                <button class="cancel" onclick="app.modalHandler.closeModal()">Close</button>
                            </div>
                        </div>
                    `;
          modalBody.innerHTML = html;
          modal.classList.add("active");
          document.getElementById("add-relationship-btn").addEventListener("click", () => {
            const type = document.getElementById("relationship-type").value;
            const targetId = document.getElementById("relationship-target").value;
            if (!targetId) {
              alert("Please select a target element");
              return;
            }
            const success = this.app.relationshipManager.addRelationship(elementId2, targetId, type);
            if (success) {
              eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
              this.app.modalHandler.closeModal();
            } else {
              alert("Failed to add relationship. Check console for details.");
            }
          });
          document.querySelectorAll(".remove-relationship").forEach((btn) => {
            btn.addEventListener("click", () => {
              const toId = btn.dataset.to;
              const type = btn.dataset.type;
              this.app.relationshipManager.removeRelationship(elementId2, toId, type);
              eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
              this.app.modalHandler.closeModal();
            });
          });
        });
        const taskHeader = div.querySelector(".task-header");
        if (taskHeader) {
          taskHeader.appendChild(relationshipIndicator);
        } else {
          div.appendChild(relationshipIndicator);
        }
      }
    }
    if (element.tags && element.tags.length > 0) {
      const tagsContainer = document.createElement("div");
      tagsContainer.className = "element-tags";
      tagsContainer.style.cssText = "display: flex; flex-wrap: wrap; gap: 3px; margin-top: 5px; font-size: 10px;";
      element.tags.forEach((tag) => {
        const tagSpan = document.createElement("span");
        tagSpan.className = "element-tag";
        tagSpan.textContent = tag;
        tagSpan.style.cssText = "background: #4a9eff; color: white; padding: 2px 6px; border-radius: 10px;";
        tagsContainer.appendChild(tagSpan);
      });
      div.appendChild(tagsContainer);
    }
    return div;
  }
}
class AnimationRenderer {
  constructor(app2) {
    this.app = app2;
  }
  animateMovements(oldPositions) {
    console.log("═══════════════════════════════════════════════════════════");
    console.log("🎬 ANIMATION SEQUENCE STARTING");
    console.log("═══════════════════════════════════════════════════════════");
    console.log("📊 Old positions captured:", {
      documents: Object.keys(oldPositions.documents || {}).length,
      items: Object.keys(oldPositions.items || {}).length
    });
    const binCount = document.querySelectorAll(".bin").length;
    const elementCount = document.querySelectorAll(".element").length;
    console.log(`📦 Current DOM: ${binCount} groups, ${elementCount} items`);
    if (this.app.appState.lastMovedElement) {
      console.log("🎯 Item being moved:", {
        pageId: this.app.appState.lastMovedElement.pageId,
        elementIndex: this.app.appState.lastMovedElement.elementIndex,
        elementText: this.app.appState.lastMovedElement.element?.text?.substring(0, 30) || "N/A"
      });
    } else {
      console.log("⚠️  No lastMovedElement tracked - this might be initial render");
    }
    let pageAnimations = 0;
    document.querySelectorAll(".page").forEach((pageElement) => {
      const pageId = pageElement.dataset.pageId;
      if (!pageId) return;
      const oldPos = oldPositions.documents[pageId];
      if (!oldPos) {
        console.log(`📄 Document ${pageId}: New document, skipping animation`);
        return;
      }
      const newRect = pageElement.getBoundingClientRect();
      const deltaY = oldPos.top - newRect.top;
      const deltaX = oldPos.left - newRect.left;
      if (Math.abs(deltaY) > 1 || Math.abs(deltaX) > 1) {
        pageAnimations++;
        console.log(`📄 Document ${pageId}: Animating (deltaY: ${deltaY.toFixed(2)}px, deltaX: ${deltaX.toFixed(2)}px)`);
        pageElement.style.transition = "transform 2.5s ease-out";
        pageElement.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
        void pageElement.offsetHeight;
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            pageElement.style.transform = "";
            setTimeout(() => {
              pageElement.style.transition = "";
              pageElement.style.transform = "";
            }, 2500);
          });
        });
      }
    });
    let elementAnimations = 0;
    let movingElementFound = false;
    document.querySelectorAll(".element").forEach((elementNode) => {
      const pageId = elementNode.dataset.pageId;
      const elementIndex = elementNode.dataset.elementIndex;
      if (!pageId || elementIndex === void 0) return;
      const textElement = elementNode.querySelector(".task-text, .header-text, .audio-status");
      let oldPos = null;
      let matchMethod = "none";
      if (textElement) {
        const text = (textElement.textContent || textElement.innerText || "").substring(0, 20);
        for (const [key, pos] of Object.entries(oldPositions.items)) {
          if (pos.pageId === pageId && key.includes(text)) {
            oldPos = pos;
            matchMethod = "text-content";
            break;
          }
        }
      }
      if (!oldPos) {
        const key = `${pageId}-${elementIndex}`;
        oldPos = oldPositions.items[key];
        if (oldPos) matchMethod = "index";
      }
      if (!oldPos) {
        console.log(`🔹 Item ${pageId}-${elementIndex}: New item, skipping animation`);
        return;
      }
      const newRect = elementNode.getBoundingClientRect();
      let deltaY = oldPos.top - newRect.top;
      let deltaX = oldPos.left - newRect.left;
      if (Math.abs(deltaX) > 10) {
        console.log(`   🔍 Position debug for ${pageId}-${elementIndex}:`);
        console.log(`      Old: left=${oldPos.left.toFixed(2)}, top=${oldPos.top.toFixed(2)}`);
        console.log(`      New: left=${newRect.left.toFixed(2)}, top=${newRect.top.toFixed(2)}`);
        console.log(`      Delta: deltaX=${deltaX.toFixed(2)}, deltaY=${deltaY.toFixed(2)}`);
      }
      if (Math.abs(deltaY) > 1 || Math.abs(deltaX) > 1) {
        elementAnimations++;
        let isMovingElement = false;
        if (this.app.appState.lastMovedElement) {
          const currentIsChild = elementNode.dataset.isChild === "true";
          elementNode.dataset.childIndex;
          const trackedWasChild = this.app.appState.lastMovedElement.oldElementIndex !== null && typeof this.app.appState.lastMovedElement.oldElementIndex === "string" && this.app.appState.lastMovedElement.oldElementIndex.includes("-");
          const newIndexMatch = this.app.appState.lastMovedElement.pageId === pageId && this.app.appState.lastMovedElement.elementIndex === parseInt(elementIndex);
          if (currentIsChild && !trackedWasChild) {
            if (newIndexMatch) {
              console.log(`   ⚠️  Index match but element is nested child (not the moved element)`);
            }
          } else {
            const currentText = textElement ? (textElement.textContent || textElement.innerText || "").trim().substring(0, 50) : "";
            const trackedText = (this.app.appState.lastMovedElement.element?.text || "").trim().substring(0, 50);
            const textMatch = currentText === trackedText && currentText.length > 0;
            if (this.app.appState.lastMovedElement.oldPosition && newIndexMatch && textMatch) {
              deltaY = this.app.appState.lastMovedElement.oldPosition.top - newRect.top;
              deltaX = this.app.appState.lastMovedElement.oldPosition.left - newRect.left;
              isMovingElement = newIndexMatch && textMatch && Math.abs(deltaY) > 10;
              if (isMovingElement) {
                console.log(`   ✅ Using directly captured old position: (${this.app.appState.lastMovedElement.oldPosition.left.toFixed(2)}, ${this.app.appState.lastMovedElement.oldPosition.top.toFixed(2)})`);
              }
            } else {
              isMovingElement = newIndexMatch && textMatch && Math.abs(deltaY) > 10;
            }
            if (newIndexMatch && !isMovingElement) {
              console.log(`   ⚠️  Index match but not moving element: textMatch=${textMatch} (current="${currentText}", tracked="${trackedText}"), deltaY=${deltaY.toFixed(2)}`);
            }
          }
        }
        if (isMovingElement) {
          movingElementFound = true;
          console.log(`🎯 MOVING ELEMENT ${pageId}-${elementIndex}:`);
          console.log(`   📍 Position change: deltaY=${deltaY.toFixed(2)}px, deltaX=${deltaX.toFixed(2)}px`);
          console.log(`   🔍 Matched by: ${matchMethod}`);
          console.log(`   📝 Text: ${textElement ? (textElement.textContent || textElement.innerText || "").substring(0, 40) : "N/A"}`);
        } else {
          console.log(`⬇️  DISPLACED ELEMENT ${pageId}-${elementIndex}:`);
          console.log(`   📍 Position change: deltaY=${deltaY.toFixed(2)}px, deltaX=${deltaX.toFixed(2)}px`);
          console.log(`   🔍 Matched by: ${matchMethod}`);
        }
        if (isMovingElement) {
          console.log(`   🎬 Step 1: Starting at old position, POP-OUT (scale 1.15, z-index 1000)`);
          console.log(`   🔍 Transform: translate(${deltaX.toFixed(2)}px, ${deltaY.toFixed(2)}px) scale(1.15)`);
          console.log(`   📊 Old pos: (${oldPos.left.toFixed(2)}, ${oldPos.top.toFixed(2)}), New pos: (${newRect.left.toFixed(2)}, ${newRect.top.toFixed(2)})`);
          elementNode.style.transition = "transform 0s, scale 0.3s ease-out, z-index 0s";
          elementNode.style.zIndex = "1000";
          elementNode.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(1.15)`;
          void elementNode.offsetHeight;
          setTimeout(() => {
            console.log(`   🎬 Step 2: POP-OUT complete, SLIDE to new position (scale 1.0)`);
            elementNode.style.transition = "transform 2.5s ease-out, scale 0.3s ease-out";
            elementNode.style.transform = "scale(1.0)";
            void elementNode.offsetHeight;
            setTimeout(() => {
              console.log(`   🎬 Step 3: SLIDE complete, POP-IN (scale 1.05 -> 1.0)`);
              elementNode.style.transition = "scale 0.2s ease-out, z-index 0s 0.2s";
              elementNode.style.transform = "scale(1.05)";
              void elementNode.offsetHeight;
              requestAnimationFrame(() => {
                elementNode.style.transform = "scale(1.0)";
                setTimeout(() => {
                  console.log(`   ✅ Step 4: POP-IN complete, animation finished`);
                  elementNode.style.zIndex = "";
                  elementNode.style.transition = "";
                  elementNode.style.transform = "";
                  this.app.appState.lastMovedElement = null;
                }, 200);
              });
            }, 2500);
          }, 300);
        } else {
          console.log(`   🎬 Starting DISPLACE animation (2.5s slide)`);
          elementNode.style.transition = "transform 2.5s ease-out";
          elementNode.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
          void elementNode.offsetHeight;
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              console.log(`   🎬 DISPLACE animation triggered (removing transform)`);
              elementNode.style.transform = "";
              setTimeout(() => {
                console.log(`   ✅ DISPLACE animation complete`);
                elementNode.style.transition = "";
                elementNode.style.transform = "";
              }, 2500);
            });
          });
        }
      }
    });
    console.log("═══════════════════════════════════════════════════════════");
    console.log(`📊 Animation Summary:`);
    console.log(`   📄 Pages animating: ${pageAnimations}`);
    console.log(`   🔹 Elements animating: ${elementAnimations}`);
    console.log(`   🎯 Moving element found: ${movingElementFound ? "YES ✅" : "NO ⚠️"}`);
    if (this.app.appState.lastMovedElement && !movingElementFound) {
      console.log(`   ⚠️  WARNING: lastMovedElement was set but not found in DOM!`);
      console.log(`      Expected: ${this.app.appState.lastMovedElement.pageId}-${this.app.appState.lastMovedElement.elementIndex}`);
    }
    console.log("═══════════════════════════════════════════════════════════");
  }
}
class PaneManager {
  constructor(app2, appRenderer = null) {
    this.app = app2;
    this.appRenderer = appRenderer;
    this.panes = /* @__PURE__ */ new Map();
    this.nextPaneId = 1;
    this.rootLayout = null;
    if (this.app.eventBus) {
      this.app.eventBus.on(EVENTS.PAGE.SWITCHED, (data) => {
        this.handlePageSwitch(data.pageId);
      });
      this.app.eventBus.on("theme:updated", () => {
        this.updateThemesForAllPanes();
      });
    }
  }
  /**
   * Handle page switch - update active pane's tab or create new tab
   */
  handlePageSwitch(pageId) {
    const allPanes = this.getAllPanes();
    if (allPanes.length === 1) {
      const pane = allPanes[0];
      const activeTab = pane.tabs[pane.activeTabIndex];
      const existingTabIndex = pane.tabs.findIndex((t) => t.pageId === pageId);
      if (existingTabIndex !== -1) {
        this.setActiveTab(pane.id, pane.tabs[existingTabIndex].id);
      } else {
        const format = this.app.formatRendererManager?.getPageFormat(pageId) || null;
        activeTab.pageId = pageId;
        activeTab.format = format;
        this.renderPane(pane);
      }
    } else if (allPanes.length > 1) {
      const firstPane = allPanes[0];
      const existingTabIndex = firstPane.tabs.findIndex((t) => t.pageId === pageId);
      if (existingTabIndex !== -1) {
        this.setActiveTab(firstPane.id, firstPane.tabs[existingTabIndex].id);
      } else {
        this.addTabToPane(firstPane.id, pageId);
      }
    } else {
      this.openPane(pageId);
    }
  }
  /**
   * Initialize the pane system
   */
  initialize() {
    const binsContainer = document.getElementById("bins-container");
    if (!binsContainer) return;
    binsContainer.innerHTML = "";
    const header = document.querySelector("header");
    const headerHeight = header ? header.offsetHeight : 60;
    binsContainer.style.cssText = `
            width: 100vw !important;
            height: calc(100vh - ${headerHeight}px) !important;
            position: fixed !important;
            top: ${headerHeight}px !important;
            left: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
            overflow: hidden !important;
            padding: 0 !important;
            margin: 0 !important;
            display: block !important;
            max-width: none !important;
            z-index: 1;
            box-sizing: border-box !important;
        `;
    const appContainer = document.getElementById("app");
    if (appContainer) {
      appContainer.style.cssText = `
                max-width: none !important;
                margin: 0 !important;
                padding: 0 !important;
                width: 100vw !important;
                height: 100vh !important;
                position: relative !important;
                overflow: hidden !important;
            `;
    }
    document.body.style.cssText = `
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
            width: 100vw !important;
            height: 100vh !important;
        `;
    document.documentElement.style.cssText = `
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
            width: 100vw !important;
            height: 100vh !important;
        `;
    this.rootLayout = binsContainer;
    if (this.panes.size === 0) {
      const currentDocumentId = this.app.appState.currentDocumentId;
      if (currentDocumentId) {
        this.openPane(currentDocumentId);
      }
    }
  }
  /**
   * Open a new pane with a page
   * @param {string} pageId - Page ID to open
   * @param {string} format - Optional format to use
   * @param {string} parentPaneId - Optional parent pane to split
   * @param {string} direction - 'horizontal' or 'vertical' for splitting
   * @returns {string} Pane ID
   */
  openPane(pageId, format = null, parentPaneId = null, direction = "vertical") {
    const paneId = `pane-${this.nextPaneId++}`;
    if (!format) {
      format = this.app.formatRendererManager?.getPageFormat(pageId) || null;
    }
    const pane = {
      id: paneId,
      tabs: [{
        // Start with one tab
        pageId,
        format,
        id: `tab-${Date.now()}-${Math.random()}`
      }],
      activeTabIndex: 0,
      // Index of active tab
      element: null,
      container: null,
      size: parentPaneId ? 50 : 100,
      // Percentage size
      parent: null,
      children: [],
      locked: false
      // Whether pane is locked (cannot be closed)
    };
    this.panes.set(paneId, pane);
    if (parentPaneId) {
      this.splitPane(parentPaneId, paneId, direction);
    } else {
      this.renderPane(pane);
    }
    eventBus.emit("pane:opened", { paneId, pageId, format });
    return paneId;
  }
  /**
   * Add a new tab to a pane
   * @param {string} paneId - Pane ID
   * @param {string} pageId - Page ID to open
   * @param {string} format - Optional format to use
   * @returns {string} Tab ID
   */
  addTabToPane(paneId, pageId, format = null) {
    const pane = this.panes.get(paneId);
    if (!pane) return null;
    if (!format) {
      format = this.app.formatRendererManager?.getPageFormat(pageId) || null;
    }
    const tab = {
      pageId,
      format,
      id: `tab-${Date.now()}-${Math.random()}`
    };
    pane.tabs.push(tab);
    pane.activeTabIndex = pane.tabs.length - 1;
    this.renderPane(pane);
    eventBus.emit("tab:opened", { paneId, tabId: tab.id, pageId, format });
    return tab.id;
  }
  /**
   * Close a tab
   * @param {string} paneId - Pane ID
   * @param {string} tabId - Tab ID to close
   */
  closeTab(paneId, tabId) {
    const pane = this.panes.get(paneId);
    if (!pane || pane.tabs.length <= 1) return;
    const tabIndex = pane.tabs.findIndex((t) => t.id === tabId);
    if (tabIndex === -1) return;
    pane.tabs.splice(tabIndex, 1);
    if (pane.activeTabIndex >= pane.tabs.length) {
      pane.activeTabIndex = pane.tabs.length - 1;
    } else if (pane.activeTabIndex > tabIndex) {
      pane.activeTabIndex--;
    }
    this.renderPane(pane);
    eventBus.emit("tab:closed", { paneId, tabId });
  }
  /**
   * Set active tab in a pane
   * @param {string} paneId - Pane ID
   * @param {string} tabId - Tab ID to activate
   */
  setActiveTab(paneId, tabId) {
    const pane = this.panes.get(paneId);
    if (!pane) return;
    const tabIndex = pane.tabs.findIndex((t) => t.id === tabId);
    if (tabIndex === -1) return;
    pane.activeTabIndex = tabIndex;
    this.renderPane(pane);
  }
  /**
   * Split an existing pane
   * @param {string} existingPaneId - Pane to split
   * @param {string} newPaneId - New pane ID (or null to create one)
   * @param {string} direction - 'horizontal' or 'vertical'
   * @param {string} newPageId - Page ID for new pane (or null to use same page)
   * @param {string} newFormat - Format for new pane (or null to use same format)
   */
  splitPane(existingPaneId, newPaneId = null, direction = "vertical", newPageId = null, newFormat = null) {
    const existingPane = this.panes.get(existingPaneId);
    if (!existingPane) return;
    if (!newPaneId) {
      const activeTab = existingPane.tabs[existingPane.activeTabIndex];
      newPageId = newPageId || (activeTab ? activeTab.pageId : this.app.appState.currentDocumentId);
      newFormat = newFormat || (activeTab ? activeTab.format : null);
      newPaneId = this.openPane(newPageId, newFormat);
    }
    const newPane = this.panes.get(newPaneId);
    if (!newPane) return;
    const splitContainer = document.createElement("div");
    splitContainer.className = "pane-split-container";
    splitContainer.dataset.direction = direction;
    splitContainer.style.cssText = `
            display: flex;
            flex-direction: ${direction === "horizontal" ? "row" : "column"};
            width: 100%;
            height: 100%;
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
        `;
    const parent = existingPane.parent || this.rootLayout;
    const existingElement = existingPane.element;
    if (existingElement && existingElement.parentNode) {
      existingElement.parentNode.replaceChild(splitContainer, existingElement);
    } else {
      parent.appendChild(splitContainer);
    }
    const pane1 = document.createElement("div");
    pane1.className = "pane-container";
    pane1.dataset.paneId = existingPaneId;
    pane1.style.cssText = `
            flex: ${existingPane.size};
            min-width: 0;
            min-height: 0;
            position: relative;
            overflow: hidden;
            width: 100%;
            height: 100%;
            border-right: ${direction === "horizontal" ? "1px solid #3a3a3a" : "none"};
            border-bottom: ${direction === "vertical" ? "1px solid #3a3a3a" : "none"};
        `;
    const pane2 = document.createElement("div");
    pane2.className = "pane-container";
    pane2.dataset.paneId = newPaneId;
    pane2.style.cssText = `
            flex: ${newPane.size};
            min-width: 0;
            min-height: 0;
            position: relative;
            overflow: hidden;
            width: 100%;
            height: 100%;
        `;
    splitContainer.appendChild(pane1);
    splitContainer.appendChild(pane2);
    existingPane.element = pane1;
    existingPane.container = pane1;
    existingPane.size = 50;
    existingPane.parent = splitContainer;
    newPane.element = pane2;
    newPane.container = pane2;
    newPane.size = 50;
    newPane.parent = splitContainer;
    this.renderPane(existingPane);
    this.renderPane(newPane);
    const existingHandle = splitContainer.querySelector(".pane-resize-handle");
    if (!existingHandle) {
      this.addResizeHandle(splitContainer, direction, existingPane, newPane);
    }
  }
  /**
   * Add resize handle to split container
   */
  addResizeHandle(splitContainer, direction, pane1, pane2) {
    const existingHandles = splitContainer.querySelectorAll(".pane-resize-handle");
    existingHandles.forEach((h) => h.remove());
    const handle = document.createElement("div");
    handle.className = "pane-resize-handle";
    handle.dataset.direction = direction;
    handle.dataset.pane1Id = pane1.id;
    handle.dataset.pane2Id = pane2.id;
    const updateHandlePosition = () => {
      const size1 = parseFloat(pane1.element.style.flex) || pane1.size || 50;
      const size2 = parseFloat(pane2.element.style.flex) || pane2.size || 50;
      const totalSize = size1 + size2;
      const percentage = size1 / totalSize * 100;
      if (direction === "horizontal") {
        handle.style.cssText = `
                    position: absolute;
                    left: ${percentage}%;
                    top: 0;
                    bottom: 0;
                    width: 4px;
                    cursor: col-resize;
                    background: #3a3a3a;
                    z-index: 10;
                    transition: background 0.2s;
                    transform: translateX(-50%);
                `;
      } else {
        handle.style.cssText = `
                    position: absolute;
                    top: ${percentage}%;
                    left: 0;
                    right: 0;
                    height: 4px;
                    cursor: row-resize;
                    background: #3a3a3a;
                    z-index: 10;
                    transition: background 0.2s;
                    transform: translateY(-50%);
                `;
      }
    };
    updateHandlePosition();
    handle.addEventListener("mouseenter", () => {
      handle.style.background = "#4a9eff";
    });
    handle.addEventListener("mouseleave", () => {
      handle.style.background = "#3a3a3a";
    });
    let isResizing = false;
    handle.addEventListener("mousedown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      isResizing = true;
      document.body.style.cursor = direction === "horizontal" ? "col-resize" : "row-resize";
      document.body.style.userSelect = "none";
      const startPos = direction === "horizontal" ? e.clientX : e.clientY;
      const startSize1 = parseFloat(pane1.element.style.flex) || pane1.size || 50;
      const startSize2 = parseFloat(pane2.element.style.flex) || pane2.size || 50;
      const totalSize = startSize1 + startSize2;
      const onMouseMove = (e2) => {
        if (!isResizing) return;
        const currentPos = direction === "horizontal" ? e2.clientX : e2.clientY;
        const containerRect = splitContainer.getBoundingClientRect();
        const containerSize = direction === "horizontal" ? containerRect.width : containerRect.height;
        direction === "horizontal" ? containerRect.left : containerRect.top;
        const delta = (currentPos - startPos) / containerSize * 100;
        const newSize1 = Math.max(10, Math.min(90, startSize1 + delta));
        const newSize2 = totalSize - newSize1;
        pane1.size = newSize1;
        pane2.size = newSize2;
        pane1.element.style.flex = newSize1;
        pane2.element.style.flex = newSize2;
        updateHandlePosition();
      };
      const onMouseUp = () => {
        isResizing = false;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
        updateHandlePosition();
      };
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    });
    splitContainer.appendChild(handle);
    handle._updatePosition = updateHandlePosition;
  }
  /**
   * Render a pane
   */
  renderPane(pane) {
    if (!pane.container) {
      const container = document.createElement("div");
      container.className = "pane-container";
      container.dataset.paneId = pane.id;
      container.style.cssText = `
                width: 100% !important;
                height: 100% !important;
                position: absolute !important;
                top: 0 !important;
                left: 0 !important;
                right: 0 !important;
                bottom: 0 !important;
                overflow: hidden !important;
                margin: 0 !important;
                padding: 0 !important;
                box-sizing: border-box !important;
            `;
      if (!pane.element) {
        if (this.rootLayout) {
          this.rootLayout.appendChild(container);
        }
      }
      pane.container = container;
      pane.element = container;
    }
    const activeTab = pane.tabs[pane.activeTabIndex];
    if (!activeTab) {
      console.warn("No active tab in pane:", pane.id);
      return;
    }
    const scrollPositions = this.preserveScrollPositions(pane);
    const header = this.createPaneHeader(pane);
    pane.container.innerHTML = "";
    pane.container.appendChild(header);
    const content = document.createElement("div");
    content.className = "pane-content";
    content.dataset.pageId = activeTab.pageId;
    content.style.cssText = `
            width: 100%;
            height: calc(100% - 40px);
            overflow: auto;
        `;
    pane.container.appendChild(content);
    const page = this.app.appState.documents.find((page2) => page2.id === activeTab.pageId);
    if (page) {
      const format = activeTab.format ? this.app.formatRendererManager?.getFormat(activeTab.format) : null;
      if (format && format.renderPage) {
        if (this.app.themeManager) {
          const viewFormat = activeTab.format || "default";
          this.app.themeManager.applyPageTheme(page.id, viewFormat, content);
        }
        format.renderPage(content, page, { app: this.app });
      } else {
        if (this.app.themeManager) {
          this.app.themeManager.applyPageTheme(page.id, "default", content);
        }
        if (page.groups && page.groups.length > 0) {
          const binRenderer = this.appRenderer?.binRenderer || this.app.renderService?.getRenderer()?.binRenderer;
          if (binRenderer) {
            page.groups.forEach((bin) => {
              const binElement = binRenderer.renderBin(page.id, bin);
              content.appendChild(binElement);
            });
          } else {
            console.warn("binRenderer not available");
          }
        }
      }
    } else {
      console.warn("Page not found:", activeTab.pageId);
    }
    requestAnimationFrame(() => {
      this.restoreScrollPositions(pane, scrollPositions);
    });
    if (page) {
      setTimeout(() => {
        if (this.app.eventBus) {
          const pageElement = content.querySelector(`[data-page-id="${activeTab.pageId}"], .page`) || content;
          if (pageElement) {
            this.app.eventBus.emit("page:render", {
              pageElement,
              pageData: page
            });
          }
        }
        this.restoreScrollPositions(pane, scrollPositions);
      }, 0);
    }
    eventBus.emit("pane:rendered", { paneId: pane.id, pageId: activeTab.pageId });
  }
  /**
   * Update themes for all panes when theme changes
   */
  updateThemesForAllPanes() {
    if (!this.app.themeManager) return;
    this.app.themeManager.applyTheme(this.app.themeManager.themes.global, "root");
    const allPanes = this.getAllPanes();
    allPanes.forEach((pane) => {
      if (!pane.container) return;
      const content = pane.container.querySelector(".pane-content");
      if (!content) return;
      const activeTab = pane.tabs[pane.activeTabIndex];
      if (!activeTab) return;
      const page = this.app.appState.documents.find((page2) => page2.id === activeTab.pageId);
      if (!page) return;
      const viewFormat = activeTab.format || "default";
      const effectiveTheme = this.app.themeManager.getEffectiveTheme(page.id, viewFormat);
      this.app.themeManager.applyTheme(effectiveTheme, content);
    });
  }
  /**
   * Create pane header with tabs and controls
   */
  createPaneHeader(pane) {
    const header = document.createElement("div");
    header.className = "pane-header";
    header.style.cssText = `
            display: flex;
            align-items: center;
            background: #2a2a2a;
            border-bottom: 1px solid #3a3a3a;
            height: 40px;
            box-sizing: border-box;
            overflow-x: auto;
            overflow-y: hidden;
        `;
    const tabsContainer = document.createElement("div");
    tabsContainer.className = "pane-tabs-container";
    tabsContainer.style.cssText = `
            display: flex;
            flex: 1;
            min-width: 0;
            height: 100%;
            overflow-x: auto;
            overflow-y: hidden;
        `;
    pane.tabs.forEach((tab, index) => {
      const tabElement = this.createTabElement(pane, tab, index);
      tabsContainer.appendChild(tabElement);
    });
    header.appendChild(tabsContainer);
    const controls = document.createElement("div");
    controls.className = "pane-controls";
    controls.style.cssText = `
            display: flex;
            gap: 4px;
            align-items: center;
            padding: 0 8px;
            background: #2a2a2a;
            flex-shrink: 0;
        `;
    const addTabBtn = document.createElement("button");
    addTabBtn.innerHTML = "+";
    addTabBtn.title = "Add Tab";
    addTabBtn.style.cssText = `
            padding: 4px 8px;
            background: #3a3a3a;
            color: #dcddde;
            border: none;
            border-radius: 3px;
            cursor: pointer;
            font-size: 14px;
            line-height: 1;
        `;
    addTabBtn.addEventListener("click", () => {
      this.showAddTabDialog(pane.id);
    });
    const splitVerticalBtn = document.createElement("button");
    splitVerticalBtn.innerHTML = "⊞";
    splitVerticalBtn.title = "Split Vertically";
    splitVerticalBtn.style.cssText = `
            padding: 4px 8px;
            background: #3a3a3a;
            color: #dcddde;
            border: none;
            border-radius: 3px;
            cursor: pointer;
            font-size: 12px;
        `;
    splitVerticalBtn.addEventListener("click", () => {
      this.splitPane(pane.id, null, "vertical");
    });
    const splitHorizontalBtn = document.createElement("button");
    splitHorizontalBtn.innerHTML = "⊟";
    splitHorizontalBtn.title = "Split Horizontally";
    splitHorizontalBtn.style.cssText = `
            padding: 4px 8px;
            background: #3a3a3a;
            color: #dcddde;
            border: none;
            border-radius: 3px;
            cursor: pointer;
            font-size: 12px;
        `;
    splitHorizontalBtn.addEventListener("click", () => {
      this.splitPane(pane.id, null, "horizontal");
    });
    const closeBtn = document.createElement("button");
    closeBtn.innerHTML = "×";
    closeBtn.title = "Close Pane";
    closeBtn.style.cssText = `
            padding: 4px 8px;
            background: #3a3a3a;
            color: #dcddde;
            border: none;
            border-radius: 3px;
            cursor: pointer;
            font-size: 16px;
            line-height: 1;
        `;
    closeBtn.addEventListener("click", () => {
      this.closePane(pane.id);
    });
    controls.appendChild(addTabBtn);
    controls.appendChild(splitVerticalBtn);
    controls.appendChild(splitHorizontalBtn);
    controls.appendChild(closeBtn);
    header.appendChild(controls);
    return header;
  }
  /**
   * Create a tab element with drag-and-drop support
   */
  createTabElement(pane, tab, index) {
    const isActive = index === pane.activeTabIndex;
    const page = this.app.appState.documents.find((page2) => page2.id === tab.pageId);
    const pageTitle = page ? page.title || page.id : tab.pageId;
    const formatName = tab.format ? this.app.formatRendererManager?.getFormat(tab.format)?.name || tab.format : "Default";
    const title = DOMBuilder.create("span").style({ flex: "1", overflow: "hidden", textOverflow: "ellipsis" }).text(pageTitle).build();
    const closeBtn = DOMBuilder.create("button").attr("title", "Close Tab").html("×").style({
      padding: "0",
      background: "transparent",
      color: "#888",
      border: "none",
      cursor: "pointer",
      fontSize: "16px",
      lineHeight: "1",
      width: "16px",
      height: "16px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }).on("click", (e) => {
      e.stopPropagation();
      this.closeTab(pane.id, tab.id);
    }).build();
    const tabElement = DOMBuilder.create("div").class("pane-tab").dataset({ tabId: tab.id, paneId: pane.id }).attr("draggable", "true").style({
      display: "flex",
      alignItems: "center",
      gap: "6px",
      padding: "6px 12px",
      background: isActive ? "#1e1e1e" : "#2a2a2a",
      color: "#dcddde",
      borderRight: "1px solid #3a3a3a",
      cursor: "pointer",
      userSelect: "none",
      whiteSpace: "nowrap",
      fontSize: "12px",
      position: "relative"
    }).child(title).build();
    if (tab.format) {
      const formatBadge = DOMBuilder.create("span").text(formatName).style({
        padding: "2px 6px",
        background: "#3a3a3a",
        borderRadius: "3px",
        fontSize: "10px",
        opacity: "0.7"
      }).build();
      tabElement.appendChild(formatBadge);
    }
    tabElement.appendChild(closeBtn);
    tabElement.addEventListener("click", (e) => {
      if (e.target !== closeBtn && !closeBtn.contains(e.target)) {
        this.setActiveTab(pane.id, tab.id);
      }
    });
    tabElement.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (this.app.appState && this.app.contextMenuHandler) {
        this.app.appState._editingTabInfo = {
          paneId: pane.id,
          tabId: tab.id
        };
        if (this.app.appState.setContextMenuState) {
          this.app.appState.setContextMenuState({
            visible: true,
            documentId: tab.pageId,
            groupId: null,
            // null indicates page edit
            elementIndex: null,
            subtaskIndex: null,
            x: e.clientX,
            y: e.clientY
          });
        } else {
          this.app.appState.contextMenuState = {
            visible: true,
            documentId: tab.pageId,
            groupId: null,
            // null indicates page edit
            elementIndex: null,
            subtaskIndex: null,
            x: e.clientX,
            y: e.clientY
          };
        }
        this.app.contextMenuHandler.showPageContextMenu(e, tab.pageId);
      }
    });
    this.setupTabDragDrop(tabElement, pane, tab, index);
    return tabElement;
  }
  /**
   * Setup drag and drop for tab
   */
  setupTabDragDrop(tabElement, pane, tab, index) {
    let dragData = null;
    let edgeIndicator = null;
    tabElement.addEventListener("dragstart", (e) => {
      e.dataTransfer.effectAllowed = "move";
      dragData = {
        type: "tab",
        paneId: pane.id,
        tabId: tab.id,
        tabIndex: index
      };
      e.dataTransfer.setData("text/plain", JSON.stringify(dragData));
      tabElement.style.opacity = "0.5";
    });
    tabElement.addEventListener("dragend", (e) => {
      tabElement.style.opacity = "1";
      document.querySelectorAll(".tab-drop-indicator").forEach((el) => el.remove());
      if (edgeIndicator) {
        edgeIndicator.remove();
        edgeIndicator = null;
      }
      dragData = null;
    });
    document.addEventListener("dragover", (e) => {
      if (!dragData || dragData.type !== "tab") return;
      const paneContainers = document.querySelectorAll(".pane-container");
      let targetPane = null;
      let targetPaneId = null;
      for (const container2 of paneContainers) {
        const rect2 = container2.getBoundingClientRect();
        if (e.clientX >= rect2.left && e.clientX <= rect2.right && e.clientY >= rect2.top && e.clientY <= rect2.bottom) {
          targetPaneId = container2.dataset.paneId;
          targetPane = this.panes.get(targetPaneId);
          break;
        }
      }
      if (!targetPane || targetPaneId === dragData.paneId) {
        if (edgeIndicator) {
          edgeIndicator.remove();
          edgeIndicator = null;
        }
        return;
      }
      const container = targetPane.container || targetPane.element;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const edgeThreshold = 50;
      const nearLeft = e.clientX - rect.left < edgeThreshold;
      const nearRight = rect.right - e.clientX < edgeThreshold;
      const nearTop = e.clientY - rect.top < edgeThreshold;
      const nearBottom = rect.bottom - e.clientY < edgeThreshold;
      if (edgeIndicator) {
        edgeIndicator.remove();
        edgeIndicator = null;
      }
      if (nearLeft || nearRight || nearTop || nearBottom) {
        edgeIndicator = document.createElement("div");
        edgeIndicator.className = "pane-split-indicator";
        edgeIndicator.style.cssText = `
                    position: fixed;
                    background: rgba(74, 158, 255, 0.3);
                    border: 2px solid #4a9eff;
                    z-index: 10000;
                    pointer-events: none;
                `;
        let direction = null;
        if (nearLeft) {
          direction = "left";
          edgeIndicator.style.left = `${rect.left}px`;
          edgeIndicator.style.top = `${rect.top}px`;
          edgeIndicator.style.width = `${rect.width / 2}px`;
          edgeIndicator.style.height = `${rect.height}px`;
        } else if (nearRight) {
          direction = "right";
          edgeIndicator.style.left = `${rect.left + rect.width / 2}px`;
          edgeIndicator.style.top = `${rect.top}px`;
          edgeIndicator.style.width = `${rect.width / 2}px`;
          edgeIndicator.style.height = `${rect.height}px`;
        } else if (nearTop) {
          direction = "up";
          edgeIndicator.style.left = `${rect.left}px`;
          edgeIndicator.style.top = `${rect.top}px`;
          edgeIndicator.style.width = `${rect.width}px`;
          edgeIndicator.style.height = `${rect.height / 2}px`;
        } else if (nearBottom) {
          direction = "down";
          edgeIndicator.style.left = `${rect.left}px`;
          edgeIndicator.style.top = `${rect.top + rect.height / 2}px`;
          edgeIndicator.style.width = `${rect.width}px`;
          edgeIndicator.style.height = `${rect.height / 2}px`;
        }
        if (direction) {
          edgeIndicator.dataset.direction = direction;
          edgeIndicator.dataset.targetPaneId = targetPaneId;
          document.body.appendChild(edgeIndicator);
        }
      }
    });
    document.addEventListener("drop", (e) => {
      if (!dragData || dragData.type !== "tab") return;
      if (!edgeIndicator) return;
      const direction = edgeIndicator.dataset.direction;
      const targetPaneId = edgeIndicator.dataset.targetPaneId;
      if (direction && targetPaneId) {
        e.preventDefault();
        e.stopPropagation();
        let splitDirection = "vertical";
        if (direction === "left" || direction === "right") {
          splitDirection = "horizontal";
        }
        const targetPane = this.panes.get(targetPaneId);
        if (targetPane) {
          const sourcePane = this.panes.get(dragData.paneId);
          const sourceTab = sourcePane?.tabs.find((t) => t.id === dragData.tabId);
          if (sourceTab) {
            const newPaneId = this.splitPane(targetPaneId, null, splitDirection, sourceTab.pageId, sourceTab.format);
            if (newPaneId) {
              const newPane = this.panes.get(newPaneId);
              if (newPane && newPane.tabs.length > 0) {
                newPane.tabs[0] = sourceTab;
                this.renderPane(newPane);
                const sourceTabIndex = sourcePane.tabs.findIndex((t) => t.id === dragData.tabId);
                if (sourceTabIndex !== -1) {
                  sourcePane.tabs.splice(sourceTabIndex, 1);
                  if (sourcePane.tabs.length === 0 && !sourcePane.locked) {
                    this.closePane(dragData.paneId);
                  } else {
                    if (sourcePane.activeTabIndex >= sourcePane.tabs.length) {
                      sourcePane.activeTabIndex = Math.max(0, sourcePane.tabs.length - 1);
                    }
                    this.renderPane(sourcePane);
                  }
                }
              }
            }
          }
        }
        if (edgeIndicator) {
          edgeIndicator.remove();
          edgeIndicator = null;
        }
      }
    }, true);
    tabElement.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const dragData2 = e.dataTransfer.getData("text/plain");
      if (!dragData2) return;
      let dragPayload;
      try {
        dragPayload = JSON.parse(dragData2);
      } catch (err) {
        return;
      }
      if (dragPayload.type !== "tab") return;
      this.showTabDropIndicator(tabElement, e);
      e.dataTransfer.dropEffect = "move";
    });
    tabElement.addEventListener("drop", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const dragData2 = e.dataTransfer.getData("text/plain");
      if (!dragData2) return;
      let dragPayload;
      try {
        dragPayload = JSON.parse(dragData2);
      } catch (err) {
        return;
      }
      if (dragPayload.type !== "tab") return;
      this.moveTab(dragPayload.paneId, dragPayload.tabId, pane.id, tab.id, index);
      document.querySelectorAll(".tab-drop-indicator").forEach((el) => el.remove());
    });
    const header = tabElement.closest(".pane-header");
    if (header) {
      header.addEventListener("dragover", (e) => {
        if (e.target.closest(".pane-tab")) return;
        e.preventDefault();
        e.stopPropagation();
        const dragData2 = e.dataTransfer.getData("text/plain");
        if (!dragData2) return;
        let dragPayload;
        try {
          dragPayload = JSON.parse(dragData2);
        } catch (err) {
          return;
        }
        if (dragPayload.type !== "tab") return;
        e.dataTransfer.dropEffect = "move";
      });
      header.addEventListener("drop", (e) => {
        if (e.target.closest(".pane-tab")) return;
        e.preventDefault();
        e.stopPropagation();
        const dragData2 = e.dataTransfer.getData("text/plain");
        if (!dragData2) return;
        let dragPayload;
        try {
          dragPayload = JSON.parse(dragData2);
        } catch (err) {
          return;
        }
        if (dragPayload.type !== "tab") return;
        this.moveTabToPane(dragPayload.paneId, dragPayload.tabId, pane.id);
        document.querySelectorAll(".tab-drop-indicator").forEach((el) => el.remove());
      });
    }
  }
  /**
   * Show drop indicator for tab
   */
  showTabDropIndicator(tabElement, e) {
    document.querySelectorAll(".tab-drop-indicator").forEach((el) => el.remove());
    const indicator = document.createElement("div");
    indicator.className = "tab-drop-indicator";
    indicator.style.cssText = `
            position: absolute;
            top: 0;
            bottom: 0;
            width: 2px;
            background: #4a9eff;
            z-index: 1000;
            pointer-events: none;
        `;
    const rect = tabElement.getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x < rect.width / 2) {
      indicator.style.left = "0";
      tabElement.style.position = "relative";
      tabElement.appendChild(indicator);
    } else {
      indicator.style.right = "0";
      tabElement.style.position = "relative";
      tabElement.appendChild(indicator);
    }
  }
  /**
   * Move a tab within or between panes
   */
  moveTab(sourcePaneId, tabId, targetPaneId, targetTabId, targetIndex) {
    const sourcePane = this.panes.get(sourcePaneId);
    const targetPane = this.panes.get(targetPaneId);
    if (!sourcePane || !targetPane) return;
    const tabIndex = sourcePane.tabs.findIndex((t) => t.id === tabId);
    if (tabIndex === -1) return;
    const tab = sourcePane.tabs[tabIndex];
    if (sourcePaneId === targetPaneId) {
      sourcePane.tabs.splice(tabIndex, 1);
      const newIndex = targetIndex < tabIndex ? targetIndex : targetIndex + 1;
      sourcePane.tabs.splice(newIndex, 0, tab);
      sourcePane.activeTabIndex = newIndex;
      this.renderPane(sourcePane);
    } else {
      sourcePane.tabs.splice(tabIndex, 1);
      if (sourcePane.tabs.length === 0 && !sourcePane.locked) {
        this.closePane(sourcePaneId);
      } else {
        if (sourcePane.activeTabIndex >= sourcePane.tabs.length) {
          sourcePane.activeTabIndex = Math.max(0, sourcePane.tabs.length - 1);
        }
        this.renderPane(sourcePane);
      }
      const targetTabIndex = targetPane.tabs.findIndex((t) => t.id === targetTabId);
      const insertIndex = targetTabIndex !== -1 ? targetTabIndex : targetIndex;
      targetPane.tabs.splice(insertIndex, 0, tab);
      targetPane.activeTabIndex = insertIndex;
      this.renderPane(targetPane);
    }
  }
  /**
   * Move a tab to a different pane (append to end)
   */
  moveTabToPane(sourcePaneId, tabId, targetPaneId) {
    const sourcePane = this.panes.get(sourcePaneId);
    const targetPane = this.panes.get(targetPaneId);
    if (!sourcePane || !targetPane) return;
    const tabIndex = sourcePane.tabs.findIndex((t) => t.id === tabId);
    if (tabIndex === -1) return;
    const tab = sourcePane.tabs[tabIndex];
    sourcePane.tabs.splice(tabIndex, 1);
    if (sourcePane.tabs.length === 0 && !sourcePane.locked) {
      this.closePane(sourcePaneId);
    } else {
      if (sourcePane.activeTabIndex >= sourcePane.tabs.length) {
        sourcePane.activeTabIndex = Math.max(0, sourcePane.tabs.length - 1);
      }
      this.renderPane(sourcePane);
    }
    targetPane.tabs.push(tab);
    targetPane.activeTabIndex = targetPane.tabs.length - 1;
    this.renderPane(targetPane);
  }
  /**
   * Close a pane
   */
  closePane(paneId) {
    const pane = this.panes.get(paneId);
    if (!pane) return;
    if (this.panes.size === 1) {
      return;
    }
    if (pane.element && pane.element.parentNode) {
      const parent = pane.element.parentNode;
      if (parent.classList.contains("pane-split-container")) {
        const siblingPane = Array.from(parent.children).find(
          (child) => child.dataset.paneId !== paneId
        );
        if (siblingPane) {
          const siblingPaneId = siblingPane.dataset.paneId;
          const siblingPaneData = this.panes.get(siblingPaneId);
          if (parent.parentNode) {
            parent.parentNode.replaceChild(siblingPane, parent);
            siblingPaneData.element = siblingPane;
            siblingPaneData.parent = parent.parentNode === this.rootLayout ? null : parent.parentNode;
            siblingPaneData.size = 100;
            siblingPane.style.flex = "1";
            siblingPane.style.border = "none";
          }
        }
      } else {
        pane.element.remove();
      }
    }
    this.panes.delete(paneId);
    eventBus.emit("pane:closed", { paneId });
    if (this.panes.size > 0) {
      this.app.render();
    }
  }
  /**
   * Get all panes
   */
  getAllPanes() {
    return Array.from(this.panes.values());
  }
  /**
   * Get pane by ID
   */
  getPane(paneId) {
    return this.panes.get(paneId);
  }
  /**
   * Show dialog to add a new tab (page and format selector)
   */
  showAddTabDialog(paneId) {
    const pane = this.panes.get(paneId);
    if (!pane) return;
    const allFormats = [];
    if (this.app.formatRendererManager) {
      const formats = this.app.formatRendererManager.getAllFormats();
      formats.forEach((format) => {
        if (format.supportsPages !== false) {
          const formatName = format.formatName || format.id;
          allFormats.push({
            id: formatName,
            name: format.name || format.formatLabel || formatName
          });
        }
      });
    }
    const modal = document.createElement("div");
    modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.7);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
    const dialog = document.createElement("div");
    dialog.style.cssText = `
            background: #2a2a2a;
            border: 1px solid #3a3a3a;
            border-radius: 8px;
            padding: 20px;
            min-width: 400px;
            max-width: 600px;
        `;
    dialog.innerHTML = `
            <h3 style="margin: 0 0 20px 0; color: #ffffff;">Add Tab</h3>
            <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 8px; color: #dcddde;">Page:</label>
                <select id="add-tab-page-select" style="width: 100%; padding: 8px; background: #1a1a1a; color: #dcddde; border: 1px solid #3a3a3a; border-radius: 4px;">
                    ${this.app.appState.documents.map(
      (page) => `<option value="${page.id}">${page.title || page.id}</option>`
    ).join("")}
                </select>
            </div>
            <div style="margin-bottom: 20px;">
                <label style="display: block; margin-bottom: 8px; color: #dcddde;">Format:</label>
                <select id="add-tab-format-select" style="width: 100%; padding: 8px; background: #1a1a1a; color: #dcddde; border: 1px solid #3a3a3a; border-radius: 4px;">
                    <option value="">Default</option>
                    ${allFormats.map(
      (format) => `<option value="${format.id}">${format.name}</option>`
    ).join("")}
                </select>
            </div>
            <div style="display: flex; gap: 10px; justify-content: flex-end;">
                <button id="add-tab-cancel" style="padding: 8px 16px; background: #3a3a3a; color: #dcddde; border: none; border-radius: 4px; cursor: pointer;">Cancel</button>
                <button id="add-tab-ok" style="padding: 8px 16px; background: #4a9eff; color: white; border: none; border-radius: 4px; cursor: pointer;">Add Tab</button>
            </div>
        `;
    modal.appendChild(dialog);
    document.body.appendChild(modal);
    const pageSelect = dialog.querySelector("#add-tab-page-select");
    const formatSelect = dialog.querySelector("#add-tab-format-select");
    if (pageSelect && this.app.appState.currentDocumentId) {
      pageSelect.value = this.app.appState.currentDocumentId;
    }
    if (formatSelect && pane.tabs.length > 0) {
      const activeTab = pane.tabs[pane.activeTabIndex];
      if (activeTab && activeTab.format) {
        formatSelect.value = activeTab.format;
      } else {
        const selectedPageId = pageSelect.value;
        const pageFormat = this.app.formatRendererManager?.getPageFormat(selectedPageId);
        if (pageFormat) {
          formatSelect.value = pageFormat;
        }
      }
    }
    if (pageSelect && formatSelect) {
      pageSelect.addEventListener("change", () => {
        const selectedPageId = pageSelect.value;
        const pageFormat = this.app.formatRendererManager?.getPageFormat(selectedPageId);
        if (pageFormat) {
          formatSelect.value = pageFormat;
        }
      });
    }
    dialog.querySelector("#add-tab-cancel").addEventListener("click", () => {
      document.body.removeChild(modal);
    });
    dialog.querySelector("#add-tab-ok").addEventListener("click", () => {
      const pageId = pageSelect.value;
      const format = formatSelect.value || null;
      const existingTab = pane.tabs.find((t) => t.pageId === pageId && t.format === format);
      if (existingTab) {
        this.setActiveTab(pane.id, existingTab.id);
      } else {
        this.addTabToPane(pane.id, pageId, format);
      }
      document.body.removeChild(modal);
    });
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal);
      }
    });
    const handleEscape = (e) => {
      if (e.key === "Escape") {
        document.body.removeChild(modal);
        document.removeEventListener("keydown", handleEscape);
      }
    };
    document.addEventListener("keydown", handleEscape);
  }
  /**
   * Preserve scroll positions for a pane and all its scrollable children
   */
  preserveScrollPositions(pane) {
    const positions = {
      container: {},
      content: {},
      groups: {},
      items: {}
    };
    if (pane.container) {
      positions.container = {
        scrollTop: pane.container.scrollTop,
        scrollLeft: pane.container.scrollLeft
      };
    }
    const content = pane.container?.querySelector(".pane-content");
    if (content) {
      positions.content = {
        scrollTop: content.scrollTop,
        scrollLeft: content.scrollLeft
      };
    }
    const bins = pane.container?.querySelectorAll(".bin-content");
    if (bins) {
      bins.forEach((binContent) => {
        const binId = binContent.closest(".bin")?.dataset.binId;
        if (binId) {
          positions.groups[binId] = {
            scrollTop: binContent.scrollTop,
            scrollLeft: binContent.scrollLeft
          };
        }
      });
    }
    const scrollables = pane.container?.querySelectorAll('[style*="overflow"], [style*="overflow-y"], [style*="overflow-x"]');
    if (scrollables) {
      scrollables.forEach((el, index) => {
        const key = el.dataset.binId || el.dataset.elementIndex || `scrollable-${index}`;
        if (el.scrollTop > 0 || el.scrollLeft > 0) {
          positions.items[key] = {
            scrollTop: el.scrollTop,
            scrollLeft: el.scrollLeft
          };
        }
      });
    }
    return positions;
  }
  /**
   * Restore scroll positions for a pane and all its scrollable children
   */
  restoreScrollPositions(pane, positions) {
    if (!positions) return;
    if (pane.container && positions.container) {
      pane.container.scrollTop = positions.container.scrollTop || 0;
      pane.container.scrollLeft = positions.container.scrollLeft || 0;
    }
    const content = pane.container?.querySelector(".pane-content");
    if (content && positions.content) {
      content.scrollTop = positions.content.scrollTop || 0;
      content.scrollLeft = positions.content.scrollLeft || 0;
    }
    if (positions.groups) {
      Object.keys(positions.groups).forEach((binId) => {
        const binContent = pane.container?.querySelector(`.bin[data-bin-id="${binId}"] .bin-content`);
        if (binContent && positions.groups[binId]) {
          binContent.scrollTop = positions.groups[binId].scrollTop || 0;
          binContent.scrollLeft = positions.groups[binId].scrollLeft || 0;
        }
      });
    }
    if (positions.items) {
      Object.keys(positions.items).forEach((key) => {
        let element = null;
        if (key.startsWith("scrollable-")) {
          const index = parseInt(key.replace("scrollable-", ""));
          const scrollables = pane.container?.querySelectorAll('[style*="overflow"], [style*="overflow-y"], [style*="overflow-x"]');
          if (scrollables && scrollables[index]) {
            element = scrollables[index];
          }
        } else {
          element = pane.container?.querySelector(`[data-bin-id="${key}"], [data-element-index="${key}"]`);
        }
        if (element && positions.items[key]) {
          element.scrollTop = positions.items[key].scrollTop || 0;
          element.scrollLeft = positions.items[key].scrollLeft || 0;
        }
      });
    }
  }
}
class AppRenderer {
  constructor(app2) {
    this.app = app2;
    this._preservingFormat = false;
    this.binRenderer = new BinRenderer(app2);
    this.elementRenderer = new ElementRenderer(app2);
    this.animationRenderer = new AnimationRenderer(app2);
    this.paneManager = new PaneManager(app2, this);
    this._lastScrollTop = null;
    this._lastScrollLeft = null;
    this._setupScrollTracking();
    this._setupThemeListener();
  }
  /**
   * Setup listener for theme updates to apply immediately
   */
  _setupThemeListener() {
    if (this.app.eventBus) {
      this.app.eventBus.on("theme:updated", () => {
        this._applyCurrentThemes();
      });
    }
  }
  /**
   * Apply current themes to all UI components immediately
   */
  _applyCurrentThemes() {
    if (!this.app.themeManager) return;
    const appState2 = this.app.appState;
    if (!appState2 || !appState2.documents) return;
    this.app.themeManager.applyTheme(this.app.themeManager.themes.global, "root");
    const binsContainer = document.getElementById("bins-container");
    if (binsContainer && appState2.currentDocumentId) {
      const currentPage = appState2.documents.find((p) => p.id === appState2.currentDocumentId);
      if (currentPage) {
        const viewFormat = currentPage.format || "default";
        const effectiveTheme = this.app.themeManager.getEffectiveTheme(currentPage.id, viewFormat);
        this.app.themeManager.applyTheme(effectiveTheme, binsContainer);
      }
    }
    appState2.documents.forEach((page) => {
      const viewFormat = page.format || "default";
      const effectiveTheme = this.app.themeManager.getEffectiveTheme(page.id, viewFormat);
      const pageContainers = document.querySelectorAll(`[data-page-id="${page.id}"]`);
      pageContainers.forEach((container) => {
        this.app.themeManager.applyTheme(effectiveTheme, container);
      });
    });
  }
  /**
   * Setup scroll tracking for debugging
   */
  _setupScrollTracking() {
    if (this._scrollTrackingSetup) return;
    this._scrollTrackingSetup = true;
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => this._setupScrollTracking());
      return;
    }
    const setupTracking = () => {
      const container = document.getElementById("bins-container");
      if (!container) {
        setTimeout(setupTracking, 100);
        return;
      }
      if (this._scrollTrackingHandler) {
        container.removeEventListener("scroll", this._scrollTrackingHandler);
      }
      let lastKnownScrollTop = container.scrollTop;
      let lastKnownScrollLeft = container.scrollLeft;
      const checkScrollChange = (source = "unknown") => {
        const currentScrollTop = container.scrollTop;
        const currentScrollLeft = container.scrollLeft;
        if (currentScrollTop !== lastKnownScrollTop || currentScrollLeft !== lastKnownScrollLeft) {
          const scrollHeight = container.scrollHeight;
          const clientHeight = container.clientHeight;
          const scrollPercentage = scrollHeight > clientHeight ? (currentScrollTop / (scrollHeight - clientHeight) * 100).toFixed(1) : 0;
          console.log("[SCROLL TRACK] Scroll position changed:", {
            source,
            scrollTop: currentScrollTop.toFixed(0),
            scrollLeft: currentScrollLeft.toFixed(0),
            scrollHeight,
            clientHeight,
            scrollPercentage: scrollPercentage + "%",
            maxScrollTop: scrollHeight - clientHeight,
            deltaTop: lastKnownScrollTop !== null ? (currentScrollTop - lastKnownScrollTop).toFixed(0) : "N/A",
            deltaLeft: lastKnownScrollLeft !== null ? (currentScrollLeft - lastKnownScrollLeft).toFixed(0) : "N/A"
          });
          lastKnownScrollTop = currentScrollTop;
          lastKnownScrollLeft = currentScrollLeft;
          this._lastScrollTop = currentScrollTop;
          this._lastScrollLeft = currentScrollLeft;
        }
      };
      this._scrollTrackingHandler = (e) => {
        checkScrollChange("user-scroll");
      };
      container.addEventListener("scroll", this._scrollTrackingHandler, { passive: true });
      this._scrollCheckInterval = setInterval(() => {
        checkScrollChange("programmatic");
      }, 50);
      console.log("[SCROLL TRACK] Scroll tracking enabled on bins-container");
    };
    setupTracking();
  }
  /**
   * Main render method
   * Renders the entire application UI
   */
  render() {
    const modals = document.querySelectorAll(".modal");
    modals.forEach((modal) => {
      if (modal.classList.contains("active")) {
        const modalBody = modal.querySelector("#modal-body, #settings-body");
        if (modalBody) {
          const isVisualCustomization = modalBody.querySelector("#visual-instance-specific") !== null;
          const isSettings = modalBody.querySelector("#settings-reset") !== null;
          if (isVisualCustomization || isSettings) {
            return;
          }
        }
      }
      modal.classList.remove("active");
      modal.style.display = "none";
    });
    this.renderPageTabs();
    const pageManager = getService(SERVICES.PAGE_MANAGER);
    pageManager.ensureDefaultPage();
    const appState2 = getService(SERVICES.APP_STATE);
    const useMultiPane = appState2.multiPaneEnabled !== false;
    if (useMultiPane) {
      if (!this.paneManager.rootLayout) {
        this.paneManager.initialize();
      }
      const allPanes = this.paneManager.getAllPanes();
      allPanes.forEach((pane) => {
        this.paneManager.renderPane(pane);
      });
      if (allPanes.length === 0) {
        this.paneManager.openPane(appState2.currentDocumentId);
      }
      return;
    }
    const container = document.getElementById("bins-container");
    if (!container) return;
    const activePage = appState2.documents.find((page) => page.id === appState2.currentDocumentId);
    const hasContent = container.children.length > 0;
    hasContent ? this.getCurrentPositions() : {};
    const scrollTop = container.scrollTop;
    const scrollLeft = container.scrollLeft;
    console.log("[SCROLL DEBUG] Preserving scroll position:", { scrollTop, scrollLeft, containerHeight: container.scrollHeight, clientHeight: container.clientHeight });
    const formatRendererManager = getService(SERVICES.FORMAT_RENDERER_MANAGER);
    const pageFormat = formatRendererManager?.getPageFormat(appState2.currentDocumentId);
    const format = pageFormat ? formatRendererManager?.getFormat(pageFormat) : null;
    const shouldUseFormat = format && format.renderPage && activePage;
    if (!shouldUseFormat || !this._preservingFormat) {
      container.innerHTML = "";
    }
    if (shouldUseFormat) {
      if (this.app.themeManager) {
        const viewFormat = pageFormat || "default";
        this.app.themeManager.applyPageTheme(activePage.id, viewFormat, container);
      }
      if (this._preservingFormat && container.children.length > 0) {
        console.log("[SCROLL DEBUG] Format render - updating existing (preserving format)", { scrollBeforeUpdate: { scrollTop: container.scrollTop, scrollLeft: container.scrollLeft } });
        format.renderPage(container, activePage, { app: this.app });
        console.log("[SCROLL DEBUG] Format render - after update", { scrollAfterUpdate: { scrollTop: container.scrollTop, scrollLeft: container.scrollLeft, scrollHeight: container.scrollHeight } });
      } else {
        console.log("[SCROLL DEBUG] Format render - clearing container", { scrollBeforeClear: { scrollTop, scrollLeft } });
        container.innerHTML = "";
        console.log("[SCROLL DEBUG] Format render - after clear", { scrollAfterClear: { scrollTop: container.scrollTop, scrollLeft: container.scrollLeft } });
        format.renderPage(container, activePage, { app: this.app });
        console.log("[SCROLL DEBUG] Format render - after renderPage", { scrollAfterRender: { scrollTop: container.scrollTop, scrollLeft: container.scrollLeft, scrollHeight: container.scrollHeight } });
      }
      this._preservingFormat = false;
      requestAnimationFrame(() => {
        const beforeRestore = { scrollTop: container.scrollTop, scrollLeft: container.scrollLeft, scrollHeight: container.scrollHeight, clientHeight: container.clientHeight };
        console.log("[SCROLL DEBUG] Format render - About to restore scroll:", {
          preserved: { scrollTop, scrollLeft },
          beforeRestore
        });
        container.scrollTop = scrollTop;
        container.scrollLeft = scrollLeft;
        const afterRestore = { scrollTop: container.scrollTop, scrollLeft: container.scrollLeft, scrollHeight: container.scrollHeight, clientHeight: container.clientHeight };
        console.log("[SCROLL DEBUG] Format render - After restore:", {
          afterRestore,
          restored: afterRestore.scrollTop === scrollTop && afterRestore.scrollLeft === scrollLeft,
          difference: { top: (afterRestore.scrollTop - scrollTop).toFixed(0), left: (afterRestore.scrollLeft - scrollLeft).toFixed(0) }
        });
        if (this.app.eventBus && activePage) {
          this.app.eventBus.emit("page:render", {
            pageElement: container,
            pageData: activePage
          });
        }
      });
      return;
    }
    if (this.app.themeManager) {
      this.app.themeManager.applyPageTheme(activePage.id, "default", container);
    }
    container.style.cssText = "";
    if (activePage && activePage.groups && activePage.groups.length > 0) {
      console.log("[SCROLL DEBUG] Default render - before appending bins", { scrollBeforeAppend: { scrollTop: container.scrollTop, scrollLeft: container.scrollLeft, scrollHeight: container.scrollHeight } });
      activePage.groups.forEach((bin, binIndex) => {
        const binElement = this.binRenderer.renderBin(activePage.id, bin);
        container.appendChild(binElement);
      });
      console.log("[SCROLL DEBUG] Default render - after appending bins", { scrollAfterAppend: { scrollTop: container.scrollTop, scrollLeft: container.scrollLeft, scrollHeight: container.scrollHeight } });
      requestAnimationFrame(() => {
        const beforeRestore = { scrollTop: container.scrollTop, scrollLeft: container.scrollLeft, scrollHeight: container.scrollHeight, clientHeight: container.clientHeight };
        console.log("[SCROLL DEBUG] Default render - About to restore scroll:", {
          preserved: { scrollTop, scrollLeft },
          beforeRestore
        });
        container.scrollTop = scrollTop;
        container.scrollLeft = scrollLeft;
        const afterRestore = { scrollTop: container.scrollTop, scrollLeft: container.scrollLeft, scrollHeight: container.scrollHeight, clientHeight: container.clientHeight };
        console.log("[SCROLL DEBUG] Default render - After restore:", {
          afterRestore,
          restored: afterRestore.scrollTop === scrollTop && afterRestore.scrollLeft === scrollLeft,
          difference: { top: (afterRestore.scrollTop - scrollTop).toFixed(0), left: (afterRestore.scrollLeft - scrollLeft).toFixed(0) }
        });
        if (this.app.eventBus && activePage) {
          const pageElement = document.querySelector(`[data-page-id="${activePage.id}"], .page, #bins-container`);
          if (pageElement) {
            this.app.eventBus.emit("page:render", {
              pageElement,
              pageData: activePage
            });
          }
        }
      });
    }
    if (!activePage || !activePage.groups || activePage.groups.length === 0) {
      container.innerHTML = "<p>No bins yet. Add a bin to get started!</p>";
      return;
    }
  }
  /**
   * Render page tabs
   */
  renderPageTabs() {
    const tabsContainer = document.getElementById("page-tabs");
    if (!tabsContainer) return;
    tabsContainer.innerHTML = "";
    const appState2 = getService(SERVICES.APP_STATE);
    appState2.documents.forEach((page, index) => {
      const tab = document.createElement("div");
      tab.className = "page-tab";
      if (page.id === appState2.currentDocumentId) {
        tab.classList.add("active");
      }
      tab.dataset.pageId = page.id;
      tab.textContent = index + 1;
      tab.title = `Page ${index + 1}`;
      tab.addEventListener("click", (e) => {
        e.stopPropagation();
        appState2.currentDocumentId = page.id;
        eventBus.emit(EVENTS.DATA.SAVE_REQUESTED);
        eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
      });
      tabsContainer.appendChild(tab);
    });
  }
  /**
   * Get current positions of bins and elements for animation
   */
  getCurrentPositions() {
    const positions = {
      groups: {},
      items: {}
    };
    document.querySelectorAll(".bin").forEach((binElement) => {
      const binId = binElement.dataset.binId;
      if (binId) {
        const rect = binElement.getBoundingClientRect();
        positions.groups[binId] = {
          top: rect.top,
          left: rect.left
        };
      }
    });
    document.querySelectorAll(".element").forEach((elementNode) => {
      const elementData = ElementFinder.getElementData(elementNode);
      if (elementData.pageId && elementData.binId && elementData.elementIndex !== null) {
        let elementKey = `${elementData.pageId}-${elementData.binId}-${elementData.elementIndex}`;
        const textElement = elementNode.querySelector(".task-text, .header-text, .audio-status");
        if (textElement) {
          const text = textElement.textContent || textElement.innerText || "";
          elementKey = `${elementData.pageId}-${elementData.binId}-${text.substring(0, 20)}-${elementData.elementIndex}`;
        }
        const rect = elementNode.getBoundingClientRect();
        positions.items[elementKey] = {
          top: rect.top,
          left: rect.left,
          pageId: elementData.pageId,
          binId: elementData.binId,
          elementIndex: elementData.elementIndex
        };
      }
    });
    return positions;
  }
  /**
   * Set format preservation flag
   * Used to prevent flicker when updating format views
   */
  setPreservingFormat(value) {
    this._preservingFormat = value;
  }
  /**
   * Render a bin - delegates to BinRenderer
   */
  renderBin(pageId, bin) {
    return this.binRenderer.renderBin(pageId, bin);
  }
  renderElement(pageId, binId, element, elementIndex, childIndex = null, depth = 0) {
    return this.elementRenderer.renderElement(pageId, binId, element, elementIndex, childIndex, depth);
  }
  renderChildren(pageId, binId, parentElement, parentElementIndex, depth = 0) {
    return this.elementRenderer.renderChildren(pageId, binId, parentElement, parentElementIndex, depth);
  }
  renderCalendar(container, pageId, binId, element, elementIndex) {
    const disabledMsg = document.createElement("div");
    disabledMsg.style.padding = "20px";
    disabledMsg.style.textAlign = "center";
    disabledMsg.style.color = "#888";
    disabledMsg.textContent = "Calendar feature temporarily disabled";
    container.appendChild(disabledMsg);
    return;
  }
  renderCurrentDateView(container, element) {
    return;
  }
  renderOneDayView(container, element) {
    return;
  }
  renderWeekView(container, element) {
    return;
  }
  renderMonthView(container, element) {
    return;
  }
  animateMovements(oldPositions) {
    return this.animationRenderer.animateMovements(oldPositions);
  }
  styleButton(text, onClick) {
    const btn = document.createElement("button");
    btn.textContent = text;
    btn.style.padding = "4px 8px";
    btn.style.border = "1px solid #555";
    btn.style.background = "#333";
    btn.style.color = "#e0e0e0";
    btn.style.borderRadius = "4px";
    btn.style.cursor = "pointer";
    btn.style.fontSize = "12px";
    btn.style.width = "32px";
    btn.style.minWidth = "32px";
    btn.onclick = (e) => {
      e.stopPropagation();
      onClick(e);
    };
    btn.onmouseenter = () => btn.style.background = "#444";
    btn.onmouseleave = () => btn.style.background = "#333";
    return btn;
  }
  toggleAllSubtasks() {
    const appState2 = getService(SERVICES.APP_STATE);
    appState2.allSubtasksExpanded = !appState2.allSubtasksExpanded;
    Object.keys(appState2.subtaskStates || {}).forEach((key) => {
      appState2.subtaskStates[key] = appState2.allSubtasksExpanded;
    });
    const subtaskContents = document.querySelectorAll('[id^="subtask-content-"]');
    const subtaskArrows = document.querySelectorAll('[id^="subtask-toggle-"]');
    subtaskContents.forEach((content) => {
      content.style.display = appState2.allSubtasksExpanded ? "block" : "none";
    });
    subtaskArrows.forEach((arrow) => {
      arrow.textContent = appState2.allSubtasksExpanded ? "▼" : "▶";
    });
  }
}
class RenderService {
  constructor(app2) {
    this.app = app2;
    this.appRenderer = new AppRenderer(app2);
    this.isRendering = false;
    this.renderQueue = [];
    this.setupEventListeners();
    registerService(SERVICES.RENDERER, this);
  }
  /**
   * Setup EventBus listeners for render requests
   */
  setupEventListeners() {
    eventBus.on(EVENTS.APP.RENDER_REQUESTED, () => {
      this.render();
    });
  }
  /**
   * Render the application
   * Delegates to AppRenderer
   */
  render() {
    if (this.isRendering) {
      return;
    }
    this.isRendering = true;
    performance.mark("render-start");
    const renderStart = performance.now();
    try {
      this.appRenderer.render();
      performance.mark("render-end");
      const renderTime = performance.now() - renderStart;
      if (renderTime > 100) {
        console.log(`[PERF] Render took ${renderTime.toFixed(1)}ms`);
      }
      eventBus.emit(EVENTS.APP.RENDERED);
    } catch (error) {
      console.error("[RenderService] Render error:", error);
    } finally {
      this.isRendering = false;
    }
  }
  /**
   * Request a render (public API)
   */
  requestRender() {
    eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
  }
  /**
   * Get the AppRenderer instance
   */
  getRenderer() {
    return this.appRenderer;
  }
}
class AppState {
  constructor() {
    this._documents = [];
    this._currentDocumentId = "document-1";
    this._currentEditModal = null;
    this._contextMenuState = {
      visible: false,
      documentId: null,
      groupId: null,
      elementIndex: null,
      subtaskIndex: null,
      x: 0,
      y: 0
    };
    this._allSubtasksExpanded = true;
    this._lastRightClickTime = 0;
    this._doubleClickThreshold = 300;
    this._doubleClickDelay = 150;
    this._clickTimeout = null;
    this._groupStates = {};
    this._subtaskStates = {};
    this._activeGroupId = null;
    this._currentEnterKeyHandler = null;
    this._multiEditState = null;
    this._documentStates = {};
    this._dragData = null;
    this._nestTargetElement = null;
    this._lastMovedElement = null;
    this._isDragging = false;
    this._autoScrollInterval = null;
    this._edgeScrollSpeed = 10;
    this._currentDragOverElement = null;
    this._touchPoints = {};
    this._firstTouchData = null;
    this._middleMouseDown = false;
    this._mediaRecorder = null;
    this._audioChunks = [];
    this._recordingStartTime = null;
    this._recordingTimer = null;
    this._inlineAudioRecorders = {};
    this._inlineAudioPlayers = {};
    this._multiPaneEnabled = true;
  }
  // Multi-pane enabled getter/setter
  get multiPaneEnabled() {
    return this._multiPaneEnabled;
  }
  set multiPaneEnabled(value) {
    this._multiPaneEnabled = value;
    eventBus.emit(EVENTS.UI.CHANGED, { type: "multiPaneEnabled", value });
  }
  // Documents getter/setter (canonical)
  get documents() {
    return this._documents;
  }
  set documents(value) {
    if (!Array.isArray(value)) {
      console.warn("[AppState] documents must be an array");
      return;
    }
    this._documents = value;
    eventBus.emit(EVENTS.DATA.CHANGED, { type: "documents", value });
  }
  // Current document ID getter/setter (canonical)
  get currentDocumentId() {
    return this._currentDocumentId;
  }
  set currentDocumentId(value) {
    if (typeof value !== "string") {
      console.warn("[AppState] currentDocumentId must be a string");
      return;
    }
    const oldValue = this._currentDocumentId;
    this._currentDocumentId = value;
    if (oldValue !== value) {
      eventBus.emit(EVENTS.PAGE.SWITCHED, { pageId: value });
    }
  }
  // Current edit modal getter/setter
  get currentEditModal() {
    return this._currentEditModal;
  }
  set currentEditModal(value) {
    this._currentEditModal = value;
  }
  // Context menu state getter/setter
  get contextMenuState() {
    return this._contextMenuState;
  }
  setContextMenuState(state) {
    const merged = { ...this._contextMenuState, ...state };
    this._contextMenuState = merged;
  }
  // Subtasks expanded state
  get allSubtasksExpanded() {
    return this._allSubtasksExpanded;
  }
  set allSubtasksExpanded(value) {
    this._allSubtasksExpanded = Boolean(value);
  }
  // Group states
  get groupStates() {
    return this._groupStates;
  }
  set groupStates(value) {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      console.warn("[AppState] groupStates must be an object");
      return;
    }
    this._groupStates = value || {};
  }
  setGroupState(groupId, state) {
    this._groupStates[groupId] = state;
  }
  getGroupState(groupId) {
    return this._groupStates[groupId];
  }
  // Subtask states
  get subtaskStates() {
    return this._subtaskStates;
  }
  set subtaskStates(value) {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      console.warn("[AppState] subtaskStates must be an object");
      return;
    }
    this._subtaskStates = value || {};
  }
  setSubtaskState(key, state) {
    this._subtaskStates[key] = state;
  }
  getSubtaskState(key) {
    return this._subtaskStates[key];
  }
  // Document states
  get documentStates() {
    return this._documentStates;
  }
  set documentStates(value) {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      console.warn("[AppState] documentStates must be an object");
      return;
    }
    this._documentStates = value || {};
  }
  setDocumentState(documentId, state) {
    this._documentStates[documentId] = state;
  }
  getDocumentState(documentId) {
    return this._documentStates[documentId];
  }
  // Active group ID
  get activeGroupId() {
    return this._activeGroupId;
  }
  set activeGroupId(value) {
    this._activeGroupId = value;
  }
  // Drag data
  get dragData() {
    return this._dragData;
  }
  set dragData(value) {
    this._dragData = value;
  }
  // Is dragging
  get isDragging() {
    return this._isDragging;
  }
  set isDragging(value) {
    this._isDragging = Boolean(value);
  }
  // Inline audio recorders
  get inlineAudioRecorders() {
    return this._inlineAudioRecorders;
  }
  // Inline audio players
  get inlineAudioPlayers() {
    return this._inlineAudioPlayers;
  }
  // Last right click time
  get lastRightClickTime() {
    return this._lastRightClickTime;
  }
  set lastRightClickTime(value) {
    this._lastRightClickTime = Number(value) || 0;
  }
  // Double click threshold
  get doubleClickThreshold() {
    return this._doubleClickThreshold;
  }
  set doubleClickThreshold(value) {
    this._doubleClickThreshold = Number(value) || 300;
  }
  // Double click delay
  get doubleClickDelay() {
    return this._doubleClickDelay;
  }
  set doubleClickDelay(value) {
    this._doubleClickDelay = Number(value) || 150;
  }
  // Click timeout
  get clickTimeout() {
    return this._clickTimeout;
  }
  set clickTimeout(value) {
    this._clickTimeout = value;
  }
  // Current enter key handler
  get currentEnterKeyHandler() {
    return this._currentEnterKeyHandler;
  }
  set currentEnterKeyHandler(value) {
    this._currentEnterKeyHandler = value;
  }
  // Nest target element
  get nestTargetElement() {
    return this._nestTargetElement;
  }
  set nestTargetElement(value) {
    this._nestTargetElement = value;
  }
  // Last moved element
  get lastMovedElement() {
    return this._lastMovedElement;
  }
  set lastMovedElement(value) {
    this._lastMovedElement = value;
  }
  // Auto scroll interval
  get autoScrollInterval() {
    return this._autoScrollInterval;
  }
  set autoScrollInterval(value) {
    this._autoScrollInterval = value;
  }
  // Middle mouse button state
  get middleMouseDown() {
    return this._middleMouseDown;
  }
  set middleMouseDown(value) {
    this._middleMouseDown = value;
  }
  // Edge scroll speed
  get edgeScrollSpeed() {
    return this._edgeScrollSpeed;
  }
  set edgeScrollSpeed(value) {
    this._edgeScrollSpeed = Number(value) || 10;
  }
  // Current drag over element
  get currentDragOverElement() {
    return this._currentDragOverElement;
  }
  set currentDragOverElement(value) {
    this._currentDragOverElement = value;
  }
  // Touch points
  get touchPoints() {
    return this._touchPoints;
  }
  set touchPoints(value) {
    this._touchPoints = value || {};
  }
  // First touch data
  get firstTouchData() {
    return this._firstTouchData;
  }
  set firstTouchData(value) {
    this._firstTouchData = value;
  }
  // Media recorder
  get mediaRecorder() {
    return this._mediaRecorder;
  }
  set mediaRecorder(value) {
    this._mediaRecorder = value;
  }
  // Audio chunks
  get audioChunks() {
    return this._audioChunks;
  }
  set audioChunks(value) {
    this._audioChunks = Array.isArray(value) ? value : [];
  }
  // Recording start time
  get recordingStartTime() {
    return this._recordingStartTime;
  }
  set recordingStartTime(value) {
    this._recordingStartTime = value;
  }
  // Recording timer
  get recordingTimer() {
    return this._recordingTimer;
  }
  set recordingTimer(value) {
    this._recordingTimer = value;
  }
  // Direct property access for backward compatibility
  // These allow app.js to access properties directly during transition
  getProperty(name) {
    return this[`_${name}`];
  }
  setProperty(name, value) {
    this[`_${name}`] = value;
  }
  /**
   * Initialize state from app instance (for migration)
   * @param {Object} app - TodoApp instance
   */
  initializeFromApp(app2) {
    this._documents = app2.documents || [];
    this._currentDocumentId = app2.currentDocumentId || "document-1";
    this._currentEditModal = app2.currentEditModal || null;
    this._contextMenuState = app2.contextMenuState || this._contextMenuState;
    this._allSubtasksExpanded = app2.allSubtasksExpanded !== void 0 ? app2.allSubtasksExpanded : true;
    this._lastRightClickTime = app2.lastRightClickTime || 0;
    this._doubleClickThreshold = app2.doubleClickThreshold || 300;
    this._doubleClickDelay = app2.doubleClickDelay || 150;
    this._clickTimeout = app2.clickTimeout || null;
    this._groupStates = app2.groupStates || {};
    this._subtaskStates = app2.subtaskStates || {};
    this._activeGroupId = app2.activeGroupId || null;
    this._currentEnterKeyHandler = app2.currentEnterKeyHandler || null;
    this._dragData = app2.dragData || null;
    this._nestTargetElement = app2.nestTargetElement || null;
    this._lastMovedElement = app2.lastMovedElement || null;
    this._isDragging = app2.isDragging || false;
    this._autoScrollInterval = app2.autoScrollInterval || null;
    this._edgeScrollSpeed = app2.edgeScrollSpeed || 10;
    this._currentDragOverElement = app2.currentDragOverElement || null;
    this._touchPoints = app2.touchPoints || {};
    this._firstTouchData = app2.firstTouchData || null;
    this._mediaRecorder = app2.mediaRecorder || null;
    this._audioChunks = app2.audioChunks || [];
    this._recordingStartTime = app2.recordingStartTime || null;
    this._recordingTimer = app2.recordingTimer || null;
    this._inlineAudioRecorders = app2.inlineAudioRecorders || {};
    this._inlineAudioPlayers = app2.inlineAudioPlayers || {};
    this._documentStates = app2.documentStates || {};
  }
  /**
   * Sync state back to app instance (for backward compatibility during transition)
   * @param {Object} app - TodoApp instance
   */
  syncToApp(app2) {
    app2.documents = this._documents;
    app2.currentDocumentId = this._currentDocumentId;
    app2.currentEditModal = this._currentEditModal;
    app2.contextMenuState = this._contextMenuState;
    app2.allSubtasksExpanded = this._allSubtasksExpanded;
    app2.lastRightClickTime = this._lastRightClickTime;
    app2.doubleClickThreshold = this._doubleClickThreshold;
    app2.doubleClickDelay = this._doubleClickDelay;
    app2.clickTimeout = this._clickTimeout;
    app2.groupStates = this._groupStates;
    app2.subtaskStates = this._subtaskStates;
    app2.activeGroupId = this._activeGroupId;
    app2.currentEnterKeyHandler = this._currentEnterKeyHandler;
    app2.multiEditState = this._multiEditState;
    app2.documentStates = this._documentStates;
    app2.dragData = this._dragData;
    app2.nestTargetElement = this._nestTargetElement;
    app2.lastMovedElement = this._lastMovedElement;
    app2.isDragging = this._isDragging;
    app2.autoScrollInterval = this._autoScrollInterval;
    app2.edgeScrollSpeed = this._edgeScrollSpeed;
    app2.currentDragOverElement = this._currentDragOverElement;
    app2.touchPoints = this._touchPoints;
    app2.firstTouchData = this._firstTouchData;
    app2.mediaRecorder = this._mediaRecorder;
    app2.audioChunks = this._audioChunks;
    app2.recordingStartTime = this._recordingStartTime;
    app2.recordingTimer = this._recordingTimer;
    app2.inlineAudioRecorders = this._inlineAudioRecorders;
    app2.inlineAudioPlayers = this._inlineAudioPlayers;
  }
}
class PluginDiscoveryManager {
  constructor() {
    this.manifestPath = "/js/plugins/plugin-manifest.json";
    this.manifest = null;
  }
  /**
   * Load plugin manifest
   * @returns {Promise<Object>} Manifest object
   */
  async loadManifest() {
    if (this.manifest) {
      return this.manifest;
    }
    try {
      const response = await fetch(this.manifestPath);
      if (!response.ok) {
        console.warn("[PluginDiscovery] Manifest not found, using defaults");
        return this.getDefaultManifest();
      }
      this.manifest = await response.json();
      return this.manifest;
    } catch (error) {
      console.warn("[PluginDiscovery] Failed to load manifest:", error);
      return this.getDefaultManifest();
    }
  }
  /**
   * Get default manifest (fallback if manifest file doesn't exist)
   * @returns {Object} Default manifest
   */
  getDefaultManifest() {
    return {
      elementTypes: [
        { name: "LinkBookmarkElement", path: "/js/plugins/element/LinkBookmarkElement.js" },
        { name: "CodeSnippetElement", path: "/js/plugins/element/CodeSnippetElement.js" },
        { name: "TableElement", path: "/js/plugins/element/TableElement.js" },
        { name: "ContactElement", path: "/js/plugins/element/ContactElement.js" },
        { name: "ExpenseTrackerElement", path: "/js/plugins/element/ExpenseTrackerElement.js" },
        { name: "ReadingListElement", path: "/js/plugins/element/ReadingListElement.js" },
        { name: "RecipeElement", path: "/js/plugins/element/RecipeElement.js" },
        { name: "WorkoutElement", path: "/js/plugins/element/WorkoutElement.js" },
        { name: "MoodTrackerElement", path: "/js/plugins/element/MoodTrackerElement.js" },
        { name: "NoteElement", path: "/js/plugins/element/NoteElement.js" },
        { name: "HabitTracker", path: "/js/plugins/element/HabitTracker.js" },
        { name: "TimeTracking", path: "/js/plugins/element/TimeTracking.js" },
        { name: "ElementRelationships", path: "/js/plugins/element/ElementRelationships.js" },
        { name: "CustomProperties", path: "/js/plugins/element/CustomProperties.js" }
      ],
      pagePlugins: [
        { name: "SearchFilter", path: "/js/plugins/page/SearchFilter.js" },
        { name: "ExportImport", path: "/js/plugins/page/ExportImport.js" },
        { name: "PageTemplates", path: "/js/plugins/page/PageTemplates.js" },
        { name: "CustomScripts", path: "/js/plugins/page/CustomScripts.js" },
        { name: "PageThemes", path: "/js/plugins/page/PageThemes.js" },
        { name: "CustomViews", path: "/js/plugins/page/CustomViews.js" },
        { name: "AnalyticsDashboard", path: "/js/plugins/page/AnalyticsDashboard.js" },
        { name: "PageGoalSetting", path: "/js/plugins/page/PageGoalSetting.js" },
        { name: "PageReminderSystem", path: "/js/plugins/page/PageReminderSystem.js" }
      ],
      binPlugins: [
        { name: "KanbanBoard", path: "/js/plugins/bin/KanbanBoard.js" },
        { name: "WorkflowAutomation", path: "/js/plugins/bin/WorkflowAutomation.js" },
        { name: "BatchOperations", path: "/js/plugins/bin/BatchOperations.js" },
        { name: "CustomSorting", path: "/js/plugins/bin/CustomSorting.js" },
        { name: "FilterPresets", path: "/js/plugins/bin/FilterPresets.js" },
        { name: "ProgressTracker", path: "/js/plugins/bin/ProgressTracker.js" },
        { name: "TimeEstimates", path: "/js/plugins/bin/TimeEstimates.js" },
        { name: "ColorCoding", path: "/js/plugins/bin/ColorCoding.js" },
        { name: "BinArchive", path: "/js/plugins/bin/BinArchive.js" },
        { name: "BinStatistics", path: "/js/plugins/bin/BinStatistics.js" },
        { name: "BinNotificationRules", path: "/js/plugins/bin/BinNotificationRules.js" },
        { name: "GanttChartView", path: "/js/plugins/bin/GanttChartView.js" }
      ],
      formatRenderers: [
        { name: "TrelloBoardFormat", path: "/js/plugins/format/TrelloBoardFormat.js" },
        { name: "GridLayoutFormat", path: "/js/plugins/format/GridLayoutFormat.js" },
        { name: "HorizontalLayoutFormat", path: "/js/plugins/format/HorizontalLayoutFormat.js" },
        { name: "PageKanbanFormat", path: "/js/plugins/format/PageKanbanFormat.js" },
        { name: "DocumentViewFormat", path: "/js/plugins/format/DocumentViewFormat.js" },
        { name: "LaTeXEditorFormat", path: "/js/plugins/format/LaTeXEditorFormat.js" },
        { name: "MindMapFormat", path: "/js/plugins/format/MindMapFormat.js" },
        { name: "LogicGraphFormat", path: "/js/plugins/format/LogicGraphFormat.js" },
        { name: "FlowchartFormat", path: "/js/plugins/format/FlowchartFormat.js" }
      ]
    };
  }
  /**
   * Get element type plugins
   * @returns {Promise<Array>} Array of plugin definitions
   */
  async getElementTypes() {
    const manifest = await this.loadManifest();
    return manifest.elementTypes || [];
  }
  /**
   * Get page plugins
   * @returns {Promise<Array>} Array of plugin definitions
   */
  async getPagePlugins() {
    const manifest = await this.loadManifest();
    return manifest.pagePlugins || [];
  }
  /**
   * Get bin plugins
   * @returns {Promise<Array>} Array of plugin definitions
   */
  async getBinPlugins() {
    const manifest = await this.loadManifest();
    return manifest.binPlugins || [];
  }
  /**
   * Get format renderers
   * @returns {Promise<Array>} Array of plugin definitions
   */
  async getFormatRenderers() {
    const manifest = await this.loadManifest();
    return manifest.formatRenderers || [];
  }
  /**
   * Get all plugins
   * @returns {Promise<Object>} Object with all plugin types
   */
  async getAllPlugins() {
    const manifest = await this.loadManifest();
    return {
      elementTypes: manifest.elementTypes || [],
      pagePlugins: manifest.pagePlugins || [],
      binPlugins: manifest.binPlugins || [],
      formatRenderers: manifest.formatRenderers || []
    };
  }
}
const pluginDiscovery = new PluginDiscoveryManager();
class AppInitializationManager {
  constructor(app2) {
    this.app = app2;
  }
  /**
   * Initialize the application
   * This is the main initialization method called from app.js
   */
  async init() {
    const settings = this.app.settingsManager.loadSettings();
    this.app.settingsManager.applySettings(settings);
    const urlParams = new URLSearchParams(window.location.search);
    const fileParam = urlParams.get("file");
    if (fileParam) {
      try {
        const fileData = await this.app.fileManager.loadFile(fileParam);
        const documents = fileData.documents || [];
        if (Array.isArray(documents)) {
          this.app.documents = documents;
          if (this.app.appState) {
            this.app.appState.documents = documents;
            const currentId = fileData.currentDocumentId;
            if (currentId) {
              this.app.appState.currentDocumentId = currentId;
            }
          }
          localStorage.setItem("twodo-last-opened-file", fileParam);
          console.log(`Loaded file from URL: ${fileParam}`);
        }
      } catch (error) {
        console.warn("Failed to load file from URL:", error);
      }
    } else {
      this.app.dataManager.checkDailyReset();
      this.app.dataManager.loadData();
    }
    if (this.app.formatRendererManager) {
      this.app.formatRendererManager.initializeFromSavedData();
    }
    this.app.relationshipManager.initializeFromData();
    this.app.eventHandler.setupEventListeners();
    this.app.setupTrashIcon();
    const initLoadStart = performance.now();
    await this.app.loadLastOpenedFile();
    performance.now() - initLoadStart;
    eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
    (async () => {
      if (this.app.fileManager && this.app.fileManager.currentFilename && this.app.syncManager) {
        this.app.syncManager.pendingFileJoin = this.app.fileManager.currentFilename;
        this.app.syncManager.connect().catch((error) => {
          console.warn("WebSocket connection failed, will retry:", error);
        });
      }
    })();
    this.app.initializePlugins().catch((err) => console.error("Plugin initialization error:", err));
    this.app.initializeGlobalSearch().catch((err) => console.error("Global search initialization error:", err));
    if (this.app.searchIndex) {
      if (window.requestIdleCallback) {
        requestIdleCallback(() => this.app.searchIndex.rebuildIndex());
      } else {
        setTimeout(() => this.app.searchIndex.rebuildIndex(), 0);
      }
    }
  }
  /**
   * Load all available plugins
   * Uses PluginDiscovery to load plugins from manifest
   */
  async loadAllPlugins() {
    const plugins = await pluginDiscovery.getAllPlugins();
    const loadPromises = [];
    for (const pluginDef of plugins.elementTypes) {
      loadPromises.push(
        this.app.pluginLoader.loadPlugin(pluginDef.path, pluginDef.name, this.app).catch((err) => {
          const isFetchError = err instanceof TypeError && (err.message.includes("Failed to fetch") || err.message.includes("ERR_CONNECTION_REFUSED") || err.message.includes("dynamically imported module"));
          if (isFetchError) {
            return null;
          }
          console.warn(`Failed to load element type ${pluginDef.name}:`, err);
          return null;
        })
      );
    }
    for (const pluginDef of plugins.pagePlugins) {
      loadPromises.push(
        this.app.pluginLoader.loadPlugin(pluginDef.path, pluginDef.name, this.app).catch((err) => {
          const isFetchError = err instanceof TypeError && (err.message.includes("Failed to fetch") || err.message.includes("ERR_CONNECTION_REFUSED") || err.message.includes("dynamically imported module"));
          if (isFetchError) {
            return null;
          }
          console.warn(`Failed to load page plugin ${pluginDef.name}:`, err);
          return null;
        })
      );
    }
    for (const pluginDef of plugins.binPlugins) {
      loadPromises.push(
        this.app.pluginLoader.loadPlugin(pluginDef.path, pluginDef.name, this.app).catch((err) => {
          const isFetchError = err instanceof TypeError && (err.message.includes("Failed to fetch") || err.message.includes("ERR_CONNECTION_REFUSED") || err.message.includes("dynamically imported module"));
          if (isFetchError) {
            return null;
          }
          console.warn(`Failed to load bin plugin ${pluginDef.name}:`, err);
          return null;
        })
      );
    }
    for (const pluginDef of plugins.formatRenderers) {
      loadPromises.push(
        this.app.pluginLoader.loadPlugin(pluginDef.path, pluginDef.name, this.app).catch((err) => {
          const isFetchError = err instanceof TypeError && (err.message.includes("Failed to fetch") || err.message.includes("ERR_CONNECTION_REFUSED") || err.message.includes("dynamically imported module"));
          if (isFetchError) {
            return null;
          }
          console.warn(`Failed to load format renderer ${pluginDef.name}:`, err);
          return null;
        })
      );
    }
    await Promise.allSettled(loadPromises);
    console.log("All plugins loaded");
    if (this.app.formatRendererManager) {
      console.log("[AppInitializer] Rescanning for formats after plugin load...");
      this.app.formatRendererManager.scanForFormats();
    }
  }
  /**
   * Initialize plugin system
   */
  async initializePlugins() {
    await this.loadAllPlugins();
    const initPromises = [];
    for (const page of this.app.documents) {
      initPromises.push(
        this.app.pagePluginManager.initializePagePlugins(page.id).catch((err) => console.warn(`Failed to initialize page plugins for ${page.id}:`, err))
      );
      if (page.groups) {
        for (const bin of page.groups) {
          initPromises.push(
            this.app.binPluginManager.initializeBinPlugins(page.id, bin.id).catch((err) => console.warn(`Failed to initialize bin plugins for ${page.id}/${bin.id}:`, err))
          );
        }
      }
    }
    await Promise.allSettled(initPromises);
  }
  /**
   * Initialize global search feature
   */
  async initializeGlobalSearch() {
    try {
      const SearchFilter = (await __vitePreload(async () => {
        const { default: __vite_default__ } = await import("./plugin-DnNq-0gy.js");
        return { default: __vite_default__ };
      }, true ? [] : void 0)).default;
      this.app.globalSearchFilter = new SearchFilter(this.app);
      await this.app.globalSearchFilter.onInit();
    } catch (error) {
      console.error("Failed to initialize global search:", error);
    }
    this.app.eventBus.on("element:created", () => {
      if (this.app.searchIndex) {
        this.app.searchIndex.rebuildIndex();
      }
    });
    this.app.eventBus.on("element:updated", ({ pageId, binId, elementIndex }) => {
      if (this.app.searchIndex) {
        this.app.searchIndex.updateElement(pageId, binId, elementIndex);
      }
    });
    this.app.eventBus.on("element:deleted", ({ pageId, binId, elementIndex }) => {
      if (this.app.searchIndex) {
        this.app.searchIndex.removeElement(pageId, binId, elementIndex);
      }
    });
  }
}
class DailyResetManager {
  constructor() {
  }
  /**
   * Get services
   */
  _getAppState() {
    return getService(SERVICES.APP_STATE);
  }
  _getDataManager() {
    return getService(SERVICES.DATA_MANAGER);
  }
  /**
   * Reset tasks for the new day
   * Removes completed one-time tasks and resets repeating tasks
   */
  resetToday() {
    const today = /* @__PURE__ */ new Date();
    const todayDateString = today.toDateString();
    const appState2 = this._getAppState();
    if (!appState2 || !appState2.documents) return;
    appState2.documents.forEach((page) => {
      page.groups?.forEach((bin) => {
        const items = bin.items || [];
        bin.items = items;
        bin.items = bin.items.filter((element) => {
          if (element.persistent || element.type === "image" || element.type === "calendar") {
            return true;
          }
          if (element.repeats === false && element.completed) {
            return false;
          }
          return true;
        });
        bin.items.forEach((element) => {
          if (element.persistent || element.type === "image" || element.type === "calendar") {
            return;
          }
          if (element.recurringSchedule && element.recurringSchedule !== "daily") {
            const lastReset = element.lastResetDate ? new Date(element.lastResetDate) : null;
            let shouldReset = false;
            if (!lastReset) {
              shouldReset = true;
            } else {
              const daysSinceReset = Math.floor((today - lastReset) / (1e3 * 60 * 60 * 24));
              switch (element.recurringSchedule) {
                case "weekly":
                  shouldReset = daysSinceReset >= 7;
                  break;
                case "monthly":
                  shouldReset = daysSinceReset >= 30;
                  break;
                case "custom":
                  shouldReset = daysSinceReset >= 7;
                  break;
                default:
                  shouldReset = false;
              }
            }
            if (shouldReset) {
              element.completed = false;
              element.lastResetDate = todayDateString;
              if (element.subtasks) {
                element.subtasks.forEach((st) => {
                  if (st.repeats !== false && !st.persistent) {
                    st.completed = false;
                  }
                });
              }
              if (element.items) {
                element.items.forEach((item) => {
                  if (item.repeats !== false && !item.persistent) {
                    item.completed = false;
                  }
                });
              }
            }
          } else if (element.repeats !== false) {
            element.completed = false;
            if (element.subtasks) {
              element.subtasks.forEach((st) => {
                if (st.repeats !== false && !st.persistent) {
                  st.completed = false;
                }
              });
            }
            if (element.items) {
              element.items.forEach((item) => {
                if (item.repeats !== false && !item.persistent) {
                  item.completed = false;
                }
              });
            }
          }
        });
      });
    });
    const dataManager = this._getDataManager();
    if (dataManager) {
      localStorage.setItem(dataManager.lastResetKey, todayDateString);
      dataManager.saveData();
    }
    eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
  }
}
class InlineEditor {
  constructor() {
  }
  /**
   * Get services
   */
  _getAppState() {
    return getService(SERVICES.APP_STATE);
  }
  _getUndoRedoManager() {
    return getService(SERVICES.UNDO_REDO_MANAGER);
  }
  _getDataManager() {
    return getService(SERVICES.DATA_MANAGER);
  }
  /**
   * Enable inline editing for element text
   * @param {HTMLElement} textElement - The DOM element to make editable
   * @param {string} pageId - Page ID
   * @param {string} binId - Bin ID
   * @param {number} elementIndex - Element index
   * @param {Object} element - Element data object
   */
  enableInlineEditing(textElement, pageId, binId, elementIndex, element) {
    if (textElement.contentEditable === "true") {
      return;
    }
    const originalText = element.text || "";
    let plainText = "";
    if (textElement.textContent) {
      plainText = textElement.textContent.trim();
    } else {
      plainText = originalText;
    }
    textElement.contentEditable = "true";
    textElement.textContent = plainText;
    textElement.style.outline = "2px solid #4a9eff";
    textElement.style.outlineOffset = "2px";
    textElement.style.borderRadius = "2px";
    textElement.focus();
    const range = document.createRange();
    range.selectNodeContents(textElement);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    const handleBlur = () => {
      const newText = textElement.textContent.trim();
      textElement.contentEditable = "false";
      textElement.style.outline = "";
      textElement.style.outlineOffset = "";
      textElement.style.borderRadius = "";
      if (newText !== originalText) {
        const appState2 = this._getAppState();
        const page = appState2.documents.find((p) => p.id === pageId);
        const bin = page?.groups?.find((b) => b.id === binId);
        const items = bin?.items || [];
        if (bin) {
          bin.items = items;
        }
        const el = items[elementIndex];
        if (el) {
          const undoRedoManager = this._getUndoRedoManager();
          if (undoRedoManager) {
            undoRedoManager.recordElementPropertyChange(pageId, binId, elementIndex, "text", newText, originalText);
          }
          el.text = newText;
          const dataManager = this._getDataManager();
          if (dataManager) {
            dataManager.saveData();
          }
          eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
        }
      } else {
        eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
      }
      textElement.removeEventListener("blur", handleBlur);
      textElement.removeEventListener("keydown", handleKeyDown);
    };
    const handleKeyDown = (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        textElement.blur();
      } else if (e.key === "Escape") {
        textElement.textContent = originalText;
        textElement.blur();
      }
    };
    textElement.addEventListener("blur", handleBlur);
    textElement.addEventListener("keydown", handleKeyDown);
  }
}
class NavigationHelper {
  /**
   * Navigate to a specific element
   * @param {string} pageId - Page ID
   * @param {string} binId - Bin ID
   * @param {number} elementIndex - Element index
   * @param {Object} options - Navigation options
   * @param {Object} app - App instance
   * @param {boolean} options.highlight - Whether to highlight the element (default: true)
   * @param {string} options.highlightColor - Highlight color (default: 'rgba(74, 158, 255, 0.3)')
   * @param {number} options.highlightDuration - Highlight duration in ms (default: 2000)
   * @param {Object} options.scrollOptions - Options for scrollIntoView (default: { behavior: 'smooth', block: 'center' })
   * @param {number} options.delay - Delay before scrolling in ms (default: 100)
   */
  static navigateToElement(pageId, binId, elementIndex, app2, options = {}) {
    const {
      highlight = true,
      highlightColor = "rgba(74, 158, 255, 0.3)",
      highlightDuration = 2e3,
      scrollOptions = { behavior: "smooth", block: "center" },
      delay = 100
    } = options;
    if (app2 && app2.appState) {
      app2.appState.currentDocumentId = pageId;
    }
    eventBus.emit(EVENTS.PAGE.SWITCHED, { pageId });
    eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
    setTimeout(() => {
      const element = ElementFinder$1.findElement(pageId, binId, elementIndex);
      if (element) {
        this.scrollToElement(element, scrollOptions);
        if (highlight) {
          this.highlightElement(element, highlightDuration, highlightColor);
        }
      }
    }, delay);
  }
  /**
   * Navigate to a specific page
   * @param {string} pageId - Page ID
   * @param {Object} app - App instance
   * @param {Object} options - Navigation options
   * @param {boolean} options.render - Whether to trigger render (default: true)
   */
  static navigateToPage(pageId, app2, options = {}) {
    const { render = true } = options;
    if (app2 && app2.appState) {
      app2.appState.currentDocumentId = pageId;
    }
    if (render) {
      eventBus.emit(EVENTS.PAGE.SWITCHED, { pageId });
      eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
    }
  }
  /**
   * Navigate to a specific bin
   * @param {string} pageId - Page ID
   * @param {string} binId - Bin ID
   * @param {Object} app - App instance
   * @param {Object} options - Navigation options
   * @param {boolean} options.scroll - Whether to scroll to bin (default: true)
   */
  static navigateToBin(pageId, binId, app2, options = {}) {
    const { scroll = true } = options;
    this.navigateToPage(pageId, app2, options);
    if (scroll) {
      setTimeout(() => {
        const bin = this.findBin(pageId, binId);
        if (bin) {
          this.scrollToElement(bin, { behavior: "smooth", block: "start" });
        }
      }, 100);
    }
  }
  /**
   * Highlight an element with a fade effect
   * @param {HTMLElement} element - Element to highlight
   * @param {number} duration - Duration in milliseconds (default: 2000)
   * @param {string} color - Highlight color (default: 'rgba(74, 158, 255, 0.3)')
   */
  static highlightElement(element, duration = 2e3, color = "rgba(74, 158, 255, 0.3)") {
    if (!element) return;
    const originalBackground = element.style.background;
    const originalTransition = element.style.transition;
    element.style.background = color;
    element.style.transition = "background 0.3s";
    setTimeout(() => {
      element.style.background = originalBackground;
      setTimeout(() => {
        element.style.transition = originalTransition;
      }, 300);
    }, duration);
  }
  /**
   * Scroll to an element
   * @param {HTMLElement} element - Element to scroll to
   * @param {Object} options - Scroll options (passed to scrollIntoView)
   */
  static scrollToElement(element, options = {}) {
    if (!element) return;
    const defaultOptions = {
      behavior: "smooth",
      block: "center",
      inline: "nearest"
    };
    element.scrollIntoView({ ...defaultOptions, ...options });
  }
  /**
   * Find element by data attributes
   * @param {string} pageId - Page ID
   * @param {string} binId - Bin ID
   * @param {number} elementIndex - Element index
   * @param {HTMLElement} context - Optional context element (default: document)
   * @param {number} childIndex - Optional child index for nested elements
   * @returns {HTMLElement|null} Found element or null
   */
  static findElementByData(pageId, binId, elementIndex, context = document, childIndex = null) {
    let selector = `[data-page-id="${pageId}"][data-bin-id="${binId}"][data-element-index="${elementIndex}"]`;
    if (childIndex !== null && childIndex !== void 0) {
      selector += `[data-child-index="${childIndex}"]`;
    }
    return context.querySelector(selector);
  }
  /**
   * Find bin element by data attributes
   * @param {string} pageId - Page ID
   * @param {string} binId - Bin ID
   * @param {HTMLElement} context - Optional context element (default: document)
   * @returns {HTMLElement|null} Found bin element or null
   */
  static findBin(pageId, binId, context = document) {
    return context.querySelector(`[data-page-id="${pageId}"][data-bin-id="${binId}"].bin`);
  }
  /**
   * Find page element by data attributes
   * @param {string} pageId - Page ID
   * @param {HTMLElement} context - Optional context element (default: document)
   * @returns {HTMLElement|null} Found page element or null
   */
  static findPage(pageId, context = document) {
    return context.querySelector(`[data-page-id="${pageId}"].page`);
  }
  /**
   * Find all elements in a bin
   * @param {string} pageId - Page ID
   * @param {string} binId - Bin ID
   * @param {HTMLElement} context - Optional context element (default: document)
   * @returns {NodeList} List of element nodes
   */
  static findAllElements(pageId, binId, context = document) {
    return context.querySelectorAll(`[data-page-id="${pageId}"][data-bin-id="${binId}"][data-element-index]`);
  }
}
const NavigationHelper$1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  NavigationHelper
}, Symbol.toStringTag, { value: "Module" }));
class LinkHandler {
  constructor(app2) {
    this.app = app2;
  }
  /**
   * Parse text and create links (external URLs and internal references)
   * @param {string} text - Text to parse
   * @param {Object} context - Context (pageId, binId, elementIndex)
   * @returns {DocumentFragment} Fragment containing text nodes and link elements
   */
  parseLinks(text, context = {}) {
    if (!text || typeof text !== "string") {
      return document.createDocumentFragment();
    }
    const fragment = document.createDocumentFragment();
    const internalRefPattern = /\[\[([^\]]+)\]\]/g;
    const markdownLinkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
    const linkMatches = [];
    let match;
    while ((match = markdownLinkPattern.exec(text)) !== null) {
      linkMatches.push({
        type: "markdown",
        start: match.index,
        end: match.index + match[0].length,
        text: match[1],
        url: match[2],
        fullMatch: match[0]
      });
    }
    while ((match = internalRefPattern.exec(text)) !== null) {
      const refText = match[1];
      const parts = refText.split("|");
      const ref = parts[0].trim();
      const displayText = parts[1] ? parts[1].trim() : ref;
      linkMatches.push({
        type: "internal",
        start: match.index,
        end: match.index + match[0].length,
        ref,
        displayText,
        fullMatch: match[0]
      });
    }
    linkMatches.sort((a, b) => a.start - b.start);
    let lastIndex = 0;
    linkMatches.forEach((linkMatch) => {
      if (linkMatch.start > lastIndex) {
        const beforeText = text.substring(lastIndex, linkMatch.start);
        this._addTextWithUrls(fragment, beforeText);
      }
      if (linkMatch.type === "markdown") {
        const link = this._createExternalLink(linkMatch.url, linkMatch.text);
        fragment.appendChild(link);
      } else if (linkMatch.type === "internal") {
        const link = this._createInternalLink(linkMatch.ref, linkMatch.displayText, context);
        fragment.appendChild(link);
      }
      lastIndex = linkMatch.end;
    });
    if (lastIndex < text.length) {
      const remainingText = text.substring(lastIndex);
      this._addTextWithUrls(fragment, remainingText);
    }
    this._processMarkdownFormatting(fragment);
    return fragment;
  }
  /**
   * Add text with URL detection (for text outside of markdown/internal links)
   * @param {DocumentFragment} fragment - Fragment to add to
   * @param {string} text - Text to process
   */
  _addTextWithUrls(fragment, text) {
    if (!text) return;
    const urlPattern = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9-]+\.[a-zA-Z]{2,}[^\s]*)/g;
    const parts = text.split(urlPattern);
    parts.forEach((part) => {
      if (urlPattern.test(part)) {
        let href = part;
        if (!href.startsWith("http://") && !href.startsWith("https://")) {
          href = "https://" + href;
        }
        const link = this._createExternalLink(href, part);
        fragment.appendChild(link);
      } else if (part) {
        const textNode = document.createTextNode(part);
        fragment.appendChild(textNode);
      }
    });
  }
  /**
   * Process markdown formatting in fragment (bold, italic, code, strikethrough)
   * @param {DocumentFragment} fragment - Fragment to process
   */
  _processMarkdownFormatting(fragment) {
    const tempDiv = document.createElement("div");
    tempDiv.appendChild(fragment.cloneNode(true));
    let html = tempDiv.innerHTML;
    html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
    html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    html = html.replace(/(?<!\*)\*([^*]+?)\*(?!\*)/g, "<em>$1</em>");
    html = html.replace(/~~([^~]+)~~/g, "<del>$1</del>");
    tempDiv.innerHTML = html;
    while (fragment.firstChild) {
      fragment.removeChild(fragment.firstChild);
    }
    while (tempDiv.firstChild) {
      fragment.appendChild(tempDiv.firstChild);
    }
  }
  /**
   * Create external link element
   * @param {string} href - URL
   * @param {string} text - Link text
   * @returns {HTMLElement} Link element
   */
  _createExternalLink(href, text) {
    const link = document.createElement("a");
    link.href = href;
    link.textContent = text;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.style.color = "#4a9eff";
    link.style.textDecoration = "underline";
    link.className = "external-link";
    link.onclick = (e) => {
      e.stopPropagation();
    };
    return link;
  }
  /**
   * Create internal link element (to page, element, or bin)
   * @param {string} ref - Reference (page name, element ID, bin name)
   * @param {string} displayText - Display text
   * @param {Object} context - Context (pageId, binId, elementIndex)
   * @returns {HTMLElement} Link element
   */
  _createInternalLink(ref, displayText, context) {
    const link = document.createElement("a");
    link.textContent = displayText;
    link.href = "#";
    link.className = "internal-link";
    link.style.color = "#4a9eff";
    link.style.textDecoration = "underline";
    link.style.cursor = "pointer";
    link.dataset.internalRef = ref;
    link.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.navigateToReference(ref, context);
    };
    return link;
  }
  /**
   * Navigate to an internal reference (page, element, or bin)
   * @param {string} ref - Reference string
   * @param {Object} context - Current context
   */
  navigateToReference(ref, context = {}) {
    if (!this.app) return;
    const pages = this.app.appState?.documents || this.app.documents || [];
    let targetPage = pages.find(
      (p) => p.id === ref || p.title?.toLowerCase() === ref.toLowerCase() || p.title?.toLowerCase().replace(/\s+/g, "-") === ref.toLowerCase()
    );
    if (targetPage) {
      this.app.appState.currentDocumentId = targetPage.id;
      eventBus.emit(EVENTS.PAGE.SWITCHED, { pageId: targetPage.id });
      eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
      setTimeout(() => {
        const container = document.getElementById("bins-container");
        if (container) {
          container.scrollTop = 0;
        }
      }, 100);
      return;
    }
    for (const page of pages) {
      if (!page.groups) continue;
      for (const bin of page.groups) {
        const items = bin.items || [];
        bin.items = items;
        for (let i = 0; i < items.length; i++) {
          const element = items[i];
          if (element.id === ref) {
            this._navigateToElement(page.id, bin.id, i);
            return;
          }
          if (element.text && element.text.toLowerCase().includes(ref.toLowerCase())) {
            this._navigateToElement(page.id, bin.id, i);
            return;
          }
        }
        if (bin.title && bin.title.toLowerCase() === ref.toLowerCase()) {
          this.app.appState.currentDocumentId = page.id;
          eventBus.emit(EVENTS.PAGE.SWITCHED, { pageId: page.id });
          eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
          setTimeout(() => {
            const binElement = document.querySelector(`[data-bin-id="${bin.id}"]`);
            if (binElement) {
              binElement.scrollIntoView({ behavior: "smooth", block: "center" });
              binElement.style.background = "rgba(74, 158, 255, 0.2)";
              setTimeout(() => {
                binElement.style.background = "";
              }, 2e3);
            }
          }, 100);
          return;
        }
      }
    }
    console.warn(`[LinkHandler] Reference not found: ${ref}`);
  }
  /**
   * Navigate to a specific element
   * @param {string} pageId - Page ID
   * @param {string} binId - Bin ID
   * @param {number} elementIndex - Element index
   */
  _navigateToElement(pageId, binId, elementIndex) {
    NavigationHelper.navigateToElement(pageId, binId, elementIndex, this.app);
  }
}
class ModalEventBridge {
  constructor() {
    this.setupEventListeners();
  }
  /**
   * Setup event listeners for UI modal events
   */
  setupEventListeners() {
    eventBus.on(EVENTS.UI.SHOW_EDIT_MODAL, ({ pageId, binId, elementIndex, element }) => {
      const modalHandler = getService(SERVICES.MODAL_HANDLER);
      modalHandler.showEditModal(pageId, binId, elementIndex, element);
    });
    eventBus.on(EVENTS.UI.SHOW_ADD_ELEMENT_MODAL, ({ pageId, binId, elementIndex }) => {
      const modalHandler = getService(SERVICES.MODAL_HANDLER);
      modalHandler.showAddElementModal(pageId, binId, elementIndex);
    });
    eventBus.on(EVENTS.UI.SHOW_ADD_CHILD_ELEMENT_MODAL, ({ pageId, binId, elementIndex }) => {
      const modalHandler = getService(SERVICES.MODAL_HANDLER);
      modalHandler.showAddChildElementModal(pageId, binId, elementIndex);
    });
    eventBus.on(EVENTS.UI.SHOW_ADD_SUBTASKS_MODAL, ({ pageId, binId, elementIndex, element }) => {
      const modalHandler = getService(SERVICES.MODAL_HANDLER);
      modalHandler.showAddSubtasksModal(pageId, binId, elementIndex, element);
    });
    eventBus.on(EVENTS.UI.SHOW_VIEW_DATA_MODAL, ({ element, isSubtask = false }) => {
      const modalHandler = getService(SERVICES.MODAL_HANDLER);
      modalHandler.showViewDataModal(element, isSubtask);
    });
    eventBus.on(EVENTS.UI.SHOW_EDIT_PAGE_MODAL, ({ pageId }) => {
      const modalHandler = getService(SERVICES.MODAL_HANDLER);
      modalHandler.showEditPageModal(pageId);
    });
    eventBus.on(EVENTS.UI.SHOW_EDIT_BIN_MODAL, ({ pageId, binId }) => {
      const modalHandler = getService(SERVICES.MODAL_HANDLER);
      modalHandler.showEditBinModal(pageId, binId);
    });
    eventBus.on(EVENTS.UI.SHOW_VISUAL_CUSTOMIZATION_MODAL, ({ targetType, targetId, context }) => {
      const modalHandler = getService(SERVICES.MODAL_HANDLER);
      modalHandler.showVisualCustomizationModal(targetType, targetId, context);
    });
    eventBus.on(EVENTS.UI.CLOSE_MODAL, () => {
      const modalHandler = getService(SERVICES.MODAL_HANDLER);
      modalHandler.closeModal();
    });
    eventBus.on(EVENTS.UI.FOCUS_INPUT, ({ inputId, select = false }) => {
      const input = document.getElementById(inputId);
      if (input) {
        input.focus();
        if (select) {
          input.select();
        }
      }
    });
  }
}
const modalEventBridge = new ModalEventBridge();
class TodoApp {
  constructor() {
    performance.mark("app-constructor-start");
    const constructorStart = performance.now();
    this.appState = new AppState();
    this.dataManager = new DataManager();
    this.settingsManager = new SettingsManager();
    this.themeManager = new ThemeManager();
    this.visualSettingsManager = new VisualSettingsManager();
    this.pageManager = new PageManager();
    this.binManager = new BinManager();
    this.undoRedoManager = new UndoRedoManager();
    registerService(SERVICES.EVENT_BUS, eventBus);
    registerService(SERVICES.APP_STATE, this.appState);
    registerService(SERVICES.DATA_MANAGER, this.dataManager);
    registerService(SERVICES.UNDO_REDO_MANAGER, this.undoRedoManager);
    registerService(SERVICES.SETTINGS_MANAGER, this.settingsManager);
    registerService(SERVICES.PAGE_MANAGER, this.pageManager);
    registerService(SERVICES.BIN_MANAGER, this.binManager);
    this.elementManager = new ElementManager();
    this.dragDropHandler = new DragDropHandler();
    this.audioHandler = new AudioHandler();
    this.eventHandler = new EventHandler(this);
    this.contextMenuHandler = new ContextMenuHandler();
    this.touchGestureHandler = new TouchGestureHandler();
    this.modalHandler = new ModalHandler();
    this.fileManager = new FileManager();
    registerAllServices(this);
    this.relationshipManager = new RelationshipManager();
    this.templateManager = new TemplateManager();
    this.automationEngine = new AutomationManager();
    this.tagManager = new TagManager();
    this.searchIndex = new SearchIndex();
    this.exportService = new ExportService();
    this.importService = new ImportService();
    this.oauthManager = new OAuthManager();
    this.syncManager = new SyncManager();
    this._fileLoadPromise = null;
    const lastOpenedFile = localStorage.getItem("twodo-last-opened-file");
    if (lastOpenedFile) {
      performance.mark("preload-start");
      const preloadInitStart = performance.now();
      performance.getEntriesByType("resource").length;
      this._fileLoadPromise = this._preloadFile(lastOpenedFile);
      performance.now() - preloadInitStart;
    }
    this.timeTracker = new TimeTracker();
    this.dailyResetManager = new DailyResetManager();
    this.inlineEditor = new InlineEditor();
    this.linkHandler = new LinkHandler();
    this.pagePluginManager = new PagePluginManager();
    this.binPluginManager = new BinPluginManager();
    this.elementTypeManager = new ElementTypeManager();
    this.formatRendererManager = new FormatRendererManager();
    this.pluginRegistry = pluginRegistry;
    this.eventBus = eventBus;
    this.pluginLoader = pluginLoader;
    this.renderService = new RenderService(this);
    this.modalEventBridge = modalEventBridge;
    this.appInitializer = new AppInitializationManager(this);
    performance.mark("app-constructor-end");
    performance.now() - constructorStart;
    this.init();
  }
  /**
   * Preload file data early (non-blocking)
   * This starts the fetch immediately so it can happen in parallel with other initialization
   */
  async _preloadFile(filename) {
    performance.mark("preload-fetch-start");
    const preloadStart = performance.now();
    try {
      const encodedFilename = encodeURIComponent(filename);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5e3);
      try {
        const fetchStart = performance.now();
        const fetchUrl = `/files/${encodedFilename}`;
        const requestsBefore = performance.getEntriesByType("resource").length;
        const response = await fetch(fetchUrl, {
          signal: controller.signal,
          cache: "no-cache"
        });
        const fetchEnd = performance.now();
        const fetchTime = fetchEnd - fetchStart;
        clearTimeout(timeoutId);
        setTimeout(() => {
          const resourceTimings = performance.getEntriesByType("resource");
          const resourceTiming = resourceTimings.find((entry) => entry.name.includes(encodedFilename));
          if (resourceTiming) {
          } else {
          }
        }, 100);
        if (!response.ok) {
          if (response.status === 404) {
            return null;
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const parseStart = performance.now();
        const result = await response.json();
        const parseTime = performance.now() - parseStart;
        if (result.success) {
          performance.mark("preload-fetch-end");
          const preloadTime = performance.now() - preloadStart;
          return result.data;
        } else {
          throw new Error(result.error || "Failed to load file");
        }
      } catch (fetchError) {
        clearTimeout(timeoutId);
        if (fetchError.name === "AbortError") {
          throw new Error("File load timeout");
        }
        throw fetchError;
      }
    } catch (error) {
      return null;
    }
  }
  /**
   * Load the last opened file from server (device-specific)
   */
  async loadLastOpenedFile() {
    performance.mark("load-file-start");
    const loadStart = performance.now();
    try {
      const lastOpenedFile = localStorage.getItem("twodo-last-opened-file");
      if (!lastOpenedFile) {
        return;
      }
      let fileData;
      if (this._fileLoadPromise) {
        const preloadAwaitStart = performance.now();
        const preloadedData = await this._fileLoadPromise;
        const preloadAwaitTime = performance.now() - preloadAwaitStart;
        if (preloadedData) {
          fileData = preloadedData;
          this.fileManager.currentFilename = lastOpenedFile;
        } else {
          const loadPromise = this.fileManager.loadFile(lastOpenedFile, false);
          const timeoutPromise = new Promise(
            (_, reject) => setTimeout(() => reject(new Error("File load timeout")), 5e3)
          );
          fileData = await Promise.race([loadPromise, timeoutPromise]);
        }
      } else {
        const loadPromise = this.fileManager.loadFile(lastOpenedFile, false);
        const timeoutPromise = new Promise(
          (_, reject) => setTimeout(() => reject(new Error("File load timeout")), 5e3)
        );
        fileData = await Promise.race([loadPromise, timeoutPromise]);
      }
      const documents = fileData.documents || [];
      if (!documents || !Array.isArray(documents)) {
        console.warn("Last opened file has invalid format, using default data");
        localStorage.removeItem("twodo-last-opened-file");
        return;
      }
      this.appState.documents = documents;
      if (this.dataManager) {
        this.dataManager._lastSyncTimestamp = Date.now();
      }
      console.log(`Loaded last opened file: ${lastOpenedFile}`);
      performance.mark("load-file-end");
      const loadTime = performance.now() - loadStart;
      if (this.undoRedoManager) {
        this.undoRedoManager.loadBuffer(lastOpenedFile).catch((err) => {
          console.warn("Failed to load buffer in background:", err);
        });
      }
    } catch (error) {
      if (error.status === 404 || error.message.includes("not found") || error.message.includes("timeout")) {
        localStorage.removeItem("twodo-last-opened-file");
        console.log("Last opened file not found or timeout, cleared preference");
      } else {
        console.warn("Failed to load last opened file:", error);
      }
    }
  }
  async init() {
    const settings = this.settingsManager.loadSettings();
    this.settingsManager.applySettings(settings);
    const urlParams = new URLSearchParams(window.location.search);
    const fileParam = urlParams.get("file");
    if (fileParam) {
      try {
        const fileData = await this.fileManager.loadFile(fileParam);
        const documents = fileData.documents || [];
        if (documents && Array.isArray(documents)) {
          this.appState.documents = documents;
          localStorage.setItem("twodo-last-opened-file", fileParam);
          console.log(`Loaded file from URL: ${fileParam}`);
        }
      } catch (error) {
        console.warn("Failed to load file from URL:", error);
      }
    } else {
      this.dataManager.checkDailyReset();
      this.dataManager.loadData();
    }
    if (this.formatRendererManager) {
      this.formatRendererManager.initializeFromSavedData();
    }
    this.relationshipManager.initializeFromData();
    this.eventHandler.setupEventListeners();
    this.setupTrashIcon();
    await this.loadLastOpenedFile();
    eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
    (async () => {
      if (this.fileManager && this.fileManager.currentFilename && this.syncManager) {
        this.syncManager.pendingFileJoin = this.fileManager.currentFilename;
        this.syncManager.connect().catch((error) => {
          console.warn("WebSocket connection failed, will retry:", error);
        });
      }
    })();
    this.initializePlugins().catch((err) => console.error("Plugin initialization error:", err));
    this.initializeGlobalSearch().catch((err) => console.error("Global search initialization error:", err));
    if (this.searchIndex) {
      if (window.requestIdleCallback) {
        requestIdleCallback(() => this.searchIndex.rebuildIndex());
      } else {
        setTimeout(() => this.searchIndex.rebuildIndex(), 0);
      }
    }
  }
  /**
   * Load all available plugins
   * Uses PluginDiscovery to load plugins from manifest
   */
  async loadAllPlugins() {
    const plugins = await pluginDiscovery.getAllPlugins();
    const loadPromises = [];
    for (const pluginDef of plugins.elementTypes) {
      loadPromises.push(
        this.pluginLoader.loadPlugin(pluginDef.path, pluginDef.name, this).catch((err) => {
          const isFetchError = err instanceof TypeError && (err.message.includes("Failed to fetch") || err.message.includes("ERR_CONNECTION_REFUSED") || err.message.includes("dynamically imported module"));
          if (isFetchError) {
            return null;
          }
          console.warn(`Failed to load element type ${pluginDef.name}:`, err);
          return null;
        })
      );
    }
    for (const pluginDef of plugins.pagePlugins) {
      loadPromises.push(
        this.pluginLoader.loadPlugin(pluginDef.path, pluginDef.name, this).catch((err) => {
          const isFetchError = err instanceof TypeError && (err.message.includes("Failed to fetch") || err.message.includes("ERR_CONNECTION_REFUSED") || err.message.includes("dynamically imported module"));
          if (isFetchError) {
            return null;
          }
          console.warn(`Failed to load page plugin ${pluginDef.name}:`, err);
          return null;
        })
      );
    }
    for (const pluginDef of plugins.binPlugins) {
      loadPromises.push(
        this.pluginLoader.loadPlugin(pluginDef.path, pluginDef.name, this).catch((err) => {
          const isFetchError = err instanceof TypeError && (err.message.includes("Failed to fetch") || err.message.includes("ERR_CONNECTION_REFUSED") || err.message.includes("dynamically imported module"));
          if (isFetchError) {
            return null;
          }
          console.warn(`Failed to load bin plugin ${pluginDef.name}:`, err);
          return null;
        })
      );
    }
    for (const pluginDef of plugins.formatRenderers) {
      loadPromises.push(
        this.pluginLoader.loadPlugin(pluginDef.path, pluginDef.name, this).catch((err) => {
          const isFetchError = err instanceof TypeError && (err.message.includes("Failed to fetch") || err.message.includes("ERR_CONNECTION_REFUSED") || err.message.includes("dynamically imported module"));
          if (isFetchError) {
            return null;
          }
          console.warn(`Failed to load format renderer ${pluginDef.name}:`, err);
          return null;
        })
      );
    }
    await Promise.allSettled(loadPromises);
    console.log("All plugins loaded");
    if (this.formatRendererManager) {
      console.log("[app.js] Rescanning for formats after plugin load...");
      this.formatRendererManager.scanForFormats();
    }
  }
  /**
   * Initialize plugin system
   */
  async initializePlugins() {
    await this.loadAllPlugins();
    const initPromises = [];
    for (const page of this.appState.documents) {
      initPromises.push(
        this.pagePluginManager.initializePagePlugins(page.id).catch((err) => console.warn(`Failed to initialize page plugins for ${page.id}:`, err))
      );
      const groups = page.groups || page.bins || [];
      for (const bin of groups) {
        initPromises.push(
          this.binPluginManager.initializeBinPlugins(page.id, bin.id).catch((err) => console.warn(`Failed to initialize bin plugins for ${page.id}/${bin.id}:`, err))
        );
      }
    }
    await Promise.allSettled(initPromises);
  }
  /**
   * Initialize global search feature
   */
  async initializeGlobalSearch() {
    try {
      const SearchFilter = (await __vitePreload(async () => {
        const { default: __vite_default__ } = await import("./plugin-DnNq-0gy.js");
        return { default: __vite_default__ };
      }, true ? [] : void 0)).default;
      this.globalSearchFilter = new SearchFilter(this);
      await this.globalSearchFilter.onInit();
    } catch (error) {
      console.error("Failed to initialize global search:", error);
    }
    this.eventBus.on("element:created", () => {
      if (this.searchIndex) {
        this.searchIndex.rebuildIndex();
      }
    });
    this.eventBus.on("element:updated", ({ pageId, binId, elementIndex }) => {
      if (this.searchIndex) {
        this.searchIndex.updateElement(pageId, binId, elementIndex);
      }
    });
    this.eventBus.on("element:deleted", ({ pageId, binId, elementIndex }) => {
      if (this.searchIndex) {
        this.searchIndex.removeElement(pageId, binId, elementIndex);
      }
    });
  }
  setupTrashIcon() {
    return this.dragDropHandler.setupTrashIcon();
  }
  // setupEventListeners is now in EventHandler.js
  // Helper method to create and style buttons - delegated to AppRenderer
  styleButton(text, onClick) {
    if (this.renderService && this.renderService.getRenderer) {
      return this.renderService.getRenderer().styleButton(text, onClick);
    }
    const btn = document.createElement("button");
    btn.textContent = text;
    btn.onclick = (e) => {
      e.stopPropagation();
      onClick(e);
    };
    return btn;
  }
  resetToday() {
    return this.dailyResetManager.resetToday();
  }
  // Page and element management methods are now in PageManager, ElementManager, and DragDropHandler
  // Delegating to managers for backward compatibility
  addPage() {
    return this.pageManager.addPage();
  }
  deletePage(pageId) {
    return this.pageManager.deletePage(pageId);
  }
  movePage(sourcePageId, targetPageId) {
    return this.pageManager.movePage(sourcePageId, targetPageId);
  }
  addBin(pageId) {
    return this.binManager.addBin(pageId);
  }
  deleteBin(pageId, binId) {
    return this.binManager.deleteBin(pageId, binId);
  }
  moveBin(sourcePageId, sourceBinId, targetPageId, targetBinId) {
    return this.binManager.moveBin(sourcePageId, sourceBinId, targetPageId, targetBinId);
  }
  moveElement(sourcePageId, sourceBinId, sourceElementIndex, targetPageId, targetBinId, targetElementIndex, isChild = false, parentElementIndex = null, childIndex = null) {
    return this.dragDropHandler.moveElement(sourcePageId, sourceBinId, sourceElementIndex, targetPageId, targetBinId, targetElementIndex, isChild, parentElementIndex, childIndex);
  }
  reorderChildElement(pageId, binId, parentElementIndex, sourceChildIndex, targetChildIndex) {
    return this.dragDropHandler.reorderChildElement(pageId, binId, parentElementIndex, sourceChildIndex, targetChildIndex);
  }
  nestElement(sourcePageId, sourceBinId, sourceElementIndex, targetPageId, targetBinId, targetElementIndex, isChild = false, parentElementIndex = null, childIndex = null, elementToNest = null) {
    return this.dragDropHandler.nestElement(sourcePageId, sourceBinId, sourceElementIndex, targetPageId, targetBinId, targetElementIndex, isChild, parentElementIndex, childIndex, elementToNest);
  }
  addElement(pageId, binId, elementType) {
    return this.elementManager.addElement(pageId, binId, elementType);
  }
  createElementTemplate(type) {
    return this.elementManager.createElementTemplate(type);
  }
  enableInlineEditing(textElement, pageId, binId, elementIndex, element) {
    return this.inlineEditor.enableInlineEditing(textElement, pageId, binId, elementIndex, element);
  }
  toggleElement(pageId, binId, elementIndex, subtaskIndex = null, itemIndex = null) {
    return this.elementManager.toggleElement(pageId, binId, elementIndex, subtaskIndex, itemIndex);
  }
  addMultiCheckboxItem(pageId, binId, elementIndex) {
    return this.elementManager.addMultiCheckboxItem(pageId, binId, elementIndex);
  }
  removeMultiCheckboxItem(pageId, binId, elementIndex, itemIndex) {
    return this.elementManager.removeMultiCheckboxItem(pageId, binId, elementIndex, itemIndex);
  }
  toggleAllSubtasks() {
    if (this.renderService && this.renderService.getRenderer) {
      this.renderService.getRenderer().toggleAllSubtasks();
    }
  }
  render() {
    if (this.renderService && this.renderService.getRenderer) {
      this.renderService.getRenderer().render();
    }
  }
  renderPageTabs() {
    if (this.renderService && this.renderService.getRenderer) {
      this.renderService.getRenderer().renderPageTabs();
    }
  }
  getCurrentPositions() {
    if (this.renderService && this.renderService.getRenderer) {
      return this.renderService.getRenderer().getCurrentPositions();
    }
    return { bins: {}, elements: {} };
  }
  _getDocument(pageId) {
    return this.appState.documents?.find((page) => page.id === pageId) || null;
  }
  _getGroup(pageId, binId) {
    const document2 = this._getDocument(pageId);
    const group = document2?.groups?.find((bin) => bin.id === binId) || null;
    if (!group) return null;
    const items = group.items || group.elements || [];
    group.items = items;
    group.elements = items;
    return group;
  }
  // Animation method moved to AnimationRenderer.js
  animateMovements(oldPositions) {
    if (this.renderService && this.renderService.getRenderer) {
      return this.renderService.getRenderer().animateMovements(oldPositions);
    }
  }
  renderBin(pageId, bin) {
    if (this.renderService && this.renderService.getRenderer) {
      return this.renderService.getRenderer().renderBin(pageId, bin);
    }
    console.error("RenderService not available");
    return document.createElement("div");
  }
  // renderBin implementation moved to BinRenderer.js
  // renderBin implementation moved to BinRenderer.js
  // renderChildren and renderElement implementations moved to ElementRenderer.js
  renderElement(pageId, binId, element, elementIndex, childIndex = null, depth = 0) {
    if (this.renderService && this.renderService.getRenderer) {
      return this.renderService.getRenderer().renderElement(pageId, binId, element, elementIndex, childIndex, depth);
    }
    return null;
  }
  renderChildren(pageId, binId, parentElement, parentElementIndex, depth = 0) {
    if (this.renderService && this.renderService.getRenderer) {
      return this.renderService.getRenderer().renderChildren(pageId, binId, parentElement, parentElementIndex, depth);
    }
    return null;
  }
  // Calendar rendering methods moved to CalendarRenderer.js
  renderCalendar(container, pageId, binId, element, elementIndex) {
    if (this.renderService && this.renderService.getRenderer) {
      return this.renderService.getRenderer().renderCalendar(container, pageId, binId, element, elementIndex);
    }
  }
  showAddElementModal(pageId, elementIndex = null) {
    return this.modalHandler.showAddElementModal(pageId, elementIndex);
  }
  // Utility methods moved to StringUtils
  escapeHtml(text) {
    return StringUtils.escapeHtml(text);
  }
  parseLinks(text, context = {}) {
    if (this.linkHandler) {
      return this.linkHandler.parseLinks(text, context);
    }
    return StringUtils.parseLinks(text);
  }
  showContextMenu(e, pageId, binId, elementIndex, subtaskIndex = null) {
    if (!binId) {
      binId = this.appState.activeGroupId;
      if (!binId) {
        const page = this._getDocument(pageId);
        const groups = page?.groups || page?.bins || [];
        if (groups.length > 0) {
          binId = groups[0].id;
        }
      }
    }
    return this.contextMenuHandler.showContextMenu(e, pageId, binId, elementIndex, subtaskIndex);
  }
  hideContextMenu() {
    return this.contextMenuHandler.hideContextMenu();
  }
  setupTouchGestures() {
    return this.touchGestureHandler.setupTouchGestures();
  }
  triggerContextMenuFromTouch(e, target) {
    return this.touchGestureHandler.triggerContextMenuFromTouch(e, target);
  }
  showPageContextMenu(e, pageId = null) {
    return this.contextMenuHandler.showPageContextMenu(e, pageId);
  }
  /**
   * Helper to validate elementIndex
   * @param {*} elementIndex - Element index to validate
   * @returns {boolean} True if elementIndex is a valid number
   */
  _isValidElementIndex(elementIndex) {
    return elementIndex !== null && elementIndex !== void 0 && !isNaN(elementIndex) && (typeof elementIndex === "number" || typeof elementIndex === "string" && !isNaN(parseInt(elementIndex, 10)));
  }
  handleContextEdit() {
    const { documentId: pageId, groupId: binId, elementIndex } = this.appState.contextMenuState;
    console.log("[handleContextEdit] Called with:", { pageId, binId, elementIndex, contextMenuState: this.appState.contextMenuState });
    if (pageId === null) {
      console.warn("[handleContextEdit] pageId is null");
      return;
    }
    const page = this._getDocument(pageId);
    if (!page) {
      console.warn("[handleContextEdit] Page not found:", pageId);
      return;
    }
    this.hideContextMenu();
    const isValidElementIndex = this._isValidElementIndex(elementIndex);
    console.log("[handleContextEdit] isValidElementIndex:", isValidElementIndex);
    if (isValidElementIndex) {
      let targetBinId = binId || this.appState.activeGroupId;
      if (!targetBinId) {
        const groups = page.groups || page.bins || [];
        for (const bin2 of groups) {
          const items = bin2.items || bin2.elements || [];
          bin2.items = items;
          bin2.elements = items;
          if (items[elementIndex]) {
            targetBinId = bin2.id;
            break;
          }
        }
        if (!targetBinId && groups.length > 0) {
          targetBinId = groups[0].id;
        }
      }
      const bin = this._getGroup(pageId, targetBinId);
      if (!bin) {
        console.warn("[handleContextEdit] Bin not found:", { pageId, targetBinId, elementIndex });
        return;
      }
      const element = bin.items[elementIndex];
      if (!element) {
        console.warn("[handleContextEdit] Element not found:", { pageId, targetBinId, elementIndex, elementsLength: bin.items?.length });
        return;
      }
      this.showEditModal(pageId, targetBinId, elementIndex, element);
    } else if (binId !== null && binId !== void 0) {
      this.modalHandler.showEditBinModal(pageId, binId);
    } else {
      this.modalHandler.showEditPageModal(pageId);
    }
  }
  handleContextCustomizeVisuals() {
    const { documentId: pageId, groupId: binId, elementIndex } = this.appState.contextMenuState;
    this.hideContextMenu();
    if (this._isValidElementIndex(elementIndex) && pageId) {
      const page = this._getDocument(pageId);
      if (!page) return;
      let targetBinId = binId || this.appState.activeGroupId;
      if (!targetBinId) {
        const groups = page.groups || page.bins || [];
        for (const bin of groups) {
          const items = bin.items || bin.elements || [];
          bin.items = items;
          bin.elements = items;
          if (items[elementIndex]) {
            targetBinId = bin.id;
            break;
          }
        }
      }
      if (targetBinId) {
        const elementId = `${pageId}-${targetBinId}-${elementIndex}`;
        const pageFormat = page.format || "default";
        this.modalHandler.showVisualCustomizationModal("element", elementId, {
          pageId,
          viewFormat: pageFormat
        });
      }
    } else if (binId !== null && binId !== void 0 && pageId) {
      const pageFormat = this._getDocument(pageId)?.format || "default";
      this.modalHandler.showVisualCustomizationModal("bin", binId, {
        pageId,
        viewFormat: pageFormat
      });
    } else if (pageId) {
      const page = this._getDocument(pageId);
      const pageFormat = page?.format || "default";
      this.modalHandler.showVisualCustomizationModal("page", pageId, {
        viewFormat: pageFormat
      });
    } else {
      console.warn("Cannot customize visuals: no pageId provided");
    }
  }
  async saveBinEdit(pageId, binId) {
    const page = this._getDocument(pageId);
    if (!page) return;
    const bin = this._getGroup(pageId, binId);
    if (!bin) return;
    const titleInput = document.getElementById("edit-bin-title");
    if (titleInput) {
      bin.title = titleInput.value.trim() || bin.id;
    }
    const maxHeightInput = document.getElementById("edit-bin-max-height");
    if (maxHeightInput) {
      const maxHeightValue = maxHeightInput.value.trim();
      if (maxHeightValue === "") {
        delete bin.maxHeight;
      } else {
        const height = parseInt(maxHeightValue, 10);
        if (!isNaN(height) && height > 0) {
          bin.maxHeight = height;
        } else {
          delete bin.maxHeight;
        }
      }
    }
    this.dataManager.saveData();
    this.render();
    this.closeModal();
  }
  async savePageEdit(pageId) {
    const page = this._getDocument(pageId);
    if (!page) return;
    const titleInput = document.getElementById("edit-page-title");
    const formatSelect = document.getElementById("page-format-select");
    const selectedFormat = formatSelect ? formatSelect.value : this.formatRendererManager?.getPageFormat(pageId);
    if (selectedFormat === "grid-layout-format") {
      const minColumnWidthInput = document.getElementById("grid-min-column-width");
      const gapInput = document.getElementById("grid-gap");
      const paddingInput = document.getElementById("grid-padding");
      const maxHeightInput = document.getElementById("grid-max-height");
      if (!page.formatConfig) {
        page.formatConfig = {};
      }
      page.formatConfig.grid = {
        minColumnWidth: minColumnWidthInput ? parseInt(minColumnWidthInput.value, 10) || 350 : 350,
        gap: gapInput ? parseInt(gapInput.value, 10) || 20 : 20,
        padding: paddingInput ? parseInt(paddingInput.value, 10) || 20 : 20,
        maxHeight: maxHeightInput && maxHeightInput.value.trim() ? parseInt(maxHeightInput.value, 10) : null
      };
    } else if (page.formatConfig?.grid) {
      delete page.formatConfig.grid;
      if (Object.keys(page.formatConfig).length === 0) {
        delete page.formatConfig;
      }
    }
    if (titleInput) {
      page.title = titleInput.value.trim() || page.id;
      this.dataManager.saveData();
      this.render();
    }
    this.closeModal();
  }
  handleContextAddBin() {
    const { documentId: pageId, groupId: binId } = this.appState.contextMenuState;
    if (pageId === null) return;
    this.hideContextMenu();
    this.binManager.addBin(pageId, binId || null);
  }
  handleContextDeleteBin() {
    const { documentId: pageId, groupId: binId } = this.appState.contextMenuState;
    if (pageId === null || binId === null) return;
    const page = this._getDocument(pageId);
    if (!page) return;
    const bin = this._getGroup(pageId, binId);
    if (!bin) return;
    if (!confirm(`Delete bin "${bin.title || binId}"?`)) return;
    this.hideContextMenu();
    this.deleteBin(pageId, binId);
    this.render();
  }
  handleContextAddSubtasks() {
    const { documentId: pageId, groupId: binId, elementIndex } = this.appState.contextMenuState;
    if (pageId === null || !this._isValidElementIndex(elementIndex)) return;
    const page = this._getDocument(pageId);
    if (!page) return;
    const groups = page.groups || page.bins || [];
    const targetBinId = binId || this.appState.activeGroupId || groups[0]?.id;
    const bin = this._getGroup(pageId, targetBinId);
    if (!bin) return;
    const items = bin.items || bin.elements || [];
    bin.items = items;
    bin.elements = items;
    const element = items[elementIndex];
    if (!element) return;
    if (element.type !== "task" && element.type !== "header-checkbox") {
      alert("This element type cannot have subtasks");
      this.hideContextMenu();
      return;
    }
    this.hideContextMenu();
    this.showAddSubtasksModal(pageId, elementIndex, element);
  }
  handleContextViewData() {
    const { documentId: pageId, groupId: binId, elementIndex, subtaskIndex } = this.appState.contextMenuState;
    if (pageId === null || !this._isValidElementIndex(elementIndex)) return;
    const page = this._getDocument(pageId);
    if (!page) return;
    const targetBinId = binId || this.appState.activeGroupId;
    const bin = this._getGroup(pageId, targetBinId);
    if (!bin) return;
    const items = bin.items || bin.elements || [];
    bin.items = items;
    bin.elements = items;
    const element = items[elementIndex];
    if (!element) return;
    if (subtaskIndex !== null && element.subtasks && element.subtasks[subtaskIndex]) {
      const subtask = element.subtasks[subtaskIndex];
      this.hideContextMenu();
      this.showViewDataModal(subtask, true);
      return;
    }
    this.hideContextMenu();
    this.showViewDataModal(element);
  }
  handleContextDeleteElement() {
    const { documentId: pageId, groupId: binId, elementIndex, subtaskIndex } = this.appState.contextMenuState;
    if (pageId === null || !this._isValidElementIndex(elementIndex)) return;
    const page = this._getDocument(pageId);
    if (!page) return;
    const targetBinId = binId || this.appState.activeGroupId;
    if (!targetBinId) return;
    const bin = this._getGroup(pageId, targetBinId);
    if (!bin) return;
    const items = bin.items || bin.elements || [];
    bin.items = items;
    bin.elements = items;
    this.hideContextMenu();
    let actualElementIndex = elementIndex;
    let childIndex = null;
    let isChild = false;
    if (typeof elementIndex === "string" && elementIndex.includes("-")) {
      const parts = elementIndex.split("-");
      actualElementIndex = parseInt(parts[0]);
      childIndex = parseInt(parts[1]);
      isChild = true;
    } else {
      actualElementIndex = parseInt(elementIndex);
    }
    if (isChild && childIndex !== null) {
      const parentElement = items[actualElementIndex];
      if (parentElement && parentElement.children && parentElement.children[childIndex]) {
        parentElement.children.splice(childIndex, 1);
        if (parentElement.children.length === 0) {
          parentElement.children = [];
        }
        parentElement.completed = parentElement.children.length > 0 && parentElement.children.every((ch) => ch.completed);
        this.dataManager.saveData();
        this.render();
      }
    } else if (subtaskIndex !== null) {
      const element = items[actualElementIndex];
      if (element && element.subtasks && element.subtasks[subtaskIndex]) {
        element.subtasks.splice(subtaskIndex, 1);
        if (element.subtasks.length === 0) {
          element.subtasks = [];
        }
        element.completed = element.subtasks.length > 0 && element.subtasks.every((st) => st.completed);
        this.dataManager.saveData();
        this.render();
      } else if (element && element.children && element.children[subtaskIndex]) {
        element.children.splice(subtaskIndex, 1);
        if (element.children.length === 0) {
          element.children = [];
        }
        element.completed = element.children.length > 0 && element.children.every((ch) => ch.completed);
        this.dataManager.saveData();
        this.render();
      }
    } else {
      if (items[actualElementIndex]) {
        items.splice(actualElementIndex, 1);
        this.dataManager.saveData();
        this.render();
      }
    }
  }
  handleContextAddElement() {
    const { documentId: pageId, groupId: binId, elementIndex } = this.appState.contextMenuState;
    if (pageId === null || !this._isValidElementIndex(elementIndex)) return;
    const page = this._getDocument(pageId);
    if (!page) return;
    const groups = page.groups || page.bins || [];
    const targetBinId = binId || this.appState.activeGroupId || groups[0]?.id;
    if (!targetBinId) return;
    this.hideContextMenu();
    this.modalHandler.showAddElementModal(pageId, targetBinId, elementIndex);
  }
  handleContextAddChildElement() {
    const { documentId: pageId, groupId: binId, elementIndex } = this.appState.contextMenuState;
    if (pageId === null || !this._isValidElementIndex(elementIndex)) return;
    const page = this._getDocument(pageId);
    if (!page) return;
    const targetBinId = binId || this.appState.activeGroupId;
    const bin = this._getGroup(pageId, targetBinId);
    if (!bin) return;
    const items = bin.items || bin.elements || [];
    bin.items = items;
    bin.elements = items;
    const element = items[elementIndex];
    if (!element) return;
    const hasNestedChildren = element.children && element.children.some(
      (child) => child.children && child.children.length > 0
    );
    if (hasNestedChildren) {
      alert("This element has children with their own children. One-level nesting limit enforced.");
      this.hideContextMenu();
      return;
    }
    this.hideContextMenu();
    if (targetBinId) {
      this.showAddChildElementModal(pageId, targetBinId, elementIndex);
    }
  }
  showAddChildElementModal(pageId, binId, elementIndex) {
    return this.modalHandler.showAddChildElementModal(pageId, binId, elementIndex);
  }
  addElementAfter(pageId, binId, elementIndex, elementType) {
    const page = this._getDocument(pageId);
    if (!page) return;
    const targetBinId = binId || this.appState.activeGroupId;
    const bin = this._getGroup(pageId, targetBinId);
    if (!bin) return;
    const items = bin.items || bin.elements || [];
    bin.items = items;
    bin.elements = items;
    const newElement = this.elementManager.createElementTemplate(elementType);
    const insertIndex = elementIndex + 1;
    items.splice(insertIndex, 0, newElement);
    this.dataManager.saveData();
    this.render();
  }
  handleContextAddPage() {
    this.hideContextMenu();
    this.addPage();
  }
  handleContextAddElementPage() {
    const { documentId: pageId, groupId: binId } = this.appState.contextMenuState;
    const targetPageId = pageId || this.appState.currentDocumentId;
    const targetBinId = binId || this.appState.activeGroupId;
    if (!targetPageId || !targetBinId) {
      this.hideContextMenu();
      return;
    }
    this.hideContextMenu();
    this.modalHandler.showAddElementModal(targetPageId, targetBinId);
  }
  handleContextDeletePage() {
    const { documentId: pageId } = this.appState.contextMenuState;
    const targetPageId = pageId || this.appState.currentDocumentId;
    if (!targetPageId) {
      this.hideContextMenu();
      return;
    }
    const page = this._getDocument(targetPageId);
    if (!page) {
      this.hideContextMenu();
      return;
    }
    this.hideContextMenu();
    this.deletePage(targetPageId);
  }
  handleContextToggleSubtasks() {
    this.hideContextMenu();
    this.toggleAllSubtasks();
  }
  handleContextResetDay() {
    this.hideContextMenu();
    this.resetToday();
  }
  handleContextCollapseAllPages() {
    this.hideContextMenu();
    this.appState.documents.forEach((page) => {
      this.appState.documentStates[page.id] = false;
    });
    const allPageArrows = document.querySelectorAll('[id^="page-toggle-"]');
    const allPageContents = document.querySelectorAll('[id^="page-content-"]');
    allPageArrows.forEach((arrow) => {
      arrow.textContent = "▶";
    });
    allPageContents.forEach((content) => {
      content.style.display = "none";
    });
  }
  handleContextCollapsePage() {
    const { documentId: pageId } = this.appState.contextMenuState;
    if (pageId === null) return;
    const page = this._getDocument(pageId);
    if (!page) return;
    const pageStates = this.appState.documentStates || {};
    if (!(pageId in pageStates)) {
      this.appState.setDocumentState(pageId, true);
    } else {
      const currentState = this.appState.getDocumentState(pageId);
      this.appState.setDocumentState(pageId, !currentState);
    }
    this.hideContextMenu();
    const pageToggleId = `page-toggle-${pageId}`;
    const pageContentId = `page-content-${pageId}`;
    const arrow = document.getElementById(pageToggleId);
    const content = document.getElementById(pageContentId);
    if (arrow && content) {
      const isExpanded = this.appState.documentStates?.[pageId];
      arrow.textContent = isExpanded ? "▼" : "▶";
      content.style.display = isExpanded ? "block" : "none";
    }
  }
  showEditModal(pageId, binId, elementIndex, element) {
    if (!binId) {
      binId = this.appState.activeGroupId;
      if (!binId) {
        const page = this._getDocument(pageId);
        const groups = page?.groups || page?.bins || [];
        if (groups.length > 0) {
          binId = groups[0].id;
        }
      }
    }
    return this.modalHandler.showEditModal(pageId, binId, elementIndex, element);
  }
  addEditItem() {
    return this.modalHandler.addEditItem();
  }
  removeEditItem(idx) {
    return this.modalHandler.removeEditItem(idx);
  }
  saveEdit(pageId, elementIndex, skipClose = false) {
    return this.modalHandler.saveEdit(pageId, elementIndex, skipClose);
  }
  addEditSubtaskModal() {
    const container = document.getElementById("edit-subtasks-in-modal");
    if (!container) return;
    const idx = container.children.length;
    const newSubtask = document.createElement("div");
    newSubtask.className = "subtask-item";
    newSubtask.innerHTML = `
            <input type="text" class="edit-subtask-text-modal" data-index="${idx}" value="New subtask" placeholder="Subtask text" />
            <input type="text" class="edit-subtask-time-modal" data-index="${idx}" value="" placeholder="Time" />
            <label class="edit-subtask-repeat-label">
                <input type="checkbox" class="edit-subtask-repeats-modal" data-index="${idx}" checked />
                Repeats
            </label>
            <button onclick="app.removeEditSubtaskModal(${idx})" class="remove-subtask-btn">×</button>
        `;
    container.appendChild(newSubtask);
    container.scrollTop = container.scrollHeight;
  }
  removeEditSubtaskModal(idx) {
    return this.modalHandler.removeEditSubtaskModal(idx);
  }
  removeAllSubtasksModal() {
    return this.modalHandler.removeAllSubtasksModal();
  }
  addEditChildModal() {
    return this.modalHandler.addEditChildModal();
  }
  removeEditChildModal(idx) {
    return this.modalHandler.removeEditChildModal(idx);
  }
  removeAllChildrenModal() {
    return this.modalHandler.removeAllChildrenModal();
  }
  toggleArchiveViewInEdit(pageId, elementIndex) {
    return this.modalHandler.toggleArchiveViewInEdit(pageId, elementIndex);
  }
  showAddSubtasksModal(pageId, elementIndex, element) {
    return this.modalHandler.showAddSubtasksModal(pageId, elementIndex, element);
  }
  addEditSubtask() {
    const container = document.getElementById("edit-subtasks");
    const idx = container.children.length;
    const newSubtask = document.createElement("div");
    newSubtask.className = "subtask-item";
    newSubtask.innerHTML = `
            <input type="text" class="edit-subtask-text" data-index="${idx}" value="New subtask" />
            <input type="text" class="edit-subtask-time" data-index="${idx}" value="" placeholder="Time" />
            <label>
                <input type="checkbox" class="edit-subtask-repeats" data-index="${idx}" checked />
                Repeats
            </label>
            <button onclick="app.removeEditSubtask(${idx})">×</button>
        `;
    container.appendChild(newSubtask);
  }
  removeEditSubtask(idx) {
    const container = document.getElementById("edit-subtasks");
    const item = container.querySelector(`.edit-subtask-text[data-index="${idx}"]`)?.closest(".subtask-item");
    if (item) {
      item.remove();
    }
  }
  saveChildren(pageId, elementIndex) {
    return this.modalHandler.saveChildren(pageId, elementIndex);
  }
  // Legacy method name for backward compatibility
  saveSubtasks(pageId, elementIndex) {
    return this.modalHandler.saveSubtasks(pageId, elementIndex);
  }
  showViewDataModal(element, isSubtask = false) {
    return this.modalHandler.showViewDataModal(element, isSubtask);
  }
  closeModal() {
    return this.modalHandler.closeModal();
  }
  showTooltip(text) {
    const tooltip = document.getElementById("global-tooltip");
    if (tooltip) {
      tooltip.textContent = text;
      tooltip.classList.add("visible");
    }
  }
  hideTooltip() {
    const tooltip = document.getElementById("global-tooltip");
    if (tooltip) {
      tooltip.classList.remove("visible");
    }
  }
  showAudioRecordingModal() {
    return this.audioHandler.showAudioRecordingModal();
  }
  async startAudioRecording() {
    return this.audioHandler.startAudioRecording();
  }
  stopAudioRecording() {
    return this.audioHandler.stopAudioRecording();
  }
  async saveAudioRecording() {
    return this.audioHandler.saveAudioRecording();
  }
  closeAudioRecordingModal() {
    return this.audioHandler.closeAudioRecordingModal();
  }
  // Inline audio recording methods - delegate to AudioHandler
  async startInlineRecording(pageId, binId, elementIndex, originalElementIndex = null, shouldOverwrite = false) {
    return this.audioHandler.startInlineRecording(pageId, binId, elementIndex, originalElementIndex, shouldOverwrite);
  }
  async stopInlineRecording(pageId, binId, elementIndex, originalElementIndex = null) {
    return this.audioHandler.stopInlineRecording(pageId, binId, elementIndex, originalElementIndex);
  }
  async saveInlineRecording(pageId, binId, elementIndex, chunks, domElementIndex = null) {
    return this.audioHandler.saveInlineRecording(pageId, binId, elementIndex, chunks, domElementIndex);
  }
  async appendInlineRecording(pageId, binId, elementIndex, originalElementIndex = null) {
    return this.audioHandler.appendInlineRecording(pageId, binId, elementIndex, originalElementIndex);
  }
  async playInlineAudio(pageId, binId, elementIndex) {
    return this.audioHandler.playInlineAudio(pageId, binId, elementIndex);
  }
  stopInlineAudio(pageId, binId, elementIndex) {
    return this.audioHandler.stopInlineAudio(pageId, binId, elementIndex);
  }
  showAudioProgressBar(pageId, binId, elementIndex) {
    return this.audioHandler.showAudioProgressBar(pageId, binId, elementIndex);
  }
  hideAudioProgressBar(pageId, binId, elementIndex) {
    return this.audioHandler.hideAudioProgressBar(pageId, binId, elementIndex);
  }
  updateAudioStatus(pageId, binId, elementIndex, text, color) {
    return this.audioHandler.updateAudioStatus(pageId, binId, elementIndex, text, color);
  }
  toggleArchiveView(pageId, binId, elementIndex) {
    return this.audioHandler.toggleArchiveView(pageId, binId, elementIndex);
  }
}
let app$1;
document.addEventListener("DOMContentLoaded", () => {
  app$1 = new TodoApp();
  window.app = app$1;
});
class BasePlugin {
  constructor(config = {}) {
    this.id = config.id || this.constructor.name.toLowerCase();
    this.name = config.name || this.id;
    this.type = config.type || "plugin";
    this.version = config.version || "1.0.0";
    this.description = config.description || "";
    this.dependencies = config.dependencies || [];
    this.config = DataUtils.deepMerge({}, config.defaultConfig || {});
    this.enabled = false;
    this.app = null;
  }
  /**
   * Initialize plugin
   * @param {Object} app - App instance
   * @returns {Promise<void>}
   */
  async init(app2) {
    this.app = app2;
    const savedConfig = StorageUtils.get(`plugin:${this.id}:config`, null);
    if (savedConfig) {
      this.config = DataUtils.deepMerge(this.config, savedConfig);
    }
    this.setupEventListeners();
    await this.onInit();
  }
  /**
   * Custom initialization hook (override in subclasses)
   * @returns {Promise<void>}
   */
  async onInit() {
  }
  /**
   * Enable plugin
   * @returns {Promise<void>}
   */
  async enable() {
    if (this.enabled) return;
    await this.onEnable();
    this.enabled = true;
    eventBus.emit("plugin:enabled", { pluginId: this.id });
  }
  /**
   * Custom enable hook (override in subclasses)
   * @returns {Promise<void>}
   */
  async onEnable() {
  }
  /**
   * Disable plugin
   * @returns {Promise<void>}
   */
  async disable() {
    if (!this.enabled) return;
    await this.onDisable();
    this.enabled = false;
    eventBus.emit("plugin:disabled", { pluginId: this.id });
  }
  /**
   * Custom disable hook (override in subclasses)
   * @returns {Promise<void>}
   */
  async onDisable() {
  }
  /**
   * Destroy plugin
   * @returns {Promise<void>}
   */
  async destroy() {
    await this.disable();
    this.removeEventListeners();
    await this.onDestroy();
    this.app = null;
  }
  /**
   * Custom destroy hook (override in subclasses)
   * @returns {Promise<void>}
   */
  async onDestroy() {
  }
  /**
   * Setup event listeners (override in subclasses)
   */
  setupEventListeners() {
  }
  /**
   * Remove event listeners (override in subclasses)
   */
  removeEventListeners() {
  }
  /**
   * Get plugin configuration
   * @returns {Object}
   */
  getConfig() {
    return DataUtils.deepClone(this.config);
  }
  /**
   * Update plugin configuration
   * @param {Object} newConfig - New configuration
   * @param {boolean} save - Save to storage
   */
  updateConfig(newConfig, save = true) {
    this.config = DataUtils.deepMerge(this.config, newConfig);
    if (save) {
      StorageUtils.set(`plugin:${this.id}:config`, this.config);
    }
    eventBus.emit("plugin:config:updated", {
      pluginId: this.id,
      config: this.config
    });
  }
  /**
   * Reset configuration to defaults
   */
  resetConfig() {
    this.config = {};
    StorageUtils.remove(`plugin:${this.id}:config`);
  }
  /**
   * Render plugin UI (override in subclasses)
   * @param {HTMLElement} container - Container element
   * @param {Object} context - Context data (page/bin)
   * @returns {HTMLElement}
   */
  render(container, context) {
    return container;
  }
  /**
   * Render plugin configuration UI (override in subclasses)
   * @param {HTMLElement} container - Container element
   * @returns {HTMLElement}
   */
  renderConfigUI(container) {
    return container;
  }
  /**
   * Get plugin metadata
   * @returns {Object}
   */
  getMetadata() {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      version: this.version,
      description: this.description,
      dependencies: this.dependencies,
      enabled: this.enabled
    };
  }
}
export {
  BasePlugin as B,
  DOMUtils as D,
  NavigationHelper$1 as N,
  StringUtils as S,
  __vitePreload as _,
  SERVICES as a,
  getService as g
};
//# sourceMappingURL=index-XsTijtuR.js.map

// ScriptSandbox - Sandboxed JavaScript execution for custom scripts
export class ScriptSandbox {
    constructor(app) {
        this.app = app;
        this.scripts = new Map(); // pageId -> script code
        this.executionContexts = new Map(); // pageId -> execution context
    }
    
    /**
     * Create execution context for a page
     * @param {string} pageId - Page ID
     * @returns {Object} - Execution context
     */
    createContext(pageId) {
        const getDocument = () => {
            const documents = this.app.appState?.documents || this.app.documents || [];
            return documents.find(p => p.id === pageId) || null;
        };
        const getGroup = (binId) => {
            const document = getDocument();
            const group = document?.groups?.find(b => b.id === binId) || null;
            if (!group) return null;
            const items = group.items || [];
            group.items = items;
            return group;
        };
        const context = {
            pageId,
            app: this.app,
            scriptSandbox: this,
            // Expose safe API
            api: {
                getDocument: () => getDocument(),
                getGroups: () => {
                    const page = getDocument();
                    return page?.groups || [];
                },
                getItems: (groupId) => {
                    const group = getGroup(groupId);
                    return group?.items || [];
                },
                createItem: (groupId, itemData) => {
                    const group = getGroup(groupId);
                    if (group) {
                        if (!group.items) group.items = [];
                        group.items.push(itemData);
                        this.app.dataManager.saveData();
                        this.app.render();
                    }
                },
                updateItem: (groupId, itemIndex, updates) => {
                    const group = getGroup(groupId);
                    if (group && group.items[itemIndex]) {
                        Object.assign(group.items[itemIndex], updates);
                        this.app.dataManager.saveData();
                        this.app.render();
                    }
                },
                deleteItem: (groupId, itemIndex) => {
                    const group = getGroup(groupId);
                    if (group && group.items[itemIndex]) {
                        group.items.splice(itemIndex, 1);
                        this.app.dataManager.saveData();
                        this.app.render();
                    }
                },
                emit: (event, data) => {
                    if (this.app.eventBus) {
                        this.app.eventBus.emit(event, data);
                    }
                },
                log: (...args) => {
                    console.log(`[Document ${pageId} Script]`, ...args);
                }
            }
        };
        
        this.executionContexts.set(pageId, context);
        return context;
    }
    
    /**
     * Load script for a page
     * @param {string} pageId - Page ID
     * @param {string} scriptCode - JavaScript code
     */
    loadScript(pageId, scriptCode) {
        this.scripts.set(pageId, scriptCode);
        
        // Create or get context
        let context = this.executionContexts.get(pageId);
        if (!context) {
            context = this.createContext(pageId);
        }
        
        // Wrap script in function to provide context and on() function
        const wrappedScript = `
            (function(context) {
                const { api, pageId, app, scriptSandbox } = context;
                const on = function(eventName, handler) {
                    scriptSandbox.registerEventHandler(pageId, eventName, handler);
                };
                ${scriptCode}
            })(context);
        `;
        
        try {
            // Execute script in context
            const func = new Function('context', wrappedScript);
            func(context);
        } catch (error) {
            console.error(`Error executing script for page ${pageId}:`, error);
        }
    }
    
    /**
     * Register event handler from script
     * @param {string} pageId - Page ID
     * @param {string} eventName - Event name
     * @param {Function} handler - Event handler function
     */
    registerEventHandler(pageId, eventName, handler) {
        if (!this.app.eventBus) return;
        
        const wrappedHandler = (data) => {
            try {
                handler(data);
            } catch (error) {
                console.error(`Error in script event handler for page ${pageId}:`, error);
            }
        };
        
        this.app.eventBus.on(eventName, wrappedHandler);
        
        // Store handler for cleanup
        if (!this._eventHandlers) this._eventHandlers = new Map();
        const key = `${pageId}:${eventName}`;
        if (!this._eventHandlers.has(key)) {
            this._eventHandlers.set(key, []);
        }
        this._eventHandlers.get(key).push({ handler: wrappedHandler, original: handler });
    }
    
    /**
     * Execute script function
     * @param {string} pageId - Page ID
     * @param {string} functionName - Function name to call
     * @param {...*} args - Arguments to pass
     * @returns {*} - Function return value
     */
    executeFunction(pageId, functionName, ...args) {
        const context = this.executionContexts.get(pageId);
        if (!context) return null;
        
        try {
            // Function should be available in context
            if (typeof context[functionName] === 'function') {
                return context[functionName](...args);
            }
        } catch (error) {
            console.error(`Error executing function ${functionName} for page ${pageId}:`, error);
        }
        
        return null;
    }
    
    /**
     * Clear script for a page
     * @param {string} pageId - Page ID
     */
    clearScript(pageId) {
        this.scripts.delete(pageId);
        
        // Cleanup event handlers
        if (this._eventHandlers) {
            const keysToRemove = [];
            for (const [key, handlers] of this._eventHandlers.entries()) {
                if (key.startsWith(`${pageId}:`)) {
                    handlers.forEach(({ handler }) => {
                        if (this.app.eventBus) {
                            const eventName = key.split(':')[1];
                            this.app.eventBus.off(eventName, handler);
                        }
                    });
                    keysToRemove.push(key);
                }
            }
            keysToRemove.forEach(key => this._eventHandlers.delete(key));
        }
        
        this.executionContexts.delete(pageId);
    }
    
    /**
     * Get script for a page
     * @param {string} pageId - Page ID
     * @returns {string|null} - Script code or null
     */
    getScript(pageId) {
        return this.scripts.get(pageId) || null;
    }
    
    /**
     * Validate script code
     * @param {string} scriptCode - JavaScript code
     * @returns {Object} - { valid: boolean, error: string|null }
     */
    validateScript(scriptCode) {
        try {
            // Try to parse the script
            new Function(scriptCode);
            return { valid: true, error: null };
        } catch (error) {
            return { valid: false, error: error.message };
        }
    }
}


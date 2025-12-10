// AutomationEngine - Core automation rule engine
import { eventBus } from './EventBus.js';

export class AutomationEngine {
    constructor(app) {
        this.app = app;
        this.rules = new Map(); // binId -> Array of rules
        this.logs = [];
        this.maxLogSize = 1000;
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
            name: rule.name || 'Unnamed Rule',
            enabled: rule.enabled !== false,
            trigger: rule.trigger || {}, // { type: 'elementCompleted', ... }
            conditions: rule.conditions || [], // Array of condition objects
            actions: rule.actions || [], // Array of action objects
            createdAt: Date.now()
        };
        
        const key = `${pageId}:${binId}`;
        if (!this.rules.has(key)) {
            this.rules.set(key, []);
        }
        
        this.rules.get(key).push(fullRule);
        
        // Subscribe to relevant events
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
        
        const index = rules.findIndex(r => r.id === ruleId);
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
        
        // Create event handler
        const handler = (data) => {
            this.handleTrigger(rule, data);
        };
        
        // Store handler on rule for cleanup
        rule._eventHandler = handler;
        
        // Subscribe based on trigger type
        switch (triggerType) {
            case 'elementCompleted':
                eventBus.on('element:completed', handler);
                break;
            case 'elementCreated':
                eventBus.on('element:created', handler);
                break;
            case 'elementUpdated':
                eventBus.on('element:updated', handler);
                break;
            case 'timeBased':
                // Time-based triggers need interval checking
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
            case 'elementCompleted':
                eventBus.off('element:completed', handler);
                break;
            case 'elementCreated':
                eventBus.off('element:created', handler);
                break;
            case 'elementUpdated':
                eventBus.off('element:updated', handler);
                break;
            case 'timeBased':
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
        
        // Check if trigger matches
        if (!this.matchesTrigger(rule.trigger, data)) {
            return;
        }
        
        // Check conditions
        if (!this.checkConditions(rule.conditions, data)) {
            return;
        }
        
        // Execute actions
        this.executeActions(rule.actions, data);
        
        // Log execution
        this.log({
            ruleId: rule.id,
            ruleName: rule.name,
            trigger: rule.trigger.type,
            timestamp: Date.now(),
            data: data
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
            case 'elementCompleted':
                return data.pageId === trigger.pageId && 
                       data.binId === trigger.binId &&
                       (trigger.elementIndex === undefined || data.elementIndex === trigger.elementIndex);
            case 'elementCreated':
                return data.pageId === trigger.pageId && 
                       data.binId === trigger.binId;
            case 'elementUpdated':
                return data.pageId === trigger.pageId && 
                       data.binId === trigger.binId;
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
        
        // Get element data if needed
        let element = null;
        if (data.elementIndex !== undefined) {
            const page = this.app.pages.find(p => p.id === data.pageId);
            const bin = page?.bins?.find(b => b.id === data.binId);
            element = bin?.elements?.[data.elementIndex];
        }
        
        // Check all conditions (AND logic)
        return conditions.every(condition => {
            switch (condition.type) {
                case 'hasTag':
                    return element && element.tags && element.tags.includes(condition.value);
                case 'hasProperty':
                    return element && element[condition.property] === condition.value;
                case 'isCompleted':
                    return element && element.completed === condition.value;
                case 'timeOfDay':
                    const now = new Date();
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
        
        actions.forEach(action => {
            switch (action.type) {
                case 'moveElement':
                    this.moveElement(data.pageId, data.binId, data.elementIndex, action.targetPageId, action.targetBinId);
                    break;
                case 'setProperty':
                    this.setElementProperty(data.pageId, data.binId, data.elementIndex, action.property, action.value);
                    break;
                case 'addTag':
                    this.addElementTag(data.pageId, data.binId, data.elementIndex, action.tag);
                    break;
                case 'removeTag':
                    this.removeElementTag(data.pageId, data.binId, data.elementIndex, action.tag);
                    break;
                case 'createElement':
                    this.createElement(action.targetPageId, action.targetBinId, action.elementData);
                    break;
                case 'deleteElement':
                    this.deleteElement(data.pageId, data.binId, data.elementIndex);
                    break;
            }
        });
    }
    
    /**
     * Move element to different bin
     */
    moveElement(pageId, binId, elementIndex, targetPageId, targetBinId) {
        const page = this.app.pages.find(p => p.id === pageId);
        const bin = page?.bins?.find(b => b.id === binId);
        if (!bin || !bin.elements) return;
        
        const element = bin.elements[elementIndex];
        if (!element) return;
        
        // Remove from source
        bin.elements.splice(elementIndex, 1);
        
        // Add to target
        const targetPage = this.app.pages.find(p => p.id === targetPageId);
        const targetBin = targetPage?.bins?.find(b => b.id === targetBinId);
        if (targetBin) {
            if (!targetBin.elements) targetBin.elements = [];
            targetBin.elements.push(element);
        }
        
        this.app.dataManager.saveData();
        this.app.render();
    }
    
    /**
     * Set element property
     */
    setElementProperty(pageId, binId, elementIndex, property, value) {
        const page = this.app.pages.find(p => p.id === pageId);
        const bin = page?.bins?.find(b => b.id === binId);
        if (!bin || !bin.elements) return;
        
        const element = bin.elements[elementIndex];
        if (!element) return;
        
        element[property] = value;
        this.app.dataManager.saveData();
        this.app.render();
    }
    
    /**
     * Add tag to element
     */
    addElementTag(pageId, binId, elementIndex, tag) {
        const page = this.app.pages.find(p => p.id === pageId);
        const bin = page?.bins?.find(b => b.id === binId);
        if (!bin || !bin.elements) return;
        
        const element = bin.elements[elementIndex];
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
        const page = this.app.pages.find(p => p.id === pageId);
        const bin = page?.bins?.find(b => b.id === binId);
        if (!bin || !bin.elements) return;
        
        const element = bin.elements[elementIndex];
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
        const page = this.app.pages.find(p => p.id === pageId);
        const bin = page?.bins?.find(b => b.id === binId);
        if (!bin) return;
        
        if (!bin.elements) bin.elements = [];
        bin.elements.push(elementData);
        
        this.app.dataManager.saveData();
        this.app.render();
    }
    
    /**
     * Delete element
     */
    deleteElement(pageId, binId, elementIndex) {
        const page = this.app.pages.find(p => p.id === pageId);
        const bin = page?.bins?.find(b => b.id === binId);
        if (!bin || !bin.elements) return;
        
        const deletedElement = bin.elements[elementIndex];
        if (!deletedElement) return;
        
        // Record undo/redo change
        if (this.app.undoRedoManager) {
            this.app.undoRedoManager.recordElementDelete(pageId, binId, elementIndex, deletedElement);
        }
        
        bin.elements.splice(elementIndex, 1);
        this.app.dataManager.saveData();
        this.app.render();
    }
    
    /**
     * Setup time-based trigger
     * @param {Object} rule - Rule object
     */
    setupTimeBasedTrigger(rule) {
        const schedule = rule.trigger.schedule; // e.g., { hour: 9, minute: 0, days: [1,2,3,4,5] }
        if (!schedule) return;
        
        const checkTime = () => {
            const now = new Date();
            const day = now.getDay(); // 0 = Sunday, 6 = Saturday
            const hour = now.getHours();
            const minute = now.getMinutes();
            
            // Check if current day matches
            if (schedule.days && !schedule.days.includes(day)) {
                return;
            }
            
            // Check if current time matches (within 1 minute window)
            if (hour === schedule.hour && minute === schedule.minute) {
                this.handleTrigger(rule, {
                    pageId: rule.pageId,
                    binId: rule.binId,
                    type: 'timeBased',
                    timestamp: Date.now()
                });
            }
        };
        
        // Check every minute
        rule._intervalId = setInterval(checkTime, 60000);
        checkTime(); // Check immediately
    }
    
    /**
     * Log automation execution
     * @param {Object} logEntry - Log entry object
     */
    log(logEntry) {
        this.logs.push(logEntry);
        
        // Limit log size
        if (this.logs.length > this.maxLogSize) {
            this.logs.shift();
        }
        
        // Emit log event
        eventBus.emit('automation:executed', logEntry);
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
            logs = logs.filter(log => log.ruleId === ruleId);
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
        
        rules.forEach(rule => {
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
        return rules.map(rule => {
            const { _eventHandler, _intervalId, ...ruleData } = rule;
            return ruleData;
        });
    }
}


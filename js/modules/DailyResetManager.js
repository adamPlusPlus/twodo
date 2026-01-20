// DailyResetManager.js - Handles daily task reset logic
import { eventBus } from '../core/EventBus.js';
import { EVENTS } from '../core/AppEvents.js';
import { getService, SERVICES, hasService } from '../core/AppServices.js';

export class DailyResetManager {
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
        const today = new Date();
        const todayDateString = today.toDateString();
        
        const appState = this._getAppState();
        if (!appState || !appState.documents) return;
        appState.documents.forEach(page => {
            page.groups?.forEach(bin => {
                const items = bin.items || [];
                bin.items = items;
                // Filter out completed one-time tasks first (but not persistent elements)
                bin.items = bin.items.filter(element => {
                // Skip persistent elements entirely
                if (element.persistent || element.type === 'image' || element.type === 'calendar') {
                    return true;
                }
                // Delete one-time tasks that are completed
                if (element.repeats === false && element.completed) {
                    return false;
                }
                return true;
                });
                
                // Reset repeating tasks
                bin.items.forEach(element => {
                // Skip persistent elements - they never reset
                if (element.persistent || element.type === 'image' || element.type === 'calendar') {
                    return;
                }
                
                // Handle recurring schedules (non-daily)
                if (element.recurringSchedule && element.recurringSchedule !== 'daily') {
                    // Check if it's time to reset based on schedule
                    const lastReset = element.lastResetDate ? new Date(element.lastResetDate) : null;
                    let shouldReset = false;
                    
                    if (!lastReset) {
                        // Never reset before - reset now
                        shouldReset = true;
                    } else {
                        const daysSinceReset = Math.floor((today - lastReset) / (1000 * 60 * 60 * 24));
                        
                        switch (element.recurringSchedule) {
                            case 'weekly':
                                shouldReset = daysSinceReset >= 7;
                                break;
                            case 'monthly':
                                shouldReset = daysSinceReset >= 30;
                                break;
                            case 'custom':
                                // For custom patterns, we'd need to parse the pattern
                                // For now, treat as weekly
                                shouldReset = daysSinceReset >= 7;
                                break;
                            default:
                                shouldReset = false;
                        }
                    }
                    
                    if (shouldReset) {
                        element.completed = false;
                        element.lastResetDate = todayDateString;
                        // Reset subtasks and items
                        if (element.subtasks) {
                            element.subtasks.forEach(st => {
                                if (st.repeats !== false && !st.persistent) {
                                    st.completed = false;
                                }
                            });
                        }
                        if (element.items) {
                            element.items.forEach(item => {
                                if (item.repeats !== false && !item.persistent) {
                                    item.completed = false;
                                }
                            });
                        }
                    }
                } else if (element.repeats !== false) {
                    // Daily repeating tasks - always reset
                    element.completed = false;
                    if (element.subtasks) {
                        element.subtasks.forEach(st => {
                            if (st.repeats !== false && !st.persistent) {
                                st.completed = false;
                            }
                        });
                    }
                    if (element.items) {
                        element.items.forEach(item => {
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


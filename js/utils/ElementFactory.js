// ElementFactory.js - Factory for creating element templates
// Extracted from ElementManager.js for reusability and maintainability

/**
 * ElementFactory - Creates element templates and initializes elements
 */
export class ElementFactory {
    /**
     * Generate a unique element ID
     * @returns {string} Unique element ID
     */
    static generateElementId() {
        return `element-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    
    /**
     * Initialize element with default properties
     * @param {Object} element - Element object
     * @returns {Object} Initialized element
     */
    static initializeElement(element) {
        element.parentId = element.parentId || null;
        element.childIds = Array.isArray(element.childIds) ? element.childIds : [];
        if (!element.id) {
            element.id = ElementFactory.generateElementId();
        }
        return element;
    }
    
    /**
     * Create element template by type
     * @param {string} type - Element type
     * @param {Object} elementTypeManager - Optional ElementTypeManager instance
     * @returns {Object} Element template
     */
    static createTemplate(type, elementTypeManager = null) {
        // Try to use ElementTypeManager if available
        if (elementTypeManager) {
            const template = elementTypeManager.createTemplate(type);
            if (template) {
                return template;
            }
        }
        
        // Fallback to default templates
        const templates = {
            'task': {
                type: 'task',
                text: 'New task',
                completed: false,
                repeats: true,
                timeAllocated: '',
                funModifier: '',
                parentId: null,
                childIds: []
            },
            'header-checkbox': {
                type: 'header-checkbox',
                text: 'New Header',
                completed: false,
                repeats: true,
                timeAllocated: '',
                funModifier: '',
                parentId: null,
                childIds: []
            },
            'multi-checkbox': {
                type: 'multi-checkbox',
                items: [
                    { text: 'Item 1', completed: false, funModifier: '' },
                    { text: 'Item 2', completed: false, funModifier: '' }
                ],
                completed: false,
                repeats: true,
                timeAllocated: '',
                funModifier: '',
                parentId: null,
                childIds: []
            },
            'one-time': {
                type: 'task',
                text: 'One-time task',
                completed: false,
                repeats: false,
                timeAllocated: '',
                funModifier: '',
                parentId: null,
                childIds: []
            },
            'audio': {
                type: 'audio',
                text: 'Audio Recording',
                audioFile: null,
                date: null,
                completed: false,
                repeats: true,
                parentId: null,
                childIds: []
            },
            'timer': {
                type: 'timer',
                text: 'Timer',
                duration: 3600, // Total duration in seconds (default 1 hour)
                elapsed: 0, // Elapsed time in seconds
                running: false, // Whether timer is currently running
                alarmSound: '/sounds/alarm.mp3', // Default alarm sound file path
                startTime: null, // Timestamp when timer was started
                pausedAt: 0, // Elapsed time when paused
                completed: false,
                alarmPlaying: false, // Whether alarm is currently playing
                alarmAudio: null, // Reference to alarm audio element
                repeats: true,
                parentId: null,
                childIds: []
            },
            'counter': {
                type: 'counter',
                text: 'Counter',
                value: 0,
                increment1: 1,
                increment5: 5,
                customIncrement: 10,
                completed: false,
                repeats: true,
                parentId: null,
                childIds: []
            },
            'tracker': {
                type: 'tracker',
                text: 'Tracker',
                mode: 'daily', // 'daily' or 'page'
                dailyCompletions: {}, // { date: count } for daily mode
                pageCompletions: {}, // { elementId: count } for page mode
                completed: false,
                repeats: true,
                parentId: null,
                childIds: []
            },
            'rating': {
                type: 'rating',
                text: 'Rating',
                rating: 0, // 0-5 stars
                review: '',
                completed: false,
                repeats: true,
                parentId: null,
                childIds: []
            },
            'image': {
                type: 'image',
                text: 'Image',
                imageUrl: null,
                imageAlignment: 'left',
                imageWidth: 300,
                completed: false,
                repeats: true,
                parentId: null,
                childIds: []
            },
            'time-log': {
                type: 'time-log',
                text: 'Time Log',
                totalTime: 0, // Total time in seconds
                isRunning: false,
                startTime: null,
                sessions: [], // Array of { start, end, duration }
                completed: false,
                repeats: true,
                parentId: null,
                childIds: []
            },
            'calendar': {
                type: 'calendar',
                text: 'Calendar',
                displayMode: 'current-date', // 'current-date', 'one-day', 'week', 'month'
                currentDate: new Date().toISOString().split('T')[0], // For one-day scrollable mode
                targetingMode: 'default', // 'default', 'specific', 'tags'
                targetPages: [], // Array of page IDs for specific mode
                targetBins: [], // Array of {pageId, binId} for specific mode
                targetElements: [], // Array of {pageId, binId, elementIndex} for specific mode
                targetTags: [], // Array of tag strings for tags mode
                completed: false,
                persistent: true, // Calendars are persistent
                parentId: null,
                childIds: []
            },
            'note': {
                type: 'note',
                text: 'New Note',
                content: '',
                format: 'markdown',
                completed: false,
                persistent: true,
                parentId: null,
                childIds: []
            },
            'text': {
                type: 'text',
                text: 'New Text',
                completed: false,
                repeats: true,
                parentId: null,
                childIds: []
            }
        };
        
        return templates[type] || templates['task'];
    }
}

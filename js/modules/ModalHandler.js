// ModalHandler - Handles all modal dialogs
import { StringUtils } from '../utils/string.js';
import { DOMUtils } from '../utils/dom.js';

export class ModalHandler {
    constructor(app) {
        this.app = app;
    }
    
    escapeHtml(text) {
        return StringUtils.escapeHtml(text);
    }
    
    showAddElementModal(pageId, binId, elementIndex = null) {
        // Show modal with keyboard listener for immediate selection
        // Base types (always available)
        const baseTypes = {
            '1': 'task',
            '2': 'header',
            '3': 'header-checkbox',
            '4': 'multi-checkbox',
            '5': 'audio',
            '6': 'one-time',
            '7': 'timer',
            '8': 'counter',
            '9': 'tracker',
            '0': 'rating',
            'q': 'time-log',
            'i': 'image',
            'c': 'calendar'
        };
        
        // Get all registered element types from ElementTypeManager
        // Convert baseTypes object to Map entries
        const allElementTypes = new Map(Object.entries(baseTypes));
        if (this.app.elementTypeManager) {
            const registeredTypes = this.app.elementTypeManager.getAllElementTypes();
            registeredTypes.forEach(plugin => {
                if (plugin.keyboardShortcut && plugin.elementType) {
                    allElementTypes.set(plugin.keyboardShortcut.toLowerCase(), plugin.elementType);
                }
            });
        }
        
        // Build element type options HTML
        const baseOptions = [
            { key: '1', type: 'task', label: 'Task' },
            { key: '2', type: 'header-checkbox', label: 'Header' },
            { key: '3', type: 'header-checkbox', label: 'Header with Checkbox' },
            { key: '4', type: 'multi-checkbox', label: 'Multi-checkbox' },
            { key: '5', type: 'audio', label: 'Audio' },
            { key: '6', type: 'one-time', label: 'One-time Task' },
            { key: '7', type: 'timer', label: 'Timer' },
            { key: '8', type: 'counter', label: 'Counter' },
            { key: '9', type: 'tracker', label: 'Tracker' },
            { key: '0', type: 'rating', label: 'Rating' },
            { key: 'q', type: 'time-log', label: 'Time Log' },
            { key: 'i', type: 'image', label: 'Image' },
            { key: 'c', type: 'calendar', label: 'Calendar' }
        ];
        
        // Add registered element types
        const registeredOptions = [];
        if (this.app.elementTypeManager) {
            const registeredTypes = this.app.elementTypeManager.getAllElementTypes();
            registeredTypes.forEach(plugin => {
                if (plugin.keyboardShortcut && plugin.elementType && plugin.name) {
                    // Check if not already in base types
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
        
        // Sort registered options by keyboard shortcut
        registeredOptions.sort((a, b) => a.key.localeCompare(b.key));
        
        // Combine all options
        const allOptions = [...baseOptions, ...registeredOptions];
        
        // Generate options HTML
        const optionsHTML = allOptions.map(opt => {
            const keyDisplay = opt.key.toUpperCase();
            return `<div class="element-type-option" data-type="${opt.type}" data-key="${opt.key}" style="padding: 5px; cursor: pointer; user-select: none;"><strong>${keyDisplay}</strong> - ${this.escapeHtml(opt.label)}</div>`;
        }).join('');
        
        const modal = document.getElementById('modal');
        const modalContent = modal.querySelector('.modal-content');
        
        // Set up modal structure with count display and scrollable body
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
        
        modal.classList.add('active');
        
        // Get modalBody AFTER setting innerHTML
        const modalBody = document.getElementById('modal-body');
        
        // Store original closeModal
        const originalCloseModal = this.closeModal.bind(this);
        const app = this.app;
        
        // Track element count for drag functionality
        let elementCount = 1;
        
        // Get count display element (now part of the HTML structure)
        const countDisplay = document.getElementById('element-count-display');
        
        // Re-attach close button handler
        const closeBtn = modalContent.querySelector('.modal-close');
        if (closeBtn) {
            closeBtn.onclick = () => {
                document.removeEventListener('keydown', keyHandler);
                app.modalHandler.closeModal = originalCloseModal;
                app.modalHandler.closeModal();
            };
        }
        
        // Capture elementIndex in a local variable to preserve it in closure
        const capturedElementIndex = elementIndex;
        
        // Click handler for numbered options
        const handleOptionClick = (type, count = 1) => {
            document.removeEventListener('keydown', keyHandler);
            app.modalHandler.closeModal = originalCloseModal;
            app.modalHandler.closeModal();
            
            // Track the first element created for editing
            let firstElementIndex = null;
            let firstElement = null;
            let currentInsertIndex = capturedElementIndex; // Use captured value
            
            // Add multiple elements
            const page = app.pages.find(p => p.id === pageId);
            if (!page) return;
            const bin = page.bins?.find(b => b.id === binId);
            if (!bin) return;
            if (!bin.elements) bin.elements = [];
            
            if (capturedElementIndex !== null) {
                // Add after the specified element
                for (let i = 0; i < count; i++) {
                    const newElement = app.elementManager.createElementTemplate(type);
                    const insertIndex = currentInsertIndex + 1;
                    bin.elements.splice(insertIndex, 0, newElement);
                    if (i === 0) {
                        // First element - remember for editing
                        firstElementIndex = insertIndex;
                        firstElement = newElement;
                    }
                    // Update currentInsertIndex for subsequent elements (they're being inserted after each other)
                    currentInsertIndex++;
                }
            } else {
                // Add at the end
                const startIndex = bin.elements.length;
                for (let i = 0; i < count; i++) {
                    const newElement = app.elementManager.createElementTemplate(type);
                    bin.elements.push(newElement);
                    if (i === 0) {
                        // First element - remember for editing
                        firstElementIndex = startIndex;
                        firstElement = newElement;
                    }
                }
            }
            
            // Save and render
            app.dataManager.saveData();
            app.render();
            
            // Open edit modal for the first element (if any were created)
            if (firstElementIndex !== null && firstElement) {
                // Store multi-edit state if multiple elements were created
                if (count > 1) {
                    app.multiEditState = {
                        pageId: pageId,
                        binId: binId,
                        startIndex: firstElementIndex,
                        endIndex: firstElementIndex + count - 1,
                        currentIndex: firstElementIndex
                    };
                } else {
                    app.multiEditState = null;
                }
                
                setTimeout(() => {
                    app.modalHandler.showEditModal(pageId, binId, firstElementIndex, firstElement);
                    // Focus on the text input
                    setTimeout(() => {
                        const textInput = document.getElementById('edit-text');
                        if (textInput) {
                            textInput.focus();
                            textInput.select();
                        }
                    }, 50);
                }, 50);
            }
        };
        
        // Drag state tracking
        let dragState = {
            active: false,
            startX: 0,
            startCount: 1,
            currentType: null,
            pixelsPerElement: 20
        };
        
        // Track if mouseup already handled the action (to prevent click handler from firing)
        let handledByMouseUp = false;
        
        // Helper to get X coordinate from mouse or touch event
        const getClientX = (e) => {
            if (e.touches && e.touches.length > 0) {
                return e.touches[0].clientX;
            }
            if (e.changedTouches && e.changedTouches.length > 0) {
                return e.changedTouches[0].clientX;
            }
            return e.clientX;
        };
        
        // Global mouse/touch move handler for dragging
        const globalMove = (e) => {
            if (!dragState.active) return;
            
            const currentX = getClientX(e);
            const deltaX = currentX - dragState.startX;
            const countChange = Math.round(deltaX / dragState.pixelsPerElement);
            const newCount = Math.max(1, Math.min(10, dragState.startCount + countChange)); // Cap at 10
            
            if (newCount !== elementCount) {
                elementCount = newCount;
                countDisplay.textContent = elementCount;
            }
        };
        
        // Global mouse/touch up handler for dragging
        const globalUp = (e) => {
            if (!dragState.active) return;
            
            handledByMouseUp = true; // Mark that we handled it (set before any async operations)
            
            const currentX = getClientX(e);
            const wasDragging = Math.abs(currentX - dragState.startX) > 5;
            const type = dragState.currentType;
            
            // Capture the count BEFORE resetting it
            const finalCount = elementCount;
            
            // Reset drag state immediately
            dragState.active = false;
            dragState.startX = 0;
            dragState.currentType = null;
            countDisplay.style.display = 'none';
            elementCount = 1;
            
            // Remove global listeners (both mouse and touch)
            document.removeEventListener('mousemove', globalMove);
            document.removeEventListener('mouseup', globalUp);
            document.removeEventListener('touchmove', globalMove);
            document.removeEventListener('touchend', globalUp);
            
            // Find the key for this type
            let typeKey = null;
            for (const [key, value] of allElementTypes.entries()) {
                if (value === type) {
                    typeKey = key;
                    break;
                }
            }
            
            if (type && typeKey && allElementTypes.has(typeKey)) {
                if (wasDragging) {
                    // Dragged - use the captured count
                    handleOptionClick(type, finalCount);
                } else {
                    // Just clicked/tapped - add 1 element
                    handleOptionClick(type, 1);
                }
            }
            
            // Reset handledByMouseUp flag after a short delay to allow click event to check it
            setTimeout(() => {
                handledByMouseUp = false;
            }, 100);
        };
        
        // Helper to start drag/touch interaction
        const startDrag = (e, type, key) => {
            if (!type || !allElementTypes.has(key)) {
                return;
            }
            
            // Reset the handled flag
            handledByMouseUp = false;
            
            // Get starting X coordinate
            const startX = getClientX(e);
            
            // Initialize drag state
            dragState.active = true;
            dragState.startX = startX;
            dragState.startCount = 1;
            dragState.currentType = type;
            elementCount = 1;
            
            // Show count display
            countDisplay.style.display = 'block';
            countDisplay.textContent = '1';
            
            // Add global listeners (both mouse and touch)
            document.addEventListener('mousemove', globalMove);
            document.addEventListener('mouseup', globalUp);
            document.addEventListener('touchmove', globalMove, { passive: false });
            document.addEventListener('touchend', globalUp);
            
            // Prevent text selection and default behavior
            e.preventDefault();
            e.stopPropagation();
        };
        
        // Add click and drag listeners to numbered options
        modalBody.querySelectorAll('.element-type-option').forEach(option => {
            const type = option.dataset.type;
            const key = option.dataset.key;
            
            // Mouse down handler
            option.addEventListener('mousedown', (e) => {
                startDrag(e, type, key);
            });
            
            // Touch start handler (for mobile)
            option.addEventListener('touchstart', (e) => {
                startDrag(e, type, key);
            }, { passive: false });
            
            // Click handler (for non-drag clicks - will be handled by mouseup/touchend if no drag occurred)
            option.addEventListener('click', (e) => {
                // Only handle click if mouseup/touchend didn't already handle it
                // Check both dragState.active (should be false) and handledByMouseUp flag
                if (handledByMouseUp) {
                    // Mouseup/touchend already handled this, prevent duplicate creation
                    e.preventDefault();
                    e.stopPropagation();
                    return;
                }
                
                // Fallback: if for some reason mouseup/touchend didn't fire or handle it, handle click here
                // But only if dragState is not active (meaning we're not in a drag operation)
                if (!dragState.active) {
                    if (type && key && allElementTypes.has(key)) {
                        handleOptionClick(type, 1);
                    }
                }
            });
        });
        
        // Keyboard listener for immediate selection
        const keyHandler = (e) => {
            const key = e.key.toLowerCase();
            if (allElementTypes.has(key)) {
                e.preventDefault();
                e.stopPropagation();
                document.removeEventListener('keydown', keyHandler);
                // Use handleOptionClick for consistency (adds 1 element on keyboard press)
                handleOptionClick(allElementTypes.get(key), 1);
            } else if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                document.removeEventListener('keydown', keyHandler);
                // Restore original closeModal before closing
                app.modalHandler.closeModal = originalCloseModal;
                app.modalHandler.closeModal();
            }
        };
        
        document.addEventListener('keydown', keyHandler);
        
        // Override closeModal to clean up listener when modal is closed by other means
        this.closeModal = () => {
            document.removeEventListener('keydown', keyHandler);
            // Restore original closeModal
            app.modalHandler.closeModal = originalCloseModal;
            originalCloseModal();
        };
    }
    
    showAddChildElementModal(pageId, binId, elementIndex) {
        // Similar to showAddElementModal but adds to children instead
        const types = {
            '1': 'task',
            '2': 'header',
            '3': 'header-checkbox',
            '4': 'multi-checkbox',
            '5': 'audio',
            '6': 'one-time',
            '7': 'timer',
            '8': 'counter',
            '9': 'tracker',
            '0': 'rating',
            'q': 'time-log'
        };
        
        const modal = document.getElementById('modal');
        const modalContent = modal.querySelector('.modal-content');
        const modalBody = document.getElementById('modal-body');
        
        // Set up modal structure with count display (same as showAddElementModal)
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
        
        modal.classList.add('active');
        
        // Store original closeModal
        const originalCloseModal = this.closeModal.bind(this);
        const app = this.app;
        
        // Track element count for drag functionality
        let elementCount = 1;
        
        // Get count display element (now part of the HTML structure)
        const countDisplay = document.getElementById('element-count-display');
        
        // Re-attach close button handler
        const closeBtn = modalContent.querySelector('.modal-close');
        if (closeBtn) {
            closeBtn.onclick = () => {
                document.removeEventListener('keydown', keyHandler);
                app.modalHandler.closeModal = originalCloseModal;
                app.modalHandler.closeModal();
            };
        }
        
        // Click handler for numbered options
        const handleOptionClick = (type, count = 1) => {
            document.removeEventListener('keydown', keyHandler);
            app.modalHandler.closeModal = originalCloseModal;
            app.modalHandler.closeModal();
            
            const page = app.pages.find(p => p.id === pageId);
            if (!page) return;
            const bin = page.bins?.find(b => b.id === binId);
            if (!bin) return;
            const element = bin.elements[elementIndex];
            if (!element) return;
            
            // Initialize children if needed
            if (!element.children) {
                element.children = [];
            }
            
            // Add multiple child elements
            for (let i = 0; i < count; i++) {
                const newChild = app.elementManager.createElementTemplate(type);
                element.children.push(newChild);
            }
            
            app.dataManager.saveData();
            app.render();
        };
        
        // Drag state tracking
        let dragState = {
            active: false,
            startX: 0,
            startCount: 1,
            currentType: null,
            pixelsPerElement: 20
        };
        
        // Track if mouseup already handled the action (to prevent click handler from firing)
        let handledByMouseUp = false;
        
        // Helper to get X coordinate from mouse or touch event
        const getClientX = (e) => {
            if (e.touches && e.touches.length > 0) {
                return e.touches[0].clientX;
            }
            if (e.changedTouches && e.changedTouches.length > 0) {
                return e.changedTouches[0].clientX;
            }
            return e.clientX;
        };
        
        // Global mouse/touch move handler for dragging
        const globalMove = (e) => {
            if (!dragState.active) return;
            
            const currentX = getClientX(e);
            const deltaX = currentX - dragState.startX;
            const countChange = Math.round(deltaX / dragState.pixelsPerElement);
            const newCount = Math.max(1, Math.min(10, dragState.startCount + countChange)); // Cap at 10
            
            if (newCount !== elementCount) {
                elementCount = newCount;
                countDisplay.textContent = elementCount;
                countDisplay.style.display = 'block';
            }
        };
        
        // Global mouse/touch up handler for dragging
        const globalUp = (e) => {
            if (!dragState.active) return;
            
            handledByMouseUp = true; // Mark that we handled it (set before any async operations)
            
            const currentX = getClientX(e);
            const wasDragging = Math.abs(currentX - dragState.startX) > 5;
            const type = dragState.currentType;
            
            // Capture the count BEFORE resetting it
            const finalCount = elementCount;
            
            // Reset drag state immediately
            dragState.active = false;
            dragState.startX = 0;
            dragState.currentType = null;
            countDisplay.style.display = 'none';
            elementCount = 1;
            
            // Remove global listeners (both mouse and touch)
            document.removeEventListener('mousemove', globalMove);
            document.removeEventListener('mouseup', globalUp);
            document.removeEventListener('touchmove', globalMove);
            document.removeEventListener('touchend', globalUp);
            
            if (type && types[Object.keys(types).find(k => types[k] === type)]) {
                if (wasDragging) {
                    // Dragged - use the captured count
                    handleOptionClick(type, finalCount);
                } else {
                    // Just clicked/tapped - add 1 element
                    handleOptionClick(type, 1);
                }
            }
            
            // Reset handledByMouseUp flag after a short delay to allow click event to check it
            setTimeout(() => {
                handledByMouseUp = false;
            }, 100);
        };
        
        // Keyboard handler
        const keyHandler = (e) => {
            if (types[e.key]) {
                e.preventDefault();
                handleOptionClick(types[e.key], 1);
            } else if (e.key === 'Escape') {
                document.removeEventListener('keydown', keyHandler);
                app.modalHandler.closeModal = originalCloseModal;
                app.modalHandler.closeModal();
            }
        };
        document.addEventListener('keydown', keyHandler);
        
        // Helper to start drag/touch interaction for child elements
        const startDragChild = (e, type) => {
            if (!type) {
                return;
            }
            
            // Reset the handled flag
            handledByMouseUp = false;
            
            // Get starting X coordinate
            const startX = getClientX(e);
            
            // Initialize drag state
            dragState.active = true;
            dragState.startX = startX;
            dragState.startCount = elementCount;
            dragState.currentType = type;
            elementCount = 1;
            countDisplay.textContent = '1';
            countDisplay.style.display = 'block';
            
            // Add global listeners (both mouse and touch)
            document.addEventListener('mousemove', globalMove);
            document.addEventListener('mouseup', globalUp);
            document.addEventListener('touchmove', globalMove, { passive: false });
            document.addEventListener('touchend', globalUp);
            
            // Prevent text selection and default behavior
            e.preventDefault();
            e.stopPropagation();
        };
        
        // Click and drag handlers for each option
        modalBody.querySelectorAll('.element-type-option').forEach(option => {
            const type = option.dataset.type;
            
            // Mouse down handler
            option.addEventListener('mousedown', (e) => {
                startDragChild(e, type);
            });
            
            // Touch start handler (for mobile)
            option.addEventListener('touchstart', (e) => {
                startDragChild(e, type);
            }, { passive: false });
            
            option.addEventListener('click', (e) => {
                // Only handle click if it wasn't already handled by mouseup/touchend (drag)
                if (handledByMouseUp) {
                    return;
                }
                const type = option.dataset.type;
                handleOptionClick(type, 1);
                document.removeEventListener('keydown', keyHandler);
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
            const modal = document.getElementById('modal');
            const modalBody = document.getElementById('modal-body');
            
            modalBody.innerHTML = `
                <div style="padding: 20px; text-align: center;">
                    <p style="margin-bottom: 20px; color: #e0e0e0;">${this.escapeHtml(message)}</p>
                    <button onclick="app.modalHandler.closeModal(); app.modalHandler._alertResolve();" 
                            style="padding: 10px 20px; background: #4a9eff; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        OK
                    </button>
                </div>
            `;
            
            modal.classList.add('active');
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
            const modal = document.getElementById('modal');
            const modalBody = document.getElementById('modal-body');
            
            modalBody.innerHTML = `
                <div style="padding: 20px; text-align: center;">
                    <p style="margin-bottom: 20px; color: #e0e0e0;">${this.escapeHtml(message)}</p>
                    <div style="display: flex; gap: 10px; justify-content: center;">
                        <button onclick="app.modalHandler.closeModal(); app.modalHandler._confirmResolve(true);" 
                                style="padding: 10px 20px; background: #4a9eff; color: white; border: none; border-radius: 4px; cursor: pointer;">
                            OK
                        </button>
                        <button onclick="app.modalHandler.closeModal(); app.modalHandler._confirmResolve(false);" 
                                style="padding: 10px 20px; background: #555; color: white; border: none; border-radius: 4px; cursor: pointer;">
                            Cancel
                        </button>
                    </div>
                </div>
            `;
            
            modal.classList.add('active');
            this._confirmResolve = resolve;
        });
    }
    
    /**
     * Show a prompt dialog (replaces browser prompt)
     * @param {string} message - Message to display
     * @param {string} defaultValue - Default input value
     * @returns {Promise<string|null>}
     */
    async showPrompt(message, defaultValue = '') {
        return new Promise((resolve) => {
            const modal = document.getElementById('modal');
            const modalBody = document.getElementById('modal-body');
            
            const inputId = 'prompt-input-' + Date.now();
            modalBody.innerHTML = `
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
            
            modal.classList.add('active');
            this._promptResolve = resolve;
            
            // Focus input and handle Enter key
            setTimeout(() => {
                const input = document.getElementById(inputId);
                if (input) {
                    input.focus();
                    input.select();
                    input.addEventListener('keydown', (e) => {
                        if (e.key === 'Enter') {
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
        const modal = document.getElementById('modal');
        modal.classList.remove('active');
        this.app.currentEdit = null;
        
        // Remove Enter key handler if it exists
        if (this.app.currentEnterKeyHandler) {
            document.removeEventListener('keydown', this.app.currentEnterKeyHandler, true);
            this.app.currentEnterKeyHandler = null;
        }
    }
    
    showTooltip(text) {
        const tooltip = document.getElementById('global-tooltip');
        if (tooltip) {
            tooltip.textContent = text;
            tooltip.classList.add('visible');
        }
    }
    
    hideTooltip() {
        const tooltip = document.getElementById('global-tooltip');
        if (tooltip) {
            tooltip.classList.remove('visible');
        }
    }
    
    showViewDataModal(element, isSubtask = false) {
        const modal = document.getElementById('modal');
        const modalBody = document.getElementById('modal-body');
        
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
        modal.classList.add('active');
        
        // Add Enter key handler to close modal
        const handleEnterKey = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.closeModal();
                document.removeEventListener('keydown', handleEnterKey);
                this.app.currentEnterKeyHandler = null;
            }
        };
        document.addEventListener('keydown', handleEnterKey);
        this.app.currentEnterKeyHandler = handleEnterKey;
    }
    
    showEditModal(pageId, binId, elementIndex, element) {
        const modal = document.getElementById('modal');
        const modalBody = document.getElementById('modal-body');
        
        // Get bin to ensure it exists
        const page = this.app.pages.find(p => p.id === pageId);
        if (!page) return;
        const bin = page.bins?.find(b => b.id === binId);
        if (!bin) return;
        
        let html = ``;
        
        // Text field (only for elements that have text)
        if (element.type === 'task' || element.type === 'header-checkbox' || element.type === 'audio' || element.type === 'timer' || 
            element.type === 'counter' || element.type === 'tracker' || element.type === 'rating' || element.type === 'time-log') {
            // Convert HTML back to plain text for editing (decode HTML entities and remove tags)
            let plainText = element.text || '';
            // Create a temporary div to decode HTML entities and extract text content
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = plainText;
            plainText = tempDiv.textContent || tempDiv.innerText || plainText;
            
            html += `
                <label>Text:</label>
                <textarea id="edit-text" style="width: 100%; min-height: 60px; padding: 8px; background: #1a1a1a; color: #e0e0e0; border: 1px solid #555; border-radius: 4px; font-family: inherit; resize: vertical;">${this.escapeHtml(plainText)}</textarea>
            `;
        }
        
        // Audio-specific fields
        if (element.type === 'audio') {
            html += `
                <div style="margin-top: 15px; padding: 10px; background: #1a1a1a; border-radius: 4px;">
                    <label style="font-weight: 600;">Current Recording:</label>
                    <div style="margin-top: 5px; color: #888; font-size: 12px;">
                        ${element.audioFile ? `File: ${element.audioFile}${element.date ? ` (${element.date})` : ''}` : 'No recording'}
                    </div>
                    <div style="margin-top: 10px; display: flex; gap: 8px;">
                        ${element.audioFile ? `
                            <button onclick="window.app && window.app.modalHandler && window.app.modalHandler.overwriteAudioRecording('${pageId}', '${binId}', ${elementIndex})" style="padding: 6px 12px; background: #ff5555; color: white; border: none; border-radius: 4px; cursor: pointer;">Overwrite Recording</button>
                        ` : ''}
                        <button onclick="window.app && window.app.modalHandler && window.app.modalHandler.toggleArchiveViewInEdit('${pageId}', '${binId}', ${elementIndex})" style="padding: 6px 12px; background: #4a9eff; color: white; border: none; border-radius: 4px; cursor: pointer;">View Archive</button>
                    </div>
                    <div id="archive-view-edit-${pageId}-${elementIndex}" style="display: none; margin-top: 10px;"></div>
                </div>
            `;
        }
        
        // Counter-specific fields
        if (element.type === 'counter') {
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
        
        // Tracker-specific fields
        if (element.type === 'tracker') {
            html += `
                <div style="margin-top: 15px; padding: 10px; background: #1a1a1a; border-radius: 4px;">
                    <label style="font-weight: 600;">Tracker Settings:</label>
                    <div style="margin-top: 10px;">
                        <label style="display: flex; align-items: center; gap: 8px;">
                            <input type="radio" name="tracker-mode-${pageId}-${elementIndex}" value="daily" ${element.mode === 'daily' || !element.mode ? 'checked' : ''} />
                            <span>Daily (tracks completions per day, resets daily)</span>
                        </label>
                        <label style="display: flex; align-items: center; gap: 8px; margin-top: 5px;">
                            <input type="radio" name="tracker-mode-${pageId}-${elementIndex}" value="page" ${element.mode === 'page' ? 'checked' : ''} />
                            <span>Page (counts checked elements in page, each check counts once)</span>
                        </label>
                    </div>
                </div>
            `;
        }
        
        // Rating-specific fields
        if (element.type === 'rating') {
            html += `
                <div style="margin-top: 15px; padding: 10px; background: #1a1a1a; border-radius: 4px;">
                    <label style="font-weight: 600;">Rating:</label>
                    <div style="margin-top: 10px;">
                        <label>Stars (0-5):</label>
                        <input type="number" id="edit-rating-stars" min="0" max="5" value="${element.rating || 0}" style="width: 100px;" />
                    </div>
                    <div style="margin-top: 10px;">
                        <label>Review:</label>
                        <textarea id="edit-rating-review" placeholder="Optional review..." style="width: 100%; min-height: 60px;">${this.escapeHtml(element.review || '')}</textarea>
                    </div>
                </div>
            `;
        }
        
        // Timer-specific fields
        if (element.type === 'timer') {
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
                            <option value="" ${!element.alarmSound ? 'selected' : ''}>No Alarm</option>
                            <option value="/sounds/alarm.mp3" ${element.alarmSound === '/sounds/alarm.mp3' ? 'selected' : ''}>Default Alarm</option>
                        </select>
                    </div>
                </div>
            `;
        }

        // Time log doesn't need special fields in edit modal (controlled by buttons in UI)
        
        // Calendar-specific fields
        if (element.type === 'calendar') {
            const defaultTags = ['work', 'personal', 'urgent', 'important', 'meeting', 'deadline', 'chore', 'hobby'];
            const allTags = [...new Set([...defaultTags, ...(element.targetTags || [])])];
            
            html += `
                <div style="margin-top: 15px; padding: 10px; background: #1a1a1a; border-radius: 4px;">
                    <label style="font-weight: 600;">Calendar Settings:</label>
                    
                    <div style="margin-top: 10px;">
                        <label>Display Mode:</label>
                        <select id="edit-calendar-display-mode" style="width: 200px; margin-left: 10px;">
                            <option value="current-date" ${element.displayMode === 'current-date' ? 'selected' : ''}>Current Date & Summary</option>
                            <option value="one-day" ${element.displayMode === 'one-day' ? 'selected' : ''}>One Day (Scrollable)</option>
                            <option value="week" ${element.displayMode === 'week' ? 'selected' : ''}>Week View</option>
                            <option value="month" ${element.displayMode === 'month' ? 'selected' : ''}>Month View</option>
                        </select>
                    </div>
                    
                    <div style="margin-top: 15px;">
                        <label style="font-weight: 600;">Targeting Mode:</label>
                        <div style="margin-top: 5px;">
                            <label style="display: flex; align-items: center; gap: 8px;">
                                <input type="radio" name="calendar-targeting-${pageId}-${elementIndex}" value="default" ${element.targetingMode === 'default' || !element.targetingMode ? 'checked' : ''} />
                                <span>Default (all pages/bins)</span>
                            </label>
                            <label style="display: flex; align-items: center; gap: 8px; margin-top: 5px;">
                                <input type="radio" name="calendar-targeting-${pageId}-${elementIndex}" value="specific" ${element.targetingMode === 'specific' ? 'checked' : ''} />
                                <span>Specific (pages/bins/elements)</span>
                            </label>
                            <label style="display: flex; align-items: center; gap: 8px; margin-top: 5px;">
                                <input type="radio" name="calendar-targeting-${pageId}-${elementIndex}" value="tags" ${element.targetingMode === 'tags' ? 'checked' : ''} />
                                <span>Tags (automated selection)</span>
                            </label>
                        </div>
                    </div>
                    
                    <div id="edit-calendar-specific-options" style="margin-top: 10px; ${element.targetingMode === 'specific' ? '' : 'display: none;'}">
                        <div style="margin-top: 10px;">
                            <label>Target Pages:</label>
                            <div id="edit-calendar-target-pages" style="margin-top: 5px;">
                                ${(element.targetPages || []).map(pageId => `
                                    <div style="display: flex; gap: 5px; margin-bottom: 5px;">
                                        <select class="calendar-target-page" style="flex: 1;">
                                            ${app.pages.map(p => `<option value="${p.id}" ${p.id === pageId ? 'selected' : ''}>${p.title || p.id}</option>`).join('')}
                                        </select>
                                        <button type="button" class="remove-target-page" style="padding: 2px 8px; background: #ff5555; color: white; border: none; border-radius: 4px; cursor: pointer;">×</button>
                                    </div>
                                `).join('')}
                                <button type="button" id="add-target-page-btn" style="padding: 5px 10px; background: #4a9eff; color: white; border: none; border-radius: 4px; cursor: pointer; margin-top: 5px;">+ Add Page</button>
                            </div>
                        </div>
                    </div>
                    
                    <div id="edit-calendar-tags-options" style="margin-top: 10px; ${element.targetingMode === 'tags' ? '' : 'display: none;'}">
                        <div style="margin-top: 10px;">
                            <label>Target Tags:</label>
                            <div id="edit-calendar-target-tags" style="margin-top: 5px; display: flex; flex-wrap: wrap; gap: 5px;">
                                ${(element.targetTags || []).map(tag => `
                                    <span style="display: inline-flex; align-items: center; gap: 5px; padding: 3px 8px; background: #4a9eff; color: white; border-radius: 12px; font-size: 12px;">
                                        ${this.escapeHtml(tag)}
                                        <button type="button" class="remove-tag" data-tag="${this.escapeHtml(tag)}" style="background: transparent; border: none; color: white; cursor: pointer; padding: 0; margin: 0; font-size: 14px; line-height: 1;">×</button>
                                    </span>
                                `).join('')}
                            </div>
                            <div style="margin-top: 10px;">
                                <label>Available Tags:</label>
                                <div style="display: flex; flex-wrap: wrap; gap: 5px; margin-top: 5px;">
                                    ${allTags.map(tag => `
                                        <button type="button" class="add-tag-btn" data-tag="${this.escapeHtml(tag)}" 
                                                style="padding: 3px 8px; background: ${(element.targetTags || []).includes(tag) ? '#555' : '#2a2a2a'}; color: #e0e0e0; border: 1px solid #555; border-radius: 12px; cursor: pointer; font-size: 12px;"
                                                ${(element.targetTags || []).includes(tag) ? 'disabled' : ''}>
                                            ${this.escapeHtml(tag)}
                                        </button>
                                    `).join('')}
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
        
        // Tags section (available for all element types)
        const defaultTags = this.app.tagManager ? this.app.tagManager.getDefaultTags() : ['work', 'personal', 'urgent', 'important', 'meeting', 'deadline', 'chore', 'hobby'];
        const allTags = this.app.tagManager ? this.app.tagManager.getAvailableTags() : [...new Set([...defaultTags, ...(element.tags || [])])];
        
        html += `
            <div style="margin-top: 20px; padding: 15px; background: #2a2a2a; border-radius: 4px; border: 1px solid #444;">
                <label style="font-weight: 600; margin-bottom: 10px; display: block;">Tags:</label>
                <div id="edit-element-tags" style="margin-top: 5px; display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 10px;">
                    ${(element.tags || []).map(tag => `
                        <span style="display: inline-flex; align-items: center; gap: 5px; padding: 3px 8px; background: #4a9eff; color: white; border-radius: 12px; font-size: 12px;">
                            ${this.escapeHtml(tag)}
                            <button type="button" class="remove-element-tag" data-tag="${this.escapeHtml(tag)}" style="background: transparent; border: none; color: white; cursor: pointer; padding: 0; margin: 0; font-size: 14px; line-height: 1;">×</button>
                        </span>
                    `).join('')}
                </div>
                <div style="margin-top: 10px;">
                    <label>Available Tags:</label>
                    <div style="display: flex; flex-wrap: wrap; gap: 5px; margin-top: 5px;">
                        ${allTags.map(tag => `
                            <button type="button" class="add-element-tag-btn" data-tag="${this.escapeHtml(tag)}" 
                                    style="padding: 3px 8px; background: ${(element.tags || []).includes(tag) ? '#555' : '#2a2a2a'}; color: #e0e0e0; border: 1px solid #555; border-radius: 12px; cursor: pointer; font-size: 12px;"
                                    ${(element.tags || []).includes(tag) ? 'disabled' : ''}>
                                ${this.escapeHtml(tag)}
                            </button>
                        `).join('')}
                    </div>
                    <div style="margin-top: 10px;">
                        <input type="text" id="new-element-tag-input" placeholder="Add custom tag" style="width: 150px; padding: 5px; background: #1a1a1a; color: #e0e0e0; border: 1px solid #555; border-radius: 4px;" />
                        <button type="button" id="add-custom-element-tag-btn" style="padding: 5px 10px; background: #4a9eff; color: white; border: none; border-radius: 4px; cursor: pointer; margin-left: 5px;">Add</button>
                    </div>
                </div>
            </div>
        `;
        
        // Custom Properties section (if element has custom properties or plugin is enabled)
        if (element.customProperties || this.app.elementTypeManager) {
            html += `
                <div style="margin-top: 20px; padding: 15px; background: #2a2a2a; border-radius: 4px; border: 1px solid #444;">
                    <label style="font-weight: 600; margin-bottom: 10px; display: block;">Custom Properties:</label>
                    <div id="custom-properties-list" style="margin-bottom: 10px;">
            `;
            
            if (element.customProperties && Object.keys(element.customProperties).length > 0) {
                Object.keys(element.customProperties).forEach(key => {
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
        
        // Plugins section (available for all element types)
        const hasTimeAllocated = element.timeAllocated && element.timeAllocated.trim() !== '';
        const hasFunModifier = element.funModifier && element.funModifier.trim() !== '';
        const hasRepeats = element.repeats !== false;
        
        html += `
            <div style="margin-top: 20px; padding: 15px; background: #2a2a2a; border-radius: 4px; border: 1px solid #444;">
                <label style="font-weight: 600; margin-bottom: 10px; display: block;">Plugins:</label>
                <div style="display: flex; align-items: center; gap: 20px; flex-wrap: wrap;">
                    <label style="display: flex; align-items: center; gap: 10px; margin: 0;">
                        <input type="checkbox" id="edit-plugin-progress" ${element.progress !== undefined ? 'checked' : ''} style="width: 18px; height: 18px; margin: 0;" />
                        <span>Progress Bar</span>
                    </label>
                    <label style="display: flex; align-items: center; gap: 10px; margin: 0;">
                        <input type="checkbox" id="edit-plugin-recurring" ${element.recurringSchedule ? 'checked' : ''} style="width: 18px; height: 18px; margin: 0;" />
                        <span>Recurring Schedule</span>
                    </label>
                    <label style="display: flex; align-items: center; gap: 10px; margin: 0;">
                        <input type="checkbox" id="edit-plugin-deadline" ${element.deadline ? 'checked' : ''} style="width: 18px; height: 18px; margin: 0;" />
                        <span>Deadline</span>
                    </label>
                    <label style="display: flex; align-items: center; gap: 10px; margin: 0;">
                        <input type="checkbox" id="edit-plugin-persistent" ${element.persistent || element.type === 'image' ? 'checked' : ''} ${element.type === 'image' ? 'disabled' : ''} style="width: 18px; height: 18px; margin: 0;" />
                        <span>Persistent${element.type === 'image' ? ' (always on for images)' : ''}</span>
                    </label>
                    <label style="display: flex; align-items: center; gap: 10px; margin: 0;">
                        <input type="checkbox" id="edit-plugin-time" ${hasTimeAllocated ? 'checked' : ''} style="width: 18px; height: 18px; margin: 0;" />
                        <span>Time Allocated</span>
                    </label>
                    ${element.type !== 'header-checkbox' ? `
                    <label style="display: flex; align-items: center; gap: 10px; margin: 0;">
                        <input type="checkbox" id="edit-plugin-fun" ${hasFunModifier ? 'checked' : ''} style="width: 18px; height: 18px; margin: 0;" />
                        <span>Fun Modifier</span>
                    </label>
                    <label style="display: flex; align-items: center; gap: 10px; margin: 0;">
                        <input type="checkbox" id="edit-plugin-repeats" ${hasRepeats ? 'checked' : ''} style="width: 18px; height: 18px; margin: 0;" />
                        <span>Reset Daily</span>
                    </label>
                    ` : ''}
                </div>
                
                <!-- Progress Bar options -->
                <div id="edit-plugin-progress-options" style="margin-top: 10px; ${element.progress === undefined ? 'display: none;' : ''}">
                    <label>Progress (0-100%):</label>
                    <input type="number" id="edit-progress-value" min="0" max="100" value="${element.progress || 0}" style="width: 100px;" />
                </div>
                
                <!-- Recurring Schedule options -->
                <div id="edit-plugin-recurring-options" style="margin-top: 10px; ${!element.recurringSchedule ? 'display: none;' : ''}">
                    <label>Schedule:</label>
                    <select id="edit-recurring-schedule" style="width: 150px;">
                        <option value="daily" ${element.recurringSchedule === 'daily' ? 'selected' : ''}>Daily</option>
                        <option value="weekly" ${element.recurringSchedule === 'weekly' ? 'selected' : ''}>Weekly</option>
                        <option value="monthly" ${element.recurringSchedule === 'monthly' ? 'selected' : ''}>Monthly</option>
                        <option value="custom" ${element.recurringSchedule === 'custom' ? 'selected' : ''}>Custom</option>
                    </select>
                    <div id="edit-recurring-custom" style="margin-top: 5px; ${element.recurringSchedule === 'custom' ? '' : 'display: none;'}">
                        <label>Custom Pattern (e.g., "every 3 days"):</label>
                        <input type="text" id="edit-recurring-custom-pattern" value="${element.recurringCustomPattern || ''}" placeholder="every 3 days" />
                    </div>
                </div>
                
                <!-- Deadline options -->
                <div id="edit-plugin-deadline-options" style="margin-top: 10px; ${!element.deadline ? 'display: none;' : ''}">
                    <label>Date:</label>
                    <input type="date" id="edit-deadline-date" value="${element.deadline ? element.deadline.split('T')[0] : ''}" style="width: 150px;" />
                    <label style="margin-left: 10px;">Time:</label>
                    <input type="time" id="edit-deadline-time" value="${element.deadline ? element.deadline.split('T')[1]?.substring(0, 5) || '' : ''}" style="width: 100px;" />
                </div>
                
                <!-- Time Allocated options -->
                <div id="edit-plugin-time-options" style="margin-top: 10px; ${!hasTimeAllocated ? 'display: none;' : ''}">
                    <label>Time Allocated:</label>
                    <input type="text" id="edit-time" value="${this.escapeHtml(element.timeAllocated || '')}" 
                           placeholder="e.g., 30 min+ or 20 min" />
                </div>
                
                <!-- Fun Modifier options -->
                ${element.type !== 'header-checkbox' ? `
                <div id="edit-plugin-fun-options" style="margin-top: 10px; ${!hasFunModifier ? 'display: none;' : ''}">
                    <label>Fun Modifier:</label>
                    <textarea id="edit-fun" placeholder="How to make this task fun">${this.escapeHtml(element.funModifier || '')}</textarea>
                </div>
                ` : ''}
            </div>
        `;
        
        // For multi-checkbox, show items editor
        if (element.type === 'multi-checkbox' && element.items) {
            html += `<label style="margin-top: 15px;">Items:</label>`;
            html += `<div id="edit-items">`;
            element.items.forEach((item, idx) => {
                html += `
                    <div class="subtask-item">
                        <input type="text" class="edit-item-text" data-index="${idx}" 
                               value="${this.escapeHtml(item.text)}" />
                        <input type="text" class="edit-item-fun" data-index="${idx}" 
                               value="${this.escapeHtml(item.funModifier || '')}" placeholder="Fun modifier" />
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
        modal.classList.add('active');
        
        // Attach event listeners to save and cancel buttons
        const saveBtn = document.getElementById('edit-save-btn');
        const cancelBtn = document.getElementById('edit-cancel-btn');
        const addItemBtn = document.getElementById('add-edit-item-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                this.saveEdit(pageId, binId, elementIndex);
            });
        }
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                this.closeModal();
            });
        }
        if (addItemBtn) {
            addItemBtn.addEventListener('click', () => {
                this.addEditItem();
            });
        }
        
        // Attach event listeners to remove item buttons (they're created dynamically)
        // Use event delegation since items are added dynamically
        const itemsContainer = document.getElementById('edit-items');
        if (itemsContainer) {
            itemsContainer.addEventListener('click', (e) => {
                if (e.target.hasAttribute('data-remove-item')) {
                    const idx = parseInt(e.target.getAttribute('data-remove-item'));
                    this.removeEditItem(idx);
                }
            });
        }
        
        // Set up plugin checkbox event handlers
        const progressCheckbox = document.getElementById('edit-plugin-progress');
        if (progressCheckbox) {
            progressCheckbox.addEventListener('change', (e) => {
                const optionsDiv = document.getElementById('edit-plugin-progress-options');
                if (optionsDiv) {
                    optionsDiv.style.display = e.target.checked ? 'block' : 'none';
                }
            });
        }
        
        const recurringCheckbox = document.getElementById('edit-plugin-recurring');
        if (recurringCheckbox) {
            recurringCheckbox.addEventListener('change', (e) => {
                const optionsDiv = document.getElementById('edit-plugin-recurring-options');
                if (optionsDiv) {
                    optionsDiv.style.display = e.target.checked ? 'block' : 'none';
                }
            });
        }
        
        const deadlineCheckbox = document.getElementById('edit-plugin-deadline');
        if (deadlineCheckbox) {
            deadlineCheckbox.addEventListener('change', (e) => {
                const optionsDiv = document.getElementById('edit-plugin-deadline-options');
                if (optionsDiv) {
                    optionsDiv.style.display = e.target.checked ? 'block' : 'none';
                }
            });
        }
        
        const timeCheckbox = document.getElementById('edit-plugin-time');
        if (timeCheckbox) {
            timeCheckbox.addEventListener('change', (e) => {
                const optionsDiv = document.getElementById('edit-plugin-time-options');
                if (optionsDiv) {
                    optionsDiv.style.display = e.target.checked ? 'block' : 'none';
                }
            });
        }
        
        const funCheckbox = document.getElementById('edit-plugin-fun');
        if (funCheckbox) {
            funCheckbox.addEventListener('change', (e) => {
                const optionsDiv = document.getElementById('edit-plugin-fun-options');
                if (optionsDiv) {
                    optionsDiv.style.display = e.target.checked ? 'block' : 'none';
                }
            });
        }
        
        // Recurring schedule change handler (for custom pattern visibility)
        const recurringScheduleSelect = document.getElementById('edit-recurring-schedule');
        if (recurringScheduleSelect) {
            recurringScheduleSelect.addEventListener('change', (e) => {
                const customDiv = document.getElementById('edit-recurring-custom');
                if (customDiv) {
                    customDiv.style.display = e.target.value === 'custom' ? 'block' : 'none';
                }
            });
        }
        
        // Calendar-specific event listeners
        if (element.type === 'calendar') {
            // Targeting mode radio buttons
            const targetingRadios = document.querySelectorAll(`input[name="calendar-targeting-${pageId}-${elementIndex}"]`);
            targetingRadios.forEach(radio => {
                radio.addEventListener('change', (e) => {
                    const specificDiv = document.getElementById('edit-calendar-specific-options');
                    const tagsDiv = document.getElementById('edit-calendar-tags-options');
                    if (specificDiv) specificDiv.style.display = e.target.value === 'specific' ? 'block' : 'none';
                    if (tagsDiv) tagsDiv.style.display = e.target.value === 'tags' ? 'block' : 'none';
                });
            });
            
            // Add target page button
            const addPageBtn = document.getElementById('add-target-page-btn');
            if (addPageBtn) {
                addPageBtn.addEventListener('click', () => {
                    const container = document.getElementById('edit-calendar-target-pages');
                    const newDiv = document.createElement('div');
                    newDiv.style.display = 'flex';
                    newDiv.style.gap = '5px';
                    newDiv.style.marginBottom = '5px';
                    const select = document.createElement('select');
                    select.className = 'calendar-target-page';
                    select.style.flex = '1';
                    this.app.pages.forEach(p => {
                        const option = document.createElement('option');
                        option.value = p.id;
                        option.textContent = p.title || p.id;
                        select.appendChild(option);
                    });
                    const removeBtn = document.createElement('button');
                    removeBtn.textContent = '×';
                    removeBtn.type = 'button';
                    removeBtn.className = 'remove-target-page';
                    removeBtn.style.padding = '2px 8px';
                    removeBtn.style.background = '#ff5555';
                    removeBtn.style.color = 'white';
                    removeBtn.style.border = 'none';
                    removeBtn.style.borderRadius = '4px';
                    removeBtn.style.cursor = 'pointer';
                    removeBtn.addEventListener('click', () => newDiv.remove());
                    newDiv.appendChild(select);
                    newDiv.appendChild(removeBtn);
                    container.insertBefore(newDiv, addPageBtn);
                });
            }
            
            // Remove target page buttons
            document.querySelectorAll('.remove-target-page').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.target.closest('div').remove();
                });
            });
            
            // Tag buttons
            document.querySelectorAll('.add-tag-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const tag = e.target.dataset.tag;
                    if (!element.targetTags) element.targetTags = [];
                    if (!element.targetTags.includes(tag)) {
                        element.targetTags.push(tag);
                        this.app.dataManager.saveData();
                        this.showEditModal(pageId, binId, elementIndex, element);
                    }
                });
            });
            
            // Remove tag buttons
            document.querySelectorAll('.remove-tag').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const tag = e.target.dataset.tag;
                    if (element.targetTags) {
                        element.targetTags = element.targetTags.filter(t => t !== tag);
                        this.app.dataManager.saveData();
                        this.showEditModal(pageId, binId, elementIndex, element);
                    }
                });
            });
            
            // Add custom tag
            const addCustomTagBtn = document.getElementById('add-custom-tag-btn');
            const newTagInput = document.getElementById('new-tag-input');
            if (addCustomTagBtn && newTagInput) {
                addCustomTagBtn.addEventListener('click', () => {
                    const tag = newTagInput.value.trim().toLowerCase();
                    if (tag && !element.targetTags?.includes(tag)) {
                        if (!element.targetTags) element.targetTags = [];
                        element.targetTags.push(tag);
                        this.app.dataManager.saveData();
                        this.showEditModal(pageId, binId, elementIndex, element);
                    }
                });
                newTagInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        addCustomTagBtn.click();
                    }
                });
            }
        }
        
        // Tags event handlers
        document.querySelectorAll('.add-element-tag-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tag = e.target.dataset.tag;
                if (!element.tags) element.tags = [];
                if (!element.tags.includes(tag)) {
                    element.tags.push(tag);
                    if (this.app.tagManager) {
                        this.app.tagManager.addTag(tag);
                    }
                    this.app.dataManager.saveData();
                    this.showEditModal(pageId, binId, elementIndex, element);
                }
            });
        });
        
        document.querySelectorAll('.remove-element-tag').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tag = e.target.dataset.tag;
                if (element.tags) {
                    element.tags = element.tags.filter(t => t !== tag);
                    this.app.dataManager.saveData();
                    this.showEditModal(pageId, binId, elementIndex, element);
                }
            });
        });
        
        const addCustomElementTagBtn = document.getElementById('add-custom-element-tag-btn');
        const newElementTagInput = document.getElementById('new-element-tag-input');
        if (addCustomElementTagBtn && newElementTagInput) {
            addCustomElementTagBtn.addEventListener('click', () => {
                const tag = newElementTagInput.value.trim().toLowerCase();
                if (tag && !element.tags?.includes(tag)) {
                    if (!element.tags) element.tags = [];
                    element.tags.push(tag);
                    if (this.app.tagManager) {
                        this.app.tagManager.addTag(tag);
                    }
                    this.app.dataManager.saveData();
                    this.showEditModal(pageId, binId, elementIndex, element);
                }
            });
            newElementTagInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    addCustomElementTagBtn.click();
                }
            });
        }
        
        // Custom Properties event handlers
        const addPropertyBtn = document.getElementById('add-custom-property-btn');
        if (addPropertyBtn) {
            addPropertyBtn.addEventListener('click', () => {
                const propertiesList = document.getElementById('custom-properties-list');
                if (propertiesList) {
                    const newItem = document.createElement('div');
                    newItem.className = 'custom-property-item';
                    newItem.style.cssText = 'display: flex; gap: 10px; margin-bottom: 10px; padding: 8px; background: #1a1a1a; border-radius: 4px; align-items: center;';
                    newItem.innerHTML = `
                        <input type="text" class="custom-property-key" placeholder="Property name" style="flex: 1; padding: 6px; background: #2a2a2a; color: #e0e0e0; border: 1px solid #555; border-radius: 4px;" />
                        <input type="text" class="custom-property-value" placeholder="Property value" style="flex: 1; padding: 6px; background: #2a2a2a; color: #e0e0e0; border: 1px solid #555; border-radius: 4px;" />
                        <button type="button" class="remove-custom-property-btn" style="padding: 6px 12px; background: #e74c3c; color: white; border: none; border-radius: 4px; cursor: pointer;">Remove</button>
                    `;
                    newItem.querySelector('.remove-custom-property-btn').addEventListener('click', () => {
                        newItem.remove();
                    });
                    propertiesList.appendChild(newItem);
                }
            });
        }
        
        // Remove property buttons
        document.querySelectorAll('.remove-custom-property-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.target.closest('.custom-property-item').remove();
            });
        });
        
        // Store current editing state
        this.app.currentEdit = {
            pageId: pageId,
            binId: binId,
            elementIndex: elementIndex,
            itemCount: element.items ? element.items.length : 0,
            elementType: element.type
        };
        
        // Update modal close button to show it's a save button and add navigation arrow buttons
        const modalClose = document.querySelector('.modal-close');
        const modalContent = modal.querySelector('.modal-content');
        
        // Style the close button to match arrow buttons
        modalClose.style.cssText = 'position: absolute; top: 10px; right: 15px; font-size: 24px; font-weight: bold; cursor: pointer; color: #888888; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; border: none; background: transparent; padding: 0; margin: 0; z-index: 2002;';
        modalClose.style.transition = 'color 0.2s';
        
        // Check if navigation buttons already exist
        let prevElementBtn = document.getElementById('modal-prev-element-btn');
        let nextElementBtn = document.getElementById('modal-next-element-btn');
        
        if (!prevElementBtn) {
            // Create left arrow button
            prevElementBtn = document.createElement('button');
            prevElementBtn.id = 'modal-prev-element-btn';
            prevElementBtn.className = 'modal-prev-element-btn';
            prevElementBtn.innerHTML = '←';
            prevElementBtn.title = 'Save and edit previous element (hold to create new)';
            prevElementBtn.style.cssText = 'position: absolute; top: 10px; right: 110px; font-size: 24px; font-weight: bold; cursor: pointer; color: #888888; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; border: none; background: transparent; padding: 0; margin: 0; z-index: 2002; transition: color 0.2s;';
            modalContent.insertBefore(prevElementBtn, modalClose);
        }
        
        if (!nextElementBtn) {
            // Create right arrow button
            nextElementBtn = document.createElement('button');
            nextElementBtn.id = 'modal-next-element-btn';
            nextElementBtn.className = 'modal-next-element-btn';
            nextElementBtn.innerHTML = '→';
            nextElementBtn.title = 'Save and edit next element (hold to create new)';
            nextElementBtn.style.cssText = 'position: absolute; top: 10px; right: 60px; font-size: 24px; font-weight: bold; cursor: pointer; color: #888888; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; border: none; background: transparent; padding: 0; margin: 0; z-index: 2002; transition: color 0.2s;';
            modalContent.insertBefore(nextElementBtn, modalClose);
        }
        
        // Add hover effects to all buttons
        const setupButtonHover = (btn) => {
            btn.addEventListener('mouseenter', () => {
                btn.style.color = '#ffffff';
            });
            btn.addEventListener('mouseleave', () => {
                btn.style.color = '#888888';
            });
        };
        setupButtonHover(modalClose);
        setupButtonHover(prevElementBtn);
        setupButtonHover(nextElementBtn);
        
        // Set up close button handler (save and close)
        modalClose.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.saveEdit(pageId, binId, elementIndex);
            this.closeModal();
        };
        
        // Set up next element button handler
        let nextElementMouseDownTime = 0;
        let nextElementIsHolding = false;
        
        const setupNextElementButton = () => {
            nextElementBtn.onmousedown = (e) => {
                e.preventDefault();
                e.stopPropagation();
                nextElementMouseDownTime = Date.now();
                nextElementIsHolding = false;
                
                // Check if holding after 200ms
                const holdTimer = setTimeout(() => {
                    nextElementIsHolding = true;
                }, 200);
                
                const handleMouseUp = () => {
                    clearTimeout(holdTimer);
                    const wasHolding = nextElementIsHolding;
                    const page = this.app.pages.find(p => p.id === pageId);
                    if (!page) return;
                    const bin = page.bins?.find(b => b.id === binId);
                    if (!bin) return;
                    
                    if (wasHolding) {
                        // Create new element of matching type
                        const currentElement = bin.elements[elementIndex];
                        if (currentElement) {
                            const newElement = this.app.elementManager.createElementTemplate(currentElement.type);
                            const insertIndex = elementIndex + 1;
                            if (!bin.elements) bin.elements = [];
                            bin.elements.splice(insertIndex, 0, newElement);
                            this.saveEdit(pageId, binId, elementIndex, true); // Skip close
                            this.app.dataManager.saveData();
                            this.app.render();
                            // Open new element editor without visible transition
                            setTimeout(() => {
                                this.showEditModal(pageId, binId, insertIndex, newElement);
                            }, 10);
                        }
                    } else {
                        // Save current, open next
                        const nextIndex = elementIndex + 1;
                        if (nextIndex < bin.elements.length) {
                            // Next element exists
                            this.saveEdit(pageId, binId, elementIndex, true); // Skip close
                            this.app.dataManager.saveData();
                            this.app.render();
                            // Open next element editor without visible transition
                            setTimeout(() => {
                                const nextElement = bin.elements[nextIndex];
                                this.showEditModal(pageId, binId, nextIndex, nextElement);
                            }, 10);
                        } else {
                            // No next element, create new one
                            const currentElement = bin.elements[elementIndex];
                            if (currentElement) {
                                const newElement = this.app.elementManager.createElementTemplate(currentElement.type);
                                if (!bin.elements) bin.elements = [];
                                bin.elements.push(newElement);
                                this.saveEdit(pageId, binId, elementIndex, true); // Skip close
                                this.app.dataManager.saveData();
                                this.app.render();
                                // Open new element editor without visible transition
                                setTimeout(() => {
                                    this.showEditModal(pageId, binId, bin.elements.length - 1, newElement);
                                }, 10);
                            }
                        }
                    }
                    
                    nextElementMouseDownTime = 0;
                    nextElementIsHolding = false;
                    document.removeEventListener('mouseup', handleMouseUp);
                };
                
                document.addEventListener('mouseup', handleMouseUp);
            };
        };
        
        setupNextElementButton();
        
        // Set up previous element button handler
        let prevElementMouseDownTime = 0;
        let prevElementIsHolding = false;
        
        const setupPrevElementButton = () => {
            prevElementBtn.onmousedown = (e) => {
                e.preventDefault();
                e.stopPropagation();
                prevElementMouseDownTime = Date.now();
                prevElementIsHolding = false;
                
                // Check if holding after 200ms
                const holdTimer = setTimeout(() => {
                    prevElementIsHolding = true;
                }, 200);
                
                const handleMouseUp = () => {
                    clearTimeout(holdTimer);
                    const wasHolding = prevElementIsHolding;
                    const page = this.app.pages.find(p => p.id === pageId);
                    if (!page) return;
                    const bin = page.bins?.find(b => b.id === binId);
                    if (!bin) return;
                    
                    if (wasHolding) {
                        // Create new element of matching type before current
                        const currentElement = bin.elements[elementIndex];
                        if (currentElement) {
                            const newElement = this.app.elementManager.createElementTemplate(currentElement.type);
                            if (!bin.elements) bin.elements = [];
                            bin.elements.splice(elementIndex, 0, newElement);
                            this.saveEdit(pageId, binId, elementIndex + 1, true); // Skip close (elementIndex shifted)
                            this.app.dataManager.saveData();
                            this.app.render();
                            // Open new element editor without visible transition
                            setTimeout(() => {
                                this.showEditModal(pageId, binId, elementIndex, newElement);
                            }, 10);
                        }
                    } else {
                        // Save current, open previous
                        const prevIndex = elementIndex - 1;
                        if (prevIndex >= 0) {
                            // Previous element exists
                            this.saveEdit(pageId, binId, elementIndex, true); // Skip close
                            this.app.dataManager.saveData();
                            this.app.render();
                            // Open previous element editor without visible transition
                            setTimeout(() => {
                                const prevElement = bin.elements[prevIndex];
                                this.showEditModal(pageId, binId, prevIndex, prevElement);
                            }, 10);
                        } else {
                            // No previous element, create new one at start
                            const currentElement = bin.elements[elementIndex];
                            if (currentElement) {
                                const newElement = this.app.elementManager.createElementTemplate(currentElement.type);
                                if (!bin.elements) bin.elements = [];
                                bin.elements.unshift(newElement);
                                this.saveEdit(pageId, binId, elementIndex + 1, true); // Skip close (elementIndex shifted)
                                this.app.dataManager.saveData();
                                this.app.render();
                                // Open new element editor without visible transition
                                setTimeout(() => {
                                    this.showEditModal(pageId, binId, 0, newElement);
                                }, 10);
                            }
                        }
                    }
                    
                    prevElementMouseDownTime = 0;
                    prevElementIsHolding = false;
                    document.removeEventListener('mouseup', handleMouseUp);
                };
                
                document.addEventListener('mouseup', handleMouseUp);
            };
        };
        
        setupPrevElementButton();
        
        // Update close button to show it saves
        modalClose.title = 'Save and close';
        
        // Add Enter key handler to save and close modal (or advance to next if multi-edit)
        const handleEnterKey = (e) => {
            // Skip if not Enter key
            if (e.key !== 'Enter') return;
            
            const target = e.target || e.srcElement;
            
            // In textareas, allow Shift+Enter for new lines, but Enter alone saves/advances
            if (target.tagName === 'TEXTAREA') {
                if (!e.shiftKey) {
                    e.preventDefault();
                    e.stopPropagation();
                    this.handleEnterKeyAction(pageId, binId, elementIndex, handleEnterKey);
                }
                return;
            }
            
            // For all other inputs (including text inputs) and anywhere else, Enter saves/advances
            // Don't prevent if it's a button click
            if (target.tagName !== 'BUTTON') {
                e.preventDefault();
                e.stopPropagation();
                this.handleEnterKeyAction(pageId, binId, elementIndex, handleEnterKey);
            }
        };
        document.addEventListener('keydown', handleEnterKey, true); // Use capture phase to catch before inputs
        this.app.currentEnterKeyHandler = handleEnterKey;
    }
    
    handleEnterKeyAction(pageId, binId, elementIndex, handleEnterKey) {
        // Check if we're in a multi-edit session
        const multiEdit = this.app.multiEditState;
        if (multiEdit && multiEdit.pageId === pageId && multiEdit.binId === binId) {
            // Check if there's a next element to edit
            const nextIndex = elementIndex + 1;
            if (nextIndex <= multiEdit.endIndex) {
                // Save current and advance to next
                this.saveEdit(pageId, binId, elementIndex, true); // Skip close
                this.app.dataManager.saveData();
                this.app.render();
                
                // Update multi-edit state
                multiEdit.currentIndex = nextIndex;
                
                // Open next element editor
                setTimeout(() => {
                    const page = this.app.pages.find(p => p.id === pageId);
                    const bin = page?.bins?.find(b => b.id === binId);
                    if (bin && bin.elements[nextIndex]) {
                        this.showEditModal(pageId, binId, nextIndex, bin.elements[nextIndex]);
                        // Focus on the text input
                        setTimeout(() => {
                            const textInput = document.getElementById('edit-text');
                            if (textInput) {
                                textInput.focus();
                                textInput.select();
                            }
                        }, 50);
                    }
                }, 10);
                
                // Remove old handler
                document.removeEventListener('keydown', handleEnterKey, true);
                if (this.app.currentEnterKeyHandler === handleEnterKey) {
                    this.app.currentEnterKeyHandler = null;
                }
                return;
            } else {
                // Last element - clear multi-edit state and close
                this.app.multiEditState = null;
            }
        }
        
        // Normal save and close
        this.saveEdit(pageId, binId, elementIndex);
        document.removeEventListener('keydown', handleEnterKey, true);
        if (this.app.currentEnterKeyHandler === handleEnterKey) {
            this.app.currentEnterKeyHandler = null;
        }
    }
    
    addEditItem() {
        const container = document.getElementById('edit-items');
        const idx = container.children.length;
        const newItem = document.createElement('div');
        newItem.className = 'subtask-item';
        newItem.innerHTML = `
            <input type="text" class="edit-item-text" data-index="${idx}" value="New item" />
            <input type="text" class="edit-item-fun" data-index="${idx}" value="" placeholder="Fun modifier" />
            <button data-remove-item="${idx}">×</button>
        `;
        container.appendChild(newItem);
    }
    
    removeEditItem(idx) {
        const container = document.getElementById('edit-items');
        const item = container.querySelector(`.subtask-item .edit-item-text[data-index="${idx}"]`)?.closest('.subtask-item');
        if (item && container.children.length > 1) {
            item.remove();
        }
    }
    
    saveEdit(pageId, binId, elementIndex, skipClose = false) {
        const page = this.app.pages.find(p => p.id === pageId);
        if (!page) return;
        const bin = page.bins?.find(b => b.id === binId);
        if (!bin) return;
        
        const element = bin.elements[elementIndex];
        if (!element) return;
        
        // Update basic fields (only if text field exists)
        const textField = document.getElementById('edit-text');
        if (textField) {
            const oldText = element.text || '';
            let newText = textField.value.trim();
            
            // Convert markdown to HTML if user typed markdown syntax
            // Check if text contains markdown patterns but not HTML tags
            if (newText && !/<[a-z][\s\S]*>/i.test(newText)) {
                // Text doesn't contain HTML, check for markdown
                if (/\*\*.*\*\*|__.*__|\*[^*]+\*|_[^_]+_|`[^`]+`|\[.*\]\(.*\)/.test(newText)) {
                    // Contains markdown syntax - convert to HTML
                    newText = StringUtils.parseMarkdown(newText);
                }
            }
            
            if (oldText !== newText && this.app.undoRedoManager) {
                this.app.undoRedoManager.recordElementPropertyChange(pageId, binId, elementIndex, 'text', newText, oldText);
            }
            element.text = newText;
        }
        // Update plugins
        const progressCheckbox = document.getElementById('edit-plugin-progress');
        if (progressCheckbox) {
            if (progressCheckbox.checked) {
                const progressValue = document.getElementById('edit-progress-value');
                if (progressValue) {
                    element.progress = parseInt(progressValue.value) || 0;
                }
            } else {
                delete element.progress;
            }
        }
        
        const recurringCheckbox = document.getElementById('edit-plugin-recurring');
        if (recurringCheckbox) {
            if (recurringCheckbox.checked) {
                const scheduleSelect = document.getElementById('edit-recurring-schedule');
                if (scheduleSelect) {
                    element.recurringSchedule = scheduleSelect.value;
                    if (scheduleSelect.value === 'custom') {
                        const customPattern = document.getElementById('edit-recurring-custom-pattern');
                        if (customPattern) {
                            element.recurringCustomPattern = customPattern.value.trim();
                        }
                    } else {
                        delete element.recurringCustomPattern;
                    }
                }
            } else {
                delete element.recurringSchedule;
                delete element.recurringCustomPattern;
            }
        }
        
        const deadlineCheckbox = document.getElementById('edit-plugin-deadline');
        if (deadlineCheckbox) {
            if (deadlineCheckbox.checked) {
                const dateField = document.getElementById('edit-deadline-date');
                const timeField = document.getElementById('edit-deadline-time');
                if (dateField && dateField.value) {
                    const date = dateField.value;
                    const time = timeField && timeField.value ? timeField.value : '00:00';
                    element.deadline = `${date}T${time}:00`;
                } else {
                    delete element.deadline;
                }
            } else {
                delete element.deadline;
            }
        }
        
        const persistentCheckbox = document.getElementById('edit-plugin-persistent');
        if (persistentCheckbox) {
            if (persistentCheckbox.checked) {
                element.persistent = true;
            } else {
                // Only delete persistent flag if it's not an image type (images are always persistent)
                if (element.type !== 'image') {
                    delete element.persistent;
                }
            }
        }
        
        const timeCheckbox = document.getElementById('edit-plugin-time');
        if (timeCheckbox) {
            if (timeCheckbox.checked) {
                const timeField = document.getElementById('edit-time');
                if (timeField) {
                    element.timeAllocated = timeField.value.trim();
                }
            } else {
                element.timeAllocated = '';
            }
        } else {
            // Fallback if checkbox doesn't exist
            const timeField = document.getElementById('edit-time');
            if (timeField) {
                element.timeAllocated = timeField.value.trim();
            }
        }
        
        const funCheckbox = document.getElementById('edit-plugin-fun');
        if (funCheckbox) {
            if (funCheckbox.checked) {
                const funField = document.getElementById('edit-fun');
                if (funField) {
                    element.funModifier = funField.value.trim();
                }
            } else {
                element.funModifier = '';
            }
        } else {
            // Fallback if checkbox doesn't exist
            const funField = document.getElementById('edit-fun');
            if (funField) {
                element.funModifier = funField.value.trim();
            }
        }
        
        const repeatsCheckbox = document.getElementById('edit-plugin-repeats');
        if (repeatsCheckbox) {
            element.repeats = repeatsCheckbox.checked;
        } else {
            // Fallback if checkbox doesn't exist (for header-checkbox)
            element.repeats = true; // Default
        }
        
        // Update items for multi-checkbox (preserve completion states)
        if (element.type === 'multi-checkbox') {
            const itemInputs = document.querySelectorAll('.edit-item-text');
            const itemFunInputs = document.querySelectorAll('.edit-item-fun');
            const oldItems = [...(element.items || [])];
            
            element.items = [];
            itemInputs.forEach((input) => {
                const idx = parseInt(input.dataset.index);
                const oldItem = oldItems[idx];
                const funInput = Array.from(itemFunInputs).find(f => f.dataset.index === input.dataset.index);
                element.items.push({
                    text: input.value.trim() || 'Item',
                    completed: oldItem ? oldItem.completed : false,
                    funModifier: funInput ? funInput.value.trim() : ''
                });
            });
        }
        
        // Update counter-specific fields
        if (element.type === 'counter') {
            const valueField = document.getElementById('edit-counter-value');
            const increment5Field = document.getElementById('edit-counter-increment5');
            const customField = document.getElementById('edit-counter-custom');
            if (valueField) element.value = parseInt(valueField.value) || 0;
            if (increment5Field) element.increment5 = parseInt(increment5Field.value) || 5;
            if (customField) element.customIncrement = parseInt(customField.value) || 10;
        }
        
        // Update tracker-specific fields
        if (element.type === 'tracker') {
            const modeRadios = document.querySelectorAll(`input[name="tracker-mode-${pageId}-${elementIndex}"]`);
            modeRadios.forEach(radio => {
                if (radio.checked) {
                    element.mode = radio.value;
                }
            });
        }
        
        // Update rating-specific fields
        if (element.type === 'rating') {
            const starsField = document.getElementById('edit-rating-stars');
            const reviewField = document.getElementById('edit-rating-review');
            if (starsField) element.rating = parseInt(starsField.value) || 0;
            if (reviewField) element.review = reviewField.value.trim();
        }

        // Update timer-specific fields
        if (element.type === 'timer') {
            const durationField = document.getElementById('edit-timer-duration');
            const alarmField = document.getElementById('edit-timer-alarm');
            if (durationField) element.duration = parseInt(durationField.value) || 3600;
            if (alarmField) element.alarmSound = alarmField.value || null;
        }
        
        // Update calendar-specific fields
        if (element.type === 'calendar') {
            const displayModeSelect = document.getElementById('edit-calendar-display-mode');
            if (displayModeSelect) {
                element.displayMode = displayModeSelect.value;
            }
            
            const targetingRadios = document.querySelectorAll(`input[name="calendar-targeting-${pageId}-${elementIndex}"]`);
            targetingRadios.forEach(radio => {
                if (radio.checked) {
                    element.targetingMode = radio.value;
                }
            });
            
            // Update target pages
            if (element.targetingMode === 'specific') {
                const pageSelects = document.querySelectorAll('.calendar-target-page');
                element.targetPages = Array.from(pageSelects).map(select => select.value);
            } else {
                element.targetPages = [];
            }
            
            // Target tags are handled by event listeners (see calendar modal setup)
        }
        
        // Update tags (tags are handled by event listeners, but ensure they're saved)
        // Tags are already updated via event listeners, just ensure they're normalized
        if (element.tags && Array.isArray(element.tags)) {
            element.tags = element.tags.map(tag => tag.trim().toLowerCase()).filter(tag => tag);
            if (this.app.tagManager) {
                element.tags.forEach(tag => this.app.tagManager.addTag(tag));
            }
        }
        
        // Update custom properties
        const propertyItems = document.querySelectorAll('.custom-property-item');
        if (propertyItems.length > 0) {
            if (!element.customProperties) element.customProperties = {};
            const newProperties = {};
            propertyItems.forEach(item => {
                const keyInput = item.querySelector('.custom-property-key');
                const valueInput = item.querySelector('.custom-property-value');
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
        
        this.app.dataManager.saveData();
        if (!skipClose) {
        this.closeModal();
        }
        this.app.render();
    }
    
    addEditChildModal() {
        const container = document.getElementById('edit-children-in-modal');
        if (!container) return;
        const idx = container.children.length;
        const newChild = document.createElement('div');
        newChild.className = 'subtask-item';
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
        const container = document.getElementById('edit-children-in-modal');
        if (!container) return;
        const item = container.querySelector(`.edit-child-text-modal[data-index="${idx}"]`)?.closest('.subtask-item');
        if (item) {
            item.remove();
            // Update data-index for remaining items
            Array.from(container.children).forEach((child, index) => {
                const textInput = child.querySelector('.edit-child-text-modal');
                const timeInput = child.querySelector('.edit-child-time-modal');
                const repeatInput = child.querySelector('.edit-child-repeats-modal');
                if (textInput) textInput.dataset.index = index;
                if (timeInput) timeInput.dataset.index = index;
                if (repeatInput) repeatInput.dataset.index = index;
                const removeBtn = child.querySelector('button');
                if (removeBtn) {
                    removeBtn.onclick = () => app.modalHandler.removeEditChildModal(index);
                }
            });
        }
    }
    
    removeAllChildrenModal() {
        if (confirm('Remove all children?')) {
            const container = document.getElementById('edit-children-in-modal');
            if (container) {
                container.innerHTML = '';
            }
        }
    }
    
    toggleArchiveViewInEdit(pageId, binId, elementIndex) {
        const archiveView = document.getElementById(`archive-view-edit-${pageId}-${elementIndex}`);
        if (!archiveView) return;
        
        if (archiveView.style.display === 'none') {
            const archived = this.app.dataManager.getArchivedRecordings(pageId, elementIndex);
            if (archived.length === 0) {
                archiveView.innerHTML = '<div style="padding: 10px; color: #888;">No archived recordings</div>';
            } else {
                let html = '<div style="padding: 10px;"><strong>Archived Recordings:</strong><ul style="margin-top: 10px; padding-left: 20px;">';
                archived.forEach(entry => {
                    html += `<li style="margin: 5px 0;"><button onclick="window.app && window.app.dataManager && window.app.dataManager.playArchivedAudio('${entry.filename}')" style="background: #4a9eff; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; margin-right: 8px;">Play</button>${entry.date} - ${entry.filename}</li>`;
                });
                html += '</ul></div>';
                archiveView.innerHTML = html;
            }
            archiveView.style.display = 'block';
        } else {
            archiveView.style.display = 'none';
        }
    }
    
    async overwriteAudioRecording(pageId, binId, elementIndex) {
        // Close the modal first
        this.closeModal();
        
        // Get the element to determine the correct audioElementIndex
        const page = this.app.pages.find(p => p.id === pageId);
        if (!page) return;
        const bin = page.bins?.find(b => b.id === binId);
        if (!bin) return;
        
        const element = bin.elements[elementIndex];
        if (!element || !element.audioFile) {
            alert('No existing recording to overwrite.');
            return;
        }
        
        // Handle nested children - elementIndex might be a string like "0-1"
        let audioElementIndex = elementIndex;
        if (typeof elementIndex === 'string' && elementIndex.includes('-')) {
            const parts = elementIndex.split('-');
            audioElementIndex = parseInt(parts[0]);
        } else {
            audioElementIndex = parseInt(elementIndex);
        }
        
        // Start recording with overwrite flag
        await this.app.startInlineRecording(pageId, binId, audioElementIndex, elementIndex, true);
        this.app.render(); // Re-render to update UI
    }
    
    showEditBinModal(pageId, binId) {
        const modal = document.getElementById('modal');
        const modalBody = document.getElementById('modal-body');
        
        const page = this.app.pages.find(p => p.id === pageId);
        if (!page) return;
        const bin = page.bins?.find(b => b.id === binId);
        if (!bin) return;
        
        let html = `
            <h3>Edit Bin</h3>
            <div style="margin-bottom: 15px;">
                <label>Bin Title:</label>
                <input type="text" id="edit-bin-title" value="${this.escapeHtml(bin.title || '')}" style="width: 100%; padding: 8px; margin-top: 5px;" />
            </div>
            <div style="margin-bottom: 15px;">
                <label>Max Height (px):</label>
                <input type="number" id="edit-bin-max-height" value="${bin.maxHeight || ''}" placeholder="Leave empty for no limit" min="0" style="width: 100%; padding: 8px; margin-top: 5px;" />
                <small style="color: #888; display: block; margin-top: 5px;">If set, the bin will be scrollable when content exceeds this height.</small>
            </div>
        `;
        
        // Bin Plugins Section
        if (this.app.binPluginManager) {
            const allPlugins = this.app.binPluginManager.getAvailablePlugins();
            const enabledPlugins = this.app.binPluginManager.getBinPlugins(pageId, binId);
            const enabledPluginIds = new Set(enabledPlugins.map(p => p.id));
            
            if (allPlugins.length > 0) {
                html += `
                    <div style="margin-top: 20px; padding: 15px; background: #2a2a2a; border-radius: 4px; border: 1px solid #444;">
                        <label style="font-weight: 600; margin-bottom: 10px; display: block;">Bin Plugins:</label>
                        <div style="display: flex; align-items: center; gap: 20px; flex-wrap: wrap;">
                `;
                
                allPlugins.forEach(plugin => {
                    const isEnabled = enabledPluginIds.has(plugin.id);
                    html += `
                        <label style="display: flex; align-items: center; gap: 10px; margin: 0;">
                            <input type="checkbox" class="bin-plugin-checkbox" data-plugin-id="${plugin.id}" ${isEnabled ? 'checked' : ''} style="width: 18px; height: 18px; margin: 0;" />
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
        modal.classList.add('active');
        
        // Add event listeners for plugin checkboxes
        modalBody.querySelectorAll('.bin-plugin-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', async (e) => {
                const pluginId = e.target.dataset.pluginId;
                if (e.target.checked) {
                    await this.app.binPluginManager.enablePlugin(pageId, binId, pluginId);
                } else {
                    await this.app.binPluginManager.disablePlugin(pageId, binId, pluginId);
                }
                this.app.render();
            });
        });
    }
    
    showEditPageModal(pageId) {
        const modal = document.getElementById('modal');
        const modalBody = document.getElementById('modal-body');
        
        const page = this.app.pages.find(p => p.id === pageId);
        if (!page) return;
        
        let html = `
            <h3>Edit Page</h3>
            <div style="margin-bottom: 15px;">
                <label>Page Title:</label>
                <input type="text" id="edit-page-title" value="${this.escapeHtml(page.title || '')}" style="width: 100%; padding: 8px; margin-top: 5px;" />
            </div>
        `;
        
        // Format Renderer Section
        if (this.app.formatRendererManager) {
            const allFormats = this.app.formatRendererManager.getAllFormats();
            const currentFormat = this.app.formatRendererManager.getPageFormat(pageId);
            
            // Filter to only show default, grid, horizontal, and document formats
            // Order: Grid Layout, Horizontal Layout, Document View (to match expected order)
            const allowedFormats = ['grid-layout-format', 'horizontal-layout-format', 'document-view-format'];
            const filteredFormats = allFormats.filter(format => {
                const formatName = format.formatName || format.id;
                return allowedFormats.includes(formatName);
            }).sort((a, b) => {
                // Sort to ensure consistent order: Grid Layout, Horizontal Layout, Document View
                const aName = a.formatName || a.id;
                const bName = b.formatName || b.id;
                const order = ['grid-layout-format', 'horizontal-layout-format', 'document-view-format'];
                const aIndex = order.indexOf(aName);
                const bIndex = order.indexOf(bName);
                return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
            });
            
            html += `
                <div style="margin-top: 20px; padding: 15px; background: #1a1a1a; border-radius: 4px;">
                    <label style="font-weight: 600; display: block; margin-bottom: 10px;">Page Format:</label>
                    <select id="page-format-select" style="width: 100%; padding: 8px; margin-top: 5px;">
                        <option value="">Default Format (Vertical)</option>
            `;
            
            filteredFormats.forEach(format => {
                const formatName = format.formatName || format.id;
                const selected = currentFormat === formatName ? 'selected' : '';
                html += `<option value="${formatName}" ${selected}>${this.escapeHtml(format.name || formatName)}</option>`;
            });
            
            html += `
                    </select>
                </div>
            `;
            
            // Grid Layout Configuration (always include, show/hide based on selection)
            const gridConfig = page.formatConfig?.grid || {};
            const showGridConfig = currentFormat === 'grid-layout-format';
            html += `
                <div id="grid-layout-config" style="margin-top: 15px; padding: 15px; background: #2a2a2a; border-radius: 4px; border: 1px solid #444; display: ${showGridConfig ? 'block' : 'none'};">
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
                            <input type="number" id="grid-max-height" value="${gridConfig.maxHeight || ''}" min="0" step="50" placeholder="Leave empty for no limit" style="width: 100%; padding: 8px; background: #1a1a1a; color: #e0e0e0; border: 1px solid #555; border-radius: 4px;" />
                            <small style="color: #888; font-size: 12px;">Maximum height of grid container (becomes scrollable if exceeded)</small>
                        </div>
                    </div>
                </div>
            `;
        }
        
        // Page Plugins Section
        if (this.app.pagePluginManager) {
            const allPlugins = this.app.pagePluginManager.getAvailablePlugins();
            const enabledPlugins = this.app.pagePluginManager.getPagePlugins(pageId);
            const enabledPluginIds = new Set(enabledPlugins.map(p => p.id));
            
            if (allPlugins.length > 0) {
                html += `
                    <div style="margin-top: 20px; padding: 15px; background: #2a2a2a; border-radius: 4px; border: 1px solid #444;">
                        <label style="font-weight: 600; margin-bottom: 10px; display: block;">Page Plugins:</label>
                        <div style="display: flex; align-items: center; gap: 20px; flex-wrap: wrap;">
                `;
                
                allPlugins.forEach(plugin => {
                    const isEnabled = enabledPluginIds.has(plugin.id);
                    html += `
                        <label style="display: flex; align-items: center; gap: 10px; margin: 0;">
                            <input type="checkbox" class="page-plugin-checkbox" data-plugin-id="${plugin.id}" ${isEnabled ? 'checked' : ''} style="width: 18px; height: 18px; margin: 0;" />
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
                <button onclick="app.savePageEdit('${pageId}')">Save</button>
                <button class="cancel" onclick="app.closeModal()">Cancel</button>
            </div>
        `;
        
        modalBody.innerHTML = html;
        modal.classList.add('active');
        
        // Add event listener for format selector
        const formatSelect = modalBody.querySelector('#page-format-select');
        if (formatSelect) {
            const updateGridConfigVisibility = () => {
                const gridConfigDiv = modalBody.querySelector('#grid-layout-config');
                if (gridConfigDiv) {
                    gridConfigDiv.style.display = formatSelect.value === 'grid-layout-format' ? 'block' : 'none';
                }
            };
            
            // Initial visibility
            updateGridConfigVisibility();
            
            formatSelect.addEventListener('change', async (e) => {
                const formatName = e.target.value || null;
                if (formatName) {
                    await this.app.formatRendererManager.setPageFormat(pageId, formatName);
                } else {
                    // Clear format (use default) - use the proper method to clear from activeFormats too
                    this.app.formatRendererManager.clearPageFormat(pageId);
                }
                // Update grid config visibility
                updateGridConfigVisibility();
                // Close modal to show format change immediately
                this.closeModal();
            });
        }
        
        // Add event listeners for plugin checkboxes
        modalBody.querySelectorAll('.page-plugin-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', async (e) => {
                const pluginId = e.target.dataset.pluginId;
                if (e.target.checked) {
                    await this.app.pagePluginManager.enablePlugin(pageId, pluginId);
                } else {
                    await this.app.pagePluginManager.disablePlugin(pageId, pluginId);
                }
                this.app.render();
            });
        });
    }
}


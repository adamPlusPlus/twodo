// TouchGestureHandlers.js - Handles touch gesture events
import { getService, SERVICES } from '../core/AppServices.js';

export class TouchGestureHandlers {
    constructor() {
        // No constructor needed
    }
    
    /**
     * Setup touch gesture handlers
     */
    setupTouchGestures() {
        const touchGestureHandler = getService(SERVICES.TOUCH_GESTURE_HANDLER);
        if (touchGestureHandler) {
            touchGestureHandler.setupTouchGestures();
            
            // Swipe gesture handlers for mobile
            touchGestureHandler.setupSwipeGestures();
        }
    }
}

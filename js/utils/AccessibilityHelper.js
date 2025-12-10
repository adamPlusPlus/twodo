// AccessibilityHelper.js - Accessibility utilities
export class AccessibilityHelper {
    constructor() {
        this.announcements = [];
    }
    
    /**
     * Announce to screen readers
     */
    announce(message, priority = 'polite') {
        const announcement = document.createElement('div');
        announcement.setAttribute('role', 'alert');
        announcement.setAttribute('aria-live', priority);
        announcement.setAttribute('aria-atomic', 'true');
        announcement.className = 'sr-only';
        announcement.style.cssText = 'position: absolute; left: -10000px; width: 1px; height: 1px; overflow: hidden;';
        announcement.textContent = message;
        
        document.body.appendChild(announcement);
        
        setTimeout(() => {
            document.body.removeChild(announcement);
        }, 1000);
    }
    
    /**
     * Add ARIA labels to elements
     */
    addAriaLabel(element, label) {
        if (element) {
            element.setAttribute('aria-label', label);
        }
    }
    
    /**
     * Make element focusable
     */
    makeFocusable(element) {
        if (element && !element.hasAttribute('tabindex')) {
            element.setAttribute('tabindex', '0');
        }
    }
    
    /**
     * Add keyboard navigation
     */
    addKeyboardNavigation(container, selector = 'button, a, [tabindex="0"]') {
        const focusableElements = container.querySelectorAll(selector);
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        
        container.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                if (e.shiftKey && document.activeElement === firstElement) {
                    e.preventDefault();
                    lastElement.focus();
                } else if (!e.shiftKey && document.activeElement === lastElement) {
                    e.preventDefault();
                    firstElement.focus();
                }
            }
        });
    }
    
    /**
     * Add skip link
     */
    addSkipLink(targetId, label = 'Skip to main content') {
        const skipLink = document.createElement('a');
        skipLink.href = `#${targetId}`;
        skipLink.textContent = label;
        skipLink.className = 'skip-link';
        skipLink.style.cssText = `
            position: absolute;
            top: -40px;
            left: 0;
            background: #4a9eff;
            color: white;
            padding: 8px;
            text-decoration: none;
            z-index: 10000;
        `;
        
        skipLink.addEventListener('focus', () => {
            skipLink.style.top = '0';
        });
        
        skipLink.addEventListener('blur', () => {
            skipLink.style.top = '-40px';
        });
        
        document.body.insertBefore(skipLink, document.body.firstChild);
    }
    
    /**
     * Ensure proper heading hierarchy
     */
    validateHeadingHierarchy(container) {
        const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
        let previousLevel = 0;
        
        headings.forEach(heading => {
            const level = parseInt(heading.tagName.charAt(1));
            if (level > previousLevel + 1) {
                console.warn(`Heading hierarchy issue: ${heading.tagName} follows h${previousLevel}`);
            }
            previousLevel = level;
        });
    }
    
    /**
     * Add focus trap to modal
     */
    trapFocus(modal) {
        const focusableElements = modal.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        
        const handleTab = (e) => {
            if (e.key !== 'Tab') return;
            
            if (e.shiftKey) {
                if (document.activeElement === firstElement) {
                    e.preventDefault();
                    lastElement.focus();
                }
            } else {
                if (document.activeElement === lastElement) {
                    e.preventDefault();
                    firstElement.focus();
                }
            }
        };
        
        modal.addEventListener('keydown', handleTab);
        
        // Focus first element
        if (firstElement) {
            firstElement.focus();
        }
        
        return () => {
            modal.removeEventListener('keydown', handleTab);
        };
    }
}


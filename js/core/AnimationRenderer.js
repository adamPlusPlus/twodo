// AnimationRenderer.js - Handles animation of element movements
// Extracted from app.js to improve modularity
import { eventBus } from './EventBus.js';
import { EVENTS } from './AppEvents.js';

/**
 * AnimationRenderer - Handles animation of element movements
 * 
 * This class extracts animation logic from app.js to improve modularity.
 */
export class AnimationRenderer {
    constructor(app) {
        this.app = app;
    }
    
    animateMovements(oldPositions) {
        console.log('═══════════════════════════════════════════════════════════');
        console.log('🎬 ANIMATION SEQUENCE STARTING');
        console.log('═══════════════════════════════════════════════════════════');
        console.log('📊 Old positions captured:', {
            pages: Object.keys(oldPositions.pages || {}).length,
            elements: Object.keys(oldPositions.elements || {}).length
        });
        const binCount = document.querySelectorAll('.bin').length;
        const elementCount = document.querySelectorAll('.element').length;
        console.log(`📦 Current DOM: ${binCount} bins, ${elementCount} elements`);
        
        if (this.app.appState.lastMovedElement) {
            console.log('🎯 Element being moved:', {
                pageId: this.app.appState.lastMovedElement.pageId,
                elementIndex: this.app.appState.lastMovedElement.elementIndex,
                elementText: this.app.appState.lastMovedElement.element?.text?.substring(0, 30) || 'N/A'
            });
        } else {
            console.log('⚠️  No lastMovedElement tracked - this might be initial render');
        }
        
        // Animate pages
        let pageAnimations = 0;
        document.querySelectorAll('.page').forEach(pageEl => {
            const pageId = pageEl.dataset.pageId;
            if (!pageId) return;
            
            const oldPos = oldPositions.pages[pageId];
            if (!oldPos) {
                console.log(`📄 Page ${pageId}: New page, skipping animation`);
                return; // New page, no animation needed
            }
            
            const newRect = pageEl.getBoundingClientRect();
            const deltaY = oldPos.top - newRect.top;
            const deltaX = oldPos.left - newRect.left;
            
            if (Math.abs(deltaY) > 1 || Math.abs(deltaX) > 1) {
                pageAnimations++;
                console.log(`📄 Page ${pageId}: Animating (deltaY: ${deltaY.toFixed(2)}px, deltaX: ${deltaX.toFixed(2)}px)`);
                // Pages just slide smoothly - no pop effects
                pageEl.style.transition = 'transform 2.5s ease-out';
                pageEl.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
                
                // Force reflow to ensure the transform is applied
                void pageEl.offsetHeight;
                
                // Wait for next frame, then remove transform to trigger CSS transition
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        // Now remove transform - this should trigger the transition
                        pageEl.style.transform = '';
                        
                        // Clean up inline styles after animation completes
                        setTimeout(() => {
                            pageEl.style.transition = '';
                            pageEl.style.transform = '';
                        }, 2500);
                    });
                });
            }
        });
        
        // Animate elements - match by content/text since indices change
        let elementAnimations = 0;
        let movingElementFound = false;
        document.querySelectorAll('.element').forEach(elementEl => {
            const pageId = elementEl.dataset.pageId;
            const elementIndex = elementEl.dataset.elementIndex;
            if (!pageId || elementIndex === undefined) return;
            
            // Try to find matching old position by text content
            const textEl = elementEl.querySelector('.task-text, .header-text, .audio-status');
            let oldPos = null;
            let matchMethod = 'none';
            
            if (textEl) {
                const text = (textEl.textContent || textEl.innerText || '').substring(0, 20);
                // Search for matching element in old positions
                for (const [key, pos] of Object.entries(oldPositions.elements)) {
                    if (pos.pageId === pageId && key.includes(text)) {
                        oldPos = pos;
                        matchMethod = 'text-content';
                        break;
                    }
                }
            }
            
            // Fallback: try exact index match
            if (!oldPos) {
                const key = `${pageId}-${elementIndex}`;
                oldPos = oldPositions.elements[key];
                if (oldPos) matchMethod = 'index';
            }
            
            if (!oldPos) {
                console.log(`🔹 Element ${pageId}-${elementIndex}: New element, skipping animation`);
                return; // New element, no animation needed
            }
            
            const newRect = elementEl.getBoundingClientRect();
            let deltaY = oldPos.top - newRect.top;
            let deltaX = oldPos.left - newRect.left;
            
            // Debug logging for position calculations
            if (Math.abs(deltaX) > 10) {
                console.log(`   🔍 Position debug for ${pageId}-${elementIndex}:`);
                console.log(`      Old: left=${oldPos.left.toFixed(2)}, top=${oldPos.top.toFixed(2)}`);
                console.log(`      New: left=${newRect.left.toFixed(2)}, top=${newRect.top.toFixed(2)}`);
                console.log(`      Delta: deltaX=${deltaX.toFixed(2)}, deltaY=${deltaY.toFixed(2)}`);
            }
            
            if (Math.abs(deltaY) > 1 || Math.abs(deltaX) > 1) {
                elementAnimations++;
                
                // Check if this is the element that was just moved
                // Use more precise matching: check both new position AND old position
                let isMovingElement = false;
                if (this.app.appState.lastMovedElement) {
                    const currentIsChild = elementEl.dataset.isChild === 'true';
                    const currentChildIndex = elementEl.dataset.childIndex;
                    const trackedWasChild = this.app.appState.lastMovedElement.oldElementIndex !== null && 
                        typeof this.app.appState.lastMovedElement.oldElementIndex === 'string' && 
                        this.app.appState.lastMovedElement.oldElementIndex.includes('-');
                    
                    // Check if new position matches
                    const newIndexMatch = this.app.appState.lastMovedElement.pageId === pageId && 
                        this.app.appState.lastMovedElement.elementIndex === parseInt(elementIndex);
                    
                    // Check if this is a child element - if so, it can't be the moving element unless the moved element was also a child
                    if (currentIsChild && !trackedWasChild) {
                        // This is a nested child, but the moved element was not a child - skip
                        if (newIndexMatch) {
                            console.log(`   ⚠️  Index match but element is nested child (not the moved element)`);
                        }
                    } else {
                        // Get element text for verification
                        const currentText = textEl ? (textEl.textContent || textEl.innerText || '').trim().substring(0, 50) : '';
                        const trackedText = (this.app.appState.lastMovedElement.element?.text || '').trim().substring(0, 50);
                        const textMatch = currentText === trackedText && currentText.length > 0;
                        
                        // If we have a directly captured old position, use it instead of the matched one
                        if (this.app.appState.lastMovedElement.oldPosition && newIndexMatch && textMatch) {
                            // Use the directly captured position - this is more accurate
                            deltaY = this.app.appState.lastMovedElement.oldPosition.top - newRect.top;
                            deltaX = this.app.appState.lastMovedElement.oldPosition.left - newRect.left;
                            
                            // Match if: new position matches AND text matches AND has significant movement
                            isMovingElement = newIndexMatch && textMatch && Math.abs(deltaY) > 10;
                            
                            if (isMovingElement) {
                                console.log(`   ✅ Using directly captured old position: (${this.app.appState.lastMovedElement.oldPosition.left.toFixed(2)}, ${this.app.appState.lastMovedElement.oldPosition.top.toFixed(2)})`);
                            }
                        } else {
                            // Match if: new position matches AND text matches AND has significant movement
                            // This ensures we only match the actual moved element, not its children or other elements
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
                    console.log(`   📝 Text: ${textEl ? (textEl.textContent || textEl.innerText || '').substring(0, 40) : 'N/A'}`);
                } else {
                    console.log(`⬇️  DISPLACED ELEMENT ${pageId}-${elementIndex}:`);
                    console.log(`   📍 Position change: deltaY=${deltaY.toFixed(2)}px, deltaX=${deltaX.toFixed(2)}px`);
                    console.log(`   🔍 Matched by: ${matchMethod}`);
                }
                
                if (isMovingElement) {
                    // This is the element being moved - sequence: pop-out -> slide -> pop-in
                    // Step 1: Start at old position (invert the delta) and pop out (scale up on z-axis only)
                    // deltaY = oldPos.top - newRect.top, so positive means moved UP
                    // To invert: translate DOWN by deltaY to appear at old position
                    console.log(`   🎬 Step 1: Starting at old position, POP-OUT (scale 1.15, z-index 1000)`);
                    console.log(`   🔍 Transform: translate(${deltaX.toFixed(2)}px, ${deltaY.toFixed(2)}px) scale(1.15)`);
                    console.log(`   📊 Old pos: (${oldPos.left.toFixed(2)}, ${oldPos.top.toFixed(2)}), New pos: (${newRect.left.toFixed(2)}, ${newRect.top.toFixed(2)})`);
                    elementEl.style.transition = 'transform 0s, scale 0.3s ease-out, z-index 0s';
                    elementEl.style.zIndex = '1000';
                    // Invert the delta to start at old position, scale up for pop-out
                    elementEl.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(1.15)`;
                    void elementEl.offsetHeight;
                    
                    // Step 2: After pop-out, slide to new position (remove translate, keep scale)
                    setTimeout(() => {
                        console.log(`   🎬 Step 2: POP-OUT complete, SLIDE to new position (scale 1.0)`);
                        elementEl.style.transition = 'transform 2.5s ease-out, scale 0.3s ease-out';
                        // Remove translate (goes to natural new position), scale back to 1.0
                        elementEl.style.transform = 'scale(1.0)';
                        void elementEl.offsetHeight;
                        
                        // Step 3: After slide completes, pop in (slight scale down)
                        setTimeout(() => {
                            console.log(`   🎬 Step 3: SLIDE complete, POP-IN (scale 1.05 -> 1.0)`);
                            elementEl.style.transition = 'scale 0.2s ease-out, z-index 0s 0.2s';
                            elementEl.style.transform = 'scale(1.05)';
                            void elementEl.offsetHeight;
                            
                            requestAnimationFrame(() => {
                                elementEl.style.transform = 'scale(1.0)';
                                setTimeout(() => {
                                    console.log(`   ✅ Step 4: POP-IN complete, animation finished`);
                                    elementEl.style.zIndex = '';
                                    elementEl.style.transition = '';
                                    elementEl.style.transform = '';
                                    this.app.appState.lastMovedElement = null; // Clear after animation
                                }, 200);
                            });
                        }, 2500);
                    }, 300);
                } else {
                    // This is a displaced element - slide to make space
                    // Use FLIP: invert the delta, then remove transform to animate
                    // deltaY = oldPos.top - newRect.top, so positive means moved UP
                    // To invert: translate DOWN by deltaY to appear at old position
                    console.log(`   🎬 Starting DISPLACE animation (2.5s slide)`);
                    elementEl.style.transition = 'transform 2.5s ease-out';
                    // Invert the delta to start at old position
                    elementEl.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
                    void elementEl.offsetHeight;
                    
                    // Remove transform to trigger slide to new position
                    requestAnimationFrame(() => {
                        requestAnimationFrame(() => {
                            console.log(`   🎬 DISPLACE animation triggered (removing transform)`);
                            elementEl.style.transform = '';
                            
                            // Clean up after animation
                            setTimeout(() => {
                                console.log(`   ✅ DISPLACE animation complete`);
                                elementEl.style.transition = '';
                                elementEl.style.transform = '';
                            }, 2500);
                        });
                    });
                }
            }
        });
        
        console.log('═══════════════════════════════════════════════════════════');
        console.log(`📊 Animation Summary:`);
        console.log(`   📄 Pages animating: ${pageAnimations}`);
        console.log(`   🔹 Elements animating: ${elementAnimations}`);
        console.log(`   🎯 Moving element found: ${movingElementFound ? 'YES ✅' : 'NO ⚠️'}`);
        if (this.app.appState.lastMovedElement && !movingElementFound) {
            console.log(`   ⚠️  WARNING: lastMovedElement was set but not found in DOM!`);
            console.log(`      Expected: ${this.app.appState.lastMovedElement.pageId}-${this.app.appState.lastMovedElement.elementIndex}`);
        }
        console.log('═══════════════════════════════════════════════════════════');
    }

}

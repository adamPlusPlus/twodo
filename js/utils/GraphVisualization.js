// GraphVisualization.js - Shared utilities for graph-based format views
import { EventHelper } from './EventHelper.js';

export class GraphVisualization {
    /**
     * Build graph from page elements and relationships
     * @param {Object} page - Page data
     * @param {Object} app - App instance
     * @param {Array<string>} relationshipTypes - Optional filter for relationship types
     * @returns {Object} Graph structure
     */
    static buildGraph(page, app, relationshipTypes = null) {
        const nodes = [];
        const edges = [];
        const nodeMap = new Map();
        
        // Create nodes from elements
        if (page.groups && page.groups.length > 0) {
            page.groups.forEach((bin, binIndex) => {
                const items = bin.items || [];
                bin.items = items;
                if (items.length > 0) {
                    items.forEach((element, elIndex) => {
                        const nodeId = `${page.id}:${bin.id}:${elIndex}`;
                        const node = {
                            id: nodeId,
                            element: element,
                            pageId: page.id,
                            binId: bin.id,
                            elementIndex: elIndex,
                            label: element.text || `Element ${elIndex}`,
                            type: element.type || 'task',
                            x: 0,
                            y: 0
                        };
                        nodes.push(node);
                        nodeMap.set(nodeId, node);
                    });
                }
            });
        }
        
        // Create edges from relationships
        if (app.relationshipManager) {
            nodes.forEach(node => {
                const elementId = app.relationshipManager.getElementId(node.pageId, node.binId, node.elementIndex);
                if (elementId) {
                    const relationships = app.relationshipManager.getRelationships(elementId);
                    relationships
                        .filter(rel => !relationshipTypes || relationshipTypes.includes(rel.type))
                        .forEach(rel => {
                            edges.push({
                                from: node.id,
                                to: rel.to,
                                type: rel.type,
                                label: app.relationshipManager.getRelationshipTypeMetadata(rel.type)?.label || rel.type
                            });
                        });
                }
            });
        }
        
        return { nodes, edges, nodeMap };
    }
    
    /**
     * Setup zoom and pan for a container
     * @param {HTMLElement} container - Container element
     * @param {SVGElement} svg - SVG element
     * @param {HTMLElement} nodesContainer - Nodes container
     * @param {Function} onTransform - Optional callback on transform
     */
    static setupZoomPan(container, svg, nodesContainer, onTransform = null) {
        let scale = 1;
        let panX = 0;
        let panY = 0;
        let isDragging = false;
        let dragStart = { x: 0, y: 0 };
        
        const updateTransform = () => {
            const transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
            svg.style.transform = transform;
            svg.style.transformOrigin = '0 0';
            nodesContainer.style.transform = transform;
            nodesContainer.style.transformOrigin = '0 0';
            if (onTransform) onTransform(scale, panX, panY);
        };
        
        // Mouse wheel zoom
        container.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            scale = Math.max(0.5, Math.min(3, scale * delta));
            updateTransform();
        });
        
        // Mouse drag pan (only if not dragging a node)
        container.addEventListener('mousedown', (e) => {
            // Don't pan if clicking on a node
            if (e.target.closest('.graph-node')) {
                return;
            }
            
            if (e.target === container || e.target === svg || e.target.tagName === 'line' || e.target.tagName === 'text') {
                isDragging = true;
                dragStart = { x: e.clientX - panX, y: e.clientY - panY };
                container.style.cursor = 'grabbing';
            }
        });
        
        container.addEventListener('mousemove', (e) => {
            if (isDragging) {
                panX = e.clientX - dragStart.x;
                panY = e.clientY - dragStart.y;
                updateTransform();
            }
        });
        
        container.addEventListener('mouseup', () => {
            isDragging = false;
            container.style.cursor = 'default';
        });
        
        container.addEventListener('mouseleave', () => {
            isDragging = false;
            container.style.cursor = 'default';
        });
        
        return { scale, panX, panY, updateTransform };
    }
    
    /**
     * Render edges in SVG
     * @param {SVGElement} svg - SVG element
     * @param {Object} graph - Graph structure
     * @param {Object} options - Rendering options
     */
    static renderEdges(svg, graph, options = {}) {
        const { edges, nodeMap } = graph;
        const {
            color = 'rgba(74, 158, 255, 0.5)',
            strokeWidth = 2,
            showArrows = true,
            showLabels = false,
            colorMap = {}
        } = options;
        
        // Clear existing edges
        const existingEdges = svg.querySelectorAll('.graph-edge');
        existingEdges.forEach(edge => edge.remove());
        
        // Add arrow marker if needed
        if (showArrows && !svg.querySelector('#arrowhead')) {
            const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
            const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
            marker.setAttribute('id', 'arrowhead');
            marker.setAttribute('markerWidth', '10');
            marker.setAttribute('markerHeight', '10');
            marker.setAttribute('refX', '9');
            marker.setAttribute('refY', '3');
            marker.setAttribute('orient', 'auto');
            const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
            polygon.setAttribute('points', '0 0, 10 3, 0 6');
            polygon.setAttribute('fill', color);
            marker.appendChild(polygon);
            defs.appendChild(marker);
            svg.appendChild(defs);
        }
        
        edges.forEach(edge => {
            const fromNode = nodeMap.get(edge.from);
            const toNode = nodeMap.get(edge.to);
            
            if (!fromNode || !toNode) return;
            
            const edgeColor = colorMap[edge.type] || color;
            
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.className = 'graph-edge';
            line.setAttribute('x1', fromNode.x);
            line.setAttribute('y1', fromNode.y);
            line.setAttribute('x2', toNode.x);
            line.setAttribute('y2', toNode.y);
            line.setAttribute('stroke', edgeColor);
            line.setAttribute('stroke-width', strokeWidth);
            if (showArrows) {
                line.setAttribute('marker-end', 'url(#arrowhead)');
            }
            line.style.pointerEvents = 'none';
            
            svg.appendChild(line);
            
            // Add label if requested
            if (showLabels && edge.label) {
                const midX = (fromNode.x + toNode.x) / 2;
                const midY = (fromNode.y + toNode.y) / 2;
                const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                text.className = 'graph-edge-label';
                text.setAttribute('x', midX);
                text.setAttribute('y', midY - 5);
                text.setAttribute('fill', edgeColor);
                text.setAttribute('font-size', '12px');
                text.setAttribute('text-anchor', 'middle');
                text.textContent = edge.label;
                svg.appendChild(text);
            }
        });
    }
    
    /**
     * Create node element with common styling and interactions
     * @param {Object} node - Node data
     * @param {Object} app - App instance
     * @param {Object} options - Node options
     * @returns {HTMLElement} Node element
     */
    static createNodeElement(node, app, options = {}) {
        const {
            shape = 'box',
            width = 150,
            height = 60,
            borderColor = '#4a9eff',
            backgroundColor = 'var(--element-bg, #2d2d2d)',
            textColor = 'var(--element-color, #e0e0e0)',
            fontSize = 14
        } = options;
        
        const nodeDiv = document.createElement('div');
        nodeDiv.className = 'graph-node';
        nodeDiv.dataset.nodeId = node.id;
        
        let shapeStyle = '';
        if (shape === 'diamond') {
            shapeStyle = `
                clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);
                width: ${width}px;
                height: ${height}px;
            `;
        } else if (shape === 'circle') {
            shapeStyle = `
                border-radius: 50%;
                width: ${width}px;
                height: ${height}px;
            `;
        } else if (shape === 'rounded') {
            shapeStyle = `
                border-radius: 12px;
                width: ${width}px;
                min-height: ${height}px;
            `;
        } else { // box
            shapeStyle = `
                border-radius: 4px;
                width: ${width}px;
                min-height: ${height}px;
            `;
        }
        
        nodeDiv.style.cssText = `
            position: absolute;
            left: ${node.x}px;
            top: ${node.y}px;
            transform: translate(-50%, -50%);
            ${shapeStyle}
            padding: 10px 15px;
            background: ${backgroundColor};
            border: 2px solid ${borderColor};
            color: ${textColor};
            font-size: ${fontSize}px;
            text-align: center;
            cursor: pointer;
            pointer-events: auto;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
            transition: transform 0.2s, box-shadow 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
            word-wrap: break-word;
        `;
        
        // Create text element for inline editing and links
        const textSpan = document.createElement('span');
        textSpan.className = 'graph-node-text';
        textSpan.style.cssText = `
            cursor: text;
            user-select: text;
            width: 100%;
            text-align: center;
        `;
        
        // Parse links in node label
        if (app && app.parseLinks) {
            const context = {
                pageId: node.pageId,
                binId: node.binId,
                elementIndex: node.elementIndex
            };
            const textFragment = app.parseLinks(node.label, context);
            if (textFragment.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
                while (textFragment.firstChild) {
                    textSpan.appendChild(textFragment.firstChild);
                }
            } else {
                textSpan.appendChild(textFragment);
            }
        } else {
            textSpan.textContent = node.label;
        }
        
        nodeDiv.appendChild(textSpan);
        
        nodeDiv.addEventListener('mouseenter', () => {
            if (!textSpan.contentEditable || textSpan.contentEditable === 'false') {
                nodeDiv.style.transform = 'translate(-50%, -50%) scale(1.1)';
                nodeDiv.style.boxShadow = '0 4px 12px rgba(74, 158, 255, 0.5)';
            }
        });
        
        nodeDiv.addEventListener('mouseleave', () => {
            if (!textSpan.contentEditable || textSpan.contentEditable === 'false') {
                nodeDiv.style.transform = 'translate(-50%, -50%) scale(1)';
                nodeDiv.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.3)';
            }
        });
        
        // Enable inline editing on text click or double-click anywhere
        let lastClickTime = 0;
        textSpan.addEventListener('click', (e) => {
            e.stopPropagation();
            // Enable inline editing
            if (app && app.enableInlineEditing) {
                app.enableInlineEditing(textSpan, node.pageId, node.binId, node.elementIndex, node.element);
            }
        });
        
        // Use EventHelper for double-click detection on node
        EventHelper.setupDoubleClick(
            nodeDiv,
            (e) => {
                // Don't trigger if clicking on interactive elements or text span
                if (e.target.closest('input') || e.target.closest('button') || 
                    e.target === textSpan || textSpan.contains(e.target)) {
                    return;
                }
                // Double click detected - enable inline editing
                if (app && app.enableInlineEditing) {
                    app.enableInlineEditing(textSpan, node.pageId, node.binId, node.elementIndex, node.element);
                }
            },
            app.appState?.doubleClickDelay || 150,
            {
                singleClickHandler: (e) => {
                    // Single click - open edit modal (only if not editing inline)
                    if (!textSpan.contentEditable || textSpan.contentEditable === 'false') {
                        if (app.modalHandler) {
                            app.modalHandler.showEditModal(node.pageId, node.binId, node.elementIndex, node.element);
                        }
                    }
                }
            }
        );
        
        return nodeDiv;
    }
    
    /**
     * Setup node dragging with position persistence and collision handling
     * @param {HTMLElement} nodeDiv - Node DOM element
     * @param {Object} node - Node data
     * @param {Object} graph - Graph structure
     * @param {HTMLElement} container - Container element
     * @param {Object} app - App instance
     * @param {Object} options - Options (gridSize, enableGrid, enableCollision)
     */
    static setupNodeDragging(nodeDiv, node, graph, container, app, options = {}) {
        const {
            gridSize = 20,
            enableGrid = true,
            enableCollision = true,
            minSpacing = 10
        } = options;
        
        let isDragging = false;
        let dragOffset = { x: 0, y: 0 };
        let startPosition = { x: 0, y: 0 };
        
        // Load saved position from element data
        if (node.element && node.element._graphPosition) {
            node.x = node.element._graphPosition.x;
            node.y = node.element._graphPosition.y;
            nodeDiv.style.left = `${node.x}px`;
            nodeDiv.style.top = `${node.y}px`;
        }
        
        const snapToGrid = (value) => {
            if (!enableGrid) return value;
            return Math.round(value / gridSize) * gridSize;
        };
        
        const checkCollisions = (newX, newY) => {
            if (!enableCollision) return { x: snapToGrid(newX), y: snapToGrid(newY) };
            
            // Get node dimensions (use fixed width/height from options or measure)
            const nodeWidth = nodeDiv.offsetWidth || 150;
            const nodeHeight = nodeDiv.offsetHeight || 60;
            
            // Check against all other nodes
            for (const otherNode of graph.nodes) {
                if (otherNode.id === node.id) continue;
                
                const otherNodeDiv = container.querySelector(`[data-node-id="${otherNode.id}"]`);
                if (!otherNodeDiv) continue;
                
                const otherX = otherNode.x;
                const otherY = otherNode.y;
                const otherWidth = otherNodeDiv.offsetWidth || 150;
                const otherHeight = otherNodeDiv.offsetHeight || 60;
                
                // Calculate distance between centers
                const dx = newX - otherX;
                const dy = newY - otherY;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                // Minimum distance to avoid overlap (half width + half width + spacing)
                const minDistance = (nodeWidth + otherWidth) / 2 + minSpacing;
                
                if (distance < minDistance && distance > 0) {
                    // Push away from other node
                    const angle = Math.atan2(dy, dx);
                    newX = otherX + Math.cos(angle) * minDistance;
                    newY = otherY + Math.sin(angle) * minDistance;
                } else if (distance === 0) {
                    // If exactly on top, push to the right
                    newX = otherX + minDistance;
                    newY = otherY;
                }
            }
            
            return { x: snapToGrid(newX), y: snapToGrid(newY) };
        };
        
        const updatePosition = (x, y) => {
            const resolved = checkCollisions(x, y);
            node.x = resolved.x;
            node.y = resolved.y;
            nodeDiv.style.left = `${node.x}px`;
            nodeDiv.style.top = `${node.y}px`;
            
            // Update edges
            const svg = container.querySelector('svg');
            if (svg) {
                GraphVisualization.renderEdges(svg, graph);
            }
        };
        
        const savePosition = () => {
            if (node.element) {
                if (!node.element._graphPosition) {
                    node.element._graphPosition = {};
                }
                node.element._graphPosition.x = node.x;
                node.element._graphPosition.y = node.y;
                
                // Save to data
                if (app.dataManager) {
                    app.dataManager.saveData();
                }
            }
        };
        
        // Mouse down - start drag
        nodeDiv.addEventListener('mousedown', (e) => {
            // Don't start drag if clicking on text input or interactive elements
            if (e.target.closest('input') || e.target.closest('button') || 
                e.target.contentEditable === 'true') {
                return;
            }
            
            // Don't start drag if double-clicking (for inline edit)
            if (e.detail === 2) {
                return;
            }
            
            e.preventDefault();
            e.stopPropagation();
            
            isDragging = true;
            startPosition = { x: node.x, y: node.y };
            
            const rect = container.getBoundingClientRect();
            const nodeRect = nodeDiv.getBoundingClientRect();
            dragOffset = {
                x: e.clientX - rect.left - node.x,
                y: e.clientY - rect.top - node.y
            };
            
            nodeDiv.style.cursor = 'grabbing';
            nodeDiv.style.zIndex = '1000';
            nodeDiv.style.transition = 'none';
        });
        
        // Mouse move - update position
        container.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            e.preventDefault();
            e.stopPropagation();
            
            const rect = container.getBoundingClientRect();
            const newX = e.clientX - rect.left - dragOffset.x;
            const newY = e.clientY - rect.top - dragOffset.y;
            
            updatePosition(newX, newY);
        });
        
        // Mouse up - end drag
        container.addEventListener('mouseup', (e) => {
            if (!isDragging) return;
            
            isDragging = false;
            nodeDiv.style.cursor = 'pointer';
            nodeDiv.style.zIndex = '';
            nodeDiv.style.transition = 'transform 0.2s, box-shadow 0.2s';
            
            savePosition();
        });
        
        // Also handle mouse leave
        container.addEventListener('mouseleave', () => {
            if (isDragging) {
                isDragging = false;
                nodeDiv.style.cursor = 'pointer';
                nodeDiv.style.zIndex = '';
                nodeDiv.style.transition = 'transform 0.2s, box-shadow 0.2s';
                savePosition();
            }
        });
    }
}


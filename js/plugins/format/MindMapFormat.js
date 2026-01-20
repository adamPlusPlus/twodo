// MindMapFormat.js - Mind map visualization format
import { BaseFormatRenderer } from '../../core/BaseFormatRenderer.js';
import { DOMUtils } from '../../utils/dom.js';
import { eventBus } from '../../core/EventBus.js';
import { EVENTS } from '../../core/AppEvents.js';
import { GraphVisualization } from '../../utils/GraphVisualization.js';
import { ElementInteraction } from '../../utils/ElementInteraction.js';

export default class MindMapFormat extends BaseFormatRenderer {
    constructor(config = {}) {
        super({
            id: 'mindmap-format',
            name: 'Mind Map',
            formatName: 'mindmap',
            formatLabel: 'Mind Map',
            supportsPages: true,
            supportsBins: false,
            version: '1.0.0',
            description: 'Visual mind map representation of document items and their relationships'
        });
    }
    
    async onInit() {
        eventBus.emit('format:registered', { pluginId: this.id });
    }
    
    /**
     * Render page in mind map format
     * @param {HTMLElement} container - Container element
     * @param {Object} page - Page data
     * @param {Object} options - Options with app reference
     */
    renderPage(container, page, options) {
        const app = options.app;
        if (!app) return container;
        
        // Initialize element interaction helper
        const elementInteraction = new ElementInteraction(app);
        
        container.innerHTML = '';
        container.style.cssText = `
            width: 100%;
            height: 100%;
            position: relative;
            overflow: hidden;
            background: var(--bg-color, #1a1a1a);
        `;
        
        // Create SVG canvas for mind map
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.style.cssText = `
            width: 100%;
            height: 100%;
            position: absolute;
            top: 0;
            left: 0;
        `;
        container.appendChild(svg);
        
        // Create container for nodes (HTML overlay for interactivity)
        const nodesContainer = document.createElement('div');
        nodesContainer.style.cssText = `
            width: 100%;
            height: 100%;
            position: absolute;
            top: 0;
            left: 0;
            pointer-events: none;
        `;
        nodesContainer.className = 'graph-nodes-container';
        container.appendChild(nodesContainer);
        
        // Zoom and pan state
        let scale = 1;
        let panX = 0;
        let panY = 0;
        let isDragging = false;
        let dragStart = { x: 0, y: 0 };
        
        // Build graph from elements and relationships
        const graph = GraphVisualization.buildGraph(page, app);
        
        // Calculate layout
        const layout = this.calculateLayout(graph, container);
        
        // Render connections (edges)
        GraphVisualization.renderEdges(svg, graph);
        
        // Render nodes
        this.renderNodes(nodesContainer, layout, graph, app);
        
        // Setup zoom and pan
        GraphVisualization.setupZoomPan(container, svg, nodesContainer);
        
        return container;
    }
    
    
    /**
     * Calculate mind map layout
     * @param {Object} graph - Graph structure
     * @param {HTMLElement} container - Container element
     * @returns {Object} Layout with node positions
     */
    calculateLayout(graph, container) {
        const { nodes, edges } = graph;
        if (nodes.length === 0) return { nodes: [] };
        
        // Find central node (first node or node with most connections)
        let centralNode = nodes[0];
        let maxConnections = 0;
        
        nodes.forEach(node => {
            const connections = edges.filter(e => e.from === node.id || e.to === node.id).length;
            if (connections > maxConnections) {
                maxConnections = connections;
                centralNode = node;
            }
        });
        
        // Position central node at center
        const centerX = container.clientWidth / 2;
        const centerY = container.clientHeight / 2;
        centralNode.x = centerX;
        centralNode.y = centerY;
        centralNode.level = 0;
        
        // Build tree structure from central node
        const visited = new Set([centralNode.id]);
        const queue = [{ node: centralNode, angle: 0, radius: 0 }];
        const nodeAngles = new Map();
        nodeAngles.set(centralNode.id, 0);
        
        // BFS to assign levels and angles
        while (queue.length > 0) {
            const { node, angle, radius } = queue.shift();
            const level = node.level;
            const nextRadius = 200 + (level * 150);
            
            // Get connected nodes
            const connected = edges
                .filter(e => e.from === node.id && !visited.has(e.to))
                .map(e => ({ id: e.to, edge: e }));
            
            if (connected.length > 0) {
                const angleStep = (2 * Math.PI) / connected.length;
                let currentAngle = angle - (connected.length - 1) * angleStep / 2;
                
                connected.forEach(({ id, edge }) => {
                    const targetNode = graph.nodeMap.get(id);
                    if (targetNode && !visited.has(id)) {
                        visited.add(id);
                        targetNode.level = level + 1;
                        targetNode.x = centerX + nextRadius * Math.cos(currentAngle);
                        targetNode.y = centerY + nextRadius * Math.sin(currentAngle);
                        nodeAngles.set(id, currentAngle);
                        queue.push({ node: targetNode, angle: currentAngle, radius: nextRadius });
                        currentAngle += angleStep;
                    }
                });
            }
        }
        
        // Position unconnected nodes in a circle
        nodes.forEach(node => {
            if (!visited.has(node.id)) {
                const angle = (2 * Math.PI * visited.size) / nodes.length;
                node.x = centerX + 300 * Math.cos(angle);
                node.y = centerY + 300 * Math.sin(angle);
                node.level = 1;
            }
        });
        
        return { nodes, edges, centerX, centerY };
    }
    
    
    /**
     * Render nodes
     * @param {HTMLElement} container - Container element
     * @param {Object} layout - Layout data
     * @param {Object} graph - Graph structure
     * @param {Object} app - App instance
     */
    renderNodes(container, layout, graph, app) {
        const { nodes } = layout;
        const elementInteraction = new ElementInteraction(app);
        
        nodes.forEach(node => {
            const borderColor = node.level === 0 ? '#4a9eff' : 'rgba(74, 158, 255, 0.3)';
            const nodeDiv = GraphVisualization.createNodeElement(node, app, {
                shape: 'rounded',
                width: 150,
                height: 60,
                borderColor: borderColor,
                fontSize: 14
            });
            
            // Setup node dragging with position persistence and collision handling
            GraphVisualization.setupNodeDragging(nodeDiv, node, graph, container, app, {
                gridSize: 20,
                enableGrid: true,
                enableCollision: true,
                minSpacing: 10
            });
            
            // Setup context menu and visual settings (but not standard drag-drop which conflicts)
            elementInteraction.setupElementInteractions(
                nodeDiv,
                node.pageId,
                node.binId,
                node.elementIndex,
                node.element,
                {
                    enableDragDrop: false, // Disable standard drag-drop, use graph dragging instead
                    enableContextMenu: true,
                    enableVisualSettings: true
                }
            );
            
            container.appendChild(nodeDiv);
        });
        
        // Re-render edges after all nodes are positioned
        const svg = container.querySelector('svg');
        if (svg) {
            GraphVisualization.renderEdges(svg, graph);
        }
    }
    
}


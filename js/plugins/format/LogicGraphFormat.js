// LogicGraphFormat.js - Logic graph visualization format
import { BaseFormatRenderer } from '../../core/BaseFormatRenderer.js';
import { DOMUtils } from '../../utils/dom.js';
import { eventBus } from '../../core/EventBus.js';
import { EVENTS } from '../../core/AppEvents.js';
import { GraphVisualization } from '../../utils/GraphVisualization.js';
import { ElementInteraction } from '../../utils/ElementInteraction.js';

export default class LogicGraphFormat extends BaseFormatRenderer {
    constructor(config = {}) {
        super({
            id: 'logic-graph-format',
            name: 'Logic Graph',
            formatName: 'logic-graph',
            formatLabel: 'Logic Graph',
            supportsPages: true,
            supportsBins: false,
            version: '1.0.0',
            description: 'Graph visualization of logical relationships between items'
        });
    }
    
    async onInit() {
        eventBus.emit('format:registered', { pluginId: this.id });
    }
    
    /**
     * Render page in logic graph format
     * @param {HTMLElement} container - Container element
     * @param {Object} page - Page data
     * @param {Object} options - Options with app reference
     */
    renderPage(container, page, options) {
        const app = options.app;
        if (!app) return container;
        
        container.innerHTML = '';
        container.style.cssText = `
            width: 100%;
            height: 100%;
            position: relative;
            overflow: hidden;
            background: var(--bg-color, #1a1a1a);
        `;
        
        // Filter to only logical relationships
        const logicalTypes = ['implies', 'contradicts', 'supports', 'opposes'];
        
        // Create SVG canvas
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.style.cssText = `
            width: 100%;
            height: 100%;
            position: absolute;
            top: 0;
            left: 0;
        `;
        container.appendChild(svg);
        
        // Create container for nodes
        const nodesContainer = document.createElement('div');
        nodesContainer.style.cssText = `
            width: 100%;
            height: 100%;
            position: absolute;
            top: 0;
            left: 0;
            pointer-events: none;
        `;
        container.appendChild(nodesContainer);
        
        // Build graph with only logical relationships
        const graph = GraphVisualization.buildGraph(page, app, logicalTypes);
        
        // Calculate force-directed layout
        const layout = this.calculateForceLayout(graph, container);
        
        // Render edges with color coding
        const colorMap = {
            'implies': '#4a9eff',
            'contradicts': '#ff5555',
            'supports': '#4caf50',
            'opposes': '#ff9800'
        };
        GraphVisualization.renderEdges(svg, graph, {
            showArrows: true,
            showLabels: true,
            colorMap: colorMap
        });
        
        // Render nodes
        this.renderNodes(nodesContainer, layout, graph, app);
        
        // Setup zoom and pan
        GraphVisualization.setupZoomPan(container, svg, nodesContainer);
        
        return container;
    }
    
    
    /**
     * Calculate force-directed layout
     * @param {Object} graph - Graph structure
     * @param {HTMLElement} container - Container element
     * @returns {Object} Layout
     */
    calculateForceLayout(graph, container) {
        const { nodes, edges } = graph;
        if (nodes.length === 0) return { nodes: [] };
        
        const width = container.clientWidth;
        const height = container.clientHeight;
        
        // Initialize positions randomly
        nodes.forEach((node, i) => {
            node.x = width / 2 + (Math.random() - 0.5) * 200;
            node.y = height / 2 + (Math.random() - 0.5) * 200;
            node.vx = 0;
            node.vy = 0;
        });
        
        // Force-directed simulation (simplified)
        const k = Math.sqrt((width * height) / nodes.length);
        const iterations = 100;
        
        for (let iter = 0; iter < iterations; iter++) {
            // Repulsion between all nodes
            nodes.forEach(node => {
                node.vx = 0;
                node.vy = 0;
                
                nodes.forEach(other => {
                    if (node.id === other.id) return;
                    const dx = node.x - other.x;
                    const dy = node.y - other.y;
                    const distance = Math.sqrt(dx * dx + dy * dy) || 1;
                    const force = k * k / distance;
                    node.vx += (dx / distance) * force * 0.01;
                    node.vy += (dy / distance) * force * 0.01;
                });
            });
            
            // Attraction along edges
            edges.forEach(edge => {
                const fromNode = graph.nodeMap.get(edge.from);
                const toNode = graph.nodeMap.get(edge.to);
                if (!fromNode || !toNode) return;
                
                const dx = toNode.x - fromNode.x;
                const dy = toNode.y - fromNode.y;
                const distance = Math.sqrt(dx * dx + dy * dy) || 1;
                const force = distance / k;
                
                fromNode.vx += (dx / distance) * force * 0.01;
                fromNode.vy += (dy / distance) * force * 0.01;
                toNode.vx -= (dx / distance) * force * 0.01;
                toNode.vy -= (dy / distance) * force * 0.01;
            });
            
            // Update positions
            nodes.forEach(node => {
                node.x += node.vx;
                node.y += node.vy;
                node.vx *= 0.9; // Damping
                node.vy *= 0.9;
                
                // Keep within bounds
                node.x = Math.max(50, Math.min(width - 50, node.x));
                node.y = Math.max(50, Math.min(height - 50, node.y));
            });
        }
        
        return { nodes, edges, width, height };
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
            const nodeDiv = GraphVisualization.createNodeElement(node, app, {
                shape: 'box',
                width: 150,
                height: 60,
                fontSize: 13
            });
            
            // Setup all interactions
            elementInteraction.setupElementInteractions(
                nodeDiv,
                node.pageId,
                node.binId,
                node.elementIndex,
                node.element,
                {
                    enableDragDrop: true,
                    enableContextMenu: true,
                    enableVisualSettings: true,
                    dragDropType: 'standard'
                }
            );
            
            container.appendChild(nodeDiv);
        });
    }
    
}


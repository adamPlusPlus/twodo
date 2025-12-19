// FlowchartFormat.js - Flowchart/diagram visualization format
import { BaseFormatRenderer } from '../../core/BaseFormatRenderer.js';
import { DOMUtils } from '../../utils/dom.js';
import { eventBus } from '../../core/EventBus.js';
import { EVENTS } from '../../core/AppEvents.js';
import { GraphVisualization } from '../../utils/GraphVisualization.js';
import { ElementInteraction } from '../../utils/ElementInteraction.js';

export default class FlowchartFormat extends BaseFormatRenderer {
    constructor(config = {}) {
        super({
            id: 'flowchart-format',
            name: 'Flowchart',
            formatName: 'flowchart',
            formatLabel: 'Flowchart',
            supportsPages: true,
            supportsBins: false,
            version: '1.0.0',
            description: 'Flowchart visualization with box/diamond/circle shapes for different element types'
        });
    }
    
    async onInit() {
        eventBus.emit('format:registered', { pluginId: this.id });
    }
    
    /**
     * Render page in flowchart format
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
        
        // Filter to only flow relationships
        const flowTypes = ['leadsTo', 'flowsInto', 'branchesTo', 'mergesWith'];
        
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
        nodesContainer.className = 'graph-nodes-container';
        container.appendChild(nodesContainer);
        
        // Build graph
        const graph = GraphVisualization.buildGraph(page, app, flowTypes);
        
        // Calculate hierarchical layout
        const layout = this.calculateHierarchicalLayout(graph, container);
        
        // Render edges
        GraphVisualization.renderEdges(svg, graph, {
            showArrows: true,
            showLabels: false
        });
        
        // Render nodes with shapes
        this.renderNodes(nodesContainer, layout, graph, app);
        
        // Setup zoom and pan
        GraphVisualization.setupZoomPan(container, svg, nodesContainer);
        
        return container;
    }
    
    
    /**
     * Get shape for element type
     * @param {string} elementType - Element type
     * @returns {string} Shape type ('box', 'diamond', 'circle', 'rounded')
     */
    getElementShape(elementType) {
        const shapeMap = {
            'task': 'box',
            'header': 'rounded',
            'header-checkbox': 'rounded',
            'note': 'box',
            'timer': 'circle',
            'counter': 'circle',
            'rating': 'circle',
            'audio': 'box',
            'image': 'box',
            'time-log': 'box',
            'tracker': 'box',
            'calendar': 'circle'
        };
        return shapeMap[elementType] || 'box';
    }
    
    /**
     * Calculate hierarchical layout (top to bottom)
     */
    calculateHierarchicalLayout(graph, container) {
        const { nodes, edges } = graph;
        if (nodes.length === 0) return { nodes: [] };
        
        const width = container.clientWidth;
        const height = container.clientHeight;
        const nodeWidth = 150;
        const nodeHeight = 60;
        const horizontalSpacing = 200;
        const verticalSpacing = 150;
        
        // Find start nodes (nodes with no incoming edges)
        const hasIncoming = new Set();
        edges.forEach(edge => hasIncoming.add(edge.to));
        const startNodes = nodes.filter(node => !hasIncoming.has(node.id));
        
        // If no start nodes, use first node
        if (startNodes.length === 0 && nodes.length > 0) {
            startNodes.push(nodes[0]);
        }
        
        // Assign levels using BFS
        const visited = new Set();
        const queue = startNodes.map(node => ({ node, level: 0 }));
        
        startNodes.forEach(node => {
            node.level = 0;
            visited.add(node.id);
        });
        
        while (queue.length > 0) {
            const { node, level } = queue.shift();
            
            const outgoing = edges.filter(e => e.from === node.id);
            outgoing.forEach(edge => {
                const targetNode = graph.nodeMap.get(edge.to);
                if (targetNode && !visited.has(targetNode.id)) {
                    visited.add(targetNode.id);
                    targetNode.level = level + 1;
                    queue.push({ node: targetNode, level: level + 1 });
                }
            });
        }
        
        // Position nodes by level
        const nodesByLevel = new Map();
        nodes.forEach(node => {
            if (!nodesByLevel.has(node.level)) {
                nodesByLevel.set(node.level, []);
            }
            nodesByLevel.get(node.level).push(node);
        });
        
        const maxLevel = Math.max(...Array.from(nodesByLevel.keys()));
        const startY = 100;
        
        nodesByLevel.forEach((levelNodes, level) => {
            const levelWidth = levelNodes.length * horizontalSpacing;
            const startX = (width - levelWidth) / 2 + horizontalSpacing / 2;
            
            levelNodes.forEach((node, index) => {
                node.x = startX + index * horizontalSpacing;
                node.y = startY + level * verticalSpacing;
            });
        });
        
        return { nodes, edges, width, height };
    }
    
    
    /**
     * Render nodes with shapes
     */
    renderNodes(container, layout, graph, app) {
        const { nodes } = layout;
        const elementInteraction = new ElementInteraction(app);
        
        nodes.forEach(node => {
            // Get shape for this element type
            const shape = this.getElementShape(node.element.type);
            const nodeDiv = GraphVisualization.createNodeElement(node, app, {
                shape: shape,
                width: shape === 'diamond' ? 120 : shape === 'circle' ? 100 : 150,
                height: shape === 'diamond' || shape === 'circle' ? (shape === 'diamond' ? 120 : 100) : 60,
                fontSize: 13
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


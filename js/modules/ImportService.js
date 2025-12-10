// ImportService.js - Handles importing pages from various formats
import { DataUtils } from '../utils/data.js';

export class ImportService {
    constructor(app) {
        this.app = app;
    }
    
    /**
     * Import from JSON
     */
    importFromJSON(jsonString, options = {}) {
        try {
            const data = JSON.parse(jsonString);
            
            // Validate structure
            if (!data.id || !data.bins) {
                throw new Error('Invalid page structure');
            }
            
            // Generate new ID if needed
            if (options.newPageId) {
                data.id = options.newPageId;
            } else {
                data.id = `page-${Date.now()}`;
            }
            
            // Re-index bins and elements
            data.bins.forEach((bin, binIndex) => {
                bin.id = bin.id || `bin-${binIndex}`;
                bin.elements?.forEach((element, elIndex) => {
                    element.id = element.id || `element-${data.id}-${bin.id}-${elIndex}`;
                });
            });
            
            return data;
        } catch (error) {
            throw new Error(`Failed to parse JSON: ${error.message}`);
        }
    }
    
    /**
     * Import from CSV (Todoist format)
     */
    importFromCSV(csvString, options = {}) {
        const lines = csvString.split('\n').filter(line => line.trim());
        if (lines.length < 2) {
            throw new Error('CSV must have at least a header row and one data row');
        }
        
        const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
        const pageId = options.newPageId || `page-${Date.now()}`;
        const binId = options.binId || 'bin-0';
        
        const page = {
            id: pageId,
            title: options.pageTitle || 'Imported Page',
            bins: [{
                id: binId,
                title: options.binTitle || 'Imported Bin',
                elements: []
            }]
        };
        
        // Find column indices
        const textIndex = headers.findIndex(h => 
            h.toLowerCase().includes('task') || 
            h.toLowerCase().includes('content') || 
            h.toLowerCase().includes('text')
        );
        const completedIndex = headers.findIndex(h => 
            h.toLowerCase().includes('completed') || 
            h.toLowerCase().includes('done')
        );
        const priorityIndex = headers.findIndex(h => 
            h.toLowerCase().includes('priority')
        );
        const dueDateIndex = headers.findIndex(h => 
            h.toLowerCase().includes('due') || 
            h.toLowerCase().includes('deadline')
        );
        
        // Parse rows
        for (let i = 1; i < lines.length; i++) {
            const values = this.parseCSVLine(lines[i]);
            if (values.length === 0) continue;
            
            const element = {
                type: 'task',
                text: values[textIndex] || 'Imported Task',
                completed: completedIndex >= 0 && (
                    values[completedIndex]?.toLowerCase() === 'yes' ||
                    values[completedIndex]?.toLowerCase() === 'true' ||
                    values[completedIndex] === '1'
                ) || false,
                children: []
            };
            
            if (dueDateIndex >= 0 && values[dueDateIndex]) {
                element.deadline = this.parseDate(values[dueDateIndex]);
            }
            
            if (priorityIndex >= 0 && values[priorityIndex]) {
                const priority = values[priorityIndex].toLowerCase();
                if (priority === 'high' || priority === 'p1') {
                    if (!element.tags) element.tags = [];
                    element.tags.push('urgent');
                }
            }
            
            page.bins[0].elements.push(element);
        }
        
        return page;
    }
    
    /**
     * Parse CSV line handling quoted values
     */
    parseCSVLine(line) {
        const values = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                if (inQuotes && line[i + 1] === '"') {
                    current += '"';
                    i++; // Skip next quote
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                values.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        
        values.push(current.trim());
        return values;
    }
    
    /**
     * Import from Markdown (Notion format)
     */
    importFromMarkdown(markdownString, options = {}) {
        const lines = markdownString.split('\n');
        const pageId = options.newPageId || `page-${Date.now()}`;
        const binId = options.binId || 'bin-0';
        
        const page = {
            id: pageId,
            title: options.pageTitle || this.extractTitleFromMarkdown(markdownString) || 'Imported Page',
            bins: [{
                id: binId,
                title: options.binTitle || 'Imported Bin',
                elements: []
            }]
        };
        
        let currentElement = null;
        let currentBin = page.bins[0];
        
        lines.forEach(line => {
            // Check for bin header (##)
            if (line.startsWith('## ')) {
                const binTitle = line.substring(3).trim();
                const newBinId = `bin-${page.bins.length}`;
                currentBin = {
                    id: newBinId,
                    title: binTitle,
                    elements: []
                };
                page.bins.push(currentBin);
                return;
            }
            
            // Check for task item (- [ ] or - [x])
            const taskMatch = line.match(/^[\s-]*\[([ x])\]\s*(.+)$/);
            if (taskMatch) {
                if (currentElement) {
                    currentBin.elements.push(currentElement);
                }
                
                currentElement = {
                    type: 'task',
                    text: taskMatch[2].trim(),
                    completed: taskMatch[1] === 'x',
                    children: []
                };
                
                // Extract tags (#tag)
                const tagMatches = currentElement.text.match(/#(\w+)/g);
                if (tagMatches) {
                    currentElement.tags = tagMatches.map(t => t.substring(1));
                    currentElement.text = currentElement.text.replace(/#\w+/g, '').trim();
                }
                
                // Extract deadline (Deadline: date)
                const deadlineMatch = currentElement.text.match(/\(Deadline:\s*([^)]+)\)/);
                if (deadlineMatch) {
                    currentElement.deadline = this.parseDate(deadlineMatch[1]);
                    currentElement.text = currentElement.text.replace(/\(Deadline:[^)]+\)/g, '').trim();
                }
                
                return;
            }
            
            // Check for child item (indented)
            if (currentElement && line.match(/^\s{2,}-/)) {
                const childMatch = line.match(/\[([ x])\]\s*(.+)$/);
                if (childMatch) {
                    currentElement.children.push({
                        type: 'task',
                        text: childMatch[2].trim(),
                        completed: childMatch[1] === 'x'
                    });
                }
            }
        });
        
        if (currentElement) {
            currentBin.elements.push(currentElement);
        }
        
        return page;
    }
    
    /**
     * Extract title from markdown (first # heading)
     */
    extractTitleFromMarkdown(markdown) {
        const match = markdown.match(/^#\s+(.+)$/m);
        return match ? match[1].trim() : null;
    }
    
    /**
     * Parse date string to ISO format
     */
    parseDate(dateString) {
        if (!dateString) return null;
        
        // Try various date formats
        const date = new Date(dateString);
        if (!isNaN(date.getTime())) {
            return date.toISOString();
        }
        
        return null;
    }
    
    /**
     * Import from Trello JSON export
     */
    importFromTrelloJSON(jsonString, options = {}) {
        try {
            const data = JSON.parse(jsonString);
            const pageId = options.newPageId || `page-${Date.now()}`;
            
            const page = {
                id: pageId,
                title: data.name || 'Imported from Trello',
                bins: []
            };
            
            // Trello boards have lists (columns) which become bins
            if (data.lists && Array.isArray(data.lists)) {
                data.lists.forEach((list, listIndex) => {
                    const bin = {
                        id: `bin-${listIndex}`,
                        title: list.name || `List ${listIndex + 1}`,
                        elements: []
                    };
                    
                    // Find cards in this list
                    if (data.cards && Array.isArray(data.cards)) {
                        data.cards
                            .filter(card => card.idList === list.id)
                            .forEach((card, cardIndex) => {
                                const element = {
                                    type: 'task',
                                    text: card.name || 'Untitled Card',
                                    completed: card.closed || false,
                                    children: []
                                };
                                
                                // Add due date if present
                                if (card.due) {
                                    element.deadline = new Date(card.due).toISOString();
                                }
                                
                                // Add labels as tags
                                if (card.labels && card.labels.length > 0) {
                                    element.tags = card.labels.map(l => l.name || l.color);
                                }
                                
                                // Add description as child or custom property
                                if (card.desc) {
                                    element.customProperties = element.customProperties || {};
                                    element.customProperties.description = card.desc;
                                }
                                
                                // Add checklists as children
                                if (data.checklists && Array.isArray(data.checklists)) {
                                    data.checklists
                                        .filter(checklist => checklist.idCard === card.id)
                                        .forEach(checklist => {
                                            if (checklist.checkItems) {
                                                checklist.checkItems.forEach(item => {
                                                    element.children.push({
                                                        type: 'task',
                                                        text: item.name,
                                                        completed: item.state === 'complete'
                                                    });
                                                });
                                            }
                                        });
                                }
                                
                                bin.elements.push(element);
                            });
                    }
                    
                    page.bins.push(bin);
                });
            }
            
            return page;
        } catch (error) {
            throw new Error(`Failed to parse Trello JSON: ${error.message}`);
        }
    }
    
    /**
     * Import page with format detection
     */
    async importPage(file, format = 'auto') {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const content = e.target.result;
                    let page = null;
                    
                    if (format === 'auto') {
                        // Detect format
                        if (file.name.endsWith('.json')) {
                            format = 'json';
                        } else if (file.name.endsWith('.csv')) {
                            format = 'csv';
                        } else if (file.name.endsWith('.md') || file.name.endsWith('.markdown')) {
                            format = 'markdown';
                        } else {
                            // Try to detect from content
                            if (content.trim().startsWith('{')) {
                                format = 'json';
                            } else if (content.includes(',')) {
                                format = 'csv';
                            } else {
                                format = 'markdown';
                            }
                        }
                    }
                    
                    switch (format) {
                        case 'json':
                            // Try Trello format first
                            try {
                                const data = JSON.parse(content);
                                if (data.lists && data.cards) {
                                    page = this.importFromTrelloJSON(content);
                                } else {
                                    page = this.importFromJSON(content);
                                }
                            } catch (err) {
                                page = this.importFromJSON(content);
                            }
                            break;
                        case 'csv':
                            page = this.importFromCSV(content);
                            break;
                        case 'markdown':
                        case 'md':
                            page = this.importFromMarkdown(content);
                            break;
                        default:
                            throw new Error(`Unsupported format: ${format}`);
                    }
                    
                    resolve(page);
                } catch (error) {
                    reject(error);
                }
            };
            
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }
}


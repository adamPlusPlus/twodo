// ExportService.js - Handles exporting pages to various formats
import { DataUtils } from '../utils/data.js';
import { getService, SERVICES, hasService } from '../core/AppServices.js';

export class ExportService {
    constructor() {
    }
    
    /**
     * Get services
     */
    _getAppState() {
        return getService(SERVICES.APP_STATE);
    }
    
    /**
     * Export page to JSON
     */
    exportToJSON(pageId) {
        const appState = this._getAppState();
        const page = appState.pages.find(p => p.id === pageId);
        if (!page) return null;
        
        const data = DataUtils.deepClone(page);
        return JSON.stringify(data, null, 2);
    }
    
    /**
     * Export page to CSV
     */
    exportToCSV(pageId) {
        const appState = this._getAppState();
        const page = appState.pages.find(p => p.id === pageId);
        if (!page) return null;
        
        const rows = [];
        rows.push(['Page', 'Bin', 'Type', 'Text', 'Completed', 'Tags', 'Deadline', 'Time Allocated'].join(','));
        
        page.bins?.forEach(bin => {
            bin.elements?.forEach(element => {
                const row = [
                    `"${(page.title || page.id).replace(/"/g, '""')}"`,
                    `"${(bin.title || bin.id).replace(/"/g, '""')}"`,
                    `"${(element.type || 'task').replace(/"/g, '""')}"`,
                    `"${(element.text || '').replace(/"/g, '""')}"`,
                    element.completed ? 'Yes' : 'No',
                    `"${(element.tags || []).join('; ').replace(/"/g, '""')}"`,
                    element.deadline || '',
                    element.timeAllocated || ''
                ];
                rows.push(row.join(','));
            });
        });
        
        return rows.join('\n');
    }
    
    /**
     * Export page to Markdown
     */
    exportToMarkdown(pageId) {
        const appState = this._getAppState();
        const page = appState.pages.find(p => p.id === pageId);
        if (!page) return null;
        
        let md = `# ${page.title || page.id}\n\n`;
        
        page.bins?.forEach(bin => {
            md += `## ${bin.title || bin.id}\n\n`;
            
            bin.elements?.forEach(element => {
                const checkbox = element.completed ? '[x]' : '[ ]';
                const tags = element.tags && element.tags.length > 0 
                    ? ` ${element.tags.map(t => `#${t}`).join(' ')}` 
                    : '';
                const deadline = element.deadline 
                    ? ` (Deadline: ${new Date(element.deadline).toLocaleDateString()})` 
                    : '';
                md += `- ${checkbox} ${element.text || 'Untitled'}${tags}${deadline}\n`;
                
                // Add children
                if (element.children && element.children.length > 0) {
                    element.children.forEach(child => {
                        const childCheckbox = child.completed ? '[x]' : '[ ]';
                        md += `  - ${childCheckbox} ${child.text || ''}\n`;
                    });
                }
            });
            
            md += '\n';
        });
        
        return md;
    }
    
    /**
     * Export page to PDF (requires jsPDF library)
     */
    async exportToPDF(pageId) {
        const appState = this._getAppState();
        const page = appState.pages.find(p => p.id === pageId);
        if (!page) return null;
        
        // Check if jsPDF is available
        if (typeof window.jsPDF === 'undefined') {
            // Fallback: download as text
            const markdown = this.exportToMarkdown(pageId);
            this.downloadFile(`${pageId}.txt`, markdown, 'text/plain');
            return;
        }
        
        const { jsPDF } = window.jsPDF;
        const doc = new jsPDF();
        
        let y = 20;
        doc.setFontSize(18);
        doc.text(page.title || page.id, 10, y);
        y += 10;
        
        page.bins?.forEach(bin => {
            if (y > 280) {
                doc.addPage();
                y = 20;
            }
            
            doc.setFontSize(14);
            doc.text(bin.title || bin.id, 10, y);
            y += 8;
            
            bin.elements?.forEach(element => {
                if (y > 280) {
                    doc.addPage();
                    y = 20;
                }
                
                doc.setFontSize(10);
                const checkbox = element.completed ? '☑' : '☐';
                const text = `${checkbox} ${element.text || 'Untitled'}`;
                doc.text(text, 15, y);
                y += 6;
            });
            
            y += 5;
        });
        
        doc.save(`${pageId}.pdf`);
    }
    
    /**
     * Download file
     */
    downloadFile(filename, content, mimeType = 'text/plain') {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    
    /**
     * Export page with format selection
     */
    async exportPage(pageId, format = 'json') {
        let content = null;
        let filename = `${pageId}.${format}`;
        let mimeType = 'text/plain';
        
        switch (format) {
            case 'json':
                content = this.exportToJSON(pageId);
                mimeType = 'application/json';
                break;
            case 'csv':
                content = this.exportToCSV(pageId);
                mimeType = 'text/csv';
                break;
            case 'md':
            case 'markdown':
                content = this.exportToMarkdown(pageId);
                mimeType = 'text/markdown';
                filename = `${pageId}.md`;
                break;
            case 'pdf':
                await this.exportToPDF(pageId);
                return; // PDF handles its own download
            default:
                console.error('Unknown export format:', format);
                return;
        }
        
        if (content) {
            this.downloadFile(filename, content, mimeType);
        }
    }
}


// TableElement.js - Table/spreadsheet element type
import { BaseElementType } from '../../core/BaseElementType.js';
import { DOMUtils } from '../../utils/dom.js';
import { StringUtils } from '../../utils/string.js';

export default class TableElement extends BaseElementType {
    constructor() {
        super({
            id: 'table-element',
            name: 'Table',
            description: 'Spreadsheet-like tables with rows and columns.',
            elementType: 'table',
            keyboardShortcut: 't'
        });
    }
    
    getDefaultData() {
        return {
            type: 'table',
            text: 'New Table',
            columns: ['Column 1', 'Column 2', 'Column 3'],
            rows: [
                ['', '', ''],
                ['', '', ''],
                ['', '', '']
            ],
            completed: false,
            persistent: true,
            children: []
        };
    }
    
    render(element, pageId, binId, elementIndex, container) {
        const tableDiv = DOMUtils.createElement('div', {
            className: 'element table-element',
            dataset: {
                pageId: pageId,
                binId: binId,
                elementIndex: elementIndex
            },
            style: 'padding: 15px; background: #2a2a2a; border-radius: 4px; margin-bottom: 10px;'
        });
        
        // Table title
        const title = DOMUtils.createElement('div', {
            className: 'table-title',
            style: 'font-weight: bold; font-size: 14px; color: #e0e0e0; margin-bottom: 10px;'
        }, StringUtils.escapeHtml(element.text || 'Untitled Table'));
        
        tableDiv.appendChild(title);
        
        // Table
        const table = DOMUtils.createElement('table', {
            className: 'data-table',
            style: 'width: 100%; border-collapse: collapse; background: #1a1a1a;'
        });
        
        // Header row
        const thead = DOMUtils.createElement('thead');
        const headerRow = DOMUtils.createElement('tr');
        
        (element.columns || []).forEach((col, colIndex) => {
            const th = DOMUtils.createElement('th', {
                style: 'padding: 8px; border: 1px solid #444; background: #2a2a2a; color: #e0e0e0; text-align: left; font-weight: bold;'
            }, StringUtils.escapeHtml(col || `Column ${colIndex + 1}`));
            headerRow.appendChild(th);
        });
        
        thead.appendChild(headerRow);
        table.appendChild(thead);
        
        // Body rows
        const tbody = DOMUtils.createElement('tbody');
        (element.rows || []).forEach((row, rowIndex) => {
            const tr = DOMUtils.createElement('tr');
            row.forEach((cell, colIndex) => {
                const td = DOMUtils.createElement('td', {
                    style: 'padding: 8px; border: 1px solid #444; color: #ccc;'
                }, StringUtils.escapeHtml(cell || ''));
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });
        
        table.appendChild(tbody);
        tableDiv.appendChild(table);
        
        container.appendChild(tableDiv);
    }
    
    renderEditModalContent(elementData, pageId, binId, elementIndex) {
        const columns = elementData.columns || ['Column 1', 'Column 2', 'Column 3'];
        const rows = elementData.rows || [['', '', ''], ['', '', ''], ['', '', '']];
        
        let html = `
            <div style="margin-top: 15px;">
                <label>Table Title:</label>
                <input type="text" id="table-title-input" value="${StringUtils.escapeHtml(elementData.text || '')}" 
                       style="width: 100%; padding: 8px; margin-top: 5px; background: #1a1a1a; color: #e0e0e0; border: 1px solid #555; border-radius: 4px;" />
            </div>
            <div style="margin-top: 15px;">
                <label>Columns:</label>
                <div id="table-columns-list" style="margin-top: 5px;">
        `;
        
        columns.forEach((col, index) => {
            html += `
                <div style="display: flex; gap: 5px; margin-bottom: 5px;">
                    <input type="text" class="table-column-input" data-index="${index}" value="${StringUtils.escapeHtml(col)}" 
                           style="flex: 1; padding: 6px; background: #2a2a2a; color: #e0e0e0; border: 1px solid #555; border-radius: 4px;" />
                    <button type="button" class="remove-table-column-btn" data-index="${index}" style="padding: 2px 8px; background: #e74c3c; color: white; border: none; border-radius: 4px; cursor: pointer;">×</button>
                </div>
            `;
        });
        
        html += `
                </div>
                <button type="button" id="add-table-column-btn" style="padding: 5px 10px; background: #4a9eff; color: white; border: none; border-radius: 4px; cursor: pointer; margin-top: 5px;">+ Add Column</button>
            </div>
            <div style="margin-top: 15px;">
                <label>Rows:</label>
                <div id="table-rows-list" style="margin-top: 5px; max-height: 300px; overflow-y: auto;">
        `;
        
        rows.forEach((row, rowIndex) => {
            html += `<div style="display: flex; gap: 5px; margin-bottom: 5px;">`;
            row.forEach((cell, colIndex) => {
                html += `
                    <input type="text" class="table-cell-input" data-row="${rowIndex}" data-col="${colIndex}" value="${StringUtils.escapeHtml(cell || '')}" 
                           style="flex: 1; padding: 6px; background: #2a2a2a; color: #e0e0e0; border: 1px solid #555; border-radius: 4px;" />
                `;
            });
            html += `
                    <button type="button" class="remove-table-row-btn" data-index="${rowIndex}" style="padding: 2px 8px; background: #e74c3c; color: white; border: none; border-radius: 4px; cursor: pointer;">×</button>
                </div>
            `;
        });
        
        html += `
                </div>
                <button type="button" id="add-table-row-btn" style="padding: 5px 10px; background: #4a9eff; color: white; border: none; border-radius: 4px; cursor: pointer; margin-top: 5px;">+ Add Row</button>
            </div>
        `;
        
        return html;
    }
    
    setupEditModalEventListeners(elementData, pageId, binId, elementIndex, modalBody) {
        // Add column
        const addColumnBtn = modalBody.querySelector('#add-table-column-btn');
        if (addColumnBtn) {
            addColumnBtn.addEventListener('click', () => {
                if (!elementData.columns) elementData.columns = [];
                elementData.columns.push(`Column ${elementData.columns.length + 1}`);
                
                // Add empty cell to each row
                if (!elementData.rows) elementData.rows = [];
                elementData.rows.forEach(row => {
                    row.push('');
                });
                
                this.app.modalHandler.showEditModal(pageId, binId, elementIndex, elementData);
            });
        }
        
        // Remove column
        modalBody.querySelectorAll('.remove-table-column-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                if (elementData.columns.length > 1) {
                    elementData.columns.splice(index, 1);
                    elementData.rows.forEach(row => {
                        row.splice(index, 1);
                    });
                    this.app.modalHandler.showEditModal(pageId, binId, elementIndex, elementData);
                }
            });
        });
        
        // Add row
        const addRowBtn = modalBody.querySelector('#add-table-row-btn');
        if (addRowBtn) {
            addRowBtn.addEventListener('click', () => {
                if (!elementData.rows) elementData.rows = [];
                const newRow = new Array(elementData.columns.length).fill('');
                elementData.rows.push(newRow);
                this.app.modalHandler.showEditModal(pageId, binId, elementIndex, elementData);
            });
        }
        
        // Remove row
        modalBody.querySelectorAll('.remove-table-row-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                elementData.rows.splice(index, 1);
                this.app.modalHandler.showEditModal(pageId, binId, elementIndex, elementData);
            });
        });
    }
    
    saveEditModalContent(elementData, modalBody) {
        const titleInput = modalBody.querySelector('#table-title-input');
        if (titleInput) {
            elementData.text = titleInput.value.trim();
        }
        
        // Save columns
        const columnInputs = modalBody.querySelectorAll('.table-column-input');
        elementData.columns = Array.from(columnInputs).map(input => input.value.trim());
        
        // Save rows
        const cellInputs = modalBody.querySelectorAll('.table-cell-input');
        const rows = [];
        const numCols = elementData.columns.length;
        
        cellInputs.forEach((input, index) => {
            const rowIndex = parseInt(input.dataset.row);
            if (!rows[rowIndex]) {
                rows[rowIndex] = [];
            }
            rows[rowIndex].push(input.value.trim());
        });
        
        elementData.rows = rows;
    }
}


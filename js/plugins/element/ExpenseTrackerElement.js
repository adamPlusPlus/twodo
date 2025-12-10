// ExpenseTrackerElement.js - Expense tracking element type
import { BaseElementType } from '../../core/BaseElementType.js';
import { DOMUtils } from '../../utils/dom.js';
import { StringUtils } from '../../utils/string.js';

export default class ExpenseTrackerElement extends BaseElementType {
    constructor() {
        super({
            id: 'expense-tracker-element',
            name: 'Expense Tracker',
            description: 'Track expenses with categories and totals.',
            elementType: 'expense',
            keyboardShortcut: 'e'
        });
    }
    
    getDefaultData() {
        return {
            type: 'expense',
            text: 'Expense Tracker',
            expenses: [],
            categories: ['Food', 'Transport', 'Shopping', 'Bills', 'Entertainment', 'Other'],
            total: 0,
            completed: false,
            persistent: true,
            children: []
        };
    }
    
    render(element, pageId, binId, elementIndex, container) {
        const expenseDiv = DOMUtils.createElement('div', {
            className: 'element expense-element',
            dataset: {
                pageId: pageId,
                binId: binId,
                elementIndex: elementIndex
            },
            style: 'padding: 15px; background: #2a2a2a; border-radius: 4px; margin-bottom: 10px; border-left: 4px solid #e74c3c;'
        });
        
        // Title
        const title = DOMUtils.createElement('div', {
            className: 'expense-title',
            style: 'font-weight: bold; font-size: 14px; color: #e0e0e0; margin-bottom: 10px;'
        }, StringUtils.escapeHtml(element.text || 'Expense Tracker'));
        
        expenseDiv.appendChild(title);
        
        // Total
        const total = this.calculateTotal(element.expenses || []);
        const totalDiv = DOMUtils.createElement('div', {
            className: 'expense-total',
            style: 'font-size: 20px; font-weight: bold; color: #e74c3c; margin-bottom: 15px;'
        }, `Total: $${total.toFixed(2)}`);
        
        expenseDiv.appendChild(totalDiv);
        
        // Expenses list
        const expensesList = DOMUtils.createElement('div', {
            className: 'expenses-list',
            style: 'max-height: 200px; overflow-y: auto;'
        });
        
        (element.expenses || []).forEach((expense, index) => {
            const expenseItem = DOMUtils.createElement('div', {
                style: 'display: flex; justify-content: space-between; padding: 8px; background: #1a1a1a; border-radius: 4px; margin-bottom: 5px;'
            });
            
            const left = DOMUtils.createElement('div', {
                style: 'flex: 1;'
            });
            left.innerHTML = `
                <div style="font-weight: bold; color: #e0e0e0;">${StringUtils.escapeHtml(expense.description || 'Expense')}</div>
                <div style="font-size: 11px; color: #888;">${StringUtils.escapeHtml(expense.category || 'Uncategorized')} • ${new Date(expense.date).toLocaleDateString()}</div>
            `;
            
            const right = DOMUtils.createElement('div', {
                style: 'font-weight: bold; color: #e74c3c;'
            }, `$${parseFloat(expense.amount || 0).toFixed(2)}`);
            
            expenseItem.appendChild(left);
            expenseItem.appendChild(right);
            expensesList.appendChild(expenseItem);
        });
        
        expenseDiv.appendChild(expensesList);
        container.appendChild(expenseDiv);
    }
    
    calculateTotal(expenses) {
        return expenses.reduce((sum, expense) => sum + parseFloat(expense.amount || 0), 0);
    }
    
    renderEditModalContent(elementData, pageId, binId, elementIndex) {
        const expenses = elementData.expenses || [];
        const categories = elementData.categories || ['Food', 'Transport', 'Shopping', 'Bills', 'Entertainment', 'Other'];
        
        let html = `
            <div style="margin-top: 15px;">
                <label>Title:</label>
                <input type="text" id="expense-title-input" value="${StringUtils.escapeHtml(elementData.text || '')}" 
                       style="width: 100%; padding: 8px; margin-top: 5px; background: #1a1a1a; color: #e0e0e0; border: 1px solid #555; border-radius: 4px;" />
            </div>
            <div style="margin-top: 15px;">
                <label>Expenses:</label>
                <div id="expenses-list" style="margin-top: 5px; max-height: 300px; overflow-y: auto;">
        `;
        
        expenses.forEach((expense, index) => {
            html += `
                <div style="display: flex; gap: 5px; margin-bottom: 5px; align-items: center;">
                    <input type="text" class="expense-description-input" data-index="${index}" value="${StringUtils.escapeHtml(expense.description || '')}" placeholder="Description" style="flex: 2; padding: 6px; background: #2a2a2a; color: #e0e0e0; border: 1px solid #555; border-radius: 4px;" />
                    <input type="number" class="expense-amount-input" data-index="${index}" value="${expense.amount || ''}" placeholder="Amount" step="0.01" style="width: 100px; padding: 6px; background: #2a2a2a; color: #e0e0e0; border: 1px solid #555; border-radius: 4px;" />
                    <select class="expense-category-input" data-index="${index}" style="flex: 1; padding: 6px; background: #2a2a2a; color: #e0e0e0; border: 1px solid #555; border-radius: 4px;">
                        ${categories.map(cat => `<option value="${cat}" ${expense.category === cat ? 'selected' : ''}>${cat}</option>`).join('')}
                    </select>
                    <input type="date" class="expense-date-input" data-index="${index}" value="${expense.date ? new Date(expense.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}" style="width: 120px; padding: 6px; background: #2a2a2a; color: #e0e0e0; border: 1px solid #555; border-radius: 4px;" />
                    <button type="button" class="remove-expense-btn" data-index="${index}" style="padding: 2px 8px; background: #e74c3c; color: white; border: none; border-radius: 4px; cursor: pointer;">×</button>
                </div>
            `;
        });
        
        html += `
                </div>
                <button type="button" id="add-expense-btn" style="padding: 5px 10px; background: #4a9eff; color: white; border: none; border-radius: 4px; cursor: pointer; margin-top: 5px;">+ Add Expense</button>
            </div>
        `;
        
        return html;
    }
    
    setupEditModalEventListeners(elementData, pageId, binId, elementIndex, modalBody) {
        // Add expense
        const addBtn = modalBody.querySelector('#add-expense-btn');
        if (addBtn) {
            addBtn.addEventListener('click', () => {
                if (!elementData.expenses) elementData.expenses = [];
                elementData.expenses.push({
                    description: '',
                    amount: 0,
                    category: elementData.categories?.[0] || 'Other',
                    date: new Date().toISOString()
                });
                this.app.modalHandler.showEditModal(pageId, binId, elementIndex, elementData);
            });
        }
        
        // Remove expense
        modalBody.querySelectorAll('.remove-expense-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                elementData.expenses.splice(index, 1);
                this.app.modalHandler.showEditModal(pageId, binId, elementIndex, elementData);
            });
        });
    }
    
    saveEditModalContent(elementData, modalBody) {
        const titleInput = modalBody.querySelector('#expense-title-input');
        if (titleInput) {
            elementData.text = titleInput.value.trim();
        }
        
        // Save expenses
        const descriptionInputs = modalBody.querySelectorAll('.expense-description-input');
        const amountInputs = modalBody.querySelectorAll('.expense-amount-input');
        const categoryInputs = modalBody.querySelectorAll('.expense-category-input');
        const dateInputs = modalBody.querySelectorAll('.expense-date-input');
        
        elementData.expenses = Array.from(descriptionInputs).map((input, index) => ({
            description: input.value.trim(),
            amount: parseFloat(amountInputs[index]?.value || 0),
            category: categoryInputs[index]?.value || 'Other',
            date: dateInputs[index]?.value || new Date().toISOString()
        }));
    }
}


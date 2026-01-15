// BatchOperations.js - Bin plugin for batch operations on elements
import { BasePlugin } from '../../core/BasePlugin.js';
import { DOMUtils } from '../../utils/dom.js';
import { StringUtils } from '../../utils/string.js';

export default class BatchOperations extends BasePlugin {
    constructor(app = null, config = {}) {
        super({
            id: 'batch-operations',
            name: 'Batch Operations',
            description: 'Select and perform bulk actions on multiple elements.',
            type: 'bin',
            defaultConfig: {
                enabled: true
            },
            ...config
        });
        if (app) {
            this.app = app;
        }
        this.selectedElements = new Set(); // Store selected element indices
    }

    async onInit() {
        if (this.config.enabled) {
            this.app.eventBus.on('bin:render', this.handleBinRender.bind(this));
        }
    }

    async onDestroy() {
        this.app.eventBus.off('bin:render', this.handleBinRender.bind(this));
    }

    handleBinRender({ binElement, pageId, binData }) {
        if (!binData.pluginConfigs?.[this.id]?.enabled) {
            return;
        }

        // Add batch operations toolbar
        const toolbar = DOMUtils.createElement('div', {
            className: 'batch-operations-toolbar',
            style: 'display: none; padding: 10px; background: #2a2a2a; border-radius: 4px; margin-bottom: 10px; align-items: center; gap: 10px;'
        });

        toolbar.innerHTML = `
            <span id="batch-selection-count" style="color: #e0e0e0; font-weight: bold;">0 selected</span>
            <button type="button" class="batch-action-btn" data-action="complete" style="padding: 6px 12px; background: #27ae60; color: white; border: none; border-radius: 4px; cursor: pointer;">Complete</button>
            <button type="button" class="batch-action-btn" data-action="uncomplete" style="padding: 6px 12px; background: #f39c12; color: white; border: none; border-radius: 4px; cursor: pointer;">Uncomplete</button>
            <button type="button" class="batch-action-btn" data-action="delete" style="padding: 6px 12px; background: #e74c3c; color: white; border: none; border-radius: 4px; cursor: pointer;">Delete</button>
            <button type="button" class="batch-action-btn" data-action="tag" style="padding: 6px 12px; background: #4a9eff; color: white; border: none; border-radius: 4px; cursor: pointer;">Add Tag</button>
            <button type="button" class="batch-action-btn" data-action="move" style="padding: 6px 12px; background: #9b59b6; color: white; border: none; border-radius: 4px; cursor: pointer;">Move</button>
            <button type="button" id="batch-clear-selection" style="padding: 6px 12px; background: #555; color: white; border: none; border-radius: 4px; cursor: pointer;">Clear</button>
        `;

        binElement.insertBefore(toolbar, binElement.firstChild);

        // Add select all checkbox to bin header
        const binHeader = binElement.querySelector('.bin-header');
        if (binHeader) {
            const selectAllCheckbox = DOMUtils.createElement('input', {
                type: 'checkbox',
                className: 'batch-select-all',
                style: 'margin-right: 10px;'
            });
            selectAllCheckbox.addEventListener('change', (e) => {
                this.toggleSelectAll(pageId, binData.id, e.target.checked);
            });
            binHeader.insertBefore(selectAllCheckbox, binHeader.firstChild);
        }

        // Add selection checkboxes to elements
        this.addSelectionCheckboxes(binElement, pageId, binData.id);

        // Setup batch action handlers
        this.setupBatchActions(toolbar, pageId, binData.id);
    }

    addSelectionCheckboxes(binElement, pageId, binId) {
        const elements = binElement.querySelectorAll('.element');
        elements.forEach((elementElement, index) => {
            const checkbox = DOMUtils.createElement('input', {
                type: 'checkbox',
                className: 'batch-select-checkbox',
                dataset: { elementIndex: index },
                style: 'margin-right: 5px;'
            });

            checkbox.addEventListener('change', (e) => {
                const elementIndex = parseInt(e.target.dataset.elementIndex);
                const key = `${pageId}-${binId}-${elementIndex}`;
                
                if (e.target.checked) {
                    this.selectedElements.add(key);
                } else {
                    this.selectedElements.delete(key);
                }
                
                this.updateToolbar(pageId, binId);
            });

            // Insert checkbox at the start of element
            const firstChild = elementElement.firstChild;
            if (firstChild) {
                elementElement.insertBefore(checkbox, firstChild);
            } else {
                elementElement.appendChild(checkbox);
            }
        });
    }

    toggleSelectAll(pageId, binId, checked) {
        const page = this.app.pages.find(p => p.id === pageId);
        const bin = page?.bins?.find(b => b.id === binId);
        if (!bin) return;

        bin.elements.forEach((element, index) => {
            const key = `${pageId}-${binId}-${index}`;
            if (checked) {
                this.selectedElements.add(key);
            } else {
                this.selectedElements.delete(key);
            }
        });

        // Update checkboxes
        const binElement = document.querySelector(`[data-bin-id="${binId}"]`);
        if (binElement) {
            binElement.querySelectorAll('.batch-select-checkbox').forEach((cb, index) => {
                cb.checked = checked;
            });
        }

        this.updateToolbar(pageId, binId);
    }

    updateToolbar(pageId, binId) {
        const binElement = document.querySelector(`[data-bin-id="${binId}"]`);
        if (!binElement) return;

        const toolbar = binElement.querySelector('.batch-operations-toolbar');
        const countSpan = toolbar?.querySelector('#batch-selection-count');
        const selectedCount = Array.from(this.selectedElements).filter(key => key.startsWith(`${pageId}-${binId}-`)).length;

        if (toolbar && countSpan) {
            countSpan.textContent = `${selectedCount} selected`;
            toolbar.style.display = selectedCount > 0 ? 'flex' : 'none';
        }
    }

    setupBatchActions(toolbar, pageId, binId) {
        toolbar.querySelectorAll('.batch-action-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.action;
                this.performBatchAction(pageId, binId, action);
            });
        });

        const clearBtn = toolbar.querySelector('#batch-clear-selection');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.clearSelection(pageId, binId);
            });
        }
    }

    performBatchAction(pageId, binId, action) {
        const page = this.app.pages.find(p => p.id === pageId);
        const bin = page?.bins?.find(b => b.id === binId);
        if (!bin) return;

        const selectedIndices = Array.from(this.selectedElements)
            .filter(key => key.startsWith(`${pageId}-${binId}-`))
            .map(key => parseInt(key.split('-').pop()))
            .sort((a, b) => b - a); // Sort descending for safe deletion

        if (selectedIndices.length === 0) {
            alert('No elements selected');
            return;
        }

        switch (action) {
            case 'complete':
                selectedIndices.forEach(index => {
                    if (bin.elements[index]) {
                        bin.elements[index].completed = true;
                    }
                });
                break;
            case 'uncomplete':
                selectedIndices.forEach(index => {
                    if (bin.elements[index]) {
                        bin.elements[index].completed = false;
                    }
                });
                break;
            case 'delete':
                if (!confirm(`Delete ${selectedIndices.length} element(s)?`)) return;
                // Record undo/redo changes (in reverse order to maintain indices)
                if (this.app.undoRedoManager) {
                    selectedIndices.forEach(index => {
                        const deletedElement = bin.elements[index];
                        if (deletedElement) {
                            this.app.undoRedoManager.recordElementDelete(pageId, binId, index, deletedElement);
                        }
                    });
                }
                selectedIndices.forEach(index => {
                    bin.elements.splice(index, 1);
                });
                break;
            case 'tag':
                const tag = prompt('Enter tag to add:');
                if (tag) {
                    selectedIndices.forEach(index => {
                        if (bin.elements[index]) {
                            if (!bin.elements[index].tags) bin.elements[index].tags = [];
                            if (!bin.elements[index].tags.includes(tag.toLowerCase())) {
                                bin.elements[index].tags.push(tag.toLowerCase());
                            }
                        }
                    });
                }
                break;
            case 'move':
                const targetBinId = prompt('Enter target bin ID:');
                if (targetBinId) {
                    const targetPage = this.app.pages.find(p => {
                        return p.bins?.some(b => b.id === targetBinId);
                    });
                    const targetBin = targetPage?.bins?.find(b => b.id === targetBinId);
                    if (targetBin) {
                        selectedIndices.forEach(index => {
                            if (bin.elements[index]) {
                                const element = bin.elements[index];
                                bin.elements.splice(index, 1);
                                if (!targetBin.elements) targetBin.elements = [];
                                targetBin.elements.push(element);
                            }
                        });
                    } else {
                        alert('Target bin not found');
                        return;
                    }
                }
                break;
        }

        this.app.dataManager.saveData();
        this.clearSelection(pageId, binId);
        this.app.render();
    }

    clearSelection(pageId, binId) {
        const keysToRemove = Array.from(this.selectedElements).filter(key => 
            key.startsWith(`${pageId}-${binId}-`)
        );
        keysToRemove.forEach(key => this.selectedElements.delete(key));

        const binElement = document.querySelector(`[data-bin-id="${binId}"]`);
        if (binElement) {
            binElement.querySelectorAll('.batch-select-checkbox').forEach(cb => {
                cb.checked = false;
            });
            const selectAll = binElement.querySelector('.batch-select-all');
            if (selectAll) selectAll.checked = false;
        }

        this.updateToolbar(pageId, binId);
    }
}


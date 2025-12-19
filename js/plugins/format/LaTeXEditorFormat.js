// LaTeXEditorFormat.js - LaTeX editor with live preview
import { BaseFormatRenderer } from '../../core/BaseFormatRenderer.js';
import { DOMUtils } from '../../utils/dom.js';
import { eventBus } from '../../core/EventBus.js';
import { EVENTS } from '../../core/AppEvents.js';
import { LaTeXFileManager } from '../../utils/LaTeXFileManager.js';
import { LaTeXErrorChecker } from '../../utils/LaTeXErrorChecker.js';
import { LaTeXParser } from '../../utils/LaTeXParser.js';
import { LaTeXRenderer } from '../../utils/LaTeXRenderer.js';

export default class LaTeXEditorFormat extends BaseFormatRenderer {
    constructor(config = {}) {
        super({
            id: 'latex-editor-format',
            name: 'LaTeX Editor',
            formatName: 'latex-editor',
            formatLabel: 'LaTeX Editor',
            supportsPages: true,
            supportsBins: false,
            version: '1.0.0',
            description: 'LaTeX editor with live preview, similar to Document View'
        });
    }
    
    async onInit() {
        eventBus.emit('format:registered', { pluginId: this.id });
    }
    
    /**
     * Render page in LaTeX editor format
     * @param {HTMLElement} container - Container element
     * @param {Object} page - Page data
     * @param {Object} options - Options with app reference
     */
    renderPage(container, page, options) {
        const app = options.app;
        if (!app) return container;
        
        // Initialize LaTeX file manager
        if (!app.latexFileManager) {
            app.latexFileManager = new LaTeXFileManager(app);
        }
        
        // Initialize LaTeX error checker
        if (!app.latexErrorChecker) {
            app.latexErrorChecker = new LaTeXErrorChecker(app);
        }
        
        // Initialize LaTeX parser and renderer
        const latexParser = new LaTeXParser();
        const latexRenderer = new LaTeXRenderer(app.latexFileManager);
        
        container.innerHTML = '';
        container.style.cssText = `
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
            background: var(--bg-color, #1a1a1a);
            color: var(--page-color, #e0e0e0);
            font-family: var(--page-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
        `;
        
        // Main layout: sidebar + editor area
        const mainLayout = document.createElement('div');
        mainLayout.style.cssText = `
            flex: 1;
            display: flex;
            overflow: hidden;
        `;
        
        // Sidebar (file browser + outline)
        const sidebar = this.createSidebar(page, app);
        mainLayout.appendChild(sidebar);
        
        // Editor area
        const editorArea = document.createElement('div');
        editorArea.style.cssText = `
            flex: 1;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        `;
        
        // View mode controls (Edit, Preview, Split) + File controls
        const viewControls = document.createElement('div');
        viewControls.style.cssText = `
            display: flex;
            gap: 8px;
            padding: 10px;
            background: var(--page-bg, #2d2d2d);
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            align-items: center;
        `;
        
        const currentViewMode = page._latexViewMode || 'split';
        
        const editBtn = document.createElement('button');
        editBtn.textContent = 'Edit';
        editBtn.style.cssText = `
            padding: 6px 12px;
            background: ${currentViewMode === 'edit' ? '#4a9eff' : '#3a3a3a'};
            color: #fff;
            border: none;
            border-radius: 4px;
            cursor: pointer;
        `;
        editBtn.onclick = () => setViewMode('edit');
        
        const previewBtn = document.createElement('button');
        previewBtn.textContent = 'Preview';
        previewBtn.style.cssText = `
            padding: 6px 12px;
            background: ${currentViewMode === 'preview' ? '#4a9eff' : '#3a3a3a'};
            color: #fff;
            border: none;
            border-radius: 4px;
            cursor: pointer;
        `;
        previewBtn.onclick = () => setViewMode('preview');
        
        const splitBtn = document.createElement('button');
        splitBtn.textContent = 'Split';
        splitBtn.style.cssText = `
            padding: 6px 12px;
            background: ${currentViewMode === 'split' ? '#4a9eff' : '#3a3a3a'};
            color: #fff;
            border: none;
            border-radius: 4px;
            cursor: pointer;
        `;
        splitBtn.onclick = () => setViewMode('split');
        
        // Error checking toggle
        const errorCheckBtn = document.createElement('button');
        errorCheckBtn.textContent = '✓ Check';
        errorCheckBtn.style.cssText = `
            padding: 6px 12px;
            background: #3a3a3a;
            color: #fff;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            margin-left: auto;
        `;
        let errorCheckEnabled = false;
        errorCheckBtn.onclick = () => {
            errorCheckEnabled = !errorCheckEnabled;
            errorCheckBtn.style.background = errorCheckEnabled ? '#4a9eff' : '#3a3a3a';
            errorCheckBtn.textContent = errorCheckEnabled ? '✓ Checking' : '✓ Check';
            if (errorCheckEnabled) {
                runErrorCheck();
            } else {
                clearErrorHighlights();
            }
        };
        
        viewControls.appendChild(editBtn);
        viewControls.appendChild(previewBtn);
        viewControls.appendChild(splitBtn);
        viewControls.appendChild(errorCheckBtn);
        editorArea.appendChild(viewControls);
        
        // Main content area
        const contentArea = document.createElement('div');
        contentArea.style.cssText = `
            flex: 1;
            display: flex;
            overflow: hidden;
        `;
        editorArea.appendChild(contentArea);
        
        mainLayout.appendChild(editorArea);
        container.appendChild(mainLayout);
        
        // Edit textarea
        const editTextarea = document.createElement('textarea');
        editTextarea.className = 'latex-edit-textarea';
        editTextarea.style.cssText = `
            width: 100%;
            height: 100%;
            padding: 20px;
            background: var(--page-bg, #2d2d2d);
            color: var(--page-color, #e0e0e0);
            border: none;
            outline: none;
            font-family: 'Courier New', monospace;
            font-size: 14px;
            line-height: 1.6;
            resize: none;
            box-sizing: border-box;
        `;
        
        // Preview area
        const previewArea = document.createElement('div');
        previewArea.className = 'latex-preview-area';
        previewArea.style.cssText = `
            width: 100%;
            height: 100%;
            padding: 20px;
            overflow-y: auto;
            background: var(--page-bg, #2d2d2d);
            color: var(--page-color, #e0e0e0);
            box-sizing: border-box;
        `;
        
        // Load LaTeX content from page metadata or convert from elements
        let latexContent = page._latexContent || this.convertPageToLaTeX(page);
        editTextarea.value = latexContent;
        
        // Function to set view mode
        const setViewMode = (mode) => {
            page._latexViewMode = mode;
            contentArea.innerHTML = '';
            
            if (mode === 'edit') {
                const editContainer = document.createElement('div');
                editContainer.style.cssText = 'width: 100%; height: 100%; position: relative;';
                editContainer.appendChild(editTextarea);
                contentArea.appendChild(editContainer);
            } else if (mode === 'preview') {
                const previewContainer = document.createElement('div');
                previewContainer.style.cssText = 'width: 100%; height: 100%; position: relative;';
                previewContainer.appendChild(previewArea);
                contentArea.appendChild(previewContainer);
                updatePreview();
            } else { // split
                const splitContainer = document.createElement('div');
                splitContainer.style.cssText = `
                    width: 100%;
                    height: 100%;
                    display: flex;
                    gap: 0;
                `;
                
                const editContainer = document.createElement('div');
                editContainer.style.cssText = `
                    flex: 1;
                    min-width: 0;
                    border-right: 1px solid rgba(255, 255, 255, 0.1);
                `;
                editContainer.appendChild(editTextarea);
                
                const previewContainer = document.createElement('div');
                previewContainer.style.cssText = `
                    flex: 1;
                    min-width: 0;
                `;
                previewContainer.appendChild(previewArea);
                
                splitContainer.appendChild(editContainer);
                splitContainer.appendChild(previewContainer);
                contentArea.appendChild(splitContainer);
                updatePreview();
            }
            
            // Update button styles
            editBtn.style.background = mode === 'edit' ? '#4a9eff' : '#3a3a3a';
            previewBtn.style.background = mode === 'preview' ? '#4a9eff' : '#3a3a3a';
            splitBtn.style.background = mode === 'split' ? '#4a9eff' : '#3a3a3a';
        };
        
        // Load KaTeX once
        let katexLoaded = false;
        const loadKaTeX = () => {
            return new Promise((resolve) => {
                if (window.katex) {
                    katexLoaded = true;
                    resolve();
                    return;
                }
                
                if (katexLoaded) {
                    resolve();
                    return;
                }
                
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css';
                document.head.appendChild(link);
                
                const script = document.createElement('script');
                script.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js';
                script.onload = () => {
                    katexLoaded = true;
                    resolve();
                };
                script.onerror = () => {
                    console.error('Failed to load KaTeX');
                    resolve(); // Resolve anyway to not block
                };
                document.head.appendChild(script);
            });
        };
        
        // Initialize KaTeX loading
        loadKaTeX();
        
        // Function to update preview (using enhanced parser and renderer)
        const updatePreview = async () => {
            const latex = editTextarea.value;
            const cursorPos = editTextarea.selectionStart;
            
            // Wait for KaTeX if not loaded
            if (!window.katex) {
                await loadKaTeX();
            }
            
            if (!window.katex) {
                previewArea.innerHTML = '<p style="color: #ff5555;">Error: KaTeX failed to load</p>';
                return;
            }
            
            try {
                // Parse LaTeX into blocks using enhanced parser
                const blocks = latexParser.parse(latex);
                
                // Render blocks using enhanced renderer (pass parser for nested parsing)
                const rendered = await latexRenderer.render(blocks, { 
                    showComments: false,
                    parser: latexParser
                });
                
                previewArea.innerHTML = '';
                previewArea.appendChild(rendered);
                
                // Save LaTeX content (debounced)
                page._latexContent = latex;
            } catch (error) {
                console.error('Error rendering LaTeX:', error);
                previewArea.innerHTML = `<p style="color: #ff5555;">Error rendering LaTeX: ${error.message}</p>`;
            }
        };
        
        // Debounced save function
        let saveTimeout;
        const saveLaTeX = () => {
            clearTimeout(saveTimeout);
            saveTimeout = setTimeout(async () => {
                if (app.dataManager) {
                    await app.dataManager.saveData();
                }
            }, 1000);
        };
        
        // Track cursor position for chunk detection
        editTextarea.addEventListener('selectionchange', () => {
            lastCursorPosition = editTextarea.selectionStart;
        });
        
        editTextarea.addEventListener('click', () => {
            lastCursorPosition = editTextarea.selectionStart;
        });
        
        editTextarea.addEventListener('keyup', () => {
            lastCursorPosition = editTextarea.selectionStart;
        });
        
        // Error checking functions
        const runErrorCheck = () => {
            if (!errorCheckEnabled) return;
            
            const latex = editTextarea.value;
            const errors = app.latexErrorChecker.checkLaTeX(latex);
            
            // Display errors in sidebar or as tooltips
            displayErrors(errors);
        };
        
        const displayErrors = (errors) => {
            // Create or update error panel
            let errorPanel = document.querySelector('.latex-errors-panel');
            if (!errorPanel) {
                errorPanel = document.createElement('div');
                errorPanel.className = 'latex-errors-panel';
                errorPanel.style.cssText = `
                    position: absolute;
                    top: 50px;
                    right: 10px;
                    width: 300px;
                    max-height: 400px;
                    overflow-y: auto;
                    background: #2a2a2a;
                    border: 1px solid #444;
                    border-radius: 4px;
                    padding: 10px;
                    z-index: 1000;
                    font-size: 12px;
                `;
                editorArea.appendChild(errorPanel);
            }
            
            if (errors.all.length === 0) {
                errorPanel.innerHTML = '<div style="color: #4caf50;">✓ No errors found</div>';
                return;
            }
            
            let html = `<div style="color: #fff; font-weight: bold; margin-bottom: 10px;">Errors (${errors.all.length})</div>`;
            
            errors.all.forEach(error => {
                const severity = error.severity || 'error';
                const color = severity === 'error' ? '#ff5555' : severity === 'warning' ? '#ffaa00' : '#4a9eff';
                html += `
                    <div style="margin-bottom: 8px; padding: 8px; background: #1a1a1a; border-left: 3px solid ${color}; border-radius: 2px;">
                        <div style="color: ${color}; font-weight: bold;">Line ${error.line + 1}: ${error.message}</div>
                        ${error.suggestions ? `<div style="color: #888; margin-top: 4px; font-size: 11px;">Suggestions: ${error.suggestions.join(', ')}</div>` : ''}
                    </div>
                `;
            });
            
            errorPanel.innerHTML = html;
        };
        
        const clearErrorHighlights = () => {
            const errorPanel = document.querySelector('.latex-errors-panel');
            if (errorPanel) {
                errorPanel.remove();
            }
        };
        
        // Real-time update on textarea change (with debouncing for save)
        let updateTimeout;
        let errorCheckTimeout;
        editTextarea.addEventListener('input', () => {
            // Update cursor position
            lastCursorPosition = editTextarea.selectionStart;
            
            // Update preview immediately for real-time rendering
            if (currentViewMode === 'split' || currentViewMode === 'preview') {
                clearTimeout(updateTimeout);
                updateTimeout = setTimeout(() => {
                    updatePreview().then(() => {
                        saveLaTeX();
                        // Update outline when content changes
                        const outlineContainer = document.querySelector('.latex-outline-container');
                        if (outlineContainer) {
                            this.updateOutline(outlineContainer, editTextarea.value);
                        }
                    });
                }, 100); // Short delay for performance
            } else {
                // Still save even if not in preview mode
                saveLaTeX();
                // Update outline
                const outlineContainer = document.querySelector('.latex-outline-container');
                if (outlineContainer) {
                    this.updateOutline(outlineContainer, editTextarea.value);
                }
            }
            
            // Run error check if enabled (debounced)
            if (errorCheckEnabled) {
                clearTimeout(errorCheckTimeout);
                errorCheckTimeout = setTimeout(() => {
                    runErrorCheck();
                }, 500); // Longer delay for error checking
            }
        });
        
        // Initial render
        setViewMode(currentViewMode);
        
        return container;
    }
    
    /**
     * Create sidebar with file browser and document outline
     * @param {Object} page - Page data
     * @param {Object} app - App instance
     * @returns {HTMLElement} Sidebar element
     */
    createSidebar(page, app) {
        const sidebar = document.createElement('div');
        sidebar.className = 'latex-sidebar';
        sidebar.style.cssText = `
            width: 250px;
            min-width: 200px;
            max-width: 400px;
            background: var(--page-bg, #2d2d2d);
            border-right: 1px solid rgba(255, 255, 255, 0.1);
            display: flex;
            flex-direction: column;
            overflow: hidden;
        `;
        
        // Sidebar tabs
        const sidebarTabs = document.createElement('div');
        sidebarTabs.style.cssText = `
            display: flex;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            background: var(--page-bg, #2d2d2d);
        `;
        
        const filesTab = document.createElement('button');
        filesTab.textContent = 'Files';
        filesTab.className = 'sidebar-tab active';
        filesTab.style.cssText = `
            flex: 1;
            padding: 10px;
            background: #3a3a3a;
            color: #fff;
            border: none;
            border-right: 1px solid rgba(255, 255, 255, 0.1);
            cursor: pointer;
        `;
        
        const outlineTab = document.createElement('button');
        outlineTab.textContent = 'Outline';
        outlineTab.className = 'sidebar-tab';
        outlineTab.style.cssText = `
            flex: 1;
            padding: 10px;
            background: #2d2d2d;
            color: #fff;
            border: none;
            cursor: pointer;
        `;
        
        sidebarTabs.appendChild(filesTab);
        sidebarTabs.appendChild(outlineTab);
        sidebar.appendChild(sidebarTabs);
        
        // Sidebar content
        const sidebarContent = document.createElement('div');
        sidebarContent.style.cssText = `
            flex: 1;
            overflow-y: auto;
            padding: 10px;
        `;
        
        // Files panel
        const filesPanel = this.createFilesPanel(page, app);
        filesPanel.style.display = 'block';
        
        // Outline panel
        const outlinePanel = this.createOutlinePanel(page, app);
        outlinePanel.style.display = 'none';
        
        sidebarContent.appendChild(filesPanel);
        sidebarContent.appendChild(outlinePanel);
        sidebar.appendChild(sidebarContent);
        
        // Tab switching
        filesTab.addEventListener('click', () => {
            filesTab.style.background = '#3a3a3a';
            outlineTab.style.background = '#2d2d2d';
            filesPanel.style.display = 'block';
            outlinePanel.style.display = 'none';
        });
        
        outlineTab.addEventListener('click', () => {
            outlineTab.style.background = '#3a3a3a';
            filesTab.style.background = '#2d2d2d';
            outlinePanel.style.display = 'block';
            filesPanel.style.display = 'none';
        });
        
        return sidebar;
    }
    
    /**
     * Create files panel
     * @param {Object} page - Page data
     * @param {Object} app - App instance
     * @returns {HTMLElement} Files panel
     */
    createFilesPanel(page, app) {
        const panel = document.createElement('div');
        panel.className = 'latex-files-panel';
        
        // File controls
        const controls = document.createElement('div');
        controls.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 8px;
            margin-bottom: 15px;
        `;
        
        const newFileBtn = document.createElement('button');
        newFileBtn.textContent = '+ New File';
        newFileBtn.style.cssText = `
            padding: 8px;
            background: #4a9eff;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
        `;
        newFileBtn.onclick = () => this.handleNewFile(page, app);
        
        const importBtn = document.createElement('button');
        importBtn.textContent = '📥 Import .tex';
        importBtn.style.cssText = `
            padding: 8px;
            background: #3a3a3a;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
        `;
        importBtn.onclick = () => this.handleImportFile(page, app);
        
        const exportBtn = document.createElement('button');
        exportBtn.textContent = '📤 Export .tex';
        exportBtn.style.cssText = `
            padding: 8px;
            background: #3a3a3a;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
        `;
        exportBtn.onclick = () => this.handleExportFile(page, app);
        
        controls.appendChild(newFileBtn);
        controls.appendChild(importBtn);
        controls.appendChild(exportBtn);
        panel.appendChild(controls);
        
        // File list
        const fileList = document.createElement('div');
        fileList.className = 'latex-file-list';
        fileList.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 4px;
        `;
        panel.appendChild(fileList);
        
        // Load and display files
        this.refreshFileList(fileList, page, app);
        
        return panel;
    }
    
    /**
     * Create outline panel
     * @param {Object} page - Page data
     * @param {Object} app - App instance
     * @returns {HTMLElement} Outline panel
     */
    createOutlinePanel(page, app) {
        const panel = document.createElement('div');
        panel.className = 'latex-outline-panel';
        
        // Outline will be generated dynamically
        const outlineContainer = document.createElement('div');
        outlineContainer.className = 'latex-outline-container';
        outlineContainer.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 4px;
        `;
        panel.appendChild(outlineContainer);
        
        // Generate outline from current LaTeX content
        const latexContent = page._latexContent || this.convertPageToLaTeX(page);
        this.updateOutline(outlineContainer, latexContent);
        
        return panel;
    }
    
    /**
     * Update document outline
     * @param {HTMLElement} container - Container element
     * @param {string} latexContent - LaTeX content
     */
    updateOutline(container, latexContent) {
        container.innerHTML = '';
        
            // Parse LaTeX for sections using enhanced parser
        const structure = latexParser.extractStructure(latexContent);
        const sections = structure;
        
        if (sections.length === 0) {
            const emptyMsg = document.createElement('div');
            emptyMsg.textContent = 'No sections found';
            emptyMsg.style.cssText = 'color: #888; padding: 10px; text-align: center;';
            container.appendChild(emptyMsg);
            return;
        }
        
        sections.forEach((section, index) => {
            const item = document.createElement('div');
            item.className = 'outline-item';
            const indent = section.type === 'section' ? 0 : section.type === 'subsection' ? 20 : 40;
            item.style.cssText = `
                padding: 6px 8px;
                padding-left: ${indent + 8}px;
                cursor: pointer;
                border-radius: 4px;
                font-size: 13px;
                color: #e0e0e0;
            `;
            item.textContent = section.title;
            
            item.addEventListener('mouseenter', () => {
                item.style.background = '#3a3a3a';
            });
            item.addEventListener('mouseleave', () => {
                item.style.background = 'transparent';
            });
            
            item.addEventListener('click', () => {
                // Scroll to section in editor
                const textarea = document.querySelector('.latex-edit-textarea');
                if (textarea) {
                    textarea.focus();
                    textarea.setSelectionRange(section.position, section.position);
                    textarea.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            });
            
            container.appendChild(item);
        });
    }
    
    /**
     * Refresh file list
     * @param {HTMLElement} container - Container element
     * @param {Object} page - Page data
     * @param {Object} app - App instance
     */
    async refreshFileList(container, page, app) {
        container.innerHTML = '';
        
        if (!app.latexFileManager) {
            app.latexFileManager = new LaTeXFileManager(app);
        }
        
        const files = await app.latexFileManager.listLaTeXFiles();
        
        if (files.length === 0) {
            const emptyMsg = document.createElement('div');
            emptyMsg.textContent = 'No LaTeX files';
            emptyMsg.style.cssText = 'color: #888; padding: 10px; text-align: center;';
            container.appendChild(emptyMsg);
            return;
        }
        
        files.forEach(filename => {
            const fileItem = document.createElement('div');
            fileItem.style.cssText = `
                padding: 8px;
                background: #2a2a2a;
                border-radius: 4px;
                cursor: pointer;
                display: flex;
                justify-content: space-between;
                align-items: center;
            `;
            
            const fileName = document.createElement('span');
            fileName.textContent = filename;
            fileName.style.cssText = 'color: #e0e0e0; font-size: 13px;';
            
            const closeBtn = document.createElement('button');
            closeBtn.textContent = '×';
            closeBtn.style.cssText = `
                background: transparent;
                border: none;
                color: #888;
                cursor: pointer;
                font-size: 18px;
                padding: 0 4px;
            `;
            closeBtn.onclick = (e) => {
                e.stopPropagation();
                // Handle file close
            };
            
            fileItem.appendChild(fileName);
            fileItem.appendChild(closeBtn);
            
            fileItem.addEventListener('click', () => {
                this.handleOpenFile(filename, page, app);
            });
            
            container.appendChild(fileItem);
        });
    }
    
    /**
     * Handle new file
     */
    async handleNewFile(page, app) {
        const filename = prompt('Enter filename (without .tex extension):');
        if (!filename) return;
        
        if (!app.latexFileManager) {
            app.latexFileManager = new LaTeXFileManager(app);
        }
        
        const fileId = app.latexFileManager.openFile(`${filename}.tex`, '', page.id);
        
        // Update editor with new file
        const textarea = document.querySelector('.latex-edit-textarea');
        if (textarea) {
            textarea.value = '';
            page._latexContent = '';
        }
        
        // Refresh file list
        const fileList = document.querySelector('.latex-file-list');
        if (fileList) {
            this.refreshFileList(fileList, page, app);
        }
    }
    
    /**
     * Handle import file
     */
    async handleImportFile(page, app) {
        if (!app.latexFileManager) {
            app.latexFileManager = new LaTeXFileManager(app);
        }
        
        const filename = prompt('Enter filename to import (with .tex extension):');
        if (!filename) return;
        
        const { content } = await app.latexFileManager.importFromTex(filename);
        
        if (content) {
            const textarea = document.querySelector('.latex-edit-textarea');
            if (textarea) {
                textarea.value = content;
                page._latexContent = content;
                
                // Update preview
                const updatePreview = textarea.closest('.latex-editor-format')?.querySelector('.update-preview');
                if (updatePreview) {
                    updatePreview.click();
                }
            }
        }
    }
    
    /**
     * Handle export file
     */
    async handleExportFile(page, app) {
        const textarea = document.querySelector('.latex-edit-textarea');
        if (!textarea) return;
        
        const content = textarea.value;
        if (!content.trim()) {
            alert('No content to export');
            return;
        }
        
        const filename = prompt('Enter filename (without .tex extension):', page.title || 'document');
        if (!filename) return;
        
        if (!app.latexFileManager) {
            app.latexFileManager = new LaTeXFileManager(app);
        }
        
        await app.latexFileManager.exportToTex(filename, content, page.id);
    }
    
    /**
     * Handle open file
     */
    async handleOpenFile(filename, page, app) {
        if (!app.latexFileManager) {
            app.latexFileManager = new LaTeXFileManager(app);
        }
        
        const { content } = await app.latexFileManager.importFromTex(filename);
        
        if (content) {
            const textarea = document.querySelector('.latex-edit-textarea');
            if (textarea) {
                textarea.value = content;
                page._latexContent = content;
                
                // Update preview
                const updatePreview = textarea.closest('.latex-editor-format')?.querySelector('.update-preview');
                if (updatePreview) {
                    updatePreview.click();
                }
            }
        }
    }
    
    /**
     * Convert page elements to LaTeX
     * @param {Object} page - Page data
     * @returns {string} LaTeX content
     */
    convertPageToLaTeX(page) {
        let latex = '';
        
        if (page.title) {
            latex += `\\title{${this.escapeLaTeX(page.title)}}\n\\maketitle\n\n`;
        }
        
        if (page.bins && page.bins.length > 0) {
            page.bins.forEach((bin, binIndex) => {
                if (bin.title) {
                    latex += `\\section{${this.escapeLaTeX(bin.title)}}\n\n`;
                }
                
                if (bin.elements && bin.elements.length > 0) {
                    bin.elements.forEach((element, elIndex) => {
                        if (element.type === 'task') {
                            const checkmark = element.completed ? '$\\checkmark$' : '$\\square$';
                            latex += `${checkmark} ${this.escapeLaTeX(element.text || '')}\n\n`;
                        } else if (element.type === 'header') {
                            latex += `\\subsection{${this.escapeLaTeX(element.text || '')}}\n\n`;
                        } else {
                            latex += `${this.escapeLaTeX(element.text || '')}\n\n`;
                        }
                    });
                }
            });
        }
        
        return latex;
    }
    
    /**
     * Parse LaTeX into blocks with position information
     * @param {string} latex - LaTeX content
     * @returns {Array<Object>} Array of blocks with startIndex and endIndex
     * @deprecated Use LaTeXParser.parse() instead
     */
    parseLaTeX(latex) {
        // Use enhanced parser
        const parser = new LaTeXParser();
        return parser.parse(latex);
    }
    
    
    /**
     * Escape LaTeX special characters
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    escapeLaTeX(text) {
        if (!text) return '';
        return String(text)
            .replace(/\\/g, '\\textbackslash{}')
            .replace(/{/g, '\\{')
            .replace(/}/g, '\\}')
            .replace(/\$/g, '\\$')
            .replace(/#/g, '\\#')
            .replace(/&/g, '\\&')
            .replace(/%/g, '\\%')
            .replace(/\^/g, '\\textasciicircum{}')
            .replace(/_/g, '\\_')
            .replace(/\{/g, '\\{')
            .replace(/\}/g, '\\}');
    }
}


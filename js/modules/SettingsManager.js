// SettingsManager.js - Handles all settings loading, saving, and UI
import { eventBus } from '../core/EventBus.js';
import { EVENTS } from '../core/AppEvents.js';

export class SettingsManager {
    constructor(app) {
        this.app = app;
        this.storageKey = 'twodo-settings';
    }
    
    loadSettings() {
        const stored = localStorage.getItem(this.storageKey);
        if (stored) {
            try {
                const settings = JSON.parse(stored);
                // Merge with defaults to ensure all properties exist
                const defaults = this.getDefaultSettings();
                return this.mergeSettings(settings, defaults);
            } catch (e) {
                console.error('Failed to parse settings:', e);
            }
        }
        return this.getDefaultSettings();
    }
    
    mergeSettings(settings, defaults) {
        const merged = { ...defaults };
        // Recursively merge settings with defaults
        for (const key in settings) {
            if (settings[key] && typeof settings[key] === 'object' && !Array.isArray(settings[key])) {
                merged[key] = this.mergeSettings(settings[key], defaults[key] || {});
            } else {
                merged[key] = settings[key];
            }
        }
        return merged;
    }
    
    getDefaultSettings() {
        // These are the current defaults (what's saved in localStorage)
        return {
            background: '#1a1a1a',
            page: {
                background: '#2d2d2d',
                margin: '0px',
                padding: '20px',
                borderRadius: '8px',
                fontFamily: '-apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif',
                fontSize: '14px',
                opacity: '1',
                color: '#e0e0e0',
                title: {
                    fontSize: '18px',
                    color: '#ffffff',
                    marginBottom: '15px'
                }
            },
            element: {
                background: 'transparent',
                margin: '0px',
                padding: '10px',
                fontFamily: '-apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif',
                fontSize: '14px',
                opacity: '1',
                color: '#e0e0e0',
                hoverBackground: '#363636'
            },
            header: {
                fontSize: '16px',
                color: '#b8b8b8',
                margin: '10px 0'
            },
            checkbox: {
                size: '18px'
            }
        };
    }
    
    getOriginalDefaultSettings() {
        // These are the original values from the initial CSS (before settings were added)
        return {
            background: '#1a1a1a',
            page: {
                background: '#2d2d2d',
                margin: '0px',
                padding: '20px',
                borderRadius: '8px',
                fontFamily: '-apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif',
                fontSize: '14px',
                opacity: '1',
                color: '#e0e0e0',
                title: {
                    fontSize: '18px',
                    color: '#ffffff',
                    marginBottom: '15px'
                }
            },
            element: {
                background: 'transparent',
                margin: '0px',
                padding: '10px',
                fontFamily: '-apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif',
                fontSize: '14px',
                opacity: '1',
                color: '#e0e0e0',
                hoverBackground: '#363636'
            },
            header: {
                fontSize: '16px',
                color: '#b8b8b8',
                margin: '10px 0'
            },
            checkbox: {
                size: '18px'
            }
        };
    }
    
    saveSettings(settings) {
        localStorage.setItem(this.storageKey, JSON.stringify(settings));
        this.applySettings(settings);
        // Also update the main data structure to include settings
        if (this.app.pages && this.app.pages.length > 0) {
            eventBus.emit(EVENTS.DATA.SAVE_REQUESTED);
        }
    }
    
    applySettings(settings) {
        const root = document.documentElement;
        root.style.setProperty('--bg-color', settings.background);
        root.style.setProperty('--page-bg', settings.page.background);
        root.style.setProperty('--page-margin', settings.page.margin);
        root.style.setProperty('--page-padding', settings.page.padding);
        root.style.setProperty('--page-border-radius', settings.page.borderRadius);
        root.style.setProperty('--page-font-family', settings.page.fontFamily);
        root.style.setProperty('--page-font-size', settings.page.fontSize);
        root.style.setProperty('--page-opacity', settings.page.opacity);
        root.style.setProperty('--page-color', settings.page.color);
        root.style.setProperty('--page-title-font-size', settings.page.title.fontSize);
        root.style.setProperty('--page-title-color', settings.page.title.color);
        root.style.setProperty('--page-title-margin-bottom', settings.page.title.marginBottom);
        root.style.setProperty('--element-bg', settings.element.background);
        root.style.setProperty('--element-margin', settings.element.margin);
        root.style.setProperty('--element-padding', settings.element.padding);
        root.style.setProperty('--element-font-family', settings.element.fontFamily);
        root.style.setProperty('--element-font-size', settings.element.fontSize);
        root.style.setProperty('--element-opacity', settings.element.opacity);
        root.style.setProperty('--element-color', settings.element.color);
        root.style.setProperty('--element-hover-bg', settings.element.hoverBackground);
        root.style.setProperty('--header-font-size', settings.header.fontSize);
        root.style.setProperty('--header-color', settings.header.color);
        root.style.setProperty('--header-margin', settings.header.margin);
        root.style.setProperty('--checkbox-size', (settings.checkbox && settings.checkbox.size) || '18px');
    }
    
    showSettingsModal() {
        const modal = document.getElementById('settings-modal');
        const settingsBody = document.getElementById('settings-body');
        const settings = this.loadSettings();
        
        // Generate QR code for current file at the top
        let qrCodeHtml = '';
        const currentFilename = this.app.fileManager?.currentFilename;
        if (currentFilename) {
            // Get current URL origin and construct file URL
            const currentUrl = window.location.origin + window.location.pathname;
            const fileUrl = `${currentUrl}?file=${encodeURIComponent(currentFilename)}`;
            
            // Generate QR code HTML
            qrCodeHtml = `
                <div style="margin-bottom: 20px; padding: 15px; background: #2d2d2d; border-radius: 8px; text-align: center;">
                    <div style="margin-bottom: 10px; color: #ffffff; font-weight: 600;">Open on Mobile Device</div>
                    <div id="qrcode-container" style="display: inline-block; padding: 10px; background: white; border-radius: 4px; min-height: 200px; min-width: 200px;"></div>
                    <div style="margin-top: 10px; color: #888; font-size: 12px;">Scan to open: ${currentFilename}</div>
                    <div style="margin-top: 5px; color: #666; font-size: 11px; word-break: break-all;">${fileUrl}</div>
                </div>
            `;
        } else {
            // Show message if no file is open
            qrCodeHtml = `
                <div style="margin-bottom: 20px; padding: 15px; background: #2d2d2d; border-radius: 8px; text-align: center;">
                    <div style="color: #888; font-size: 14px;">No file currently open. Open a file to generate a QR code.</div>
                </div>
            `;
        }
        
        let html = '<h3 style="margin-bottom: 20px; color: #ffffff;">Settings</h3>';
        html += qrCodeHtml;
        
        // Background Section
        html += '<div class="settings-section">';
        html += '<div class="settings-section-title" data-collapse-target="settings-content-0">';
        html += '<span class="settings-toggle-arrow">▶</span>';
        html += '<span>Background</span>';
        html += '</div>';
        html += '<div class="settings-section-content" id="settings-content-0" style="display: none;">';
        html += '<div class="settings-subsection">';
        html += this.createColorControl('background', 'Background Color', settings.background);
        html += '</div>';
        html += '</div>';
        html += '</div>';
        
        // Page Section
        html += '<div class="settings-section">';
        html += '<div class="settings-section-title" data-collapse-target="settings-content-1">';
        html += '<span class="settings-toggle-arrow">▶</span>';
        html += '<span>Page Styles</span>';
        html += '</div>';
        html += '<div class="settings-section-content" id="settings-content-1" style="display: none;">';
        html += '<div class="settings-subsection">';
        html += this.createColorControl('page.background', 'Background Color', settings.page.background);
        html += this.createSliderControl('page.margin', 'Margin', settings.page.margin, 0, 50, 1, 'px');
        html += this.createSliderControl('page.padding', 'Padding', settings.page.padding, 0, 50, 1, 'px');
        html += this.createSliderControl('page.borderRadius', 'Border Radius', settings.page.borderRadius, 0, 30, 1, 'px');
        html += this.createTextControl('page.fontFamily', 'Font Family', settings.page.fontFamily);
        html += this.createSliderControl('page.fontSize', 'Font Size', settings.page.fontSize, 8, 32, 1, 'px');
        html += this.createOpacityControl('page.opacity', 'Opacity', settings.page.opacity);
        html += this.createColorControl('page.color', 'Text Color', settings.page.color);
        html += '</div>';
        html += '<div class="settings-subsection">';
        html += '<div class="settings-subsection-title" data-collapse-target="settings-subcontent-1">';
        html += '<span class="settings-toggle-arrow">▶</span>';
        html += '<span>Page Title</span>';
        html += '</div>';
        html += '<div class="settings-subsection-content" id="settings-subcontent-1" style="display: none;">';
        html += this.createSliderControl('page.title.fontSize', 'Font Size', settings.page.title.fontSize, 8, 48, 1, 'px');
        html += this.createColorControl('page.title.color', 'Color', settings.page.title.color);
        html += this.createSliderControl('page.title.marginBottom', 'Margin Bottom', settings.page.title.marginBottom, 0, 50, 1, 'px');
        html += '</div>';
        html += '</div>';
        html += '</div>';
        html += '</div>';
        
        // Element Section
        html += '<div class="settings-section">';
        html += '<div class="settings-section-title" data-collapse-target="settings-content-2">';
        html += '<span class="settings-toggle-arrow">▶</span>';
        html += '<span>Element Styles</span>';
        html += '</div>';
        html += '<div class="settings-section-content" id="settings-content-2" style="display: none;">';
        html += '<div class="settings-subsection">';
        html += this.createColorControl('element.background', 'Background Color', settings.element.background);
        html += this.createSliderControl('element.margin', 'Margin', settings.element.margin, 0, 30, 1, 'px');
        html += this.createSliderControl('element.padding', 'Padding', settings.element.padding, 0, 30, 1, 'px');
        html += this.createTextControl('element.fontFamily', 'Font Family', settings.element.fontFamily);
        html += this.createSliderControl('element.fontSize', 'Font Size', settings.element.fontSize, 8, 32, 1, 'px');
        html += this.createOpacityControl('element.opacity', 'Opacity', settings.element.opacity);
        html += this.createColorControl('element.color', 'Text Color', settings.element.color);
        html += this.createColorControl('element.hoverBackground', 'Hover Background', settings.element.hoverBackground);
        html += '</div>';
        html += '</div>';
        html += '</div>';
        
        // Header Section
        html += '<div class="settings-section">';
        html += '<div class="settings-section-title" data-collapse-target="settings-content-3">';
        html += '<span class="settings-toggle-arrow">▶</span>';
        html += '<span>Header Element Styles</span>';
        html += '</div>';
        html += '<div class="settings-section-content" id="settings-content-3" style="display: none;">';
        html += '<div class="settings-subsection">';
        html += this.createSliderControl('header.fontSize', 'Font Size', settings.header.fontSize, 8, 48, 1, 'px');
        html += this.createColorControl('header.color', 'Color', settings.header.color);
        html += this.createTextControl('header.margin', 'Margin', settings.header.margin);
        html += '</div>';
        html += '</div>';
        html += '</div>';
        
        // Checkbox Section
        html += '<div class="settings-section">';
        html += '<div class="settings-section-title" data-collapse-target="settings-content-4">';
        html += '<span class="settings-toggle-arrow">▶</span>';
        html += '<span>Checkbox Styles</span>';
        html += '</div>';
        html += '<div class="settings-section-content" id="settings-content-4" style="display: none;">';
        html += '<div class="settings-subsection">';
        html += this.createSliderControl('checkbox.size', 'Size', settings.checkbox.size, 10, 30, 1, 'px');
        html += '</div>';
        html += '</div>';
        html += '</div>';
        
        // Diagnostic Section
        html += '<div class="settings-section">';
        html += '<div class="settings-section-title" data-collapse-target="settings-content-5">';
        html += '<span class="settings-toggle-arrow">▶</span>';
        html += '<span>Diagnostics</span>';
        html += '</div>';
        html += '<div class="settings-section-content" id="settings-content-5" style="display: none;">';
        html += '<div class="settings-subsection">';
        
        // Buffer status
        const bufferFilename = this.app.undoRedoManager?.currentBufferFilename || 'None';
        const undoStackSize = this.app.undoRedoManager?.undoStack?.length || 0;
        const redoStackSize = this.app.undoRedoManager?.redoStack?.length || 0;
        const snapshotCount = this.app.undoRedoManager?.snapshots?.length || 0;
        const lastSnapshot = this.app.undoRedoManager?.snapshots?.length > 0 
            ? this.app.undoRedoManager.snapshots[this.app.undoRedoManager.snapshots.length - 1]
            : null;
        
        html += `<div style="margin-bottom: 15px; padding: 10px; background: #2a2a2a; border-radius: 4px;">`;
        html += `<div style="color: #ffffff; font-weight: 600; margin-bottom: 10px;">Buffer Status</div>`;
        html += `<div style="color: #e0e0e0; margin-bottom: 5px;">Current File: <span style="color: #4a9eff;">${bufferFilename}</span></div>`;
        html += `<div style="color: #e0e0e0; margin-bottom: 5px;">Undo Stack: <span style="color: #4a9eff;">${undoStackSize}</span> changes</div>`;
        html += `<div style="color: #e0e0e0; margin-bottom: 5px;">Redo Stack: <span style="color: #4a9eff;">${redoStackSize}</span> changes</div>`;
        html += `<div style="color: #e0e0e0; margin-bottom: 5px;">Snapshots: <span style="color: #4a9eff;">${snapshotCount}</span></div>`;
        if (lastSnapshot) {
            html += `<div style="color: #e0e0e0; margin-bottom: 5px;">Last Snapshot: Change index <span style="color: #4a9eff;">${lastSnapshot.changeIndex}</span></div>`;
            html += `<div style="color: #888; font-size: 12px;">${new Date(lastSnapshot.timestamp).toLocaleString()}</div>`;
        }
        html += `</div>`;
        
        // Validation results
        const validation = this.app.undoRedoManager?.validateState();
        html += `<div style="margin-bottom: 15px; padding: 10px; background: #2a2a2a; border-radius: 4px;">`;
        html += `<div style="color: #ffffff; font-weight: 600; margin-bottom: 10px;">State Validation</div>`;
        if (validation) {
            html += `<div style="color: ${validation.valid ? '#4a9eff' : '#ff5555'}; margin-bottom: 5px;">Status: <span>${validation.valid ? 'Valid' : 'Invalid'}</span></div>`;
            if (validation.errors && validation.errors.length > 0) {
                html += `<div style="color: #ff5555; margin-top: 10px; font-weight: 600;">Errors (${validation.errors.length}):</div>`;
                validation.errors.forEach(error => {
                    html += `<div style="color: #ff8888; font-size: 12px; margin-left: 10px; margin-top: 3px;">• ${error}</div>`;
                });
            }
            if (validation.warnings && validation.warnings.length > 0) {
                html += `<div style="color: #ffaa00; margin-top: 10px; font-weight: 600;">Warnings (${validation.warnings.length}):</div>`;
                validation.warnings.forEach(warning => {
                    html += `<div style="color: #ffcc88; font-size: 12px; margin-left: 10px; margin-top: 3px;">• ${warning}</div>`;
                });
            }
        } else {
            html += `<div style="color: #888;">Validation not available</div>`;
        }
        html += `</div>`;
        
        // Undo issue diagnostics
        const undoDiagnostics = this.app.undoRedoManager?.diagnoseUndoIssue();
        html += `<div style="margin-bottom: 15px; padding: 10px; background: #2a2a2a; border-radius: 4px;">`;
        html += `<div style="color: #ffffff; font-weight: 600; margin-bottom: 10px;">Undo/Redo Diagnostics</div>`;
        if (undoDiagnostics) {
            html += `<div style="color: ${undoDiagnostics.valid ? '#4a9eff' : '#ff5555'}; margin-bottom: 5px;">Status: <span>${undoDiagnostics.valid ? 'Valid' : 'Issues Found'}</span></div>`;
            if (undoDiagnostics.issues && undoDiagnostics.issues.length > 0) {
                html += `<div style="color: #ff5555; margin-top: 10px; font-weight: 600;">Issues (${undoDiagnostics.issues.length}):</div>`;
                undoDiagnostics.issues.forEach(issue => {
                    html += `<div style="color: #ff8888; font-size: 12px; margin-left: 10px; margin-top: 3px;">• ${issue.type}: ${issue.description}</div>`;
                });
            }
        } else {
            html += `<div style="color: #888;">Diagnostics not available</div>`;
        }
        html += `</div>`;
        
        // File integrity check button
        html += `<button id="diagnostic-file-integrity" style="padding: 8px 16px; background: #4a9eff; color: white; border: none; border-radius: 4px; cursor: pointer; margin-top: 10px;">Run File Integrity Check</button>`;
        html += `<div id="diagnostic-file-integrity-result" style="margin-top: 10px; padding: 10px; background: #2a2a2a; border-radius: 4px; display: none;"></div>`;
        
        html += '</div>';
        html += '</div>';
        html += '</div>';
        
        html += '<button class="settings-reset-btn" id="settings-reset">Reset to Defaults</button>';
        html += '<button class="settings-reset-btn" id="settings-set-default" style="margin-left: 10px;">Set to Default</button>';
        
        settingsBody.innerHTML = html;
        
        // Generate QR code if we have a current file
        if (currentFilename) {
            const qrContainer = document.getElementById('qrcode-container');
            if (qrContainer) {
                const currentUrl = window.location.origin + window.location.pathname;
                const fileUrl = `${currentUrl}?file=${encodeURIComponent(currentFilename)}`;
                
                // Clear any existing QR code
                qrContainer.innerHTML = '';
                
                // Check if QRCode library is available
                if (typeof QRCode !== 'undefined') {
                    // Generate QR code using QRCode library
                    QRCode.toCanvas(qrContainer, fileUrl, {
                        width: 200,
                        margin: 2,
                        color: {
                            dark: '#000000',
                            light: '#FFFFFF'
                        }
                    }, (error) => {
                        if (error) {
                            console.error('Error generating QR code:', error);
                            qrContainer.innerHTML = '<div style="color: #888; padding: 20px;">QR code unavailable</div>';
                        }
                    });
                } else {
                    // Fallback: use an online QR code API if library not loaded
                    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(fileUrl)}`;
                    qrContainer.innerHTML = `<img src="${qrApiUrl}" alt="QR Code" style="display: block;">`;
                }
            }
        }
        
        // Add event listeners to all controls
        settingsBody.querySelectorAll('input, select').forEach(input => {
            input.addEventListener('input', (e) => {
                const path = e.target.dataset.settingPath;
                let value;
                if (e.target.type === 'color') {
                    value = e.target.value;
                } else if (e.target.type === 'range') {
                    // For opacity, convert 0-100 to 0-1
                    if (path.includes('opacity')) {
                        value = (parseFloat(e.target.value) / 100).toFixed(2);
                    } else {
                        // For slider controls, add 'px' unit if it's a numeric value
                        const numValue = parseFloat(e.target.value);
                        if (!isNaN(numValue) && (path.includes('Size') || path.includes('margin') || path.includes('padding') || path.includes('borderRadius') || path.includes('size'))) {
                            value = numValue + 'px';
                        } else {
                            value = e.target.value;
                        }
                    }
                } else if (e.target.type === 'number') {
                    if (path.includes('opacity')) {
                        // For opacity number input, convert 0-100 to 0-1
                        value = (parseFloat(e.target.value) / 100).toFixed(2);
                    } else {
                        // For number inputs from sliders, add 'px' unit
                        const numValue = parseFloat(e.target.value);
                        if (!isNaN(numValue) && (path.includes('Size') || path.includes('margin') || path.includes('padding') || path.includes('borderRadius') || path.includes('size'))) {
                            value = numValue + 'px';
                        } else {
                            value = e.target.value;
                        }
                    }
                } else {
                    value = e.target.value;
                }
                this.updateSetting(path, value);
            });
        });
        
        // Reset button
        document.getElementById('settings-reset').addEventListener('click', () => {
            const defaultSettings = this.getDefaultSettings();
            this.saveSettings(defaultSettings);
            this.showSettingsModal(); // Refresh the modal
        });
        
        // Set to Default button (original values)
        document.getElementById('settings-set-default').addEventListener('click', () => {
            const originalSettings = this.getOriginalDefaultSettings();
            this.saveSettings(originalSettings);
            this.showSettingsModal(); // Refresh the modal
        });
        
        // File integrity check button
        const fileIntegrityBtn = document.getElementById('diagnostic-file-integrity');
        const fileIntegrityResult = document.getElementById('diagnostic-file-integrity-result');
        if (fileIntegrityBtn && fileIntegrityResult) {
            fileIntegrityBtn.addEventListener('click', async () => {
                const currentFilename = this.app.fileManager?.currentFilename;
                if (!currentFilename) {
                    fileIntegrityResult.style.display = 'block';
                    fileIntegrityResult.innerHTML = '<div style="color: #ff5555;">No file currently open</div>';
                    return;
                }
                
                fileIntegrityBtn.disabled = true;
                fileIntegrityBtn.textContent = 'Running...';
                fileIntegrityResult.style.display = 'block';
                fileIntegrityResult.innerHTML = '<div style="color: #888;">Checking file integrity...</div>';
                
                try {
                    const report = await this.app.fileManager.diagnoseFileIntegrity(currentFilename);
                    
                    let resultHtml = `<div style="color: #ffffff; font-weight: 600; margin-bottom: 10px;">File Integrity Report: ${currentFilename}</div>`;
                    resultHtml += `<div style="color: ${report.isValid ? '#4a9eff' : '#ff5555'}; margin-bottom: 10px;">Status: ${report.isValid ? 'Valid' : 'Issues Found'}</div>`;
                    
                    resultHtml += `<div style="color: #e0e0e0; margin-bottom: 10px;">`;
                    resultHtml += `Pages: ${report.elementCounts.pages}, Bins: ${report.elementCounts.bins}, Elements: ${report.elementCounts.elements}`;
                    resultHtml += `</div>`;
                    
                    if (report.issues && report.issues.length > 0) {
                        resultHtml += `<div style="color: #ff5555; margin-top: 10px; font-weight: 600;">Issues (${report.issues.length}):</div>`;
                        report.issues.forEach(issue => {
                            resultHtml += `<div style="color: #ff8888; font-size: 12px; margin-left: 10px; margin-top: 3px;">`;
                            resultHtml += `• [${issue.type}] ${issue.location}: ${issue.description}`;
                            resultHtml += `</div>`;
                        });
                    } else {
                        resultHtml += `<div style="color: #4a9eff; margin-top: 10px;">No issues found</div>`;
                    }
                    
                    fileIntegrityResult.innerHTML = resultHtml;
                } catch (error) {
                    fileIntegrityResult.innerHTML = `<div style="color: #ff5555;">Error: ${error.message}</div>`;
                } finally {
                    fileIntegrityBtn.disabled = false;
                    fileIntegrityBtn.textContent = 'Run File Integrity Check';
                }
            });
        }
        
        // Add collapse/expand functionality to section titles
        settingsBody.querySelectorAll('.settings-section-title').forEach(title => {
            title.style.cursor = 'pointer';
            title.addEventListener('click', () => {
                const targetId = title.dataset.collapseTarget;
                const content = document.getElementById(targetId);
                const arrow = title.querySelector('.settings-toggle-arrow');
                if (content) {
                    const isCollapsed = content.style.display === 'none';
                    content.style.display = isCollapsed ? 'block' : 'none';
                    arrow.textContent = isCollapsed ? '▼' : '▶';
                }
            });
        });
        
        // Add collapse/expand functionality to subsection titles
        settingsBody.querySelectorAll('.settings-subsection-title[data-collapse-target]').forEach(title => {
            title.style.cursor = 'pointer';
            title.addEventListener('click', () => {
                const targetId = title.dataset.collapseTarget;
                const content = document.getElementById(targetId);
                const arrow = title.querySelector('.settings-toggle-arrow');
                if (content) {
                    const isCollapsed = content.style.display === 'none';
                    content.style.display = isCollapsed ? 'block' : 'none';
                    arrow.textContent = isCollapsed ? '▼' : '▶';
                }
            });
        });
        
        modal.classList.add('active');
    }
    
    createColorControl(path, label, value) {
        return `
            <div class="settings-control">
                <label>${label}:</label>
                <div class="settings-control-row">
                    <input type="color" data-setting-path="${path}" value="${value && value !== 'transparent' && value.startsWith('#') ? value : '#000000'}">
                    <input type="text" data-setting-path="${path}" value="${value || ''}" style="flex: 1;">
                </div>
            </div>
        `;
    }
    
    createTextControl(path, label, value) {
        return `
            <div class="settings-control">
                <label>${label}:</label>
                <input type="text" data-setting-path="${path}" value="${value}">
            </div>
        `;
    }
    
    createSliderControl(path, label, value, min = 0, max = 100, step = 1, unit = 'px') {
        // Extract numeric value from string like "14px" or "20px"
        const numValue = parseFloat(value) || 0;
        return `
            <div class="settings-control">
                <label>${label}:</label>
                <div class="settings-control-row">
                    <input type="range" min="${min}" max="${max}" step="${step}" data-setting-path="${path}" value="${numValue}">
                    <input type="number" min="${min}" max="${max}" step="${step}" data-setting-path="${path}" value="${numValue}" style="width: 80px;">
                    <span style="color: #888; min-width: 30px;">${unit}</span>
                </div>
            </div>
        `;
    }
    
    createOpacityControl(path, label, value) {
        const numValue = parseFloat(value) * 100;
        return `
            <div class="settings-control">
                <label>${label}:</label>
                <div class="settings-control-row">
                    <input type="range" min="0" max="100" step="1" data-setting-path="${path}" value="${numValue}">
                    <input type="number" min="0" max="100" step="1" data-setting-path="${path}" value="${numValue}" style="width: 80px;">
                </div>
            </div>
        `;
    }
    
    updateSetting(path, value) {
        const settings = this.loadSettings();
        const keys = path.split('.');
        let obj = settings;
        for (let i = 0; i < keys.length - 1; i++) {
            obj = obj[keys[i]];
        }
        obj[keys[keys.length - 1]] = value;
        
        // Sync color inputs
        if (path.includes('color') || path.includes('background')) {
            const allInputs = document.querySelectorAll(`[data-setting-path="${path}"]`);
            allInputs.forEach(input => {
                if (input.type === 'color') {
                    // Color inputs don't accept "transparent", convert to a valid hex or skip
                    if (value && value !== 'transparent' && value.startsWith('#')) {
                        input.value = value;
                    } else if (value && value !== 'transparent') {
                        // Try to convert named colors or rgba to hex, or use a default
                        input.value = '#000000'; // Default fallback
                    }
                } else if (input.type === 'text') {
                    input.value = value;
                }
            });
        }
        
        // Sync opacity inputs (convert 0-1 to 0-100 for display)
        if (path.includes('opacity')) {
            const numValue = parseFloat(value) * 100;
            const allInputs = document.querySelectorAll(`[data-setting-path="${path}"]`);
            allInputs.forEach(input => {
                if (input.type === 'range' || input.type === 'number') {
                    input.value = numValue;
                }
            });
        }
        
        // Sync slider inputs (extract numeric value and sync range/number inputs)
        if (path.includes('Size') || path.includes('margin') || path.includes('padding') || path.includes('borderRadius') || path.includes('size')) {
            const numValue = parseFloat(value) || 0;
            const allInputs = document.querySelectorAll(`[data-setting-path="${path}"]`);
            allInputs.forEach(input => {
                if (input.type === 'range' || input.type === 'number') {
                    input.value = numValue;
                }
            });
        }
        
        this.saveSettings(settings);
    }
    
    closeSettingsModal() {
        const modal = document.getElementById('settings-modal');
        modal.classList.remove('active');
    }
}

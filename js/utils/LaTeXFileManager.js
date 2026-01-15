// LaTeXFileManager.js - Manages LaTeX .tex files separately from JSON data
export class LaTeXFileManager {
    constructor(app) {
        this.app = app;
        this.openFiles = new Map(); // Map of fileId -> {filename, content, pageId, modified}
        this.activeFileId = null;
    }
    
    /**
     * Export LaTeX content to .tex file
     * @param {string} filename - Filename (without .tex extension)
     * @param {string} content - LaTeX content
     * @param {string} pageId - Associated page ID (optional)
     * @returns {Promise<boolean>} Success status
     */
    async exportToTex(filename, content, pageId = null) {
        try {
            // Ensure .tex extension
            const texFilename = filename.endsWith('.tex') ? filename : `${filename}.tex`;
            
            // Create file data
            const fileData = {
                filename: texFilename,
                content: content,
                pageId: pageId,
                type: 'latex',
                created: new Date().toISOString(),
                modified: new Date().toISOString()
            };
            
            // Save via FileManager if available
            if (this.app && this.app.fileManager) {
                // Use a special prefix for LaTeX files
                const jsonFilename = `latex_${texFilename.replace('.tex', '.json')}`;
                await this.app.fileManager.saveFile(jsonFilename, fileData);
                return true;
            } else {
                // Fallback: download file
                this.downloadTexFile(texFilename, content);
                return true;
            }
        } catch (error) {
            console.error('Error exporting LaTeX file:', error);
            if (this.app && this.app.modalHandler) {
                this.app.modalHandler.showAlert(`Failed to export LaTeX file: ${error.message}`);
            }
            return false;
        }
    }
    
    /**
     * Import LaTeX content from .tex file
     * @param {string} filename - Filename
     * @returns {Promise<{content: string, pageId: string|null}>} LaTeX content and optional page ID
     */
    async importFromTex(filename) {
        try {
            // Try to load from FileManager first
            if (this.app && this.app.fileManager) {
                const jsonFilename = `latex_${filename.replace('.tex', '.json')}`;
                const latexMeta = await this.app.fileManager.loadFile(jsonFilename);
                if (latexMeta && latexMeta.content) {
                    return {
                        content: latexMeta.content,
                        pageId: latexMeta.pageId || null
                    };
                }
            }
            
            // Fallback: try to load as .tex file directly from server
            try {
                const response = await fetch(`/files/${filename}`);
                if (response.ok) {
                    const content = await response.text();
                    return {
                        content: content,
                        pageId: null
                    };
                }
            } catch (error) {
                console.warn('Failed to load .tex file from server:', error);
            }
            
            throw new Error('File not found');
        } catch (error) {
            console.error('Error importing LaTeX file:', error);
            if (this.app && this.app.modalHandler) {
                this.app.modalHandler.showAlert(`Failed to import LaTeX file: ${error.message}`);
            }
            return {
                content: '',
                pageId: null
            };
        }
    }
    
    /**
     * Download .tex file to user's computer
     * @param {string} filename - Filename
     * @param {string} content - LaTeX content
     */
    downloadTexFile(filename, content) {
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
    
    /**
     * Open a LaTeX file in the editor
     * @param {string} filename - Filename
     * @param {string} content - LaTeX content
     * @param {string} pageId - Associated page ID
     * @returns {string} File ID
     */
    openFile(filename, content, pageId = null) {
        const fileId = `latex_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.openFiles.set(fileId, {
            filename: filename,
            content: content,
            pageId: pageId,
            modified: false,
            lastSaved: new Date().toISOString()
        });
        this.activeFileId = fileId;
        return fileId;
    }
    
    /**
     * Close a LaTeX file
     * @param {string} fileId - File ID
     * @returns {boolean} Success status
     */
    closeFile(fileId) {
        const file = this.openFiles.get(fileId);
        if (!file) return false;
        
        // Warn if modified
        if (file.modified) {
            const confirmed = confirm(`File "${file.filename}" has unsaved changes. Close anyway?`);
            if (!confirmed) return false;
        }
        
        this.openFiles.delete(fileId);
        if (this.activeFileId === fileId) {
            // Switch to another file or clear
            const remainingFiles = Array.from(this.openFiles.keys());
            this.activeFileId = remainingFiles.length > 0 ? remainingFiles[0] : null;
        }
        return true;
    }
    
    /**
     * Get active file
     * @returns {Object|null} File data
     */
    getActiveFile() {
        if (!this.activeFileId) return null;
        return this.openFiles.get(this.activeFileId) || null;
    }
    
    /**
     * Update file content
     * @param {string} fileId - File ID
     * @param {string} content - New content
     */
    updateFileContent(fileId, content) {
        const file = this.openFiles.get(fileId);
        if (file) {
            file.content = content;
            file.modified = true;
        }
    }
    
    /**
     * Mark file as saved
     * @param {string} fileId - File ID
     */
    markFileSaved(fileId) {
        const file = this.openFiles.get(fileId);
        if (file) {
            file.modified = false;
            file.lastSaved = new Date().toISOString();
        }
    }
    
    /**
     * List all LaTeX files
     * @returns {Promise<Array>} Array of file info
     */
    async listLaTeXFiles() {
        try {
            if (this.app && this.app.fileManager) {
                const allFiles = await this.app.fileManager.listFiles();
                // Filter for LaTeX files (those starting with "latex_")
                return allFiles
                    .filter(f => f.startsWith('latex_') && f.endsWith('.json'))
                    .map(f => f.replace('latex_', '').replace('.json', '.tex'));
            }
            return [];
        } catch (error) {
            console.error('Error listing LaTeX files:', error);
            return [];
        }
    }
}


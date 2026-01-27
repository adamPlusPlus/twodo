// DataPersistence.js - Data persistence utilities
// Extracted from DataManager.js for reusability and maintainability

/**
 * DataPersistence - Functions for saving and loading data
 */
export class DataPersistence {
    constructor() {
        this.defaultStorageKey = 'twodo-data';
    }
    
    /**
     * Save data to localStorage
     * @param {string} key - Storage key
     * @param {any} data - Data to save
     * @returns {boolean} True if successful
     */
    saveToStorage(key, data) {
        try {
            const json = JSON.stringify(data);
            localStorage.setItem(key, json);
            return true;
        } catch (error) {
            console.error('[DataPersistence] Failed to save to storage:', error);
            return false;
        }
    }
    
    /**
     * Load data from localStorage
     * @param {string} key - Storage key
     * @returns {any|null} Loaded data or null if failed
     */
    loadFromStorage(key) {
        try {
            const stored = localStorage.getItem(key);
            if (stored) {
                return JSON.parse(stored);
            }
            return null;
        } catch (error) {
            console.error('[DataPersistence] Failed to load from storage:', error);
            return null;
        }
    }
    
    /**
     * Save data to file (via fetch POST)
     * @param {string} filename - Filename
     * @param {any} data - Data to save
     * @param {boolean} silent - Silent mode (no alerts)
     * @returns {Promise<boolean>} True if successful
     */
    async saveToFile(filename, data, silent = false) {
        try {
            const url = `/save-${filename}`;
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            return result.success === true;
        } catch (error) {
            console.error('[DataPersistence] Failed to save file:', error);
            if (!silent) {
                alert(`Failed to save ${filename}: ${error.message}`);
            }
            return false;
        }
    }
    
    /**
     * Load data from file (via fetch GET)
     * @param {string} filename - Filename
     * @returns {Promise<any|null>} Loaded data or null if failed
     */
    async loadFromFile(filename) {
        try {
            const url = filename.startsWith('/') ? filename : `/${filename}`;
            const response = await fetch(url, {
                cache: 'no-store'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('[DataPersistence] Failed to load file:', error);
            return null;
        }
    }
    
    /**
     * Create backup file
     * @param {string} filename - Original filename
     * @param {any} data - Data to backup
     * @returns {Promise<boolean>} True if successful
     */
    async createBackup(filename, data) {
        const backupFilename = filename + '.bak';
        return await this.saveToFile(backupFilename, data, true);
    }
    
    /**
     * Get storage size for a key
     * @param {string} key - Storage key
     * @returns {number} Size in bytes
     */
    getStorageSize(key) {
        try {
            const item = localStorage.getItem(key);
            if (item) {
                return new Blob([item]).size;
            }
            return 0;
        } catch (error) {
            console.error('[DataPersistence] Failed to get storage size:', error);
            return 0;
        }
    }
    
    /**
     * Create downloadable file from data
     * @param {any} data - Data to download
     * @param {string} filename - Filename for download
     * @returns {boolean} True if successful
     */
    downloadAsFile(data, filename) {
        try {
            const json = JSON.stringify(data, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            return true;
        } catch (error) {
            console.error('[DataPersistence] Failed to download file:', error);
            return false;
        }
    }
    
    /**
     * Load data from file input
     * @param {File} file - File object
     * @returns {Promise<any|null>} Parsed data or null if failed
     */
    async loadFromFileInput(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    resolve(data);
                } catch (error) {
                    console.error('[DataPersistence] Failed to parse file:', error);
                    resolve(null);
                }
            };
            reader.onerror = () => {
                console.error('[DataPersistence] Failed to read file');
                resolve(null);
            };
            reader.readAsText(file);
        });
    }
}

// Export singleton instance
export const dataPersistence = new DataPersistence();

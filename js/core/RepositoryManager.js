// RepositoryManager.js - Manages multiple independent repositories
// Each repository has independent versioning and active-set memory

import { Repository } from './Repository.js';

export class RepositoryManager {
    constructor() {
        this.repositories = new Map(); // repositoryType -> Repository instance
    }
    
    /**
     * Register a repository
     * @param {string} repositoryType - Repository type ('settings', 'uiux', 'templates', 'vault')
     * @param {Repository} repository - Repository instance
     */
    registerRepository(repositoryType, repository) {
        if (!(repository instanceof Repository)) {
            throw new Error('Repository must be an instance of Repository class');
        }
        
        this.repositories.set(repositoryType, repository);
    }
    
    /**
     * Get repository by type
     * @param {string} repositoryType - Repository type
     * @returns {Repository|null} - Repository instance or null
     */
    getRepository(repositoryType) {
        return this.repositories.get(repositoryType) || null;
    }
    
    /**
     * Check if repository exists
     * @param {string} repositoryType - Repository type
     * @returns {boolean} - True if exists
     */
    hasRepository(repositoryType) {
        return this.repositories.has(repositoryType);
    }
    
    /**
     * Get all repository types
     * @returns {Array<string>} - Array of repository types
     */
    getRepositoryTypes() {
        return Array.from(this.repositories.keys());
    }
    
    /**
     * Clear all repositories' active sets
     */
    clearAllActiveSets() {
        for (const repository of this.repositories.values()) {
            repository.clearActiveSet();
        }
    }
    
    /**
     * Get total active set size across all repositories
     * @returns {number} - Total active items
     */
    getTotalActiveSetSize() {
        let total = 0;
        for (const repository of this.repositories.values()) {
            total += repository.getActiveSetSize();
        }
        return total;
    }
}

// Export singleton instance
export const repositoryManager = new RepositoryManager();

// AsyncIndexer.js - Manages async, incremental, cancellable indexing
// Background processing with rate limiting and progress tracking

import { indexingConfig } from './IndexingConfig.js';
import { eventBus } from './EventBus.js';
import { performanceBudgetManager } from './PerformanceBudgetManager.js';

export class AsyncIndexer {
    constructor() {
        this.config = indexingConfig;
        
        // Indexing state
        this.isIndexing = false;
        this.abortController = null;
        this.currentBatch = [];
        this.processedCount = 0;
        this.totalCount = 0;
        
        // Index function: (documentId) => Promise<void>
        this.indexFunction = null;
        
        // Rate limiting
        this.lastIndexTime = 0;
        this.minInterval = 1000 / this.config.getRateLimit(); // ms between indexes
        
        // Statistics
        this.stats = {
            totalIndexed: 0,
            totalCancelled: 0,
            totalErrors: 0
        };
    }
    
    /**
     * Set the function to index documents
     * @param {Function} indexFn - Async function (documentId) => Promise<void>
     */
    setIndexFunction(indexFn) {
        this.indexFunction = indexFn;
    }
    
    /**
     * Start indexing documents incrementally
     * @param {Array<string>} documentIds - Array of document IDs to index
     * @param {Object} options - Options { priority, onProgress, onComplete }
     * @returns {Promise<void>}
     */
    async indexDocuments(documentIds, options = {}) {
        if (!this.config.isEnabled()) {
            return;
        }
        
        if (this.isIndexing) {
            // Cancel current indexing
            this.cancelIndexing();
        }
        
        this.currentBatch = [...documentIds];
        this.totalCount = documentIds.length;
        this.processedCount = 0;
        this.isIndexing = true;
        this.abortController = new AbortController();
        
        const priority = options.priority || this.config.getPriority();
        const onProgress = options.onProgress;
        const onComplete = options.onComplete;
        
        try {
            // Emit start event
            eventBus.emit('indexing:started', {
                totalCount: this.totalCount
            });
            
            // Process in batches
            await this._processBatches(priority, onProgress);
            
            // Emit completion event
            eventBus.emit('indexing:complete', {
                totalCount: this.totalCount,
                processedCount: this.processedCount
            });
            
            if (onComplete) {
                onComplete(this.processedCount, this.totalCount);
            }
            
            this.stats.totalIndexed += this.processedCount;
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('[AsyncIndexer] Error during indexing:', error);
                this.stats.totalErrors++;
                
                eventBus.emit('indexing:error', {
                    error: error.message,
                    processedCount: this.processedCount,
                    totalCount: this.totalCount
                });
            } else {
                this.stats.totalCancelled++;
                
                eventBus.emit('indexing:cancelled', {
                    processedCount: this.processedCount,
                    totalCount: this.totalCount
                });
            }
        } finally {
            this.isIndexing = false;
            this.abortController = null;
        }
    }
    
    /**
     * Process documents in batches
     * @private
     * @param {string} priority - Priority level
     * @param {Function} onProgress - Progress callback
     * @returns {Promise<void>}
     */
    async _processBatches(priority, onProgress) {
        const batchSize = this.config.getBatchSize();
        
        while (this.currentBatch.length > 0 && !this.abortController.signal.aborted) {
            // Get next batch
            const batch = this.currentBatch.splice(0, batchSize);
            
            // Process batch
            if (priority === 'low' && this.config.shouldUseIdleCallback() && window.requestIdleCallback) {
                // Use requestIdleCallback for low priority
                await this._processBatchWithIdleCallback(batch, onProgress);
            } else {
                // Process immediately
                await this._processBatch(batch, onProgress);
            }
        }
    }
    
    /**
     * Process batch with requestIdleCallback
     * @private
     * @param {Array<string>} batch - Batch of document IDs
     * @param {Function} onProgress - Progress callback
     * @returns {Promise<void>}
     */
    _processBatchWithIdleCallback(batch, onProgress) {
        return new Promise((resolve, reject) => {
            const timeout = this.config.getIdleTimeout();
            
            window.requestIdleCallback(async (deadline) => {
                try {
                    let i = 0;
                    while (i < batch.length && deadline.timeRemaining() > 0 && !this.abortController.signal.aborted) {
                        await this._indexDocument(batch[i]);
                        i++;
                        this.processedCount++;
                        
                        if (onProgress) {
                            onProgress(this.processedCount, this.totalCount);
                        }
                        
                        // Emit progress event
                        eventBus.emit('indexing:progress', {
                            processedCount: this.processedCount,
                            totalCount: this.totalCount,
                            percentage: (this.processedCount / this.totalCount) * 100
                        });
                    }
                    
                    // If batch not complete, schedule next idle callback
                    if (i < batch.length) {
                        this._processBatchWithIdleCallback(batch.slice(i), onProgress).then(resolve).catch(reject);
                    } else {
                        resolve();
                    }
                } catch (error) {
                    reject(error);
                }
            }, { timeout });
        });
    }
    
    /**
     * Process batch immediately
     * @private
     * @param {Array<string>} batch - Batch of document IDs
     * @param {Function} onProgress - Progress callback
     * @returns {Promise<void>}
     */
    async _processBatch(batch, onProgress) {
        for (const documentId of batch) {
            if (this.abortController.signal.aborted) {
                throw new DOMException('Indexing cancelled', 'AbortError');
            }
            
            await this._indexDocument(documentId);
            this.processedCount++;
            
            if (onProgress) {
                onProgress(this.processedCount, this.totalCount);
            }
            
            // Emit progress event
            eventBus.emit('indexing:progress', {
                processedCount: this.processedCount,
                totalCount: this.totalCount,
                percentage: (this.processedCount / this.totalCount) * 100
            });
        }
    }
    
    /**
     * Index a single document with rate limiting
     * @private
     * @param {string} documentId - Document ID
     * @returns {Promise<void>}
     */
    async _indexDocument(documentId) {
        if (!this.indexFunction) {
            return;
        }
        
        // Rate limiting
        const now = Date.now();
        const timeSinceLastIndex = now - this.lastIndexTime;
        if (timeSinceLastIndex < this.minInterval) {
            await new Promise(resolve => setTimeout(resolve, this.minInterval - timeSinceLastIndex));
        }
        this.lastIndexTime = Date.now();
        
        // Index document
        return performanceBudgetManager.measureOperation('SEARCH', async () => {
            try {
                await this.indexFunction(documentId);
            } catch (error) {
                console.error(`[AsyncIndexer] Error indexing document ${documentId}:`, error);
                throw error;
            }
        }, { source: 'AsyncIndexer.indexDocument', documentId });
    }
    
    /**
     * Cancel in-progress indexing
     */
    cancelIndexing() {
        if (this.isIndexing && this.abortController) {
            this.abortController.abort();
            this.isIndexing = false;
            
            if (this.config.shouldLogCompletion()) {
                console.log(`[AsyncIndexer] Indexing cancelled (processed ${this.processedCount}/${this.totalCount})`);
            }
        }
    }
    
    /**
     * Check if indexing is in progress
     * @returns {boolean} - True if indexing
     */
    isIndexingInProgress() {
        return this.isIndexing;
    }
    
    /**
     * Get indexing progress
     * @returns {Object} - Progress object { processed, total, percentage }
     */
    getProgress() {
        return {
            processed: this.processedCount,
            total: this.totalCount,
            percentage: this.totalCount > 0 ? (this.processedCount / this.totalCount) * 100 : 0
        };
    }
    
    /**
     * Get statistics
     * @returns {Object} - Statistics object
     */
    getStats() {
        return { ...this.stats };
    }
    
    /**
     * Reset statistics
     */
    resetStats() {
        this.stats = {
            totalIndexed: 0,
            totalCancelled: 0,
            totalErrors: 0
        };
    }
}

// Export singleton instance
export const asyncIndexer = new AsyncIndexer();

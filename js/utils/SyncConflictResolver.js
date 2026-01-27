// SyncConflictResolver.js - Conflict resolution utilities for sync operations
// Extracted from SyncManager.js for reusability and maintainability

/**
 * SyncConflictResolver - Functions for resolving conflicts between local and remote data
 */
export const SyncConflictResolver = {
    /**
     * Compare two data structures for equality
     * @param {any} localData - Local data structure
     * @param {any} remoteData - Remote data structure
     * @returns {boolean} True if data structures are equal
     */
    areDataEqual(localData, remoteData) {
        if (localData === remoteData) {
            return true;
        }
        
        // Use JSON stringify for deep comparison
        try {
            return JSON.stringify(localData) === JSON.stringify(remoteData);
        } catch (error) {
            console.error('[SyncConflictResolver] Error comparing data:', error);
            return false;
        }
    },
    
    /**
     * Compare timestamps with time-based heuristics
     * @param {number} localTimestamp - Local timestamp
     * @param {number} remoteTimestamp - Remote timestamp
     * @param {number} timeSinceLoad - Time since local data was loaded (ms)
     * @returns {Object} Comparison result with shouldApply flag and reason
     */
    compareDataTimestamps(localTimestamp, remoteTimestamp, timeSinceLoad = 0) {
        // If no local timestamp, apply remote
        if (localTimestamp <= 0) {
            return {
                shouldApply: true,
                reason: 'no_local_timestamp'
            };
        }
        
        // If remote is older, don't apply
        if (remoteTimestamp < localTimestamp) {
            return {
                shouldApply: false,
                reason: 'remote_older',
                timeDiff: localTimestamp - remoteTimestamp
            };
        }
        
        // If we just loaded the file, be conservative
        // Only apply remote if it's significantly newer (more than 2 seconds)
        if (timeSinceLoad > 0 && timeSinceLoad < 3000) {
            const timeDiff = remoteTimestamp - localTimestamp;
            if (timeDiff < 2000) {
                return {
                    shouldApply: false,
                    reason: 'recently_loaded',
                    timeSinceLoad,
                    timeDiff
                };
            }
        }
        
        // Remote is newer or equal, apply it
        return {
            shouldApply: true,
            reason: remoteTimestamp > localTimestamp ? 'remote_newer' : 'timestamps_equal',
            timeDiff: remoteTimestamp - localTimestamp
        };
    },
    
    /**
     * Main conflict resolution logic
     * @param {any} localData - Local data structure
     * @param {any} remoteData - Remote data structure
     * @param {number} localTimestamp - Local timestamp
     * @param {number} remoteTimestamp - Remote timestamp
     * @param {Object} options - Resolution options
     * @param {number} options.timeSinceLoad - Time since local data was loaded (ms)
     * @param {boolean} options.allowEqualData - Allow applying if data is equal (default: true)
     * @returns {Object} Resolution result with shouldApply flag and details
     */
    resolveDataConflict(localData, remoteData, localTimestamp, remoteTimestamp, options = {}) {
        const {
            timeSinceLoad = 0,
            allowEqualData = true
        } = options;
        
        // First check if data is identical
        if (this.areDataEqual(localData, remoteData)) {
            return {
                shouldApply: allowEqualData,
                reason: 'data_identical',
                skipDataUpdate: true // Don't overwrite data, just update timestamp
            };
        }
        
        // Data is different - check timestamps
        const timestampComparison = this.compareDataTimestamps(
            localTimestamp,
            remoteTimestamp,
            timeSinceLoad
        );
        
        return {
            shouldApply: timestampComparison.shouldApply,
            reason: timestampComparison.reason,
            timeDiff: timestampComparison.timeDiff,
            timeSinceLoad: timestampComparison.timeSinceLoad,
            skipDataUpdate: false
        };
    },
    
    /**
     * Determine if remote data should be applied
     * @param {any} localData - Local data structure
     * @param {any} remoteData - Remote data structure
     * @param {number} localTimestamp - Local timestamp
     * @param {number} remoteTimestamp - Remote timestamp
     * @param {Object} options - Resolution options
     * @returns {boolean} True if remote data should be applied
     */
    shouldApplyRemoteData(localData, remoteData, localTimestamp, remoteTimestamp, options = {}) {
        const resolution = this.resolveDataConflict(
            localData,
            remoteData,
            localTimestamp,
            remoteTimestamp,
            options
        );
        
        return resolution.shouldApply;
    },
    
    /**
     * Extract timestamp from message data
     * @param {Object} message - Message object
     * @returns {number} Timestamp value
     */
    extractTimestamp(message) {
        return message.timestamp || 
               message.data?._lastSyncTimestamp || 
               message.data?.timestamp || 
               0;
    }
};

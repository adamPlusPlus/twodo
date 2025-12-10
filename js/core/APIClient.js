// APIClient.js - Base API client framework for native API integration
import { StorageUtils } from '../utils/storage.js';

export class APIClient {
    constructor(config) {
        this.baseURL = config.baseURL;
        this.apiKey = config.apiKey;
        this.accessToken = config.accessToken;
        this.refreshToken = config.refreshToken;
        this.tokenStorageKey = config.tokenStorageKey;
        this.rateLimit = config.rateLimit || { requests: 100, window: 60000 }; // 100 requests per minute
        this.requestQueue = [];
        this.requestHistory = [];
        this.loadTokens();
    }
    
    loadTokens() {
        if (this.tokenStorageKey) {
            const stored = StorageUtils.get(this.tokenStorageKey);
            if (stored) {
                this.accessToken = stored.accessToken;
                this.refreshToken = stored.refreshToken;
            }
        }
    }
    
    saveTokens() {
        if (this.tokenStorageKey) {
            StorageUtils.set(this.tokenStorageKey, {
                accessToken: this.accessToken,
                refreshToken: this.refreshToken
            });
        }
    }
    
    /**
     * Make API request with rate limiting and retry logic
     */
    async request(endpoint, options = {}) {
        // Check rate limit
        await this.checkRateLimit();
        
        const url = `${this.baseURL}${endpoint}`;
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                ...(this.accessToken && { 'Authorization': `Bearer ${this.accessToken}` }),
                ...(this.apiKey && { 'X-API-Key': this.apiKey }),
                ...options.headers
            }
        };
        
        const requestOptions = { ...defaultOptions, ...options };
        
        try {
            const response = await fetch(url, requestOptions);
            
            // Handle token refresh if needed
            if (response.status === 401 && this.refreshToken) {
                await this.refreshAccessToken();
                // Retry request with new token
                requestOptions.headers['Authorization'] = `Bearer ${this.accessToken}`;
                const retryResponse = await fetch(url, requestOptions);
                return this.handleResponse(retryResponse);
            }
            
            return this.handleResponse(response);
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }
    
    async handleResponse(response) {
        // Record request for rate limiting
        this.requestHistory.push(Date.now());
        this.requestHistory = this.requestHistory.filter(
            time => Date.now() - time < this.rateLimit.window
        );
        
        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: response.statusText }));
            throw new Error(error.message || `HTTP ${response.status}`);
        }
        
        return response.json();
    }
    
    async checkRateLimit() {
        const recentRequests = this.requestHistory.filter(
            time => Date.now() - time < this.rateLimit.window
        );
        
        if (recentRequests.length >= this.rateLimit.requests) {
            const oldestRequest = Math.min(...recentRequests);
            const waitTime = this.rateLimit.window - (Date.now() - oldestRequest);
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
    }
    
    async refreshAccessToken() {
        // Override in subclasses
        throw new Error('Token refresh not implemented');
    }
    
    // CRUD operations
    async get(endpoint) {
        return this.request(endpoint, { method: 'GET' });
    }
    
    async post(endpoint, data) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }
    
    async put(endpoint, data) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }
    
    async delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }
}



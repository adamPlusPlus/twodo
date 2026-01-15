// OAuthManager.js - OAuth 2.0 authentication manager
import { StorageUtils } from '../utils/storage.js';

export class OAuthManager {
    constructor(app) {
        this.app = app;
        this.storageKey = 'twodo-oauth-tokens';
        this.tokens = this.loadTokens();
        this.callbacks = new Map(); // Store OAuth callbacks
    }
    
    loadTokens() {
        return StorageUtils.get(this.storageKey) || {};
    }
    
    saveTokens() {
        StorageUtils.set(this.storageKey, this.tokens);
    }
    
    /**
     * Initiate OAuth flow for a service
     */
    async initiateOAuth(serviceName, config) {
        const {
            clientId,
            redirectUri,
            scope,
            authURL,
            tokenURL
        } = config;
        
        // Generate state for CSRF protection
        const oauthState = this.generateState();
        this.callbacks.set(oauthState, { serviceName, config });
        
        // Build authorization URL
        const params = new URLSearchParams({
            client_id: clientId,
            redirect_uri: redirectUri,
            response_type: 'code',
            scope: scope.join(' '),
            state: oauthState
        });
        
        const authUrl = `${authURL}?${params.toString()}`;
        
        // Open OAuth window
        const width = 600;
        const height = 700;
        const left = (screen.width - width) / 2;
        const top = (screen.height - height) / 2;
        
        const popup = window.open(
            authUrl,
            'OAuth',
            `width=${width},height=${height},left=${left},top=${top}`
        );
        
        // Listen for OAuth callback
        return new Promise((resolve, reject) => {
            const checkClosed = setInterval(() => {
                if (popup.closed) {
                    clearInterval(checkClosed);
                    reject(new Error('OAuth window closed'));
                }
            }, 1000);
            
            // Listen for message from popup
            const messageHandler = (event) => {
                if (event.origin !== window.location.origin) return;
                
                if (event.data.type === 'oauth-callback') {
                    clearInterval(checkClosed);
                    window.removeEventListener('message', messageHandler);
                    this.handleOAuthCallback(event.data, resolve, reject);
                }
            };
            
            window.addEventListener('message', messageHandler);
        });
    }
    
    async handleOAuthCallback(data, resolve, reject) {
        const { code, state, error } = data;
        
        if (error) {
            reject(new Error(error));
            return;
        }
        
        const callback = this.callbacks.get(state);
        if (!callback) {
            reject(new Error('Invalid OAuth state'));
            return;
        }
        
        try {
            const tokens = await this.exchangeCodeForTokens(code, callback.config);
            this.tokens[callback.serviceName] = tokens;
            this.saveTokens();
            resolve(tokens);
        } catch (error) {
            reject(error);
        }
    }
    
    async exchangeCodeForTokens(code, config) {
        const response = await fetch(config.tokenURL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                code: code,
                client_id: config.clientId,
                client_secret: config.clientSecret,
                redirect_uri: config.redirectUri
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to exchange code for tokens');
        }
        
        return response.json();
    }
    
    generateState() {
        return Math.random().toString(36).substring(2, 15) + 
               Math.random().toString(36).substring(2, 15);
    }
    
    getTokens(serviceName) {
        return this.tokens[serviceName] || null;
    }
    
    revokeTokens(serviceName) {
        delete this.tokens[serviceName];
        this.saveTokens();
    }
}



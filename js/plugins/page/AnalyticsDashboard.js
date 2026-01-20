// AnalyticsDashboard.js - Page plugin for analytics dashboard
import { BasePlugin } from '../../core/BasePlugin.js';
import { DOMUtils } from '../../utils/dom.js';
import { StringUtils } from '../../utils/string.js';
import { StorageUtils } from '../../utils/storage.js';

export default class AnalyticsDashboard extends BasePlugin {
    constructor(app = null, config = {}) {
        super({
            id: 'analytics-dashboard',
            name: 'Analytics Dashboard',
            description: 'Track and visualize page activity and productivity metrics.',
            type: 'page',
            defaultConfig: {
                enabled: true
            },
            ...config
        });
        // Store app if provided (for immediate access)
        if (app) {
            this.app = app;
        }
        // Initialize analytics after app is available
        this.analytics = {};
    }
    
    async onInit() {
        // Load analytics after app is initialized
        this.analytics = this.loadAnalytics();
    }
    
    loadAnalytics() {
        // Load from storage or initialize
        if (!this.app) {
            return {};
        }
        return StorageUtils.get('twodo-analytics') || {};
    }
    
    saveAnalytics() {
        if (!this.app) return;
        StorageUtils.set('twodo-analytics', this.analytics);
    }
    
    async onInit() {
        if (this.config.enabled) {
            this.trackEvents();
            this.app.eventBus.on('page:render', this.handlePageRender.bind(this));
        }
    }
    
    async onDestroy() {
        this.app.eventBus.off('page:render', this.handlePageRender.bind(this));
    }
    
    trackEvents() {
        // Track element creation
        this.app.eventBus.on('element:created', ({ pageId, element }) => {
            this.recordEvent(pageId, 'element_created', { elementType: element.type });
        });
        
        // Track element completion
        this.app.eventBus.on('element:completed', ({ pageId, element }) => {
            this.recordEvent(pageId, 'element_completed', { elementType: element.type });
        });
        
        // Track time spent
        this.app.eventBus.on('timer:stopped', ({ pageId, duration }) => {
            this.recordEvent(pageId, 'time_logged', { duration });
        });
    }
    
    recordEvent(pageId, eventType, data = {}) {
        if (!this.analytics[pageId]) {
            this.analytics[pageId] = {
                events: [],
                stats: {}
            };
        }
        
        this.analytics[pageId].events.push({
            type: eventType,
            timestamp: new Date().toISOString(),
            ...data
        });
        
        this.updateStats(pageId);
        this.saveAnalytics();
    }
    
    updateStats(pageId) {
        const pageAnalytics = this.analytics[pageId];
        if (!pageAnalytics) return;
        
        const events = pageAnalytics.events || [];
        const today = new Date().toISOString().split('T')[0];
        const todayEvents = events.filter(e => e.timestamp.startsWith(today));
        
        pageAnalytics.stats = {
            totalElements: events.filter(e => e.type === 'element_created').length,
            completedToday: todayEvents.filter(e => e.type === 'element_completed').length,
            timeSpentToday: todayEvents
                .filter(e => e.type === 'time_logged')
                .reduce((sum, e) => sum + (e.duration || 0), 0),
            completionRate: this.calculateCompletionRate(pageId)
        };
    }
    
    calculateCompletionRate(pageId) {
        const page = this.app.documents?.find(p => p.id === pageId);
        if (!page) return 0;
        
        let total = 0;
        let completed = 0;
        
        page.groups?.forEach(bin => {
            const items = bin.items || [];
            bin.items = items;
            items.forEach(element => {
                total++;
                if (element.completed) completed++;
            });
        });
        
        return total > 0 ? Math.round((completed / total) * 100) : 0;
    }
    
    handlePageRender({ pageElement, pageData }) {
        if (!pageData.pluginConfigs?.[this.id]?.enabled) {
            return;
        }
        
        // Add analytics widget to page
        const pageContent = pageElement.querySelector('.page-content, [id^="page-content-"]');
        if (pageContent) {
            const existingWidget = pageContent.querySelector('.analytics-widget');
            if (existingWidget) existingWidget.remove();
            
            const widget = this.renderAnalyticsWidget(pageData.id);
            pageContent.insertBefore(widget, pageContent.firstChild);
        }
    }
    
    renderAnalyticsWidget(pageId) {
        const stats = this.analytics[pageId]?.stats || {};
        const completionRate = stats.completionRate || 0;
        const completedToday = stats.completedToday || 0;
        const timeSpentToday = stats.timeSpentToday || 0;
        
        const widget = DOMUtils.createElement('div', {
            className: 'analytics-widget',
            style: 'padding: 15px; background: #2a2a2a; border-radius: 4px; margin-bottom: 15px; display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px;'
        });
        
        widget.innerHTML = `
            <div style="text-align: center;">
                <div style="font-size: 24px; font-weight: bold; color: #4a9eff;">${completionRate}%</div>
                <div style="font-size: 11px; color: #888; margin-top: 3px;">Completion Rate</div>
            </div>
            <div style="text-align: center;">
                <div style="font-size: 24px; font-weight: bold; color: #27ae60;">${completedToday}</div>
                <div style="font-size: 11px; color: #888; margin-top: 3px;">Completed Today</div>
            </div>
            <div style="text-align: center;">
                <div style="font-size: 24px; font-weight: bold; color: #f39c12;">${this.formatTime(timeSpentToday)}</div>
                <div style="font-size: 11px; color: #888; margin-top: 3px;">Time Spent Today</div>
            </div>
            <div style="text-align: center;">
                <div style="font-size: 24px; font-weight: bold; color: #9b59b6;">${stats.totalElements || 0}</div>
                <div style="font-size: 11px; color: #888; margin-top: 3px;">Total Elements</div>
            </div>
        `;
        
        return widget;
    }
    
    formatTime(seconds) {
        if (!seconds) return '0m';
        if (seconds < 60) return `${seconds}s`;
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    }
    
    renderConfigUI(container, pageData) {
        const stats = this.analytics[pageData.id]?.stats || {};
        
        let html = `
            <div style="margin-top: 15px; padding: 10px; background: #1a1a1a; border-radius: 4px;">
                <label style="font-weight: 600;">Analytics:</label>
                <div style="margin-top: 10px; font-size: 12px;">
                    <div>Completion Rate: <strong>${stats.completionRate || 0}%</strong></div>
                    <div style="margin-top: 5px;">Completed Today: <strong>${stats.completedToday || 0}</strong></div>
                    <div style="margin-top: 5px;">Time Spent Today: <strong>${this.formatTime(stats.timeSpentToday || 0)}</strong></div>
                    <div style="margin-top: 5px;">Total Elements: <strong>${stats.totalElements || 0}</strong></div>
                </div>
            </div>
        `;
        container.innerHTML = html;
    }
}



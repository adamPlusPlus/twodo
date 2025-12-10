// HabitTracker.js - Habit tracking element type
import { BaseElementType } from '../../core/BaseElementType.js';
import { DOMUtils } from '../../utils/dom.js';
import { StringUtils } from '../../utils/string.js';
import { DateUtils } from '../../utils/date.js';

export default class HabitTracker extends BaseElementType {
    constructor() {
        super({
            id: 'habit-tracker',
            name: 'Habit Tracker',
            description: 'Track habits with streak calculation and visualization.',
            elementType: 'habit'
        });
    }
    
    getDefaultData() {
        return {
            type: 'habit',
            text: 'New Habit',
            completed: false,
            persistent: true,
            habitData: {
                streak: 0,
                longestStreak: 0,
                totalCompletions: 0,
                completionDates: [], // Array of ISO date strings
                targetFrequency: 'daily', // 'daily', 'weekly', 'custom'
                customDays: [] // For custom frequency
            },
            children: []
        };
    }
    
    render(element, pageId, binId, elementIndex, container) {
        const habitDiv = DOMUtils.createElement('div', {
            className: 'element habit-element',
            dataset: {
                pageId: pageId,
                binId: binId,
                elementIndex: elementIndex
            },
            style: 'padding: 15px; background: #2a2a2a; border-radius: 4px; margin-bottom: 10px;'
        });
        
        // Habit header
        const header = DOMUtils.createElement('div', {
            className: 'habit-header',
            style: 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;'
        });
        
        const title = DOMUtils.createElement('div', {
            className: 'habit-title',
            style: 'font-weight: bold; font-size: 14px; color: #e0e0e0;'
        }, StringUtils.escapeHtml(element.text || 'Untitled Habit'));
        
        const checkbox = DOMUtils.createElement('input', {
            type: 'checkbox',
            className: 'habit-checkbox',
            checked: this.isCompletedToday(element),
            style: 'width: 20px; height: 20px; cursor: pointer;'
        });
        
        checkbox.addEventListener('change', (e) => {
            this.toggleHabit(pageId, binId, elementIndex, e.target.checked);
        });
        
        header.appendChild(title);
        header.appendChild(checkbox);
        habitDiv.appendChild(header);
        
        // Habit stats
        const stats = this.calculateStats(element);
        const statsDiv = DOMUtils.createElement('div', {
            className: 'habit-stats',
            style: 'display: flex; gap: 15px; font-size: 12px; color: #888; margin-top: 10px;'
        });
        
        statsDiv.innerHTML = `
            <div>🔥 Streak: <strong style="color: #f39c12;">${stats.currentStreak}</strong></div>
            <div>🏆 Longest: <strong style="color: #27ae60;">${stats.longestStreak}</strong></div>
            <div>✅ Total: <strong>${stats.totalCompletions}</strong></div>
        `;
        
        habitDiv.appendChild(statsDiv);
        
        // Habit calendar visualization (last 30 days)
        const calendarDiv = this.renderHabitCalendar(element);
        habitDiv.appendChild(calendarDiv);
        
        container.appendChild(habitDiv);
    }
    
    renderHabitCalendar(element) {
        const calendarDiv = DOMUtils.createElement('div', {
            className: 'habit-calendar',
            style: 'margin-top: 15px; display: grid; grid-template-columns: repeat(7, 1fr); gap: 3px;'
        });
        
        const today = new Date();
        const days = [];
        
        // Get last 30 days
        for (let i = 29; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);
            days.push(date);
        }
        
        days.forEach(date => {
            const dateStr = date.toISOString().split('T')[0];
            const isCompleted = element.habitData?.completionDates?.includes(dateStr) || false;
            const isToday = dateStr === today.toISOString().split('T')[0];
            
            const dayBox = DOMUtils.createElement('div', {
                className: 'habit-day',
                title: date.toLocaleDateString(),
                style: `
                    width: 20px; height: 20px; border-radius: 3px; 
                    background: ${isCompleted ? '#27ae60' : '#1a1a1a'}; 
                    border: ${isToday ? '2px solid #4a9eff' : '1px solid #333'};
                    cursor: pointer;
                `
            });
            
            dayBox.addEventListener('click', () => {
                this.toggleHabitDate(element, dateStr);
            });
            
            calendarDiv.appendChild(dayBox);
        });
        
        return calendarDiv;
    }
    
    calculateStats(element) {
        const habitData = element.habitData || {};
        const completionDates = habitData.completionDates || [];
        
        // Calculate current streak
        let currentStreak = 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        for (let i = 0; i < 365; i++) {
            const checkDate = new Date(today);
            checkDate.setDate(today.getDate() - i);
            const dateStr = checkDate.toISOString().split('T')[0];
            
            if (completionDates.includes(dateStr)) {
                currentStreak++;
            } else if (i > 0) {
                // Break in streak
                break;
            }
        }
        
        // Calculate longest streak
        let longestStreak = 0;
        let tempStreak = 0;
        const sortedDates = [...completionDates].sort();
        
        for (let i = 0; i < sortedDates.length; i++) {
            if (i === 0) {
                tempStreak = 1;
            } else {
                const prevDate = new Date(sortedDates[i - 1]);
                const currDate = new Date(sortedDates[i]);
                const daysDiff = Math.floor((currDate - prevDate) / (1000 * 60 * 60 * 24));
                
                if (daysDiff === 1) {
                    tempStreak++;
                } else {
                    longestStreak = Math.max(longestStreak, tempStreak);
                    tempStreak = 1;
                }
            }
        }
        longestStreak = Math.max(longestStreak, tempStreak);
        
        return {
            currentStreak,
            longestStreak,
            totalCompletions: completionDates.length
        };
    }
    
    isCompletedToday(element) {
        const today = new Date().toISOString().split('T')[0];
        return element.habitData?.completionDates?.includes(today) || false;
    }
    
    toggleHabit(pageId, binId, elementIndex, checked) {
        const page = this.app.pages.find(p => p.id === pageId);
        const bin = page?.bins?.find(b => b.id === binId);
        const element = bin?.elements?.[elementIndex];
        if (!element) return;
        
        if (!element.habitData) {
            element.habitData = this.getDefaultData().habitData;
        }
        
        const today = new Date().toISOString().split('T')[0];
        const completionDates = element.habitData.completionDates || [];
        
        if (checked) {
            if (!completionDates.includes(today)) {
                completionDates.push(today);
            }
        } else {
            element.habitData.completionDates = completionDates.filter(d => d !== today);
        }
        
        element.habitData.completionDates = completionDates.sort();
        element.habitData.totalCompletions = completionDates.length;
        
        // Recalculate streaks
        const stats = this.calculateStats(element);
        element.habitData.streak = stats.currentStreak;
        element.habitData.longestStreak = stats.longestStreak;
        
        this.app.dataManager.saveData();
        this.app.render();
    }
    
    toggleHabitDate(element, dateStr) {
        if (!element.habitData) {
            element.habitData = this.getDefaultData().habitData;
        }
        
        const completionDates = element.habitData.completionDates || [];
        const index = completionDates.indexOf(dateStr);
        
        if (index >= 0) {
            completionDates.splice(index, 1);
        } else {
            completionDates.push(dateStr);
        }
        
        element.habitData.completionDates = completionDates.sort();
        element.habitData.totalCompletions = completionDates.length;
        
        // Recalculate streaks
        const stats = this.calculateStats(element);
        element.habitData.streak = stats.currentStreak;
        element.habitData.longestStreak = stats.longestStreak;
        
        this.app.dataManager.saveData();
        this.app.render();
    }
}



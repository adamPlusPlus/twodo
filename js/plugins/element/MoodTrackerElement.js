// MoodTrackerElement.js - Mood tracking element type
import { BaseElementType } from '../../core/BaseElementType.js';
import { DOMUtils } from '../../utils/dom.js';
import { StringUtils } from '../../utils/string.js';

export default class MoodTrackerElement extends BaseElementType {
    constructor() {
        super({
            id: 'mood-tracker-element',
            name: 'Mood Tracker',
            description: 'Track moods with visualizations.',
            elementType: 'mood',
            keyboardShortcut: 'm'
        });
    }
    
    getDefaultData() {
        return {
            type: 'mood',
            text: 'Mood Tracker',
            moods: [],
            completed: false,
            persistent: true,
            children: []
        };
    }
    
    render(element, pageId, binId, elementIndex, container) {
        const moodDiv = DOMUtils.createElement('div', {
            className: 'element mood-element',
            dataset: {
                pageId: pageId,
                binId: binId,
                elementIndex: elementIndex
            },
            style: 'padding: 15px; background: #2a2a2a; border-radius: 4px; margin-bottom: 10px; border-left: 4px solid #9b59b6;'
        });
        
        // Title
        const title = DOMUtils.createElement('div', {
            className: 'mood-title',
            style: 'font-weight: bold; font-size: 14px; color: #e0e0e0; margin-bottom: 15px;'
        }, StringUtils.escapeHtml(element.text || 'Mood Tracker'));
        
        moodDiv.appendChild(title);
        
        // Mood calendar (last 30 days)
        const calendar = this.renderMoodCalendar(element);
        moodDiv.appendChild(calendar);
        
        // Average mood
        const avgMood = this.calculateAverageMood(element.moods || []);
        if (avgMood > 0) {
            const avgDiv = DOMUtils.createElement('div', {
                style: 'margin-top: 15px; text-align: center; font-size: 12px; color: #888;'
            }, `Average Mood: ${this.getMoodEmoji(avgMood)} (${avgMood.toFixed(1)}/5)`);
            moodDiv.appendChild(avgDiv);
        }
        
        container.appendChild(moodDiv);
    }
    
    renderMoodCalendar(element) {
        const calendarDiv = DOMUtils.createElement('div', {
            className: 'mood-calendar',
            style: 'display: grid; grid-template-columns: repeat(7, 1fr); gap: 3px;'
        });
        
        const today = new Date();
        const moods = element.moods || [];
        const moodMap = new Map();
        moods.forEach(mood => {
            moodMap.set(mood.date, mood.value);
        });
        
        // Last 30 days
        for (let i = 29; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            const moodValue = moodMap.get(dateStr) || 0;
            const isToday = dateStr === today.toISOString().split('T')[0];
            
            const dayBox = DOMUtils.createElement('div', {
                className: 'mood-day',
                title: `${date.toLocaleDateString()}: ${moodValue > 0 ? this.getMoodEmoji(moodValue) : 'No entry'}`,
                style: `
                    width: 30px; height: 30px; border-radius: 3px; 
                    background: ${this.getMoodColor(moodValue)}; 
                    border: ${isToday ? '2px solid #4a9eff' : '1px solid #333'};
                    cursor: pointer; display: flex; align-items: center; justify-content: center;
                    font-size: 16px;
                `
            }, moodValue > 0 ? this.getMoodEmoji(moodValue) : '');
            
            dayBox.addEventListener('click', () => {
                this.showMoodEntryModal(dateStr, element);
            });
            
            calendarDiv.appendChild(dayBox);
        }
        
        return calendarDiv;
    }
    
    getMoodEmoji(value) {
        const emojis = ['😢', '😕', '😐', '🙂', '😄'];
        return emojis[Math.min(Math.max(Math.round(value) - 1, 0), 4)] || '😐';
    }
    
    getMoodColor(value) {
        if (value === 0) return '#1a1a1a';
        const colors = ['#e74c3c', '#f39c12', '#f1c40f', '#2ecc71', '#27ae60'];
        return colors[Math.min(Math.max(Math.round(value) - 1, 0), 4)] || '#1a1a1a';
    }
    
    calculateAverageMood(moods) {
        if (moods.length === 0) return 0;
        const sum = moods.reduce((acc, mood) => acc + (mood.value || 0), 0);
        return sum / moods.length;
    }
    
    showMoodEntryModal(dateStr, element) {
        const existingMood = (element.moods || []).find(m => m.date === dateStr);
        const moodValue = existingMood?.value || 0;
        
        const modal = document.getElementById('modal');
        const modalBody = document.getElementById('modal-body');
        
        modalBody.innerHTML = `
            <h3>Mood Entry - ${new Date(dateStr).toLocaleDateString()}</h3>
            <div style="margin-top: 20px;">
                <label>Mood (1-5):</label>
                <div style="display: flex; gap: 10px; margin-top: 10px; justify-content: center;">
                    ${[1, 2, 3, 4, 5].map(val => `
                        <button type="button" class="mood-value-btn" data-value="${val}" 
                                style="width: 60px; height: 60px; font-size: 30px; border: ${moodValue === val ? '3px solid #4a9eff' : '1px solid #555'}; 
                                background: ${moodValue === val ? '#2a2a2a' : '#1a1a1a'}; border-radius: 8px; cursor: pointer;">
                            ${this.getMoodEmoji(val)}
                        </button>
                    `).join('')}
                </div>
                <div style="margin-top: 15px; text-align: center; color: #888; font-size: 12px;">
                    <div>😢 Very Bad</div>
                    <div>😕 Bad</div>
                    <div>😐 Neutral</div>
                    <div>🙂 Good</div>
                    <div>😄 Very Good</div>
                </div>
            </div>
            <div style="margin-top: 20px;">
                <label>Notes (optional):</label>
                <textarea id="mood-notes-input" 
                          style="width: 100%; height: 80px; padding: 8px; margin-top: 5px; background: #1a1a1a; color: #e0e0e0; border: 1px solid #555; border-radius: 4px;"
                          placeholder="How are you feeling?">${StringUtils.escapeHtml(existingMood?.notes || '')}</textarea>
            </div>
            <div style="margin-top: 20px;">
                <button id="save-mood-btn" style="padding: 8px 15px; background: #4a9eff; color: white; border: none; border-radius: 4px; cursor: pointer;">Save</button>
                <button class="cancel" onclick="app.modalHandler.closeModal()" style="margin-left: 10px;">Cancel</button>
            </div>
        `;
        
        modal.classList.add('active');
        
        let selectedValue = moodValue;
        
        modalBody.querySelectorAll('.mood-value-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                selectedValue = parseInt(e.target.dataset.value);
                modalBody.querySelectorAll('.mood-value-btn').forEach(b => {
                    b.style.border = '1px solid #555';
                    b.style.background = '#1a1a1a';
                });
                e.target.style.border = '3px solid #4a9eff';
                e.target.style.background = '#2a2a2a';
            });
        });
        
        const saveBtn = modalBody.querySelector('#save-mood-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                if (!element.moods) element.moods = [];
                const existingIndex = element.moods.findIndex(m => m.date === dateStr);
                const notesInput = modalBody.querySelector('#mood-notes-input');
                
                const moodEntry = {
                    date: dateStr,
                    value: selectedValue,
                    notes: notesInput.value.trim()
                };
                
                if (existingIndex >= 0) {
                    element.moods[existingIndex] = moodEntry;
                } else {
                    element.moods.push(moodEntry);
                }
                
                element.moods.sort((a, b) => new Date(a.date) - new Date(b.date));
                
                this.app.dataManager.saveData();
                this.app.modalHandler.closeModal();
                this.app.render();
            });
        }
    }
    
    renderEditModalContent(elementData, pageId, binId, elementIndex) {
        return `
            <div style="margin-top: 15px;">
                <label>Title:</label>
                <input type="text" id="mood-title-input" value="${StringUtils.escapeHtml(elementData.text || '')}" 
                       style="width: 100%; padding: 8px; margin-top: 5px; background: #1a1a1a; color: #e0e0e0; border: 1px solid #555; border-radius: 4px;" />
            </div>
            <div style="margin-top: 15px; padding: 10px; background: #1a1a1a; border-radius: 4px;">
                <div style="color: #888; font-size: 12px; margin-bottom: 10px;">Click on calendar days to add mood entries</div>
            </div>
        `;
    }
    
    saveEditModalContent(elementData, modalBody) {
        const titleInput = modalBody.querySelector('#mood-title-input');
        if (titleInput) {
            elementData.text = titleInput.value.trim();
        }
    }
}


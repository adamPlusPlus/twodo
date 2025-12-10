// CalendarRenderer.js - Handles calendar element rendering
// Extracted from app.js to improve modularity
import { eventBus } from './EventBus.js';
import { EVENTS } from './AppEvents.js';

/**
 * CalendarRenderer - Handles rendering of calendar elements
 * 
 * This class extracts calendar rendering logic from app.js to improve modularity.
 */
export class CalendarRenderer {
    constructor(app) {
        this.app = app;
    }

    renderCalendar(container, pageId, binId, element, elementIndex) {
        // Initialize calendar properties if needed
        if (!element.displayMode) element.displayMode = 'current-date';
        if (!element.currentDate) element.currentDate = new Date().toISOString().split('T')[0];
        if (!element.targetingMode) element.targetingMode = 'default';
        if (!element.targetPages) element.targetPages = [];
        if (!element.targetBins) element.targetBins = [];
        if (!element.targetElements) element.targetElements = [];
        if (!element.targetTags) element.targetTags = [];
        
        const calendarContainer = document.createElement('div');
        calendarContainer.className = 'calendar-container';
        calendarContainer.style.padding = '10px';
        
        // Mode selector
        const modeSelector = document.createElement('div');
        modeSelector.style.display = 'flex';
        modeSelector.style.gap = '5px';
        modeSelector.style.marginBottom = '10px';
        modeSelector.style.flexWrap = 'wrap';
        
        const modes = [
            { value: 'current-date', label: 'Today' },
            { value: 'one-day', label: 'Day' },
            { value: 'week', label: 'Week' },
            { value: 'month', label: 'Month' }
        ];
        
        modes.forEach(mode => {
            const btn = document.createElement('button');
            btn.textContent = mode.label;
            btn.style.padding = '5px 10px';
            btn.style.border = '1px solid #555';
            btn.style.background = element.displayMode === mode.value ? '#4a9eff' : 'transparent';
            btn.style.color = element.displayMode === mode.value ? '#fff' : '#e0e0e0';
            btn.style.cursor = 'pointer';
            btn.style.borderRadius = '4px';
            btn.onclick = () => {
                element.displayMode = mode.value;
                this.app.dataManager.saveData();
                eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
            };
            modeSelector.appendChild(btn);
        });
        
        calendarContainer.appendChild(modeSelector);
        
        // Calendar display based on mode
        const calendarDisplay = document.createElement('div');
        calendarDisplay.className = 'calendar-display';
        
        switch (element.displayMode) {
            case 'current-date':
                this.renderCurrentDateView(calendarDisplay, element);
                break;
            case 'one-day':
                this.renderOneDayView(calendarDisplay, element);
                break;
            case 'week':
                this.renderWeekView(calendarDisplay, element);
                break;
            case 'month':
                this.renderMonthView(calendarDisplay, element);
                break;
        }

        calendarContainer.appendChild(calendarDisplay);
        container.appendChild(calendarContainer);
    }

    renderCurrentDateView(container, element) {
        const today = new Date();
        const dateStr = today.toISOString().split('T')[0];
        const dayName = today.toLocaleDateString('en-US', { weekday: 'long' });
        const monthName = today.toLocaleDateString('en-US', { month: 'long' });
        const dayNum = today.getDate();
        
        const dateDisplay = document.createElement('div');
        dateDisplay.style.textAlign = 'center';
        dateDisplay.style.padding = '20px';
        dateDisplay.innerHTML = `
            <div style="font-size: 24px; font-weight: bold; margin-bottom: 5px;">${dayName}</div>
            <div style="font-size: 18px; color: #888; margin-bottom: 10px;">${monthName} ${dayNum}</div>
            <div style="font-size: 14px; color: #aaa;">${dateStr}</div>
        `;
        
        // Get summary from targeted elements
        const summary = this.getCalendarSummary(element, dateStr);
        if (summary) {
            const summaryDiv = document.createElement('div');
            summaryDiv.style.marginTop = '15px';
            summaryDiv.style.padding = '10px';
            summaryDiv.style.background = '#2a2a2a';
            summaryDiv.style.borderRadius = '4px';
            summaryDiv.style.fontSize = '12px';
            summaryDiv.innerHTML = summary;
            dateDisplay.appendChild(summaryDiv);
        }

        container.appendChild(dateDisplay);
    }

    renderOneDayView(container, element) {
        const currentDate = element.currentDate ? new Date(element.currentDate) : new Date();
        
        const dayHeader = document.createElement('div');
        dayHeader.style.display = 'flex';
        dayHeader.style.justifyContent = 'space-between';
        dayHeader.style.alignItems = 'center';
        dayHeader.style.marginBottom = '10px';
        
        const prevBtn = document.createElement('button');
        prevBtn.textContent = '◀';
        prevBtn.style.padding = '5px 10px';
        prevBtn.style.border = '1px solid #555';
        prevBtn.style.background = 'transparent';
        prevBtn.style.color = '#e0e0e0';
        prevBtn.style.cursor = 'pointer';
        prevBtn.onclick = () => {
            currentDate.setDate(currentDate.getDate() - 1);
            element.currentDate = currentDate.toISOString().split('T')[0];
            this.app.dataManager.saveData();
            eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
        };
        
        const nextBtn = document.createElement('button');
        nextBtn.textContent = '▶';
        nextBtn.style.padding = '5px 10px';
        nextBtn.style.border = '1px solid #555';
        nextBtn.style.background = 'transparent';
        nextBtn.style.color = '#e0e0e0';
        nextBtn.style.cursor = 'pointer';
        nextBtn.onclick = () => {
            currentDate.setDate(currentDate.getDate() + 1);
            element.currentDate = currentDate.toISOString().split('T')[0];
            this.app.dataManager.saveData();
            eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
        };
        
        const dateStr = currentDate.toISOString().split('T')[0];
        const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' });
        const monthName = currentDate.toLocaleDateString('en-US', { month: 'long' });
        const dayNum = currentDate.getDate();
        
        const dateLabel = document.createElement('div');
        dateLabel.style.textAlign = 'center';
        dateLabel.style.flex = '1';
        dateLabel.innerHTML = `
            <div style="font-size: 18px; font-weight: bold;">${dayName}</div>
            <div style="font-size: 14px; color: #888;">${monthName} ${dayNum}</div>
        `;
        
        dayHeader.appendChild(prevBtn);
        dayHeader.appendChild(dateLabel);
        dayHeader.appendChild(nextBtn);
        container.appendChild(dayHeader);
        
        // Get summary for this date
        const summary = this.getCalendarSummary(element, dateStr);
        if (summary) {
            const summaryDiv = document.createElement('div');
            summaryDiv.style.padding = '10px';
            summaryDiv.style.background = '#2a2a2a';
            summaryDiv.style.borderRadius = '4px';
            summaryDiv.style.fontSize = '12px';
            summaryDiv.innerHTML = summary;
            container.appendChild(summaryDiv);

    renderWeekView(container, element) {
        const today = new Date();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay()); // Start from Sunday
        
        const weekGrid = document.createElement('div');
        weekGrid.style.display = 'grid';
        weekGrid.style.gridTemplateColumns = 'repeat(7, 1fr)';
        weekGrid.style.gap = '5px';
        
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        
        // Day headers
        dayNames.forEach(dayName => {
            const header = document.createElement('div');
            header.style.textAlign = 'center';
            header.style.padding = '5px';
            header.style.fontWeight = 'bold';
            header.style.fontSize = '12px';
            header.style.borderBottom = '1px solid #555';
            header.textContent = dayName;
            weekGrid.appendChild(header);
        });
        
        // Day boxes
        for (let i = 0; i < 7; i++) {
            const date = new Date(startOfWeek);
            date.setDate(startOfWeek.getDate() + i);
            const dateStr = date.toISOString().split('T')[0];
            const dayNum = date.getDate();
            const isToday = dateStr === today.toISOString().split('T')[0];
            
            const dayBox = document.createElement('div');
            dayBox.style.minHeight = '60px';
            dayBox.style.padding = '5px';
            dayBox.style.border = '1px solid #555';
            dayBox.style.borderRadius = '4px';
            dayBox.style.background = isToday ? '#3d3d3d' : '#2a2a2a';
            dayBox.style.cursor = 'pointer';
            
            const dayNumDiv = document.createElement('div');
            dayNumDiv.style.fontSize = '14px';
            dayNumDiv.style.fontWeight = isToday ? 'bold' : 'normal';
            dayNumDiv.style.color = isToday ? '#4a9eff' : '#e0e0e0';
            dayNumDiv.textContent = dayNum;
            dayBox.appendChild(dayNumDiv);
            
            // Get summary for this day
            const summary = this.getCalendarSummary(element, dateStr);
            if (summary) {
                const summaryDiv = document.createElement('div');
                summaryDiv.style.fontSize = '10px';
                summaryDiv.style.color = '#888';
                summaryDiv.style.marginTop = '5px';
                summaryDiv.innerHTML = summary;
                dayBox.appendChild(summaryDiv);

            weekGrid.appendChild(dayBox);

        container.appendChild(weekGrid);

    renderMonthView(container, element) {
        const today = new Date();
        const year = today.getFullYear();
        const month = today.getMonth();
        
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();
        
        const monthHeader = document.createElement('div');
        monthHeader.style.textAlign = 'center';
        monthHeader.style.fontSize = '18px';
        monthHeader.style.fontWeight = 'bold';
        monthHeader.style.marginBottom = '10px';
        monthHeader.textContent = today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        container.appendChild(monthHeader);
        
        const monthGrid = document.createElement('div');
        monthGrid.style.display = 'grid';
        monthGrid.style.gridTemplateColumns = 'repeat(7, 1fr)';
        monthGrid.style.gap = '3px';
        
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        
        // Day headers
        dayNames.forEach(dayName => {
            const header = document.createElement('div');
            header.style.textAlign = 'center';
            header.style.padding = '5px';
            header.style.fontWeight = 'bold';
            header.style.fontSize = '11px';
            header.style.borderBottom = '1px solid #555';
            header.textContent = dayName;
            monthGrid.appendChild(header);
        });
        
        // Empty cells for days before month starts
        for (let i = 0; i < startingDayOfWeek; i++) {
            const emptyCell = document.createElement('div');
            emptyCell.style.minHeight = '40px';
            monthGrid.appendChild(emptyCell);

        // Days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const dateStr = date.toISOString().split('T')[0];
            const isToday = dateStr === today.toISOString().split('T')[0];
            
            const dayBox = document.createElement('div');
            dayBox.style.minHeight = '40px';
            dayBox.style.padding = '3px';
            dayBox.style.border = '1px solid #555';
            dayBox.style.borderRadius = '3px';
            dayBox.style.background = isToday ? '#3d3d3d' : '#2a2a2a';
            dayBox.style.cursor = 'pointer';
            dayBox.style.fontSize = '12px';
            
            const dayNumDiv = document.createElement('div');
            dayNumDiv.style.fontSize = '12px';
            dayNumDiv.style.fontWeight = isToday ? 'bold' : 'normal';
            dayNumDiv.style.color = isToday ? '#4a9eff' : '#e0e0e0';
            dayNumDiv.textContent = day;
            dayBox.appendChild(dayNumDiv);
            
            // Get summary for this day (compact)
            const summary = this.getCalendarSummary(element, dateStr, true);
            if (summary) {
                const summaryDiv = document.createElement('div');
                summaryDiv.style.fontSize = '9px';
                summaryDiv.style.color = '#888';
                summaryDiv.style.marginTop = '2px';
                summaryDiv.style.overflow = 'hidden';
                summaryDiv.style.textOverflow = 'ellipsis';
                summaryDiv.style.whiteSpace = 'nowrap';
                summaryDiv.innerHTML = summary;
                dayBox.appendChild(summaryDiv);

            monthGrid.appendChild(dayBox);

        container.appendChild(monthGrid);

    getCalendarSummary(element, dateStr, compact = false) {
        // Get elements based on targeting mode
        let relevantElements = [];
        
        switch (element.targetingMode) {
            case 'default':
                // Get all elements from all pages
                this.app.appState.pages.forEach(page => {
                    page.bins?.forEach(bin => {
                        bin.elements?.forEach((el, idx) => {
                            relevantElements.push({ page, bin, element: el, elementIndex: idx });
                        });
                    });
                });
                break;
            case 'specific':
                // Get elements from specific pages/bins/elements
                element.targetPages.forEach(pageId => {
                    const page = this.app.appState.pages.find(p => p.id === pageId);
                    if (page) {
                        page.bins?.forEach(bin => {
                            bin.elements?.forEach((el, idx) => {
                                relevantElements.push({ page, bin, element: el, elementIndex: idx });
                            });
                        });

                });
                element.targetBins.forEach(({ pageId, binId }) => {
                    const page = this.app.appState.pages.find(p => p.id === pageId);
                    const bin = page?.bins?.find(b => b.id === binId);
                    if (bin) {
                        bin.elements?.forEach((el, idx) => {
                            relevantElements.push({ page, bin, element: el, elementIndex: idx });
                        });

                });
                element.targetElements.forEach(({ pageId, binId, elementIndex }) => {
                    const page = this.app.appState.pages.find(p => p.id === pageId);
                    const bin = page?.bins?.find(b => b.id === binId);
                    const el = bin?.elements?.[elementIndex];
                    if (el) {
                        relevantElements.push({ page, bin, element: el, elementIndex });
                    }
                });
                break;
            case 'tags':
                // Get elements with matching tags
                this.app.appState.pages.forEach(page => {
                    page.bins?.forEach(bin => {
                        bin.elements?.forEach((el, idx) => {
                            if (el.tags && Array.isArray(el.tags)) {
                                const hasMatchingTag = element.targetTags.some(tag => el.tags.includes(tag));
                                if (hasMatchingTag) {
                                    relevantElements.push({ page, bin, element: el, elementIndex: idx });


                        });
                    });
                });
                break;

        // Filter by date if element has deadline
        const dateElements = relevantElements.filter(({ element: el }) => {
            if (el.deadline) {
                const deadlineDate = new Date(el.deadline).toISOString().split('T')[0];
                return deadlineDate === dateStr;

            return false;
        });
        
        // Count completed vs total
        const total = dateElements.length;
        const completed = dateElements.filter(({ element: el }) => el.completed).length;
        
        if (total === 0) return null;
        
        if (compact) {
            return `${completed}/${total}`;
        } else {
            return `<div>Tasks: ${completed}/${total} completed</div>`;
}
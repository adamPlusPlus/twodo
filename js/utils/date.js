// Date Utilities - Date/time manipulation and formatting
export const DateUtils = {
    /**
     * Format date to string
     * @param {Date|string|number} date - Date to format
     * @param {string} format - Format string (default: 'YYYY-MM-DD')
     * @returns {string}
     */
    format(date, format = 'YYYY-MM-DD') {
        const d = this.toDate(date);
        if (!d) return '';
        
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        const seconds = String(d.getSeconds()).padStart(2, '0');
        
        return format
            .replace('YYYY', year)
            .replace('MM', month)
            .replace('DD', day)
            .replace('HH', hours)
            .replace('mm', minutes)
            .replace('ss', seconds);
    },
    
    /**
     * Parse date string to Date object
     * @param {string|Date|number} date - Date to parse
     * @returns {Date|null}
     */
    toDate(date) {
        if (date instanceof Date) return date;
        if (typeof date === 'number') return new Date(date);
        if (typeof date === 'string') {
            const parsed = new Date(date);
            return isNaN(parsed.getTime()) ? null : parsed;
        }
        return null;
    },
    
    /**
     * Get start of day
     * @param {Date|string|number} date - Date
     * @returns {Date}
     */
    startOfDay(date) {
        const d = this.toDate(date) || new Date();
        d.setHours(0, 0, 0, 0);
        return d;
    },
    
    /**
     * Get end of day
     * @param {Date|string|number} date - Date
     * @returns {Date}
     */
    endOfDay(date) {
        const d = this.toDate(date) || new Date();
        d.setHours(23, 59, 59, 999);
        return d;
    },
    
    /**
     * Add days to date
     * @param {Date|string|number} date - Date
     * @param {number} days - Number of days to add
     * @returns {Date}
     */
    addDays(date, days) {
        const d = this.toDate(date) || new Date();
        d.setDate(d.getDate() + days);
        return d;
    },
    
    /**
     * Add months to date
     * @param {Date|string|number} date - Date
     * @param {number} months - Number of months to add
     * @returns {Date}
     */
    addMonths(date, months) {
        const d = this.toDate(date) || new Date();
        d.setMonth(d.getMonth() + months);
        return d;
    },
    
    /**
     * Add years to date
     * @param {Date|string|number} date - Date
     * @param {number} years - Number of years to add
     * @returns {Date}
     */
    addYears(date, years) {
        const d = this.toDate(date) || new Date();
        d.setFullYear(d.getFullYear() + years);
        return d;
    },
    
    /**
     * Get difference in days between two dates
     * @param {Date|string|number} date1 - First date
     * @param {Date|string|number} date2 - Second date
     * @returns {number}
     */
    diffDays(date1, date2) {
        const d1 = this.startOfDay(this.toDate(date1) || new Date());
        const d2 = this.startOfDay(this.toDate(date2) || new Date());
        return Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
    },
    
    /**
     * Check if date is today
     * @param {Date|string|number} date - Date to check
     * @returns {boolean}
     */
    isToday(date) {
        const d = this.toDate(date);
        if (!d) return false;
        const today = this.startOfDay(new Date());
        const checkDate = this.startOfDay(d);
        return today.getTime() === checkDate.getTime();
    },
    
    /**
     * Check if date is in the past
     * @param {Date|string|number} date - Date to check
     * @returns {boolean}
     */
    isPast(date) {
        const d = this.toDate(date);
        if (!d) return false;
        return d.getTime() < Date.now();
    },
    
    /**
     * Check if date is in the future
     * @param {Date|string|number} date - Date to check
     * @returns {boolean}
     */
    isFuture(date) {
        const d = this.toDate(date);
        if (!d) return false;
        return d.getTime() > Date.now();
    },
    
    /**
     * Get relative time string (e.g., "2 days ago", "in 3 hours")
     * @param {Date|string|number} date - Date
     * @returns {string}
     */
    fromNow(date) {
        const d = this.toDate(date);
        if (!d) return '';
        
        const now = new Date();
        const diffMs = d.getTime() - now.getTime();
        const diffSecs = Math.floor(diffMs / 1000);
        const diffMins = Math.floor(diffSecs / 60);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);
        
        if (Math.abs(diffSecs) < 60) {
            return diffSecs < 0 ? 'just now' : 'in a moment';
        }
        if (Math.abs(diffMins) < 60) {
            const mins = Math.abs(diffMins);
            return diffMins < 0 ? `${mins} minute${mins !== 1 ? 's' : ''} ago` : `in ${mins} minute${mins !== 1 ? 's' : ''}`;
        }
        if (Math.abs(diffHours) < 24) {
            const hours = Math.abs(diffHours);
            return diffHours < 0 ? `${hours} hour${hours !== 1 ? 's' : ''} ago` : `in ${hours} hour${hours !== 1 ? 's' : ''}`;
        }
        if (Math.abs(diffDays) < 30) {
            const days = Math.abs(diffDays);
            return diffDays < 0 ? `${days} day${days !== 1 ? 's' : ''} ago` : `in ${days} day${days !== 1 ? 's' : ''}`;
        }
        
        return this.format(d, 'YYYY-MM-DD');
    },
    
    /**
     * Get week start (Monday)
     * @param {Date|string|number} date - Date
     * @returns {Date}
     */
    startOfWeek(date) {
        const d = this.toDate(date) || new Date();
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
        return this.startOfDay(new Date(d.setDate(diff)));
    },
    
    /**
     * Get week end (Sunday)
     * @param {Date|string|number} date - Date
     * @returns {Date}
     */
    endOfWeek(date) {
        const start = this.startOfWeek(date);
        return this.endOfDay(this.addDays(start, 6));
    },
    
    /**
     * Get month start
     * @param {Date|string|number} date - Date
     * @returns {Date}
     */
    startOfMonth(date) {
        const d = this.toDate(date) || new Date();
        return new Date(d.getFullYear(), d.getMonth(), 1);
    },
    
    /**
     * Get month end
     * @param {Date|string|number} date - Date
     * @returns {Date}
     */
    endOfMonth(date) {
        const d = this.toDate(date) || new Date();
        return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
    },
    
    /**
     * Get days in month
     * @param {Date|string|number} date - Date
     * @returns {number}
     */
    daysInMonth(date) {
        const d = this.toDate(date) || new Date();
        return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    },
    
    /**
     * Check if two dates are the same day
     * @param {Date|string|number} date1 - First date
     * @param {Date|string|number} date2 - Second date
     * @returns {boolean}
     */
    isSameDay(date1, date2) {
        const d1 = this.startOfDay(this.toDate(date1));
        const d2 = this.startOfDay(this.toDate(date2));
        return d1 && d2 && d1.getTime() === d2.getTime();
    },
    
    /**
     * Get array of dates in range
     * @param {Date|string|number} start - Start date
     * @param {Date|string|number} end - End date
     * @returns {Array<Date>}
     */
    dateRange(start, end) {
        const startDate = this.startOfDay(this.toDate(start));
        const endDate = this.startOfDay(this.toDate(end));
        if (!startDate || !endDate) return [];
        
        const dates = [];
        const current = new Date(startDate);
        
        while (current <= endDate) {
            dates.push(new Date(current));
            current.setDate(current.getDate() + 1);
        }
        
        return dates;
    }
};


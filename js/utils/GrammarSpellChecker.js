// GrammarSpellChecker.js - Base grammar and spelling checker for all views
export class GrammarSpellChecker {
    constructor(app) {
        this.app = app;
        this.dictionary = new Set();
        this.customWords = new Set();
        this.loadDictionary();
        this.loadCustomWords();
    }
    
    /**
     * Load basic dictionary (common English words)
     */
    loadDictionary() {
        // Common English words (can be expanded or loaded from file)
        const commonWords = [
            'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i',
            'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
            'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she',
            'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their',
            'what', 'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go',
            'me', 'when', 'make', 'can', 'like', 'time', 'no', 'just', 'him', 'know',
            'take', 'people', 'into', 'year', 'your', 'good', 'some', 'could', 'them',
            'see', 'other', 'than', 'then', 'now', 'look', 'only', 'come', 'its',
            'over', 'think', 'also', 'back', 'after', 'use', 'two', 'how', 'our',
            'work', 'first', 'well', 'way', 'even', 'new', 'want', 'because', 'any',
            'these', 'give', 'day', 'most', 'us', 'is', 'are', 'was', 'were', 'been',
            'being', 'has', 'had', 'having', 'does', 'did', 'doing', 'done', 'said',
            'says', 'went', 'gone', 'got', 'gotten', 'made', 'making', 'took', 'taking',
            'came', 'coming', 'saw', 'seen', 'knowing', 'known', 'think', 'thought',
            'thinking', 'looked', 'looking', 'wanted', 'wanting', 'used', 'using',
            'gave', 'given', 'giving', 'found', 'finding', 'told', 'telling', 'asked',
            'asking', 'worked', 'working', 'called', 'calling', 'tried', 'trying',
            'needed', 'needing', 'felt', 'feeling', 'became', 'becoming', 'left',
            'leaving', 'put', 'putting', 'meant', 'meaning', 'kept', 'keeping',
            'let', 'letting', 'began', 'beginning', 'seemed', 'seeming', 'helped',
            'helping', 'showed', 'showing', 'heard', 'hearing', 'played', 'playing',
            'moved', 'moving', 'lived', 'living', 'believed', 'believing', 'brought',
            'bringing', 'happened', 'happening', 'wrote', 'writing', 'sat', 'sitting',
            'stood', 'standing', 'lost', 'losing', 'paid', 'paying', 'met', 'meeting',
            'included', 'including', 'continued', 'continuing', 'set', 'setting',
            'learned', 'learning', 'changed', 'changing', 'led', 'leading', 'understood',
            'understanding', 'watched', 'watching', 'followed', 'following', 'stopped',
            'stopping', 'created', 'creating', 'spoke', 'speaking', 'read', 'reading',
            'spent', 'spending', 'grew', 'growing', 'opened', 'opening', 'walked',
            'walking', 'won', 'winning', 'taught', 'teaching', 'offered', 'offering',
            'remembered', 'remembering', 'considered', 'considering', 'appeared',
            'appearing', 'bought', 'buying', 'served', 'serving', 'died', 'dying',
            'sent', 'sending', 'built', 'building', 'stayed', 'staying', 'fell',
            'falling', 'cut', 'cutting', 'reached', 'reaching', 'killed', 'killing',
            'raised', 'raising', 'passed', 'passing', 'sold', 'selling', 'decided',
            'deciding', 'returned', 'returning', 'explained', 'explaining', 'developed',
            'developing', 'carried', 'carrying', 'broke', 'breaking', 'received',
            'receiving', 'agreed', 'agreeing', 'supported', 'supporting', 'hit',
            'hitting', 'produced', 'producing', 'ate', 'eating', 'covered', 'covering',
            'caught', 'catching', 'drew', 'drawing', 'chose', 'choosing'
        ];
        
        commonWords.forEach(word => this.dictionary.add(word.toLowerCase()));
    }
    
    /**
     * Load custom words from storage
     */
    loadCustomWords() {
        try {
            const stored = localStorage.getItem('twodo-custom-words');
            if (stored) {
                const words = JSON.parse(stored);
                words.forEach(word => this.customWords.add(word.toLowerCase()));
            }
        } catch (e) {
            console.error('Error loading custom words:', e);
        }
    }
    
    /**
     * Save custom words to storage
     */
    saveCustomWords() {
        try {
            localStorage.setItem('twodo-custom-words', JSON.stringify(Array.from(this.customWords)));
        } catch (e) {
            console.error('Error saving custom words:', e);
        }
    }
    
    /**
     * Add word to custom dictionary
     * @param {string} word - Word to add
     */
    addCustomWord(word) {
        if (word) {
            this.customWords.add(word.toLowerCase());
            this.saveCustomWords();
        }
    }
    
    /**
     * Check if word is valid (in dictionary or custom words)
     * @param {string} word - Word to check
     * @returns {boolean} True if valid
     */
    isValidWord(word) {
        if (!word) return true;
        const normalized = word.toLowerCase().replace(/[^\w]/g, '');
        return this.dictionary.has(normalized) || this.customWords.has(normalized);
    }
    
    /**
     * Extract words from text
     * @param {string} text - Text to extract words from
     * @returns {Array<string>} Array of words with positions
     */
    extractWords(text) {
        const words = [];
        const wordRegex = /\b[\w']+\b/g;
        let match;
        
        while ((match = wordRegex.exec(text)) !== null) {
            words.push({
                word: match[0],
                start: match.index,
                end: match.index + match[0].length,
                line: text.substring(0, match.index).split('\n').length - 1
            });
        }
        
        return words;
    }
    
    /**
     * Check spelling in text
     * @param {string} text - Text to check
     * @returns {Array<Object>} Array of spelling errors
     */
    checkSpelling(text) {
        const errors = [];
        const words = this.extractWords(text);
        
        words.forEach(({ word, start, end, line }) => {
            if (!this.isValidWord(word)) {
                errors.push({
                    type: 'spelling',
                    word: word,
                    start: start,
                    end: end,
                    line: line,
                    message: `Unknown word: "${word}"`,
                    suggestions: this.getSuggestions(word)
                });
            }
        });
        
        return errors;
    }
    
    /**
     * Get spelling suggestions for a word
     * @param {string} word - Word to get suggestions for
     * @returns {Array<string>} Array of suggestions
     */
    getSuggestions(word) {
        // Simple Levenshtein distance-based suggestions
        const suggestions = [];
        const maxDistance = 2;
        const normalizedWord = word.toLowerCase();
        
        // Check dictionary words
        this.dictionary.forEach(dictWord => {
            const distance = this.levenshteinDistance(normalizedWord, dictWord);
            if (distance <= maxDistance && distance > 0) {
                suggestions.push(dictWord);
            }
        });
        
        // Sort by distance and return top 5
        return suggestions
            .sort((a, b) => {
                const distA = this.levenshteinDistance(normalizedWord, a);
                const distB = this.levenshteinDistance(normalizedWord, b);
                return distA - distB;
            })
            .slice(0, 5);
    }
    
    /**
     * Calculate Levenshtein distance between two strings
     * @param {string} a - First string
     * @param {string} b - Second string
     * @returns {number} Distance
     */
    levenshteinDistance(a, b) {
        const matrix = [];
        
        for (let i = 0; i <= b.length; i++) {
            matrix[i] = [i];
        }
        
        for (let j = 0; j <= a.length; j++) {
            matrix[0][j] = j;
        }
        
        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                if (b.charAt(i - 1) === a.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }
        
        return matrix[b.length][a.length];
    }
    
    /**
     * Basic grammar checks
     * @param {string} text - Text to check
     * @returns {Array<Object>} Array of grammar errors
     */
    checkGrammar(text) {
        const errors = [];
        const lines = text.split('\n');
        
        lines.forEach((line, lineIndex) => {
            // Check for double spaces
            if (line.includes('  ')) {
                const matches = line.matchAll(/  +/g);
                for (const match of matches) {
                    errors.push({
                        type: 'grammar',
                        start: match.index,
                        end: match.index + match[0].length,
                        line: lineIndex,
                        message: 'Double space detected',
                        severity: 'warning'
                    });
                }
            }
            
            // Check for common mistakes
            const commonMistakes = [
                { pattern: /\bi\s+([a-z])/g, message: 'Capitalize "I"', fix: 'I $1' },
                { pattern: /\b(its|it's)\b/gi, message: 'Check "its" vs "it\'s"', severity: 'warning' },
                { pattern: /\b(your|you're)\b/gi, message: 'Check "your" vs "you\'re"', severity: 'warning' },
                { pattern: /\b(there|their|they're)\b/gi, message: 'Check "there" vs "their" vs "they\'re"', severity: 'warning' },
                { pattern: /\.{3,}/g, message: 'Use ellipsis (…) instead of multiple periods', fix: '…' },
                { pattern: /,,/g, message: 'Double comma', fix: ',' },
                { pattern: /\.\./g, message: 'Double period', fix: '.' }
            ];
            
            commonMistakes.forEach(({ pattern, message, fix, severity = 'error' }) => {
                const matches = line.matchAll(pattern);
                for (const match of matches) {
                    errors.push({
                        type: 'grammar',
                        start: match.index,
                        end: match.index + match[0].length,
                        line: lineIndex,
                        message: message,
                        fix: fix,
                        severity: severity
                    });
                }
            });
        });
        
        return errors;
    }
    
    /**
     * Check text for both spelling and grammar
     * @param {string} text - Text to check
     * @returns {Object} Object with spelling and grammar errors
     */
    checkText(text) {
        return {
            spelling: this.checkSpelling(text),
            grammar: this.checkGrammar(text),
            all: [...this.checkSpelling(text), ...this.checkGrammar(text)]
        };
    }
    
    /**
     * Highlight errors in text
     * @param {string} text - Text to highlight
     * @param {Array<Object>} errors - Array of errors
     * @returns {string} HTML with highlighted errors
     */
    highlightErrors(text, errors) {
        // Sort errors by position (descending) to avoid index shifting
        const sortedErrors = [...errors].sort((a, b) => b.start - a.start);
        let html = this.escapeHtml(text);
        
        sortedErrors.forEach(error => {
            const before = html.substring(0, error.start);
            const errorText = html.substring(error.start, error.end);
            const after = html.substring(error.end);
            const severity = error.severity || 'error';
            const color = severity === 'error' ? '#ff5555' : '#ffaa00';
            
            html = before + 
                `<span class="check-error" data-error-type="${error.type}" style="background: ${color}; color: white; padding: 2px 4px; border-radius: 2px; cursor: help;" title="${this.escapeHtml(error.message)}">${errorText}</span>` +
                after;
        });
        
        return html;
    }
    
    /**
     * Escape HTML
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}


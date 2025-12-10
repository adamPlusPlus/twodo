// Parser for the inputs file format
// Ω = completion, ∆ = fun modifier

function parseInputsFile(content) {
    const lines = content.split('\n');
    const pages = [];
    let currentPage = null;
    let pageNum = 0;
    
    lines.forEach((line, index) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('___')) return;
        
        // Check for page separator (pg 1, pg 2, etc.)
        const pageMatch = trimmed.match(/^pg\s+(\d+)/i);
        if (pageMatch) {
            // Save previous page if exists
            if (currentPage && currentPage.elements.length > 0) {
                pages.push(currentPage);
            }
            // Start new page
            pageNum = parseInt(pageMatch[1]);
            currentPage = {
                id: `page-${pageNum}`,
                title: `Page ${pageNum}`,
                elements: []
            };
            return;
        }
        
        // If no page started yet, create first page for initial tasks
        if (!currentPage) {
            pageNum = 0; // Will be updated when we see "pg 1"
            currentPage = {
                id: 'page-0',
                title: 'Page 0',
                elements: []
            };
        }
        
        // Check for section header (lines starting with Ω but not task lines)
        // These are header elements within a page, not new pages
        if (trimmed.startsWith('Ω') && !trimmed.startsWith('o\t')) {
            // Extract header title and time info
            const match = trimmed.match(/^Ω\s*(.+?)(?:\s*\(([^)]+)\))?(?:\s*(\d+\.?\d*))?$/);
            if (match && currentPage) {
                const title = match[1].trim();
                const timeInfo = match[2] || '';
                
                // Check if it has checkbox (has ∆ or completion markers)
                const hasCheckbox = trimmed.includes('∆') || /Ω\s{2,}/.test(trimmed);
                
                // Add header element to current page
                if (hasCheckbox) {
                    currentPage.elements.push({
                        type: 'header-checkbox',
                        text: title,
                        completed: countCompletions(trimmed) > 0,
                        repeats: true,
                        timeAllocated: timeInfo,
                        funModifier: trimmed.includes('∆') ? extractFunModifier(trimmed) : ''
                    });
                } else {
                    currentPage.elements.push({
                        type: 'header',
                        text: title,
                        repeats: true,
                        timeAllocated: timeInfo
                    });
                }
                return;
            }
        }
        
        // Regular task lines starting with 'o\t'
        if (trimmed.startsWith('o\t')) {
            const taskContent = trimmed.substring(2);
            
            // Check for multi-checkbox format (contains |)
            if (taskContent.includes('|')) {
                const checkboxes = parseMultiCheckbox(taskContent);
                currentPage?.elements.push({
                    type: 'multi-checkbox',
                    items: checkboxes,
                    completed: checkboxes.some(c => c.completed),
                    repeats: true,
                    timeAllocated: extractTimeInfo(taskContent),
                    funModifier: extractFunModifier(taskContent)
                });
            }
            // Check for subtask indicators (nested items)
            else if (taskContent.includes('∆') || taskContent.match(/Ω\s+Ω/)) {
                // This might be a task with subtasks
                const mainTask = extractMainTask(taskContent);
                const subtasks = extractSubtasks(taskContent);
                
                if (subtasks.length > 0) {
                    currentPage?.elements.push({
                        type: 'task',
                        text: mainTask,
                        completed: countCompletions(taskContent) > 0,
                        repeats: true,
                        timeAllocated: extractTimeInfo(taskContent),
                        funModifier: extractFunModifier(taskContent),
                        subtasks: subtasks.map(st => ({
                            text: st.text,
                            completed: st.completed,
                            timeAllocated: st.timeAllocated || extractTimeInfo(taskContent)
                        }))
                    });
                } else {
                    // Regular task
                    currentPage?.elements.push({
                        type: 'task',
                        text: mainTask,
                        completed: countCompletions(taskContent) > 0,
                        repeats: true,
                        timeAllocated: extractTimeInfo(taskContent),
                        funModifier: extractFunModifier(taskContent)
                    });
                }
            }
            // Simple task
            else {
                currentPage?.elements.push({
                    type: 'task',
                    text: taskContent.replace(/[Ω∆]/g, '').trim(),
                    completed: countCompletions(taskContent) > 0,
                    repeats: true,
                    timeAllocated: extractTimeInfo(taskContent),
                    funModifier: extractFunModifier(taskContent)
                });
            }
        }
    });
    
    // Add last page
    if (currentPage && currentPage.elements.length > 0) {
        pages.push(currentPage);
    }
    
    return pages;
}

function countCompletions(text) {
    // Count Ω symbols (excluding the first one which might be part of header)
    const matches = text.match(/Ω/g);
    return matches ? matches.length - (text.trim().startsWith('Ω') ? 1 : 0) : 0;
}

function extractFunModifier(text) {
    if (text.includes('∆')) {
        // Extract text after ∆ or between ∆ and Ω
        const parts = text.split('∆');
        const funParts = [];
        parts.forEach((part, i) => {
            if (i > 0) {
                const clean = part.split('Ω')[0].trim();
                if (clean) funParts.push(clean);
            }
        });
        return funParts.join(', ') || 'Made fun';
    }
    return '';
}

function extractTimeInfo(text) {
    const match = text.match(/\(([^)]+)\)/);
    return match ? match[1] : '';
}

function parseMultiCheckbox(text) {
    const parts = text.split('|');
    return parts.map(part => {
        const clean = part.trim();
        const completed = countCompletions(clean) > 0;
        const fun = clean.includes('∆');
        let label = clean.replace(/[Ω∆]/g, '').trim();
        
        // Extract label from patterns like "∆ Ω Ω Ω Ω Ωpu"
        if (label.match(/^[a-z]{2,}$/i) && clean.match(/Ω/)) {
            label = clean.match(/[a-z]{2,}$/i)?.[0] || label;
        }
        
        return {
            text: label || 'Item',
            completed: completed,
            funModifier: fun ? 'Made fun' : ''
        };
    });
}

function extractMainTask(text) {
    // Remove Ω, ∆, and time info to get main task
    return text
        .replace(/Ω/g, '')
        .replace(/∆/g, '')
        .replace(/\([^)]+\)/g, '')
        .replace(/\d+\.?\d*/g, '')
        .trim();
}

function extractSubtasks(text) {
    const subtasks = [];
    
    // Look for patterns like "Ω ∆ Task1 Ω ∆ Task2"
    const parts = text.split('Ω').filter(p => p.trim());
    
    parts.forEach(part => {
        if (part.includes('∆')) {
            const subtaskText = part.replace('∆', '').trim();
            if (subtaskText) {
                subtasks.push({
                    text: subtaskText,
                    completed: part.includes('Ω'),
                    timeAllocated: extractTimeInfo(text)
                });
            }
        }
    });
    
    return subtasks;
}

// Export for use in app.js (ES6 module)
export { parseInputsFile };


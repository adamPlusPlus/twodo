// markdown.js - Utility for parsing markdown text into app structure

/**
 * Parse markdown text and convert to app structure
 * - ## headers become bins
 * - ### headers become header elements within bins
 * - Bullet points and text lines become checkbox elements
 * - Empty lines are removed
 * - Markdown formatting (bold, etc.) is preserved in text
 */
export function parseMarkdownToAppStructure(markdownText) {
    const lines = markdownText.split('\n');
    const bins = [];
    let currentBin = null;
    let currentHeader = null;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Skip empty lines
        if (!line) {
            continue;
        }
        
        // Check for ## header (bin)
        if (line.startsWith('## ')) {
            // Save previous bin if exists
            if (currentBin) {
                bins.push(currentBin);
            }
            
            // Create new bin
            const binTitle = line.substring(3).trim();
            currentBin = {
                title: binTitle,
                elements: []
            };
            currentHeader = null;
        }
        // Check for ### header (header element within bin)
        else if (line.startsWith('### ')) {
            if (!currentBin) {
                // If no bin exists, create a default one
                currentBin = {
                    title: 'Imported Content',
                    elements: []
                };
            }
            
            const headerText = line.substring(4).trim();
            currentHeader = {
                type: 'header',
                text: parseMarkdownText(headerText),
                checked: false
            };
            currentBin.elements.push(currentHeader);
        }
        // Check for bullet points or regular text
        else {
            if (!currentBin) {
                // If no bin exists, create a default one
                currentBin = {
                    title: 'Imported Content',
                    elements: []
                };
            }
            
            // Check if it's a bullet point
            if (line.startsWith('- ') || line.startsWith('* ') || line.startsWith('+ ')) {
                const text = line.substring(2).trim();
                // Check for checkbox syntax: [x], [X], or [ ]
                const checkboxMatch = text.match(/^\[([ xX])\]\s*(.*)$/);
                if (checkboxMatch) {
                    const isChecked = checkboxMatch[1].toLowerCase() === 'x';
                    const taskText = checkboxMatch[2];
                    const element = {
                        type: 'task',
                        text: parseMarkdownText(taskText),
                        checked: isChecked
                    };
                    currentBin.elements.push(element);
                } else {
                    // Regular bullet point without checkbox
                    const element = {
                        type: 'task',
                        text: parseMarkdownText(text),
                        checked: false
                    };
                    currentBin.elements.push(element);
                }
            } else {
                // Regular text line - create as checkbox element
                const element = {
                    type: 'task',
                    text: parseMarkdownText(line),
                    checked: false
                };
                currentBin.elements.push(element);
            }
            
            currentHeader = null; // Reset header context after adding element
        }
    }
    
    // Don't forget to add the last bin
    if (currentBin) {
        bins.push(currentBin);
    }
    
    return bins;
}

/**
 * Parse markdown formatting in text (bold, italic, etc.)
 * Converts markdown to HTML-like format that the app can render
 */
function parseMarkdownText(text) {
    if (!text) return '';
    
    // Convert **bold** to <strong>bold</strong>
    text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    
    // Convert *italic* to <em>italic</em> (but not if it's part of **bold**)
    text = text.replace(/(?<!\*)\*([^*]+?)\*(?!\*)/g, '<em>$1</em>');
    
    // Convert `code` to <code>code</code>
    text = text.replace(/`([^`]+?)`/g, '<code>$1</code>');
    
    // Convert [link text](url) to <a href="url">link text</a>
    text = text.replace(/\[([^\]]+?)\]\(([^)]+?)\)/g, '<a href="$2">$1</a>');
    
    return text;
}


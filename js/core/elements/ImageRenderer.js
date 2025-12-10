// ImageRenderer.js - Handles image element rendering
// ImageRenderer.js - Extracted from ElementRenderer.js to improve modularity
import { eventBus } from '../EventBus.js';
import { EVENTS } from '../AppEvents.js';

/**
 * ImageRenderer - Handles rendering of image elements
 */
export class ImageRenderer {
    constructor(app) {
        this.app = app;
    }
    
    /**
     * Render a image element
     * @param {HTMLElement} div - The element container div (already created with classes and drag handlers)
     * @param {string} pageId - Page ID
     * @param {string} binId - Bin ID
     * @param {Object} element - Element data
     * @param {number|string} elementIndex - Element index
     * @param {number} depth - Current nesting depth
     * @param {Function} renderChildren - Function to render children elements
     * @returns {void}
     */
    render(div, pageId, binId, element, elementIndex, depth, renderChildren) {
        if (element.imageUrl === undefined) element.imageUrl = null;
        if (element.imageAlignment === undefined) element.imageAlignment = 'left';
        if (element.imageWidth === undefined) element.imageWidth = 300; // Default width

        const imageHeader = document.createElement('div');
        imageHeader.className = 'task-header';
        imageHeader.style.display = 'flex';
        imageHeader.style.alignItems = 'center';
        imageHeader.style.gap = '8px';
        imageHeader.style.flexWrap = 'nowrap';

        // Add checkbox
        const imageCheckbox = document.createElement('input');
        imageCheckbox.type = 'checkbox';
        imageCheckbox.checked = element.completed || false;
        imageCheckbox.onchange = (e) => {
        e.stopPropagation();
        this.app.toggleElement(pageId, binId, elementIndex);
        };
        // Prevent text click from firing when clicking checkbox
        imageCheckbox.addEventListener('click', (e) => {
        e.stopPropagation();
        });
        imageHeader.appendChild(imageCheckbox);

        const imageText = element.text || '';
        const shouldShowImageTitle = imageText.trim() && imageText.trim() !== 'Image';

        if (shouldShowImageTitle) {
        const imageTextSpan = document.createElement('span');
        imageTextSpan.className = 'task-text';
        imageTextSpan.style.flex = '0 0 auto';
        const imageTextFragment = this.app.parseLinks(imageText);
        imageTextSpan.appendChild(imageTextFragment);
        // Clicking text enables inline editing instead of toggling checkbox
        imageTextSpan.style.cursor = 'text';
        imageTextSpan.addEventListener('click', (e) => {
        // Don't enable editing if clicking on a link
        if (e.target.tagName === 'A') {
        return;
        }
        e.stopPropagation();
        this.app.enableInlineEditing(imageTextSpan, pageId, binId, elementIndex, element);
        });
        imageHeader.appendChild(imageTextSpan);
        }

        const imageControls = document.createElement('div');
        imageControls.style.display = 'flex';
        imageControls.style.gap = '5px';
        imageControls.style.marginLeft = shouldShowImageTitle ? '10px' : '0';
        imageControls.style.flexShrink = '0';

        // Alignment buttons
        const alignLeftBtn = this.app.styleButton('⬅️', () => {
        element.imageAlignment = 'left';
        this.app.dataManager.saveData();
        eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
        });
        const alignCenterBtn = this.app.styleButton('⬌', () => {
        element.imageAlignment = 'center';
        this.app.dataManager.saveData();
        eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
        });
        const alignRightBtn = this.app.styleButton('➡️', () => {
        element.imageAlignment = 'right';
        this.app.dataManager.saveData();
        eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
        });
        imageControls.appendChild(alignLeftBtn);
        imageControls.appendChild(alignCenterBtn);
        imageControls.appendChild(alignRightBtn);

        // Size input
        const sizeInput = document.createElement('input');
        sizeInput.type = 'number';
        sizeInput.value = element.imageWidth;
        sizeInput.min = '50';
        sizeInput.max = '1000';
        sizeInput.style.width = '60px';
        sizeInput.style.padding = '4px';
        sizeInput.style.border = '1px solid #555';
        sizeInput.style.background = 'transparent';
        sizeInput.style.color = '#e0e0e0';
        sizeInput.style.borderRadius = '4px';
        sizeInput.onchange = (e) => {
        element.imageWidth = parseInt(e.target.value) || 300;
        this.app.dataManager.saveData();
        eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
        };
        imageControls.appendChild(sizeInput);

        if (element.imageUrl) {
        const removeImageBtn = this.app.styleButton('Remove Image', () => {
        element.imageUrl = null;
        element.text = 'Image'; // Reset text
        this.app.dataManager.saveData();
        eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
        });
        imageControls.appendChild(removeImageBtn);
        }

        imageHeader.appendChild(imageControls);
        div.appendChild(imageHeader);

        // Image display
        if (element.imageUrl) {
        const imgContainer = document.createElement('div');
        imgContainer.style.display = 'flex';
        imgContainer.style.justifyContent = element.imageAlignment === 'left' ? 'flex-start' :
        element.imageAlignment === 'center' ? 'center' : 'flex-end';
        imgContainer.style.marginTop = '10px';

        const img = document.createElement('img');
        img.src = element.imageUrl;
        img.style.maxWidth = '100%';
        img.style.height = 'auto';
        img.style.width = `${element.imageWidth}px`;
        img.style.borderRadius = '4px';
        img.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
        img.style.cursor = 'pointer';
        img.onclick = () => window.open(element.imageUrl, '_blank');

        imgContainer.appendChild(img);
        div.appendChild(imgContainer);
        } else {
        // Placeholder for image upload
        const uploadArea = document.createElement('div');
        uploadArea.style.border = '2px dashed #555';
        uploadArea.style.borderRadius = '8px';
        uploadArea.style.padding = '20px';
        uploadArea.style.textAlign = 'center';
        uploadArea.style.color = '#888';
        uploadArea.style.cursor = 'pointer';
        uploadArea.style.marginTop = '10px';
        uploadArea.textContent = 'Drag & drop an image here, or click to upload';

        uploadArea.onclick = () => {
        const fileInput = document.getElementById('file-input-images-json');
        fileInput.click();
        };

        // Handle file input change
        const fileInput = document.getElementById('file-input-images-json');
        fileInput.onchange = (e) => {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
        element.imageUrl = event.target.result;
        element.text = file.name.split('.').slice(0, -1).join('.'); // Set title to filename
        this.app.dataManager.saveData();
        eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
        };
        reader.readAsDataURL(file);
        }
        };

        // Handle drag and drop
        uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        uploadArea.style.borderColor = '#4a9eff';
        });

        uploadArea.addEventListener('dragleave', (e) => {
        e.stopPropagation();
        uploadArea.style.borderColor = '#555';
        });

        uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        uploadArea.style.borderColor = '#555';
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
        element.imageUrl = event.target.result;
        element.text = file.name.split('.').slice(0, -1).join('.'); // Set title to filename
        this.app.dataManager.saveData();
        eventBus.emit(EVENTS.APP.RENDER_REQUESTED);
        };
        reader.readAsDataURL(file);
        } else {
        alert('Please drop an image file.');
        }
        });

        div.appendChild(uploadArea);
        }

        // Render children if they exist
        if (element.children && element.children.length > 0) {
            const childrenContainer = renderChildren(pageId, binId, element, elementIndex, depth);
            if (childrenContainer) {
                div.appendChild(childrenContainer);
            }
        }
    }
}
// RecipeElement.js - Recipe element type
import { BaseElementType } from '../../core/BaseElementType.js';
import { DOMUtils } from '../../utils/dom.js';
import { StringUtils } from '../../utils/string.js';

export default class RecipeElement extends BaseElementType {
    constructor() {
        super({
            id: 'recipe-element',
            name: 'Recipe',
            description: 'Store recipes with ingredients and instructions.',
            elementType: 'recipe',
            keyboardShortcut: 'p'
        });
    }
    
    getDefaultData() {
        return {
            type: 'recipe',
            text: 'New Recipe',
            recipe: {
                servings: 4,
                prepTime: '',
                cookTime: '',
                ingredients: [],
                instructions: []
            },
            completed: false,
            persistent: true,
            children: []
        };
    }
    
    render(element, pageId, binId, elementIndex, container) {
        const recipeDiv = DOMUtils.createElement('div', {
            className: 'element recipe-element',
            dataset: {
                pageId: pageId,
                binId: binId,
                elementIndex: elementIndex
            },
            style: 'padding: 15px; background: #2a2a2a; border-radius: 4px; margin-bottom: 10px; border-left: 4px solid #e67e22;'
        });
        
        const recipe = element.recipe || {};
        
        // Title
        const title = DOMUtils.createElement('div', {
            className: 'recipe-title',
            style: 'font-weight: bold; font-size: 16px; color: #e0e0e0; margin-bottom: 10px;'
        }, StringUtils.escapeHtml(element.text || 'Untitled Recipe'));
        
        recipeDiv.appendChild(title);
        
        // Meta info
        const meta = DOMUtils.createElement('div', {
            style: 'display: flex; gap: 15px; font-size: 12px; color: #888; margin-bottom: 15px;'
        });
        
        if (recipe.servings) {
            meta.innerHTML += `<span>🍽️ ${recipe.servings} servings</span>`;
        }
        if (recipe.prepTime) {
            meta.innerHTML += `<span>⏱️ Prep: ${StringUtils.escapeHtml(recipe.prepTime)}</span>`;
        }
        if (recipe.cookTime) {
            meta.innerHTML += `<span>🔥 Cook: ${StringUtils.escapeHtml(recipe.cookTime)}</span>`;
        }
        
        recipeDiv.appendChild(meta);
        
        // Ingredients
        if (recipe.ingredients && recipe.ingredients.length > 0) {
            const ingredientsTitle = DOMUtils.createElement('div', {
                style: 'font-weight: bold; color: #e0e0e0; margin-bottom: 8px; margin-top: 10px;'
            }, 'Ingredients:');
            recipeDiv.appendChild(ingredientsTitle);
            
            const ingredientsList = DOMUtils.createElement('ul', {
                style: 'margin: 0; padding-left: 20px; color: #ccc; font-size: 13px; line-height: 1.6;'
            });
            
            recipe.ingredients.forEach(ingredient => {
                const li = DOMUtils.createElement('li', {}, StringUtils.escapeHtml(ingredient));
                ingredientsList.appendChild(li);
            });
            
            recipeDiv.appendChild(ingredientsList);
        }
        
        // Instructions preview (first 2)
        if (recipe.instructions && recipe.instructions.length > 0) {
            const instructionsTitle = DOMUtils.createElement('div', {
                style: 'font-weight: bold; color: #e0e0e0; margin-bottom: 8px; margin-top: 15px;'
            }, 'Instructions:');
            recipeDiv.appendChild(instructionsTitle);
            
            const instructionsPreview = DOMUtils.createElement('div', {
                style: 'color: #ccc; font-size: 13px; line-height: 1.6;'
            });
            
            recipe.instructions.slice(0, 2).forEach((instruction, index) => {
                const step = DOMUtils.createElement('div', {
                    style: 'margin-bottom: 5px;'
                }, `${index + 1}. ${StringUtils.escapeHtml(instruction)}`);
                instructionsPreview.appendChild(step);
            });
            
            if (recipe.instructions.length > 2) {
                const more = DOMUtils.createElement('div', {
                    style: 'color: #888; font-size: 11px; font-style: italic;'
                }, `+${recipe.instructions.length - 2} more steps`);
                instructionsPreview.appendChild(more);
            }
            
            recipeDiv.appendChild(instructionsPreview);
        }
        
        container.appendChild(recipeDiv);
    }
    
    renderEditModalContent(elementData, pageId, binId, elementIndex) {
        const recipe = elementData.recipe || { servings: 4, ingredients: [], instructions: [] };
        
        return `
            <div style="margin-top: 15px;">
                <label>Recipe Name:</label>
                <input type="text" id="recipe-name-input" value="${StringUtils.escapeHtml(elementData.text || '')}" 
                       style="width: 100%; padding: 8px; margin-top: 5px; background: #1a1a1a; color: #e0e0e0; border: 1px solid #555; border-radius: 4px;" />
            </div>
            <div style="margin-top: 15px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
                <div>
                    <label>Servings:</label>
                    <input type="number" id="recipe-servings-input" value="${recipe.servings || 4}" min="1" 
                           style="width: 100%; padding: 8px; margin-top: 5px; background: #1a1a1a; color: #e0e0e0; border: 1px solid #555; border-radius: 4px;" />
                </div>
                <div>
                    <label>Prep Time:</label>
                    <input type="text" id="recipe-prep-time-input" value="${StringUtils.escapeHtml(recipe.prepTime || '')}" placeholder="15 min" 
                           style="width: 100%; padding: 8px; margin-top: 5px; background: #1a1a1a; color: #e0e0e0; border: 1px solid #555; border-radius: 4px;" />
                </div>
                <div>
                    <label>Cook Time:</label>
                    <input type="text" id="recipe-cook-time-input" value="${StringUtils.escapeHtml(recipe.cookTime || '')}" placeholder="30 min" 
                           style="width: 100%; padding: 8px; margin-top: 5px; background: #1a1a1a; color: #e0e0e0; border: 1px solid #555; border-radius: 4px;" />
                </div>
            </div>
            <div style="margin-top: 15px;">
                <label>Ingredients:</label>
                <div id="recipe-ingredients-list" style="margin-top: 5px; max-height: 200px; overflow-y: auto;">
                    ${(recipe.ingredients || []).map((ing, index) => `
                        <div style="display: flex; gap: 5px; margin-bottom: 5px;">
                            <input type="text" class="recipe-ingredient-input" data-index="${index}" value="${StringUtils.escapeHtml(ing)}" 
                                   style="flex: 1; padding: 6px; background: #2a2a2a; color: #e0e0e0; border: 1px solid #555; border-radius: 4px;" />
                            <button type="button" class="remove-recipe-ingredient-btn" data-index="${index}" style="padding: 2px 8px; background: #e74c3c; color: white; border: none; border-radius: 4px; cursor: pointer;">×</button>
                        </div>
                    `).join('')}
                </div>
                <button type="button" id="add-recipe-ingredient-btn" style="padding: 5px 10px; background: #4a9eff; color: white; border: none; border-radius: 4px; cursor: pointer; margin-top: 5px;">+ Add Ingredient</button>
            </div>
            <div style="margin-top: 15px;">
                <label>Instructions:</label>
                <div id="recipe-instructions-list" style="margin-top: 5px; max-height: 300px; overflow-y: auto;">
                    ${(recipe.instructions || []).map((inst, index) => `
                        <div style="display: flex; gap: 5px; margin-bottom: 5px;">
                            <span style="width: 30px; padding-top: 6px; color: #888; font-weight: bold;">${index + 1}.</span>
                            <textarea class="recipe-instruction-input" data-index="${index}" 
                                      style="flex: 1; padding: 6px; background: #2a2a2a; color: #e0e0e0; border: 1px solid #555; border-radius: 4px; min-height: 40px; resize: vertical;">${StringUtils.escapeHtml(inst)}</textarea>
                            <button type="button" class="remove-recipe-instruction-btn" data-index="${index}" style="padding: 2px 8px; background: #e74c3c; color: white; border: none; border-radius: 4px; cursor: pointer; align-self: flex-start;">×</button>
                        </div>
                    `).join('')}
                </div>
                <button type="button" id="add-recipe-instruction-btn" style="padding: 5px 10px; background: #4a9eff; color: white; border: none; border-radius: 4px; cursor: pointer; margin-top: 5px;">+ Add Step</button>
            </div>
        `;
    }
    
    setupEditModalEventListeners(elementData, pageId, binId, elementIndex, modalBody) {
        // Add ingredient
        const addIngredientBtn = modalBody.querySelector('#add-recipe-ingredient-btn');
        if (addIngredientBtn) {
            addIngredientBtn.addEventListener('click', () => {
                if (!elementData.recipe) elementData.recipe = {};
                if (!elementData.recipe.ingredients) elementData.recipe.ingredients = [];
                elementData.recipe.ingredients.push('');
                this.app.modalHandler.showEditModal(pageId, binId, elementIndex, elementData);
            });
        }
        
        // Remove ingredient
        modalBody.querySelectorAll('.remove-recipe-ingredient-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                elementData.recipe.ingredients.splice(index, 1);
                this.app.modalHandler.showEditModal(pageId, binId, elementIndex, elementData);
            });
        });
        
        // Add instruction
        const addInstructionBtn = modalBody.querySelector('#add-recipe-instruction-btn');
        if (addInstructionBtn) {
            addInstructionBtn.addEventListener('click', () => {
                if (!elementData.recipe) elementData.recipe = {};
                if (!elementData.recipe.instructions) elementData.recipe.instructions = [];
                elementData.recipe.instructions.push('');
                this.app.modalHandler.showEditModal(pageId, binId, elementIndex, elementData);
            });
        }
        
        // Remove instruction
        modalBody.querySelectorAll('.remove-recipe-instruction-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                elementData.recipe.instructions.splice(index, 1);
                this.app.modalHandler.showEditModal(pageId, binId, elementIndex, elementData);
            });
        });
    }
    
    saveEditModalContent(elementData, modalBody) {
        const nameInput = modalBody.querySelector('#recipe-name-input');
        const servingsInput = modalBody.querySelector('#recipe-servings-input');
        const prepTimeInput = modalBody.querySelector('#recipe-prep-time-input');
        const cookTimeInput = modalBody.querySelector('#recipe-cook-time-input');
        
        if (nameInput) {
            elementData.text = nameInput.value.trim();
        }
        
        if (!elementData.recipe) elementData.recipe = {};
        
        if (servingsInput) {
            elementData.recipe.servings = parseInt(servingsInput.value) || 4;
        }
        if (prepTimeInput) {
            elementData.recipe.prepTime = prepTimeInput.value.trim();
        }
        if (cookTimeInput) {
            elementData.recipe.cookTime = cookTimeInput.value.trim();
        }
        
        // Save ingredients
        const ingredientInputs = modalBody.querySelectorAll('.recipe-ingredient-input');
        elementData.recipe.ingredients = Array.from(ingredientInputs).map(input => input.value.trim()).filter(v => v);
        
        // Save instructions
        const instructionInputs = modalBody.querySelectorAll('.recipe-instruction-input');
        elementData.recipe.instructions = Array.from(instructionInputs).map(input => input.value.trim()).filter(v => v);
    }
}


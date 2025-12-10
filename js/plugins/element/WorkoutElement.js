// WorkoutElement.js - Workout tracking element type
import { BaseElementType } from '../../core/BaseElementType.js';
import { DOMUtils } from '../../utils/dom.js';
import { StringUtils } from '../../utils/string.js';

export default class WorkoutElement extends BaseElementType {
    constructor() {
        super({
            id: 'workout-element',
            name: 'Workout',
            description: 'Track exercises, sets, reps, and weights.',
            elementType: 'workout',
            keyboardShortcut: 'w'
        });
    }
    
    getDefaultData() {
        return {
            type: 'workout',
            text: 'Workout',
            workout: {
                date: new Date().toISOString().split('T')[0],
                exercises: []
            },
            completed: false,
            persistent: true,
            children: []
        };
    }
    
    render(element, pageId, binId, elementIndex, container) {
        const workoutDiv = DOMUtils.createElement('div', {
            className: 'element workout-element',
            dataset: {
                pageId: pageId,
                binId: binId,
                elementIndex: elementIndex
            },
            style: 'padding: 15px; background: #2a2a2a; border-radius: 4px; margin-bottom: 10px; border-left: 4px solid #e74c3c;'
        });
        
        const workout = element.workout || {};
        
        // Title and date
        const header = DOMUtils.createElement('div', {
            style: 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;'
        });
        
        const title = DOMUtils.createElement('div', {
            style: 'font-weight: bold; font-size: 16px; color: #e0e0e0;'
        }, StringUtils.escapeHtml(element.text || 'Workout'));
        
        const date = DOMUtils.createElement('div', {
            style: 'font-size: 12px; color: #888;'
        }, workout.date ? new Date(workout.date).toLocaleDateString() : '');
        
        header.appendChild(title);
        header.appendChild(date);
        workoutDiv.appendChild(header);
        
        // Exercises
        const exercisesList = DOMUtils.createElement('div', {
            style: 'display: flex; flex-direction: column; gap: 10px;'
        });
        
        (workout.exercises || []).forEach((exercise, index) => {
            const exerciseDiv = DOMUtils.createElement('div', {
                style: 'padding: 10px; background: #1a1a1a; border-radius: 4px;'
            });
            
            const exerciseName = DOMUtils.createElement('div', {
                style: 'font-weight: bold; color: #e0e0e0; margin-bottom: 5px;'
            }, StringUtils.escapeHtml(exercise.name || 'Exercise'));
            
            exerciseDiv.appendChild(exerciseName);
            
            // Sets
            if (exercise.sets && exercise.sets.length > 0) {
                const setsList = DOMUtils.createElement('div', {
                    style: 'font-size: 12px; color: #ccc;'
                });
                
                exercise.sets.forEach((set, setIndex) => {
                    const setText = DOMUtils.createElement('div', {
                        style: 'margin-bottom: 3px;'
                    }, `Set ${setIndex + 1}: ${set.reps || 0} reps${set.weight ? ` @ ${set.weight}${set.weightUnit || 'lbs'}` : ''}`);
                    setsList.appendChild(setText);
                });
                
                exerciseDiv.appendChild(setsList);
            }
            
            exercisesList.appendChild(exerciseDiv);
        });
        
        workoutDiv.appendChild(exercisesList);
        container.appendChild(workoutDiv);
    }
    
    renderEditModalContent(elementData, pageId, binId, elementIndex) {
        const workout = elementData.workout || { date: new Date().toISOString().split('T')[0], exercises: [] };
        
        let html = `
            <div style="margin-top: 15px;">
                <label>Workout Name:</label>
                <input type="text" id="workout-name-input" value="${StringUtils.escapeHtml(elementData.text || '')}" 
                       style="width: 100%; padding: 8px; margin-top: 5px; background: #1a1a1a; color: #e0e0e0; border: 1px solid #555; border-radius: 4px;" />
            </div>
            <div style="margin-top: 15px;">
                <label>Date:</label>
                <input type="date" id="workout-date-input" value="${workout.date || new Date().toISOString().split('T')[0]}" 
                       style="width: 100%; padding: 8px; margin-top: 5px; background: #1a1a1a; color: #e0e0e0; border: 1px solid #555; border-radius: 4px;" />
            </div>
            <div style="margin-top: 15px;">
                <label>Exercises:</label>
                <div id="workout-exercises-list" style="margin-top: 5px; max-height: 400px; overflow-y: auto;">
        `;
        
        workout.exercises.forEach((exercise, exIndex) => {
            html += `
                <div style="padding: 10px; background: #1a1a1a; border-radius: 4px; margin-bottom: 10px;">
                    <div style="display: flex; gap: 5px; margin-bottom: 5px;">
                        <input type="text" class="workout-exercise-name-input" data-index="${exIndex}" value="${StringUtils.escapeHtml(exercise.name || '')}" placeholder="Exercise name" style="flex: 1; padding: 6px; background: #2a2a2a; color: #e0e0e0; border: 1px solid #555; border-radius: 4px;" />
                        <button type="button" class="remove-workout-exercise-btn" data-index="${exIndex}" style="padding: 2px 8px; background: #e74c3c; color: white; border: none; border-radius: 4px; cursor: pointer;">×</button>
                    </div>
                    <div class="workout-sets-list" data-exercise-index="${exIndex}" style="margin-left: 10px;">
            `;
            
            (exercise.sets || []).forEach((set, setIndex) => {
                html += `
                    <div style="display: flex; gap: 5px; margin-bottom: 5px; align-items: center;">
                        <span style="width: 50px; color: #888; font-size: 11px;">Set ${setIndex + 1}:</span>
                        <input type="number" class="workout-set-reps-input" data-exercise="${exIndex}" data-set="${setIndex}" value="${set.reps || ''}" placeholder="Reps" min="0" style="width: 80px; padding: 6px; background: #2a2a2a; color: #e0e0e0; border: 1px solid #555; border-radius: 4px;" />
                        <input type="number" class="workout-set-weight-input" data-exercise="${exIndex}" data-set="${setIndex}" value="${set.weight || ''}" placeholder="Weight" step="0.5" style="width: 80px; padding: 6px; background: #2a2a2a; color: #e0e0e0; border: 1px solid #555; border-radius: 4px;" />
                        <select class="workout-set-unit-input" data-exercise="${exIndex}" data-set="${setIndex}" style="width: 60px; padding: 6px; background: #2a2a2a; color: #e0e0e0; border: 1px solid #555; border-radius: 4px;">
                            <option value="lbs" ${set.weightUnit === 'lbs' ? 'selected' : ''}>lbs</option>
                            <option value="kg" ${set.weightUnit === 'kg' ? 'selected' : ''}>kg</option>
                        </select>
                        <button type="button" class="remove-workout-set-btn" data-exercise="${exIndex}" data-set="${setIndex}" style="padding: 2px 8px; background: #e74c3c; color: white; border: none; border-radius: 4px; cursor: pointer;">×</button>
                    </div>
                `;
            });
            
            html += `
                    </div>
                    <button type="button" class="add-workout-set-btn" data-exercise-index="${exIndex}" style="padding: 3px 8px; background: #4a9eff; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px; margin-top: 5px;">+ Add Set</button>
                </div>
            `;
        });
        
        html += `
                </div>
                <button type="button" id="add-workout-exercise-btn" style="padding: 5px 10px; background: #4a9eff; color: white; border: none; border-radius: 4px; cursor: pointer; margin-top: 5px;">+ Add Exercise</button>
            </div>
        `;
        
        return html;
    }
    
    setupEditModalEventListeners(elementData, pageId, binId, elementIndex, modalBody) {
        // Add exercise
        const addExerciseBtn = modalBody.querySelector('#add-workout-exercise-btn');
        if (addExerciseBtn) {
            addExerciseBtn.addEventListener('click', () => {
                if (!elementData.workout) elementData.workout = {};
                if (!elementData.workout.exercises) elementData.workout.exercises = [];
                elementData.workout.exercises.push({
                    name: '',
                    sets: []
                });
                this.app.modalHandler.showEditModal(pageId, binId, elementIndex, elementData);
            });
        }
        
        // Remove exercise
        modalBody.querySelectorAll('.remove-workout-exercise-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                elementData.workout.exercises.splice(index, 1);
                this.app.modalHandler.showEditModal(pageId, binId, elementIndex, elementData);
            });
        });
        
        // Add set
        modalBody.querySelectorAll('.add-workout-set-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const exIndex = parseInt(e.target.dataset.exerciseIndex);
                if (!elementData.workout.exercises[exIndex].sets) {
                    elementData.workout.exercises[exIndex].sets = [];
                }
                elementData.workout.exercises[exIndex].sets.push({
                    reps: 0,
                    weight: 0,
                    weightUnit: 'lbs'
                });
                this.app.modalHandler.showEditModal(pageId, binId, elementIndex, elementData);
            });
        });
        
        // Remove set
        modalBody.querySelectorAll('.remove-workout-set-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const exIndex = parseInt(e.target.dataset.exercise);
                const setIndex = parseInt(e.target.dataset.set);
                elementData.workout.exercises[exIndex].sets.splice(setIndex, 1);
                this.app.modalHandler.showEditModal(pageId, binId, elementIndex, elementData);
            });
        });
    }
    
    saveEditModalContent(elementData, modalBody) {
        const nameInput = modalBody.querySelector('#workout-name-input');
        const dateInput = modalBody.querySelector('#workout-date-input');
        
        if (nameInput) {
            elementData.text = nameInput.value.trim();
        }
        
        if (!elementData.workout) elementData.workout = {};
        
        if (dateInput) {
            elementData.workout.date = dateInput.value;
        }
        
        // Save exercises
        const exerciseNameInputs = modalBody.querySelectorAll('.workout-exercise-name-input');
        elementData.workout.exercises = Array.from(exerciseNameInputs).map((input, exIndex) => {
            const sets = [];
            const setRepsInputs = modalBody.querySelectorAll(`.workout-set-reps-input[data-exercise="${exIndex}"]`);
            const setWeightInputs = modalBody.querySelectorAll(`.workout-set-weight-input[data-exercise="${exIndex}"]`);
            const setUnitInputs = modalBody.querySelectorAll(`.workout-set-unit-input[data-exercise="${exIndex}"]`);
            
            setRepsInputs.forEach((repsInput, setIndex) => {
                sets.push({
                    reps: parseInt(repsInput.value) || 0,
                    weight: parseFloat(setWeightInputs[setIndex]?.value) || 0,
                    weightUnit: setUnitInputs[setIndex]?.value || 'lbs'
                });
            });
            
            return {
                name: input.value.trim(),
                sets: sets
            };
        });
    }
}


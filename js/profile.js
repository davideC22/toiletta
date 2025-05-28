document.addEventListener('DOMContentLoaded', () => {
    // Ensure common.js is loaded
    if (typeof getAuthToken === 'undefined' || typeof displayMessage === 'undefined' || typeof checkAuthStatus === 'undefined') {
        console.error("common.js is not loaded or its functions are not available.");
        document.body.innerHTML = '<p style="color: red; text-align: center; padding: 20px;">Error: Critical JavaScript file (common.js) missing. Please contact support.</p>';
        return;
    }

    // Message area specific to profile page actions (like dog management)
    const profileMessageArea = document.getElementById('profile-message-area');
    if (!profileMessageArea && document.querySelector('.layout-content-container.flex.flex-col.max-w-\\[960px\\].flex-1')) {
        const mainContentArea = document.querySelector('.layout-content-container.flex.flex-col.max-w-\\[960px\\].flex-1');
        const newMsgArea = document.createElement('p');
        newMsgArea.id = 'profile-message-area';
        newMsgArea.className = 'text-center py-2 text-sm';
        const dogsHeadingContainer = Array.from(mainContentArea.querySelectorAll('div.flex.flex-wrap.justify-between.items-center')).find(d => d.querySelector('p.text-\\[\\#111518\\].tracking-light'));
        if (dogsHeadingContainer) {
            dogsHeadingContainer.insertAdjacentElement('afterend', newMsgArea);
        } else {
             mainContentArea.prepend(newMsgArea); // Fallback
        }
    }


    const token = getAuthToken();
    if (!token) {
        window.location.href = 'login.html'; // Redirect if not authenticated
        return;
    }
    // checkAuthStatus(); // common.js is already called on DOMContentLoaded

    loadUserDogs(token);
    loadUserProfile(token); // Load user's full name for sidebar

    // Modal handling
    const dogModal = document.getElementById('dog-modal');
    const addDogButton = document.getElementById('add-dog-button'); 
    const cancelModalButton = document.getElementById('cancel-modal-button');
    const saveDogButton = document.getElementById('save-dog-button');
    const modalTitle = document.getElementById('modal-title');
    const dogIdInput = document.getElementById('dog-id-input');
    const dogNameInput = document.getElementById('dog-name-input');
    const dogBreedInput = document.getElementById('dog-breed-input');
    const dogAgeInput = document.getElementById('dog-age-input');

    if (addDogButton) {
        addDogButton.addEventListener('click', () => {
            modalTitle.textContent = 'Aggiungi Cane';
            dogIdInput.value = ''; 
            dogNameInput.value = '';
            dogBreedInput.value = '';
            dogAgeInput.value = '';
            displayDogModalMessage('');
            dogModal.classList.remove('hidden');
        });
    }

    if (cancelModalButton) {
        cancelModalButton.addEventListener('click', () => {
            dogModal.classList.add('hidden');
        });
    }

    if (saveDogButton) {
        saveDogButton.addEventListener('click', () => handleSaveDog(token));
    }
});

async function loadUserProfile(token) {
    try {
        const response = await fetch('/api/profile', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) {
            if (response.status === 401) {
                // Handled by checkAuthStatus or subsequent calls
            }
            throw new Error('Failed to fetch user profile.');
        }
        const userData = await response.json();
        const profileFullnameSidebar = document.getElementById('profile-fullname-sidebar');
        const profileAvatarSidebar = document.getElementById('profile-avatar-sidebar');

        if (profileFullnameSidebar) {
            profileFullnameSidebar.textContent = userData.full_name || 'User';
        }
        if (profileAvatarSidebar && userData.full_name) {
            // Update placeholder avatar text if needed
            const initial = userData.full_name.charAt(0).toUpperCase();
            profileAvatarSidebar.style.backgroundImage = `url("https://via.placeholder.com/40/007bff/FFFFFF?Text=${initial}")`;
        }

    } catch (error) {
        console.error('Error loading user profile for sidebar:', error);
    }
}


function displayProfileMessage(message, type = 'info') {
    if (typeof displayMessage === 'function') {
        displayMessage('profile-message-area', message, type);
    } else {
        const messageArea = document.getElementById('profile-message-area');
        if (messageArea) {
            messageArea.textContent = message;
            messageArea.className = 'text-sm text-center py-2'; 
            if (type === 'error') messageArea.classList.add('text-red-600');
            else if (type === 'success') messageArea.classList.add('text-green-600');
            else messageArea.classList.add('text-gray-700');
        }
    }
}
function displayDogModalMessage(message, type = 'info') {
    const messageArea = document.getElementById('dog-modal-message-area');
    if (messageArea) {
        messageArea.textContent = message;
        messageArea.className = 'text-xs mt-2 text-center'; 
        if (type === 'error') messageArea.classList.add('text-red-600');
        else if (type === 'success') messageArea.classList.add('text-green-600');
        else messageArea.classList.add('text-gray-700');
    }
}


async function loadUserDogs(token) {
    displayProfileMessage('Loading your dogs...', 'info');
    const dogListContainer = document.getElementById('dog-list-container');
    if (dogListContainer) {
        dogListContainer.innerHTML = '<p class="p-4 text-gray-500 text-center">Loading dogs...</p>';
    } else {
        console.error('Dog list container (#dog-list-container) not found.');
        return;
    }
    try {
        const response = await fetch('/api/profile/dogs', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) {
            if (response.status === 401) {
                 displayProfileMessage('Session expired. Please log in again.', 'error');
                 setTimeout(() => { window.location.href = 'login.html'; }, 2000);
            } else {
                throw new Error('Failed to fetch dogs.');
            }
            if(dogListContainer) dogListContainer.innerHTML = '<p class="p-4 text-red-500">Could not load dogs.</p>';
            return;
        }
        const dogs = await response.json();
        
        if (!dogListContainer) { // Double check, might have been cleared by error above
            console.error('Dog list container not found after fetch.');
            return;
        }
        dogListContainer.innerHTML = ''; // Clear "Loading..." or existing dogs

        if (dogs.length === 0) {
            dogListContainer.innerHTML = '<p class="p-4 text-gray-500">Non hai ancora aggiunto nessun cane.</p>';
        } else {
            dogs.forEach(dog => {
                const dogElement = document.createElement('div');
                // Each dog item now has p-4 for spacing, and a border for separation
                dogElement.className = 'p-4 border-b border-gray-200'; 
                dogElement.innerHTML = `
                    <div class="flex items-center justify-between gap-4"> 
                        <div class="flex-shrink-0 w-20 h-20 bg-center bg-no-repeat aspect-square bg-cover rounded-lg dog-image" 
                             style='background-image: url("https://via.placeholder.com/150/007bff/FFFFFF?Text=${encodeURIComponent(dog.name.charAt(0).toUpperCase())}");'>
                        </div>
                        <div class="flex-grow flex flex-col gap-1">
                            <p class="text-[#111518] text-lg font-bold leading-tight dog-name">${dog.name}</p>
                            <p class="text-[#637988] text-sm font-normal leading-normal dog-breed">Razza: ${dog.breed || 'N/A'}</p>
                            <p class="text-[#637988] text-sm font-normal leading-normal dog-age">Età: ${dog.age !== null && dog.age !== undefined ? dog.age : 'N/A'}</p>
                        </div>
                        <div class="flex flex-col gap-2 items-end justify-center flex-shrink-0">
                            <button class="edit-dog-btn bg-blue-500 hover:bg-blue-600 text-white text-xs py-1 px-3 rounded" 
                                    data-dog-id="${dog.id}" 
                                    data-dog-name="${dog.name}" 
                                    data-dog-breed="${dog.breed || ''}" 
                                    data-dog-age="${dog.age || ''}">Modifica</button>
                            <button class="delete-dog-btn bg-red-500 hover:bg-red-600 text-white text-xs py-1 px-3 rounded" 
                                    data-dog-id="${dog.id}">Elimina</button>
                        </div>
                    </div>
                `;
                dogListContainer.appendChild(dogElement);
            });
        }
        attachDogActionListeners(token);
        displayProfileMessage(''); // Clear loading message
    } catch (error) {
        console.error('Error loading dogs:', error);
        displayProfileMessage('Could not load your dogs. Please try again.', 'error');
        if(dogListContainer) dogListContainer.innerHTML = '<p class="p-4 text-red-500 text-center">Failed to load dogs.</p>';
    }
}

function attachDogActionListeners(token) {
    const dogModal = document.getElementById('dog-modal');
    const modalTitle = document.getElementById('modal-title');
    const dogIdInput = document.getElementById('dog-id-input');
    const dogNameInput = document.getElementById('dog-name-input');
    const dogBreedInput = document.getElementById('dog-breed-input');
    const dogAgeInput = document.getElementById('dog-age-input');

    document.querySelectorAll('.edit-dog-btn').forEach(button => {
        button.addEventListener('click', () => {
            modalTitle.textContent = 'Modifica Cane';
            dogIdInput.value = button.dataset.dogId;
            dogNameInput.value = button.dataset.dogName;
            dogBreedInput.value = button.dataset.dogBreed;
            dogAgeInput.value = button.dataset.dogAge;
            displayDogModalMessage('');
            dogModal.classList.remove('hidden');
        });
    });

    document.querySelectorAll('.delete-dog-btn').forEach(button => {
        button.addEventListener('click', () => {
            const dogId = button.dataset.dogId;
            if (confirm('Are you sure you want to delete this dog? This action cannot be undone.')) {
                handleDeleteDog(dogId, token, button); // Pass the button itself
            }
        });
    });
}

async function handleSaveDog(token) {
    const dogId = document.getElementById('dog-id-input').value;
    const name = document.getElementById('dog-name-input').value.trim();
    const breed = document.getElementById('dog-breed-input').value.trim();
    const ageStr = document.getElementById('dog-age-input').value.trim();
    const age = ageStr ? parseInt(ageStr, 10) : null;

    if (!name) {
        displayDogModalMessage('Dog name is required.', 'error');
        return;
    }
    if (ageStr && (isNaN(age) || age < 0 || age > 30)) { // Added upper bound for age
        displayDogModalMessage('Please enter a valid age (0-30).', 'error');
        return;
    }

    const saveButton = document.getElementById('save-dog-button');
    const originalButtonText = saveButton.textContent;
    saveButton.disabled = true;
    saveButton.textContent = 'Saving...';
    displayDogModalMessage(''); 

    const payload = { name, breed, age };
    const method = dogId ? 'PUT' : 'POST';
    const url = dogId ? `/api/profile/dogs/${dogId}` : '/api/profile/dogs';

    try {
        const response = await fetch(url, {
            method: method,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        const responseData = await response.json();

        if (response.ok) {
            document.getElementById('dog-modal').classList.add('hidden');
            displayProfileMessage(responseData.message || `Dog ${dogId ? 'updated' : 'added'} successfully!`, 'success');
            loadUserDogs(token); 
        } else {
            displayDogModalMessage(responseData.error || 'Failed to save dog.', 'error');
        }
    } catch (error) {
        console.error('Error saving dog:', error);
        displayDogModalMessage('An unexpected error occurred.', 'error');
    } finally {
        saveButton.disabled = false;
        saveButton.textContent = originalButtonText;
    }
}

async function handleDeleteDog(dogId, token, deleteButton) { // Pass the button
    let originalButtonText = 'Elimina';
    if(deleteButton) {
        originalButtonText = deleteButton.textContent;
        deleteButton.disabled = true;
        deleteButton.textContent = 'Deleting...';
    }
    displayProfileMessage(''); 

    try {
        const response = await fetch(`/api/profile/dogs/${dogId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const responseData = await response.json();

        if (response.ok) {
            displayProfileMessage(responseData.message || 'Dog deleted successfully.', 'success');
            loadUserDogs(token); 
        } else {
            displayProfileMessage(responseData.error || 'Failed to delete dog.', 'error');
            if(deleteButton) { // Re-enable only on error
                 deleteButton.disabled = false;
                 deleteButton.textContent = originalButtonText;
            }
        }
    } catch (error) {
        console.error('Error deleting dog:', error);
        displayProfileMessage('An unexpected error occurred while deleting the dog.', 'error');
        if(deleteButton) { // Re-enable on error
             deleteButton.disabled = false;
             deleteButton.textContent = originalButtonText;
        }
    }
    // No finally here if the button is removed on success via loadUserDogs
}

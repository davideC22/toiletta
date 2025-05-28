// Global variables to store selections
let selectedServiceId = null;
let selectedServiceName = '';
let selectedDate = null;
let selectedTime = null;
let selectedDogId = null;
let userDogs = [];

document.addEventListener('DOMContentLoaded', async () => {
    if (typeof getAuthToken === 'undefined' || typeof displayMessage === 'undefined') {
        console.error("common.js is not loaded or its functions are not available.");
        const body = document.querySelector('body');
        if (body) {
            body.innerHTML = '<p style="color: red; text-align: center; padding: 20px;">Error: Critical JavaScript file (common.js) missing. Please contact support.</p>';
        }
        return;
    }

    const finalBookButton = document.getElementById('book-appointment-button');
    if (finalBookButton) {
        finalBookButton.addEventListener('click', handleBookingSubmission);
    } else {
        console.error('Final Booking button (book-appointment-button) not found.');
    }
    
    const messageAreaContainer = document.querySelector('.layout-content-container.flex.flex-col.max-w-\\[960px\\].flex-1'); // Main content area
    if (messageAreaContainer && !document.getElementById('booking-message-area')) {
        const messageArea = document.createElement('p');
        messageArea.id = 'booking-message-area';
        messageArea.className = 'text-center py-2 text-sm';
        const dateTimeHeading = Array.from(messageAreaContainer.querySelectorAll('h2')).find(h2 => h2.textContent.includes('Seleziona data e ora'));
        if (dateTimeHeading) {
            dateTimeHeading.insertAdjacentElement('afterend', messageArea);
        } else {
            const mainColumns = document.querySelectorAll('.layout-content-container.flex.flex-col.max-w-\\[960px\\].flex-1');
            if(mainColumns.length > 1) mainColumns[1].prepend(messageArea);
            else messageAreaContainer.prepend(messageArea);
        }
    }

    await loadServices(); // This will now also call populateUserDogs
    initializeCalendar(); 
    updateBookingButtonState(); 
});

function displayBookingMessage(message, type = 'info') {
    if (typeof displayMessage === 'function') {
        displayMessage('booking-message-area', message, type);
    } else { 
        const messageArea = document.getElementById('booking-message-area');
        if (messageArea) {
            messageArea.textContent = message;
            messageArea.className = 'text-sm text-center py-2'; 
            if (type === 'error') messageArea.classList.add('text-red-600');
            else if (type === 'success') messageArea.classList.add('text-green-600');
            else messageArea.classList.add('text-gray-700');
        }
    }
}

async function loadServices() {
    const servicePanel = document.getElementById('service-selection-panel');
    if (!servicePanel) {
        console.error("Service selection panel (#service-selection-panel) not found.");
        attachServiceButtonListeners_Static(); 
        return;
    }
    servicePanel.innerHTML = '<p class="p-4 text-gray-500">Loading services...</p>';

    try {
        const response = await fetch('/api/services');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const services = await response.json();
        
        servicePanel.innerHTML = ''; 
        const heading = document.createElement('h3');
        heading.className = 'text-[#111518] tracking-light text-2xl font-bold leading-tight px-4 text-left pb-2 pt-5';
        heading.textContent = 'Prenota un appuntamento';
        servicePanel.prepend(heading);


        if (services.length === 0) {
            servicePanel.insertAdjacentHTML('beforeend', '<p class="p-4 text-gray-500">No services available at the moment.</p>');
        } else {
            services.forEach(service => {
                const serviceDiv = document.createElement('div');
                serviceDiv.className = 'p-4 service-item'; 
                serviceDiv.innerHTML = `
                    <div class="flex items-stretch justify-between gap-4 rounded-xl">
                        <div class="flex flex-[2_2_0px] flex-col gap-4">
                            <div class="flex flex-col gap-1">
                                <p class="text-[#111518] text-base font-bold leading-tight service-name">${service.name}</p>
                                <p class="text-[#637988] text-sm font-normal leading-normal service-description">${service.description || ''}</p>
                                <p class="text-[#111518] text-sm font-bold leading-normal service-price">$${service.price.toFixed(2)}</p>
                            </div>
                            <button
                                class="select-service-button flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-xl h-8 px-4 flex-row-reverse bg-[#f0f3f4] text-[#111518] text-sm font-medium leading-normal w-fit"
                                data-service-id="${service.id}"
                                data-service-name="${service.name}"
                            >
                                <span class="truncate">Seleziona</span>
                            </button>
                        </div>
                        <div
                            class="w-full bg-center bg-no-repeat aspect-video bg-cover rounded-xl flex-1 service-image"
                            style='background-image: url("https://via.placeholder.com/150/CCCCCC/FFFFFF?text=${encodeURIComponent(service.name)}");'> 
                        </div>
                    </div>
                `;
                servicePanel.appendChild(serviceDiv);
            });
        }
        attachServiceButtonListeners();
        const dogSelectionDiv = document.createElement('div');
        dogSelectionDiv.id = 'dog-selection-container';
        dogSelectionDiv.className = 'p-4';
        servicePanel.appendChild(dogSelectionDiv);
        await populateUserDogs();


    } catch (error) {
        console.error('Failed to load services:', error);
        if(servicePanel) servicePanel.innerHTML = '<h3 class="text-[#111518] tracking-light text-2xl font-bold leading-tight px-4 text-left pb-2 pt-5">Prenota un appuntamento</h3><p class="p-4 text-red-500">Failed to load services. Please try refreshing.</p>';
        attachServiceButtonListeners_Static(); 
    }
}

function attachServiceButtonListeners() {
    document.querySelectorAll('.select-service-button').forEach(button => {
        button.addEventListener('click', () => {
            document.querySelectorAll('.select-service-button').forEach(btn => {
                btn.classList.remove('bg-[#1993e5]', 'text-white');
                btn.classList.add('bg-[#f0f3f4]', 'text-[#111518]');
                btn.querySelector('span.truncate').textContent = 'Seleziona';
            });

            button.classList.add('bg-[#1993e5]', 'text-white');
            button.classList.remove('bg-[#f0f3f4]', 'text-[#111518]');
            button.querySelector('span.truncate').textContent = 'Selezionato';
            
            selectedServiceId = button.dataset.serviceId;
            selectedServiceName = button.dataset.serviceName;
            console.log(`Service selected: ID=${selectedServiceId}, Name=${selectedServiceName}`);
            updateBookingButtonState();
        });
    });
}

function initializeCalendar() {
    const calendarGrids = document.querySelectorAll('.grid.grid-cols-7');
    calendarGrids.forEach(grid => {
        const dayButtons = grid.querySelectorAll('button.calendar-day-button'); 
        dayButtons.forEach(button => {
            const dayDiv = button.querySelector('div'); 
            if (dayDiv) {
                 button.addEventListener('click', async () => {
                    if (dayDiv.classList.contains('bg-gray-300')) return; 

                    document.querySelectorAll('.calendar-day-button div').forEach(d => {
                        if(!d.parentElement.classList.contains('has-appointment')) { 
                           d.classList.remove('bg-[#1993e5]', 'text-white', 'font-bold');
                        }
                    });
                    
                    dayDiv.classList.add('bg-[#1993e5]', 'text-white', 'font-bold');
                    
                    const dayNumber = dayDiv.textContent.trim();
                    const monthYearText = button.closest('.flex.min-w-72').querySelector('p.text-base.font-bold').textContent.trim();
                    const [monthStr, yearStr] = monthYearText.split(' ');
                    const month = getMonthNumberFromString(monthStr);
                    const year = parseInt(yearStr);

                    if (dayNumber && month && year) {
                        selectedDate = `${year}-${String(month).padStart(2, '0')}-${String(dayNumber).padStart(2, '0')}`;
                        console.log('Date selected:', selectedDate);
                        await loadAvailability(selectedDate);
                    }
                    updateBookingButtonState();
                });
            }
        });
    });
}


function getMonthNumberFromString(monthName) {
    const months = {
        "gennaio": 1, "febbraio": 2, "marzo": 3, "aprile": 4, "maggio": 5, "giugno": 6,
        "luglio": 7, "agosto": 8, "settembre": 9, "ottobre": 10, "novembre": 11, "dicembre": 12,
        "july": 7, "august": 8 
    };
    return months[monthName.toLowerCase()];
}


async function loadAvailability(date) {
    const timeSlotsContainer = document.getElementById('available-time-slots');
    if (!timeSlotsContainer) {
        console.error("Time slots container (#available-time-slots) not found");
        return;
    }
    timeSlotsContainer.innerHTML = '<p class="text-sm text-gray-500 w-full text-center">Loading available times...</p>';
    selectedTime = null; 

    try {
        const response = await fetch(`/api/availability?date=${date}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const slots = await response.json();
        
        timeSlotsContainer.innerHTML = ''; 
        if (slots.length === 0) {
            timeSlotsContainer.innerHTML = '<p class="text-sm text-gray-500 w-full text-center">No available slots for this date.</p>';
        } else {
            slots.forEach(slot => {
                if (slot.is_available) {
                    const slotButton = document.createElement('button');
                    slotButton.className = 'time-slot-button flex h-8 shrink-0 items-center justify-center gap-x-2 rounded-xl bg-[#f0f3f4] pl-4 pr-4 text-[#111518] text-sm font-medium leading-normal';
                    slotButton.textContent = slot.time_slot.substring(0, 5); 
                    slotButton.dataset.time = slot.time_slot;
                    slotButton.addEventListener('click', () => {
                        document.querySelectorAll('.time-slot-button').forEach(btn => {
                             btn.classList.remove('bg-[#1993e5]', 'text-white');
                             btn.classList.add('bg-[#f0f3f4]', 'text-[#111518]');
                        });
                        slotButton.classList.add('bg-[#1993e5]', 'text-white');
                        slotButton.classList.remove('bg-[#f0f3f4]', 'text-[#111518]');
                        selectedTime = slotButton.dataset.time;
                        console.log('Time selected:', selectedTime);
                        updateBookingButtonState();
                    });
                    timeSlotsContainer.appendChild(slotButton);
                }
            });
             if (timeSlotsContainer.innerHTML === '') { 
                timeSlotsContainer.innerHTML = '<p class="text-sm text-gray-500 w-full text-center">No available slots for this date.</p>';
            }
        }
    } catch (error) {
        console.error('Failed to load availability:', error);
        timeSlotsContainer.innerHTML = '<p class="text-sm text-red-500 w-full text-center">Failed to load times. Please try again.</p>';
    }
}

async function populateUserDogs() {
    const token = getAuthToken();
    const dogSelectionContainer = document.getElementById('dog-selection-container');
    if (!dogSelectionContainer) {
        console.error("Dog selection container not found in HTML.");
        return;
    }
    dogSelectionContainer.innerHTML = '<p class="text-sm text-gray-500">Loading your dogs...</p>';

    if (!token) {
        displayBookingMessage("You need to be logged in to book appointments.", 'error');
        dogSelectionContainer.innerHTML = '<p class="text-red-500 text-sm">Please log in to select a dog. <a href="login.html" class="text-indigo-600 hover:underline">Login here</a></p>';
        return;
    }

    try {
        const response = await fetch('/api/profile/dogs', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) {
            if (response.status === 401) { 
                 displayBookingMessage("Your session has expired. Please log in again.", 'error');
                 dogSelectionContainer.innerHTML = '<p class="text-red-500 text-sm">Session expired. Please log in. <a href="login.html" class="text-indigo-600 hover:underline">Login here</a></p>';
            } else {
                 throw new Error('Failed to fetch user dogs.');
            }
            return; 
        }
        userDogs = await response.json();
        
        dogSelectionContainer.innerHTML = ''; 

        if (userDogs.length === 0) {
            const noDogMessage = document.createElement('p');
            noDogMessage.className = 'text-red-500 text-sm mb-2';
            noDogMessage.textContent = 'Please add a dog to your profile first.';
            const addDogLink = document.createElement('a');
            addDogLink.href = 'profile.html';
            addDogLink.className = 'text-indigo-600 hover:underline';
            addDogLink.textContent = 'Go to Profile';
            dogSelectionContainer.appendChild(noDogMessage);
            dogSelectionContainer.appendChild(addDogLink);
            selectedDogId = null;
        } else if (userDogs.length === 1) {
            selectedDogId = userDogs[0].id;
            const singleDogDisplay = document.createElement('p');
            singleDogDisplay.className = 'text-sm mb-2';
            singleDogDisplay.innerHTML = `Booking for: <span class="font-semibold">${userDogs[0].name}</span> (${userDogs[0].breed || 'Breed not specified'})`;
            dogSelectionContainer.appendChild(singleDogDisplay);
        } else {
            const selectLabel = document.createElement('label');
            selectLabel.htmlFor = 'dog-select';
            selectLabel.className = 'block text-sm font-medium text-gray-700 mb-1';
            selectLabel.textContent = 'Select your dog:';
            
            const selectDog = document.createElement('select');
            selectDog.id = 'dog-select';
            selectDog.name = 'dog';
            selectDog.className = 'mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md';
            
            userDogs.forEach(dog => {
                const option = document.createElement('option');
                option.value = dog.id;
                option.textContent = `${dog.name} (${dog.breed || 'Breed not specified'})`;
                selectDog.appendChild(option);
            });
            selectedDogId = userDogs[0].id; 
            selectDog.value = selectedDogId;

            selectDog.addEventListener('change', (e) => {
                selectedDogId = e.target.value;
                console.log('Dog selected for booking:', selectedDogId);
            });
            dogSelectionContainer.appendChild(selectLabel);
            dogSelectionContainer.appendChild(selectDog);
        }
        updateBookingButtonState();
    } catch (error) {
        console.error('Error populating user dogs:', error);
        dogSelectionContainer.innerHTML = '<p class="text-red-500 text-sm">Could not load your dogs. Please try again.</p>';
        displayBookingMessage("Could not load your dog's information.", 'error');
    }
}


function updateBookingButtonState() {
    const finalBookButton = document.getElementById('book-appointment-button');
    if (finalBookButton) {
        if (selectedServiceId && selectedDate && selectedTime && selectedDogId) {
            finalBookButton.disabled = false;
            finalBookButton.classList.remove('opacity-50', 'cursor-not-allowed', 'bg-gray-400');
            finalBookButton.classList.add('bg-[#1993e5]');
        } else {
            finalBookButton.disabled = true;
            finalBookButton.classList.add('opacity-50', 'cursor-not-allowed', 'bg-gray-400');
            finalBookButton.classList.remove('bg-[#1993e5]');
        }
    }
}


async function handleBookingSubmission() {
    displayBookingMessage(''); 

    if (!selectedServiceId || !selectedDate || !selectedTime || !selectedDogId) {
        let missingFields = [];
        if (!selectedServiceId) missingFields.push("service");
        if (!selectedDogId && userDogs.length > 0) missingFields.push("dog");
        if (!selectedDate) missingFields.push("date");
        if (!selectedTime) missingFields.push("time slot");
        
        if (userDogs.length === 0 && !selectedDogId) { 
             displayBookingMessage('Please add a dog to your profile before booking.', 'error');
        } else {
            displayBookingMessage(`Please select ${missingFields.join(', ')}.`, 'error');
        }
        return;
    }

    const token = getAuthToken();
    if (!token) {
        displayBookingMessage('You must be logged in to book an appointment.', 'error');
        return;
    }

    const finalBookButton = document.getElementById('book-appointment-button');
    let originalButtonText = 'Prenota Appuntamento';
    if (finalBookButton) {
        const span = finalBookButton.querySelector('span.truncate');
        if (span) originalButtonText = span.textContent;
        finalBookButton.disabled = true;
        if (span) span.textContent = 'Booking...';
    }


    const bookingData = {
        dog_id: parseInt(selectedDogId),
        service_id: parseInt(selectedServiceId),
        date: selectedDate,
        time: selectedTime
    };

    console.log('Submitting booking:', bookingData);

    try {
        const response = await fetch('/api/appointments', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(bookingData)
        });

        const responseData = await response.json();

        if (response.ok) {
            displayBookingMessage('Appointment booked successfully! Redirecting to your appointments...', 'success');
            selectedServiceId = null;
            selectedDate = null;
            selectedTime = null;
            document.querySelectorAll('.select-service-button').forEach(btn => {
                btn.classList.remove('bg-[#1993e5]', 'text-white');
                btn.classList.add('bg-[#f0f3f4]', 'text-[#111518]');
                btn.querySelector('span.truncate').textContent = 'Seleziona';
            });
             document.querySelectorAll('.calendar-day-button div').forEach(d => {
                if(!d.parentElement.classList.contains('has-appointment')) {
                    d.classList.remove('bg-[#1993e5]', 'text-white', 'font-bold');
                }
             });
            const timeSlotsContainer = document.getElementById('available-time-slots');
            if(timeSlotsContainer) timeSlotsContainer.innerHTML = '<p class="text-sm text-gray-500 w-full text-center">Select a date to see available times.</p>';
            // Don't reset selectedDogId, user might want to book another for the same dog


            setTimeout(() => {
                window.location.href = 'calprenotazione.html';
            }, 2500);
        } else {
            displayBookingMessage(responseData.error || 'Booking failed. Please try again.', 'error');
        }
    } catch (error) {
        console.error('Booking submission error:', error);
        displayBookingMessage('An unexpected error occurred during booking. Please try again.', 'error');
    } finally {
        if (finalBookButton) {
            const span = finalBookButton.querySelector('span.truncate');
            if(span) span.textContent = originalButtonText;
            // Re-enable button based on current selections, not just blindly
            updateBookingButtonState(); 
        }
    }
}

// Fallback for service selection if dynamic loading fails or panel is not found
function attachServiceButtonListeners_Static() {
    document.querySelectorAll('button.select-service-button').forEach(button => {
        button.addEventListener('click', (e) => {
            const serviceId = button.dataset.serviceId;
            const serviceName = button.dataset.serviceName;

            if (serviceId && serviceName) {
                selectedServiceName = serviceName;
                selectedServiceId = serviceId;
                console.log(`Static Service selected: ID=${selectedServiceId}, Name=${selectedServiceName}`);

                document.querySelectorAll('button.select-service-button').forEach(btn => {
                    btn.classList.remove('bg-[#1993e5]', 'text-white');
                    btn.classList.add('bg-[#f0f3f4]', 'text-[#111518]');
                    btn.querySelector('span.truncate').textContent = 'Seleziona';
                });
                button.classList.add('bg-[#1993e5]', 'text-white');
                button.classList.remove('bg-[#f0f3f4]', 'text-[#111518]');
                button.querySelector('span.truncate').textContent = 'Selezionato';
                updateBookingButtonState();
            } else {
                const serviceCard = e.target.closest('.service-item'); 
                if (serviceCard) {
                    const serviceNameElem = serviceCard.querySelector('.service-name');
                    const tempServiceMap = {
                        "Bagno": 1, "Taglio": 2, "Toelettatura Completa": 3, "Extra": 4 // Ensure these match static HTML if used
                    };
                    if (serviceNameElem) {
                        selectedServiceName = serviceNameElem.textContent.trim();
                        selectedServiceId = tempServiceMap[selectedServiceName]; 
                        console.log(`Static Service (fallback) selected: ID=${selectedServiceId}, Name=${selectedServiceName}`);
                         document.querySelectorAll('.select-service-button').forEach(btn => {
                            btn.classList.remove('bg-[#1993e5]', 'text-white');
                            btn.classList.add('bg-[#f0f3f4]', 'text-[#111518]');
                            btn.querySelector('span.truncate').textContent = 'Seleziona';
                        });
                        button.classList.add('bg-[#1993e5]', 'text-white');
                        button.classList.remove('bg-[#f0f3f4]', 'text-[#111518]');
                        button.querySelector('span.truncate').textContent = 'Selezionato';
                        updateBookingButtonState();
                    }
                }
            }
        });
    });
}
// Check if the service panel was dynamically populated. If not (meaning loadServices failed early or panel was missing),
// and if static buttons are present (they should have .select-service-button class), attach listeners to them.
// This check should be more robust, ideally checking if the servicePanel.innerHTML was not replaced by dynamic content.
// For now, a simple check: if no service items were dynamically added, try to attach to static.
if (document.querySelectorAll('#service-selection-panel .service-item').length === 0) {
    attachServiceButtonListeners_Static();
}

document.addEventListener('DOMContentLoaded', async () => {
    // Ensure common.js is loaded and functions are available
    if (typeof getAuthToken === 'undefined' || typeof displayMessage === 'undefined') {
        console.error("common.js is not loaded or its functions are not available.");
        const body = document.querySelector('body');
        if (body) {
            body.innerHTML = '<p style="color: red; text-align: center; padding: 20px;">Error: Critical JavaScript file (common.js) missing. Please contact support.</p>';
        }
        return;
    }
    
    const appointmentsContainer = document.querySelector('.layout-content-container.flex.flex-col.max-w-\\[960px\\].flex-1');
    if (appointmentsContainer && !document.getElementById('appointments-message-area')) {
        const messageArea = document.createElement('p');
        messageArea.id = 'appointments-message-area';
        messageArea.className = 'text-center py-2 text-sm';
        const headingContainer = appointmentsContainer.querySelector('div.flex.flex-wrap.justify-between'); // Container of title and button
        if (headingContainer) {
             headingContainer.insertAdjacentElement('afterend', messageArea);
        } else {
            const heading = appointmentsContainer.querySelector('p.text-\\[\\#0d141c\\].tracking-light'); // Fallback
            if (heading && heading.parentElement) {
                heading.parentElement.insertAdjacentElement('afterend', messageArea);
            } else {
                appointmentsContainer.prepend(messageArea);
            }
        }
    }


    const token = getAuthToken();
    if (!token) {
        displayAppointmentsMessage("Please log in to see your appointments.", 'error');
        setTimeout(() => { if(window.location.pathname.endsWith('calprenotazione.html')) window.location.href = 'login.html'; }, 3000);
        return;
    }

    await loadAndDisplayAppointments(token);
    addCalendarDateAttributes(); 
});

function displayAppointmentsMessage(message, type = 'info') {
    if (typeof displayMessage === 'function') {
        displayMessage('appointments-message-area', message, type);
    } else { 
        const messageArea = document.getElementById('appointments-message-area');
        if (messageArea) {
            messageArea.textContent = message;
            messageArea.className = 'text-sm text-center py-2'; 
            if (type === 'error') messageArea.classList.add('text-red-600');
            else if (type === 'success') messageArea.classList.add('text-green-600');
            else messageArea.classList.add('text-gray-700');
        }
    }
}

async function loadAndDisplayAppointments(token) {
    displayAppointmentsMessage("Loading appointments...", "info");
    const upcomingList = document.getElementById('upcoming-appointments-list');
    const pastList = document.getElementById('past-appointments-list');
    if(upcomingList) upcomingList.innerHTML = '<p class="text-gray-500 px-4 py-2">Loading upcoming appointments...</p>';
    if(pastList) pastList.innerHTML = '<p class="text-gray-500 px-4 py-2">Loading past appointments...</p>';

    try {
        const response = await fetch('/api/appointments', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            if (response.status === 401) {
                displayAppointmentsMessage("Session expired. Please log in again.", 'error');
                if (typeof removeAuthToken === 'function') removeAuthToken();
                setTimeout(() => { window.location.href = 'login.html'; }, 2000);
            } else {
                const errorData = await response.json().catch(() => ({})); 
                throw new Error(errorData.error || `Failed to fetch appointments. Status: ${response.status}`);
            }
            if(upcomingList) upcomingList.innerHTML = '<p class="text-red-500 px-4 py-2">Could not load appointments.</p>';
            if(pastList) pastList.innerHTML = '<p class="text-red-500 px-4 py-2">Could not load appointments.</p>';
            return;
        }

        const appointments = await response.json();
        populateAppointmentLists(appointments, token);
        highlightCalendarDays(appointments);
        displayAppointmentsMessage("", "info"); 

    } catch (error) {
        console.error('Error loading appointments:', error);
        displayAppointmentsMessage(error.message || "Could not load appointments. Please try refreshing the page.", 'error');
        if(upcomingList) upcomingList.innerHTML = `<p class="text-red-500 px-4 py-2">${error.message || "Error loading."}</p>`;
        if(pastList) pastList.innerHTML = `<p class="text-red-500 px-4 py-2">${error.message || "Error loading."}</p>`;
    }
}

function populateAppointmentLists(appointments, token) {
    const upcomingList = document.getElementById('upcoming-appointments-list');
    const pastList = document.getElementById('past-appointments-list');

    if (!upcomingList || !pastList) {
        console.error("Appointment list containers not found.");
        return;
    }

    upcomingList.innerHTML = ''; 
    pastList.innerHTML = '';   

    const now = new Date();

    if (!Array.isArray(appointments)) {
        console.error("Appointments data is not an array:", appointments);
        displayAppointmentsMessage("Error: Could not process appointments data.", 'error');
        upcomingList.innerHTML = '<p class="text-red-500 px-4 py-2">Error loading appointments.</p>';
        pastList.innerHTML = '<p class="text-red-500 px-4 py-2">Error loading appointments.</p>';
        return;
    }
    
    const upcoming = appointments.filter(appt => new Date(appt.date + 'T' + appt.time) >= now && appt.status !== 'cancelled');
    const pastUncancelled = appointments.filter(appt => new Date(appt.date + 'T' + appt.time) < now && appt.status !== 'cancelled');
    const cancelled = appointments.filter(appt => appt.status === 'cancelled');


    if (upcoming.length === 0) {
        upcomingList.innerHTML = '<p class="text-gray-500 px-4 py-2">No upcoming appointments.</p>';
    } else {
        upcoming.forEach(appt => upcomingList.appendChild(createAppointmentElement(appt, true, token)));
    }

    const pastAndCancelled = [...pastUncancelled, ...cancelled.filter(c => !pastUncancelled.find(p => p.id === c.id))];
    pastAndCancelled.sort((a, b) => new Date(b.date + 'T' + b.time) - new Date(a.date + 'T' + a.time)); 

    if (pastAndCancelled.length === 0) {
        pastList.innerHTML = '<p class="text-gray-500 px-4 py-2">No past or cancelled appointments.</p>';
    } else {
        pastAndCancelled.forEach(appt => pastList.appendChild(createAppointmentElement(appt, false, token))); 
    }
}

function createAppointmentElement(appt, isUpcoming, token) {
    const div = document.createElement('div');
    div.className = 'flex items-center gap-4 bg-slate-50 px-4 min-h-[72px] py-2 justify-between appointment-item';
    div.id = `appointment-${appt.id}`;

    const appointmentDate = new Date(appt.date + 'T' + appt.time);
    const formattedDate = appointmentDate.toLocaleDateString('it-IT', { year: 'numeric', month: 'long', day: 'numeric' });
    const formattedTime = appointmentDate.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });

    const infoDiv = document.createElement('div');
    infoDiv.className = "flex flex-col justify-center flex-grow"; 
    let statusText = '';
    if (appt.status === 'cancelled') {
        statusText = '<p class="text-red-500 text-xs font-semibold">CANCELLED</p>';
    } else if (!isUpcoming) {
         statusText = '<p class="text-green-500 text-xs font-semibold">COMPLETED</p>';
    }

    // Try to get service price from appt.service.price first, then appt.service_price
    let price = 'N/A';
    if (appt.service && appt.service.price !== undefined) {
        price = appt.service.price.toFixed(2);
    } else if (appt.service_price !== undefined) {
        price = appt.service_price.toFixed(2);
    }


    infoDiv.innerHTML = `
        <p class="text-[#0d141c] text-base font-medium leading-normal line-clamp-1">${appt.service_name || (appt.service ? appt.service.name : 'Service Name N/A')}</p>
        <p class="text-[#49739c] text-sm font-normal leading-normal line-clamp-2">${appt.dog_name || (appt.dog ? appt.dog.name : 'Dog Name N/A')} - ${formattedDate} · ${formattedTime}</p>
        ${statusText}
    `;

    const actionsDiv = document.createElement('div');
    actionsDiv.className = "flex flex-col items-end shrink-0 ml-4"; 
    actionsDiv.innerHTML = `<p class="text-[#0d141c] text-base font-normal leading-normal mb-1">$${price}</p>`;


    if (isUpcoming && appt.status !== 'cancelled') {
        const cancelButton = document.createElement('button');
        cancelButton.className = 'cancel-appointment-btn bg-red-500 hover:bg-red-600 text-white text-xs py-1 px-2 rounded';
        cancelButton.dataset.appointmentId = appt.id;
        cancelButton.textContent = 'Cancel';
        cancelButton.addEventListener('click', () => handleCancelAppointment(appt.id, token));
        actionsDiv.appendChild(cancelButton);
    }
    
    div.appendChild(infoDiv);
    div.appendChild(actionsDiv);
    
    return div;
}

async function handleCancelAppointment(appointmentId, token) {
    if (!confirm("Are you sure you want to cancel this appointment?")) {
        return;
    }
    const cancelButton = document.querySelector(`.cancel-appointment-btn[data-appointment-id="${appointmentId}"]`);
    let originalButtonText = 'Cancel';
    if (cancelButton) {
        originalButtonText = cancelButton.textContent;
        cancelButton.disabled = true;
        cancelButton.textContent = 'Cancelling...';
    }

    try {
        const response = await fetch(`/api/appointments/${appointmentId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: 'cancelled' })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Failed to cancel appointment. Status: ${response.status}`);
        }
        
        displayAppointmentsMessage("Appointment cancelled successfully.", 'success');
        loadAndDisplayAppointments(token); 

    } catch (error) {
        console.error('Error cancelling appointment:', error);
        displayAppointmentsMessage(error.message || "Could not cancel appointment.", 'error');
         if (cancelButton) { // Re-enable button only on error
            cancelButton.disabled = false;
            cancelButton.textContent = originalButtonText;
        }
    } 
    // No finally block to re-enable, as success means list reloads (button might be gone)
}

function addCalendarDateAttributes() {
    const monthHeaders = document.querySelectorAll('p.text-base.font-bold.leading-tight.flex-1.text-center');
    monthHeaders.forEach(header => {
        const monthYearText = header.textContent.trim(); 
        const [monthStr, yearStr] = monthYearText.split(' ');
        const year = parseInt(yearStr);
        const month = getMonthNumberFromString(monthStr); 

        if (year && month) {
            const calendarGrid = header.closest('.flex.min-w-72').querySelector('.grid.grid-cols-7');
            if (calendarGrid) {
                const dayButtons = calendarGrid.querySelectorAll('button.calendar-day-button');
                dayButtons.forEach(button => {
                    const dayNumber = parseInt(button.textContent.trim());
                    if (!isNaN(dayNumber)) {
                        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(dayNumber).padStart(2, '0')}`;
                        button.dataset.date = dateStr;
                    }
                });
            }
        }
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


function highlightCalendarDays(appointments) {
    document.querySelectorAll('.calendar-day-button').forEach(button => {
        const innerDiv = button.querySelector('div');
        if (innerDiv) { 
            // Check if it's the currently * booking-selected* day, which has a different bg
            if(!innerDiv.classList.contains('bg-[#0c7ff2]')) { 
                 innerDiv.classList.remove('bg-yellow-300', 'font-bold', 'ring-2', 'ring-yellow-400', 'rounded-full');
                 // Also remove has-appointment to reset its state before re-evaluating
                 button.classList.remove('has-appointment'); 
            } else {
                 // If it IS the booking-selected day, it might also have an appointment
                 // So, we only remove the 'has-appointment' specific styling, not the booking selection style
                 innerDiv.classList.remove('bg-yellow-300', 'font-bold', 'ring-2', 'ring-yellow-400');
                 // Do not remove rounded-full if it's part of the booking selection style
            }
        }
    });

    const upcomingAppointments = appointments.filter(appt => new Date(appt.date + 'T' + appt.time) >= new Date() && appt.status !== 'cancelled');

    upcomingAppointments.forEach(appt => {
        const dateStr = appt.date; 
        const dayButton = document.querySelector(`.calendar-day-button[data-date="${dateStr}"]`);
        if (dayButton) {
            dayButton.classList.add('has-appointment');
            const innerDiv = dayButton.querySelector('div');
            if (innerDiv && !innerDiv.classList.contains('bg-[#0c7ff2]')) { 
                innerDiv.classList.add('bg-yellow-300', 'font-bold', 'rounded-full', 'ring-2', 'ring-yellow-400'); 
            } else if (innerDiv && innerDiv.classList.contains('bg-[#0c7ff2]')) {
                // It's the selected booking day AND has an appointment. Add a ring or other indicator.
                 innerDiv.classList.add('ring-2', 'ring-yellow-500'); // Example: yellow ring around blue selected day
            }
        }
    });
}

// This was added in calprenotazione.html, ensure it's correctly handled or integrated here if needed.
// document.addEventListener('DOMContentLoaded', () => {
//     const calendarButtons = document.querySelectorAll('.grid.grid-cols-7 button');
//     calendarButtons.forEach(button => {
//         button.classList.add('calendar-day-button');
//     });
// });

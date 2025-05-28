document.addEventListener('DOMContentLoaded', () => {
    const registrationForm = document.querySelector('form'); // Assuming there's only one form or it's the first one
    // If the form is not explicitly tagged, we might need a more specific selector.
    // Based on the HTML, the button is not inside a <form> tag. We'll find the button and relevant inputs.
    
    const signUpButton = Array.from(document.querySelectorAll('button span'))
                             .find(span => span.textContent.trim() === 'Sign Up')?.parentElement;

    if (!signUpButton) {
        console.error('Sign Up button not found.');
        return;
    }
    
    // Add a message area if it's not already in the HTML
    const heading = document.querySelector('h2.text-\\[\\#0d141c\\]'); // Selects "Create an Account"
    let messageArea = document.getElementById('message-area');
    if (!messageArea && heading && heading.parentElement) {
        messageArea = document.createElement('p');
        messageArea.id = 'message-area';
        messageArea.className = 'text-center py-2'; // Basic styling
        heading.parentElement.insertBefore(messageArea, heading.nextSibling);
    }


    signUpButton.addEventListener('click', async (event) => {
        event.preventDefault(); // Prevent default button action (if it were a submit type)

        const inputs = document.querySelectorAll('input.form-input');
        const fullNameInput = Array.from(inputs).find(input => input.placeholder === 'Full Name');
        const emailInput = Array.from(inputs).find(input => input.placeholder === 'Email');
        const passwordInput = Array.from(inputs).find(input => input.placeholder === 'Password');
        const dogNameInput = Array.from(inputs).find(input => input.placeholder === "Dog's Name");
        const dogBreedInput = Array.from(inputs).find(input => input.placeholder === "Dog's Breed");
        const dogAgeInput = Array.from(inputs).find(input => input.placeholder === "Dog's Age");

        const fullName = fullNameInput ? fullNameInput.value : '';
        const email = emailInput ? emailInput.value : '';
        const password = passwordInput ? passwordInput.value : '';
        const dogName = dogNameInput ? dogNameInput.value : '';
        const dogBreed = dogBreedInput ? dogBreedInput.value : '';
        const dogAge = dogAgeInput ? dogAgeInput.value : '';

        if (!fullName || !email || !password) {
            displayMessage('message-area', 'Full Name, Email, and Password are required.', true);
            return;
        }

        const payload = {
            full_name: fullName,
            email: email,
            password: password,
        };

        if (dogName) { // Only add dog details if a name is provided
            payload.dog_name = dogName;
            payload.dog_breed = dogBreed;
            payload.dog_age = dogAge ? parseInt(dogAge, 10) : null;
        }
        
        try {
            const response = await fetch('/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            if (response.ok) { // Typically 201 for successful registration
                displayMessage('message-area', 'Registration successful! Redirecting to login...', 'success');
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 2000);
            } else {
                displayMessage('message-area', data.error || 'Registration failed. Please try again.', 'error');
            }
        } catch (error) {
            console.error('Registration error:', error);
            displayMessage('message-area', 'An unexpected error occurred. Please try again later.', 'error');
        } finally {
            // Re-enable button
            signUpButton.disabled = false;
            const span = signUpButton.querySelector('span.truncate');
            if (span) {
                span.textContent = 'Sign Up';
            }
        }
    });
});

// Ensure displayMessage is available (it's in common.js)
// if (typeof displayMessage === 'undefined') {
//     function displayMessage(elementId, message, type = 'info') {
//         const messageArea = document.getElementById(elementId);
//         if (messageArea) {
//             messageArea.textContent = message;
//             messageArea.className = 'text-sm text-center py-2'; // Reset classes
//             switch (type) {
//                 case 'success':
//                     messageArea.classList.add('text-green-600');
//                     break;
//                 case 'error':
//                     messageArea.classList.add('text-red-600');
//                     break;
//                 case 'info':
//                 default:
//                     messageArea.classList.add('text-gray-700');
//                     break;
//             }
//         }
//     }
// }

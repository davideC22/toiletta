document.addEventListener('DOMContentLoaded', () => {
    const loginButton = Array.from(document.querySelectorAll('button span'))
                             .find(span => span.textContent.trim() === 'Accedi')?.parentElement;

    if (!loginButton) {
        console.error('Login button not found.');
        return;
    }

    // Add a message area if it's not already in the HTML
    const heading = document.querySelector('h2.text-\\[\\#0d141c\\]'); // Selects "Accedi"
    let messageArea = document.getElementById('message-area');
    if (!messageArea && heading && heading.parentElement) {
        messageArea = document.createElement('p');
        messageArea.id = 'message-area';
        messageArea.className = 'text-center py-2'; // Basic styling
        heading.parentElement.insertBefore(messageArea, heading.nextSibling);
    }
    
    loginButton.addEventListener('click', async (event) => {
        event.preventDefault();

        const inputs = document.querySelectorAll('input.form-input');
        const emailInput = Array.from(inputs).find(input => input.placeholder === 'mario.rossi@email.com');
        const passwordInput = Array.from(inputs).find(input => input.placeholder === '********');

        const email = emailInput ? emailInput.value : '';
        const password = passwordInput ? passwordInput.value : '';

        if (!email || !password) {
            displayMessage('message-area', 'Email and Password are required.', true);
            return;
        }

        const payload = {
            email: email,
            password: password,
        };

        try {
            const response = await fetch('/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            if (response.ok) { // Token received
                setAuthToken(data.access_token); // from common.js
                displayMessage('message-area', 'Login successful! Redirecting...', 'success');
                // Redirect to profile page or a dashboard
                window.location.href = 'profile.html'; 
            } else {
                displayMessage('message-area', data.error || 'Login failed. Please check your credentials.', 'error');
            }
        } catch (error) {
            console.error('Login error:', error);
            displayMessage('message-area', 'An unexpected error occurred. Please try again later.', 'error');
        } finally {
            // Re-enable button
            loginButton.disabled = false;
            const span = loginButton.querySelector('span.truncate');
            if (span) {
                span.textContent = 'Accedi';
            }
        }
    });
});

// Ensure displayMessage and setAuthToken are available (already in common.js, but good for clarity)
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
// if (typeof setAuthToken === 'undefined') {
//     function setAuthToken(token) {
//         localStorage.setItem('jwtToken', token);
//     }
// }

// Helper functions
function getAuthToken() {
    return localStorage.getItem('jwtToken');
}

function setAuthToken(token) {
    localStorage.setItem('jwtToken', token);
}

function removeAuthToken() {
    localStorage.removeItem('jwtToken');
}

async function checkAuthStatus() {
    const token = getAuthToken();
    const currentPath = window.location.pathname.split('/').pop();

    // Define common navigation elements selectors for dynamic updates
    // These selectors might need to be adjusted based on the actual HTML structure
    const authLinksContainerGeneral = document.getElementById('auth-links-container'); // General container for auth links
    const profileLinkNav = document.getElementById('profile-link-nav'); // e.g. in main nav bars
    const logoutLinkNav = document.getElementById('logout-link-nav');   // e.g. in main nav bars
    const loginLinkNav = document.getElementById('login-link-nav');     // e.g. in main nav bars
    const registerLinkNav = document.getElementById('register-link-nav'); // e.g. in main nav bars
    
    // Specific for landing_page.html
    const landingPageAuthLinks = document.getElementById('auth-links'); // As suggested in prompt for landing_page

    // Specific for calprenotazione.html & prenotazione.html (avatar area)
    const userAvatarSection = document.getElementById('user-avatar-section'); // Container for avatar and related links
    const avatarImg = document.getElementById('avatar-img'); // The avatar image itself
    const userNameSpan = document.getElementById('user-name-span'); // To display user name if available

    // Specific for profile.html sidebar
    const profileSidebarLogout = document.getElementById('profile-sidebar-logout');


    if (token) {
        try {
            const response = await fetch('/auth/status', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            const data = await response.json();

            if (response.ok && data.logged_in) {
                // User is logged in
                if (profileLinkNav) profileLinkNav.style.display = 'inline';
                if (logoutLinkNav) logoutLinkNav.style.display = 'inline';
                if (loginLinkNav) loginLinkNav.style.display = 'none';
                if (registerLinkNav) registerLinkNav.style.display = 'none';

                if (landingPageAuthLinks) {
                    landingPageAuthLinks.innerHTML = `
                        <a href="profile.html" class="text-gray-700 hover:text-indigo-700 px-3 py-2 rounded-md text-sm font-medium">Profilo</a>
                        <button onclick="handleLogout()" class="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-md text-sm font-medium">Esci</button>
                    `;
                }
                
                if (userAvatarSection) {
                    userAvatarSection.innerHTML = `
                        <a href="profile.html" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Il Tuo Profilo</a>
                        <button onclick="handleLogout()" class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Esci</button>
                    `;
                     if(avatarImg) avatarImg.src = "https://via.placeholder.com/40/007bff/ffffff?text=U"; // Placeholder or dynamic user avatar
                     if(userNameSpan) userNameSpan.textContent = `User ${data.user_id}`; // Or user's actual name if available
                }

                if (profileSidebarLogout) {
                    const logoutButton = document.createElement('button');
                    logoutButton.className = 'w-full text-left px-3 py-2 text-gray-600 hover:bg-indigo-600 hover:text-white rounded-md text-sm';
                    logoutButton.textContent = 'Esci';
                    logoutButton.onclick = handleLogout;
                    // Check if logout button already exists
                    if (!document.getElementById('sidebar-logout-button')) {
                        logoutButton.id = 'sidebar-logout-button';
                        profileSidebarLogout.appendChild(logoutButton);
                    }
                }
                 // For pages like login/register, if user is logged in, redirect to profile
                if (currentPath === 'login.html' || currentPath === 'registrazione.html') {
                    window.location.href = 'profile.html';
                }

            } else {
                // User is not logged in or token is invalid
                handleNotLoggedIn();
            }
        } catch (error) {
            console.error('Error checking auth status:', error);
            handleNotLoggedIn(); // Treat errors as not logged in
        }
    } else {
        // No token, user is not logged in
        handleNotLoggedIn();
    }
}

function handleNotLoggedIn() {
    const currentPath = window.location.pathname.split('/').pop();
    // Selectors are defined in checkAuthStatus, ensure they are accessible or re-declare if needed
    const authLinksContainerGeneral = document.getElementById('auth-links-container');
    const profileLinkNav = document.getElementById('profile-link-nav');
    const logoutLinkNav = document.getElementById('logout-link-nav');
    const loginLinkNav = document.getElementById('login-link-nav');
    const registerLinkNav = document.getElementById('register-link-nav');
    const landingPageAuthLinks = document.getElementById('auth-links');
    const userAvatarSection = document.getElementById('user-avatar-section');
    const avatarImg = document.getElementById('avatar-img');
    const userNameSpan = document.getElementById('user-name-span');
    const profileSidebarLogout = document.getElementById('profile-sidebar-logout');


    if (profileLinkNav) profileLinkNav.style.display = 'none';
    if (logoutLinkNav) logoutLinkNav.style.display = 'none';
    if (loginLinkNav) loginLinkNav.style.display = 'inline';
    if (registerLinkNav) registerLinkNav.style.display = 'inline';

    if (landingPageAuthLinks) {
        landingPageAuthLinks.innerHTML = `
            <a href="login.html" class="text-gray-700 hover:text-indigo-700 px-3 py-2 rounded-md text-sm font-medium">Accedi</a>
            <a href="registrazione.html" class="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-md text-sm font-medium">Registrati</a>
        `;
    }

    if (userAvatarSection) {
         userAvatarSection.innerHTML = `
            <a href="login.html" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Accedi</a>
            <a href="registrazione.html" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Registrati</a>
        `;
        if(avatarImg) avatarImg.src = "https://via.placeholder.com/40/cccccc/ffffff?text=G"; // Guest avatar
        if(userNameSpan) userNameSpan.textContent = 'Guest';
    }
    
    if (profileSidebarLogout) {
        const logoutButton = document.getElementById('sidebar-logout-button');
        if (logoutButton) {
            logoutButton.remove();
        }
    }

    // If on a protected page and not logged in, redirect to login
    const protectedPages = ['profile.html', 'calprenotazione.html', 'prenotazione.html']; // Add other protected pages
    if (protectedPages.includes(currentPath)) {
         // Allow calprenotazione and prenotazione to be viewed by guests for now as per initial HTML,
         // but profile is strictly for logged-in users.
        if (currentPath === 'profile.html') {
            window.location.href = 'login.html';
        }
    }
}

async function handleLogout() {
    const token = getAuthToken();
    if (token) {
        try {
            const response = await fetch('/auth/logout', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            // Logout is successful even if server call fails, as we remove token client-side
        } catch (error) {
            console.error('Logout API call failed:', error);
        }
    }
    removeAuthToken();
    window.location.href = 'login.html';
}

// Generic message display function
function displayMessage(elementId, message, type = 'info') { // type can be 'success', 'error', or 'info'
    const messageArea = document.getElementById(elementId);
    if (messageArea) {
        messageArea.textContent = message;
        messageArea.className = 'text-sm text-center py-2'; // Reset classes
        switch (type) {
            case 'success':
                messageArea.classList.add('text-green-600');
                break;
            case 'error':
                messageArea.classList.add('text-red-600');
                break;
            case 'info':
            default:
                messageArea.classList.add('text-gray-700'); // Or a default color
                break;
        }
    }
}

// Call checkAuthStatus when DOM is loaded
document.addEventListener('DOMContentLoaded', checkAuthStatus);

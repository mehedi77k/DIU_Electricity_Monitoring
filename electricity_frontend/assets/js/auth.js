document.addEventListener('DOMContentLoaded', async () => {
    const authTitle = document.getElementById('authTitle');
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const alertBox = document.getElementById('authAlert');
    const loginHelp = document.getElementById('loginHelp');
    const signupHelp = document.getElementById('signupHelp');

    const loginEmail = document.getElementById('loginEmail');
    const loginPassword = document.getElementById('loginPassword');
    const loginButton = document.getElementById('loginButton');

    const signupName = document.getElementById('signupName');
    const signupEmail = document.getElementById('signupEmail');
    const signupPassword = document.getElementById('signupPassword');
    const confirmPassword = document.getElementById('confirmPassword');
    const signupButton = document.getElementById('signupButton');
    const switchToSignup = document.getElementById('switchToSignup');
    const switchToLogin = document.getElementById('switchToLogin');

    try {
        await apiFetch('/auth/me.php');
        window.location.href = 'dashboard.html';
        return;
    } catch (error) {
        // Not logged in. Stay on auth page.
    }

    function setMode(mode) {
        hideAlert(alertBox);
        const isSignup = mode === 'signup';

        authTitle.textContent = isSignup ? 'Admin Sign Up' : 'Admin Login';

        loginForm.classList.toggle('hidden', isSignup);
        signupForm.classList.toggle('hidden', !isSignup);
        if (loginHelp) {
            loginHelp.classList.toggle('hidden', isSignup);
        }
        if (signupHelp) {
            signupHelp.classList.toggle('hidden', !isSignup);
        }
    }

    switchToSignup.addEventListener('click', () => setMode('signup'));
    switchToLogin.addEventListener('click', () => setMode('login'));

    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        hideAlert(alertBox);

        const email = loginEmail.value.trim();
        const password = loginPassword.value;

        if (!email || !password) {
            showAlert(alertBox, 'Email and password are required.');
            return;
        }

        loginButton.disabled = true;
        loginButton.textContent = 'Logging in...';

        try {
            await apiFetch('/auth/login.php', {
                method: 'POST',
                body: JSON.stringify({ email, password })
            });
            window.location.href = 'dashboard.html';
        } catch (error) {
            showAlert(alertBox, error.message || 'Login failed.');
        } finally {
            loginButton.disabled = false;
            loginButton.textContent = 'Login';
        }
    });

    signupForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        hideAlert(alertBox);

        const name = signupName.value.trim();
        const email = signupEmail.value.trim();
        const password = signupPassword.value;
        const confirm = confirmPassword.value;

        if (!name || !email || !password || !confirm) {
            showAlert(alertBox, 'All signup fields are required.');
            return;
        }

        if (name.length < 2) {
            showAlert(alertBox, 'Name must be at least 2 characters.');
            return;
        }

        if (password.length < 6) {
            showAlert(alertBox, 'Password must be at least 6 characters.');
            return;
        }

        if (password !== confirm) {
            showAlert(alertBox, 'Password and confirm password do not match.');
            return;
        }

        signupButton.disabled = true;
        signupButton.textContent = 'Creating account...';

        try {
            await apiFetch('/auth/register.php', {
                method: 'POST',
                body: JSON.stringify({ name, email, password })
            });
            window.location.href = 'dashboard.html';
        } catch (error) {
            showAlert(alertBox, error.message || 'Registration failed.');
        } finally {
            signupButton.disabled = false;
            signupButton.textContent = 'Create Admin Account';
        }
    });
});

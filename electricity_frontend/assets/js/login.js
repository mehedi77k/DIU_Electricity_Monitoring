document.addEventListener('DOMContentLoaded', async () => {
    const form = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const loginButton = document.getElementById('loginButton');
    const alertBox = document.getElementById('loginAlert');

    try {
        await apiFetch('/auth/me.php');
        window.location.href = 'dashboard.html';
        return;
    } catch (error) {
        // Not logged in. Stay on login page.
    }

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        hideAlert(alertBox);

        const email = emailInput.value.trim();
        const password = passwordInput.value;

        if (!email || !password) {
            showAlert(alertBox, 'Email and password are required.');
            return;
        }

        loginButton.disabled = true;
        loginButton.textContent = 'Logging in...';

        try {
            await apiFetch('/auth/login.php', {
                method: 'POST',
                body: JSON.stringify({
                    email: email,
                    password: password
                })
            });

            window.location.href = 'dashboard.html';
        } catch (error) {
            showAlert(alertBox, error.message || 'Login failed.');
        } finally {
            loginButton.disabled = false;
            loginButton.textContent = 'Login';
        }
    });
});
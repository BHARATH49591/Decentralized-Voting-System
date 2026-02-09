// Registration Logic
const registerForm = document.getElementById('registerForm');
const registerBtn = document.getElementById('registerBtn');
const messageBox = document.getElementById('messageBox');
const messageText = document.getElementById('messageText');

registerForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const voter_id = document.getElementById('voter-id').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirm_password = document.getElementById('confirm-password').value;

    // Basic validation
    if (!voter_id || !email || !password) {
        showMessage('Please fill in all fields', 'error');
        return;
    }

    if (password !== confirm_password) {
        showMessage('Passwords do not match', 'error');
        return;
    }

    // Show loading state
    registerBtn.classList.add('loading');
    registerBtn.disabled = true;

    try {
        const response = await fetch('http://127.0.0.1:8000/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                voter_id: voter_id,
                email: email,
                password: password,
                role: 'user'
            }),
        });

        const data = await response.json();

        if (response.ok) {
            showMessage(data.message, 'success');
            registerBtn.classList.add('success');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 4000);
        } else {
            throw new Error(data.detail || 'Registration failed');
        }
    } catch (error) {
        console.error('Registration failed:', error.message);
        showMessage(error.message, 'error');
        registerBtn.classList.remove('loading');
        registerBtn.disabled = false;
    }
});

// Password Toggle Functionality
function setupPasswordToggle(toggleId, inputId) {
    const toggle = document.getElementById(toggleId);
    const input = document.getElementById(inputId);
    if (toggle && input) {
        toggle.addEventListener('click', () => {
            const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
            input.setAttribute('type', type);
            const icon = toggle.querySelector('i');
            icon.classList.toggle('fa-eye');
            icon.classList.toggle('fa-eye-slash');
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    setupPasswordToggle('togglePassword', 'password');
    setupPasswordToggle('toggleConfirmPassword', 'confirm-password');
});

function showMessage(message, type) {
    messageText.textContent = message;
    messageBox.style.display = 'flex';

    if (type === 'success') {
        messageBox.style.background = 'rgba(16, 185, 129, 0.15)';
        messageBox.style.border = '2px solid rgba(16, 185, 129, 0.5)';
        messageBox.querySelector('i').className = 'fa-solid fa-circle-check';
        messageBox.querySelector('i').style.color = '#10B981';
        messageBox.style.color = '#A7F3D0';
    } else {
        messageBox.style.background = 'rgba(239, 68, 68, 0.15)';
        messageBox.style.border = '2px solid rgba(239, 68, 68, 0.5)';
        messageBox.querySelector('i').className = 'fa-solid fa-circle-exclamation';
        messageBox.querySelector('i').style.color = '#EF4444';
        messageBox.style.color = '#FCA5A5';
    }
}


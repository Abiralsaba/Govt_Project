// auth.js - Enhanced with SweetAlert2

const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');

// Custom Toast Mixin
const Toast = (typeof Swal !== 'undefined') ? Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    didOpen: (toast) => {
        toast.addEventListener('mouseenter', Swal.stopTimer)
        toast.addEventListener('mouseleave', Swal.resumeTimer)
    }
}) : null;

function showSuccess(title, text) {
    Swal.fire({
        icon: 'success',
        title: title,
        text: text,
        background: '#0f172a', // Match theme
        color: '#fff',
        confirmButtonColor: '#006a4e'
    });
}

function showError(text) {
    Swal.fire({
        icon: 'error',
        title: 'Oops...',
        text: text,
        background: '#0f172a',
        color: '#fff',
        confirmButtonColor: '#f42a41'
    });
}

if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        // Show loading
        Swal.showLoading();

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await res.json();

            // Close loading
            Swal.close();

            if (res.ok) {
                Toast.fire({
                    icon: 'success',
                    title: 'Login Successful!'
                });
                localStorage.setItem('token', data.token);
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 1000);
            } else {
                showError(data.error || 'Login failed');
            }
        } catch (error) {
            Swal.close();
            showError('Network error. Please try again.');
        }
    });
}

if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const username = document.getElementById('username').value;
        const nid = document.getElementById('nid').value;
        const mobile = document.getElementById('mobile').value;
        const dob = document.getElementById('dob').value;
        const gender = document.getElementById('gender').value;
        const address = document.getElementById('address').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (password !== confirmPassword) {
            showError('Passwords do not match');
            return;
        }

        Swal.fire({
            title: 'Creating Identity...',
            text: 'Please wait while we register you securely.',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading()
            }
        });

        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password, nid, mobile, dob, address, gender })
            });

            const data = await res.json();

            if (res.ok) {
                // Auto-login logic
                if (data.token) {
                    localStorage.setItem('token', data.token);
                }

                Swal.fire({
                    icon: 'success',
                    title: 'Welcome, Citizen!',
                    text: 'Registration Successful. You are being logged in...',
                    background: '#006a4e',
                    color: '#fff',
                    timer: 2000,
                    showConfirmButton: false
                }).then(() => {
                    window.location.href = 'dashboard.html';
                });
            } else {
                const msg = data.errors ? data.errors.map(e => e.msg).join('\n') : (data.error || 'Registration failed');
                showError(msg);
            }
        } catch (error) {
            showError('Network error. Please try again.');
        }
    });
}

// Inline Logic for Forgot Password Page (since we had inline scripts there earlier)
// Note: We need to update forgot-password.html to use this or keep inline.
// I'll update forgot-password.html separately to remove inline complexity and use shared functions if possible, 
// but for safety, I'll clean up auth.js here first.

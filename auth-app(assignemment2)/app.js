// open through http://localhost:8080/


const API_BASE = 'https://dummyjson.com';
const ENDPOINTS = {
    LOGIN: `${API_BASE}/auth/login`,
    GET_USER: `${API_BASE}/auth/me`,
    REFRESH: `${API_BASE}/auth/refresh`
};


const STORAGE_KEYS = {
    ACCESS_TOKEN: 'accessToken',
    REFRESH_TOKEN: 'refreshToken',
    USER_DATA: 'userData'
};


const loginPage = document.getElementById('login-page');
const dashboardPage = document.getElementById('dashboard-page');
const loginForm = document.getElementById('login-form');
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const errorMessage = document.getElementById('error-message');
const togglePasswordBtn = document.getElementById('toggle-password');
const passwordInput = document.getElementById('password');
const loadingState = document.getElementById('loading-state');
const profileContent = document.getElementById('profile-content');
const refreshTokenBtn = document.getElementById('refresh-token-btn');


document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    setupEventListeners();
});

function initializeApp() {

    const accessToken = getStorageItem(STORAGE_KEYS.ACCESS_TOKEN);

    if (accessToken) {
        showDashboard();
        loadUserProfile();
    } else {
        showLogin();
    }
}

function setupEventListeners() {
    // Login form submission
    loginForm.addEventListener('submit', handleLogin);

    // Logout button
    logoutBtn.addEventListener('click', handleLogout);

    // Password toggle
    togglePasswordBtn.addEventListener('click', togglePasswordVisibility);

    // Refresh token button
    refreshTokenBtn.addEventListener('click', handleRefreshToken);

    // Clear error on input
    const inputs = loginForm.querySelectorAll('input');
    inputs.forEach(input => {
        input.addEventListener('input', () => hideError());
    });
}

async function handleLogin(e) {
    e.preventDefault();

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const rememberMe = document.getElementById('remember-me').checked;

    if (!username || !password) {
        showError('Please enter both username and password');
        return;
    }

    setLoading(true);
    hideError();

    try {
        console.log('Attempting login with username:', username);

        const response = await fetch(ENDPOINTS.LOGIN, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username,
                password,
                expiresInMins: rememberMe ? 1440 : 60 // 24 hours or 1 hour
            })
        });

        if (!response.ok) {
            throw new Error('Invalid credentials');
        }

        const data = await response.json();

        // Store tokens and user data
        setStorageItem(STORAGE_KEYS.ACCESS_TOKEN, data.accessToken);
        setStorageItem(STORAGE_KEYS.REFRESH_TOKEN, data.refreshToken);
        setStorageItem(STORAGE_KEYS.USER_DATA, JSON.stringify(data));

        // Reset form
        loginForm.reset();

        // Show dashboard
        showDashboard();
        loadUserProfile();

    } catch (error) {
        showError('Login failed. Please check your credentials and try again.');
        console.error('Login error:', error);
    } finally {
        setLoading(false);
    }
}

async function loadUserProfile() {
    const accessToken = getStorageItem(STORAGE_KEYS.ACCESS_TOKEN);

    if (!accessToken) {
        handleLogout();
        return;
    }

    // Show loading state
    loadingState.style.display = 'flex';
    profileContent.style.display = 'none';

    try {
        const response = await fetch(ENDPOINTS.GET_USER, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch user data');
        }

        const userData = await response.json();

        // Update user data in storage
        setStorageItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));

        // Display user profile
        displayUserProfile(userData);

    } catch (error) {
        console.error('Error loading profile:', error);
        // Try to refresh token if request failed
        const refreshed = await handleRefreshToken();
        if (!refreshed) {
            handleLogout();
        }
    } finally {
        loadingState.style.display = 'none';
        profileContent.style.display = 'block';
    }
}

function displayUserProfile(userData) {
    document.getElementById('user-avatar').src = userData.image;
    document.getElementById('user-name').textContent = `${userData.firstName} ${userData.lastName}`;
    document.getElementById('user-email').textContent = userData.email;
    document.getElementById('user-username').textContent = userData.username;
    document.getElementById('user-gender').textContent = userData.gender;
    document.getElementById('user-id').textContent = `#${userData.id}`;
}

async function handleRefreshToken() {
    const refreshToken = getStorageItem(STORAGE_KEYS.REFRESH_TOKEN);

    if (!refreshToken) {
        return false;
    }

    try {
        const response = await fetch(ENDPOINTS.REFRESH, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                refreshToken,
                expiresInMins: 60
            })
        });

        if (!response.ok) {
            throw new Error('Token refresh failed');
        }

        const data = await response.json();

        // Update tokens
        setStorageItem(STORAGE_KEYS.ACCESS_TOKEN, data.accessToken);
        setStorageItem(STORAGE_KEYS.REFRESH_TOKEN, data.refreshToken);

        // Show success feedback
        showRefreshSuccess();

        return true;

    } catch (error) {
        console.error('Token refresh error:', error);
        return false;
    }
}

function showRefreshSuccess() {
    const btn = refreshTokenBtn;
    const originalText = btn.innerHTML;
    btn.innerHTML = '<span>✓ Refreshed!</span>';
    btn.style.background = 'var(--success-color)';
    btn.style.color = 'white';
    btn.style.borderColor = 'var(--success-color)';

    setTimeout(() => {
        btn.innerHTML = originalText;
        btn.style.background = '';
        btn.style.color = '';
        btn.style.borderColor = '';
    }, 2000);
}

function handleLogout() {
    // Clear all stored data
    clearStorage();

    // Show login page
    showLogin();

    // Reset form
    loginForm.reset();
}

// UI Helper Functions
function showLogin() {
    loginPage.classList.add('active');
    dashboardPage.classList.remove('active');
}

function showDashboard() {
    loginPage.classList.remove('active');
    dashboardPage.classList.add('active');
}

function setLoading(isLoading) {
    if (isLoading) {
        loginBtn.classList.add('loading');
        loginBtn.disabled = true;
    } else {
        loginBtn.classList.remove('loading');
        loginBtn.disabled = false;
    }
}

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.add('show');
}

function hideError() {
    errorMessage.classList.remove('show');
}

function togglePasswordVisibility() {
    const type = passwordInput.type === 'password' ? 'text' : 'password';
    passwordInput.type = type;

    const eyeIcon = togglePasswordBtn.querySelector('.eye-icon');
    eyeIcon.textContent = type === 'password' ? '👁️' : '🙈';
}

// Storage Helper Functions
function setStorageItem(key, value) {
    try {
        localStorage.setItem(key, value);
    } catch (error) {
        console.error('Storage error:', error);
    }
}

function getStorageItem(key) {
    try {
        return localStorage.getItem(key);
    } catch (error) {
        console.error('Storage error:', error);
        return null;
    }
}

function clearStorage() {
    try {
        localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
        localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
        localStorage.removeItem(STORAGE_KEYS.USER_DATA);
    } catch (error) {
        console.error('Storage error:', error);
    }
}

// Auto-refresh token before expiration (optional enhancement)
function setupAutoRefresh() {
    // Refresh token every 50 minutes (before 60 min expiration)
    setInterval(async () => {
        const accessToken = getStorageItem(STORAGE_KEYS.ACCESS_TOKEN);
        if (accessToken) {
            await handleRefreshToken();
        }
    }, 50 * 60 * 1000);
}

// Initialize auto-refresh
setupAutoRefresh();

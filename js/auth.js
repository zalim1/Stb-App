// Authentication Management Module for STB Application

window.STBAuth = {
    // Current authentication state
    isAuthenticated: false,
    currentUser: null,
    loginAttempts: 0,
    lockoutTime: null,

    // DOM elements
    elements: {
        authScreen: null,
        authForm: null,
        serverUrlInput: null,
        macAddressInput: null,
        deviceTokenInput: null,
        authButton: null,
        authError: null,
        buttonText: null,
        buttonSpinner: null
    },

    // Initialize authentication module
    init: function() {
        this.bindElements();
        this.bindEvents();
        this.checkExistingSession();
        Utils.log.info('Authentication module initialized');
    },

    // Bind DOM elements
    bindElements: function() {
        this.elements.authScreen = Utils.dom.query('#auth-screen');
        this.elements.authForm = Utils.dom.query('#auth-form');
        this.elements.serverUrlInput = Utils.dom.query('#server-url');
        this.elements.macAddressInput = Utils.dom.query('#mac-address');
        this.elements.deviceTokenInput = Utils.dom.query('#device-token');
        this.elements.authButton = Utils.dom.query('.auth-button');
        this.elements.authError = Utils.dom.query('#auth-error');
        this.elements.buttonText = Utils.dom.query('.button-text');
        this.elements.buttonSpinner = Utils.dom.query('.button-spinner');

        // Pre-fill saved values
        this.loadSavedCredentials();
    },

    // Bind event listeners
    bindEvents: function() {
        if (this.elements.authForm) {
            this.elements.authForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }

        // MAC address formatting
        if (this.elements.macAddressInput) {
            this.elements.macAddressInput.addEventListener('input', (e) => {
                this.formatMacAddress(e.target);
            });
        }

        // Server URL validation
        if (this.elements.serverUrlInput) {
            this.elements.serverUrlInput.addEventListener('blur', (e) => {
                this.validateServerUrl(e.target);
            });
        }
    },

    // Check for existing session
    checkExistingSession: function() {
        const savedSession = Utils.storage.get(STB_CONFIG.storage.keys.auth);
        if (savedSession && this.isSessionValid(savedSession)) {
            this.restoreSession(savedSession);
        } else {
            this.showAuthScreen();
        }
    },

    // Load saved credentials
    loadSavedCredentials: function() {
        const savedUrl = Utils.storage.get('last_server_url', '');
        const savedMac = Utils.storage.get('last_mac_address', '');

        if (this.elements.serverUrlInput && savedUrl) {
            this.elements.serverUrlInput.value = savedUrl;
        }

        if (this.elements.macAddressInput && savedMac) {
            this.elements.macAddressInput.value = savedMac;
        }
    },

    // Format MAC address input
    formatMacAddress: function(input) {
        let value = input.value.replace(/[^0-9A-Fa-f]/g, '');
        
        // Insert colons every 2 characters
        if (value.length > 0) {
            value = value.match(/.{1,2}/g).join(':');
            if (value.length > 17) {
                value = value.substring(0, 17);
            }
        }
        
        input.value = value.toUpperCase();
    },

    // Validate server URL
    validateServerUrl: function(input) {
        const url = input.value.trim();
        if (url && !Utils.url.isValid(url)) {
            this.showError('Please enter a valid server URL');
            input.focus();
            return false;
        }
        return true;
    },

    // Check if session is valid
    isSessionValid: function(session) {
        if (!session || !session.token || !session.loginTime) {
            return false;
        }

        const sessionAge = Date.now() - session.loginTime;
        return sessionAge < STB_CONFIG.auth.tokenExpiry;
    },

    // Restore existing session
    restoreSession: function(session) {
        this.isAuthenticated = true;
        this.currentUser = session;
        API.sessionData = session;
        API.baseUrl = session.serverUrl;
        
        this.hideAuthScreen();
        this.showMainScreen();
        
        Utils.log.info('Session restored for MAC:', session.mac);
    },

    // Handle login form submission
    handleLogin: function() {
        // Check if in lockout period
        if (this.isLockedOut()) {
            const remainingTime = Math.ceil((this.lockoutTime - Date.now()) / 1000);
            this.showError(`Too many failed attempts. Try again in ${remainingTime} seconds.`);
            return;
        }

        // Get form values
        const serverUrl = this.elements.serverUrlInput.value.trim();
        const macAddress = this.elements.macAddressInput.value.trim();
        const deviceToken = this.elements.deviceTokenInput.value.trim();

        // Validate inputs
        if (!this.validateInputs(serverUrl, macAddress)) {
            return;
        }

        // Show loading state
        this.setLoadingState(true);

        // Perform login
        this.performLogin(serverUrl, macAddress, deviceToken)
            .then((session) => {
                this.onLoginSuccess(session, serverUrl, macAddress);
            })
            .catch((error) => {
                this.onLoginError(error);
            })
            .finally(() => {
                this.setLoadingState(false);
            });
    },

    // Validate form inputs
    validateInputs: function(serverUrl, macAddress) {
        this.hideError();

        if (!serverUrl) {
            this.showError('Server URL is required');
            this.elements.serverUrlInput.focus();
            return false;
        }

        if (!Utils.url.isValid(serverUrl)) {
            this.showError('Please enter a valid server URL');
            this.elements.serverUrlInput.focus();
            return false;
        }

        if (!macAddress) {
            this.showError('MAC address is required');
            this.elements.macAddressInput.focus();
            return false;
        }

        if (!Utils.string.isValidMac(macAddress)) {
            this.showError('Please enter a valid MAC address (e.g., 00:1A:79:XX:XX:XX)');
            this.elements.macAddressInput.focus();
            return false;
        }

        return true;
    },

    // Perform actual login
    performLogin: function(serverUrl, macAddress, deviceToken) {
        return API.auth.login(serverUrl, macAddress, deviceToken)
            .then((session) => {
                // Reset login attempts on success
                this.loginAttempts = 0;
                this.lockoutTime = null;
                return session;
            })
            .catch((error) => {
                // Increment login attempts
                this.loginAttempts++;
                
                // Check if should lock out
                if (this.loginAttempts >= STB_CONFIG.auth.maxLoginAttempts) {
                    this.lockoutTime = Date.now() + STB_CONFIG.auth.lockoutDuration;
                }
                
                throw error;
            });
    },

    // Handle successful login
    onLoginSuccess: function(session, serverUrl, macAddress) {
        this.isAuthenticated = true;
        this.currentUser = session;

        // Save credentials for next time
        Utils.storage.set('last_server_url', serverUrl);
        Utils.storage.set('last_mac_address', macAddress);

        // Hide auth screen and show main app
        this.hideAuthScreen();
        this.showMainScreen();

        // Initialize other modules
        if (window.STBApp && window.STBApp.onAuthSuccess) {
            window.STBApp.onAuthSuccess(session);
        }

        Utils.log.info('Login successful for MAC:', macAddress);
    },

    // Handle login error
    onLoginError: function(error) {
        let errorMessage = error.message || STB_CONFIG.errors.auth.invalidCredentials;
        
        // Map specific error types
        if (error.message) {
            if (error.message.includes('unauthorized') || error.message.includes('401')) {
                errorMessage = STB_CONFIG.errors.auth.unauthorized;
            } else if (error.message.includes('forbidden') || error.message.includes('403')) {
                errorMessage = STB_CONFIG.errors.auth.deviceBlocked;
            } else if (error.message.includes('timeout')) {
                errorMessage = STB_CONFIG.errors.network.timeout;
            } else if (error.message.includes('network') || error.message.includes('fetch')) {
                errorMessage = STB_CONFIG.errors.network.offline;
            }
        }

        this.showError(errorMessage);
        Utils.log.error('Login failed:', error);
    },

    // Check if currently locked out
    isLockedOut: function() {
        return this.lockoutTime && Date.now() < this.lockoutTime;
    },

    // Set loading state
    setLoadingState: function(isLoading) {
        if (this.elements.authButton) {
            this.elements.authButton.disabled = isLoading;
        }
        
        if (this.elements.buttonText) {
            Utils.dom.toggle(this.elements.buttonText, !isLoading);
        }
        
        if (this.elements.buttonSpinner) {
            Utils.dom.toggle(this.elements.buttonSpinner, isLoading);
        }

        // Disable form inputs during loading
        const inputs = [
            this.elements.serverUrlInput,
            this.elements.macAddressInput,
            this.elements.deviceTokenInput
        ];
        
        inputs.forEach(input => {
            if (input) {
                input.disabled = isLoading;
            }
        });
    },

    // Show error message
    showError: function(message) {
        if (this.elements.authError) {
            this.elements.authError.textContent = message;
            Utils.dom.show(this.elements.authError);
        }
    },

    // Hide error message
    hideError: function() {
        if (this.elements.authError) {
            Utils.dom.hide(this.elements.authError);
        }
    },

    // Show authentication screen
    showAuthScreen: function() {
        if (this.elements.authScreen) {
            Utils.dom.show(this.elements.authScreen);
        }
        
        // Hide loading screen
        const loadingScreen = Utils.dom.query('#loading-screen');
        if (loadingScreen) {
            Utils.dom.hide(loadingScreen);
        }

        // Focus first input
        setTimeout(() => {
            if (this.elements.serverUrlInput) {
                this.elements.serverUrlInput.focus();
            }
        }, 100);
    },

    // Hide authentication screen
    hideAuthScreen: function() {
        if (this.elements.authScreen) {
            Utils.dom.hide(this.elements.authScreen);
        }
    },

    // Show main application screen
    showMainScreen: function() {
        const mainScreen = Utils.dom.query('#main-screen');
        if (mainScreen) {
            Utils.dom.show(mainScreen);
        }
        
        // Hide loading screen
        const loadingScreen = Utils.dom.query('#loading-screen');
        if (loadingScreen) {
            Utils.dom.hide(loadingScreen);
        }
    },

    // Logout user
    logout: function() {
        // Clear session data
        API.auth.logout();
        this.isAuthenticated = false;
        this.currentUser = null;

        // Hide main screen
        const mainScreen = Utils.dom.query('#main-screen');
        if (mainScreen) {
            Utils.dom.hide(mainScreen);
        }

        // Show auth screen
        this.showAuthScreen();

        // Notify other modules
        if (window.STBApp && window.STBApp.onLogout) {
            window.STBApp.onLogout();
        }

        Utils.log.info('User logged out');
    },

    // Check and refresh session periodically
    checkSession: function() {
        if (!this.isAuthenticated || !this.currentUser) {
            return;
        }

        if (!this.isSessionValid(this.currentUser)) {
            Utils.log.warn('Session expired, logging out');
            this.logout();
            return;
        }

        // Refresh session if needed
        API.auth.refreshSession()
            .catch((error) => {
                Utils.log.error('Session refresh failed:', error);
                this.logout();
            });
    },

    // Get current user info
    getCurrentUser: function() {
        return this.currentUser;
    },

    // Check if user is authenticated
    isUserAuthenticated: function() {
        return this.isAuthenticated && this.currentUser && this.isSessionValid(this.currentUser);
    },

    // Get device info for display
    getDeviceInfo: function() {
        if (!this.currentUser) return '';
        
        const mac = this.currentUser.mac;
        const profile = this.currentUser.profile;
        
        let info = `MAC: ${mac}`;
        if (profile && profile.device_id) {
            info += ` | Device: ${profile.device_id}`;
        }
        
        return info;
    },

    // Auto-generate MAC address (for testing)
    generateMacAddress: function() {
        const chars = '0123456789ABCDEF';
        let mac = '';
        
        for (let i = 0; i < 6; i++) {
            if (i > 0) mac += ':';
            mac += chars.charAt(Math.floor(Math.random() * chars.length));
            mac += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        
        return mac;
    },

    // Fill demo credentials (for development)
    fillDemoCredentials: function() {
        if (STB_CONFIG.debug.enabled) {
            if (this.elements.serverUrlInput && !this.elements.serverUrlInput.value) {
                this.elements.serverUrlInput.value = 'http://demo-server.com/stalker_portal';
            }
            
            if (this.elements.macAddressInput && !this.elements.macAddressInput.value) {
                this.elements.macAddressInput.value = this.generateMacAddress();
            }
        }
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    STBAuth.init();
});

// Periodic session check
setInterval(() => {
    STBAuth.checkSession();
}, 60000); // Check every minute

// Handle page visibility change to refresh session
document.addEventListener('visibilitychange', function() {
    if (!document.hidden && STBAuth.isUserAuthenticated()) {
        STBAuth.checkSession();
    }
});

// Make auth module globally available
window.Auth = STBAuth;
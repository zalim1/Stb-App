// Main Application Controller for STB Application

window.STBApp = {
    // Application state
    isInitialized: false,
    currentSection: 'channels',
    isAuthenticated: false,
    modules: {},

    // DOM elements
    elements: {
        loadingScreen: null,
        mainScreen: null,
        navButtons: null,
        sections: null,
        timeDisplay: null,
        deviceInfo: null
    },

    // Initialize application
    init: function() {
        Utils.log.info('Initializing STB Application...');
        
        this.bindElements();
        this.setupModules();
        this.bindEvents();
        this.startTimeUpdate();
        this.checkInitialState();
        
        this.isInitialized = true;
        Utils.log.info('STB Application initialized successfully');
    },

    // Bind DOM elements
    bindElements: function() {
        this.elements.loadingScreen = Utils.dom.query('#loading-screen');
        this.elements.mainScreen = Utils.dom.query('#main-screen');
        this.elements.navButtons = Utils.dom.queryAll('.nav-button');
        this.elements.sections = Utils.dom.queryAll('.content-section');
        this.elements.timeDisplay = Utils.dom.query('#current-time');
        this.elements.deviceInfo = Utils.dom.query('#device-info');
    },

    // Setup application modules
    setupModules: function() {
        this.modules = {
            auth: window.STBAuth,
            remote: window.STBRemote,
            player: window.STBPlayer,
            channels: window.STBChannels,
            vod: window.STBVOD,
            epg: window.STBEPG,
            settings: window.STBSettings
        };

        // Verify all modules are loaded
        Object.keys(this.modules).forEach(name => {
            if (!this.modules[name]) {
                Utils.log.error(`Module ${name} not loaded`);
            }
        });
    },

    // Bind event listeners
    bindEvents: function() {
        // Navigation buttons
        this.elements.navButtons.forEach(button => {
            button.addEventListener('click', () => {
                const section = button.getAttribute('data-section');
                this.navigateToSection(section);
            });
        });

        // Window events
        window.addEventListener('beforeunload', () => {
            this.onBeforeUnload();
        });

        window.addEventListener('online', () => {
            this.onNetworkStatusChange(true);
        });

        window.addEventListener('offline', () => {
            this.onNetworkStatusChange(false);
        });

        // Visibility change (for pause/resume)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.onAppPause();
            } else {
                this.onAppResume();
            }
        });
    },

    // Check initial application state
    checkInitialState: function() {
        // Check if user is already authenticated
        if (this.modules.auth && this.modules.auth.isUserAuthenticated()) {
            this.onAuthSuccess(this.modules.auth.getCurrentUser());
        } else {
            // Show loading screen briefly, then auth screen
            setTimeout(() => {
                if (this.elements.loadingScreen) {
                    Utils.dom.hide(this.elements.loadingScreen);
                }
            }, 1000);
        }
    },

    // Handle successful authentication
    onAuthSuccess: function(userData) {
        Utils.log.info('Authentication successful, initializing app...');
        
        this.isAuthenticated = true;
        
        // Update device info display
        if (this.elements.deviceInfo) {
            this.elements.deviceInfo.textContent = this.modules.auth.getDeviceInfo();
        }
        
        // Hide loading screen
        if (this.elements.loadingScreen) {
            Utils.dom.hide(this.elements.loadingScreen);
        }
        
        // Show main screen
        if (this.elements.mainScreen) {
            Utils.dom.show(this.elements.mainScreen);
        }
        
        // Initialize content modules
        this.initializeContentModules();
        
        // Navigate to default section
        this.navigateToSection('channels');
        
        // Setup remote focus on navigation
        setTimeout(() => {
            if (this.modules.remote) {
                this.modules.remote.resetFocus();
            }
        }, 500);
    },

    // Handle logout
    onLogout: function() {
        Utils.log.info('User logged out');
        
        this.isAuthenticated = false;
        
        // Stop any playing media
        if (this.modules.player) {
            this.modules.player.stop();
        }
        
        // Clear module data
        Object.values(this.modules).forEach(module => {
            if (module && module.reset) {
                module.reset();
            }
        });
        
        // Hide main screen
        if (this.elements.mainScreen) {
            Utils.dom.hide(this.elements.mainScreen);
        }
    },

    // Initialize content modules after authentication
    initializeContentModules: function() {
        // Load channels
        if (this.modules.channels) {
            this.modules.channels.load().catch(error => {
                Utils.log.error('Failed to load channels:', error);
            });
        }
        
        // Load VOD
        if (this.modules.vod) {
            // Don't auto-load VOD to save bandwidth
            // Will load when user navigates to VOD section
        }
        
        // Load EPG
        if (this.modules.epg) {
            // Don't auto-load EPG to save bandwidth
            // Will load when user navigates to EPG section
        }
    },

    // Navigate to application section
    navigateToSection: function(sectionName) {
        if (!this.isAuthenticated && sectionName !== 'auth') {
            return;
        }
        
        Utils.log.debug('Navigating to section:', sectionName);
        
        // Update navigation buttons
        this.elements.navButtons.forEach(button => {
            Utils.dom.removeClass(button, 'active');
            if (button.getAttribute('data-section') === sectionName) {
                Utils.dom.addClass(button, 'active');
            }
        });
        
        // Update sections
        this.elements.sections.forEach(section => {
            Utils.dom.removeClass(section, 'active');
            if (section.id === sectionName + '-section') {
                Utils.dom.addClass(section, 'active');
            }
        });
        
        // Load section data if needed
        this.loadSectionData(sectionName);
        
        // Update current section
        this.currentSection = sectionName;
        
        // Reset focus to section
        setTimeout(() => {
            if (this.modules.remote) {
                this.modules.remote.resetFocus();
            }
        }, 100);
    },

    // Load data for specific section
    loadSectionData: function(sectionName) {
        switch (sectionName) {
            case 'channels':
                if (this.modules.channels && this.modules.channels.allChannels.length === 0) {
                    this.modules.channels.load();
                }
                break;
                
            case 'vod':
                if (this.modules.vod && this.modules.vod.allMovies.length === 0) {
                    this.modules.vod.load();
                }
                break;
                
            case 'series':
                // Series would use VOD module with different parameters
                if (this.modules.vod) {
                    // Load series data
                }
                break;
                
            case 'epg':
                if (this.modules.epg && Object.keys(this.modules.epg.programs).length === 0) {
                    this.modules.epg.load();
                }
                break;
                
            case 'settings':
                // Settings are always loaded
                break;
        }
    },

    // Start time display update
    startTimeUpdate: function() {
        this.updateTimeDisplay();
        
        setInterval(() => {
            this.updateTimeDisplay();
        }, 1000);
    },

    // Update time display
    updateTimeDisplay: function() {
        if (this.elements.timeDisplay) {
            const now = new Date();
            this.elements.timeDisplay.textContent = Utils.time.formatTime(now.getTime());
        }
    },

    // Handle network status changes
    onNetworkStatusChange: function(isOnline) {
        if (isOnline) {
            Utils.log.info('Network connection restored');
            Utils.error.show('Connection restored', 'success', 3000);
            
            // Retry failed requests
            if (window.API) {
                window.API.processQueue();
            }
        } else {
            Utils.log.warn('Network connection lost');
            Utils.error.show('Connection lost. Working offline...', 'warning', 5000);
        }
    },

    // Handle app pause (when window loses focus)
    onAppPause: function() {
        Utils.log.debug('App paused');
        
        // Pause video if playing
        if (this.modules.player && this.modules.player.isPlaying) {
            this.modules.player.elements.video.pause();
        }
    },

    // Handle app resume (when window gains focus)
    onAppResume: function() {
        Utils.log.debug('App resumed');
        
        // Refresh session if needed
        if (this.modules.auth && this.modules.auth.isUserAuthenticated()) {
            this.modules.auth.checkSession();
        }
    },

    // Handle before unload
    onBeforeUnload: function() {
        // Save any pending data
        if (this.modules.settings) {
            this.modules.settings.saveSettings();
        }
        
        // Stop media playback
        if (this.modules.player) {
            this.modules.player.stop();
        }
    },

    // Remote control action handlers
    goBack: function() {
        // Handle back navigation
        if (this.currentSection === 'settings') {
            this.navigateToSection('channels');
        } else {
            // Could implement history stack here
            Utils.log.debug('Back action in section:', this.currentSection);
        }
    },

    showMainMenu: function() {
        this.navigateToSection('settings');
    },

    showInfo: function() {
        // Show info about current content
        if (this.currentSection === 'channels' && this.modules.channels.currentChannel) {
            this.showChannelInfo(this.modules.channels.currentChannel);
        } else if (this.currentSection === 'epg') {
            // EPG info is already shown
        }
    },

    showGuide: function() {
        this.navigateToSection('epg');
    },

    toggleFavorites: function() {
        // Toggle favorites view in current section
        if (this.currentSection === 'channels' && this.modules.channels) {
            this.modules.channels.showFavorites();
        } else if (this.currentSection === 'vod' && this.modules.vod) {
            this.modules.vod.showFavorites();
        }
    },

    showSearch: function() {
        // Focus search input in current section
        const searchInput = Utils.dom.query(`#${this.currentSection}-search`);
        if (searchInput) {
            searchInput.focus();
        }
    },

    showCategories: function() {
        // Focus category select in current section
        const categorySelect = Utils.dom.query(`#${this.currentSection}-category`);
        if (categorySelect) {
            if (this.modules.remote) {
                this.modules.remote.setFocus(categorySelect);
            }
        }
    },

    showOptions: function() {
        // Show options menu (could be context-specific)
        this.navigateToSection('settings');
    },

    // Show channel information
    showChannelInfo: function(channel) {
        const modal = Utils.dom.create('div', {
            className: 'modal channel-info-modal',
            innerHTML: `
                <div class="modal-content">
                    <h3>${Utils.string.escapeHtml(channel.name)}</h3>
                    <div class="channel-details">
                        <p><strong>Channel:</strong> ${channel.number}</p>
                        <p><strong>Genre:</strong> ${Utils.string.escapeHtml(channel.genre)}</p>
                        ${channel.description ? `<p><strong>Description:</strong> ${Utils.string.escapeHtml(channel.description)}</p>` : ''}
                    </div>
                    <div class="modal-actions">
                        <button class="modal-close">Close</button>
                        <button class="play-channel">Watch</button>
                        <button class="toggle-favorite">${channel.isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}</button>
                    </div>
                </div>
            `
        });
        
        document.body.appendChild(modal);
        Utils.dom.show(modal);
        
        // Event handlers
        const closeBtn = modal.querySelector('.modal-close');
        closeBtn.addEventListener('click', () => {
            Utils.dom.hide(modal);
            setTimeout(() => modal.remove(), 300);
        });
        
        const playBtn = modal.querySelector('.play-channel');
        playBtn.addEventListener('click', () => {
            if (this.modules.channels) {
                this.modules.channels.playChannel(channel);
            }
            Utils.dom.hide(modal);
            setTimeout(() => modal.remove(), 300);
        });
        
        const favoriteBtn = modal.querySelector('.toggle-favorite');
        favoriteBtn.addEventListener('click', () => {
            if (this.modules.channels) {
                this.modules.channels.toggleFavorite(channel);
            }
            Utils.dom.hide(modal);
            setTimeout(() => modal.remove(), 300);
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                Utils.dom.hide(modal);
                setTimeout(() => modal.remove(), 300);
            }
        });
    },

    // Get application state
    getState: function() {
        return {
            isInitialized: this.isInitialized,
            isAuthenticated: this.isAuthenticated,
            currentSection: this.currentSection,
            modules: Object.keys(this.modules).reduce((state, name) => {
                const module = this.modules[name];
                if (module && module.getState) {
                    state[name] = module.getState();
                }
                return state;
            }, {})
        };
    },

    // Handle errors globally
    handleError: function(error, context = 'app') {
        Utils.log.error('Application error in', context, ':', error);
        
        // Show user-friendly error message
        let message = 'An unexpected error occurred';
        
        if (error.message) {
            if (error.message.includes('network') || error.message.includes('fetch')) {
                message = 'Network error. Please check your connection.';
            } else if (error.message.includes('auth')) {
                message = 'Authentication error. Please login again.';
            } else {
                message = error.message;
            }
        }
        
        Utils.error.show(message);
        
        // Handle critical errors
        if (context === 'auth' && error.message.includes('unauthorized')) {
            // Force logout
            if (this.modules.auth) {
                this.modules.auth.logout();
            }
        }
    },

    // Restart application
    restart: function() {
        Utils.log.info('Restarting application...');
        
        // Stop all modules
        Object.values(this.modules).forEach(module => {
            if (module && module.stop) {
                module.stop();
            }
        });
        
        // Clear application state
        this.isInitialized = false;
        this.isAuthenticated = false;
        this.currentSection = 'channels';
        
        // Reload page
        setTimeout(() => {
            window.location.reload();
        }, 500);
    },

    // Check for application updates
    checkForUpdates: function() {
        // This would typically check with server for new versions
        Utils.log.info('Checking for updates...');
        
        // Placeholder implementation
        setTimeout(() => {
            Utils.error.show('You are running the latest version', 'success');
        }, 1000);
    },

    // Get application info
    getInfo: function() {
        return {
            name: STB_CONFIG.app.name,
            version: STB_CONFIG.app.version,
            build: STB_CONFIG.app.build,
            userAgent: STB_CONFIG.app.userAgent,
            features: STB_CONFIG.features,
            device: Utils.device.getInfo()
        };
    }
};

// Global error handler
window.addEventListener('error', function(event) {
    STBApp.handleError(event.error || new Error(event.message), 'global');
});

// Unhandled promise rejection handler
window.addEventListener('unhandledrejection', function(event) {
    STBApp.handleError(event.reason, 'promise');
    event.preventDefault();
});

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Ensure all dependencies are loaded
    const requiredModules = ['STBAuth', 'STBRemote', 'STBPlayer', 'STBChannels', 'STBVOD', 'STBEPG', 'STBSettings'];
    const missingModules = requiredModules.filter(name => !window[name]);
    
    if (missingModules.length > 0) {
        console.error('Missing required modules:', missingModules);
        return;
    }
    
    // Initialize application
    STBApp.init();
});

// Make app globally available
window.App = STBApp;
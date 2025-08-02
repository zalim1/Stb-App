// Settings Management Module for STB Application

window.STBSettings = {
    // Current settings
    settings: {},
    
    // DOM elements
    elements: {
        section: null,
        categories: null,
        content: null,
        panels: {},
        logoutBtn: null
    },

    // Initialize settings module
    init: function() {
        this.loadSettings();
        this.bindElements();
        this.bindEvents();
        this.populateSettings();
        Utils.log.info('Settings module initialized');
    },

    // Load settings from storage
    loadSettings: function() {
        this.settings = {
            ...STB_CONFIG.settings, // Default settings
            ...Utils.storage.get(STB_CONFIG.storage.keys.settings, {}) // User settings
        };
    },

    // Save settings to storage
    saveSettings: function() {
        Utils.storage.set(STB_CONFIG.storage.keys.settings, this.settings);
        Utils.log.info('Settings saved');
    },

    // Bind DOM elements
    bindElements: function() {
        this.elements.section = Utils.dom.query('#settings-section');
        this.elements.categories = Utils.dom.queryAll('.settings-category');
        this.elements.content = Utils.dom.query('.settings-content');
        this.elements.logoutBtn = Utils.dom.query('#logout-button');
        
        // Bind setting panels
        this.elements.panels = {
            video: Utils.dom.query('#settings-video'),
            audio: Utils.dom.query('#settings-audio'),
            network: Utils.dom.query('#settings-network'),
            parental: Utils.dom.query('#settings-parental'),
            system: Utils.dom.query('#settings-system')
        };
    },

    // Bind event listeners
    bindEvents: function() {
        // Category navigation
        this.elements.categories.forEach(category => {
            category.addEventListener('click', () => {
                const categoryName = category.getAttribute('data-category');
                this.showCategory(categoryName);
            });
        });

        // Video settings
        this.bindVideoSettings();
        
        // Audio settings
        this.bindAudioSettings();
        
        // Network settings
        this.bindNetworkSettings();
        
        // Parental settings
        this.bindParentalSettings();
        
        // System settings
        this.bindSystemSettings();

        // Logout button
        if (this.elements.logoutBtn) {
            this.elements.logoutBtn.addEventListener('click', () => {
                this.logout();
            });
        }
    },

    // Bind video settings events
    bindVideoSettings: function() {
        const qualitySelect = Utils.dom.query('#video-quality');
        const aspectSelect = Utils.dom.query('#aspect-ratio');

        if (qualitySelect) {
            qualitySelect.addEventListener('change', (e) => {
                this.updateSetting('video.quality', e.target.value);
            });
        }

        if (aspectSelect) {
            aspectSelect.addEventListener('change', (e) => {
                this.updateSetting('video.aspectRatio', e.target.value);
            });
        }
    },

    // Bind audio settings events
    bindAudioSettings: function() {
        const outputSelect = Utils.dom.query('#audio-output');
        const volumeSlider = Utils.dom.query('#volume-slider');
        const volumeValue = Utils.dom.query('#volume-value');

        if (outputSelect) {
            outputSelect.addEventListener('change', (e) => {
                this.updateSetting('audio.output', e.target.value);
            });
        }

        if (volumeSlider) {
            volumeSlider.addEventListener('input', (e) => {
                const volume = parseInt(e.target.value);
                this.updateSetting('audio.volume', volume);
                
                if (volumeValue) {
                    volumeValue.textContent = volume + '%';
                }
                
                // Update player volume if available
                if (window.STBPlayer) {
                    window.STBPlayer.setVolume(volume);
                }
            });
        }
    },

    // Bind network settings events
    bindNetworkSettings: function() {
        const bufferSelect = Utils.dom.query('#buffer-size');

        if (bufferSelect) {
            bufferSelect.addEventListener('change', (e) => {
                this.updateSetting('network.bufferSize', e.target.value);
            });
        }
    },

    // Bind parental settings events
    bindParentalSettings: function() {
        const parentalLock = Utils.dom.query('#parental-lock');
        const parentalPin = Utils.dom.query('#parental-pin');

        if (parentalLock) {
            parentalLock.addEventListener('change', (e) => {
                this.updateSetting('parental.enabled', e.target.checked);
                
                // Show/hide PIN field
                if (parentalPin) {
                    parentalPin.style.display = e.target.checked ? 'block' : 'none';
                }
            });
        }

        if (parentalPin) {
            parentalPin.addEventListener('change', (e) => {
                const pin = e.target.value;
                if (pin.length === 4 && /^\d{4}$/.test(pin)) {
                    this.updateSetting('parental.pin', pin);
                } else if (pin.length > 0) {
                    Utils.error.show('PIN must be 4 digits');
                    e.target.value = this.settings.parental.pin || '';
                }
            });
        }
    },

    // Bind system settings events
    bindSystemSettings: function() {
        const serverUrlInput = Utils.dom.query('#system-server-url');
        const macAddressInput = Utils.dom.query('#system-mac-address');

        // These are read-only, populated from current session
        if (serverUrlInput && window.STBAuth) {
            const currentUser = window.STBAuth.getCurrentUser();
            if (currentUser) {
                serverUrlInput.value = currentUser.serverUrl || '';
            }
        }

        if (macAddressInput && window.STBAuth) {
            const currentUser = window.STBAuth.getCurrentUser();
            if (currentUser) {
                macAddressInput.value = currentUser.mac || '';
            }
        }
    },

    // Show settings category
    showCategory: function(categoryName) {
        // Update active category button
        this.elements.categories.forEach(cat => {
            Utils.dom.removeClass(cat, 'active');
            if (cat.getAttribute('data-category') === categoryName) {
                Utils.dom.addClass(cat, 'active');
            }
        });

        // Show corresponding panel
        Object.keys(this.elements.panels).forEach(panelName => {
            const panel = this.elements.panels[panelName];
            if (panel) {
                if (panelName === categoryName) {
                    Utils.dom.addClass(panel, 'active');
                    Utils.dom.show(panel);
                } else {
                    Utils.dom.removeClass(panel, 'active');
                    Utils.dom.hide(panel);
                }
            }
        });

        Utils.log.debug('Showing settings category:', categoryName);
    },

    // Populate settings with current values
    populateSettings: function() {
        // Video settings
        this.setSelectValue('#video-quality', this.settings.video?.quality);
        this.setSelectValue('#aspect-ratio', this.settings.video?.aspectRatio);

        // Audio settings
        this.setSelectValue('#audio-output', this.settings.audio?.output);
        this.setSliderValue('#volume-slider', this.settings.audio?.volume);
        
        const volumeValue = Utils.dom.query('#volume-value');
        if (volumeValue) {
            volumeValue.textContent = (this.settings.audio?.volume || 80) + '%';
        }

        // Network settings
        this.setSelectValue('#buffer-size', this.settings.network?.bufferSize);

        // Parental settings
        this.setCheckboxValue('#parental-lock', this.settings.parental?.enabled);
        this.setInputValue('#parental-pin', this.settings.parental?.pin);

        // Show/hide PIN field based on parental lock
        const parentalPin = Utils.dom.query('#parental-pin');
        if (parentalPin) {
            parentalPin.style.display = this.settings.parental?.enabled ? 'block' : 'none';
        }
    },

    // Helper methods for setting form values
    setSelectValue: function(selector, value) {
        const element = Utils.dom.query(selector);
        if (element && value !== undefined) {
            element.value = value;
        }
    },

    setSliderValue: function(selector, value) {
        const element = Utils.dom.query(selector);
        if (element && value !== undefined) {
            element.value = value;
        }
    },

    setCheckboxValue: function(selector, value) {
        const element = Utils.dom.query(selector);
        if (element && value !== undefined) {
            element.checked = !!value;
        }
    },

    setInputValue: function(selector, value) {
        const element = Utils.dom.query(selector);
        if (element && value !== undefined) {
            element.value = value;
        }
    },

    // Update a setting value
    updateSetting: function(path, value) {
        const keys = path.split('.');
        let current = this.settings;
        
        // Navigate to the parent object
        for (let i = 0; i < keys.length - 1; i++) {
            if (!current[keys[i]]) {
                current[keys[i]] = {};
            }
            current = current[keys[i]];
        }
        
        // Set the value
        current[keys[keys.length - 1]] = value;
        
        // Save settings
        this.saveSettings();
        
        // Apply setting immediately
        this.applySetting(path, value);
        
        Utils.log.debug('Setting updated:', path, '=', value);
    },

    // Apply setting changes immediately
    applySetting: function(path, value) {
        switch (path) {
            case 'video.quality':
                this.applyVideoQuality(value);
                break;
            case 'video.aspectRatio':
                this.applyAspectRatio(value);
                break;
            case 'audio.output':
                this.applyAudioOutput(value);
                break;
            case 'audio.volume':
                this.applyVolume(value);
                break;
            case 'network.bufferSize':
                this.applyBufferSize(value);
                break;
            case 'parental.enabled':
                this.applyParentalControls(value);
                break;
        }
    },

    // Apply video quality setting
    applyVideoQuality: function(quality) {
        if (window.STBPlayer && window.STBPlayer.hlsInstance) {
            if (quality === 'auto') {
                window.STBPlayer.hlsInstance.currentLevel = -1; // Auto
            } else {
                const levels = window.STBPlayer.getQualityLevels();
                const level = levels.find(l => l.label === quality);
                if (level) {
                    window.STBPlayer.setQualityLevel(level.index);
                }
            }
        }
    },

    // Apply aspect ratio setting
    applyAspectRatio: function(ratio) {
        if (window.STBPlayer && window.STBPlayer.elements.video) {
            const video = window.STBPlayer.elements.video;
            if (ratio === 'auto') {
                video.style.objectFit = 'contain';
            } else {
                video.style.objectFit = 'fill';
            }
        }
    },

    // Apply audio output setting
    applyAudioOutput: function(output) {
        // This would typically configure audio output routing
        Utils.log.debug('Audio output set to:', output);
    },

    // Apply volume setting
    applyVolume: function(volume) {
        if (window.STBPlayer) {
            window.STBPlayer.setVolume(volume);
        }
    },

    // Apply buffer size setting
    applyBufferSize: function(bufferSize) {
        // Update HLS buffer settings
        if (window.STBPlayer && window.STBPlayer.hlsInstance) {
            const bufferConfig = {
                small: { maxBufferLength: 30, maxMaxBufferLength: 60 },
                medium: { maxBufferLength: 60, maxMaxBufferLength: 120 },
                large: { maxBufferLength: 90, maxMaxBufferLength: 180 }
            };
            
            if (bufferConfig[bufferSize]) {
                Object.assign(window.STBPlayer.hlsInstance.config, bufferConfig[bufferSize]);
            }
        }
    },

    // Apply parental controls
    applyParentalControls: function(enabled) {
        // This would filter content based on parental settings
        Utils.log.debug('Parental controls:', enabled ? 'enabled' : 'disabled');
    },

    // Get current setting value
    getSetting: function(path, defaultValue = null) {
        const keys = path.split('.');
        let current = this.settings;
        
        for (const key of keys) {
            if (current && current.hasOwnProperty(key)) {
                current = current[key];
            } else {
                return defaultValue;
            }
        }
        
        return current;
    },

    // Reset settings to defaults
    resetSettings: function() {
        if (confirm('Are you sure you want to reset all settings to defaults?')) {
            this.settings = { ...STB_CONFIG.settings };
            this.saveSettings();
            this.populateSettings();
            
            // Apply all settings
            Object.keys(this.settings).forEach(category => {
                if (typeof this.settings[category] === 'object') {
                    Object.keys(this.settings[category]).forEach(setting => {
                        this.applySetting(`${category}.${setting}`, this.settings[category][setting]);
                    });
                }
            });
            
            Utils.error.show('Settings reset to defaults', 'success');
            Utils.log.info('Settings reset to defaults');
        }
    },

    // Export settings
    exportSettings: function() {
        const settingsJson = JSON.stringify(this.settings, null, 2);
        const blob = new Blob([settingsJson], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = 'stb-settings.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        Utils.error.show('Settings exported successfully', 'success');
    },

    // Import settings
    importSettings: function(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedSettings = JSON.parse(e.target.result);
                
                // Validate settings structure
                if (this.validateSettings(importedSettings)) {
                    this.settings = { ...STB_CONFIG.settings, ...importedSettings };
                    this.saveSettings();
                    this.populateSettings();
                    
                    Utils.error.show('Settings imported successfully', 'success');
                    Utils.log.info('Settings imported');
                } else {
                    throw new Error('Invalid settings file format');
                }
                
            } catch (error) {
                Utils.error.show('Error importing settings: ' + error.message);
                Utils.log.error('Settings import error:', error);
            }
        };
        
        reader.readAsText(file);
    },

    // Validate settings structure
    validateSettings: function(settings) {
        const requiredCategories = ['video', 'audio', 'network', 'parental'];
        
        return requiredCategories.every(category => 
            settings.hasOwnProperty(category) && 
            typeof settings[category] === 'object'
        );
    },

    // Get system information
    getSystemInfo: function() {
        const deviceInfo = Utils.device.getInfo();
        const currentUser = window.STBAuth ? window.STBAuth.getCurrentUser() : null;
        
        return {
            app: {
                name: STB_CONFIG.app.name,
                version: STB_CONFIG.app.version,
                build: STB_CONFIG.app.build
            },
            device: {
                userAgent: deviceInfo.userAgent,
                platform: deviceInfo.platform,
                screen: deviceInfo.screen,
                language: deviceInfo.language
            },
            session: currentUser ? {
                serverUrl: currentUser.serverUrl,
                mac: currentUser.mac,
                loginTime: new Date(currentUser.loginTime).toLocaleString()
            } : null,
            storage: {
                used: this.getStorageUsage(),
                available: this.getStorageAvailable()
            }
        };
    },

    // Get storage usage
    getStorageUsage: function() {
        let totalSize = 0;
        
        try {
            for (let key in localStorage) {
                if (key.startsWith(STB_CONFIG.storage.prefix)) {
                    totalSize += localStorage[key].length;
                }
            }
        } catch (error) {
            Utils.log.error('Error calculating storage usage:', error);
        }
        
        return totalSize;
    },

    // Get available storage
    getStorageAvailable: function() {
        try {
            // This is an approximation
            const testKey = STB_CONFIG.storage.prefix + 'test';
            const testData = 'x'.repeat(1024); // 1KB
            let available = 0;
            
            while (available < 10240) { // Test up to 10MB
                try {
                    localStorage.setItem(testKey, testData.repeat(available + 1));
                    available++;
                } catch {
                    break;
                }
            }
            
            localStorage.removeItem(testKey);
            return available * 1024; // Return in bytes
            
        } catch (error) {
            return -1; // Unknown
        }
    },

    // Clear application data
    clearAppData: function() {
        if (confirm('Are you sure you want to clear all application data? This will log you out and reset all settings.')) {
            // Clear storage
            Utils.storage.clear();
            
            // Clear any cached data
            if ('caches' in window) {
                caches.keys().then(names => {
                    names.forEach(name => caches.delete(name));
                });
            }
            
            Utils.error.show('Application data cleared', 'success');
            
            // Restart application
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        }
    },

    // Logout user
    logout: function() {
        if (confirm('Are you sure you want to logout?')) {
            if (window.STBAuth) {
                window.STBAuth.logout();
            }
        }
    },

    // Get all settings
    getAllSettings: function() {
        return { ...this.settings };
    },

    // Check if parental controls should block content
    isContentBlocked: function(content) {
        if (!this.settings.parental?.enabled) {
            return false;
        }
        
        // Check rating
        const maxRating = this.settings.parental?.maxRating || 'PG-13';
        if (content.rating && this.compareRatings(content.rating, maxRating) > 0) {
            return true;
        }
        
        // Check blocked categories
        const blockedCategories = this.settings.parental?.blockedCategories || [];
        if (content.category && blockedCategories.includes(content.category)) {
            return true;
        }
        
        return false;
    },

    // Compare content ratings
    compareRatings: function(rating1, rating2) {
        const ratings = ['G', 'PG', 'PG-13', 'R', 'NC-17'];
        const index1 = ratings.indexOf(rating1);
        const index2 = ratings.indexOf(rating2);
        
        if (index1 === -1 || index2 === -1) return 0;
        
        return index1 - index2;
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    STBSettings.init();
});

// Make settings module globally available
window.Settings = STBSettings;
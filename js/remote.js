// Remote Control Handling Module for STB Application

window.STBRemote = {
    // Current state
    currentFocus: null,
    focusHistory: [],
    navigationEnabled: true,
    channelInputBuffer: '',
    channelInputTimeout: null,
    lastKeyTime: 0,
    repeatTimeout: null,

    // Key mappings
    keyMappings: {},

    // Initialize remote control module
    init: function() {
        this.loadKeyMappings();
        this.bindEvents();
        this.setupFocusManagement();
        Utils.log.info('Remote control module initialized');
    },

    // Load key mappings from config
    loadKeyMappings: function() {
        this.keyMappings = { ...STB_CONFIG.remote.keyMappings.standard };
        
        // Add device-specific mappings
        const userAgent = navigator.userAgent.toLowerCase();
        if (userAgent.includes('mag') && STB_CONFIG.remote.keyMappings.mag) {
            Object.assign(this.keyMappings, STB_CONFIG.remote.keyMappings.mag);
        }
    },

    // Bind keyboard events
    bindEvents: function() {
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.handleKeyUp(e));
        
        // Handle mouse/touch for hybrid navigation
        document.addEventListener('click', (e) => this.handleClick(e));
        document.addEventListener('focusin', (e) => this.handleFocusIn(e));
    },

    // Setup focus management
    setupFocusManagement: function() {
        // Make body focusable for key events
        document.body.tabIndex = -1;
        
        // Initial focus setup
        this.setupInitialFocus();
        
        // Setup focus indicators
        this.setupFocusIndicators();
    },

    // Setup initial focus
    setupInitialFocus: function() {
        setTimeout(() => {
            const firstFocusable = this.findFirstFocusableElement();
            if (firstFocusable) {
                this.setFocus(firstFocusable);
            }
        }, 100);
    },

    // Setup focus indicators
    setupFocusIndicators: function() {
        const style = document.createElement('style');
        style.textContent = `
            .remote-focused {
                outline: 4px solid #4a90e2 !important;
                outline-offset: 4px !important;
                box-shadow: 0 0 0 8px rgba(74, 144, 226, 0.3) !important;
                transform: scale(1.05) !important;
                z-index: 100 !important;
                position: relative !important;
            }
        `;
        document.head.appendChild(style);
    },

    // Handle key down events
    handleKeyDown: function(e) {
        if (!this.navigationEnabled) return;

        const now = Date.now();
        const key = this.keyMappings[e.keyCode] || e.key.toLowerCase();
        
        // Handle key repeat
        if (this.lastKeyTime && (now - this.lastKeyTime) < STB_CONFIG.remote.navigation.repeatDelay) {
            if (this.repeatTimeout) {
                clearTimeout(this.repeatTimeout);
            }
            this.repeatTimeout = setTimeout(() => {
                this.processKey(key, e);
            }, STB_CONFIG.remote.navigation.repeatDelay);
            return;
        }

        this.lastKeyTime = now;
        this.processKey(key, e);
    },

    // Handle key up events
    handleKeyUp: function(e) {
        if (this.repeatTimeout) {
            clearTimeout(this.repeatTimeout);
            this.repeatTimeout = null;
        }
    },

    // Process key input
    processKey: function(key, originalEvent) {
        Utils.log.debug('Remote key pressed:', key);

        // Number keys for channel input
        if (key >= '0' && key <= '9') {
            this.handleNumberKey(key);
            originalEvent.preventDefault();
            return;
        }

        // Navigation keys
        switch (key) {
            case 'up':
                this.navigateUp();
                originalEvent.preventDefault();
                break;
            case 'down':
                this.navigateDown();
                originalEvent.preventDefault();
                break;
            case 'left':
                this.navigateLeft();
                originalEvent.preventDefault();
                break;
            case 'right':
                this.navigateRight();
                originalEvent.preventDefault();
                break;
            case 'ok':
            case 'enter':
                this.activateCurrentFocus();
                originalEvent.preventDefault();
                break;
            case 'back':
            case 'escape':
                this.handleBack();
                originalEvent.preventDefault();
                break;
            case 'menu':
                this.handleMenu();
                originalEvent.preventDefault();
                break;
            case 'info':
                this.handleInfo();
                originalEvent.preventDefault();
                break;
            case 'guide':
                this.handleGuide();
                originalEvent.preventDefault();
                break;
            case 'help':
                this.showRemoteHelp();
                originalEvent.preventDefault();
                break;
            case 'play_pause':
            case ' ':
                this.handlePlayPause();
                originalEvent.preventDefault();
                break;
            case 'volume_up':
                this.handleVolumeUp();
                originalEvent.preventDefault();
                break;
            case 'volume_down':
                this.handleVolumeDown();
                originalEvent.preventDefault();
                break;
            case 'channel_up':
                this.handleChannelUp();
                originalEvent.preventDefault();
                break;
            case 'channel_down':
                this.handleChannelDown();
                originalEvent.preventDefault();
                break;
            case 'red':
                this.handleColorKey('red');
                originalEvent.preventDefault();
                break;
            case 'green':
                this.handleColorKey('green');
                originalEvent.preventDefault();
                break;
            case 'yellow':
                this.handleColorKey('yellow');
                originalEvent.preventDefault();
                break;
            case 'blue':
                this.handleColorKey('blue');
                originalEvent.preventDefault();
                break;
        }
    },

    // Handle number key input
    handleNumberKey: function(number) {
        // Add to channel input buffer
        this.channelInputBuffer += number;
        
        // Show channel input overlay
        this.showChannelInput();
        
        // Clear timeout if exists
        if (this.channelInputTimeout) {
            clearTimeout(this.channelInputTimeout);
        }
        
        // Set timeout to process channel change
        this.channelInputTimeout = setTimeout(() => {
            this.processChannelInput();
        }, STB_CONFIG.remote.channelZap.timeout);
    },

    // Show channel input overlay
    showChannelInput: function() {
        let overlay = Utils.dom.query('.channel-input-overlay');
        
        if (!overlay) {
            overlay = Utils.dom.create('div', {
                className: 'channel-input-overlay'
            });
            
            const display = Utils.dom.create('div', {
                className: 'channel-input-display'
            });
            
            const hint = Utils.dom.create('div', {
                className: 'channel-input-hint',
                innerHTML: 'Enter channel number'
            });
            
            overlay.appendChild(display);
            overlay.appendChild(hint);
            document.body.appendChild(overlay);
        }
        
        // Update display
        const display = overlay.querySelector('.channel-input-display');
        display.textContent = this.channelInputBuffer.padStart(3, '_');
        
        // Show overlay
        Utils.dom.addClass(overlay, 'show');
    },

    // Process channel input
    processChannelInput: function() {
        const channelNumber = parseInt(this.channelInputBuffer);
        
        if (channelNumber > 0) {
            // Notify channel manager
            if (window.STBChannels && window.STBChannels.switchToChannel) {
                window.STBChannels.switchToChannel(channelNumber);
            }
        }
        
        this.hideChannelInput();
    },

    // Hide channel input overlay
    hideChannelInput: function() {
        const overlay = Utils.dom.query('.channel-input-overlay');
        if (overlay) {
            Utils.dom.removeClass(overlay, 'show');
            setTimeout(() => overlay.remove(), 300);
        }
        
        this.channelInputBuffer = '';
        if (this.channelInputTimeout) {
            clearTimeout(this.channelInputTimeout);
            this.channelInputTimeout = null;
        }
    },

    // Navigation methods
    navigateUp: function() {
        const current = this.currentFocus;
        if (!current) return;
        
        const next = this.findNavigationTarget(current, 'up');
        if (next) {
            this.setFocus(next);
        }
    },

    navigateDown: function() {
        const current = this.currentFocus;
        if (!current) return;
        
        const next = this.findNavigationTarget(current, 'down');
        if (next) {
            this.setFocus(next);
        }
    },

    navigateLeft: function() {
        const current = this.currentFocus;
        if (!current) return;
        
        const next = this.findNavigationTarget(current, 'left');
        if (next) {
            this.setFocus(next);
        }
    },

    navigateRight: function() {
        const current = this.currentFocus;
        if (!current) return;
        
        const next = this.findNavigationTarget(current, 'right');
        if (next) {
            this.setFocus(next);
        }
    },

    // Find navigation target in given direction
    findNavigationTarget: function(current, direction) {
        const currentRect = current.getBoundingClientRect();
        const focusableElements = this.getFocusableElements();
        
        let bestElement = null;
        let bestDistance = Infinity;
        
        focusableElements.forEach(element => {
            if (element === current || !this.isElementVisible(element)) return;
            
            const rect = element.getBoundingClientRect();
            let isValidDirection = false;
            let distance = 0;
            
            // Check if element is in the right direction
            switch (direction) {
                case 'up':
                    isValidDirection = rect.bottom <= currentRect.top;
                    distance = currentRect.top - rect.bottom + Math.abs(rect.left - currentRect.left);
                    break;
                case 'down':
                    isValidDirection = rect.top >= currentRect.bottom;
                    distance = rect.top - currentRect.bottom + Math.abs(rect.left - currentRect.left);
                    break;
                case 'left':
                    isValidDirection = rect.right <= currentRect.left;
                    distance = currentRect.left - rect.right + Math.abs(rect.top - currentRect.top);
                    break;
                case 'right':
                    isValidDirection = rect.left >= currentRect.right;
                    distance = rect.left - currentRect.right + Math.abs(rect.top - currentRect.top);
                    break;
            }
            
            if (isValidDirection && distance < bestDistance) {
                bestDistance = distance;
                bestElement = element;
            }
        });
        
        // If no element found in direction, wrap around if enabled
        if (!bestElement && STB_CONFIG.remote.navigation.wrapAround) {
            bestElement = this.findWrapAroundTarget(current, direction);
        }
        
        return bestElement;
    },

    // Find wrap-around target
    findWrapAroundTarget: function(current, direction) {
        const focusableElements = this.getFocusableElements();
        const currentRect = current.getBoundingClientRect();
        
        let bestElement = null;
        let bestDistance = Infinity;
        
        focusableElements.forEach(element => {
            if (element === current || !this.isElementVisible(element)) return;
            
            const rect = element.getBoundingClientRect();
            let distance = 0;
            
            switch (direction) {
                case 'up':
                    distance = Math.abs(rect.left - currentRect.left);
                    if (!bestElement || rect.bottom > bestElement.getBoundingClientRect().bottom) {
                        bestElement = element;
                    }
                    break;
                case 'down':
                    distance = Math.abs(rect.left - currentRect.left);
                    if (!bestElement || rect.top < bestElement.getBoundingClientRect().top) {
                        bestElement = element;
                    }
                    break;
                case 'left':
                    distance = Math.abs(rect.top - currentRect.top);
                    if (!bestElement || rect.right > bestElement.getBoundingClientRect().right) {
                        bestElement = element;
                    }
                    break;
                case 'right':
                    distance = Math.abs(rect.top - currentRect.top);
                    if (!bestElement || rect.left < bestElement.getBoundingClientRect().left) {
                        bestElement = element;
                    }
                    break;
            }
        });
        
        return bestElement;
    },

    // Get all focusable elements
    getFocusableElements: function() {
        const selector = [
            'button:not([disabled])',
            'input:not([disabled])',
            'select:not([disabled])',
            'textarea:not([disabled])',
            '.content-item',
            '.nav-button',
            '.settings-category',
            '[tabindex]:not([tabindex="-1"])'
        ].join(', ');
        
        return Array.from(document.querySelectorAll(selector))
            .filter(el => this.isElementVisible(el));
    },

    // Check if element is visible
    isElementVisible: function(element) {
        const style = window.getComputedStyle(element);
        return style.display !== 'none' && 
               style.visibility !== 'hidden' && 
               style.opacity !== '0' &&
               element.offsetParent !== null;
    },

    // Find first focusable element
    findFirstFocusableElement: function() {
        const focusable = this.getFocusableElements();
        return focusable.length > 0 ? focusable[0] : null;
    },

    // Set focus to element
    setFocus: function(element) {
        if (!element) return;
        
        // Remove focus from current element
        if (this.currentFocus) {
            Utils.dom.removeClass(this.currentFocus, 'remote-focused');
            Utils.dom.removeClass(this.currentFocus, 'focused');
        }
        
        // Set new focus
        this.currentFocus = element;
        Utils.dom.addClass(element, 'remote-focused');
        Utils.dom.addClass(element, 'focused');
        
        // Scroll into view if needed
        this.scrollIntoView(element);
        
        // Add to focus history
        if (STB_CONFIG.remote.navigation.remembersLastFocus) {
            this.focusHistory.push(element);
            if (this.focusHistory.length > 10) {
                this.focusHistory.shift();
            }
        }
        
        Utils.log.debug('Focus set to:', element);
    },

    // Scroll element into view
    scrollIntoView: function(element) {
        element.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
            inline: 'nearest'
        });
    },

    // Activate currently focused element
    activateCurrentFocus: function() {
        if (!this.currentFocus) return;
        
        // Trigger click event
        this.currentFocus.click();
        
        // Handle specific element types
        if (this.currentFocus.tagName === 'INPUT') {
            this.currentFocus.focus();
        }
    },

    // Handle mouse/touch click
    handleClick: function(e) {
        const clickedElement = e.target;
        const focusable = this.getFocusableElements();
        
        // Find closest focusable element
        let targetElement = clickedElement;
        while (targetElement && !focusable.includes(targetElement)) {
            targetElement = targetElement.parentElement;
        }
        
        if (targetElement) {
            this.setFocus(targetElement);
        }
    },

    // Handle focus in event
    handleFocusIn: function(e) {
        const focusedElement = e.target;
        if (this.getFocusableElements().includes(focusedElement)) {
            this.setFocus(focusedElement);
        }
    },

    // Action handlers
    handleBack: function() {
        // Close modals first
        const modal = Utils.dom.query('.modal:not(.hidden)');
        if (modal) {
            Utils.dom.hide(modal);
            return;
        }
        
        // Close player
        const playerModal = Utils.dom.query('#player-modal:not(.hidden)');
        if (playerModal) {
            if (window.STBPlayer && window.STBPlayer.close) {
                window.STBPlayer.close();
            }
            return;
        }
        
        // Navigate back in app
        if (window.STBApp && window.STBApp.goBack) {
            window.STBApp.goBack();
        }
    },

    handleMenu: function() {
        // Show main menu or settings
        if (window.STBApp && window.STBApp.showMainMenu) {
            window.STBApp.showMainMenu();
        }
    },

    handleInfo: function() {
        // Show info about current content
        if (window.STBApp && window.STBApp.showInfo) {
            window.STBApp.showInfo();
        }
    },

    handleGuide: function() {
        // Show EPG
        if (window.STBApp && window.STBApp.showGuide) {
            window.STBApp.showGuide();
        }
    },

    handlePlayPause: function() {
        // Control player
        if (window.STBPlayer && window.STBPlayer.togglePlayPause) {
            window.STBPlayer.togglePlayPause();
        }
    },

    handleVolumeUp: function() {
        if (window.STBPlayer && window.STBPlayer.volumeUp) {
            window.STBPlayer.volumeUp();
        }
    },

    handleVolumeDown: function() {
        if (window.STBPlayer && window.STBPlayer.volumeDown) {
            window.STBPlayer.volumeDown();
        }
    },

    handleChannelUp: function() {
        if (window.STBChannels && window.STBChannels.nextChannel) {
            window.STBChannels.nextChannel();
        }
    },

    handleChannelDown: function() {
        if (window.STBChannels && window.STBChannels.previousChannel) {
            window.STBChannels.previousChannel();
        }
    },

    handleColorKey: function(color) {
        // Handle color key functions
        switch (color) {
            case 'red':
                // Toggle favorites
                if (window.STBApp && window.STBApp.toggleFavorites) {
                    window.STBApp.toggleFavorites();
                }
                break;
            case 'green':
                // Show search
                if (window.STBApp && window.STBApp.showSearch) {
                    window.STBApp.showSearch();
                }
                break;
            case 'yellow':
                // Show categories
                if (window.STBApp && window.STBApp.showCategories) {
                    window.STBApp.showCategories();
                }
                break;
            case 'blue':
                // Show options
                if (window.STBApp && window.STBApp.showOptions) {
                    window.STBApp.showOptions();
                }
                break;
        }
    },

    // Show remote help
    showRemoteHelp: function() {
        const helpModal = Utils.dom.query('#remote-help-modal');
        if (helpModal) {
            Utils.dom.show(helpModal);
            
            // Focus close button
            const closeButton = helpModal.querySelector('#close-help');
            if (closeButton) {
                this.setFocus(closeButton);
            }
        }
    },

    // Enable/disable navigation
    enableNavigation: function() {
        this.navigationEnabled = true;
    },

    disableNavigation: function() {
        this.navigationEnabled = false;
    },

    // Get current focus
    getCurrentFocus: function() {
        return this.currentFocus;
    },

    // Reset focus to first element
    resetFocus: function() {
        const firstFocusable = this.findFirstFocusableElement();
        if (firstFocusable) {
            this.setFocus(firstFocusable);
        }
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    STBRemote.init();
});

// Handle close help modal
document.addEventListener('DOMContentLoaded', function() {
    const closeHelpButton = Utils.dom.query('#close-help');
    if (closeHelpButton) {
        closeHelpButton.addEventListener('click', function() {
            const helpModal = Utils.dom.query('#remote-help-modal');
            if (helpModal) {
                Utils.dom.hide(helpModal);
                STBRemote.resetFocus();
            }
        });
    }
});

// Make remote module globally available
window.Remote = STBRemote;
// STB Application Configuration
window.STB_CONFIG = {
    // Application Information
    app: {
        name: 'STB Client',
        version: '1.0.0',
        build: Date.now(),
        userAgent: 'STB-Client/1.0.0'
    },

    // Default Server Configuration
    server: {
        defaultUrl: 'http://your-stalker-server.com/stalker_portal',
        timeout: 30000, // 30 seconds
        retryAttempts: 3,
        retryDelay: 2000 // 2 seconds
    },

    // Authentication Settings
    auth: {
        tokenExpiry: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
        refreshThreshold: 2 * 60 * 60 * 1000, // 2 hours before expiry
        maxLoginAttempts: 3,
        lockoutDuration: 5 * 60 * 1000 // 5 minutes
    },

    // API Endpoints (relative to server URL)
    api: {
        endpoints: {
            handshake: '/server/load.php',
            auth: '/server/load.php',
            profile: '/server/load.php',
            channels: '/server/load.php',
            epg: '/server/load.php',
            vod: '/server/load.php',
            series: '/server/load.php',
            stream: '/server/load.php',
            timeshift: '/server/load.php'
        },
        actions: {
            handshake: 'handshake',
            auth: 'get_profile',
            getProfile: 'get_profile',
            getChannels: 'get_ordered_list',
            getGenres: 'get_genres',
            getEpg: 'get_epg_info',
            getVod: 'get_ordered_list',
            getSeries: 'get_ordered_list',
            getSeriesInfo: 'get_series_info',
            createLink: 'create_link',
            getLink: 'get_link'
        }
    },

    // Channel Configuration
    channels: {
        pageSize: 50,
        thumbnailSize: '320x180',
        refreshInterval: 30 * 60 * 1000, // 30 minutes
        zapTimeout: 3000, // 3 seconds for channel zapping
        categories: {
            all: 'All Channels',
            favorites: 'Favorites'
        }
    },

    // VOD Configuration
    vod: {
        pageSize: 50,
        thumbnailSize: '300x400',
        categories: {
            all: 'All Movies',
            favorites: 'Favorites',
            new: 'New Releases',
            popular: 'Popular'
        },
        sortOptions: [
            { value: 'name', label: 'Name' },
            { value: 'year', label: 'Year' },
            { value: 'rating', label: 'Rating' },
            { value: 'added', label: 'Recently Added' }
        ]
    },

    // Series Configuration
    series: {
        pageSize: 50,
        thumbnailSize: '300x400',
        categories: {
            all: 'All Series',
            favorites: 'Favorites',
            new: 'New Episodes',
            popular: 'Popular'
        }
    },

    // EPG Configuration
    epg: {
        daysToLoad: 7,
        hoursPerPage: 6,
        refreshInterval: 15 * 60 * 1000, // 15 minutes
        timeFormat: '24h', // '12h' or '24h'
        startHour: 6, // Start EPG display at 6 AM
        endHour: 30 // End at 6 AM next day (24 + 6)
    },

    // Player Configuration
    player: {
        // HLS Configuration
        hls: {
            autoStartLoad: true,
            startPosition: -1,
            capLevelToPlayerSize: true,
            debug: false,
            enableWorker: true,
            lowLatencyMode: false,
            backBufferLength: 90,
            maxBufferLength: 60,
            maxMaxBufferLength: 300,
            liveSyncDuration: 3,
            liveMaxLatencyDuration: 10
        },
        
        // DASH Configuration
        dash: {
            streaming: {
                buffer: {
                    bufferTimeAtTopQuality: 30,
                    bufferTimeAtTopQualityLongForm: 60,
                    initialBufferLevel: 20,
                    stableBufferTime: 40
                },
                abr: {
                    autoSwitchBitrate: {
                        video: true,
                        audio: true
                    },
                    initialBitrate: {
                        video: -1,
                        audio: -1
                    }
                }
            }
        },

        // Controls
        controls: {
            showTimeout: 3000, // Hide controls after 3 seconds
            seekStep: 10, // Seek forward/backward by 10 seconds
            volumeStep: 10 // Volume up/down by 10%
        },

        // Quality Settings
        quality: {
            auto: true,
            preferred: '1080p',
            available: ['auto', '1080p', '720p', '480p', '360p']
        },

        // Subtitle Settings
        subtitles: {
            enabled: false,
            fontSize: '16px',
            fontFamily: 'Arial, sans-serif',
            color: '#ffffff',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            position: 'bottom'
        }
    },

    // Remote Control Configuration
    remote: {
        // Key mappings for different remote types
        keyMappings: {
            // Standard TV Remote
            standard: {
                // Navigation
                38: 'up',       // Arrow Up
                40: 'down',     // Arrow Down
                37: 'left',     // Arrow Left
                39: 'right',    // Arrow Right
                13: 'ok',       // Enter/OK
                27: 'back',     // Escape/Back
                
                // Numbers
                48: '0', 49: '1', 50: '2', 51: '3', 52: '4',
                53: '5', 54: '6', 55: '7', 56: '8', 57: '9',
                
                // Function keys
                116: 'info',    // F5
                117: 'guide',   // F6
                118: 'menu',    // F7
                119: 'help',    // F8
                
                // Media controls
                32: 'play_pause', // Space
                179: 'play',
                178: 'stop',
                177: 'previous',
                176: 'next',
                
                // Volume
                107: 'volume_up',   // +
                109: 'volume_down', // -
                173: 'mute',        // Mute
                
                // Channel
                33: 'channel_up',   // Page Up
                34: 'channel_down', // Page Down
                
                // Colors (for some STB remotes)
                112: 'red',      // F1
                113: 'green',    // F2
                114: 'yellow',   // F3
                115: 'blue'      // F4
            }
        },
        
        // Navigation settings
        navigation: {
            wrapAround: true,
            remembersLastFocus: true,
            focusTimeout: 100,
            longPressDelay: 500,
            repeatDelay: 150
        },
        
        // Channel zapping
        channelZap: {
            timeout: 3000,
            showOverlay: true,
            allowDirectInput: true
        }
    },

    // Storage Configuration
    storage: {
        prefix: 'stb_app_',
        keys: {
            auth: 'auth_data',
            settings: 'user_settings',
            favorites: 'favorites',
            lastChannel: 'last_channel',
            lastPosition: 'last_position',
            watchHistory: 'watch_history'
        },
        maxHistoryItems: 100,
        compression: false
    },

    // Settings Default Values
    settings: {
        video: {
            quality: 'auto',
            aspectRatio: 'auto',
            deinterlacing: true,
            smoothing: false
        },
        audio: {
            output: 'stereo',
            volume: 80,
            language: 'auto',
            normalizeVolume: true
        },
        network: {
            bufferSize: 'medium',
            connectionTimeout: 10000,
            enableCaching: true,
            cacheSize: '100MB'
        },
        parental: {
            enabled: false,
            pin: '',
            maxRating: 'PG-13',
            blockedCategories: []
        },
        ui: {
            theme: 'dark',
            language: 'en',
            showThumbnails: true,
            animationsEnabled: true,
            clockFormat: '24h'
        },
        epg: {
            showPastPrograms: true,
            showOnlyFavorites: false,
            autoRefresh: true,
            displayHours: 6
        }
    },

    // Error Messages
    errors: {
        network: {
            timeout: 'Connection timeout. Please check your network connection.',
            offline: 'No internet connection. Please check your network settings.',
            serverError: 'Server error. Please try again later.',
            unauthorized: 'Authentication failed. Please check your credentials.',
            forbidden: 'Access denied. Please contact your service provider.'
        },
        auth: {
            invalidCredentials: 'Invalid MAC address or credentials.',
            deviceBlocked: 'Device is blocked. Please contact support.',
            tokenExpired: 'Session expired. Please login again.',
            maxDevicesReached: 'Maximum number of devices reached.'
        },
        player: {
            streamNotFound: 'Stream not available. Please try another channel.',
            formatNotSupported: 'Video format not supported by your device.',
            decodingError: 'Video decoding error. Please try again.',
            networkError: 'Network error while loading video.'
        },
        general: {
            unknownError: 'An unknown error occurred. Please try again.',
            maintenance: 'Service is under maintenance. Please try again later.',
            updateRequired: 'Application update required. Please contact support.'
        }
    },

    // Debug Configuration
    debug: {
        enabled: false,
        logLevel: 'info', // 'debug', 'info', 'warn', 'error'
        logToConsole: true,
        logToStorage: false,
        maxLogEntries: 1000,
        showNetworkRequests: false,
        showPlayerEvents: false
    },

    // Performance Settings
    performance: {
        lazyLoading: true,
        imagePreloading: false,
        cacheImages: true,
        maxConcurrentRequests: 6,
        requestThrottling: 100, // milliseconds
        virtualScrolling: true
    },

    // Accessibility Settings
    accessibility: {
        highContrast: false,
        largeText: false,
        reduceMotion: false,
        keyboardNavigation: true,
        screenReader: false
    },

    // Feature Flags
    features: {
        timeshift: true,
        recording: false,
        multiRoom: false,
        socialFeatures: false,
        recommendations: true,
        parentalControls: true,
        multiLanguage: true,
        pictureInPicture: false,
        casting: false
    },

    // Localization
    localization: {
        defaultLanguage: 'en',
        supportedLanguages: ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru'],
        dateFormat: 'DD/MM/YYYY',
        timeFormat: 'HH:mm',
        currency: 'USD',
        timezone: 'auto'
    },

    // Analytics (if needed)
    analytics: {
        enabled: false,
        trackEvents: false,
        trackErrors: true,
        anonymizeData: true
    }
};

// Environment-specific overrides
if (typeof window !== 'undefined') {
    // Development environment
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        window.STB_CONFIG.debug.enabled = true;
        window.STB_CONFIG.debug.logLevel = 'debug';
        window.STB_CONFIG.debug.showNetworkRequests = true;
        window.STB_CONFIG.debug.showPlayerEvents = true;
    }
    
    // Detect STB device capabilities
    const userAgent = navigator.userAgent.toLowerCase();
    
    // MAG STB detection
    if (userAgent.includes('mag') || userAgent.includes('infomir')) {
        window.STB_CONFIG.player.hls.enableWorker = false; // MAG devices may have issues with workers
        window.STB_CONFIG.remote.keyMappings.mag = {
            // MAG-specific key mappings
            2082: 'menu',
            2083: 'back',
            2084: 'info',
            2085: 'ok'
        };
    }
    
    // Android TV detection
    if (userAgent.includes('android') && userAgent.includes('tv')) {
        window.STB_CONFIG.performance.virtualScrolling = false; // Better compatibility
        window.STB_CONFIG.player.controls.showTimeout = 5000; // Longer timeout for Android TV
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.STB_CONFIG;
}
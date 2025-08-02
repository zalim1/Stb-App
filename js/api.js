// API Communication Layer for STB Application

window.STBAPI = {
    // Base configuration
    baseUrl: '',
    sessionData: null,
    requestQueue: [],
    isOnline: navigator.onLine,

    // Initialize API
    init: function(serverUrl) {
        this.baseUrl = serverUrl.replace(/\/$/, ''); // Remove trailing slash
        this.setupNetworkMonitoring();
        Utils.log.info('API initialized with server:', this.baseUrl);
    },

    // Setup network monitoring
    setupNetworkMonitoring: function() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            Utils.log.info('Network connection restored');
            this.processQueue();
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            Utils.log.warn('Network connection lost');
        });
    },

    // Generic request method
    request: function(action, params = {}, options = {}) {
        return new Promise((resolve, reject) => {
            // Check if online
            if (!this.isOnline && !options.allowOffline) {
                reject(new Error(STB_CONFIG.errors.network.offline));
                return;
            }

            const requestData = {
                action: action,
                params: params,
                options: options,
                resolve: resolve,
                reject: reject,
                timestamp: Date.now()
            };

            // Add to queue if offline
            if (!this.isOnline) {
                this.requestQueue.push(requestData);
                return;
            }

            this.executeRequest(requestData);
        });
    },

    // Execute actual request
    executeRequest: function(requestData) {
        const { action, params, options, resolve, reject } = requestData;
        
        // Build request URL and parameters
        const endpoint = options.endpoint || STB_CONFIG.api.endpoints.handshake;
        const url = this.baseUrl + endpoint;
        
        const requestParams = {
            type: options.type || 'stb',
            action: action,
            ...params
        };

        // Add session data if available
        if (this.sessionData) {
            requestParams.token = this.sessionData.token;
            requestParams.mac = this.sessionData.mac;
        }

        const requestOptions = {
            method: options.method || 'GET',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': STB_CONFIG.app.userAgent,
                'X-User-Agent': 'Model: MAG254; Link: WiFi',
                ...options.headers
            },
            timeout: options.timeout || STB_CONFIG.server.timeout
        };

        // Handle GET vs POST
        if (requestOptions.method === 'GET') {
            const urlWithParams = Utils.url.build(url, requestParams);
            this.fetchWithTimeout(urlWithParams, requestOptions)
                .then(this.handleResponse)
                .then(resolve)
                .catch(reject);
        } else {
            requestOptions.body = new URLSearchParams(requestParams);
            this.fetchWithTimeout(url, requestOptions)
                .then(this.handleResponse)
                .then(resolve)
                .catch(reject);
        }

        Utils.log.debug('API Request:', action, params);
    },

    // Fetch with timeout
    fetchWithTimeout: function(url, options) {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error(STB_CONFIG.errors.network.timeout));
            }, options.timeout || STB_CONFIG.server.timeout);

            fetch(url, options)
                .then(response => {
                    clearTimeout(timeout);
                    resolve(response);
                })
                .catch(error => {
                    clearTimeout(timeout);
                    reject(error);
                });
        });
    },

    // Handle API response
    handleResponse: function(response) {
        return new Promise((resolve, reject) => {
            if (!response.ok) {
                reject(new Error(`HTTP ${response.status}: ${response.statusText}`));
                return;
            }

            response.json()
                .then(data => {
                    Utils.log.debug('API Response:', data);
                    
                    // Check for API-level errors
                    if (data.error) {
                        reject(new Error(data.error));
                        return;
                    }

                    resolve(data);
                })
                .catch(error => {
                    reject(new Error('Invalid JSON response'));
                });
        });
    },

    // Process queued requests when back online
    processQueue: function() {
        const queue = [...this.requestQueue];
        this.requestQueue = [];
        
        queue.forEach(requestData => {
            this.executeRequest(requestData);
        });
    },

    // Authentication methods
    auth: {
        // Perform handshake
        handshake: function(mac) {
            return STBAPI.request(STB_CONFIG.api.actions.handshake, {
                mac: mac,
                stb_type: 'MAG254',
                sn: Utils.string.random(16),
                device_id: Utils.string.random(32),
                device_id2: Utils.string.random(32),
                signature: Utils.string.random(64)
            });
        },

        // Authenticate user
        login: function(serverUrl, mac, token = '') {
            STBAPI.init(serverUrl);
            
            return this.handshake(mac)
                .then(response => {
                    if (response.token) {
                        STBAPI.sessionData = {
                            token: response.token,
                            mac: mac,
                            serverUrl: serverUrl,
                            loginTime: Date.now()
                        };
                        
                        // Store session data
                        Utils.storage.set(STB_CONFIG.storage.keys.auth, STBAPI.sessionData);
                        
                        return this.getProfile();
                    } else {
                        throw new Error('No token received from server');
                    }
                })
                .then(profile => {
                    STBAPI.sessionData.profile = profile;
                    Utils.storage.set(STB_CONFIG.storage.keys.auth, STBAPI.sessionData);
                    return STBAPI.sessionData;
                });
        },

        // Get user profile
        getProfile: function() {
            return STBAPI.request(STB_CONFIG.api.actions.getProfile);
        },

        // Check if session is valid
        isSessionValid: function() {
            if (!STBAPI.sessionData) return false;
            
            const sessionAge = Date.now() - STBAPI.sessionData.loginTime;
            return sessionAge < STB_CONFIG.auth.tokenExpiry;
        },

        // Refresh session if needed
        refreshSession: function() {
            if (!this.isSessionValid()) {
                return Promise.reject(new Error(STB_CONFIG.errors.auth.tokenExpired));
            }
            
            // Check if refresh is needed
            const sessionAge = Date.now() - STBAPI.sessionData.loginTime;
            if (sessionAge > STB_CONFIG.auth.refreshThreshold) {
                return this.getProfile();
            }
            
            return Promise.resolve(STBAPI.sessionData);
        },

        // Logout
        logout: function() {
            STBAPI.sessionData = null;
            Utils.storage.remove(STB_CONFIG.storage.keys.auth);
            STBAPI.baseUrl = '';
        }
    },

    // Channel methods
    channels: {
        // Get channel list
        getList: function(genre = '*', page = 1, sortBy = 'number') {
            return STBAPI.request(STB_CONFIG.api.actions.getChannels, {
                type: 'itv',
                genre: genre,
                p: page,
                sortby: sortBy,
                force_ch_link_check: 1
            });
        },

        // Get channel genres
        getGenres: function() {
            return STBAPI.request(STB_CONFIG.api.actions.getGenres, {
                type: 'itv'
            });
        },

        // Get channel link
        getLink: function(channelId, quality = 'auto') {
            return STBAPI.request(STB_CONFIG.api.actions.createLink, {
                type: 'itv',
                cmd: channelId,
                forced_storage: 'undefined',
                disable_ad: 0,
                download: 0,
                force_ch_link_check: 0,
                quality: quality
            });
        },

        // Get channel EPG
        getEpg: function(channelId, period = 7) {
            return STBAPI.request(STB_CONFIG.api.actions.getEpg, {
                ch_id: channelId,
                period: period
            });
        }
    },

    // VOD methods
    vod: {
        // Get VOD list
        getList: function(category = '', genre = '', page = 1, sortBy = 'added') {
            return STBAPI.request(STB_CONFIG.api.actions.getVod, {
                type: 'vod',
                category: category,
                genre: genre,
                p: page,
                sortby: sortBy,
                hd: 0,
                not_ended: 0,
                abc: ''
            });
        },

        // Get VOD categories
        getCategories: function() {
            return STBAPI.request(STB_CONFIG.api.actions.getGenres, {
                type: 'vod'
            });
        },

        // Get VOD link
        getLink: function(vodId, quality = 'auto') {
            return STBAPI.request(STB_CONFIG.api.actions.createLink, {
                type: 'vod',
                cmd: vodId,
                forced_storage: 'undefined',
                disable_ad: 0,
                download: 0,
                quality: quality
            });
        },

        // Search VOD
        search: function(query, page = 1) {
            return STBAPI.request(STB_CONFIG.api.actions.getVod, {
                type: 'vod',
                search: query,
                p: page,
                sortby: 'added'
            });
        }
    },

    // Series methods
    series: {
        // Get series list
        getList: function(category = '', page = 1, sortBy = 'added') {
            return STBAPI.request(STB_CONFIG.api.actions.getSeries, {
                type: 'series',
                category: category,
                p: page,
                sortby: sortBy
            });
        },

        // Get series info and episodes
        getInfo: function(seriesId) {
            return STBAPI.request(STB_CONFIG.api.actions.getSeriesInfo, {
                type: 'series',
                cmd: seriesId,
                movie_id: seriesId
            });
        },

        // Get series categories
        getCategories: function() {
            return STBAPI.request(STB_CONFIG.api.actions.getGenres, {
                type: 'series'
            });
        },

        // Get episode link
        getEpisodeLink: function(seriesId, seasonId, episodeId, quality = 'auto') {
            return STBAPI.request(STB_CONFIG.api.actions.createLink, {
                type: 'series',
                cmd: `${seriesId}_${seasonId}_${episodeId}`,
                quality: quality
            });
        },

        // Search series
        search: function(query, page = 1) {
            return STBAPI.request(STB_CONFIG.api.actions.getSeries, {
                type: 'series',
                search: query,
                p: page
            });
        }
    },

    // EPG methods
    epg: {
        // Get EPG for multiple channels
        getMultiChannel: function(channelIds, startTime, endTime) {
            return STBAPI.request(STB_CONFIG.api.actions.getEpg, {
                ch_id: channelIds.join(','),
                period: Math.ceil((endTime - startTime) / (24 * 60 * 60 * 1000))
            });
        },

        // Get current and next programs
        getCurrentNext: function(channelId) {
            return STBAPI.request(STB_CONFIG.api.actions.getEpg, {
                ch_id: channelId,
                period: 1
            });
        }
    },

    // Favorites methods
    favorites: {
        // Get favorites list
        getList: function(type = 'itv') {
            const favorites = Utils.storage.get(`favorites_${type}`, []);
            return Promise.resolve(favorites);
        },

        // Add to favorites
        add: function(type, item) {
            const favorites = Utils.storage.get(`favorites_${type}`, []);
            const exists = favorites.find(fav => fav.id === item.id);
            
            if (!exists) {
                favorites.push(item);
                Utils.storage.set(`favorites_${type}`, favorites);
            }
            
            return Promise.resolve(favorites);
        },

        // Remove from favorites
        remove: function(type, itemId) {
            const favorites = Utils.storage.get(`favorites_${type}`, []);
            const filtered = favorites.filter(fav => fav.id !== itemId);
            Utils.storage.set(`favorites_${type}`, filtered);
            return Promise.resolve(filtered);
        },

        // Check if item is favorite
        isFavorite: function(type, itemId) {
            const favorites = Utils.storage.get(`favorites_${type}`, []);
            return favorites.some(fav => fav.id === itemId);
        }
    },

    // Watch history methods
    watchHistory: {
        // Add to watch history
        add: function(type, item, position = 0) {
            const history = Utils.storage.get(STB_CONFIG.storage.keys.watchHistory, []);
            
            // Remove existing entry
            const filtered = history.filter(h => !(h.type === type && h.id === item.id));
            
            // Add new entry at beginning
            filtered.unshift({
                ...item,
                type: type,
                position: position,
                timestamp: Date.now()
            });
            
            // Keep only last N items
            const trimmed = filtered.slice(0, STB_CONFIG.storage.maxHistoryItems);
            Utils.storage.set(STB_CONFIG.storage.keys.watchHistory, trimmed);
            
            return Promise.resolve(trimmed);
        },

        // Get watch history
        getList: function(type = null, limit = 50) {
            const history = Utils.storage.get(STB_CONFIG.storage.keys.watchHistory, []);
            
            let filtered = history;
            if (type) {
                filtered = history.filter(item => item.type === type);
            }
            
            return Promise.resolve(filtered.slice(0, limit));
        },

        // Clear history
        clear: function(type = null) {
            if (type) {
                const history = Utils.storage.get(STB_CONFIG.storage.keys.watchHistory, []);
                const filtered = history.filter(item => item.type !== type);
                Utils.storage.set(STB_CONFIG.storage.keys.watchHistory, filtered);
                return Promise.resolve(filtered);
            } else {
                Utils.storage.remove(STB_CONFIG.storage.keys.watchHistory);
                return Promise.resolve([]);
            }
        }
    },

    // Utility methods  
    utils: {
        // Test server connection
        testConnection: function(serverUrl) {
            const testUrl = serverUrl.replace(/\/$/, '') + STB_CONFIG.api.endpoints.handshake;
            
            return fetch(testUrl + '?action=handshake&type=stb&mac=00:1A:79:00:00:00', {
                method: 'GET',
                timeout: 10000
            })
            .then(response => response.ok)
            .catch(() => false);
        },

        // Get server info
        getServerInfo: function() {
            return STBAPI.request('get_server_info');
        },

        // Send heartbeat
        sendHeartbeat: function() {
            if (STBAPI.sessionData) {
                return STBAPI.request('watchdog');
            }
            return Promise.resolve();
        }
    }
};

// Auto-restore session on page load
document.addEventListener('DOMContentLoaded', function() {
    const savedSession = Utils.storage.get(STB_CONFIG.storage.keys.auth);
    if (savedSession && STBAPI.auth.isSessionValid.call({ sessionData: savedSession })) {
        STBAPI.sessionData = savedSession;
        STBAPI.baseUrl = savedSession.serverUrl;
        Utils.log.info('Session restored from storage');
    }
});

// Periodic heartbeat
setInterval(() => {
    STBAPI.utils.sendHeartbeat();
}, 5 * 60 * 1000); // Every 5 minutes

// Make API globally available
window.API = STBAPI;
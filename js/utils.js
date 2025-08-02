// Utility Functions for STB Application

// Namespace for utilities
window.STBUtils = {
    
    // Storage utilities
    storage: {
        // Get item from localStorage with prefix
        get: function(key, defaultValue = null) {
            try {
                const prefixedKey = STB_CONFIG.storage.prefix + key;
                const value = localStorage.getItem(prefixedKey);
                return value ? JSON.parse(value) : defaultValue;
            } catch (error) {
                console.error('Storage get error:', error);
                return defaultValue;
            }
        },

        // Set item in localStorage with prefix
        set: function(key, value) {
            try {
                const prefixedKey = STB_CONFIG.storage.prefix + key;
                localStorage.setItem(prefixedKey, JSON.stringify(value));
                return true;
            } catch (error) {
                console.error('Storage set error:', error);
                return false;
            }
        },

        // Remove item from localStorage
        remove: function(key) {
            try {
                const prefixedKey = STB_CONFIG.storage.prefix + key;
                localStorage.removeItem(prefixedKey);
                return true;
            } catch (error) {
                console.error('Storage remove error:', error);
                return false;
            }
        },

        // Clear all app data
        clear: function() {
            try {
                const keys = Object.keys(localStorage);
                keys.forEach(key => {
                    if (key.startsWith(STB_CONFIG.storage.prefix)) {
                        localStorage.removeItem(key);
                    }
                });
                return true;
            } catch (error) {
                console.error('Storage clear error:', error);
                return false;
            }
        }
    },

    // Date and time utilities
    time: {
        // Format timestamp to readable time
        formatTime: function(timestamp, format = 'HH:mm') {
            const date = new Date(timestamp);
            const hours = date.getHours().toString().padStart(2, '0');
            const minutes = date.getMinutes().toString().padStart(2, '0');
            const seconds = date.getSeconds().toString().padStart(2, '0');
            
            if (format === '12h') {
                const ampm = date.getHours() >= 12 ? 'PM' : 'AM';
                const hours12 = (date.getHours() % 12 || 12).toString().padStart(2, '0');
                return `${hours12}:${minutes} ${ampm}`;
            }
            
            return format.replace('HH', hours).replace('mm', minutes).replace('ss', seconds);
        },

        // Format duration in seconds to readable format
        formatDuration: function(seconds) {
            if (!seconds || seconds < 0) return '00:00';
            
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            const secs = Math.floor(seconds % 60);
            
            if (hours > 0) {
                return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
            }
            return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        },

        // Get current timestamp
        now: function() {
            return Date.now();
        },

        // Check if time is within range
        isInRange: function(timestamp, startTime, endTime) {
            return timestamp >= startTime && timestamp <= endTime;
        },

        // Get today's date at midnight
        getTodayStart: function() {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            return today.getTime();
        },

        // Get tomorrow's date at midnight
        getTomorrowStart: function() {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(0, 0, 0, 0);
            return tomorrow.getTime();
        }
    },

    // String utilities
    string: {
        // Truncate string with ellipsis
        truncate: function(str, length, suffix = '...') {
            if (!str || str.length <= length) return str;
            return str.substring(0, length) + suffix;
        },

        // Escape HTML entities
        escapeHtml: function(str) {
            const div = document.createElement('div');
            div.textContent = str;
            return div.innerHTML;
        },

        // Remove HTML tags
        stripHtml: function(str) {
            const div = document.createElement('div');
            div.innerHTML = str;
            return div.textContent || div.innerText || '';
        },

        // Generate random string
        random: function(length = 8) {
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
            let result = '';
            for (let i = 0; i < length; i++) {
                result += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return result;
        },

        // Validate MAC address format
        isValidMac: function(mac) {
            const macRegex = /^([0-9A-F]{2}[:-]){5}([0-9A-F]{2})$/i;
            return macRegex.test(mac);
        },

        // Format MAC address
        formatMac: function(mac, separator = ':') {
            if (!mac) return '';
            return mac.replace(/[:-]/g, '').match(/.{2}/g).join(separator).toUpperCase();
        }
    },

    // URL utilities
    url: {
        // Build URL with parameters
        build: function(baseUrl, params = {}) {
            const url = new URL(baseUrl);
            Object.keys(params).forEach(key => {
                if (params[key] !== null && params[key] !== undefined) {
                    url.searchParams.set(key, params[key]);
                }
            });
            return url.toString();
        },

        // Extract parameters from URL
        getParams: function(url = window.location.href) {
            const urlObj = new URL(url);
            const params = {};
            urlObj.searchParams.forEach((value, key) => {
                params[key] = value;
            });
            return params;
        },

        // Validate URL format
        isValid: function(url) {
            try {
                new URL(url);
                return true;
            } catch {
                return false;
            }
        },

        // Get domain from URL
        getDomain: function(url) {
            try {
                return new URL(url).hostname;
            } catch {
                return null;
            }
        }
    },

    // Array utilities
    array: {
        // Chunk array into smaller arrays
        chunk: function(array, size) {
            const chunks = [];
            for (let i = 0; i < array.length; i += size) {
                chunks.push(array.slice(i, i + size));
            }
            return chunks;
        },

        // Remove duplicates from array
        unique: function(array, key = null) {
            if (key) {
                const seen = new Set();
                return array.filter(item => {
                    const val = item[key];
                    if (seen.has(val)) return false;
                    seen.add(val);
                    return true;
                });
            }
            return [...new Set(array)];
        },

        // Sort array by property
        sortBy: function(array, key, direction = 'asc') {
            return array.slice().sort((a, b) => {
                const aVal = key ? a[key] : a;
                const bVal = key ? b[key] : b;
                
                if (direction === 'desc') {
                    return bVal > aVal ? 1 : bVal < aVal ? -1 : 0;
                }
                return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
            });
        },

        // Group array by property
        groupBy: function(array, key) {
            return array.reduce((groups, item) => {
                const group = key ? item[key] : item;
                groups[group] = groups[group] || [];
                groups[group].push(item);
                return groups;
            }, {});
        }
    },

    // DOM utilities
    dom: {
        // Query selector with null check
        query: function(selector, parent = document) {
            return parent.querySelector(selector);
        },

        // Query all selectors
        queryAll: function(selector, parent = document) {
            return Array.from(parent.querySelectorAll(selector));
        },

        // Create element with attributes
        create: function(tag, attributes = {}, content = '') {
            const element = document.createElement(tag);
            
            Object.keys(attributes).forEach(attr => {
                if (attr === 'className') {
                    element.className = attributes[attr];
                } else if (attr === 'innerHTML') {
                    element.innerHTML = attributes[attr];
                } else {
                    element.setAttribute(attr, attributes[attr]);
                }
            });
            
            if (content) {
                element.textContent = content;
            }
            
            return element;
        },

        // Add class to element
        addClass: function(element, className) {
            if (element && className) {
                element.classList.add(className);
            }
        },

        // Remove class from element
        removeClass: function(element, className) {
            if (element && className) {
                element.classList.remove(className);
            }
        },

        // Toggle class on element
        toggleClass: function(element, className) {
            if (element && className) {
                element.classList.toggle(className);
            }
        },

        // Check if element has class
        hasClass: function(element, className) {
            return element && element.classList.contains(className);
        },

        // Show element
        show: function(element) {
            if (element) {
                element.classList.remove('hidden');
                element.style.display = '';
            }
        },

        // Hide element
        hide: function(element) {
            if (element) {
                element.classList.add('hidden');
            }
        },

        // Toggle element visibility
        toggle: function(element) {
            if (element) {
                element.classList.toggle('hidden');
            }
        }
    },

    // Event utilities
    events: {
        // Add event listener with options
        on: function(element, event, handler, options = {}) {
            if (element && event && handler) {
                element.addEventListener(event, handler, options);
            }
        },

        // Remove event listener
        off: function(element, event, handler) {
            if (element && event && handler) {
                element.removeEventListener(event, handler);
            }
        },

        // Trigger custom event
        trigger: function(element, eventName, detail = {}) {
            if (element && eventName) {
                const event = new CustomEvent(eventName, { detail });
                element.dispatchEvent(event);
            }
        },

        // Debounce function
        debounce: function(func, wait, immediate = false) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    timeout = null;
                    if (!immediate) func(...args);
                };
                const callNow = immediate && !timeout;
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
                if (callNow) func(...args);
            };
        },

        // Throttle function
        throttle: function(func, limit) {
            let inThrottle;
            return function(...args) {
                if (!inThrottle) {
                    func.apply(this, args);
                    inThrottle = true;
                    setTimeout(() => inThrottle = false, limit);
                }
            };
        }
    },

    // Loading utilities
    loading: {
        // Show loading overlay
        show: function(message = 'Loading...', container = document.body) {
            this.hide(); // Remove any existing loader
            
            const overlay = this.dom.create('div', {
                className: 'loading-overlay',
                innerHTML: `
                    <div class="loading-content">
                        <div class="loading-spinner"></div>
                        <p>${message}</p>
                    </div>
                `
            });
            
            container.appendChild(overlay);
            return overlay;
        },

        // Hide loading overlay
        hide: function(container = document.body) {
            const existing = container.querySelector('.loading-overlay');
            if (existing) {
                existing.remove();
            }
        }
    },

    // Error handling utilities
    error: {
        // Show error message
        show: function(message, type = 'error', duration = 5000) {
            const notification = this.dom.create('div', {
                className: `notification notification-${type}`,
                innerHTML: `
                    <span class="notification-message">${message}</span>
                    <button class="notification-close">×</button>
                `
            });
            
            document.body.appendChild(notification);
            
            // Auto-remove after duration
            if (duration > 0) {
                setTimeout(() => notification.remove(), duration);
            }
            
            // Manual close
            notification.querySelector('.notification-close').onclick = () => {
                notification.remove();
            };
            
            return notification;
        },

        // Handle API errors
        handle: function(error, context = 'general') {
            console.error('Error in', context, ':', error);
            
            let message = STB_CONFIG.errors.general.unknownError;
            
            if (error.status) {
                switch (error.status) {
                    case 401:
                        message = STB_CONFIG.errors.auth.unauthorized;
                        break;
                    case 403:
                        message = STB_CONFIG.errors.auth.forbidden;
                        break;
                    case 404:
                        message = STB_CONFIG.errors.network.serverError;
                        break;
                    case 500:
                        message = STB_CONFIG.errors.network.serverError;
                        break;
                    default:
                        message = error.message || message;
                }
            } else if (error.message) {
                message = error.message;
            }
            
            this.show(message, 'error');
            return message;
        }
    },

    // Device detection utilities
    device: {
        // Detect if running on STB
        isSTB: function() {
            const userAgent = navigator.userAgent.toLowerCase();
            return userAgent.includes('mag') || 
                   userAgent.includes('infomir') || 
                   userAgent.includes('dreambox') ||
                   userAgent.includes('enigma');
        },

        // Detect if Android TV
        isAndroidTV: function() {
            const userAgent = navigator.userAgent.toLowerCase();
            return userAgent.includes('android') && userAgent.includes('tv');
        },

        // Detect if mobile device
        isMobile: function() {
            return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        },

        // Get device info
        getInfo: function() {
            return {
                userAgent: navigator.userAgent,
                platform: navigator.platform,
                language: navigator.language,
                cookieEnabled: navigator.cookieEnabled,
                onLine: navigator.onLine,
                screen: {
                    width: screen.width,
                    height: screen.height,
                    colorDepth: screen.colorDepth
                }
            };
        }
    },

    // Performance utilities
    performance: {
        // Simple performance timer
        timer: function(name) {
            const start = performance.now();
            return {
                end: function() {
                    const duration = performance.now() - start;
                    console.log(`Timer ${name}: ${duration.toFixed(2)}ms`);
                    return duration;
                }
            };
        },

        // Lazy load images
        lazyLoadImages: function(container = document) {
            if ('IntersectionObserver' in window) {
                const imageObserver = new IntersectionObserver((entries, observer) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            const img = entry.target;
                            img.src = img.dataset.src;
                            img.classList.remove('lazy');
                            observer.unobserve(img);
                        }
                    });
                });

                container.querySelectorAll('img[data-src]').forEach(img => {
                    imageObserver.observe(img);
                });
            }
        },

        // Request animation frame polyfill
        requestAnimationFrame: function(callback) {
            return window.requestAnimationFrame || 
                   window.webkitRequestAnimationFrame || 
                   window.mozRequestAnimationFrame || 
                   function(callback) { setTimeout(callback, 1000 / 60); };
        }
    },

    // Logging utilities
    log: {
        // Log with level checking
        debug: function(...args) {
            if (STB_CONFIG.debug.enabled && STB_CONFIG.debug.logLevel === 'debug') {
                console.log('[DEBUG]', ...args);
            }
        },

        info: function(...args) {
            if (STB_CONFIG.debug.enabled && ['debug', 'info'].includes(STB_CONFIG.debug.logLevel)) {
                console.info('[INFO]', ...args);
            }
        },

        warn: function(...args) {
            if (STB_CONFIG.debug.enabled && ['debug', 'info', 'warn'].includes(STB_CONFIG.debug.logLevel)) {
                console.warn('[WARN]', ...args);
            }
        },

        error: function(...args) {
            if (STB_CONFIG.debug.enabled) {
                console.error('[ERROR]', ...args);
            }
        }
    }
};

// Extend utilities with config reference
Object.keys(STBUtils).forEach(category => {
    if (typeof STBUtils[category] === 'object') {
        STBUtils[category].dom = STBUtils.dom;
        STBUtils[category].events = STBUtils.events;
    }
});

// Make utilities globally available
window.Utils = STBUtils;
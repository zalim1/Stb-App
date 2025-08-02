// Channel Management Module for STB Application

window.STBChannels = {
    // Channel data
    allChannels: [],
    filteredChannels: [],
    currentChannels: [],
    genres: [],
    currentGenre: '',
    currentPage: 1,
    totalPages: 1,
    currentChannel: null,
    favorites: [],

    // UI state
    isLoading: false,
    searchQuery: '',
    sortBy: 'number',

    // DOM elements
    elements: {
        section: null,
        grid: null,
        categorySelect: null,
        searchInput: null,
        loadingPlaceholder: null
    },

    // Initialize channel management
    init: function() {
        this.bindElements();
        this.bindEvents();
        this.loadFavorites();
        Utils.log.info('Channel management initialized');
    },

    // Bind DOM elements
    bindElements: function() {
        this.elements.section = Utils.dom.query('#channels-section');
        this.elements.grid = Utils.dom.query('#channels-grid');
        this.elements.categorySelect = Utils.dom.query('#channel-category');
        this.elements.searchInput = Utils.dom.query('#channel-search');
        this.elements.loadingPlaceholder = this.elements.grid ? 
            this.elements.grid.querySelector('.loading-placeholder') : null;
    },

    // Bind event listeners
    bindEvents: function() {
        // Category filter
        if (this.elements.categorySelect) {
            this.elements.categorySelect.addEventListener('change', (e) => {
                this.filterByGenre(e.target.value);
            });
        }

        // Search input
        if (this.elements.searchInput) {
            this.elements.searchInput.addEventListener('input', 
                Utils.events.debounce((e) => {
                    this.searchChannels(e.target.value);
                }, 500)
            );
        }
    },

    // Load channel data
    load: function() {
        if (this.isLoading) return Promise.resolve();
        
        this.isLoading = true;
        this.showLoading();

        return Promise.all([
            this.loadGenres(),
            this.loadChannelList()
        ])
        .then(() => {
            this.isLoading = false;
            this.renderChannels();
        })
        .catch((error) => {
            this.isLoading = false;
            this.handleError(error);
        });
    },

    // Load channel genres
    loadGenres: function() {
        return API.channels.getGenres()
            .then((response) => {
                this.genres = response.data || [];
                this.populateGenreSelect();
                Utils.log.debug('Loaded genres:', this.genres.length);
            });
    },

    // Load channel list
    loadChannelList: function(genre = '*', page = 1) {
        return API.channels.getList(genre, page, this.sortBy)
            .then((response) => {
                if (page === 1) {
                    this.allChannels = response.data || [];
                } else {
                    this.allChannels = this.allChannels.concat(response.data || []);
                }
                
                this.totalPages = Math.ceil((response.total_items || 0) / STB_CONFIG.channels.pageSize);
                this.currentPage = page;
                
                // Process channel data
                this.processChannelData();
                
                Utils.log.debug('Loaded channels:', this.allChannels.length);
                return this.allChannels;
            });
    },

    // Process channel data
    processChannelData: function() {
        this.allChannels.forEach((channel, index) => {
            // Ensure required properties
            channel.id = channel.id || channel.cmd;
            channel.number = channel.number || (index + 1);
            channel.name = channel.name || 'Unknown Channel';
            channel.logo = channel.logo || this.getDefaultLogo();
            channel.genre = channel.genre_title || 'General';
            
            // Add favorite status
            channel.isFavorite = this.isFavorite(channel.id);
        });
        
        this.filteredChannels = [...this.allChannels];
        this.applyCurrentFilters();
    },

    // Apply current filters
    applyCurrentFilters: function() {
        let channels = [...this.allChannels];
        
        // Filter by genre
        if (this.currentGenre && this.currentGenre !== '') {
            channels = channels.filter(channel => 
                channel.genre_id == this.currentGenre || 
                channel.genre_title === this.currentGenre
            );
        }
        
        // Filter by search query
        if (this.searchQuery) {
            const query = this.searchQuery.toLowerCase();
            channels = channels.filter(channel =>
                channel.name.toLowerCase().includes(query) ||
                channel.number.toString().includes(query)
            );
        }
        
        this.filteredChannels = channels;
        this.currentChannels = this.filteredChannels;
    },

    // Populate genre select
    populateGenreSelect: function() {
        if (!this.elements.categorySelect) return;
        
        // Clear existing options
        this.elements.categorySelect.innerHTML = '<option value="">All Categories</option>';
        
        // Add genre options
        this.genres.forEach(genre => {
            const option = Utils.dom.create('option', {
                value: genre.id,
                innerHTML: genre.title
            });
            this.elements.categorySelect.appendChild(option);
        });
        
        // Add favorites option
        const favoritesOption = Utils.dom.create('option', {
            value: 'favorites',
            innerHTML: 'Favorites'
        });
        this.elements.categorySelect.appendChild(favoritesOption);
    },

    // Filter channels by genre
    filterByGenre: function(genreId) {
        this.currentGenre = genreId;
        
        if (genreId === 'favorites') {
            this.showFavorites();
        } else {
            this.applyCurrentFilters();
            this.renderChannels();
        }
    },

    // Search channels
    searchChannels: function(query) {
        this.searchQuery = query;
        this.applyCurrentFilters();
        this.renderChannels();
    },

    // Show favorites
    showFavorites: function() {
        this.currentChannels = this.allChannels.filter(channel => 
            this.isFavorite(channel.id)
        );
        this.renderChannels();
    },

    // Render channels grid
    renderChannels: function() {
        if (!this.elements.grid) return;
        
        this.hideLoading();
        
        if (this.currentChannels.length === 0) {
            this.showEmptyState();
            return;
        }
        
        // Clear grid
        this.elements.grid.innerHTML = '';
        
        // Create channel items
        this.currentChannels.forEach((channel, index) => {
            const channelItem = this.createChannelItem(channel, index);
            this.elements.grid.appendChild(channelItem);
        });
        
        // Setup lazy loading for images
        if (STB_CONFIG.performance.lazyLoading) {
            Utils.performance.lazyLoadImages(this.elements.grid);
        }
    },

    // Create channel item element
    createChannelItem: function(channel, index) {
        const item = Utils.dom.create('div', {
            className: 'content-item channel-item',
            'data-channel-id': channel.id,
            'data-channel-number': channel.number
        });
        
        // Thumbnail
        const thumbnail = Utils.dom.create('div', {
            className: 'item-thumbnail'
        });
        
        const logo = Utils.dom.create('img', {
            [STB_CONFIG.performance.lazyLoading ? 'data-src' : 'src']: channel.logo,
            alt: channel.name,
            onerror: `this.src='${this.getDefaultLogo()}'`
        });
        
        if (STB_CONFIG.performance.lazyLoading) {
            logo.className = 'lazy';
        }
        
        thumbnail.appendChild(logo);
        
        // Status indicator
        const statusIndicator = Utils.dom.create('div', {
            className: `status-indicator ${channel.status || 'online'}`
        });
        thumbnail.appendChild(statusIndicator);
        
        // Channel number overlay
        const numberOverlay = Utils.dom.create('div', {
            className: 'channel-number',
            innerHTML: channel.number,
            style: 'position: absolute; top: 10px; left: 10px; background: rgba(0,0,0,0.7); color: white; padding: 2px 6px; border-radius: 3px; font-size: 0.8rem;'
        });
        thumbnail.appendChild(numberOverlay);
        
        // Info section
        const info = Utils.dom.create('div', {
            className: 'item-info'
        });
        
        const title = Utils.dom.create('div', {
            className: 'item-title',
            innerHTML: Utils.string.escapeHtml(channel.name)
        });
        
        const description = Utils.dom.create('div', {
            className: 'item-description',
            innerHTML: this.getCurrentProgram(channel)
        });
        
        const meta = Utils.dom.create('div', {
            className: 'item-meta'
        });
        
        const genre = Utils.dom.create('span', {
            className: 'item-genre',
            innerHTML: channel.genre
        });
        
        const actions = Utils.dom.create('div', {
            className: 'item-actions'
        });
        
        // Favorite button
        const favoriteBtn = Utils.dom.create('button', {
            className: `favorite-btn ${channel.isFavorite ? 'active' : ''}`,
            innerHTML: channel.isFavorite ? '★' : '☆',
            title: channel.isFavorite ? 'Remove from favorites' : 'Add to favorites'
        });
        
        favoriteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleFavorite(channel);
        });
        
        actions.appendChild(favoriteBtn);
        
        meta.appendChild(genre);
        meta.appendChild(actions);
        
        info.appendChild(title);
        info.appendChild(description);
        info.appendChild(meta);
        
        item.appendChild(thumbnail);
        item.appendChild(info);
        
        // Click handler
        item.addEventListener('click', () => {
            this.playChannel(channel);
        });
        
        return item;
    },

    // Get current program for channel
    getCurrentProgram: function(channel) {
        // This would typically come from EPG data
        // For now, return a placeholder
        const now = new Date();
        const time = Utils.time.formatTime(now.getTime());
        return `Current program at ${time}`;
    },

    // Get default logo
    getDefaultLogo: function() {
        return 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect width="100" height="100" fill="%23333"%3E%3C/rect%3E%3Ctext x="50" y="50" text-anchor="middle" dy=".35em" fill="white" font-size="12"%3ETV%3C/text%3E%3C/svg%3E';
    },

    // Play channel
    playChannel: function(channel) {
        Utils.log.info('Playing channel:', channel.name);
        
        this.currentChannel = channel;
        
        // Show loading
        this.showChannelLoading(channel);
        
        // Get stream link
        API.channels.getLink(channel.id)
            .then((response) => {
                if (response.cmd && response.cmd.indexOf('http') === 0) {
                    // Play stream
                    if (window.STBPlayer) {
                        STBPlayer.play(response.cmd, channel.name, this.getCurrentProgram(channel));
                    }
                    
                    // Add to watch history
                    API.watchHistory.add('channel', channel);
                    
                    // Save as last channel
                    Utils.storage.set(STB_CONFIG.storage.keys.lastChannel, channel);
                    
                } else {
                    throw new Error('Invalid stream URL received');
                }
            })
            .catch((error) => {
                this.handleError(error);
            })
            .finally(() => {
                this.hideChannelLoading();
            });
    },

    // Switch to channel by number
    switchToChannel: function(channelNumber) {
        const channel = this.allChannels.find(ch => ch.number == channelNumber);
        if (channel) {
            this.playChannel(channel);
        } else {
            Utils.error.show(`Channel ${channelNumber} not found`);
        }
    },

    // Next channel
    nextChannel: function() {
        if (!this.currentChannel) return;
        
        const currentIndex = this.allChannels.findIndex(ch => ch.id === this.currentChannel.id);
        const nextIndex = (currentIndex + 1) % this.allChannels.length;
        const nextChannel = this.allChannels[nextIndex];
        
        this.playChannel(nextChannel);
    },

    // Previous channel
    previousChannel: function() {
        if (!this.currentChannel) return;
        
        const currentIndex = this.allChannels.findIndex(ch => ch.id === this.currentChannel.id);
        const prevIndex = (currentIndex - 1 + this.allChannels.length) % this.allChannels.length;
        const prevChannel = this.allChannels[prevIndex];
        
        this.playChannel(prevChannel);
    },

    // Toggle favorite
    toggleFavorite: function(channel) {
        if (this.isFavorite(channel.id)) {
            this.removeFavorite(channel);
        } else {
            this.addFavorite(channel);
        }
    },

    // Add to favorites
    addFavorite: function(channel) {
        if (!this.isFavorite(channel.id)) {
            this.favorites.push({
                id: channel.id,
                name: channel.name,
                number: channel.number,
                logo: channel.logo
            });
            
            this.saveFavorites();
            this.updateChannelFavoriteStatus(channel.id, true);
            
            Utils.log.info('Added to favorites:', channel.name);
        }
    },

    // Remove from favorites
    removeFavorite: function(channel) {
        this.favorites = this.favorites.filter(fav => fav.id !== channel.id);
        this.saveFavorites();
        this.updateChannelFavoriteStatus(channel.id, false);
        
        Utils.log.info('Removed from favorites:', channel.name);
    },

    // Check if channel is favorite
    isFavorite: function(channelId) {
        return this.favorites.some(fav => fav.id === channelId);
    },

    // Update channel favorite status in UI
    updateChannelFavoriteStatus: function(channelId, isFavorite) {
        const channelItem = Utils.dom.query(`[data-channel-id="${channelId}"]`);
        if (channelItem) {
            const favoriteBtn = channelItem.querySelector('.favorite-btn');
            if (favoriteBtn) {
                favoriteBtn.innerHTML = isFavorite ? '★' : '☆';
                favoriteBtn.title = isFavorite ? 'Remove from favorites' : 'Add to favorites';
                if (isFavorite) {
                    Utils.dom.addClass(favoriteBtn, 'active');
                } else {
                    Utils.dom.removeClass(favoriteBtn, 'active');
                }
            }
        }
        
        // Update channel object
        const channel = this.allChannels.find(ch => ch.id === channelId);
        if (channel) {
            channel.isFavorite = isFavorite;
        }
    },

    // Load favorites from storage
    loadFavorites: function() {
        this.favorites = Utils.storage.get('favorites_channels', []);
    },

    // Save favorites to storage
    saveFavorites: function() {
        Utils.storage.set('favorites_channels', this.favorites);
    },

    // Show loading state
    showLoading: function() {
        if (this.elements.loadingPlaceholder) {
            Utils.dom.show(this.elements.loadingPlaceholder);
        }
    },

    // Hide loading state
    hideLoading: function() {
        if (this.elements.loadingPlaceholder) {
            Utils.dom.hide(this.elements.loadingPlaceholder);
        }
    },

    // Show channel loading
    showChannelLoading: function(channel) {
        // You could show a loading overlay specific to channel switching
        Utils.log.debug('Loading channel:', channel.name);
    },

    // Hide channel loading
    hideChannelLoading: function() {
        // Hide channel loading overlay
    },

    // Show empty state
    showEmptyState: function() {
        if (!this.elements.grid) return;
        
        this.elements.grid.innerHTML = `
            <div class="empty-state">
                <h3>No channels found</h3>
                <p>Try adjusting your search or filter criteria.</p>
            </div>
        `;
    },

    // Handle errors
    handleError: function(error) {
        Utils.log.error('Channel management error:', error);
        Utils.error.handle(error, 'channels');
        
        if (this.elements.grid) {
            this.elements.grid.innerHTML = `
                <div class="error-state">
                    <h3>Error loading channels</h3>
                    <p>${error.message || 'Please try again later.'}</p>
                    <button onclick="STBChannels.load()" class="retry-button">Retry</button>
                </div>
            `;
        }
    },

    // Get channel by ID
    getChannelById: function(channelId) {
        return this.allChannels.find(channel => channel.id === channelId);
    },

    // Get channel by number
    getChannelByNumber: function(channelNumber) {
        return this.allChannels.find(channel => channel.number == channelNumber);
    },

    // Get current channel
    getCurrentChannel: function() {
        return this.currentChannel;
    },

    // Get favorites list
    getFavorites: function() {
        return this.favorites;
    },

    // Refresh channel list
    refresh: function() {
        this.allChannels = [];
        this.filteredChannels = [];
        this.currentChannels = [];
        this.currentPage = 1;
        return this.load();
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    STBChannels.init();
});

// Make channels module globally available
window.Channels = STBChannels;
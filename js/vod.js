// Video on Demand (VOD) Module for STB Application

window.STBVOD = {
    // VOD data
    allMovies: [],
    filteredMovies: [],
    currentMovies: [],
    categories: [],
    genres: [],
    currentCategory: '',
    currentGenre: '',
    currentPage: 1,
    totalPages: 1,
    favorites: [],

    // UI state
    isLoading: false,
    searchQuery: '',
    sortBy: 'added',

    // DOM elements
    elements: {
        section: null,
        grid: null,
        categorySelect: null,
        genreSelect: null,
        searchInput: null,
        loadingPlaceholder: null
    },

    // Initialize VOD module
    init: function() {
        this.bindElements();
        this.bindEvents();
        this.loadFavorites();
        Utils.log.info('VOD module initialized');
    },

    // Bind DOM elements
    bindElements: function() {
        this.elements.section = Utils.dom.query('#vod-section');
        this.elements.grid = Utils.dom.query('#vod-grid');
        this.elements.categorySelect = Utils.dom.query('#vod-category');
        this.elements.genreSelect = Utils.dom.query('#vod-genre');
        this.elements.searchInput = Utils.dom.query('#vod-search');
        this.elements.loadingPlaceholder = this.elements.grid ? 
            this.elements.grid.querySelector('.loading-placeholder') : null;
    },

    // Bind event listeners
    bindEvents: function() {
        // Category filter
        if (this.elements.categorySelect) {
            this.elements.categorySelect.addEventListener('change', (e) => {
                this.filterByCategory(e.target.value);
            });
        }

        // Genre filter
        if (this.elements.genreSelect) {
            this.elements.genreSelect.addEventListener('change', (e) => {
                this.filterByGenre(e.target.value);
            });
        }

        // Search input
        if (this.elements.searchInput) {
            this.elements.searchInput.addEventListener('input', 
                Utils.events.debounce((e) => {
                    this.searchMovies(e.target.value);
                }, 500)
            );
        }
    },

    // Load VOD data
    load: function() {
        if (this.isLoading) return Promise.resolve();
        
        this.isLoading = true;
        this.showLoading();

        return Promise.all([
            this.loadCategories(),
            this.loadMovieList()
        ])
        .then(() => {
            this.isLoading = false;
            this.renderMovies();
        })
        .catch((error) => {
            this.isLoading = false;
            this.handleError(error);
        });
    },

    // Load VOD categories
    loadCategories: function() {
        return API.vod.getCategories()
            .then((response) => {
                this.categories = response.data || [];
                this.populateCategorySelect();
                Utils.log.debug('Loaded VOD categories:', this.categories.length);
            });
    },

    // Load movie list
    loadMovieList: function(category = '', genre = '', page = 1) {
        return API.vod.getList(category, genre, page, this.sortBy)
            .then((response) => {
                if (page === 1) {
                    this.allMovies = response.data || [];
                } else {
                    this.allMovies = this.allMovies.concat(response.data || []);
                }
                
                this.totalPages = Math.ceil((response.total_items || 0) / STB_CONFIG.vod.pageSize);
                this.currentPage = page;
                
                // Process movie data
                this.processMovieData();
                
                Utils.log.debug('Loaded movies:', this.allMovies.length);
                return this.allMovies;
            });
    },

    // Process movie data
    processMovieData: function() {
        this.allMovies.forEach((movie, index) => {
            // Ensure required properties
            movie.id = movie.id || movie.cmd;
            movie.name = movie.name || 'Unknown Movie';
            movie.description = movie.description || '';
            movie.poster = movie.screenshot_uri || movie.poster || this.getDefaultPoster();
            movie.year = movie.year || '';
            movie.genre = movie.genre_str || movie.category_caption || 'Unknown';
            movie.rating = movie.rating_imdb || movie.rating || '';
            movie.duration = movie.duration || '';
            movie.quality = movie.hd ? 'HD' : 'SD';
            
            // Add favorite status
            movie.isFavorite = this.isFavorite(movie.id);
        });
        
        this.filteredMovies = [...this.allMovies];
        this.applyCurrentFilters();
    },

    // Apply current filters
    applyCurrentFilters: function() {
        let movies = [...this.allMovies];
        
        // Filter by category
        if (this.currentCategory && this.currentCategory !== '') {
            movies = movies.filter(movie => 
                movie.category_id == this.currentCategory
            );
        }
        
        // Filter by genre
        if (this.currentGenre && this.currentGenre !== '') {
            movies = movies.filter(movie =>
                movie.genre.toLowerCase().includes(this.currentGenre.toLowerCase())
            );
        }
        
        // Filter by search query
        if (this.searchQuery) {
            const query = this.searchQuery.toLowerCase();
            movies = movies.filter(movie =>
                movie.name.toLowerCase().includes(query) ||
                movie.description.toLowerCase().includes(query) ||
                movie.genre.toLowerCase().includes(query) ||
                movie.year.toString().includes(query)
            );
        }
        
        this.filteredMovies = movies;
        this.currentMovies = this.filteredMovies;
    },

    // Populate category select
    populateCategorySelect: function() {
        if (!this.elements.categorySelect) return;
        
        // Clear existing options
        this.elements.categorySelect.innerHTML = '<option value="">All Categories</option>';
        
        // Add category options
        this.categories.forEach(category => {
            const option = Utils.dom.create('option', {
                value: category.id,
                innerHTML: Utils.string.escapeHtml(category.title)
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

    // Populate genre select
    populateGenreSelect: function() {
        if (!this.elements.genreSelect) return;
        
        // Extract unique genres from movies
        const genres = [...new Set(this.allMovies.map(movie => movie.genre).filter(Boolean))];
        
        // Clear existing options
        this.elements.genreSelect.innerHTML = '<option value="">All Genres</option>';
        
        // Add genre options
        genres.forEach(genre => {
            const option = Utils.dom.create('option', {
                value: genre,
                innerHTML: Utils.string.escapeHtml(genre)
            });
            this.elements.genreSelect.appendChild(option);
        });
    },

    // Filter movies by category
    filterByCategory: function(categoryId) {
        this.currentCategory = categoryId;
        
        if (categoryId === 'favorites') {
            this.showFavorites();
        } else {
            this.applyCurrentFilters();
            this.renderMovies();
        }
    },

    // Filter movies by genre
    filterByGenre: function(genre) {
        this.currentGenre = genre;
        this.applyCurrentFilters();
        this.renderMovies();
    },

    // Search movies
    searchMovies: function(query) {
        this.searchQuery = query;
        
        if (query.length >= 3) {
            // Also search via API for better results
            this.searchViaAPI(query);
        } else {
            this.applyCurrentFilters();
            this.renderMovies();
        }
    },

    // Search via API
    searchViaAPI: function(query) {
        API.vod.search(query)
            .then((response) => {
                const searchResults = response.data || [];
                this.processMovieData();
                this.currentMovies = searchResults;
                this.renderMovies();
            })
            .catch((error) => {
                Utils.log.error('VOD search error:', error);
                // Fallback to local search
                this.applyCurrentFilters();
                this.renderMovies();
            });
    },

    // Show favorites
    showFavorites: function() {
        this.currentMovies = this.allMovies.filter(movie => 
            this.isFavorite(movie.id)
        );
        this.renderMovies();
    },

    // Render movies grid
    renderMovies: function() {
        if (!this.elements.grid) return;
        
        this.hideLoading();
        
        if (this.currentMovies.length === 0) {
            this.showEmptyState();
            return;
        }
        
        // Clear grid
        this.elements.grid.innerHTML = '';
        
        // Create movie items
        this.currentMovies.forEach((movie, index) => {
            const movieItem = this.createMovieItem(movie, index);
            this.elements.grid.appendChild(movieItem);
        });
        
        // Populate genre select after rendering
        this.populateGenreSelect();
        
        // Setup lazy loading for images
        if (STB_CONFIG.performance.lazyLoading) {
            Utils.performance.lazyLoadImages(this.elements.grid);
        }
    },

    // Create movie item element
    createMovieItem: function(movie, index) {
        const item = Utils.dom.create('div', {
            className: 'content-item movie-item',
            'data-movie-id': movie.id
        });
        
        // Poster
        const poster = Utils.dom.create('div', {
            className: 'item-thumbnail'
        });
        
        const img = Utils.dom.create('img', {
            [STB_CONFIG.performance.lazyLoading ? 'data-src' : 'src']: movie.poster,
            alt: movie.name,
            onerror: `this.src='${this.getDefaultPoster()}'`
        });
        
        if (STB_CONFIG.performance.lazyLoading) {
            img.className = 'lazy';
        }
        
        poster.appendChild(img);
        
        // Quality badge
        if (movie.quality) {
            const qualityBadge = Utils.dom.create('div', {
                className: `quality-badge ${movie.quality.toLowerCase()}`,
                innerHTML: movie.quality,
                style: 'position: absolute; top: 10px; right: 10px; background: rgba(0,0,0,0.7); color: white; padding: 2px 6px; border-radius: 3px; font-size: 0.7rem;'
            });
            poster.appendChild(qualityBadge);
        }
        
        // Rating badge
        if (movie.rating) {
            const ratingBadge = Utils.dom.create('div', {
                className: 'rating-badge',
                innerHTML: '★ ' + movie.rating,
                style: 'position: absolute; bottom: 10px; left: 10px; background: rgba(255,193,7,0.9); color: black; padding: 2px 6px; border-radius: 3px; font-size: 0.7rem; font-weight: bold;'
            });
            poster.appendChild(ratingBadge);
        }
        
        // Info section
        const info = Utils.dom.create('div', {
            className: 'item-info'
        });
        
        const title = Utils.dom.create('div', {
            className: 'item-title',
            innerHTML: Utils.string.escapeHtml(movie.name)
        });
        
        const description = Utils.dom.create('div', {
            className: 'item-description',
            innerHTML: Utils.string.truncate(Utils.string.escapeHtml(movie.description), 100)
        });
        
        const meta = Utils.dom.create('div', {
            className: 'item-meta'
        });
        
        const genre = Utils.dom.create('span', {
            className: 'item-genre',
            innerHTML: movie.genre
        });
        
        const year = Utils.dom.create('span', {
            className: 'item-year',
            innerHTML: movie.year
        });
        
        const duration = Utils.dom.create('span', {
            className: 'item-duration',
            innerHTML: this.formatDuration(movie.duration)
        });
        
        const actions = Utils.dom.create('div', {
            className: 'item-actions'
        });
        
        // Favorite button
        const favoriteBtn = Utils.dom.create('button', {
            className: `favorite-btn ${movie.isFavorite ? 'active' : ''}`,
            innerHTML: movie.isFavorite ? '★' : '☆',
            title: movie.isFavorite ? 'Remove from favorites' : 'Add to favorites'
        });
        
        favoriteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleFavorite(movie);
        });
        
        actions.appendChild(favoriteBtn);
        
        meta.appendChild(genre);
        if (movie.year) meta.appendChild(year);
        if (movie.duration) meta.appendChild(duration);
        meta.appendChild(actions);
        
        info.appendChild(title);
        info.appendChild(description);
        info.appendChild(meta);
        
        item.appendChild(poster);
        item.appendChild(info);
        
        // Click handler
        item.addEventListener('click', () => {
            this.playMovie(movie);
        });
        
        return item;
    },

    // Format duration
    formatDuration: function(duration) {
        if (!duration) return '';
        
        // If duration is in seconds
        if (typeof duration === 'number') {
            return Utils.time.formatDuration(duration);
        }
        
        // If duration is already formatted
        if (typeof duration === 'string') {
            return duration;
        }
        
        return '';
    },

    // Get default poster
    getDefaultPoster: function() {
        return 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 400"%3E%3Crect width="300" height="400" fill="%23333"%3E%3C/rect%3E%3Ctext x="150" y="200" text-anchor="middle" dy=".35em" fill="white" font-size="24"%3EMovie%3C/text%3E%3C/svg%3E';
    },

    // Play movie
    playMovie: function(movie) {
        Utils.log.info('Playing movie:', movie.name);
        
        // Show loading
        this.showMovieLoading(movie);
        
        // Get stream link
        API.vod.getLink(movie.id)
            .then((response) => {
                if (response.cmd && response.cmd.indexOf('http') === 0) {
                    // Play stream
                    if (window.STBPlayer) {
                        const description = `${movie.year} • ${movie.genre} • ${this.formatDuration(movie.duration)}`;
                        STBPlayer.play(response.cmd, movie.name, description);
                    }
                    
                    // Add to watch history
                    API.watchHistory.add('vod', movie);
                    
                } else {
                    throw new Error('Invalid stream URL received');
                }
            })
            .catch((error) => {
                this.handleError(error);
            })
            .finally(() => {
                this.hideMovieLoading();
            });
    },

    // Toggle favorite
    toggleFavorite: function(movie) {
        if (this.isFavorite(movie.id)) {
            this.removeFavorite(movie);
        } else {
            this.addFavorite(movie);
        }
    },

    // Add to favorites
    addFavorite: function(movie) {
        if (!this.isFavorite(movie.id)) {
            this.favorites.push({
                id: movie.id,
                name: movie.name,
                poster: movie.poster,
                year: movie.year,
                genre: movie.genre,
                rating: movie.rating
            });
            
            this.saveFavorites();
            this.updateMovieFavoriteStatus(movie.id, true);
            
            Utils.log.info('Added to favorites:', movie.name);
        }
    },

    // Remove from favorites
    removeFavorite: function(movie) {
        this.favorites = this.favorites.filter(fav => fav.id !== movie.id);
        this.saveFavorites();
        this.updateMovieFavoriteStatus(movie.id, false);
        
        Utils.log.info('Removed from favorites:', movie.name);
    },

    // Check if movie is favorite
    isFavorite: function(movieId) {
        return this.favorites.some(fav => fav.id === movieId);
    },

    // Update movie favorite status in UI
    updateMovieFavoriteStatus: function(movieId, isFavorite) {
        const movieItem = Utils.dom.query(`[data-movie-id="${movieId}"]`);
        if (movieItem) {
            const favoriteBtn = movieItem.querySelector('.favorite-btn');
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
        
        // Update movie object
        const movie = this.allMovies.find(m => m.id === movieId);
        if (movie) {
            movie.isFavorite = isFavorite;
        }
    },

    // Load favorites from storage
    loadFavorites: function() {
        this.favorites = Utils.storage.get('favorites_vod', []);
    },

    // Save favorites to storage
    saveFavorites: function() {
        Utils.storage.set('favorites_vod', this.favorites);
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

    // Show movie loading
    showMovieLoading: function(movie) {
        Utils.log.debug('Loading movie:', movie.name);
    },

    // Hide movie loading
    hideMovieLoading: function() {
        // Hide movie loading overlay
    },

    // Show empty state
    showEmptyState: function() {
        if (!this.elements.grid) return;
        
        this.elements.grid.innerHTML = `
            <div class="empty-state">
                <h3>No movies found</h3>
                <p>Try adjusting your search or filter criteria.</p>
            </div>
        `;
    },

    // Handle errors
    handleError: function(error) {
        Utils.log.error('VOD error:', error);
        Utils.error.handle(error, 'vod');
        
        if (this.elements.grid) {
            this.elements.grid.innerHTML = `
                <div class="error-state">
                    <h3>Error loading movies</h3>
                    <p>${error.message || 'Please try again later.'}</p>
                    <button onclick="STBVOD.load()" class="retry-button">Retry</button>
                </div>
            `;
        }
    },

    // Get movie by ID
    getMovieById: function(movieId) {
        return this.allMovies.find(movie => movie.id === movieId);
    },

    // Get favorites list
    getFavorites: function() {
        return this.favorites;
    },

    // Refresh movie list
    refresh: function() {
        this.allMovies = [];
        this.filteredMovies = [];
        this.currentMovies = [];
        this.currentPage = 1;
        return this.load();
    },

    // Load more movies (pagination)
    loadMore: function() {
        if (this.currentPage < this.totalPages && !this.isLoading) {
            return this.loadMovieList(this.currentCategory, this.currentGenre, this.currentPage + 1)
                .then(() => {
                    this.renderMovies();
                });
        }
        return Promise.resolve();
    },

    // Get trending movies
    getTrending: function() {
        return this.loadMovieList('', '', 1, 'rating')
            .then(() => {
                this.currentMovies = this.allMovies.slice(0, 20);
                this.renderMovies();
            });
    },

    // Get new releases
    getNewReleases: function() {
        return this.loadMovieList('', '', 1, 'added')
            .then(() => {
                this.currentMovies = this.allMovies.slice(0, 20);
                this.renderMovies();
            });
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    STBVOD.init();
});

// Make VOD module globally available
window.VOD = STBVOD;
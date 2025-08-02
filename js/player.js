// Media Player Module for STB Application

window.STBPlayer = {
    // Player state
    isPlaying: false,
    currentSource: null,
    currentTime: 0,
    duration: 0,
    volume: 80,
    isMuted: false,
    isFullscreen: false,
    hlsInstance: null,
    dashPlayer: null,
    controlsTimeout: null,

    // DOM elements
    elements: {
        modal: null,
        video: null,
        overlay: null,
        controls: null,
        playPauseBtn: null,
        progressBar: null,
        progressFill: null,
        currentTimeDisplay: null,
        durationDisplay: null,
        fullscreenBtn: null,
        closeBtn: null,
        titleDisplay: null,
        descriptionDisplay: null
    },

    // Initialize player
    init: function() {
        this.bindElements();
        this.bindEvents();
        this.setupPlayer();
        Utils.log.info('Media player initialized');
    },

    // Bind DOM elements
    bindElements: function() {
        this.elements.modal = Utils.dom.query('#player-modal');
        this.elements.video = Utils.dom.query('#video-player');
        this.elements.overlay = Utils.dom.query('.player-overlay');
        this.elements.controls = Utils.dom.query('.player-controls');
        this.elements.playPauseBtn = Utils.dom.query('#player-play-pause');
        this.elements.progressBar = Utils.dom.query('.progress-bar');
        this.elements.progressFill = Utils.dom.query('.progress-fill');
        this.elements.currentTimeDisplay = Utils.dom.query('#current-time-display');
        this.elements.durationDisplay = Utils.dom.query('#duration-display');
        this.elements.fullscreenBtn = Utils.dom.query('#player-fullscreen');
        this.elements.closeBtn = Utils.dom.query('#player-close');
        this.elements.titleDisplay = Utils.dom.query('#player-title');
        this.elements.descriptionDisplay = Utils.dom.query('#player-description');
    },

    // Bind event listeners
    bindEvents: function() {
        if (!this.elements.video) return;

        // Video events
        this.elements.video.addEventListener('loadstart', () => this.onLoadStart());
        this.elements.video.addEventListener('loadedmetadata', () => this.onLoadedMetadata());
        this.elements.video.addEventListener('canplay', () => this.onCanPlay());
        this.elements.video.addEventListener('play', () => this.onPlay());
        this.elements.video.addEventListener('pause', () => this.onPause());
        this.elements.video.addEventListener('timeupdate', () => this.onTimeUpdate());
        this.elements.video.addEventListener('ended', () => this.onEnded());
        this.elements.video.addEventListener('error', (e) => this.onError(e));
        this.elements.video.addEventListener('volumechange', () => this.onVolumeChange());

        // Control events
        if (this.elements.playPauseBtn) {
            this.elements.playPauseBtn.addEventListener('click', () => this.togglePlayPause());
        }

        if (this.elements.fullscreenBtn) {
            this.elements.fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());
        }

        if (this.elements.closeBtn) {
            this.elements.closeBtn.addEventListener('click', () => this.close());
        }

        if (this.elements.progressBar) {
            this.elements.progressBar.addEventListener('click', (e) => this.seekToPosition(e));
        }

        // Mouse/touch events for controls
        if (this.elements.modal) {
            this.elements.modal.addEventListener('mousemove', () => this.showControls());
            this.elements.modal.addEventListener('click', () => this.showControls());
        }

        // Fullscreen events
        document.addEventListener('fullscreenchange', () => this.onFullscreenChange());
        document.addEventListener('webkitfullscreenchange', () => this.onFullscreenChange());
        document.addEventListener('mozfullscreenchange', () => this.onFullscreenChange());
        document.addEventListener('MSFullscreenChange', () => this.onFullscreenChange());
    },

    // Setup player instances
    setupPlayer: function() {
        this.volume = Utils.storage.get('player_volume', 80);
        this.setVolume(this.volume);
    },

    // Play content
    play: function(source, title = '', description = '') {
        Utils.log.info('Playing content:', { source, title });

        this.currentSource = source;
        this.updatePlayerInfo(title, description);
        this.showPlayer();

        // Determine stream type and play
        if (this.isHLSStream(source)) {
            this.playHLS(source);
        } else if (this.isDASHStream(source)) {
            this.playDASH(source);
        } else {
            this.playDirect(source);
        }
    },

    // Check if stream is HLS
    isHLSStream: function(url) {
        return url.includes('.m3u8') || url.includes('hls');
    },

    // Check if stream is DASH
    isDASHStream: function(url) {
        return url.includes('.mpd') || url.includes('dash');
    },

    // Play HLS stream
    playHLS: function(source) {
        if (!window.Hls) {
            Utils.error.show('HLS player not available');
            return;
        }

        // Destroy existing instance
        if (this.hlsInstance) {
            this.hlsInstance.destroy();
        }

        if (Hls.isSupported()) {
            this.hlsInstance = new Hls(STB_CONFIG.player.hls);
            
            this.hlsInstance.loadSource(source);
            this.hlsInstance.attachMedia(this.elements.video);

            this.hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
                Utils.log.debug('HLS manifest parsed');
                this.elements.video.play();
            });

            this.hlsInstance.on(Hls.Events.ERROR, (event, data) => {
                Utils.log.error('HLS error:', data);
                if (data.fatal) {
                    this.handleStreamError(data);
                }
            });

            // Quality level events
            this.hlsInstance.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
                const level = this.hlsInstance.levels[data.level];
                Utils.log.debug('Quality switched to:', level.height + 'p');
            });

        } else if (this.elements.video.canPlayType('application/vnd.apple.mpegurl')) {
            // Native HLS support (Safari)
            this.elements.video.src = source;
            this.elements.video.play();
        } else {
            Utils.error.show('HLS not supported on this device');
        }
    },

    // Play DASH stream
    playDASH: function(source) {
        if (!window.dashjs) {
            Utils.error.show('DASH player not available');
            return;
        }

        // Destroy existing instance
        if (this.dashPlayer) {
            this.dashPlayer.reset();
        }

        this.dashPlayer = dashjs.MediaPlayer().create();
        this.dashPlayer.updateSettings(STB_CONFIG.player.dash);
        
        this.dashPlayer.initialize(this.elements.video, source, true);

        // DASH events
        this.dashPlayer.on(dashjs.MediaPlayer.events.STREAM_INITIALIZED, () => {
            Utils.log.debug('DASH stream initialized');
        });

        this.dashPlayer.on(dashjs.MediaPlayer.events.ERROR, (e) => {
            Utils.log.error('DASH error:', e);
            this.handleStreamError(e);
        });
    },

    // Play direct stream
    playDirect: function(source) {
        this.elements.video.src = source;
        this.elements.video.load();
        this.elements.video.play();
    },

    // Handle stream errors
    handleStreamError: function(error) {
        Utils.log.error('Stream error:', error);
        
        let errorMessage = STB_CONFIG.errors.player.networkError;
        
        if (error.type === 'networkError') {
            errorMessage = STB_CONFIG.errors.player.networkError;
        } else if (error.type === 'mediaError') {
            errorMessage = STB_CONFIG.errors.player.decodingError;
        } else if (error.details === 'manifestLoadError') {
            errorMessage = STB_CONFIG.errors.player.streamNotFound;
        }
        
        Utils.error.show(errorMessage);
        
        // Try to recover
        setTimeout(() => {
            if (this.hlsInstance) {
                this.hlsInstance.recoverMediaError();
            }
        }, 1000);
    },

    // Update player info display
    updatePlayerInfo: function(title, description) {
        if (this.elements.titleDisplay) {
            this.elements.titleDisplay.textContent = title;
        }
        
        if (this.elements.descriptionDisplay) {
            this.elements.descriptionDisplay.textContent = description;
        }
    },

    // Show player modal
    showPlayer: function() {
        if (this.elements.modal) {
            Utils.dom.show(this.elements.modal);
            this.showControls();
            
            // Disable remote navigation for other elements
            if (window.STBRemote) {
                window.STBRemote.disableNavigation();
            }
        }
    },

    // Hide player modal
    hidePlayer: function() {
        if (this.elements.modal) {
            Utils.dom.hide(this.elements.modal);
            
            // Re-enable remote navigation
            if (window.STBRemote) {
                window.STBRemote.enableNavigation();
                window.STBRemote.resetFocus();
            }
        }
    },

    // Show player controls
    showControls: function() {
        if (this.elements.overlay) {
            Utils.dom.addClass(this.elements.overlay, 'show');
            
            // Hide controls after timeout
            if (this.controlsTimeout) {
                clearTimeout(this.controlsTimeout);
            }
            
            this.controlsTimeout = setTimeout(() => {
                this.hideControls();
            }, STB_CONFIG.player.controls.showTimeout);
        }
    },

    // Hide player controls
    hideControls: function() {
        if (this.elements.overlay && !this.elements.video.paused) {
            Utils.dom.removeClass(this.elements.overlay, 'show');
        }
    },

    // Toggle play/pause
    togglePlayPause: function() {
        if (this.elements.video.paused) {
            this.elements.video.play();
        } else {
            this.elements.video.pause();
        }
    },

    // Toggle fullscreen
    toggleFullscreen: function() {
        if (!document.fullscreenElement && !document.webkitFullscreenElement && 
            !document.mozFullScreenElement && !document.msFullscreenElement) {
            this.enterFullscreen();
        } else {
            this.exitFullscreen();
        }
    },

    // Enter fullscreen
    enterFullscreen: function() {
        const element = this.elements.modal || this.elements.video;
        
        if (element.requestFullscreen) {
            element.requestFullscreen();
        } else if (element.webkitRequestFullscreen) {
            element.webkitRequestFullscreen();
        } else if (element.mozRequestFullScreen) {
            element.mozRequestFullScreen();
        } else if (element.msRequestFullscreen) {
            element.msRequestFullscreen();
        }
    },

    // Exit fullscreen
    exitFullscreen: function() {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }
    },

    // Seek to position
    seekToPosition: function(event) {
        if (!this.elements.video.duration) return;
        
        const rect = this.elements.progressBar.getBoundingClientRect();
        const position = (event.clientX - rect.left) / rect.width;
        const time = position * this.elements.video.duration;
        
        this.elements.video.currentTime = time;
    },

    // Seek relative
    seekRelative: function(seconds) {
        if (this.elements.video.duration) {
            const newTime = Math.max(0, Math.min(
                this.elements.video.currentTime + seconds,
                this.elements.video.duration
            ));
            this.elements.video.currentTime = newTime;
        }
    },

    // Set volume
    setVolume: function(volume) {
        this.volume = Math.max(0, Math.min(100, volume));
        this.elements.video.volume = this.volume / 100;
        
        // Save volume preference
        Utils.storage.set('player_volume', this.volume);
        
        // Show volume overlay
        this.showVolumeOverlay();
    },

    // Volume up
    volumeUp: function() {
        this.setVolume(this.volume + STB_CONFIG.player.controls.volumeStep);
    },

    // Volume down
    volumeDown: function() {
        this.setVolume(this.volume - STB_CONFIG.player.controls.volumeStep);
    },

    // Toggle mute
    toggleMute: function() {
        this.isMuted = !this.isMuted;
        this.elements.video.muted = this.isMuted;
        this.showVolumeOverlay();
    },

    // Show volume overlay
    showVolumeOverlay: function() {
        let overlay = Utils.dom.query('.volume-overlay');
        
        if (!overlay) {
            overlay = Utils.dom.create('div', {
                className: 'volume-overlay',
                innerHTML: `
                    <div class="volume-icon">🔊</div>
                    <div class="volume-bar">
                        <div class="volume-fill"></div>
                    </div>
                    <div class="volume-text"></div>
                `
            });
            document.body.appendChild(overlay);
        }
        
        // Update display
        const fill = overlay.querySelector('.volume-fill');
        const text = overlay.querySelector('.volume-text');
        const icon = overlay.querySelector('.volume-icon');
        
        if (this.isMuted) {
            fill.style.width = '0%';
            text.textContent = 'MUTE';
            icon.textContent = '🔇';
        } else {
            fill.style.width = this.volume + '%';
            text.textContent = this.volume + '%';
            icon.textContent = this.volume > 50 ? '🔊' : this.volume > 0 ? '🔉' : '🔇';
        }
        
        // Show overlay
        Utils.dom.addClass(overlay, 'show');
        
        // Hide after delay
        setTimeout(() => {
            Utils.dom.removeClass(overlay, 'show');
        }, 2000);
    },

    // Close player
    close: function() {
        // Stop playback
        this.stop();
        
        // Hide player
        this.hidePlayer();
        
        // Clear current source
        this.currentSource = null;
        
        Utils.log.info('Player closed');
    },

    // Stop playback
    stop: function() {
        if (this.elements.video) {
            this.elements.video.pause();
            this.elements.video.currentTime = 0;
            this.elements.video.src = '';
        }
        
        // Destroy HLS instance
        if (this.hlsInstance) {
            this.hlsInstance.destroy();
            this.hlsInstance = null;
        }
        
        // Reset DASH player
        if (this.dashPlayer) {
            this.dashPlayer.reset();
            this.dashPlayer = null;
        }
        
        this.isPlaying = false;
    },

    // Get available quality levels
    getQualityLevels: function() {
        const levels = [];
        
        if (this.hlsInstance && this.hlsInstance.levels) {
            this.hlsInstance.levels.forEach((level, index) => {
                levels.push({
                    index: index,
                    height: level.height,
                    width: level.width,
                    bitrate: level.bitrate,
                    label: level.height + 'p'
                });
            });
        } else if (this.dashPlayer) {
            const bitrates = this.dashPlayer.getBitrateInfoListFor('video');
            bitrates.forEach((bitrate, index) => {
                levels.push({
                    index: index,
                    height: bitrate.height,
                    width: bitrate.width,
                    bitrate: bitrate.bitrate,
                    label: bitrate.height + 'p'
                });
            });
        }
        
        return levels;
    },

    // Set quality level
    setQualityLevel: function(levelIndex) {
        if (this.hlsInstance) {
            this.hlsInstance.currentLevel = levelIndex;
        } else if (this.dashPlayer) {
            this.dashPlayer.setQualityFor('video', levelIndex);
        }
    },

    // Event handlers
    onLoadStart: function() {
        Utils.log.debug('Player: Load start');
        this.showControls();
    },

    onLoadedMetadata: function() {
        this.duration = this.elements.video.duration;
        this.updateTimeDisplay();
        Utils.log.debug('Player: Metadata loaded, duration:', this.duration);
    },

    onCanPlay: function() {
        Utils.log.debug('Player: Can play');
        this.hideControls();
    },

    onPlay: function() {
        this.isPlaying = true;
        this.updatePlayPauseButton();
        Utils.log.debug('Player: Playing');
    },

    onPause: function() {
        this.isPlaying = false;
        this.updatePlayPauseButton();
        this.showControls();
        Utils.log.debug('Player: Paused');
    },

    onTimeUpdate: function() {
        this.currentTime = this.elements.video.currentTime;
        this.updateProgress();
        this.updateTimeDisplay();
    },

    onEnded: function() {
        this.isPlaying = false;
        this.updatePlayPauseButton();
        this.showControls();
        Utils.log.debug('Player: Ended');
    },

    onError: function(event) {
        const error = this.elements.video.error;
        Utils.log.error('Player error:', error);
        
        let errorMessage = STB_CONFIG.errors.player.decodingError;
        
        if (error) {
            switch (error.code) {
                case error.MEDIA_ERR_ABORTED:
                    errorMessage = 'Playback aborted';
                    break;
                case error.MEDIA_ERR_NETWORK:
                    errorMessage = STB_CONFIG.errors.player.networkError;
                    break;
                case error.MEDIA_ERR_DECODE:
                    errorMessage = STB_CONFIG.errors.player.decodingError;
                    break;
                case error.MEDIA_ERR_SRC_NOT_SUPPORTED:
                    errorMessage = STB_CONFIG.errors.player.formatNotSupported;
                    break;
            }
        }
        
        Utils.error.show(errorMessage);
    },

    onVolumeChange: function() {
        this.volume = Math.round(this.elements.video.volume * 100);
        this.isMuted = this.elements.video.muted;
    },

    onFullscreenChange: function() {
        this.isFullscreen = !!(document.fullscreenElement || document.webkitFullscreenElement || 
                              document.mozFullScreenElement || document.msFullscreenElement);
        Utils.log.debug('Player: Fullscreen changed:', this.isFullscreen);
    },

    // Update UI elements
    updatePlayPauseButton: function() {
        if (!this.elements.playPauseBtn) return;
        
        const playIcon = this.elements.playPauseBtn.querySelector('.play-icon');
        const pauseIcon = this.elements.playPauseBtn.querySelector('.pause-icon');
        
        if (this.isPlaying) {
            Utils.dom.hide(playIcon);
            Utils.dom.show(pauseIcon);
        } else {
            Utils.dom.show(playIcon);
            Utils.dom.hide(pauseIcon);
        }
    },

    updateProgress: function() {
        if (!this.elements.progressFill || !this.duration) return;
        
        const progress = (this.currentTime / this.duration) * 100;
        this.elements.progressFill.style.width = progress + '%';
    },

    updateTimeDisplay: function() {
        if (this.elements.currentTimeDisplay) {
            this.elements.currentTimeDisplay.textContent = Utils.time.formatDuration(this.currentTime);
        }
        
        if (this.elements.durationDisplay) {
            this.elements.durationDisplay.textContent = Utils.time.formatDuration(this.duration);
        }
    },

    // Get player state
    getState: function() {
        return {
            isPlaying: this.isPlaying,
            currentTime: this.currentTime,
            duration: this.duration,
            volume: this.volume,
            isMuted: this.isMuted,
            isFullscreen: this.isFullscreen,
            source: this.currentSource
        };
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    STBPlayer.init();
});

// Make player globally available
window.Player = STBPlayer;
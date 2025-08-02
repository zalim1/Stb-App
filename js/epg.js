// Electronic Program Guide (EPG) Module for STB Application

window.STBEPG = {
    // EPG data
    channels: [],
    programs: {},
    currentDate: null,
    dateRange: [],

    // UI state
    isLoading: false,
    currentHour: 6, // Start time
    hoursToShow: 6, // Hours per view

    // DOM elements
    elements: {
        section: null,
        container: null,
        dateDisplay: null,
        prevDayBtn: null,
        nextDayBtn: null,
        grid: null,
        timeHeader: null,
        channelList: null,
        programGrid: null
    },

    // Initialize EPG module
    init: function() {
        this.bindElements();
        this.bindEvents();
        this.setupCurrentDate();
        Utils.log.info('EPG module initialized');
    },

    // Bind DOM elements
    bindElements: function() {
        this.elements.section = Utils.dom.query('#epg-section');
        this.elements.container = Utils.dom.query('#epg-container');
        this.elements.dateDisplay = Utils.dom.query('#epg-current-date');
        this.elements.prevDayBtn = Utils.dom.query('#epg-prev-day');
        this.elements.nextDayBtn = Utils.dom.query('#epg-next-day');
    },

    // Bind event listeners
    bindEvents: function() {
        if (this.elements.prevDayBtn) {
            this.elements.prevDayBtn.addEventListener('click', () => {
                this.navigateDay(-1);
            });
        }

        if (this.elements.nextDayBtn) {
            this.elements.nextDayBtn.addEventListener('click', () => {
                this.navigateDay(1);
            });
        }

        // Keyboard navigation for EPG
        document.addEventListener('keydown', (e) => {
            if (this.elements.section && !Utils.dom.hasClass(this.elements.section, 'active')) {
                return; // Only handle keys when EPG is active
            }

            switch (e.key) {
                case 'ArrowLeft':
                    this.navigateTime(-1);
                    e.preventDefault();
                    break;
                case 'ArrowRight':
                    this.navigateTime(1);
                    e.preventDefault();
                    break;
                case 'PageUp':
                    this.navigateDay(-1);
                    e.preventDefault();
                    break;
                case 'PageDown':
                    this.navigateDay(1);
                    e.preventDefault();
                    break;
            }
        });
    },

    // Setup current date
    setupCurrentDate: function() {
        this.currentDate = new Date();
        this.currentDate.setHours(0, 0, 0, 0);
        this.updateDateDisplay();
    },

    // Load EPG data
    load: function() {
        if (this.isLoading) return Promise.resolve();
        
        this.isLoading = true;
        this.showLoading();

        return Promise.all([
            this.loadChannels(),
            this.loadPrograms()
        ])
        .then(() => {
            this.isLoading = false;
            this.renderEPG();
        })
        .catch((error) => {
            this.isLoading = false;
            this.handleError(error);
        });
    },

    // Load channels for EPG
    loadChannels: function() {
        // Get channels from the channel manager
        if (window.STBChannels && window.STBChannels.allChannels.length > 0) {
            this.channels = window.STBChannels.allChannels.slice(0, 20); // Limit for performance
            return Promise.resolve();
        } else {
            // Load channels via API
            return API.channels.getList('*', 1, 'number')
                .then((response) => {
                    this.channels = (response.data || []).slice(0, 20);
                    Utils.log.debug('Loaded EPG channels:', this.channels.length);
                });
        }
    },

    // Load programs for current date
    loadPrograms: function() {
        if (this.channels.length === 0) return Promise.resolve();

        const channelIds = this.channels.map(ch => ch.id);
        const startTime = this.currentDate.getTime();
        const endTime = startTime + (24 * 60 * 60 * 1000); // 24 hours

        return API.epg.getMultiChannel(channelIds, startTime, endTime)
            .then((response) => {
                this.processEPGData(response.data || {});
                Utils.log.debug('Loaded EPG programs for', Object.keys(this.programs).length, 'channels');
            })
            .catch((error) => {
                Utils.log.warn('EPG data not available:', error);
                // Create dummy program data
                this.createDummyPrograms();
            });
    },

    // Process EPG data from API
    processEPGData: function(epgData) {
        this.programs = {};
        
        Object.keys(epgData).forEach(channelId => {
            if (epgData[channelId] && Array.isArray(epgData[channelId])) {
                this.programs[channelId] = epgData[channelId].map(program => ({
                    id: program.id,
                    title: program.name || program.title || 'Unknown Program',
                    description: program.descr || program.description || '',
                    startTime: parseInt(program.t_time) * 1000, // Convert to milliseconds
                    endTime: parseInt(program.t_time_to) * 1000,
                    duration: program.duration || 0,
                    genre: program.category || '',
                    rating: program.rating || ''
                }));
            }
        });
    },

    // Create dummy programs when EPG data is not available
    createDummyPrograms: function() {
        this.programs = {};
        const now = this.currentDate.getTime();
        
        this.channels.forEach(channel => {
            this.programs[channel.id] = [];
            
            // Create 24 hours worth of dummy programs
            for (let hour = 0; hour < 24; hour++) {
                const startTime = now + (hour * 60 * 60 * 1000);
                const endTime = startTime + (60 * 60 * 1000);
                
                this.programs[channel.id].push({
                    id: `dummy_${channel.id}_${hour}`,
                    title: `Program ${hour + 1}`,
                    description: `Scheduled program for ${Utils.time.formatTime(startTime)}`,
                    startTime: startTime,
                    endTime: endTime,
                    duration: 3600,
                    genre: 'General',
                    rating: ''
                });
            }
        });
    },

    // Navigate to different day
    navigateDay: function(direction) {
        const newDate = new Date(this.currentDate);
        newDate.setDate(newDate.getDate() + direction);
        
        // Limit EPG to reasonable range
        const minDate = new Date();
        minDate.setDate(minDate.getDate() - 1); // Yesterday
        const maxDate = new Date();
        maxDate.setDate(maxDate.getDate() + STB_CONFIG.epg.daysToLoad); // Future limit
        
        if (newDate >= minDate && newDate <= maxDate) {
            this.currentDate = newDate;
            this.updateDateDisplay();
            this.load();
        }
    },

    // Navigate time view
    navigateTime: function(direction) {
        const newHour = this.currentHour + (direction * this.hoursToShow);
        
        if (newHour >= 0 && newHour < 24) {
            this.currentHour = newHour;
            this.renderEPG();
        }
    },

    // Update date display
    updateDateDisplay: function() {
        if (this.elements.dateDisplay) {
            const options = { 
                weekday: 'short', 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
            };
            this.elements.dateDisplay.textContent = this.currentDate.toLocaleDateString(undefined, options);
        }
    },

    // Render EPG grid
    renderEPG: function() {
        if (!this.elements.container) return;
        
        this.hideLoading();
        
        if (this.channels.length === 0) {
            this.showEmptyState();
            return;
        }
        
        // Clear container
        this.elements.container.innerHTML = '';
        
        // Create EPG structure
        const epgGrid = this.createEPGGrid();
        this.elements.container.appendChild(epgGrid);
    },

    // Create EPG grid structure
    createEPGGrid: function() {
        const grid = Utils.dom.create('div', {
            className: 'epg-grid'
        });
        
        // Create time header
        const timeHeader = this.createTimeHeader();
        grid.appendChild(timeHeader);
        
        // Create channel rows
        this.channels.forEach(channel => {
            const channelRow = this.createChannelRow(channel);
            grid.appendChild(channelRow);
        });
        
        return grid;
    },

    // Create time header
    createTimeHeader: function() {
        const header = Utils.dom.create('div', {
            className: 'epg-time-header'
        });
        
        // Channel column header
        const channelHeader = Utils.dom.create('div', {
            className: 'epg-channel-header',
            innerHTML: 'Channels'
        });
        header.appendChild(channelHeader);
        
        // Time columns
        for (let i = 0; i < this.hoursToShow; i++) {
            const hour = (this.currentHour + i) % 24;
            const timeCol = Utils.dom.create('div', {
                className: 'epg-time-col',
                innerHTML: Utils.time.formatTime(this.getTimeForHour(hour), 'HH:mm')
            });
            header.appendChild(timeCol);
        }
        
        return header;
    },

    // Create channel row
    createChannelRow: function(channel) {
        const row = Utils.dom.create('div', {
            className: 'epg-channel-row',
            'data-channel-id': channel.id
        });
        
        // Channel info
        const channelInfo = this.createChannelInfo(channel);
        row.appendChild(channelInfo);
        
        // Program cells
        const programCells = this.createProgramCells(channel);
        row.appendChild(programCells);
        
        return row;
    },

    // Create channel info cell
    createChannelInfo: function(channel) {
        const info = Utils.dom.create('div', {
            className: 'epg-channel'
        });
        
        // Channel logo
        if (channel.logo) {
            const logo = Utils.dom.create('img', {
                src: channel.logo,
                alt: channel.name,
                onerror: `this.style.display='none'`
            });
            info.appendChild(logo);
        }
        
        // Channel name and number
        const nameContainer = Utils.dom.create('div', {
            className: 'channel-name-container'
        });
        
        const number = Utils.dom.create('div', {
            className: 'channel-number',
            innerHTML: channel.number
        });
        
        const name = Utils.dom.create('div', {
            className: 'channel-name',
            innerHTML: Utils.string.escapeHtml(channel.name)
        });
        
        nameContainer.appendChild(number);
        nameContainer.appendChild(name);
        info.appendChild(nameContainer);
        
        // Click handler to switch channel
        info.addEventListener('click', () => {
            if (window.STBChannels) {
                window.STBChannels.playChannel(channel);
            }
        });
        
        return info;
    },

    // Create program cells for channel
    createProgramCells: function(channel) {
        const programsContainer = Utils.dom.create('div', {
            className: 'epg-programs'
        });
        
        const channelPrograms = this.programs[channel.id] || [];
        const startTime = this.getTimeForHour(this.currentHour);
        const endTime = this.getTimeForHour(this.currentHour + this.hoursToShow);
        
        // Filter programs for current time range
        const visiblePrograms = channelPrograms.filter(program => 
            program.startTime < endTime && program.endTime > startTime
        );
        
        if (visiblePrograms.length === 0) {
            // Show empty time slots
            for (let i = 0; i < this.hoursToShow; i++) {
                const emptyCell = Utils.dom.create('div', {
                    className: 'epg-program empty',
                    innerHTML: 'No Program'
                });
                programsContainer.appendChild(emptyCell);
            }
        } else {
            // Show actual programs
            visiblePrograms.forEach(program => {
                const programCell = this.createProgramCell(program, startTime, endTime);
                programsContainer.appendChild(programCell);
            });
        }
        
        return programsContainer;
    },

    // Create individual program cell
    createProgramCell: function(program, viewStartTime, viewEndTime) {
        const now = Date.now();
        const isCurrent = now >= program.startTime && now < program.endTime;
        const isPast = now >= program.endTime;
        
        const cell = Utils.dom.create('div', {
            className: `epg-program ${isCurrent ? 'current' : ''} ${isPast ? 'past' : ''}`,
            'data-program-id': program.id
        });
        
        // Calculate width based on duration
        const totalViewDuration = viewEndTime - viewStartTime;
        const programDuration = Math.min(program.endTime, viewEndTime) - Math.max(program.startTime, viewStartTime);
        const widthPercent = (programDuration / totalViewDuration) * 100;
        
        cell.style.width = widthPercent + '%';
        cell.style.minWidth = '150px';
        
        // Program title
        const title = Utils.dom.create('div', {
            className: 'program-title',
            innerHTML: Utils.string.escapeHtml(program.title)
        });
        
        // Program time
        const time = Utils.dom.create('div', {
            className: 'program-time',
            innerHTML: `${Utils.time.formatTime(program.startTime)} - ${Utils.time.formatTime(program.endTime)}`
        });
        
        cell.appendChild(title);
        cell.appendChild(time);
        
        // Progress bar for current program
        if (isCurrent) {
            const progress = ((now - program.startTime) / (program.endTime - program.startTime)) * 100;
            const progressBar = Utils.dom.create('div', {
                className: 'program-progress',
                style: `background: linear-gradient(to right, rgba(76,175,80,0.3) ${progress}%, transparent ${progress}%);`
            });
            cell.appendChild(progressBar);
        }
        
        // Click handler for program info
        cell.addEventListener('click', () => {
            this.showProgramInfo(program);
        });
        
        return cell;
    },

    // Get timestamp for specific hour
    getTimeForHour: function(hour) {
        const date = new Date(this.currentDate);
        date.setHours(hour, 0, 0, 0);
        return date.getTime();
    },

    // Show program information
    showProgramInfo: function(program) {
        const modal = Utils.dom.create('div', {
            className: 'modal program-info-modal',
            innerHTML: `
                <div class="modal-content">
                    <h3>${Utils.string.escapeHtml(program.title)}</h3>
                    <div class="program-details">
                        <p><strong>Time:</strong> ${Utils.time.formatTime(program.startTime)} - ${Utils.time.formatTime(program.endTime)}</p>
                        <p><strong>Duration:</strong> ${Utils.time.formatDuration(program.duration)}</p>
                        ${program.genre ? `<p><strong>Genre:</strong> ${Utils.string.escapeHtml(program.genre)}</p>` : ''}
                        ${program.rating ? `<p><strong>Rating:</strong> ${Utils.string.escapeHtml(program.rating)}</p>` : ''}
                        ${program.description ? `<p><strong>Description:</strong> ${Utils.string.escapeHtml(program.description)}</p>` : ''}
                    </div>
                    <div class="modal-actions">
                        <button class="modal-close">Close</button>
                        ${this.isProgramRecordable(program) ? '<button class="record-btn">Record</button>' : ''}
                    </div>
                </div>
            `
        });
        
        document.body.appendChild(modal);
        Utils.dom.show(modal);
        
        // Close handlers
        const closeBtn = modal.querySelector('.modal-close');
        closeBtn.addEventListener('click', () => {
            Utils.dom.hide(modal);
            setTimeout(() => modal.remove(), 300);
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                Utils.dom.hide(modal);
                setTimeout(() => modal.remove(), 300);
            }
        });
        
        // Record handler (if recording is supported)
        const recordBtn = modal.querySelector('.record-btn');
        if (recordBtn) {
            recordBtn.addEventListener('click', () => {
                this.recordProgram(program);
                Utils.dom.hide(modal);
                setTimeout(() => modal.remove(), 300);
            });
        }
    },

    // Check if program can be recorded
    isProgramRecordable: function(program) {
        return STB_CONFIG.features.recording && program.endTime > Date.now();
    },

    // Record program (placeholder)
    recordProgram: function(program) {
        Utils.log.info('Recording program:', program.title);
        Utils.error.show('Recording scheduled for: ' + program.title, 'success');
    },

    // Show loading state
    showLoading: function() {
        if (this.elements.container) {
            this.elements.container.innerHTML = '<div class="loading-placeholder">Loading TV Guide...</div>';
        }
    },

    // Hide loading state
    hideLoading: function() {
        // Loading will be replaced by content
    },

    // Show empty state
    showEmptyState: function() {
        if (!this.elements.container) return;
        
        this.elements.container.innerHTML = `
            <div class="empty-state">
                <h3>No EPG data available</h3>
                <p>TV Guide information is not available for this date.</p>
            </div>
        `;
    },

    // Handle errors
    handleError: function(error) {
        Utils.log.error('EPG error:', error);
        Utils.error.handle(error, 'epg');
        
        if (this.elements.container) {
            this.elements.container.innerHTML = `
                <div class="error-state">
                    <h3>Error loading TV Guide</h3>
                    <p>${error.message || 'Please try again later.'}</p>
                    <button onclick="STBEPG.load()" class="retry-button">Retry</button>
                </div>
            `;
        }
    },

    // Get current programs for all channels
    getCurrentPrograms: function() {
        const now = Date.now();
        const currentPrograms = {};
        
        Object.keys(this.programs).forEach(channelId => {
            const program = this.programs[channelId].find(p => 
                now >= p.startTime && now < p.endTime
            );
            if (program) {
                currentPrograms[channelId] = program;
            }
        });
        
        return currentPrograms;
    },

    // Get next programs for all channels
    getNextPrograms: function() {
        const now = Date.now();
        const nextPrograms = {};
        
        Object.keys(this.programs).forEach(channelId => {
            const program = this.programs[channelId].find(p => 
                p.startTime > now
            );
            if (program) {
                nextPrograms[channelId] = program;
            }
        });
        
        return nextPrograms;
    },

    // Refresh EPG data
    refresh: function() {
        this.programs = {};
        return this.load();
    },

    // Auto-refresh EPG data
    startAutoRefresh: function() {
        if (STB_CONFIG.epg.autoRefresh) {
            setInterval(() => {
                if (this.elements.section && Utils.dom.hasClass(this.elements.section, 'active')) {
                    this.refresh();
                }
            }, STB_CONFIG.epg.refreshInterval);
        }
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    STBEPG.init();
    STBEPG.startAutoRefresh();
});

// Make EPG module globally available
window.EPG = STBEPG;
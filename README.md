# STB Client Application

A comprehensive Set-Top Box (STB) client application for Stalker middleware servers, built with modern web technologies and optimized for television displays and remote control navigation.

## Features

### 🔐 Authentication System
- Secure login with MAC address validation
- Device token management
- Session persistence and auto-restore
- Login attempt limiting with lockout protection
- Automatic session refresh

### 📺 Live TV Channels
- Channel grid with thumbnails and logos
- Category filtering and search functionality
- Channel favorites management
- Remote control navigation optimized for TV
- Channel zapping with number input
- EPG integration for current programs

### 🎬 Video on Demand (VOD)
- Movie library with poster thumbnails
- Category and genre filtering
- Advanced search functionality
- Rating and quality indicators
- Favorites management
- Detailed movie information

### 📅 Electronic Program Guide (EPG)
- 7-day TV guide with program schedules
- Interactive timeline navigation
- Program details and descriptions
- Current program highlighting
- Program recording support (if enabled)

### 🎮 Media Player
- **HLS.js** integration for HTTP Live Streaming
- **DASH.js** support for MPEG-DASH streams
- Adaptive bitrate streaming
- Quality level selection
- Volume and playback controls
- Fullscreen support
- Progress tracking and seeking
- Subtitle support (when available)

### 🎛️ Settings Management
- **Video Settings**: Quality, aspect ratio, deinterlacing
- **Audio Settings**: Output format, volume, language
- **Network Settings**: Buffer size, connection timeout
- **Parental Controls**: PIN protection, content filtering
- **System Information**: Device details, storage usage

### 🎯 Remote Control Support
- Complete keyboard/remote navigation
- Arrow key navigation with focus management
- Channel number input for direct tuning
- Volume and channel controls
- Play/pause, seek controls
- Color button functions
- Context-sensitive help system

### 🎨 TV-Optimized Interface
- Responsive design for various screen sizes
- High contrast mode for better visibility
- Large click targets for remote control
- TV safe area compliance
- Smooth animations and transitions
- Loading states and error handling

## Technical Specifications

### Frontend Technologies
- **HTML5/CSS3/JavaScript** - Modern web standards
- **HLS.js** - HTTP Live Streaming support
- **DASH.js** - MPEG-DASH streaming support
- **Responsive CSS Grid** - Flexible layouts
- **Local Storage** - User preferences and caching

### API Integration
- **Stalker Middleware** - Complete API integration
- **RESTful endpoints** - Channels, VOD, EPG, authentication
- **Error handling** - Comprehensive error management
- **Offline capabilities** - Graceful degradation

### Device Compatibility
- **STB Devices** - MAG, Infomir, and similar
- **Android TV** - Smart TV and Android TV boxes
- **Web Browsers** - Chrome, Firefox, Safari, Edge
- **Smart TVs** - WebOS, Tizen, and other platforms

## Installation

### Quick Start
1. Clone or download this repository
2. Serve the files using any web server
3. Access the application through your STB or browser

### Using Python (Development)
```bash
cd Stb-App
python -m http.server 8080
```
Then navigate to `http://localhost:8080`

### Using Node.js (Development)
```bash
cd Stb-App
npx http-server -p 8080
```

### Production Deployment
1. Upload all files to your web server
2. Ensure proper MIME types are configured
3. Enable HTTPS for secure connections
4. Configure CORS headers if needed

## Configuration

### Server Configuration
Edit `config/config.js` to customize:

```javascript
// Default server settings
server: {
    defaultUrl: 'http://your-stalker-server.com/stalker_portal',
    timeout: 30000,
    retryAttempts: 3
}
```

### Feature Flags
Enable/disable features as needed:

```javascript
features: {
    timeshift: true,
    recording: false,
    multiRoom: false,
    parentalControls: true
}
```

### Player Settings
Customize streaming parameters:

```javascript
player: {
    hls: {
        maxBufferLength: 60,
        liveSyncDuration: 3
    },
    dash: {
        // DASH configuration
    }
}
```

## Usage

### First Time Setup
1. Enter your Stalker server URL
2. Input your MAC address (format: 00:1A:79:XX:XX:XX)
3. Optionally provide device token
4. Click "Login" to authenticate

### Navigation
- **Arrow Keys**: Navigate through menus and content
- **Enter/OK**: Select items
- **Back/Return**: Go back or close modals
- **Number Keys (0-9)**: Direct channel input
- **Volume +/-**: Adjust volume
- **Channel +/-**: Change channels
- **Menu**: Open settings
- **Info**: Show program information
- **Guide**: Open TV guide

### Remote Control Functions
- **Red Button**: Toggle favorites
- **Green Button**: Open search
- **Yellow Button**: Show categories
- **Blue Button**: Additional options

## File Structure

```
Stb-App/
├── index.html              # Main application entry point
├── package.json            # Project configuration
├── README.md              # This documentation
├── config/
│   └── config.js          # Application configuration
├── css/
│   ├── styles.css         # Main stylesheet
│   └── tv-ui.css          # TV-specific UI styles
└── js/
    ├── app.js             # Main application controller
    ├── api.js             # API communication layer
    ├── auth.js            # Authentication management
    ├── channels.js        # Channel management
    ├── epg.js             # Electronic Program Guide
    ├── player.js          # Media player functionality
    ├── remote.js          # Remote control handling
    ├── settings.js        # Settings management
    ├── utils.js           # Utility functions
    └── vod.js             # Video on Demand functionality
```

## API Endpoints

The application integrates with Stalker middleware through these endpoints:

- **Authentication**: `/server/load.php?action=handshake`
- **Profile**: `/server/load.php?action=get_profile`
- **Channels**: `/server/load.php?action=get_ordered_list&type=itv`
- **VOD**: `/server/load.php?action=get_ordered_list&type=vod`
- **EPG**: `/server/load.php?action=get_epg_info`
- **Streaming**: `/server/load.php?action=create_link`

## Browser Support

### Minimum Requirements
- **Chrome**: 60+
- **Firefox**: 55+
- **Safari**: 11+
- **Edge**: 79+

### Required Features
- ES6 JavaScript support
- CSS Grid and Flexbox
- Local Storage
- Fetch API
- HTML5 Video

### Optional Features
- Service Workers (for offline functionality)
- WebRTC (for future features)
- Fullscreen API
- Media Session API

## Development

### Local Development
1. Clone the repository
2. Start a local web server
3. Open browser developer tools
4. Enable debug mode in config
5. Test with mock data or real server

### Debugging
Enable debug mode in `config/config.js`:

```javascript
debug: {
    enabled: true,
    logLevel: 'debug',
    showNetworkRequests: true
}
```

### Testing
- Test on actual STB hardware when possible
- Use browser developer tools to simulate TV resolutions
- Test remote control navigation with keyboard
- Verify streaming with various content types

## Troubleshooting

### Common Issues

**Login Failed**
- Verify server URL is correct and accessible
- Check MAC address format (XX:XX:XX:XX:XX:XX)
- Ensure server allows your device/IP
- Check network connectivity

**Streaming Issues**
- Verify HLS/DASH stream compatibility
- Check network bandwidth
- Try different quality settings
- Ensure proper CORS headers

**Remote Control Not Working**
- Check if page has focus
- Verify key codes in browser console
- Test with keyboard first
- Check remote control batteries

**Performance Issues**
- Reduce buffer sizes in config
- Disable animations for older devices
- Lower video quality settings
- Clear application cache

### Error Codes
- **401**: Authentication failed
- **403**: Access denied
- **404**: Content not found
- **500**: Server error
- **Network Error**: Connection issue

## Security Considerations

### Data Protection
- No sensitive data stored in localStorage
- Session tokens have expiration
- PIN codes are hashed locally
- HTTPS recommended for production

### Content Security
- Parental controls with PIN protection
- Content rating filtering
- Category-based restrictions
- Time-based access controls

## Contributing

### Development Guidelines
1. Follow existing code style and structure
2. Test on multiple devices/browsers
3. Document new features thoroughly
4. Maintain backward compatibility
5. Optimize for TV viewing distance

### Pull Requests
- Include comprehensive testing
- Update documentation
- Follow naming conventions
- Add appropriate comments

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For technical support:
1. Check this documentation
2. Review browser console for errors
3. Test with debug mode enabled
4. Contact your service provider for server issues

## Changelog

### Version 1.0.0
- Initial release
- Complete Stalker middleware integration
- Full remote control support
- HLS/DASH streaming
- EPG and VOD functionality
- Comprehensive settings management
- TV-optimized interface

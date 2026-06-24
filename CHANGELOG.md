# Changelog

All notable changes to the Copilot Usage Tracker extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial release of Copilot Usage Tracker
- Token estimation using tiktoken
- SQLite database for local storage
- Dashboard with comprehensive analytics
- Status bar token counter
- Sidebar usage analytics view
- CSV and JSON export functionality
- Database backup feature
- Session-based tracking
- Configurable notification thresholds
- Daily, weekly, and monthly statistics
- Top languages, workspaces, and files analytics
- Hourly usage heatmap
- Full TypeScript implementation
- Production-ready code quality
- ESLint configuration
- Comprehensive error handling
- Logging system
- Responsive UI with dark/light mode support

### Features

#### Core Tracking
- [x] Track every Copilot interaction
- [x] Estimate input and output tokens
- [x] Calculate estimated costs
- [x] Store all data locally
- [x] Session management
- [x] Automatic database pruning

#### Dashboard
- [x] Real-time statistics cards
- [x] Daily usage trends chart
- [x] Hourly usage heatmap
- [x] Top languages analytics
- [x] Top workspaces analytics
- [x] Top files analytics
- [x] Recent requests table
- [x] Search and filter capabilities
- [x] Pagination support
- [x] Responsive design

#### Sidebar View
- [x] Today's usage overview
- [x] Weekly statistics
- [x] Monthly statistics
- [x] All-time statistics
- [x] Quick access buttons
- [x] Tree view with details

#### Status Bar
- [x] Today's token counter
- [x] Quick dashboard access
- [x] Auto-update every minute
- [x] Configurable display

#### Export & Backup
- [x] CSV export
- [x] JSON export with metadata
- [x] SQLite database backup
- [x] Configurable export location

#### Notifications
- [x] Token threshold alerts
- [x] Configurable thresholds
- [x] Daily limit notifications
- [x] Dismissible notifications

#### Settings
- [x] Enable/disable tracking
- [x] Toggle status bar
- [x] Toggle notifications
- [x] Custom database location
- [x] History retention policy
- [x] Notification thresholds
- [x] Auto-export option

## Planned Features

### [0.2.0] - Soon
- [ ] GitHub Copilot Chat integration
- [ ] Real Copilot API integration (when available)
- [ ] Charts library integration (Chart.js)
- [ ] Advanced filtering options
- [ ] Export to cloud storage
- [ ] Multi-workspace support enhancement

### [0.3.0] - Future
- [ ] Token usage predictions
- [ ] Budget tracking
- [ ] Team analytics (if applicable)
- [ ] Performance metrics
- [ ] Custom time period reports
- [ ] Email summaries

### [0.4.0] - Extended
- [ ] Machine learning insights
- [ ] Anomaly detection
- [ ] Integration with GitHub API
- [ ] Slack notifications
- [ ] Web dashboard (optional backend)
- [ ] API for external tools

## Version History

### [0.1.0] - 2026-06-24

#### Initial Release
- ✨ Complete token tracking implementation
- 📊 Full dashboard with analytics
- 💾 SQLite database with schema
- 📤 Export functionality (CSV, JSON, Backup)
- 📈 Comprehensive statistics
- 🔔 Notification system
- ⚙️ Full configuration support
- 📝 Complete documentation
- 🚀 Production-ready code quality

#### Technical
- TypeScript strict mode
- Comprehensive error handling
- Async/await throughout
- Proper type definitions
- ESLint configuration
- Clean architecture
- Dependency injection patterns
- Logging system
- Session management
- Database migration support

#### Quality
- No `any` types
- Full documentation
- Comments on complex logic
- Error handling on all operations
- Input validation
- Secure database practices
- Performance optimized

---

## How to Report Issues

If you encounter a bug or have a feature request:

1. Check existing issues to avoid duplicates
2. Provide detailed reproduction steps
3. Include:
   - VS Code version
   - Extension version
   - Error message/screenshot
   - Sample data if applicable

## How to Contribute

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Follow the code style
4. Write/update tests
5. Submit a pull request

## Development Timeline

- **Phase 1**: Core functionality ✅ Complete
- **Phase 2**: Real Copilot integration (upcoming)
- **Phase 3**: Advanced analytics (planned)
- **Phase 4**: Community features (future)

---

**Thank you for using Copilot Usage Tracker!** 📊

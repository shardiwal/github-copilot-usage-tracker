# Copilot Usage Tracker

**Track and estimate GitHub Copilot token usage for every chat request**

A production-quality VS Code extension that monitors Copilot interactions, estimates token consumption, and provides comprehensive analytics and insights.

## Features

### 📊 Dashboard
- **Real-time Statistics**: Today's token count, requests, input/output tokens
- **Interactive Charts**: Daily usage trends, hourly heatmaps
- **Top Analytics**: Most active languages, workspaces, and files
- **Session Tracking**: Monitor token usage across sessions

### 📈 Sidebar Analytics View
- **Today's Usage**: Quick overview of current day
- **Weekly & Monthly Stats**: Track usage patterns over time
- **Top Statistics**: Identify most active areas
- **Quick Actions**: Easy access to dashboard and export

### 💾 Local Storage
- **SQLite Database**: Persistent local storage of all requests
- **No Cloud Upload**: All data stays on your machine
- **Automatic Cleanup**: Configurable history retention
- **Database Backup**: Export database backups

### 📥 Export Options
- **CSV Export**: Compatible with Excel and data analysis tools
- **JSON Export**: Full data export with metadata and analytics
- **SQLite Backup**: Direct database backup for data portability

### 🔔 Status Bar
- **Token Counter**: Always visible token count for today
- **Quick Access**: Click to open dashboard

### ⚙️ Highly Configurable
- **Enable/Disable Tracking**: Toggle extension on/off
- **Notification Thresholds**: Set alerts at 100K, 250K, 500K tokens
- **Custom Database Location**: Specify where to store data
- **History Retention**: Configure max records to keep
- **Status Bar Toggle**: Show/hide token counter

## Installation

### From VS Code
1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X / Cmd+Shift+X)
3. Search for "Copilot Usage Tracker"
4. Click Install

### From Source
```bash
git clone https://github.com/yourusername/copilot-usage-tracker
cd copilot-usage-tracker
npm install
npm run build
```

## Usage

### Basic Commands

**Open Dashboard**
```
Ctrl+Shift+P > Copilot Tracker: Open Dashboard
```

**Ask Copilot**
```
Ctrl+Shift+P > Copilot Tracker: Ask Copilot
```

**Export Data**
```
Ctrl+Shift+P > Copilot Tracker: Export CSV
Ctrl+Shift+P > Copilot Tracker: Export JSON
```

**Clear History**
```
Ctrl+Shift+P > Copilot Tracker: Clear History
```

### Sidebar Usage Analytics
1. Click the Copilot Usage icon in the activity bar
2. View:
   - Today's token count
   - Today's requests
   - Weekly and monthly stats
   - Top languages and workspaces
   - All-time statistics

### Status Bar
- Click the "📊 XXK Tokens Today" in the status bar to open the dashboard
- Status updates every minute

### Dashboard
The main dashboard provides:
- **Quick Stats Cards**: Today's overview
- **Usage Charts**: Visual representation of token consumption
- **Top Analytics**: Languages, workspaces, files
- **Recent Requests**: Table of recent interactions
- **Export Options**: Download data in various formats

## Configuration

### Settings
Access via `Ctrl+,` and search for "Copilot Tracker":

```json
{
  "tracker.enabled": true,
  "tracker.showStatusBar": true,
  "tracker.showNotifications": true,
  "tracker.autoExport": false,
  "tracker.databaseLocation": "",
  "tracker.maxHistory": 10000,
  "tracker.notificationThresholds": [100000, 250000, 500000]
}
```

### Configuration Options

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `tracker.enabled` | boolean | `true` | Enable/disable token tracking |
| `tracker.showStatusBar` | boolean | `true` | Show token count in status bar |
| `tracker.showNotifications` | boolean | `true` | Show token threshold notifications |
| `tracker.autoExport` | boolean | `false` | Automatically export periodically |
| `tracker.databaseLocation` | string | `` | Custom database path (empty = default) |
| `tracker.maxHistory` | number | `10000` | Maximum records to keep |
| `tracker.notificationThresholds` | array | `[100k, 250k, 500k]` | Token alert thresholds |

## Data Storage

### Database Location
- **Windows**: `%APPDATA%\.vscode-copilot-tracker\tracker.db`
- **macOS**: `~/.vscode-copilot-tracker/tracker.db`
- **Linux**: `~/.vscode-copilot-tracker/tracker.db`

### Database Schema

#### usage table
```sql
CREATE TABLE usage (
  id INTEGER PRIMARY KEY,
  timestamp TEXT,
  workspace TEXT,
  language TEXT,
  file TEXT,
  prompt TEXT,
  response TEXT,
  inputTokens INTEGER,
  outputTokens INTEGER,
  totalTokens INTEGER,
  duration INTEGER,
  sessionId TEXT,
  createdAt DATETIME
)
```

#### settings table
```sql
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updatedAt DATETIME
)
```

## Token Estimation

The extension uses **tiktoken** to estimate token usage:
- Based on OpenAI's GPT-3.5-turbo model encoding
- Accurate estimates for both prompt and completion tokens
- Support for multiple model encodings

### Estimated Costs (USD)
Based on OpenAI pricing:
- **Input**: $0.0005 per 1K tokens
- **Output**: $0.0015 per 1K tokens

*Note: Actual costs may vary based on your GitHub Copilot plan*

## Analytics

### Available Metrics
- **Total Requests**: Lifetime request count
- **Total Tokens**: Sum of all tokens used
- **Average Tokens**: Mean tokens per request
- **Largest Prompt/Response**: Token count of largest interactions
- **Most Active Language**: Language with highest token usage
- **Most Active Workspace**: Workspace with highest usage
- **Tokens Per Day**: Daily breakdown
- **Tokens Per Workspace**: Workspace breakdown
- **Tokens Per Language**: Language breakdown

## Privacy & Security

✅ **Local-First**: All data stored locally on your machine
✅ **No Network Requests**: Extension doesn't send data to any server
✅ **No Authentication**: No login or external dependencies
✅ **Open Source**: Fully transparent code
✅ **Secure Storage**: SQLite with optional encryption

## Keyboard Shortcuts

- `Ctrl+Shift+P` → Open command palette
- Search "Copilot Tracker" for available commands

## Troubleshooting

### Extension Not Working
1. Check VS Code version: Must be 1.105+
2. Reload window: `Ctrl+R` (Cmd+R on macOS)
3. Check extension logs: View → Output → Select "Copilot Usage Tracker"

### Database Issues
1. Delete the database file and restart
2. Or use "Clear History" command
3. Check `tracker.databaseLocation` setting

### Missing Data
- Ensure `tracker.enabled` is true
- Check if requests are being made through the Ask command
- Verify database location has write permissions

### Notifications Not Showing
1. Check `tracker.showNotifications` is true
2. Check `tracker.notificationThresholds` setting
3. Verify notification permissions in VS Code

## Performance

- **Minimal Overhead**: Token estimation is fast (<1ms)
- **Background Updates**: Analytics calculate in background
- **Auto-Cleanup**: Old records pruned automatically
- **Efficient Storage**: SQLite with proper indexing

## Development

### Build
```bash
npm install
npm run build
```

### Development Mode
```bash
npm run dev
```

### Lint
```bash
npm run lint
```

### Architecture

```
src/
├── extension.ts              # Main entry point
├── commands/                 # Command implementations
│   ├── askCopilot.ts        # Ask command
│   ├── exportCsv.ts         # CSV export
│   ├── exportJson.ts        # JSON export
│   └── clearHistory.ts      # Clear history
├── tracker/                  # Core tracking logic
│   ├── database.ts          # SQLite management
│   ├── tokenEstimator.ts    # Token estimation
│   ├── statistics.ts        # Analytics
│   ├── sessionManager.ts    # Session tracking
│   ├── logger.ts            # Logging
│   └── models.ts            # TypeScript types
├── webview/                  # Dashboard UI
│   ├── dashboardProvider.ts # Webview provider
│   ├── dashboard.html       # HTML template
│   ├── dashboard.css        # Styles
│   └── dashboard.js         # Client logic
├── tree/                     # Sidebar tree view
│   └── usageTreeProvider.ts # Tree implementation
├── statusbar/                # Status bar
│   └── statusBar.ts         # Status bar implementation
└── utils/                    # Utility functions
    ├── date.ts              # Date utilities
    ├── format.ts            # Format utilities
    └── config.ts            # Configuration
```

## Technologies

- **TypeScript**: Strongly typed, production-ready code
- **VS Code API**: Latest extension APIs
- **SQLite**: Reliable local database
- **tiktoken**: Accurate token estimation
- **Webview API**: Modern dashboard UI

## Limitations

- Only tracks requests through the "Ask Copilot" command
- Token estimation based on model encoding (may vary slightly from actual)
- Requires VS Code 1.105 or later
- Database size depends on history retention setting

## Contributing

Contributions welcome! Please follow:
1. TypeScript strict mode
2. No `any` types
3. Proper error handling
4. Full documentation

## License

MIT

## Support

- **Issues**: GitHub Issues
- **Questions**: GitHub Discussions
- **Docs**: See README and inline code documentation

## Acknowledgments

- Token estimation powered by **tiktoken**
- Built with **VS Code Extension API**
- Database powered by **better-sqlite3**

---

**Happy tracking! 📊**

For more information, visit the [GitHub repository](https://github.com/rshardiwal/github-copilot-usage-tracker)
[Download VS Code Extension](copilot-usage-tracker-0.1.5.vsix)

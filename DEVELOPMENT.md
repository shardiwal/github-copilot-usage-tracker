# Development Guide

## Getting Started

### 📦 Complete Project Structure

`copilot-token-tracker/
├── src/
│   ├── extension.ts                      # Main entry point
│   ├── commands/
│   │   ├── askCopilot.ts                # Ask Copilot & record usage
│   │   ├── exportCsv.ts                 # CSV export with analytics
│   │   ├── exportJson.ts                # JSON export with metadata
│   │   └── clearHistory.ts              # Clear all records
│   ├── tracker/
│   │   ├── database.ts                  # SQLite with indexing
│   │   ├── tokenEstimator.ts            # tiktoken estimation
│   │   ├── statistics.ts                # Analytics calculations
│   │   ├── sessionManager.ts            # Session tracking
│   │   ├── storage.ts                   # VS Code state storage
│   │   ├── logger.ts                    # Comprehensive logging
│   │   └── models.ts                    # TypeScript interfaces
│   ├── webview/
│   │   ├── dashboardProvider.ts         # Webview provider
│   │   ├── dashboard.html               # Full dashboard UI
│   │   ├── dashboard.css                # Responsive styling
│   │   └── dashboard.js                 # Client-side logic
│   ├── tree/
│   │   └── usageTreeProvider.ts         # Sidebar tree view
│   ├── statusbar/
│   │   └── statusBar.ts                 # Token counter display
│   └── utils/
│       ├── date.ts                      # Date utilities
│       ├── format.ts                    # Formatting utilities
│       └── config.ts                    # Configuration utils
├── .vscode/
│   ├── launch.json                      # Debug configuration
│   ├── tasks.json                       # Build tasks
│   ├── settings.json                    # Dev environment
│   └── extensions.json                  # Recommended extensions
├── Configuration Files
│   ├── package.json                     # Complete manifest
│   ├── tsconfig.json                    # TypeScript strict config
│   ├── .eslintrc.json                   # ESLint rules
│   ├── .gitignore                       # Git ignore
│   └── .vscodeignore                    # Extension packaging
└── Documentation
    ├── README.md                        # User guide
    ├── DEVELOPMENT.md                   # Dev guide
    ├── CONTRIBUTING.md                  # Contribution guidelines
    ├── CHANGELOG.md                     # Version history
    └── LICENSE                          # MIT License`

### Prerequisites
- Node.js 16+
- npm or yarn
- VS Code 1.105+
- Git

### Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/copilot-usage-tracker
cd copilot-usage-tracker

# Install dependencies
npm install

# Build the extension
npm run build
```

## Development Workflow

### Running in Development Mode

```bash
# Terminal 1: Watch for changes
npm run dev

# Terminal 2: Open VS Code with extension
code --extensionDevelopmentPath=. .
```

Or use VS Code's built-in debug mode:
1. Press `F5` or go to Run → Start Debugging
2. This opens a new VS Code window with the extension loaded

### Building for Production

```bash
npm run build
```

This bundles the extension using esbuild and outputs to `out/extension.js`.

### Linting

```bash
npm run lint
```

This runs ESLint on all TypeScript files. Use `--fix` to auto-fix issues:

```bash
npm run lint -- --fix
```

## Project Structure

```
src/
├── extension.ts              # Main entry point
├── commands/                 # Command implementations
│   ├── askCopilot.ts
│   ├── exportCsv.ts
│   ├── exportJson.ts
│   └── clearHistory.ts
├── tracker/                  # Core tracking
│   ├── database.ts          # SQLite operations
│   ├── tokenEstimator.ts    # Token estimation
│   ├── statistics.ts        # Analytics
│   ├── sessionManager.ts    # Session tracking
│   ├── storage.ts           # VS Code state storage
│   ├── logger.ts            # Logging
│   └── models.ts            # TypeScript interfaces
├── webview/                  # Dashboard UI
│   ├── dashboardProvider.ts
│   ├── dashboard.html
│   ├── dashboard.css
│   └── dashboard.js
├── tree/                     # Sidebar tree view
│   └── usageTreeProvider.ts
├── statusbar/                # Status bar
│   └── statusBar.ts
└── utils/                    # Utilities
    ├── date.ts
    ├── format.ts
    └── config.ts
```

## Code Standards

### TypeScript

- Use strict mode (enforced in tsconfig.json)
- No `any` types - use proper typing
- Use interfaces for data contracts
- Use async/await for asynchronous operations

Example:
```typescript
export interface UsageRecord {
  id: number;
  timestamp: string;
  totalTokens: number;
  // ... more properties
}

export async function getRecords(): Promise<UsageRecord[]> {
  return database.getUsageRecords();
}
```

### Error Handling

Always use try-catch and log errors:
```typescript
try {
  const result = await someOperation();
  return result;
} catch (error) {
  logger.error("Failed to do something", error);
  throw error; // or handle gracefully
}
```

### Comments

Add comments for complex logic:
```typescript
// This algorithm uses quicksort for O(n log n) performance
private quickSort(arr: number[]): number[] {
  // ...
}
```

Document public methods:
```typescript
/**
 * Calculate token usage for given text
 * @param text - The text to estimate tokens for
 * @returns Estimated token count
 */
public estimateTokens(text: string): number {
  // ...
}
```

### File Organization

- One exported class/interface per file when possible
- Related utilities can be grouped
- Keep files under 400 lines when possible
- Export public APIs, keep helpers private

## Adding Features

### Adding a New Command

1. Create command handler in `src/commands/`:
```typescript
// src/commands/myCommand.ts
export async function myCommand(context: vscode.ExtensionContext): Promise<void> {
  // Implementation
}
```

2. Register in `src/extension.ts`:
```typescript
const disposable = vscode.commands.registerCommand(
  "copilot-tracker.myCommand",
  () => myCommand(context)
);
context.subscriptions.push(disposable);
```

3. Add to `package.json` commands section:
```json
{
  "command": "copilot-tracker.myCommand",
  "title": "Copilot Tracker: My Command"
}
```

### Adding a Setting

1. Add to `package.json` configuration:
```json
{
  "tracker.mySetting": {
    "type": "string",
    "default": "value",
    "description": "Description of setting"
  }
}
```

2. Access in code via `ConfigUtils`:
```typescript
import { ConfigUtils } from "../utils/config";

const value = ConfigUtils.getSettings().mySetting;
```

### Adding Database Operations

1. Add method to `database.ts`:
```typescript
public getSpecificData(filter: string): any[] {
  if (!this.db) throw new Error("Database not initialized");
  
  try {
    const stmt = this.db.prepare("SELECT * FROM usage WHERE filter = ?");
    return stmt.all(filter);
  } catch (error) {
    logger.error("Error getting data", error);
    return [];
  }
}
```

2. Use with Statistics for analytics:
```typescript
// In statistics.ts
public getFilteredAnalytics(filter: string): Analytics {
  const records = this.database.getSpecificData(filter);
  // Process and return
}
```

## Testing

### Manual Testing Checklist

- [ ] Extension activates without errors
- [ ] Commands execute successfully
- [ ] Database creates and stores records
- [ ] Tree view shows correct data
- [ ] Status bar updates correctly
- [ ] Dashboard loads and displays data
- [ ] Export functions create valid files
- [ ] Settings changes apply correctly

### Debug Logging

Access extension logs via:
1. View → Output
2. Select "Copilot Usage Tracker" from dropdown

Set log level:
```typescript
logger.debug("Detailed message");
logger.info("Information");
logger.warn("Warning");
logger.error("Error", errorObject);
```

## Building for Release

### Prepare for Release

1. Update version in `package.json`
2. Update `CHANGELOG.md` with changes
3. Run linter: `npm run lint`
4. Build: `npm run build`
5. Test in VS Code

### Package Extension

```bash
# Install vsce globally
npm install -g vsce

# Package the extension
vsce package
```

This creates a `.vsix` file that can be installed in VS Code or published to the marketplace.

## Common Tasks

### Debug a Specific Issue

1. Add `logger.debug()` calls around suspicious code
2. Open extension logs: View → Output
3. Reload extension: Ctrl+R in development window
4. Observe log output

### Update Dependencies

```bash
# Check for updates
npm outdated

# Update packages (carefully)
npm update

# Update specific package
npm install package@latest
```

### Add a New Utility Function

1. Add to appropriate file in `src/utils/`
2. Export from the file
3. Import where needed
4. Add documentation comment

```typescript
// src/utils/format.ts
export function myNewUtility(input: string): string {
  /**
   * Description of what this does
   */
  return result;
}
```

## Performance Considerations

- Token estimation happens synchronously - keep it fast
- Database queries use indexes for O(log n) performance
- Dashboard data sent to webview in JSON format
- Large datasets paginated (20 items per page)
- Statistics calculated on demand, not stored

## Troubleshooting Development

### Extension Not Loading
- Check for TypeScript errors: `npm run build`
- Check extension logs: View → Output
- Reload: Ctrl+R

### Database Errors
- Delete `.vscode-copilot-tracker` directory
- Restart extension

### Webview Issues
- Clear VS Code cache
- Inspect webview: Right-click → Inspect
- Check browser console for JavaScript errors

### Performance Issues
- Profile with VS Code's built-in profiler
- Check database query performance
- Monitor extension host CPU/memory

## Resources

- [VS Code Extension API](https://code.visualstudio.com/api)
- [VS Code Webview API](https://code.visualstudio.com/api/extension-guides/webview)
- [better-sqlite3 Docs](https://github.com/WiseLibs/better-sqlite3)
- [tiktoken Docs](https://github.com/openai/tiktoken)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on:
- Code style
- Commit messages
- Pull request process
- Testing requirements

---

Happy coding! 🚀

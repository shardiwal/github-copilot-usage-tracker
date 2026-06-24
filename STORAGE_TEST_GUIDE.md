# 🧪 Storage Test Guide - Copilot Usage Tracker

## Quick Diagnosis

I've created a **Diagnostic Command** to help identify if the extension is properly storing usage data. This will test every part of the storage system.

### How to Run the Diagnostic Test

1. **Press `F5`** to start the extension in debug mode (or use the Run command)
2. **Open the Command Palette** (`Ctrl+Shift+P` or `Cmd+Shift+P`)
3. **Search for**: `Copilot Tracker: Run Diagnostics`
4. **Press Enter** to execute

The diagnostic will create an output panel showing:
- ✅ Session information
- ✅ Database connection status  
- ✅ All stored records
- ✅ Statistics calculations
- ✅ Test record creation and verification

---

## What the Diagnostic Tests

### Test 1: Session Information
Checks if the session manager is properly initialized and tracking sessions.

### Test 2: Database Connection
Verifies the database can be opened and queried.

### Test 3: Retrieve Records
Shows all records currently stored in the database.

**⚠️ If this shows 0 records:** The database isn't receiving any data.

### Test 4: Statistics Calculation
Verifies that statistics can be calculated from stored records.

### Test 5: Today's Statistics
Shows today's specific statistics.

### Test 6: Add Test Record
Adds a test record marked with `[DIAGNOSTIC TEST]` label.

### Test 7: Verify Persistence
Confirms the test record was actually saved to the database.

---

## Manual Storage Test Steps

If you want to manually test storage:

### Step 1: Add Usage Data
1. Open the Command Palette
2. Run: `Copilot Tracker: Ask Copilot`
3. Type any question (e.g., "Hello Copilot")
4. A test response will be recorded with token usage

### Step 2: Check the Dashboard
1. Click the "Copilot Usage" sidebar icon
2. Look for the dashboard panel
3. Verify that tokens are displayed

### Step 3: Check Tree View
1. Look at the sidebar tree view under "Usage Analytics"
2. Should show today's statistics

### Step 4: Run Diagnostics
1. Execute the diagnostic command (see above)
2. Look for the test record in the output

---

## Database Storage Location

The database file is stored in VS Code's global storage directory:

**Windows:**
```
%APPDATA%\Code\User\globalStorage\vscodedev.copilot-usage-tracker\
```

**macOS:**
```
~/Library/Application Support/Code/User/globalStorage/vscodedev.copilot-usage-tracker/
```

**Linux:**
```
~/.config/Code/User/globalStorage/vscodedev.copilot-usage-tracker/
```

The file is named: `usage-tracker.db`

---

## Troubleshooting Storage Issues

### Issue 1: Dashboard Shows No Data

**Check:**
1. Run the diagnostic command
2. If "Total Records in Database" is 0, proceed to Issue 2

**Solutions:**
- Make sure tracking is enabled in settings: `tracker.enabled`
- Try using the "Ask Copilot" command to manually add a record
- Check the extension logs in the Output panel

### Issue 2: Data Not Being Recorded

**Possible Causes:**
1. **Extension not activated** - Reload VS Code window
2. **Database not initialized** - Check error logs
3. **Permissions issue** - Check file permissions on globalStorage directory

**Check Logs:**
1. Open Output panel (`Ctrl+Shift+U`)
2. Select "Copilot Usage Tracker" channel
3. Look for error messages

### Issue 3: Data Appears in Diagnostic but Not in Dashboard

**Check:**
1. Run diagnostic command
2. If data exists but dashboard is empty:
   - Click the refresh button in the dashboard
   - Or close/reopen the dashboard panel

**Possible Causes:**
- Dashboard needs to be refreshed after data is added
- Webview communication issue

### Issue 4: Database File Keeps Growing Very Large

**Normal Behavior:**
- Each record is ~500-1000 bytes
- 1000 records = ~1 MB
- Growing over time is expected

**If Too Large:**
- Use "Copilot Tracker: Clear History" command
- Or set a retention policy in settings

---

## What to Check if Storage Isn't Working

### 1. Database File Exists
Navigate to the storage location (see "Database Storage Location" above) and verify:
- [ ] Directory exists: `globalStorage/vscodedev.copilot-usage-tracker/`
- [ ] File exists: `usage-tracker.db`
- [ ] File size is > 0 KB

### 2. Check Permissions
Make sure VS Code has write permissions to the globalStorage directory:

**Windows:**
```powershell
# Check file permissions
Get-Acl "C:\Users\YourUsername\AppData\Roaming\Code\User\globalStorage"
```

### 3. Extension Logs
Enable debug logging:

1. Open Settings (`Ctrl+,`)
2. Search: `tracker.debug`
3. Enable debug logging
4. Check output panel for detailed logs

### 4. Settings are Enabled
1. Open Settings (`Ctrl+,`)
2. Verify these are enabled:
   - `tracker.enabled` = true
   - `tracker.showStatusBar` = true (optional but helpful)

---

## Testing Data Flow

### Flow 1: Manual Test via Ask Copilot

```
User runs "Ask Copilot" command
    ↓
Input dialog opens
    ↓
User types a question
    ↓
Token estimation calculates input/output tokens
    ↓
Session manager records token usage
    ↓
Database receives record via addUsageRecord()
    ↓
Record is written to disk (save() called)
    ↓
Dashboard fetches records and displays data
```

### Flow 2: Real Copilot Integration (when implemented)

```
Real Copilot request happens
    ↓
Extension intercepts tokens/response
    ↓
Session manager records usage
    ↓
Database stores record
    ↓
Dashboard updates automatically
```

---

## Success Indicators ✅

When storage is working correctly:

- [ ] Diagnostic command shows records in database
- [ ] Dashboard displays token statistics
- [ ] Tree view shows usage analytics
- [ ] Status bar shows token count
- [ ] Records persist after restarting VS Code
- [ ] Each "Ask Copilot" command creates a new record

---

## Next Steps if Everything Works

If the diagnostic shows data is being stored but the dashboard still isn't showing it:

1. **Check Dashboard Code** - Look at `src/webview/dashboardProvider.ts`
2. **Verify Message Passing** - Check `src/webview/dashboard.js`
3. **Check for JavaScript Errors** - Right-click dashboard > Inspect Element

If diagnostics show NO data is being stored:

1. **Check Database Initialization** - Look at logs during extension activation
2. **Verify addUsageRecord** - Check if records are actually being inserted
3. **Check Session Manager** - Verify sessions are being created properly

---

## Getting More Help

If you're still having issues:

1. **Run Diagnostic Command** - Get the full output
2. **Check Logs** - Output panel > Copilot Usage Tracker
3. **Share Output** - Include diagnostic output when reporting issues
4. **Enable Debug Mode** - Settings > `tracker.debug` = true

---

Created: 2026-06-24
Last Updated: When diagnostic command was added

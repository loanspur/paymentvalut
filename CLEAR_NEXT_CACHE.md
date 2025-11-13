# How to Clear Next.js Build Cache

## Windows PowerShell Commands

### Step 1: Stop the Development Server
If you have `npm run dev` or `next dev` running:
- Press `Ctrl+C` in the terminal where it's running
- Or close the terminal window

### Step 2: Remove .next Directory

**Option A: Using PowerShell (Recommended)**
```powershell
# Stop any Node processes that might be locking files
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force

# Remove .next directory
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue

# Verify it's removed
if (Test-Path .next) {
    Write-Host "Warning: .next still exists. Try closing all terminals and VS Code."
} else {
    Write-Host "Success: .next directory removed"
}
```

**Option B: Using File Explorer**
1. Close all terminals and VS Code
2. Open File Explorer
3. Navigate to your project folder
4. Delete the `.next` folder manually

**Option C: Using Command Prompt**
```cmd
taskkill /F /IM node.exe
rmdir /s /q .next
```

### Step 3: Restart Development Server
```bash
npm run dev
```

## Why Clear the Cache?

The `.next` directory contains:
- Compiled pages and components
- Static assets
- Build artifacts
- Cached data

Clearing it forces Next.js to rebuild everything from scratch, which can fix:
- RSC payload errors
- Hydration mismatches
- Stale component code
- Build cache issues


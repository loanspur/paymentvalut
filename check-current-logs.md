# Check Current Balance Monitor Logs

## Steps to See Real Balance Monitor Logs:

### 1. **Trigger the Balance Monitor**
- Go to `http://localhost:3000/transactions`
- Click "Trigger Balance Check" button
- Wait for the process to complete (up to 40 seconds)

### 2. **Check Supabase Logs**
- Go to your Supabase Dashboard
- Navigate to: **Functions** → **balance-monitor** → **Logs**
- You should now see detailed logs like:
  ```
  ✅ [Balance Monitor] Starting balance check for partner: Kulman Group Limited
  🔑 [Balance Monitor] Retrieved credentials for partner: Kulman Group Limited
  📡 [Balance Monitor] Making M-Pesa API call for partner: Kulman Group Limited
  ⏳ [Balance Monitor] Waiting for M-Pesa callback...
  ```

### 3. **What to Look For**
- **Credential retrieval logs** - Should show successful credential decryption
- **M-Pesa API call logs** - Should show the actual API request being made
- **Error logs** - If there are any credential or API issues
- **Callback logs** - Should show when M-Pesa responds

### 4. **Expected Log Flow**
```
✅ [Balance Monitor] Starting balance check for partner: [Partner Name]
🔑 [Balance Monitor] Retrieved credentials for partner: [Partner Name]
📡 [Balance Monitor] Making M-Pesa API call for partner: [Partner Name]
⏳ [Balance Monitor] Waiting for M-Pesa callback...
✅ [Balance Monitor] Balance check completed for partner: [Partner Name]
```

### 5. **If You See Errors**
- **"Security credential not found"** - The partner needs proper encrypted credentials
- **"Failed to retrieve M-Pesa credentials"** - Credential vault issue
- **"M-Pesa API call failed"** - API endpoint or request format issue

## Current Status:
- ✅ Balance monitor function is deployed (version 64)
- ✅ Function is running and listening
- ⏳ Waiting for trigger to see actual execution logs


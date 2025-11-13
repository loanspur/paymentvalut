# 🔧 Fix NCBA Token Path 404 Error

## Problem Identified

Your server logs show:
```
requestedUrl: 'https://openbankingtest.api.ncbagroup.com/api/v1/Auth/generate-token'
status: 404
```

The URL is incorrect because the **token path is set as an absolute path** (`/api/v1/Auth/generate-token`), which replaces the base URL path instead of appending to it.

## Root Cause

When using `new URL(path, base)` in JavaScript:
- **Absolute path** (starts with `/`): Replaces the base URL path
  - Base: `https://openbankingtest.api.ncbagroup.com/test/apigateway/`
  - Path: `/api/v1/Auth/generate-token`
  - Result: `https://openbankingtest.api.ncbagroup.com/api/v1/Auth/generate-token` ❌

- **Relative path** (no leading `/`): Appends to the base URL
  - Base: `https://openbankingtest.api.ncbagroup.com/test/apigateway/`
  - Path: `auth/token`
  - Result: `https://openbankingtest.api.ncbagroup.com/test/apigateway/auth/token` ✅

## Solution

### Step 1: Check Current Settings

Run this SQL query in your Supabase SQL Editor:

```sql
SELECT 
  setting_key,
  setting_value,
  CASE 
    WHEN setting_key LIKE '%_path' AND setting_value LIKE '/%' THEN '❌ WRONG: Has leading slash'
    WHEN setting_key LIKE '%_path' AND setting_value NOT LIKE '/%' THEN '✅ CORRECT: Relative path'
    ELSE 'N/A'
  END AS status
FROM system_settings
WHERE setting_key IN (
  'ncba_ob_environment',
  'ncba_ob_uat_base_url',
  'ncba_ob_token_path',
  'ncba_ob_float_purchase_path'
)
ORDER BY setting_key;
```

### Step 2: Fix the Token Path

The token path should be **relative** (no leading slash). Common correct values:

**Option 1: Simple path** (most common)
```sql
UPDATE system_settings
SET setting_value = 'auth/token'
WHERE setting_key = 'ncba_ob_token_path';
```

**Option 2: API versioned path**
```sql
UPDATE system_settings
SET setting_value = 'api/v1/Token'
WHERE setting_key = 'ncba_ob_token_path';
```

**Option 3: Just the endpoint name**
```sql
UPDATE system_settings
SET setting_value = 'Token'
WHERE setting_key = 'ncba_ob_token_path';
```

### Step 3: Fix Float Purchase Path (if needed)

Also ensure the float purchase path is relative:

```sql
UPDATE system_settings
SET setting_value = TRIM(LEADING '/' FROM setting_value)
WHERE setting_key = 'ncba_ob_float_purchase_path'
  AND setting_value LIKE '/%';
```

Or set it explicitly:
```sql
UPDATE system_settings
SET setting_value = 'api/v1/FloatPurchase/floatpurchase'
WHERE setting_key = 'ncba_ob_float_purchase_path';
```

### Step 4: Verify the Fix

Check what URLs will be constructed:

```sql
SELECT 
  s1.setting_value AS base_url,
  s2.setting_value AS token_path,
  CONCAT(
    TRIM(TRAILING '/' FROM s1.setting_value),
    '/',
    s2.setting_value
  ) AS constructed_token_url
FROM system_settings s1
CROSS JOIN system_settings s2
WHERE s1.setting_key = 'ncba_ob_uat_base_url'
  AND s2.setting_key = 'ncba_ob_token_path';
```

**Expected Result:**
- Base URL: `https://openbankingtest.api.ncbagroup.com/test/apigateway`
- Token Path: `auth/token` (or similar, **no leading slash**)
- Constructed URL: `https://openbankingtest.api.ncbagroup.com/test/apigateway/auth/token`

### Step 5: Test the Fix

After updating, test the token endpoint:

1. **Via your application**: Try the float purchase flow again
2. **Via API directly**: 
   ```bash
   curl -X POST https://your-domain.com/api/ncba/ob/token \
     -H "Content-Type: application/json"
   ```

## Quick Fix Script

Run this complete fix script:

```sql
-- Remove leading slashes from paths
UPDATE system_settings
SET setting_value = TRIM(LEADING '/' FROM setting_value)
WHERE setting_key IN ('ncba_ob_token_path', 'ncba_ob_float_purchase_path')
  AND setting_value LIKE '/%';

-- Verify
SELECT 
  setting_key,
  setting_value,
  CASE 
    WHEN setting_value LIKE '/%' THEN '❌ Still has leading slash'
    ELSE '✅ Fixed: Relative path'
  END AS status
FROM system_settings
WHERE setting_key IN ('ncba_ob_token_path', 'ncba_ob_float_purchase_path');
```

## Important Notes

1. **Base URL should end with `/`**: 
   - ✅ `https://openbankingtest.api.ncbagroup.com/test/apigateway/`
   - ❌ `https://openbankingtest.api.ncbagroup.com/test/apigateway`

2. **Paths should NOT start with `/`**:
   - ✅ `auth/token`
   - ❌ `/auth/token`

3. **Check NCBA Documentation**: The exact path may vary. Contact NCBA support or check their API documentation for the correct endpoint path.

4. **Environment**: Make sure you're using the correct environment (UAT vs PROD) and the corresponding base URL.

## What to Check with NCBA

If the fix doesn't work, verify with NCBA:

1. **Correct token endpoint path** for UAT environment
2. **Correct base URL** for UAT environment
3. **IP whitelisting** - Your server IP may need to be whitelisted
4. **Subscription key** - Verify it's correct for UAT

## After Fixing

Once you've updated the token path:

1. **Restart your application** (if needed)
2. **Test token generation** via `/api/ncba/ob/token`
3. **Test float purchase** flow
4. **Check server logs** to verify the correct URL is being constructed

The logs should now show:
```
constructedUrl: 'https://openbankingtest.api.ncbagroup.com/test/apigateway/auth/token'
```

Instead of:
```
constructedUrl: 'https://openbankingtest.api.ncbagroup.com/api/v1/Auth/generate-token'
```


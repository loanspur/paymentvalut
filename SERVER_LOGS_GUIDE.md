# 📋 Server Logs Guide - Where to Find Your Application Logs

This guide explains where to find your Next.js server logs based on your deployment platform.

## 🎯 Quick Answer

**Your server logs (console.log, console.error) are located in:**

### If Deployed on **Vercel**:
1. **Vercel Dashboard** → Your Project → **Deployments** → Click on a deployment → **Functions** tab
2. **Vercel Dashboard** → Your Project → **Logs** tab (real-time logs)
3. **Vercel CLI**: `vercel logs [deployment-url]` or `vercel logs --follow`

### If Deployed on **Digital Ocean App Platform**:
1. **Digital Ocean Dashboard** → Your App → **Runtime Logs** tab
2. **Digital Ocean Dashboard** → Your App → **Deployments** → Click deployment → **View Logs**

### If Running Locally:
- **Terminal/Console** where you ran `npm run dev` or `npm start`

---

## 📊 Different Types of Logs

### 1. **Supabase Logs** (Database API Logs)
- **Location**: Supabase Dashboard → **Logs** section (what you're currently viewing)
- **Contains**: Database queries, API requests to Supabase REST API
- **Example**: `GET /rest/v1/wallet_transactions`, `PATCH /rest/v1/otp_validations`

### 2. **Next.js Server Logs** (Application Logs)
- **Location**: Your deployment platform (Vercel/Digital Ocean)
- **Contains**: `console.log()`, `console.error()` from your API routes
- **Example**: NCBA API calls, error messages, debug information

### 3. **Browser Console Logs** (Client-Side)
- **Location**: Browser DevTools → Console tab
- **Contains**: Client-side JavaScript errors and logs

---

## 🔍 How to Access Logs by Platform

### **Vercel** (Most Common)

#### Method 1: Vercel Dashboard (Web UI)
1. Go to [https://vercel.com/dashboard](https://vercel.com/dashboard)
2. Select your project (`paymentvalut` or `eazzypay`)
3. Click on **"Logs"** tab (top navigation)
   - Shows real-time logs from all functions
   - Filter by function, time range, or search
4. Or go to **"Deployments"** → Click a deployment → **"Functions"** tab
   - Shows logs for that specific deployment

#### Method 2: Vercel CLI
```bash
# Install Vercel CLI (if not installed)
npm i -g vercel

# View logs for a specific deployment
vercel logs [deployment-url]

# Follow logs in real-time
vercel logs --follow

# View logs for a specific function
vercel logs --function=api/wallet/float/purchase/confirm
```

#### Method 3: Vercel API
```bash
# Get logs via API (requires Vercel token)
curl "https://api.vercel.com/v2/deployments/[deployment-id]/events" \
  -H "Authorization: Bearer $VERCEL_TOKEN"
```

---

### **Digital Ocean App Platform**

#### Method 1: Digital Ocean Dashboard
1. Go to [https://cloud.digitalocean.com/apps](https://cloud.digitalocean.com/apps)
2. Select your app
3. Click on **"Runtime Logs"** tab
   - Shows real-time application logs
   - Includes all `console.log()` and `console.error()` output
4. Or go to **"Deployments"** → Click a deployment → **"View Logs"**
   - Shows logs for that specific deployment

#### Method 2: Digital Ocean CLI (doctl)
```bash
# Install doctl (if not installed)
# macOS: brew install doctl
# Linux: See https://docs.digitalocean.com/reference/doctl/how-to/install/

# View app logs
doctl apps logs [app-id] --type=run

# Follow logs in real-time
doctl apps logs [app-id] --type=run --follow
```

---

### **Local Development**

When running locally (`npm run dev`):
- **Logs appear in the terminal** where you started the dev server
- All `console.log()`, `console.error()` output is visible there
- Example:
  ```bash
  npm run dev
  # Logs will appear in this terminal
  ```

---

## 🔎 Finding Specific Logs

### To Find NCBA API Error Logs:

1. **Go to your deployment platform logs** (Vercel or Digital Ocean)
2. **Search for**: 
   - `"NCBA"`
   - `"float purchase"`
   - `"404"`
   - `"HTML error page"`
3. **Filter by time**: Look for logs around the time you made the request
4. **Look for these log entries**:
   ```
   "Making NCBA float purchase request:"
   "NCBA float purchase endpoint returned HTML instead of JSON:"
   "NCBA float purchase failed:"
   ```

### To Find OTP Validation Logs:

1. **Search for**:
   - `"OTP"`
   - `"otp_reference"`
   - `"OTP validation updated"`
2. **Check both**:
   - Server logs (Vercel/Digital Ocean)
   - Supabase logs (for database operations)

---

## 📝 What Gets Logged

Based on your code in `app/api/wallet/float/purchase/confirm/route.ts`, these logs are generated:

### ✅ **Always Logged**:
- `"Requesting NCBA token:"` - Token request details
- `"NCBA token obtained successfully:"` - Token acquisition success
- `"Making NCBA float purchase request:"` - Float purchase request details
- `"NCBA float purchase successful:"` - Success response

### ⚠️ **Error Logs**:
- `"NCBA token request failed:"` - Token acquisition failure
- `"NCBA token endpoint returned HTML instead of JSON:"` - HTML error page
- `"NCBA float purchase endpoint returned HTML instead of JSON:"` - 404 HTML page
- `"NCBA float purchase failed:"` - API call failure
- `"Error updating OTP validation status:"` - OTP update errors

---

## 🛠️ Tips for Debugging

### 1. **Enable More Detailed Logging**
Your `next.config.js` already preserves `console.error` and `console.warn` in production:
```javascript
removeConsole: process.env.NODE_ENV === 'production' ? {
  exclude: ['error', 'warn'],
} : false,
```

### 2. **Add Request IDs**
Consider adding request IDs to correlate logs:
```typescript
const requestId = crypto.randomUUID()
console.log(`[${requestId}] Making NCBA float purchase request:`, {...})
```

### 3. **Use Structured Logging**
Consider using a logging service for better log management:
- **Logtail** (recommended for Next.js)
- **Datadog**
- **Sentry** (for errors)

### 4. **Check Log Retention**
- **Vercel**: Logs retained for 30 days (Pro plan) or 7 days (Hobby)
- **Digital Ocean**: Logs retained based on your plan
- **Supabase**: Logs retained based on your plan

---

## 🚀 Quick Commands

### Vercel:
```bash
# View recent logs
vercel logs --follow

# View logs for specific function
vercel logs --function=api/wallet/float/purchase/confirm
```

### Digital Ocean:
```bash
# View app logs
doctl apps logs [app-id] --type=run --follow
```

### Local:
```bash
# Run dev server and see logs
npm run dev

# Or run production build locally
npm run build
npm start
```

---

## 📍 Your Current Setup

Based on your codebase:
- **Domain**: `eazzypay.online`
- **Platform**: Likely **Vercel** or **Digital Ocean App Platform**
- **Logs Location**: Check your deployment platform dashboard

**To find your exact deployment platform:**
1. Check where `eazzypay.online` DNS points to
2. Or check your hosting provider dashboard
3. Or check your GitHub repository for deployment workflows

---

## 🎯 Next Steps

1. **Identify your deployment platform** (Vercel or Digital Ocean)
2. **Access the logs dashboard** using the methods above
3. **Search for "NCBA"** to find the 404 error logs
4. **Check the `ncba_url` and `ncba_final_url`** in the error logs to see what URL was constructed
5. **Verify the URL matches** your NCBA API documentation

The enhanced error logging we added will show you:
- The exact URL being constructed
- Whether baseUrl ends with `/`
- Whether path starts with `/`
- The final constructed URL
- The HTML error response preview

This will help identify why you're getting the 404 error!


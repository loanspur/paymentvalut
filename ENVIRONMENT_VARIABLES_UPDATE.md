# 🔧 Environment Variables Update for Custom Domain

## 📋 Required Environment Variables

### 1. Vercel Environment Variables
Add these to your Vercel project settings:

```bash
# App Configuration
NEXT_PUBLIC_APP_URL=https://eazzypay.online
NEXT_PUBLIC_APP_DOMAIN=eazzypay.online

# Existing Supabase Variables (keep these)
NEXT_PUBLIC_SUPABASE_URL=https://mapgmmiobityxaaevomp.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Existing M-Pesa Variables (keep these)
MPESA_CONSUMER_KEY=your_mpesa_consumer_key
MPESA_CONSUMER_SECRET=your_mpesa_consumer_secret
MPESA_SHORTCODE=your_mpesa_shortcode
MPESA_PASSKEY=your_mpesa_passkey

# Existing NCBA Variables (keep these)
NCBA_CONSUMER_KEY=your_ncba_consumer_key
NCBA_CONSUMER_SECRET=your_ncba_consumer_secret
NCBA_SHORTCODE=your_ncba_shortcode

# Cron Job Security (optional)
CRON_SECRET=your_cron_secret
```

### 2. Local Development (.env.local)
Update your local `.env.local` file:

```bash
# App Configuration
NEXT_PUBLIC_APP_URL=https://eazzypay.online
NEXT_PUBLIC_APP_DOMAIN=eazzypay.online

# For local development, you might want to use localhost
# NEXT_PUBLIC_APP_URL=http://localhost:3000
# NEXT_PUBLIC_APP_DOMAIN=localhost:3000

# Keep all your existing variables...
```

## 🔧 How to Update Vercel Environment Variables

### Method 1: Vercel Dashboard
1. **Go to Vercel Dashboard**:
   - Visit [https://vercel.com/dashboard](https://vercel.com/dashboard)
   - Select your Payment Vault project

2. **Access Environment Variables**:
   - Go to **Settings** → **Environment Variables**

3. **Add New Variables**:
   - Click **Add New**
   - Name: `NEXT_PUBLIC_APP_URL`
   - Value: `https://eazzypay.online`
   - Environment: Production, Preview, Development
   - Click **Save**

   - Click **Add New**
   - Name: `NEXT_PUBLIC_APP_DOMAIN`
   - Value: `eazzypay.online`
   - Environment: Production, Preview, Development
   - Click **Save**

### Method 2: Vercel CLI
```bash
# Add environment variables via CLI
vercel env add NEXT_PUBLIC_APP_URL
# Enter: https://eazzypay.online
# Select: Production, Preview, Development

vercel env add NEXT_PUBLIC_APP_DOMAIN
# Enter: eazzypay.online
# Select: Production, Preview, Development
```

## 📊 Environment Variables Checklist

### ✅ Required for Custom Domain
- [ ] `NEXT_PUBLIC_APP_URL=https://eazzypay.online`
- [ ] `NEXT_PUBLIC_APP_DOMAIN=eazzypay.online`

### ✅ Existing Variables (Keep These)
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `MPESA_CONSUMER_KEY`
- [ ] `MPESA_CONSUMER_SECRET`
- [ ] `MPESA_SHORTCODE`
- [ ] `MPESA_PASSKEY`
- [ ] `NCBA_CONSUMER_KEY`
- [ ] `NCBA_CONSUMER_SECRET`
- [ ] `NCBA_SHORTCODE`

### ✅ Optional Variables
- [ ] `CRON_SECRET` (for cron job security)

## 🧪 Testing Environment Variables

### 1. Local Testing
```bash
# Start development server
npm run dev

# Check if variables are loaded
node -e "console.log('APP_URL:', process.env.NEXT_PUBLIC_APP_URL)"
```

### 2. Production Testing
After deploying to Vercel:
```bash
# Check production environment
curl https://eazzypay.online/api/health
```

## 🔄 Code Updates Required

### 1. Update API Routes
Any API routes that use hardcoded URLs should be updated:

```typescript
// Before
const webhookUrl = 'https://your-vercel-app.vercel.app/api/webhook'

// After
const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhook`
```

### 2. Update Frontend Code
Update any hardcoded URLs in your frontend:

```typescript
// Before
const apiUrl = 'https://your-vercel-app.vercel.app/api'

// After
const apiUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api`
```

### 3. Update External Service Configurations
Update webhook URLs in external services:

**Mifos X**:
- Update webhook URL to: `https://eazzypay.online/api/mifos/webhook/loan-approval`

**NCBA**:
- Update callback URL to: `https://eazzypay.online/api/ncba/stk-callback`

## 🚨 Common Issues

### 1. Environment Variables Not Loading
- **Issue**: Variables not available in client-side code
- **Solution**: Ensure variables start with `NEXT_PUBLIC_`

### 2. Mixed Content Warnings
- **Issue**: HTTP resources on HTTPS site
- **Solution**: Update all URLs to use HTTPS

### 3. CORS Issues
- **Issue**: API calls failing due to domain mismatch
- **Solution**: Update CORS settings in API routes

## 🎯 Verification Steps

### 1. Check Environment Variables
```bash
# In your browser console
console.log('APP_URL:', process.env.NEXT_PUBLIC_APP_URL)
console.log('APP_DOMAIN:', process.env.NEXT_PUBLIC_APP_DOMAIN)
```

### 2. Test API Endpoints
```bash
# Test main API
curl https://eazzypay.online/api/health

# Test specific endpoints
curl https://eazzypay.online/api/partners
curl https://eazzypay.online/api/wallet
```

### 3. Test Webhooks
- **Mifos X**: Test webhook endpoint
- **NCBA**: Test STK callback endpoint
- **Cron Jobs**: Verify scheduled tasks work

## 🎉 Expected Results

After updating environment variables:
- ✅ **Custom Domain**: `https://eazzypay.online` works
- ✅ **Environment Variables**: Loaded correctly
- ✅ **API Endpoints**: Accessible via new domain
- ✅ **Webhooks**: Working with new domain
- ✅ **Cron Jobs**: Executing successfully
- ✅ **SSL Certificate**: Active and working

---

## 🚀 Ready to Update!

Follow the steps above to update your environment variables for the custom domain. After updating:

1. **Deploy to Vercel**: `vercel --prod`
2. **Test the new domain**: Visit `https://eazzypay.online`
3. **Verify all functionality**: Test login, APIs, webhooks
4. **Update external services**: Configure webhooks and callbacks

Your Payment Vault will then be fully configured for the custom domain! 🎉


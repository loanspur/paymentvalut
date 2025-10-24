# 🌐 Custom Domain Setup Guide - eazzypay.online

## 🎯 Overview
This guide will help you set up your custom domain `eazzypay.online` on Vercel and update your code accordingly.

## 📋 Step-by-Step Setup

### 1. Vercel Domain Configuration

#### A. Add Domain to Vercel Project
1. **Go to Vercel Dashboard**:
   - Visit [https://vercel.com/dashboard](https://vercel.com/dashboard)
   - Select your Payment Vault project

2. **Add Custom Domain**:
   - Go to **Settings** → **Domains**
   - Click **Add Domain**
   - Enter: `eazzypay.online`
   - Click **Add**

3. **Configure DNS Records**:
   Vercel will provide you with DNS records to add to your domain registrar:

   **For Root Domain (eazzypay.online)**:
   ```
   Type: A
   Name: @
   Value: 76.76.19.61
   ```

   **For WWW Subdomain (www.eazzypay.online)**:
   ```
   Type: CNAME
   Name: www
   Value: cname.vercel-dns.com
   ```

#### B. Domain Registrar Configuration
1. **Go to your domain registrar** (where you bought eazzypay.online)
2. **Access DNS management**
3. **Add the DNS records** provided by Vercel
4. **Wait for propagation** (can take 24-48 hours)

### 2. Code Updates Required

#### A. Update Environment Variables
Update your `.env` files to include the new domain:

```bash
# Add to .env.local and production environment
NEXT_PUBLIC_APP_URL=https://eazzypay.online
NEXT_PUBLIC_APP_DOMAIN=eazzypay.online
```

#### B. Update Next.js Configuration
Update `next.config.js` to handle the new domain:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // ... existing config
  async redirects() {
    return [
      {
        source: '/',
        destination: '/login',
        permanent: false,
      },
    ]
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
```

#### C. Update CORS Configuration
Update any CORS settings in your API routes to allow the new domain:

```typescript
// In API routes, update CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://eazzypay.online',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}
```

### 3. Update External Service Configurations

#### A. Supabase Configuration
1. **Go to Supabase Dashboard** → **Settings** → **API**
2. **Add new allowed origin**:
   - Add `https://eazzypay.online`
   - Add `https://www.eazzypay.online`

#### B. Update Webhook URLs
If you have any webhooks configured, update them to use the new domain:

**Mifos X Webhooks**:
- Update webhook URLs from `https://your-vercel-app.vercel.app` to `https://eazzypay.online`

**NCBA Webhooks**:
- Update callback URLs to use the new domain

#### C. Update Cron Job URLs
Update your cron job configurations to use the new domain:

**GitHub Actions**:
```yaml
# Update .github/workflows/loan-polling.yml
- name: Trigger Loan Polling
  run: |
    curl -X POST "https://eazzypay.online/api/cron/loan-polling" \
      -H "Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}" \
      -H "Content-Type: application/json" \
      -d "{}"
```

**Cron-job.org**:
- Update URL from Vercel domain to `https://eazzypay.online/api/cron/loan-polling`

### 4. SSL Certificate
Vercel automatically provides SSL certificates for custom domains:
- **Automatic**: Vercel handles SSL certificate provisioning
- **Wait time**: Can take up to 24 hours after DNS propagation
- **Verification**: Check SSL status in Vercel dashboard

### 5. Testing the Setup

#### A. DNS Propagation Check
```bash
# Check if DNS is propagated
nslookup eazzypay.online
dig eazzypay.online
```

#### B. Test Domain Access
```bash
# Test the new domain
curl -I https://eazzypay.online
curl -I https://www.eazzypay.online
```

#### C. Test Application Functionality
1. **Visit**: `https://eazzypay.online`
2. **Test login**: Ensure authentication works
3. **Test API endpoints**: Verify all APIs are accessible
4. **Test cron jobs**: Ensure scheduled tasks work

## 🔧 Code Changes Required

### 1. Update API Routes
Update any hardcoded URLs in your API routes:

```typescript
// Before
const webhookUrl = 'https://your-vercel-app.vercel.app/api/webhook'

// After
const webhookUrl = 'https://eazzypay.online/api/webhook'
```

### 2. Update Frontend Code
Update any hardcoded URLs in your frontend:

```typescript
// Before
const apiUrl = 'https://your-vercel-app.vercel.app/api'

// After
const apiUrl = 'https://eazzypay.online/api'
```

### 3. Update Environment Variables
Add to your production environment variables in Vercel:

```
NEXT_PUBLIC_APP_URL=https://eazzypay.online
NEXT_PUBLIC_APP_DOMAIN=eazzypay.online
```

## 📊 Monitoring and Verification

### 1. Vercel Dashboard
- **Domains tab**: Check domain status
- **Deployments**: Verify deployments are working
- **Analytics**: Monitor traffic and performance

### 2. SSL Certificate Status
- **Green lock**: Indicates SSL is working
- **Mixed content warnings**: Check for HTTP resources
- **Certificate details**: Verify certificate validity

### 3. Application Testing
- **Login functionality**: Test user authentication
- **API endpoints**: Verify all APIs work
- **Cron jobs**: Check scheduled tasks
- **Webhooks**: Test external integrations

## 🚨 Common Issues and Solutions

### 1. DNS Propagation Delays
- **Issue**: Domain not resolving
- **Solution**: Wait 24-48 hours, check DNS propagation status

### 2. SSL Certificate Issues
- **Issue**: SSL not working
- **Solution**: Wait for automatic provisioning, check Vercel dashboard

### 3. Mixed Content Warnings
- **Issue**: HTTP resources on HTTPS site
- **Solution**: Update all URLs to use HTTPS

### 4. CORS Issues
- **Issue**: API calls failing
- **Solution**: Update CORS settings to allow new domain

## 🎯 Final Checklist

- [ ] Domain added to Vercel project
- [ ] DNS records configured at registrar
- [ ] Environment variables updated
- [ ] Supabase allowed origins updated
- [ ] Webhook URLs updated
- [ ] Cron job URLs updated
- [ ] SSL certificate active
- [ ] Application tested on new domain
- [ ] All functionality verified

## 🎉 Expected Results

After successful setup:
- ✅ **Domain**: `https://eazzypay.online` works
- ✅ **SSL**: Green lock icon in browser
- ✅ **Performance**: Same as Vercel domain
- ✅ **Functionality**: All features work normally
- ✅ **SEO**: Better search engine optimization
- ✅ **Branding**: Professional custom domain

---

## 🚀 Ready to Deploy!

Your custom domain setup is ready! Follow the steps above to configure `eazzypay.online` on Vercel and update your code accordingly.

**Next Steps:**
1. Add domain to Vercel
2. Configure DNS records
3. Update code and environment variables
4. Test the new domain
5. Update external service configurations

Your Payment Vault will then be accessible at `https://eazzypay.online`! 🎉



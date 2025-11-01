# 🚀 Migration Guide: Vercel → Digital Ocean App Platform

This guide covers migrating eazzypay from Vercel to Digital Ocean App Platform with CI/CD from GitHub.

## 📋 What is Digital Ocean App Platform?

Digital Ocean App Platform is a Platform-as-a-Service (PaaS) similar to Vercel:
- ✅ Automatic deployments from GitHub
- ✅ Built-in SSL certificates
- ✅ Environment variables management
- ✅ Auto-scaling
- ✅ No server management needed
- ✅ Static IP addresses (great for IP whitelisting)

## 🎯 Pre-Migration Checklist

- [ ] **Export environment variables** from Vercel
- [ ] **Note current domain:** `eazzypay.online`
- [ ] **GitHub repository** is ready and up-to-date
- [ ] **List all IPs** that need whitelisting (NCBA, etc.)

## 🚀 Step-by-Step Migration

### Step 1: Create App in Digital Ocean App Platform

1. **Go to Digital Ocean Dashboard**
   - Visit [https://cloud.digitalocean.com/apps](https://cloud.digitalocean.com/apps)
   - Click "Create App"

2. **Connect GitHub Repository**
   - Click "GitHub" tab
   - Authorize Digital Ocean to access your repositories
   - Select your `paymentvalut` repository
   - Select branch: `main` or `master`

3. **Configure Build Settings**
   ```
   Build Command: npm run build
   Run Command: npm start
   Output Directory: .next
   ```

4. **Configure Environment Variables**
   - Add all environment variables from Vercel
   - See `ENV_VARIABLES_DIGITAL_OCEAN.md` for complete list
   - **Important:** All variables starting with `NEXT_PUBLIC_` are exposed to client

5. **Choose Resource Type**
   ```
   Component Type: Web Service
   Plan: Basic
   Size: 
     - Starter: 512 MB RAM / 0.25 vCPU ($5/month) - Good for testing
     - Basic: 1 GB RAM / 0.5 vCPU ($12/month) - Recommended minimum
     - Professional: 2 GB RAM / 1 vCPU ($24/month) - For production
   
   Region: Choose closest to Kenya/Africa
   ```

6. **Review and Create**
   - Review configuration
   - Click "Create Resources"

### Step 2: Configure Domain

1. **In App Platform Dashboard**
   - Go to your app → Settings → Domains
   - Click "Add Domain"
   - Enter: `eazzypay.online`
   - Click "Add Domain"

2. **Update DNS Records**
   Digital Ocean will provide you with DNS records. Update at your domain registrar:
   
   ```
   Type: CNAME
   Name: @
   Value: [App Platform provided value]
   
   OR
   
   Type: A
   Name: @
   Value: [App Platform provided IP]
   ```

3. **Wait for DNS Propagation**
   - Usually takes 1-2 hours
   - Check with: `dig eazzypay.online`

### Step 3: SSL Certificate

- ✅ **Automatic!** App Platform automatically provisions SSL certificates
- ✅ **Auto-renewal** is handled automatically
- ✅ **HTTPS redirect** is automatic

### Step 4: Get Your Static IP Address

**Critical for NCBA IP Whitelisting:**

1. **Find Your App's IP:**
   - Go to App Platform Dashboard → Your App → Settings → Domains
   - Look for "Static IP" or "Outbound IP"
   - OR check app logs after first deployment

2. **Contact NCBA to Whitelist:**
   ```
   Subject: IP Whitelisting Update - Migration to Digital Ocean App Platform
   
   Dear NCBA Open Banking Team,
   
   We have migrated to Digital Ocean App Platform and need to update our whitelisted IP.
   
   New Static IP: [YOUR_APP_PLATFORM_IP]
   Environment: UAT
   Username: NtbUATob254
   Domain: eazzypay.online
   
   Please whitelist this IP and remove the old IP: 154.159.237.174
   
   Thank you,
   ```

### Step 5: Configure Environment Variables

In App Platform Dashboard:

1. **Go to:** Your App → Settings → App-Level Environment Variables
2. **Add all variables** from Vercel:

```bash
# Application
NEXT_PUBLIC_APP_URL=https://eazzypay.online
NEXT_PUBLIC_APP_DOMAIN=eazzypay.online
NODE_ENV=production

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# JWT & Encryption
JWT_SECRET=your_jwt_secret
ENCRYPTION_PASSPHRASE=your_encryption_passphrase

# SMS
SUPER_ADMIN_SMS_ENABLED=true
SUPER_ADMIN_SMS_USERNAME=your_username
SUPER_ADMIN_SMS_API_KEY=your_api_key
SUPER_ADMIN_SMS_PASSWORD=your_password

# Email (Resend)
RESEND_API_KEY=your_resend_key
RESEND_FROM_EMAIL=noreply@eazzypay.online

# Cron Secret
CRON_SECRET=your_cron_secret

# M-Pesa (if used)
MPESA_CONSUMER_KEY=your_key
MPESA_CONSUMER_SECRET=your_secret
# ... etc
```

**Note:** Variables starting with `NEXT_PUBLIC_` are exposed to client-side code.

### Step 6: Configure Cron Jobs

App Platform supports scheduled jobs. Create a separate component:

1. **In App Platform Dashboard:**
   - Go to Components → Add Component
   - Choose: **Worker** (for scheduled tasks)

2. **Configure Worker:**
   ```
   Name: disburse-retry-cron
   Run Command: node -e "require('node-fetch').default('https://eazzypay.online/api/cron/disburse-retry', {headers: {'X-Cron-Secret': process.env.CRON_SECRET}})"
   ```

3. **Or use GitHub Actions** (recommended - see `.github/workflows/cron-digitalocean.yml`)

### Step 7: First Deployment

After configuration:

1. **App Platform automatically:**
   - Detects your repository
   - Installs dependencies (`npm install`)
   - Runs build command (`npm run build`)
   - Starts your app (`npm start`)

2. **Monitor deployment:**
   - Go to App Platform Dashboard → Deployments
   - Watch build logs
   - Verify deployment succeeds

3. **Check logs:**
   - Go to Runtime Logs tab
   - Verify application started correctly

### Step 8: Update External Services

1. **Supabase:**
   - Add `https://eazzypay.online` to allowed origins (if needed)

2. **NCBA:**
   - Update IP whitelisting (see Step 4)
   - Update callback URLs if required

3. **Mifos X (if configured):**
   - Update webhook URLs to `https://eazzypay.online/api/mifos/webhook/loan-approval`

### Step 9: Test Everything

```bash
# Test health endpoint
curl https://eazzypay.online/api/health

# Test in browser
# Visit: https://eazzypay.online
```

## 🔄 CI/CD Configuration

App Platform automatically deploys when you push to GitHub:

1. **Push to main branch:**
   ```bash
   git push origin main
   ```

2. **App Platform automatically:**
   - Detects the push
   - Starts new deployment
   - Builds your app
   - Deploys to production
   - Provides deployment URL for testing

3. **Deployment Settings:**
   - Go to Settings → App Spec
   - Configure build and run commands
   - Set environment variables
   - Configure health checks

## 📊 App Platform Features

### Automatic Benefits:
- ✅ **SSL Certificates** - Auto-provisioned and renewed
- ✅ **Load Balancing** - Built-in (if multiple instances)
- ✅ **Health Checks** - Automatic monitoring
- ✅ **Rollback** - Easy rollback to previous deployments
- ✅ **Deployment History** - View all past deployments
- ✅ **Logs** - Real-time runtime and build logs

### Configuration Options:
- **Scaling:** Manual or automatic
- **Buildpack:** Auto-detects Next.js
- **Health Checks:** Automatic for Next.js
- **Static IP:** Available for outbound requests

## 🎯 Key Differences from Vercel

| Feature | Vercel | Digital Ocean App Platform |
|---------|--------|---------------------------|
| **Deployment** | Auto from GitHub | Auto from GitHub ✅ |
| **SSL** | Automatic | Automatic ✅ |
| **Environment Variables** | Dashboard | Dashboard ✅ |
| **Cron Jobs** | Built-in crons | Need Worker component or GitHub Actions |
| **IP Address** | Dynamic | Static (better for whitelisting) ✅ |
| **Scaling** | Automatic | Manual or automatic |
| **Logs** | Dashboard | Dashboard ✅ |
| **Cost** | Usage-based | Fixed pricing per plan |

## 📝 App Spec Configuration (Optional)

For advanced configuration, create `.do/app.yaml`:

```yaml
name: eazzypay
region: nyc1  # Choose closest region

services:
  - name: web
    source_dir: /
    github:
      repo: YOUR_USERNAME/YOUR_REPO
      branch: main
      deploy_on_push: true
    
    build_command: npm run build
    run_command: npm start
    environment_slug: node-js
    
    instance_count: 1
    instance_size_slug: basic-xxs  # 512MB RAM
    
    routes:
      - path: /
    
    health_check:
      http_path: /api/health
    
    envs:
      - key: NODE_ENV
        value: production
      - key: NEXT_PUBLIC_APP_URL
        value: https://eazzypay.online
      # Add other environment variables here
```

## 🔒 Security Considerations

1. **Environment Variables:**
   - Never commit secrets to git
   - Use App Platform's environment variables UI
   - Separate variables for different environments

2. **Static IP:**
   - Use for IP whitelisting with external services
   - Document your static IP for future reference

3. **Health Checks:**
   - Configure health check endpoint
   - App Platform automatically restarts unhealthy instances

## 📈 Monitoring

1. **App Platform Dashboard:**
   - View real-time logs
   - Monitor deployments
   - Check health status
   - View metrics (CPU, Memory, Requests)

2. **Custom Monitoring:**
   - Set up uptime monitoring (UptimeRobot, etc.)
   - Configure alerts for failures

## ✅ Post-Deployment Checklist

- [ ] Application deployed successfully
- [ ] SSL certificate active
- [ ] DNS updated and propagated
- [ ] Environment variables configured
- [ ] Static IP obtained and whitelisted with NCBA
- [ ] User login works
- [ ] API endpoints respond
- [ ] NCBA token generation works (after IP whitelisting)
- [ ] Cron jobs configured (Worker or GitHub Actions)
- [ ] External webhooks updated
- [ ] Monitoring set up

## 🔄 Rollback Plan

If issues occur:

1. **App Platform Dashboard:**
   - Go to Deployments tab
   - Select previous successful deployment
   - Click "Rollback"

2. **Or keep Vercel active:**
   - Keep Vercel deployment until migration verified
   - Point DNS back to Vercel if needed
   - Both can coexist during migration

## 📞 Support

- **Digital Ocean Docs:** https://docs.digitalocean.com/products/app-platform/
- **Next.js on App Platform:** https://docs.digitalocean.com/products/app-platform/how-to/deploy-nextjs/

## 🎉 Advantages of App Platform

1. **Static IP:** Easier IP whitelisting for NCBA
2. **Predictable Costs:** Fixed monthly pricing
3. **Simple Deployment:** Similar to Vercel workflow
4. **Better Control:** More configuration options
5. **Regional Deployment:** Choose data center location


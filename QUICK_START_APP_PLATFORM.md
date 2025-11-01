# ⚡ Quick Start: Digital Ocean App Platform (15 Minutes)

Fast migration from Vercel to Digital Ocean App Platform via GitHub.

## 🚀 Step-by-Step (15 Minutes)

### Step 1: Prepare GitHub (2 min)

1. **Ensure your code is pushed to GitHub:**
   ```bash
   git add .
   git commit -m "Prepare for Digital Ocean deployment"
   git push origin main
   ```

### Step 2: Create App in Digital Ocean (5 min)

1. **Go to:** [https://cloud.digitalocean.com/apps](https://cloud.digitalocean.com/apps)
2. **Click:** "Create App"
3. **Select:** GitHub tab
4. **Authorize** Digital Ocean access to your repositories
5. **Choose repository:** `paymentvalut` (or your repo name)
6. **Select branch:** `main`

### Step 3: Configure Build Settings (2 min)

App Platform auto-detects Next.js, but verify:

```
✓ Build Command: npm run build
✓ Run Command: npm start
✓ Output Directory: .next (or leave empty for auto-detect)
```

### Step 4: Add Environment Variables (5 min)

In the "Environment Variables" section, add:

**Required:**
```bash
NEXT_PUBLIC_APP_URL=https://eazzypay.online
NEXT_PUBLIC_APP_DOMAIN=eazzypay.online
NODE_ENV=production
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
JWT_SECRET=your_jwt_secret
ENCRYPTION_PASSPHRASE=your_encryption_passphrase
```

**Copy ALL variables from Vercel** - See `ENV_VARIABLES_DIGITAL_OCEAN.md` for complete list.

### Step 5: Choose Plan (1 min)

```
Plan: Basic
Size: 1 GB RAM / 0.5 vCPU ($12/month) - Minimum recommended
Region: Choose closest to Kenya
```

### Step 6: Create and Deploy (5 min)

1. **Click:** "Create Resources"
2. **App Platform will:**
   - Clone your repo
   - Install dependencies
   - Build your app
   - Deploy automatically

3. **Wait for deployment** (watch progress in dashboard)

### Step 7: Configure Domain (2 min)

1. **In App Platform Dashboard:**
   - Go to Settings → Domains
   - Click "Add Domain"
   - Enter: `eazzypay.online`

2. **Update DNS at your registrar:**
   - Digital Ocean will show you DNS records
   - Add CNAME or A record as instructed

### Step 8: Get Static IP and Whitelist (5 min)

**Critical for NCBA:**

1. **Find Static IP:**
   - Go to Settings → Domains
   - Look for "Static IP" or check app logs
   - Note the IP address

2. **Contact NCBA:**
   ```
   Subject: IP Whitelisting - Digital Ocean App Platform Migration
   
   New Static IP: [YOUR_APP_PLATFORM_IP]
   Environment: UAT
   Username: NtbUATob254
   
   Please whitelist and remove old IP: 154.159.237.174
   ```

### Step 9: Verify Deployment

```bash
# Test your app (App Platform provides a temporary URL)
# Or after DNS propagates:
curl https://eazzypay.online/api/health
```

## ✅ That's It!

Your app is now deployed on Digital Ocean App Platform with:
- ✅ Automatic deployments from GitHub
- ✅ SSL certificate (auto-provisioned)
- ✅ Static IP for whitelisting
- ✅ Environment variables configured
- ✅ Health checks and monitoring

## 🔄 Future Deployments

Just push to GitHub:

```bash
git push origin main
```

App Platform automatically:
1. Detects the push
2. Builds your app
3. Deploys to production
4. Provides deployment URL

## 📝 Next Steps

1. **Wait for DNS propagation** (1-2 hours)
2. **Wait for NCBA IP whitelisting** (24-48 hours)
3. **Test all functionality**
4. **Monitor logs** in App Platform dashboard

## 🎯 Key Benefits

- **Simpler than Droplet:** No server management
- **Similar to Vercel:** Familiar workflow
- **Static IP:** Better for IP whitelisting
- **Cost Effective:** Predictable pricing
- **Auto SSL:** No manual certificate management

## 📚 Detailed Guides

- `DIGITAL_OCEAN_APP_PLATFORM_GUIDE.md` - Complete guide
- `ENV_VARIABLES_DIGITAL_OCEAN.md` - Environment variables
- `DEPLOYMENT_CHECKLIST.md` - Verification checklist


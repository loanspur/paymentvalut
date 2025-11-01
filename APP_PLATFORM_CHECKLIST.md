# ✅ Digital Ocean App Platform Deployment Checklist

Quick checklist for migrating from Vercel to Digital Ocean App Platform.

## Pre-Deployment

- [ ] **Export all environment variables** from Vercel dashboard
- [ ] **Code pushed to GitHub** (main/master branch)
- [ ] **Note current domain:** eazzypay.online
- [ ] **Document current IP whitelisting** (NCBA, etc.)

## App Platform Setup

- [ ] **Create Digital Ocean account**
- [ ] **Go to App Platform:** https://cloud.digitalocean.com/apps
- [ ] **Create App** → Connect GitHub repository
- [ ] **Select repository:** paymentvalut (or your repo name)
- [ ] **Select branch:** main
- [ ] **Configure build:**
  - [ ] Build Command: `npm run build`
  - [ ] Run Command: `npm start`
  - [ ] Output Directory: `.next` (or auto-detect)
- [ ] **Choose plan:**
  - [ ] Size: Basic (1GB RAM / 0.5 vCPU) minimum
  - [ ] Region: Closest to Kenya/Africa
- [ ] **Add environment variables:**
  - [ ] Copy ALL variables from Vercel
  - [ ] See `ENV_VARIABLES_DIGITAL_OCEAN.md` for complete list
- [ ] **Create Resources** and wait for first deployment

## Domain Configuration

- [ ] **Add domain in App Platform:**
  - [ ] Go to Settings → Domains
  - [ ] Add: `eazzypay.online`
- [ ] **Update DNS records:**
  - [ ] Get DNS records from App Platform
  - [ ] Update at your domain registrar
  - [ ] Wait for DNS propagation (1-2 hours)

## IP Whitelisting (Critical!)

- [ ] **Get Static IP from App Platform:**
  - [ ] Check Settings → Domains → Static IP
  - [ ] OR check app logs/runtime for outbound IP
- [ ] **Contact NCBA to whitelist new IP:**
  - [ ] Email NCBA with new Static IP
  - [ ] Request removal of old IP: 154.159.237.174
  - [ ] Wait for confirmation (24-48 hours)

## Cron Jobs Setup

- [ ] **Choose cron method:**
  - [ ] Option 1: GitHub Actions (recommended - see `.github/workflows/cron-digitalocean.yml`)
  - [ ] Option 2: External cron service
  - [ ] Option 3: App Platform Worker component
- [ ] **Add CRON_SECRET to GitHub Secrets** (if using GitHub Actions)
- [ ] **Test cron endpoint** manually

## External Services Update

- [ ] **Supabase:** Add `https://eazzypay.online` to allowed origins (if needed)
- [ ] **NCBA:** Update IP whitelisting (see above)
- [ ] **NCBA:** Update callback URLs (if required)
- [ ] **Mifos X:** Update webhook URLs (if configured)
- [ ] **Other services:** Update webhook/callback URLs

## Testing

- [ ] **Application loads** at https://eazzypay.online
- [ ] **SSL certificate** is valid (auto-provisioned)
- [ ] **User login** works
- [ ] **User registration** works
- [ ] **OTP flow** works
- [ ] **Dashboard** loads with data
- [ ] **Wallet balance** displays
- [ ] **SMS balance** displays
- [ ] **Transaction history** loads
- [ ] **Float purchase** initiates
- [ ] **NCBA token generation** works (after IP whitelisting)
- [ ] **API endpoints** respond correctly
- [ ] **Health check** works: `/api/health`

## Post-Deployment

- [ ] **Monitor logs** in App Platform dashboard
- [ ] **Monitor deployment** history
- [ ] **Check health status** is green
- [ ] **Verify cron jobs** are running (if configured)
- [ ] **Test all critical flows** end-to-end
- [ ] **Monitor for 24-48 hours** after migration

## CI/CD Verification

- [ ] **Push a test commit** to GitHub
- [ ] **Verify App Platform** detects the push
- [ ] **Watch deployment** in App Platform dashboard
- [ ] **Verify deployment** succeeds automatically
- [ ] **Test the deployment** works correctly

## Rollback Plan

- [ ] **Keep Vercel active** until migration verified
- [ ] **Test rollback** in App Platform (Deployments → Rollback)
- [ ] **DNS can point back** to Vercel if needed
- [ ] **Both can coexist** during migration

## Final Verification

- [ ] **All tests pass**
- [ ] **No errors in logs**
- [ ] **Performance acceptable**
- [ ] **Users can access application**
- [ ] **Critical flows working**
- [ ] **IP whitelisting complete**
- [ ] **SSL certificate valid**
- [ ] **DNS fully propagated**
- [ ] **Cron jobs running** (if configured)
- [ ] **Monitoring set up**

## Quick Reference

### App Platform Dashboard
- **URL:** https://cloud.digitalocean.com/apps
- **Deployments:** View deployment history and logs
- **Runtime Logs:** Real-time application logs
- **Settings:** Environment variables, domains, etc.

### Commands

```bash
# Test deployment locally
npm run build
npm start

# Test in browser
curl https://eazzypay.online/api/health

# View App Platform logs (in dashboard)
# Go to Runtime Logs tab
```

### Support Resources

- App Platform Docs: https://docs.digitalocean.com/products/app-platform/
- Support: https://docs.digitalocean.com/support/
- Status: https://status.digitalocean.com/


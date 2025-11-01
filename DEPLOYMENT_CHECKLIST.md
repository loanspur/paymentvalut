# ✅ Digital Ocean Deployment Checklist

Use this checklist to ensure smooth migration from Vercel to Digital Ocean.

## Pre-Deployment

- [ ] **Export all environment variables** from Vercel
- [ ] **Document current Vercel configuration**
- [ ] **Backup database** (if using Supabase, ensure backups are enabled)
- [ ] **Note current IP addresses** for whitelisting
- [ ] **Document cron jobs** (from vercel.json)
- [ ] **List all webhook URLs** that need updating

## Digital Ocean Setup

- [ ] **Create Digital Ocean account**
- [ ] **Create droplet** (Ubuntu 22.04, 2GB+ RAM)
- [ ] **Record droplet IP address**
- [ ] **SSH into droplet** successfully
- [ ] **Run setup script** (`setup-digitalocean.sh`)
- [ ] **Verify Node.js** installed (v20.x)
- [ ] **Verify PM2** installed
- [ ] **Verify Nginx** installed

## Application Deployment

- [ ] **Clone repository** to `/var/www/eazzypay`
- [ ] **Install dependencies** (`npm install`)
- [ ] **Create .env file** with all environment variables
- [ ] **Set .env permissions** (`chmod 600 .env`)
- [ ] **Build application** (`npm run build`)
- [ ] **Start with PM2** (`pm2 start ecosystem.config.js`)
- [ ] **Save PM2 config** (`pm2 save`)
- [ ] **Test application** responds on port 3000

## Nginx Configuration

- [ ] **Copy nginx config** to `/etc/nginx/sites-available/eazzypay`
- [ ] **Create symlink** to sites-enabled
- [ ] **Test Nginx config** (`nginx -t`)
- [ ] **Restart Nginx** (`systemctl restart nginx`)
- [ ] **Configure firewall** (ports 80, 443 open)

## SSL Certificate

- [ ] **DNS records updated** (A records point to droplet IP)
- [ ] **Wait for DNS propagation** (check with `dig eazzypay.online`)
- [ ] **Run Certbot** (`certbot --nginx -d eazzypay.online`)
- [ ] **Verify SSL** (visit https://eazzypay.online)
- [ ] **Auto-renewal configured** (Certbot sets this up automatically)

## DNS Migration

- [ ] **Point A record** to Digital Ocean IP
- [ ] **Point www CNAME** (if using) to Digital Ocean IP
- [ ] **Verify DNS propagation** (`dig eazzypay.online`)
- [ ] **Wait for full propagation** (up to 48 hours, usually 1-2 hours)

## IP Whitelisting Updates

- [ ] **Get Digital Ocean IP** from dashboard
- [ ] **Contact NCBA** to whitelist new IP
- [ ] **Verify old IP removed** (after migration confirmed)
- [ ] **Update any other services** with IP restrictions (M-Pesa, etc.)
- [ ] **Test NCBA token generation** after whitelisting

## Cron Jobs Setup

- [ ] **Set CRON_SECRET** in environment variables
- [ ] **Configure crontab** (see `crontab-setup.sh`)
- [ ] **Test cron execution** manually
- [ ] **Monitor cron logs** (`/var/log/eazzypay-cron.log`)

## External Services Update

- [ ] **Update Supabase** allowed origins (if needed)
- [ ] **Update Mifos X webhooks** (if configured)
- [ ] **Update NCBA callbacks** (if needed)
- [ ] **Verify webhooks** receive correctly
- [ ] **Test callback endpoints** manually

## Testing

- [ ] **Homepage loads** correctly
- [ ] **User login** works
- [ ] **User registration** works
- [ ] **OTP generation** works
- [ ] **OTP verification** works
- [ ] **Dashboard** loads with data
- [ ] **Wallet balance** displays correctly
- [ ] **SMS balance** displays correctly
- [ ] **Transaction history** loads
- [ ] **Float purchase** initiates (OTP flow)
- [ ] **NCBA token** generates (after IP whitelisting)
- [ ] **Float purchase** completes end-to-end
- [ ] **API endpoints** respond correctly
- [ ] **Health check** endpoint works

## Monitoring Setup

- [ ] **PM2 monitoring** configured (`pm2 monit`)
- [ ] **PM2 logs** accessible (`pm2 logs eazzypay`)
- [ ] **Nginx logs** accessible (`tail -f /var/log/nginx/access.log`)
- [ ] **Error logs** accessible (`tail -f /var/log/nginx/error.log`)
- [ ] **System monitoring** enabled (Digital Ocean monitoring)
- [ ] **Uptime monitoring** set up (optional: UptimeRobot, etc.)

## Security

- [ ] **Firewall configured** (UFW enabled)
- [ ] **SSH key authentication** set up
- [ ] **Password authentication** disabled (if using keys)
- [ ] **Environment variables** secured (600 permissions)
- [ ] **SSL certificate** valid and auto-renewing
- [ ] **Security headers** configured in Nginx
- [ ] **Regular updates** scheduled

## Performance

- [ ] **PM2 instance** running
- [ ] **Nginx caching** configured (if needed)
- [ ] **Gzip compression** enabled
- [ ] **Static assets** cached properly
- [ ] **Database connection** pooling (handled by Supabase)

## Backup and Recovery

- [ ] **Database backups** enabled (Supabase handles this)
- [ ] **Environment variables** backed up securely
- [ ] **Code repository** up to date (Git)
- [ ] **Deployment process** documented
- [ ] **Rollback plan** documented

## Post-Deployment

- [ ] **Monitor for 24 hours** after migration
- [ ] **Check error logs** daily
- [ ] **Verify cron jobs** running
- [ ] **Monitor resource usage** (CPU, Memory, Disk)
- [ ] **Set up alerts** (if available)
- [ ] **Document any issues** encountered

## Final Verification

- [ ] **All tests pass**
- [ ] **No errors in logs**
- [ ] **Performance acceptable**
- [ ] **Users can access application**
- [ ] **Critical flows working**
- [ ] **IP whitelisting complete**
- [ ] **SSL certificate valid**
- [ ] **DNS fully propagated**

## Rollback Plan

If issues occur:

- [ ] **Keep Vercel deployment** active until migration verified
- [ ] **DNS can point back** to Vercel if needed
- [ ] **Digital Ocean can coexist** during migration
- [ ] **Database remains unchanged** (Supabase)

---

## Quick Reference Commands

```bash
# Check application status
pm2 status
pm2 logs eazzypay

# Restart application
pm2 restart eazzypay

# Check Nginx status
systemctl status nginx
nginx -t

# Check SSL certificate
certbot certificates

# View logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
pm2 logs eazzypay --lines 100

# Check disk space
df -h

# Check memory
free -h

# Monitor in real-time
pm2 monit
htop
```


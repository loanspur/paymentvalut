# ✅ Custom Domain Deployment Checklist - eazzypay.online

## 🎯 Pre-Deployment Checklist

### 1. Code Updates ✅
- [x] **Next.js Config**: Updated with custom domain settings
- [x] **Environment Variables**: Added to next.config.js
- [x] **Security Headers**: Enhanced for custom domain
- [x] **Domain References**: Updated in README.md
- [x] **GitHub Actions**: Already configured correctly

### 2. Vercel Configuration
- [ ] **Add Domain**: Go to Vercel Dashboard → Settings → Domains
- [ ] **Add**: `eazzypay.online`
- [ ] **Add**: `www.eazzypay.online` (optional)
- [ ] **Environment Variables**: Add to Vercel project settings
  - [ ] `NEXT_PUBLIC_APP_URL=https://eazzypay.online`
  - [ ] `NEXT_PUBLIC_APP_DOMAIN=eazzypay.online`

### 3. DNS Configuration
- [ ] **Domain Registrar**: Access DNS management
- [ ] **Add A Record**: 
  ```
  Type: A
  Name: @
  Value: 76.76.19.61
  ```
- [ ] **Add CNAME Record**:
  ```
  Type: CNAME
  Name: www
  Value: cname.vercel-dns.com
  ```

### 4. External Service Updates
- [ ] **Supabase**: Add allowed origins
  - [ ] `https://eazzypay.online`
  - [ ] `https://www.eazzypay.online`
- [ ] **Mifos X**: Update webhook URLs (if configured)
- [ ] **NCBA**: Update callback URLs (if configured)

## 🚀 Deployment Steps

### Step 1: Deploy to Vercel
```bash
# Deploy with updated configuration
vercel --prod
```

### Step 2: Add Domain to Vercel
1. **Go to Vercel Dashboard**
2. **Select your project**
3. **Go to Settings → Domains**
4. **Click "Add Domain"**
5. **Enter**: `eazzypay.online`
6. **Click "Add"**

### Step 3: Configure DNS
1. **Copy DNS records** from Vercel
2. **Go to your domain registrar**
3. **Add the DNS records**
4. **Wait for propagation** (24-48 hours)

### Step 4: Update Environment Variables
1. **Go to Vercel Dashboard → Settings → Environment Variables**
2. **Add**:
   - `NEXT_PUBLIC_APP_URL` = `https://eazzypay.online`
   - `NEXT_PUBLIC_APP_DOMAIN` = `eazzypay.online`
3. **Redeploy** to apply changes

## 🧪 Testing Checklist

### 1. Domain Resolution
- [ ] **DNS Check**: `nslookup eazzypay.online`
- [ ] **Website Access**: Visit `https://eazzypay.online`
- [ ] **SSL Certificate**: Green lock icon in browser
- [ ] **WWW Redirect**: `https://www.eazzypay.online` works

### 2. Application Functionality
- [ ] **Homepage**: Redirects to `/login`
- [ ] **Login**: Authentication works
- [ ] **Dashboard**: All pages load correctly
- [ ] **API Endpoints**: All APIs accessible
- [ ] **File Uploads**: Working correctly
- [ ] **Responsive Design**: Mobile/desktop views

### 3. External Integrations
- [ ] **Supabase**: Database connections work
- [ ] **M-Pesa**: API calls successful
- [ ] **NCBA**: STK Push working
- [ ] **Mifos X**: Webhook endpoints accessible
- [ ] **Cron Jobs**: Scheduled tasks executing

### 4. Performance
- [ ] **Page Load Speed**: < 3 seconds
- [ ] **API Response Time**: < 1 second
- [ ] **SSL Score**: A+ rating
- [ ] **Mobile Performance**: Good scores

## 🔧 Troubleshooting

### Common Issues

#### 1. Domain Not Resolving
- **Check**: DNS propagation status
- **Wait**: 24-48 hours for full propagation
- **Verify**: DNS records are correct

#### 2. SSL Certificate Issues
- **Check**: Vercel dashboard for certificate status
- **Wait**: Up to 24 hours for automatic provisioning
- **Verify**: Domain is properly configured

#### 3. Mixed Content Warnings
- **Check**: All resources use HTTPS
- **Update**: Any HTTP URLs to HTTPS
- **Verify**: External service configurations

#### 4. API Endpoints Not Working
- **Check**: CORS settings
- **Update**: Allowed origins in Supabase
- **Verify**: Environment variables are set

## 📊 Monitoring

### 1. Vercel Dashboard
- **Domains**: Check domain status
- **Deployments**: Monitor deployment history
- **Analytics**: Track performance metrics
- **Functions**: Monitor API usage

### 2. Application Monitoring
- **Error Tracking**: Monitor for errors
- **Performance**: Track response times
- **Usage**: Monitor user activity
- **Uptime**: Check availability

### 3. External Services
- **Supabase**: Monitor database performance
- **M-Pesa**: Track API usage and errors
- **NCBA**: Monitor STK Push success rates
- **Cron Jobs**: Check execution logs

## 🎉 Success Criteria

Your custom domain setup is successful when:
- ✅ **Domain**: `https://eazzypay.online` loads correctly
- ✅ **SSL**: Green lock icon in browser
- ✅ **Performance**: Fast loading times
- ✅ **Functionality**: All features work normally
- ✅ **APIs**: All endpoints accessible
- ✅ **Integrations**: External services working
- ✅ **Monitoring**: No errors in logs

## 🚀 Post-Deployment Actions

### 1. Update Documentation
- [ ] **README**: Update with new domain
- [ ] **API Docs**: Update endpoint URLs
- [ ] **User Guides**: Update screenshots and URLs

### 2. Notify Stakeholders
- [ ] **Users**: Inform about new domain
- [ ] **Partners**: Update integration URLs
- [ ] **Support**: Update help documentation

### 3. SEO Optimization
- [ ] **Google Search Console**: Add new domain
- [ ] **Sitemap**: Update with new URLs
- [ ] **Meta Tags**: Update canonical URLs

## 📞 Support

If you encounter issues:
1. **Check Vercel Dashboard** for domain status
2. **Verify DNS records** are correct
3. **Test with different browsers** and devices
4. **Check browser console** for errors
5. **Contact Vercel support** if needed

---

## 🎯 Ready to Deploy!

Your Payment Vault is ready for custom domain deployment! Follow the checklist above to successfully set up `eazzypay.online`.

**Key Points:**
- ✅ Code is updated and ready
- ✅ Configuration files are prepared
- ✅ Deployment checklist is complete
- ✅ Testing procedures are defined

**Next Steps:**
1. Deploy to Vercel
2. Add domain to Vercel
3. Configure DNS records
4. Update environment variables
5. Test all functionality

Your Payment Vault will then be accessible at `https://eazzypay.online`! 🎉


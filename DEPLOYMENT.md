# 🚀 Deployment Guide - M-Pesa B2C Disbursement System

This guide will help you deploy the M-Pesa B2C Disbursement System for Kulmnagroup Limited.

## 📋 Prerequisites

- Supabase account (free tier available)
- M-Pesa B2C API credentials
- Node.js 18+ installed
- Git installed

## 🏗️ Step 1: Supabase Project Setup

### 1.1 Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click "Start your project"
3. Create a new project:
   - **Name**: `mpesa-b2c-kulmnagroup`
   - **Database Password**: Generate a strong password
   - **Region**: Choose closest to Kenya (Europe West)
   - **Pricing Plan**: Free tier is sufficient for testing

### 1.2 Get Project Credentials

1. Go to **Settings** → **API**
2. Copy these values:
   - **Project URL**: `https://your-project-id.supabase.co`
   - **Anon Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - **Service Role Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

## 🗄️ Step 2: Database Setup

### 2.1 Run Migrations

1. Go to **SQL Editor** in Supabase Dashboard
2. Create a new query
3. Copy and paste the contents of `supabase/migrations/001_initial_schema.sql`
4. Click **Run** to execute the migration
5. Repeat for `supabase/migrations/002_seed_kulmnagroup.sql`

### 2.2 Verify Tables

Check that these tables were created:
- `partners`
- `disbursement_requests`
- `disbursement_callbacks`

## ⚡ Step 3: Edge Functions Deployment

### 3.1 Install Supabase CLI

```bash
npm install -g supabase
```

### 3.2 Login to Supabase

```bash
supabase login
```

### 3.3 Link Project

```bash
supabase link --project-ref your-project-id
```

### 3.4 Deploy Functions

```bash
# Deploy all functions
supabase functions deploy disburse
supabase functions deploy mpesa/b2c/result
supabase functions deploy mpesa/b2c/timeout
supabase functions deploy partners-create
```

### 3.5 Configure Secrets

Set M-Pesa credentials as Edge Function secrets:

```bash
supabase secrets set MPESA_CONSUMER_KEY=your_consumer_key
supabase secrets set MPESA_CONSUMER_SECRET=your_consumer_secret
supabase secrets set MPESA_SHORTCODE=174379
supabase secrets set MPESA_PASSKEY=your_passkey
supabase secrets set MPESA_ENVIRONMENT=sandbox
supabase secrets set USSD_WEBHOOK_URL=https://your-ussd-backend.com/webhook
```

## 🔑 Step 4: M-Pesa B2C Credentials

### 4.1 Get M-Pesa Credentials

1. Go to [developer.safaricom.co.ke](https://developer.safaricom.co.ke)
2. Create an account or login
3. Go to **My Apps** → **Create App**
4. Select **M-Pesa B2C**
5. Get your credentials:
   - **Consumer Key**
   - **Consumer Secret**
   - **Shortcode** (174379 for sandbox)
   - **Passkey**

### 4.2 Test Credentials

Use the M-Pesa API testing tools to verify your credentials work.

## 🌐 Step 5: Deploy Next.js App

### 5.1 Environment Configuration

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 5.2 Deploy to Vercel (Recommended)

1. Push code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Import your GitHub repository
4. Add environment variables in Vercel dashboard
5. Deploy

### 5.3 Alternative: Deploy to Netlify

1. Build the project: `npm run build`
2. Deploy the `out` folder to Netlify
3. Add environment variables in Netlify dashboard

## 🧪 Step 6: Testing

### 6.1 Test Disbursement

1. Open your deployed app
2. Click "New Disbursement"
3. Fill in test data:
   - **Amount**: 100 KES
   - **Phone**: Your test number (2547XXXXXXXX)
   - **Customer ID**: TEST001
4. Click "Send Disbursement"

### 6.2 Monitor Results

- Check the disbursements table for status updates
- Verify M-Pesa receives the request
- Check for webhook notifications

## 🔒 Step 7: Security Configuration

### 7.1 API Key Management

The system comes with a pre-configured API key for Kulmnagroup Limited:
- **API Key**: `kulmna_sk_live_1234567890abcdef`
- **Partner**: Kulmnagroup Limited
- **Status**: Active

### 7.2 Production Security

For production deployment:

1. **Change API Keys**: Generate new API keys for each partner
2. **Enable HTTPS**: Ensure all communications use HTTPS
3. **Rate Limiting**: Implement rate limiting on Edge Functions
4. **Monitoring**: Set up error monitoring and alerts
5. **Backup**: Configure database backups

## 📊 Step 8: Monitoring & Maintenance

### 8.1 Supabase Dashboard

Monitor your system through:
- **Database**: View tables and run queries
- **Edge Functions**: Check function logs and performance
- **Auth**: Monitor API key usage
- **Storage**: Check file storage usage

### 8.2 Application Monitoring

- **Real-time Dashboard**: Built-in admin interface
- **Transaction Logs**: Complete audit trail
- **Error Tracking**: Built-in error logging
- **Performance Metrics**: Response times and success rates

## 🚨 Troubleshooting

### Common Issues

1. **Edge Function Errors**
   - Check function logs in Supabase Dashboard
   - Verify secrets are set correctly
   - Check M-Pesa API connectivity

2. **Database Connection Issues**
   - Verify Supabase credentials
   - Check database permissions
   - Ensure tables exist

3. **M-Pesa API Errors**
   - Verify credentials are correct
   - Check if in sandbox mode
   - Ensure phone number format is correct (254XXXXXXXX)

4. **Webhook Failures**
   - Verify USSD backend URL
   - Check webhook endpoint is accessible
   - Review webhook logs

### Debug Mode

Enable debug logging by setting environment variables:
```env
DEBUG=true
LOG_LEVEL=debug
```

## 📞 Support

For technical support:
- **Email**: support@kulmnagroup.com
- **Documentation**: This repository
- **Issues**: GitHub Issues

## 🔄 Updates & Maintenance

### Regular Maintenance

1. **Weekly**: Review transaction logs
2. **Monthly**: Update dependencies
3. **Quarterly**: Security audit
4. **Annually**: Full system review

### Backup Strategy

1. **Database**: Supabase handles automatic backups
2. **Code**: Git repository serves as code backup
3. **Secrets**: Store securely in Supabase Vault
4. **Configuration**: Document all environment variables

---

**🎉 Congratulations! Your M-Pesa B2C Disbursement System is now deployed and ready for use by Kulmnagroup Limited.**




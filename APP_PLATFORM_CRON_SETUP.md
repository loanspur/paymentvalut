# Cron Jobs Setup for Digital Ocean App Platform

Digital Ocean App Platform doesn't have built-in cron jobs like Vercel. Here are your options:

## Option 1: GitHub Actions (Recommended)

Use GitHub Actions to trigger cron jobs via HTTP requests.

### Setup GitHub Actions Cron

Create `.github/workflows/cron-digitalocean.yml`:

```yaml
name: Scheduled Cron Jobs

on:
  schedule:
    # Run every 5 minutes (like Vercel cron)
    - cron: '*/5 * * * *'
  workflow_dispatch:  # Allow manual trigger

jobs:
  disburse-retry:
    runs-on: ubuntu-latest
    steps:
      - name: Call Disburse Retry Endpoint
        run: |
          curl -X GET \
            -H "X-Cron-Secret: ${{ secrets.CRON_SECRET }}" \
            https://eazzypay.online/api/cron/disburse-retry
```

### Add GitHub Secrets

1. Go to GitHub → Repository → Settings → Secrets → Actions
2. Add secret: `CRON_SECRET` (same value as in your environment variables)

## Option 2: App Platform Worker Component

Create a worker component that runs continuously and schedules tasks internally.

Not recommended for simple cron jobs due to cost.

## Option 3: External Cron Service

Use services like:
- **Cronitor** - https://cronitor.io
- **EasyCron** - https://www.easycron.com
- **Cron-job.org** - https://cron-job.org

Configure to call your endpoints:
```
URL: https://eazzypay.online/api/cron/disburse-retry
Method: GET
Headers: X-Cron-Secret: YOUR_CRON_SECRET
Schedule: */5 * * * * (every 5 minutes)
```

## Option 4: Node-Cron in Your App (Not Recommended)

Add node-cron to your Next.js app, but this requires keeping the app always running and can be unreliable.

## ✅ Recommended: GitHub Actions

GitHub Actions is free for public repos and has generous limits for private repos. It's the easiest and most reliable option.

### Setup Steps:

1. **Create workflow file:** `.github/workflows/cron-digitalocean.yml`
2. **Add CRON_SECRET to GitHub Secrets**
3. **Verify your cron endpoint accepts the secret:**
   - Check `/api/cron/disburse-retry` endpoint
   - Ensure it validates `X-Cron-Secret` header

### Other Cron Jobs

Add more cron jobs to the same workflow file:

```yaml
  balance-monitoring:
    runs-on: ubuntu-latest
    steps:
      - name: Call Balance Monitoring
        run: |
          curl -X GET \
            -H "X-Cron-Secret: ${{ secrets.CRON_SECRET }}" \
            https://eazzypay.online/api/cron/balance-monitoring
```


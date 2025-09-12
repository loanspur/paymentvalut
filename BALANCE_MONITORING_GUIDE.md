# 🚨 Balance Monitoring System Guide

## Overview

The Balance Monitoring System automatically checks M-Pesa shortcode balances for all active partners and sends Slack alerts when thresholds are exceeded. This helps prevent failed transactions due to insufficient funds and detects unusual activity.

## 🏗️ System Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Scheduled     │    │   M-Pesa API     │    │   Slack         │
│   Monitor       │───▶│   Balance Check  │───▶│   Alerts        │
│   (Every N min) │    │                  │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       ▲
         ▼                       ▼                       │
┌─────────────────┐    ┌──────────────────┐             │
│   Database      │    │   Alert Logic    │─────────────┘
│   Balance Logs  │    │   Thresholds     │
└─────────────────┘    └──────────────────┘
```

## 📊 Database Schema

### `partner_balance_configs`
Configuration for each partner's balance monitoring:

- **`check_interval_minutes`**: How often to check (5-1440 minutes)
- **`low_balance_threshold`**: Alert when balance reaches this amount
- **`unusual_drop_threshold`**: Alert when balance drops by this amount
- **`unusual_drop_percentage`**: Alert when balance drops by this percentage
- **`slack_webhook_url`**: Slack webhook for notifications
- **`slack_channel`**: Channel to send alerts to
- **`slack_mentions`**: Users to mention in alerts

### `balance_checks`
History of all balance checks performed:

- **`balance_amount`**: Current balance amount
- **`previous_balance`**: Previous balance for comparison
- **`balance_change`**: Calculated difference
- **`balance_change_percentage`**: Calculated percentage change
- **`triggered_alerts`**: JSON array of alert types triggered
- **`response_status`**: success, error, timeout

### `balance_alerts`
History of all alerts sent:

- **`alert_type`**: low_balance, unusual_drop, balance_recovery
- **`alert_severity`**: info, warning, critical
- **`slack_sent`**: Whether Slack notification was sent
- **`is_resolved`**: Whether the alert has been resolved

## 🚨 Alert Types

### 1. Low Balance Alert
- **Trigger**: Current balance ≤ low_balance_threshold
- **Severity**: Critical
- **Purpose**: Prevent failed transactions due to insufficient funds

### 2. Unusual Drop Alert
- **Trigger**: Balance drops by ≥ unusual_drop_threshold OR ≥ unusual_drop_percentage
- **Severity**: Warning
- **Purpose**: Detect unusual activity or potential issues

### 3. Balance Recovery Alert
- **Trigger**: Balance increases after being below threshold
- **Severity**: Info
- **Purpose**: Confirm that low balance issues have been resolved

## ⚙️ Configuration

### Setting Up Balance Monitoring

1. **Access the UI**: Go to `/balance-monitoring` page
2. **Add Configuration**: Click "Add Configuration"
3. **Select Partner**: Choose which partner to monitor
4. **Set Intervals**: Configure check frequency (default: 15 minutes)
5. **Set Thresholds**:
   - Low Balance: Alert when balance drops below this amount
   - Unusual Drop: Alert when balance drops by this amount
   - Drop Percentage: Alert when balance drops by this percentage
6. **Configure Slack**:
   - Webhook URL: Your Slack webhook URL
   - Channel: Channel to send alerts to
   - Mentions: Users to mention (@admin @finance)

### Example Configuration

```json
{
  "partner_id": "550e8400-e29b-41d4-a716-446655440000",
  "check_interval_minutes": 15,
  "low_balance_threshold": 1000.00,
  "unusual_drop_threshold": 5000.00,
  "unusual_drop_percentage": 20.00,
  "slack_webhook_url": "https://hooks.slack.com/services/...",
  "slack_channel": "#mpesa-alerts",
  "slack_mentions": "@admin @finance",
  "notify_on_low_balance": true,
  "notify_on_unusual_drop": true,
  "notify_on_balance_recovery": true
}
```

## 🔧 Deployment

### 1. Deploy Edge Functions

```bash
# Deploy the main balance monitoring function
supabase functions deploy balance-monitor

# Deploy the cron job function
supabase functions deploy cron-balance-monitor
```

### 2. Set Up Cron Job

In your Supabase dashboard, go to Database → Extensions and enable the `pg_cron` extension, then create a cron job:

```sql
-- Check balances every 15 minutes
SELECT cron.schedule(
  'balance-monitor',
  '*/15 * * * *',
  'SELECT net.http_post(
    url:=''https://your-project.supabase.co/functions/v1/cron-balance-monitor'',
    headers:=''{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'',
    body:=''{}''
  );'
);
```

### 3. Store M-Pesa Credentials

```bash
# Store M-Pesa credentials in Supabase Vault
supabase secrets set MPESA_CONSUMER_KEY=your_consumer_key
supabase secrets set MPESA_CONSUMER_SECRET=your_consumer_secret
supabase secrets set MPESA_PASSKEY=your_passkey
```

## 📱 Slack Integration

### Setting Up Slack Webhook

1. Go to your Slack workspace
2. Create a new app or use an existing one
3. Enable Incoming Webhooks
4. Create a webhook for your desired channel
5. Copy the webhook URL
6. Add it to your balance monitoring configuration

### Slack Message Format

```json
{
  "channel": "#mpesa-alerts",
  "username": "M-Pesa Balance Monitor",
  "icon_emoji": ":money_with_wings:",
  "text": "🚨 *Balance Alert for Partner Name*",
  "attachments": [{
    "color": "danger",
    "fields": [
      {
        "title": "Partner",
        "value": "Partner Name",
        "short": true
      },
      {
        "title": "Shortcode",
        "value": "174379",
        "short": true
      },
      {
        "title": "Current Balance",
        "value": "KES 45,000",
        "short": true
      },
      {
        "title": "Previous Balance",
        "value": "KES 50,000",
        "short": true
      },
      {
        "title": "Alert Details",
        "value": "⚠️ Low balance alert! Current balance (KES 45,000) is below threshold (KES 1,000)",
        "short": false
      }
    ]
  }]
}
```

## 🧪 Testing

### Manual Testing

1. **Trigger Manual Check**: Use the "Manual Check" button in the UI
2. **Test Alerts**: Temporarily lower thresholds to trigger alerts
3. **Verify Slack**: Check that Slack notifications are received
4. **Check Database**: Verify that balance checks and alerts are stored

### API Testing

```bash
# Test the balance monitor function directly
curl -X POST https://your-project.supabase.co/functions/v1/balance-monitor \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

## 📊 Monitoring Dashboard

The balance monitoring dashboard provides:

- **Active Configurations**: Number of enabled monitoring configs
- **Total Checks Today**: Number of balance checks performed
- **Alerts Sent**: Number of alerts triggered
- **Active Alerts**: Number of unresolved alerts

### Recent Balance Checks Table

Shows the latest balance checks with:
- Partner and shortcode
- Current balance amount
- Balance change (amount and percentage)
- Check status (success, error, timeout)
- Triggered alerts
- Timestamp

## 🔍 Troubleshooting

### Common Issues

1. **No Balance Checks**: Verify cron job is set up correctly
2. **M-Pesa API Errors**: Check credentials and network connectivity
3. **Slack Notifications Not Sent**: Verify webhook URL and channel permissions
4. **False Alerts**: Adjust thresholds based on normal business patterns

### Debugging

1. **Check Function Logs**: View Edge Function logs in Supabase dashboard
2. **Database Queries**: Check balance_checks and balance_alerts tables
3. **Slack Webhook**: Test webhook URL independently
4. **M-Pesa API**: Verify credentials and API endpoints

## 🚀 Best Practices

### Threshold Configuration

- **Low Balance**: Set to 2-3x your average transaction amount
- **Unusual Drop**: Set to 5-10x your average transaction amount
- **Drop Percentage**: Set to 20-30% for most businesses

### Monitoring Frequency

- **High Volume**: Check every 5-15 minutes
- **Medium Volume**: Check every 15-30 minutes
- **Low Volume**: Check every 30-60 minutes

### Alert Management

- **Resolve Alerts**: Mark alerts as resolved when issues are fixed
- **Review Patterns**: Analyze alert patterns to optimize thresholds
- **Team Notifications**: Include relevant team members in Slack mentions

## 📈 Future Enhancements

- **Predictive Alerts**: Use ML to predict when balances will run low
- **Multi-Currency Support**: Monitor balances in different currencies
- **Custom Alert Channels**: Support for email, SMS, and other notification methods
- **Balance Forecasting**: Predict balance trends based on historical data
- **Integration with Accounting**: Sync with accounting systems for reconciliation

---

**This system ensures your M-Pesa shortcodes always have sufficient funds and alerts you to any unusual activity, preventing failed transactions and maintaining smooth operations.**




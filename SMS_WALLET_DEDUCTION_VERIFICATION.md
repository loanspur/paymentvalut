# SMS Wallet Deduction Verification Guide

## ✅ **How SMS Costs Are Deducted**

### **📱 SMS Campaign Sending Process:**

1. **Pre-send Check**: System checks if wallet has sufficient balance
2. **SMS Sending**: Each SMS is sent via AirTouch API
3. **Cost Calculation**: Cost per SMS is calculated from partner settings
4. **Wallet Deduction**: Total cost is deducted from partner wallet
5. **Transaction Record**: Wallet transaction is created for audit trail

### **🔍 Where to Verify SMS Deductions:**

## **1. Admin Wallet Management Page**
**Location**: `Admin > Wallet Management`

**What to Check:**
- Current wallet balance
- Recent SMS charge transactions
- Transaction history with SMS costs

**How to Access:**
1. Go to your admin dashboard
2. Click on "Wallet Management" in the sidebar
3. Look for transactions with type "SMS Charge"
4. Check the "Amount" column (should show negative values like -1, -2, etc.)

## **2. Database Tables (Direct Verification)**

### **A. Partner Wallets Table**
```sql
-- Check current wallet balances
SELECT 
    p.name as partner_name,
    pw.current_balance,
    pw.currency,
    pw.updated_at
FROM partner_wallets pw
JOIN partners p ON pw.partner_id = p.id
WHERE p.is_active = true
ORDER BY pw.updated_at DESC;
```

### **B. Wallet Transactions Table**
```sql
-- Check SMS charge transactions
SELECT 
    p.name as partner_name,
    wt.transaction_type,
    wt.amount,
    wt.description,
    wt.reference,
    wt.status,
    wt.created_at
FROM wallet_transactions wt
JOIN partner_wallets pw ON wt.wallet_id = pw.id
JOIN partners p ON pw.partner_id = p.id
WHERE wt.transaction_type = 'sms_charge'
ORDER BY wt.created_at DESC
LIMIT 20;
```

### **C. SMS Notifications Table**
```sql
-- Check SMS notifications with costs
SELECT 
    p.name as partner_name,
    sn.recipient_phone,
    sn.message_content,
    sn.sms_cost,
    sn.status,
    sn.sent_at,
    sn.bulk_campaign_id
FROM sms_notifications sn
JOIN partners p ON sn.partner_id = p.id
WHERE sn.message_type = 'bulk_campaign'
ORDER BY sn.sent_at DESC
LIMIT 20;
```

### **D. SMS Campaigns Table**
```sql
-- Check campaign costs and status
SELECT 
    p.name as partner_name,
    sbc.campaign_name,
    sbc.total_recipients,
    sbc.total_cost,
    sbc.status,
    sbc.sent_at,
    sbc.delivered_count,
    sbc.failed_count
FROM sms_bulk_campaigns sbc
JOIN partners p ON sbc.partner_id = p.id
ORDER BY sbc.sent_at DESC
LIMIT 10;
```

## **3. Code Verification Points**

### **A. SMS Campaign Sending Logic**
**File**: `app/api/admin/sms/campaigns/[id]/send/route.ts`

**Key Lines:**
```typescript
// Line 120-125: Pre-send balance check
if (wallet.current_balance < campaign.total_cost) {
  return NextResponse.json(
    { success: false, error: 'Insufficient wallet balance for SMS campaign' },
    { status: 400 }
  )
}

// Line 308-325: Wallet deduction after successful sending
await supabase
  .from('partner_wallets')
  .update({
    current_balance: walletBalance - totalCost
  })
  .eq('partner_id', campaign.partner_id)

// Create wallet transaction record
await supabase
  .from('wallet_transactions')
  .insert({
    wallet_id: wallet.id,
    transaction_type: 'sms_charge',
    amount: -totalCost,
    description: `SMS Campaign: ${campaign.campaign_name}`,
    reference: `SMS_CAMPAIGN_${campaign.id}`,
    status: 'completed'
  })
```

### **B. Individual SMS Sending Logic**
**File**: `app/api/sms/send/route.ts`

**Key Lines:**
```typescript
// Line 284-288: Wallet balance update using RPC
const { error: balanceError } = await supabase
  .rpc('update_partner_wallet_balance', {
    p_partner_id: partner_id,
    p_amount: -smsCost, // Negative amount for deduction
    p_transaction_type: 'sms_charge'
  })
```

## **4. Real-Time Verification Steps**

### **Step 1: Check Current Balance**
1. Go to `Admin > Wallet Management`
2. Note the current balance before sending SMS

### **Step 2: Send SMS Campaign**
1. Go to `Admin > SMS Management > Bulk SMS Campaigns`
2. Create and send a campaign (e.g., 2 recipients = 2 KES cost)

### **Step 3: Verify Deduction**
1. Return to `Admin > Wallet Management`
2. Check that balance decreased by the expected amount
3. Look for new transaction record with type "SMS Charge"

### **Step 4: Check Transaction Details**
1. In wallet transactions, find the SMS charge entry
2. Verify:
   - Amount is negative (e.g., -2.00)
   - Description mentions the campaign name
   - Reference includes campaign ID
   - Status is "completed"

## **5. Expected Results**

### **✅ Successful SMS Deduction Should Show:**
- **Wallet Balance**: Decreased by total SMS cost
- **Transaction Record**: Negative amount with "sms_charge" type
- **SMS Notifications**: Records with actual costs
- **Campaign Status**: "completed" with cost tracking

### **📊 Example Transaction Record:**
```
Partner: Kulman Group Limited
Transaction Type: SMS Charge
Amount: -2.00 KES
Description: SMS Campaign: Test Campaign
Reference: SMS_CAMPAIGN_12345
Status: completed
Date: 2024-01-15 14:30:00
```

## **6. Troubleshooting**

### **If SMS Costs Are NOT Being Deducted:**

1. **Check Campaign Status**: Ensure campaign shows "completed"
2. **Check SMS Notifications**: Verify SMS were actually sent
3. **Check Wallet Balance**: Compare before/after amounts
4. **Check Transaction Records**: Look for missing SMS charge entries
5. **Check Error Logs**: Look for wallet update errors

### **Common Issues:**
- **Insufficient Balance**: Campaign won't start if balance is too low
- **Failed SMS**: Only successful SMS are charged
- **Database Errors**: Check for wallet update failures
- **Missing Wallet**: Partner might not have a wallet record

## **7. Quick Verification Query**

Run this query to get a complete overview:

```sql
-- Complete SMS cost verification
SELECT 
    p.name as partner_name,
    pw.current_balance as current_wallet_balance,
    COUNT(sn.id) as total_sms_sent,
    SUM(sn.sms_cost) as total_sms_cost,
    COUNT(wt.id) as sms_transactions,
    SUM(wt.amount) as total_deducted
FROM partners p
JOIN partner_wallets pw ON p.id = pw.partner_id
LEFT JOIN sms_notifications sn ON p.id = sn.partner_id 
    AND sn.message_type = 'bulk_campaign'
    AND sn.status = 'sent'
LEFT JOIN wallet_transactions wt ON pw.id = wt.wallet_id 
    AND wt.transaction_type = 'sms_charge'
WHERE p.is_active = true
GROUP BY p.id, p.name, pw.current_balance
ORDER BY p.name;
```

This will show you:
- Current wallet balance
- Total SMS sent
- Total SMS cost calculated
- Total amount deducted from wallet
- Any discrepancies between calculated and deducted amounts

**The system is designed to automatically deduct SMS costs from partner wallets after successful SMS delivery!** 💰📱

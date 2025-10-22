# 🛡️ Duplicate Prevention & Production Safeguards

This document explains the comprehensive safeguards implemented to prevent duplicate disbursements and handle insufficient funds intelligently in production environments.

## 🎯 Overview

The system implements multiple layers of protection against:
- **Duplicate disbursements** from malfunctioning USSD systems
- **Rate limiting** to prevent abuse
- **Intelligent insufficient funds handling** with queuing
- **IP-based restrictions** for security

## 🆕 **Enhanced Relaxed Rules (December 2024)**

### **Key Improvements:**
- **Reduced time windows**: 24-hour restriction reduced to 5 minutes for exact amounts
- **Amount tolerance**: Allow similar amounts (±10%) within 15 minutes for legitimate loan scenarios
- **Configurable actions**: Choose to block, warn, or allow similar amount transactions
- **Enhanced logging**: Comprehensive monitoring of similar amount patterns
- **Partner-specific settings**: Customize rules per partner based on their business model

### **Benefits for Legitimate Use Cases:**
- ✅ **Emergency loans**: Multiple small amounts for urgent needs
- ✅ **Installment disbursements**: Similar amounts for loan installments
- ✅ **Family loans**: Similar amounts to family members
- ✅ **Business operations**: Regular similar disbursements for business needs
- ✅ **Loan refinancing**: Similar amounts for loan restructuring

## 🔒 Duplicate Prevention Layers

### 1. **Basic Idempotency** (Always Active)
- **Mechanism**: `client_request_id` + `partner_id` unique constraint
- **Purpose**: Prevents exact duplicate requests
- **Response**: Returns existing disbursement if found
- **Status Code**: `200 OK` with existing disbursement details

### 2. **Time-Based Restrictions** (Configurable)

#### **Same Customer + Exact Amount Window** (Enhanced)
- **Default**: 5 minutes (reduced from 24 hours)
- **Logic**: Same customer + exact same amount within time window
- **Block Duration**: Configurable (default 30 minutes)
- **Response**: `409 Conflict` with detailed reason

```json
{
  "status": "rejected",
  "error_code": "DUPLICATE_1002",
  "error_message": "Exact duplicate disbursement: Same customer (CUST123) and exact amount (KES 1000) within 5 minutes. Last request was 2 minutes ago.",
  "block_type": "duplicate_customer_amount"
}
```

#### **Same Customer + Similar Amount Window** (New)
- **Default**: 15 minutes
- **Logic**: Same customer + similar amount (±10% tolerance) within time window
- **Action**: Configurable - can block or allow with warning
- **Response**: `409 Conflict` (if blocked) or `200 OK` with warning (if allowed)

```json
{
  "status": "rejected",
  "error_code": "DUPLICATE_1002", 
  "error_message": "Similar amount disbursement: Same customer (CUST123) with similar amount (KES 1000) within 15 minutes. Found 2 similar requests. Last request was 5 minutes ago.",
  "block_type": "duplicate_customer_similar_amount"
}
```

#### **Same IP Window** (Enhanced)
- **Default**: 2 minutes (reduced from previous settings)
- **Logic**: Same IP address within time window
- **Block Duration**: Configurable (default 30 minutes)
- **Response**: `409 Conflict` with rate limit message

```json
{
  "status": "rejected",
  "error_code": "DUPLICATE_1002",
  "error_message": "Rate limit exceeded: Same IP (192.168.1.100) within 2 minutes. Last request was 1 minute ago.",
  "block_type": "duplicate_ip"
}
```

### 3. **Daily Limits** (Configurable)

#### **Per Customer Limits**
- **Default Amount Limit**: KES 50,000 per day
- **Default Count Limit**: 10 disbursements per day
- **Logic**: Tracks total amount and count per customer per day
- **Response**: `409 Conflict` when limits exceeded

#### **Per IP Limits**
- **Default Amount Limit**: KES 100,000 per day
- **Default Count Limit**: 20 disbursements per day
- **Logic**: Tracks total amount and count per IP per day
- **Response**: `409 Conflict` when limits exceeded

### 4. **Active Blocks** (Dynamic)
- **Mechanism**: Temporary blocks with expiration times
- **Duration**: Configurable (default 30 minutes)
- **Auto-cleanup**: Expired blocks are automatically ignored
- **Response**: `409 Conflict` with block reason

## 💰 Insufficient Funds Handling

### **Intelligent Queue System**

When insufficient funds are detected, the system can either:

#### **Option 1: Queue for Retry** (Recommended)
- **Status**: `202 Accepted` with `queued` status
- **Logic**: Request is queued and retried automatically
- **Retry Strategy**: Exponential backoff (5min, 10min, 20min, 40min)
- **Max Retries**: 3 attempts
- **Priority**: High priority for customer requests

```json
{
  "status": "queued",
  "disbursement_id": "uuid",
  "error_code": "INSUFFICIENT_FUNDS_1001",
  "error_message": "Insufficient funds. Current balance: KES 5,000.00, Required: KES 10,000.00, Shortfall: KES 5,000.00. Request queued for retry.",
  "current_balance": 5000.00,
  "requested_amount": 10000.00,
  "shortfall": 5000.00,
  "estimated_refill_time": "2025-01-01T15:00:00Z",
  "will_callback": true
}
```

#### **Option 2: Reject Immediately**
- **Status**: `402 Payment Required`
- **Logic**: Request is rejected immediately
- **Use Case**: When queueing is disabled

```json
{
  "status": "rejected",
  "error_code": "INSUFFICIENT_FUNDS_1002",
  "error_message": "Insufficient funds. Current balance: KES 5,000.00, Required: KES 10,000.00, Shortfall: KES 5,000.00",
  "current_balance": 5000.00,
  "requested_amount": 10000.00,
  "shortfall": 5000.00
}
```

### **Queue Processing**

The system includes an automated queue processor that:
- **Runs periodically** (every 5 minutes)
- **Checks fund availability** for queued requests
- **Processes requests** when funds become available
- **Implements exponential backoff** for retries
- **Handles failures gracefully** with proper error handling

## ⚙️ Configuration

### **Restriction Types** (Enhanced)

| Restriction Type | Description | Default Value | Configurable |
|------------------|-------------|---------------|--------------|
| `same_customer_amount_time` | Same customer + exact amount within time window | 5 minutes (reduced from 24 hours) | ✅ |
| `same_customer_similar_amount` | Same customer + similar amount (±10%) within time window | 15 minutes | ✅ |
| `same_ip_time` | Same IP within time window | 2 minutes (reduced from 1 hour) | ✅ |
| `same_customer_daily_limit` | Daily limits per customer | KES 50,000 / 10 requests | ✅ |
| `same_ip_daily_limit` | Daily limits per IP | KES 100,000 / 20 requests | ✅ |
| `insufficient_funds_queue` | Enable/disable queueing | Enabled | ✅ |

### **New Configuration Options**

| Configuration | Description | Default Value | Purpose |
|---------------|-------------|---------------|---------|
| `amount_tolerance_percentage` | Percentage tolerance for similar amounts | 10.00% | Allow similar amounts within tolerance |
| `log_similar_amounts` | Log similar amount transactions | true | Monitor for patterns |
| `action_type` | Action for similar amounts | 'warn_and_allow' | block, warn_and_allow, or rate_limit |

### **Database Tables**

#### **`disbursement_restrictions`** (Enhanced)
Stores configuration for each partner's restrictions with new fields:
- `amount_tolerance_percentage`: Percentage tolerance for similar amounts
- `log_similar_amounts`: Whether to log similar amount transactions
- `action_type`: Action to take (block, warn_and_allow, rate_limit)

#### **`disbursement_blocks`**
Tracks active blocks with expiration times.

#### **`insufficient_funds_queue`**
Manages queued requests with retry logic.

#### **`duplicate_prevention_logs`** (New)
Enhanced logging for duplicate detection with:
- Detection type (exact_duplicate, similar_amount, rate_limit)
- Amount tolerance and percentage differences
- Similar amounts found
- Action taken (blocked, allowed_with_warning, rate_limited)

## 🚀 API Endpoints

### **Main Disbursement Endpoint**
```
POST /functions/v1/disburse
```

**Enhanced Response Codes:**
- `200 OK`: Idempotency - existing request found
- `202 Accepted`: Request queued for insufficient funds
- `402 Payment Required`: Insufficient funds, immediate rejection
- `409 Conflict`: Duplicate request detected
- `429 Too Many Requests`: Rate limit exceeded

### **Queue Processing Endpoint**
```
POST /functions/v1/process-insufficient-funds-queue
```

**Purpose**: Manually trigger queue processing (also runs automatically)

## 🔧 Implementation Details

### **Duplicate Prevention Service**

The `DuplicatePreventionService` class provides:
- **Multi-layer duplicate checking**
- **Configurable restrictions per partner**
- **Intelligent insufficient funds handling**
- **Queue management with retry logic**
- **Block management with expiration**

### **Key Methods**

```typescript
// Comprehensive duplicate check
checkForDuplicates(partnerId, customerId, msisdn, amount, clientIp, clientRequestId)

// Insufficient funds check
checkInsufficientFunds(partnerId, amount)

// Queue management
queueForInsufficientFunds(disbursementRequestId, partnerId, customerId, msisdn, amount, clientIp, priority)

// Block management
createBlock(partnerId, blockType, blockReason, customerId, clientIp, amount, originalRequestId, expiresInMinutes)
```

## 📊 Monitoring & Alerts

### **Metrics to Monitor**
- **Duplicate detection rate** per partner
- **Queue processing success rate**
- **Average queue processing time**
- **Block creation frequency**
- **Insufficient funds occurrence rate**

### **Alert Conditions**
- **High duplicate rate** (>5% of requests)
- **Queue processing failures** (>10% failure rate)
- **Long queue processing times** (>30 minutes average)
- **Frequent insufficient funds** (>20% of requests)

## 🛠️ Troubleshooting

### **Common Issues**

#### **False Positives in Duplicate Detection**
- **Cause**: Aggressive time windows
- **Solution**: Adjust `time_window_minutes` in restrictions
- **Check**: Review `disbursement_blocks` table for active blocks

#### **Queue Not Processing**
- **Cause**: Queue processor not running
- **Solution**: Check cron job or manual trigger
- **Check**: `insufficient_funds_queue` table status

#### **Insufficient Funds Not Detected**
- **Cause**: Stale balance data
- **Solution**: Ensure balance monitoring is active
- **Check**: `balance_requests` table for recent data

### **Debug Queries**

```sql
-- Check active blocks
SELECT * FROM disbursement_blocks 
WHERE block_expires_at IS NULL OR block_expires_at > NOW()
ORDER BY created_at DESC;

-- Check queue status
SELECT partner_id, status, COUNT(*) 
FROM insufficient_funds_queue 
GROUP BY partner_id, status;

-- Check recent duplicates
SELECT customer_id, amount, COUNT(*) as duplicate_count
FROM disbursement_requests 
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY customer_id, amount
HAVING COUNT(*) > 1;
```

## 🔄 Migration & Deployment

### **Database Migration**
```bash
# Apply the enhanced duplicate prevention migration
supabase db push
```

### **Edge Function Deployment**
```bash
# Deploy the enhanced disbursement function
supabase functions deploy disburse

# Deploy the queue processor
supabase functions deploy process-insufficient-funds-queue
```

### **Configuration Setup**
```sql
-- Configure restrictions for a specific partner
INSERT INTO disbursement_restrictions (partner_id, restriction_type, time_window_minutes, is_enabled)
VALUES ('partner-uuid', 'same_customer_amount_time', 3, true);
```

## 📈 Performance Considerations

### **Database Indexes**
- **Composite indexes** for efficient duplicate detection
- **Time-based indexes** for queue processing
- **Status indexes** for quick filtering

### **Caching Strategy**
- **Balance data caching** (5-minute TTL)
- **Restriction configuration caching** (1-hour TTL)
- **Active blocks caching** (15-minute TTL)

### **Rate Limiting**
- **Per-partner rate limits** to prevent abuse
- **Global rate limits** for system protection
- **Queue processing rate limits** to prevent overload

## 🎯 Best Practices

### **For USSD Integration**
1. **Always use unique `client_request_id`**
2. **Implement proper error handling** for all response codes
3. **Handle queued requests** with appropriate user messaging
4. **Monitor duplicate rates** and adjust restrictions if needed

### **For System Administration**
1. **Regular monitoring** of queue processing
2. **Periodic review** of restriction configurations
3. **Balance monitoring** to prevent insufficient funds
4. **Alert setup** for critical metrics

### **For Development**
1. **Test all restriction scenarios** thoroughly
2. **Simulate insufficient funds** conditions
3. **Verify queue processing** under load
4. **Monitor performance** impact of restrictions

This comprehensive system ensures production-ready duplicate prevention and intelligent insufficient funds handling while maintaining high performance and reliability.

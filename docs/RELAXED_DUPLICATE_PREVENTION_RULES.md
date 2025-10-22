# 🚀 Relaxed Duplicate Prevention Rules - Implementation Guide

## 📋 **Overview**

This document outlines the implementation of relaxed duplicate prevention rules that allow legitimate loan disbursements while maintaining fraud protection. The changes were implemented in December 2024 to address the need for clients to borrow similar amounts within short periods.

## 🎯 **Key Changes Summary**

### **Before (Strict Rules):**
- ❌ **24-hour restriction** for same phone + same amount
- ❌ **1-hour restriction** for same phone (any amount)
- ❌ **No amount tolerance** - exact matches only
- ❌ **Fixed time windows** - not configurable per partner

### **After (Relaxed Rules):**
- ✅ **5-minute restriction** for same phone + exact amount
- ✅ **2-minute restriction** for same phone (any amount)
- ✅ **10% amount tolerance** for similar amounts within 15 minutes
- ✅ **Configurable time windows** per partner
- ✅ **Enhanced logging** for monitoring and analysis

## 🔧 **Technical Implementation**

### **1. Database Schema Changes**

#### **New Migration: `061_relaxed_duplicate_prevention_rules.sql`**
```sql
-- Enhanced disbursement_restrictions table
ALTER TABLE disbursement_restrictions 
ADD COLUMN amount_tolerance_percentage DECIMAL(5,2) DEFAULT 10.00;

ALTER TABLE disbursement_restrictions 
ADD COLUMN log_similar_amounts BOOLEAN DEFAULT true;

ALTER TABLE disbursement_restrictions 
ADD COLUMN action_type VARCHAR(20) DEFAULT 'block' 
CHECK (action_type IN ('block', 'warn_and_allow', 'rate_limit'));

-- New duplicate_prevention_logs table
CREATE TABLE duplicate_prevention_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID NOT NULL REFERENCES partners(id),
    detection_type VARCHAR(50) NOT NULL,
    amount_tolerance_percentage DECIMAL(5,2),
    similar_amounts_found JSONB DEFAULT '[]',
    action_taken VARCHAR(20) NOT NULL,
    -- ... other fields
);
```

### **2. Enhanced Duplicate Prevention Service**

#### **New Features:**
- **Amount tolerance calculation**: `±10%` for similar amounts
- **Configurable action types**: block, warn_and_allow, rate_limit
- **Enhanced logging**: Comprehensive duplicate detection logs
- **Similar amount detection**: Find amounts within tolerance range

#### **Key Methods:**
```typescript
// Enhanced time-based restrictions with amount tolerance
private async checkTimeBasedRestrictions(
  partnerId: string,
  customerId: string,
  msisdn: string,
  amount: number,
  clientIp: string
): Promise<DuplicateCheckResult>

// New logging method for monitoring
private async logDuplicateDetection(logData: {
  detectionType: 'exact_duplicate' | 'similar_amount' | 'rate_limit'
  amountTolerancePercentage?: number
  actionTaken: 'blocked' | 'allowed_with_warning' | 'rate_limited'
  similarAmountsFound: any[]
}): Promise<void>
```

### **3. Updated Disbursement Function**

#### **Changes in `supabase/functions/disburse/index.ts`:**
- **Removed**: 24-hour hardcoded restriction
- **Removed**: 1-hour hardcoded restriction  
- **Added**: Enhanced duplicate prevention service integration
- **Added**: Configurable time windows and amount tolerance

## 📊 **New Restriction Types**

### **1. Exact Amount Detection**
```json
{
  "restriction_type": "same_customer_amount_time",
  "time_window_minutes": 5,
  "amount_tolerance_percentage": 0.00,
  "action_type": "block"
}
```
- **Purpose**: Prevent exact duplicate amounts
- **Time Window**: 5 minutes (reduced from 24 hours)
- **Tolerance**: 0% (exact match only)
- **Action**: Block the request

### **2. Similar Amount Detection**
```json
{
  "restriction_type": "same_customer_similar_amount", 
  "time_window_minutes": 15,
  "amount_tolerance_percentage": 10.00,
  "action_type": "warn_and_allow"
}
```
- **Purpose**: Allow similar amounts with monitoring
- **Time Window**: 15 minutes
- **Tolerance**: ±10% of the amount
- **Action**: Allow but log for monitoring

### **3. IP Rate Limiting**
```json
{
  "restriction_type": "same_ip_time",
  "time_window_minutes": 2,
  "action_type": "rate_limit"
}
```
- **Purpose**: Prevent rapid requests from same IP
- **Time Window**: 2 minutes (reduced from 1 hour)
- **Action**: Rate limit the request

## 🎛️ **Configuration Examples**

### **Conservative Partner (High Security)**
```sql
INSERT INTO disbursement_restrictions (partner_id, restriction_type, time_window_minutes, amount_tolerance_percentage, action_type)
VALUES 
  ('partner-uuid', 'same_customer_amount_time', 3, 0.00, 'block'),
  ('partner-uuid', 'same_customer_similar_amount', 10, 5.00, 'block'),
  ('partner-uuid', 'same_ip_time', 1, NULL, 'rate_limit');
```

### **Liberal Partner (Loan Focus)**
```sql
INSERT INTO disbursement_restrictions (partner_id, restriction_type, time_window_minutes, amount_tolerance_percentage, action_type)
VALUES 
  ('partner-uuid', 'same_customer_amount_time', 5, 0.00, 'block'),
  ('partner-uuid', 'same_customer_similar_amount', 30, 15.00, 'warn_and_allow'),
  ('partner-uuid', 'same_ip_time', 2, NULL, 'rate_limit');
```

### **Default Configuration (Balanced)**
```sql
INSERT INTO disbursement_restrictions (partner_id, restriction_type, time_window_minutes, amount_tolerance_percentage, action_type)
VALUES 
  ('partner-uuid', 'same_customer_amount_time', 5, 0.00, 'block'),
  ('partner-uuid', 'same_customer_similar_amount', 15, 10.00, 'warn_and_allow'),
  ('partner-uuid', 'same_ip_time', 2, NULL, 'rate_limit');
```

## 📈 **Monitoring and Analytics**

### **New Logging Table: `duplicate_prevention_logs`**

#### **Key Metrics to Monitor:**
```sql
-- Similar amount detection rate
SELECT 
  partner_id,
  detection_type,
  COUNT(*) as detection_count,
  AVG(percentage_difference) as avg_percentage_diff
FROM duplicate_prevention_logs 
WHERE detection_type = 'similar_amount'
GROUP BY partner_id, detection_type;

-- Action taken distribution
SELECT 
  action_taken,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
FROM duplicate_prevention_logs 
GROUP BY action_taken;

-- Time-based patterns
SELECT 
  DATE_TRUNC('hour', created_at) as hour,
  detection_type,
  COUNT(*) as detections
FROM duplicate_prevention_logs 
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY hour, detection_type
ORDER BY hour DESC;
```

### **Alert Conditions:**
- **High similar amount rate**: >20% of requests flagged as similar
- **Frequent warnings**: >50 similar amount warnings per hour
- **Unusual patterns**: Same customer with >5 similar amounts in 1 hour

## 🚀 **Deployment Steps**

### **1. Apply Database Migration**
```bash
# Apply the new migration
supabase db push

# Verify the new tables and columns
supabase db diff
```

### **2. Deploy Updated Functions**
```bash
# Deploy the enhanced disbursement function
supabase functions deploy disburse

# Deploy the enhanced duplicate prevention service
supabase functions deploy _shared/duplicate-prevention
```

### **3. Configure Partner Settings**
```sql
-- Set up default relaxed rules for all partners
INSERT INTO disbursement_restrictions (partner_id, restriction_type, time_window_minutes, amount_tolerance_percentage, action_type, is_enabled)
SELECT 
  p.id,
  'same_customer_amount_time',
  5,
  0.00,
  'block',
  true
FROM partners p
WHERE NOT EXISTS (
  SELECT 1 FROM disbursement_restrictions dr 
  WHERE dr.partner_id = p.id 
  AND dr.restriction_type = 'same_customer_amount_time'
);
```

### **4. Monitor and Adjust**
- **Week 1**: Monitor detection rates and false positives
- **Week 2**: Adjust time windows based on patterns
- **Week 3**: Fine-tune amount tolerance percentages
- **Week 4**: Optimize based on business requirements

## 🔍 **Testing Scenarios**

### **1. Exact Duplicate Test**
```bash
# Request 1: KES 1000 to 254712345678
curl -X POST /functions/v1/disburse \
  -d '{"msisdn":"254712345678","amount":1000,"client_request_id":"test1"}'

# Request 2: Same amount within 5 minutes (should be blocked)
curl -X POST /functions/v1/disburse \
  -d '{"msisdn":"254712345678","amount":1000,"client_request_id":"test2"}'
```

### **2. Similar Amount Test**
```bash
# Request 1: KES 1000 to 254712345678
curl -X POST /functions/v1/disburse \
  -d '{"msisdn":"254712345678","amount":1000,"client_request_id":"test3"}'

# Request 2: KES 1050 (5% higher) within 15 minutes (should be allowed with warning)
curl -X POST /functions/v1/disburse \
  -d '{"msisdn":"254712345678","amount":1050,"client_request_id":"test4"}'
```

### **3. Amount Tolerance Test**
```bash
# Request 1: KES 1000 to 254712345678
curl -X POST /functions/v1/disburse \
  -d '{"msisdn":"254712345678","amount":1000,"client_request_id":"test5"}'

# Request 2: KES 1150 (15% higher) within 15 minutes (should be blocked if tolerance is 10%)
curl -X POST /functions/v1/disburse \
  -d '{"msisdn":"254712345678","amount":1150,"client_request_id":"test6"}'
```

## ⚠️ **Important Considerations**

### **Security Implications:**
- **Reduced time windows** may allow more rapid duplicate attempts
- **Amount tolerance** could be exploited with small variations
- **Enhanced logging** is critical for monitoring and detection

### **Business Impact:**
- **Improved customer experience** for legitimate loan scenarios
- **Reduced false positives** from legitimate similar amounts
- **Better support** for installment and emergency loan products

### **Operational Changes:**
- **Monitor logs regularly** for unusual patterns
- **Adjust settings** based on partner feedback
- **Train support team** on new error messages and responses

## 📞 **Support and Troubleshooting**

### **Common Issues:**

#### **1. Too Many Similar Amount Warnings**
```sql
-- Check if tolerance is too high
SELECT amount_tolerance_percentage, COUNT(*) 
FROM disbursement_restrictions 
WHERE restriction_type = 'same_customer_similar_amount'
GROUP BY amount_tolerance_percentage;
```

#### **2. False Positives Still Occurring**
```sql
-- Check time windows
SELECT restriction_type, time_window_minutes, COUNT(*)
FROM disbursement_restrictions 
GROUP BY restriction_type, time_window_minutes;
```

#### **3. Missing Logs**
```sql
-- Verify logging is enabled
SELECT partner_id, log_similar_amounts, COUNT(*)
FROM disbursement_restrictions 
GROUP BY partner_id, log_similar_amounts;
```

### **Contact Information:**
- **Technical Issues**: Development Team
- **Business Configuration**: Product Team  
- **Monitoring Alerts**: Operations Team

---

**Last Updated**: December 2024  
**Version**: 2.0  
**Status**: Production Ready

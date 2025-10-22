# 🔍 Testing Mifos X Default Webhook Payload

This guide will help you capture and analyze the actual webhook payload that Mifos X sends when a loan is approved.

## 🎯 **Method 1: Using Webhook.site (Recommended)**

### **Step 1: Get a Webhook URL**
1. Go to **https://webhook.site/**
2. You'll see a unique URL like: `https://webhook.site/12345678-1234-1234-1234-123456789abc`
3. **Copy this URL** - this is your temporary webhook endpoint

### **Step 2: Configure Mifos X Webhook**
1. In your Mifos X system, go to **Manage Hooks** → **Create Hook**
2. Fill out the form with these values:

| Field | Value |
|-------|-------|
| **Hook Template*** | `Web` |
| **Display Name*** | `Test Webhook - Payload Capture` |
| **Active** | ✅ **Check this box** |
| **Content Type*** | `application/json` |
| **Payload URL*** | `[Your webhook.site URL from Step 1]` |
| **UGD Template** | Leave as "Select UGD Template" |
| **Events*** | `LOAN` → `APPROVE` |

3. **Submit the form** to create the webhook

### **Step 3: Test the Webhook**
1. **Create a test loan** in Mifos X
2. **Approve the loan** - this will trigger the webhook
3. **Go back to webhook.site** and refresh the page
4. You should see the webhook request with the payload

### **Step 4: Analyze the Payload**
The webhook.site page will show you:
- **Headers** sent by Mifos X
- **Raw payload** (JSON body)
- **Timestamp** of the request
- **Request method** (should be POST)

## 🎯 **Method 2: Using RequestBin**

### **Step 1: Create a RequestBin**
1. Go to **https://requestbin.com/**
2. Click **"Create Request Bin"**
3. **Copy the bin URL** provided

### **Step 2: Configure Mifos X**
Use the RequestBin URL in your Mifos X webhook configuration (same as Method 1, Step 2)

### **Step 3: Test and Analyze**
Same as Method 1, Steps 3-4

## 📋 **What to Look For**

When you receive the webhook payload, look for these key fields:

### **Expected Fields:**
- `loanId` or `id` - Loan identifier
- `clientId` or `client_id` - Client identifier  
- `amount` or `principal` - Loan amount
- `status` - Loan status
- `approvedDate` or `approved_date` - Approval timestamp
- `productId` or `product_id` - Loan product identifier

### **Possible Field Names:**
Mifos X might use different field names. Common variations:
- `loanId` vs `id` vs `loan_id`
- `clientId` vs `client_id` vs `clientId`
- `amount` vs `principal` vs `loanAmount`
- `approvedDate` vs `approved_date` vs `approvalDate`

## 🔧 **Sample Payload Analysis**

Once you capture the payload, it might look something like this:

```json
{
  "id": 12345,
  "accountNo": "000000123",
  "status": {
    "id": 300,
    "code": "loanStatusType.approved",
    "value": "Approved"
  },
  "clientId": 67890,
  "clientName": "John Doe",
  "loanProductId": 1,
  "loanProductName": "Personal Loan",
  "principal": 5000,
  "approvedPrincipal": 5000,
  "currency": {
    "code": "KES",
    "name": "Kenyan Shilling"
  },
  "timeline": {
    "approvedOnDate": ["22", "10", "2024"],
    "approvedByUsername": "admin"
  }
}
```

## 🎯 **Next Steps After Capturing Payload**

1. **Save the payload** to a file (e.g., `mifos-default-payload.json`)
2. **Identify the field mappings** needed for our webhook handler
3. **Update our webhook handler** to work with the actual Mifos X payload structure
4. **Test the integration** with the real payload format

## 🚨 **Important Notes**

- **Webhook.site URLs expire** after a certain time, so capture the payload quickly
- **RequestBin URLs are permanent** but have usage limits
- **Test with a real loan approval** to get the actual payload structure
- **Check both headers and body** - Mifos X might send important data in headers

## 📞 **Need Help?**

If you encounter any issues:
1. Check that the webhook is **active** in Mifos X
2. Verify the **webhook URL** is correct
3. Ensure the loan is actually **approved** (not just submitted)
4. Check Mifos X logs for any webhook delivery errors

---

**Once you capture the payload, share it with me and I'll help you update our webhook handler to work with the actual Mifos X payload structure!** 🚀


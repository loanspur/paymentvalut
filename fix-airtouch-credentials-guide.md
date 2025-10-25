# Fix AirTouch Credentials - Step by Step Guide

## 🚨 Problem Identified

**Error Code**: 1006 - INVALID CREDENTIALS  
**Issue**: The current AirTouch credentials (`loanspur` username) are not valid for the AirTouch API

## 🔧 Solution Steps

### Step 1: Get Valid AirTouch API Credentials

1. **Log into AirTouch Dashboard**
   - Go to: https://airtouch.co.ke (or your AirTouch provider's website)
   - Log in with your AirTouch account

2. **Navigate to API Settings**
   - Look for "API Settings", "Developer Settings", or "SMS API"
   - Find your API credentials section

3. **Get API Credentials**
   - Copy your **API Username**
   - Copy your **API Password**
   - Note your **Sender ID** (if different from "LoanSpur")

### Step 2: Update SMS Settings in Payment Vault

1. **Go to SMS Settings Page**
   - Navigate to: `/admin/sms-settings`
   - Find the SMS settings for your partner

2. **Edit SMS Settings**
   - Click "Edit" on the SMS settings
   - Update the following fields:
     - **Username**: Enter your valid AirTouch API username
     - **Password**: Enter your valid AirTouch API password
     - **Sender ID**: Update if needed (or keep "LoanSpur" if it's valid)

3. **Save Settings**
   - Click "Save" to update the credentials
   - The system will encrypt and store the new credentials

### Step 3: Test the Fix

1. **Create Test Campaign**
   - Go to SMS Campaigns page
   - Create a new campaign with a real phone number
   - Send the campaign

2. **Verify Results**
   - Check that campaign status shows "completed"
   - Verify SMS notifications show "sent" status
   - Check that you receive the SMS on your phone

## 🔍 Alternative Solutions

### If You Don't Have AirTouch Account:

1. **Sign Up for AirTouch**
   - Register at: https://airtouch.co.ke
   - Complete account verification
   - Get API credentials

2. **Use Different SMS Provider**
   - Consider other SMS providers like:
     - Africa's Talking
     - SMS Gateway API
     - Twilio
   - Update the SMS sending code to use the new provider

### If Credentials Are Correct But Still Failing:

1. **Contact AirTouch Support**
   - Email: support@airtouch.co.ke
   - Phone: Check their website for contact details
   - Ask them to verify your account status

2. **Check Account Status**
   - Verify your AirTouch account is active
   - Check if there are any pending approvals
   - Ensure your account has sufficient balance

## 🧪 Testing the Fix

After updating credentials, run this test:

```bash
node test-airtouch-api-detailed.js
```

This will test the new credentials and show if they work.

## 📱 Expected Results After Fix

- ✅ **Campaign Status**: "completed" instead of "failed"
- ✅ **SMS Notifications**: "sent" status
- ✅ **AirTouch API Response**: "1000" (success) instead of "1006" (invalid credentials)
- ✅ **SMS Delivery**: You should receive the SMS on your phone

## 🚨 Common Issues and Solutions

### Issue 1: Still Getting 1006 Error
**Solution**: Double-check the credentials are correct and account is active

### Issue 2: Getting 1001 Error (Invalid Sender ID)
**Solution**: Register your sender ID with AirTouch or use an approved one

### Issue 3: Getting 1004 Error (Insufficient Balance)
**Solution**: Top up your AirTouch account

### Issue 4: Getting 1002 Error (Invalid Phone Number)
**Solution**: Ensure phone numbers are in format: 254XXXXXXXXX

## 📞 AirTouch Support Contacts

- **Website**: https://airtouch.co.ke
- **Email**: support@airtouch.co.ke
- **Phone**: Check their website for current contact details

## 🎯 Summary

The SMS sending failure is due to **invalid AirTouch credentials**. The solution is to:

1. ✅ Get valid AirTouch API credentials
2. ✅ Update SMS settings with correct credentials
3. ✅ Test SMS sending
4. ✅ Verify SMS delivery

Once you have valid credentials, the SMS system will work perfectly!

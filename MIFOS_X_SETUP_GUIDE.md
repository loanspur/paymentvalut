# Mifos X Integration Setup Guide

## 🎯 Overview

This guide will help you configure the Mifos X integration for automated loan disbursements. The system connects to your Mifos X server to fetch loan products and handle loan approval webhooks.

## 📋 Prerequisites

1. **Mifos X Server**: You need access to a running Mifos X server
2. **User Account**: A user account in Mifos X with API access permissions
3. **Network Access**: Your Payment Vault system must be able to reach the Mifos X server

## 🔧 Configuration Steps

### Step 1: Access Partner Configuration

1. **Log in** to your Payment Vault system
2. **Navigate** to the Partners page
3. **Edit** an existing partner or **create** a new partner
4. **Scroll down** to the "Mifos X Configuration" section

### Step 2: Fill in Mifos X Details

#### **Host URL**
- **Format**: `https://your-mifos-server.com` or `http://localhost:8080`
- **Examples**:
  - Demo server: `https://demo.mifos.io`
  - Local server: `http://localhost:8080`
  - Production server: `https://mifos.yourcompany.com`

#### **Username**
- **Your Mifos X username**
- **Example**: `mifos`, `admin`, or your custom username

#### **Password**
- **Your Mifos X password**
- **Example**: `password` (for demo server)

#### **Tenant ID**
- **Usually**: `default`
- **Check your Mifos X server** for the correct tenant identifier

#### **API Endpoint**
- **Default**: `/fineract-provider/api/v1`
- **This is usually correct** for most Mifos X installations

### Step 3: Test Connection

1. **Click "Test Connection"** button
2. **Wait for the result**:
   - ✅ **Success**: "Mifos X connection successful!"
   - ❌ **Error**: Check the error message and follow the troubleshooting steps

### Step 4: Configure Webhook (Optional)

1. **Webhook URL**: Automatically generated (e.g., `https://your-domain.com/api/mifos/webhook/loan-approval`)
2. **Webhook Secret Token**: Click "Generate Token" to create a secure token
3. **Configure in Mifos X**: Use these values in your Mifos X webhook settings

## 🧪 Testing with Demo Server

If you don't have your own Mifos X server, you can test with the demo server:

```
Host URL: https://demo.mifos.io
Username: mifos
Password: password
Tenant ID: default
API Endpoint: /fineract-provider/api/v1
```

## 🔍 Troubleshooting

### 404 "Not Found" Error

**Cause**: The Mifos X server is not accessible or the URL is incorrect.

**Solutions**:
1. **Check Host URL**: Ensure the URL is correct and accessible
2. **Verify Server**: Make sure the Mifos X server is running
3. **Test Connectivity**: Try accessing the URL in your browser
4. **Check API Endpoint**: Ensure `/fineract-provider/api/v1` is correct

### 401 "Authentication Failed" Error

**Cause**: Invalid credentials or user permissions.

**Solutions**:
1. **Check Username/Password**: Verify they are correct
2. **Verify Tenant ID**: Usually `default`, but check your server
3. **Check User Permissions**: Ensure the user has API access
4. **Account Status**: Verify the user account is active

### 403 "Access Forbidden" Error

**Cause**: User doesn't have proper permissions.

**Solutions**:
1. **Check User Role**: Ensure user has appropriate permissions
2. **Verify Tenant**: Make sure tenant ID is correct
3. **Contact Admin**: Ask your Mifos X administrator to check permissions

### Network/Connection Errors

**Cause**: Network connectivity issues.

**Solutions**:
1. **Check Network**: Ensure your server can reach the Mifos X server
2. **Firewall**: Check if any firewalls are blocking the connection
3. **SSL/TLS**: For HTTPS, ensure SSL certificates are valid
4. **Port Access**: Ensure the required ports are open

## 📚 Common Mifos X Endpoints

- **Authentication**: `/fineract-provider/api/v1/authentication`
- **System Info**: `/fineract-provider/api/v1/system`
- **Loan Products**: `/fineract-provider/api/v1/loanproducts`
- **Offices**: `/fineract-provider/api/v1/offices`
- **Clients**: `/fineract-provider/api/v1/clients`

## 🚀 Next Steps

After successful connection:

1. **Configure Auto-Disbursal**: Set up which loan products should be auto-disbursed
2. **Set Amount Limits**: Configure minimum and maximum disbursement amounts
3. **Test Webhook**: Configure webhook in Mifos X for loan approvals
4. **Monitor Integration**: Check the loan products page for successful integration

## 📞 Support

If you continue to have issues:

1. **Check Mifos X Logs**: Look at your Mifos X server logs for errors
2. **Verify Network**: Test network connectivity to the Mifos X server
3. **Contact Support**: Reach out to your system administrator or Mifos X support

## 🔗 Useful Links

- [Mifos X Documentation](https://mifosforge.jira.com/wiki/spaces/docs)
- [Fineract API Documentation](https://demo.mifos.io/fineract-provider/api-docs/apiLive.htm)
- [Mifos Community](https://community.mifos.org/)

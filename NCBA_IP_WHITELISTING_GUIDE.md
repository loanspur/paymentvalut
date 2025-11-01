# NCBA IP Whitelisting Guide

## Issue: 403 Forbidden Error

When you see a 403 error from NCBA with a "Security Notice" message, it means your server's IP address has not been whitelisted by NCBA.

## Steps to Resolve

### Step 1: Get Your Server's Public IP Address

Your server IP address is needed for NCBA to whitelist your requests. Here are ways to get it:

#### Option A: Check Your Hosting Provider
- **Vercel**: Check your deployment settings or contact Vercel support
- **AWS/Other Cloud**: Check your instance's public IP in the console
- **Server Logs**: Check your server access logs for the public IP

#### Option B: Use a Test Endpoint
You can create a temporary endpoint to check your server's IP:

```javascript
// In browser console on eazzypay.online
fetch('/api/health')
  .then(r => r.json())
  .then(data => console.log('Server IP:', data.server_ip))
```

#### Option C: Check NCBA API Request Logs
NCBA should see your IP in their logs. You can ask them which IP is making requests.

### Step 2: Contact NCBA Support

Contact NCBA Open Banking support with the following information:

**Email Template:**
```
Subject: IP Whitelisting Request for Open Banking API Access

Dear NCBA Open Banking Team,

We are integrating with the NCBA Open Banking API for UAT testing and production use.

Please whitelist the following IP address(es) for our account:

Environment: UAT (and/or Production)
Server IP Address: [YOUR_SERVER_IP]
Account/Username: NtbUATob254 (or your production username)
Subscription Key: [YOUR_SUBSCRIPTION_KEY]

We are testing the following endpoints:
- Token generation: /api/v1/Token (verify exact path)
- Float Purchase: /api/v1/FloatPurchase/floatpurchase (verify exact path)

Domain: eazzypay.online
Company: [Your Company Name]
Contact: [Your Contact Details]

Thank you for your assistance.

Best regards,
[Your Name]
```

### Step 3: Verify Whitelisting

After NCBA confirms whitelisting, test again:

```javascript
fetch('/api/ncba/ob/token', {
  method: 'POST',
  credentials: 'include'
})
.then(r => r.json())
.then(data => {
  if (data.success) {
    console.log('✅ Token generated successfully!', data)
  } else {
    console.error('❌ Error:', data.error)
    if (data.troubleshooting) {
      console.log('Troubleshooting:', data.troubleshooting)
    }
  }
})
```

## Alternative: Use Proxy or VPN

If IP whitelisting is not immediately available, you can:

1. **Use a VPN** with a static IP that NCBA can whitelist
2. **Use a Proxy Service** with a dedicated IP
3. **Deploy to a Server** with a static IP address

## Common Issues

### Issue 1: Still Getting 403 After Whitelisting
- **Wait Time**: NCBA whitelisting can take 24-48 hours to propagate
- **Environment Mismatch**: Ensure the IP is whitelisted for the correct environment (UAT vs Production)
- **IP Change**: If your server IP changes (dynamic IP), contact NCBA again

### Issue 2: IP Changes Frequently
If your hosting provider uses dynamic IPs:
- Request a static IP from your hosting provider
- Use a load balancer with a static IP
- Consider using a dedicated server

### Issue 3: Testing from Different Locations
- Each server making requests needs to be whitelisted
- Development machines also need whitelisting if testing directly
- CI/CD pipelines may need separate IPs whitelisted

## Testing Locally

If you need to test from your local machine:

1. **Get Your Public IP:**
   ```bash
   curl https://api.ipify.org
   # or visit https://whatismyipaddress.com
   ```

2. **Contact NCBA** to whitelist your local IP (usually for development only)

3. **Note**: Local testing IPs should be removed from whitelist after development

## Production Considerations

For production (eazzypay.online):

1. **Static IP Required**: Ensure your production server has a static IP
2. **Documentation**: Document your server IP for future reference
3. **Monitoring**: Set up alerts if IP changes unexpectedly
4. **Backup IP**: Consider having a backup server IP whitelisted

## Verification Checklist

- [ ] Server public IP address identified
- [ ] NCBA contacted with IP whitelisting request
- [ ] NCBA confirmed IP whitelisting
- [ ] Token generation tested successfully
- [ ] Float purchase tested successfully
- [ ] Production IP whitelisted (if different from UAT)

## Support Contacts

- **NCBA Open Banking Support**: [Check your documentation or onboarding materials]
- **Technical Contact**: [Your assigned NCBA technical contact]

## Next Steps

Once IP whitelisting is confirmed:

1. Test token generation endpoint
2. Test float purchase endpoint
3. Complete integration testing
4. Move to production whitelisting if needed


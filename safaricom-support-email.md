# Email to Safaricom API Support

**To:** apisupport@safaricom.co.ke  
**Subject:** Account Balance API Access Issue - Initiator "LSVaultFSAPI" and "LSVaultAPI"

---

Dear Safaricom API Support Team,

I hope this email finds you well. I am writing to seek assistance with an issue we are experiencing with the M-Pesa Account Balance API in our production environment.

## Issue Description

We are receiving an "Invalid Initiator" error (error code: 400.002.02) when attempting to use the Account Balance API, even though the same initiator names work perfectly for the B2C API (Disbursement).

## Technical Details

**Working API (B2C Disbursement):**
- Endpoint: `https://api.safaricom.co.ke/mpesa/b2c/v1/paymentrequest`
- CommandID: `"BusinessPayment"`
- Initiator Names: `"LSVaultFSAPI"`, `"LSVaultAPI"`
- Status: ✅ Working perfectly

**Failing API (Account Balance):**
- Endpoint: `https://api.safaricom.co.ke/mpesa/accountbalance/v1/query`
- CommandID: `"AccountBalance"`
- Initiator Names: `"LSVaultFSAPI"`, `"LSVaultAPI"`
- Status: ❌ Error: "Bad Request - Invalid Initiator"

## Request Format

Our request payload is as follows:
```json
{
  "InitiatorName": "LSVaultFSAPI",
  "SecurityCredential": "[encrypted credential - 344 characters]",
  "CommandID": "AccountBalance",
  "PartyA": "4955284",
  "IdentifierType": "4",
  "Remarks": "balance inquiry",
  "QueueTimeOutURL": "https://mapgmmiobityxaaevomp.supabase.co/functions/v1/mpesa-balance-result",
  "ResultURL": "https://mapgmmiobityxaaevomp.supabase.co/functions/v1/mpesa-balance-result"
}
```

## Partners Affected

1. **Finsafe Limited**
   - Shortcode: 4955284
   - Initiator: LSVaultFSAPI

2. **Kulman Group Limited**
   - Shortcode: 3037935
   - Initiator: LSVaultAPI

## Questions

1. **API Permissions**: Do the initiators `"LSVaultFSAPI"` and `"LSVaultAPI"` have the necessary permissions to access the Account Balance API?

2. **Separate Registration**: Does the Account Balance API require separate registration or activation compared to the B2C API?

3. **Initiator Configuration**: Are there any specific configuration requirements for initiators to access the Account Balance API?

4. **Account Status**: Could you please verify the status of these initiators for Account Balance API access?

## Request

Could you please:
1. Verify the Account Balance API access permissions for our initiators
2. Enable Account Balance API access if it's not currently active
3. Provide any additional configuration requirements

## Additional Information

- **Environment**: Production
- **API Version**: v1
- **Security Credentials**: Properly encrypted using RSA public key
- **B2C API**: Working without issues
- **Error Code**: 400.002.02
- **Error Message**: "Bad Request - Invalid Initiator"

We would greatly appreciate your assistance in resolving this issue. Please let me know if you need any additional information or if there are any specific steps we need to take.

Thank you for your time and support.

Best regards,

[Your Name]  
[Your Title]  
[Company Name]  
[Contact Information]  
[Date]

---

**Note:** Please replace the placeholder information (Your Name, Title, Company Name, Contact Information, Date) with your actual details before sending the email.


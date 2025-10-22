# B2C Float Purchase Implementation - Option 1

## 🎯 **Confirmed Process Flow**

### **Partner-Initiated B2C Float Purchase with Direct Bank Transfer**

```
Partner Wallet → NCBA Bank Transfer → B2C Partner Account → Float Purchase → Charges Deduction
```

---

## 🔄 **Detailed Step-by-Step Process**

### **Step 1: Partner Initiates Float Purchase**
1. **Partner Action**
   - Partner logs into Payment Vault system
   - Navigates to "Purchase B2C Float" section
   - Enters desired float amount (e.g., 100,000 KES)
   - Clicks "Purchase Float" button

2. **System Validation**
   - System checks partner's wallet balance
   - Calculates total cost: `Float Amount + Transfer Fees + Processing Fees`
   - Validates sufficient balance
   - If insufficient: Shows error message with required top-up amount

3. **OTP Validation (Security Layer)**
   - System identifies authorized user for the partner
   - Sends OTP to authorized user's registered phone number AND email address
   - Displays OTP input form with countdown timer
   - Partner enters OTP code
   - System validates OTP before proceeding
   - If OTP invalid/expired: Shows error and allows retry

### **Step 2: Bank Transfer Request (After OTP Validation)**
1. **System Initiates Transfer**
   - **Only proceeds after successful OTP validation**
   - System sends request to NCBA Bank API
   - Transfer details:
     - **From**: Partner's wallet account at NCBA
     - **To**: Payment Vault's B2C partner account at NCBA
     - **Amount**: Float amount + transfer fees
     - **Reference**: `FLOAT_PURCHASE_{partnerId}_{timestamp}`
     - **OTP Reference**: Links to validated OTP transaction

2. **NCBA Bank Processing**
   - NCBA processes the bank transfer
   - Funds move from partner's wallet to Payment Vault's B2C account
   - NCBA returns transfer confirmation with reference number

### **Step 3: B2C Float Purchase**
1. **Float Purchase Request**
   - System sends B2C float purchase request to NCBA
   - Uses transferred funds to purchase float
   - NCBA processes float purchase
   - Returns float purchase confirmation

2. **Account Updates**
   - **Partner's B2C Float Balance**: Increases by purchased amount
   - **Payment Vault's NCBA Account**: Reduces by float amount
   - **Partner's Wallet**: Reduces by total cost (float + fees)

### **Step 4: Charges and Deductions**
1. **Fee Calculation**
   - **Transfer Fee**: NCBA bank transfer charges
   - **Processing Fee**: Payment Vault system charges
   - **Float Purchase Fee**: NCBA B2C float charges
   - **Total Charges**: All fees combined

2. **Wallet Deduction**
   - System deducts total charges from partner's wallet
   - Records all transactions in database
   - Updates wallet balance in real-time

### **Step 5: Confirmation and Notifications**
1. **SMS Notifications**
   - **Partner**: "B2C Float purchased: 100,000 KES. New float balance: 150,000 KES. Wallet balance: 45,000 KES"
   - **System Admin**: "Float purchase completed for Partner X. Amount: 100,000 KES"

2. **System Logging**
   - All transactions recorded with references
   - Audit trail maintained
   - Error handling and retry logic

---

## 🏦 **NCBA Bank API Integration**

### **Required API Endpoints:**

#### **1. Bank Transfer API**
```javascript
POST /api/v1/transfers
{
  "fromAccount": "partner_wallet_account_123",
  "toAccount": "payment_vault_b2c_account_456", 
  "amount": 100500, // 100,000 + 500 fees
  "reference": "FLOAT_PURCHASE_PARTNER123_20241201_143022",
  "description": "B2C Float Purchase Transfer",
  "currency": "KES"
}
```

#### **2. B2C Float Purchase API**
```javascript
POST /api/v1/b2c/float/purchase
{
  "partnerId": "partner_123",
  "amount": 100000,
  "transferReference": "FLOAT_PURCHASE_PARTNER123_20241201_143022",
  "description": "B2C Float Purchase"
}
```

#### **3. Account Balance API**
```javascript
GET /api/v1/accounts/{accountId}/balance
// Returns current balance for wallet and B2C accounts
```

---

## 📊 **Database Schema Implementation**

### **Enhanced wallet_transactions Table:**
```sql
CREATE TABLE wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID REFERENCES partner_wallets(id),
  transaction_type VARCHAR(50) NOT NULL, -- 'topup', 'disbursement', 'b2c_float_purchase', 'charge'
  amount DECIMAL(15,2) NOT NULL,
  reference VARCHAR(100) UNIQUE,
  description TEXT,
  
  -- B2C Float Purchase specific fields
  float_amount DECIMAL(15,2),
  transfer_fee DECIMAL(15,2),
  processing_fee DECIMAL(15,2),
  ncb_transfer_reference VARCHAR(100),
  ncb_float_reference VARCHAR(100),
  
  -- OTP Validation fields
  otp_reference VARCHAR(100),
  otp_validated BOOLEAN DEFAULT FALSE,
  otp_validated_at TIMESTAMP,
  authorized_user_id UUID REFERENCES users(id),
  
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'otp_required', 'completed', 'failed'
  sms_sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### **New b2c_float_balance Table:**
```sql
CREATE TABLE b2c_float_balance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID REFERENCES partners(id) UNIQUE,
  current_float_balance DECIMAL(15,2) DEFAULT 0,
  last_purchase_date TIMESTAMP,
  last_purchase_amount DECIMAL(15,2),
  total_purchased DECIMAL(15,2) DEFAULT 0,
  total_used DECIMAL(15,2) DEFAULT 0,
  ncb_account_reference VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### **New ncb_account_balance Table:**
```sql
CREATE TABLE ncb_account_balance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_type VARCHAR(50), -- 'wallet', 'b2c_float', 'main'
  account_reference VARCHAR(100) UNIQUE,
  current_balance DECIMAL(15,2) DEFAULT 0,
  last_updated TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);
```

### **New otp_validations Table:**
```sql
CREATE TABLE otp_validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference VARCHAR(100) UNIQUE NOT NULL,
  user_id UUID REFERENCES users(id),
  partner_id UUID REFERENCES partners(id),
  phone_number VARCHAR(20) NOT NULL,
  email_address VARCHAR(255) NOT NULL,
  otp_code VARCHAR(6) NOT NULL,
  purpose VARCHAR(50) NOT NULL, -- 'float_purchase', 'disbursement', 'wallet_topup'
  amount DECIMAL(15,2), -- For financial transactions
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'validated', 'expired', 'failed'
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  sms_sent BOOLEAN DEFAULT FALSE,
  email_sent BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMP NOT NULL,
  validated_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 💻 **Implementation Code Structure**

### **1. Float Purchase Service**
```typescript
// services/float-purchase.service.ts
export class FloatPurchaseService {
  async initiateFloatPurchase(partnerId: string, amount: number, userId: string) {
    // 1. Validate partner and wallet balance
    const partner = await this.getPartner(partnerId);
    const wallet = await this.getWallet(partnerId);
    const totalCost = await this.calculateTotalCost(amount);
    
    if (wallet.balance < totalCost) {
      throw new Error('Insufficient wallet balance');
    }
    
    // 2. Get authorized user for OTP
    const authorizedUser = await this.getAuthorizedUser(partnerId);
    if (!authorizedUser) {
      throw new Error('No authorized user found for this partner');
    }
    
    if (!authorizedUser.phone || !authorizedUser.email) {
      throw new Error('Authorized user must have both phone and email registered');
    }
    
    // 3. Generate and send OTP
    const otpReference = await this.generateAndSendOTP({
      userId: authorizedUser.id,
      partnerId,
      phoneNumber: authorizedUser.phone,
      emailAddress: authorizedUser.email,
      purpose: 'float_purchase',
      amount: totalCost
    });
    
    // 4. Create pending transaction
    const transaction = await this.createPendingTransaction({
      partnerId,
      amount: totalCost,
      floatAmount: amount,
      otpReference,
      authorizedUserId: authorizedUser.id
    });
    
    return {
      success: true,
      otpRequired: true,
      otpReference,
      message: 'OTP sent to authorized user via SMS and email. Please enter OTP to complete float purchase.',
      transactionId: transaction.id
    };
  }
  
  async validateOTPAndPurchaseFloat(otpReference: string, otpCode: string) {
    // 1. Validate OTP
    const otpValidation = await this.validateOTP(otpReference, otpCode);
    if (!otpValidation.valid) {
      throw new Error('Invalid or expired OTP');
    }
    
    // 2. Get transaction details
    const transaction = await this.getTransactionByOTPReference(otpReference);
    const partner = await this.getPartner(transaction.partnerId);
    
    // 3. Initiate bank transfer
    const transferResult = await this.ncbBankAPI.transferFunds({
      from: partner.walletAccount,
      to: this.config.paymentVaultB2CAccount,
      amount: transaction.amount,
      reference: `FLOAT_PURCHASE_${transaction.partnerId}_${Date.now()}`,
      otpReference: otpReference
    });
    
    // 4. Purchase B2C float
    const floatResult = await this.ncbBankAPI.purchaseB2CFloat({
      partnerId: transaction.partnerId,
      amount: transaction.floatAmount,
      transferReference: transferResult.reference
    });
    
    // 5. Update database
    await this.updateFloatBalance(transaction.partnerId, transaction.floatAmount);
    await this.deductWalletBalance(transaction.partnerId, transaction.amount);
    await this.completeTransaction(transaction.id, transferResult, floatResult);
    
    // 6. Send notifications
    await this.sendSMSNotifications(partner, transaction.floatAmount, transaction.amount);
    
    return {
      success: true,
      floatAmount: transaction.floatAmount,
      totalCost: transaction.amount,
      transferReference: transferResult.reference,
      floatReference: floatResult.reference
    };
  }
}
```

### **2. NCBA Bank API Client**
```typescript
// services/ncb-bank-api.service.ts
export class NCBBankAPIService {
  async transferFunds(transferData: TransferRequest) {
    const response = await this.httpClient.post('/api/v1/transfers', {
      fromAccount: transferData.from,
      toAccount: transferData.to,
      amount: transferData.amount,
      reference: transferData.reference,
      description: transferData.description || 'B2C Float Purchase Transfer',
      currency: 'KES'
    });
    
    return {
      success: response.data.success,
      reference: response.data.reference,
      amount: response.data.amount,
      timestamp: response.data.timestamp
    };
  }
  
  async purchaseB2CFloat(floatData: FloatPurchaseRequest) {
    const response = await this.httpClient.post('/api/v1/b2c/float/purchase', {
      partnerId: floatData.partnerId,
      amount: floatData.amount,
      transferReference: floatData.transferReference,
      description: 'B2C Float Purchase'
    });
    
    return {
      success: response.data.success,
      reference: response.data.reference,
      amount: response.data.amount,
      newBalance: response.data.newBalance
    };
  }
}
```

### **3. OTP Service**
```typescript
// services/otp.service.ts
export class OTPService {
  async generateAndSendOTP(otpData: OTPRequest) {
    // 1. Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // 2. Create OTP record
    const otpReference = `OTP_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    
    const otpRecord = await this.createOTPRecord({
      reference: otpReference,
      userId: otpData.userId,
      partnerId: otpData.partnerId,
      phoneNumber: otpData.phoneNumber,
      emailAddress: otpData.emailAddress,
      otpCode,
      purpose: otpData.purpose,
      amount: otpData.amount,
      expiresAt
    });
    
    // 3. Send OTP via SMS and Email simultaneously
    const smsResult = await this.sendOTPSMS(otpData.phoneNumber, otpCode, otpData.purpose, otpData.amount);
    const emailResult = await this.sendOTPEmail(otpData.emailAddress, otpCode, otpData.purpose, otpData.amount);
    
    // 4. Update OTP record with delivery status
    await this.updateOTPDeliveryStatus(otpReference, {
      smsSent: smsResult.success,
      emailSent: emailResult.success
    });
    
    return {
      otpReference,
      expiresAt,
      smsSent: smsResult.success,
      emailSent: emailResult.success,
      message: 'OTP sent via SMS and email'
    };
  }
  
  async sendOTPEmail(emailAddress: string, otpCode: string, purpose: string, amount: number) {
    const emailTemplate = this.getOTPEmailTemplate(otpCode, purpose, amount);
    
    try {
      const result = await this.emailService.sendEmail({
        to: emailAddress,
        subject: 'Payment Vault - OTP for B2C Float Purchase',
        html: emailTemplate.html,
        text: emailTemplate.text
      });
      
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('Failed to send OTP email:', error);
      return { success: false, error: error.message };
    }
  }
  
  getOTPEmailTemplate(otpCode: string, purpose: string, amount: number) {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Payment Vault OTP</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #007bff; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px; background: #f9f9f9; }
          .otp-code { font-size: 32px; font-weight: bold; color: #007bff; text-align: center; margin: 20px 0; }
          .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Payment Vault</h1>
            <h2>OTP Verification</h2>
          </div>
          <div class="content">
            <h3>B2C Float Purchase Authorization</h3>
            <p>You have requested to purchase B2C float for your Payment Vault account.</p>
            
            <div class="otp-code">${otpCode}</div>
            
            <p><strong>Transaction Details:</strong></p>
            <ul>
              <li>Purpose: B2C Float Purchase</li>
              <li>Amount: ${amount.toLocaleString()} KES</li>
              <li>Valid for: 10 minutes</li>
            </ul>
            
            <div class="warning">
              <strong>⚠️ Security Notice:</strong><br>
              • Do not share this OTP with anyone<br>
              • Payment Vault will never ask for your OTP<br>
              • If you didn't request this, please contact support immediately
            </div>
            
            <p>Enter this OTP in the Payment Vault system to complete your transaction.</p>
          </div>
          <div class="footer">
            <p>This is an automated message from Payment Vault. Please do not reply to this email.</p>
            <p>© 2024 Payment Vault. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    const text = `
Payment Vault - OTP Verification

B2C Float Purchase Authorization

Your OTP Code: ${otpCode}

Transaction Details:
- Purpose: B2C Float Purchase
- Amount: ${amount.toLocaleString()} KES
- Valid for: 10 minutes

Security Notice:
- Do not share this OTP with anyone
- Payment Vault will never ask for your OTP
- If you didn't request this, please contact support immediately

Enter this OTP in the Payment Vault system to complete your transaction.

This is an automated message from Payment Vault.
© 2024 Payment Vault. All rights reserved.
    `;
    
    return { html, text };
  }
  
  async validateOTP(otpReference: string, otpCode: string) {
    const otpRecord = await this.getOTPRecord(otpReference);
    
    if (!otpRecord) {
      return { valid: false, error: 'Invalid OTP reference' };
    }
    
    if (otpRecord.status !== 'pending') {
      return { valid: false, error: 'OTP already used or expired' };
    }
    
    if (new Date() > otpRecord.expiresAt) {
      await this.updateOTPStatus(otpReference, 'expired');
      return { valid: false, error: 'OTP expired' };
    }
    
    if (otpRecord.attempts >= otpRecord.max_attempts) {
      await this.updateOTPStatus(otpReference, 'failed');
      return { valid: false, error: 'Maximum attempts exceeded' };
    }
    
    if (otpRecord.otpCode !== otpCode) {
      await this.incrementOTPAttempts(otpReference);
      return { valid: false, error: 'Invalid OTP code' };
    }
    
    // Valid OTP
    await this.updateOTPStatus(otpReference, 'validated');
    return { valid: true, otpRecord };
  }
}
```

### **4. API Endpoints**
```typescript
// app/api/float/purchase/initiate/route.ts
export async function POST(request: Request) {
  try {
    const { partnerId, amount, userId } = await request.json();
    
    const floatPurchaseService = new FloatPurchaseService();
    const result = await floatPurchaseService.initiateFloatPurchase(partnerId, amount, userId);
    
    return NextResponse.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 400 });
  }
}

// app/api/float/purchase/validate-otp/route.ts
export async function POST(request: Request) {
  try {
    const { otpReference, otpCode } = await request.json();
    
    const floatPurchaseService = new FloatPurchaseService();
    const result = await floatPurchaseService.validateOTPAndPurchaseFloat(otpReference, otpCode);
    
    return NextResponse.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 400 });
  }
}
```

---

## 🔔 **SMS Notification Templates**

### **OTP SMS Notification (Authorized User):**
```
Payment Vault OTP
Your OTP for B2C Float Purchase is: 123456
Amount: 100,000 KES
Valid for 10 minutes
Do not share this code with anyone.
```

### **OTP Email Notification (Authorized User):**
**Subject:** Payment Vault - OTP for B2C Float Purchase

**Content:**
```
Payment Vault - OTP Verification

B2C Float Purchase Authorization

Your OTP Code: 123456

Transaction Details:
- Purpose: B2C Float Purchase
- Amount: 100,000 KES
- Valid for: 10 minutes

Security Notice:
- Do not share this OTP with anyone
- Payment Vault will never ask for your OTP
- If you didn't request this, please contact support immediately

Enter this OTP in the Payment Vault system to complete your transaction.
```

### **Partner Notification (After Successful Purchase):**
```
B2C Float Purchase Successful!
Amount: 100,000 KES
New Float Balance: 150,000 KES
Wallet Balance: 45,000 KES
Reference: FLOAT_PURCHASE_PARTNER123_20241201_143022
Thank you for using Payment Vault!
```

### **System Admin Notification:**
```
Float Purchase Alert
Partner: ABC Microfinance
Amount: 100,000 KES
Transfer Ref: FLOAT_PURCHASE_PARTNER123_20241201_143022
Float Ref: FLOAT789012
OTP Validated: Yes
Time: 2024-12-01 14:30:22
```

### **OTP Expiry SMS Notification:**
```
Payment Vault Alert
Your OTP for B2C Float Purchase has expired.
Please request a new OTP to complete your transaction.
Amount: 100,000 KES
```

### **OTP Expiry Email Notification:**
**Subject:** Payment Vault - OTP Expired

**Content:**
```
Payment Vault - OTP Expired

Your OTP for B2C Float Purchase has expired.

Transaction Details:
- Purpose: B2C Float Purchase
- Amount: 100,000 KES
- Status: Expired

Please log into your Payment Vault account and request a new OTP to complete your transaction.

If you did not initiate this transaction, please contact our support team immediately.

This is an automated message from Payment Vault.
```

---

## 🎯 **Key Benefits of This Approach**

1. **Enhanced Security**: OTP validation for all float purchases
2. **Transparent Fund Flow**: Clear visibility of all fund movements
3. **Real-time Processing**: Immediate float purchase after OTP validation
4. **Comprehensive Tracking**: All transactions recorded with references
5. **Automatic Notifications**: SMS alerts for all stakeholders
6. **Error Handling**: Retry logic and manual reconciliation options
7. **Audit Trail**: Complete transaction history for compliance
8. **Fraud Prevention**: Multi-factor authentication for financial transactions

---

## 🚀 **Implementation Priority**

1. **Week 1**: Database schema creation (including OTP tables) and NCBA API integration
2. **Week 2**: OTP service implementation and SMS integration
3. **Week 3**: Float purchase service with OTP validation
4. **Week 4**: Frontend interface for float purchase with OTP input
5. **Week 5**: Testing and SMS notification system
6. **Week 6**: Error handling, retry logic, and security testing
7. **Week 7**: Production deployment and monitoring

## 🔐 **Security Features**

- **Dual Channel OTP**: 6-digit OTP sent to authorized user's phone AND email
- **Time-based Expiry**: OTP expires after 10 minutes
- **Attempt Limiting**: Maximum 3 attempts per OTP
- **Delivery Tracking**: SMS and email delivery status monitoring
- **Audit Trail**: Complete OTP validation history
- **Fraud Prevention**: Multi-factor authentication for all float purchases
- **Redundancy**: If SMS fails, email provides backup delivery method

**This implementation provides a secure, transparent, and auditable B2C float purchase system with OTP validation!** 🎯

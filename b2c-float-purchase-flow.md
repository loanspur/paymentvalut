# B2C Float Purchase & Fund Transfer Flow

## 🔍 **The Missing Piece: Fund Transfer Mechanism**

You're absolutely correct - I need to clarify how funds are transferred when purchasing B2C float. This is a critical part of the process that needs to be clearly defined.

---

## 💰 **B2C Float Purchase Process**

### **Current Understanding Gap:**
- ✅ Partner tops up wallet via NCBA Bank
- ✅ System purchases B2C float from NCBA
- ❓ **How are funds transferred from wallet to NCBA for float purchase?**

---

## 🔄 **Proposed Fund Transfer Mechanisms**

### **Option 1: Direct Bank Transfer (Recommended)**
```
Partner Wallet → NCBA Bank Account → B2C Float Purchase
```

#### **Process Flow:**
1. **Partner Initiates Float Purchase**
   - Partner requests B2C float purchase
   - System calculates required amount (float amount + fees)

2. **Wallet Balance Check**
   - System verifies sufficient wallet balance
   - If insufficient, requests top-up

3. **Fund Transfer to NCBA**
   - System initiates bank transfer from partner wallet to NCBA account
   - Uses NCBA Bank API for fund transfer
   - Transfers exact amount needed for float purchase

4. **B2C Float Purchase**
   - NCBA processes float purchase with transferred funds
   - System receives float purchase confirmation
   - Updates partner's B2C float balance

5. **Wallet Deduction**
   - Deducts transferred amount from partner wallet
   - Records transaction in wallet_transactions
   - Sends SMS confirmation to partner

### **Option 2: Pre-funded NCBA Account**
```
Partner Wallet → System NCBA Account → B2C Float Purchase
```

#### **Process Flow:**
1. **System NCBA Account**
   - Payment Vault maintains a pre-funded NCBA account
   - Partners' wallet funds are pooled in this account

2. **Float Purchase Process**
   - System uses pooled funds to purchase B2C float
   - Allocates float to specific partner
   - Deducts cost from partner's wallet balance

3. **Fund Management**
   - System tracks which partner owns which float
   - Maintains separate accounting for each partner

### **Option 3: Real-time Fund Transfer**
```
Partner Wallet → Instant Transfer → NCBA → B2C Float Purchase
```

#### **Process Flow:**
1. **Instant Transfer**
   - System initiates instant bank transfer
   - Uses NCBA's real-time transfer API
   - Funds available immediately for float purchase

2. **Immediate Float Purchase**
   - Purchase B2C float with transferred funds
   - No waiting period for fund clearance

---

## 🏦 **NCBA Bank API Integration Details**

### **Required API Endpoints:**
1. **Fund Transfer API**
   - Transfer funds from partner wallet to NCBA
   - Real-time transfer confirmation
   - Transaction reference tracking

2. **B2C Float Purchase API**
   - Purchase B2C float with transferred funds
   - Float balance management
   - Purchase confirmation

3. **Account Balance API**
   - Check NCBA account balance
   - Verify fund availability
   - Transaction history

### **API Flow:**
```javascript
// 1. Check wallet balance
const walletBalance = await getWalletBalance(partnerId);

// 2. Initiate fund transfer to NCBA
const transferResult = await ncbBankAPI.transferFunds({
  from: partnerWalletAccount,
  to: ncbB2CFloatAccount,
  amount: floatAmount + fees,
  reference: `FLOAT_PURCHASE_${partnerId}_${timestamp}`
});

// 3. Purchase B2C float
const floatPurchase = await ncbBankAPI.purchaseB2CFloat({
  amount: floatAmount,
  reference: transferResult.reference,
  partnerId: partnerId
});

// 4. Update wallet balance
await updateWalletBalance(partnerId, -transferResult.amount);

// 5. Send SMS confirmation
await sendSMS(partner.phone, `B2C Float purchased: ${floatAmount}`);
```

---

## 📊 **Database Schema Updates**

### **Enhanced wallet_transactions Table:**
```sql
CREATE TABLE wallet_transactions (
  id UUID PRIMARY KEY,
  wallet_id UUID REFERENCES partner_wallets(id),
  transaction_type VARCHAR(50), -- 'topup', 'disbursement', 'charge', 'b2c_float_purchase', 'fund_transfer'
  amount DECIMAL(15,2),
  reference VARCHAR(100),
  description TEXT,
  ncb_transfer_reference VARCHAR(100), -- NCBA transfer reference
  ncb_float_reference VARCHAR(100),   -- NCBA float purchase reference
  status VARCHAR(20), -- 'pending', 'completed', 'failed'
  sms_sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### **New b2c_float_balance Table:**
```sql
CREATE TABLE b2c_float_balance (
  id UUID PRIMARY KEY,
  partner_id UUID REFERENCES partners(id),
  current_float_balance DECIMAL(15,2),
  last_purchase_date TIMESTAMP,
  last_purchase_amount DECIMAL(15,2),
  ncb_account_reference VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🔄 **Complete B2C Float Purchase Flow**

### **Step-by-Step Process:**

#### **1. Float Purchase Request**
```
Partner → System: "Purchase 100,000 B2C Float"
System → Wallet: Check balance (e.g., 150,000 available)
System → NCBA: Initiate fund transfer (100,000 + 500 fees)
```

#### **2. Fund Transfer**
```
NCBA API → Transfer: 100,500 from Partner Wallet to NCBA B2C Account
NCBA API → Response: Transfer successful, reference: TXN123456
System → Database: Record transfer transaction
```

#### **3. B2C Float Purchase**
```
System → NCBA API: Purchase 100,000 B2C float with transferred funds
NCBA API → Response: Float purchased, reference: FLOAT789012
System → Database: Update B2C float balance
```

#### **4. Wallet Update**
```
System → Wallet: Deduct 100,500 from partner wallet
System → Database: Record wallet transaction
System → SMS: Send confirmation to partner
```

#### **5. Confirmation**
```
Partner receives SMS: "B2C Float purchased: 100,000. New balance: 49,500"
System logs: All transactions recorded with references
```

---

## 💡 **Recommended Approach**

### **Option 1: Direct Bank Transfer (Recommended)**
**Pros:**
- Clear fund flow
- Transparent accounting
- Easy reconciliation
- Partner can track all transfers

**Cons:**
- Requires NCBA transfer API
- Slightly more complex
- Multiple API calls

### **Implementation Priority:**
1. **Phase 1**: Implement direct bank transfer
2. **Phase 2**: Add pre-funded account option if needed
3. **Phase 3**: Optimize with real-time transfers

---

## ❓ **Questions for Clarification**

1. **NCBA API Capabilities**: Does NCBA Bank API support fund transfers between accounts?
2. **Transfer Timing**: How long do fund transfers take to clear?
3. **Float Purchase**: Can B2C float be purchased immediately after fund transfer?
4. **Account Structure**: Should we use separate NCBA accounts for each partner or pooled account?
5. **Fee Structure**: What are the fees for fund transfers and float purchases?

---

## 🎯 **Next Steps**

1. **Review NCBA API Documentation** for fund transfer capabilities
2. **Confirm Transfer Mechanism** with NCBA Bank
3. **Update Database Schema** with transfer tracking
4. **Implement Fund Transfer Logic** in wallet system
5. **Test End-to-End Flow** with NCBA Bank

**Which fund transfer mechanism do you prefer?** This will help me finalize the implementation approach. 🚀


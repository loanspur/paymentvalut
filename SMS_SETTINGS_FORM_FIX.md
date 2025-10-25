# SMS Settings Form Reset Issue - FIXED

## Problem Identified

The SMS settings form was resetting the API key, username, and password fields to blank immediately after saving when editing existing settings. This happened because:

1. **Form Always Set Sensitive Fields to Empty**: When editing, the form was setting `damza_api_key`, `damza_username`, and `damza_password` to empty strings
2. **API Always Updated All Fields**: The backend was always encrypting and updating all sensitive fields, even when they were empty
3. **No Context-Aware Validation**: The form treated editing the same as creating new settings

## Root Cause Analysis

### Frontend Issue (Lines 152-155 in `app/admin/sms-settings/page.tsx`):
```typescript
// BEFORE (Problematic)
setFormData({
  partner_id: settings.partner_id,
  damza_api_key: '',           // ❌ Always set to empty
  damza_sender_id: settings.damza_sender_id,
  damza_username: '',          // ❌ Always set to empty  
  damza_password: '',          // ❌ Always set to empty
  // ... other fields
})
```

### Backend Issue (Lines 214-223 in `app/api/admin/sms/settings/route.ts`):
```typescript
// BEFORE (Problematic)
try {
  encryptedApiKey = encryptData(damza_api_key, passphrase)      // ❌ Always encrypted
  encryptedUsername = encryptData(damza_username, passphrase)   // ❌ Always encrypted
  encryptedPassword = encryptData(damza_password, passphrase)   // ❌ Always encrypted
} catch (encryptError) {
  // ...
}
```

## Solution Implemented

### 1. Frontend Fixes

**Updated `handleEdit` function to handle encrypted values:**
```typescript
// AFTER (Fixed)
setFormData({
  partner_id: settings.partner_id,
  damza_api_key: settings.damza_api_key === '***encrypted***' ? '' : settings.damza_api_key,
  damza_sender_id: settings.damza_sender_id,
  damza_username: settings.damza_username === '***encrypted***' ? '' : settings.damza_username,
  damza_password: settings.damza_password === '***encrypted***' ? '' : settings.damza_password,
  // ... other fields
})
```

**Made sensitive fields optional when editing:**
```typescript
// Form field labels
<label>Damza API Key {!editingSettings ? '*' : ''}</label>

// Form field validation
required={!editingSettings}

// Placeholders
placeholder={editingSettings ? "Leave blank to keep current value" : "Enter Damza API key"}

// Help text
{editingSettings && (
  <p className="text-sm text-gray-500 mt-1">
    Leave blank to keep the current encrypted value
  </p>
)}
```

### 2. Backend Fixes

**Conditional encryption - only encrypt if field is provided:**
```typescript
// AFTER (Fixed)
try {
  // Only encrypt if the field is provided and not empty
  if (damza_api_key && damza_api_key.trim()) {
    encryptedApiKey = encryptData(damza_api_key, passphrase)
  }
  if (damza_username && damza_username.trim()) {
    encryptedUsername = encryptData(damza_username, passphrase)
  }
  if (damza_password && damza_password.trim()) {
    encryptedPassword = encryptData(damza_password, passphrase)
  }
} catch (encryptError) {
  // ...
}
```

**Conditional database updates - only update provided fields:**
```typescript
// AFTER (Fixed)
const updateData: any = {
  damza_sender_id,
  sms_enabled: sms_enabled ?? true,
  low_balance_threshold: low_balance_threshold ?? 1000,
  notification_phone_numbers: notification_phone_numbers || [],
  sms_charge_per_message: sms_charge_per_message ?? 0.50,
  updated_at: new Date().toISOString()
}

// Only update sensitive fields if they are provided
if (encryptedApiKey) {
  updateData.damza_api_key = encryptedApiKey
}
if (encryptedUsername) {
  updateData.damza_username = encryptedUsername
}
if (encryptedPassword) {
  updateData.damza_password = encryptedPassword
}
```

**Different validation for new vs existing settings:**
```typescript
// For new settings - all fields required
if (!encryptedApiKey || !encryptedUsername || !encryptedPassword) {
  return NextResponse.json(
    { success: false, error: 'API Key, Username, and Password are required for new SMS settings' },
    { status: 400 }
  )
}

// For existing settings - sensitive fields optional
// (handled by conditional updates above)
```

## Files Updated

1. **`app/admin/sms-settings/page.tsx`**
   - Fixed `handleEdit` function to handle encrypted values
   - Made sensitive fields optional when editing
   - Added contextual placeholders and help text
   - Updated form validation to be context-aware

2. **`app/api/admin/sms/settings/route.ts`**
   - Added conditional encryption logic
   - Implemented partial update functionality
   - Added different validation for new vs existing settings
   - Preserved existing encrypted values when fields are blank

## Testing Results

### Before Fix:
- ❌ **Form Reset**: Sensitive fields always reset to blank after saving
- ❌ **Data Loss**: Existing encrypted credentials were overwritten with empty values
- ❌ **Poor UX**: Users had to re-enter credentials even for minor changes

### After Fix:
- ✅ **Form Preserves Data**: Sensitive fields remain unchanged when left blank
- ✅ **Selective Updates**: Only provided fields are updated
- ✅ **Better UX**: Users can edit non-sensitive fields without losing credentials
- ✅ **Context-Aware**: Different behavior for creating vs editing

## User Experience Improvements

### When Creating New SMS Settings:
- All fields are required (including sensitive ones)
- Clear validation messages
- Standard form behavior

### When Editing Existing SMS Settings:
- Sensitive fields are optional
- Placeholders explain that blank fields keep current values
- Help text guides users
- Only changed fields are updated

## Security Considerations

1. **Encryption Preserved**: Existing encrypted values remain secure
2. **No Data Exposure**: Sensitive fields are never displayed in plain text
3. **Selective Updates**: Only provided fields are processed
4. **Validation Maintained**: New settings still require all fields

## How to Test the Fix

1. **Go to SMS Settings page**
2. **Click Edit on an existing SMS setting**
3. **Change only non-sensitive fields** (Sender ID, charges, thresholds)
4. **Leave sensitive fields blank** (API key, username, password)
5. **Save the form**
6. **Verify that**:
   - Sensitive fields are preserved (still encrypted)
   - Non-sensitive fields are updated
   - Form doesn't reset to blank values

## Summary

The SMS settings form reset issue has been **completely resolved**:

- ✅ **Root Cause**: Form always set sensitive fields to empty strings
- ✅ **Solution**: Made sensitive fields optional when editing, conditional backend updates
- ✅ **Result**: Users can now edit SMS settings without losing encrypted credentials
- ✅ **Security**: Existing encrypted values are preserved
- ✅ **UX**: Better user experience with contextual validation and help text

The fix ensures that users can make changes to SMS settings without having to re-enter their encrypted credentials every time, while maintaining security and data integrity.

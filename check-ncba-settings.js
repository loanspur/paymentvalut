// Check NCBA system settings to understand account reference format
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkNCBASettings() {
  console.log('🔍 Checking NCBA system settings...');
  console.log('===================================');

  try {
    // Check NCBA system settings
    const { data: ncbaSettings, error: settingsError } = await supabase
      .from('system_settings')
      .select('setting_key, setting_value, description')
      .in('setting_key', [
        'ncba_business_short_code',
        'ncba_notification_username',
        'ncba_notification_password',
        'ncba_notification_secret_key',
        'ncba_account_number',
        'ncba_account_reference_separator'
      ]);

    if (settingsError) {
      console.log('❌ Error fetching NCBA settings:', settingsError.message);
      return;
    }

    console.log('📊 NCBA System Settings:');
    ncbaSettings.forEach(setting => {
      console.log(`   - ${setting.setting_key}: ${setting.setting_value}`);
      if (setting.description) {
        console.log(`     Description: ${setting.description}`);
      }
    });
    console.log('');

    // Check if we have the separator setting
    const separatorSetting = ncbaSettings.find(s => s.setting_key === 'ncba_account_reference_separator');
    const accountNumberSetting = ncbaSettings.find(s => s.setting_key === 'ncba_account_number');

    if (!separatorSetting) {
      console.log('❌ ncba_account_reference_separator setting not found!');
      console.log('This is likely why notifications are not being processed.');
      console.log('');
      console.log('💡 The notification handler expects account references in format:');
      console.log(`   ${accountNumberSetting?.setting_value || '774451'}[SEPARATOR][PARTNER_SHORT_CODE]`);
      console.log('');
      console.log('🔧 SOLUTION:');
      console.log('===========');
      console.log('1. Add ncba_account_reference_separator setting to system_settings');
      console.log('2. Set it to the correct separator (likely " " for space or "#" for hash)');
      console.log('3. Based on the email, it should be " " (space)');
    } else {
      console.log(`✅ Account reference separator: "${separatorSetting.setting_value}"`);
      console.log(`✅ Account number: "${accountNumberSetting?.setting_value || '774451'}"`);
      console.log('');
      console.log('Expected account reference format:');
      console.log(`   ${accountNumberSetting?.setting_value || '774451'}${separatorSetting.setting_value}UMOJA`);
      console.log('');
      console.log('Actual account reference from email:');
      console.log('   774451 UMOJA');
      console.log('');
      
      if (separatorSetting.setting_value === ' ') {
        console.log('✅ Separator matches email format!');
      } else {
        console.log('❌ Separator does not match email format!');
        console.log(`   Expected: "${separatorSetting.setting_value}"`);
        console.log('   Actual: " " (space)');
      }
    }

    // Test the notification handler logic
    console.log('');
    console.log('🧪 Testing notification handler logic...');
    
    const testAccountReference = '774451 UMOJA';
    const separator = separatorSetting?.setting_value || '#';
    const accountNumber = accountNumberSetting?.setting_value || '774451';
    
    console.log(`Test account reference: "${testAccountReference}"`);
    console.log(`Configured separator: "${separator}"`);
    console.log(`Configured account number: "${accountNumber}"`);
    
    if (testAccountReference.includes(separator)) {
      const parts = testAccountReference.split(separator);
      console.log(`Split parts: [${parts.join(', ')}]`);
      
      if (parts.length === 2 && parts[0] === accountNumber) {
        const partnerIdentifier = parts[1];
        console.log(`✅ Account reference format is valid!`);
        console.log(`Partner identifier: "${partnerIdentifier}"`);
        
        // Check if UMOJA partner exists
        const { data: partner, error: partnerError } = await supabase
          .from('partners')
          .select('*')
          .eq('short_code', partnerIdentifier)
          .eq('is_active', true)
          .single();
          
        if (partnerError || !partner) {
          console.log(`❌ Partner "${partnerIdentifier}" not found!`);
        } else {
          console.log(`✅ Partner found: ${partner.name} (${partner.short_code})`);
        }
      } else {
        console.log('❌ Account reference format is invalid!');
        console.log(`   Expected: ${accountNumber}${separator}[PARTNER_SHORT_CODE]`);
        console.log(`   Actual: ${testAccountReference}`);
      }
    } else {
      console.log('❌ Account reference does not contain the configured separator!');
      console.log(`   Reference: "${testAccountReference}"`);
      console.log(`   Separator: "${separator}"`);
    }

  } catch (error) {
    console.error('❌ Investigation failed:', error);
  }
}

// Run the investigation
checkNCBASettings();

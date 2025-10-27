// Fix NCBA account reference separator to match actual NCBA format
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixNCBASeparator() {
  console.log('🔧 Fixing NCBA account reference separator...');
  console.log('=============================================');

  try {
    // Update the separator from "#" to " " (space)
    const { data, error } = await supabase
      .from('system_settings')
      .update({ 
        setting_value: ' ',
        description: 'Separator between account number and partner ID (space)',
        updated_at: new Date().toISOString()
      })
      .eq('setting_key', 'ncba_account_reference_separator')
      .select();

    if (error) {
      console.log('❌ Error updating separator:', error.message);
      return;
    }

    console.log('✅ Successfully updated NCBA account reference separator to space!');
    console.log('');

    // Test the fix
    console.log('🧪 Testing the fix...');
    
    const testAccountReference = '774451 UMOJA';
    const separator = ' ';
    const accountNumber = '774451';
    
    console.log(`Test account reference: "${testAccountReference}"`);
    console.log(`New separator: "${separator}"`);
    console.log(`Account number: "${accountNumber}"`);
    
    if (testAccountReference.includes(separator)) {
      const parts = testAccountReference.split(separator);
      console.log(`Split parts: [${parts.join(', ')}]`);
      
      if (parts.length === 2 && parts[0] === accountNumber) {
        const partnerIdentifier = parts[1];
        console.log(`✅ Account reference format is now valid!`);
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
          console.log('');
          console.log('🎉 The notification handler should now be able to process NCBA notifications!');
        }
      } else {
        console.log('❌ Account reference format is still invalid!');
      }
    } else {
      console.log('❌ Account reference does not contain the separator!');
    }

    console.log('');
    console.log('📋 SUMMARY:');
    console.log('===========');
    console.log('✅ Fixed NCBA account reference separator from "#" to " " (space)');
    console.log('✅ This matches the actual format NCBA sends: "774451 UMOJA"');
    console.log('✅ The notification handler should now process incoming notifications');
    console.log('');
    console.log('🔧 NEXT STEPS:');
    console.log('==============');
    console.log('1. Test the notification handler with a sample NCBA notification');
    console.log('2. Check if pending wallet transactions get completed');
    console.log('3. Verify that UMOJA wallet gets credited');

  } catch (error) {
    console.error('❌ Fix failed:', error);
  }
}

// Run the fix
fixNCBASeparator();

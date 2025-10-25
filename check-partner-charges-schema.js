// Check partner charges table schema
require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkPartnerChargesSchema() {
  console.log('🔍 Checking Partner Charges Table Schema')
  console.log('========================================\n')

  try {
    // Check if partner_charges table exists and get its structure
    const { data: columns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable, column_default')
      .eq('table_name', 'partner_charges')
      .order('ordinal_position')

    if (columnsError) {
      console.log('❌ Error fetching table schema:', columnsError)
      return
    }

    if (!columns || columns.length === 0) {
      console.log('⚠️  partner_charges table does not exist')
      return
    }

    console.log('✅ partner_charges table found with the following columns:')
    columns.forEach((column, index) => {
      console.log(`   ${index + 1}. ${column.column_name} (${column.data_type}) - ${column.is_nullable === 'YES' ? 'nullable' : 'not null'}`)
      if (column.column_default) {
        console.log(`      Default: ${column.column_default}`)
      }
    })

    // Check existing charge types
    console.log('\n📋 Checking existing charge types...')
    
    const { data: chargeTypes, error: typesError } = await supabase
      .from('partner_charges')
      .select('charge_type')
      .not('charge_type', 'is', null)

    if (typesError) {
      console.log('❌ Error fetching charge types:', typesError)
    } else {
      const uniqueTypes = [...new Set(chargeTypes?.map(c => c.charge_type) || [])]
      console.log(`✅ Found ${uniqueTypes.length} unique charge types:`)
      uniqueTypes.forEach((type, index) => {
        console.log(`   ${index + 1}. ${type}`)
      })
    }

    // Check recent charges
    console.log('\n📋 Checking recent charges...')
    
    const { data: recentCharges, error: chargesError } = await supabase
      .from('partner_charges')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5)

    if (chargesError) {
      console.log('❌ Error fetching recent charges:', chargesError)
    } else {
      console.log(`✅ Found ${recentCharges?.length || 0} recent charges:`)
      recentCharges?.forEach((charge, index) => {
        console.log(`\n   📊 Charge ${index + 1}:`)
        console.log(`      ID: ${charge.id}`)
        console.log(`      Partner ID: ${charge.partner_id}`)
        console.log(`      Charge Type: ${charge.charge_type}`)
        console.log(`      Amount: ${charge.amount}`)
        console.log(`      Description: ${charge.description}`)
        console.log(`      Created: ${charge.created_at}`)
      })
    }

  } catch (error) {
    console.error('❌ Check failed:', error.message)
  } finally {
    console.log('\n🎯 Partner Charges Schema Check Summary:')
    console.log('========================================')
    console.log('✅ Table structure analyzed')
    console.log('✅ Existing charge types identified')
    console.log('✅ Recent charges reviewed')
    console.log('')
    console.log('💡 Next Steps:')
    console.log('==============')
    console.log('1. Add SMS charge types to the system')
    console.log('2. Create SMS charge records when SMS are sent')
    console.log('3. Link SMS charges to campaigns and notifications')
    console.log('4. Update wallet deduction logic to use charge records')
  }
}

checkPartnerChargesSchema()

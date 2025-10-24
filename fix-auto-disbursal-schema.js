const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function fixSchema() {
  console.log('🔧 Fixing auto-disbursal configs table schema...')
  
  try {
    // First, let's check the current table structure
    console.log('📋 Checking current table structure...')
    
    const { data: columns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable, column_default')
      .eq('table_name', 'loan_product_auto_disbursal_configs')
      .order('ordinal_position')
    
    if (columnsError) {
      console.log('❌ Error fetching table structure:', columnsError.message)
      return
    }
    
    console.log('📋 Current table structure:')
    columns.forEach(col => {
      console.log(`   ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`)
    })
    
    // Check if is_active column exists
    const hasIsActive = columns.some(col => col.column_name === 'is_active')
    
    if (!hasIsActive) {
      console.log('\n🔧 Adding is_active column...')
      
      // Try to add the column using a direct SQL query
      const { data, error } = await supabase
        .from('loan_product_auto_disbursal_configs')
        .select('*')
        .limit(1)
      
      if (error) {
        console.log('❌ Error accessing table:', error.message)
        return
      }
      
      console.log('✅ Table is accessible, but we need to add the column via SQL')
      console.log('💡 Please run this SQL in your Supabase SQL editor:')
      console.log(`
ALTER TABLE loan_product_auto_disbursal_configs 
ADD COLUMN is_active BOOLEAN DEFAULT true;

UPDATE loan_product_auto_disbursal_configs 
SET is_active = true 
WHERE is_active IS NULL;

ALTER TABLE loan_product_auto_disbursal_configs 
ALTER COLUMN is_active SET NOT NULL;
      `)
    } else {
      console.log('\n✅ is_active column already exists')
    }
    
    // Test the table access
    console.log('\n🧪 Testing table access...')
    const { data: configs, error: configError } = await supabase
      .from('loan_product_auto_disbursal_configs')
      .select('*')
      .limit(5)
    
    if (configError) {
      console.log('❌ Error accessing configs:', configError.message)
    } else {
      console.log(`✅ Successfully accessed table, found ${configs.length} records`)
      if (configs.length > 0) {
        console.log('📋 Sample record:', configs[0])
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

fixSchema()



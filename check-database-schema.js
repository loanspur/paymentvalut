// Check if loan_tracking table exists
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkDatabaseSchema() {
  console.log('🔍 Checking database schema...')
  console.log('')

  try {
    // Check if loan_tracking table exists
    const { data: loanTracking, error: loanTrackingError } = await supabase
      .from('loan_tracking')
      .select('id')
      .limit(1)

    if (loanTrackingError) {
      console.log('❌ loan_tracking table does not exist or has issues:')
      console.log('   Error:', loanTrackingError.message)
      console.log('')
      console.log('🔧 Solution: Run the loan tracking table creation script')
      console.log('   Execute this SQL in your Supabase SQL editor:')
      console.log('')
      console.log('-- Create loan tracking table')
      console.log('CREATE TABLE IF NOT EXISTS loan_tracking (')
      console.log('    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),')
      console.log('    partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,')
      console.log('    loan_id INTEGER NOT NULL,')
      console.log('    client_id INTEGER NOT NULL,')
      console.log('    client_name VARCHAR(255),')
      console.log('    phone_number VARCHAR(20),')
      console.log('    loan_amount DECIMAL(15,2) NOT NULL,')
      console.log('    status VARCHAR(50) DEFAULT \'pending\',')
      console.log('    disbursement_id UUID REFERENCES disbursement_requests(id),')
      console.log('    disbursement_status VARCHAR(50),')
      console.log('    mpesa_receipt_number VARCHAR(100),')
      console.log('    error_message TEXT,')
      console.log('    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),')
      console.log('    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),')
      console.log('    UNIQUE(partner_id, loan_id)')
      console.log(');')
      console.log('')
      console.log('-- Create indexes')
      console.log('CREATE INDEX IF NOT EXISTS idx_loan_tracking_partner ON loan_tracking(partner_id);')
      console.log('CREATE INDEX IF NOT EXISTS idx_loan_tracking_loan_id ON loan_tracking(loan_id);')
      console.log('CREATE INDEX IF NOT EXISTS idx_loan_tracking_status ON loan_tracking(status);')
      console.log('CREATE INDEX IF NOT EXISTS idx_loan_tracking_created_at ON loan_tracking(created_at);')
    } else {
      console.log('✅ loan_tracking table exists and is accessible')
      console.log('   Records found:', loanTracking ? loanTracking.length : 0)
    }

    // Check disbursement_requests table
    const { data: disbursements, error: disbursementError } = await supabase
      .from('disbursement_requests')
      .select('id')
      .limit(1)

    if (disbursementError) {
      console.log('❌ disbursement_requests table has issues:')
      console.log('   Error:', disbursementError.message)
    } else {
      console.log('✅ disbursement_requests table exists and is accessible')
    }

    // Check partners table
    const { data: partners, error: partnersError } = await supabase
      .from('partners')
      .select('id')
      .limit(1)

    if (partnersError) {
      console.log('❌ partners table has issues:')
      console.log('   Error:', partnersError.message)
    } else {
      console.log('✅ partners table exists and is accessible')
    }

  } catch (error) {
    console.error('❌ Error checking database schema:', error.message)
  }
}

checkDatabaseSchema()

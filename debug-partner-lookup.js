require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function debugPartnerLookup() {
  console.log('🔍 Debugging partner lookup...');
  
  // Get recent transactions
  const { data: transactions, error } = await supabase
    .from('c2b_transactions')
    .select('id, transaction_id, partner_id')
    .order('created_at', { ascending: false })
    .limit(3);
    
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log('📊 Transactions:', transactions);
  
  // Extract partner IDs
  const partnerIds = transactions?.filter(t => t.partner_id).map(t => t.partner_id) || []
  console.log('🎯 Partner IDs:', partnerIds);
  
  if (partnerIds.length > 0) {
    const { data: partners, error: partnersError } = await supabase
      .from('partners')
      .select('id, name, short_code')
      .in('id', partnerIds)
    
    console.log('👥 Partners query result:', { partners, partnersError });
    
    if (!partnersError && partners) {
      const partnersMap = partners.reduce((acc, partner) => {
        acc[partner.id] = partner
        return acc
      }, {})
      
      console.log('🗺️ Partners map:', partnersMap);
      
      // Test transformation
      const transformedData = transactions?.map(transaction => ({
        ...transaction,
        partner_name: transaction.partner_id ? partnersMap[transaction.partner_id]?.name || null : null,
        partner_short_code: transaction.partner_id ? partnersMap[transaction.partner_id]?.short_code || null : null,
      })) || []
      
      console.log('🔄 Transformed data:', transformedData);
    }
  }
}

debugPartnerLookup();

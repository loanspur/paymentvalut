// Script to clean up dummy/test wallet transactions
// Run this script to remove test data from wallet tables

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  console.log('Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function cleanupWalletDummyData() {
  console.log('🧹 Starting wallet dummy data cleanup...')
  
  try {
    // Step 1: Find and remove test wallet transactions
    console.log('\n📋 Step 1: Cleaning up test wallet transactions...')
    
    const { data: testTransactions, error: testError } = await supabase
      .from('wallet_transactions')
      .select('*')
      .or('reference.like.test%,description.like.Test%,description.like.test%')
    
    if (testError) {
      console.error('❌ Error finding test transactions:', testError.message)
    } else if (testTransactions && testTransactions.length > 0) {
      console.log(`🔍 Found ${testTransactions.length} test transactions to remove`)
      
      for (const transaction of testTransactions) {
        console.log(`   - Removing: ${transaction.reference} (${transaction.description})`)
      }
      
      const { error: deleteError } = await supabase
        .from('wallet_transactions')
        .delete()
        .or('reference.like.test%,description.like.Test%,description.like.test%')
      
      if (deleteError) {
        console.error('❌ Error deleting test transactions:', deleteError.message)
      } else {
        console.log(`✅ Successfully removed ${testTransactions.length} test transactions`)
      }
    } else {
      console.log('✅ No test transactions found')
    }
    
    // Step 2: Find and remove transactions with dummy references
    console.log('\n📋 Step 2: Cleaning up transactions with dummy references...')
    
    const { data: dummyTransactions, error: dummyError } = await supabase
      .from('wallet_transactions')
      .select('*')
      .or('reference.like.DUMMY%,reference.like.SAMPLE%,reference.like.DEMO%')
    
    if (dummyError) {
      console.error('❌ Error finding dummy transactions:', dummyError.message)
    } else if (dummyTransactions && dummyTransactions.length > 0) {
      console.log(`🔍 Found ${dummyTransactions.length} dummy transactions to remove`)
      
      for (const transaction of dummyTransactions) {
        console.log(`   - Removing: ${transaction.reference} (${transaction.description})`)
      }
      
      const { error: deleteError } = await supabase
        .from('wallet_transactions')
        .delete()
        .or('reference.like.DUMMY%,reference.like.SAMPLE%,reference.like.DEMO%')
      
      if (deleteError) {
        console.error('❌ Error deleting dummy transactions:', deleteError.message)
      } else {
        console.log(`✅ Successfully removed ${dummyTransactions.length} dummy transactions`)
      }
    } else {
      console.log('✅ No dummy transactions found')
    }
    
    // Step 3: Find and remove transactions with very old dates (likely test data)
    console.log('\n📋 Step 3: Cleaning up old test transactions...')
    
    const oneMonthAgo = new Date()
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)
    
    const { data: oldTransactions, error: oldError } = await supabase
      .from('wallet_transactions')
      .select('*')
      .lt('created_at', oneMonthAgo.toISOString())
      .or('description.like.%test%,description.like.%Test%,description.like.%TEST%')
    
    if (oldError) {
      console.error('❌ Error finding old test transactions:', oldError.message)
    } else if (oldTransactions && oldTransactions.length > 0) {
      console.log(`🔍 Found ${oldTransactions.length} old test transactions to remove`)
      
      for (const transaction of oldTransactions) {
        console.log(`   - Removing: ${transaction.reference} (${transaction.description}) - ${transaction.created_at}`)
      }
      
      const { error: deleteError } = await supabase
        .from('wallet_transactions')
        .delete()
        .lt('created_at', oneMonthAgo.toISOString())
        .or('description.like.%test%,description.like.%Test%,description.like.%TEST%')
      
      if (deleteError) {
        console.error('❌ Error deleting old test transactions:', deleteError.message)
      } else {
        console.log(`✅ Successfully removed ${oldTransactions.length} old test transactions`)
      }
    } else {
      console.log('✅ No old test transactions found')
    }
    
    // Step 4: Reset wallet balances to realistic values
    console.log('\n📋 Step 4: Resetting wallet balances...')
    
    const { data: wallets, error: walletsError } = await supabase
      .from('partner_wallets')
      .select('*')
    
    if (walletsError) {
      console.error('❌ Error fetching wallets:', walletsError.message)
    } else if (wallets && wallets.length > 0) {
      console.log(`🔍 Found ${wallets.length} wallets to check`)
      
      for (const wallet of wallets) {
        // Reset unrealistic balances (e.g., very high amounts that might be test data)
        if (wallet.current_balance > 1000000) { // More than 1M KES
          console.log(`   - Resetting wallet ${wallet.id} balance from ${wallet.current_balance} to 0`)
          
          const { error: updateError } = await supabase
            .from('partner_wallets')
            .update({ current_balance: 0 })
            .eq('id', wallet.id)
          
          if (updateError) {
            console.error(`❌ Error updating wallet ${wallet.id}:`, updateError.message)
          } else {
            console.log(`✅ Successfully reset wallet ${wallet.id} balance`)
          }
        }
      }
    } else {
      console.log('✅ No wallets found')
    }
    
    // Step 5: Summary
    console.log('\n📊 Cleanup Summary:')
    console.log('✅ Test transactions removed')
    console.log('✅ Dummy transactions removed')
    console.log('✅ Old test transactions removed')
    console.log('✅ Wallet balances reset if needed')
    console.log('\n🎉 Wallet dummy data cleanup completed!')
    console.log('\n💡 The wallet management table should now show only real transactions.')
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error)
  }
}

// Run the cleanup
cleanupWalletDummyData()

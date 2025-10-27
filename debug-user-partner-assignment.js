// Debug script to check user partner assignment
// Run this to diagnose wallet top-up issues

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function debugUserPartnerAssignment() {
  try {
    console.log('🔍 Debugging user partner assignments...\n')

    // Get all users with their partner assignments
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select(`
        id,
        email,
        role,
        partner_id,
        is_active,
        first_name,
        last_name,
        partners (
          id,
          name,
          short_code,
          is_active
        )
      `)
      .order('created_at', { ascending: false })

    if (usersError) {
      console.error('❌ Error fetching users:', usersError)
      return
    }

    console.log(`📊 Found ${users.length} users:\n`)

    users.forEach((user, index) => {
      console.log(`${index + 1}. User: ${user.email}`)
      console.log(`   - Name: ${user.first_name || 'N/A'} ${user.last_name || 'N/A'}`)
      console.log(`   - Role: ${user.role}`)
      console.log(`   - Active: ${user.is_active ? '✅' : '❌'}`)
      console.log(`   - Partner ID: ${user.partner_id || '❌ NOT SET'}`)
      
      if (user.partners) {
        console.log(`   - Partner: ${user.partners.name} (${user.partners.short_code})`)
        console.log(`   - Partner Active: ${user.partners.is_active ? '✅' : '❌'}`)
      } else {
        console.log(`   - Partner: ❌ NOT FOUND`)
      }
      console.log('')
    })

    // Check users without partner assignments
    const usersWithoutPartner = users.filter(user => !user.partner_id)
    if (usersWithoutPartner.length > 0) {
      console.log(`⚠️  Users without partner assignment (${usersWithoutPartner.length}):`)
      usersWithoutPartner.forEach(user => {
        console.log(`   - ${user.email} (${user.role})`)
      })
      console.log('')
    }

    // Check users with inactive partners
    const usersWithInactivePartner = users.filter(user => 
      user.partner_id && user.partners && !user.partners.is_active
    )
    if (usersWithInactivePartner.length > 0) {
      console.log(`⚠️  Users with inactive partners (${usersWithInactivePartner.length}):`)
      usersWithInactivePartner.forEach(user => {
        console.log(`   - ${user.email} → ${user.partners.name} (INACTIVE)`)
      })
      console.log('')
    }

    // Check partners
    const { data: partners, error: partnersError } = await supabase
      .from('partners')
      .select('id, name, short_code, is_active')
      .order('created_at', { ascending: false })

    if (partnersError) {
      console.error('❌ Error fetching partners:', partnersError)
      return
    }

    console.log(`📊 Available Partners (${partners.length}):`)
    partners.forEach((partner, index) => {
      console.log(`${index + 1}. ${partner.name} (${partner.short_code}) - ${partner.is_active ? '✅ Active' : '❌ Inactive'}`)
    })

    console.log('\n✅ Debug complete!')
    
  } catch (error) {
    console.error('❌ Debug error:', error)
  }
}

debugUserPartnerAssignment()

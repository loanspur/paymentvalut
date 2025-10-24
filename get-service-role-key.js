require('dotenv').config()

console.log('🔑 Your Supabase Service Role Key:')
console.log('==================================')
console.log('')
console.log('Service Role Key:', process.env.SUPABASE_SERVICE_ROLE_KEY)
console.log('')
console.log('Copy this key and use it in your cron job Authorization header.')
console.log('')
console.log('Format: Bearer ' + process.env.SUPABASE_SERVICE_ROLE_KEY)
console.log('')
console.log('⚠️  Keep this key secure and never share it publicly!')



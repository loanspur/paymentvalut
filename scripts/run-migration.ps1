# PowerShell script to run user management migration
# This script helps with the migration process on Windows

Write-Host "🚀 M-Pesa Vault User Management Migration" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

# Check if Supabase CLI is available
Write-Host "`n🔍 Checking Supabase CLI..." -ForegroundColor Yellow
try {
    $supabaseVersion = supabase --version 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Supabase CLI found: $supabaseVersion" -ForegroundColor Green
        
        Write-Host "`n📋 Running database migration..." -ForegroundColor Yellow
        supabase db push
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Migration completed successfully!" -ForegroundColor Green
        } else {
            Write-Host "❌ Migration failed. Try manual migration." -ForegroundColor Red
        }
    } else {
        Write-Host "❌ Supabase CLI not found" -ForegroundColor Red
        Write-Host "`n📝 Manual Migration Required:" -ForegroundColor Yellow
        Write-Host "1. Go to your Supabase Dashboard" -ForegroundColor White
        Write-Host "2. Navigate to SQL Editor" -ForegroundColor White
        Write-Host "3. Copy and paste the contents of scripts/manual-migration.sql" -ForegroundColor White
        Write-Host "4. Run the SQL script" -ForegroundColor White
        Write-Host "5. Check the results" -ForegroundColor White
    }
} catch {
    Write-Host "❌ Supabase CLI not available" -ForegroundColor Red
    Write-Host "`n📝 Manual Migration Required:" -ForegroundColor Yellow
    Write-Host "1. Go to your Supabase Dashboard" -ForegroundColor White
    Write-Host "2. Navigate to SQL Editor" -ForegroundColor White
    Write-Host "3. Copy and paste the contents of scripts/manual-migration.sql" -ForegroundColor White
    Write-Host "4. Run the SQL script" -ForegroundColor White
    Write-Host "5. Check the results" -ForegroundColor White
}

# Check migration status
Write-Host "`n🔍 Checking migration status..." -ForegroundColor Yellow
try {
    node scripts/check-migration.js
} catch {
    Write-Host "❌ Could not check migration status" -ForegroundColor Red
    Write-Host "Make sure Node.js dependencies are installed: npm install" -ForegroundColor Yellow
}

Write-Host "`n📋 Next Steps:" -ForegroundColor Cyan
Write-Host "1. Visit http://localhost:3000/setup" -ForegroundColor White
Write-Host "2. Create admin user if needed" -ForegroundColor White
Write-Host "3. Login with admin@mpesavault.com / admin123" -ForegroundColor White
Write-Host "4. Change the default password" -ForegroundColor White

Write-Host "`n✨ Migration process completed!" -ForegroundColor Green
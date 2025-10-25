# SMS Campaigns 500 Error Fix Guide

## Problem
The SMS campaigns page is showing a 500 Internal Server Error when trying to access `/api/admin/sms/campaigns`.

## Root Cause
The `sms_bulk_campaigns` table either doesn't exist or has incorrect column names that don't match what the API expects.

## Solution

### Step 1: Run Database Migration
1. Go to your Supabase dashboard
2. Open the SQL Editor
3. Copy and paste the contents of `fix-sms-campaigns-table.sql`
4. Run the script

### Step 2: Verify Table Structure
After running the migration, the `sms_bulk_campaigns` table should have these columns:
- `id` (UUID, Primary Key)
- `partner_id` (UUID, Foreign Key to partners)
- `campaign_name` (VARCHAR)
- `template_id` (UUID, Foreign Key to sms_templates, nullable)
- `message_content` (TEXT)
- `recipient_list` (JSONB array)
- `total_recipients` (INTEGER)
- `total_cost` (DECIMAL)
- `status` (VARCHAR, default 'draft')
- `scheduled_at` (TIMESTAMP, nullable)
- `sent_at` (TIMESTAMP, nullable)
- `created_by` (UUID, nullable)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

### Step 3: Test the API
Run the test script to verify everything is working:
```bash
node test-sms-campaigns-api.js
```

### Step 4: Test in Browser
1. Log in to the application
2. Navigate to `/admin/sms-campaigns`
3. The page should load without errors
4. You should be able to create new campaigns

## Expected Behavior After Fix
- ✅ SMS campaigns page loads without 500 errors
- ✅ API returns proper data or empty array
- ✅ Campaign creation form works
- ✅ Campaign list displays correctly
- ✅ All CRUD operations function properly

## Troubleshooting
If you still see errors after running the migration:

1. **Check Supabase Logs**: Look for any database errors in the Supabase dashboard
2. **Verify Permissions**: Ensure the authenticated role has access to the tables
3. **Check Foreign Keys**: Make sure the `partners` and `sms_templates` tables exist
4. **Test API Directly**: Use the test script to verify the API endpoint

## Files Modified
- `fix-sms-campaigns-table.sql` - Database migration script
- `test-sms-campaigns-api.js` - API testing script
- `app/api/admin/sms/campaigns/route.ts` - API endpoint (already correct)

## Next Steps
After fixing the database schema:
1. Test all SMS management pages
2. Create sample campaigns to verify functionality
3. Test the complete SMS workflow
4. Verify toast notifications work properly

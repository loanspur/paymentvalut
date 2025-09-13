# 🔧 **MIGRATION ERROR SOLUTION**

## 🚨 **ERROR: `type "user_role" already exists`**

This error occurs because the `user_role` enum type already exists in your database, but the migration is trying to create it again.

## ✅ **IMMEDIATE SOLUTION**

### **Step 1: Use Manual Migration Script**

Since the Supabase CLI isn't available, use the manual migration approach:

1. **Go to your Supabase Dashboard**
   - Open your browser and go to [supabase.com](https://supabase.com)
   - Sign in to your account
   - Select your project

2. **Navigate to SQL Editor**
   - In the left sidebar, click on "SQL Editor"
   - Click "New query"

3. **Run the Migration Script**
   - Copy the entire contents of `scripts/manual-migration.sql`
   - Paste it into the SQL Editor
   - Click "Run" to execute the script

4. **Verify Success**
   - You should see: `User management system migration completed successfully!`
   - Check that no errors occurred

### **Step 2: Test the System**

1. **Go to Setup Page**
   - Visit `http://localhost:3000/setup`
   - The page should show "Setup Complete!" status

2. **Create Admin User** (if needed)
   - Click "Create Admin User" button
   - Wait for success message

3. **Login**
   - Go to `http://localhost:3000/login`
   - Use credentials:
     - **Email**: `admin@mpesavault.com`
     - **Password**: `admin123`

## 🔍 **WHY THIS HAPPENED**

The `user_role` enum type was created in a previous migration or manually, but the new migration didn't account for this. The manual migration script I created handles this gracefully by:

```sql
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('admin', 'partner');
    END IF;
END $$;
```

This checks if the type exists before trying to create it.

## 🛠️ **ALTERNATIVE SOLUTIONS**

### **Option 1: Drop and Recreate (DANGEROUS)**
```sql
-- WARNING: This will delete all data
DROP TYPE IF EXISTS user_role CASCADE;
CREATE TYPE user_role AS ENUM ('admin', 'partner');
```

### **Option 2: Modify Existing Migration**
Edit `supabase/migrations/029_create_user_management_system.sql` to use the safe enum creation method.

### **Option 3: Skip Migration, Create Tables Manually**
Use the manual migration script which handles all edge cases.

## ✅ **VERIFICATION STEPS**

After running the manual migration:

1. **Check Tables Exist**
   ```sql
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name IN ('users', 'user_sessions', 'partner_shortcodes', 'audit_logs');
   ```

2. **Check Admin User**
   ```sql
   SELECT email, role, is_active FROM users WHERE email = 'admin@mpesavault.com';
   ```

3. **Test Login**
   - Go to `http://localhost:3000/login`
   - Login with admin credentials
   - Should redirect to admin dashboard

## 🚀 **NEXT STEPS AFTER FIX**

1. **Change Default Password**
   - Login with admin account
   - Go to user settings
   - Change password from `admin123` to something secure

2. **Create Partner Users**
   - Use admin dashboard to create partner accounts
   - Assign shortcodes to partners

3. **Test System**
   - Verify all features work
   - Test partner login and data isolation

## 📞 **STILL HAVING ISSUES?**

If you're still having problems:

1. **Check Supabase Dashboard**
   - Verify the SQL script ran without errors
   - Check the "Logs" section for any issues

2. **Check Environment Variables**
   - Ensure `NEXT_PUBLIC_SUPABASE_URL` is set
   - Ensure `NEXT_PUBLIC_SUPABASE_ANON_KEY` is set

3. **Check Dependencies**
   - Run `npm install` to ensure all packages are installed
   - Check that `bcryptjs` and `jsonwebtoken` are installed

4. **Restart Development Server**
   - Stop the Next.js server (Ctrl+C)
   - Run `npm run dev` again

The manual migration script should resolve the enum conflict and get your system working! 🎉

# 🔧 Login Credentials Troubleshooting Guide

## 🚨 **CURRENT ISSUE: Invalid Login Credentials**

The login credentials are showing as invalid. Here's how to fix this:

## 🔍 **ROOT CAUSE ANALYSIS**

The issue is that the **database migration hasn't been applied yet**, so the user management system doesn't exist in the database.

## ✅ **SOLUTION STEPS**

### **Step 1: Check System Status**
1. Navigate to `http://localhost:3000/setup`
2. This will show you the current setup status
3. You'll see one of these states:
   - **Migration Required**: Database tables don't exist
   - **Admin Required**: Tables exist but no admin user
   - **Ready**: System is ready to use

### **Step 2: Apply Database Migration**

#### **Option A: Using Supabase CLI (if available)**
```bash
# Run this command in your terminal
supabase db push
```

#### **Option B: Manual Migration (if CLI not available)**
1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `scripts/manual-migration.sql`
4. Run the SQL script
5. Verify the migration was successful

#### **Option C: Using PowerShell Script (Windows)**
```powershell
# Run the migration script
.\scripts\run-migration.ps1
```

### **Step 3: Create Admin User**
1. Go to `http://localhost:3000/setup`
2. Click "Create Admin User" button
3. The system will create the default admin user

### **Step 4: Login with Correct Credentials**
- **Email**: `admin@mpesavault.com`
- **Password**: `admin123`

## 🔧 **MANUAL FIX (If Setup Page Doesn't Work)**

### **Option 1: Use API Endpoint**
```bash
# Create admin user via API
curl -X POST http://localhost:3000/api/setup/admin
```

### **Option 2: Direct Database Insert**
```sql
-- Connect to your Supabase database and run:
INSERT INTO users (email, password_hash, role, is_active) VALUES 
('admin@mpesavault.com', '$2b$10$NiZIoyI7wYSdX5DWCNO.FuBoxWEiOL0besq4PNqWyhX/WFTiXXhxS', 'admin', true);
```

## 🎯 **VERIFICATION STEPS**

### **1. Check Database Tables**
```sql
-- Verify users table exists
SELECT * FROM users LIMIT 1;

-- Check if admin user exists
SELECT email, role, is_active FROM users WHERE email = 'admin@mpesavault.com';
```

### **2. Test Login**
1. Go to `http://localhost:3000/login`
2. Enter credentials:
   - Email: `admin@mpesavault.com`
   - Password: `admin123`
3. Should redirect to admin dashboard

### **3. Check API Response**
```bash
# Test authentication API
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@mpesavault.com","password":"admin123"}'
```

## 🚨 **COMMON ISSUES & FIXES**

### **Issue 1: "Users table does not exist"**
**Fix**: Run `supabase db push` to apply migrations

### **Issue 1.1: "type 'user_role' already exists"**
**Fix**: This means the enum type already exists. Use the manual migration script instead:
1. Go to Supabase Dashboard → SQL Editor
2. Run the contents of `scripts/manual-migration.sql`
3. The script handles existing types gracefully

### **Issue 1.2: "policy 'Users can view own data' already exists"**
**Fix**: This means RLS policies already exist. Use the simplified script instead:
1. Go to Supabase Dashboard → SQL Editor
2. Run the contents of `scripts/create-admin-only.sql`
3. This script only creates what's missing and avoids policy conflicts

### **Issue 2: "Admin user not found"**
**Fix**: Use the setup page or API to create admin user

### **Issue 3: "Invalid credentials"**
**Fix**: Verify the password hash is correct (use the updated migration)

### **Issue 4: "Session validation failed"**
**Fix**: Check if JWT_SECRET environment variable is set

## 🔐 **SECURITY NOTES**

### **Default Credentials**
- **Email**: `admin@mpesavault.com`
- **Password**: `admin123`
- **⚠️ IMPORTANT**: Change this password immediately after first login!

### **Environment Variables Required**
```bash
# Add to .env.local
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

## 📋 **COMPLETE SETUP CHECKLIST**

- [ ] Database migration applied (`supabase db push`)
- [ ] Admin user created (via setup page or API)
- [ ] Environment variables set
- [ ] Dependencies installed (`npm install bcryptjs jsonwebtoken`)
- [ ] Login page accessible (`/login`)
- [ ] Setup page accessible (`/setup`)
- [ ] Admin dashboard accessible (`/admin`)

## 🆘 **STILL HAVING ISSUES?**

### **Debug Steps**
1. **Check Browser Console**: Look for JavaScript errors
2. **Check Network Tab**: Verify API calls are working
3. **Check Database**: Ensure tables and data exist
4. **Check Environment**: Verify all variables are set

### **Reset Everything**
```bash
# Reset database (WARNING: This will delete all data)
supabase db reset

# Reapply migrations
supabase db push

# Create admin user
curl -X POST http://localhost:3000/api/setup/admin
```

## 📞 **SUPPORT**

If you're still having issues:
1. Check the setup page: `http://localhost:3000/setup`
2. Verify database migration was applied
3. Check environment variables are set
4. Ensure all dependencies are installed

The system should work correctly once the migration is applied and the admin user is created! 🚀

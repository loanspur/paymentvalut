# Environment Setup Guide
## Fixing Authentication Issues

The 401/500 errors you're seeing are likely due to missing or incorrect environment variables in your Vercel deployment.

## Required Environment Variables

### 1. **Supabase Configuration**
```env
NEXT_PUBLIC_SUPABASE_URL=https://mapgmmiobityxaaevomp.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

### 2. **JWT Secret**
```env
JWT_SECRET=your_secure_jwt_secret_here
```

### 3. **Optional (for development)**
```env
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

## How to Fix in Vercel

### Step 1: Get Your Supabase Keys
1. Go to your Supabase project dashboard
2. Navigate to Settings > API
3. Copy the following:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **Service Role Key** → `SUPABASE_SERVICE_ROLE_KEY`
   - **Anon Key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Step 2: Set Environment Variables in Vercel
1. Go to your Vercel dashboard
2. Select your project
3. Go to Settings > Environment Variables
4. Add each variable:
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://mapgmmiobityxaaevomp.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY` = `[your service role key]`
   - `JWT_SECRET` = `[generate a secure random string]`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = `[your anon key]`

### Step 3: Generate JWT Secret
You can generate a secure JWT secret using:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Step 4: Redeploy
After setting the environment variables, redeploy your Vercel project.

## Testing the Fix

### 1. Health Check
Visit: `https://your-vercel-app.vercel.app/api/health`

This should return:
```json
{
  "status": "ok",
  "timestamp": "2024-12-22T...",
  "environment": {
    "supabaseUrl": true,
    "supabaseServiceKey": true,
    "jwtSecret": true,
    "nodeEnv": "production"
  },
  "message": "Health check passed"
}
```

### 2. Test Login
Try logging in with valid credentials. The improved error handling will now show specific error messages.

## Common Issues

### Issue 1: "Missing Supabase URL"
- **Cause:** `NEXT_PUBLIC_SUPABASE_URL` not set
- **Fix:** Set the environment variable in Vercel

### Issue 2: "Missing Supabase service key"
- **Cause:** `SUPABASE_SERVICE_ROLE_KEY` not set
- **Fix:** Set the environment variable in Vercel

### Issue 3: "Missing JWT secret"
- **Cause:** `JWT_SECRET` not set
- **Fix:** Generate and set a secure JWT secret

### Issue 4: "Database connection failed"
- **Cause:** Wrong Supabase URL or service key
- **Fix:** Verify the keys are correct

### Issue 5: "User not found"
- **Cause:** No users in the database
- **Fix:** Create a user account in the database

## Creating a Test User

If you need to create a test user, you can run this SQL in your Supabase SQL editor:

```sql
-- Create a test user
INSERT INTO users (
  id,
  email,
  password_hash,
  role,
  is_active,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'admin@example.com',
  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- password: "password"
  'admin',
  true,
  now(),
  now()
);
```

## Next Steps

1. Set the environment variables in Vercel
2. Redeploy your application
3. Test the health endpoint
4. Try logging in with the test user
5. If issues persist, check the Vercel function logs for detailed error messages

The improved error handling will now provide specific error messages to help identify the exact issue.


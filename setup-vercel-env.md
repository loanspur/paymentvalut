# Setting up JWT_SECRET in Vercel

## Option 1: Vercel Dashboard (Recommended)

1. Go to https://vercel.com/dashboard
2. Select your project: `paymentvalut`
3. Go to **Settings** → **Environment Variables**
4. Add new environment variable:
   - **Name**: `JWT_SECRET`
   - **Value**: `your-secure-jwt-secret-key-here`
   - **Environment**: Production
5. Save and redeploy

## Option 2: Vercel CLI

```bash
# Install Vercel CLI if not already installed
npm i -g vercel

# Login to Vercel
vercel login

# Set environment variable
vercel env add JWT_SECRET

# When prompted, enter a secure secret like:
# your-super-secure-jwt-secret-key-2024-paymentvalut

# Redeploy
vercel --prod
```

## Option 3: Generate a Secure JWT Secret

You can generate a secure JWT secret using Node.js:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

## Important Notes

- **JWT_SECRET** must be the same across all environments
- Use a strong, random string (at least 32 characters)
- Never commit the JWT secret to your repository
- The secret should be different from your Supabase secrets

## After Setting JWT_SECRET

1. Redeploy your Vercel application
2. Test the login functionality
3. The error "Missing JWT secret" should be resolved

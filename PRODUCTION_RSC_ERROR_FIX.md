# Production RSC Error Fix

## Error: `2:I[19107,[],"ClientPageRoot"]`

This error occurs **only in production**, not in localhost. This is a Next.js React Server Components (RSC) payload serialization error that happens during server-side rendering in production.

## Root Cause

In production, Next.js attempts to:
1. Pre-render pages at build time (static generation)
2. Server-side render pages on first request
3. Serialize the RSC payload to send to the client

The error occurs because:
- `usePathname()` from `next/navigation` is not available during SSR
- `AppLayout` and `AuthProvider` use `usePathname()` immediately, causing SSR failures
- Production build optimizations try to statically generate the page, but it's a client component

## Fixes Applied

### 1. Added Mount Check in AppLayout
- **File**: `components/AppLayout.tsx`
- **Change**: Added `mounted` state check before using `pathname`
- **Reason**: Prevents accessing `usePathname()` during SSR when it's not available

```typescript
const [mounted, setMounted] = useState(false)

useEffect(() => {
  setMounted(true)
}, [])

// Only check pathname after component mounts (client-side)
const isPublicRoute = mounted && pathname ? publicRoutes.includes(pathname) : false
```

### 2. Added Mount Check in AuthProvider
- **File**: `components/AuthProvider.tsx`
- **Change**: Added `mounted` state check before using `pathname`
- **Reason**: Same as above - prevents SSR errors

### 3. Enhanced Dynamic Export
- **File**: `app/secure-login/page.tsx`
- **Change**: Added both `dynamic = 'force-dynamic'` and `revalidate = 0`
- **Reason**: 
  - `force-dynamic`: Prevents static generation
  - `revalidate = 0`: Disables ISR (Incremental Static Regeneration)

### 4. Removed Redundant Layout
- **File**: `app/secure-login/layout.tsx` (DELETED)
- **Reason**: Nested layout was causing additional serialization issues

## Production Deployment Steps

1. **Commit and Push Changes**:
   ```bash
   git add .
   git commit -m "Fix production RSC error for secure-login page"
   git push origin main
   ```

2. **Redeploy on Production**:
   - If using Vercel: Automatic deployment on push
   - If using Digital Ocean: Automatic deployment on push
   - If using other platform: Trigger deployment manually

3. **Verify Fix**:
   - Navigate to `/secure-login` in production
   - Check browser console for errors
   - Verify page loads correctly

## Why This Only Happens in Production

1. **Localhost (Development)**:
   - Next.js dev server doesn't pre-render pages
   - All pages are rendered on-demand
   - `usePathname()` works because it's always client-side

2. **Production**:
   - Next.js tries to optimize by pre-rendering
   - Static generation attempts to render at build time
   - SSR happens on first request
   - `usePathname()` is not available during SSR, causing the error

## Additional Notes

- The `mounted` check ensures we only access client-side hooks after hydration
- During SSR, public routes are assumed (children rendered directly)
- After hydration, the correct route check happens and layout is applied if needed
- This prevents hydration mismatches and RSC serialization errors


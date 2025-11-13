# Production RSC Error Fix - Production Only Issue

## Problem

The error `2:I[19107,[],"ClientPageRoot"]` occurs **only in production**, not in localhost. This is a Next.js React Server Components (RSC) payload serialization error.

## Root Cause

In production, Next.js:
1. Attempts to pre-render pages at build time
2. Server-side renders pages on first request
3. Tries to serialize the RSC payload

The error occurs because:
- `usePathname()` from `next/navigation` is **not available during SSR**
- `AppLayout` and `AuthProvider` were using `usePathname()` immediately
- Production tries to statically generate, but the page is a client component
- This causes RSC payload serialization to fail

## Fixes Applied

### 1. Added Mount Check in AppLayout
**File**: `components/AppLayout.tsx`

```typescript
const [mounted, setMounted] = useState(false)

useEffect(() => {
  setMounted(true)
}, [])

// Only check pathname after component mounts (client-side)
const isPublicRoute = mounted && pathname ? publicRoutes.includes(pathname) : false

// During SSR or before mount, render children to prevent hydration mismatch
if (!mounted || isPublicRoute) {
  return <>{children}</>
}
```

**Why**: Prevents accessing `usePathname()` during SSR when it's not available.

### 2. Added Mount Check in AuthProvider
**File**: `components/AuthProvider.tsx`

```typescript
const [mounted, setMounted] = useState(false)

useEffect(() => {
  setMounted(true)
}, [])

const isPublicRoute = mounted && pathname ? publicRoutes.includes(pathname) : false

// Wait for component to mount before checking routes
useEffect(() => {
  if (!mounted) {
    return
  }
  // ... rest of auth check
}, [pathname, isLoggingOut, isPublicRoute, mounted])
```

**Why**: Same as above - prevents SSR errors when accessing `usePathname()`.

### 3. Enhanced Dynamic Export
**File**: `app/secure-login/page.tsx`

```typescript
export const dynamic = 'force-dynamic'
export const revalidate = 0
```

**Why**: 
- `force-dynamic`: Prevents static generation at build time
- `revalidate = 0`: Disables ISR (Incremental Static Regeneration)

### 4. Removed Redundant Layout
**File**: `app/secure-login/layout.tsx` (DELETED)

**Why**: Nested layout was causing additional serialization issues.

## Why This Only Happens in Production

### Localhost (Development)
- Next.js dev server doesn't pre-render pages
- All pages are rendered on-demand
- `usePathname()` works because it's always client-side
- No static generation attempts

### Production
- Next.js tries to optimize by pre-rendering
- Static generation attempts to render at build time
- SSR happens on first request
- `usePathname()` is **not available during SSR**, causing the error
- RSC payload serialization fails when trying to serialize client hooks

## Deployment Steps

1. **Commit Changes**:
   ```bash
   git add .
   git commit -m "Fix production RSC error - add mount checks for usePathname"
   git push origin main
   ```

2. **Redeploy**:
   - Vercel: Automatic deployment on push
   - Digital Ocean: Automatic deployment on push
   - Other: Trigger deployment manually

3. **Verify**:
   - Navigate to `/secure-login` in production
   - Check browser console (should be no errors)
   - Verify page loads correctly

## Testing

After deployment, test:
- ✅ `/secure-login` page loads without errors
- ✅ Login form is functional
- ✅ No console errors in browser DevTools
- ✅ No RSC payload errors in server logs

## Additional Notes

- The `mounted` check ensures we only access client-side hooks after hydration
- During SSR, public routes are assumed (children rendered directly)
- After hydration, the correct route check happens and layout is applied if needed
- This prevents hydration mismatches and RSC serialization errors
- The fix is backward compatible and doesn't affect localhost development


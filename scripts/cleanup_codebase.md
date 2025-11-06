# Codebase Cleanup Plan

## 1. Duplicate Routes Removed
- ✅ `/api/users` - Now deprecated, returns 410 status
- `/api/profile` vs `/api/auth/me` - Both exist, need to consolidate
- `/api/disburse/retry` vs `/api/cron/disburse-retry` - Different purposes (manual vs cron)

## 2. Hardcoded URLs Replaced
- ✅ `app/api/register-callbacks/route.ts` - Now uses environment variables
- ✅ `app/api/protected-api-docs/route.ts` - Now uses environment variables

## 3. Debug Code to Remove
- Remove excessive console.log statements (keep error logging)
- Remove TODO/FIXME comments that are resolved
- Remove commented-out code blocks

## 4. Redundant Code
- Remove unused imports
- Remove duplicate functions
- Consolidate similar logic


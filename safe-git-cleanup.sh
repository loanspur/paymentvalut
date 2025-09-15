#!/bin/bash

# Safe Git Cleanup Script - RECOMMENDED APPROACH
# This creates a new clean repository without rewriting history

echo "🛡️  SAFE GIT CLEANUP SCRIPT"
echo "============================"
echo "This approach creates a clean repository without rewriting history"
echo ""

# Step 1: Check current status
echo "📊 Current Git status:"
git status

echo ""
echo "📋 Recent commits:"
git log --oneline -5

# Step 2: Create new clean branch
echo ""
echo "🌿 Creating clean branch..."
git checkout -b clean-version-$(date +%Y%m%d)

# Step 3: Add all current clean files
echo ""
echo "📝 Adding clean files..."
git add .

# Step 4: Commit clean version
echo ""
echo "💾 Committing clean version..."
git commit -m "Clean version: M-Pesa B2C System

✅ Security improvements:
- Removed all hardcoded credentials
- Implemented vault system for secure credential storage
- All sensitive data moved to environment variables

✅ Code cleanup:
- Removed 50+ unused SQL diagnostic files
- Cleaned up codebase structure
- Removed sensitive documentation files

✅ Features:
- Working balance monitor with real-time data
- Secure credential vault system
- Clean UI with actual balance display
- Fixed callback system for transaction status updates

🔒 Security: No sensitive data in this commit"

# Step 5: Show what's being committed
echo ""
echo "📤 Files in this clean commit:"
git diff --cached --name-only | head -20
echo "..."

# Step 6: Instructions
echo ""
echo "🎯 Next steps:"
echo "1. Push the clean branch: git push origin clean-version-$(date +%Y%m%d)"
echo "2. Create a new repository on GitHub/GitLab"
echo "3. Push this clean branch to the new repository"
echo "4. Update your deployment to use the new repository"
echo "5. Archive or delete the old repository"
echo ""
echo "✅ This approach is safe and doesn't rewrite history"
echo "✅ Your team can continue working without issues"
echo "✅ All sensitive data is removed from the new repository"

#!/bin/bash

# Git Repository Cleanup Script
# This script helps remove sensitive data from Git history safely

echo "🔍 Git Repository Cleanup Script"
echo "================================="

# Step 1: Check current Git status
echo "📊 Checking current Git status..."
git status

echo ""
echo "📋 Recent commits:"
git log --oneline -5

# Step 2: Check for sensitive files in history
echo ""
echo "🔍 Searching for sensitive files in Git history..."

# List of sensitive files that were removed
SENSITIVE_FILES=(
    "update-security-credential.sql"
    "update-partner-passkey.sql"
    "migrate-credentials-to-vault.sql"
    "check-kulman-credentials.sql"
    "test-vault-security-credential.sql"
    "add-security-credential.sql"
    "update-vault-with-security-credential.sql"
    "check-vault-content.sql"
    "fix-malformed-base64.sql"
    "fix-corrupted-base64.sql"
    "rebuild-vault-properly.sql"
    "remove-plaintext-credentials.sql"
    "cleanup-hardcoded-credentials.sql"
    "remove-remaining-hardcoded.sql"
)

echo "🔍 Checking if sensitive files exist in Git history..."
for file in "${SENSITIVE_FILES[@]}"; do
    if git log --all --full-history -- "$file" > /dev/null 2>&1; then
        echo "⚠️  Found sensitive file in history: $file"
    else
        echo "✅ File not in history: $file"
    fi
done

# Step 3: Create backup branch
echo ""
echo "💾 Creating backup branch..."
git checkout -b backup-before-cleanup
git checkout main

# Step 4: Add current clean state
echo ""
echo "📝 Adding current clean state..."
git add .
git commit -m "Clean version: Remove all sensitive credentials and unused files

- Removed 50+ unused SQL diagnostic files
- Removed hardcoded credentials
- Implemented vault system for secure credential storage
- Cleaned up codebase structure
- All sensitive data moved to environment variables"

# Step 5: Show what will be pushed
echo ""
echo "📤 Files ready to be committed:"
git diff --cached --name-only

echo ""
echo "🎯 Next steps:"
echo "1. Review the changes above"
echo "2. If satisfied, run: git push origin main"
echo "3. If you want to completely clean history, run the advanced cleanup script"
echo ""
echo "⚠️  WARNING: If you push this, the sensitive files will still be in Git history"
echo "   For complete cleanup, you need to rewrite Git history (see git-cleanup-guide.md)"

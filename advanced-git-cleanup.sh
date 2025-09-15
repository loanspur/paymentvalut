#!/bin/bash

# Advanced Git History Cleanup Script
# ⚠️ WARNING: This will rewrite Git history and may cause issues for collaborators

echo "🚨 ADVANCED GIT CLEANUP SCRIPT"
echo "==============================="
echo "⚠️  WARNING: This will rewrite Git history!"
echo "⚠️  Make sure you have backups and notify your team!"
echo ""

read -p "Are you sure you want to proceed? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "❌ Cleanup cancelled"
    exit 1
fi

# List of sensitive files to remove from history
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
    "test-database-credentials.sql"
    "check-current-credential-state.sql"
    "check-stored-security-credential.sql"
    "check-initiator-password.sql"
    "check-partner-mpesa-config.sql"
    "check-real-disbursement.sql"
    "check-sandbox-disbursement.sql"
    "check-disbursement-5ee1db82.sql"
    "check-disbursement-after-callback-fix.sql"
    "check-disbursement-schema.sql"
    "check-disbursement-status.sql"
    "check-existing-partners-status.sql"
    "check-existing-partners.sql"
    "check-latest-disbursement-status.sql"
    "check-latest-disbursement-with-password.sql"
    "check-latest-disbursement.sql"
    "check-latest-transaction-status.sql"
    "check-mpesa-environment.sql"
    "check-origin-constraint.sql"
    "check-partner-mpesa-config.sql"
    "check-real-disbursement.sql"
    "check-sandbox-disbursement.sql"
    "check-security-credential.sql"
    "check-status-constraint.sql"
    "check-status-values.sql"
    "check-stored-security-credential.sql"
    "check-transaction-AG_20250913_205046966cfee3a7a171.sql"
    "check-transaction-status.sql"
    "check-vault-content.sql"
    "cleanup-hardcoded-credentials.sql"
    "debug-disbursement.sql"
    "diagnose-callback-issues.sql"
    "final-security-cleanup.sql"
    "fix-auth-imports.js"
    "fix-corrupted-base64.sql"
    "fix-disbursement-schema.sql"
    "fix-kes13-transaction.sql"
    "fix-malformed-base64.sql"
    "migrate-credentials-to-vault.sql"
    "migrate-shortcodes-to-vault.sql"
    "migrate-to-vault.sql"
    "rebuild-vault-properly.sql"
    "remove-plaintext-credentials.sql"
    "remove-remaining-hardcoded.sql"
    "run-cleanup-checks.sql"
    "simple-balance-check.sql"
    "test-api-key.sql"
    "test-balance-monitor.sql"
    "test-callback-system.js"
    "test-callback-urls.sql"
    "test-database-credentials.sql"
    "test-disbursement.ps1"
    "test-manual-status-update.sql"
    "test-slack.ps1"
    "test-vault-security-credential.sql"
    "test-vault-system.sql"
    "update-partner-passkey.sql"
    "update-security-credential.sql"
    "update-vault-with-security-credential.sql"
)

echo "🧹 Starting Git history cleanup..."

# Create backup
echo "💾 Creating backup branch..."
git checkout -b backup-before-history-cleanup

# Go back to main
git checkout main

# Remove each sensitive file from history
for file in "${SENSITIVE_FILES[@]}"; do
    echo "🗑️  Removing $file from Git history..."
    git filter-branch --force --index-filter \
        "git rm --cached --ignore-unmatch '$file'" \
        --prune-empty --tag-name-filter cat -- --all
done

# Clean up references
echo "🧹 Cleaning up references..."
git for-each-ref --format="%(refname)" refs/original/ | xargs -n 1 git update-ref -d

# Force garbage collection
echo "🗑️  Running garbage collection..."
git reflog expire --expire=now --all
git gc --prune=now --aggressive

echo ""
echo "✅ Git history cleanup completed!"
echo ""
echo "📤 Next steps:"
echo "1. Test your repository: git log --oneline"
echo "2. If everything looks good, force push: git push origin --force --all"
echo "3. Notify your team about the history rewrite"
echo ""
echo "⚠️  Remember: This has rewritten Git history. Anyone who has cloned"
echo "   the repository will need to re-clone it."

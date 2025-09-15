# Git Cleanup Guide - Remove Sensitive Credentials

## ⚠️ IMPORTANT: This process will rewrite Git history

### Step 1: Check for Sensitive Data in Git History

```bash
# Check recent commits
git log --oneline -10

# Search for sensitive patterns in Git history
git log --all --full-history -- "*.sql" | grep -i "password\|secret\|key\|credential"

# Search for specific sensitive files that were deleted
git log --all --full-history -- "update-security-credential.sql"
git log --all --full-history -- "update-partner-passkey.sql"
```

### Step 2: Create a Clean Branch (RECOMMENDED APPROACH)

```bash
# Create a new clean branch from current state
git checkout -b clean-version

# Add all current files
git add .

# Commit the clean version
git commit -m "Clean version: Remove all sensitive credentials and unused files"

# Push the clean branch
git push origin clean-version
```

### Step 3: Remove Sensitive Files from Git History (DANGEROUS)

⚠️ **WARNING**: This will rewrite Git history and may cause issues for other collaborators.

```bash
# Remove specific files from entire Git history
git filter-branch --force --index-filter \
  'git rm --cached --ignore-unmatch update-security-credential.sql' \
  --prune-empty --tag-name-filter cat -- --all

git filter-branch --force --index-filter \
  'git rm --cached --ignore-unmatch update-partner-passkey.sql' \
  --prune-empty --tag-name-filter cat -- --all

# Remove all SQL files that contained sensitive data
git filter-branch --force --index-filter \
  'git rm --cached --ignore-unmatch *.sql' \
  --prune-empty --tag-name-filter cat -- --all
```

### Step 4: Clean Up and Force Push (DANGEROUS)

```bash
# Clean up references
git for-each-ref --format="%(refname)" refs/original/ | xargs -n 1 git update-ref -d

# Force garbage collection
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Force push to remote (THIS WILL OVERWRITE REMOTE HISTORY)
git push origin --force --all
git push origin --force --tags
```

### Step 5: Alternative Safe Approach (RECOMMENDED)

Instead of rewriting history, create a completely new repository:

```bash
# Create a new directory
mkdir mpesaB2C-clean
cd mpesaB2C-clean

# Initialize new git repo
git init

# Copy only the clean files (exclude .git)
rsync -av --exclude='.git' ../mpesaB2C/ .

# Add all files
git add .

# Initial commit
git commit -m "Initial clean version: M-Pesa B2C System without sensitive data"

# Add remote
git remote add origin <your-new-repo-url>

# Push to new repository
git push -u origin main
```

## 🔒 Security Checklist

- [ ] No hardcoded API keys in code
- [ ] No plain text passwords in files
- [ ] No sensitive SQL files in repository
- [ ] All credentials moved to environment variables
- [ ] Vault system implemented for credential storage
- [ ] .env.local added to .gitignore
- [ ] Sensitive files removed from Git history

## 🚨 Emergency Steps if Sensitive Data was Pushed

If you accidentally pushed sensitive data:

1. **Immediately rotate all credentials** (API keys, passwords, etc.)
2. **Use the clean branch approach** (Step 2 above)
3. **Contact your team** if others have cloned the repository
4. **Consider the sensitive data compromised** and take appropriate security measures

## 📝 Best Practices Going Forward

1. **Never commit sensitive data** - Use environment variables
2. **Use .gitignore** for sensitive files
3. **Regular security audits** of your repository
4. **Use Git hooks** to prevent accidental commits of sensitive data
5. **Rotate credentials regularly**

# Downloading Files from Digital Ocean via SSH/SCP

## Your Current Command
```powershell
scp -P 38000 justus@165.227.202.189:/home/justus/mifos_schema.sql.zip C:\Users\Admin\Downloads
```

## ✅ Method 1: SCP with Password (Correct Syntax)

**Windows PowerShell:**
```powershell
scp -P 38000 justus@165.227.202.189:/home/justus/mifos_schema.sql.zip "C:\Users\Admin\Downloads\"
```

**When prompted for password:**
- Enter your SSH password for the `justus` user
- The password will NOT show as you type (this is normal)
- Press Enter after typing the password

**Note:** The `-P` flag specifies the SSH port (38000 in your case)

---

## 🔐 Method 2: Using SSH Key Authentication (Recommended)

If you have SSH keys set up, you can use them to avoid password prompts:

```powershell
scp -P 38000 -i "C:\Users\Admin\.ssh\id_rsa" justus@165.227.202.189:/home/justus/mifos_schema.sql.zip "C:\Users\Admin\Downloads\"
```

**Generate SSH key pair (if you don't have one):**
```powershell
ssh-keygen -t rsa -b 4096
# Follow prompts, save to default location: C:\Users\Admin\.ssh\id_rsa

# Copy public key to server
scp -P 38000 "C:\Users\Admin\.ssh\id_rsa.pub" justus@165.227.202.189:~/.ssh/authorized_keys
```

---

## 📋 Method 3: Using WinSCP (GUI - Easiest for Windows)

1. **Download WinSCP**: https://winscp.net/eng/download.php
2. **Configure connection:**
   - **Protocol**: SFTP
   - **Host name**: 165.227.202.189
   - **Port**: 38000
   - **User name**: justus
   - **Password**: (your password)
3. **Connect and drag-drop** the file to your Downloads folder

---

## 💻 Method 4: Using PowerShell SFTP (Windows 10/11)

```powershell
# Connect via SSH first
ssh -p 38000 justus@165.227.202.189

# Once connected, use sftp within SSH
sftp justus@165.227.202.189 -P 38000
# Then in sftp prompt:
get /home/justus/mifos_schema.sql.zip C:\Users\Admin\Downloads\
```

---

## 🔍 Method 5: Verify File Exists First

**Connect via SSH and verify:**
```powershell
ssh -p 38000 justus@165.227.202.189

# Once connected, check if file exists:
ls -lh /home/justus/mifos_schema.sql.zip

# Check file permissions:
ls -la /home/justus/mifos_schema.sql.zip

# If file doesn't exist or has wrong permissions:
# Navigate to where you created it:
cd /path/to/where/you/created/it
# Or recreate it if needed
```

---

## ⚠️ Common Issues & Solutions

### Issue 1: "Permission denied"
**Solution:**
```bash
# On the server (SSH into it first)
chmod 644 /home/justus/mifos_schema.sql.zip
# Or make sure you're using the correct username
```

### Issue 2: "Connection refused" or "Network unreachable"
**Solution:**
- Verify the IP address: `165.227.202.189`
- Verify the port: `38000`
- Check if Digital Ocean firewall allows SSH on port 38000
- Try regular SSH port 22 first: `scp -P 22 ...`

### Issue 3: "No such file or directory"
**Solution:**
```bash
# SSH into server and find the file:
ssh -p 38000 justus@165.227.202.189
find ~ -name "mifos_schema.sql.zip"
# Or check the exact path where mysqldump created it
```

### Issue 4: Password prompt keeps failing
**Solution:**
- Make sure you're using the correct password for the `justus` user
- Try connecting via SSH first to verify credentials:
  ```powershell
  ssh -p 38000 justus@165.227.202.189
  ```

### Issue 5: Windows path issues
**Solution:**
- Use quotes around paths with spaces
- Use forward slashes or escape backslashes:
  ```powershell
  scp -P 38000 justus@165.227.202.189:/home/justus/mifos_schema.sql.zip "C:/Users/Admin/Downloads/"
  ```

---

## ✅ Recommended Workflow

1. **First, verify the file exists on server:**
   ```powershell
   ssh -p 38000 justus@165.227.202.189
   ls -lh /home/justus/mifos_schema.sql.zip
   exit
   ```

2. **Then download using SCP:**
   ```powershell
   scp -P 38000 justus@165.227.202.189:/home/justus/mifos_schema.sql.zip "C:\Users\Admin\Downloads\"
   ```
   - Enter password when prompted
   - Wait for download to complete

3. **Verify file downloaded:**
   ```powershell
   dir "C:\Users\Admin\Downloads\mifos_schema.sql.zip"
   ```

---

## 🚀 Quick Command Reference

```powershell
# Download file
scp -P 38000 justus@165.227.202.189:/home/justus/mifos_schema.sql.zip "C:\Users\Admin\Downloads\"

# Download multiple files
scp -P 38000 justus@165.227.202.189:/home/justus/*.sql.zip "C:\Users\Admin\Downloads\"

# Download entire directory
scp -P 38000 -r justus@165.227.202.189:/home/justus/backup/ "C:\Users\Admin\Downloads\"

# Upload file to server
scp -P 38000 "C:\Users\Admin\local_file.txt" justus@165.227.202.189:/home/justus/
```

---

## 📝 Notes

- The `-P` flag (capital P) is for the port number
- The `-p` flag (lowercase p) is for preserving file attributes (don't confuse them!)
- Always use quotes around Windows paths that contain spaces
- Password input is hidden (won't show characters as you type)


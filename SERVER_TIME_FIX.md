# Fixing Server Time Synchronization

The deployment error `System time is out of sync with GitHub API time` indicates your server's clock has drifted significantly.

**Run these commands on your remote server (via SSH):**

```bash
# 1. Enable Network Time Protocol (NTP)
sudo timedatectl set-ntp on

# 2. Force immediate synchronization (if needed)
# Ubuntu/Debian:
sudo apt-get update && sudo apt-get install -y ntpdate
sudo ntpdate pool.ntp.org

# 3. Verify the time
date
```

After fixing the time, retry the deployment in Coolify.

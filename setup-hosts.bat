# Local Subdomain Testing Setup for Windows
# Add these entries to your hosts file (C:\Windows\System32\drivers\etc\hosts)
# Run this batch file as administrator to automatically add entries

@echo off
echo Adding subdomain entries to hosts file for local testing...
echo This requires administrator privileges.

# Add entries
echo 127.0.0.1 shahdol.localhost >> %SYSTEMROOT%\System32\drivers\etc\hosts
echo 127.0.0.1 anuppur.localhost >> %SYSTEMROOT%\System32\drivers\etc\hosts
echo 127.0.0.1 umaria.localhost >> %SYSTEMROOT%\System32\drivers\etc\hosts

echo Hosts file updated successfully!
echo You can now access:
echo - http://shahdol.localhost:5174
echo - http://anuppur.localhost:5174
echo - http://umaria.localhost:5174

pause
# HRMS ADMS bridge installer (Windows). Run via INSTALL-ADMS-BRIDGE.bat (it asks for administrator rights).
$ErrorActionPreference = 'Stop'
$Target = 'https://hrms-backend-dlez.onrender.com'
$Port = 8888
$Dir = 'C:\hrms-adms-bridge'

function Step($t) { Write-Host ''; Write-Host "==> $t" -ForegroundColor Cyan }

$admin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $admin) { Write-Host 'Please run INSTALL-ADMS-BRIDGE.bat (it asks for administrator rights).' -ForegroundColor Red; Read-Host 'Press Enter to close'; exit 1 }

try {
  Step 'Checking Node.js'
  $node = (Get-Command node -ErrorAction SilentlyContinue).Source
  if (-not $node -and (Test-Path 'C:\Program Files\nodejs\node.exe')) { $node = 'C:\Program Files\nodejs\node.exe' }
  if (-not $node) {
    if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
      throw 'Node.js is not installed and winget is not available. Install Node.js LTS from https://nodejs.org, then run this installer again.'
    }
    Write-Host 'Installing Node.js LTS (this can take a few minutes)...'
    winget install --id OpenJS.NodeJS.LTS -e --silent --accept-package-agreements --accept-source-agreements | Out-Host
    $node = 'C:\Program Files\nodejs\node.exe'
    if (-not (Test-Path $node)) { throw 'Node.js installation did not finish. Install Node.js LTS from https://nodejs.org, then run this installer again.' }
  }
  $ver = & $node --version
  Write-Host "Node.js $ver found at $node"
  if ([int]($ver.TrimStart('v').Split('.')[0]) -lt 18) { throw "Node.js $ver is too old. Install Node.js LTS (18 or newer) from https://nodejs.org." }

  Step "Writing bridge files to $Dir"
  New-Item -ItemType Directory -Force -Path $Dir | Out-Null
  [IO.File]::WriteAllBytes("$Dir\adms-bridge.mjs", [Convert]::FromBase64String('IyEvdXNyL2Jpbi9lbnYgbm9kZQovKioKICogQURNUyBicmlkZ2U6IGxldHMgYW4gZVNTTCAvIFpLVGVjbyBhdHRlbmRhbmNlIG1hY2hpbmUgb24gdGhlIG9mZmljZSBuZXR3b3JrIHB1c2ggcHVuY2hlcyB0byB0aGUKICogSFJNUyBiYWNrZW5kIGhvc3RlZCBpbiB0aGUgY2xvdWQgKFJlbmRlcikuCiAqCiAqIFdoeTogb2xkZXIgZmlybXdhcmVzIChlLmcuIGVTU0wgWDIwMDgsIGZpcm13YXJlIDYueCwgcHVzaCAyLngpIGNhbiBvbmx5IHNlbmQgcGxhaW4gSFRUUCB0byBhbiBJUCBhZGRyZXNzLAogKiB3aGlsZSBSZW5kZXIgb25seSBzZXJ2ZXMgSFRUUFMgb24gYSBkb21haW4gbmFtZS4gVGhpcyBwcm9ncmFtIHJ1bnMgb24gYW4gYWx3YXlzLW9uIG9mZmljZSBQQywgYWNjZXB0cyB0aGUKICogbWFjaGluZSdzIHBsYWluIEhUVFAgcmVxdWVzdHMgYW5kIGZvcndhcmRzIHRoZW0gdW5jaGFuZ2VkIHRvIHRoZSBiYWNrZW5kIG92ZXIgSFRUUFMsIHRoZW4gcmV0dXJucyB0aGUKICogYmFja2VuZCdzIGFuc3dlciB0byB0aGUgbWFjaGluZS4KICoKICogICBtYWNoaW5lICgxOTIuMTY4LjEuMTU1KSAgLS1IVFRQLS0+ICB0aGlzIFBDIDo4ODg4ICAtLUhUVFBTLS0+ICBodHRwczovLzxiYWNrZW5kPi9pY2xvY2svLi4uCiAqCiAqIElmIHRoZSBiYWNrZW5kIGNhbm5vdCBiZSByZWFjaGVkLCB0aGUgbWFjaGluZSBnZXRzICJFUlJPUiIgYW5kIGtlZXBzIHRoZSBwdW5jaGVzIHRvIHJlc2VuZCBsYXRlciwKICogc28gbm90aGluZyBpcyBsb3N0IHdoaWxlIHRoZSBpbnRlcm5ldCBvciB0aGUgYmFja2VuZCBpcyBkb3duLgogKgogKiBVc2FnZTogICBub2RlIGFkbXMtYnJpZGdlLm1qcyBbLS1wb3J0IDg4ODhdIFstLXRhcmdldCBodHRwczovL3lvdXItYmFja2VuZC5vbnJlbmRlci5jb21dCiAqIEVudjogICAgIEFETVNfQlJJREdFX1BPUlQsIEFETVNfQlJJREdFX1RBUkdFVAogKiBOZWVkczogICBOb2RlLmpzIDE4IG9yIG5ld2VyLiBObyBwYWNrYWdlcyB0byBpbnN0YWxsLgogKi8KaW1wb3J0IGh0dHAgZnJvbSAnbm9kZTpodHRwJzsKaW1wb3J0IG9zIGZyb20gJ25vZGU6b3MnOwoKY29uc3QgREVGQVVMVF9UQVJHRVQgPSAnaHR0cHM6Ly9ocm1zLWJhY2tlbmQtZGxlei5vbnJlbmRlci5jb20nOwoKZnVuY3Rpb24gYXJnKG5hbWUpIHsKICBjb25zdCBpID0gcHJvY2Vzcy5hcmd2LmluZGV4T2YoYC0tJHtuYW1lfWApOwogIHJldHVybiBpID4gLTEgPyBwcm9jZXNzLmFyZ3ZbaSArIDFdIDogdW5kZWZpbmVkOwp9Cgpjb25zdCBQT1JUID0gTnVtYmVyKGFyZygncG9ydCcpIHx8IHByb2Nlc3MuZW52LkFETVNfQlJJREdFX1BPUlQgfHwgODg4OCk7CmNvbnN0IFRBUkdFVCA9IFN0cmluZyhhcmcoJ3RhcmdldCcpIHx8IHByb2Nlc3MuZW52LkFETVNfQlJJREdFX1RBUkdFVCB8fCBERUZBVUxUX1RBUkdFVCkucmVwbGFjZSgvXC8rJC8sICcnKTsKLy8gQSBjb2xkLXN0YXJ0aW5nIGZyZWUgUmVuZGVyIHNlcnZpY2UgY2FuIHRha2UgfjUwIHMgdG8gYW5zd2VyOyBtYWNoaW5lcyB1c3VhbGx5IHdhaXQgYWJvdXQgMzAtNjAgcy4KY29uc3QgVVBTVFJFQU1fVElNRU9VVF9NUyA9IE51bWJlcihwcm9jZXNzLmVudi5BRE1TX0JSSURHRV9USU1FT1VUX01TIHx8IDU1MDAwKTsKY29uc3QgTUFYX0JPRFlfQllURVMgPSAyMCAqIDEwMjQgKiAxMDI0OwoKaWYgKCEvXmh0dHBzPzpcL1wvW14vXSskL2kudGVzdChUQVJHRVQpKSB7CiAgY29uc29sZS5lcnJvcihgSW52YWxpZCB0YXJnZXQgIiR7VEFSR0VUfSIuIEV4YW1wbGU6IC0tdGFyZ2V0IGh0dHBzOi8vaHJtcy1iYWNrZW5kLWRsZXoub25yZW5kZXIuY29tYCk7CiAgcHJvY2Vzcy5leGl0KDEpOwp9CmlmICghTnVtYmVyLmlzSW50ZWdlcihQT1JUKSB8fCBQT1JUIDwgMSB8fCBQT1JUID4gNjU1MzUpIHsKICBjb25zb2xlLmVycm9yKGBJbnZhbGlkIHBvcnQgIiR7UE9SVH0iLmApOwogIHByb2Nlc3MuZXhpdCgxKTsKfQoKY29uc3Qgc3RhbXAgPSAoKSA9PiBuZXcgRGF0ZSgpLnRvTG9jYWxlU3RyaW5nKCk7CmNvbnN0IGxvZyA9ICguLi5hKSA9PiBjb25zb2xlLmxvZyhgWyR7c3RhbXAoKX1dYCwgLi4uYSk7CgovKiogT25seSB0aGUgZGV2aWNlIHByb3RvY29sIHBhdGhzIGFyZSBmb3J3YXJkZWQ7IG5vdGhpbmcgZWxzZSBvbiB0aGUgYmFja2VuZCBpcyByZWFjaGFibGUgdGhyb3VnaCB0aGUgYnJpZGdlLiAqLwpjb25zdCBERVZJQ0VfUEFUSCA9IC9eXC9pY2xvY2tcLyg/OmNkYXRhfGdldHJlcXVlc3R8ZGV2aWNlY21kfGZkYXRhfHB1c2h8cXVlcnlkYXRhfHBpbmcpKD86XC5waHB8XC5hc3B4KT9cLz8kL2k7CgpmdW5jdGlvbiBkZXZpY2VJcChyZXEpIHsKICByZXR1cm4gU3RyaW5nKHJlcS5zb2NrZXQucmVtb3RlQWRkcmVzcyB8fCAnJykucmVwbGFjZSgvXjo6ZmZmZjovLCAnJyk7Cn0KCmZ1bmN0aW9uIHJlYWRCb2R5KHJlcSkgewogIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7CiAgICBjb25zdCBjaHVua3MgPSBbXTsKICAgIGxldCBzaXplID0gMDsKICAgIHJlcS5vbignZGF0YScsIChjKSA9PiB7CiAgICAgIHNpemUgKz0gYy5sZW5ndGg7CiAgICAgIGlmIChzaXplID4gTUFYX0JPRFlfQllURVMpIHsKICAgICAgICByZWplY3QobmV3IEVycm9yKCdib2R5IHRvbyBsYXJnZScpKTsKICAgICAgICByZXEuZGVzdHJveSgpOwogICAgICAgIHJldHVybjsKICAgICAgfQogICAgICBjaHVua3MucHVzaChjKTsKICAgIH0pOwogICAgcmVxLm9uKCdlbmQnLCAoKSA9PiByZXNvbHZlKEJ1ZmZlci5jb25jYXQoY2h1bmtzKSkpOwogICAgcmVxLm9uKCdlcnJvcicsIHJlamVjdCk7CiAgfSk7Cn0KCmZ1bmN0aW9uIHJlcGx5KHJlcywgc3RhdHVzLCB0ZXh0KSB7CiAgcmVzLndyaXRlSGVhZChzdGF0dXMsIHsgJ0NvbnRlbnQtVHlwZSc6ICd0ZXh0L3BsYWluJywgJ0NvbnRlbnQtTGVuZ3RoJzogQnVmZmVyLmJ5dGVMZW5ndGgodGV4dCkgfSk7CiAgcmVzLmVuZCh0ZXh0KTsKfQoKZnVuY3Rpb24gZGVzY3JpYmUodXJsKSB7CiAgY29uc3QgcSA9IHVybC5zZWFyY2hQYXJhbXM7CiAgY29uc3Qgc24gPSBxLmdldCgnU04nKSB8fCBxLmdldCgnc24nKSB8fCAnPyc7CiAgY29uc3QgdGFibGUgPSBxLmdldCgndGFibGUnKSB8fCBxLmdldCgnVGFibGUnKTsKICByZXR1cm4gYFNOPSR7c259JHt0YWJsZSA/IGAgdGFibGU9JHt0YWJsZX1gIDogJyd9YDsKfQoKbGV0IGxhc3RPa0F0ID0gMDsKCmNvbnN0IHNlcnZlciA9IGh0dHAuY3JlYXRlU2VydmVyKGFzeW5jIChyZXEsIHJlcykgPT4gewogIGNvbnN0IHVybCA9IG5ldyBVUkwocmVxLnVybCB8fCAnLycsICdodHRwOi8vYnJpZGdlLmxvY2FsJyk7CgogIC8vIFNpbXBsZSBzdGF0dXMgcGFnZSBmb3IgYSBwZXJzb24gb3BlbmluZyBodHRwOi8vPHRoaXMtcGM+Ojxwb3J0Pi8gaW4gYSBicm93c2VyCiAgaWYgKHJlcS5tZXRob2QgPT09ICdHRVQnICYmICh1cmwucGF0aG5hbWUgPT09ICcvJyB8fCB1cmwucGF0aG5hbWUgPT09ICcvc3RhdHVzJykpIHsKICAgIGNvbnN0IG9rID0gbGFzdE9rQXQgPyBgbGFzdCBzdWNjZXNzZnVsIGZvcndhcmQ6ICR7bmV3IERhdGUobGFzdE9rQXQpLnRvTG9jYWxlU3RyaW5nKCl9YCA6ICdubyBkZXZpY2UgdHJhZmZpYyBmb3J3YXJkZWQgeWV0JzsKICAgIHJlcGx5KHJlcywgMjAwLCBgSFJNUyBBRE1TIGJyaWRnZSBpcyBydW5uaW5nLlxuRm9yd2FyZGluZyB0bzogJHtUQVJHRVR9L2ljbG9jay8uLi5cbiR7b2t9XG5gKTsKICAgIHJldHVybjsKICB9CgogIGlmICghREVWSUNFX1BBVEgudGVzdCh1cmwucGF0aG5hbWUpKSB7CiAgICByZXBseShyZXMsIDQwNCwgJ05vdCBGb3VuZCcpOwogICAgcmV0dXJuOwogIH0KCiAgbGV0IGJvZHk7CiAgdHJ5IHsKICAgIGJvZHkgPSByZXEubWV0aG9kID09PSAnR0VUJyB8fCByZXEubWV0aG9kID09PSAnSEVBRCcgPyB1bmRlZmluZWQgOiBhd2FpdCByZWFkQm9keShyZXEpOwogIH0gY2F0Y2ggewogICAgcmVwbHkocmVzLCA0MTMsICdFUlJPUicpOwogICAgcmV0dXJuOwogIH0KCiAgY29uc3QgY29udHJvbGxlciA9IG5ldyBBYm9ydENvbnRyb2xsZXIoKTsKICBjb25zdCB0aW1lciA9IHNldFRpbWVvdXQoKCkgPT4gY29udHJvbGxlci5hYm9ydCgpLCBVUFNUUkVBTV9USU1FT1VUX01TKTsKICBjb25zdCBzdGFydGVkID0gRGF0ZS5ub3coKTsKICB0cnkgewogICAgY29uc3QgdXBzdHJlYW0gPSBhd2FpdCBmZXRjaChgJHtUQVJHRVR9JHt1cmwucGF0aG5hbWV9JHt1cmwuc2VhcmNofWAsIHsKICAgICAgbWV0aG9kOiByZXEubWV0aG9kLAogICAgICBoZWFkZXJzOiB7CiAgICAgICAgJ0NvbnRlbnQtVHlwZSc6IHJlcS5oZWFkZXJzWydjb250ZW50LXR5cGUnXSB8fCAndGV4dC9wbGFpbicsCiAgICAgICAgJ1VzZXItQWdlbnQnOiByZXEuaGVhZGVyc1sndXNlci1hZ2VudCddIHx8ICdpQ2xvY2sgUHJveHknLAogICAgICAgIC8vIExldHMgdGhlIGJhY2tlbmQgc2hvdyB0aGUgbWFjaGluZSdzIG93biBMQU4gYWRkcmVzcwogICAgICAgICdYLUZvcndhcmRlZC1Gb3InOiBkZXZpY2VJcChyZXEpLAogICAgICB9LAogICAgICBib2R5OiBib2R5ICYmIGJvZHkubGVuZ3RoID8gYm9keSA6IHVuZGVmaW5lZCwKICAgICAgcmVkaXJlY3Q6ICdmb2xsb3cnLAogICAgICBzaWduYWw6IGNvbnRyb2xsZXIuc2lnbmFsLAogICAgfSk7CiAgICBjb25zdCB0ZXh0ID0gYXdhaXQgdXBzdHJlYW0udGV4dCgpOwogICAgbGFzdE9rQXQgPSB1cHN0cmVhbS5vayA/IERhdGUubm93KCkgOiBsYXN0T2tBdDsKICAgIGxvZyhgJHtyZXEubWV0aG9kfSAke3VybC5wYXRobmFtZX0gJHtkZXNjcmliZSh1cmwpfSAtPiAke3Vwc3RyZWFtLnN0YXR1c30gJHt0ZXh0LnNwbGl0KC9ccj9cbi8pWzBdLnNsaWNlKDAsIDYwKX0gKCR7RGF0ZS5ub3coKSAtIHN0YXJ0ZWR9IG1zKWApOwogICAgcmVzLndyaXRlSGVhZCh1cHN0cmVhbS5zdGF0dXMsIHsKICAgICAgJ0NvbnRlbnQtVHlwZSc6IHVwc3RyZWFtLmhlYWRlcnMuZ2V0KCdjb250ZW50LXR5cGUnKSB8fCAndGV4dC9wbGFpbicsCiAgICAgICdDb250ZW50LUxlbmd0aCc6IEJ1ZmZlci5ieXRlTGVuZ3RoKHRleHQpLAogICAgfSk7CiAgICByZXMuZW5kKHRleHQpOwogIH0gY2F0Y2ggKGVycikgewogICAgY29uc3Qgd2h5ID0gZXJyPy5uYW1lID09PSAnQWJvcnRFcnJvcicgPyBgbm8gYW5zd2VyIHdpdGhpbiAke1VQU1RSRUFNX1RJTUVPVVRfTVMgLyAxMDAwfXNgIDogZXJyPy5jYXVzZT8uY29kZSB8fCBlcnI/Lm1lc3NhZ2UgfHwgZXJyOwogICAgbG9nKGAke3JlcS5tZXRob2R9ICR7dXJsLnBhdGhuYW1lfSAke2Rlc2NyaWJlKHVybCl9IC0+IGJhY2tlbmQgdW5yZWFjaGFibGUgKCR7d2h5fSk7IGRldmljZSB3aWxsIHJldHJ5YCk7CiAgICAvLyBBbnl0aGluZyBidXQgT0sgbWFrZXMgdGhlIG1hY2hpbmUga2VlcCBpdHMgcHVuY2hlcyBhbmQgc2VuZCB0aGVtIGFnYWluIGxhdGVyCiAgICByZXBseShyZXMsIDUwMiwgJ0VSUk9SJyk7CiAgfSBmaW5hbGx5IHsKICAgIGNsZWFyVGltZW91dCh0aW1lcik7CiAgfQp9KTsKCnNlcnZlci5vbignZXJyb3InLCAoZXJyKSA9PiB7CiAgaWYgKGVyci5jb2RlID09PSAnRUFERFJJTlVTRScpIHsKICAgIGNvbnNvbGUuZXJyb3IoYFBvcnQgJHtQT1JUfSBpcyBhbHJlYWR5IGluIHVzZS4gQ2xvc2UgdGhlIG90aGVyIHByb2dyYW0gdXNpbmcgaXQgKGUuZy4gZVRpbWVUcmFja0xpdGUpIG9yIHN0YXJ0IHdpdGggLS1wb3J0IDxvdGhlcj4uYCk7CiAgfSBlbHNlIHsKICAgIGNvbnNvbGUuZXJyb3IoJ0JyaWRnZSBlcnJvcjonLCBlcnIubWVzc2FnZSk7CiAgfQogIHByb2Nlc3MuZXhpdCgxKTsKfSk7CgpzZXJ2ZXIubGlzdGVuKFBPUlQsICcwLjAuMC4wJywgKCkgPT4gewogIGNvbnN0IGlwcyA9IE9iamVjdC52YWx1ZXMob3MubmV0d29ya0ludGVyZmFjZXMoKSkKICAgIC5mbGF0KCkKICAgIC5maWx0ZXIoKG4pID0+IG4gJiYgbi5mYW1pbHkgPT09ICdJUHY0JyAmJiAhbi5pbnRlcm5hbCkKICAgIC5tYXAoKG4pID0+IG4uYWRkcmVzcyk7CiAgbG9nKGBIUk1TIEFETVMgYnJpZGdlIGxpc3RlbmluZyBvbiBwb3J0ICR7UE9SVH0sIGZvcndhcmRpbmcgdG8gJHtUQVJHRVR9YCk7CiAgbG9nKGBTZXQgdGhlIGF0dGVuZGFuY2UgbWFjaGluZSdzIEFETVMgc2VydmVyIHRvIG9uZSBvZjogJHtpcHMubWFwKChpcCkgPT4gYCR7aXB9OiR7UE9SVH1gKS5qb2luKCcsICcpIHx8IGA8dGhpcyBQQydzIElQPjoke1BPUlR9YH1gKTsKfSk7Cg=='))
  $bat = @"
@echo off
title HRMS ADMS bridge (keep this window open)
cd /d "%~dp0"
:run
"$node" adms-bridge.mjs --port $Port --target $Target
echo Bridge stopped. Restarting in 10 seconds... (close this window to stop it)
timeout /t 10 >nul
goto run
"@
  Set-Content -Path "$Dir\start-adms-bridge.bat" -Value $bat -Encoding ASCII

  Step "Opening port $Port in Windows Firewall"
  Get-NetFirewallRule -DisplayName 'HRMS ADMS bridge' -ErrorAction SilentlyContinue | Remove-NetFirewallRule
  New-NetFirewallRule -DisplayName 'HRMS ADMS bridge' -Direction Inbound -Action Allow -Protocol TCP -LocalPort $Port -Profile Any | Out-Null

  Step 'Starting automatically with Windows'
  $startup = [Environment]::GetFolderPath('Startup')
  $sh = (New-Object -ComObject WScript.Shell).CreateShortcut("$startup\HRMS ADMS bridge.lnk")
  $sh.TargetPath = "$Dir\start-adms-bridge.bat"
  $sh.WorkingDirectory = $Dir
  $sh.WindowStyle = 7
  $sh.Save()

  Step 'Checking that port 8888 is free'
  $busy = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
  if ($busy) {
    $p = Get-Process -Id $busy[0].OwningProcess -ErrorAction SilentlyContinue
    if ($p -and $p.ProcessName -ne 'node') { throw "Port $Port is used by '$($p.ProcessName)'. Close that program (for example eTimeTrackLite) and run this installer again." }
    if ($p) { Write-Host 'An older bridge is running; restarting it.'; Stop-Process -Id $p.Id -Force; Start-Sleep 1 }
  }

  Step 'Starting the bridge'
  Start-Process -FilePath "$Dir\start-adms-bridge.bat" -WorkingDirectory $Dir -WindowStyle Minimized
  Start-Sleep 3
  try { $status = (Invoke-WebRequest -UseBasicParsing "http://127.0.0.1:$Port/" -TimeoutSec 5).Content } catch { $status = $null }
  if (-not $status) { throw 'The bridge did not start. Open C:\hrms-adms-bridge\start-adms-bridge.bat to see the error.' }
  Write-Host $status -ForegroundColor Green

  $ips = Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -match '^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)' -and $_.InterfaceAlias -notmatch 'vEthernet|WSL|Loopback' } | Select-Object -ExpandProperty IPAddress
  Write-Host ''
  Write-Host '============================================================' -ForegroundColor Green
  Write-Host ' Bridge installed and running.' -ForegroundColor Green
  Write-Host ' On the attendance machine set  ADMS Setup -> IP mode:' -ForegroundColor Green
  foreach ($ip in $ips) { Write-Host "     $ip   port $Port" -ForegroundColor Yellow }
  Write-Host ' then press OK and restart the machine.' -ForegroundColor Green
  Write-Host ' Keep this PC on. The bridge starts by itself after reboot.' -ForegroundColor Green
  Write-Host '============================================================' -ForegroundColor Green
} catch {
  Write-Host ''
  Write-Host "Setup failed: $($_.Exception.Message)" -ForegroundColor Red
}
Read-Host 'Press Enter to close'

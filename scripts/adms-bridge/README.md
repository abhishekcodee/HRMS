# ADMS bridge — connect an office attendance machine to HRMS on Render

Older eSSL / ZKTeco machines (for example the **eSSL X2008**, firmware 6.x, push version 2.x) can only send
plain HTTP to an IP address. The HRMS backend on Render only accepts HTTPS on a domain name, so the machine
cannot reach it directly. This small program runs on an office PC and passes the machine's data to Render:

```
attendance machine  --HTTP-->  office PC :8888  --HTTPS-->  https://hrms-backend-dlez.onrender.com/iclock/...
```

If the internet or the backend is down, the machine is told "ERROR" and keeps its punches to send again
later, so nothing is lost. Only device traffic (`/iclock/...`) is forwarded.

## Quick install (Windows)

Copy `INSTALL-ADMS-BRIDGE.bat` and `install-adms-bridge.ps1` to the office PC (same folder) and double-click
`INSTALL-ADMS-BRIDGE.bat`. Allow the administrator prompt. It installs Node.js LTS if needed, puts the bridge in
`C:\hrms-adms-bridge`, opens port 8888 in the firewall, makes it start with Windows, starts it, and prints the IP
address to enter on the attendance machine. Then do step 8 and 9 below.

## Setup (manual)

1. Pick a PC that stays on during working hours and is on the same network as the machine.
2. Install **Node.js LTS** from <https://nodejs.org>.
3. Copy this folder (`scripts/adms-bridge`) to the PC, e.g. `C:\hrms-adms-bridge`.
4. Give the PC a fixed IP address (reserve it in the router, or set a static IP in Windows),
   otherwise the machine loses the connection when the IP changes.
5. Allow port 8888 through the Windows firewall (Command Prompt **as Administrator**):

   ```
   netsh advfirewall firewall add rule name="HRMS ADMS bridge 8888" dir=in action=allow protocol=TCP localport=8888
   ```

6. Double-click **`start-adms-bridge.bat`**. Keep the window open. It shows the address to use, for example
   `192.168.1.54:8888`.
7. Check it from another device on the network: open `http://192.168.1.54:8888/` — it should say
   "HRMS ADMS bridge is running".
8. On the attendance machine: **Menu → Comm → ADMS Setup** (Cloud Server):
   - ADMS Server: **IP mode**, `192.168.1.54` port `8888` (use your PC's IP)
   - Proxy server: OFF
   - Save, then restart the machine.
9. In HRMS: **Biometric Devices** → the machine appears with its serial number → **Register device**.
   Then map device user numbers to employees under **Employee ↔ Device User ID**.

## Start automatically with Windows

Press `Win + R`, type `shell:startup`, and put a shortcut to `start-adms-bridge.bat` in that folder.

## Options

```
node adms-bridge.mjs --port 8888 --target https://your-backend.onrender.com
```

or the environment variables `ADMS_BRIDGE_PORT`, `ADMS_BRIDGE_TARGET`, `ADMS_BRIDGE_TIMEOUT_MS`.

## Troubleshooting

| What you see | What to do |
| --- | --- |
| `Port 8888 is already in use` | Another program (often eTimeTrackLite / ADMS service) uses 8888. Close it, or start the bridge with `--port 8889` and set the same port on the machine. |
| No lines appear in the window when someone punches | The machine is not reaching the PC: check the IP/port on the machine, the firewall rule, and that both are on the same network. |
| Lines end with `backend unreachable` | The PC has no internet, or the Render service is down/sleeping. Punches are kept on the machine and resent automatically. |
| Device shows in HRMS but punches are "unmatched" | Map the device user number to the employee in HRMS. |

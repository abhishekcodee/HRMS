# Connecting an eSSL AiFace Mars (Wi-Fi face terminal) to HRMS

The AiFace Mars sends every punch to HRMS over the **ADMS / Cloud Server** (ZKTeco push) protocol.
The device connects *out* to the HRMS backend, so you do **not** need a static IP, port forwarding or
eTimeTrackLite.

```
[AiFace Mars] --Wi-Fi--> office router --internet--> https://<backend>/iclock/cdata  -->  HRMS attendance
```

> Menu names below are from current eSSL/ZKTeco face-terminal firmware. Older firmware may say
> "ADMS" instead of "Cloud Server Setting", or "Comm." instead of "COMM.", but the fields are the same.

---

## 0. Before you start

1. **Deploy the updated backend.** Push this repository to GitHub so Render redeploys
   `hrms-backend-dlez.onrender.com`. Check `https://hrms-backend-dlez.onrender.com/api/v1/health` loads.
2. Note the device **serial number (SN)**: it's on the label at the back, or under
   **Menu → System Info → Device Info → Serial Number**.
3. Make sure the server address is reachable from the office: open
   `https://hrms-backend-dlez.onrender.com/iclock/cdata?SN=test` on a phone connected to the same
   Wi-Fi. It should show `OK`.

## 1. Connect the device to Wi-Fi

1. Tap **M/OK** (or the menu icon) → log in as the device admin.
2. **COMM. → Wireless Network (WIFI Setting)** → turn **WIFI ON** → pick your office network → enter the password.
3. Leave **DHCP ON**. Wait until the Wi-Fi icon shows connected.
4. In **COMM. → Wireless Network → Advanced**, check that IP, mask, **gateway** and **DNS** are filled in
   (a missing gateway or DNS is the most common reason the device can't reach the cloud server).
   If DNS is empty, set it to `8.8.8.8`.

## 2. Set the date, time and time zone

HRMS stores punches **exactly as the device clock shows them**, so the clock must be right.

**System → Date Time:** set the correct date and time, 24-hour format, time zone **GMT+05:30** (India).
Turn off daylight saving.

## 3. Point the device at HRMS (Cloud Server Setting)

**COMM. → Cloud Server Setting** (sometimes **ADMS**):

| Field | Value (Render deployment) |
|---|---|
| Server Mode | **ADMS** |
| Enable Domain Name | **ON** |
| Server Address | `hrms-backend-dlez.onrender.com` |
| Server Port | **443** |
| HTTPS | **ON** |
| Enable Proxy Server | **OFF** |

Save and go back to the home screen. Within ~30 seconds a small **cloud/server icon** should appear in the
status bar without a red cross.

The exact values for your server are also shown in HRMS under
**Time & Attendance → eSSL Biometric Machines → Device setup guide**.

### If your device has no HTTPS option

Render only accepts HTTPS. If the Cloud Server screen has no HTTPS switch, or the server icon stays
crossed out, run the included relay on any always-on PC in the office (Node.js 18+):

```powershell
node scripts/adms-relay.mjs --target https://hrms-backend-dlez.onrender.com --port 8081
```

Then configure the device with: Enable Domain Name **OFF**, Server Address = that PC's LAN IP
(e.g. `192.168.1.20`), Server Port **8081**, HTTPS **OFF**. Allow port 8081 in the PC's Windows Firewall.
(Alternatively, host the backend on a VPS with a plain-HTTP port.)

### If HRMS runs on a PC in your office instead of Render

Enable Domain Name **OFF**, Server Address = the server PC's LAN IP, Server Port **4000**, HTTPS **OFF**.
Allow inbound TCP 4000 in Windows Firewall on that PC.

## 4. Register the device in HRMS

1. Log in as admin → **Time & Attendance → eSSL Biometric Machines**.
2. Click **Register device**, enter the **serial number**, a name (e.g. "Reception AiFace Mars") and location.
3. Within a minute the device shows **ONLINE** with its firmware and user count.

Until a device is registered, its punches are stored but **not** applied to attendance. That stops
anyone from sending fake punches with an unknown serial number. Punches received before registration are
applied automatically once you register it.

## 5. Enrol employees on the device

For automatic matching, enrol each person with **User ID = the number in their HRMS employee code**:

| HRMS employee code | Device User ID |
|---|---|
| `AMPL-00007` | `7` |
| `AMPL-00012` | `12` |
| `EMP001` | `1` (or `EMP001` if your firmware allows letters) |

On the device: **User Mgt. → New User** → enter **User ID** and **Name** → **Face** → follow the on-screen
capture → Save.

If a User ID doesn't follow that rule (e.g. people already enrolled with other IDs), open the
**Employee ↔ Device User ID** tab in HRMS and link each ID to the right employee. Earlier punches from
that ID are applied straight away.

## 6. Test

1. Ask an enrolled employee to face the device. It should say "Thank you" / "Verified".
2. In HRMS → **eSSL Biometric Machines → Punch log** the punch appears within a few seconds.
3. **Attendance** shows the employee's clock-in. A second punch later in the day becomes the clock-out,
   and hours, late minutes and overtime are calculated.

## 7. Import older punches from the device

Click **Pull logs** next to the device. HRMS asks the device to re-send the last 31 days of punches;
duplicates are skipped automatically. To fetch enrolled names for the mapping screen, click **Users**.

---

## How attendance is calculated

* First punch of the day = clock-in, last punch = clock-out (needs at least two punches). The IN/OUT
  key pressed on the device is recorded but not required.
* **Late** if clock-in is after shift start + grace. Shift start comes from the employee's shift
  (**Masters → Shifts**) or else **Settings → Shift start / Grace period** (default 09:00 + 15 min).
* Overtime = worked hours − full-day hours (Settings, default 8).
* Night shifts that cross midnight are counted as two separate days.

## Troubleshooting

| Symptom | Fix |
|---|---|
| Server icon has a red cross | Check Wi-Fi gateway/DNS (step 1.4). Test the `/iclock/cdata?SN=test` URL from a phone on the same Wi-Fi. If there's no HTTPS option, use the relay. |
| Device never appears in HRMS | Wrong address/port, or the backend hasn't been redeployed. Check Render logs for `ADMS:` lines. |
| Device appears but punches don't count | Device not registered (yellow banner), or User ID not linked (see the mapping tab). |
| Times are off by 5h30m | Device time zone is wrong. Fix step 2, then **Pull logs**. |
| First punch after a quiet period is slow | Render's free tier sleeps after 15 minutes idle. The device keeps punches and retries, so nothing is lost. The device's own heartbeat normally keeps the service awake. |
| Was using eTimeTrackLite / another cloud | A device can push to only one ADMS server. Pointing it at HRMS stops it sending to the old software. |

## API reference (for developers)

Device endpoints (unauthenticated, plain text):
`GET /iclock/cdata` (handshake) · `POST /iclock/cdata?table=ATTLOG|OPERLOG` · `GET /iclock/getrequest`
(heartbeat + command queue) · `POST /iclock/devicecmd`.

Admin endpoints (`/api/v1/zkteco`, JWT): `GET/POST /devices`, `DELETE /devices/:id`,
`POST /devices/:id/commands {type: SYNC_ATTLOG|SYNC_USERS|INFO|REBOOT}`, `GET /raw-logs`,
`GET/PUT /pin-mappings`, `POST /reprocess`, `GET /server-info`.

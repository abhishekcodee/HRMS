# Payroll, payslip e-mails and the live Excel attendance link

## One-time setup (5 minutes)

1. **E-mail.** On the backend (Render → Environment) set:
   `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_FROM_ADDRESS`, `MAIL_FROM_NAME`.
   For Gmail/Google Workspace use `smtp.gmail.com`, port `587`, and an **App Password**
   (Google Account → Security → 2-Step Verification → App passwords). Until this is set, payslips are
   prepared but not delivered, and the Payroll page says so.
2. **Keep the scheduler awake (Render free tier only).** Set `PAYROLL_CRON_KEY` to a long random string and
   create a free job on cron-job.org (or similar) that opens
   `https://hrms-backend-dlez.onrender.com/api/v1/payroll-cron?key=YOUR_KEY` every 15 minutes.
   A paid Render instance or the biometric device's heartbeat also keeps it awake.
3. **Employee data.** Every employee needs a **monthly gross salary**, **e-mail**, joining date, and (for TDS)
   PAN. The Payroll page lists anyone who is missing something.
4. **Payroll → Run Payroll → Settings.** Choose:
   * Salary day (e.g. 1) and whether it pays the previous month
   * Weekly off (Sunday, optionally 2nd/4th Saturday)
   * Salary divisor (days in month / 30 / 26 / working days)
   * Whether a day with no punch and no approved leave counts as absent
   * Late-mark rule, overtime, Basic %, HRA %, Professional Tax state, PF/ESIC
   * Turn on **Generate payroll and e-mail payslips automatically**

## What happens every month (automatic mode)

| When | What |
|---|---|
| N days before salary day | Draft payroll is generated from attendance, approved leave and holidays. Admins get a notification to review it. |
| Salary day, at the chosen hour | Draft is refreshed with final attendance, approved and locked. Every employee gets an e-mail with their **PDF payslip** and **CL/PL balance** (entitled, availed, pending approval, balance). |
| Optional | Tick *Wait for my approval*: the e-mails go out only after an admin clicks **Approve & lock**. |

Payslips are never sent twice. **Resend payslip** in an employee's details re-sends one on purpose.
Employees also see all their payslips under **My Payslips**.

## How salary is calculated

* Each day of the month is classified: present, half day, paid leave (CL/PL/SL/…), leave without pay,
  absent, holiday, weekly off, or not yet joined / already left.
* **LOP days** = absent days + LWP days + ½ for each unpaid half day (+ late-mark penalty if enabled).
* **Paid days** = divisor − LOP days − days not employed. Each component is paid × paid days ÷ divisor.
* **Approved CL/PL are paid.** Leave without pay and unapproved absence are not.
* **PF**: 12% of Basic, capped at ₹15,000 wages unless you untick the limit. Under the new Labour Codes, if
  allowances exceed 50% of pay, the excess is added to the PF wage.
* **ESIC**: 0.75% employee / 3.25% employer when fixed gross ≤ ₹21,000.
* **Professional Tax**: built-in slabs for Maharashtra, Karnataka, West Bengal, Gujarat, Telangana,
  Andhra Pradesh, Assam, Madhya Pradesh and Goa. States without PT get none. Other states: add slabs
  under Payroll → Statutory.
* **TDS**: projected yearly income (new regime FY 2025-26 slabs, ₹75,000 standard deduction, no tax up to
  ₹12 lakh with marginal relief). Tax already deducted is subtracted and the rest is spread over the
  remaining months. Employees can be switched to the old regime with their declarations.
* **Loans/advances, reimbursements and arrears** are included automatically and settled when the run is approved.
* The **Details** button on every employee shows the day-by-day attendance and every formula used.

## Live attendance in Excel

**Attendance → Live attendance in Excel → Create Excel link.** The link always returns the latest data
(Summary, Daily register, In-Out times, Legend) using exactly the same rules as payroll.

* **Excel**: Data → Get Data → From Other Sources → From Web → paste the link → pick a sheet → Load.
  Use *Refresh All*, or set the query to refresh every 30 minutes and when the file opens.
* **Google Sheets**: `=IMPORTDATA("<link>.csv")`, or add `?sheet=daily` for the daily register.
* `?month=previous` or `?month=2026-10` picks another month.
* Anyone with the link can read attendance. Use **New link** to invalidate an old one.

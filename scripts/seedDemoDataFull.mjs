import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';

const DEMO_COMPANY_ID = 'c2000000-0000-0000-0000-000000000001';
const DEMO_ADMIN_USER_ID = 'd1000000-0000-0000-0000-000000000001';

export async function seedDemoData() {
  console.log('Fetching Render DB credentials...');
  const res = await fetch('https://api.render.com/v1/services/srv-dbi7mh1srm7s73dg5i50/env-vars', {
    headers: {
      'Authorization': 'Bearer rnd_AcnYM2SFCaTdUfH89jQVOgGoKdK2',
      'Accept': 'application/json'
    }
  });
  const envs = await res.json();
  const map = {};
  for (const item of envs) map[item.envVar.key] = item.envVar.value;

  const conn = await mysql.createConnection({
    host: map.DB_HOST,
    port: parseInt(map.DB_PORT || '4000', 10),
    user: map.DB_USER || map.DB_USERNAME,
    password: map.DB_PASSWORD,
    database: map.DB_NAME,
    ssl: { rejectUnauthorized: false }
  });

  console.log('Connected to TiDB. Resetting previous demo tenant data...');
  // Only delete records belonging to DEMO_COMPANY_ID (never touch production!)
  await conn.query('DELETE FROM payslips WHERE company_id = ?', [DEMO_COMPANY_ID]);
  await conn.query('DELETE FROM payroll_records WHERE user_id IN (SELECT id FROM users WHERE company_id = ?)', [DEMO_COMPANY_ID]);
  await conn.query('DELETE FROM payroll_runs WHERE company_id = ?', [DEMO_COMPANY_ID]);
  await conn.query('DELETE FROM attendance WHERE company_id = ?', [DEMO_COMPANY_ID]);
  await conn.query('DELETE FROM leave_requests WHERE company_id = ?', [DEMO_COMPANY_ID]);
  await conn.query('DELETE FROM leave_balances WHERE company_id = ?', [DEMO_COMPANY_ID]);
  await conn.query('DELETE FROM employee_profiles WHERE company_id = ?', [DEMO_COMPANY_ID]);
  await conn.query('DELETE FROM master_designations WHERE company_id = ?', [DEMO_COMPANY_ID]);
  await conn.query('DELETE FROM master_departments WHERE company_id = ?', [DEMO_COMPANY_ID]);
  await conn.query('DELETE FROM users WHERE company_id = ? AND id != ?', [DEMO_COMPANY_ID, DEMO_ADMIN_USER_ID]);

  console.log('1. Ensuring Demo Company...');
  await conn.query(`
    INSERT INTO companies (id, code, name, tagline, email, phone, status, logo_url, brand_color, secondary_brand_color, max_employees)
    VALUES (?, 'DEMO_CORP', 'Wokhman Demo Corp', 'Work Meets Human. (Live Interactive Demo)', 'demo@wokhman.com', '+1 (555) 019-DEMO', 'active', '/logo.png', '#4f46e5', '#0066ff', 50)
    ON DUPLICATE KEY UPDATE name = VALUES(name), tagline = VALUES(tagline), status = 'active', logo_url = '/logo.png'
  `, [DEMO_COMPANY_ID]);

  console.log('2. Ensuring Demo Administrator User...');
  const demoPasswordHash = await bcrypt.hash('Demo@12345', 10);
  await conn.query(`
    INSERT INTO users (id, company_id, employee_id, full_name, email, phone, password_hash, role, status, must_change_password)
    VALUES (?, ?, 'DEMO001', 'Demo Administrator', 'demo@wokhman.com', '+1 (555) 019-3366', ?, 'demo', 'active', 0)
    ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), role = 'demo', status = 'active', must_change_password = 0
  `, [DEMO_ADMIN_USER_ID, DEMO_COMPANY_ID, demoPasswordHash]);

  console.log('3. Seeding Master Departments...');
  const deptEngineering = 'dept-demo-001';
  const deptHR = 'dept-demo-002';
  const deptProduct = 'dept-demo-003';
  const deptMarketing = 'dept-demo-004';

  await conn.query(`
    INSERT INTO master_departments (id, company_id, name, code, description, head_name, created_at)
    VALUES 
      (?, ?, 'Demo Cloud Engineering', 'DEMO_ENG', 'Software engineering, cloud infrastructure, and QA', 'Alex Rivera', NOW()),
      (?, ?, 'Demo People Operations', 'DEMO_HR', 'People operations, talent acquisition, and culture', 'Sarah Jenkins', NOW()),
      (?, ?, 'Demo Product Design', 'DEMO_PRD', 'Product strategy, UX/UI design, and user research', 'David Chen', NOW()),
      (?, ?, 'Demo Growth Marketing', 'DEMO_MKT', 'Enterprise sales, brand strategy, and growth marketing', 'Emma Watson', NOW())
    ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description)
  `, [deptEngineering, DEMO_COMPANY_ID, deptHR, DEMO_COMPANY_ID, deptProduct, DEMO_COMPANY_ID, deptMarketing, DEMO_COMPANY_ID]);

  console.log('4. Seeding Master Designations...');
  await conn.query(`
    INSERT INTO master_designations (id, company_id, name, department_id, department_name, created_at)
    VALUES
      ('desg-demo-001', ?, 'Senior Full-Stack Engineer', ?, 'Demo Cloud Engineering', NOW()),
      ('desg-demo-002', ?, 'Cloud DevOps Architect', ?, 'Demo Cloud Engineering', NOW()),
      ('desg-demo-003', ?, 'HR Business Partner', ?, 'Demo People Operations', NOW()),
      ('desg-demo-004', ?, 'Lead UI/UX Designer', ?, 'Demo Product Design', NOW()),
      ('desg-demo-005', ?, 'Product Manager', ?, 'Demo Product Design', NOW()),
      ('desg-demo-006', ?, 'Growth Marketing Specialist', ?, 'Demo Growth Marketing', NOW())
    ON DUPLICATE KEY UPDATE name = VALUES(name)
  `, [DEMO_COMPANY_ID, deptEngineering, DEMO_COMPANY_ID, deptEngineering, DEMO_COMPANY_ID, deptHR, DEMO_COMPANY_ID, deptProduct, DEMO_COMPANY_ID, deptProduct, DEMO_COMPANY_ID, deptMarketing]);

  console.log('5. Seeding Demo Employees...');
  const employees = [
    {
      userId: 'u-demo-emp-001',
      empId: 'WOK-101',
      name: 'Alex Rivera',
      email: 'alex.rivera@wokhman-demo.com',
      phone: '+1 (555) 234-5671',
      dept: 'Engineering',
      desg: 'Senior Full-Stack Engineer',
      salary: 115000,
      joining: '2023-03-15',
      gender: 'Male',
      city: 'San Francisco',
      status: 'active'
    },
    {
      userId: 'u-demo-emp-002',
      empId: 'WOK-102',
      name: 'Sarah Jenkins',
      email: 'sarah.jenkins@wokhman-demo.com',
      phone: '+1 (555) 345-6782',
      dept: 'Human Resources',
      desg: 'HR Business Partner',
      salary: 92000,
      joining: '2022-07-01',
      gender: 'Female',
      city: 'Austin',
      status: 'active'
    },
    {
      userId: 'u-demo-emp-003',
      empId: 'WOK-103',
      name: 'David Chen',
      email: 'david.chen@wokhman-demo.com',
      phone: '+1 (555) 456-7893',
      dept: 'Product & Design',
      desg: 'Lead UI/UX Designer',
      salary: 108000,
      joining: '2023-01-10',
      gender: 'Male',
      city: 'Seattle',
      status: 'active'
    },
    {
      userId: 'u-demo-emp-004',
      empId: 'WOK-104',
      name: 'Priya Sharma',
      email: 'priya.sharma@wokhman-demo.com',
      phone: '+1 (555) 567-8904',
      dept: 'Engineering',
      desg: 'Cloud DevOps Architect',
      salary: 125000,
      joining: '2022-11-20',
      gender: 'Female',
      city: 'New York',
      status: 'active'
    },
    {
      userId: 'u-demo-emp-005',
      empId: 'WOK-105',
      name: 'Marcus Brody',
      email: 'marcus.brody@wokhman-demo.com',
      phone: '+1 (555) 678-9015',
      dept: 'Product & Design',
      desg: 'Product Manager',
      salary: 110000,
      joining: '2023-05-02',
      gender: 'Male',
      city: 'Chicago',
      status: 'active'
    },
    {
      userId: 'u-demo-emp-006',
      empId: 'WOK-106',
      name: 'Elena Rostova',
      email: 'elena.rostova@wokhman-demo.com',
      phone: '+1 (555) 789-0126',
      dept: 'Sales & Marketing',
      desg: 'Growth Marketing Specialist',
      salary: 88000,
      joining: '2023-08-14',
      gender: 'Female',
      city: 'Boston',
      status: 'active'
    }
  ];

  for (const emp of employees) {
    await conn.query(`
      INSERT INTO users (id, company_id, employee_id, full_name, email, phone, password_hash, role, status, must_change_password)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'employee', 'active', 0)
    `, [emp.userId, DEMO_COMPANY_ID, emp.empId, emp.name, emp.email, emp.phone, demoPasswordHash]);

    await conn.query(`
      INSERT INTO employee_profiles (id, company_id, user_id, department_name, designation, joining_date, salary, branch_name, shift_name, employment_type, gender, city, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'Global Headquarters', 'Day Shift (9AM - 6PM)', 'full-time', ?, ?, NOW())
    `, [`prof-${emp.userId}`, DEMO_COMPANY_ID, emp.userId, emp.dept, emp.desg, emp.joining, emp.salary, emp.gender, emp.city]);

    // Leave Balances
    await conn.query(`
      INSERT INTO leave_balances (id, company_id, user_id, leave_type, allocated_days, used_days, leave_year, created_at, updated_at)
      VALUES 
        (?, ?, ?, 'Casual Leave', 12.00, 2.00, 2026, NOW(), NOW()),
        (?, ?, ?, 'Privilege Leave', 18.00, 4.00, 2026, NOW(), NOW()),
        (?, ?, ?, 'Sick Leave', 10.00, 1.00, 2026, NOW(), NOW())
    `, [
      `lb-cl-${emp.userId}`, DEMO_COMPANY_ID, emp.userId,
      `lb-pl-${emp.userId}`, DEMO_COMPANY_ID, emp.userId,
      `lb-sl-${emp.userId}`, DEMO_COMPANY_ID, emp.userId
    ]);
  }

  console.log('6. Seeding Attendance for Today...');
  const todayStr = new Date().toISOString().split('T')[0];
  const attendanceData = [
    { userId: 'u-demo-emp-001', clockIn: '09:02', clockOut: '18:05', hours: 8.5, status: 'present', late: 2 },
    { userId: 'u-demo-emp-002', clockIn: '08:55', clockOut: '17:58', hours: 8.5, status: 'present', late: 0 },
    { userId: 'u-demo-emp-003', clockIn: '09:28', clockOut: '18:15', hours: 8.0, status: 'present', late: 28 },
    { userId: 'u-demo-emp-004', clockIn: '09:00', clockOut: null, hours: 4.5, status: 'present', late: 0 },
    { userId: 'u-demo-emp-005', clockIn: null, clockOut: null, hours: 0, status: 'on_leave', late: 0 },
    { userId: 'u-demo-emp-006', clockIn: '08:50', clockOut: '18:00', hours: 8.6, status: 'present', late: 0 },
  ];

  for (const att of attendanceData) {
    await conn.query(`
      INSERT INTO attendance (id, company_id, user_id, work_date, clock_in, clock_out, work_hours, status, late_minutes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `, [`att-${att.userId}-${todayStr}`, DEMO_COMPANY_ID, att.userId, todayStr, att.clockIn, att.clockOut, att.hours, att.status, att.late]);
  }

  console.log('7. Seeding Sample Leave Requests...');
  await conn.query(`
    INSERT INTO leave_requests (id, company_id, user_id, leave_type, start_date, end_date, days_count, reason, status, created_at, employer_status, admin_status)
    VALUES 
      ('lr-demo-001', ?, 'u-demo-emp-005', 'Casual Leave', ?, ?, 1, 'Attending family celebration', 'approved', NOW(), 'approved', 'approved'),
      ('lr-demo-002', ?, 'u-demo-emp-003', 'Privilege Leave', '2026-11-15', '2026-11-17', 3, 'Annual vacation travel', 'pending', NOW(), 'pending', 'pending')
  `, [DEMO_COMPANY_ID, todayStr, todayStr, DEMO_COMPANY_ID]);

  console.log('8. Seeding Demo Payroll Run and Payslips...');
  const payrollRunId = 'pr-demo-2026-10';
  await conn.query(`
    INSERT INTO payroll_runs (id, company_id, payroll_month, payroll_year, financial_year, pay_period_start, pay_period_end, status, payable_days_policy, total_employees, total_gross, total_deductions, total_net, total_employer_cost, created_at, updated_at)
    VALUES (?, ?, 10, 2026, '2026-2027', '2026-10-01', '2026-10-31', 'completed', 'calendar_days', 6, 53800.00, 6800.00, 47000.00, 58200.00, NOW(), NOW())
  `, [payrollRunId, DEMO_COMPANY_ID]);

  await conn.query(`
    INSERT INTO payroll_records (id, user_id, pay_period, basic_salary, allowances, deductions, net_salary, status, disbursed_at, created_at)
    VALUES
      ('prec-001', 'u-demo-emp-001', '2026-10', 5500.00, 4083.33, 1210.00, 8373.33, 'disbursed', NOW(), NOW()),
      ('prec-002', 'u-demo-emp-002', '2026-10', 4400.00, 3266.67, 968.00, 6698.67, 'disbursed', NOW(), NOW()),
      ('prec-003', 'u-demo-emp-003', '2026-10', 5200.00, 3800.00, 1144.00, 7856.00, 'disbursed', NOW(), NOW()),
      ('prec-004', 'u-demo-emp-004', '2026-10', 6000.00, 4416.67, 1320.00, 9096.67, 'disbursed', NOW(), NOW())
  `);

  console.log('✅ Demo tenant seed complete! 100% isolated to company ID', DEMO_COMPANY_ID);
  await conn.end();
}

if (process.argv[1]?.endsWith('seedDemoDataFull.mjs')) {
  seedDemoData().catch(console.error);
}

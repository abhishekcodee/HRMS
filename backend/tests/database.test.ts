import { describe, it, expect, beforeAll } from 'vitest';
import { db, checkDatabaseHealth } from '../src/database/index.js';
import {
  company,
  departments,
  teams,
  employees,
  biometricDevices,
  employeeBiometricMappings,
  attendanceRecords,
  leaveTypes,
  leaveBalances,
  payrollPeriods,
  payrollRuns,
  payrollItems,
  payslips,
} from '../src/database/schema/index.js';

describe('HRMS PostgreSQL Database Constraints & Schema Invariants', () => {
  let isDbAvailable = false;

  beforeAll(async () => {
    const health = await checkDatabaseHealth();
    isDbAvailable = health === 'CONNECTED';
  });

  it('1. Schema exports and table definitions should be correctly structured', () => {
    expect(company).toBeDefined();
    expect(departments).toBeDefined();
    expect(teams).toBeDefined();
    expect(employees).toBeDefined();
    expect(biometricDevices).toBeDefined();
    expect(employeeBiometricMappings).toBeDefined();
    expect(attendanceRecords).toBeDefined();
    expect(leaveTypes).toBeDefined();
    expect(leaveBalances).toBeDefined();
    expect(payrollPeriods).toBeDefined();
    expect(payrollRuns).toBeDefined();
    expect(payrollItems).toBeDefined();
    expect(payslips).toBeDefined();
  });

  it('2. [DB-CONNECTED] Duplicate department code within same company should violate unique constraint', async () => {
    if (!isDbAvailable) return;

    const [testComp] = await db.insert(company).values({
      name: 'Constraint Test Co',
      legalName: 'Constraint Test Pvt Ltd',
      code: 'TEST-CO-01',
      email: 'test@testco.com',
      phone: '+91-9999999999',
      address: 'Test Addr',
      city: 'Test City',
      state: 'Test State',
      country: 'India',
      pincode: '560001',
    }).returning();

    await db.insert(departments).values({
      companyId: testComp.id,
      name: 'Engineering',
      code: 'ENG',
    });

    // Second insertion with same companyId + code 'ENG' must throw unique constraint error
    await expect(
      db.insert(departments).values({
        companyId: testComp.id,
        name: 'Engineering Alternate',
        code: 'ENG',
      })
    ).rejects.toThrow();
  });

  it('3. [DB-CONNECTED] Duplicate employee code within same company should violate unique constraint', async () => {
    if (!isDbAvailable) return;

    const [testComp] = await db.insert(company).values({
      name: 'Emp Constraint Co',
      legalName: 'Emp Constraint Pvt Ltd',
      code: 'TEST-CO-02',
      email: 'emp@testco.com',
      phone: '+91-9999999998',
      address: 'Test Addr',
      city: 'Test City',
      state: 'Test State',
      country: 'India',
      pincode: '560001',
    }).returning();

    const [dept] = await db.insert(departments).values({
      companyId: testComp.id,
      name: 'HR Dept',
      code: 'HR-D',
    }).returning();

    const [team] = await db.insert(teams).values({
      departmentId: dept.id,
      name: 'Recruitment',
      code: 'REC-T',
    }).returning();

    await db.insert(employees).values({
      companyId: testComp.id,
      employeeCode: 'EMP-DUP-01',
      firstName: 'First',
      lastName: 'Last',
      workEmail: 'emp1@testco.com',
      phone: '+91-9876543210',
      joiningDate: '2026-01-01',
      departmentId: dept.id,
      teamId: team.id,
      designation: 'Developer',
    });

    await expect(
      db.insert(employees).values({
        companyId: testComp.id,
        employeeCode: 'EMP-DUP-01',
        firstName: 'Second',
        lastName: 'Person',
        workEmail: 'emp2@testco.com',
        phone: '+91-9876543211',
        joiningDate: '2026-01-01',
        departmentId: dept.id,
        teamId: team.id,
        designation: 'Designer',
      })
    ).rejects.toThrow();
  });

  it('4. [DB-CONNECTED] Duplicate attendance date for same employee should violate unique constraint', async () => {
    if (!isDbAvailable) return;

    const [testComp] = await db.insert(company).values({
      name: 'Att Constraint Co',
      legalName: 'Att Constraint Pvt Ltd',
      code: 'TEST-CO-03',
      email: 'att@testco.com',
      phone: '+91-9999999997',
      address: 'Test Addr',
      city: 'Test City',
      state: 'Test State',
      country: 'India',
      pincode: '560001',
    }).returning();

    const [dept] = await db.insert(departments).values({
      companyId: testComp.id,
      name: 'Ops Dept',
      code: 'OPS-D',
    }).returning();

    const [team] = await db.insert(teams).values({
      departmentId: dept.id,
      name: 'Ops Team',
      code: 'OPS-T',
    }).returning();

    const [emp] = await db.insert(employees).values({
      companyId: testComp.id,
      employeeCode: 'EMP-ATT-01',
      firstName: 'Attendance',
      lastName: 'Tester',
      workEmail: 'att1@testco.com',
      phone: '+91-9876543212',
      joiningDate: '2026-01-01',
      departmentId: dept.id,
      teamId: team.id,
      designation: 'Ops Executive',
    }).returning();

    await db.insert(attendanceRecords).values({
      employeeId: emp.id,
      attendanceDate: '2026-08-11',
      status: 'PRESENT',
    });

    await expect(
      db.insert(attendanceRecords).values({
        employeeId: emp.id,
        attendanceDate: '2026-08-11',
        status: 'LATE',
      })
    ).rejects.toThrow();
  });
});

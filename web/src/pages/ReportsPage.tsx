import React, { useState, useEffect } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardBody,
  Button,
  Select,
  SearchInput,
  Badge,
  TableContainer,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Alert,
  StatCard,
  Pagination,
} from '../components/ui';
import {
  ResponsiveLineChart,
  ResponsiveBarChart,
  ResponsiveDonutChart,
  RecruitmentFunnelChart,
} from '../components/analytics/AnalyticsCharts';
import {
  fetchReportsOverview,
  fetchHeadcountAnalytics,
  fetchNewHiresAnalytics,
  fetchAttritionAnalytics,
  fetchAbsenteeismAnalytics,
  fetchDepartmentAnalytics,
  fetchDiversityAnalytics,
  fetchPayrollAnalytics,
  fetchLeaveAnalytics,
  fetchRecruitmentAnalytics,
  fetchDetailedReport,
  OverviewKpiData,
  ReportsFilterParams,
} from '../services/reportsApi';
import {
  BarChart3,
  Download,
  Users,
  UserPlus,
  UserX,
  Clock,
  DollarSign,
  FileText,
  RotateCcw,
  RefreshCw,
  FileSpreadsheet,
  Printer,
  Filter,
  CheckCircle2,
  Building2,
  PieChart,
  Briefcase,
} from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState<{ variant: 'success' | 'error'; text: string } | null>(null);

  // Filter State
  const [datePreset, setDatePreset] = useState('THIS_MONTH');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [department, setDepartment] = useState('ALL');
  const [designation, setDesignation] = useState('ALL');
  const [locationFilter, setLocationFilter] = useState('ALL');
  const [employmentType, setEmploymentType] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [genderFilter, setGenderFilter] = useState('ALL');

  // Analytics Data State
  const [overview, setOverview] = useState<OverviewKpiData | null>(null);
  const [headcountData, setHeadcountData] = useState<{ trend: any[]; departments: any[] }>({ trend: [], departments: [] });
  const [newHiresData, setNewHiresData] = useState<{ byDepartment: any[]; byEmploymentType: any[] }>({ byDepartment: [], byEmploymentType: [] });
  const [attritionData, setAttritionData] = useState<{ totalLeft: number; byDepartment: any[]; exitReasons: any[] }>({ totalLeft: 0, byDepartment: [], exitReasons: [] });
  const [absenteeismData, setAbsenteeismData] = useState<{ byDepartment: any[] }>({ byDepartment: [] });
  const [deptAnalytics, setDeptAnalytics] = useState<any[]>([]);
  const [diversityData, setDiversityData] = useState<{ total: number; distribution: any[] }>({ total: 0, distribution: [] });
  const [payrollData, setPayrollData] = useState<{ totalPayrollCost: number; avgPayrollCostPerEmployee: number; byDepartment: any[] }>({ totalPayrollCost: 0, avgPayrollCostPerEmployee: 0, byDepartment: [] });
  const [leaveData, setLeaveData] = useState<{ byType: any[] }>({ byType: [] });
  const [recruitmentData, setRecruitmentData] = useState<{ funnel: any[]; conversionRate: string; avgTimeToHireDays: number }>({ funnel: [], conversionRate: '0%', avgTimeToHireDays: 0 });

  // Detailed Report Table State
  const [reportTab, setReportTab] = useState<'employee' | 'attendance' | 'leave' | 'payroll' | 'pf' | 'esic' | 'pt' | 'tds' | 'bank' | 'ff'>('employee');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [reportRows, setReportRows] = useState<any[]>([]);
  const [reportMeta, setReportMeta] = useState<{ page: number; limit: number; total: number; totalPages: number }>({ page: 1, limit: 15, total: 0, totalPages: 0 });

  const showToast = (variant: 'success' | 'error', text: string) => {
    setToast({ variant, text });
    setTimeout(() => setToast(null), 4000);
  };

  // Date Preset Calculation
  const applyPresetDates = (preset: string) => {
    const today = new Date();
    const formatDate = (d: Date) => d.toISOString().split('T')[0];

    if (preset === 'TODAY') {
      setStartDate(formatDate(today));
      setEndDate(formatDate(today));
    } else if (preset === 'THIS_WEEK') {
      const first = today.getDate() - today.getDay();
      setStartDate(formatDate(new Date(today.setDate(first))));
      setEndDate(formatDate(new Date()));
    } else if (preset === 'THIS_MONTH') {
      setStartDate(formatDate(new Date(today.getFullYear(), today.getMonth(), 1)));
      setEndDate(formatDate(today));
    } else if (preset === 'LAST_MONTH') {
      setStartDate(formatDate(new Date(today.getFullYear(), today.getMonth() - 1, 1)));
      setEndDate(formatDate(new Date(today.getFullYear(), today.getMonth(), 0)));
    } else if (preset === 'THIS_YEAR') {
      setStartDate(formatDate(new Date(today.getFullYear(), 0, 1)));
      setEndDate(formatDate(today));
    }
  };

  useEffect(() => {
    applyPresetDates('THIS_MONTH');
  }, []);

  // Main Data Loader
  const loadAllAnalytics = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    const filterParams: ReportsFilterParams = {
      startDate,
      endDate,
      department,
      designation,
      location: locationFilter,
      employmentType,
      status: statusFilter,
      gender: genderFilter,
    };

    try {
      const [
        overviewRes,
        hcRes,
        nhRes,
        attRes,
        absRes,
        deptRes,
        divRes,
        payRes,
        lvRes,
        recRes,
      ] = await Promise.all([
        fetchReportsOverview(filterParams),
        fetchHeadcountAnalytics(filterParams),
        fetchNewHiresAnalytics(filterParams),
        fetchAttritionAnalytics(filterParams),
        fetchAbsenteeismAnalytics(filterParams),
        fetchDepartmentAnalytics(),
        fetchDiversityAnalytics(),
        fetchPayrollAnalytics(),
        fetchLeaveAnalytics(),
        fetchRecruitmentAnalytics(),
      ]);

      setOverview(overviewRes);
      setHeadcountData(hcRes);
      setNewHiresData(nhRes);
      setAttritionData(attRes);
      setAbsenteeismData(absRes);
      setDeptAnalytics(deptRes);
      setDiversityData(divRes);
      setPayrollData(payRes);
      setLeaveData(lvRes);
      setRecruitmentData(recRes);

      await loadDetailedReportData(1);
    } catch (err) {
      showToast('error', 'Failed to fetch analytics data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadDetailedReportData = async (page = 1) => {
    const res = await fetchDetailedReport({
      type: reportTab,
      page,
      limit: 15,
      search: searchQuery,
      department,
    });
    setReportRows(res.data || []);
    setReportMeta(res.meta || { page: 1, limit: 15, total: 0, totalPages: 0 });
    setCurrentPage(page);
  };

  useEffect(() => {
    loadAllAnalytics();
  }, [datePreset, department, designation, locationFilter, employmentType, statusFilter, genderFilter]);

  useEffect(() => {
    loadDetailedReportData(1);
  }, [reportTab, searchQuery]);

  const handleResetFilters = () => {
    setDatePreset('THIS_MONTH');
    applyPresetDates('THIS_MONTH');
    setDepartment('ALL');
    setDesignation('ALL');
    setLocationFilter('ALL');
    setEmploymentType('ALL');
    setStatusFilter('ALL');
    setGenderFilter('ALL');
    showToast('success', 'Analytics filters reset to default.');
  };

  // Export Table Data to CSV / Excel / Print
  const exportReport = (format: 'CSV' | 'EXCEL' | 'PRINT') => {
    if (reportRows.length === 0) {
      showToast('error', 'No records to export for the selected filter.');
      return;
    }

    if (format === 'PRINT') {
      window.print();
      return;
    }

    const headers = Object.keys(reportRows[0]);
    const csvRows = [headers.join(',')];
    for (const row of reportRows) {
      const values = headers.map((h) => `"${String(row[h] || '').replace(/"/g, '""')}"`);
      csvRows.push(values.join(','));
    }

    const blob = new Blob([csvRows.join('\n')], { type: format === 'EXCEL' ? 'application/vnd.ms-excel' : 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `HRMS_${String(reportTab || 'Data').toUpperCase()}_Report_${new Date().toISOString().split('T')[0]}.${format === 'EXCEL' ? 'xls' : 'csv'}`;
    link.click();
    showToast('success', `Exported ${reportRows.length} ${reportTab} report records successfully.`);
  };

  const deptOptions = [
    { value: 'ALL', label: 'All Departments' },
    ...deptAnalytics.map((d) => ({ value: d.departmentName, label: d.departmentName })),
  ];

  return (
    <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Toast Notification */}
      {toast && <Alert variant={toast.variant}>{toast.text}</Alert>}

      {/* Header Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.625rem', fontWeight: 700, margin: 0, color: 'var(--text-color, #f8fafc)', display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <BarChart3 size={28} color="var(--primary-color, #6366f1)" /> HR Reports & Analytics
          </h1>
          <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-muted, #94a3b8)', fontSize: '0.875rem' }}>
            Real-time organizational intelligence, headcount metrics, payroll analytics, and leave insights.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Button variant="outline" onClick={() => loadAllAnalytics(true)} disabled={refreshing}>
            <RefreshCw size={16} className={refreshing ? 'spin' : ''} /> {refreshing ? 'Refreshing...' : 'Refresh Data'}
          </Button>
        </div>
      </div>

      {/* Filter Control Panel */}
      <Card style={{ background: 'var(--card-bg, #1e293b)' }}>
        <CardBody style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, fontSize: '0.925rem' }}>
            <Filter size={18} color="var(--primary-color, #6366f1)" /> Analytics Filter Controls
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
            <div>
              <Select
                label="Date Range Preset"
                value={datePreset}
                onChange={(e) => { setDatePreset(e.target.value); applyPresetDates(e.target.value); }}
                options={[
                  { value: 'TODAY', label: 'Today' },
                  { value: 'THIS_WEEK', label: 'This Week' },
                  { value: 'THIS_MONTH', label: 'This Month' },
                  { value: 'LAST_MONTH', label: 'Last Month' },
                  { value: 'THIS_YEAR', label: 'This Year' },
                ]}
              />
            </div>

            <div>
              <Select
                label="Department"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                options={deptOptions}
              />
            </div>

            <div>
              <Select
                label="Employment Type"
                value={employmentType}
                onChange={(e) => setEmploymentType(e.target.value)}
                options={[
                  { value: 'ALL', label: 'All Types' },
                  { value: 'Full-Time Permanent', label: 'Full-Time Permanent' },
                  { value: 'Probationary Employee', label: 'Probationary Employee' },
                  { value: 'Contractual Specialist', label: 'Contractual Specialist' },
                  { value: 'Internship', label: 'Internship' },
                ]}
              />
            </div>

            <div>
              <Select
                label="Employee Status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                options={[
                  { value: 'ALL', label: 'All Statuses' },
                  { value: 'ACTIVE', label: 'Active' },
                  { value: 'INACTIVE', label: 'Inactive' },
                ]}
              />
            </div>

            <div>
              <Select
                label="Gender"
                value={genderFilter}
                onChange={(e) => setGenderFilter(e.target.value)}
                options={[
                  { value: 'ALL', label: 'All Genders' },
                  { value: 'Male', label: 'Male' },
                  { value: 'Female', label: 'Female' },
                ]}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <Button variant="outline" size="sm" onClick={handleResetFilters}>
              <RotateCcw size={14} /> Reset Filters
            </Button>
            <Button variant="primary" size="sm" onClick={() => loadAllAnalytics()}>
              <Filter size={14} /> Apply Filters
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* KPI Cards Overview */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        <StatCard
          title="Total Headcount"
          value={overview ? String(overview.totalEmployees) : '0'}
          subtext={`${overview?.activeEmployees || 0} Active • ${overview?.inactiveEmployees || 0} Inactive`}
          icon={<Users size={22} color="#6366f1" />}
        />
        <StatCard
          title="New Hires"
          value={overview ? String(overview.newHires) : '0'}
          subtext={overview?.newHiresTrendPct || 'In the selected period'}
          icon={<UserPlus size={22} color="#10b981" />}
        />
        <StatCard
          title="Attrition Rate"
          value={overview ? overview.attritionRate : '0%'}
          subtext={`${overview?.attritionCount || 0} Departures`}
          icon={<UserX size={22} color="#ef4444" />}
        />
        <StatCard
          title="Absenteeism Rate"
          value={overview ? overview.absenteeismRate : '0%'}
          subtext={`${overview?.totalAbsentDays || 0} Total Absent Days`}
          icon={<Clock size={22} color="#f59e0b" />}
        />
        <StatCard
          title="Monthly Payroll Cost"
          value={overview ? `₹${(overview.totalPayrollCost / 100000).toFixed(2)} L` : '₹0'}
          subtext={`Avg: ₹${overview?.avgPayrollCost?.toLocaleString() || 0} / emp`}
          icon={<DollarSign size={22} color="#8b5cf6" />}
        />
        <StatCard
          title="Total Overtime"
          value={overview ? `${overview.totalOvertimeHours} hrs` : '0 hrs'}
          subtext={`Est Cost: ₹${overview?.totalOvertimeCost?.toLocaleString() || 0}`}
          icon={<Clock size={22} color="#06b6d4" />}
        />
        <StatCard
          title="Leave Utilization"
          value={overview ? overview.leaveUtilizationPct : '0%'}
          subtext={`${overview?.leaveUtilizedDays || 0} / ${overview?.leaveAllocatedDays || 0} Days`}
          icon={<CheckCircle2 size={22} color="#ec4899" />}
        />
      </div>

      {/* Interactive Analytics Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
        {/* Headcount Trend Line Chart */}
        <Card style={{ background: 'var(--card-bg, #1e293b)' }}>
          <CardHeader>
            <CardTitle style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Users size={18} color="#6366f1" /> Monthly Headcount Growth
            </CardTitle>
          </CardHeader>
          <CardBody>
            <ResponsiveLineChart
              data={headcountData.trend.map((t) => ({ label: t.month, value: t.count }))}
              height={220}
              color="#6366f1"
            />
          </CardBody>
        </Card>

        {/* Department Headcount Bar Chart */}
        <Card style={{ background: 'var(--card-bg, #1e293b)' }}>
          <CardHeader>
            <CardTitle style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Building2 size={18} color="#10b981" /> Headcount by Department
            </CardTitle>
          </CardHeader>
          <CardBody>
            <ResponsiveBarChart
              data={headcountData.departments.map((d) => ({ label: d.department, value: d.count }))}
              barColor="#10b981"
            />
          </CardBody>
        </Card>

        {/* Leave Utilization Donut Chart */}
        <Card style={{ background: 'var(--card-bg, #1e293b)' }}>
          <CardHeader>
            <CardTitle style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <PieChart size={18} color="#ec4899" /> Leave Distribution by Type
            </CardTitle>
          </CardHeader>
          <CardBody>
            <ResponsiveDonutChart
              data={leaveData.byType.map((lt) => ({ label: `${lt.leaveType} Leave`, value: lt.used }))}
            />
          </CardBody>
        </Card>

        {/* Recruitment Funnel Chart */}
        <Card style={{ background: 'var(--card-bg, #1e293b)' }}>
          <CardHeader>
            <CardTitle style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Briefcase size={18} color="#8b5cf6" /> Recruitment Pipeline Funnel
            </CardTitle>
          </CardHeader>
          <CardBody>
            <RecruitmentFunnelChart stages={recruitmentData.funnel} />
          </CardBody>
        </Card>
      </div>

      {/* Detailed Reports Section */}
      <Card style={{ background: 'var(--card-bg, #1e293b)' }}>
        <CardHeader style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <CardTitle style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileText size={20} color="var(--primary-color, #6366f1)" /> Detailed HR Reports
          </CardTitle>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Button variant="outline" size="sm" onClick={() => exportReport('CSV')}>
              <Download size={14} /> CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportReport('EXCEL')}>
              <FileSpreadsheet size={14} /> Excel
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportReport('PRINT')}>
              <Printer size={14} /> Print
            </Button>
          </div>
        </CardHeader>

        <CardBody style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Report Type Tabs */}
          <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.5rem', overflowX: 'auto' }}>
            {[
              { id: 'employee', label: 'Employee Report' },
              { id: 'attendance', label: 'Attendance Report' },
              { id: 'leave', label: 'Leave Report' },
              { id: 'payroll', label: 'Payroll Report' },
            ].map((t) => (
              <Button
                key={t.id}
                variant={reportTab === t.id ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setReportTab(t.id as any)}
              >
                {t.label}
              </Button>
            ))}
          </div>

          {/* Table Controls */}
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
            <div style={{ width: 280 }}>
              <SearchInput
                placeholder={`Search ${reportTab} report...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div style={{ fontSize: '0.85rem', color: '#94a3b8', alignSelf: 'center' }}>
              Showing {reportRows.length} of {reportMeta.total} records
            </div>
          </div>

          {/* Table Data */}
          <TableContainer style={{ borderRadius: 8 }}>
            <Table>
              <Thead>
                <Tr>
                  {reportTab === 'employee' && (
                    <>
                      <Th>Employee ID</Th>
                      <Th>Name</Th>
                      <Th>Department</Th>
                      <Th>Designation</Th>
                      <Th>Location</Th>
                      <Th>Joining Date</Th>
                      <Th>Status</Th>
                    </>
                  )}
                  {reportTab === 'attendance' && (
                    <>
                      <Th>Employee ID</Th>
                      <Th>Name</Th>
                      <Th>Department</Th>
                      <Th>Work Date</Th>
                      <Th>Clock In</Th>
                      <Th>Clock Out</Th>
                      <Th>Hours</Th>
                      <Th>Status</Th>
                    </>
                  )}
                  {reportTab === 'leave' && (
                    <>
                      <Th>Employee ID</Th>
                      <Th>Name</Th>
                      <Th>Department</Th>
                      <Th>Type</Th>
                      <Th>From Date</Th>
                      <Th>To Date</Th>
                      <Th>Days</Th>
                      <Th>Status</Th>
                    </>
                  )}
                  {reportTab === 'payroll' && (
                    <>
                      <Th>Employee ID</Th>
                      <Th>Name</Th>
                      <Th>Department</Th>
                      <Th>Designation</Th>
                      <Th>Gross Salary</Th>
                      <Th>Net Salary</Th>
                      <Th>PF Deduction</Th>
                    </>
                  )}
                </Tr>
              </Thead>
              <Tbody>
                {reportRows.length === 0 ? (
                  <Tr>
                    <Td colSpan={8} style={{ textAlign: 'center', padding: '2.5rem', color: '#94a3b8' }}>
                      No {reportTab} records found for the selected period or filters.
                    </Td>
                  </Tr>
                ) : (
                  reportRows.map((row, idx) => (
                    <Tr key={idx}>
                      {reportTab === 'employee' && (
                        <>
                          <Td style={{ fontWeight: 600, color: 'var(--primary-color, #6366f1)' }}>{row.employeeId}</Td>
                          <Td style={{ fontWeight: 500 }}>{row.fullName}</Td>
                          <Td>{row.department}</Td>
                          <Td>{row.designation}</Td>
                          <Td>{row.location}</Td>
                          <Td>{row.joiningDate}</Td>
                          <Td>
                            <Badge variant={row.status === 'active' ? 'success' : 'error'}>
                              {String(row.status || 'ACTIVE').toUpperCase()}
                            </Badge>
                          </Td>
                        </>
                      )}
                      {reportTab === 'attendance' && (
                        <>
                          <Td style={{ fontWeight: 600 }}>{row.employeeId}</Td>
                          <Td>{row.fullName}</Td>
                          <Td>{row.department}</Td>
                          <Td>{row.workDate}</Td>
                          <Td>{row.clockIn || '--'}</Td>
                          <Td>{row.clockOut || '--'}</Td>
                          <Td>{row.workHours} hrs</Td>
                          <Td>
                            <Badge variant={row.status === 'PRESENT' ? 'success' : 'error'}>
                              {row.status}
                            </Badge>
                          </Td>
                        </>
                      )}
                      {reportTab === 'leave' && (
                        <>
                          <Td style={{ fontWeight: 600 }}>{row.employeeId}</Td>
                          <Td>{row.fullName}</Td>
                          <Td>{row.department}</Td>
                          <Td><Badge variant="info">{row.leaveType}</Badge></Td>
                          <Td>{row.startDate}</Td>
                          <Td>{row.endDate}</Td>
                          <Td>{row.daysCount} days</Td>
                          <Td>
                            <Badge variant={row.status === 'APPROVED' ? 'success' : row.status === 'REJECTED' ? 'error' : 'warning'}>
                              {row.status}
                            </Badge>
                          </Td>
                        </>
                      )}
                      {reportTab === 'payroll' && (
                        <>
                          <Td style={{ fontWeight: 600 }}>{row.employeeId}</Td>
                          <Td>{row.fullName}</Td>
                          <Td>{row.department}</Td>
                          <Td>{row.designation}</Td>
                          <Td style={{ fontWeight: 600 }}>₹{parseFloat(row.grossSalary || 0).toLocaleString()}</Td>
                          <Td style={{ color: '#10b981', fontWeight: 600 }}>₹{parseFloat(row.netSalary || 0).toLocaleString()}</Td>
                          <Td style={{ color: '#ef4444' }}>₹{parseFloat(row.providentFund || 0).toLocaleString()}</Td>
                        </>
                      )}
                    </Tr>
                  ))
                )}
              </Tbody>
            </Table>
          </TableContainer>

          {/* Pagination */}
          {reportMeta.totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={reportMeta.totalPages}
              totalItems={reportMeta.total}
              itemsPerPage={reportMeta.limit}
              onPageChange={(p) => loadDetailedReportData(p)}
            />
          )}
        </CardBody>
      </Card>
    </div>
  );
};

export default ReportsPage;

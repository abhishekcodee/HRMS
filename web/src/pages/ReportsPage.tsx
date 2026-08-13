import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardBody, Button, Modal, Select, DatePicker } from '../components/ui';
import { BarChart3, FileSpreadsheet, Download, CalendarDays, Users, FileCheck2 } from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const [selectedReport, setSelectedReport] = useState<string | null>(null);

  const reportCards = [
    {
      id: 'att-summary',
      category: 'Attendance',
      title: 'Monthly Biometric Attendance Summary',
      description: 'Comprehensive employee daily punch logs, tardiness, working hours, and overtime breakdown.',
      icon: <CalendarDays size={24} color="var(--primary-500)" />
    },
    {
      id: 'leave-ut',
      category: 'Leave',
      title: 'Annual Leave Utilization Report',
      description: 'Breakdown of Casual, Sick, and Earned Leave balances, approvals, and carryover credits.',
      icon: <FileCheck2 size={24} color="var(--warning-text)" />
    },
    {
      id: 'emp-census',
      category: 'Employee',
      title: 'Workforce Census & Demographic Report',
      description: 'Active headcount analysis, department distribution, team hierarchy, and tenure metrics.',
      icon: <Users size={24} color="var(--info-text)" />
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Executive Reports Catalog</h1>
          <p className="page-subtitle">Generate & export compliance analytics across 3 operational modules</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
        {reportCards.map(rpt => (
          <Card key={rpt.id}>
            <CardHeader>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-surface-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {rpt.icon}
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{rpt.category}</span>
                  <CardTitle>{rpt.title}</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardBody>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>{rpt.description}</p>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <Button variant="primary" size="sm" icon={<BarChart3 size={14} />} onClick={() => setSelectedReport(rpt.title)}>
                  Generate Report
                </Button>
                <Button variant="outline" size="sm" icon={<Download size={14} />} onClick={() => alert('Exporting PDF (UI Placeholder).')} />
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      {/* Generate Report Modal Placeholder */}
      {selectedReport && (
        <Modal isOpen={!!selectedReport} onClose={() => setSelectedReport(null)} title={`Generate: ${selectedReport}`}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <DatePicker label="Start Date *" value="2026-08-01" />
              <DatePicker label="End Date *" value="2026-08-31" />
            </div>
            <Select label="Export Format" options={[{ value: 'PDF', label: 'PDF Document' }, { value: 'CSV', label: 'CSV Spreadsheet' }]} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
              <Button variant="outline" onClick={() => setSelectedReport(null)}>Cancel</Button>
              <Button variant="primary" onClick={() => { setSelectedReport(null); alert('Report generated successfully (UI Placeholder).'); }}>
                Download Generated Report
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default ReportsPage;

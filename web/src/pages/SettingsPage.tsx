import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardBody, Tabs, Input, Select, Button, FormSection, Alert } from '../components/ui';
import { Building2, Settings, ShieldCheck, Bell, Lock, Save } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('company');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Admin System Settings</h1>
          <p className="page-subtitle">Configure single-company details, biometric rules, leave policies, and security</p>
        </div>
      </div>

      <Tabs
        tabs={[
          { id: 'company', label: 'Company Info', icon: <Building2 size={16} /> },
          { id: 'attendance', label: 'Attendance Rules' },
          { id: 'leave', label: 'Leave Policies' },
          { id: 'payroll', label: 'Payroll & Tax Setup' },
          { id: 'notifications', label: 'Notifications', icon: <Bell size={16} /> },
          { id: 'security', label: 'Security & Auth', icon: <Lock size={16} /> }
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      <Card>
        <CardBody>
          {activeTab === 'company' && (
            <FormSection title="Single-Company Identity" description="Company registered name, GST, and address details">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <Input label="Company Name *" defaultValue="Acme Enterprise Technologies Pvt Ltd" />
                <Input label="Company Code *" defaultValue="ACME-IN" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <Input label="GSTIN Registration" defaultValue="29AAAAA0000A1Z5" />
                <Input label="Corporate Email" defaultValue="hr@company.com" />
              </div>
              <Input label="Headquarters Address" defaultValue="42 MG Road, Koramangala, Bengaluru, Karnataka - 560034" />
            </FormSection>
          )}

          {activeTab === 'attendance' && (
            <FormSection title="Biometric Attendance Rules" description="Configure ZKTeco grace periods and shift timings">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <Input label="Standard Shift Start Time" defaultValue="09:00 AM" />
                <Input label="Late Grace Period (Minutes)" defaultValue="15" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <Input label="Minimum Hours for Full Day" defaultValue="8" />
                <Input label="Minimum Hours for Half Day" defaultValue="4" />
              </div>
            </FormSection>
          )}

          {activeTab === 'leave' && (
            <FormSection title="Annual Leave Allocation Rules" description="Standard annual leave credits per employee">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <Input label="Casual Leave (CL)" defaultValue="12" />
                <Input label="Sick Leave (SL)" defaultValue="7" />
                <Input label="Earned Leave (EL)" defaultValue="15" />
              </div>
            </FormSection>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
            <Button variant="primary" icon={<Save size={16} />} onClick={() => alert('Settings updated (UI Placeholder).')}>
              Save Settings
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
};

export default SettingsPage;

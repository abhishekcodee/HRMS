import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardBody, Tabs, Input, Select, Button, FormSection, Alert } from '../components/ui';
import { Building2, Settings, ShieldCheck, Bell, Lock, Save, CheckCircle2, DollarSign, Clock } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('company');
  const [isSaving, setIsSaving] = useState(false);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Form State initialized from localStorage or defaults
  const [settings, setSettings] = useState(() => {
    const cached = localStorage.getItem('hrms_app_settings');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (_) {}
    }
    return {
      // Company Info
      companyName: 'Acme Enterprise Technologies Pvt Ltd',
      companyCode: 'ACME-IN',
      gstin: '29AAAAA0000A1Z5',
      corporateEmail: 'hr@company.com',
      address: '42 MG Road, Koramangala, Bengaluru, Karnataka - 560034',
      
      // Attendance Rules
      shiftStart: '09:00 AM',
      gracePeriod: '15',
      fullDayHours: '8',
      halfDayHours: '4',

      // Leave Policies
      casualLeave: '12',
      sickLeave: '7',
      earnedLeave: '15',

      // Payroll & Tax
      pfRate: '12',
      esiRate: '0.75',
      taxYearStart: 'April',

      // Notifications
      emailAlerts: true,
      leaveAlerts: true,
      attendanceDigest: true,

      // Security
      forceFirstPasswordChange: true,
      sessionTimeout: '60',
    };
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccessBanner(null);

    setTimeout(() => {
      localStorage.setItem('hrms_app_settings', JSON.stringify(settings));
      setIsSaving(false);
      setSuccessBanner('System settings saved successfully! Configuration changes are now active.');
      setTimeout(() => setSuccessBanner(null), 4000);
    }, 600);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Admin System Settings</h1>
          <p className="page-subtitle">Configure single-company details, biometric rules, leave policies, and security</p>
        </div>
      </div>

      {successBanner && (
        <Alert variant="success" title="Settings Updated">
          {successBanner}
        </Alert>
      )}

      <Tabs
        tabs={[
          { id: 'company', label: 'Company Info', icon: <Building2 size={16} /> },
          { id: 'attendance', label: 'Attendance Rules', icon: <Clock size={16} /> },
          { id: 'leave', label: 'Leave Policies' },
          { id: 'notifications', label: 'Notifications', icon: <Bell size={16} /> },
          { id: 'security', label: 'Security & Auth', icon: <Lock size={16} /> }
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      <Card>
        <CardBody>
          <form onSubmit={handleSave}>
            {activeTab === 'company' && (
              <FormSection title="Single-Company Identity" description="Company registered name, GST, and address details">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                      Company Name *
                    </label>
                    <Input
                      value={settings.companyName}
                      onChange={e => setSettings({ ...settings, companyName: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                      Company Code *
                    </label>
                    <Input
                      value={settings.companyCode}
                      onChange={e => setSettings({ ...settings, companyCode: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                      GSTIN Registration
                    </label>
                    <Input
                      value={settings.gstin}
                      onChange={e => setSettings({ ...settings, gstin: e.target.value })}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                      Corporate Email
                    </label>
                    <Input
                      type="email"
                      value={settings.corporateEmail}
                      onChange={e => setSettings({ ...settings, corporateEmail: e.target.value })}
                    />
                  </div>
                </div>
                <div style={{ marginTop: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                    Headquarters Address
                  </label>
                  <Input
                    value={settings.address}
                    onChange={e => setSettings({ ...settings, address: e.target.value })}
                  />
                </div>
              </FormSection>
            )}

            {activeTab === 'attendance' && (
              <FormSection title="Biometric Attendance Rules" description="Configure ZKTeco grace periods and shift timings">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                      Standard Shift Start Time
                    </label>
                    <Input
                      value={settings.shiftStart}
                      onChange={e => setSettings({ ...settings, shiftStart: e.target.value })}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                      Late Grace Period (Minutes)
                    </label>
                    <Input
                      type="number"
                      value={settings.gracePeriod}
                      onChange={e => setSettings({ ...settings, gracePeriod: e.target.value })}
                    />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                      Minimum Hours for Full Day
                    </label>
                    <Input
                      type="number"
                      value={settings.fullDayHours}
                      onChange={e => setSettings({ ...settings, fullDayHours: e.target.value })}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                      Minimum Hours for Half Day
                    </label>
                    <Input
                      type="number"
                      value={settings.halfDayHours}
                      onChange={e => setSettings({ ...settings, halfDayHours: e.target.value })}
                    />
                  </div>
                </div>
              </FormSection>
            )}

            {activeTab === 'leave' && (
              <FormSection title="Annual Leave Allocation Rules" description="Standard annual leave credits per employee">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                      Casual Leave (CL)
                    </label>
                    <Input
                      type="number"
                      value={settings.casualLeave}
                      onChange={e => setSettings({ ...settings, casualLeave: e.target.value })}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                      Sick Leave (SL)
                    </label>
                    <Input
                      type="number"
                      value={settings.sickLeave}
                      onChange={e => setSettings({ ...settings, sickLeave: e.target.value })}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                      Earned Leave (EL)
                    </label>
                    <Input
                      type="number"
                      value={settings.earnedLeave}
                      onChange={e => setSettings({ ...settings, earnedLeave: e.target.value })}
                    />
                  </div>
                </div>
              </FormSection>
            )}



            {activeTab === 'notifications' && (
              <FormSection title="Notification Preferences" description="Configure automated email alerts and daily digests">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                    <input
                      type="checkbox"
                      checked={settings.emailAlerts}
                      onChange={e => setSettings({ ...settings, emailAlerts: e.target.checked })}
                    />
                    Enable System Email Alerts & Notifications
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                    <input
                      type="checkbox"
                      checked={settings.leaveAlerts}
                      onChange={e => setSettings({ ...settings, leaveAlerts: e.target.checked })}
                    />
                    Notify Admin/Employer on new Employee Leave Applications
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                    <input
                      type="checkbox"
                      checked={settings.attendanceDigest}
                      onChange={e => setSettings({ ...settings, attendanceDigest: e.target.checked })}
                    />
                    Daily Biometric Attendance Summary Digest
                  </label>
                </div>
              </FormSection>
            )}

            {activeTab === 'security' && (
              <FormSection title="Security & Authentication Controls" description="Configure password enforcement and session timeouts">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                    <input
                      type="checkbox"
                      checked={settings.forceFirstPasswordChange}
                      onChange={e => setSettings({ ...settings, forceFirstPasswordChange: e.target.checked })}
                    />
                    Force First-Time Login Password Change for New Employees
                  </label>
                  <div style={{ maxWidth: '300px' }}>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                      Inactivity Session Timeout (Minutes)
                    </label>
                    <Input
                      type="number"
                      value={settings.sessionTimeout}
                      onChange={e => setSettings({ ...settings, sessionTimeout: e.target.value })}
                    />
                  </div>
                </div>
              </FormSection>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <Button
                variant="primary"
                type="submit"
                disabled={isSaving}
                icon={isSaving ? undefined : <Save size={16} />}
              >
                {isSaving ? 'Saving Settings...' : 'Save Settings'}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
};

export default SettingsPage;

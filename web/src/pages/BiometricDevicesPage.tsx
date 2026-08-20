import React, { useState, useEffect } from 'react';
import {
  fetchBiometricDevices,
  registerBiometricDevice,
  fetchRawBiometricLogs,
  simulateBiometricPunch,
  testBiometricDeviceConnection,
  BiometricDeviceRecord,
  BiometricPunchLogRecord,
} from '../services/biometricApi';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardBody,
  StatCard,
  TableContainer,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Modal,
  Input,
  Alert
} from '../components/ui';
import { Cpu, Fingerprint, Plus, RefreshCw, Activity, HelpCircle, Wifi, ShieldAlert, Zap } from 'lucide-react';

export const BiometricDevicesPage: React.FC = () => {
  const [devices, setDevices] = useState<BiometricDeviceRecord[]>([]);
  const [rawLogs, setRawLogs] = useState<BiometricPunchLogRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'devices' | 'logs'>('devices');

  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [simulateModalOpen, setSimulateModalOpen] = useState(false);
  const [guideModalOpen, setGuideModalOpen] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [testingDeviceId, setTestingDeviceId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [deviceForm, setDeviceForm] = useState({
    deviceSn: '',
    deviceName: '',
    ipAddress: '192.168.1.200',
    port: 4370,
    location: 'Main Gate Reception',
  });

  const [simulateForm, setSimulateForm] = useState({
    employeeId: 'EMP001',
    deviceSn: '',
    verifyType: 'Fingerprint',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const devList = await fetchBiometricDevices();
      setDevices(devList);
      const logList = await fetchRawBiometricLogs();
      setRawLogs(logList);
    } catch (err) {
      console.error('Failed to load biometric data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000); // Auto-refresh live device status every 10s
    return () => clearInterval(interval);
  }, []);

  const handleRegisterDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);

    const res = await registerBiometricDevice(deviceForm);
    setSubmitting(false);

    if (res.success) {
      setToastMsg('eSSL Biometric Machine registered successfully!');
      setRegisterModalOpen(false);
      setDeviceForm({ deviceSn: '', deviceName: '', ipAddress: '192.168.1.200', port: 4370, location: 'Main Gate Reception' });
      await loadData();
      setTimeout(() => setToastMsg(null), 4000);
    } else {
      setErrorMsg(res.error || 'Failed to register device.');
    }
  };

  const handleSimulatePunch = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);

    const res = await simulateBiometricPunch(simulateForm);
    setSubmitting(false);

    if (res.success) {
      setToastMsg(res.message || 'Biometric scan simulated successfully!');
      setSimulateModalOpen(false);
      await loadData();
      setTimeout(() => setToastMsg(null), 4000);
    } else {
      setErrorMsg(res.error || 'Failed to simulate punch.');
    }
  };

  const handleTestSocket = async (device: BiometricDeviceRecord) => {
    setTestingDeviceId(device.id);
    setErrorMsg(null);
    setToastMsg(null);

    const res = await testBiometricDeviceConnection({
      ipAddress: device.ipAddress || '192.168.1.200',
      port: device.port || 4370,
      deviceSn: device.deviceSn,
    });

    setTestingDeviceId(null);

    if (res.success) {
      setToastMsg(`✅ ${res.message}`);
      await loadData();
      setTimeout(() => setToastMsg(null), 5000);
    } else {
      setErrorMsg(`❌ ${res.message}`);
    }
  };

  const onlineCount = devices.filter(d => d.status === 'ONLINE').length;
  const offlineCount = devices.length - onlineCount;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">eSSL Biometric Machine Control Center</h1>
          <p className="page-subtitle">
            Hardware ADMS Push Server • Live Biometric Punch Processing & Real-Time Machine Connectivity
          </p>
        </div>
        <div className="page-actions" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <Button variant="outline" icon={<HelpCircle size={16} />} onClick={() => setGuideModalOpen(true)}>
            Machine Setup Guide
          </Button>
          <Button variant="secondary" icon={<Fingerprint size={16} />} onClick={() => setSimulateModalOpen(true)}>
            Simulate Biometric Scan
          </Button>
          <Button variant="primary" icon={<Plus size={16} />} onClick={() => setRegisterModalOpen(true)}>
            + Register eSSL Machine
          </Button>
        </div>
      </div>

      {toastMsg && (
        <Alert variant="success" title="Action Completed">
          {toastMsg}
        </Alert>
      )}

      {errorMsg && (
        <Alert variant="error" title="Error Notification">
          {errorMsg}
        </Alert>
      )}

      {/* KPI Stats */}
      <div className="stat-grid">
        <StatCard
          title="Total Biometric Devices"
          value={`${devices.length}`}
          icon={<Cpu size={20} />}
          subtext="Configured Machines"
        />
        <StatCard
          title="Online Hardware Health"
          value={`${onlineCount}`}
          icon={<Wifi size={20} />}
          subtext="Active ADMS Push Connections"
        />
        <StatCard
          title="Offline Devices"
          value={`${offlineCount}`}
          icon={<ShieldAlert size={20} />}
          subtext="Requires Network Inspection"
        />
        <StatCard
          title="Biometric Punches Logged"
          value={`${rawLogs.length}`}
          icon={<Activity size={20} />}
          subtext="Real-Time Scans in Database"
        />
      </div>

      {/* View Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
        <button
          className={`btn ${activeTab === 'devices' ? 'btn-primary' : 'btn-ghost'} btn-sm`}
          onClick={() => setActiveTab('devices')}
        >
          eSSL Biometric Machines ({devices.length})
        </button>
        <button
          className={`btn ${activeTab === 'logs' ? 'btn-primary' : 'btn-ghost'} btn-sm`}
          onClick={() => setActiveTab('logs')}
        >
          Real-Time Raw Punch Stream ({rawLogs.length})
        </button>
        <Button variant="ghost" size="sm" icon={<RefreshCw size={14} />} onClick={loadData} style={{ marginLeft: 'auto' }}>
          Refresh Now
        </Button>
      </div>

      {activeTab === 'devices' && (
        <Card>
          <CardHeader>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <CardTitle>Configured eSSL & ZKTeco Hardware Terminal Network ({devices.length})</CardTitle>
            </div>
          </CardHeader>
          <CardBody>
            {loading ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Querying hardware connections...</div>
            ) : devices.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No biometric devices registered. Click "+ Register eSSL Machine" to add your hardware terminal.</div>
            ) : (
              <TableContainer>
                <Table>
                  <Thead>
                    <Tr>
                      <Th>Device Serial Number (SN)</Th>
                      <Th>Device Name</Th>
                      <Th>IP Address & Port</Th>
                      <Th>Location / Branch</Th>
                      <Th>Connection Status</Th>
                      <Th>Last Heartbeat Ping</Th>
                      <Th style={{ textAlign: 'right' }}>Hardware Socket Test</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {devices.map(dev => (
                      <Tr key={dev.id}>
                        <Td style={{ fontWeight: 700, fontFamily: 'monospace', color: 'var(--primary-500)' }}>{dev.deviceSn}</Td>
                        <Td style={{ fontWeight: 600 }}>{dev.deviceName}</Td>
                        <Td style={{ fontFamily: 'monospace' }}>{dev.ipAddress || '192.168.1.200'}:{dev.port || 4370}</Td>
                        <Td>{dev.location || 'Main Gate'}</Td>
                        <Td>
                          <Badge variant={dev.status === 'ONLINE' ? 'success' : 'error'}>
                            {dev.status === 'ONLINE' ? 'ONLINE (ADMS)' : 'OFFLINE'}
                          </Badge>
                        </Td>
                        <Td style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                          {dev.lastPingAt ? new Date(dev.lastPingAt).toLocaleString() : 'Just Now'}
                        </Td>
                        <Td style={{ textAlign: 'right' }}>
                          <Button
                            size="sm"
                            variant="outline"
                            icon={<Zap size={14} />}
                            isLoading={testingDeviceId === dev.id}
                            onClick={() => handleTestSocket(dev)}
                          >
                            Test TCP Ping (4370)
                          </Button>
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </TableContainer>
            )}
          </CardBody>
        </Card>
      )}

      {activeTab === 'logs' && (
        <Card>
          <CardHeader>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <CardTitle>Live Raw Biometric Punch Log Feed ({rawLogs.length})</CardTitle>
            </div>
          </CardHeader>
          <CardBody>
            <TableContainer>
              <Table>
                <Thead>
                  <Tr>
                    <Th>Punch Time</Th>
                    <Th>Employee ID</Th>
                    <Th>Employee Name</Th>
                    <Th>Device Serial No</Th>
                    <Th>Scan Mode</Th>
                    <Th>State</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {rawLogs.map(log => (
                    <Tr key={log.id}>
                      <Td style={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}>{new Date(log.punchTime).toLocaleString()}</Td>
                      <Td style={{ fontWeight: 700, fontFamily: 'monospace' }}>{log.employeeId}</Td>
                      <Td style={{ fontWeight: 600 }}>{log.employeeName || 'Matched Database User'}</Td>
                      <Td style={{ fontFamily: 'monospace', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{log.deviceSn}</Td>
                      <Td><Badge variant="info">{log.verifyType || 'Fingerprint'}</Badge></Td>
                      <Td><Badge variant="success">{log.punchState === '0' ? 'Check-In' : 'Check-Out'}</Badge></Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </TableContainer>
          </CardBody>
        </Card>
      )}

      {/* Register Device Modal */}
      <Modal isOpen={registerModalOpen} onClose={() => setRegisterModalOpen(false)} title="Register eSSL / ZKTeco Biometric Machine">
        <form onSubmit={handleRegisterDevice} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Input
            label="Device Serial Number (SN) *"
            required
            placeholder="e.g. ESSL-X990-BLR-01 or ZK20268892"
            value={deviceForm.deviceSn}
            onChange={e => setDeviceForm({ ...deviceForm, deviceSn: e.target.value })}
          />
          <Input
            label="Machine Name / Display Label *"
            required
            placeholder="e.g. Main Entrance eSSL X990 Biometric Scanner"
            value={deviceForm.deviceName}
            onChange={e => setDeviceForm({ ...deviceForm, deviceName: e.target.value })}
          />
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
            <Input
              label="Machine IP Address *"
              placeholder="192.168.1.200"
              value={deviceForm.ipAddress}
              onChange={e => setDeviceForm({ ...deviceForm, ipAddress: e.target.value })}
            />
            <Input
              label="Port *"
              type="number"
              value={deviceForm.port}
              onChange={e => setDeviceForm({ ...deviceForm, port: parseInt(e.target.value) || 4370 })}
            />
          </div>
          <Input
            label="Machine Installation Location *"
            placeholder="e.g. Bengaluru HQ Reception Gate 1"
            value={deviceForm.location}
            onChange={e => setDeviceForm({ ...deviceForm, location: e.target.value })}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
            <Button type="button" variant="outline" onClick={() => setRegisterModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" isLoading={submitting}>Register Hardware Terminal</Button>
          </div>
        </form>
      </Modal>

      {/* Simulate Punch Modal */}
      <Modal isOpen={simulateModalOpen} onClose={() => setSimulateModalOpen(false)} title="Simulate eSSL Biometric Fingerprint Scan">
        <form onSubmit={handleSimulatePunch} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Simulate a live fingerprint punch scan from your eSSL machine to verify instant attendance computation.
          </p>
          <Input
            label="Employee ID (Database Employee) *"
            required
            placeholder="e.g. EMP001"
            value={simulateForm.employeeId}
            onChange={e => setSimulateForm({ ...simulateForm, employeeId: e.target.value })}
          />
          <div className="form-group">
            <label className="form-label">Select eSSL Device *</label>
            <select
              className="select"
              value={simulateForm.deviceSn}
              onChange={e => setSimulateForm({ ...simulateForm, deviceSn: e.target.value })}
            >
              <option value="">Default (ESSL-X990-BLR-01)</option>
              {devices.map(d => (
                <option key={d.id} value={d.deviceSn}>{d.deviceName} ({d.deviceSn})</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Scan Verification Type *</label>
            <select
              className="select"
              value={simulateForm.verifyType}
              onChange={e => setSimulateForm({ ...simulateForm, verifyType: e.target.value })}
            >
              <option value="Fingerprint">Fingerprint Scan (eSSL Optical)</option>
              <option value="Face">Face Recognition (eSSL uFace/SilkBio)</option>
              <option value="Card">RFID Smart Card Punch</option>
              <option value="Pin">PIN / Password Entry</option>
            </select>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
            <Button type="button" variant="outline" onClick={() => setSimulateModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" isLoading={submitting} icon={<Fingerprint size={16} />}>
              Simulate Finger Scan Now
            </Button>
          </div>
        </form>
      </Modal>

      {/* eSSL Machine Configuration Guide Modal */}
      <Modal isOpen={guideModalOpen} onClose={() => setGuideModalOpen(false)} title="eSSL & ZKTeco Hardware Configuration Guide">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.875rem' }}>
          <Alert variant="info" title="How to connect your physical eSSL machine to this HRMS">
            Follow these step-by-step instructions on your physical eSSL machine keypad/screen (models: eSSL X990, K30, K40, MB20, uFace, Identix, SilkBio):
          </Alert>

          <div style={{ background: 'var(--bg-sidebar)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <h4 style={{ color: 'var(--primary-500)', margin: '0 0 0.5rem 0' }}>Step 1: Open Device Menu</h4>
            <p style={{ margin: 0 }}>Press <strong>M/OK</strong> on your eSSL machine keypad &rarr; Navigate to <strong>Comm. (Communication Settings)</strong> &rarr; Select <strong>ADMS / Cloud Server Settings</strong>.</p>
          </div>

          <div style={{ background: 'var(--bg-sidebar)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <h4 style={{ color: 'var(--primary-500)', margin: '0 0 0.5rem 0' }}>Step 2: Configure Server IP & Port</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontFamily: 'monospace', fontSize: '0.8125rem' }}>
              <div>• Enable Cloud Server / ADMS: <strong>ON</strong></div>
              <div>• Server Mode: <strong>ADMS / HTTP</strong></div>
              <div>• Server Address: <strong>{window.location.hostname || 'YOUR_SERVER_IP'}</strong></div>
              <div>• Server Port: <strong>4000</strong> (HRMS Backend Port)</div>
              <div>• Push URL / Path: <strong>/iclock/cdata.php</strong> (or <strong>/iclock/cdata.aspx</strong>)</div>
            </div>
          </div>

          <div style={{ background: 'var(--bg-sidebar)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <h4 style={{ color: 'var(--primary-500)', margin: '0 0 0.5rem 0' }}>Step 3: Save & Test Connection</h4>
            <p style={{ margin: 0 }}>Save settings and restart the machine. The eSSL device will immediately register itself in your HRMS dashboard and start streaming real-time biometric punches!</p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <Button variant="primary" onClick={() => setGuideModalOpen(false)}>Got It, Close Guide</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default BiometricDevicesPage;

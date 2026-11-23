import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  fetchBiometricDevices,
  fetchAdmsServerInfo,
  registerBiometricDevice,
  fetchRawBiometricLogs,
  fetchPinMappings,
  savePinMapping,
  queueDeviceCommand,
  reprocessPunches,
  simulateBiometricPunch,
  deleteBiometricDevice,
  formatDeviceTime,
  AdmsServerInfo,
  BiometricDeviceRecord,
  BiometricPunchLogRecord,
  MappingEmployee,
  PinMappingRecord,
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
  Alert,
} from '../components/ui';
import { Cpu, Fingerprint, Plus, RefreshCw, Activity, HelpCircle, Wifi, ShieldAlert, Trash2, Link2, DownloadCloud, Users } from 'lucide-react';

type Tab = 'devices' | 'mapping' | 'logs';

const codeStyle: React.CSSProperties = { fontFamily: 'monospace', fontWeight: 700 };

function timeAgo(value?: string | null): string {
  if (!value) return 'Never';
  const t = new Date(value).getTime();
  if (isNaN(t)) return String(value);
  const s = Math.max(0, Math.round((Date.now() - t) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  return new Date(value).toLocaleString();
}

export const BiometricDevicesPage: React.FC = () => {
  const [devices, setDevices] = useState<BiometricDeviceRecord[]>([]);
  const [rawLogs, setRawLogs] = useState<BiometricPunchLogRecord[]>([]);
  const [pins, setPins] = useState<PinMappingRecord[]>([]);
  const [employees, setEmployees] = useState<MappingEmployee[]>([]);
  const [server, setServer] = useState<AdmsServerInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('devices');

  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [simulateModalOpen, setSimulateModalOpen] = useState(false);
  const [guideModalOpen, setGuideModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [pinDrafts, setPinDrafts] = useState<Record<string, string>>({});

  const emptyDevice = { deviceSn: '', deviceName: 'eSSL AiFace Mars', ipAddress: '', port: 4370, location: 'Main Entrance' };
  const [deviceForm, setDeviceForm] = useState(emptyDevice);
  const [simulateForm, setSimulateForm] = useState({ employeeId: '', verifyType: 'Face' });

  const flash = (msg: string) => {
    setErrorMsg(null);
    setToastMsg(msg);
    setTimeout(() => setToastMsg((cur) => (cur === msg ? null : cur)), 5000);
  };

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [devList, logList, mapping] = await Promise.all([
        fetchBiometricDevices(),
        fetchRawBiometricLogs({ limit: 300 }).catch(() => []),
        fetchPinMappings().catch(() => ({ pins: [], employees: [] })),
      ]);
      setDevices(devList);
      setRawLogs(logList);
      setPins(mapping.pins);
      setEmployees(mapping.employees);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    fetchAdmsServerInfo().then(setServer);
    const interval = setInterval(() => loadData(true), 15000);
    return () => clearInterval(interval);
  }, [loadData]);

  const unregistered = devices.filter((d) => !d.registered);
  const onlineCount = devices.filter((d) => d.status === 'ONLINE').length;
  const unmatchedPins = pins.filter((p) => !p.userId);
  const unmappedEmployees = useMemo(() => {
    const mapped = new Set(pins.filter((p) => p.userId).map((p) => p.userId));
    return employees.filter((e) => !mapped.has(e.id));
  }, [pins, employees]);

  const handleRegisterDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const res = await registerBiometricDevice({ ...deviceForm, deviceSn: deviceForm.deviceSn.trim() });
    setSubmitting(false);
    if (res.success) {
      setRegisterModalOpen(false);
      setDeviceForm(emptyDevice);
      flash(res.message || 'Device registered.');
      await loadData(true);
    } else {
      setErrorMsg(res.error || 'Failed to register device.');
    }
  };

  const claimDevice = (dev: BiometricDeviceRecord) => {
    setDeviceForm({ ...emptyDevice, deviceSn: dev.deviceSn, ipAddress: dev.ipAddress || '' });
    setRegisterModalOpen(true);
  };

  const handleCommand = async (dev: BiometricDeviceRecord, type: 'SYNC_ATTLOG' | 'SYNC_USERS') => {
    setBusyKey(`${type}-${dev.id}`);
    const res = await queueDeviceCommand(dev.id, type);
    setBusyKey(null);
    if (res.success) {
      flash(type === 'SYNC_ATTLOG'
        ? `Requested the last 31 days of punches from ${dev.deviceName}. They will appear within a minute if the device is online.`
        : `Requested the user list from ${dev.deviceName}.`);
    } else {
      setErrorMsg(res.error || 'Failed to send command.');
    }
  };

  const handleSaveMapping = async (userId: string, pin: string) => {
    setBusyKey(`map-${userId}-${pin}`);
    const res = await savePinMapping(userId, pin);
    setBusyKey(null);
    if (res.success) {
      flash(res.message || 'Mapping saved.');
      setPinDrafts({});
      await loadData(true);
    } else {
      setErrorMsg(res.error || 'Failed to save mapping.');
    }
  };

  const handleReprocess = async () => {
    setBusyKey('reprocess');
    const res = await reprocessPunches();
    setBusyKey(null);
    if (res.success) {
      flash(res.message || 'Done.');
      await loadData(true);
    } else setErrorMsg(res.error || 'Failed.');
  };

  const handleSimulatePunch = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const res = await simulateBiometricPunch(simulateForm);
    setSubmitting(false);
    if (res.success) {
      setSimulateModalOpen(false);
      flash(res.message || 'Test punch recorded.');
      await loadData(true);
    } else {
      setErrorMsg(res.error || 'Failed to record test punch.');
    }
  };

  const confirmDeleteDevice = async () => {
    if (!deleteConfirmId) return;
    const id = deleteConfirmId;
    setDeleteConfirmId(null);
    const res = await deleteBiometricDevice(id);
    if (res.success) {
      flash(res.message || 'Device removed.');
      await loadData(true);
    } else setErrorMsg(res.error || 'Failed to remove device.');
  };

  const serverHost = server?.host || window.location.hostname;
  const serverPort = server?.port ?? 4000;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Biometric Devices</h1>
          <p className="page-subtitle">eSSL / ZKTeco terminals (AiFace Mars, uFace, X990, K-series) connected over ADMS push</p>
        </div>
        <div className="page-actions" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <Button variant="outline" icon={<HelpCircle size={16} />} onClick={() => setGuideModalOpen(true)}>
            Device setup guide
          </Button>
          <Button variant="secondary" icon={<Fingerprint size={16} />} onClick={() => setSimulateModalOpen(true)}>
            Test punch
          </Button>
          <Button variant="primary" icon={<Plus size={16} />} onClick={() => setRegisterModalOpen(true)}>
            Register device
          </Button>
        </div>
      </div>

      {toastMsg && <Alert variant="success" onClose={() => setToastMsg(null)}>{toastMsg}</Alert>}
      {errorMsg && <Alert variant="error" title="Something went wrong" onClose={() => setErrorMsg(null)}>{errorMsg}</Alert>}

      {unregistered.length > 0 && (
        <Alert variant="warning" title={`${unregistered.length} device(s) are connected but not registered`}>
          Punches from these devices are stored but not applied to attendance until you register them.{' '}
          {unregistered.map((d) => (
            <Button key={d.id} size="sm" variant="outline" style={{ marginLeft: '0.4rem' }} onClick={() => claimDevice(d)}>
              Register {d.deviceSn}
            </Button>
          ))}
        </Alert>
      )}

      {unmatchedPins.length > 0 && (
        <Alert variant="warning" title={`${unmatchedPins.length} device User ID(s) are not linked to an employee`}>
          Their punches are not counted in attendance yet.{' '}
          <Button size="sm" variant="outline" onClick={() => setActiveTab('mapping')}>Link them now</Button>
        </Alert>
      )}

      <div className="stat-grid">
        <StatCard title="Devices" value={`${devices.length}`} icon={<Cpu size={20} />} subtext={`${devices.length - unregistered.length} registered`} />
        <StatCard title="Online now" value={`${onlineCount}`} icon={<Wifi size={20} />} subtext="Heartbeat in the last 3 minutes" />
        <StatCard title="Offline" value={`${devices.length - onlineCount}`} icon={<ShieldAlert size={20} />} subtext="Check power / network / server address" />
        <StatCard title="Recent punches" value={`${rawLogs.length}`} icon={<Activity size={20} />} subtext={`${rawLogs.filter((l) => !l.matched).length} unmatched`} />
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', flexWrap: 'wrap' }}>
        {([
          ['devices', `Devices (${devices.length})`],
          ['mapping', `Employee ↔ Device User ID (${pins.length})`],
          ['logs', `Punch log (${rawLogs.length})`],
        ] as Array<[Tab, string]>).map(([key, label]) => (
          <button key={key} className={`btn ${activeTab === key ? 'btn-primary' : 'btn-ghost'} btn-sm`} onClick={() => setActiveTab(key)}>
            {label}
          </button>
        ))}
        <Button variant="ghost" size="sm" icon={<RefreshCw size={14} />} onClick={() => loadData()} style={{ marginLeft: 'auto' }}>
          Refresh
        </Button>
      </div>

      {activeTab === 'devices' && (
        <Card>
          <CardHeader>
            <CardTitle>Terminals</CardTitle>
          </CardHeader>
          <CardBody>
            {loading ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading devices…</div>
            ) : devices.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                No device has contacted the server yet. Open the <strong>Device setup guide</strong>, enter the server address on the
                terminal, then register its serial number here.
              </div>
            ) : (
              <TableContainer>
                <Table>
                  <Thead>
                    <Tr>
                      <Th>Serial number</Th>
                      <Th>Name / location</Th>
                      <Th>Status</Th>
                      <Th>Last heartbeat</Th>
                      <Th>Firmware / users</Th>
                      <Th>Punches</Th>
                      <Th style={{ textAlign: 'right' }}>Actions</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {devices.map((dev) => (
                      <Tr key={dev.id}>
                        <Td style={{ ...codeStyle, color: 'var(--primary-500)' }}>{dev.deviceSn}</Td>
                        <Td>
                          <div style={{ fontWeight: 600 }}>{dev.deviceName}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{dev.location || '—'} {dev.ipAddress ? `· ${dev.ipAddress}` : ''}</div>
                        </Td>
                        <Td>
                          <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                            <Badge variant={dev.status === 'ONLINE' ? 'success' : 'error'}>{dev.status}</Badge>
                            {!dev.registered && <Badge variant="warning">NOT REGISTERED</Badge>}
                          </div>
                        </Td>
                        <Td style={{ fontSize: '0.8125rem' }}>{timeAgo(dev.lastPingAt)}</Td>
                        <Td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          {dev.firmware || '—'}
                          {dev.userCount != null ? ` · ${dev.userCount} users` : ''}
                        </Td>
                        <Td style={{ fontSize: '0.8125rem' }}>
                          {dev.punchCount ?? 0}
                          {dev.unmatchedCount ? <span style={{ color: 'var(--warning-text)' }}> ({dev.unmatchedCount} unmatched)</span> : null}
                        </Td>
                        <Td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                            {!dev.registered ? (
                              <Button size="sm" variant="primary" onClick={() => claimDevice(dev)}>Register</Button>
                            ) : (
                              <>
                                <Button size="sm" variant="outline" icon={<DownloadCloud size={14} />} isLoading={busyKey === `SYNC_ATTLOG-${dev.id}`} onClick={() => handleCommand(dev, 'SYNC_ATTLOG')} title="Ask the device to re-send the last 31 days of punches">
                                  Pull logs
                                </Button>
                                <Button size="sm" variant="ghost" icon={<Users size={14} />} isLoading={busyKey === `SYNC_USERS-${dev.id}`} onClick={() => handleCommand(dev, 'SYNC_USERS')} title="Ask the device for its enrolled users">
                                  Users
                                </Button>
                              </>
                            )}
                            <Button size="sm" variant="danger" icon={<Trash2 size={14} />} onClick={() => setDeleteConfirmId(dev.id)} title="Remove device" />
                          </div>
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

      {activeTab === 'mapping' && (
        <Card>
          <CardHeader>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: '0.5rem', flexWrap: 'wrap' }}>
              <CardTitle>Link device User IDs to employees</CardTitle>
              <Button size="sm" variant="outline" icon={<RefreshCw size={14} />} isLoading={busyKey === 'reprocess'} onClick={handleReprocess}>
                Re-apply unmatched punches
              </Button>
            </div>
          </CardHeader>
          <CardBody>
            <p style={{ marginTop: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Matching is automatic when the device User ID equals the employee code (e.g. <code>EMP001</code>) or its number
              (User ID <code>7</code> ↔ <code>AMPL-00007</code>). Link anything else manually below.
            </p>
            {pins.length === 0 ? (
              <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                No device users seen yet. Enrol a face on the terminal and punch once, or press “Users” on a registered device.
              </div>
            ) : (
              <TableContainer>
                <Table>
                  <Thead>
                    <Tr>
                      <Th>Device User ID</Th>
                      <Th>Name on device</Th>
                      <Th>Punches</Th>
                      <Th>Linked employee</Th>
                      <Th style={{ textAlign: 'right' }}>Change</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {pins.map((p) => {
                      const draft = pinDrafts[p.pin] ?? '';
                      return (
                        <Tr key={p.pin}>
                          <Td style={codeStyle}>{p.pin}</Td>
                          <Td>{p.deviceName || '—'}</Td>
                          <Td style={{ fontSize: '0.8125rem' }}>
                            {p.punches}
                            {p.lastSeen ? <div style={{ color: 'var(--text-secondary)' }}>last {formatDeviceTime(p.lastSeen)}</div> : null}
                          </Td>
                          <Td>
                            {p.userId ? (
                              <span>
                                <strong>{p.employeeId}</strong> · {p.employeeName}{' '}
                                <Badge variant={p.explicit ? 'info' : 'neutral'}>{p.explicit ? 'manual' : 'auto'}</Badge>
                              </span>
                            ) : (
                              <Badge variant="warning">Not linked</Badge>
                            )}
                          </Td>
                          <Td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                              <select
                                className="select"
                                style={{ minWidth: 200 }}
                                value={draft}
                                onChange={(e) => setPinDrafts({ ...pinDrafts, [p.pin]: e.target.value })}
                                aria-label={`Employee for device user ${p.pin}`}
                              >
                                <option value="">Select employee…</option>
                                {employees.map((emp) => (
                                  <option key={emp.id} value={emp.id}>
                                    {emp.employeeId} · {emp.fullName}{emp.biometricPin ? ` (ID ${emp.biometricPin})` : ''}
                                  </option>
                                ))}
                              </select>
                              <Button
                                size="sm"
                                variant="primary"
                                icon={<Link2 size={14} />}
                                disabled={!draft}
                                isLoading={busyKey === `map-${draft}-${p.pin}`}
                                onClick={() => handleSaveMapping(draft, p.pin)}
                              >
                                Link
                              </Button>
                            </div>
                          </Td>
                        </Tr>
                      );
                    })}
                  </Tbody>
                </Table>
              </TableContainer>
            )}
            {unmappedEmployees.length > 0 && pins.length > 0 && (
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: 0 }}>
                {unmappedEmployees.length} employee(s) have no punches on any device yet.
              </p>
            )}
          </CardBody>
        </Card>
      )}

      {activeTab === 'logs' && (
        <Card>
          <CardHeader>
            <CardTitle>Latest punches received from devices</CardTitle>
          </CardHeader>
          <CardBody>
            <TableContainer>
              <Table>
                <Thead>
                  <Tr>
                    <Th>Punch time (device clock)</Th>
                    <Th>Employee</Th>
                    <Th>Device User ID</Th>
                    <Th>Device</Th>
                    <Th>Verified by</Th>
                    <Th>Key pressed</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {rawLogs.length === 0 ? (
                    <Tr>
                      <Td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>No punches received yet.</Td>
                    </Tr>
                  ) : (
                    rawLogs.map((log) => (
                      <Tr key={log.id}>
                        <Td style={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}>{formatDeviceTime(log.punchTime)}</Td>
                        <Td>
                          {log.matched ? (
                            <span><strong>{log.employeeId}</strong> · {log.employeeName}</span>
                          ) : (
                            <Badge variant="warning">Not linked</Badge>
                          )}
                        </Td>
                        <Td style={codeStyle}>{log.devicePin}</Td>
                        <Td style={{ fontFamily: 'monospace', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{log.deviceSn}</Td>
                        <Td><Badge variant="info">{log.verifyType || '—'}</Badge></Td>
                        <Td style={{ fontSize: '0.8125rem' }}>{(log.punchType || 'AUTO').replace('_', ' ')}</Td>
                      </Tr>
                    ))
                  )}
                </Tbody>
              </Table>
            </TableContainer>
          </CardBody>
        </Card>
      )}

      {/* Register Device Modal */}
      <Modal isOpen={registerModalOpen} onClose={() => setRegisterModalOpen(false)} title="Register biometric device">
        <form onSubmit={handleRegisterDevice} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            The serial number is on the label at the back of the device and under <strong>Menu → System Info → Device Info</strong>.
          </p>
          <Input
            label="Device serial number (SN) *"
            required
            placeholder="e.g. CQZ7224960123"
            value={deviceForm.deviceSn}
            onChange={(e) => setDeviceForm({ ...deviceForm, deviceSn: e.target.value })}
          />
          <Input
            label="Display name *"
            required
            value={deviceForm.deviceName}
            onChange={(e) => setDeviceForm({ ...deviceForm, deviceName: e.target.value })}
          />
          <Input
            label="Location"
            placeholder="e.g. Head office reception"
            value={deviceForm.location}
            onChange={(e) => setDeviceForm({ ...deviceForm, location: e.target.value })}
          />
          <Input
            label="Device LAN IP (optional, for reference)"
            placeholder="e.g. 192.168.1.201"
            value={deviceForm.ipAddress}
            onChange={(e) => setDeviceForm({ ...deviceForm, ipAddress: e.target.value })}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <Button type="button" variant="outline" onClick={() => setRegisterModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" isLoading={submitting}>Register</Button>
          </div>
        </form>
      </Modal>

      {/* Test punch modal */}
      <Modal isOpen={simulateModalOpen} onClose={() => setSimulateModalOpen(false)} title="Record a test punch">
        <form onSubmit={handleSimulatePunch} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Alert variant="warning">This writes a real punch at the current server time into the employee’s attendance. Use it only for testing.</Alert>
          <div className="form-group">
            <label className="form-label">Employee *</label>
            <select className="select" required value={simulateForm.employeeId} onChange={(e) => setSimulateForm({ ...simulateForm, employeeId: e.target.value })}>
              <option value="">Select employee…</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.employeeId}>{emp.employeeId} · {emp.fullName}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Verification type</label>
            <select className="select" value={simulateForm.verifyType} onChange={(e) => setSimulateForm({ ...simulateForm, verifyType: e.target.value })}>
              <option value="Face">Face</option>
              <option value="Fingerprint">Fingerprint</option>
              <option value="Card">Card</option>
              <option value="Password">Password</option>
            </select>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <Button type="button" variant="outline" onClick={() => setSimulateModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" isLoading={submitting} icon={<Fingerprint size={16} />}>Record punch</Button>
          </div>
        </form>
      </Modal>

      {/* Setup guide */}
      <Modal isOpen={guideModalOpen} onClose={() => setGuideModalOpen(false)} title="Connect an eSSL AiFace Mars (ADMS)">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem', fontSize: '0.875rem' }}>
          <div style={{ background: 'var(--bg-sidebar)', padding: '1rem', borderRadius: 8, border: '1px solid var(--border-color)' }}>
            <h4 style={{ color: 'var(--primary-500)', margin: '0 0 0.5rem' }}>1. Put the device on the network</h4>
            <p style={{ margin: 0 }}>
              <strong>Menu → Comm. → WIFI Setting</strong> (or Ethernet): join your office Wi-Fi and enable DHCP. Check
              <strong> Menu → Comm. → Ethernet/Wi-Fi</strong> shows an IP and gateway.
            </p>
          </div>
          <div style={{ background: 'var(--bg-sidebar)', padding: '1rem', borderRadius: 8, border: '1px solid var(--border-color)' }}>
            <h4 style={{ color: 'var(--primary-500)', margin: '0 0 0.5rem' }}>2. Menu → Comm. → Cloud Server Setting</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontFamily: 'monospace', fontSize: '0.8125rem' }}>
              <div>Server Mode: <strong>ADMS</strong></div>
              <div>Enable Domain Name: <strong>{server?.isDomain === false ? 'OFF' : 'ON'}</strong></div>
              <div>Server Address: <strong>{serverHost}</strong></div>
              <div>Server Port: <strong>{serverPort}</strong></div>
              <div>HTTPS: <strong>{server?.https ? 'ON' : 'OFF'}</strong></div>
              <div>Enable Proxy Server: <strong>OFF</strong></div>
            </div>
            {server?.https && (
              <p style={{ margin: '0.5rem 0 0', color: 'var(--warning-text)' }}>
                This server only accepts HTTPS. If your firmware has no HTTPS option, use the office relay described in
                docs/essl-aiface-mars-setup.md.
              </p>
            )}
          </div>
          <div style={{ background: 'var(--bg-sidebar)', padding: '1rem', borderRadius: 8, border: '1px solid var(--border-color)' }}>
            <h4 style={{ color: 'var(--primary-500)', margin: '0 0 0.5rem' }}>3. Register and enrol</h4>
            <p style={{ margin: 0 }}>
              Within a minute the device appears here as <em>NOT REGISTERED</em> — click <strong>Register</strong>. Enrol each
              person on the device with <strong>User ID = employee number</strong> (e.g. 7 for AMPL-00007) so punches link
              automatically; link any other IDs in the “Employee ↔ Device User ID” tab.
            </p>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="primary" onClick={() => setGuideModalOpen(false)}>Close</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={Boolean(deleteConfirmId)} onClose={() => setDeleteConfirmId(null)} title="Remove device?">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            The device will be unregistered. Punch history and attendance already recorded are kept. If the device keeps
            sending data it will reappear as not registered.
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <Button type="button" variant="outline" onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
            <Button type="button" variant="danger" icon={<Trash2 size={16} />} onClick={confirmDeleteDevice}>Remove</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default BiometricDevicesPage;

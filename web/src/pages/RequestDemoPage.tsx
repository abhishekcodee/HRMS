import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Building,
  Mail,
  Phone,
  User,
  CheckCircle2,
  Sparkles,
  ArrowLeft,
} from 'lucide-react';
import { useTenant } from '../context/TenantContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Alert } from '../components/ui/Alert';

export const RequestDemoPage: React.FC = () => {
  const { branding } = useTenant();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [workEmail, setWorkEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [companySize, setCompanySize] = useState('11-50');
  const [industry, setIndustry] = useState('Technology & SaaS');
  const [modules, setModules] = useState<string[]>([
    'Attendance & Biometrics',
    'Payroll Engine',
    'Leave Management',
  ]);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [demoToken, setDemoToken] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!fullName.trim() || !workEmail.trim() || !phone.trim() || !companyName.trim()) {
      setErrorMessage('Please complete all required fields.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/v1/marketing/demo-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: fullName.trim(),
          workEmail: workEmail.trim(),
          phoneNumber: phone.trim(),
          companyName: companyName.trim(),
          companySize,
          industry,
          requiredModules: modules,
          message: message.trim(),
        }),
      });

      const data = await response.json();
      if (response.ok && data.success && data.data?.demoAccessToken) {
        setDemoToken(data.data.demoAccessToken);
      } else {
        setErrorMessage(data.message || 'Could not process demo request. Please try again.');
      }
    } catch {
      setErrorMessage('Network connection error. Please verify your connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleModule = (mod: string) => {
    setModules((prev) =>
      prev.includes(mod) ? prev.filter((m) => m !== mod) : [...prev, mod]
    );
  };

  return (
    <div className="auth-shell"
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(circle at 50% 20%, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 1))',
        padding: '2.5rem 1rem',
      }}
    >
      <div style={{ width: '100%', maxWidth: '540px' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <img
            src={branding.logo_url || '/logo.png'}
            alt={branding.name || 'Wokhman'}
            style={{ maxHeight: '70px', maxWidth: '240px', marginBottom: '0.75rem', objectFit: 'contain' }}
          />
          <h1 style={{ fontSize: '1.65rem', fontWeight: 700, color: '#f8fafc', margin: 0, letterSpacing: '-0.02em' }}>
            Request Enterprise HRMS Demo
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginTop: '0.35rem' }}>
            Experience automated biometrics, multi-tenant workflows, and smart payroll.
          </p>
        </div>

        <Card
          style={{
            background: 'rgba(30, 41, 59, 0.85)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '2rem',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
          }}
        >
          {demoToken ? (
            <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
              <div
                style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  background: 'rgba(16, 185, 129, 0.15)',
                  color: '#10b981',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1.25rem',
                }}
              >
                <CheckCircle2 size={36} />
              </div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.5rem' }}>
                Demo Access Approved!
              </h2>
              <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: 1.6, maxWidth: '400px', margin: '0 auto 1.75rem' }}>
                Thank you, <strong>{fullName}</strong>. We have activated an isolated enterprise preview session for <strong>{companyName}</strong>.
              </p>
              <Button
                variant="primary"
                onClick={() => navigate(`/login?demo_access=${encodeURIComponent(demoToken)}`)}
                style={{
                  width: '100%',
                  padding: '0.8rem',
                  fontSize: '1rem',
                  fontWeight: 600,
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                }}
              >
                <Sparkles size={18} /> Launch Authorized Demo Preview
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {errorMessage && (
                <Alert variant="error" title="Submission Issue">
                  {errorMessage}
                </Alert>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <label className="form-label" style={{ color: '#cbd5e1', fontSize: '0.8rem' }}>
                    Full Name <span style={{ color: '#f87171' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}>
                      <User size={15} />
                    </span>
                    <input
                      type="text"
                      className="input"
                      placeholder="Enter full name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      style={{ paddingLeft: '2.25rem', fontSize: '0.85rem' }}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ color: '#cbd5e1', fontSize: '0.8rem' }}>
                    Business Email <span style={{ color: '#f87171' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}>
                      <Mail size={15} />
                    </span>
                    <input
                      type="email"
                      className="input"
                      placeholder="name@company.com"
                      value={workEmail}
                      onChange={(e) => setWorkEmail(e.target.value)}
                      style={{ paddingLeft: '2.25rem', fontSize: '0.85rem' }}
                      required
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <label className="form-label" style={{ color: '#cbd5e1', fontSize: '0.8rem' }}>
                    Phone Number <span style={{ color: '#f87171' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}>
                      <Phone size={15} />
                    </span>
                    <input
                      type="tel"
                      className="input"
                      placeholder="Phone number"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      style={{ paddingLeft: '2.25rem', fontSize: '0.85rem' }}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ color: '#cbd5e1', fontSize: '0.8rem' }}>
                    Company Name <span style={{ color: '#f87171' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}>
                      <Building size={15} />
                    </span>
                    <input
                      type="text"
                      className="input"
                      placeholder="Company name"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      style={{ paddingLeft: '2.25rem', fontSize: '0.85rem' }}
                      required
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                <div className="form-group">
                  <label className="form-label" style={{ color: '#cbd5e1', fontSize: '0.8rem' }}>
                    Company Size
                  </label>
                  <select
                    className="input"
                    value={companySize}
                    onChange={(e) => setCompanySize(e.target.value)}
                    style={{ fontSize: '0.85rem' }}
                  >
                    <option value="1-10">1 - 10 employees</option>
                    <option value="11-50">11 - 50 employees</option>
                    <option value="51-200">51 - 200 employees</option>
                    <option value="201-500">201 - 500 employees</option>
                    <option value="500+">500+ employees (Enterprise)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ color: '#cbd5e1', fontSize: '0.8rem' }}>
                    Industry
                  </label>
                  <select
                    className="input"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    style={{ fontSize: '0.85rem' }}
                  >
                    <option value="Technology & SaaS">Technology & SaaS</option>
                    <option value="Manufacturing & Logistics">Manufacturing & Logistics</option>
                    <option value="Healthcare & Pharma">Healthcare & Pharma</option>
                    <option value="Financial Services">Financial Services</option>
                    <option value="Retail & E-commerce">Retail & E-commerce</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label className="form-label" style={{ color: '#cbd5e1', fontSize: '0.8rem', marginBottom: '0.5rem', display: 'block' }}>
                  Modules of Interest
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  {[
                    'Attendance & Biometrics',
                    'Payroll Engine',
                    'Leave Management',
                    'Document Generator',
                    'Reports & Statutory',
                  ].map((mod) => (
                    <label
                      key={mod}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        fontSize: '0.8rem',
                        color: modules.includes(mod) ? '#93c5fd' : '#94a3b8',
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={modules.includes(mod)}
                        onChange={() => toggleModule(mod)}
                        style={{ accentColor: '#3b82f6' }}
                      />
                      {mod}
                    </label>
                  ))}
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label" style={{ color: '#cbd5e1', fontSize: '0.8rem' }}>
                  Specific Requirements (Optional)
                </label>
                <textarea
                  className="input"
                  rows={2}
                  placeholder="Tell us about your team size, shifts, or biometric device requirements..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  style={{ fontSize: '0.85rem', resize: 'vertical' }}
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                isLoading={isSubmitting}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  fontSize: '1rem',
                  fontWeight: 600,
                  borderRadius: '8px',
                }}
              >
                Request Demo Access &rarr;
              </Button>
            </form>
          )}
        </Card>

        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <Link
            to="/login"
            style={{
              color: '#94a3b8',
              fontSize: '0.85rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              textDecoration: 'none',
            }}
          >
            <ArrowLeft size={16} /> Return to Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default RequestDemoPage;


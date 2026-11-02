import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  KeyRound,
  Sparkles,
  Calendar,
  Building,
  Phone,
  User,
  CheckCircle2,
  Copy,
  Check,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Alert } from '../components/ui/Alert';
import { Modal } from '../components/ui/Modal';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const { branding } = useTenant();
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDemoLoggingIn, setIsDemoLoggingIn] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Forgot Password modal state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSubmitting, setForgotSubmitting] = useState(false);
  const [forgotSuccessMessage, setForgotSuccessMessage] = useState<string | null>(null);

  // Request a Demo modal state
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [demoFullName, setDemoFullName] = useState('');
  const [demoWorkEmail, setDemoWorkEmail] = useState('');
  const [demoPhone, setDemoPhone] = useState('');
  const [demoCompanyName, setDemoCompanyName] = useState('');
  const [demoCompanySize, setDemoCompanySize] = useState('11-50');
  const [demoIndustry, setDemoIndustry] = useState('Technology & SaaS');
  const [demoModules, setDemoModules] = useState<string[]>([
    'Attendance & Biometrics',
    'Payroll Engine',
    'Leave Management',
  ]);
  const [demoMessage, setDemoMessage] = useState('');
  const [demoSubmitting, setDemoSubmitting] = useState(false);
  const [demoSuccess, setDemoSuccess] = useState(false);
  const [demoFormError, setDemoFormError] = useState<string | null>(null);
  const [copiedCreds, setCopiedCreds] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!identifier.trim()) {
      setErrorMessage('Please enter your Email or Employee ID.');
      return;
    }
    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await login(identifier, password);
      if (result.success) {
        if (result.mustChangePassword) {
          navigate('/change-password');
        } else {
          navigate('/');
        }
      } else {
        setErrorMessage(result.error || 'Authentication failed. Please verify your credentials.');
      }
    } catch (err: any) {
      setErrorMessage('Network error connecting to HRMS backend API.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTryLiveDemo = async () => {
    setIsDemoLoggingIn(true);
    setErrorMessage(null);

    try {
      // Direct demo login using predefined demo credentials
      const result = await login('demo@wokhman.com', 'Demo@12345');
      if (result.success) {
        navigate('/');
      } else {
        // Fallback to auto-filling form so visitor can click submit
        setIdentifier('demo@wokhman.com');
        setPassword('Demo@12345');
        setErrorMessage(result.error || 'Unable to connect to demo account directly. Pre-filled credentials for you.');
      }
    } catch (err) {
      setIdentifier('demo@wokhman.com');
      setPassword('Demo@12345');
      setErrorMessage('Network error connecting to live demo. Credentials filled below.');
    } finally {
      setIsDemoLoggingIn(false);
    }
  };

  const handleQuickFill = (emailVal: string, passVal: string) => {
    setIdentifier(emailVal);
    setPassword(passVal);
    setErrorMessage(null);
    setCopiedCreds(true);
    setTimeout(() => setCopiedCreds(false), 2000);
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;

    setForgotSubmitting(true);
    setForgotSuccessMessage(null);

    try {
      const response = await fetch('/api/v1/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail.trim() }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error?.message || data.message || 'Unable to send password reset request.');
      }
      setForgotSuccessMessage(data.message || 'If the account exists, reset instructions will be sent shortly.');
    } catch (err) {
      setForgotSuccessMessage(err instanceof Error ? err.message : 'Unable to send password reset request.');
    } finally {
      setForgotSubmitting(false);
    }
  };

  const handleDemoRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDemoFormError(null);

    if (!demoFullName.trim() || !demoWorkEmail.trim() || !demoPhone.trim() || !demoCompanyName.trim()) {
      setDemoFormError('Please complete all required fields.');
      return;
    }

    setDemoSubmitting(true);

    try {
      const response = await fetch('/api/v1/marketing/demo-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: demoFullName.trim(),
          workEmail: demoWorkEmail.trim(),
          phoneNumber: demoPhone.trim(),
          companyName: demoCompanyName.trim(),
          companySize: demoCompanySize,
          industry: demoIndustry,
          requiredModules: demoModules,
          message: demoMessage.trim(),
        }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setDemoSuccess(true);
      } else {
        setDemoFormError(data.message || 'Could not submit demo request. Please try again.');
      }
    } catch (err) {
      setDemoFormError('Network connection issue. Please check your connection and try again.');
    } finally {
      setDemoSubmitting(false);
    }
  };

  const toggleModule = (module: string) => {
    setDemoModules((prev) =>
      prev.includes(module) ? prev.filter((m) => m !== module) : [...prev, module]
    );
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(circle at 50% 20%, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 1))',
        padding: '2.5rem 1rem',
      }}
    >
      <div style={{ width: '100%', maxWidth: '460px' }}>
        {/* Dynamic HRMS Tenant Branding Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <img
            src={branding.logo_url || '/logo.png'}
            alt={branding.name || 'Wokhman'}
            style={{ maxHeight: '72px', maxWidth: '260px', marginBottom: '0.75rem', objectFit: 'contain' }}
          />
          <h1 style={{ fontSize: '1.65rem', fontWeight: 700, color: '#f8fafc', margin: 0, letterSpacing: '-0.02em' }}>
            {branding.name || 'Wokhman'}
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginTop: '0.35rem' }}>
            Work Meets Human. Next-Generation Enterprise HRMS
          </p>
        </div>

        {/* Login Card */}
        <Card
          style={{
            background: 'rgba(30, 41, 59, 0.8)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '2rem',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
          }}
        >
          {errorMessage && (
            <Alert variant="error" title="Authentication Notice">
              {errorMessage}
            </Alert>
          )}

          <form onSubmit={handleSubmit} noValidate>
            {/* Field 1: Email or Employee ID */}
            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label htmlFor="identifier" className="form-label" style={{ color: '#cbd5e1' }}>
                Email or Employee ID <span className="required">*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <span
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#64748b',
                    display: 'flex',
                  }}
                >
                  <Mail size={18} />
                </span>
                <input
                  id="identifier"
                  type="text"
                  className="input"
                  placeholder="admin@hrms.com or demo@wokhman.com"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  style={{ paddingLeft: '2.5rem', background: '#0f172a', borderColor: '#334155', color: '#f8fafc' }}
                  required
                />
              </div>
            </div>

            {/* Field 2: Password with Show/Hide toggle */}
            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label htmlFor="password" className="form-label" style={{ color: '#cbd5e1' }}>
                Password <span className="required">*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <span
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#64748b',
                    display: 'flex',
                  }}
                >
                  <Lock size={18} />
                </span>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className="input"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    paddingLeft: '2.5rem',
                    paddingRight: '2.5rem',
                    background: '#0f172a',
                    borderColor: '#334155',
                    color: '#f8fafc',
                  }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#64748b',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    padding: 0,
                  }}
                  title={showPassword ? 'Hide Password' : 'Show Password'}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1.5rem',
                fontSize: '0.875rem',
              }}
            >
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#94a3b8', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  style={{ accentColor: '#3b82f6' }}
                />
                Remember Me
              </label>

              <button
                type="button"
                onClick={() => {
                  setForgotEmail(identifier);
                  setForgotSuccessMessage(null);
                  setShowForgotModal(true);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#3b82f6',
                  cursor: 'pointer',
                  fontWeight: 500,
                  fontSize: '0.875rem',
                  padding: 0,
                }}
              >
                Forgot Password?
              </button>
            </div>

            {/* Login Button */}
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
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
              }}
            >
              Sign In to HRMS <ArrowRight size={18} />
            </Button>
          </form>

          {/* Divider */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              margin: '1.5rem 0',
              color: '#64748b',
              fontSize: '0.75rem',
              fontWeight: 600,
              letterSpacing: '0.05em',
            }}
          >
            <div style={{ flex: 1, height: '1px', background: 'rgba(255, 255, 255, 0.1)' }} />
            <span style={{ padding: '0 0.75rem', textTransform: 'uppercase' }}>Explore Before Subscribing</span>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255, 255, 255, 0.1)' }} />
          </div>

          {/* Demo Action Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <Button
              type="button"
              variant="secondary"
              isLoading={isDemoLoggingIn}
              onClick={handleTryLiveDemo}
              style={{
                width: '100%',
                padding: '0.75rem',
                fontSize: '0.925rem',
                fontWeight: 600,
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)',
                color: '#ffffff',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                boxShadow: '0 4px 14px rgba(79, 70, 229, 0.35)',
              }}
            >
              <Sparkles size={16} /> Try Live Demo (1-Click Access)
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setDemoSuccess(false);
                setDemoFormError(null);
                setShowDemoModal(true);
              }}
              style={{
                width: '100%',
                padding: '0.65rem',
                fontSize: '0.875rem',
                fontWeight: 500,
                borderRadius: '8px',
                borderColor: '#475569',
                color: '#e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
              }}
            >
              <Calendar size={15} /> Request a Personalized Demo
            </Button>
          </div>
        </Card>

        {/* Dedicated Predefined Demo Credentials Card */}
        <div
          style={{
            marginTop: '1.25rem',
            background: 'rgba(15, 23, 42, 0.7)',
            border: '1px solid rgba(99, 102, 241, 0.25)',
            borderRadius: '12px',
            padding: '1rem 1.25rem',
            color: '#cbd5e1',
            fontSize: '0.825rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 600, color: '#93c5fd', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Sparkles size={14} /> Predefined Demo Credentials:
            </span>
            <button
              type="button"
              onClick={() => handleQuickFill('demo@wokhman.com', 'Demo@12345')}
              style={{
                background: 'rgba(99, 102, 241, 0.15)',
                border: '1px solid rgba(99, 102, 241, 0.4)',
                color: '#a5b4fc',
                borderRadius: '6px',
                padding: '0.25rem 0.55rem',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
              }}
            >
              {copiedCreds ? <Check size={12} /> : <Copy size={12} />}
              {copiedCreds ? 'Filled!' : 'Quick Fill'}
            </button>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'monospace', fontSize: '0.8rem', background: '#090d16', padding: '0.4rem 0.65rem', borderRadius: '6px' }}>
            <span>Email: <strong>demo@wokhman.com</strong></span>
            <span>Pass: <strong>Demo@12345</strong></span>
          </div>
        </div>
      </div>

      {/* Request a Demo Modal */}
      <Modal
        isOpen={showDemoModal}
        onClose={() => setShowDemoModal(false)}
        title="Schedule a Personalized Enterprise Demo"
      >
        {demoSuccess ? (
          <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#10b981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem',
              }}
            >
              <CheckCircle2 size={32} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.5rem' }}>
              Demo Request Received!
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '0.875rem', lineHeight: 1.6, maxWidth: '380px', margin: '0 auto 1.5rem' }}>
              Thank you, <strong>{demoFullName}</strong>. Our enterprise team will connect with <strong>{demoWorkEmail}</strong> shortly.
              You don&apos;t have to wait — explore our live interactive demo right now.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
              <Button
                variant="primary"
                onClick={() => {
                  setShowDemoModal(false);
                  handleTryLiveDemo();
                }}
                style={{
                  background: 'linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)',
                  padding: '0.7rem 1.5rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <Sparkles size={16} /> Launch Interactive Demo Now
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleDemoRequestSubmit}>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
              Discover how Wokhman streamlines your workforce, automated biometrics, and multi-entity payroll.
            </p>

            {demoFormError && (
              <Alert variant="error" title="Submission Issue">
                {demoFormError}
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
                    placeholder="Jane Doe"
                    value={demoFullName}
                    onChange={(e) => setDemoFullName(e.target.value)}
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
                    placeholder="jane@company.com"
                    value={demoWorkEmail}
                    onChange={(e) => setDemoWorkEmail(e.target.value)}
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
                    placeholder="+1 (555) 000-0000"
                    value={demoPhone}
                    onChange={(e) => setDemoPhone(e.target.value)}
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
                    placeholder="Acme Enterprises"
                    value={demoCompanyName}
                    onChange={(e) => setDemoCompanyName(e.target.value)}
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
                  value={demoCompanySize}
                  onChange={(e) => setDemoCompanySize(e.target.value)}
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
                  value={demoIndustry}
                  onChange={(e) => setDemoIndustry(e.target.value)}
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

            {/* Modules of Interest */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label className="form-label" style={{ color: '#cbd5e1', fontSize: '0.8rem', marginBottom: '0.5rem', display: 'block' }}>
                Key Modules of Interest
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
                      color: demoModules.includes(mod) ? '#93c5fd' : '#94a3b8',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={demoModules.includes(mod)}
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
                Specific Goals / Questions (Optional)
              </label>
              <textarea
                className="input"
                rows={2}
                placeholder="Tell us about your team size, payroll schedule, or biometric requirements..."
                value={demoMessage}
                onChange={(e) => setDemoMessage(e.target.value)}
                style={{ fontSize: '0.85rem', resize: 'vertical' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <Button type="button" variant="outline" onClick={() => setShowDemoModal(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" isLoading={demoSubmitting}>
                Submit Demo Request
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Forgot Password Modal */}
      <Modal
        isOpen={showForgotModal}
        onClose={() => setShowForgotModal(false)}
        title="Reset Account Password"
      >
        <div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1rem' }}>
            Enter your registered email address below. A secure password reset token will be issued.
          </p>

          {forgotSuccessMessage && (
            <Alert variant="info" title="Reset Request Processed">
              {forgotSuccessMessage}
            </Alert>
          )}

          <form onSubmit={handleForgotSubmit}>
            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label htmlFor="forgot-email" className="form-label">
                Email Address
              </label>
              <input
                id="forgot-email"
                type="email"
                className="input"
                placeholder="name@company.com"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <Button type="button" variant="outline" onClick={() => setShowForgotModal(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" isLoading={forgotSubmitting}>
                <KeyRound size={16} style={{ marginRight: '0.5rem' }} /> Request Reset
              </Button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
};

export default LoginPage;

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  KeyRound,
  Sparkles,
  Building,
  Phone,
  User,
  CheckCircle2,
  Calendar,
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
  const [searchParams, setSearchParams] = useSearchParams();

  // Standard Login Form State
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Authorized Demo State (strictly enabled only after backend verification)
  const [demoToken, setDemoToken] = useState<string | null>(null);
  const [authorizedDemoEmail, setAuthorizedDemoEmail] = useState<string | null>(null);
  const [isVerifyingDemo, setIsVerifyingDemo] = useState(false);
  const [isDemoLoggingIn, setIsDemoLoggingIn] = useState(false);

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
  const [demoSuccessToken, setDemoSuccessToken] = useState<string | null>(null);
  const [demoFormError, setDemoFormError] = useState<string | null>(null);

  // Check URL query parameters for backend-verified demo access grant
  useEffect(() => {
    const accessGrant = searchParams.get('demo_access');
    if (accessGrant) {
      verifyDemoGrant(accessGrant);
    }
  }, [searchParams]);

  const verifyDemoGrant = async (token: string) => {
    setIsVerifyingDemo(true);
    try {
      const res = await fetch(`/api/v1/demo/verify-access?demo_access=${encodeURIComponent(token)}`);
      const data = await res.json();
      if (res.ok && data.authorized) {
        setDemoToken(token);
        setAuthorizedDemoEmail(data.email || 'Authorized Demo Visitor');
      } else {
        setDemoToken(null);
        setAuthorizedDemoEmail(null);
        searchParams.delete('demo_access');
        setSearchParams(searchParams, { replace: true });
      }
    } catch {
      setDemoToken(null);
    } finally {
      setIsVerifyingDemo(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!identifier.trim()) {
      setErrorMessage('Please enter your email or employee ID.');
      return;
    }
    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await login(identifier.trim(), password);
      if (result.success) {
        if (result.mustChangePassword) {
          navigate('/change-password');
        } else {
          navigate('/');
        }
      } else {
        setErrorMessage(result.error || 'Authentication failed. Please verify your credentials.');
      }
    } catch {
      setErrorMessage('Network error connecting to HRMS backend service.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAuthorizedDemoLogin = async (tokenToUse?: string) => {
    const activeToken = tokenToUse || demoToken;
    if (!activeToken) return;

    setIsDemoLoggingIn(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/v1/demo/direct-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-access-token': activeToken,
        },
      });

      const data = await res.json();
      if (res.ok && data.success && data.data?.token) {
        // Authenticate demo session directly
        localStorage.setItem('hrms_token', data.data.token);
        if (data.data.user) {
          localStorage.setItem('hrms_user', JSON.stringify(data.data.user));
        }
        window.location.href = '/';
      } else {
        setErrorMessage(data.error?.message || data.message || 'Demo access session could not be established.');
      }
    } catch {
      setErrorMessage('Network error initiating demo HRMS session.');
    } finally {
      setIsDemoLoggingIn(false);
    }
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
      setForgotSuccessMessage(data.message || 'If an account is associated with this email, reset instructions will be sent shortly.');
    } catch (err: any) {
      setForgotSuccessMessage(err?.message || 'Unable to send password reset request.');
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
      if (response.ok && data.success && data.data?.demoAccessToken) {
        const token = data.data.demoAccessToken;
        setDemoSuccessToken(token);
        setDemoToken(token);
        setAuthorizedDemoEmail(demoWorkEmail.trim());
      } else {
        setDemoFormError(data.message || 'Could not process demo request. Please try again.');
      }
    } catch {
      setDemoFormError('Network connection issue. Please verify your connection.');
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
        background: '#090d16',
        padding: '2.5rem 1rem',
      }}
    >
      <div style={{ width: '100%', maxWidth: '420px' }}>
        {/* Clean Logo Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <img
            src="/logo.png"
            alt="Wokhman"
            style={{ maxHeight: '68px', maxWidth: '220px', objectFit: 'contain' }}
          />
        </div>

        {/* Authorized Demo Access Banner (Only shown to backend-verified demo visitors) */}
        {demoToken && authorizedDemoEmail && (
          <div
            style={{
              marginBottom: '1.25rem',
              padding: '1rem',
              borderRadius: '8px',
              background: 'rgba(99, 102, 241, 0.1)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#c7d2fe', fontSize: '0.85rem', fontWeight: 600 }}>
                <Sparkles size={16} color="#818cf8" />
                <span>Authorized Demo Access</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setDemoToken(null);
                  setAuthorizedDemoEmail(null);
                  searchParams.delete('demo_access');
                  setSearchParams(searchParams, { replace: true });
                }}
                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '0.75rem', cursor: 'pointer' }}
              >
                Exit
              </button>
            </div>
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8' }}>
              Verified for <strong>{authorizedDemoEmail}</strong>. 30-minute interactive session.
            </p>
            <Button
              type="button"
              variant="primary"
              isLoading={isDemoLoggingIn}
              onClick={() => handleAuthorizedDemoLogin()}
              style={{
                width: '100%',
                padding: '0.65rem',
                fontSize: '0.875rem',
                fontWeight: 600,
                borderRadius: '6px',
              }}
            >
              Enter Interactive Demo Environment &rarr;
            </Button>
          </div>
        )}

        {/* Standard Enterprise Login Card */}
        <Card
          style={{
            background: '#111827',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '10px',
            padding: '2rem',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -2px rgba(0, 0, 0, 0.3)',
          }}
        >
          {searchParams.get('reason') === 'demo_expired' && (
            <Alert variant="warning" title="Demo Limit Reached (30 Minutes)">
              Your 30-minute interactive demo session has ended. To get permanent access or set up your dedicated enterprise workspace, please contact us or sign in with your account credentials.
            </Alert>
          )}

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
                  placeholder="Enter your email or employee ID"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  style={{ paddingLeft: '2.5rem', background: '#0d121f', borderColor: 'rgba(255, 255, 255, 0.1)', color: '#f8fafc', borderRadius: '6px' }}
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
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    paddingLeft: '2.5rem',
                    paddingRight: '2.5rem',
                    background: '#0d121f',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    color: '#f8fafc',
                    borderRadius: '6px',
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
        </Card>

        {/* Discreet Enterprise Exploration Footer */}
        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <button
            type="button"
            onClick={() => {
              setDemoSuccessToken(null);
              setDemoFormError(null);
              setShowDemoModal(true);
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#64748b',
              fontSize: '0.825rem',
              cursor: 'pointer',
              textDecoration: 'underline',
              transition: 'color 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#94a3b8')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#64748b')}
          >
            Looking to explore? Request an Enterprise Demo
          </button>
        </div>
      </div>

      {/* Request a Demo Modal */}
      <Modal
        isOpen={showDemoModal}
        onClose={() => setShowDemoModal(false)}
        title="Schedule a Personalized Enterprise Demo"
      >
        {demoSuccessToken ? (
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
              Demo Request Approved!
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '0.875rem', lineHeight: 1.6, maxWidth: '380px', margin: '0 auto 1.5rem' }}>
              Thank you, <strong>{demoFullName}</strong>. Your enterprise inquiry for <strong>{demoCompanyName}</strong> has been registered.
              You now have authorized access to explore the interactive demo environment.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
              <Button
                variant="primary"
                isLoading={isDemoLoggingIn}
                onClick={() => {
                  setShowDemoModal(false);
                  handleAuthorizedDemoLogin(demoSuccessToken);
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
                    placeholder="Enter your name"
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
                    placeholder="name@company.com"
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
                    placeholder="Enter phone number"
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
                    placeholder="Enter company name"
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

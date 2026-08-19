import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, Eye, EyeOff, ShieldCheck, ArrowRight, KeyRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Alert } from '../components/ui/Alert';
import { Modal } from '../components/ui/Modal';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Forgot Password modal state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSubmitting, setForgotSubmitting] = useState(false);
  const [forgotSuccessMessage, setForgotSuccessMessage] = useState<string | null>(null);

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

  const handleQuickFill = (emailVal: string, passVal: string) => {
    setIdentifier(emailVal);
    setPassword(passVal);
    setErrorMessage(null);
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
      setForgotSuccessMessage(data.message || 'Password reset request generated successfully.');
    } catch (err) {
      setForgotSuccessMessage('Unable to send password reset request.');
    } finally {
      setForgotSubmitting(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(circle at 50% 20%, rgba(30, 41, 59, 0.9), rgba(15, 23, 42, 1))',
        padding: '2rem 1rem',
      }}
    >
      <div style={{ width: '100%', maxWidth: '440px' }}>
        {/* HRMS Branding Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, var(--primary, #3b82f6), #1d4ed8)',
              boxShadow: '0 8px 24px rgba(59, 130, 246, 0.3)',
              marginBottom: '1rem',
            }}
          >
            <ShieldCheck size={32} color="#ffffff" />
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#f8fafc', margin: 0, letterSpacing: '-0.02em' }}>
            HRMS Portal
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginTop: '0.35rem' }}>
            Enterprise Resource & Workforce Management System
          </p>
        </div>

        {/* Login Card */}
        <Card
          style={{
            background: 'rgba(30, 41, 59, 0.75)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '2rem',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
          }}
        >
          {errorMessage && (
            <Alert variant="error" title="Authentication Failed">
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
                  placeholder="admin@hrms.com or EMP001"
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
                marginTop: '1.25rem',
              }}
            >
              Sign In to HRMS <ArrowRight size={18} />
            </Button>
          </form>
        </Card>
      </div>

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

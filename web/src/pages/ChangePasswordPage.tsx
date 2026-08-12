import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button, Input, Card, Alert } from '../components/ui';
import { ShieldCheck, Eye, EyeOff, Lock, CheckCircle2, XCircle, ArrowRight, KeyRound } from 'lucide-react';

export const ChangePasswordPage: React.FC = () => {
  const { user, changePassword, logout } = useAuth();
  const navigate = useNavigate();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Live Password Validation Checks
  const hasMinLength = newPassword.length >= 8;
  const hasUppercase = /[A-Z]/.exec(newPassword) !== null;
  const hasLowercase = /[a-z]/.exec(newPassword) !== null;
  const hasNumber = /[0-9]/.exec(newPassword) !== null;
  const hasSpecial = /[@$!%*?&]/.exec(newPassword) !== null;
  const isMatch = newPassword.length > 0 && newPassword === confirmPassword;
  const isNotSame = newPassword !== currentPassword || currentPassword === '';

  const fulfilledCount = [hasMinLength, hasUppercase, hasLowercase, hasNumber, hasSpecial].filter(Boolean).length;
  const strengthPercentage = (fulfilledCount / 5) * 100;

  let strengthLabel = 'Weak';
  let strengthColor = 'var(--error-text)';
  if (fulfilledCount >= 5) {
    strengthLabel = 'Strong & Compliant';
    strengthColor = 'var(--success-text)';
  } else if (fulfilledCount >= 3) {
    strengthLabel = 'Moderate';
    strengthColor = 'var(--warning-text)';
  }

  const isValidForm =
    currentPassword.length > 0 &&
    hasMinLength &&
    hasUppercase &&
    hasLowercase &&
    hasNumber &&
    hasSpecial &&
    isMatch &&
    isNotSame;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidForm) return;

    setErrorMsg(null);
    setSuccessMsg(null);
    setIsSubmitting(true);

    try {
      const res = await changePassword(currentPassword, newPassword, confirmPassword);
      if (res.success) {
        setSuccessMsg('Password changed successfully! Redirecting to HRMS Dashboard...');
        setTimeout(() => {
          navigate('/');
        }, 1200);
      } else {
        setErrorMsg(res.error || 'Failed to update password.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred updating your password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(circle at 50% 20%, rgba(37, 99, 235, 0.15), transparent 70%), var(--bg-surface)',
        padding: '2rem 1rem',
      }}
    >
      <div style={{ width: '100%', maxWidth: '480px' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, var(--primary-600), #2563eb)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 8px 24px rgba(37, 99, 235, 0.3)',
              marginBottom: '1rem',
            }}
          >
            <KeyRound size={28} />
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
            Create Your New Password
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Welcome, <strong>{user?.fullName || user?.employeeId}</strong>. You must change your temporary password before accessing the HRMS portal.
          </p>
        </div>

        <Card padding="2rem" style={{ border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-xl)' }}>
          {errorMsg && (
            <div style={{ marginBottom: '1.25rem' }}>
              <Alert variant="error">{errorMsg}</Alert>
            </div>
          )}

          {successMsg && (
            <div style={{ marginBottom: '1.25rem' }}>
              <Alert variant="success">{successMsg}</Alert>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Current / Temporary Password */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                Current Temporary Password
              </label>
              <div style={{ position: 'relative' }}>
                <Input
                  type={showCurrent ? 'text' : 'password'}
                  placeholder="Enter temporary password..."
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                  }}
                >
                  {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                New Password
              </label>
              <div style={{ position: 'relative' }}>
                <Input
                  type={showNew ? 'text' : 'password'}
                  placeholder="Enter new strong password..."
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                  }}
                >
                  {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* Password Strength Meter */}
              {newPassword.length > 0 && (
                <div style={{ marginTop: '0.65rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Strength:</span>
                    <strong style={{ color: strengthColor }}>{strengthLabel}</strong>
                  </div>
                  <div style={{ height: '4px', width: '100%', background: 'var(--bg-surface-hover)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${strengthPercentage}%`,
                        background: strengthColor,
                        transition: 'all 0.3s ease',
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Confirm New Password */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                Confirm New Password
              </label>
              <div style={{ position: 'relative' }}>
                <Input
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="Re-enter new password..."
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                  }}
                >
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Password Policy Checklist */}
            <div
              style={{
                background: 'var(--bg-sidebar)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: '0.85rem 1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.4rem',
                fontSize: '0.78125rem',
              }}
            >
              <span style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.1rem' }}>Password Requirements:</span>
              <RequirementItem label="At least 8 characters long" valid={hasMinLength} />
              <RequirementItem label="At least one uppercase letter (A-Z)" valid={hasUppercase} />
              <RequirementItem label="At least one lowercase letter (a-z)" valid={hasLowercase} />
              <RequirementItem label="At least one number (0-9)" valid={hasNumber} />
              <RequirementItem label="At least one special character (@$!%*?&)" valid={hasSpecial} />
              <RequirementItem label="Passwords match exactly" valid={isMatch} />
            </div>

            <Button
              variant="primary"
              type="submit"
              size="lg"
              disabled={!isValidForm || isSubmitting}
              icon={isSubmitting ? undefined : <ShieldCheck size={18} />}
              style={{ width: '100%', marginTop: '0.5rem' }}
            >
              {isSubmitting ? 'Updating Password...' : 'Update Password & Access Dashboard'}
            </Button>

            <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
              <button
                type="button"
                onClick={logout}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  fontSize: '0.8125rem',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                Log out & Return to Login
              </button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

const RequirementItem: React.FC<{ label: string; valid: boolean }> = ({ label, valid }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: valid ? 'var(--success-text)' : 'var(--text-muted)' }}>
    {valid ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
    <span>{label}</span>
  </div>
);

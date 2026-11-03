import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '@hrms/shared';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Clock, RotateCcw, LogOut, AlertCircle } from 'lucide-react';
import { Button } from './ui';

export const DemoBanner: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const isDemo = user?.role === UserRole.DEMO || (user?.role as any) === 'demo' || (user?.role as any) === 'DEMO';

  // Strict 30-minute total session limit (1800 seconds total)
  const [secondsRemaining, setSecondsRemaining] = useState<number>(() => {
    const stored = localStorage.getItem('hrms_demo_expires_at');
    if (stored) {
      const remaining = Math.max(0, Math.floor((Number(stored) - Date.now()) / 1000));
      return remaining > 0 ? remaining : 0;
    }
    const freshExpiry = Date.now() + 30 * 60 * 1000;
    localStorage.setItem('hrms_demo_expires_at', String(freshExpiry));
    return 1800;
  });

  const [isResetting, setIsResetting] = useState<boolean>(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isDemo) return;

    let storedExpiry = Number(localStorage.getItem('hrms_demo_expires_at'));
    if (!storedExpiry || isNaN(storedExpiry)) {
      storedExpiry = Date.now() + 30 * 60 * 1000;
      localStorage.setItem('hrms_demo_expires_at', String(storedExpiry));
    }

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((storedExpiry - Date.now()) / 1000));
      setSecondsRemaining(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        localStorage.removeItem('hrms_demo_expires_at');
        logout();
        navigate('/login?reason=demo_expired');
      }
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [isDemo, logout, navigate]);

  if (!isDemo) return null;

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const timerStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const handleResetData = async () => {
    if (!window.confirm('Reset Demo Data? This will restore all sample employees, attendance, and leave records to original demo state.')) {
      return;
    }

    setIsResetting(true);
    setResetMessage(null);

    try {
      const token = localStorage.getItem('hrms_token');
      const res = await fetch('/api/v1/demo/reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setResetMessage('Demo data reset successfully!');
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        setResetMessage(data.message || 'Could not reset demo data.');
      }
    } catch (err) {
      setResetMessage('Network error resetting demo data.');
    } finally {
      setIsResetting(false);
    }
  };

  const handleExitDemo = () => {
    logout();
    navigate('/login');
  };

  return (
    <div
      style={{
        background: 'linear-gradient(90deg, #1e1b4b 0%, #312e81 40%, #1e3a8a 100%)',
        color: '#f8fafc',
        borderBottom: '1px solid rgba(99, 102, 241, 0.4)',
        padding: '0.5rem 1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
        zIndex: 50,
        fontSize: '0.875rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        <span
          style={{
            background: '#4f46e5',
            color: '#ffffff',
            fontWeight: 700,
            fontSize: '0.75rem',
            padding: '0.2rem 0.55rem',
            borderRadius: '9999px',
            letterSpacing: '0.05em',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            boxShadow: '0 0 12px rgba(79, 70, 229, 0.6)',
          }}
        >
          <Sparkles size={13} /> DEMO MODE
        </span>
        <span style={{ color: '#cbd5e1' }}>
          You have <strong>Full Demo Access</strong> with isolated sample data. Strict 30-minute test limit.
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        {/* Timer */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            color: secondsRemaining < 300 ? '#f87171' : '#93c5fd',
            fontWeight: 600,
            fontSize: '0.85rem',
            background: 'rgba(15, 23, 42, 0.6)',
            padding: '0.25rem 0.65rem',
            borderRadius: '6px',
            border: secondsRemaining < 300 ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.1)',
          }}
          title="Demo access strictly limited to 30 minutes total"
        >
          <Clock size={14} />
          <span>Demo Limit: {timerStr}</span>
        </div>

        {/* Reset Button */}
        <button
          onClick={handleResetData}
          disabled={isResetting}
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            color: '#f8fafc',
            padding: '0.3rem 0.75rem',
            borderRadius: '6px',
            fontSize: '0.8rem',
            fontWeight: 600,
            cursor: isResetting ? 'not-allowed' : 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            transition: 'all 0.2s',
          }}
          title="Restore demo employees, attendance, and leave records to original default state"
        >
          <RotateCcw size={13} className={isResetting ? 'animate-spin' : ''} />
          {isResetting ? 'Resetting...' : 'Reset Demo Data'}
        </button>

        {/* Exit Demo Button */}
        <button
          onClick={handleExitDemo}
          style={{
            background: '#ef4444',
            border: 'none',
            color: '#ffffff',
            padding: '0.3rem 0.75rem',
            borderRadius: '6px',
            fontSize: '0.8rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
          }}
        >
          <LogOut size={13} /> Exit Demo
        </button>
      </div>

      {resetMessage && (
        <div
          style={{
            width: '100%',
            fontSize: '0.8rem',
            color: '#86efac',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            paddingTop: '0.25rem',
          }}
        >
          <AlertCircle size={14} /> {resetMessage}
        </div>
      )}
    </div>
  );
};

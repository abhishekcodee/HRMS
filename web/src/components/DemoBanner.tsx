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

  // 30-minute inactivity timer (1800 seconds)
  const [secondsRemaining, setSecondsRemaining] = useState<number>(1800);
  const [isResetting, setIsResetting] = useState<boolean>(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  const lastActivityRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!isDemo) return;

    // Activity tracking listeners
    const handleActivity = () => {
      lastActivityRef.current = Date.now();
    };

    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('click', handleActivity);
    window.addEventListener('scroll', handleActivity);

    const interval = setInterval(() => {
      const elapsedInactive = Math.floor((Date.now() - lastActivityRef.current) / 1000);
      const remaining = Math.max(0, 1800 - elapsedInactive);
      setSecondsRemaining(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        alert('Your interactive demo session has expired after 30 minutes of inactivity. Logging out...');
        logout();
        navigate('/login');
      }
    }, 1000);

    return () => {
      clearInterval(interval);
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('scroll', handleActivity);
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
          You are exploring <strong>Wokhman HRMS</strong> in interactive read-only mode with isolated sample data.
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
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}
          title="Demo session auto-expires after 30 minutes of inactivity"
        >
          <Clock size={14} />
          <span>Session: {timerStr}</span>
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

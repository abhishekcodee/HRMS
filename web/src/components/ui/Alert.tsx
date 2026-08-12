import React from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export interface AlertProps {
  variant?: 'success' | 'warning' | 'error' | 'info';
  title?: string;
  children: React.ReactNode;
  onClose?: () => void;
  className?: string;
}

export const Alert: React.FC<AlertProps> = ({
  variant = 'info',
  title,
  children,
  onClose,
  className = ''
}) => {
  const getIcon = () => {
    switch (variant) {
      case 'success':
        return <CheckCircle2 size={18} color="var(--success-text)" />;
      case 'warning':
        return <AlertTriangle size={18} color="var(--warning-text)" />;
      case 'error':
        return <AlertCircle size={18} color="var(--error-text)" />;
      case 'info':
      default:
        return <Info size={18} color="var(--info-text)" />;
    }
  };

  const bg = `var(--${variant}-bg)`;
  const border = `var(--${variant}-border)`;
  const text = `var(--${variant}-text)`;

  return (
    <div
      style={{
        backgroundColor: bg,
        border: `1px solid ${border}`,
        borderRadius: 'var(--radius-md)',
        padding: '0.85rem 1rem',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.75rem',
        marginBottom: '1rem'
      }}
      className={className}
    >
      <span style={{ marginTop: '2px', flexShrink: 0 }}>{getIcon()}</span>
      <div style={{ flex: 1 }}>
        {title && (
          <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: text, marginBottom: '0.2rem' }}>
            {title}
          </h4>
        )}
        <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>{children}</div>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: '2px'
          }}
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
};

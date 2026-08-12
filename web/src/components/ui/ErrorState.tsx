import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './Button';

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  message = 'An unexpected error occurred while loading this section. Please try again.',
  onRetry
}) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3rem 1.5rem',
        textAlign: 'center',
        backgroundColor: 'var(--error-bg)',
        border: '1px solid var(--error-border)',
        borderRadius: 'var(--radius-lg)'
      }}
    >
      <AlertCircle size={36} color="var(--error-text)" style={{ marginBottom: '0.75rem' }} />
      <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--error-text)', marginBottom: '0.35rem' }}>
        {title}
      </h3>
      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '420px', textAlign: 'center', marginBottom: '1.25rem' }}>
        {message}
      </p>
      {onRetry && (
        <Button variant="outline" size="sm" icon={<RefreshCw size={14} />} onClick={onRetry}>
          Retry Action
        </Button>
      )}
    </div>
  );
};

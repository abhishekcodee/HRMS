import React from 'react';

export const LoadingSpinner: React.FC<{ size?: 'sm' | 'md' | 'lg'; text?: string }> = ({
  size = 'md',
  text
}) => {
  const px = size === 'sm' ? 18 : size === 'lg' ? 36 : 24;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', padding: '2rem' }}>
      <div
        style={{
          width: `${px}px`,
          height: `${px}px`,
          border: '3px solid var(--border-color)',
          borderTopColor: 'var(--primary-500)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }}
      />
      {text && <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{text}</span>}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

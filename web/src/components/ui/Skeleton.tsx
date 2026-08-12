import React from 'react';

export const Skeleton: React.FC<{ width?: string; height?: string; borderRadius?: string; className?: string }> = ({
  width = '100%',
  height = '20px',
  borderRadius = 'var(--radius-sm)',
  className = ''
}) => {
  return (
    <div
      className={`skeleton ${className}`}
      style={{
        width,
        height,
        borderRadius
      }}
    />
  );
};

export const CardSkeleton: React.FC = () => (
  <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
    <Skeleton width="40%" height="16px" />
    <Skeleton width="70%" height="28px" />
    <Skeleton width="100%" height="14px" />
  </div>
);

export const TableSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1rem' }}>
    {Array.from({ length: rows }).map((_, i) => (
      <Skeleton key={i} width="100%" height="40px" />
    ))}
  </div>
);

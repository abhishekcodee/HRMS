import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  padding?: string;
}

export const Card: React.FC<CardProps> = ({ children, className = '', padding, style, ...props }) => {
  return (
    <div className={`card ${className}`} style={{ padding, ...style }} {...props}>
      {children}
    </div>
  );
};

export const CardHeader: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }} className={className}>
    {children}
  </div>
);

export const CardTitle: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }} className={className}>
    {children}
  </h3>
);

export const CardBody: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={className}>{children}</div>
);

export const CardFooter: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div style={{ marginTop: '1.25rem', paddingTop: '0.85rem', borderTop: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem' }} className={className}>
    {children}
  </div>
);

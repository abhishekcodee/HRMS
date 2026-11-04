import React from 'react';

export interface FormSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export const FormSection: React.FC<FormSectionProps> = ({
  title,
  description,
  children,
  className = ''
}) => {
  return (
    <div
      style={{
        paddingBottom: '1.25rem',
        marginBottom: '1.5rem',
        borderBottom: '1px solid var(--border-color)'
      }}
      className={className}
    >
      <div style={{ marginBottom: '1rem' }}>
        <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{title}</h4>
        {description && (
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
            {description}
          </p>
        )}
      </div>
      <div>{children}</div>
    </div>
  );
};

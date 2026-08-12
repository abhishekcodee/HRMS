import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  required?: boolean;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, required, error, helperText, icon, className = '', id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="form-group">
        {label && (
          <label htmlFor={inputId} className="form-label">
            {label} {required && <span className="required">*</span>}
          </label>
        )}
        <div style={{ position: 'relative' }}>
          {icon && (
            <span
              style={{
                position: 'absolute',
                left: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              {icon}
            </span>
          )}
          <input
            id={inputId}
            ref={ref}
            className={`input ${error ? 'input-error' : ''} ${className}`}
            style={{ paddingLeft: icon ? '2.3rem' : undefined }}
            {...props}
          />
        </div>
        {error && <span className="form-error">{error}</span>}
        {helperText && !error && (
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            {helperText}
          </span>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

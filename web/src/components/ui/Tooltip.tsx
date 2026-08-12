import React, { useState } from 'react';

export interface TooltipProps {
  content: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export const Tooltip: React.FC<TooltipProps> = ({ content, children, position = 'top' }) => {
  const [visible, setVisible] = useState(false);

  if (!content) return <>{children}</>;

  const getPositionStyles = () => {
    switch (position) {
      case 'bottom':
        return { top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: '6px' };
      case 'left':
        return { right: '100%', top: '50%', transform: 'translateY(-50%)', marginRight: '6px' };
      case 'right':
        return { left: '100%', top: '50%', transform: 'translateY(-50%)', marginLeft: '6px' };
      case 'top':
      default:
        return { bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: '6px' };
    }
  };

  return (
    <div
      style={{ position: 'relative', display: 'inline-flex' }}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div
          style={{
            position: 'absolute',
            ...getPositionStyles(),
            backgroundColor: 'var(--bg-sidebar)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-xs)',
            padding: '0.25rem 0.6rem',
            fontSize: '0.75rem',
            fontWeight: 500,
            whiteSpace: 'nowrap',
            zIndex: 100,
            pointerEvents: 'none',
            boxShadow: 'var(--shadow-md)'
          }}
        >
          {content}
        </div>
      )}
    </div>
  );
};

import React, { useState, useRef, useEffect } from 'react';

export interface DropdownItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}

export interface DropdownProps {
  trigger: React.ReactNode;
  items: DropdownItem[];
  align?: 'left' | 'right';
}

export const Dropdown: React.FC<DropdownProps> = ({ trigger, items, align = 'right' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'inline-block' }}>
      <div onClick={() => setIsOpen(!isOpen)} style={{ cursor: 'pointer' }}>
        {trigger}
      </div>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            [align]: 0,
            marginTop: '4px',
            minWidth: '180px',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-lg)',
            zIndex: 60,
            padding: '0.35rem 0',
            animation: 'fadeIn 0.15s ease'
          }}
        >
          {items.map(item => (
            <button
              key={item.id}
              disabled={item.disabled}
              onClick={() => {
                item.onClick();
                setIsOpen(false);
              }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                padding: '0.5rem 0.85rem',
                fontSize: '0.85rem',
                fontWeight: 500,
                color: item.danger
                  ? 'var(--error-text)'
                  : item.disabled
                  ? 'var(--text-disabled)'
                  : 'var(--text-primary)',
                background: 'transparent',
                border: 'none',
                cursor: item.disabled ? 'not-allowed' : 'pointer',
                textAlign: 'left',
                transition: 'background-color 0.15s'
              }}
              onMouseEnter={e => {
                if (!item.disabled) e.currentTarget.style.backgroundColor = 'var(--bg-surface-hover)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              {item.icon && <span>{item.icon}</span>}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

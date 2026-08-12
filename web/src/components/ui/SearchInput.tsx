import React from 'react';
import { Search, X } from 'lucide-react';

export interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onClear?: () => void;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  onClear,
  placeholder = 'Search...',
  className = '',
  ...props
}) => {
  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <Search
        size={16}
        style={{
          position: 'absolute',
          left: '10px',
          top: '50%',
          transform: 'translateY(-50%)',
          color: 'var(--text-muted)'
        }}
      />
      <input
        type="text"
        className={`input ${className}`}
        style={{ paddingLeft: '2.2rem', paddingRight: value ? '2rem' : '0.85rem' }}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        {...props}
      />
      {value && onClear && (
        <button
          type="button"
          onClick={onClear}
          style={{
            position: 'absolute',
            right: '8px',
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: '2px'
          }}
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
};

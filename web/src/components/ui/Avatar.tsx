import React, { useState } from 'react';

export interface AvatarProps {
  name: string;
  src?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  status?: 'online' | 'offline' | 'busy' | 'away';
  className?: string;
  style?: React.CSSProperties;
}

export const Avatar: React.FC<AvatarProps> = ({
  name,
  src,
  size = 'md',
  status,
  className = '',
  style,
}) => {
  const [imageError, setImageError] = useState(false);

  const getInitials = (n: string) => {
    const parts = n.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return n.slice(0, 2).toUpperCase();
  };

  const sizePx = size === 'xs' ? 22 : size === 'sm' ? 32 : size === 'lg' ? 48 : size === 'xl' ? 64 : 40;
  const fontSize = size === 'xs' ? '0.65rem' : size === 'sm' ? '0.75rem' : size === 'lg' ? '1.1rem' : size === 'xl' ? '1.4rem' : '0.9rem';

  return (
    <div
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: `${sizePx}px`,
        height: `${sizePx}px`,
        borderRadius: '50%',
        backgroundColor: 'var(--primary-500)',
        color: '#ffffff',
        fontWeight: 600,
        fontSize,
        flexShrink: 0,
        boxShadow: 'var(--shadow-sm)',
        ...style,
      }}
      className={className}
    >
      {src && !imageError ? (
        <img
          src={src}
          alt={name}
          onError={() => setImageError(true)}
          style={{
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            objectFit: 'cover'
          }}
        />
      ) : (
        <span>{getInitials(name)}</span>
      )}
      {status && (
        <span
          style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: `${Math.max(8, sizePx / 4)}px`,
            height: `${Math.max(8, sizePx / 4)}px`,
            borderRadius: '50%',
            backgroundColor:
              status === 'online'
                ? 'var(--success-text)'
                : status === 'busy'
                ? 'var(--error-text)'
                : status === 'away'
                ? 'var(--warning-text)'
                : 'var(--text-disabled)',
            border: '2px solid var(--bg-surface)'
          }}
        />
      )}
    </div>
  );
};

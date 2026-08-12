import React from 'react';
import { ChevronRight, Home } from 'lucide-react';
import { Link } from 'react-router-dom';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export const Breadcrumbs: React.FC<{ items: BreadcrumbItem[] }> = ({ items }) => {
  return (
    <nav
      aria-label="Breadcrumb"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.4rem',
        fontSize: '0.8rem',
        color: 'var(--text-muted)',
        marginBottom: '0.75rem'
      }}
    >
      <Link
        to="/"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          color: 'var(--text-muted)',
          textDecoration: 'none'
        }}
      >
        <Home size={14} />
      </Link>
      {items.map((item, index) => (
        <React.Fragment key={index}>
          <ChevronRight size={12} color="var(--text-disabled)" />
          {item.href ? (
            <Link
              to={item.href}
              style={{
                color: 'var(--text-secondary)',
                textDecoration: 'none',
                fontWeight: 500
              }}
            >
              {item.label}
            </Link>
          ) : (
            <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{item.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
};

import React from 'react';

export interface TabItem {
  id: string;
  label: string;
  count?: number;
  icon?: React.ReactNode;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, onChange, className = '' }) => {
  return (
    <div className={`tab-list ${className}`}>
      {tabs.map(tab => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            className={`tab-btn ${isActive ? 'active' : ''}`}
            onClick={() => onChange(tab.id)}
            type="button"
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
              {tab.icon && tab.icon}
              {tab.label}
              {tab.count !== undefined && (
                <span
                  style={{
                    fontSize: '0.725rem',
                    padding: '0.1rem 0.45rem',
                    borderRadius: 'var(--radius-full)',
                    backgroundColor: isActive ? 'var(--primary-glow)' : 'var(--bg-surface-hover)',
                    color: isActive ? 'var(--primary-500)' : 'var(--text-muted)'
                  }}
                >
                  {tab.count}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
};

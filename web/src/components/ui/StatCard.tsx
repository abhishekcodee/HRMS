import React from 'react';

export interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  subtext?: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  subtext,
  change,
  changeType = 'neutral',
  onClick
}) => {
  return (
    <div
      className="stat-card"
      style={{ cursor: onClick ? 'pointer' : 'default' }}
      onClick={onClick}
    >
      <div className="stat-header">
        <span className="stat-title">{title}</span>
        <div className="stat-icon">{icon}</div>
      </div>
      <div className="stat-value">{value}</div>
      {(subtext || change) && (
        <div className="stat-footer">
          {change && (
            <span
              style={{
                fontWeight: 600,
                color:
                  changeType === 'positive'
                    ? 'var(--success-text)'
                    : changeType === 'negative'
                    ? 'var(--error-text)'
                    : 'var(--text-muted)'
              }}
            >
              {change}
            </span>
          )}
          {subtext && <span>{subtext}</span>}
        </div>
      )}
    </div>
  );
};

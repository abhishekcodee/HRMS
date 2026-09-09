import React from 'react';

export interface PageBreakDividerProps {
  pageNumber?: number;
  totalPages?: number;
  label?: string;
  style?: React.CSSProperties;
}

export const PageBreakDivider: React.FC<PageBreakDividerProps> = ({
  pageNumber,
  totalPages,
  label = 'PAGE BREAK',
  style,
}) => {
  return (
    <div
      className="page-break-divider no-print"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        margin: '20px 0',
        userSelect: 'none',
        width: '100%',
        ...style,
      }}
    >
      <div style={{ flex: 1, borderBottom: '2px dashed #64748B' }} />
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          background: '#0F172A',
          color: '#38BDF8',
          padding: '6px 16px',
          borderRadius: '20px',
          border: '1px solid #334155',
          fontSize: '11px',
          fontWeight: 700,
          letterSpacing: '0.08em',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        }}
      >
        <span style={{ fontSize: '13px' }}>✂️</span>
        <span>{label}</span>
        {pageNumber && totalPages ? (
          <>
            <span style={{ color: '#64748B' }}>•</span>
            <span style={{ color: '#94A3B8' }}>PAGE {pageNumber} OF {totalPages}</span>
          </>
        ) : null}
      </div>
      <div style={{ flex: 1, borderBottom: '2px dashed #64748B' }} />
    </div>
  );
};

export default PageBreakDivider;

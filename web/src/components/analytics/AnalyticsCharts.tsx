import React from 'react';

export interface DataPoint {
  label: string;
  value: number;
  color?: string;
  subText?: string;
}

export const EmptyChartState: React.FC<{ message?: string }> = ({
  message = 'No data available for the selected period.',
}) => (
  <div
    style={{
      height: 240,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(255, 255, 255, 0.02)',
      borderRadius: 12,
      border: '1px dashed var(--border-color, #334155)',
      color: 'var(--text-muted, #94a3b8)',
      padding: '1.5rem',
      textAlign: 'center',
    }}
  >
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: 12, opacity: 0.6 }}>
      <path d="M3 3v18h18" />
      <path d="M18 17V9" />
      <path d="M13 17V5" />
      <path d="M8 17v-3" />
    </svg>
    <div style={{ fontSize: '0.925rem', fontWeight: 500 }}>{message}</div>
    <div style={{ fontSize: '0.775rem', marginTop: 4, opacity: 0.7 }}>Try adjusting your filters or date range.</div>
  </div>
);

/**
 * Responsive Interactive Line Chart
 */
export const ResponsiveLineChart: React.FC<{
  data: DataPoint[];
  height?: number;
  color?: string;
  valuePrefix?: string;
  valueSuffix?: string;
}> = ({ data, height = 240, color = '#6366f1', valuePrefix = '', valueSuffix = '' }) => {
  if (!data || data.length === 0) return <EmptyChartState />;

  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const padding = 40;
  const chartWidth = 500;
  const chartHeight = height - padding * 2;

  const points = data.map((d, idx) => {
    const x = padding + (idx / Math.max(data.length - 1, 1)) * (chartWidth - padding * 2);
    const y = height - padding - (d.value / maxValue) * chartHeight;
    return { x, y, ...d };
  });

  const pathD = points.reduce(
    (acc, p, idx) => (idx === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`),
    ''
  );

  const areaD = `${pathD} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <svg viewBox={`0 0 ${chartWidth} ${height}`} style={{ width: '100%', height: 'auto', minWidth: 320 }}>
        <defs>
          <linearGradient id={`grad-${color}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.35" />
            <stop offset="100%" stopColor={color} stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
          const y = padding + i * (chartHeight / 4);
          const val = Math.round(maxValue * (1 - ratio));
          return (
            <g key={i}>
              <line x1={padding} y1={y} x2={chartWidth - padding} y2={y} stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
              <text x={padding - 8} y={y + 4} fill="#64748b" fontSize="10" textAnchor="end">
                {valuePrefix}{val}{valueSuffix}
              </text>
            </g>
          );
        })}

        {/* Area fill & line */}
        <path d={areaD} fill={`url(#grad-${color})`} />
        <path d={pathD} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

        {/* Interactive Data points */}
        {points.map((p, idx) => (
          <g key={idx} className="chart-point-group">
            <circle cx={p.x} cy={p.y} r="5" fill="#0f172a" stroke={color} strokeWidth="3" />
            <text x={p.x} y={height - 12} fill="#94a3b8" fontSize="10" textAnchor="middle">
              {p.label}
            </text>
            <title>{`${p.label}: ${valuePrefix}${p.value}${valueSuffix}`}</title>
          </g>
        ))}
      </svg>
    </div>
  );
};

/**
 * Responsive Interactive Bar Chart
 */
export const ResponsiveBarChart: React.FC<{
  data: DataPoint[];
  height?: number;
  barColor?: string;
  valuePrefix?: string;
  valueSuffix?: string;
}> = ({ data, height = 240, barColor = '#3b82f6', valuePrefix = '', valueSuffix = '' }) => {
  if (!data || data.length === 0) return <EmptyChartState />;

  const maxValue = Math.max(...data.map((d) => d.value), 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem', width: '100%', padding: '0.5rem 0' }}>
      {data.map((item, idx) => {
        const pct = Math.min(100, Math.max(4, (item.value / maxValue) * 100));
        return (
          <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 500 }}>
              <span style={{ color: 'var(--text-color, #e2e8f0)' }}>{item.label}</span>
              <span style={{ color: 'var(--primary-color, #6366f1)', fontWeight: 600 }}>
                {valuePrefix}{item.value.toLocaleString()}{valueSuffix}
              </span>
            </div>
            <div style={{ height: 10, background: 'rgba(255,255,255,0.06)', borderRadius: 6, overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${pct}%`,
                  background: item.color || barColor,
                  borderRadius: 6,
                  transition: 'width 0.6s ease-out',
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

/**
 * Responsive Donut / Pie Chart
 */
export const ResponsiveDonutChart: React.FC<{
  data: DataPoint[];
  title?: string;
}> = ({ data }) => {
  if (!data || data.length === 0) return <EmptyChartState />;

  const total = data.reduce((sum, d) => sum + d.value, 0);
  const colors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1.5rem', flexWrap: 'wrap' }}>
      <div style={{ flex: '1 1 200rem', minWidth: 200, display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
        {data.map((item, idx) => {
          const c = item.color || colors[idx % colors.length];
          const pct = total > 0 ? ((item.value / total) * 100).toFixed(1) : '0';
          return (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />
                <span>{item.label}</span>
              </div>
              <div style={{ fontWeight: 600 }}>
                {item.value} <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 400 }}>({pct}%)</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/**
 * Recruitment Funnel Chart
 */
export const RecruitmentFunnelChart: React.FC<{
  stages: { stage: string; count: number }[];
}> = ({ stages }) => {
  if (!stages || stages.length === 0) return <EmptyChartState message="No recruitment pipeline data recorded." />;

  const maxCount = Math.max(...stages.map((s) => s.count), 1);
  const colors = ['#6366f1', '#4f46e5', '#4338ca', '#3730a3', '#10b981', '#059669', '#047857'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%' }}>
      {stages.map((item, idx) => {
        const widthPct = Math.max(15, Math.round((item.count / maxCount) * 100));
        return (
          <div
            key={idx}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto',
              width: `${widthPct}%`,
              minWidth: 160,
              padding: '0.625rem 1rem',
              borderRadius: 8,
              background: colors[idx % colors.length],
              color: '#fff',
              fontWeight: 600,
              fontSize: '0.85rem',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
              transition: 'transform 0.2s',
            }}
          >
            <span>{item.stage}: </span>
            <span style={{ marginLeft: 6, opacity: 0.95 }}>{item.count}</span>
          </div>
        );
      })}
    </div>
  );
};

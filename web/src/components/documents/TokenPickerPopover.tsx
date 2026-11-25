import React, { useState } from 'react';
import { Search, Tag, Check, Copy } from 'lucide-react';

export interface TokenItem {
  token: string;
  label: string;
  category: 'employee' | 'company' | 'letter' | 'salary';
  sampleValue: string;
}

export const TOKEN_LIBRARY: TokenItem[] = [
  // Employee
  { token: '{{employee.full_name}}', label: 'Employee Full Name', category: 'employee', sampleValue: 'Sample Employee' },
  { token: '{{employee.first_name}}', label: 'Employee First Name', category: 'employee', sampleValue: 'Abhishek' },
  { token: '{{employee.code}}', label: 'Employee Code / ID', category: 'employee', sampleValue: 'AMPL-00125' },
  { token: '{{employee.designation}}', label: 'Designation', category: 'employee', sampleValue: 'Software Developer' },
  { token: '{{employee.department}}', label: 'Department', category: 'employee', sampleValue: 'Technology' },
  { token: '{{employee.joining_date}}', label: 'Joining Date (Formal)', category: 'employee', sampleValue: '01 September 2026' },
  { token: '{{employee.work_location}}', label: 'Work Location / Posting', category: 'employee', sampleValue: 'Navi Mumbai Works' },
  { token: '{{employee.probation_period}}', label: 'Probation Period', category: 'employee', sampleValue: '6 Months' },
  { token: '{{employee.notice_period}}', label: 'Notice Period', category: 'employee', sampleValue: '30 Days' },
  { token: '{{employee.working_hours}}', label: 'Working Hours', category: 'employee', sampleValue: '9:00 AM – 6:00 PM' },
  { token: '{{employee.weekly_off}}', label: 'Weekly Off', category: 'employee', sampleValue: 'Sunday' },
  { token: '{{employee.reporting_manager}}', label: 'Reporting Manager', category: 'employee', sampleValue: 'Rajesh Sharma' },
  { token: '{{employee.grade}}', label: 'Employee Grade', category: 'employee', sampleValue: 'M3 / Staff' },

  // Company
  { token: '{{company.name}}', label: 'Legal Company Name', category: 'company', sampleValue: 'Apex Metal Fabricators Pvt. Ltd.' },
  { token: '{{company.code}}', label: 'Company Short Code', category: 'company', sampleValue: 'AM' },
  { token: '{{company.cin}}', label: 'CIN Number', category: 'company', sampleValue: 'U28112MH2015PTC261234' },
  { token: '{{company.gstin}}', label: 'GSTIN Number', category: 'company', sampleValue: '27AABCA1234F1ZP' },
  { token: '{{company.pan}}', label: 'PAN Number', category: 'company', sampleValue: 'AABCA1234F' },
  { token: '{{company.address}}', label: 'Registered / Works Address', category: 'company', sampleValue: 'Plot 42, Rabale MIDC, Navi Mumbai' },

  // Letter
  { token: '{{letter.ref_number}}', label: 'Reference Number', category: 'letter', sampleValue: 'AM/HR/APPT/2026-27/0001' },
  { token: '{{letter.generated_date}}', label: 'Issue Date (Formal)', category: 'letter', sampleValue: '28 August 2026' },
  { token: '{{letter.financial_year}}', label: 'Financial Year', category: 'letter', sampleValue: '2026-27' },

  // Salary
  { token: '{{salary.ctc_annual|inr}}', label: 'Annual CTC (Formatted INR)', category: 'salary', sampleValue: '₹6,00,000' },
  { token: '{{salary.ctc_annual|words}}', label: 'Annual CTC in Words', category: 'salary', sampleValue: 'Rupees Six Lakh Only' },
  { token: '{{salary.gross_monthly|inr}}', label: 'Gross Monthly Salary', category: 'salary', sampleValue: '₹50,000' },
  { token: '{{salary.basic_monthly|inr}}', label: 'Basic Monthly Salary', category: 'salary', sampleValue: '₹25,000' },
  { token: '{{salary.hra_monthly|inr}}', label: 'HRA Monthly', category: 'salary', sampleValue: '₹12,500' },
  { token: '{{salary.special_allowance_monthly|inr}}', label: 'Special Allowance Monthly', category: 'salary', sampleValue: '₹12,500' },
];

interface TokenPickerPopoverProps {
  onSelectToken: (token: string) => void;
  onClose?: () => void;
}

export const TokenPickerPopover: React.FC<TokenPickerPopoverProps> = ({ onSelectToken, onClose }) => {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | 'employee' | 'company' | 'letter' | 'salary'>('all');
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const filteredTokens = TOKEN_LIBRARY.filter((item) => {
    const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
    const matchesSearch =
      item.token.toLowerCase().includes(search.toLowerCase()) ||
      item.label.toLowerCase().includes(search.toLowerCase()) ||
      item.sampleValue.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handlePick = (tokenStr: string) => {
    onSelectToken(tokenStr);
    setCopiedToken(tokenStr);
    setTimeout(() => setCopiedToken(null), 1500);
    if (onClose) onClose();
  };

  return (
    <div
      style={{
        width: '340px',
        backgroundColor: 'var(--bg-card, #1E293B)',
        border: '1px solid var(--border-color, #334155)',
        borderRadius: '8px',
        boxShadow: '0 12px 28px rgba(0,0,0,0.4)',
        padding: '0.75rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.65rem',
        color: 'var(--text-primary, #F8FAFC)',
        fontSize: '0.8rem',
        zIndex: 1000,
      }}
    >
      {/* Header & Search */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <strong style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--primary-400, #60A5FA)' }}>
          <Tag size={15} /> Insert Data Token
        </strong>
        {onClose && (
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.1rem' }}
          >
            ×
          </button>
        )}
      </div>

      <div style={{ position: 'relative' }}>
        <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
        <input
          type="text"
          placeholder="Search tokens e.g. name, CTC, FY..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: '100%',
            padding: '0.4rem 0.5rem 0.4rem 2.1rem',
            borderRadius: '6px',
            border: '1px solid var(--border-color, #475569)',
            backgroundColor: 'var(--bg-app, #0F172A)',
            color: '#F8FAFC',
            fontSize: '0.775rem',
            outline: 'none',
          }}
          autoFocus
        />
      </div>

      {/* Category Pills */}
      <div style={{ display: 'flex', gap: '0.25rem', overflowX: 'auto', paddingBottom: '0.2rem' }}>
        {(['all', 'employee', 'company', 'letter', 'salary'] as const).map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            style={{
              padding: '0.2rem 0.5rem',
              borderRadius: '12px',
              fontSize: '0.7rem',
              fontWeight: 600,
              textTransform: 'capitalize',
              cursor: 'pointer',
              border: 'none',
              backgroundColor: activeCategory === cat ? 'var(--primary-600, #2563EB)' : 'var(--bg-app, #334155)',
              color: '#FFFFFF',
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Token List */}
      <div style={{ maxHeight: '220px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
        {filteredTokens.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '1rem', color: '#94A3B8', fontSize: '0.75rem' }}>
            No tokens matching "{search}"
          </div>
        ) : (
          filteredTokens.map((item) => (
            <div
              key={item.token}
              onClick={() => handlePick(item.token)}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.45rem 0.6rem',
                borderRadius: '6px',
                backgroundColor: 'var(--bg-app, #0F172A)',
                border: '1px solid transparent',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--primary-500, #3B82F6)';
                e.currentTarget.style.backgroundColor = '#1E293B';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'transparent';
                e.currentTarget.style.backgroundColor = 'var(--bg-app, #0F172A)';
              }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.775rem', color: '#F1F5F9' }}>{item.label}</div>
                <div style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: '#60A5FA' }}>{item.token}</div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.675rem', color: '#94A3B8' }}>{item.sampleValue}</div>
                {copiedToken === item.token ? (
                  <span style={{ fontSize: '0.65rem', color: '#4ADE80', display: 'flex', alignItems: 'center', gap: '0.15rem' }}>
                    <Check size={10} /> Inserted
                  </span>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default TokenPickerPopover;

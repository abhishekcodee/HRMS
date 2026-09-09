import React from 'react';
import { CompanyLetterheadInfo } from './MultiDocumentPreview';

export interface PayslipItem {
  label: string;
  amount: number | string;
}

export interface PayslipData {
  companyName?: string;
  companyAddress?: string;
  companyLogo?: string;

  payMonthYear?: string; // e.g. "Aug 2026" or "August 2026"
  employeeName?: string;
  employeeCode?: string;
  designation?: string;
  workedDays?: number | string; // e.g. 28.00
  joiningDate?: string; // e.g. "1-Nov-2025"
  uanNo?: string; // e.g. "102215947068"

  // Leave Balances
  prevBalLeaves?: number | string; // e.g. 5.50
  enjoyedLeaves?: number | string; // e.g. 4.50
  balanceLeaves?: number | string; // e.g. 1.00
  balanceWoff?: number | string; // e.g. "-"

  // Earnings
  basicSalary?: number;
  hra?: number;
  lta?: number;
  arrears?: number;
  otherAllowance?: number;
  customEarnings?: PayslipItem[];

  // Deductions
  providentFund?: number;
  esic?: number;
  mlwf?: number;
  professionalTax?: number;
  advanceLoan?: number;
  tds?: number;
  customDeductions?: PayslipItem[];

  // Totals & Net
  totalEarnings?: number;
  totalDeductions?: number;
  netSalaryPaid?: number;

  // Footer / Bank details
  amountInWords?: string;
  paymentMode?: string;
  bankAccountNo?: string;
  bankName?: string;
  dateOfBirth?: string;

  companyStampLogo?: string;
  watermarkText?: string;
}

interface PayslipPreviewProps {
  data: PayslipData;
  scale?: number;
  isEmbedded?: boolean;
  hideHeader?: boolean;
  activeLetterhead?: CompanyLetterheadInfo | null;
}

/**
 * Converts a numeric amount to Indian English Words
 * E.g. 18610 => "Rupees Eighteen Thousand Six Hundred Ten Only"
 */
export function convertToIndianWords(amount: number): string {
  const num = Math.round(amount || 0);
  if (isNaN(num) || num === 0) return 'Rupees Zero Only';

  const singleDigits = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const teenDigits = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tensDigits = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertTwoDigits(n: number): string {
    if (n < 10) return singleDigits[n];
    if (n >= 10 && n < 20) return teenDigits[n - 10];
    const ten = Math.floor(n / 10);
    const rest = n % 10;
    return (tensDigits[ten] + ' ' + singleDigits[rest]).trim();
  }

  function convertThreeDigits(n: number): string {
    const hundred = Math.floor(n / 100);
    const rest = n % 100;
    let res = '';
    if (hundred > 0) res += singleDigits[hundred] + ' Hundred ';
    if (rest > 0) res += convertTwoDigits(rest);
    return res.trim();
  }

  let crore = Math.floor(num / 10000000);
  let remainder = num % 10000000;
  let lakh = Math.floor(remainder / 100000);
  remainder = remainder % 100000;
  let thousand = Math.floor(remainder / 1000);
  remainder = remainder % 1000;

  let words = '';
  if (crore > 0) words += convertThreeDigits(crore) + ' Crore ';
  if (lakh > 0) words += convertTwoDigits(lakh) + ' Lakh ';
  if (thousand > 0) words += convertTwoDigits(thousand) + ' Thousand ';
  if (remainder > 0) words += convertThreeDigits(remainder);

  return `Rupees ${words.trim()} Only`;
}

export const PayslipPreview: React.FC<PayslipPreviewProps> = ({
  data,
  scale = 1,
  isEmbedded = false,
  activeLetterhead = null,
}) => {
  const {
    companyName = 'ABSOLUTE MOTION PVT LTD',
    companyAddress = 'Address: R-601, Midc TTC Area, Near Hitech Radiator Tank Division, Navi Mumbai, Maharashtra 400701',
    companyLogo = '',

    payMonthYear = 'Aug 2026',
    employeeName = 'ABHISHEK UPADHYAY',
    employeeCode = 'AMPL-00088',
    designation = 'IOT Developer',
    workedDays = '28.00',
    joiningDate = '1-Nov-2025',
    uanNo = '102215947068',

    prevBalLeaves = '5.50',
    enjoyedLeaves = '4.50',
    balanceLeaves = '1.00',
    balanceWoff = '-',

    basicSalary = 16205,
    hra = 2405,
    lta = 0,
    arrears = 0,
    otherAllowance = 0,
    customEarnings = [],

    providentFund = 1800,
    esic = 140,
    mlwf = 0,
    professionalTax = 200,
    advanceLoan = 0,
    tds = 0,
    customDeductions = [],

    amountInWords = '',
    paymentMode = 'Bank Transfer',
    bankAccountNo = '060222010003352',
    bankName = 'Union Bank of India',
    dateOfBirth = '20-Jul-2004',

    companyStampLogo = '',
    watermarkText = '',
  } = data;

  // Compute total earnings if not specified
  const computedEarnings =
    basicSalary +
    hra +
    lta +
    arrears +
    otherAllowance +
    customEarnings.reduce((acc, item) => acc + (typeof item.amount === 'number' ? item.amount : parseFloat(String(item.amount || 0))), 0);

  const totalEarningsVal = data.totalEarnings !== undefined ? data.totalEarnings : computedEarnings;

  // Compute total deductions if not specified
  const computedDeductions =
    providentFund +
    esic +
    mlwf +
    professionalTax +
    advanceLoan +
    tds +
    customDeductions.reduce((acc, item) => acc + (typeof item.amount === 'number' ? item.amount : parseFloat(String(item.amount || 0))), 0);

  const totalDeductionsVal = data.totalDeductions !== undefined ? data.totalDeductions : computedDeductions;

  // Compute net salary
  const netSalaryPaidVal = data.netSalaryPaid !== undefined ? data.netSalaryPaid : totalEarningsVal - totalDeductionsVal;

  const displayWords = amountInWords || convertToIndianWords(totalEarningsVal || netSalaryPaidVal);

  const formatAmt = (val: number | string | undefined): string => {
    if (val === undefined || val === null || val === '' || val === 0 || val === '0' || val === '-') {
      return '-';
    }
    const num = typeof val === 'number' ? val : parseFloat(String(val));
    if (isNaN(num) || num === 0) return '-';
    return num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const margins = activeLetterhead?.margins || { top: 48, bottom: 60, left: 20, right: 20 };
  const hasLetterhead = Boolean(activeLetterhead && activeLetterhead.fileUrl);
  const leftPaddingMm = hasLetterhead ? Math.max(margins.left || 20, 20) : 10;
  const rightPaddingMm = hasLetterhead ? Math.max(margins.right || 20, 20) : 10;
  const topPaddingMm = hasLetterhead ? Math.max(margins.top || 48, 48) : 10;
  const bottomPaddingMm = hasLetterhead ? Math.max(margins.bottom || 60, 60) : 10;

  return (
    <div style={{ transform: isEmbedded ? 'none' : `scale(${scale})`, transformOrigin: 'top center' }}>
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 0; }
          body { background: white !important; margin: 0 !important; }
          .payslip-page {
            box-shadow: none !important;
            width: 210mm !important;
            min-height: 297mm !important;
            margin: 0 !important;
            padding: 10mm !important;
          }
        }
      `}</style>

      <div
        className="payslip-page"
        style={{
          width: '210mm',
          minWidth: '210mm',
          maxWidth: '210mm',
          minHeight: '297mm',
          height: '297mm',
          margin: '0 auto 24px auto',
          backgroundColor: '#FFFFFF',
          color: '#000000',
          fontFamily: "'Times New Roman', Times, serif, Arial, sans-serif",
          fontSize: '10.5pt',
          lineHeight: 1.35,
          boxSizing: 'border-box',
          boxShadow: isEmbedded ? '0 4px 20px rgba(0,0,0,0.15)' : '0 10px 30px rgba(0,0,0,0.15)',
          position: 'relative',
          paddingTop: `${topPaddingMm}mm`,
          paddingBottom: `${bottomPaddingMm}mm`,
          paddingLeft: `${leftPaddingMm}mm`,
          paddingRight: `${rightPaddingMm}mm`,
          overflow: 'hidden',
        }}
      >
        {/* Render Letterhead Background if active */}
        {hasLetterhead && activeLetterhead?.fileUrl && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
              zIndex: 0,
              overflow: 'hidden',
            }}
          >
            <img
              src={activeLetterhead.fileUrl}
              alt="Company Letterhead Background"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          </div>
        )}

        {/* Outer Rectangular Border Box matching the PDF exact style */}
        <div
          style={{
            border: '1.5px solid #000000',
            width: '100%',
            position: 'relative',
            boxSizing: 'border-box',
            backgroundColor: '#FFFFFF',
          }}
        >
          {/* Watermark if present */}
          {watermarkText && (
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%) rotate(-30deg)',
                opacity: 0.04,
                pointerEvents: 'none',
                zIndex: 0,
                fontSize: '70pt',
                fontWeight: 900,
                color: '#000000',
                letterSpacing: '0.1em',
                whiteSpace: 'nowrap',
              }}
            >
              {watermarkText}
            </div>
          )}

          {/* 1. Header Section */}
          <div style={{ padding: '10px 14px 6px 14px', borderBottom: '1.5px solid #000000' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: '50px' }}>
              {/* Logo Area */}
              <div style={{ flex: '0 0 200px', display: 'flex', alignItems: 'center' }}>
                {companyLogo ? (
                  <img src={companyLogo} alt="Company Logo" style={{ maxHeight: '42px', maxWidth: '190px', objectFit: 'contain' }} />
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '6px',
                        background: 'linear-gradient(135deg, #10B981 0%, #3B82F6 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#FFFFFF',
                        fontWeight: 900,
                        fontSize: '14px',
                      }}
                    >
                      AM
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#1E293B', lineHeight: 1.1 }}>
                        {companyName}
                      </div>
                      <div style={{ fontSize: '9px', color: '#3B82F6', fontWeight: 600 }}>Pvt. Ltd.</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Company Title */}
              <div style={{ textTransform: 'uppercase', fontSize: '18pt', fontWeight: 900, color: '#000000', letterSpacing: '0.02em', textAlign: 'right' }}>
                {companyName}
              </div>
            </div>
          </div>

          {/* Company Address Strip */}
          <div
            style={{
              padding: '6px 10px',
              textAlign: 'center',
              fontWeight: 'bold',
              fontSize: '10pt',
              borderBottom: '1.5px solid #000000',
              backgroundColor: '#FFFFFF',
            }}
          >
            {companyAddress}
          </div>

          {/* Document Title Strip */}
          <div
            style={{
              padding: '6px 10px',
              textAlign: 'center',
              fontWeight: 'bold',
              fontSize: '12pt',
              borderBottom: '1.5px solid #000000',
              backgroundColor: '#FFFFFF',
            }}
          >
            Pay Slip for month of {payMonthYear}
          </div>

          {/* 2. Employee Details Grid */}
          <div style={{ borderBottom: '1.5px solid #000000' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10pt' }}>
              <tbody>
                <tr>
                  <td style={{ padding: '6px 10px', borderRight: '1px solid #000000', width: '50%' }}>
                    <strong>Name of Employee:</strong> {employeeName}
                  </td>
                  <td style={{ padding: '6px 10px', width: '50%' }}>
                    <strong>Employee Code:</strong> {employeeCode}
                  </td>
                </tr>
                <tr style={{ borderTop: '1px solid #000000' }}>
                  <td style={{ padding: '6px 10px', borderRight: '1px solid #000000' }}>
                    <strong>Designation:</strong> {designation}
                  </td>
                  <td style={{ padding: '6px 10px' }}>
                    <strong>Worked Days/Paid :</strong> {workedDays} Days
                  </td>
                </tr>
                <tr style={{ borderTop: '1px solid #000000' }}>
                  <td style={{ padding: '6px 10px', borderRight: '1px solid #000000' }}>
                    <strong>Employee DOJ:</strong> {joiningDate}
                  </td>
                  <td style={{ padding: '6px 10px' }}>
                    <strong>Employee UAN No.:</strong> {uanNo}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 3. Leave Balance Summary Strip */}
          <div style={{ borderBottom: '1.5px solid #000000' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9.5pt', textAlign: 'center' }}>
              <thead>
                <tr style={{ fontWeight: 'bold' }}>
                  <td style={{ padding: '5px 8px', borderRight: '1px solid #000000', width: '22%' }}>Prev. Bal. leaves</td>
                  <td style={{ padding: '5px 8px', borderRight: '1px solid #000000', width: '18%' }}>(-) Enjoy Leaves</td>
                  <td style={{ padding: '5px 8px', borderRight: '1px solid #000000', width: '10%' }}>=</td>
                  <td style={{ padding: '5px 8px', borderRight: '1px solid #000000', width: '25%' }}>Balance Leaves</td>
                  <td style={{ padding: '5px 8px', width: '25%' }}>Balance W-off</td>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderTop: '1px solid #000000', fontWeight: 'bold' }}>
                  <td style={{ padding: '5px 8px', borderRight: '1px solid #000000' }}>{prevBalLeaves}</td>
                  <td style={{ padding: '5px 8px', borderRight: '1px solid #000000' }}>{enjoyedLeaves}</td>
                  <td style={{ padding: '5px 8px', borderRight: '1px solid #000000' }}></td>
                  <td style={{ padding: '5px 8px', borderRight: '1px solid #000000' }}>{balanceLeaves}</td>
                  <td style={{ padding: '5px 8px' }}>{balanceWoff}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 4. Earnings vs Deductions Table */}
          <div style={{ borderBottom: '1.5px solid #000000' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10pt' }}>
              <thead>
                <tr style={{ fontWeight: 'bold', borderBottom: '1.5px solid #000000' }}>
                  <th style={{ padding: '6px 10px', textAlign: 'left', width: '32%', borderRight: '1px solid #000000' }}>EARNINGS</th>
                  <th style={{ padding: '6px 10px', textAlign: 'right', width: '18%', borderRight: '1.5px solid #000000' }}>Amount in (Rs)</th>
                  <th style={{ padding: '6px 10px', textAlign: 'left', width: '32%', borderRight: '1px solid #000000' }}>DEDUCTIONS</th>
                  <th style={{ padding: '6px 10px', textAlign: 'right', width: '18%' }}>Amount in (Rs)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ padding: '4px 10px', borderRight: '1px solid #000000' }}>Basic Salary</td>
                  <td style={{ padding: '4px 10px', textAlign: 'right', borderRight: '1.5px solid #000000' }}>{formatAmt(basicSalary)}</td>
                  <td style={{ padding: '4px 10px', borderRight: '1px solid #000000' }}>Provident Fund</td>
                  <td style={{ padding: '4px 10px', textAlign: 'right' }}>{formatAmt(providentFund)}</td>
                </tr>
                <tr>
                  <td style={{ padding: '4px 10px', borderRight: '1px solid #000000' }}>HRA</td>
                  <td style={{ padding: '4px 10px', textAlign: 'right', borderRight: '1.5px solid #000000' }}>{formatAmt(hra)}</td>
                  <td style={{ padding: '4px 10px', borderRight: '1px solid #000000' }}>ESIC</td>
                  <td style={{ padding: '4px 10px', textAlign: 'right' }}>{formatAmt(esic)}</td>
                </tr>
                <tr>
                  <td style={{ padding: '4px 10px', borderRight: '1px solid #000000' }}>LTA</td>
                  <td style={{ padding: '4px 10px', textAlign: 'right', borderRight: '1.5px solid #000000' }}>{formatAmt(lta)}</td>
                  <td style={{ padding: '4px 10px', borderRight: '1px solid #000000' }}>MLWF</td>
                  <td style={{ padding: '4px 10px', textAlign: 'right' }}>{formatAmt(mlwf)}</td>
                </tr>
                <tr>
                  <td style={{ padding: '4px 10px', borderRight: '1px solid #000000' }}>Arrears</td>
                  <td style={{ padding: '4px 10px', textAlign: 'right', borderRight: '1.5px solid #000000' }}>{formatAmt(arrears)}</td>
                  <td style={{ padding: '4px 10px', borderRight: '1px solid #000000' }}>Professional Tax</td>
                  <td style={{ padding: '4px 10px', textAlign: 'right' }}>{formatAmt(professionalTax)}</td>
                </tr>
                <tr>
                  <td style={{ padding: '4px 10px', borderRight: '1px solid #000000' }}>Other Allowance</td>
                  <td style={{ padding: '4px 10px', textAlign: 'right', borderRight: '1.5px solid #000000' }}>{formatAmt(otherAllowance)}</td>
                  <td style={{ padding: '4px 10px', borderRight: '1px solid #000000' }}>Advance / Loan</td>
                  <td style={{ padding: '4px 10px', textAlign: 'right' }}>{formatAmt(advanceLoan)}</td>
                </tr>

                {/* Render custom earnings / deductions if provided */}
                {customEarnings.map((item, idx) => (
                  <tr key={`ce-${idx}`}>
                    <td style={{ padding: '4px 10px', borderRight: '1px solid #000000' }}>{item.label}</td>
                    <td style={{ padding: '4px 10px', textAlign: 'right', borderRight: '1.5px solid #000000' }}>{formatAmt(item.amount)}</td>
                    <td style={{ padding: '4px 10px', borderRight: '1px solid #000000' }}>
                      {customDeductions[idx] ? customDeductions[idx].label : ''}
                    </td>
                    <td style={{ padding: '4px 10px', textAlign: 'right' }}>
                      {customDeductions[idx] ? formatAmt(customDeductions[idx].amount) : ''}
                    </td>
                  </tr>
                ))}

                <tr>
                  <td style={{ padding: '4px 10px', borderRight: '1px solid #000000' }}></td>
                  <td style={{ padding: '4px 10px', textAlign: 'right', borderRight: '1.5px solid #000000' }}></td>
                  <td style={{ padding: '4px 10px', borderRight: '1px solid #000000' }}>TDS</td>
                  <td style={{ padding: '4px 10px', textAlign: 'right' }}>{formatAmt(tds)}</td>
                </tr>

                {/* Extra spacer rows to match exact full-page proportions */}
                <tr style={{ height: '60px' }}>
                  <td style={{ borderRight: '1px solid #000000' }}></td>
                  <td style={{ borderRight: '1.5px solid #000000' }}></td>
                  <td style={{ borderRight: '1px solid #000000' }}></td>
                  <td></td>
                </tr>

                {/* Totals Row */}
                <tr style={{ fontWeight: 'bold', borderTop: '1.5px solid #000000' }}>
                  <td style={{ padding: '6px 10px', borderRight: '1px solid #000000' }}>Total Earnings</td>
                  <td style={{ padding: '6px 10px', textAlign: 'right', borderRight: '1.5px solid #000000' }}>
                    {formatAmt(totalEarningsVal)}
                  </td>
                  <td style={{ padding: '6px 10px', borderRight: '1px solid #000000' }}>Total Deductions</td>
                  <td style={{ padding: '6px 10px', textAlign: 'right' }}>{formatAmt(totalDeductionsVal)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 5. Net Salary Row */}
          <div style={{ borderBottom: '1.5px solid #000000', padding: '6px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 'bold', fontSize: '11pt' }}>Net Salary Paid</div>
            <div style={{ fontWeight: 'bold', fontSize: '11pt', paddingRight: '235px' }}>{formatAmt(netSalaryPaidVal)}</div>
          </div>

          {/* 6. Bottom Payment & Bank Details */}
          <div style={{ position: 'relative', borderBottom: '1.5px solid #000000', minHeight: '120px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10pt' }}>
              <tbody>
                <tr>
                  <td style={{ padding: '6px 10px', width: '55%' }}>
                    <strong>Amount in words:</strong> {displayWords}
                  </td>
                  <td style={{ padding: '6px 10px', width: '45%' }}>
                    <strong>Mode of payment:</strong> {paymentMode}
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '6px 10px' }}>
                    <strong>Bank A/c No.:</strong> {bankAccountNo}
                  </td>
                  <td style={{ padding: '6px 10px' }}></td>
                </tr>
                <tr>
                  <td style={{ padding: '6px 10px' }}>
                    <strong>Bank Name :</strong> {bankName}
                  </td>
                  <td style={{ padding: '6px 10px' }}></td>
                </tr>
                <tr>
                  <td style={{ padding: '6px 10px' }}>
                    <strong>Date of Birth</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{dateOfBirth}
                  </td>
                  <td style={{ padding: '6px 10px' }}></td>
                </tr>
              </tbody>
            </table>

            {/* Round Corporate Stamp Badge on bottom right matching the screenshot */}
            <div
              style={{
                position: 'absolute',
                bottom: '12px',
                right: '30px',
                width: '100px',
                height: '100px',
                pointerEvents: 'none',
              }}
            >
              {companyStampLogo ? (
                <img src={companyStampLogo} alt="Company Seal Stamp" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              ) : (
                <svg viewBox="0 0 120 120" width="100" height="100">
                  <circle cx="60" cy="60" r="54" fill="none" stroke="#1E3A8A" strokeWidth="2.5" />
                  <circle cx="60" cy="60" r="48" fill="none" stroke="#1E3A8A" strokeWidth="1.5" strokeDasharray="4 2" />
                  <path id="curveTop" d="M 18 60 A 42 42 0 0 1 102 60" fill="none" />
                  <text fontSize="8.5" fontWeight="bold" fill="#1E3A8A" letterSpacing="1">
                    <textPath href="#curveTop" startOffset="50%" textAnchor="middle">
                      ABSOLUTE MOTION PVT. LTD.
                    </textPath>
                  </text>
                  <polygon points="60,54 63,63 72,63 65,68 68,77 60,71 52,77 55,68 48,63 57,63" fill="#1E3A8A" />
                </svg>
              )}
            </div>
          </div>

          {/* 7. Footer Disclaimer Bar */}
          <div
            style={{
              padding: '6px 10px',
              fontSize: '9.5pt',
              textAlign: 'left',
              fontWeight: 'normal',
            }}
          >
            This is a computer generated document and does not require any signature
          </div>
        </div>
      </div>
    </div>
  );
};

export default PayslipPreview;

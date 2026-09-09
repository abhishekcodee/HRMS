import { CompanyLetterheadInfo } from './MultiDocumentPreview';

export interface SalaryCertificateData {
  companyName?: string;
  companyAddress?: string;
  companyTagline?: string;
  companyLogo?: string;
  companyEmail?: string;
  companyPhone?: string;
  companyWebsite?: string;
  companyCin?: string;
  companyGstin?: string;
  companyPan?: string;
  registeredOffice?: string;

  letterDate?: string;
  salutation?: string;
  employeeName?: string;
  employeeCode?: string;
  designation?: string;
  department?: string;
  monthlyGross?: number;
  annualCtc?: number;
  basicSalary?: number;
  hra?: number;
  conveyanceAllowance?: number;
  specialAllowance?: number;
  otherAllowances?: number;
  purposeText?: string;
  hrName?: string;
  hrDesignation?: string;
  watermarkText?: string;
}

interface SalaryCertificatePreviewProps {
  data: SalaryCertificateData;
  scale?: number;
  isEmbedded?: boolean;
  hideHeader?: boolean;
  activeLetterhead?: CompanyLetterheadInfo | null;
}

export const SalaryCertificatePreview: React.FC<SalaryCertificatePreviewProps> = ({
  data,
  scale = 1,
  isEmbedded = false,
  hideHeader = false,
  activeLetterhead = null,
}) => {
  const {
    companyName = '',
    companyAddress = '',
    companyTagline = '',
    companyLogo = '',
    companyEmail = '',
    companyPhone = '',
    companyWebsite = '',
    companyCin = '',
    companyGstin = '',
    companyPan = '',
    registeredOffice = '',

    letterDate = '',
    salutation = '',
    employeeName = '',
    employeeCode = '',
    designation = '',
    department = '',
    monthlyGross = 0,
    annualCtc = 0,
    basicSalary = 0,
    hra = 0,
    conveyanceAllowance = 0,
    specialAllowance = 0,
    otherAllowances = 0,
    purposeText = '',
    hrName = '',
    hrDesignation = '',
    watermarkText = '',
  } = data;

  const titlePrefix = salutation ? `${salutation} ` : '';
  const fullEmployeeName = `${titlePrefix}${employeeName}`.trim();

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val || 0);
  };

  const renderHeader = () => (
    <div style={{ width: '100%', marginBottom: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {companyLogo ? (
            <img src={companyLogo} alt="Company Logo" style={{ maxHeight: '22mm', maxWidth: '55mm', objectFit: 'contain' }} />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #7C3AED 0%, #3B82F6 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFFFFF',
                  fontWeight: 900,
                  fontSize: '20px',
                  boxShadow: '0 4px 10px rgba(124, 58, 237, 0.3)',
                }}
              >
                W
              </div>
              <div>
                <div style={{ fontSize: '18pt', fontWeight: 800, color: '#0F172A', lineHeight: 1.1, letterSpacing: '-0.02em' }}>
                  {companyName}
                </div>
                <div style={{ fontSize: '9pt', color: '#64748B', fontWeight: 600, marginTop: '2px' }}>
                  {companyTagline}
                </div>
              </div>
            </div>
          )}
        </div>

        <div style={{ textAlign: 'right', fontSize: '8.5pt', color: '#475569', lineHeight: 1.45 }}>
          {companyEmail && <div><strong style={{ color: '#0F172A' }}>Email:</strong> {companyEmail}</div>}
          {companyPhone && <div><strong style={{ color: '#0F172A' }}>Phone:</strong> {companyPhone}</div>}
          {companyWebsite && <div><strong style={{ color: '#0F172A' }}>Web:</strong> {companyWebsite}</div>}
          <div style={{ fontSize: '9pt', marginTop: '4px', fontWeight: 'bold', color: '#0F172A' }}>Date: {letterDate}</div>
        </div>
      </div>

      <div style={{ height: '2px', width: '100%', background: 'linear-gradient(90deg, #7C3AED 0%, #3B82F6 100%)', borderRadius: '1px' }} />
    </div>
  );

  const renderFooter = () => (
    <div style={{ width: '100%', marginTop: 'auto', paddingTop: '12px', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
      <div style={{ height: '2px', width: '100%', background: 'linear-gradient(90deg, #7C3AED 0%, #3B82F6 100%)', marginBottom: '10px', borderRadius: '1px' }} />
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '16px', fontSize: '8pt', color: '#475569', lineHeight: 1.4 }}>
        <div>
          <div style={{ fontWeight: 'bold', color: '#0F172A', marginBottom: '2px' }}>Company Address</div>
          <div>{companyAddress}</div>
          {registeredOffice && <div><span style={{ fontWeight: 600 }}>Reg. Office:</span> {registeredOffice}</div>}
        </div>
        <div>
          <div style={{ fontWeight: 'bold', color: '#0F172A', marginBottom: '2px' }}>Corporate Details</div>
          <div><span style={{ fontWeight: 600 }}>CIN:</span> {companyCin}</div>
          <div><span style={{ fontWeight: 600 }}>GSTIN:</span> {companyGstin}</div>
          <div><span style={{ fontWeight: 600 }}>PAN:</span> {companyPan}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontWeight: 'bold', color: '#0F172A', marginBottom: '2px' }}>Contact Details</div>
          <div>{companyPhone}</div>
          <div>{companyEmail}</div>
          <div>{companyWebsite}</div>
        </div>
      </div>
    </div>
  );

  const margins = activeLetterhead?.margins || { top: 48, bottom: 60, left: 20, right: 20 };
  const hasLetterhead = Boolean(activeLetterhead && activeLetterhead.fileUrl);

  const renderLetterheadBg = () => {
    if (!hasLetterhead || !activeLetterhead?.fileUrl) return null;
    return (
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
            objectFit: 'fill',
          }}
        />
      </div>
    );
  };

  const leftPaddingMm = (hasLetterhead || hideHeader) ? Math.max(margins.left || 20, 20) : 20;
  const rightPaddingMm = (hasLetterhead || hideHeader) ? Math.max(margins.right || 20, 20) : 20;
  const topPaddingMm = (hasLetterhead || hideHeader) ? Math.max(margins.top || 48, 48) : 15;
  const bottomPaddingMm = (hasLetterhead || hideHeader) ? Math.max(margins.bottom || 60, 60) : 20;

  return (
    <div style={{ transform: isEmbedded ? 'none' : `scale(${scale})`, transformOrigin: 'top center' }}>
      <style>{`
        @media print {
          @page { size: A4; margin: 0; }
          body { background: white !important; margin: 0 !important; }
          .a4-page {
            box-shadow: none !important;
            width: 210mm !important;
            height: 297mm !important;
            min-height: 297mm !important;
            margin: 0 !important;
            padding: 15mm 20mm 15mm 20mm !important;
          }
        }
      `}</style>

      <div
        className="a4-page"
        style={{
          width: '210mm',
          minWidth: '210mm',
          maxWidth: '210mm',
          minHeight: '297mm',
          height: '297mm',
          paddingTop: `${topPaddingMm}mm`,
          paddingBottom: `${bottomPaddingMm}mm`,
          paddingLeft: `${leftPaddingMm}mm`,
          paddingRight: `${rightPaddingMm}mm`,
          backgroundColor: '#FFFFFF',
          color: '#0F172A',
          fontFamily: "'Times New Roman', Times, serif, 'Arial', sans-serif",
          fontSize: '11pt',
          lineHeight: 1.6,
          boxSizing: 'border-box',
          margin: '0 auto 24px auto',
          boxShadow: isEmbedded ? '0 4px 20px rgba(0,0,0,0.15)' : '0 10px 30px rgba(0,0,0,0.15)',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          overflow: 'hidden',
        }}
      >
        {renderLetterheadBg()}
        {!hideHeader && renderHeader()}

        <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              opacity: 0.035,
              pointerEvents: 'none',
              zIndex: 0,
              fontSize: '110pt',
              fontWeight: 900,
              color: '#7C3AED',
              letterSpacing: '0.1em',
            }}
          >
            {watermarkText}
          </div>

          <div style={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ textAlign: 'center', margin: '15px 0 30px 0' }}>
              <h1 style={{ fontSize: '18pt', fontWeight: 700, margin: 0, textDecoration: 'underline', letterSpacing: '0.04em' }}>
                SALARY CERTIFICATE
              </h1>
            </div>

            <div style={{ textAlign: 'justify', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <p style={{ margin: 0 }}>
                This is to certify that <strong>{fullEmployeeName}</strong> (Employee Code: <strong>{employeeCode}</strong>) is a permanent employee of <strong>{companyName}</strong>, working as <strong>{designation}</strong> in the <strong>{department}</strong> department.
              </p>

              <p style={{ margin: 0 }}>
                As per company records, {salutation ? salutation + ' ' : ''}<strong>{employeeName}</strong> is drawing a Total Cost to Company (CTC) of <strong>{formatCurrency(annualCtc)}</strong> per annum (Monthly Gross: <strong>{formatCurrency(monthlyGross)}</strong>).
              </p>

              <div style={{ margin: '10px 0' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>Salary Components Breakdown:</div>
                <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', fontSize: '9.5pt' }}>
                  <thead>
                    <tr style={{ background: '#F1F5F9', borderBottom: '1px solid #000' }}>
                      <th style={{ padding: '8px 12px', textAlign: 'left', borderRight: '1px solid #000' }}>Component</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right', borderRight: '1px solid #000' }}>Monthly (₹)</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right' }}>Annualized (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid #CBD5E1' }}>
                      <td style={{ padding: '7px 12px', borderRight: '1px solid #000' }}>Basic Salary</td>
                      <td style={{ padding: '7px 12px', textAlign: 'right', borderRight: '1px solid #000' }}>{formatCurrency(basicSalary)}</td>
                      <td style={{ padding: '7px 12px', textAlign: 'right' }}>{formatCurrency(basicSalary * 12)}</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #CBD5E1' }}>
                      <td style={{ padding: '7px 12px', borderRight: '1px solid #000' }}>House Rent Allowance (HRA)</td>
                      <td style={{ padding: '7px 12px', textAlign: 'right', borderRight: '1px solid #000' }}>{formatCurrency(hra)}</td>
                      <td style={{ padding: '7px 12px', textAlign: 'right' }}>{formatCurrency(hra * 12)}</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #CBD5E1' }}>
                      <td style={{ padding: '7px 12px', borderRight: '1px solid #000' }}>Conveyance Allowance</td>
                      <td style={{ padding: '7px 12px', textAlign: 'right', borderRight: '1px solid #000' }}>{formatCurrency(conveyanceAllowance)}</td>
                      <td style={{ padding: '7px 12px', textAlign: 'right' }}>{formatCurrency(conveyanceAllowance * 12)}</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #CBD5E1' }}>
                      <td style={{ padding: '7px 12px', borderRight: '1px solid #000' }}>Special & Other Allowances</td>
                      <td style={{ padding: '7px 12px', textAlign: 'right', borderRight: '1px solid #000' }}>{formatCurrency(specialAllowance + otherAllowances)}</td>
                      <td style={{ padding: '7px 12px', textAlign: 'right' }}>{formatCurrency((specialAllowance + otherAllowances) * 12)}</td>
                    </tr>
                    <tr style={{ fontWeight: 'bold', background: '#F8FAFC' }}>
                      <td style={{ padding: '9px 12px', borderRight: '1px solid #000' }}>TOTAL GROSS CTC</td>
                      <td style={{ padding: '9px 12px', textAlign: 'right', borderRight: '1px solid #000' }}>{formatCurrency(monthlyGross)}</td>
                      <td style={{ padding: '9px 12px', textAlign: 'right' }}>{formatCurrency(annualCtc)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <p style={{ margin: 0 }}>
                This salary certificate is issued at the specific request of the employee for <strong>{purposeText}</strong> without any financial liability on <strong>{companyName}</strong>.
              </p>
            </div>

            <div style={{ marginTop: '40px', breakInside: 'avoid', pageBreakInside: 'avoid' }}>
              <div style={{ margin: '0 0 10px 0' }}>For <strong>{companyName}</strong>,</div>
              <div style={{ marginTop: '35px' }}>
                <div style={{ fontWeight: 'bold', fontSize: '11pt', color: '#0F172A' }}>{hrName}</div>
                <div style={{ fontSize: '9.5pt', color: '#475569' }}>{hrDesignation}</div>
                <div style={{ fontSize: '8.5pt', color: '#94A3B8', marginTop: '2px' }}>Authorized Signatory</div>
              </div>
            </div>
          </div>
        </div>

        {!hideHeader && renderFooter()}
      </div>
    </div>
  );
};

export default SalaryCertificatePreview;

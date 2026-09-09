import React from 'react';
import { PageBreakDivider } from './PageBreakDivider';
import { CompanyLetterheadInfo } from './MultiDocumentPreview';

export interface OfferLetterData {
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
  joiningDate?: string;
  location?: string;

  // Salary Components for Annexure B
  basicMonthly?: number;
  basicYearly?: number;
  hraMonthly?: number;
  hraYearly?: number;
  conveyanceMonthly?: number;
  conveyanceYearly?: number;
  medicalMonthly?: number;
  medicalYearly?: number;
  ltaMonthly?: number;
  ltaYearly?: number;
  allowanceMonthly?: number;
  allowanceYearly?: number;
  totalSalaryMonthly?: number;
  totalSalaryYearly?: number;

  pfDeductionMonthly?: number;
  pfDeductionYearly?: number;
  ptDeductionMonthly?: number;
  ptDeductionYearly?: number;
  esicDeductionMonthly?: number;
  esicDeductionYearly?: number;
  tdsDeductionMonthly?: number;
  tdsDeductionYearly?: number;
  totalDeductionMonthly?: number;
  totalDeductionYearly?: number;
  inHandSalaryMonthly?: number;
  inHandSalaryYearly?: number;

  employerPfMonthly?: number;
  employerPfYearly?: number;
  employerEsicMonthly?: number;
  employerEsicYearly?: number;
  employerGratuityMonthly?: number;
  employerGratuityYearly?: number;
  totalContributionMonthly?: number;
  totalContributionYearly?: number;

  bonusYearly?: number;
  medicalYearlyContribution?: number;

  ctcPerMonth?: number;
  ctcPerYear?: number;

  hrName?: string;
  hrDesignation?: string;
  watermarkText?: string;
  issueNo?: string;

  [key: string]: any;
}

interface OfferLetterPreviewProps {
  data: OfferLetterData;
  scale?: number;
  isEmbedded?: boolean;
  hideHeader?: boolean;
  activeLetterhead?: CompanyLetterheadInfo | null;
}

export const OfferLetterPreview: React.FC<OfferLetterPreviewProps> = ({
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
    designation = '',
    joiningDate = '',
    location = '',

    basicMonthly = 0,
    basicYearly = 0,
    hraMonthly = 0,
    hraYearly = 0,
    conveyanceMonthly = 0,
    conveyanceYearly = 0,
    medicalMonthly = 0,
    medicalYearly = 0,
    ltaMonthly = 0,
    ltaYearly = 0,
    allowanceMonthly = 0,
    allowanceYearly = 0,
    totalSalaryMonthly = 0,
    totalSalaryYearly = 0,

    pfDeductionMonthly = 0,
    pfDeductionYearly = 0,
    ptDeductionMonthly = 0,
    ptDeductionYearly = 0,
    esicDeductionMonthly = 0,
    esicDeductionYearly = 0,
    tdsDeductionMonthly = 0,
    tdsDeductionYearly = 0,
    totalDeductionMonthly = 0,
    totalDeductionYearly = 0,
    inHandSalaryMonthly = 0,
    inHandSalaryYearly = 0,

    employerPfMonthly = 0,
    employerPfYearly = 0,
    employerEsicMonthly = 0,
    employerEsicYearly = 0,
    employerGratuityMonthly = 0,
    employerGratuityYearly = 0,
    totalContributionMonthly = 0,
    totalContributionYearly = 0,

    bonusYearly = 0,
    medicalYearlyContribution = 0,

    ctcPerMonth = 0,
    ctcPerYear = 0,

    hrName = '',
    hrDesignation = '',
    watermarkText = '',
    issueNo = '',
  } = data;

  const hasLetterhead = Boolean(activeLetterhead && activeLetterhead.fileUrl);
  const letterheadUrl = activeLetterhead?.fileUrl || '';
  const isPdf = activeLetterhead?.fileType === 'pdf';
  const margins = activeLetterhead?.margins || { top: 48, bottom: 60, left: 20, right: 20 };

  const titlePrefix = salutation ? `${salutation} ` : '';
  const fullEmployeeName = `${titlePrefix}${employeeName}`.trim();

  const formatAmount = (val: number) => {
    if (val === undefined || val === null || isNaN(val)) return '-';
    if (val === 0) return '-';
    return val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const renderLetterheadBg = () => {
    if (!hasLetterhead) return null;
    return (
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '210mm',
          height: '297mm',
          zIndex: 0,
          pointerEvents: 'none',
        }}
      >
        {isPdf ? (
          <iframe
            src={`${letterheadUrl}#toolbar=0&navpanes=0&scrollbar=0`}
            title="Company Letterhead Background"
            style={{ width: '100%', height: '100%', border: 'none', pointerEvents: 'none' }}
          />
        ) : (
          <img
            src={letterheadUrl}
            alt="Company Letterhead Background"
            style={{ width: '100%', height: '100%', objectFit: 'fill' }}
          />
        )}
      </div>
    );
  };

  const renderHeader = () => (
    <div style={{ width: '100%', marginBottom: '14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '10px' }}>
        {/* Left Branding */}
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
                  background: 'linear-gradient(135deg, #0284C7 0%, #2563EB 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFFFFF',
                  fontWeight: 900,
                  fontSize: '18px',
                  boxShadow: '0 4px 10px rgba(37, 99, 235, 0.3)',
                }}
              >
                AM
              </div>
              <div>
                <div style={{ fontSize: '17pt', fontWeight: 800, color: '#0F172A', lineHeight: 1.1, letterSpacing: '-0.02em' }}>
                  {companyName}
                </div>
                <div style={{ fontSize: '8.5pt', color: '#64748B', fontWeight: 600, marginTop: '2px' }}>
                  {companyTagline}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Contact Info */}
        <div style={{ textAlign: 'right', fontSize: '8.5pt', color: '#475569', lineHeight: 1.45 }}>
          {companyEmail && <div><strong style={{ color: '#0F172A' }}>Email:</strong> {companyEmail}</div>}
          {companyPhone && <div><strong style={{ color: '#0F172A' }}>Phone:</strong> {companyPhone}</div>}
          {companyWebsite && <div><strong style={{ color: '#0F172A' }}>Web:</strong> {companyWebsite}</div>}
          <div style={{ fontSize: '9pt', marginTop: '4px', fontWeight: 'bold', color: '#0F172A' }}>Date: {letterDate}</div>
        </div>
      </div>

      <div style={{ height: '2px', width: '100%', background: 'linear-gradient(90deg, #0284C7 0%, #2563EB 100%)', borderRadius: '1px' }} />
    </div>
  );

  const renderFooter = () => (
    <div style={{ width: '100%', marginTop: 'auto', paddingTop: '10px', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
      <div style={{ height: '2px', width: '100%', background: 'linear-gradient(90deg, #0284C7 0%, #2563EB 100%)', marginBottom: '8px', borderRadius: '1px' }} />
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
          <div><span style={{ fontWeight: 'bold' }}>PAN:</span> {companyPan}</div>
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

  const renderRevisionBar = (pageNum: number) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #000', paddingTop: '4px', marginTop: '12px', fontSize: '9pt', fontFamily: "'Arial', sans-serif" }}>
      <div>{issueNo}</div>
      <div style={{ fontWeight: 'bold' }}>{pageNum} OF 3</div>
      <div>HRD-010</div>
    </div>
  );

  const pageContainerStyle: React.CSSProperties = {
    width: '210mm',
    minHeight: '297mm',
    height: '297mm',
    backgroundColor: '#FFFFFF',
    color: '#000000',
    fontFamily: "'Calibri', 'Arial', sans-serif",
    fontSize: '11pt',
    lineHeight: 1.35,
    boxSizing: 'border-box',
    margin: '0 auto 24px auto',
    boxShadow: isEmbedded ? 'none' : '0 10px 30px rgba(0,0,0,0.15)',
    position: 'relative',
    overflow: 'hidden',
  };

  const leftPaddingMm = (hasLetterhead || hideHeader) ? Math.max(margins.left || 20, 20) : 20;
  const rightPaddingMm = (hasLetterhead || hideHeader) ? Math.max(margins.right || 20, 20) : 20;
  const topPaddingMm = (hasLetterhead || hideHeader) ? Math.max(margins.top || 48, 48) : 15;
  const bottomPaddingMm = (hasLetterhead || hideHeader) ? Math.max(margins.bottom || 60, 60) : 20;

  const contentSafeStyle: React.CSSProperties = {
    position: 'relative',
    zIndex: 1,
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    paddingTop: `${topPaddingMm}mm`,
    paddingBottom: `${bottomPaddingMm}mm`,
    paddingLeft: `${leftPaddingMm}mm`,
    paddingRight: `${rightPaddingMm}mm`,
    boxSizing: 'border-box',
  };

  return (
    <div style={{ transform: isEmbedded ? 'none' : `scale(${scale})`, transformOrigin: 'top center' }}>
      <style>{`
        @media print {
          @page { size: A4; margin: 0; }
          body { background: white !important; margin: 0 !important; }
          .document-page {
            box-shadow: none !important;
            width: 210mm !important;
            height: 297mm !important;
            min-height: 297mm !important;
            margin: 0 !important;
            padding: 15mm 20mm 12mm 20mm !important;
            page-break-after: always;
            break-after: page;
          }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* ========================================================
          PAGE 1: Master Offer Letter Details
         ======================================================== */}
      <div className="document-page a4-page" style={pageContainerStyle}>
        {renderLetterheadBg()}

        <div style={contentSafeStyle}>
          {!hideHeader && !hasLetterhead && renderHeader()}

          <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column' }}>
            <div style={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div style={{ textAlign: 'center', margin: '4px 0 16px 0' }}>
                <h1 style={{ fontSize: '18pt', fontWeight: 700, color: '#000000', margin: 0 }}>
                  Offer Letter
                </h1>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <p style={{ margin: '0 0 10px 0', fontWeight: 'bold' }}>
                  Dear {fullEmployeeName}
                </p>

                <p style={{ textAlign: 'justify', margin: '0 0 10px 0' }}>
                  We are pleased to offer you the position of <strong>{designation}</strong> at <strong>{companyName}</strong>. Following our recent discussions, we are confident that your skills, experience, and personal qualities make you an excellent fit for our team.
                </p>

                <p style={{ textAlign: 'justify', margin: '0 0 10px 0' }}>
                  As a valued member of our organization, your main duties and responsibilities will include in Annexure A. You will be an integral part of our team and contribute significantly to our ongoing success.
                </p>

                <p style={{ margin: '0 0 8px 0' }}>
                  Details of your employment package are as follows:
                </p>

                <ul style={{ margin: '0 0 12px 0', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <li>Position: <strong>{designation}</strong></li>
                  <li>Start Date: <strong>{joiningDate}</strong></li>
                  <li>CTC (Cost to Company): Refer Annexure B</li>
                  <li>Tentative In-hand Salary: Refer Annexure B</li>
                  <li>
                    Benefits:
                    <ul style={{ margin: '4px 0 0 0', paddingLeft: '20px', listStyleType: 'none' }}>
                      <li>Provident Fund (PF)</li>
                      <li>Accidental Policy</li>
                      <li>Bonus (if applicable)</li>
                      <li>Employee State Insurance Corporation (ESIC) (if applicable)</li>
                    </ul>
                  </li>
                  <li>Working Hours: Monday to Saturday, 9:30 AM to 6:30 PM</li>
                  <li>Location: {location}</li>
                </ul>

                <p style={{ textAlign: 'justify', margin: '0 0 10px 0' }}>
                  Please note that your employment with <strong>{companyName}</strong> will be subject to the successful completion of background checks and medical test.
                </p>

                <p style={{ textAlign: 'justify', margin: '0 0 10px 0' }}>
                  We believe that you will find <strong>{companyName}</strong> to be a dynamic and rewarding place to work, with ample opportunities for professional growth and development. We are excited about the prospect of you joining our team and contributing to our continued success.
                </p>

                <p style={{ textAlign: 'justify', margin: '0 0 10px 0' }}>
                  Please review this offer carefully and let us know if you have any questions or if there are any details you would like to discuss further. If you wish to accept this offer, please sign and return a copy of this letter within 24 hours of receiving it to indicate your acceptance along with Employee details (HRD-02).
                </p>

                <p style={{ margin: '0 0 14px 0' }}>
                  We are thrilled about the opportunity of welcoming you to our team.
                </p>

                <div style={{ marginTop: '16px' }}>
                  <div>Sincerely,</div>
                  <div style={{ marginTop: '4px', fontWeight: 'bold' }}>{hrName}</div>
                </div>
              </div>
            </div>
          </div>

          <div>
            {renderRevisionBar(1)}
            {!hideHeader && !hasLetterhead && renderFooter()}
          </div>
        </div>
      </div>

      {/* Visual Page Break Indicator for Screen Preview */}
      <PageBreakDivider pageNumber={1} totalPages={3} label="PAGE BREAK (ANNEXURE A)" />

      {/* ========================================================
          PAGE 2: Annexure- A Job Description
         ======================================================== */}
      <div className="document-page a4-page" style={pageContainerStyle}>
        {renderLetterheadBg()}

        <div style={contentSafeStyle}>
          {!hideHeader && !hasLetterhead && renderHeader()}

          <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column' }}>
            <div style={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div style={{ textAlign: 'center', margin: '4px 0 12px 0' }}>
                <h1 style={{ fontSize: '18pt', fontWeight: 700, color: '#000000', margin: '0 0 6px 0' }}>
                  Offer Letter
                </h1>
                <h2 style={{ fontSize: '13pt', fontWeight: 700, textDecoration: 'underline', margin: 0 }}>
                  Annexure- A
                </h2>
              </div>

              <div style={{ fontWeight: 'bold', textDecoration: 'underline', marginBottom: '8px' }}>
                Job description:
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '10.5pt', textAlign: 'justify' }}>
                <div>
                  <div style={{ fontWeight: 'bold' }}>1) IoT Solution Development:</div>
                  <ul style={{ margin: '2px 0 0 0', paddingLeft: '22px' }}>
                    <li>Design, develop, and implement end-to-end IoT systems and solutions for Industry 4.0 applications, including embedded systems, connectivity, and cloud infrastructure.</li>
                    <li>Develop firmware and software for IoT devices, ensuring scalability, security, and reliability.</li>
                    <li>Integrate sensors, actuators, and communication protocols for real-time data acquisition and control in industrial environments.</li>
                  </ul>
                </div>

                <div>
                  <div style={{ fontWeight: 'bold' }}>2) Device and Connectivity Management:</div>
                  <ul style={{ margin: '2px 0 0 0', paddingLeft: '22px' }}>
                    <li>Work with different IoT communication protocols and networking technologies to ensure seamless connectivity between devices and the cloud.</li>
                    <li>Develop and manage the lifecycle of connected devices from development to deployment and maintenance.</li>
                  </ul>
                </div>

                <div>
                  <div style={{ fontWeight: 'bold' }}>3) Data Collection and Analytics:</div>
                  <ul style={{ margin: '2px 0 0 0', paddingLeft: '22px' }}>
                    <li>Design and implement data collection systems to gather real-time data from industrial equipment, sensors, and machines.</li>
                    <li>Ensure the proper integration of IoT data into cloud platforms, databases, and analytics tools for Industry 4.0 applications.</li>
                  </ul>
                </div>

                <div>
                  <div style={{ fontWeight: 'bold' }}>4) System Architecture and Integration:</div>
                  <ul style={{ margin: '2px 0 0 0', paddingLeft: '22px' }}>
                    <li>Work with engineering teams to design and integrate IoT solutions with existing systems like SCADA, ERP, MES, and other enterprise platforms.</li>
                    <li>Develop and maintain APIs and other integration methods to connect IoT devices with backend systems, ensuring smooth data flow and synchronization.</li>
                    <li>Participate in system architecture planning, ensuring scalability, security, and high availability for the IoT ecosystem.</li>
                  </ul>
                </div>

                <div>
                  <div style={{ fontWeight: 'bold' }}>5) Security and Compliance:</div>
                  <ul style={{ margin: '2px 0 0 0', paddingLeft: '22px' }}>
                    <li>Ensure that IoT devices and platforms are secure from cyber threats by implementing encryption, authentication, and secure communication protocols.</li>
                    <li>Comply with relevant industry standards, regulations, and best practices in IoT development, including data privacy and security.</li>
                    <li>Regularly assess the security posture of IoT solutions and perform vulnerability assessments and mitigation.</li>
                  </ul>
                </div>

                <div>
                  <div style={{ fontWeight: 'bold' }}>6) Testing and Quality Assurance:</div>
                  <ul style={{ margin: '2px 0 0 0', paddingLeft: '22px' }}>
                    <li>Develop and execute test plans to ensure that IoT devices, firmware, and systems are fully functional, reliable, and optimized for industrial applications.</li>
                    <li>Troubleshoot, debug, and resolve technical issues in hardware, firmware, and software during the development and operational phases.</li>
                  </ul>
                </div>

                <div>
                  <div style={{ fontWeight: 'bold' }}>7) Collaboration and Innovation:</div>
                  <ul style={{ margin: '2px 0 0 0', paddingLeft: '22px' }}>
                    <li>Participate in brainstorming sessions and contribute to the design of new IoT products that improve industrial efficiency and automation.</li>
                    <li>Stay up-to-date with the latest IoT technologies, trends, and Industry 4.0 advancements, and apply new knowledge to improve existing products.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div>
            {renderRevisionBar(2)}
            {!hideHeader && !hasLetterhead && renderFooter()}
          </div>
        </div>
      </div>

      {/* Visual Page Break Indicator for Screen Preview */}
      <PageBreakDivider pageNumber={2} totalPages={3} label="PAGE BREAK (ANNEXURE B)" />

      {/* ========================================================
          PAGE 3: Annexure B Two-Column Salary Table
         ======================================================== */}
      <div className="document-page a4-page" style={pageContainerStyle}>
        {renderLetterheadBg()}

        <div style={contentSafeStyle}>
          {!hideHeader && !hasLetterhead && renderHeader()}

          <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column' }}>
            <div style={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div style={{ textAlign: 'center', margin: '4px 0 12px 0' }}>
                <h1 style={{ fontSize: '18pt', fontWeight: 700, color: '#000000', margin: '0 0 6px 0' }}>
                  Offer Letter
                </h1>
                <h2 style={{ fontSize: '13pt', fontWeight: 700, textDecoration: 'underline', margin: 0 }}>
                  Annexure B
                </h2>
              </div>

              <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>
                Salary details:
              </div>

              {/* Exact Two-Column Salary Table Architecture */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '9pt', fontFamily: "'Calibri', 'Arial', sans-serif" }}>
                {/* Left Column: Monthly Salary */}
                <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000' }}>
                  <thead>
                    <tr style={{ background: '#2563EB', color: '#FFFFFF', textAlign: 'left', fontWeight: 'bold' }}>
                      <th colSpan={3} style={{ padding: '6px 8px', borderBottom: '1px solid #000', textAlign: 'center', fontSize: '10pt' }}>
                        Monthly Salary
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* A. Components */}
                    <tr style={{ fontWeight: 'bold', background: '#F1F5F9' }}>
                      <td colSpan={3} style={{ padding: '5px 8px', borderBottom: '1px solid #000' }}>A. Components</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '3px 8px', fontStyle: 'italic' }}>Basic</td>
                      <td style={{ padding: '3px 4px', textAlign: 'right' }}>₹</td>
                      <td style={{ padding: '3px 8px', textAlign: 'right' }}>{formatAmount(basicMonthly)}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '3px 8px', fontStyle: 'italic' }}>HRA</td>
                      <td style={{ padding: '3px 4px', textAlign: 'right' }}>₹</td>
                      <td style={{ padding: '3px 8px', textAlign: 'right' }}>{formatAmount(hraMonthly)}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '3px 8px', fontStyle: 'italic' }}>Conveyance</td>
                      <td style={{ padding: '3px 4px', textAlign: 'right' }}>₹</td>
                      <td style={{ padding: '3px 8px', textAlign: 'right' }}>{formatAmount(conveyanceMonthly)}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '3px 8px', fontStyle: 'italic' }}>Medical</td>
                      <td style={{ padding: '3px 4px', textAlign: 'right' }}>₹</td>
                      <td style={{ padding: '3px 8px', textAlign: 'right' }}>{formatAmount(medicalMonthly)}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '3px 8px', fontStyle: 'italic' }}>LTA</td>
                      <td style={{ padding: '3px 4px', textAlign: 'right' }}>₹</td>
                      <td style={{ padding: '3px 8px', textAlign: 'right' }}>{formatAmount(ltaMonthly)}</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #000' }}>
                      <td style={{ padding: '3px 8px', fontStyle: 'italic' }}>Allowance</td>
                      <td style={{ padding: '3px 4px', textAlign: 'right' }}>₹</td>
                      <td style={{ padding: '3px 8px', textAlign: 'right' }}>{formatAmount(allowanceMonthly)}</td>
                    </tr>
                    <tr style={{ background: '#15803D', color: '#FFFFFF', fontWeight: 'bold' }}>
                      <td style={{ padding: '5px 8px' }}>Total Salary</td>
                      <td style={{ padding: '5px 4px', textAlign: 'right' }}>₹</td>
                      <td style={{ padding: '5px 8px', textAlign: 'right' }}>{formatAmount(totalSalaryMonthly)}</td>
                    </tr>

                    {/* B. Deductions */}
                    <tr style={{ fontWeight: 'bold', background: '#F1F5F9' }}>
                      <td colSpan={3} style={{ padding: '5px 8px', borderTop: '1px solid #000', borderBottom: '1px solid #000' }}>B. Deductions</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '3px 8px', fontStyle: 'italic' }}>PF</td>
                      <td style={{ padding: '3px 4px', textAlign: 'right' }}>₹</td>
                      <td style={{ padding: '3px 8px', textAlign: 'right' }}>{formatAmount(pfDeductionMonthly)}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '3px 8px', fontStyle: 'italic' }}>PT</td>
                      <td style={{ padding: '3px 4px', textAlign: 'right' }}>₹</td>
                      <td style={{ padding: '3px 8px', textAlign: 'right' }}>{formatAmount(ptDeductionMonthly)}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '3px 8px', fontStyle: 'italic' }}>ESIC</td>
                      <td style={{ padding: '3px 4px', textAlign: 'right' }}>₹</td>
                      <td style={{ padding: '3px 8px', textAlign: 'right' }}>{formatAmount(esicDeductionMonthly)}</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #000' }}>
                      <td style={{ padding: '3px 8px', fontStyle: 'italic' }}>TDS</td>
                      <td style={{ padding: '3px 4px', textAlign: 'right' }}>₹</td>
                      <td style={{ padding: '3px 8px', textAlign: 'right' }}>{formatAmount(tdsDeductionMonthly)}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '4px 8px' }}>Total Deduction</td>
                      <td style={{ padding: '4px 4px', textAlign: 'right' }}>₹</td>
                      <td style={{ padding: '4px 8px', textAlign: 'right' }}>{formatAmount(totalDeductionMonthly)}</td>
                    </tr>
                    <tr style={{ background: '#15803D', color: '#FFFFFF', fontWeight: 'bold' }}>
                      <td style={{ padding: '5px 8px' }}>In Hand Salary</td>
                      <td style={{ padding: '5px 4px', textAlign: 'right' }}>₹</td>
                      <td style={{ padding: '5px 8px', textAlign: 'right' }}>{formatAmount(inHandSalaryMonthly)}</td>
                    </tr>

                    {/* C. Employer Contribution */}
                    <tr style={{ fontWeight: 'bold', background: '#F1F5F9' }}>
                      <td colSpan={3} style={{ padding: '5px 8px', borderTop: '1px solid #000', borderBottom: '1px solid #000' }}>C. Employer Contribution</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '3px 8px', fontStyle: 'italic' }}>PF</td>
                      <td style={{ padding: '3px 4px', textAlign: 'right' }}>₹</td>
                      <td style={{ padding: '3px 8px', textAlign: 'right' }}>{formatAmount(employerPfMonthly)}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '3px 8px', fontStyle: 'italic' }}>ESIC</td>
                      <td style={{ padding: '3px 4px', textAlign: 'right' }}>₹</td>
                      <td style={{ padding: '3px 8px', textAlign: 'right' }}>{formatAmount(employerEsicMonthly)}</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #000' }}>
                      <td style={{ padding: '3px 8px', fontStyle: 'italic' }}>Gratuity</td>
                      <td style={{ padding: '3px 4px', textAlign: 'right' }}>₹</td>
                      <td style={{ padding: '3px 8px', textAlign: 'right' }}>{formatAmount(employerGratuityMonthly)}</td>
                    </tr>
                    <tr style={{ background: '#2563EB', color: '#FFFFFF', fontWeight: 'bold' }}>
                      <td style={{ padding: '5px 8px' }}>Total Contribution</td>
                      <td style={{ padding: '5px 4px', textAlign: 'right' }}>₹</td>
                      <td style={{ padding: '5px 8px', textAlign: 'right' }}>{formatAmount(totalContributionMonthly)}</td>
                    </tr>
                    <tr style={{ background: '#14532D', color: '#FFFFFF', fontWeight: 'bold' }}>
                      <td style={{ padding: '6px 8px' }}>CTC per Month</td>
                      <td style={{ padding: '6px 4px', textAlign: 'right' }}>₹</td>
                      <td style={{ padding: '6px 8px', textAlign: 'right' }}>{formatAmount(ctcPerMonth)}</td>
                    </tr>
                  </tbody>
                </table>

                {/* Right Column: Yearly CTC */}
                <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000' }}>
                  <thead>
                    <tr style={{ background: '#2563EB', color: '#FFFFFF', textAlign: 'left', fontWeight: 'bold' }}>
                      <th colSpan={3} style={{ padding: '6px 8px', borderBottom: '1px solid #000', textAlign: 'center', fontSize: '10pt' }}>
                        Yearly CTC
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* A. Components */}
                    <tr style={{ fontWeight: 'bold', background: '#F1F5F9' }}>
                      <td colSpan={3} style={{ padding: '5px 8px', borderBottom: '1px solid #000' }}>A. Components</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '3px 8px', fontStyle: 'italic' }}>Basic</td>
                      <td style={{ padding: '3px 4px', textAlign: 'right' }}>₹</td>
                      <td style={{ padding: '3px 8px', textAlign: 'right' }}>{formatAmount(basicYearly)}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '3px 8px', fontStyle: 'italic' }}>HRA</td>
                      <td style={{ padding: '3px 4px', textAlign: 'right' }}>₹</td>
                      <td style={{ padding: '3px 8px', textAlign: 'right' }}>{formatAmount(hraYearly)}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '3px 8px', fontStyle: 'italic' }}>Conveyance</td>
                      <td style={{ padding: '3px 4px', textAlign: 'right' }}>₹</td>
                      <td style={{ padding: '3px 8px', textAlign: 'right' }}>{formatAmount(conveyanceYearly)}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '3px 8px', fontStyle: 'italic' }}>Medical</td>
                      <td style={{ padding: '3px 4px', textAlign: 'right' }}>₹</td>
                      <td style={{ padding: '3px 8px', textAlign: 'right' }}>{formatAmount(medicalYearly)}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '3px 8px', fontStyle: 'italic' }}>LTA</td>
                      <td style={{ padding: '3px 4px', textAlign: 'right' }}>₹</td>
                      <td style={{ padding: '3px 8px', textAlign: 'right' }}>{formatAmount(ltaYearly)}</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #000' }}>
                      <td style={{ padding: '3px 8px', fontStyle: 'italic' }}>Allowance</td>
                      <td style={{ padding: '3px 4px', textAlign: 'right' }}>₹</td>
                      <td style={{ padding: '3px 8px', textAlign: 'right' }}>{formatAmount(allowanceYearly)}</td>
                    </tr>
                    <tr style={{ background: '#15803D', color: '#FFFFFF', fontWeight: 'bold' }}>
                      <td style={{ padding: '5px 8px' }}>Total Salary</td>
                      <td style={{ padding: '5px 4px', textAlign: 'right' }}>₹</td>
                      <td style={{ padding: '5px 8px', textAlign: 'right' }}>{formatAmount(totalSalaryYearly)}</td>
                    </tr>

                    {/* B. Deductions */}
                    <tr style={{ fontWeight: 'bold', background: '#F1F5F9' }}>
                      <td colSpan={3} style={{ padding: '5px 8px', borderTop: '1px solid #000', borderBottom: '1px solid #000' }}>B. Deductions</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '3px 8px', fontStyle: 'italic' }}>PF</td>
                      <td style={{ padding: '3px 4px', textAlign: 'right' }}>₹</td>
                      <td style={{ padding: '3px 8px', textAlign: 'right' }}>{formatAmount(pfDeductionYearly)}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '3px 8px', fontStyle: 'italic' }}>PT</td>
                      <td style={{ padding: '3px 4px', textAlign: 'right' }}>₹</td>
                      <td style={{ padding: '3px 8px', textAlign: 'right' }}>{formatAmount(ptDeductionYearly)}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '3px 8px', fontStyle: 'italic' }}>ESIC</td>
                      <td style={{ padding: '3px 4px', textAlign: 'right' }}>₹</td>
                      <td style={{ padding: '3px 8px', textAlign: 'right' }}>{formatAmount(esicDeductionYearly)}</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #000' }}>
                      <td style={{ padding: '3px 8px', fontStyle: 'italic' }}>TDS</td>
                      <td style={{ padding: '3px 4px', textAlign: 'right' }}>₹</td>
                      <td style={{ padding: '3px 8px', textAlign: 'right' }}>{formatAmount(tdsDeductionYearly)}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '4px 8px' }}>Total Deduction</td>
                      <td style={{ padding: '4px 4px', textAlign: 'right' }}>₹</td>
                      <td style={{ padding: '4px 8px', textAlign: 'right' }}>{formatAmount(totalDeductionYearly)}</td>
                    </tr>
                    <tr style={{ background: '#15803D', color: '#FFFFFF', fontWeight: 'bold' }}>
                      <td style={{ padding: '5px 8px' }}>In Hand Salary</td>
                      <td style={{ padding: '5px 4px', textAlign: 'right' }}>₹</td>
                      <td style={{ padding: '5px 8px', textAlign: 'right' }}>{formatAmount(inHandSalaryYearly)}</td>
                    </tr>

                    {/* C. Employer Contribution */}
                    <tr style={{ fontWeight: 'bold', background: '#F1F5F9' }}>
                      <td colSpan={3} style={{ padding: '5px 8px', borderTop: '1px solid #000', borderBottom: '1px solid #000' }}>C. Employer Contribution</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '3px 8px', fontStyle: 'italic' }}>PF</td>
                      <td style={{ padding: '3px 4px', textAlign: 'right' }}>₹</td>
                      <td style={{ padding: '3px 8px', textAlign: 'right' }}>{formatAmount(employerPfYearly)}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '3px 8px', fontStyle: 'italic' }}>ESIC</td>
                      <td style={{ padding: '3px 4px', textAlign: 'right' }}>₹</td>
                      <td style={{ padding: '3px 8px', textAlign: 'right' }}>{formatAmount(employerEsicYearly)}</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #000' }}>
                      <td style={{ padding: '3px 8px', fontStyle: 'italic' }}>Gratuity</td>
                      <td style={{ padding: '3px 4px', textAlign: 'right' }}>₹</td>
                      <td style={{ padding: '3px 8px', textAlign: 'right' }}>{formatAmount(employerGratuityMonthly)}</td>
                    </tr>
                    <tr style={{ background: '#15803D', color: '#FFFFFF', fontWeight: 'bold' }}>
                      <td style={{ padding: '5px 8px' }}>Total Contribution</td>
                      <td style={{ padding: '5px 4px', textAlign: 'right' }}>₹</td>
                      <td style={{ padding: '5px 8px', textAlign: 'right' }}>{formatAmount(totalContributionYearly)}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '3px 8px', fontStyle: 'italic' }}>Bonus</td>
                      <td style={{ padding: '3px 4px', textAlign: 'right' }}>₹</td>
                      <td style={{ padding: '3px 8px', textAlign: 'right' }}>{formatAmount(bonusYearly)}</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #000' }}>
                      <td style={{ padding: '3px 8px', fontStyle: 'italic' }}>Medical</td>
                      <td style={{ padding: '3px 4px', textAlign: 'right' }}>₹</td>
                      <td style={{ padding: '3px 8px', textAlign: 'right' }}>{formatAmount(medicalYearlyContribution)}</td>
                    </tr>
                    <tr style={{ background: '#14532D', color: '#FFFFFF', fontWeight: 'bold' }}>
                      <td style={{ padding: '6px 8px' }}>CTC per Year</td>
                      <td style={{ padding: '6px 4px', textAlign: 'right' }}>₹</td>
                      <td style={{ padding: '6px 8px', textAlign: 'right' }}>{formatAmount(ctcPerYear)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div style={{ marginTop: '14px', fontSize: '9pt', fontWeight: 'bold', textAlign: 'center' }}>
                The above deductions are indicative purpose only and will be deducted as per the law.
              </div>
            </div>
          </div>

          <div>
            {renderRevisionBar(3)}
            {!hideHeader && !hasLetterhead && renderFooter()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OfferLetterPreview;

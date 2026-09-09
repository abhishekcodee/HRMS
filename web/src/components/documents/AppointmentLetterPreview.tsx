import React from 'react';
import { PageBreakDivider } from './PageBreakDivider';
import { CompanyLetterheadInfo } from './MultiDocumentPreview';

export interface CustomFieldConfig {
  id: string;
  label: string;
  value: string;
  type?: string;
  enabled?: boolean;
  visible?: boolean;
}

export interface AppointmentLetterData {
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
  employeeAddress?: string;
  city?: string;
  state?: string;
  pincode?: string;
  designation?: string;
  department?: string;
  joiningDate?: string;
  employeeCode?: string;
  acceptanceDate?: string;
  workLocation?: string;
  reportingManager?: string;
  reportingTime?: string;
  probationPeriod?: string;
  workingHours?: string;
  workingDays?: string;

  hrName?: string;
  hrDesignation?: string;

  // Salary components (Optional Annexure A)
  monthlyGross?: number;
  annualCtc?: number;
  basicSalary?: number;
  hra?: number;
  conveyanceAllowance?: number;
  specialAllowance?: number;
  otherAllowances?: number;
  otherComponents?: number;
  includeSalaryAnnexure?: boolean;

  // Custom Clauses / Dynamic Body Content
  customClauses?: { title: string; body?: string; text?: string }[];
  customSubject?: string;
  customOpeningText?: string;
  customClosingText?: string;

  // Additional Builder & Branding fields
  letterTitle?: string;
  watermarkText?: string;
  watermarkOpacity?: number;

  [key: string]: any;
}

interface AppointmentLetterPreviewProps {
  data: AppointmentLetterData;
  scale?: number;
  isEmbedded?: boolean;
  hideHeader?: boolean;
  activeLetterhead?: CompanyLetterheadInfo | null;
}

export const AppointmentLetterPreview: React.FC<AppointmentLetterPreviewProps> = ({
  data,
  scale = 1,
  isEmbedded = false,
  hideHeader = false,
  activeLetterhead = null,
}) => {
  const {
    companyName = '',
    companyAddress = '',
    companyLogo = '',
    companyEmail = '',
    companyPhone = '',

    letterDate = '',
    salutation = '',
    employeeName = '',
    designation = '',
    joiningDate = '',
    employeeCode = '',
    acceptanceDate = '',
    probationPeriod = '',

    hrName = '',
    hrDesignation = '',

    monthlyGross = 0,
    annualCtc = 0,
    basicSalary = 0,
    hra = 0,
    conveyanceAllowance = 0,
    specialAllowance = 0,
    otherAllowances = 0,
    includeSalaryAnnexure = false,

    watermarkText = '',
  } = data;

  const titlePrefix = salutation ? `${salutation} ` : '';
  const fullEmployeeName = employeeName ? `${titlePrefix}${employeeName}`.trim() : '';
  const displayDesignation = designation || '';
  const displayCompanyName = companyName || '';
  const displayCompanyAddress = companyAddress || '';
  const displayJoiningDate = joiningDate || '';
  const displayEmployeeCode = employeeCode || '';
  const displayHrName = hrName || '';
  const displayHrDesignation = hrDesignation || '';

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val || 0);
  };

  const totalPages = includeSalaryAnnexure && (annualCtc > 0 || monthlyGross > 0) ? 3 : 2;

  const renderTopHeader = (pageNum: number = 1) => (
    <div style={{ width: '100%', marginBottom: '16px', zIndex: 2, position: 'relative' }}>
      <div style={{ textAlign: 'right', fontSize: '11pt', color: '#1E293B', lineHeight: 1.4 }}>
        <div style={{ fontWeight: 600, fontSize: '13pt', color: '#0F172A' }}>[{displayCompanyName}]</div>
        <div style={{ color: '#475569', fontSize: '10.5pt' }}>[{displayCompanyAddress}]</div>
      </div>
      <div style={{ height: '1px', backgroundColor: '#94A3B8', width: '100%', marginTop: '8px', marginBottom: '8px' }} />
      <div style={{ textAlign: 'right', fontSize: '10.5pt', color: '#0F172A' }}>
        {letterDate}
      </div>
    </div>
  );

  const renderFooter = (pageNum: number, pagesTotal: number) => (
    <div style={{ width: '100%', marginTop: 'auto', paddingTop: '10px', zIndex: 2, position: 'relative' }}>
      <div style={{ height: '1px', backgroundColor: '#94A3B8', width: '100%', marginBottom: '8px' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '8.5pt', color: '#64748B' }}>
        <div>
          <span style={{ fontWeight: 600, color: '#475569' }}>[{displayCompanyName}]</span>
          <span> • Registered Office: [{displayCompanyAddress}]</span>
        </div>
        <div style={{ fontWeight: 600, color: '#475569', letterSpacing: '0.05em' }}>
          Page {pageNum} of {pagesTotal}
        </div>
      </div>
    </div>
  );

  const renderWatermark = () => {
    if (!watermarkText) return null;
    return (
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          opacity: 0.03,
          pointerEvents: 'none',
          zIndex: 0,
          fontSize: '110pt',
          fontWeight: 900,
          color: '#0F172A',
          letterSpacing: '0.1em',
          userSelect: 'none',
        }}
      >
        {watermarkText}
      </div>
    );
  };

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
  const topPaddingMm = (hasLetterhead || hideHeader) ? Math.max(margins.top || 48, 48) : 18;
  const bottomPaddingMm = (hasLetterhead || hideHeader) ? Math.max(margins.bottom || 60, 60) : 20;

  const pageStyle: React.CSSProperties = {
    width: '210mm',
    minWidth: '210mm',
    maxWidth: '210mm',
    minHeight: '297mm',
    height: '297mm',
    maxHeight: '297mm',
    paddingTop: `${topPaddingMm}mm`,
    paddingBottom: `${bottomPaddingMm}mm`,
    paddingLeft: `${leftPaddingMm}mm`,
    paddingRight: `${rightPaddingMm}mm`,
    backgroundColor: '#FFFFFF',
    color: '#1E293B',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    fontSize: '10pt',
    lineHeight: 1.5,
    boxSizing: 'border-box',
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    margin: '0 auto 24px auto',
    boxShadow: isEmbedded ? '0 4px 20px rgba(0,0,0,0.15)' : '0 10px 30px rgba(0,0,0,0.15)',
    overflow: 'hidden',
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
            padding: 18mm 22mm 18mm 22mm !important;
            page-break-after: always;
            break-after: page;
          }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* ========================================================
          PAGE 1: Exact Uploaded Reference Template (Clauses 1 to 7)
         ======================================================== */}
      <div className="document-page a4-page" style={pageStyle}>
        {renderLetterheadBg()}
        {!hideHeader && renderTopHeader(1)}
        {hideHeader && (
          <div style={{ textAlign: 'right', fontSize: '10.5pt', fontWeight: 600, color: '#0F172A', marginBottom: '14px' }}>
            {letterDate}
          </div>
        )}

        <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {renderWatermark()}

          <div style={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column' }}>
            {/* Document Title */}
            <div style={{ textAlign: 'center', margin: '4px 0 20px 0' }}>
              <h1 style={{ fontSize: '24pt', fontWeight: 500, color: '#1E293B', margin: 0, fontFamily: 'serif, system-ui' }}>
                Letter of Appointment
              </h1>
            </div>

            {/* Opening Block */}
            <div style={{ marginBottom: '16px', lineHeight: 1.55 }}>
              <div style={{ fontSize: '10.5pt', color: '#0F172A' }}>
                Dear <strong>[{fullEmployeeName}]</strong>,
              </div>
              <div style={{ marginTop: '10px', fontSize: '10.5pt', color: '#0F172A' }}>
                Appointment as <strong>[{displayDesignation}]</strong>
              </div>
              <div style={{ marginTop: '10px', textAlign: 'justify', fontSize: '10pt', color: '#334155' }}>
                We refer to your recent interview for the position and are please to advise that we are offering you the position with <strong>[{displayCompanyName}]</strong> effective from <strong>[{displayJoiningDate}]</strong> under the following terms and conditions:
              </div>
            </div>

            {/* Numbered Clauses 1 to 4 on Page 1 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'justify', fontSize: '9.5pt', color: '#334155', lineHeight: 1.45 }}>
              <div>
                <h3 style={{ fontSize: '11.5pt', fontWeight: 600, color: '#1E293B', margin: '0 0 2px 0' }}>
                  1. Posting & Transfer
                </h3>
                <p style={{ margin: 0 }}>
                  Your services are liable to be transferred, at the sole discretion of Management, in such other capacity as the company may determine, to any department / section, location, associate, sister concern or subsidiary, at any place in India or abroad, whether existing today or which may come up in future. In such a case, you will be governed by the terms and conditions of the service applicable at the new placement location.
                </p>
              </div>

              <div>
                <h3 style={{ fontSize: '11.5pt', fontWeight: 600, color: '#1E293B', margin: '0 0 2px 0' }}>
                  2. Probation
                </h3>
                <p style={{ margin: 0 }}>
                  That you will be on probation for a period of {probationPeriod}. The period of probation can be extended at the discretion of the Management and you will continue to be on probation till an order of confirmation has been issued in writing.
                </p>
              </div>

              <div>
                <h3 style={{ fontSize: '11.5pt', fontWeight: 600, color: '#1E293B', margin: '0 0 2px 0' }}>
                  3. Full time employment
                </h3>
                <p style={{ margin: 0 }}>
                  Your position is a whole time employment with the Company and you shall devote yourself exclusively to the business and interests of the company. You will not take up any other work for remuneration (part time or otherwise) or work in an advisory capacity, or be interested directly or indirectly (except as shareholder / debenture holder), in any other trade or business during your employment with the company, without permission in writing of the Management of the Company. You will also not seek membership of any local or public bodies without first obtaining specific permission from the Management.
                </p>
              </div>

              <div>
                <h3 style={{ fontSize: '11.5pt', fontWeight: 600, color: '#1E293B', margin: '0 0 2px 0' }}>
                  4. Confidentiality
                </h3>
                <p style={{ margin: 0 }}>
                  You will not, at any time, during the employment or after, without the consent of the Management disclose or divulge or make public, except on legal obligations, any information regarding the Company's affairs or administration or research carried out, whether the same is confided to you or becomes known to you in the course of your service or otherwise.
                </p>
              </div>
            </div>
          </div>
        </div>

        {!hideHeader && !hasLetterhead && renderFooter(1, totalPages)}
      </div>

      {/* Visual Page Break Indicator for Screen Preview */}
      <PageBreakDivider pageNumber={1} totalPages={totalPages} />

      {/* ========================================================
          PAGE 2: Exact Uploaded Reference Template (Clauses 5 to 9 + HR Signatory + Employee Acceptance)
         ======================================================== */}
      <div className="document-page a4-page" style={pageStyle}>
        {renderLetterheadBg()}
        {!hideHeader && renderTopHeader(2)}
        {hideHeader && (
          <div style={{ textAlign: 'right', fontSize: '10.5pt', fontWeight: 600, color: '#0F172A', marginBottom: '14px' }}>
            {letterDate}
          </div>
        )}
        <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column' }}>
          {renderWatermark()}

          <div style={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
            <div>
              {/* Clauses 5 to 9 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'justify', fontSize: '9.5pt', color: '#334155', lineHeight: 1.45 }}>
                <div>
                  <h3 style={{ fontSize: '11.5pt', fontWeight: 600, color: '#1E293B', margin: '0 0 2px 0' }}>
                    5. Intellectual Property
                  </h3>
                  <p style={{ margin: 0 }}>
                    If you conceive any new or advanced method of improving designs/ processes/ formulae/ systems, etc. in relation to the business/ operations of the Company, such developments will be fully communicated to the company and will be, and remain, the sole right/ property of the Company.
                  </p>
                </div>

                <div>
                  <h3 style={{ fontSize: '11.5pt', fontWeight: 600, color: '#1E293B', margin: '0 0 2px 0' }}>
                    6. Responsibilities & Duties
                  </h3>
                  <p style={{ margin: 0 }}>
                    Your work in the organization will be subject to the rules and regulations of the organization as laid down in relation to conduct, discipline and other matters. You will always be alive to responsibilities and duties attached to your office and conduct yourself accordingly. You must effectively perform to ensure results.
                  </p>
                </div>

                <div>
                  <h3 style={{ fontSize: '11.5pt', fontWeight: 600, color: '#1E293B', margin: '0 0 2px 0' }}>
                    7. Past Records
                  </h3>
                  <p style={{ margin: 0 }}>
                    This letter of appointment is based on the information furnished in your application for employment and during the interviews you had with us. If any declaration given, or information furnished by you, to the company proves to be false, or if you are found to have willfully suppressed any material information, in such cases, you will be liable to removal from services without any notice.
                  </p>
                </div>

                <div>
                  <h3 style={{ fontSize: '11.5pt', fontWeight: 600, color: '#1E293B', margin: '0 0 4px 0' }}>
                    8. Termination of employment
                  </h3>
                  <p style={{ margin: '0 0 6px 0' }}>
                    During the probationary period and any extension thereof, your services may be terminated without giving any notice or salary in lieu thereof. However, on confirmation the services can be terminated from either side by giving one month (30 days) notice or salary in lieu thereof.
                  </p>
                  <p style={{ margin: '0 0 6px 0' }}>
                    Upon resignation/termination of employment, you will immediately hand over to the Company all correspondence, specifications, formulae, books, documents, market data, cost data, drawings, affects or records belonging to the Company or relating to its business and shall not retain or make copies of these items.
                  </p>
                </div>

                <div>
                  <h3 style={{ fontSize: '11.5pt', fontWeight: 600, color: '#1E293B', margin: '0 0 4px 0' }}>
                    9. Authority
                  </h3>
                  <p style={{ margin: 0 }}>
                    No authority is vested upon you to make any financial commitment and enter into agreements/contracts/understandings of any nature with any second party and third party without seeking the prior permission/approval of the management. Any violation to exceed your specified authority as mentioned will be seriously viewed and disciplinary/appropriate legal action will be taken.
                  </p>
                </div>
              </div>

              {/* Acceptance prompt */}
              <div style={{ marginTop: '14px', fontSize: '9.5pt', color: '#334155' }}>
                If you agree to the above terms and conditions of the appointment, kindly confirm your acceptance by signing and returning the duplicate copy of this letter for our file and records.
              </div>

              {/* HR Signatory Block */}
              <div style={{ marginTop: '16px', lineHeight: 1.4, fontSize: '10pt', color: '#0F172A' }}>
                <div>Sincerely,</div>
                <div style={{ marginTop: '24px', fontWeight: 500 }}>[{displayHrName}]</div>
                <div>[{displayHrDesignation}]</div>
                <div>[{displayCompanyName}]</div>
              </div>
            </div>

            {/* Bottom Employee Acceptance Section */}
            <div style={{ marginTop: '18px', paddingTop: '12px', borderTop: '1px dashed #CBD5E1', fontSize: '9.5pt', color: '#0F172A', lineHeight: 1.4 }}>
              <div>I agree to the appointment and accept the above terms and conditions of service.</div>
              <div style={{ marginTop: '8px' }}>Name: <strong>[{fullEmployeeName}]</strong></div>
              <div>Employee ID : <strong>[{displayEmployeeCode}]</strong></div>
              <div>Date: <strong>{acceptanceDate}</strong></div>
              <div style={{ marginTop: '10px' }}>Signature: ....................................</div>
            </div>
          </div>
        </div>

        {!hideHeader && !hasLetterhead && renderFooter(2, totalPages)}
      </div>

      {/* ========================================================
          PAGE 3: Optional Annexure A Salary Breakdown Table
         ======================================================== */}
      {includeSalaryAnnexure && (annualCtc > 0 || monthlyGross > 0) && (
        <>
          <PageBreakDivider pageNumber={2} totalPages={3} label="PAGE BREAK (ANNEXURE A)" />
          <div className="document-page a4-page" style={pageStyle}>
            {renderLetterheadBg()}
            {!hideHeader && renderTopHeader(3)}

            <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {renderWatermark()}

              <div style={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column' }}>
                {/* Title */}
                <div style={{ textAlign: 'center', margin: '10px 0 18px 0' }}>
                  <h1 style={{ fontSize: '15pt', fontWeight: 700, color: '#0F172A', margin: 0, textDecoration: 'underline' }}>
                    ANNEXURE A — REMUNERATION & CTC BREAKDOWN
                  </h1>
                </div>

                {/* Employee Summary Bar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '6px', marginBottom: '18px', fontSize: '9.5pt' }}>
                  <div>Employee Name: <strong>{fullEmployeeName}</strong></div>
                  <div>Employee ID: <strong>{displayEmployeeCode}</strong></div>
                  <div>Designation: <strong>{displayDesignation}</strong></div>
                </div>

                {/* Salary Breakdown Table */}
                <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', fontSize: '9.5pt', marginBottom: '20px' }}>
                  <thead>
                    <tr style={{ background: '#F1F5F9', borderBottom: '1px solid #000' }}>
                      <th style={{ padding: '9px 12px', textAlign: 'left', borderRight: '1px solid #000' }}>Salary Component</th>
                      <th style={{ padding: '9px 12px', textAlign: 'right', borderRight: '1px solid #000' }}>Monthly (₹)</th>
                      <th style={{ padding: '9px 12px', textAlign: 'right' }}>Annualized CTC (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid #CBD5E1' }}>
                      <td style={{ padding: '8px 12px', borderRight: '1px solid #000' }}>Basic Salary</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', borderRight: '1px solid #000' }}>{formatCurrency(basicSalary)}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right' }}>{formatCurrency(basicSalary * 12)}</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #CBD5E1' }}>
                      <td style={{ padding: '8px 12px', borderRight: '1px solid #000' }}>House Rent Allowance (HRA)</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', borderRight: '1px solid #000' }}>{formatCurrency(hra)}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right' }}>{formatCurrency(hra * 12)}</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #CBD5E1' }}>
                      <td style={{ padding: '8px 12px', borderRight: '1px solid #000' }}>Conveyance Allowance</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', borderRight: '1px solid #000' }}>{formatCurrency(conveyanceAllowance)}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right' }}>{formatCurrency(conveyanceAllowance * 12)}</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #CBD5E1' }}>
                      <td style={{ padding: '8px 12px', borderRight: '1px solid #000' }}>Special Allowance</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', borderRight: '1px solid #000' }}>{formatCurrency(specialAllowance)}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right' }}>{formatCurrency(specialAllowance * 12)}</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #CBD5E1' }}>
                      <td style={{ padding: '8px 12px', borderRight: '1px solid #000' }}>Other Allowances & Benefits</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', borderRight: '1px solid #000' }}>{formatCurrency(otherAllowances)}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right' }}>{formatCurrency(otherAllowances * 12)}</td>
                    </tr>
                    <tr style={{ fontWeight: 'bold', background: '#F8FAFC' }}>
                      <td style={{ padding: '10px 12px', borderRight: '1px solid #000' }}>TOTAL COST TO COMPANY (CTC)</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', borderRight: '1px solid #000' }}>{formatCurrency(monthlyGross)}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right' }}>{formatCurrency(annualCtc)}</td>
                    </tr>
                  </tbody>
                </table>

                <div style={{ fontSize: '9pt', color: '#475569', lineHeight: 1.45 }}>
                  <p style={{ margin: '0 0 6px 0' }}>* Statutory deductions (TDS, Professional Tax, EPF) will be applicable as per Government regulations.</p>
                  <p style={{ margin: 0 }}>* Salary components are subject to company compensation policies and annual performance reviews.</p>
                </div>

                {/* Signatures on Annexure */}
                <div style={{ marginTop: '35px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', breakInside: 'avoid', pageBreakInside: 'avoid' }}>
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: '10pt', color: '#0F172A' }}>{displayHrName}</div>
                    <div style={{ fontSize: '9pt', color: '#475569' }}>{displayHrDesignation}</div>
                    <div style={{ fontWeight: 'bold', fontSize: '9pt', color: '#0F172A' }}>{displayCompanyName}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '9pt', color: '#475569', marginBottom: '8px' }}>Accepted & Acknowledged:</div>
                    <div style={{ fontWeight: 'bold', fontSize: '9.5pt', color: '#0F172A' }}>{fullEmployeeName}</div>
                  </div>
                </div>
              </div>
            </div>

            {!hideHeader && !hasLetterhead && renderFooter(3, totalPages)}
          </div>
        </>
      )}
    </div>
  );
};

export default AppointmentLetterPreview;

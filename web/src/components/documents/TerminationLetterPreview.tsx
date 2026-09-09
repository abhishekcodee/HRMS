import React from 'react';
import { formatFormalDate, resolveIndianFinancialYear } from '@hrms/shared';

export interface TerminationLetterData {
  companyName: string;
  companyAddress?: string;
  companyCin?: string;
  companyGstin?: string;
  companyLogoUrl?: string;
  logoHeightMm?: number;
  logoAlignment?: 'left' | 'center' | 'right';
  accentColor?: string;

  variantCode: 'notice' | 'misconduct' | 'probation';
  referenceNumber: string;
  generatedDate: string;

  employeeName: string;
  employeeCode: string;
  employeeAddress?: string;
  designation: string;
  department: string;
  workLocation: string;
  dateOfJoining: string;
  appointmentLetterDate: string;

  // Separation Block
  lastWorkingDay: string;
  noticePeriodDays?: number;
  noticeClauseRef?: string;
  noticePayMonths?: string;
  fnfDays?: number;
  showCauseDate?: string;
  inquiryReportDate?: string;
  misconductFacts?: string;
  probationEndDate?: string;
  reportingManager?: string;

  // Clause Toggles
  isGardenLeave?: boolean;
  isNoticePayInLieu?: boolean;
  isPropertyReturn?: boolean;
  isConfidentialityReminder?: boolean;
  isNonSolicitationReminder?: boolean;
  isStatutoryNote?: boolean;
  isNoDuesClearance?: boolean;
  isExperienceLetterOnClearance?: boolean;

  // Signatory
  signatoryName: string;
  signatoryDesignation: string;
  signatureImageUrl?: string;
  signatureMode?: 'printed' | 'blank_space';
}

export const TerminationLetterPreview: React.FC<{ data: TerminationLetterData; scale?: number }> = ({
  data,
  scale = 1,
}) => {
  const {
    companyName,
    companyAddress = 'Rabale MIDC, Navi Mumbai, MH 400701',
    companyCin = 'U28100MH2020PTC334967',
    companyLogoUrl = 'https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/building-2.svg',
    logoHeightMm = 16,
    logoAlignment = 'left',
    accentColor = '#1e3a8a',

    variantCode,
    referenceNumber,
    generatedDate,

    employeeName,
    employeeCode,
    employeeAddress = 'Navi Mumbai, Maharashtra',
    designation,
    department,
    workLocation = 'Navi Mumbai',
    dateOfJoining,
    appointmentLetterDate,

    lastWorkingDay,
    noticeClauseRef = '10',
    noticePayMonths = '1 month gross salary',
    fnfDays = 30,
    showCauseDate = '01 August 2026',
    inquiryReportDate = '20 August 2026',
    misconductFacts = 'Unauthorised absence and non-compliance with factory safety protocols on shopfloor.',
    probationEndDate = '31 August 2026',
    reportingManager = 'Plant HR Manager',

    isGardenLeave = false,
    isNoticePayInLieu = true,
    isPropertyReturn = true,
    isConfidentialityReminder = true,
    isNonSolicitationReminder = true,
    isNoDuesClearance = true,

    signatoryName,
    signatoryDesignation,
    signatureImageUrl,
    signatureMode = 'printed',
  } = data;

  const formalJoiningDate = formatFormalDate(dateOfJoining);
  const formalApptDate = formatFormalDate(appointmentLetterDate);
  const formalLastDay = formatFormalDate(lastWorkingDay);
  const formalIssueDate = formatFormalDate(generatedDate);
  const formalShowCause = formatFormalDate(showCauseDate);
  const formalInquiry = formatFormalDate(inquiryReportDate);
  const formalProbationEnd = formatFormalDate(probationEndDate);

  return (
    <div
      className="appointment-letter-a4-page"
      style={{
        width: '210mm',
        minHeight: '297mm',
        padding: '18mm 19mm 16mm 19mm',
        backgroundColor: '#FFFFFF',
        color: '#1A1A1A',
        fontFamily: 'Inter, sans-serif',
        fontSize: '10pt',
        lineHeight: 1.5,
        boxSizing: 'border-box',
        margin: '0 auto',
        boxShadow: '0 12px 32px rgba(0, 0, 0, 0.25)',
        transform: `scale(${scale})`,
        transformOrigin: 'top center',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      <style>{`
        @media print {
          @page { size: A4; margin: 0; }
          body { background: white !important; margin: 0 !important; }
          .appointment-letter-a4-page {
            width: 100% !important;
            box-shadow: none !important;
            margin: 0 !important;
            padding: 18mm 19mm 16mm 19mm !important;
            transform: none !important;
          }
          .no-print { display: none !important; }
          .page-break-inside-avoid { page-break-inside: avoid !important; }
        }
      `}</style>

      <div>
        {/* Header Block */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: `2px solid ${accentColor}`, paddingBottom: '0.75rem', marginBottom: '1.25rem' }}>
          <div style={{ textAlign: logoAlignment }}>
            {companyLogoUrl ? (
              <img src={companyLogoUrl} alt="Logo" style={{ height: `${logoHeightMm}mm`, maxWidth: '60mm', objectFit: 'contain' }} />
            ) : (
              <h2 style={{ margin: 0, color: accentColor, fontSize: '14pt', fontWeight: 700 }}>{companyName}</h2>
            )}
          </div>
          <div style={{ textAlign: 'right', fontSize: '8.5pt', color: '#4B5563', lineHeight: 1.3 }}>
            <div style={{ fontWeight: 700, color: '#111827', fontSize: '9.5pt' }}>{companyName}</div>
            <div>{companyAddress}</div>
            {companyCin && <div>CIN: {companyCin}</div>}
          </div>
        </div>

        {/* Reference & Date */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', fontSize: '9.5pt', fontWeight: 600 }}>
          <div>Ref: <span style={{ fontFamily: 'monospace' }}>{referenceNumber}</span></div>
          <div>Date: {formalIssueDate}</div>
        </div>

        {/* Employee Detail Box */}
        <div style={{ marginBottom: '1.25rem', backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '4px', padding: '0.75rem 1rem', fontSize: '9.5pt' }}>
          <div><strong>To,</strong></div>
          <div style={{ fontWeight: 700, color: accentColor, fontSize: '10.5pt' }}>{employeeName}</div>
          <div>Employee Code: <strong>{employeeCode}</strong></div>
          <div>{employeeAddress}</div>
        </div>

        {/* Subject Line */}
        <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
          <h3 style={{ display: 'inline-block', margin: 0, fontSize: '11pt', fontWeight: 700, color: accentColor, borderBottom: `1.5px solid ${accentColor}`, paddingBottom: '2px', textTransform: 'uppercase' }}>
            {variantCode === 'notice' && 'Subject: Termination of Employment'}
            {variantCode === 'misconduct' && 'Subject: Termination of Employment on Grounds of Misconduct'}
            {variantCode === 'probation' && 'Subject: Discontinuation of Services During Probation'}
          </h3>
        </div>

        {/* Salutation */}
        <p style={{ margin: '0 0 1rem 0' }}>Dear {employeeName.split(' ')[0]},</p>

        {/* VARIANT 1: NOTICE */}
        {variantCode === 'notice' && (
          <>
            <p style={{ margin: '0 0 0.85rem 0' }}>
              This is with reference to your appointment with <strong>{companyName}</strong> as <strong>{designation}</strong> in the <strong>{department}</strong> department at {workLocation}, dated {formalApptDate}, and effective from {formalJoiningDate}.
            </p>
            <p style={{ margin: '0 0 0.85rem 0' }}>
              In accordance with Clause {noticeClauseRef} of your appointment letter, the Company hereby gives you notice of termination of your employment. Your last working day with the Company will be <strong>{formalLastDay}</strong>.
            </p>
            {isNoticePayInLieu && (
              <p style={{ margin: '0 0 0.85rem 0', backgroundColor: '#EFF6FF', borderLeft: `3px solid ${accentColor}`, padding: '0.5rem 0.75rem' }}>
                In lieu of the balance notice period, the Company will pay you <strong>{noticePayMonths}</strong> as part of your full and final settlement.
              </p>
            )}
            {isGardenLeave && (
              <p style={{ margin: '0 0 0.85rem 0' }}>
                You are not required to report to the workplace during the notice period. You will remain on the rolls of the Company until <strong>{formalLastDay}</strong> and will continue to be bound by all employment terms.
              </p>
            )}
            <p style={{ margin: '0 0 0.5rem 0', fontWeight: 600 }}>You are requested to:</p>
            <ol style={{ margin: '0 0 0.85rem 1.25rem', padding: 0 }}>
              <li style={{ marginBottom: '0.35rem' }}>Complete formal handover of all pending work, files and responsibilities to <strong>{reportingManager}</strong> on or before your last working day.</li>
              {isPropertyReturn && <li style={{ marginBottom: '0.35rem' }}>Return all Company property in your possession, including identity card, access card, laptop, mobile phone, tools, instruments, drawings, documents and any physical/electronic data.</li>}
              {isNoDuesClearance && <li style={{ marginBottom: '0.35rem' }}>Obtain a signed no-dues clearance from all concerned departments.</li>}
            </ol>
            <p style={{ margin: '0 0 0.85rem 0' }}>
              Your full and final settlement, including all statutory dues payable to you, will be processed within <strong>{fnfDays} days</strong> of your last working day, subject to completion of handover and clearance.
            </p>
            {isConfidentialityReminder && (
              <p style={{ margin: '0 0 0.85rem 0' }}>
                Your obligations relating to confidentiality, intellectual property and non-solicitation as set out in your appointment letter shall survive the termination of your employment.
              </p>
            )}
          </>
        )}

        {/* VARIANT 2: MISCONDUCT */}
        {variantCode === 'misconduct' && (
          <>
            <p style={{ margin: '0 0 0.85rem 0' }}>
              This has reference to the show-cause notice issued to you on <strong>{formalShowCause}</strong> concerning misconduct proceedings.
            </p>
            <div style={{ backgroundColor: '#FEF2F2', borderLeft: '3px solid #DC2626', padding: '0.5rem 0.75rem', margin: '0 0 0.85rem 0', fontSize: '9.5pt' }}>
              <strong>Misconduct Particulars:</strong> {misconductFacts}
            </div>
            <p style={{ margin: '0 0 0.85rem 0' }}>
              You were given an opportunity to submit your explanation and to be heard in the inquiry conducted in this matter. The inquiry proceedings were concluded and the report dated <strong>{formalInquiry}</strong> was placed before the management.
            </p>
            <p style={{ margin: '0 0 0.85rem 0' }}>
              After considering the inquiry findings and your submissions, the management has concluded that the charges against you stand established and constitute misconduct under the applicable service rules of the Company.
            </p>
            <p style={{ margin: '0 0 0.85rem 0', fontWeight: 600, color: '#DC2626' }}>
              Accordingly, your services as {designation} in the {department} department stand terminated with effect from {formalLastDay}.
            </p>
            <p style={{ margin: '0 0 0.85rem 0' }}>
              You are directed to return all Company property in your possession, including identity card, access card, laptop, tools, instruments, drawings, documents and any physical or electronic data immediately.
            </p>
            <p style={{ margin: '0 0 0.85rem 0' }}>
              Your dues, if any, will be settled in accordance with the Company rules and applicable law, after adjustment of any amounts recoverable from you and on return of all Company property.
            </p>
          </>
        )}

        {/* VARIANT 3: PROBATION */}
        {variantCode === 'probation' && (
          <>
            <p style={{ margin: '0 0 0.85rem 0' }}>
              You were appointed as <strong>{designation}</strong> in the <strong>{department}</strong> department vide our letter dated {formalApptDate}, on probation for a period ending {formalProbationEnd}.
            </p>
            <p style={{ margin: '0 0 0.85rem 0' }}>
              Your performance during the probation period has been reviewed. The Company has decided not to confirm your services. Accordingly, in terms of Clause {noticeClauseRef} of your appointment letter, your employment stands discontinued with effect from <strong>{formalLastDay}</strong>.
            </p>
            {isNoticePayInLieu && (
              <p style={{ margin: '0 0 0.85rem 0', backgroundColor: '#EFF6FF', borderLeft: `3px solid ${accentColor}`, padding: '0.5rem 0.75rem' }}>
                You will be paid <strong>{noticePayMonths}</strong> in lieu of notice as part of your full and final settlement.
              </p>
            )}
            <p style={{ margin: '0 0 0.85rem 0' }}>
              Please complete handover of all pending work to <strong>{reportingManager}</strong> and return all Company property in your possession before your last working day.
            </p>
            <p style={{ margin: '0 0 0.85rem 0' }}>
              Your full and final settlement will be processed within <strong>{fnfDays} days</strong> of your last working day, subject to clearance.
            </p>
          </>
        )}

        <p style={{ margin: '1rem 0 1.5rem 0' }}>The Company thanks you for your services and wishes you well in your future endeavours.</p>
      </div>

      {/* Signatory Block & Acknowledgement */}
      <div className="page-break-inside-avoid" style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #E5E7EB' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.5rem' }}>
          <div>
            <div style={{ fontWeight: 600, color: '#374151', marginBottom: '1.5rem' }}>For <strong>{companyName}</strong></div>
            {signatureMode === 'printed' && signatureImageUrl ? (
              <img src={signatureImageUrl} alt="Signature" style={{ height: '14mm', objectFit: 'contain', marginBottom: '0.35rem' }} />
            ) : (
              <div style={{ height: '14mm' }}></div>
            )}
            <div style={{ fontWeight: 700, color: '#111827' }}>{signatoryName}</div>
            <div style={{ fontSize: '9pt', color: '#4B5563' }}>{signatoryDesignation}</div>
          </div>
        </div>

        {/* Acknowledgement Footer */}
        <div style={{ backgroundColor: '#F3F4F6', borderRadius: '4px', padding: '0.75rem 1rem', fontSize: '8.5pt', color: '#4B5563' }}>
          <div style={{ fontWeight: 700, color: '#111827', marginBottom: '0.25rem' }}>Acknowledgement of Receipt</div>
          <div>I hereby acknowledge receipt of this letter.</div>
          <div style={{ display: 'flex', gap: '2rem', marginTop: '0.5rem' }}>
            <div>Signature: ______________________</div>
            <div>Name: <strong>{employeeName}</strong></div>
            <div>Date: ____________</div>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { TerminationLetterPreview, TerminationLetterData } from './TerminationLetterPreview';
import { Printer, Send, Save, AlertTriangle, FileText, CheckCircle, Upload } from 'lucide-react';

interface TerminationLetterModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  designation: string;
  department: string;
  dateOfJoining: string;
  companyId?: string;
  onSuccess?: () => void;
}

export const TerminationLetterModal: React.FC<TerminationLetterModalProps> = ({
  isOpen,
  onClose,
  employeeId,
  employeeName,
  employeeCode,
  designation,
  department,
  dateOfJoining,
  companyId,
  onSuccess,
}) => {
  const [submitting, setSubmitting] = useState(false);
  const [activeVariant, setActiveVariant] = useState<'notice' | 'misconduct' | 'probation'>('notice');

  // Separation Form State
  const [lastWorkingDay, setLastWorkingDay] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [noticeClauseRef, setNoticeClauseRef] = useState('10');
  const [noticePayMonths, setNoticePayMonths] = useState('1 month gross salary');
  const [fnfDays, setFnfDays] = useState(30);
  const [reportingManager, setReportingManager] = useState('Plant HR Head');

  // Variant 2 Misconduct Fields
  const [showCauseDate, setShowCauseDate] = useState('2026-08-01');
  const [inquiryReportDate, setInquiryReportDate] = useState('2026-08-20');
  const [misconductFacts, setMisconductFacts] = useState('Unauthorised absence and non-compliance with shopfloor safety protocols.');
  
  // Mandatory Attachments for Variant 2
  const [showCauseUrl, setShowCauseUrl] = useState('');
  const [employeeReplyUrl, setEmployeeReplyUrl] = useState('');
  const [inquiryReportUrl, setInquiryReportUrl] = useState('');

  // Variant 3 Probation Fields
  const [probationEndDate, setProbationEndDate] = useState('2026-08-31');

  // Clause Toggles
  const [isGardenLeave, setIsGardenLeave] = useState(false);
  const [isNoticePayInLieu, setIsNoticePayInLieu] = useState(true);
  const [isPropertyReturn, setIsPropertyReturn] = useState(true);
  const [isConfidentialityReminder, setIsConfidentialityReminder] = useState(true);
  const [isNoDuesClearance, setIsNoDuesClearance] = useState(true);

  // Letter Data State
  const [letterData, setLetterData] = useState<TerminationLetterData>({
    companyName: 'ACME Automation Solutions Pvt. Ltd.',
    companyAddress: 'Rabale MIDC, Navi Mumbai, MH 400701',
    companyCin: 'U28100MH2020PTC334967',
    variantCode: 'notice',
    referenceNumber: 'AM/HR/TERM/2026-27/DRAFT',
    generatedDate: new Date().toISOString().split('T')[0],
    employeeName,
    employeeCode,
    employeeAddress: 'Navi Mumbai, MH',
    designation,
    department,
    workLocation: 'Navi Mumbai',
    dateOfJoining,
    appointmentLetterDate: dateOfJoining,
    lastWorkingDay,
    noticeClauseRef,
    noticePayMonths,
    fnfDays,
    reportingManager,
    showCauseDate,
    inquiryReportDate,
    misconductFacts,
    probationEndDate,
    isGardenLeave,
    isNoticePayInLieu,
    isPropertyReturn,
    isConfidentialityReminder,
    isNoDuesClearance,
    signatoryName: 'Head of Human Resources',
    signatoryDesignation: 'Authorized Signatory',
  });

  useEffect(() => {
    setLetterData((prev) => ({
      ...prev,
      variantCode: activeVariant,
      lastWorkingDay,
      noticeClauseRef,
      noticePayMonths,
      fnfDays,
      reportingManager,
      showCauseDate,
      inquiryReportDate,
      misconductFacts,
      probationEndDate,
      isGardenLeave,
      isNoticePayInLieu,
      isPropertyReturn,
      isConfidentialityReminder,
      isNoDuesClearance,
    }));
  }, [
    activeVariant,
    lastWorkingDay,
    noticeClauseRef,
    noticePayMonths,
    fnfDays,
    reportingManager,
    showCauseDate,
    inquiryReportDate,
    misconductFacts,
    probationEndDate,
    isGardenLeave,
    isNoticePayInLieu,
    isPropertyReturn,
    isConfidentialityReminder,
    isNoDuesClearance,
  ]);

  const handlePrint = () => {
    const previewEl = document.querySelector('.appointment-letter-a4-page');
    if (!previewEl) {
      window.print();
      return;
    }

    const printWin = window.open('', '_blank', 'width=900,height=1000');
    if (!printWin) return;

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Termination Letter - ${employeeName}</title>
          <style>
            @page { size: A4; margin: 0; }
            body { margin: 0; padding: 0; background: #ffffff; font-family: Inter, sans-serif; }
            .appointment-letter-a4-page { width: 100% !important; box-shadow: none !important; margin: 0 !important; }
            .page-break-inside-avoid { page-break-inside: avoid !important; }
          </style>
        </head>
        <body>
          ${previewEl.outerHTML}
          <script>
            setTimeout(function() { window.print(); window.close(); }, 300);
          </script>
        </body>
      </html>
    `);
    printWin.document.close();
  };

  const handleSubmitForApproval = async () => {
    // Attachment Validation for Variant 2 (Misconduct)
    if (activeVariant === 'misconduct') {
      if (!showCauseUrl || !employeeReplyUrl || !inquiryReportUrl) {
        alert('❌ MANDATORY ATTACHMENTS REQUIRED FOR VARIANT 2!\n\nFor Termination for Misconduct, you MUST provide links/uploads for:\n1. Show Cause Notice\n2. Employee Reply\n3. Inquiry Report');
        return;
      }
    }

    setSubmitting(true);
    try {
      // 1. Draft request
      const draftRes = await fetch('/api/v1/termination-letters/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: companyId,
          employee_id: employeeId,
          variant_code: activeVariant,
          last_working_day: lastWorkingDay,
          separation_data: letterData,
          attachments: {
            show_cause_url: showCauseUrl,
            employee_reply_url: employeeReplyUrl,
            inquiry_report_url: inquiryReportUrl,
          },
        }),
      });

      const draftJson = await draftRes.json();
      if (!draftJson.success) throw new Error(draftJson.error?.message || 'Draft failed');

      // 2. Submit for approval
      const subRes = await fetch(`/api/v1/termination-letters/${draftJson.data.id}/submit-approval`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attachments: {
            show_cause_url: showCauseUrl,
            employee_reply_url: employeeReplyUrl,
            inquiry_report_url: inquiryReportUrl,
          },
        }),
      });

      const subJson = await subRes.json();
      if (subJson.success) {
        alert('✅ Termination letter request submitted for 2nd Approver Review successfully!');
        if (onSuccess) onSuccess();
        onClose();
      } else {
        alert('❌ Error: ' + subJson.error?.message);
      }
    } catch (err: any) {
      alert('❌ Error submitting request: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Termination Letter Builder & 2nd Approver Workflow Studio"
      maxWidth="1550px"
    >
      <div style={{ display: 'flex', gap: '1.5rem', height: 'calc(100vh - 160px)' }}>
        {/* Left Sidebar: Controls & Attachment Slot */}
        <div
          style={{
            width: '450px',
            backgroundColor: 'var(--bg-secondary)',
            borderRadius: '8px',
            padding: '1.25rem',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
          }}
        >
          {/* Variant Selector Tabs */}
          <div>
            <label className="form-label" style={{ fontWeight: 700, marginBottom: '0.5rem' }}>Select Legal Termination Variant</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <button
                type="button"
                className={`button ${activeVariant === 'notice' ? 'button-primary' : 'button-secondary'}`}
                style={{ justifyContent: 'flex-start', textAlign: 'left', padding: '0.6rem 0.85rem' }}
                onClick={() => setActiveVariant('notice')}
              >
                <FileText size={16} style={{ marginRight: '8px', flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>Variant 1 — Notice (Contractual)</div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>Neutral contractual termination</div>
                </div>
              </button>

              <button
                type="button"
                className={`button ${activeVariant === 'misconduct' ? 'button-danger' : 'button-secondary'}`}
                style={{ justifyContent: 'flex-start', textAlign: 'left', padding: '0.6rem 0.85rem' }}
                onClick={() => setActiveVariant('misconduct')}
              >
                <AlertTriangle size={16} style={{ marginRight: '8px', flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>Variant 2 — Misconduct (After Inquiry)</div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>Requires 3 mandatory attachment files</div>
                </div>
              </button>

              <button
                type="button"
                className={`button ${activeVariant === 'probation' ? 'button-primary' : 'button-secondary'}`}
                style={{ justifyContent: 'flex-start', textAlign: 'left', padding: '0.6rem 0.85rem' }}
                onClick={() => setActiveVariant('probation')}
              >
                <FileText size={16} style={{ marginRight: '8px', flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>Variant 3 — Probation Discontinuation</div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>Discontinuation during probation</div>
                </div>
              </button>
            </div>
          </div>

          {/* Form Fields */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <Input
              label="Last Working Day"
              type="date"
              value={lastWorkingDay}
              onChange={(e) => setLastWorkingDay(e.target.value)}
              required
            />

            {activeVariant !== 'misconduct' && (
              <Input
                label="Appointment Letter Notice Clause Ref"
                value={noticeClauseRef}
                onChange={(e) => setNoticeClauseRef(e.target.value)}
                placeholder="e.g. 10"
              />
            )}

            <Input
              label="Reporting Manager for Handover"
              value={reportingManager}
              onChange={(e) => setReportingManager(e.target.value)}
            />

            <Input
              label="Full & Final Settlement Window (Days)"
              type="number"
              value={fnfDays}
              onChange={(e) => setFnfDays(Number(e.target.value))}
            />

            {/* VARIANT 2 MISCONDUCT SPECIFIC FIELDS */}
            {activeVariant === 'misconduct' && (
              <div style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#DC2626', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <AlertTriangle size={15} /> Misconduct & Inquiry Particulars
                </div>
                <Input
                  label="Show Cause Notice Date"
                  type="date"
                  value={showCauseDate}
                  onChange={(e) => setShowCauseDate(e.target.value)}
                />
                <Input
                  label="Inquiry Report Date"
                  type="date"
                  value={inquiryReportDate}
                  onChange={(e) => setInquiryReportDate(e.target.value)}
                />
                <div>
                  <label className="form-label" style={{ fontSize: '0.8rem' }}>Misconduct Factual Description</label>
                  <textarea
                    className="textarea"
                    rows={3}
                    value={misconductFacts}
                    onChange={(e) => setMisconductFacts(e.target.value)}
                    placeholder="Enter facts established in inquiry..."
                  />
                </div>

                {/* MANDATORY ATTACHMENT SLOTS FOR VARIANT 2 */}
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', marginTop: '0.25rem' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.8rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                    Mandatory Inquiry Attachments (Required)
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <Input
                      label="1. Show Cause Notice Document URL"
                      placeholder="e.g. /uploads/show_cause.pdf"
                      value={showCauseUrl}
                      onChange={(e) => setShowCauseUrl(e.target.value)}
                    />
                    <Input
                      label="2. Employee Reply Document URL"
                      placeholder="e.g. /uploads/reply.pdf"
                      value={employeeReplyUrl}
                      onChange={(e) => setEmployeeReplyUrl(e.target.value)}
                    />
                    <Input
                      label="3. Inquiry Report Document URL"
                      placeholder="e.g. /uploads/inquiry_report.pdf"
                      value={inquiryReportUrl}
                      onChange={(e) => setInquiryReportUrl(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* VARIANT 3 PROBATION SPECIFIC FIELDS */}
            {activeVariant === 'probation' && (
              <Input
                label="Probation End Date"
                type="date"
                value={probationEndDate}
                onChange={(e) => setProbationEndDate(e.target.value)}
              />
            )}
          </div>

          {/* Clause Checkboxes */}
          <div>
            <label className="form-label" style={{ fontWeight: 700, marginBottom: '0.5rem' }}>Optional Separation Clause Toggles</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input type="checkbox" checked={isNoticePayInLieu} onChange={(e) => setIsNoticePayInLieu(e.target.checked)} />
                Pay Notice Pay in Lieu
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input type="checkbox" checked={isGardenLeave} onChange={(e) => setIsGardenLeave(e.target.checked)} />
                Place Employee on Garden Leave
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input type="checkbox" checked={isPropertyReturn} onChange={(e) => setIsPropertyReturn(e.target.checked)} />
                Mandate Company Property & Laptop Return
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input type="checkbox" checked={isConfidentialityReminder} onChange={(e) => setIsConfidentialityReminder(e.target.checked)} />
                Confidentiality & Non-solicitation Reminder
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input type="checkbox" checked={isNoDuesClearance} onChange={(e) => setIsNoDuesClearance(e.target.checked)} />
                Require No-Dues Department Clearance
              </label>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
            <Button variant="primary" icon={<Send size={16} />} onClick={handleSubmitForApproval} isLoading={submitting}>
              Submit for 2nd Approver Review
            </Button>
            <Button variant="secondary" icon={<Printer size={16} />} onClick={handlePrint}>
              Print / Save PDF Preview
            </Button>
          </div>
        </div>

        {/* Right Canvas: Live A4 Preview */}
        <div style={{ flex: 1, overflowY: 'auto', backgroundColor: '#374151', borderRadius: '8px', padding: '2rem 1rem', display: 'flex', justifyContent: 'center' }}>
          <TerminationLetterPreview data={letterData} />
        </div>
      </div>
    </Modal>
  );
};

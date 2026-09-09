import { CompanyLetterheadInfo } from './MultiDocumentPreview';

export interface RelievingLetterData {
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
  relievingDate?: string;
  resignationDate?: string;
  hrName?: string;
  hrDesignation?: string;
  watermarkText?: string;
}

interface RelievingLetterPreviewProps {
  data: RelievingLetterData;
  scale?: number;
  isEmbedded?: boolean;
  hideHeader?: boolean;
  activeLetterhead?: CompanyLetterheadInfo | null;
}

export const RelievingLetterPreview: React.FC<RelievingLetterPreviewProps> = ({
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
    joiningDate = '',
    relievingDate = '',
    resignationDate = '',
    hrName = '',
    hrDesignation = '',
    watermarkText = '',
  } = data;

  const titlePrefix = salutation ? `${salutation} ` : '';
  const fullEmployeeName = `${titlePrefix}${employeeName}`.trim();

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

  const margins = activeLetterhead?.margins || { top: 25, bottom: 25, left: 20, right: 20 };
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
            margin: 0 !important;
            padding: 15mm 20mm 15mm 20mm !important;
          }
        }
      `}</style>

      <div
        className="a4-page"
        style={
          isEmbedded
            ? {
                width: '100%',
                minHeight: '297mm',
                paddingTop: `${topPaddingMm}mm`,
                paddingBottom: `${bottomPaddingMm}mm`,
                paddingLeft: '5px',
                paddingRight: '5px',
                backgroundColor: '#FFFFFF',
                color: '#0F172A',
                fontFamily: "'Times New Roman', Times, serif, 'Arial', sans-serif",
                fontSize: '11pt',
                lineHeight: 1.6,
                boxSizing: 'border-box',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }
            : {
                width: '210mm',
                minHeight: '297mm',
                paddingTop: `${topPaddingMm}mm`,
                paddingBottom: `${bottomPaddingMm}mm`,
                paddingLeft: '5px',
                paddingRight: '5px',
                backgroundColor: '#FFFFFF',
                color: '#0F172A',
                fontFamily: "'Times New Roman', Times, serif, 'Arial', sans-serif",
                fontSize: '11pt',
                lineHeight: 1.6,
                boxSizing: 'border-box',
                margin: '0 auto',
                boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }
        }
      >
        {renderLetterheadBg()}
        {!hideHeader && renderHeader()}

        <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', paddingLeft: '5px', paddingRight: '5px' }}>
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
                RELIEVING LETTER
              </h1>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <p style={{ margin: '0 0 10px 0', fontWeight: 'bold' }}>
                To, <br />
                {fullEmployeeName} <br />
                Employee ID: {employeeCode} <br />
                Designation: {designation}
              </p>
            </div>

            <div style={{ textAlign: 'justify', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <p style={{ margin: 0 }}>
                Dear {fullEmployeeName},
              </p>

              <p style={{ margin: 0 }}>
                With reference to your resignation letter dated <strong>{resignationDate}</strong>, we hereby accept your resignation and confirm that you are relieved from your services as <strong>{designation}</strong> in the <strong>{department}</strong> department of <strong>{companyName}</strong> effective from the close of business hours on <strong>{relievingDate}</strong>.
              </p>

              <p style={{ margin: 0 }}>
                We confirm that you have completed all handovers of company property, files, project documents, and keys. All outstanding dues have been settled as per company policy.
              </p>

              <p style={{ margin: 0 }}>
                We appreciate your contributions during your service with <strong>{companyName}</strong> from <strong>{joiningDate}</strong> to <strong>{relievingDate}</strong> and wish you the best in your future career endeavors.
              </p>
            </div>

            <div style={{ marginTop: '45px', breakInside: 'avoid', pageBreakInside: 'avoid' }}>
              <div style={{ margin: '0 0 10px 0' }}>Sincerely,</div>
              <div style={{ fontWeight: 'bold', fontSize: '11pt', color: '#0F172A' }}>{hrName}</div>
              <div style={{ fontSize: '9.5pt', color: '#475569' }}>{hrDesignation}</div>
              <div style={{ fontWeight: 'bold', fontSize: '9.5pt', color: '#0F172A' }}>{companyName}</div>
            </div>
          </div>
        </div>

        {!hideHeader && renderFooter()}
      </div>
    </div>
  );
};

export default RelievingLetterPreview;

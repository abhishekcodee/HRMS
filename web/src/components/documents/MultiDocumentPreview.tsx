import React from 'react';
import { AppointmentLetterPreview, AppointmentLetterData } from './AppointmentLetterPreview';
import { OfferLetterPreview, OfferLetterData } from './OfferLetterPreview';
import { LeavingCertificatePreview, LeavingCertificateData } from './LeavingCertificatePreview';
import { ExperienceCertificatePreview, ExperienceCertificateData } from './ExperienceCertificatePreview';
import { RelievingLetterPreview, RelievingLetterData } from './RelievingLetterPreview';
import { SalaryCertificatePreview, SalaryCertificateData } from './SalaryCertificatePreview';
import { WarningShowCausePreview, WarningShowCauseData } from './WarningShowCausePreview';
import { PayslipPreview, PayslipData } from './PayslipPreview';

export interface CompanyLetterheadInfo {
  id: string;
  version: number;
  fileName: string;
  fileUrl: string | null;
  fileType: string;
  margins?: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
}

interface MultiDocumentPreviewProps {
  documentType: string;
  data: any;
  scale?: number;
  activeLetterhead?: CompanyLetterheadInfo | null;
}

export const MultiDocumentPreview: React.FC<MultiDocumentPreviewProps> = ({
  documentType,
  data,
  scale = 1,
  activeLetterhead = null,
}) => {
  const margins = activeLetterhead?.margins || { top: 25, bottom: 25, left: 20, right: 20 };
  const hasLetterhead = Boolean(activeLetterhead && activeLetterhead.fileUrl);

  const renderDocumentBody = () => {
    switch (documentType) {
      case 'OFFER_LETTER':
        return <OfferLetterPreview data={data as OfferLetterData} isEmbedded={true} hideHeader={hasLetterhead} activeLetterhead={activeLetterhead} />;

      case 'APPOINTMENT_LETTER':
        return <AppointmentLetterPreview data={data as AppointmentLetterData} isEmbedded={true} hideHeader={hasLetterhead} activeLetterhead={activeLetterhead} />;

      case 'LEAVING_CERTIFICATE':
        return <LeavingCertificatePreview data={data as LeavingCertificateData} isEmbedded={true} hideHeader={hasLetterhead} activeLetterhead={activeLetterhead} />;

      case 'EXPERIENCE_CERTIFICATE':
        return <ExperienceCertificatePreview data={data as ExperienceCertificateData} isEmbedded={true} hideHeader={hasLetterhead} activeLetterhead={activeLetterhead} />;

      case 'RELIEVING_LETTER':
        return <RelievingLetterPreview data={data as RelievingLetterData} isEmbedded={true} hideHeader={hasLetterhead} activeLetterhead={activeLetterhead} />;

      case 'SALARY_CERTIFICATE':
        return <SalaryCertificatePreview data={data as SalaryCertificateData} isEmbedded={true} hideHeader={hasLetterhead} activeLetterhead={activeLetterhead} />;

      case 'WARNING_LETTER':
        return <WarningShowCausePreview data={data as WarningShowCauseData} isEmbedded={true} hideHeader={hasLetterhead} activeLetterhead={activeLetterhead} />;

      case 'PAYSLIP':
        return <PayslipPreview data={data as PayslipData} isEmbedded={true} hideHeader={hasLetterhead} activeLetterhead={activeLetterhead} />;

      default:
        return <AppointmentLetterPreview data={data as AppointmentLetterData} isEmbedded={true} hideHeader={hasLetterhead} activeLetterhead={activeLetterhead} />;
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: '100%',
      }}
    >
      {!hasLetterhead && (
        <div
          style={{
            maxWidth: '210mm',
            width: '100%',
            marginBottom: '16px',
            padding: '10px 14px',
            backgroundColor: '#EFF6FF',
            border: '1px solid #BFDBFE',
            borderRadius: '8px',
            fontSize: '12px',
            color: '#1E40AF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>ℹ️ <strong>No active custom uploaded letterhead configured.</strong> Using standard company corporate letterhead format.</span>
        </div>
      )}

      <div
        style={{
          position: 'relative',
          width: '210mm',
          minWidth: '210mm',
          maxWidth: '210mm',
          margin: '0 auto',
          transform: `scale(${scale})`,
          transformOrigin: 'top center',
        }}
      >
        {renderDocumentBody()}
      </div>
    </div>
  );
};

export default MultiDocumentPreview;

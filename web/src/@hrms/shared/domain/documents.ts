export interface DocumentCategory {
  id: string;
  companyId?: string | null;
  name: string;
  code: string;
  description?: string | null;
  isSystem: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentType {
  id: string;
  companyId?: string | null;
  categoryId: string;
  categoryName?: string;
  name: string;
  code: string;
  description?: string | null;
  requiresApproval: boolean;
  requiresSignature: boolean;
  requiresEmployeeAccess: boolean;
  approvalChain?: string[]; // Array of roles/user IDs required in sequence
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface DocumentTemplateVersion {
  id: string;
  templateId: string;
  versionNumber: number;
  content: string; // Rich HTML/markdown content with {{variables}}
  cssStyles?: string | null;
  headerTemplate?: string | null;
  footerTemplate?: string | null;
  signatoryName?: string | null;
  signatoryDesignation?: string | null;
  signatorySignatureUrl?: string | null;
  companyLogoUrl?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  changeSummary?: string | null;
  createdBy: string;
  createdAt: string;
}

export interface DocumentTemplate {
  id: string;
  companyId?: string | null;
  documentTypeId: string;
  documentTypeName?: string;
  name: string;
  description?: string | null;
  currentVersionId?: string | null;
  currentVersionNumber: number;
  numberingFormat?: string | null; // e.g. {{company_code}}/HR/{{type_code}}/{FY}/{SEQ:0000}
  isActive: boolean;
  versions?: DocumentTemplateVersion[];
  createdAt: string;
  updatedAt: string;
}

export type DocumentStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'APPROVED'
  | 'REJECTED'
  | 'FINAL'
  | 'REVOKED'
  | 'ARCHIVED';

export interface DocumentInstance {
  id: string;
  companyId: string;
  companyName?: string;
  employeeId: string;
  employeeName?: string;
  employeeCode?: string;
  departmentName?: string;
  documentTypeId: string;
  documentTypeName?: string;
  categoryName?: string;
  templateId?: string | null;
  templateVersionId?: string | null;
  templateVersionNumber?: number;
  referenceNumber: string;
  title: string;
  status: DocumentStatus;
  htmlSnapshot?: string | null;
  pdfPath?: string | null;
  fileSize?: string | null;
  documentHash?: string | null; // SHA-256
  metadataJson?: Record<string, any> | null;
  generatedBy: string;
  generatedByName?: string;
  approvedAt?: string | null;
  signedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentApproval {
  id: string;
  documentId: string;
  stepOrder: number;
  approverRoleId?: string | null;
  approverRoleName?: string | null;
  approverUserId?: string | null;
  approverUserName?: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  comments?: string | null;
  actionAt?: string | null;
  createdAt: string;
}

export interface DocumentSignature {
  id: string;
  documentId: string;
  signatoryType: 'COMPANY' | 'EMPLOYEE' | 'WITNESS';
  signatoryName: string;
  signatoryDesignation?: string | null;
  signatureImage?: string | null;
  signedAt: string;
  ipAddress?: string | null;
}

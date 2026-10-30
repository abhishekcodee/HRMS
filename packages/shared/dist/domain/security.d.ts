export interface GranularPermission {
    id: string;
    code: string;
    module: string;
    description: string;
}
export interface SecurityAuditLog {
    id: string;
    companyId?: string | null;
    actorUserId?: string | null;
    actorUserEmail?: string | null;
    actorRole?: string | null;
    action: string;
    resourceType: string;
    resourceId?: string | null;
    status: 'SUCCESS' | 'FAILURE' | 'DENIED';
    ipAddress?: string | null;
    userAgent?: string | null;
    metadataJson?: string | Record<string, any> | null;
    createdAt: string;
}
export interface MFASetting {
    userId: string;
    mfaEnabled: boolean;
    mfaMethod: 'TOTP' | 'EMAIL';
    totpSecretConfigured: boolean;
    backupCodesCount: number;
}
export interface UserSessionRecord {
    id: string;
    userId: string;
    tokenHash: string;
    deviceInfo?: string | null;
    ipAddress?: string | null;
    expiresAt: string;
    isRevoked: boolean;
    createdAt: string;
    lastActiveAt: string;
}
//# sourceMappingURL=security.d.ts.map
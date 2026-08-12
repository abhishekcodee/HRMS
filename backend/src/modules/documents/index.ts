import { Router } from 'express';

/**
 * Documents Module Boundary
 * Responsibilities: Employee document uploads, identity proof verification, file metadata.
 */
export const documentsModule = {
  name: 'documents',
  version: '1.0.0',
  router: Router(),
};

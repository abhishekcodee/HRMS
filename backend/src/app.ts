import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { env } from './config/env.js';
import { v1Router } from './routes/index.js';
import { zktecoRouter } from './routes/zkteco.routes.js';
import { errorHandler } from './middleware/error.middleware.js';
import { AppError } from './utils/app-error.js';

import { setSecurityHeaders } from './security/securityHeaders.js';
import { csrfProtection } from './security/csrfSecurity.js';

export const app = express();

// Security Middlewares
app.use(helmet());
app.use(setSecurityHeaders);
app.use(csrfProtection);
app.use(
  cors({
    origin: true, // Allow all origins in development
    credentials: true,
  })
);

// Logging & Body Parsing Middlewares
app.use(morgan(env.NODE_ENV === 'development' ? 'dev' : 'combined'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// eSSL / ZKTeco Biometric ADMS Hardware Direct Push Handler
app.use('/iclock', zktecoRouter);

// Static Uploads Directory Serving
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
app.use('/uploads', express.static(path.join(process.cwd(), 'public', 'uploads')));
app.use('/uploads', express.static(path.resolve('uploads')));
app.use('/uploads', express.static(path.join(process.cwd(), 'backend', 'uploads')));

// API Versioned Routing
app.use(env.API_PREFIX, v1Router);

// Catch-all 404 handler for undefined routes
app.use('*', (req, _res, next) => {
  next(new AppError(`Route ${req.originalUrl} not found`, 404, 'NOT_FOUND'));
});

// Centralized Error Handling Middleware
app.use(errorHandler);

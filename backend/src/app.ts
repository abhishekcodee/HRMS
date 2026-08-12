import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';
import { v1Router } from './routes/index.js';
import { errorHandler } from './middleware/error.middleware.js';
import { AppError } from './utils/app-error.js';

export const app = express();

// Security Middlewares
app.use(helmet());
app.use(
  cors({
    origin: env.CORS_ORIGIN.split(','),
    credentials: true,
  })
);

// Logging & Body Parsing Middlewares
app.use(morgan(env.NODE_ENV === 'development' ? 'dev' : 'combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Versioned Routing
app.use(env.API_PREFIX, v1Router);

// Catch-all 404 handler for undefined routes
app.use('*', (req, _res, next) => {
  next(new AppError(`Route ${req.originalUrl} not found`, 404, 'NOT_FOUND'));
});

// Centralized Error Handling Middleware
app.use(errorHandler);

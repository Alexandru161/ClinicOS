import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import pino from 'pino';
import { env } from './config/env';
import { apiRouter } from './routes';
import { errorHandler, notFoundHandler } from './middleware/error';

export const app = express();

app.disable('x-powered-by');
app.use(helmet());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true
  })
);
app.use(
  pinoHttp({
    logger: pino({
      level: env.NODE_ENV === 'production' ? 'info' : 'debug'
    })
  })
);

app.get('/api', (_request, response) => {
  response.json({
    service: 'clinicos-api',
    version: '1.0.0',
    status: 'operational'
  });
});

app.use('/api', apiRouter);
app.use(notFoundHandler);
app.use(errorHandler);
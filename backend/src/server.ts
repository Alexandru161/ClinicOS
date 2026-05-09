import { app } from './app';
import { env } from './config/env';

const server = app.listen(env.PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`ClinicOS API running on port ${env.PORT}`);
});

function shutdown(signal: string) {
  // eslint-disable-next-line no-console
  console.log(`Received ${signal}, shutting down.`);
  server.close(() => {
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
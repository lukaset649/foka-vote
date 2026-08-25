import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { prisma } from './lib/prisma.js';
import { ensureUploadDirs } from './lib/storage.js';

const SHUTDOWN_TIMEOUT_MS = 10_000;

await ensureUploadDirs();

const app = createApp();
const server = app.listen(env.PORT, env.HOST, () => {
  logger.info(`API listening on http://${env.HOST}:${env.PORT}`);
});

let shuttingDown = false;

function shutdown(signal: string, exitCode: number): void {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;

  logger.info(`Received ${signal}, shutting down`);

  const forceExitTimer = setTimeout(() => {
    logger.error('Graceful shutdown timed out, forcing exit');
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);
  forceExitTimer.unref();

  server.close((err) => {
    clearTimeout(forceExitTimer);
    if (err) {
      logger.error('Error while closing server', { error: err.message });
      process.exit(1);
      return;
    }
    prisma
      .$disconnect()
      .catch((disconnectError: unknown) => {
        const message =
          disconnectError instanceof Error ? disconnectError.message : String(disconnectError);
        logger.error('Error while disconnecting Prisma', { error: message });
      })
      .finally(() => {
        logger.info('Server closed cleanly');
        process.exit(exitCode);
      });
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM', 0));
process.on('SIGINT', () => shutdown('SIGINT', 0));

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { error: error.message, stack: error.stack });
  shutdown('uncaughtException', 1);
});

process.on('unhandledRejection', (reason) => {
  const message = reason instanceof Error ? reason.message : String(reason);
  const stack = reason instanceof Error ? reason.stack : undefined;
  logger.error('Unhandled rejection', { error: message, stack });
  shutdown('unhandledRejection', 1);
});

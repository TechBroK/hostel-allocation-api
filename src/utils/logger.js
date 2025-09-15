import pino from 'pino';

// LOG_LEVEL env var or default
const level = process.env.LOG_LEVEL || 'info';

// Configure base pino instance (pretty-print can be layered externally in dev using pino-pretty)
export const logger = pino({
  level,
  base: undefined, // omit pid/hostname for lean logs
  timestamp: () => `,"time":"${new Date().toISOString()}"`
});

export function logInfo(event, data = {}) {
  logger.info({ event, ...data });
}

export function logError(event, data = {}) {
  logger.error({ event, ...data });
}

// Backward compatible default export: provide info/error methods so legacy imports using logger.info still work.
export default {
  logInfo,
  logError,
  logger,
  info: (...args) => logger.info(...args),
  error: (...args) => logger.error(...args)
};

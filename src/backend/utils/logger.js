import pino from 'pino';
import pinoHttp from 'pino-http';

const level = process.env.LOG_LEVEL || 'info';

const logger = pino({
  level,
  base: { pid: false },
  timestamp: pino.stdTimeFunctions.isoTime
});

// http middleware will attach req.log
const httpLogger = pinoHttp({ logger });

export { logger, httpLogger };

import pino from 'pino';
import pinoHttp from 'pino-http';

const level = process.env.LOG_LEVEL || 'info';

const logger = pino({
  level,
  base: { pid: false },
  timestamp: pino.stdTimeFunctions.isoTime
});

// http middleware — log only the fields that matter
const httpLogger = pinoHttp({
  logger,
  serializers: {
    req: (req) => ({ method: req.method, url: req.url }),
    res: (res) => ({ statusCode: res.statusCode })
  },
  customSuccessMessage: (req, res) =>
    `${req.method} ${req.url} ${res.statusCode}`,
  customErrorMessage: (req, res, err) =>
    `${req.method} ${req.url} ${res.statusCode} - ${err.message}`
});

export { logger, httpLogger };

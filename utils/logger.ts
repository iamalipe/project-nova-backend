import { createMiddleware } from 'hono/factory';
import util from 'util';
import { createLogger, format, transports } from 'winston';

// Custom printf for console (color + pretty)
const consoleFormat = format.combine(
  format.colorize(),
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  format.printf(({ timestamp, level, message, ...meta }) => {
    const splat: any = meta[Symbol.for('splat')];
    let extra = '';
    // @ts-ignore
    if (splat && splat.length > 0) {
      extra = ' ' + util.inspect(splat[0], { depth: null, colors: true });
    }

    return `[${timestamp}] ${level}: ${message}${extra}`;
  }),
);

// File format (strict JSON)
const fileFormat = format.combine(format.timestamp(), format.json());

export const logger = createLogger({
  level: 'info',
  transports: [
    new transports.Console({ format: consoleFormat }),
    new transports.File({ filename: 'log/server.log', format: fileFormat }),
  ],
});

// Native Hono middleware mimicking morgan('tiny')
export const requestLogger = createMiddleware(async (c, next) => {
  const start = Date.now();

  // Wait for the request to be processed by other middlewares/controllers
  await next();

  const ms = Date.now() - start;
  const method = c.req.method;
  const url = c.req.path;
  const status = c.res.status;
  const contentLength = c.res.headers.get('content-length') || '-';

  // Format: :method :url :status :res[content-length] - :response-time ms
  const message = `${method} ${url} ${status} ${contentLength} - ${ms}ms`;

  logger.info(message);
});

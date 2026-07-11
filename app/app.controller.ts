import type { Context } from 'hono';
import { stream, streamSSE } from 'hono/streaming';

import { FRONTEND_URL } from '../config/default';
import { getRootHTML, getTempLogHTML } from '../config/static';
import { s3Get } from '../services/s3.services';
import { getTempLogs } from '../services/tempLog.service';
import { AppError } from '../utils/appError.utils';

export const rootController = async (c: Context) => {
  return c.html(getRootHTML(String(FRONTEND_URL)));
};

export const tempLogController = async (c: Context) => {
  const logs = getTempLogs();
  return c.html(getTempLogHTML(logs));
};

export const healthCheckController = async (c: Context) => {
  return c.body(null, 200);
};

// Fetch image from S3 route
export const getImageController = async (c: Context) => {
  const key = c.req.param('*');
  if (!key) {
    throw new AppError('Key is required', { status: 400 });
  }

  try {
    const s3Response = await s3Get(key);
    if (s3Response.ContentType) {
      c.header('Content-Type', s3Response.ContentType);
    }
    if (s3Response.ContentLength) {
      c.header('Content-Length', String(s3Response.ContentLength));
    }

    const body = s3Response.Body;
    if (body) {
      return c.body(body as any);
    } else {
      throw new AppError('Image stream not found', { status: 404 });
    }
  } catch (error: any) {
    if (error.name === 'NoSuchKey') {
      throw new AppError('Image not found', { status: 404 });
    }
    throw error;
  }
};

export const sseDemoController = async (c: Context) => {
  // streamSSE automatically sets the correct Content-Type, Cache-Control, and Connection headers
  return streamSSE(c, async (stream) => {
    await stream.writeSSE({
      data: JSON.stringify({
        status: 'connected',
        message: 'SSE Connection Established',
      }),
    });

    for (let count = 1; count <= 20; count++) {
      // Break the loop instantly if the client disconnects
      if (stream.aborted) break;

      const data = {
        count,
        timestamp: new Date().toISOString(),
        message: `Tick #${count} from Hono server`,
      };

      await stream.writeSSE({ data: JSON.stringify(data) });

      if (count >= 20) {
        await stream.writeSSE({
          data: JSON.stringify({ status: 'done', message: 'Stream completed' }),
        });
        break;
      }

      // Hono's stream object has a built-in sleep utility!
      await stream.sleep(1000);
    }
  });
};

export const readableStreamDemoController = async (c: Context) => {
  // Set custom headers for NDJSON before opening the stream
  c.header('Content-Type', 'application/x-ndjson');
  c.header('Transfer-Encoding', 'chunked');
  c.header('X-Accel-Buffering', 'no');

  return stream(c, async (stream) => {
    for (let count = 1; count <= 20; count++) {
      if (stream.aborted) break;

      const data = {
        count,
        timestamp: new Date().toISOString(),
        message: `Readable Stream chunk #${count}`,
      };

      await stream.write(JSON.stringify(data) + '\n');

      if (count >= 20) {
        await stream.write(
          JSON.stringify({ status: 'done', message: 'Stream completed' }) +
            '\n',
        );
        break;
      }

      await stream.sleep(1000);
    }
  });
};

export const longPollDemoController = async (c: Context) => {
  // c.req.query() replaces req.query
  const queryCount = c.req.query('count');
  const clientCount = parseInt(queryCount || '0', 10);

  // Simulate server-side wait for the next event (1 second delay)
  await new Promise((resolve) => setTimeout(resolve, 1000));

  const nextCount = clientCount + 1;
  const isDone = nextCount >= 20;

  return c.json({
    count: nextCount,
    timestamp: new Date().toISOString(),
    message: isDone
      ? 'Long poll stream completed'
      : `Long poll response for tick #${nextCount}`,
    status: isDone ? 'done' : 'connected',
  });
};

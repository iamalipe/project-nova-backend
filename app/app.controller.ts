import type { Context } from 'hono';
import { stream, streamSSE } from 'hono/streaming';

import { FRONTEND_URL } from '../config/default';
import { s3Get } from '../services/s3.services';
import { getTempLogs } from '../services/tempLog.service';
import { AppError } from '../utils/appError.utils';

export const rootController = async (c: Context) => {
  return c.html(`<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>SafalEvents API</title>
  </head>
  <body>
    <h1>SafalEvents Backend</h1>
    <p>Frontend URL: <a href="${FRONTEND_URL}">${FRONTEND_URL}</a></p>
    <p>Temp Log: <a href="/temp-log">/temp-log</a></p>
  </body>
</html>`);
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

export const tempLogController = async (c: Context) => {
  const logs = getTempLogs();

  const rows = logs
    .map(
      (log) => `
    <tr>
      <td>${escapeHtml(log.createdAt)}</td>
      <td>${escapeHtml(log.channel.toUpperCase())}</td>
      <td>${escapeHtml(log.to)}</td>
      <td>${escapeHtml(log.subject || '-')}</td>
      <td><pre>${escapeHtml(log.content)}</pre></td>
    </tr>`,
    )
    .join('');

  c.html(`<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>SafalEvents Demo Log</title>
    <style>
      body { font-family: sans-serif; margin: 2rem; }
      table { border-collapse: collapse; width: 100%; }
      th, td { border: 1px solid #ccc; padding: 8px; text-align: left; vertical-align: top; }
      th { background: #f5f5f5; }
      pre { white-space: pre-wrap; word-break: break-word; margin: 0; }
      tr:nth-child(even) { background: #fafafa; }
    </style>
  </head>
  <body>
    <h1>Demo Email &amp; SMS Log</h1>
    <p>Last ${logs.length} demo message(s) captured while EMAIL_ENABLE / SMS_ENABLE are disabled.</p>
    <table>
      <thead>
        <tr><th>Time</th><th>Channel</th><th>To</th><th>Subject</th><th>Content</th></tr>
      </thead>
      <tbody>
        ${rows || '<tr><td colspan="5">No demo logs yet.</td></tr>'}
      </tbody>
    </table>
  </body>
</html>`);
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

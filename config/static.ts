import type { TempLogEntry } from '../services/tempLog.service';

export const scalarHTML = `
<!DOCTYPE html>
<html>
  <head>
    <title>Project Nova API Reference | Hono Backend</title>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>body { margin: 0; }</style>
  </head>
  <body>
    <script
      id="api-reference"
      data-url="/docs/json"
      data-configuration='{"theme": "purple"}'></script>
    <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
  </body>
</html>
    `;

export const getRootHTML = (frontendUrl: string): string => {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Project Nova API | Console</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&display=swap" rel="stylesheet">
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        font-family: 'Outfit', sans-serif;
        background: radial-gradient(circle at 50% 0%, #1e1b4b, #0f172a);
        color: #f8fafc;
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        overflow: hidden;
      }
      .container {
        max-width: 600px;
        width: 100%;
        background: rgba(15, 23, 42, 0.6);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 24px;
        padding: 40px;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
        text-align: center;
        position: relative;
      }
      .container::before {
        content: '';
        position: absolute;
        top: -2px; left: -2px; right: -2px; bottom: -2px;
        background: linear-gradient(135deg, #6366f1, #d946ef);
        border-radius: 26px;
        z-index: -1;
        opacity: 0.15;
      }
      .status-pulse {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        background: rgba(16, 185, 129, 0.1);
        border: 1px solid rgba(16, 185, 129, 0.2);
        color: #10b981;
        padding: 6px 14px;
        border-radius: 100px;
        font-size: 0.85rem;
        font-weight: 600;
        margin-bottom: 24px;
        letter-spacing: 0.5px;
      }
      .status-dot {
        width: 8px;
        height: 8px;
        background-color: #10b981;
        border-radius: 50%;
        box-shadow: 0 0 8px #10b981;
        animation: pulse 1.5s infinite;
      }
      @keyframes pulse {
        0% { transform: scale(0.9); opacity: 0.6; }
        50% { transform: scale(1.15); opacity: 1; box-shadow: 0 0 12px #10b981; }
        100% { transform: scale(0.9); opacity: 0.6; }
      }
      h1 {
        font-size: 2.5rem;
        font-weight: 700;
        background: linear-gradient(135deg, #818cf8, #f472b6);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        margin-bottom: 12px;
        letter-spacing: -0.5px;
      }
      .subtitle {
        color: #94a3b8;
        font-size: 1.05rem;
        line-height: 1.6;
        margin-bottom: 32px;
        font-weight: 300;
      }
      .links-group {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .btn {
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.08);
        padding: 16px 24px;
        border-radius: 14px;
        color: #e2e8f0;
        text-decoration: none;
        font-weight: 600;
        transition: all 0.25s ease;
      }
      .btn:hover {
        background: rgba(99, 102, 241, 0.1);
        border-color: rgba(99, 102, 241, 0.4);
        color: #a5b4fc;
        transform: translateY(-2px);
      }
      .btn-arrow {
        transition: transform 0.2s ease;
      }
      .btn:hover .btn-arrow {
        transform: translateX(4px);
      }
      .footer {
        margin-top: 32px;
        font-size: 0.8rem;
        color: #64748b;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="status-pulse">
        <span class="status-dot"></span> Active & Online
      </div>
      <h1>Project Nova Backend</h1>
      <p class="subtitle">Welcome to the central high-performance Hono & Prisma API gateway dashboard.</p>

      <div class="links-group">
        <a href="${frontendUrl}" target="_blank" class="btn">
          <span>Go to Frontend</span>
          <span class="btn-arrow">→</span>
        </a>
        <a href="/temp-log" class="btn">
          <span>View Email & SMS Sandbox Logs</span>
          <span class="btn-arrow">→</span>
        </a>
        <a href="/docs" class="btn">
          <span>API Documentation Spec</span>
          <span class="btn-arrow">→</span>
        </a>
      </div>

      <p class="footer">Project Nova Gateway • Built with Hono & Prisma</p>
    </div>
  </body>
</html>`;
};

export const getTempLogHTML = (logs: TempLogEntry[]): string => {
  const escapeHtml = (val: string) =>
    val
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

  const rows = logs
    .map((log) => {
      const channelLabel = log.channel === 'email' ? 'EMAIL' : 'SMS';
      const badgeStyle =
        log.channel === 'email'
          ? 'background: rgba(167, 139, 250, 0.15); border: 1px solid rgba(167, 139, 250, 0.25); color: #c4b5fd;'
          : 'background: rgba(56, 189, 248, 0.15); border: 1px solid rgba(56, 189, 248, 0.25); color: #7dd3fc;';

      const formattedDate = new Date(log.createdAt).toLocaleString();

      return `
      <tr>
        <td style="color: #94a3b8; font-weight: 300;">${escapeHtml(formattedDate)}</td>
        <td>
          <span class="badge" style="${badgeStyle}">
            ${channelLabel}
          </span>
        </td>
        <td style="color: #f1f5f9; font-weight: 600; font-family: monospace;">${escapeHtml(log.to)}</td>
        <td style="color: #cbd5e1; max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(log.subject || '-')}</td>
        <td>
          <div class="content-box">
            <pre>${escapeHtml(log.content)}</pre>
          </div>
        </td>
      </tr>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Project Nova Email & SMS Sandbox Logs</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&display=swap" rel="stylesheet">
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        font-family: 'Outfit', sans-serif;
        background: radial-gradient(circle at 50% 0%, #171717, #0a0a0a);
        color: #f8fafc;
        min-height: 100vh;
        padding: 40px 20px;
      }
      .wrapper {
        max-width: 1200px;
        margin: 0 auto;
      }
      .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 40px;
        padding-bottom: 20px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      }
      h1 {
        font-size: 2.2rem;
        font-weight: 700;
        background: linear-gradient(135deg, #a78bfa, #38bdf8);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }
      .back-btn {
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.08);
        color: #94a3b8;
        padding: 10px 18px;
        border-radius: 10px;
        text-decoration: none;
        font-size: 0.9rem;
        font-weight: 600;
        transition: all 0.25s ease;
      }
      .back-btn:hover {
        background: rgba(255, 255, 255, 0.08);
        color: #f8fafc;
        transform: translateY(-1px);
      }
      .stats-panel {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 20px;
        margin-bottom: 30px;
      }
      .stat-card {
        background: rgba(255, 255, 255, 0.02);
        border: 1px solid rgba(255, 255, 255, 0.05);
        padding: 20px;
        border-radius: 16px;
      }
      .stat-label {
        font-size: 0.8rem;
        color: #71717a;
        text-transform: uppercase;
        margin-bottom: 6px;
        letter-spacing: 0.5px;
      }
      .stat-value {
        font-size: 1.5rem;
        font-weight: 700;
        color: #e4e4e7;
      }
      .table-container {
        background: rgba(255, 255, 255, 0.01);
        border: 1px solid rgba(255, 255, 255, 0.06);
        border-radius: 20px;
        overflow: hidden;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
      }
      table {
        width: 100%;
        border-collapse: collapse;
        text-align: left;
      }
      th {
        background: rgba(255, 255, 255, 0.03);
        padding: 18px 24px;
        font-weight: 600;
        font-size: 0.85rem;
        color: #a1a1aa;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      }
      td {
        padding: 20px 24px;
        font-size: 0.95rem;
        border-bottom: 1px solid rgba(255, 255, 255, 0.04);
        vertical-align: top;
      }
      tr:hover {
        background: rgba(255, 255, 255, 0.01);
      }
      .badge {
        display: inline-block;
        padding: 4px 10px;
        border-radius: 8px;
        font-size: 0.75rem;
        font-weight: 700;
        letter-spacing: 0.5px;
      }
      .content-box {
        background: rgba(0, 0, 0, 0.2);
        border: 1px solid rgba(255, 255, 255, 0.04);
        padding: 14px;
        border-radius: 10px;
        max-width: 500px;
      }
      pre {
        font-family: 'Courier New', Courier, monospace;
        font-size: 0.85rem;
        white-space: pre-wrap;
        word-break: break-all;
        color: #e2e8f0;
      }
      .empty-state {
        text-align: center;
        padding: 60px;
        color: #71717a;
        font-weight: 300;
      }
    </style>
  </head>
  <body>
    <div class="wrapper">
      <div class="header">
        <div>
          <h1>Sandbox Message Logs</h1>
          <p style="color: #71717a; font-size: 0.95rem; margin-top: 6px;">
            Captured sandbox logs when delivery services are mocked
          </p>
        </div>
        <a href="/" class="back-btn">← Console Home</a>
      </div>

      <div class="stats-panel">
        <div class="stat-card">
          <div class="stat-label">Total Logs</div>
          <div class="stat-value">${logs.length}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Email Channels</div>
          <div class="stat-value">${logs.filter((l) => l.channel === 'email').length}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">SMS Channels</div>
          <div class="stat-value">${logs.filter((l) => l.channel === 'sms').length}</div>
        </div>
      </div>

      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th style="width: 20%;">Time</th>
              <th style="width: 12%;">Channel</th>
              <th style="width: 20%;">Recipient</th>
              <th style="width: 18%;">Subject</th>
              <th>Content</th>
            </tr>
          </thead>
          <tbody>
            ${rows || '<tr><td colspan="5" class="empty-state">No sandbox logs captured yet.</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
  </body>
</html>`;
};


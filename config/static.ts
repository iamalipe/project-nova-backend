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

export interface OAuthAuthorizeParams {
  clientName: string;
  client_id: string;
  redirect_uri: string;
  code_challenge: string;
  code_challenge_method: string;
  state: string;
  frontendUrl: string;
  user: any | null;
}

export const getOAuthAuthorizeHTML = (params: OAuthAuthorizeParams): string => {
  const initialUser = params.user ? JSON.stringify(params.user) : 'null';
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Authorize ${params.clientName} | Project Nova</title>
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
        overflow-x: hidden;
      }
      .card {
        max-width: 480px;
        width: 100%;
        background: rgba(15, 23, 42, 0.45);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 24px;
        padding: 40px;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        position: relative;
        overflow: hidden;
      }
      .card::before {
        content: '';
        position: absolute;
        top: 0; left: 0; right: 0; height: 3px;
        background: linear-gradient(90deg, #6366f1, #d946ef);
      }
      .header {
        text-align: center;
        margin-bottom: 32px;
      }
      .logo {
        font-size: 1.5rem;
        font-weight: 700;
        background: linear-gradient(135deg, #818cf8, #f472b6);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        letter-spacing: -0.5px;
        margin-bottom: 6px;
      }
      .subtitle {
        color: #94a3b8;
        font-size: 0.9rem;
        font-weight: 300;
      }
      h2 {
        font-size: 1.35rem;
        font-weight: 600;
        margin-bottom: 12px;
        color: #f1f5f9;
        text-align: center;
      }
      p.desc {
        color: #94a3b8;
        font-size: 0.95rem;
        line-height: 1.5;
        margin-bottom: 24px;
        text-align: center;
      }
      .form-group {
        margin-bottom: 20px;
      }
      label {
        display: block;
        font-size: 0.85rem;
        font-weight: 600;
        color: #cbd5e1;
        margin-bottom: 8px;
        letter-spacing: 0.5px;
        text-transform: uppercase;
      }
      input {
        width: 100%;
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 12px;
        padding: 14px 16px;
        color: #f8fafc;
        font-family: inherit;
        font-size: 0.95rem;
        transition: all 0.2s ease;
      }
      input:focus {
        outline: none;
        background: rgba(255, 255, 255, 0.05);
        border-color: rgba(99, 102, 241, 0.5);
        box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
      }
      .error-box {
        background: rgba(239, 68, 68, 0.1);
        border: 1px solid rgba(239, 68, 68, 0.2);
        color: #fca5a5;
        padding: 12px 16px;
        border-radius: 12px;
        font-size: 0.9rem;
        margin-bottom: 20px;
        display: none;
        animation: fadeIn 0.3s ease;
      }
      .btn {
        width: 100%;
        padding: 14px 20px;
        border-radius: 12px;
        font-size: 0.95rem;
        font-weight: 600;
        font-family: inherit;
        cursor: pointer;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        border: none;
      }
      .btn-primary {
        background: linear-gradient(135deg, #6366f1, #4f46e5);
        color: #ffffff;
        box-shadow: 0 4px 12px rgba(99, 102, 241, 0.2);
      }
      .btn-primary:hover {
        transform: translateY(-1px);
        box-shadow: 0 6px 16px rgba(99, 102, 241, 0.3);
      }
      .btn-primary:active {
        transform: translateY(0);
      }
      .btn-secondary {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.08);
        color: #94a3b8;
      }
      .btn-secondary:hover {
        background: rgba(255, 255, 255, 0.08);
        color: #f8fafc;
      }
      .user-badge {
        display: flex;
        align-items: center;
        gap: 12px;
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.05);
        padding: 12px 16px;
        border-radius: 16px;
        margin-bottom: 28px;
      }
      .user-avatar {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: linear-gradient(135deg, #818cf8, #f472b6);
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        color: #ffffff;
        font-size: 0.95rem;
      }
      .user-info {
        flex: 1;
        text-align: left;
      }
      .user-name {
        font-size: 0.9rem;
        font-weight: 600;
        color: #f1f5f9;
      }
      .user-email {
        font-size: 0.8rem;
        color: #94a3b8;
      }
      .permissions-list {
        background: rgba(255, 255, 255, 0.02);
        border: 1px solid rgba(255, 255, 255, 0.04);
        border-radius: 16px;
        padding: 16px 20px;
        margin-bottom: 28px;
        text-align: left;
      }
      .permissions-title {
        font-size: 0.8rem;
        font-weight: 600;
        color: #cbd5e1;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 12px;
      }
      .permission-item {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        font-size: 0.9rem;
        color: #94a3b8;
        line-height: 1.4;
        margin-bottom: 8px;
      }
      .permission-item:last-child {
        margin-bottom: 0;
      }
      .permission-bullet {
        color: #818cf8;
        font-size: 1rem;
        line-height: 1;
      }
      .actions {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }
      .state-container {
        transition: opacity 0.3s ease, transform 0.3s ease;
      }
      .hidden {
        display: none !important;
        opacity: 0;
        transform: translateY(10px);
      }
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(-4px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .spinner {
        width: 20px;
        height: 20px;
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-radius: 50%;
        border-top-color: #ffffff;
        animation: spin 0.8s linear infinite;
        margin-right: 8px;
      }
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="header">
        <div class="logo">Project Nova</div>
        <div class="subtitle">Secure OAuth Authorization Service</div>
      </div>

      <!-- State 1: Login Form -->
      <div id="login-state" class="state-container">
        <h2>Sign In to Your Account</h2>
        <p class="desc">Please log in with your credentials to authorize <strong>${params.clientName}</strong>.</p>
        
        <div id="login-error" class="error-box"></div>

        <form id="login-form">
          <div class="form-group">
            <label for="email">Email Address</label>
            <input type="email" id="email" required placeholder="name@example.com" />
          </div>
          <div class="form-group">
            <label for="password">Password</label>
            <input type="password" id="password" required placeholder="••••••••" />
          </div>
          <button type="submit" class="btn btn-primary" id="login-btn">
            Log In & Continue
          </button>
        </form>
      </div>

      <!-- State 2: Consent Form -->
      <div id="consent-state" class="state-container hidden">
        <h2>App Authorization</h2>
        <p class="desc"><strong>${params.clientName}</strong> is requesting permission to access your SafalMyBuy account.</p>

        <div class="user-badge">
          <div class="user-avatar" id="avatar-letters">U</div>
          <div class="user-info">
            <div class="user-name" id="display-name">Active User</div>
            <div class="user-email" id="display-email">user@example.com</div>
          </div>
        </div>

        <div class="permissions-list">
          <div class="permissions-title">Requested Permissions</div>
          <div class="permission-item">
            <span class="permission-bullet">•</span>
            <div>Full API access to list, view, create, and manage your products.</div>
          </div>
          <div class="permission-item">
            <span class="permission-bullet">•</span>
            <div>Ability to establish Model Context Protocol (MCP) integrations.</div>
          </div>
        </div>

        <div class="actions">
          <button class="btn btn-secondary" onclick="denyAccess()">Cancel</button>
          <button class="btn btn-primary" id="allow-btn" onclick="allowAccess()">
            Allow Access
          </button>
        </div>
      </div>
    </div>

    <script>
      let user = ${initialUser};
      const clientName = "${params.clientName}";
      const clientId = "${params.client_id}";
      const redirectUri = "${params.redirect_uri}";
      const codeChallenge = "${params.code_challenge}";
      const codeChallengeMethod = "${params.code_challenge_method}";
      const state = "${params.state}";

      const loginState = document.getElementById('login-state');
      const consentState = document.getElementById('consent-state');
      const loginForm = document.getElementById('login-form');
      const loginError = document.getElementById('login-error');
      const loginBtn = document.getElementById('login-btn');
      const allowBtn = document.getElementById('allow-btn');

      function showConsent(userData) {
        document.getElementById('display-email').innerText = userData.email;
        const name = [userData.firstName, userData.lastName].filter(Boolean).join(' ') || 'User';
        document.getElementById('display-name').innerText = name;
        document.getElementById('avatar-letters').innerText = (userData.firstName ? userData.firstName[0] : userData.email[0]).toUpperCase();

        loginState.classList.add('hidden');
        consentState.classList.remove('hidden');
      }

      // Initial check
      if (user) {
        showConsent(user);
      }

      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        loginError.style.display = 'none';
        loginBtn.disabled = true;
        loginBtn.innerHTML = '<div class="spinner"></div> Signing In...';

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try {
          const response = await fetch('/v1/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              body: { email, password }
            })
          });
          const data = await response.json();
          
          if (data.success) {
            user = data.data;
            showConsent(user);
          } else {
            loginError.innerText = data.message || 'Login failed. Please verify credentials.';
            loginError.style.display = 'block';
          }
        } catch (err) {
          loginError.innerText = 'Connection error. Please try again.';
          loginError.style.display = 'block';
        } finally {
          loginBtn.disabled = false;
          loginBtn.innerText = 'Log In & Continue';
        }
      });

      async function allowAccess() {
        allowBtn.disabled = true;
        allowBtn.innerHTML = '<div class="spinner"></div> Authorizing...';

        try {
          const response = await fetch('/oauth/consent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              client_id: clientId,
              redirect_uri: redirectUri,
              code_challenge: codeChallenge,
              code_challenge_method: codeChallengeMethod,
              state: state
            })
          });
          const data = await response.json();
          if (data.redirectTo) {
            window.location.href = data.redirectTo;
          } else {
            alert('Authorization failed: ' + (data.error_description || 'Unknown error'));
            allowBtn.disabled = false;
            allowBtn.innerText = 'Allow Access';
          }
        } catch (err) {
          alert('Failed to connect to the authorization server.');
          allowBtn.disabled = false;
          allowBtn.innerText = 'Allow Access';
        }
      }

      function denyAccess() {
        const url = new URL(redirectUri);
        url.searchParams.set('error', 'access_denied');
        url.searchParams.set('error_description', 'The user denied access.');
        if (state) url.searchParams.set('state', state);
        window.location.href = url.toString();
      }
    </script>
  </body>
</html>`;
};


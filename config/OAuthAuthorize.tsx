import type { FC } from 'hono/jsx';

interface OAuthAuthorizeParams {
  clientName: string;
  client_id: string;
  redirect_uri: string;
  code_challenge: string;
  code_challenge_method: string;
  state: string;
  frontendUrl: string;
  user: Record<string, unknown> | null;
}

const css = `
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
  .header { text-align: center; margin-bottom: 32px; }
  .logo {
    font-size: 1.5rem;
    font-weight: 700;
    background: linear-gradient(135deg, #818cf8, #f472b6);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    letter-spacing: -0.5px;
    margin-bottom: 6px;
  }
  .subtitle { color: #94a3b8; font-size: 0.9rem; font-weight: 300; }
  h2 { font-size: 1.35rem; font-weight: 600; margin-bottom: 12px; color: #f1f5f9; text-align: center; }
  p.desc { color: #94a3b8; font-size: 0.95rem; line-height: 1.5; margin-bottom: 24px; text-align: center; }
  .form-group { margin-bottom: 20px; }
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
  .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(99, 102, 241, 0.3); }
  .btn-primary:active { transform: translateY(0); }
  .btn-secondary {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.08);
    color: #94a3b8;
  }
  .btn-secondary:hover { background: rgba(255, 255, 255, 0.08); color: #f8fafc; }
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
  .user-info { flex: 1; text-align: left; }
  .user-name { font-size: 0.9rem; font-weight: 600; color: #f1f5f9; }
  .user-email { font-size: 0.8rem; color: #94a3b8; }
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
  .permission-item:last-child { margin-bottom: 0; }
  .permission-bullet { color: #818cf8; font-size: 1rem; line-height: 1; }
  .actions { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .state-container { transition: opacity 0.3s ease, transform 0.3s ease; }
  .hidden { display: none !important; opacity: 0; transform: translateY(10px); }
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
  @keyframes spin { to { transform: rotate(360deg); } }
`;

export const OAuthAuthorize: FC<OAuthAuthorizeParams> = (params) => {
  const initialUser = params.user ? JSON.stringify(params.user) : 'null';

  const script = `
    let user = ${initialUser};
    const clientName = ${JSON.stringify(params.clientName)};
    const clientId = ${JSON.stringify(params.client_id)};
    const redirectUri = ${JSON.stringify(params.redirect_uri)};
    const codeChallenge = ${JSON.stringify(params.code_challenge)};
    const codeChallengeMethod = ${JSON.stringify(params.code_challenge_method)};
    const state = ${JSON.stringify(params.state)};

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

    if (user) { showConsent(user); }

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
          body: JSON.stringify({ body: { email, password } })
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
  `;

  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Authorize {params.clientName} | Project Nova</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&display=swap"
          rel="stylesheet"
        />
        <style dangerouslySetInnerHTML={{ __html: css }} />
      </head>
      <body>
        <div class="card">
          <div class="header">
            <div class="logo">Project Nova</div>
            <div class="subtitle">Secure OAuth Authorization Service</div>
          </div>

          {/* State 1: Login Form */}
          <div id="login-state" class="state-container">
            <h2>Sign In to Your Account</h2>
            <p class="desc">
              Please log in with your credentials to authorize{' '}
              <strong>{params.clientName}</strong>.
            </p>

            <div id="login-error" class="error-box" />

            <form id="login-form">
              <div class="form-group">
                <label for="email">Email Address</label>
                <input
                  type="email"
                  id="email"
                  required
                  placeholder="name@example.com"
                />
              </div>
              <div class="form-group">
                <label for="password">Password</label>
                <input
                  type="password"
                  id="password"
                  required
                  placeholder="••••••••"
                />
              </div>
              <button type="submit" class="btn btn-primary" id="login-btn">
                Log In &amp; Continue
              </button>
            </form>
          </div>

          {/* State 2: Consent Form */}
          <div id="consent-state" class="state-container hidden">
            <h2>App Authorization</h2>
            <p class="desc">
              <strong>{params.clientName}</strong> is requesting permission to
              access your SafalMyBuy account.
            </p>

            <div class="user-badge">
              <div class="user-avatar" id="avatar-letters">
                U
              </div>
              <div class="user-info">
                <div class="user-name" id="display-name">
                  Active User
                </div>
                <div class="user-email" id="display-email">
                  user@example.com
                </div>
              </div>
            </div>

            <div class="permissions-list">
              <div class="permissions-title">Requested Permissions</div>
              <div class="permission-item">
                <span class="permission-bullet">•</span>
                <div>
                  Full API access to list, view, create, and manage your
                  products.
                </div>
              </div>
              <div class="permission-item">
                <span class="permission-bullet">•</span>
                <div>
                  Ability to establish Model Context Protocol (MCP)
                  integrations.
                </div>
              </div>
            </div>

            <div class="actions">
              {/* eslint-disable-next-line */}
              <button
                class="btn btn-secondary"
                {...{ onclick: 'denyAccess()' }}
              >
                Cancel
              </button>
              {/* eslint-disable-next-line */}
              <button
                class="btn btn-primary"
                id="allow-btn"
                {...{ onclick: 'allowAccess()' }}
              >
                Allow Access
              </button>
            </div>
          </div>
        </div>

        <script dangerouslySetInnerHTML={{ __html: script }} />
      </body>
    </html>
  );
};

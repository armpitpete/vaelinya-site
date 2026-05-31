import http from 'node:http';
import { execFile } from 'node:child_process';
import { URL } from 'node:url';
import { createRemoteJWKSet, jwtVerify } from 'jose';

const HOST = process.env.HOST || '127.0.0.1';
const PORT = Number(process.env.PORT || 3771);
const SERVICE_NAME = process.env.SERVICE_NAME || 'lina-of-vaelinya-bot';
const PUBLIC_ORIGIN = process.env.PUBLIC_ORIGIN || 'https://vaelinya.uk';
const ALLOWED_EMAIL = process.env.ALLOWED_EMAIL || 'post@toiletrage.co.uk';
const LOG_LINES = Math.min(Number(process.env.LOG_LINES || 40), 120);
const TEAM_DOMAIN = stripTrailingSlash(process.env.CF_ACCESS_TEAM_DOMAIN || '');
const ACCESS_AUD = process.env.CF_ACCESS_AUD || '';
const SYSTEMCTL = process.env.SYSTEMCTL_PATH || '/usr/bin/systemctl';
const SUDO = process.env.SUDO_PATH || '/usr/bin/sudo';
const JOURNALCTL = process.env.JOURNALCTL_PATH || '/usr/bin/journalctl';
const BASE_PATH = '/private/api/lina-command-centre';

const jwks = TEAM_DOMAIN ? createRemoteJWKSet(new URL(`${TEAM_DOMAIN}/cdn-cgi/access/certs`)) : null;
let lastCommandAt = 0;
const commandCooldownMs = 2500;

function stripTrailingSlash(value) {
  return String(value || '').replace(/\/+$/, '');
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff'
  });
  res.end(JSON.stringify(payload, null, 2));
}

async function verifyAccess(req) {
  if (!TEAM_DOMAIN || !ACCESS_AUD || !jwks) {
    return { ok: false, status: 500, message: 'Bridge verification is not configured.' };
  }

  const assertion = String(req.headers['cf-access-jwt-assertion'] || '').trim();
  if (!assertion) {
    return { ok: false, status: 401, message: 'Missing Cloudflare Access assertion.' };
  }

  try {
    const { payload } = await jwtVerify(assertion, jwks, {
      audience: ACCESS_AUD,
      issuer: TEAM_DOMAIN
    });

    const email = String(payload.email || '').toLowerCase();
    if (ALLOWED_EMAIL && email !== ALLOWED_EMAIL.toLowerCase()) {
      return { ok: false, status: 403, message: 'User is not allowed for this bridge.' };
    }

    return { ok: true, email };
  } catch {
    return { ok: false, status: 401, message: 'Cloudflare Access assertion failed verification.' };
  }
}

function checkWriteRequest(req) {
  if (req.method !== 'POST') return { ok: true };

  const origin = req.headers.origin;
  if (origin && origin !== PUBLIC_ORIGIN) {
    return { ok: false, status: 403, message: 'Blocked: origin is not allowed.' };
  }

  const now = Date.now();
  if (now - lastCommandAt < commandCooldownMs) {
    return { ok: false, status: 429, message: 'Please wait before sending another command.' };
  }
  lastCommandAt = now;

  return { ok: true };
}

function runFile(command, args, timeoutMs = 10000) {
  return new Promise((resolve) => {
    execFile(command, args, { timeout: timeoutMs, maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
      resolve({
        ok: !error,
        code: error?.code ?? 0,
        stdout: String(stdout || ''),
        stderr: String(stderr || ''),
        message: error?.message || ''
      });
    });
  });
}

function parseSystemdShow(output) {
  const data = {};
  for (const line of output.split('\n')) {
    const index = line.indexOf('=');
    if (index === -1) continue;
    data[line.slice(0, index)] = line.slice(index + 1);
  }
  return data;
}

function redact(text) {
  return String(text || '')
    .replace(/(access[_-]?token|refresh[_-]?token|client[_-]?secret|oauth|authorization|bearer)([^\n]*)/gi, '$1 [redacted]')
    .replace(/[A-Za-z0-9_\-.]{32,}/g, '[redacted-long-value]');
}

async function getStatus() {
  const result = await runFile(SYSTEMCTL, ['show', SERVICE_NAME, '--no-pager'], 10000);
  if (!result.ok) {
    return {
      ok: false,
      service: SERVICE_NAME,
      activeState: 'unknown',
      subState: 'unknown',
      detail: redact(result.stderr || result.message || 'systemctl show failed')
    };
  }

  const data = parseSystemdShow(result.stdout);
  return {
    ok: true,
    service: SERVICE_NAME,
    activeState: data.ActiveState || 'unknown',
    subState: data.SubState || 'unknown',
    mainPID: data.MainPID || data.ExecMainPID || '0',
    result: data.Result || '',
    detail: `${data.ActiveState || 'unknown'} / ${data.SubState || 'unknown'}`
  };
}

async function getLogs() {
  const result = await runFile(JOURNALCTL, ['-u', SERVICE_NAME, '-n', String(LOG_LINES), '--no-pager', '--output=short-iso'], 10000);
  const raw = result.ok ? result.stdout : result.stderr || result.message;
  return {
    ok: result.ok,
    lines: redact(raw).split('\n').filter(Boolean)
  };
}

async function runAction(action) {
  const allowed = new Set(['start', 'stop', 'restart']);
  if (!allowed.has(action)) {
    return { ok: false, status: 404, message: 'Unknown command.' };
  }

  const result = await runFile(SUDO, [SYSTEMCTL, action, SERVICE_NAME], 20000);
  const status = await getStatus();

  return {
    ok: result.ok,
    status: result.ok ? 200 : 500,
    action,
    message: result.ok
      ? `${action} command sent to ${SERVICE_NAME}.`
      : redact(result.stderr || result.message || `${action} failed.`),
    service: status
  };
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || HOST}`);

  if (!url.pathname.startsWith(BASE_PATH)) {
    return sendJson(res, 404, { ok: false, message: 'Not found.' });
  }

  if (req.method === 'OPTIONS') {
    res.writeHead(204, { 'cache-control': 'no-store' });
    return res.end();
  }

  const access = await verifyAccess(req);
  if (!access.ok) return sendJson(res, access.status, { ok: false, message: access.message });

  const writeCheck = checkWriteRequest(req);
  if (!writeCheck.ok) return sendJson(res, writeCheck.status, { ok: false, message: writeCheck.message });

  if (req.method === 'GET' && url.pathname === `${BASE_PATH}/status`) {
    return sendJson(res, 200, await getStatus());
  }

  if (req.method === 'GET' && url.pathname === `${BASE_PATH}/logs`) {
    return sendJson(res, 200, await getLogs());
  }

  if (req.method === 'POST') {
    const action = url.pathname.slice(`${BASE_PATH}/`.length);
    const result = await runAction(action);
    return sendJson(res, result.status, result);
  }

  return sendJson(res, 405, { ok: false, message: 'Method not allowed.' });
});

server.listen(PORT, HOST, () => {
  console.log(`Lina command bridge listening on http://${HOST}:${PORT}${BASE_PATH}/`);
});

// POST /api/login — verifies credentials, issues signed JWT cookie.
//
// Credentials checked against environment variables:
//   DASHBOARD_USER          (default: vitalradar)
//   DASHBOARD_PASSWORD_HASH (PBKDF2-SHA256 hex hash + salt, format: "salt$hash")
//   JWT_SECRET              (HMAC signing key for the session token)
//
// Rate-limit attempts via Cloudflare KV (NOTES_KV namespace, bucket "auth-attempts:<ip>")
// — 10 attempts per 10-minute window.

export const onRequestPost = async (context) => {
  try {
    const body = await context.request.json();
    const { username, password } = body || {};
    if (!username || !password) {
      return json({ ok: false, error: 'username and password required' }, 400);
    }

    const expectedUser = context.env.DASHBOARD_USER || 'vitalradar';
    const passwordHash = context.env.DASHBOARD_PASSWORD_HASH;
    const jwtSecret = context.env.JWT_SECRET;

    if (!passwordHash || !jwtSecret) {
      return json({ ok: false, error: 'Server not configured (missing env vars)' }, 500);
    }

    // Rate limit by IP
    const ip = context.request.headers.get('CF-Connecting-IP') || 'unknown';
    if (context.env.NOTES_KV) {
      const key = `auth-attempts:${ip}`;
      const stored = await context.env.NOTES_KV.get(key);
      const count = stored ? parseInt(stored, 10) : 0;
      if (count >= 10) {
        return json({ ok: false, error: 'Too many attempts. Try again in 10 minutes.' }, 429);
      }
      await context.env.NOTES_KV.put(key, String(count + 1), { expirationTtl: 600 });
    }

    // Verify credentials
    if (username !== expectedUser) {
      return json({ ok: false, error: 'Invalid credentials' }, 401);
    }
    const valid = await verifyPassword(password, passwordHash);
    if (!valid) {
      return json({ ok: false, error: 'Invalid credentials' }, 401);
    }

    // Issue JWT
    const token = await signJWT(
      { sub: username, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 7 * 86400 },
      jwtSecret
    );

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': `eros_session=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${7 * 86400}`,
      },
    });
  } catch (e) {
    return json({ ok: false, error: String(e.message || e) }, 500);
  }
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// PBKDF2-SHA256 password verification. Hash format: "salt$iterations$hash"
async function verifyPassword(password, stored) {
  const [salt, iterStr, expectedHashHex] = stored.split('$');
  const iterations = parseInt(iterStr, 10);
  if (!salt || !iterations || !expectedHashHex) return false;
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw', encoder.encode(password), { name: 'PBKDF2' }, false, ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: encoder.encode(salt),
      iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );
  const hashHex = bufferToHex(bits);
  return constantTimeEq(hashHex, expectedHashHex);
}

function bufferToHex(buf) {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function constantTimeEq(a, b) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}

// Sign JWT (HS256)
async function signJWT(payload, secret) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encoder = new TextEncoder();
  const headerB64 = base64UrlEncode(JSON.stringify(header));
  const payloadB64 = base64UrlEncode(JSON.stringify(payload));
  const data = `${headerB64}.${payloadB64}`;
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  const sigB64 = base64UrlEncode(new Uint8Array(sig));
  return `${data}.${sigB64}`;
}

function base64UrlEncode(input) {
  let str;
  if (typeof input === 'string') {
    str = btoa(input);
  } else {
    let s = '';
    for (let i = 0; i < input.length; i++) s += String.fromCharCode(input[i]);
    str = btoa(s);
  }
  return str.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

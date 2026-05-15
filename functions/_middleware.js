// Global auth middleware — runs on every request to the Pages project.
// Gates the dashboard behind a signed JWT cookie issued by /api/login.
// Public paths (login page, login API, static assets) bypass the gate.

const PUBLIC_PATHS = new Set([
  '/login.html',
  '/api/login',
  '/favicon.ico',
]);

// Verify the JWT in the eros_session cookie using HMAC-SHA256.
async function verifyJWT(token, secret) {
  try {
    const [headerB64, payloadB64, sigB64] = token.split('.');
    if (!headerB64 || !payloadB64 || !sigB64) return null;

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw', encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false, ['verify']
    );
    const data = encoder.encode(`${headerB64}.${payloadB64}`);
    const sig = base64UrlDecode(sigB64);
    const valid = await crypto.subtle.verify('HMAC', key, sig, data);
    if (!valid) return null;

    const payload = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/')));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

function base64UrlDecode(s) {
  const padded = s.replace(/-/g, '+').replace(/_/g, '/');
  const padLen = (4 - padded.length % 4) % 4;
  const b64 = padded + '='.repeat(padLen);
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

export const onRequest = async (context) => {
  const url = new URL(context.request.url);
  const path = url.pathname;

  // Bypass for public paths + static assets (everything in /data/ is allowed
  // ONLY after auth; assets like /style.css are needed for login page).
  if (PUBLIC_PATHS.has(path)) {
    return context.next();
  }
  // Allow CSS/JS/images on the login page itself
  if (path.match(/\.(css|js|png|jpg|svg|woff2?)$/i) && !path.startsWith('/data/')) {
    // Static assets — let them through but only the ones needed for login
    // (full SPA assets require auth too — gate /app.js)
    if (path === '/app.js' || path.startsWith('/data/')) {
      // fall through to auth check
    } else {
      return context.next();
    }
  }

  // Check for valid session cookie
  const cookies = parseCookies(context.request.headers.get('Cookie') || '');
  const token = cookies['eros_session'];
  const secret = context.env.JWT_SECRET;

  if (!secret) {
    return new Response('Server misconfigured: JWT_SECRET missing', { status: 500 });
  }

  if (!token) {
    return redirectToLogin(url);
  }

  const payload = await verifyJWT(token, secret);
  if (!payload) {
    return redirectToLogin(url);
  }

  // Authenticated — proceed
  return context.next();
};

function parseCookies(cookieHeader) {
  const out = {};
  for (const part of cookieHeader.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k) out[k] = v.join('=');
  }
  return out;
}

function redirectToLogin(url) {
  const next = encodeURIComponent(url.pathname + url.search);
  return Response.redirect(`${url.origin}/login.html?next=${next}`, 302);
}

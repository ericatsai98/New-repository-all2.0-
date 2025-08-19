import { NextResponse } from 'next/server';

const REALM = 'History Area';
export const config = { matcher: ['/history', '/history.html'] };

function decodeBase64Unicode(b64) {
  const bin = atob(b64);
  const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function middleware(req) {
  const USER = process.env.HISTORY_USER;
  const PASS = process.env.HISTORY_PASS;
  if (!USER || !PASS) {
    return new NextResponse('Missing HISTORY_USER / HISTORY_PASS', { status: 500 });
  }

  const auth = req.headers.get('authorization');
  if (auth) {
    const [scheme, encoded] = auth.split(' ');
    if (scheme === 'Basic' && encoded) {
      try {
        const decoded = decodeBase64Unicode(encoded);
        const i = decoded.indexOf(':');
        const user = decoded.slice(0, i);
        const pass = decoded.slice(i + 1);
        if (user === USER && pass === PASS) return NextResponse.next();
      } catch {}
    }
  }
  return new NextResponse('Authentication required', {
    status: 401,
    headers: { 'WWW-Authenticate': `Basic realm="${REALM}", charset="UTF-8"` }
  });
}

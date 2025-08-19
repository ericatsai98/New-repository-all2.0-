// middleware.js
import { NextResponse } from 'next/server';

const REALM = 'History Area';

// 只匹配 /history 與 /history.html；先不要鎖 API
export const config = { matcher: ['/history', '/history.html'] };

function okBasicAuth(auth, U, P) {
  if (!auth) return false;
  const [sch, enc] = auth.split(' ');
  if (sch !== 'Basic' || !enc) return false;
  try {
    const s = atob(enc);                 // 解 base64 -> "user:pass"
    const i = s.indexOf(':');
    const u = s.slice(0, i);
    const p = s.slice(i + 1);
    return u === (U || '').trim() && p === (P || '').trim();
  } catch {
    return false;
  }
}

export function middleware(req) {
  const { pathname } = new URL(req.url);

  // 先把 /history 導向真正的檔案 /history.html
  if (pathname === '/history') {
    return NextResponse.redirect(new URL('/history.html', req.url));
  }

  // 只對 /history.html 做 Basic Auth
  if (pathname === '/history.html') {
    const U = process.env.HISTORY_USER;
    const P = process.env.HISTORY_PASS;
    if (!U || !P) {
      return new NextResponse('Missing HISTORY_USER / HISTORY_PASS', { status: 500 });
    }
    if (okBasicAuth(req.headers.get('authorization'), U, P)) {
      return NextResponse.next();
    }
    return new NextResponse('Authentication required', {
      status: 401,
      headers: { 'WWW-Authenticate': `Basic realm="${REALM}", charset="UTF-8"` }
    });
  }

  return NextResponse.next();
}

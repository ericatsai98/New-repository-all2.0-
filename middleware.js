import { NextResponse } from 'next/server';

const REALM = 'History Area';

export const config = {
  matcher: ['/history', '/history.html', '/api/search-quotes', '/api/quote-detail']
};

function decode(b64) {
  const bin = atob(b64);
  return new TextDecoder().decode(Uint8Array.from(bin, c => c.charCodeAt(0)));
}

export function middleware(req) {
  const U = process.env.HISTORY_USER;
  const P = process.env.HISTORY_PASS;
  if (!U || !P) {
    return new NextResponse('Missing HISTORY_USER / HISTORY_PASS', { status: 500 });
  }

  const auth = req.headers.get('authorization');
  let ok = false;
  if (auth) {
    const [sch, enc] = auth.split(' ');
    if (sch === 'Basic' && enc) {
      try {
        const s = decode(enc);
        const i = s.indexOf(':');
        ok = (s.slice(0, i) === U && s.slice(i + 1) === P);
      } catch {}
    }
  }
  if (!ok) {
    return new NextResponse('Authentication required', {
      status: 401,
      headers: { 'WWW-Authenticate': `Basic realm="${REALM}", charset="UTF-8"` }
    });
  }

  // ✅ 通過驗證：如果走 /history，就導向真正的檔案 /history.html
  const { pathname } = new URL(req.url);
  if (pathname === '/history') {
    return NextResponse.redirect(new URL('/history.html', req.url));  // 若想不改網址，也可改成 rewrite
    // return NextResponse.rewrite(new URL('/history.html', req.url));
  }

  return NextResponse.next();
}

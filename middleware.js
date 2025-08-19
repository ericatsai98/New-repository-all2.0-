import { NextResponse } from 'next/server';

const REALM = 'History Area';

export const config = {
  // 只保護歷史頁與「讀取型」API
  matcher: ['/history', '/history.html', '/api/search-quotes', '/api/quote-detail']
};

export function middleware(req) {
  const auth = req.headers.get('authorization');
  const USER = process.env.HISTORY_USER;
  const PASS = process.env.HISTORY_PASS;

  if (auth) {
    const [scheme, encoded] = auth.split(' ');
    if (scheme === 'Basic' && encoded) {
      // Edge Middleware 有 atob
      const decoded = atob(encoded);
      const idx = decoded.indexOf(':');
      const user = decoded.slice(0, idx);
      const pass = decoded.slice(idx + 1);

      if (user === USER && pass === PASS) {
        return NextResponse.next();
      }
    }
  }

  return new NextResponse('Authentication required', {
    status: 401,
    headers: {
      // 觸發瀏覽器原生帳密視窗
      'WWW-Authenticate': `Basic realm="${REALM}", charset="UTF-8"`
    }
  });
}

// middleware.js
import { NextResponse } from 'next/server';

const REALM = 'History Area';

// 先只保護 /history（頁面入口），不要包含 /history.html 或 /api/*，避免空白/401
export const config = { matcher: ['/history'] };

function isValidBasicAuth(auth, U, P) {
  if (!auth) return false;
  const [sch, enc] = auth.split(' ');
  if (sch !== 'Basic' || !enc) return false;
  try {
    const s = atob(enc);
    const i = s.indexOf(':');
    const u = s.slice(0, i);
    const p = s.slice(i + 1);
    return u === U && p === P;
  } catch {
    return false;
  }
}

export function middleware(req) {
  const U = process.env.HISTORY_USER;
  const P = process.env.HISTORY_PASS;
  if (!U || !P) {
    return new NextResponse('Missing HISTORY_USER / HISTORY_PASS', { status: 500 });
  }

  const ok = isValidBasicAuth(req.headers.get('authorization'), U, P);
  if (!ok) {
    // 只對 /history 發 Basic Auth 挑戰
    return new NextResponse('Authentication required', {
      status: 401,
      headers: { 'WWW-Authenticate': `Basic realm="${REALM}", charset="UTF-8"` }
    });
  }

  // ✅ 驗證通過後，把 /history 內部改寫成真正的檔案 /history.html（不改網址）
  return NextResponse.rewrite(new URL('/history.html', req.url));
}

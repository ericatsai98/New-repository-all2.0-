// middleware.js
import { NextResponse } from 'next/server';

const REALM = 'History Area';

export const config = {
  // 只保護歷史頁與讀取型 API
  matcher: ['/history', '/history.html', '/api/search-quotes', '/api/quote-detail']
};

function decodeBase64Unicode(b64) {
  // Edge Runtime 安全解碼（避免某些環境 atob 異常）
  const bin = atob(b64);
  const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function middleware(req) {
  const USER = process.env.HISTORY_USER;
  const PASS = process.env.HISTORY_PASS;

  // 如果沒設環境變數，避免 500，直接擋住並提示
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
        if (user === USER && pass === PASS) {
          return NextResponse.next();
        }
      } catch (_) {
        // 解析失敗就落回挑戰
      }
    }
  }

  // 發出 Basic Auth 挑戰（瀏覽器會跳出帳密視窗）
  return new NextResponse('Authentication required', {
    status: 401,
    headers: {
      'WWW-Authenticate': `Basic realm="${REALM}", charset="UTF-8"`
    }
  });
}

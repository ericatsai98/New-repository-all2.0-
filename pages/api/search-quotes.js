// pages/api/search-quotes.js
export default async function handler(req, res) {
  try {
    if (req.method !== 'GET' && req.method !== 'OPTIONS') {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }
    if (req.method === 'OPTIONS') return res.status(200).end();

    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SRV_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!SUPABASE_URL || !SRV_KEY) {
      return res.status(500).json({ error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' });
    }

    // ✅ 用 Next 的 req.query，避免 URL 解析異常
    const {
      style = '',
      room_type = '',
      ping_min,
      ping_max,
      from,
      to,
      limit = '20',
      page = '1',
    } = req.query;

    const nLimit = Math.max(1, Math.min(parseInt(limit, 10) || 20, 200));
    const nPage  = Math.max(1, parseInt(page, 10) || 1);
    const rangeFrom = (nPage - 1) * nLimit;
    const rangeTo   = rangeFrom + nLimit - 1;

    // 只撈列表需要的欄位
    const qs = new URLSearchParams();
    qs.set('select', 'id,created_at,quote_date,client_name,address,style,room_type,base_ping,grand_total');

    if (style)     qs.append('style',     `eq.${style}`);
    if (room_type) qs.append('room_type', `eq.${room_type}`);
    if (ping_min !== undefined && ping_min !== '') qs.append('base_ping', `gte.${Number(ping_min)}`);
    if (ping_max !== undefined && ping_max !== '') qs.append('base_ping', `lte.${Number(ping_max)}`);
    if (from) qs.append('quote_date', `gte.${from}`);
    if (to)   qs.append('quote_date', `lte.${to}`);

    qs.append('order', 'quote_date.desc');
    qs.append('order', 'created_at.desc');

    const endpoint = `${SUPABASE_URL}/rest/v1/quotes?${qs.toString()}`;
    const sResp = await fetch(endpoint, {
      method: 'GET',
      headers: {
        apikey: SRV_KEY,
        Authorization: `Bearer ${SRV_KEY}`,
        Prefer: 'count=exact',
        Range: `${rangeFrom}-${rangeTo}`,
      },
    });

    const data = await sResp.json().catch(() => ({}));
    if (!sResp.ok) {
      // 把 Supabase 的錯誤直接回傳，方便你在 Network 面板看到
      return res.status(sResp.status).json(
        typeof data === 'object' ? data : { error: 'Supabase error', raw: String(data) }
      );
    }

    const contentRange = sResp.headers.get('content-range') || ''; // e.g. "0-19/137"
    let total = null;
    const slashIdx = contentRange.indexOf('/');
    if (slashIdx !== -1) total = parseInt(contentRange.slice(slashIdx + 1), 10);

    return res.status(200).json({
      items: Array.isArray(data) ? data : [],
      page: nPage,
      limit: nLimit,
      total,
      hasNext: total != null ? rangeTo + 1 < total : false,
    });
  } catch (e) {
    return res.status(500).json({ error: e?.message || String(e) });
  }
}

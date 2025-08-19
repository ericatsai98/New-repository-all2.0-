// /api/search-quotes.js
export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'OPTIONS') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  // 簡單 CORS（同網域通常不需要；保險起見）
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SRV_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SRV_KEY) {
    return res.status(500).json({ error: 'Missing SUPABASE envs' });
  }

  try {
    const base = `http://${req.headers.host || 'localhost'}`;
    const url = new URL(req.url, base);
    const qp = url.searchParams;

    const style     = (qp.get('style') || '').trim();
    const roomType  = (qp.get('room_type') || '').trim();
    const pingMin   = qp.get('ping_min');
    const pingMax   = qp.get('ping_max');
    const dateFrom  = qp.get('from');   // YYYY-MM-DD
    const dateTo    = qp.get('to');     // YYYY-MM-DD
    const limit     = Math.max(1, Math.min(parseInt(qp.get('limit') || '20', 10), 200));
    const page      = Math.max(1, parseInt(qp.get('page') || '1', 10));
    const rangeFrom = (page - 1) * limit;
    const rangeTo   = rangeFrom + limit - 1;

    // 只抓查詢頁需要的欄位；如要更多可自行加上
    const qs = new URLSearchParams();
    qs.set('select', 'id,created_at,quote_date,client_name,address,style,room_type,base_ping,grand_total');

    // 依條件組成 Supabase REST 的過濾器
    if (style)    qs.append('style', `eq.${style}`);
    if (roomType) qs.append('room_type', `eq.${roomType}`);
    if (pingMin !== null && pingMin !== '' && !Number.isNaN(Number(pingMin))) qs.append('base_ping', `gte.${Number(pingMin)}`);
    if (pingMax !== null && pingMax !== '' && !Number.isNaN(Number(pingMax))) qs.append('base_ping', `lte.${Number(pingMax)}`);
    if (dateFrom) qs.append('quote_date', `gte.${dateFrom}`);
    if (dateTo)   qs.append('quote_date', `lte.${dateTo}`);

    // 排序：先照 quote_date 再照 created_at（新到舊）
    qs.append('order', 'quote_date.desc');
    qs.append('order', 'created_at.desc');

    const endpoint = `${SUPABASE_URL}/rest/v1/quotes?${qs.toString()}`;
    const resp = await fetch(endpoint, {
      method: 'GET',
      headers: {
        apikey: SRV_KEY,
        Authorization: `Bearer ${SRV_KEY}`,
        Prefer: 'count=exact',
        Range: `${rangeFrom}-${rangeTo}`,
      }
    });

    const data = await resp.json();
    if (!resp.ok) {
      return res.status(resp.status).json(data);
    }

    const contentRange = resp.headers.get('content-range') || ''; // e.g. "0-19/137"
    let total = null;
    const slashIdx = contentRange.indexOf('/');
    if (slashIdx !== -1) total = parseInt(contentRange.slice(slashIdx + 1), 10);

    return res.status(200).json({
      items: Array.isArray(data) ? data : [],
      page,
      limit,
      total,
      hasNext: total != null ? rangeTo + 1 < total : false
    });
  } catch (e) {
    return res.status(500).json({ error: e.message || String(e) });
  }
}

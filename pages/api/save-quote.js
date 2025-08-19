// /api/save-quote.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SRV_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; // 只放伺服端
  if (!SUPABASE_URL || !SRV_KEY) {
    return res.status(500).json({ error: 'Missing SUPABASE envs' });
  }

  try {
    // 讀取 JSON body（相容各情況）
    const body = await new Promise((resolve, reject) => {
      let buf = '';
      req.on('data', (c) => (buf += c));
      req.on('end', () => {
        try { resolve(buf ? JSON.parse(buf) : {}); } catch (e) { reject(e); }
      });
      req.on('error', reject);
    });

    const { quote, items = [] } = body;
    if (!quote || typeof quote !== 'object') {
      return res.status(400).json({ error: 'Invalid payload: quote required' });
    }

    // 1) 插入主表 quotes
    const qResp = await fetch(`${SUPABASE_URL}/rest/v1/quotes`, {
      method: 'POST',
      headers: {
        apikey: SRV_KEY,
        Authorization: `Bearer ${SRV_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation'
      },
      body: JSON.stringify([quote])
    });
    const qData = await qResp.json();
    if (!qResp.ok) return res.status(qResp.status).json(qData);
    const quoteId = qData[0]?.id;

    // 2) 如有明細就一起寫入
    if (Array.isArray(items) && items.length) {
      const rows = items.map(r => ({ ...r, quote_id: quoteId }));
      const iResp = await fetch(`${SUPABASE_URL}/rest/v1/quote_items`, {
        method: 'POST',
        headers: {
          apikey: SRV_KEY,
          Authorization: `Bearer ${SRV_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(rows)
      });
      const iData = await iResp.json();
      if (!iResp.ok) return res.status(iResp.status).json(iData);
    }

    return res.status(200).json({ id: quoteId });
  } catch (e) {
    return res.status(500).json({ error: e.message || String(e) });
  }
}

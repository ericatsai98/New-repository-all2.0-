// /api/save-quote.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SRV_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; // 只放在伺服端！

  if (!SUPABASE_URL || !SRV_KEY) {
    return res.status(500).json({ error: 'Missing SUPABASE envs' });
  }

  try {
    const { quote, items } = await req.json?.() || await new Promise(r => {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => r(JSON.parse(body || '{}')));
    });

    if (!quote || !Array.isArray(items)) {
      return res.status(400).json({ error: 'Invalid payload' });
    }

    // 1) 插入主表 quotes，取回 id
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
    const quoteId = qData[0].id;

    // 2) 批次插入明細 quote_items
    const rows = items.map(it => ({ ...it, quote_id: quoteId }));
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

    return res.status(200).json({ id: quoteId });
  } catch (e) {
    return res.status(500).json({ error: e.message || String(e) });
  }
}

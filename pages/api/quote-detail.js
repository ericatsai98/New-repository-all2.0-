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

    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'Missing id' });

    const qs = new URLSearchParams();
    qs.set('select',
      [
        'id,created_at,quote_date,client_name,address,style,room_type,base_ping,',
        'subtotal,other_items,supervision_fee,tax,grand_total,',
        'form,',
        'quote_items(id,category,name,qty,unit,unit_price,amount)'
      ].join('')
    );
    qs.set('id', `eq.${id}`);

    const endpoint = `${SUPABASE_URL}/rest/v1/quotes?${qs.toString()}`;
    const resp = await fetch(endpoint, {
      method: 'GET',
      headers: {
        apikey: SRV_KEY,
        Authorization: `Bearer ${SRV_KEY}`,
        Prefer: 'count=exact'
      }
    });

    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) return res.status(resp.status).json(data);

    const row = Array.isArray(data) ? data[0] : null;
    if (!row) return res.status(404).json({ error: 'Not found' });
    return res.status(200).json(row);
  } catch (e) {
    return res.status(500).json({ error: e?.message || String(e) });
  }
}

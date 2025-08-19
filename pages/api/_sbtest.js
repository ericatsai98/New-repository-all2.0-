export default async function handler(_req, res) {
  try {
    const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY: KEY } = process.env;
    if (!SUPABASE_URL || !KEY) {
      return res.status(500).json({ error: 'Missing Supabase envs' });
    }
    const url = `${SUPABASE_URL}/rest/v1/quotes?select=id&limit=1`;
    const r = await fetch(url, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } });
    const j = await r.json().catch(() => ({}));
    return res.status(r.ok ? 200 : r.status).json(j);
  } catch (e) {
    return res.status(500).json({ error: e.message || String(e) });
  }
}

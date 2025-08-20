// pages/api/save-quote.js  (純 JS)
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
  global: { headers: { 'X-Client-Info': 'save-quote-api' } },
});

const toInt = (n) => Math.round(Number(n) || 0);

function normalizeForm(q) {
  if (!q) return null;
  if (q.form != null) return q.form; // 已是物件
  if (q.form_json != null) {
    try {
      return typeof q.form_json === 'string' ? JSON.parse(q.form_json) : q.form_json;
    } catch {
      return { raw: String(q.form_json) };
    }
  }
  return null;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const body = typeof req.body === 'object' ? req.body : JSON.parse(req.body || '{}');
    const { quote, items } = body || {};
    if (!quote || !Array.isArray(items)) {
      return res.status(400).json({ error: 'Invalid payload: expect { quote, items[] }' });
    }

    const row = {
      quote_date:      quote.quote_date || null,
      client_name:     quote.client_name || null,
      address:         quote.address || null,
      style:           quote.style || null,
      room_type:       quote.room_type || null,
      base_ping:       quote.base_ping ?? null,
      subtotal:        toInt(quote.subtotal),
      other_items:     toInt(quote.other_items),
      supervision_fee: toInt(quote.supervision_fee),
      tax:             toInt(quote.tax),
      grand_total:     toInt(quote.grand_total),
      form:            normalizeForm(quote),
    };

    // 先插主表
    const { data: q, error: qErr } = await supabase.from('quotes').insert(row).select('id').single();
    if (qErr) throw qErr;
    const quoteId = q.id;

    // 準備子表
    const itemsRows = (items || [])
      .map((it) => ({
        quote_id:    quoteId,
        category:    String(it.category || ''),
        name:        String(it.name || ''),
        qty:         Number(it.qty || 0),
        description: it.description == null ? null : String(it.description),
        amount:      toInt(it.amount || 0),
      }))
      .filter((it) => it.name || it.amount > 0 || it.qty > 0);

    if (itemsRows.length) {
      const { error: iErr } = await supabase.from('quote_items').insert(itemsRows);
      if (iErr) {
        // 回滾，避免殘留沒有明細的主檔
        await supabase.from('quotes').delete().eq('id', quoteId);
        return res.status(400).json({ error: iErr.message || 'Insert items failed' });
      }
    }

    return res.status(200).json({ id: quoteId });
  } catch (err) {
    console.error('SAVE_QUOTE_API_ERROR:', err);
    return res.status(500).json({ error: err?.message || String(err) });
  }
}

// pages/api/save-quote.js  (純 JS 版)

import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  // 讓錯誤更好追
  console.warn('Missing Supabase env: SUPABASE_URL / SUPABASE_KEY');
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
  global: { headers: { 'X-Client-Info': 'save-quote-api' } },
});

const toInt = (n) => Math.round(Number(n) || 0);

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // Next.js 會自動把 JSON 轉成物件；若不是，就手動 parse（防呆）
    const body = typeof req.body === 'object' ? req.body : JSON.parse(req.body || '{}');
    const { quote, items } = body || {};

    if (!quote || !Array.isArray(items)) {
      return res.status(400).json({ error: 'Invalid payload: expect { quote, items[] }' });
    }

    // 準備 quotes 欄位（對齊你 Supabase 的 schema）
    const row = {
      quote_date: quote.quote_date || null,
      client_name: quote.client_name || null,
      address: quote.address || null,
      style: quote.style || null,
      room_type: quote.room_type || null,
      base_ping: quote.base_ping ?? null,
      subtotal: toInt(quote.subtotal),
      other_items: toInt(quote.other_items),
      supervision_fee: toInt(quote.supervision_fee),
      tax: toInt(quote.tax),
      grand_total: toInt(quote.grand_total),
      form: quote.form || null, // jsonb
    };

    // 先插 quotes，拿 id
    const { data: q, error: qErr } = await supabase
      .from('quotes')
      .insert(row)
      .select('id')
      .single();

    if (qErr) throw qErr;
    const quoteId = q.id;

    // 準備 items -> quote_items
    const itemsRows = items
      .map((it) => ({
        quote_id: quoteId,
        category: String(it.category || ''),
        name: String(it.name || ''),
        qty: Number(it.qty || 0),
        description: String(it.description || ''), // 這欄位你現在表裡有
        amount: toInt(it.amount || 0),
      }))
      // 避免全空的垃圾列
      .filter((it) => it.name || it.amount > 0 || it.qty > 0);

    if (itemsRows.length > 0) {
      const { error: iErr } = await supabase.from('quote_items').insert(itemsRows);
      if (iErr) throw iErr;
    }

    return res.status(200).json({ id: quoteId });
  } catch (err) {
    console.error('SAVE_QUOTE_API_ERROR:', err);
    const msg = err?.message || String(err);
    return res.status(500).json({ error: msg });
  }
}

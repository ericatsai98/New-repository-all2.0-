import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string, // 用 service role 寫入
  { auth: { persistSession: false } }
)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // 1) 解析 payload（避免空 body）
    const { quote, items } = (req.body ?? {}) as {
      quote?: any; items?: any[]
    }
    if (!quote || !Array.isArray(items)) {
      return res.status(400).json({ error: 'Invalid payload: { quote, items[] } is required' })
    }

    // 2) 先寫 quotes
    const { data: qIns, error: qErr } = await supabase
      .from('quotes')
      .insert(quote)
      .select('id')
      .single()
    if (qErr) throw qErr

    const quote_id = qIns.id

    // 3) 再寫 quote_items（欄位名用 description！）
    if (items.length) {
      const rows = items.map(it => ({
        quote_id,
        category: String(it.category ?? ''),
        name: String(it.name ?? ''),
        qty: Number(it.qty ?? 0),
        description: String(it.description ?? ''), // <— 這個欄位名一定要對
        amount: Math.round(Number(it.amount ?? 0))
      }))

      const { error: iErr } = await supabase.from('quote_items').insert(rows)
      if (iErr) throw iErr
    }

    // 4) 永遠回 JSON
    return res.status(201).json({ id: quote_id })
  } catch (e: any) {
    console.error('save-quote error', e)
    return res.status(500).json({ error: e?.message || 'Server error' })
  }
}

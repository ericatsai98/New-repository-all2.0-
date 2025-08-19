export default function handler(_req, res) {
  res.status(200).json({
    has_HISTORY_USER: !!process.env.HISTORY_USER,
    has_HISTORY_PASS: !!process.env.HISTORY_PASS,
    has_SUPABASE_URL: !!process.env.SUPABASE_URL,
    has_SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    node: process.version
  });
}

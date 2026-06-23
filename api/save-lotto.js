const { createClient } = require("@supabase/supabase-js");
const { getMissingSupabaseEnv, getSupabaseConfig } = require("./_env");

const MIN = 1;
const MAX = 45;
const PICK = 6;

function getSupabase() {
  const { url, key } = getSupabaseConfig();
  if (!url || !key) return null;
  return createClient(url, key);
}

function validateNumbers(numbers) {
  if (!Array.isArray(numbers) || numbers.length !== PICK) return false;
  const set = new Set(numbers);
  if (set.size !== PICK) return false;
  return numbers.every((n) => Number.isInteger(n) && n >= MIN && n <= MAX);
}

function normalizeDraw(draw) {
  const numbers = [...draw.numbers].sort((a, b) => a - b);
  const source = draw.source === "saju" ? "saju" : "random";
  const metadata =
    draw.metadata && typeof draw.metadata === "object" && !Array.isArray(draw.metadata)
      ? draw.metadata
      : null;

  return { numbers, source, metadata };
}

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST만 허용됩니다." });
  }

  const supabase = getSupabase();
  if (!supabase) {
    const missing = getMissingSupabaseEnv();
    return res.status(500).json({
      error: `환경 변수가 설정되지 않았습니다: ${missing.join(", ")}. 프로젝트 루트에 .env 파일을 만들고 vercel dev를 재시작하세요.`,
    });
  }

  const { draws } = req.body || {};
  if (!Array.isArray(draws) || draws.length === 0) {
    return res.status(400).json({ error: "저장할 번호(draws)가 없습니다." });
  }

  if (draws.length > 20) {
    return res.status(400).json({ error: "한 번에 최대 20게임까지 저장할 수 있습니다." });
  }

  const rows = [];
  for (const draw of draws) {
    if (!validateNumbers(draw.numbers)) {
      return res.status(400).json({ error: "로또 번호는 1~45 중 중복 없는 6개여야 합니다." });
    }
    rows.push(normalizeDraw(draw));
  }

  try {
    const { data, error } = await supabase.from("lotto_draws").insert(rows).select("id, created_at");

    if (error) {
      return res.status(500).json({ error: error.message || "Supabase 저장에 실패했습니다." });
    }

    return res.status(200).json({
      saved: data.length,
      ids: data.map((row) => row.id),
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || "서버 오류가 발생했습니다." });
  }
};

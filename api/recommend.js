const MODEL = "gemini-2.5-flash";

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    sajuSummary: {
      type: "string",
      description: "생년월일·성별 기반 사주 요약 (년주, 월주, 일주, 오행 균형 등)",
    },
    luckyElements: {
      type: "string",
      description: "현재 사주에서 보완·강화하면 좋은 오행과 기운",
    },
    numbers: {
      type: "array",
      items: { type: "integer" },
      description: "1~45 사이 중복 없는 로또 번호 6개 (오름차순)",
    },
    explanation: {
      type: "string",
      description: "추천 번호 전체에 대한 사주 기반 종합 설명",
    },
    numberReasons: {
      type: "array",
      items: {
        type: "object",
        properties: {
          number: { type: "integer" },
          reason: { type: "string" },
        },
        required: ["number", "reason"],
      },
      description: "각 번호별 사주·오행·수리 근거",
    },
  },
  required: ["sajuSummary", "luckyElements", "numbers", "explanation", "numberReasons"],
};

function buildPrompt(gender, birthDate) {
  const genderLabel = gender === "male" ? "남성" : "여성";
  return `당신은 사주명리학 전문가입니다. 아래 정보를 바탕으로 한국 로또 6/45 번호 6개를 추천하세요.

[입력 정보]
- 성별: ${genderLabel}
- 생년월일: ${birthDate} (양력)

[분석 지침]
1. 생년월일·성별로 사주(년·월·일·시는 모름)를 해석하고, 부족한 오행과 강한 오행을 파악하세요.
2. 오행(木火土金水), 십이지, 음양, 수리(1~45 숫자의 오행·음양·길흉)를 종합해 번호를 고르세요.
3. 1~45 중 중복 없는 정확히 6개 번호를 오름차순으로 제시하세요.
4. 각 번호가 왜 이 사주에 맞는지 구체적으로 설명하세요 (예: "土 기운 보완", "일간과 상생하는 水 수" 등).
5. entertainment 목적임을 전제로 하되, 사주 논리는 일관되게 유지하세요.

반드시 JSON 스키마 형식으로만 응답하세요.`;
}

function validateNumbers(numbers) {
  if (!Array.isArray(numbers) || numbers.length !== 6) return false;
  const set = new Set(numbers);
  if (set.size !== 6) return false;
  return numbers.every((n) => Number.isInteger(n) && n >= 1 && n <= 45);
}

function normalizeResult(raw) {
  const numbers = [...raw.numbers].sort((a, b) => a - b);
  const reasonMap = new Map(
    (raw.numberReasons || []).map((r) => [r.number, r.reason])
  );

  return {
    sajuSummary: raw.sajuSummary,
    luckyElements: raw.luckyElements || "",
    numbers,
    explanation: raw.explanation,
    numberReasons: numbers.map((n) => ({
      number: n,
      reason: reasonMap.get(n) || "사주 오행 균형에 맞춘 번호입니다.",
    })),
  };
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

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "GEMINI_API_KEY가 설정되지 않았습니다." });
  }

  const { gender, birthDate } = req.body || {};

  if (!gender || !["male", "female"].includes(gender)) {
    return res.status(400).json({ error: "성별(male/female)을 선택해 주세요." });
  }

  if (!birthDate || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
    return res.status(400).json({ error: "생년월일(YYYY-MM-DD)을 입력해 주세요." });
  }

  const date = new Date(`${birthDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return res.status(400).json({ error: "유효하지 않은 날짜입니다." });
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: buildPrompt(gender, birthDate) }] }],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: RESPONSE_SCHEMA,
            temperature: 0.9,
          },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      const message = data?.error?.message || "Gemini API 호출에 실패했습니다.";
      return res.status(response.status).json({ error: message });
    }

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      return res.status(502).json({ error: "AI 응답을 받지 못했습니다." });
    }

    const parsed = JSON.parse(text);

    if (!validateNumbers(parsed.numbers)) {
      return res.status(502).json({ error: "추천 번호 형식이 올바르지 않습니다." });
    }

    return res.status(200).json(normalizeResult(parsed));
  } catch (err) {
    return res.status(500).json({ error: err.message || "서버 오류가 발생했습니다." });
  }
}

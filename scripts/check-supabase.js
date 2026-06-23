require("../api/_env");

const { createClient } = require("@supabase/supabase-js");
const { getMissingSupabaseEnv, getSupabaseConfig } = require("../api/_env");

const missing = getMissingSupabaseEnv();
if (missing.length) {
  console.error("❌ 누락된 환경 변수:", missing.join(", "));
  console.error("");
  console.error("해결 방법:");
  console.error("1. 프로젝트 루트(c:\\Users\\omarc\\Desktop\\프로젝트)에 .env 파일 생성");
  console.error("2. .env.example 내용을 복사한 뒤 실제 Supabase 값으로 교체");
  console.error("3. vercel dev 재시작");
  process.exit(1);
}

const { url, key } = getSupabaseConfig();
const supabase = createClient(url, key);

(async () => {
  const testNumbers = [1, 7, 14, 21, 28, 35];

  const { data, error } = await supabase
    .from("lotto_draws")
    .insert({
      numbers: testNumbers,
      source: "random",
      metadata: { test: true },
    })
    .select("id")
    .single();

  if (error) {
    console.error("❌ Supabase 저장 실패:", error.message);
    if (error.message.includes("lotto_draws")) {
      console.error("");
      console.error("→ supabase/schema.sql 을 Supabase SQL Editor에서 실행했는지 확인하세요.");
    }
    process.exit(1);
  }

  await supabase.from("lotto_draws").delete().eq("id", data.id);

  console.log("✅ Supabase 연결 및 저장 테스트 성공");
  console.log("   URL:", url);
  console.log("   테스트 row id:", data.id, "(삭제됨)");
})();

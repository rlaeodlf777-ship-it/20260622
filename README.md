# 20260622

로또 번호 생성기 & 사주 AI 추천 웹 앱입니다.

## 기능

- **랜덤 생성**: 1~45 중 6개 번호 무작위 추첨 (1~10게임)
- **사주 추천**: 성별·생년월일 입력 → Gemini 2.5 Flash가 사주 분석 후 번호 추천 및 근거 설명

## 로컬 실행

사주 추천 API는 Vercel 서버리스 함수를 사용하므로, 로컬에서는 Vercel CLI가 필요합니다.

```bash
npm i -g vercel
vercel dev
```

`.env` 파일에 API 키를 설정하거나, Vercel CLI가 환경 변수를 물어보면 입력합니다.

```
GEMINI_API_KEY=your_key_here
```

## Vercel 배포

1. [Vercel](https://vercel.com)에 GitHub 저장소 연결
2. **Settings → Environment Variables** 에 추가:
   - `GEMINI_API_KEY` = Google AI Studio에서 발급한 API 키
3. Deploy

## API

`POST /api/recommend`

```json
{
  "gender": "male",
  "birthDate": "1990-05-15"
}
```

응답: 사주 요약, 추천 번호 6개, 번호별 사주 근거 설명

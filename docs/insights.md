# Session Insights

@session-analyzer가 questions.md를 주기적으로 분석한 결과.
**append only**. 기존 분석 섹션 삭제 금지.
사람이 검토 후 rules.md / pitfalls.md / CLAUDE.md에 반영 결정.

## 분석 트리거
- 마지막 분석 이후 50건 이상 요청 누적
- 또는 마지막 분석 이후 30일 경과 (월 1회)
- 또는 같은 카테고리 연속 5회 이상 발생

## 포맷

```
## YYYY-MM-DD 분석 (기간: YYYY-MM-DD ~ YYYY-MM-DD)

### 요약
- 총 요청 수: N건
- 카테고리 분포: 디자인 X%, 버그 Y%, ...
- 완료율: N%

### 반복 패턴 (3회 이상)
1. [카테고리] 패턴 설명 — N회
   - 근거: questions.md 날짜 3개
   - 상태: [규칙 준수 안 됨 / 함정 후보 / 새 패턴]
   - 제안: rules.md / pitfalls.md / CLAUDE.md 어디에 어떻게 반영할지

### 병목 지표
- "다시 해줘" 비율: N%
- 같은 카테고리 연속 최대: N회
- 원인 가설

### 액션 아이템
- [ ] 누가 (사람/에이전트) 무엇을 할지
```

---

(실제 분석 시작)

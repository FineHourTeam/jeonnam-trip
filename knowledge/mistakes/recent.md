# 최근 실수 로그

@mistake-logger가 append만 가능. 기존 항목 삭제·수정 금지.
200줄 초과 시 @mistake-compressor로 archive 이동.

## 구분 기준 (pitfalls.md와)
- **mistakes (여기)**: 에이전트가 규칙을 어긴 실수
- **pitfalls.md**: 플랫폼 함정

사용자 책임 실수는 기록 대상 아님 (에이전트 실수만).

## 포맷

```
## YYYY-MM-DD [카테고리]
- 실수: 무엇을 잘못했나 (1줄)
- 원인: 왜 그랬나 (1줄)
- 해결: 어떻게 고쳤나 (1줄)
- 세션: questions.md YYYY-MM-DD 요청 N
```

카테고리: Firebase / 라우팅 / 상태관리 / UI / 테스트 / 빌드 / 톤앤매너 / 아키텍처 / 기타

---

(실수 로그 시작)

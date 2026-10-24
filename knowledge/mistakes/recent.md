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

## 2026-10-17 [기타]
- 실수: Cloud Functions 패키지(firebase-functions) 설치를 확인 없이 실행했다가 사용자가 거절했다
- 원인: data-model.md에 functions/가 계획돼 있어 승인된 범위로 판단했지만, 새 패키지 디렉터리·런타임 의존성 추가는 CLAUDE.md 에스컬레이션 항목이다
- 해결: 반쪽 폴더를 지우고 남은 작업으로 보고했다가, 사용자가 진행을 승인한 뒤 다시 만들었다
- 세션: questions.md 2026-10-17 요청 6

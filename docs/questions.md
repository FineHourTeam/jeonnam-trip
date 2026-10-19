# 요청 로그

코드를 바꾸는 요청의 원본 기록 (질문에 답만 한 요청은 적지 않는다 — CLAUDE.md § 로그 규칙). append only.
기존 항목 삭제·수정 금지.
@session-analyzer가 주기적으로 읽고 insights.md에 분석 결과 작성.

## 포맷

```
## YYYY-MM-DD

### 요청 N
- 내용: 요청 한 줄 요약
- 카테고리: 기능 / 디자인 / 리팩터 / 버그 / 테스트 / 배포 / 메타 / 기획 / AI (택 1+)
- 결과: 완료 / 부분완료 / 보류 / 중단 (작업 후 기록)
- 재작업: ✓ (1회 성공) / ↩×N (N번 재작업 후 완료) / - (미완료) (작업 후 기록)
- 참조: 관련 실수·함정 파일 경로 (있으면)
- 근본원인: 에이전트가 처음부터 스스로 못 한 이유 (재작업↩ 시 필수·그 외 선택)
- 일반화 후보: 규칙·문서로 만들면 다음엔 이 지시가 불필요해질 한 줄 (있으면만)
```

## 규칙
- 같은 날 여러 요청은 같은 날짜 헤딩 아래 번호로 추가
- 요청 수행 **전에** 기록 (재작업·결과 필드는 비워둠)
- 결과·재작업 필드는 작업 완료 후 채움
- 재작업 판정: 사용자 "아니/다시/그게 아니라" 지시 = ↩ 1회
- questions.md는 "받은 요청" 원본, mistakes/recent.md는 "실수한 것", insights.md는 "분석 결과" (3층 로깅)
- @session-analyzer가 재작업(↩) 데이터를 규칙 효과성 점수 계산에 활용

---

(실제 로그 시작)

## 2026-10-16

### 요청 1
- 내용: 제안서 v1.4(01~05 md)를 docs/proposal/로 복사하고 CLAUDE.md·INDEX가 기획 문서로 참조하게 연결
- 카테고리: 기획/메타
- 결과: 완료
- 재작업: ✓
- 참조: -

### 요청 2
- 내용: 로고 시안 제작 + 웹 에셋 생성, Firebase MCP 대신 CLI 사용으로 전환, Hosting 라이브 배포
- 카테고리: 디자인/배포/메타
- 결과: 완료
- 재작업: ✓
- 참조: firebase.json headers source가 /index.html이라 / 경로에 보안 헤더·no-cache가 빠지던 키트 템플릿 문제를 ** 로 수정
- 일반화 후보: firebase.json.example의 문서 헤더 규칙 source는 "**"(뒤의 /assets 규칙이 캐시를 덮어씀)

### 요청 3
- 내용: 네이버 클라우드 Maps 키 등록 (Client ID → env·CI 변수, Client Secret → Secret Manager)
- 카테고리: 메타/배포
- 결과: 완료
- 재작업: ✓

### 요청 4
- 내용: 라이브 사이트 CSP 오류 수정 (인라인 다크모드 스크립트 차단)
- 카테고리: 버그/배포
- 결과: 완료
- 재작업: ✓
- 근본원인: 키트 index.html.example의 인라인 테마 스크립트와 firebase.json.example의 CSP(script-src 'self', unsafe-inline 없음)가 서로 충돌한다. 첫 배포 때 콘솔을 확인하지 않아 놓쳤다
- 일반화 후보: 테마 초기화 스크립트는 public/theme-init.js로 두고 동기 로드한다 (CSP 해시 관리 불필요)

### 요청 5
- 내용: 병렬 개발을 위한 공통 기반 — 도메인 타입·라우터·앱 셸·보안 규칙·인덱스·trips 저장소·샘플 시드·shadcn 공용 컴포넌트
- 카테고리: 기능/메타
- 결과: 완료
- 재작업: ✓

## 2026-10-19

### 요청 6
- 내용: 네이버 Directions 5(driving) 프록시 Cloud Function `api` (POST /api/directions) + Hosting /api/** rewrite
- 카테고리: 기능/배포
- 결과: 완료 — 사용자 지시로 functions·hosting 배포, 라이브 /api/directions 계약 응답 확인, Artifact Registry(asia-northeast3) 정리 정책 1일 설정
- 재작업: ↩×1
- 근본원인: 네이버 Directions 5는 실패 결과 코드(1 출발=도착, 2 도로 아님 등)를 HTTP 400 + `{ error: { errorCode, code, message } }`로 돌려주는데, 문서 예시만 보고 200 + 최상위 code로 가정했다. 에뮬레이터 실호출로 발견
- 일반화 후보: 외부 API 응답 변환 테스트는 실호출로 확인한 실패 응답 모양을 모킹 데이터로 쓴다
